import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    RelationId,
    UpdateDateColumn,
    JoinColumn,
} from 'typeorm';
import { User } from '@modules/user/entities/user.entity';
import { Category } from '@modules/category/entities/category.entity';

@Entity('KBArticles')
export class Article {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255 })
    title!: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    slug!: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    summary?: string;

    @Column({ type: 'text' })
    content!: string;

    @Column({ type: 'simple-array', nullable: true })
    tags?: string[];

    @Column({ name: 'is_published', type: 'boolean', default: true })
    isPublished!: boolean;

    @Column({ type: 'varchar', nullable: true })
    status?: string;

    @Column({ name: 'publication_date', type: 'timestamp', nullable: true })
    publicationDate?: Date;

    @Column({ name: 'last_reviewed_date', type: 'timestamp', nullable: true })
    lastReviewedDate?: Date;

    @Column({ name: 'view_count', type: 'int', default: 0 })
    viewCount!: number;

    @Column({ name: 'helpful_count', type: 'int', default: 0 })
    helpfulCount!: number;

    @Column({ name: 'not_helpful_count', type: 'int', default: 0 })
    notHelpfulCount!: number;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'author_id' })
    author?: User;

    @RelationId((article: Article) => article.author)
    authorId?: string;

    @ManyToOne(() => Category, { nullable: true })
    @JoinColumn({ name: 'category_id' })
    category?: Category;

    @RelationId((article: Article) => article.category)
    categoryId?: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt!: Date;
}
