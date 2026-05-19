import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TicketPriority } from '@common/enums/ticket-priority.enum';
import { TicketStatus } from '@common/enums/ticket-status.enum';
import { UserRole } from '@common/enums/user-role.enum';
import { User } from '@modules/user/entities/user.entity';
import { UserDepartment } from '@modules/user/entities/user-department.entity';
import { Ticket } from './entities/ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

interface TicketFilters {
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedTo?: string;
    departmentId?: string;
}

interface TicketActor {
    userId: string;
    role: UserRole;
}

interface CreateChatEscalationInput {
    requesterId: string;
    inferredSubject: string;
    summary: string;
    conversationId: string;
    priority?: TicketPriority;
}

interface AssignableUserDto {
    id: string;
    name: string;
    email: string;
    role: UserRole;
}

@Injectable()
export class TicketService {
    constructor(
        @InjectRepository(Ticket)
        private readonly ticketRepo: Repository<Ticket>,
        @InjectRepository(UserDepartment)
        private readonly userDepartmentRepo: Repository<UserDepartment>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) {}

    async create(dto: CreateTicketDto, requesterId: string, role: UserRole): Promise<Ticket> {
        if (role === UserRole.DEV) {
            if (!dto.department_id) {
                throw new BadRequestException('Dev deve informar o departamento do chamado.');
            }

            const allowedDepartmentIds = await this.getAllowedDepartmentIds(requesterId);
            if (!allowedDepartmentIds.includes(dto.department_id)) {
                throw new ForbiddenException('Dev só pode abrir chamado no próprio departamento.');
            }
        }

        const ticket = this.ticketRepo.create({
            title: dto.title,
            description: dto.description,
            priority: dto.priority ?? TicketPriority.MEDIUM,
            status: TicketStatus.OPEN,
            requester: { id: requesterId } as Ticket['requester'],
            assignedUser: null,
            chatConversationId: null,
            chatSummary: null,
            department: dto.department_id
                ? ({ id: dto.department_id } as Ticket['department'])
                : null,
            category: dto.category_id
                ? ({ id: dto.category_id } as Ticket['category'])
                : null,
        });

        const savedTicket = await this.ticketRepo.save(ticket);
        return this.findOne(savedTicket.id, { userId: requesterId, role });
    }

    async createFromChatEscalation(input: CreateChatEscalationInput): Promise<Ticket> {
        const ticket = this.ticketRepo.create({
            title: input.inferredSubject,
            description: input.summary,
            priority: input.priority ?? TicketPriority.MEDIUM,
            status: TicketStatus.OPEN,
            requester: { id: input.requesterId } as Ticket['requester'],
            assignedUser: null,
            department: null,
            category: null,
            chatConversationId: input.conversationId,
            chatSummary: input.summary,
        });

        const savedTicket = await this.ticketRepo.save(ticket);
        return this.findOne(savedTicket.id, { userId: input.requesterId, role: UserRole.USER });
    }

    async findAll(filters: TicketFilters | undefined, actor: TicketActor): Promise<Ticket[]> {
        const qb = this.ticketRepo
            .createQueryBuilder('ticket')
            .leftJoinAndSelect('ticket.requester', 'requester')
            .leftJoinAndSelect('ticket.assignedUser', 'assignedUser')
            .leftJoinAndSelect('ticket.department', 'department')
            .leftJoinAndSelect('ticket.category', 'category')
            .orderBy('ticket.createdAt', 'DESC');

        if (filters?.status) {
            qb.andWhere('ticket.status = :status', { status: filters.status });
        }

        if (filters?.priority) {
            qb.andWhere('ticket.priority = :priority', { priority: filters.priority });
        }

        if (filters?.assignedTo) {
            qb.andWhere('assignedUser.id = :assignedTo', { assignedTo: filters.assignedTo });
        }

        if (filters?.departmentId) {
            qb.andWhere('department.id = :departmentId', { departmentId: filters.departmentId });
        }

        if (actor.role === UserRole.DEV) {
            const allowedDepartmentIds = await this.getAllowedDepartmentIds(actor.userId);
            if (allowedDepartmentIds.length === 0) {
                return [];
            }

            qb.andWhere('department.id IN (:...allowedDepartmentIds)', { allowedDepartmentIds });
        }

        return qb.getMany();
    }

    async findOne(id: string, actor: TicketActor): Promise<Ticket> {
        const qb = this.ticketRepo
            .createQueryBuilder('ticket')
            .leftJoinAndSelect('ticket.requester', 'requester')
            .leftJoinAndSelect('ticket.assignedUser', 'assignedUser')
            .leftJoinAndSelect('ticket.department', 'department')
            .leftJoinAndSelect('ticket.category', 'category')
            .where('ticket.id = :id', { id });

        if (actor.role === UserRole.DEV) {
            const allowedDepartmentIds = await this.getAllowedDepartmentIds(actor.userId);
            if (allowedDepartmentIds.length === 0) {
                throw new NotFoundException(`Ticket com id ${id} nao encontrado.`);
            }

            qb.andWhere('department.id IN (:...allowedDepartmentIds)', { allowedDepartmentIds });
        }

        const ticket = await qb.getOne();

        if (!ticket) {
            throw new NotFoundException(`Ticket com id ${id} nao encontrado.`);
        }

        return ticket;
    }

