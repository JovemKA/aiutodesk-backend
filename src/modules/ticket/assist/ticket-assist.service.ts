import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@common/enums/user-role.enum';
import { GeminiClientProvider } from '@modules/chat/embeddings/gemini-client.provider';
import { TicketService } from '../ticket.service';
import { TicketCommentRetrieverService } from '../rag/ticket-comment-retriever.service';
import { buildTicketAssistInstruction, TicketAssistContext } from './ticket-assist.prompt';

interface AssistActor {
    userId: string;
    role: UserRole;
}

export interface AssistInput {
    ticketId: string;
    intent?: 'suggest_reply' | 'summary';
    query?: string;
}

export interface AssistResult {
    suggestion: string;
    /** Chamados similares (de OUTROS chamados) que embasaram a sugestão — proveniência para a UI. */
    referencedTickets: { ticketId: string; title: string }[];
}

const FALLBACK = 'Não foi possível gerar uma sugestão agora. Tente novamente em instantes.';
const DEFAULT_MODEL = 'gemini-2.5-flash';

@Injectable()
export class TicketAssistService {
    private readonly logger = new Logger(TicketAssistService.name);
    private readonly model: string;
    private readonly temperature: number;
    private readonly maxOutputTokens: number;
    private readonly requestTimeoutMs: number;

    constructor(
        private readonly ticketService: TicketService,
        private readonly retriever: TicketCommentRetrieverService,
        private readonly clientProvider: GeminiClientProvider,
        private readonly configService: ConfigService,
    ) {
        this.model = this.configService.get<string>('gemini.model') ?? DEFAULT_MODEL;
        this.temperature = this.configService.get<number>('gemini.temperature') ?? 0.2;
        this.maxOutputTokens = this.configService.get<number>('gemini.maxOutputTokens') ?? 1024;
        this.requestTimeoutMs = this.configService.get<number>('gemini.requestTimeoutMs') ?? 20000;
    }

    async assist(input: AssistInput, actor: AssistActor): Promise<AssistResult> {
        // Porteiro de acesso: reusa a regra de findOne (DEV restrito ao próprio depto, etc.).
        const ticket = await this.ticketService.findOne(input.ticketId, actor);
        const intent = input.intent ?? 'suggest_reply';

        const query =
            input.query?.trim() ||
            `${ticket.title}\n${ticket.description}`.trim();

        const comments = await this.retriever.retrieve({
            query,
            ticketId: ticket.id,
            departmentId: ticket.department?.id ?? null,
        });

        const referencedTickets = this.collectReferences(comments, ticket.id);

        const client = this.clientProvider.getClient();
        if (!client) {
            return { suggestion: FALLBACK, referencedTickets };
        }

        const context: TicketAssistContext = {
            ticketId: ticket.id,
            ticketTitle: ticket.title,
            ticketDescription: ticket.description,
            comments,
            intent,
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
        try {
            const response = await client.models.generateContent({
                model: this.model,
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: intent === 'summary' ? 'Resuma este chamado.' : 'Sugira uma resposta para este chamado.' }],
                    },
                ],
                config: {
                    systemInstruction: buildTicketAssistInstruction(context),
                    temperature: this.temperature,
                    maxOutputTokens: this.maxOutputTokens,
                    thinkingConfig: { thinkingBudget: 0, includeThoughts: false },
                },
            });

            const text = response.text?.trim();
            return { suggestion: text || FALLBACK, referencedTickets };
        } catch (error) {
            this.logger.error('Erro ao gerar assistência de chamado', error as Error);
            return { suggestion: FALLBACK, referencedTickets };
        } finally {
            clearTimeout(timeout);
        }
    }

    private collectReferences(
        comments: { ticketId: string; ticketTitle: string; sameTicket: boolean }[],
        currentTicketId: string,
    ): { ticketId: string; title: string }[] {
        const seen = new Map<string, string>();
        for (const c of comments) {
            if (c.sameTicket || c.ticketId === currentTicketId) continue;
            if (!seen.has(c.ticketId)) seen.set(c.ticketId, c.ticketTitle);
        }
        return Array.from(seen.entries()).map(([ticketId, title]) => ({ ticketId, title }));
    }
}
