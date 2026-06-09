import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { GeminiEmbeddingService } from '@modules/chat/embeddings/gemini-embedding.service';
import { TicketMessage } from '../entities/ticket-message.entity';
import { TicketCommentChunk } from '../entities/ticket-comment-chunk.entity';

export interface ReindexCommentsSummary {
    commentsProcessed: number;
    chunksWritten: number;
    skipped: { commentId: string; reason: string }[];
}

const HARD_MAX_CHARS = 6000;

/**
 * Indexa comentários PÚBLICOS de chamados no índice vetorial `ticket_comment_chunks`.
 * Nunca indexa notas internas (internalNote=true). Cada chunk carrega ticket_id + department_id +
 * category_id para que o retrieval imponha o escopo no SQL.
 */
@Injectable()
export class TicketCommentIndexerService {
    private readonly logger = new Logger(TicketCommentIndexerService.name);

    constructor(
        @InjectRepository(TicketMessage)
        private readonly messageRepo: Repository<TicketMessage>,
        @InjectRepository(TicketCommentChunk)
        private readonly chunkRepo: Repository<TicketCommentChunk>,
        private readonly embedder: GeminiEmbeddingService,
        private readonly dataSource: DataSource,
    ) {}

    /** Indexa (ou reindexa) um comentário pelo id. Remove do índice se for nota interna/vazio. */
    async indexComment(messageId: string): Promise<{ chunksWritten: number }> {
        const message = await this.messageRepo.findOne({
            where: { id: messageId },
            relations: { ticket: { department: true, category: true } },
        });

        if (!message || message.internalNote || !message.ticket) {
            await this.chunkRepo.delete({ commentId: messageId });
            return { chunksWritten: 0 };
        }

        const chunks = this.chunkComment(message.body);
        if (chunks.length === 0) {
            await this.chunkRepo.delete({ commentId: messageId });
            return { chunksWritten: 0 };
        }

        const embeddings = await this.embedder.embedDocuments(chunks.map((c) => c.content));
        if (embeddings.length !== chunks.length) {
            throw new Error(
                `Embeddings não batem com chunks do comentário ${messageId}: ${embeddings.length} vs ${chunks.length}`,
            );
        }

        const rows = chunks.map((chunk, idx) => ({
            commentId: message.id,
            ticketId: message.ticket!.id,
            departmentId: message.ticket!.department?.id ?? null,
            categoryId: message.ticket!.category?.id ?? null,
            chunkIndex: idx,
            content: chunk.content,
            tokenCount: chunk.tokenCount,
            embedding: embeddings[idx],
            embeddingModel: this.embedder.modelName,
        }));

        await this.dataSource.transaction(async (manager) => {
            await manager.getRepository(TicketCommentChunk).delete({ commentId: message.id });
            await manager.getRepository(TicketCommentChunk).insert(rows);
        });

        return { chunksWritten: rows.length };
    }

    async removeComment(messageId: string): Promise<void> {
        await this.chunkRepo.delete({ commentId: messageId });
    }

    /** Backfill: reindexa todos os comentários públicos existentes. */
    async reindexAll(): Promise<ReindexCommentsSummary> {
        const messages = await this.messageRepo.find({
            where: { internalNote: false },
            select: { id: true },
        });

        const summary: ReindexCommentsSummary = {
            commentsProcessed: 0,
            chunksWritten: 0,
            skipped: [],
        };

        for (const message of messages) {
            try {
                const { chunksWritten } = await this.indexComment(message.id);
                summary.commentsProcessed += 1;
                summary.chunksWritten += chunksWritten;
            } catch (error) {
                summary.skipped.push({ commentId: message.id, reason: (error as Error).message });
            }
        }

        return summary;
    }

    /** Comentários costumam ser curtos → 1 chunk. Faz hard-split apenas se exceder o limite. */
    private chunkComment(body: string): { content: string; tokenCount: number }[] {
        const text = body.trim();
        if (!text) return [];

        const pieces: string[] = [];
        for (let i = 0; i < text.length; i += HARD_MAX_CHARS) {
            pieces.push(text.slice(i, i + HARD_MAX_CHARS));
        }

        return pieces.map((content) => ({
            content,
            tokenCount: Math.ceil(content.length / 4),
        }));
    }
}
