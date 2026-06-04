import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TicketPriority } from '@common/enums/ticket-priority.enum';
import { TicketStatus } from '@common/enums/ticket-status.enum';
import { TicketEventType } from '@common/enums/ticket-event-type.enum';
import { scoreToPriority } from './utils/priority-score.utils';
import { UserRole } from '@common/enums/user-role.enum';
import { User } from '@modules/user/entities/user.entity';
import { UserDepartment } from '@modules/user/entities/user-department.entity';
import { Ticket } from './entities/ticket.entity';
import { TicketEvent } from './entities/ticket-event.entity';
import { TicketMessage, TicketMessageAttachment } from './entities/ticket-message.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto';
import { TicketCommentIndexerService } from './indexing/ticket-comment-indexer.service';

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
    priorityScore?: number;
    priorityReason?: string;
    scoreConfidence?: string;
}

interface AssignableUserDto {
    id: string;
    name: string;
    email: string;
    role: UserRole;
}

export interface TicketMessageDto {
    id: string;
    ticketId: string;
    authorId: string | null;
    authorRole: 'requester' | 'agent' | 'system';
    body: string;
    createdAt: string;
    internalNote: boolean;
    attachments?: TicketMessageAttachment[];
}

@Injectable()
export class TicketService {
    private readonly logger = new Logger(TicketService.name);

    constructor(
        @InjectRepository(Ticket)
        private readonly ticketRepo: Repository<Ticket>,
        @InjectRepository(TicketEvent)
        private readonly eventRepo: Repository<TicketEvent>,
        @InjectRepository(TicketMessage)
        private readonly messageRepo: Repository<TicketMessage>,
        @InjectRepository(UserDepartment)
        private readonly userDepartmentRepo: Repository<UserDepartment>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        private readonly commentIndexer: TicketCommentIndexerService,
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
        const resolvedPriority =
            input.priorityScore !== undefined
                ? scoreToPriority(input.priorityScore)
                : (input.priority ?? TicketPriority.MEDIUM);

        const ticket = this.ticketRepo.create({
            title: input.inferredSubject,
            description: input.summary,
            priority: resolvedPriority,
            priorityScore: input.priorityScore ?? null,
            priorityReason: input.priorityReason ?? null,
            scoreConfidence: input.scoreConfidence ?? null,
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

        if (dto.priority !== undefined && dto.priority !== ticket.priority) {
            const previousPriority = ticket.priority;
            ticket.priority = dto.priority;
            await this.eventRepo.save(
                this.eventRepo.create({
                    ticket: { id } as Ticket,
                    type: TicketEventType.PRIORITY_CHANGE,
                    actor: actor.userId ? ({ id: actor.userId } as User) : null,
                    metadata: {
                        from: previousPriority,
                        to: dto.priority,
                        aiScore: ticket.priorityScore ?? undefined,
                        aiScoreConfidence: ticket.scoreConfidence ?? undefined,
                    },
                }),
            );
        } else if (dto.priority !== undefined) {
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
        const previousStatus = ticket.status;
        ticket.status = updateStatusDto.status;

        if (
            updateStatusDto.status === TicketStatus.RESOLVED ||
            updateStatusDto.status === TicketStatus.CLOSED
        ) {
            ticket.resolvedAt = ticket.resolvedAt ?? new Date();
        }

        await this.ticketRepo.save(ticket);

        if (updateStatusDto.status !== previousStatus) {
            await this.eventRepo.save(
                this.eventRepo.create({
                    ticket: { id } as Ticket,
                    type: TicketEventType.STATUS_CHANGE,
                    actor: actor.userId ? ({ id: actor.userId } as User) : null,
                    metadata: { from: previousStatus, to: updateStatusDto.status },
                }),
            );
        }

        return this.findOne(id, actor);
    }

    async findEvents(id: string, actor: TicketActor): Promise<TicketEvent[]> {
        await this.findOne(id, actor);
        return this.eventRepo.find({
            where: { ticket: { id } },
            relations: { actor: true },
            order: { createdAt: 'ASC' },
        });
    }

    async listMessages(id: string, actor: TicketActor): Promise<TicketMessageDto[]> {
        const ticket = await this.findOne(id, actor);
        const messages = await this.messageRepo.find({
            where: { ticket: { id } },
            relations: { author: true },
            order: { createdAt: 'ASC' },
        });

        return messages.map((message) => this.toMessageDto(message, ticket));
    }

    async createMessage(
        id: string,
        dto: CreateTicketMessageDto,
        actor: TicketActor,
    ): Promise<TicketMessageDto> {
        const ticket = await this.findOne(id, actor);
        const internalNote = dto.internalNote ?? false;

        const saved = await this.messageRepo.save(
            this.messageRepo.create({
                ticket: { id } as Ticket,
                author: { id: actor.userId } as User,
                body: dto.body,
                internalNote,
                attachments: null,
            }),
        );

        await this.eventRepo.save(
            this.eventRepo.create({
                ticket: { id } as Ticket,
                type: internalNote ? TicketEventType.NOTE : TicketEventType.REPLY,
                actor: actor.userId ? ({ id: actor.userId } as User) : null,
                metadata: { messageId: saved.id, internalNote },
            }),
        );

        // Indexa o comentário no RAG escopado (somente público), em background e best-effort.
        if (!internalNote) {
            void this.commentIndexer
                .indexComment(saved.id)
                .catch((error) =>
                    this.logger.warn(
                        `Falha ao indexar comentário ${saved.id} no RAG: ${(error as Error).message}`,
                    ),
                );
        }

        // Recarrega com o autor para mapear o DTO; o ticket já vem de findOne.
        const persisted = await this.messageRepo.findOne({
            where: { id: saved.id },
            relations: { author: true },
        });

        return this.toMessageDto(persisted ?? saved, ticket);
    }

    private toMessageDto(message: TicketMessage, ticket: Ticket): TicketMessageDto {
        const authorId = message.author?.id ?? null;
        let authorRole: TicketMessageDto['authorRole'] = 'system';
        if (authorId) {
            authorRole = authorId === ticket.requester?.id ? 'requester' : 'agent';
        }

        return {
            id: message.id,
            ticketId: ticket.id,
            authorId,
            authorRole,
            body: message.body,
            createdAt: message.createdAt.toISOString(),
            internalNote: message.internalNote,
            attachments: message.attachments ?? undefined,
        };
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
