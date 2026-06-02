import { TicketPriority } from '@common/enums/ticket-priority.enum';
import { TicketStatus } from '@common/enums/ticket-status.enum';
import { Category } from '@modules/category/entities/category.entity';
import { Department } from '@modules/department/entities/department.entity';
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

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column('text')
  description!: string;

  @Index()
  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.OPEN })
  status!: TicketStatus;

  @Index()
  @Column({ type: 'enum', enum: TicketPriority, default: TicketPriority.MEDIUM })
  priority!: TicketPriority;

  @Column({ name: 'priority_score', type: 'int', nullable: true })
  priorityScore!: number | null;

  @Column({ name: 'priority_reason', type: 'text', nullable: true })
  priorityReason!: string | null;

  @Column({ name: 'score_confidence', type: 'varchar', length: 6, nullable: true })
  scoreConfidence!: string | null;

  @Index()
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'requester_id' })
  requester!: User;

  @Index()
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_user_id' })
  assignedUser!: User | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department!: Department | null;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category!: Category | null;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt!: Date | null;

  @Index()
  @Column({ name: 'chat_conversation_id', type: 'varchar', length: 120, nullable: true })
  chatConversationId!: string | null;

  @Column({ name: 'chat_summary', type: 'text', nullable: true })
  chatSummary!: string | null;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
