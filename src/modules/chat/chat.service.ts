import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { TicketService } from '@modules/ticket/ticket.service';
import { TicketPriority } from '@common/enums/ticket-priority.enum';
import { GeminiChatService } from './gemini-chat.service';
import { ConversationHistoryProvider } from './history/conversation-history.provider';
import { RagRetrieverService, RetrievedChunk } from './rag/rag-retriever.service';
import { KnowledgeBaseInventoryService } from './rag/knowledge-base-inventory.service';
import type {
    KnowledgeBaseChunk,
    KnowledgeBaseInventoryEntry,
} from './prompts/knowledge-base';

const DEFAULT_MAX_MESSAGE_CHARS = 4000;
const TRUNCATION_SUFFIX = ' …[mensagem encurtada]';

interface ChatSource {
    id: string;
    title: string;
    slug: string;
    similarity: number;
}

export interface ChatAnswer {
    answer: string;
    sources: ChatSource[];
    shouldEscalate: boolean;
    escalatedTicketId?: string;
    conversationId?: string;
}

export interface AskChatParams {
    message: string;
    requesterId: string;
    conversationId?: string;
    userName?: string;
}

export type ChatStreamEvent =
    | { type: 'token'; text: string }
    | {
          type: 'meta';
          shouldEscalate: boolean;
          escalatedTicketId?: string;
          conversationId: string;
          sources?: ChatSource[];
      }
    | { type: 'done' }
    | { type: 'error'; message: string };

const ESCALATION_FIXED_REPLY =
    'Vou encaminhar este atendimento para o nosso time. Já abri um chamado e em breve um atendente continuará com você por lá.';

@Injectable()
export class ChatService {
    private readonly logger = new Logger(ChatService.name);
    private readonly maxMessageChars: number;
    private readonly ragEnabled: boolean;

    constructor(
        private readonly ticketService: TicketService,
        private readonly geminiChatService: GeminiChatService,
        private readonly historyProvider: ConversationHistoryProvider,
        private readonly configService: ConfigService,
        private readonly ragRetriever: RagRetrieverService,
        private readonly kbInventory: KnowledgeBaseInventoryService,
    ) {
        this.maxMessageChars =
            this.configService.get<number>('gemini.maxMessageChars') ?? DEFAULT_MAX_MESSAGE_CHARS;
        this.ragEnabled = this.configService.get<boolean>('rag.enabled') ?? true;
    }

    private async retrieveKnowledge(
        message: string,
        requesterId: string,
    ): Promise<RetrievedChunk[]> {
        if (!this.ragEnabled) return [];
        try {
            return await this.ragRetriever.retrieve({ query: message, requesterId });
        } catch (error) {
            this.logger.warn(`Falha no RAG (continuando sem fontes): ${(error as Error).message}`);
            return [];
        }
    }

    private async loadInventory(): Promise<KnowledgeBaseInventoryEntry[]> {
        if (!this.ragEnabled) return [];
        try {
            return await this.kbInventory.listPublished();
        } catch (error) {
            this.logger.warn(
                `Falha ao carregar inventario da KB: ${(error as Error).message}`,
            );
            return [];
        }
    }

    private toKnowledgeBase(chunks: RetrievedChunk[]): KnowledgeBaseChunk[] {
        return chunks.map((c) => ({ title: c.title, slug: c.slug, content: c.content }));
    }

    private toSources(chunks: RetrievedChunk[]): ChatSource[] {
        return chunks.map((c) => ({
            id: c.articleId,
            title: c.title,
            slug: c.slug,
            similarity: Number(c.similarity.toFixed(4)),
        }));
    }

