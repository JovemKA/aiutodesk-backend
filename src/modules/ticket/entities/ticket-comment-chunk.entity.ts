import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';
import { TicketMessage } from './ticket-message.entity';

const vectorTransformer = {
    to: (value?: number[] | null): string | null => {
        if (!value) return null;
        return `[${value.join(',')}]`;
    },
    from: (value?: string | number[] | null): number[] => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        try {
            return JSON.parse(value) as number[];
        } catch {
            return [];
        }
    },
};

/**
 * Chunk de embedding de um comentário PÚBLICO de chamado.
 * Carrega a proveniência (ticket_id) e o escopo (department_id/category_id) para que o retrieval
 * possa impor o isolamento no SQL — nunca apenas no prompt. Notas internas não são indexadas.
 */
@Entity('ticket_comment_chunks')
@Unique('uq_ticket_comment_chunk_idx', ['commentId', 'chunkIndex'])
export class TicketCommentChunk {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => TicketMessage, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'comment_id' })
    comment?: TicketMessage;

    @Index('idx_ticket_comment_chunks_comment_id')
    @Column({ name: 'comment_id', type: 'uuid' })
    commentId!: string;

    @Index('idx_ticket_comment_chunks_ticket_id')
    @Column({ name: 'ticket_id', type: 'uuid' })
    ticketId!: string;

    @Index('idx_ticket_comment_chunks_department_id')
    @Column({ name: 'department_id', type: 'uuid', nullable: true })
    departmentId!: string | null;

    @Column({ name: 'category_id', type: 'uuid', nullable: true })
    categoryId!: string | null;

    @Column({ name: 'chunk_index', type: 'int' })
    chunkIndex!: number;

    @Column({ type: 'text' })
    content!: string;

    @Column({ name: 'token_count', type: 'int' })
    tokenCount!: number;

    @Column({ type: 'text', transformer: vectorTransformer })
    embedding!: number[];

    @Column({ name: 'embedding_model', type: 'varchar', length: 64 })
    embeddingModel!: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;
}
