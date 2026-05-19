import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketPriority } from '@common/enums/ticket-priority.enum';
import { TicketStatus } from '@common/enums/ticket-status.enum';
import { Ticket } from '@modules/ticket/entities/ticket.entity';

@Injectable()
export class DashboardService {
	constructor(
		@InjectRepository(Ticket)
		private readonly ticketRepo: Repository<Ticket>,
	) {}

	async kpis() {
		const tickets = await this.ticketRepo.find({
			relations: { requester: true, department: true },
			order: { createdAt: 'DESC' },
			take: 1000,
		});

		const openStatuses = [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_USER];
		const now = new Date();
		const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

		const openCount = tickets.filter((ticket) => openStatuses.includes(ticket.status)).length;
		const pendingCount = tickets.filter((ticket) => ticket.status === TicketStatus.WAITING_USER).length;
		const resolvedToday = tickets.filter((ticket) => {
			if (!ticket.resolvedAt) {
				return false;
			}
			return ticket.resolvedAt >= startOfToday;
		}).length;

		const byPriority = {
			LOW: 0,
			MEDIUM: 0,
			HIGH: 0,
			URGENT: 0,
		} as Record<string, number>;

		const priorityMap: Record<string, keyof typeof byPriority> = {
			[TicketPriority.LOW]: 'LOW',
			[TicketPriority.MEDIUM]: 'MEDIUM',
			[TicketPriority.HIGH]: 'HIGH',
			[TicketPriority.CRITICAL]: 'URGENT',
		};

		for (const ticket of tickets) {
			const mappedKey = priorityMap[ticket.priority];
			if (mappedKey) {
				byPriority[mappedKey] += 1;
			}
		}

		const byStatus = {
			OPEN: 0,
			IN_PROGRESS: 0,
			WAITING_CUSTOMER: 0,
			RESOLVED: 0,
			CLOSED: 0,
		} as Record<string, number>;

		const statusMap: Record<string, keyof typeof byStatus> = {
			[TicketStatus.OPEN]: 'OPEN',
			[TicketStatus.IN_PROGRESS]: 'IN_PROGRESS',
			[TicketStatus.WAITING_USER]: 'WAITING_CUSTOMER',
			[TicketStatus.RESOLVED]: 'RESOLVED',
			[TicketStatus.CLOSED]: 'CLOSED',
		};

		for (const ticket of tickets) {
			const mappedKey = statusMap[ticket.status];
			if (mappedKey) {
				byStatus[mappedKey] += 1;
			}
		}

		const byDepartment: Record<string, number> = {};
		for (const ticket of tickets) {
			const name = ticket.department?.name?.trim() || 'Sem departamento';
			byDepartment[name] = (byDepartment[name] ?? 0) + 1;
		}

		const weeklyTrend = Array.from({ length: 7 }).map((_, index) => {
			const day = new Date(startOfToday);
			day.setDate(startOfToday.getDate() - (6 - index));
			const dayEnd = new Date(day);
			dayEnd.setDate(day.getDate() + 1);

			const opened = tickets.filter((ticket) => ticket.createdAt >= day && ticket.createdAt < dayEnd).length;
			const resolved = tickets.filter((ticket) => {
				const resolvedAt = ticket.resolvedAt;
				return Boolean(resolvedAt && resolvedAt >= day && resolvedAt < dayEnd);
			}).length;

			return {
				date: day.toISOString(),
				opened,
				resolved,
			};
		});

		const criticalTickets = tickets
			.filter((ticket) => {
				const isP1orP2 = ticket.priority === TicketPriority.CRITICAL || ticket.priority === TicketPriority.HIGH;
				const isStillActive = ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED;
				return isP1orP2 && isStillActive;
			})
			.slice(0, 10)
			.map((ticket) => ({
				id: ticket.id,
				code: `TK-${ticket.id.slice(0, 8).toUpperCase()}`,
				subject: ticket.title,
				priority: priorityMap[ticket.priority] ?? 'MEDIUM',
				createdAt: ticket.createdAt.toISOString(),
				requesterName: ticket.requester?.name ?? 'Sem solicitante',
			}));

		return {
			openCount,
			avgResolutionMinutes: null,
			slaBreaches: null,
			csatPercent: null,
			resolvedToday,
			pendingCount,
			weeklyTrend,
			byPriority,
			byCategory: {},
			byStatus,
			byDepartment,
			criticalTickets,
			quickStats: {
				totalOpen: openCount,
				avgResponseMinutes: null,
				slaTargetMinutes: null,
			},
		};
	}
}
