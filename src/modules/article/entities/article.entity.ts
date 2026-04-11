import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
} from 'typeorm';

@Entity('KBArticles')
export class Article {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar' })
    title: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'int', nullable: true })
    author_id: number;

    @Column({ type: 'int', nullable: true })
    category_id: number;

    @Column({ type: 'varchar', nullable: true })
    status: string;

    @Column({ type: 'timestamp', nullable: true })
    publication_date: Date;

    @Column({ type: 'timestamp', nullable: true })
    last_reviewed_date: Date;
}