    async ask(params: AskChatParams): Promise<ChatAnswer> {
        const conversationId = this.resolveConversationId(params.conversationId);
        const originalMessage = params.message;
        const llmMessage = this.normalizeForLlm(originalMessage);

        if (this.hasEscalationHint(originalMessage)) {
            await this.persistUserMessageSafe(conversationId, params.requesterId, originalMessage);
            const ticket = await this.escalate(params, conversationId, originalMessage);
            await this.persistAssistantMessageSafe(conversationId, ESCALATION_FIXED_REPLY);
            return {
                answer: ESCALATION_FIXED_REPLY,
                sources: [],
                shouldEscalate: true,
                escalatedTicketId: ticket.id,
                conversationId,
            };
        }

        await this.persistUserMessageSafe(conversationId, params.requesterId, originalMessage);

        const history = await this.historyProvider.get(conversationId, params.requesterId);
        const [retrieved, inventory] = await Promise.all([
            this.retrieveKnowledge(llmMessage, params.requesterId),
            this.loadInventory(),
        ]);
        const knowledgeBase = this.toKnowledgeBase(retrieved);
        const sources = this.toSources(retrieved);

        const result = await this.geminiChatService.generateReply({
            message: llmMessage,
            history,
            user: { name: params.userName },
            knowledgeBase,
            knowledgeBaseInventory: inventory,
        });

        if (!result.hadError && result.cleanText) {
            await this.persistAssistantMessageSafe(conversationId, result.cleanText);
        }

        if (result.shouldEscalate) {
            const ticket = await this.escalate(params, conversationId, originalMessage);
            return {
                answer: result.cleanText,
                sources,
                shouldEscalate: true,
                escalatedTicketId: ticket.id,
                conversationId,
            };
        }

        return {
            answer: result.cleanText,
            sources,
            shouldEscalate: false,
            conversationId,
        };
    }

    async listMessages(
        conversationId: string,
        requesterId: string,
    ): Promise<Array<{ role: 'user' | 'assistant'; text: string; createdAt: Date }>> {
        const rows = await this.historyProvider.listMessages(conversationId, requesterId, 50);
        return rows.map((m) => ({
            role: m.role,
            text: m.content,
            createdAt: m.createdAt,
        }));
    }

    private async persistUserMessageSafe(
        conversationId: string,
        requesterId: string,
        content: string,
    ): Promise<void> {
        try {
            await this.historyProvider.saveUserMessage(conversationId, requesterId, content);
        } catch (error) {
            this.logger.error(
                `Falha ao persistir mensagem do usuário (conversa ${conversationId})`,
                error as Error,
            );
        }
    }

    private async persistAssistantMessageSafe(
        conversationId: string,
        content: string,
    ): Promise<void> {
        try {
            await this.historyProvider.saveAssistantMessage(conversationId, content);
        } catch (error) {
            this.logger.error(
                `Falha ao persistir resposta do assistente (conversa ${conversationId})`,
                error as Error,
            );
        }
    }

    async streamAsk(
        params: AskChatParams,
        onEvent: (event: ChatStreamEvent) => void,
        abortSignal?: AbortSignal,
    ): Promise<void> {
        const conversationId = this.resolveConversationId(params.conversationId);
        const originalMessage = params.message;
        const llmMessage = this.normalizeForLlm(originalMessage);

        if (this.hasEscalationHint(originalMessage)) {
            await this.persistUserMessageSafe(conversationId, params.requesterId, originalMessage);
            onEvent({ type: 'token', text: ESCALATION_FIXED_REPLY });
            await this.persistAssistantMessageSafe(conversationId, ESCALATION_FIXED_REPLY);
            try {
                const ticket = await this.escalate(params, conversationId, originalMessage);
                onEvent({
                    type: 'meta',
                    shouldEscalate: true,
                    escalatedTicketId: ticket.id,
                    conversationId,
                });
            } catch (error) {
                this.logger.error('Falha ao criar ticket por keyword', error as Error);
                onEvent({ type: 'meta', shouldEscalate: true, conversationId });
            }
            onEvent({ type: 'done' });
            return;
        }

        await this.persistUserMessageSafe(conversationId, params.requesterId, originalMessage);

        const history = await this.historyProvider.get(conversationId, params.requesterId);
        const [retrieved, inventory] = await Promise.all([
            this.retrieveKnowledge(llmMessage, params.requesterId),
            this.loadInventory(),
        ]);
        const knowledgeBase = this.toKnowledgeBase(retrieved);
        const sources = this.toSources(retrieved);

        const result = await this.geminiChatService.streamReply(
            {
                message: llmMessage,
                history,
                user: { name: params.userName },
                knowledgeBase,
                knowledgeBaseInventory: inventory,
            },
            {
                onToken: (text) => onEvent({ type: 'token', text }),
                abortSignal,
            },
        );

        if (!result.hadError && result.cleanText) {
            await this.persistAssistantMessageSafe(conversationId, result.cleanText);
        }

        let escalatedTicketId: string | undefined;
        if (result.shouldEscalate) {
            try {
                const ticket = await this.escalate(params, conversationId, originalMessage);
                escalatedTicketId = ticket.id;
            } catch (error) {
                this.logger.error('Falha ao criar ticket por sinal do LLM', error as Error);
            }
        }

        onEvent({
            type: 'meta',
            shouldEscalate: result.shouldEscalate,
            escalatedTicketId,
            conversationId,
            sources,
        });
        onEvent({ type: 'done' });
    }

