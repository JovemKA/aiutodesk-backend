import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Ticket } from '@modules/ticket/entities/ticket.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Ticket])],
    controllers: [DashboardController],
    providers: [DashboardService],
})
export class AnalyticsModule {}
