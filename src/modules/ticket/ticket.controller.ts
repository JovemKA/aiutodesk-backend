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

@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DEV, UserRole.MASTER, UserRole.ADMIN)
export class TicketController {
    constructor(private readonly ticketService: TicketService) {}

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

    @Delete(':id')
    remove(
        @Req() req: Request & { user: { userId: string; role: UserRole } },
        @Param('id') id: string,
    ) {
        return this.ticketService.remove(id, req.user);
    }
}
