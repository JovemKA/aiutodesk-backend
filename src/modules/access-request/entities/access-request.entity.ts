import { UserRole } from '@common/enums/user-role.enum';
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
} from 'typeorm';
import { AccessRequestStatus } from '../enums/access-request-status.enum';
import { AccessRequestType } from '../enums/access-request-type.enum';

@Entity('access_requests')
export class AccessRequest {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index()
    @ManyToOne(() => User, { nullable: false })
    @JoinColumn({ name: 'requester_id' })
    requester!: User;

    @Index()
    @Column({
        type: 'enum',
        enum: AccessRequestType,
        enumName: 'access_request_type_enum',
        default: AccessRequestType.ROLE_CHANGE,
    })
    type!: AccessRequestType;

    @Column({ name: 'requested_role', type: 'enum', enum: UserRole, nullable: true })
    requestedRole!: UserRole | null;

    @ManyToOne(() => Department, { nullable: true })
    @JoinColumn({ name: 'requested_department_id' })
    requestedDepartment!: Department | null;

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
