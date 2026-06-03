import { User } from '@modules/user/entities/user.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('chat_conversations')
@Index(['userId', 'lastMessageAt'])
@Index(['userId', 'archivedAt', 'lastMessageAt'])
export class ChatConversation {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => User, { nullable: false })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Index()
    @Column({ name: 'user_id' })
    userId!: string;

    @Column({ type: 'varchar', length: 200, nullable: true })
    title!: string | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;

    @Column({ name: 'last_message_at', type: 'timestamp', nullable: true })
    lastMessageAt!: Date | null;

    @Column({ name: 'archived_at', type: 'timestamptz', nullable: true, default: null })
    archivedAt!: Date | null;
}
