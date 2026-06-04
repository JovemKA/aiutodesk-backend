import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Req,
    Query,
    UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '@core/auth/jwt-auth.guard';
import { RolesGuard } from '@core/auth/roles.guard';
import { Roles } from '@core/auth/roles.decorator';
import { UserRole } from '@common/enums/user-role.enum';
import { TicketService } from './ticket.service';
import { User } from '@modules/user/entities/user.entity';
import { TicketPriority } from '@common/enums/ticket-priority.enum';
import { TicketStatus } from '@common/enums/ticket-status.enum';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto';
import { AssistTicketDto } from './dto/assist-ticket.dto';
import { TicketAssistService } from './assist/ticket-assist.service';

@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DEV, UserRole.MASTER, UserRole.ADMIN)
export class TicketController {
    constructor(
        private readonly ticketService: TicketService,
        private readonly ticketAssistService: TicketAssistService,
    ) {}

    @Post()
    create(
        @Req() req: Request & { user: { userId: string; role: UserRole } },
        @Body() createTicketDto: CreateTicketDto
    ) {
        return this.ticketService.create(createTicketDto, req.user.userId, req.user.role);
    }

    @Get()
    findAll(
        @Req() req: Request & { user: { userId: string; role: UserRole } },
        @Query('status') status?: string,
        @Query('priority') priority?: string,
        @Query('assignedTo') assignedTo?: string,
        @Query('departmentId') departmentId?: string,
    ) {
        return this.ticketService.findAll({
            status: status as TicketStatus,
            priority: priority as TicketPriority,
            assignedTo,
            departmentId,
        }, req.user);
    }

    @Get(':id')
    findOne(
        @Req() req: Request & { user: { userId: string; role: UserRole } },
        @Param('id') id: string,
    ) {
        return this.ticketService.findOne(id, req.user);
    }

    @Get(':id/assignable-users')
    assignableUsers(
        @Req() req: Request & { user: { userId: string; role: UserRole } },
        @Param('id') id: string,
    ) {
        return this.ticketService.findAssignableUsers(id, req.user);
    }

    @Patch(':id')
    update(
        @Req() req: Request & { user: { userId: string; role: UserRole } },
        @Param('id') id: string,
        @Body() updateTicketDto: UpdateTicketDto,
    ) {
        return this.ticketService.update(id, updateTicketDto, req.user);
    }

    @Patch(':id/assign')
    assign(
        @Req() req: Request & { user: { userId: string; role: UserRole } },
        @Param('id') id: string,
        @Body() assignTicketDto: AssignTicketDto,
    ) {
        return this.ticketService.assign(id, assignTicketDto, req.user);
    }

    @Patch(':id/status')
    updateStatus(
        @Req() req: Request & { user: { userId: string; role: UserRole } },
        @Param('id') id: string,
        @Body() updateStatusDto: UpdateStatusDto,
    ) {
        return this.ticketService.updateStatus(id, updateStatusDto, req.user);
    }

    @Get(':id/events')
    events(
        @Req() req: Request & { user: { userId: string; role: UserRole } },
        @Param('id') id: string,
    ) {
        return this.ticketService.findEvents(id, req.user);
    }

    @Get(':id/messages')
    messages(
        @Req() req: Request & { user: { userId: string; role: UserRole } },
        @Param('id') id: string,
    ) {
        return this.ticketService.listMessages(id, req.user);
    }

    @Post(':id/messages')
    createMessage(
        @Req() req: Request & { user: { userId: string; role: UserRole } },
        @Param('id') id: string,
        @Body() dto: CreateTicketMessageDto,
    ) {
        return this.ticketService.createMessage(id, dto, req.user);
    }

    @Post(':id/assist')
    assist(
        @Req() req: Request & { user: { userId: string; role: UserRole } },
        @Param('id') id: string,
        @Body() dto: AssistTicketDto,
    ) {
        return this.ticketAssistService.assist(
            { ticketId: id, intent: dto.intent, query: dto.query },
            req.user,
        );
    }

    @Delete(':id')
    remove(
        @Req() req: Request & { user: { userId: string; role: UserRole } },
        @Param('id') id: string,
    ) {
        return this.ticketService.remove(id, req.user);
    }
}
