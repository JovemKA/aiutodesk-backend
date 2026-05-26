import { Module } from '@nestjs/common';
import { TicketModule } from '@modules/ticket/ticket.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { GeminiChatService } from './gemini-chat.service';
import { ConversationHistoryProvider } from './history/conversation-history.provider';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { RagRetrieverService } from './rag/rag-retriever.service';
import { KnowledgeBaseInventoryService } from './rag/knowledge-base-inventory.service';

@Module({
    imports: [TicketModule, EmbeddingsModule],
    controllers: [ChatController],
    providers: [
        ChatService,
        GeminiChatService,
        ConversationHistoryProvider,
        RagRetrieverService,
        KnowledgeBaseInventoryService,
    ],
})
export class ChatModule {}
