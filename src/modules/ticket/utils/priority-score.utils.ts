import { TicketPriority } from '@common/enums/ticket-priority.enum';

export const PRIORITY_SCORE_THRESHOLDS = {
    CRITICAL: 75,
    HIGH: 50,
    MEDIUM: 25,
} as const;

export function scoreToPriority(score: number): TicketPriority {
    if (score >= PRIORITY_SCORE_THRESHOLDS.CRITICAL) return TicketPriority.CRITICAL;
    if (score >= PRIORITY_SCORE_THRESHOLDS.HIGH) return TicketPriority.HIGH;
    if (score >= PRIORITY_SCORE_THRESHOLDS.MEDIUM) return TicketPriority.MEDIUM;
    return TicketPriority.LOW;
}

export function isValidPriorityScore(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}
