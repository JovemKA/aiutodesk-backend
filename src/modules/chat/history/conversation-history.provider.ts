import { Injectable } from '@nestjs/common';

export type ChatTurnRole = 'user' | 'assistant';

export interface ChatTurn {
    role: ChatTurnRole;
    text: string;
}

@Injectable()
export class ConversationHistoryProvider {
    async get(_conversationId: string | undefined): Promise<ChatTurn[]> {
        return [];
    }
}
