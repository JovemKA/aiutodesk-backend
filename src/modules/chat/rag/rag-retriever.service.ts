import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { GeminiEmbeddingService } from '../embeddings/gemini-embedding.service';

export interface RetrievedChunk {
    articleId: string;
    title: string;
    slug: string;
    content: string;
    similarity: number;
}

export interface RetrieveParams {
    query: string;
    requesterId?: string;
    topK?: number;
}

@Injectable()
export class RagRetrieverService {
    private readonly logger = new Logger(RagRetrieverService.name);
    private readonly defaultTopK: number;
    private readonly minSimilarity: number;
    private readonly filterByDepartment: boolean;

    constructor(
        private readonly dataSource: DataSource,
        private readonly embedder: GeminiEmbeddingService,
        private readonly configService: ConfigService,
    ) {
        this.defaultTopK = this.configService.get<number>('rag.topK') ?? 4;
        this.minSimilarity = this.configService.get<number>('rag.minSimilarity') ?? 0.6;
        this.filterByDepartment =
            this.configService.get<boolean>('rag.filterByDepartment') ?? false;
    }

    async retrieve(params: RetrieveParams): Promise<RetrievedChunk[]> {
        const topK = params.topK ?? this.defaultTopK;
        const query = params.query?.trim();
        if (!query) return [];

        const vector = await this.embedder.embedQuery(query);
        if (!vector || vector.length === 0 || vector.every((v) => v === 0)) {
            this.logger.warn('Embedding vazio/zerado — RAG retorna lista vazia.');
            return [];
        }

        const vectorLiteral = `[${vector.join(',')}]`;
        const useDeptFilter = this.filterByDepartment && Boolean(params.requesterId);

        // overFetch para ter folga apos dedupe por artigo
        const overFetch = topK * 4;

        const sql = useDeptFilter
            ? `
                SELECT a.id AS article_id, a.title, a.slug, c.content,
                       1 - (c.embedding <=> $1::vector) AS similarity
                FROM kb_article_chunks c
                JOIN "KBArticles" a ON a.id = c.article_id
                WHERE a.is_published = true
                  AND a.id IN (
                    SELECT DISTINCT da."articleId"
                    FROM department_articles da
                    JOIN user_departments ud ON ud."departmentId" = da."departmentId"
                    WHERE ud."userId" = $2
                  )
                ORDER BY c.embedding <=> $1::vector
                LIMIT $3
            `
            : `
                SELECT a.id AS article_id, a.title, a.slug, c.content,
                       1 - (c.embedding <=> $1::vector) AS similarity
                FROM kb_article_chunks c
                JOIN "KBArticles" a ON a.id = c.article_id
                WHERE a.is_published = true
                ORDER BY c.embedding <=> $1::vector
                LIMIT $2
            `;

        const sqlParams = useDeptFilter
            ? [vectorLiteral, params.requesterId, overFetch]
            : [vectorLiteral, overFetch];

        try {
            const rows = await this.dataSource.query<RawRetrievedRow[]>(sql, sqlParams);
            return this.dedupeAndFilter(rows, topK);
        } catch (error) {
            this.logger.error('Falha na busca vetorial RAG', error as Error);
            return [];
        }
    }

    private dedupeAndFilter(rows: RawRetrievedRow[], topK: number): RetrievedChunk[] {
        const bestByArticle = new Map<string, RetrievedChunk>();

        for (const row of rows) {
            const similarity = Number(row.similarity);
            if (Number.isNaN(similarity) || similarity < this.minSimilarity) continue;

            const existing = bestByArticle.get(row.article_id);
            if (!existing || similarity > existing.similarity) {
                bestByArticle.set(row.article_id, {
                    articleId: row.article_id,
                    title: row.title,
                    slug: row.slug,
                    content: row.content,
                    similarity,
                });
            }
        }

        return Array.from(bestByArticle.values())
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK);
    }
}

interface RawRetrievedRow {
    article_id: string;
    title: string;
    slug: string;
    content: string;
    similarity: number | string;
}
