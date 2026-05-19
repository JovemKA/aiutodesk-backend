import { Injectable } from '@nestjs/common';
import { TicketPriority } from '@common/enums/ticket-priority.enum';
import { TicketStatus } from '@common/enums/ticket-status.enum';

@Injectable()
export class DashboardService {
	kpis() {
		return {
			openCount: 0,
			avgResolutionMinutes: 0,
			slaBreaches: 0,
			csatPercent: 0,
			resolvedToday: 0,
			pendingCount: 0,
			weeklyTrend: [],
			byPriority: {
				[TicketPriority.LOW]: 0,
				[TicketPriority.MEDIUM]: 0,
				[TicketPriority.HIGH]: 0,
				[TicketPriority.CRITICAL]: 0,
			},
			byCategory: {},
			byStatus: {
				[TicketStatus.OPEN]: 0,
				[TicketStatus.IN_PROGRESS]: 0,
				[TicketStatus.RESOLVED]: 0,
				[TicketStatus.CLOSED]: 0,
			},
			criticalTickets: [],
			quickStats: {
				totalOpen: 0,
				avgResponseMinutes: 0,
				slaTargetMinutes: 0,
			},
		};
	}
}
