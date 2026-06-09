import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketEvent } from './entities/ticket-event.entity';
import { TicketMessage } from './entities/ticket-message.entity';
import { TicketCommentChunk } from './entities/ticket-comment-chunk.entity';
import { User } from '@modules/user/entities/user.entity';
import { UserDepartment } from '@modules/user/entities/user-department.entity';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';
import { AiScoreFeedbackService } from './ai-score-feedback.service';
import { TicketCommentIndexerService } from './indexing/ticket-comment-indexer.service';
import { TicketCommentRetrieverService } from './rag/ticket-comment-retriever.service';
import { TicketAssistService } from './assist/ticket-assist.service';
import { EmbeddingsModule } from '@modules/chat/embeddings/embeddings.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Ticket,
            TicketEvent,
            TicketMessage,
            TicketCommentChunk,
            UserDepartment,
            User,
        ]),
        EmbeddingsModule,
    ],
    controllers: [TicketController],
    providers: [
        TicketService,
        AiScoreFeedbackService,
        TicketCommentIndexerService,
        TicketCommentRetrieverService,
        TicketAssistService,
    ],
    exports: [TicketService, AiScoreFeedbackService, TicketCommentIndexerService],
})
export class TicketModule {}
