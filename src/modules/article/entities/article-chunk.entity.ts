import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    Unique,
    Index,
} from 'typeorm';
import { Article } from './article.entity';

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

@Entity('kb_article_chunks')
@Unique('uq_article_chunk_idx', ['articleId', 'chunkIndex'])
export class ArticleChunk {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Article, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'article_id' })
    article?: Article;

    @Index('idx_kb_article_chunks_article_id')
    @Column({ name: 'article_id', type: 'uuid' })
    articleId!: string;

    @Column({ name: 'chunk_index', type: 'int' })
    chunkIndex!: number;

    @Column({ type: 'text' })
    content!: string;

    @Column({ name: 'token_count', type: 'int' })
    tokenCount!: number;

    @Column({
        type: 'text',
        transformer: vectorTransformer,
    })
    embedding!: number[];

    @Column({ name: 'embedding_model', type: 'varchar', length: 64 })
    embeddingModel!: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date;
}
