import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { User } from '@modules/user/entities/user.entity';
import { UserDepartment } from '@modules/user/entities/user-department.entity';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';

@Module({
    imports: [TypeOrmModule.forFeature([Ticket, UserDepartment, User])],
    controllers: [TicketController],
    providers: [TicketService],
    exports: [TicketService],
})
export class TicketModule {}
