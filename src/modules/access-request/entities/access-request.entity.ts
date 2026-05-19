import { UserRole } from '@common/enums/user-role.enum';
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
import { AccessRequestStatus } from '../enums/access-request-status.enum';

@Entity('access_requests')
export class AccessRequest {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index()
    @ManyToOne(() => User, { nullable: false })
    @JoinColumn({ name: 'requester_id' })
    requester!: User;

    @Column({ name: 'requested_role', type: 'enum', enum: UserRole })
    requestedRole!: UserRole;

    @Index()
    @Column({ type: 'enum', enum: AccessRequestStatus, default: AccessRequestStatus.PENDING })
    status!: AccessRequestStatus;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'reviewed_by_id' })
    reviewedBy!: User | null;

    @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
    reviewedAt!: Date | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt!: Date;
}
