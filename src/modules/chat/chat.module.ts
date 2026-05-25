import { Module } from '@nestjs/common';
import { TicketModule } from '@modules/ticket/ticket.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { GeminiChatService } from './gemini-chat.service';
import { ConversationHistoryProvider } from './history/conversation-history.provider';

@Module({
    imports: [TicketModule],
    controllers: [ChatController],
    providers: [ChatService, GeminiChatService, ConversationHistoryProvider],
})
export class ChatModule {}
