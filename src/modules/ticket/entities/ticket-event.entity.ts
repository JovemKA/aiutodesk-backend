import { TicketEventType } from '@common/enums/ticket-event-type.enum';
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

@Entity('ticket_events')
export class TicketEvent {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index()
    @ManyToOne(() => Ticket, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ticket_id' })
    ticket!: Ticket;

    @Column({ type: 'enum', enum: TicketEventType })
    type!: TicketEventType;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'actor_id' })
    actor!: User | null;

    @Column({ type: 'jsonb', nullable: true })
    metadata!: Record<string, unknown> | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;
}
