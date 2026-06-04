import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { GeminiEmbeddingService } from '@modules/chat/embeddings/gemini-embedding.service';

export interface RetrievedComment {
    ticketId: string;
    ticketTitle: string;
    content: string;
    similarity: number;
    /** true quando o comentário é do PRÓPRIO chamado em atendimento (contexto 1:1). */
    sameTicket: boolean;
}

export interface RetrieveCommentsParams {
    query: string;
    /** Chamado em atendimento — SEMPRE presente; o escopo 1:1 é amarrado a ele. */
    ticketId: string;
    /** Escopo maior: quando informado, permite recuperar comentários de OUTROS chamados do mesmo depto. */
    departmentId?: string | null;
    topK?: number;
}

/**
 * Retrieval de comentários de chamados ESCOPADO. O isolamento é imposto no WHERE do SQL:
 * sempre amarra ao `ticketId` (1:1) e, no máximo, ao mesmo `department_id` (escopo maior).
 * NUNCA faz busca global — é impossível, por construção, recuperar comentário fora do escopo.
 * Toda linha retornada carrega `ticketId` (proveniência) e a flag `sameTicket`.
 */
@Injectable()
export class TicketCommentRetrieverService {
    private readonly logger = new Logger(TicketCommentRetrieverService.name);
    private readonly defaultTopK: number;
    private readonly minSimilarity: number;

    constructor(
        private readonly dataSource: DataSource,
        private readonly embedder: GeminiEmbeddingService,
        private readonly configService: ConfigService,
    ) {
        this.defaultTopK = this.configService.get<number>('rag.topK') ?? 4;
        this.minSimilarity = this.configService.get<number>('rag.minSimilarity') ?? 0.6;
    }

    async retrieve(params: RetrieveCommentsParams): Promise<RetrievedComment[]> {
        const query = params.query?.trim();
        if (!query || !params.ticketId) return [];

        const vector = await this.embedder.embedQuery(query);
        if (!vector || vector.length === 0 || vector.every((v) => v === 0)) {
            this.logger.warn('Embedding vazio/zerado — retrieval de comentários retorna lista vazia.');
            return [];
        }

        const vectorLiteral = `[${vector.join(',')}]`;
        const topK = params.topK ?? this.defaultTopK;
        const overFetch = topK * 4;
        const useScope = Boolean(params.departmentId);

        // O WHERE SEMPRE contém ticket_id (1:1). O escopo maior só amplia para o MESMO departamento.
        const sql = `
            SELECT cc.ticket_id,
                   t.title AS ticket_title,
                   cc.content,
                   (cc.ticket_id = $2) AS same_ticket,
                   1 - (cc.embedding <=> $1::vector) AS similarity
            FROM ticket_comment_chunks cc
            JOIN tickets t ON t.id = cc.ticket_id
            WHERE cc.ticket_id = $2
               ${useScope ? 'OR cc.department_id = $3' : ''}
            ORDER BY same_ticket DESC, cc.embedding <=> $1::vector
            LIMIT ${useScope ? '$4' : '$3'}
        `;

        const sqlParams = useScope
            ? [vectorLiteral, params.ticketId, params.departmentId, overFetch]
            : [vectorLiteral, params.ticketId, overFetch];

        try {
            const rows = await this.dataSource.query<RawCommentRow[]>(sql, sqlParams);
            return this.filterAndRank(rows, topK);
        } catch (error) {
            this.logger.error('Falha na busca vetorial de comentários', error as Error);
            return [];
        }
    }

    private filterAndRank(rows: RawCommentRow[], topK: number): RetrievedComment[] {
        const filtered = rows
            .map((row) => ({
                ticketId: row.ticket_id,
                ticketTitle: row.ticket_title,
                content: row.content,
                similarity: Number(row.similarity),
                sameTicket: row.same_ticket === true || row.same_ticket === 't',
            }))
            .filter((row) => !Number.isNaN(row.similarity) && row.similarity >= this.minSimilarity);

        // Prioriza o próprio chamado (1:1); depois por similaridade.
        return filtered
            .sort((a, b) => {
                if (a.sameTicket !== b.sameTicket) return a.sameTicket ? -1 : 1;
                return b.similarity - a.similarity;
            })
            .slice(0, topK);
    }
}

interface RawCommentRow {
    ticket_id: string;
    ticket_title: string;
    content: string;
    same_ticket: boolean | string;
    similarity: number | string;
}
