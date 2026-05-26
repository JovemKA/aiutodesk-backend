import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Article } from '../entities/article.entity';
import { ArticleChunk } from '../entities/article-chunk.entity';
import { chunkArticle } from './article-chunker';
import { GeminiEmbeddingService } from '@modules/chat/embeddings/gemini-embedding.service';

export interface ReindexSummary {
    articlesProcessed: number;
    chunksWritten: number;
    skipped: { articleId: string; reason: string }[];
}

@Injectable()
export class ArticleIndexerService {
    private readonly logger = new Logger(ArticleIndexerService.name);

    constructor(
        @InjectRepository(Article)
        private readonly articleRepo: Repository<Article>,
        @InjectRepository(ArticleChunk)
        private readonly chunkRepo: Repository<ArticleChunk>,
        private readonly embedder: GeminiEmbeddingService,
        private readonly dataSource: DataSource,
    ) {}

    async reindexArticle(articleId: string): Promise<{ chunksWritten: number }> {
        const article = await this.articleRepo.findOne({ where: { id: articleId } });
        if (!article) {
            throw new NotFoundException(`Artigo ${articleId} nao encontrado para reindex`);
        }
        return this.replaceChunks(article);
    }

    async reindexAll(): Promise<ReindexSummary> {
        const articles = await this.articleRepo.find({ where: { isPublished: true } });
        const summary: ReindexSummary = {
            articlesProcessed: 0,
            chunksWritten: 0,
            skipped: [],
        };

        for (const article of articles) {
            try {
                const { chunksWritten } = await this.replaceChunks(article);
                summary.articlesProcessed += 1;
                summary.chunksWritten += chunksWritten;
                this.logger.log(
                    `Reindex OK: "${article.title}" → ${chunksWritten} chunk(s)`,
                );
            } catch (error) {
                this.logger.error(
                    `Falha ao reindexar "${article.title}" (${article.id})`,
                    error as Error,
                );
                summary.skipped.push({
                    articleId: article.id,
                    reason: (error as Error).message,
                });
            }
        }

        return summary;
    }

    private async replaceChunks(article: Article): Promise<{ chunksWritten: number }> {
        const chunks = chunkArticle(article);
        if (chunks.length === 0) {
            await this.chunkRepo.delete({ articleId: article.id });
            return { chunksWritten: 0 };
        }

        const embeddings = await this.embedder.embedDocuments(chunks.map((c) => c.content));
        if (embeddings.length !== chunks.length) {
            throw new Error(
                `Tamanho de embeddings nao bate com chunks: ${embeddings.length} vs ${chunks.length}`,
            );
        }

        const rows = chunks.map((chunk, idx) => ({
            articleId: article.id,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
            tokenCount: chunk.tokenCount,
            embedding: embeddings[idx],
            embeddingModel: this.embedder.modelName,
        }));

        await this.dataSource.transaction(async (manager) => {
            await manager.getRepository(ArticleChunk).delete({ articleId: article.id });
            await manager.getRepository(ArticleChunk).insert(rows);
        });

        return { chunksWritten: rows.length };
    }
}
