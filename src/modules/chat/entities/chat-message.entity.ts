import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { ChatConversation } from './chat-conversation.entity';

export type ChatMessageRole = 'user' | 'assistant';

@Entity('chat_messages')
@Index(['conversationId', 'createdAt'])
export class ChatMessage {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => ChatConversation, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'conversation_id' })
    conversation!: ChatConversation;

    @Column({ name: 'conversation_id' })
    conversationId!: string;

    @Column({ type: 'varchar', length: 16 })
    role!: ChatMessageRole;

    @Column('text')
    content!: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;
}
