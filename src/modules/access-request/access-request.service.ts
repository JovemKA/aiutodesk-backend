import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '@common/enums/user-role.enum';
import { Department } from '@modules/department/entities/department.entity';
import { User } from '@modules/user/entities/user.entity';
import { UserDepartment } from '@modules/user/entities/user-department.entity';
import { AccessRequest } from './entities/access-request.entity';
import { AccessRequestStatus } from './enums/access-request-status.enum';
import { AccessRequestType } from './enums/access-request-type.enum';
import { CreateAccessRequestDto } from './dto/create-access-request.dto';

@Injectable()
export class AccessRequestService {
    constructor(
        @InjectRepository(AccessRequest)
        private readonly accessRequestRepo: Repository<AccessRequest>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(UserDepartment)
        private readonly userDepartmentRepo: Repository<UserDepartment>,
        @InjectRepository(Department)
        private readonly departmentRepo: Repository<Department>,
    ) {}

    async create(requesterId: string, dto: CreateAccessRequestDto) {
        const requester = await this.userRepo.findOne({ where: { id: requesterId } });
        if (!requester) {
            throw new NotFoundException('Requester not found');
        }

        if (![UserRole.USER, UserRole.DEV].includes(requester.role as UserRole)) {
            throw new ForbiddenException('Only user or dev roles can request access changes');
        }

        if (![UserRole.DEV, UserRole.MASTER, UserRole.ADMIN].includes(dto.requestedRole)) {
            throw new BadRequestException('Invalid target role for access request');
        }

        if (dto.requestedRole === requester.role) {
            throw new BadRequestException('Requested role must be different from current role');
        }

        await this.ensureNoPendingRequest(requesterId);

        const entity = this.accessRequestRepo.create({
            requester: { id: requesterId } as User,
            requestedRole: dto.requestedRole,
            requestedDepartment: null,
            type: AccessRequestType.ROLE_CHANGE,
            status: AccessRequestStatus.PENDING,
            reviewedBy: null,
            reviewedAt: null,
        });

        return this.accessRequestRepo.save(entity);
    }

    listPending() {
        return this.accessRequestRepo.find({
            where: { status: AccessRequestStatus.PENDING },
            relations: { requester: true, reviewedBy: true, requestedDepartment: true },
            order: { createdAt: 'ASC' },
        });
    }

    async getPendingByRequester(requesterId: string) {
        return this.accessRequestRepo.findOne({
            where: {
                requester: { id: requesterId },
                status: AccessRequestStatus.PENDING,
            },
            relations: { requester: true, reviewedBy: true, requestedDepartment: true },
        });
    }

    async approve(id: string, reviewerId: string, departmentId?: string) {
        const request = await this.accessRequestRepo.findOne({
            where: { id },
            relations: { requester: true, requestedDepartment: true },
        });

        if (!request) {
            throw new NotFoundException('Access request not found');
        }

        if (request.status !== AccessRequestStatus.PENDING) {
            throw new BadRequestException('Only pending requests can be approved');
        }

        const type = request.type ?? AccessRequestType.ROLE_CHANGE;

        if (type === AccessRequestType.ROLE_CHANGE) {
            await this.approveRoleChange(request, departmentId);
        } else if (type === AccessRequestType.DEPARTMENT_INCLUSION) {
            await this.approveDepartmentInclusion(request);
        } else if (type === AccessRequestType.PRIMARY_DEPARTMENT_CHANGE) {
            await this.approvePrimaryDepartmentChange(request);
        } else {
            throw new BadRequestException('Unsupported access request type');
        }

        request.status = AccessRequestStatus.APPROVED;
        request.reviewedBy = { id: reviewerId } as User;
        request.reviewedAt = new Date();

        return this.accessRequestRepo.save(request);
    }

    async reject(id: string, reviewerId: string) {
        const request = await this.accessRequestRepo.findOne({
            where: { id },
            relations: { requester: true, requestedDepartment: true },
        });

        if (!request) {
            throw new NotFoundException('Access request not found');
        }

        if (request.status !== AccessRequestStatus.PENDING) {
            throw new BadRequestException('Only pending requests can be rejected');
        }

        request.status = AccessRequestStatus.REJECTED;
        request.reviewedBy = { id: reviewerId } as User;
        request.reviewedAt = new Date();

        return this.accessRequestRepo.save(request);
    }

