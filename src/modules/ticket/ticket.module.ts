import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketEvent } from './entities/ticket-event.entity';
import { User } from '@modules/user/entities/user.entity';
import { UserDepartment } from '@modules/user/entities/user-department.entity';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';
import { AiScoreFeedbackService } from './ai-score-feedback.service';

@Module({
    imports: [TypeOrmModule.forFeature([Ticket, TicketEvent, UserDepartment, User])],
    controllers: [TicketController],
    providers: [TicketService, AiScoreFeedbackService],
    exports: [TicketService, AiScoreFeedbackService],
})
export class TicketModule {}
