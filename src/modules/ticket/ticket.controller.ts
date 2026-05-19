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
import { TicketService } from './ticket.service';
import { TicketPriority } from '@common/enums/ticket-priority.enum';
import { TicketStatus } from '@common/enums/ticket-status.enum';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketController {
    constructor(private readonly ticketService: TicketService) {}

    @Post()
    create(
        @Req() req: Request & { user: { userId: string } },
        @Body() createTicketDto: CreateTicketDto
    ) {
        return this.ticketService.create(createTicketDto, req.user.userId);
    }

    @Get()
    findAll(
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
        });
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.ticketService.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateTicketDto: UpdateTicketDto,
    ) {
        return this.ticketService.update(id, updateTicketDto);
    }

    @Patch(':id/assign')
    assign(
        @Param('id') id: string,
        @Body() assignTicketDto: AssignTicketDto,
    ) {
        return this.ticketService.assign(id, assignTicketDto);
    }

    @Patch(':id/status')
    updateStatus(
        @Param('id') id: string,
        @Body() updateStatusDto: UpdateStatusDto,
    ) {
        return this.ticketService.updateStatus(id, updateStatusDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.ticketService.remove(id);
    }
}
