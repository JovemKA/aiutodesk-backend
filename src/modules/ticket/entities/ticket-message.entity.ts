import { User } from '@modules/user/entities/user.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';

export interface TicketMessageAttachment {
    name: string;
    size: number;
    url: string;
}

@Entity('ticket_messages')
export class TicketMessage {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index()
    @ManyToOne(() => Ticket, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ticket_id' })
    ticket!: Ticket;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'author_id' })
    author!: User | null;

    @Column('text')
    body!: string;

    @Column({ name: 'internal_note', type: 'boolean', default: false })
    internalNote!: boolean;

    @Column({ type: 'jsonb', nullable: true })
    attachments!: TicketMessageAttachment[] | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;
}
