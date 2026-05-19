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
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
