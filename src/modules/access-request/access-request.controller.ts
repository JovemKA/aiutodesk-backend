import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '@core/auth/jwt-auth.guard';
import { RolesGuard } from '@core/auth/roles.guard';
import { Roles } from '@core/auth/roles.decorator';
import { UserRole } from '@common/enums/user-role.enum';
import { AccessRequestService } from './access-request.service';
import { CreateAccessRequestDto } from './dto/create-access-request.dto';
import { ApproveAccessRequestDto } from './dto/approve-access-request.dto';

@Controller('access-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccessRequestController {
    constructor(private readonly accessRequestService: AccessRequestService) {}

    @Post()
    @Roles(UserRole.USER, UserRole.DEV)
    create(
        @Req() req: Request & { user: { userId: string } },
        @Body() dto: CreateAccessRequestDto,
    ) {
        return this.accessRequestService.create(req.user.userId, dto);
    }

    @Get('my-pending')
    @Roles(UserRole.USER, UserRole.DEV)
    getMyPending(@Req() req: Request & { user: { userId: string } }) {
        return this.accessRequestService.getPendingByRequester(req.user.userId);
    }

    @Get('pending')
    @Roles(UserRole.MASTER, UserRole.ADMIN)
    listPending() {
        return this.accessRequestService.listPending();
    }

    @Patch(':id/approve')
    @Roles(UserRole.MASTER, UserRole.ADMIN)
    approve(
        @Param('id') id: string,
        @Req() req: Request & { user: { userId: string } },
        @Body() dto: ApproveAccessRequestDto,
    ) {
        return this.accessRequestService.approve(id, req.user.userId, dto.departmentId);
    }

    @Patch(':id/reject')
    @Roles(UserRole.MASTER, UserRole.ADMIN)
    reject(
        @Param('id') id: string,
        @Req() req: Request & { user: { userId: string } },
    ) {
        return this.accessRequestService.reject(id, req.user.userId);
    }
}
