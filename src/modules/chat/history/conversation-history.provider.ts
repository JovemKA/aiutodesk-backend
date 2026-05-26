import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatConversation } from '../entities/chat-conversation.entity';
import { ChatMessage } from '../entities/chat-message.entity';

export type ChatTurnRole = 'user' | 'assistant';

export interface ChatTurn {
    role: ChatTurnRole;
    text: string;
}

const HISTORY_TURN_LIMIT = 20;
const TITLE_MAX_CHARS = 60;

@Injectable()
export class ConversationHistoryProvider {
    private readonly logger = new Logger(ConversationHistoryProvider.name);

    constructor(
        @InjectRepository(ChatConversation)
        private readonly conversationRepo: Repository<ChatConversation>,
        @InjectRepository(ChatMessage)
        private readonly messageRepo: Repository<ChatMessage>,
    ) {}

    async get(
        conversationId: string | undefined,
        requesterId: string,
    ): Promise<ChatTurn[]> {
        if (!conversationId || !requesterId) return [];
        const conv = await this.conversationRepo.findOne({
            where: { id: conversationId, userId: requesterId },
        });
        if (!conv) return [];

        const rows = await this.messageRepo.find({
            where: { conversationId },
            order: { createdAt: 'DESC' },
            take: HISTORY_TURN_LIMIT,
        });
        return rows
            .reverse()
            .map((m) => ({ role: m.role, text: m.content }));
    }

    async saveUserMessage(
        conversationId: string,
        requesterId: string,
        content: string,
    ): Promise<ChatConversation> {
        let conv = await this.conversationRepo.findOne({
            where: { id: conversationId },
        });

        if (conv && conv.userId !== requesterId) {
            this.logger.warn(
                `Conversa ${conversationId} pertence a outro usuário; criando nova conversa para ${requesterId}`,
            );
            conv = null;
        }

        const now = new Date();

        if (!conv) {
            conv = this.conversationRepo.create({
                id: conversationId,
                userId: requesterId,
                title: this.buildTitle(content),
                lastMessageAt: now,
            });
            await this.conversationRepo.save(conv);
        } else if (!conv.title) {
            conv.title = this.buildTitle(content);
        }

        const message = this.messageRepo.create({
            conversationId,
            role: 'user',
            content,
        });
        await this.messageRepo.save(message);

        conv.lastMessageAt = now;
        await this.conversationRepo.save(conv);
        return conv;
    }

    async saveAssistantMessage(
        conversationId: string,
        content: string,
    ): Promise<void> {
        const message = this.messageRepo.create({
            conversationId,
            role: 'assistant',
            content,
        });
        await this.messageRepo.save(message);
        await this.conversationRepo.update(
            { id: conversationId },
            { lastMessageAt: new Date() },
        );
    }

    async listMessages(
        conversationId: string,
        requesterId: string,
        limit = 50,
    ): Promise<ChatMessage[]> {
        const conv = await this.conversationRepo.findOne({
            where: { id: conversationId, userId: requesterId },
        });
        if (!conv) return [];
        const rows = await this.messageRepo.find({
            where: { conversationId },
            order: { createdAt: 'DESC' },
            take: limit,
        });
        return rows.reverse();
    }

    private buildTitle(content: string): string {
        const flat = content.replace(/\s+/g, ' ').trim();
        if (flat.length <= TITLE_MAX_CHARS) return flat;
        return `${flat.slice(0, TITLE_MAX_CHARS - 1).trimEnd()}…`;
    }
}
