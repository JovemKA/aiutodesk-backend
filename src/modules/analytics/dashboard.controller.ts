import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@core/auth/jwt-auth.guard';
import { RolesGuard } from '@core/auth/roles.guard';
import { Roles } from '@core/auth/roles.decorator';
import { UserRole } from '@common/enums/user-role.enum';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MASTER, UserRole.ADMIN)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get('kpis')
    kpis() {
        return this.dashboardService.kpis();
    }
}
