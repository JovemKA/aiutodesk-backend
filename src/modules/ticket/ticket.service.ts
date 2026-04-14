import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { TicketPriority } from '@common/enums/ticket-priority.enum';
import { TicketStatus } from '@common/enums/ticket-status.enum';
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

@Injectable()
export class TicketService {
    constructor(
        @InjectRepository(Ticket)
        private readonly ticketRepo: Repository<Ticket>,
    ) {}

    async create(dto: CreateTicketDto, requesterId: string): Promise<Ticket> {
        const ticket = this.ticketRepo.create({
            title: dto.title,
            description: dto.description,
            priority: dto.priority ?? TicketPriority.MEDIUM,
            status: TicketStatus.OPEN,
            requester: { id: requesterId } as Ticket['requester'],
            assignedUser: null,
            department: dto.department_id
                ? ({ id: dto.department_id } as Ticket['department'])
                : null,
            category: dto.category_id
                ? ({ id: dto.category_id } as Ticket['category'])
                : null,
        });

        const savedTicket = await this.ticketRepo.save(ticket);
        return this.findOne(savedTicket.id);
    }

    async findAll(filters?: TicketFilters): Promise<Ticket[]> {
        const where: FindOptionsWhere<Ticket> = {};

        if (filters?.status) {
            where.status = filters.status;
        }

        if (filters?.priority) {
            where.priority = filters.priority;
        }

        if (filters?.assignedTo) {
            where.assignedUser = { id: filters.assignedTo } as any;
        }

        if (filters?.departmentId) {
            where.department = { id: filters.departmentId } as any;
        }

        return this.ticketRepo.find({
            where,
            relations: {
                requester: true,
                assignedUser: true,
                department: true,
                category: true,
            },
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string): Promise<Ticket> {
        const ticket = await this.ticketRepo.findOne({
            where: { id },
            relations: {
                requester: true,
                assignedUser: true,
                department: true,
                category: true,
            },
        });

        if (!ticket) {
            throw new NotFoundException(`Ticket com id ${id} nao encontrado.`);
        }

        return ticket;
    }

    async update(id: string, dto: UpdateTicketDto): Promise<Ticket> {
        const ticket = await this.findOne(id);

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
        return this.findOne(id);
    }

    async assign(id: string, assignTicketDto: AssignTicketDto): Promise<Ticket> {
        const ticket = await this.findOne(id);
        ticket.assignedUser = { id: assignTicketDto.assigned_user_id } as Ticket['assignedUser'];

        await this.ticketRepo.save(ticket);
        return this.findOne(id);
    }

    async updateStatus(id: string, updateStatusDto: UpdateStatusDto): Promise<Ticket> {
        const ticket = await this.findOne(id);
        ticket.status = updateStatusDto.status;

        if (
            updateStatusDto.status === TicketStatus.RESOLVED ||
            updateStatusDto.status === TicketStatus.CLOSED
        ) {
            ticket.resolvedAt = ticket.resolvedAt ?? new Date();
        }

        await this.ticketRepo.save(ticket);
        return this.findOne(id);
    }

    async remove(id: string): Promise<void> {
        const ticket = await this.findOne(id);
        await this.ticketRepo.remove(ticket);
    }
}
