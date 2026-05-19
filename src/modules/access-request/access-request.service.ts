import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '@common/enums/user-role.enum';
import { User } from '@modules/user/entities/user.entity';
import { AccessRequest } from './entities/access-request.entity';
import { AccessRequestStatus } from './enums/access-request-status.enum';
import { CreateAccessRequestDto } from './dto/create-access-request.dto';

@Injectable()
export class AccessRequestService {
    constructor(
        @InjectRepository(AccessRequest)
        private readonly accessRequestRepo: Repository<AccessRequest>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
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

        const pending = await this.accessRequestRepo.findOne({
            where: {
                requester: { id: requesterId },
                status: AccessRequestStatus.PENDING,
            },
            relations: { requester: true },
        });

        if (pending) {
            throw new BadRequestException('There is already a pending access request for this user');
        }

        const entity = this.accessRequestRepo.create({
            requester: { id: requesterId } as User,
            requestedRole: dto.requestedRole,
            status: AccessRequestStatus.PENDING,
            reviewedBy: null,
            reviewedAt: null,
        });

        return this.accessRequestRepo.save(entity);
    }

    listPending() {
        return this.accessRequestRepo.find({
            where: { status: AccessRequestStatus.PENDING },
            relations: { requester: true, reviewedBy: true },
            order: { createdAt: 'ASC' },
        });
    }

    async getPendingByRequester(requesterId: string) {
        return this.accessRequestRepo.findOne({
            where: {
                requester: { id: requesterId },
                status: AccessRequestStatus.PENDING,
            },
            relations: { requester: true, reviewedBy: true },
        });
    }

    async approve(id: string, reviewerId: string) {
        const request = await this.accessRequestRepo.findOne({
            where: { id },
            relations: { requester: true },
        });

        if (!request) {
            throw new NotFoundException('Access request not found');
        }

        if (request.status !== AccessRequestStatus.PENDING) {
            throw new BadRequestException('Only pending requests can be approved');
        }

        await this.userRepo.update(
            { id: request.requester.id },
            { role: request.requestedRole },
        );

        request.status = AccessRequestStatus.APPROVED;
        request.reviewedBy = { id: reviewerId } as User;
        request.reviewedAt = new Date();

        return this.accessRequestRepo.save(request);
    }

    async reject(id: string, reviewerId: string) {
        const request = await this.accessRequestRepo.findOne({
            where: { id },
            relations: { requester: true },
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
}