    private async escalate(params: AskChatParams, conversationId: string, message: string) {
        const summary = this.buildConversationSummary(message);
        const inferredSubject = this.inferSubject(message);
        return this.ticketService.createFromChatEscalation({
            requesterId: params.requesterId,
            conversationId,
            inferredSubject,
            summary,
            priority: TicketPriority.MEDIUM,
        });
    }

    private hasEscalationHint(message: string): boolean {
        const lower = message.toLowerCase();
        const hints = [
            'nao resolveu',
            'não resolveu',
            'sem sucesso',
            'urgente',
            'critico',
            'crítico',
            'abrir chamado',
            'abrir ticket',
            'escalar',
            'preciso de humano',
        ];

        return hints.some((hint) => lower.includes(hint));
    }

    private inferSubject(message: string): string {
        const terms = this.extractKeywords(message);
        if (terms.length > 0) {
            const label = terms.slice(0, 4).join(' ');
            return `Escalacao automatica via chat: ${label}`;
        }

        return `Escalacao automatica via chat: ${this.truncate(message, 60)}`;
    }

    private buildConversationSummary(message: string): string {
        return `Mensagem original do usuario: ${message}`;
    }

    private truncate(text: string, maxLength: number): string {
        if (text.length <= maxLength) {
            return text;
        }

        return `${text.slice(0, maxLength).trim()}...`;
    }

    private generateConversationId(): string {
        return randomUUID();
    }

    private resolveConversationId(candidate?: string): string {
        if (candidate && this.isUuid(candidate)) {
            return candidate;
        }
        if (candidate) {
            this.logger.warn(
                `conversationId inválido recebido ("${candidate}"); gerando novo UUID`,
            );
        }
        return this.generateConversationId();
    }

    private isUuid(value: string): boolean {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    }

    private normalizeForLlm(message: string): string {
        const collapsed = message.replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
        if (collapsed.length <= this.maxMessageChars) {
            return collapsed;
        }
        const sliceLen = Math.max(0, this.maxMessageChars - TRUNCATION_SUFFIX.length);
        const truncated = collapsed.slice(0, sliceLen).trimEnd() + TRUNCATION_SUFFIX;
        this.logger.warn(
            `Mensagem do chat truncada antes do LLM: ${collapsed.length} -> ${truncated.length} chars`,
        );
        return truncated;
    }

    private extractKeywords(message: string): string[] {
        const stopwords = new Set([
            'a', 'e', 'o', 'os', 'as', 'de', 'da', 'do', 'das', 'dos',
            'para', 'por', 'com', 'sem', 'em', 'no', 'na', 'nos', 'nas',
            'um', 'uma', 'uns', 'umas', 'que', 'como', 'qual', 'quais',
            'quando', 'onde', 'porque', 'se', 'eu', 'voce', 'meu',
            'minha', 'meus', 'minhas', 'seu', 'sua', 'seus', 'suas',
            'preciso', 'ajuda', 'sobre', 'favor',
        ]);

        return message
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, ' ')
            .split(/\s+/)
            .map((term) => term.trim())
            .filter((term) => term.length >= 3 && !stopwords.has(term))
            .slice(0, 8);
    }
}
