import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketEventType } from '@common/enums/ticket-event-type.enum';
import { CalibrationExample } from '@modules/chat/prompts';
import { TicketEvent } from './entities/ticket-event.entity';
import { scoreToPriority } from './utils/priority-score.utils';
import { TicketPriority } from '@common/enums/ticket-priority.enum';

const PRIORITY_LABEL: Record<TicketPriority, string> = {
    [TicketPriority.LOW]: 'Baixa',
    [TicketPriority.MEDIUM]: 'Média',
    [TicketPriority.HIGH]: 'Alta',
    [TicketPriority.CRITICAL]: 'Crítica',
};

@Injectable()
export class AiScoreFeedbackService {
    constructor(
        @InjectRepository(TicketEvent)
        private readonly eventRepo: Repository<TicketEvent>,
    ) {}

    async getFeedbackExamples(limit = 5): Promise<CalibrationExample[]> {
        const events = await this.eventRepo
            .createQueryBuilder('event')
            .leftJoinAndSelect('event.ticket', 'ticket')
            .where('event.type = :type', { type: TicketEventType.PRIORITY_CHANGE })
            .andWhere("event.metadata->>'aiScore' IS NOT NULL")
            .orderBy('event.created_at', 'DESC')
            .take(limit * 3)
            .getMany();

        const examples: CalibrationExample[] = [];

        for (const event of events) {
            const metadata = event.metadata as {
                from?: string;
                to?: string;
                aiScore?: number;
            } | null;

            if (!metadata || metadata.aiScore === undefined) continue;

            const aiScore = Number(metadata.aiScore);
            if (isNaN(aiScore)) continue;

            const aiImpliedPriority = scoreToPriority(aiScore);
            const agentPriority = metadata.to as TicketPriority | undefined;

            if (!agentPriority || aiImpliedPriority === agentPriority) continue;

            const chatSummary = event.ticket?.chatSummary ?? event.ticket?.title ?? 'problema não especificado';
            const shortSummary = chatSummary.replace(/^Mensagem original do usuario:\s*/i, '').slice(0, 120);

            examples.push({
                chatSummary: shortSummary,
                aiScore,
                agentPriority: PRIORITY_LABEL[agentPriority] ?? agentPriority,
            });

            if (examples.length >= limit) break;
        }

        return examples;
    }
}