    private async approveRoleChange(request: AccessRequest, departmentId?: string) {
        if (!request.requestedRole) {
            throw new BadRequestException('Requested role is required for role changes');
        }

        if (request.requestedRole === UserRole.DEV) {
            if (!departmentId) {
                throw new BadRequestException('Department is required when approving DEV access');
            }

            const department = await this.findDepartment(departmentId);
            await this.userDepartmentRepo.delete({ user: { id: request.requester.id } as User });
            await this.userDepartmentRepo.save(
                this.userDepartmentRepo.create({
                    user: { id: request.requester.id } as User,
                    department: { id: department.id } as Department,
                    isPrimary: true,
                }),
            );
        } else {
            await this.userDepartmentRepo.delete({ user: { id: request.requester.id } as User });
        }

        await this.userRepo.update(
            { id: request.requester.id },
            { role: request.requestedRole },
        );
    }

    private async approveDepartmentInclusion(request: AccessRequest) {
        this.assertRequesterIsDev(request);
        const department = this.getRequestedDepartment(request);

        const existing = await this.userDepartmentRepo.findOne({
            where: {
                user: { id: request.requester.id },
                department: { id: department.id } as Department,
            },
        });

        if (existing) {
            await this.ensurePrimaryDepartment(request.requester.id);
            return;
        }

        await this.userDepartmentRepo.save(
            this.userDepartmentRepo.create({
                user: { id: request.requester.id } as User,
                department: { id: department.id } as Department,
                isPrimary: false,
            }),
        );

        await this.ensurePrimaryDepartment(request.requester.id);
    }

    private async approvePrimaryDepartmentChange(request: AccessRequest) {
        this.assertRequesterIsDev(request);
        const department = this.getRequestedDepartment(request);
        await this.setPrimaryDepartment(request.requester.id, department.id);
    }

    private assertRequesterIsDev(request: AccessRequest) {
        if (request.requester.role !== UserRole.DEV) {
            throw new BadRequestException('Requester must be DEV for this request type');
        }
    }

    private getRequestedDepartment(request: AccessRequest): Department {
        if (!request.requestedDepartment) {
            throw new BadRequestException('Requested department is required');
        }
        return request.requestedDepartment;
    }

    private async findDepartment(id: string): Promise<Department> {
        const department = await this.departmentRepo.findOne({ where: { id } });
        if (!department) {
            throw new NotFoundException('Department not found');
        }
        return department;
    }

    private async setPrimaryDepartment(userId: string, departmentId: string) {
        const links = await this.userDepartmentRepo.find({
            where: { user: { id: userId } },
            relations: ['department'],
            order: { id: 'ASC' },
        });
        const target = links.find((link) => link.department?.id === departmentId);
        if (!target) {
            throw new BadRequestException('Department is not linked to requester');
        }

        for (const link of links) {
            link.isPrimary = link.id === target.id;
        }
        await this.userDepartmentRepo.save(links);
    }

    private async hasPrimaryDepartment(userId: string): Promise<boolean> {
        const count = await this.userDepartmentRepo.count({
            where: {
                user: { id: userId },
                isPrimary: true,
            },
        });
        return count > 0;
    }

    private async ensurePrimaryDepartment(userId: string): Promise<void> {
        const links = await this.userDepartmentRepo.find({
            where: { user: { id: userId } },
            order: { id: 'ASC' },
        });
        if (links.length === 0 || links.some((link) => link.isPrimary)) {
            return;
        }

        links[0].isPrimary = true;
        await this.userDepartmentRepo.save(links[0]);
    }

    private async normalizePrimaryDepartment(userId: string, primaryLinkId: string): Promise<void> {
        const links = await this.userDepartmentRepo.find({
            where: { user: { id: userId } },
        });
        for (const link of links) {
            link.isPrimary = link.id === primaryLinkId;
        }
        await this.userDepartmentRepo.save(links);
    }

    private async ensureNoPendingRequest(requesterId: string): Promise<void> {
        const pending = await this.accessRequestRepo.findOne({
            where: {
                requester: { id: requesterId },
                status: AccessRequestStatus.PENDING,
            },
        });

        if (pending) {
            throw new BadRequestException('There is already a pending access request for this user');
        }
    }
}