    async update(id: string, dto: UpdateTicketDto, actor: TicketActor): Promise<Ticket> {
        const ticket = await this.findOne(id, actor);

        if (dto.title !== undefined) {
            ticket.title = dto.title;
        }

        if (dto.description !== undefined) {
            ticket.description = dto.description;
        }

        if (dto.priority !== undefined) {
            ticket.priority = dto.priority;
        }

        if (dto.category_id !== undefined) {
            ticket.category = dto.category_id
                ? ({ id: dto.category_id } as Ticket['category'])
                : null;
        }

        if (dto.department_id !== undefined) {
            ticket.department = dto.department_id
                ? ({ id: dto.department_id } as Ticket['department'])
                : null;
        }

        await this.ticketRepo.save(ticket);
        return this.findOne(id, actor);
    }

    async assign(id: string, assignTicketDto: AssignTicketDto, actor: TicketActor): Promise<Ticket> {
        const ticket = await this.findOne(id, actor);

        const assignee = await this.userRepo.findOne({ where: { id: assignTicketDto.assigned_user_id } });
        if (!assignee) {
            throw new NotFoundException('Usuário para atribuição não encontrado.');
        }

        await this.assertUserCanBeAssigned(ticket, assignee);
        ticket.assignedUser = { id: assignTicketDto.assigned_user_id } as Ticket['assignedUser'];

        await this.ticketRepo.save(ticket);
        return this.findOne(id, actor);
    }

    async findAssignableUsers(id: string, actor: TicketActor): Promise<AssignableUserDto[]> {
        const ticket = await this.findOne(id, actor);
        const candidates = await this.userRepo.find({
            where: {
                role: In([UserRole.DEV, UserRole.MASTER, UserRole.ADMIN]),
                isActive: true,
            },
            order: { name: 'ASC' },
        });

        const devCandidates = candidates.filter((user) => user.role === UserRole.DEV);
        const devDepartmentIds = await this.getDepartmentIdsByUser(devCandidates.map((user) => user.id));
        const ticketDepartmentId = ticket.department?.id ?? null;

        return candidates
            .filter((user) => {
                if (user.role === UserRole.ADMIN || user.role === UserRole.MASTER) {
                    return true;
                }

                if (user.role === UserRole.DEV) {
                    if (!ticketDepartmentId) {
                        return false;
                    }

                    const linkedDepartments = devDepartmentIds.get(user.id) ?? [];
                    return linkedDepartments.includes(ticketDepartmentId);
                }

                return false;
            })
            .map((user) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            }));
    }

    async updateStatus(id: string, updateStatusDto: UpdateStatusDto, actor: TicketActor): Promise<Ticket> {
        const ticket = await this.findOne(id, actor);
        ticket.status = updateStatusDto.status;

        if (
            updateStatusDto.status === TicketStatus.RESOLVED ||
            updateStatusDto.status === TicketStatus.CLOSED
        ) {
            ticket.resolvedAt = ticket.resolvedAt ?? new Date();
        }

        await this.ticketRepo.save(ticket);
        return this.findOne(id, actor);
    }

    async remove(id: string, actor: TicketActor): Promise<void> {
        const ticket = await this.findOne(id, actor);
        await this.ticketRepo.remove(ticket);
    }

    private async getAllowedDepartmentIds(userId: string): Promise<string[]> {
        const links = await this.userDepartmentRepo.find({
            where: { user: { id: userId } },
            relations: { department: true },
        });

        return links
            .map((link) => link.department?.id)
            .filter((id): id is string => Boolean(id));
    }

    private async assertUserCanBeAssigned(ticket: Ticket, assignee: User): Promise<void> {
        if (![UserRole.DEV, UserRole.MASTER, UserRole.ADMIN].includes(assignee.role)) {
            throw new ForbiddenException('Somente usuários Dev, Master ou Admin podem ser atribuídos.');
        }

        if (assignee.role === UserRole.ADMIN || assignee.role === UserRole.MASTER) {
            return;
        }

        const ticketDepartmentId = ticket.department?.id;
        if (!ticketDepartmentId) {
            throw new ForbiddenException('Tickets sem departamento não podem ser atribuídos para Dev.');
        }

        const allowedDepartmentIds = await this.getAllowedDepartmentIds(assignee.id);
        if (!allowedDepartmentIds.includes(ticketDepartmentId)) {
            throw new ForbiddenException('Dev só pode ser atribuído a ticket do próprio departamento.');
        }
    }

    private async getDepartmentIdsByUser(userIds: string[]): Promise<Map<string, string[]>> {
        const map = new Map<string, string[]>();
        if (userIds.length === 0) {
            return map;
        }

        const links = await this.userDepartmentRepo.find({
            where: { user: { id: In(userIds) } },
            relations: { user: true, department: true },
        });

        for (const link of links) {
            const userId = link.user?.id;
            const departmentId = link.department?.id;
            if (!userId || !departmentId) {
                continue;
            }
            const existing = map.get(userId) ?? [];
            existing.push(departmentId);
            map.set(userId, existing);
        }

        return map;
    }
}
