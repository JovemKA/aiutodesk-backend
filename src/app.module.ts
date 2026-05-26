import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import databaseConfig from '@core/config/database.config';
import jwtConfig from '@core/config/jwt.config';
import appConfig from '@core/config/app.config';
import geminiConfig from '@core/config/gemini.config';
import { CoreModule } from '@core/core.module';
import { AuthModule } from '@core/auth/auth.module';
import { UserModule } from '@modules/user/user.module';
import { DepartmentModule } from '@modules/department/department.module';
import { ArticleModule } from '@modules/article/article.module';
import { CategoryModule } from '@modules/category/category.module';
import { TicketModule } from '@modules/ticket/ticket.module';
import { AnalyticsModule } from '@modules/analytics/analytics.module';
import { ChatModule } from '@modules/chat/chat.module';
import { AccessRequestModule } from '@modules/access-request/access-request.module';
import { HealthModule } from '@modules/health/health.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [databaseConfig, jwtConfig, appConfig, geminiConfig],
        }),
        ThrottlerModule.forRoot([
            {
                name: 'default',
                ttl: 60_000,
                limit: 120,
            },
            {
                name: 'chat',
                ttl: 60_000,
                limit: 30,
            },
        ]),
        CoreModule,
        AuthModule,
        UserModule,
        DepartmentModule,
        ArticleModule,
        CategoryModule,
        TicketModule,
        AnalyticsModule,
        ChatModule,
        AccessRequestModule,
        HealthModule,
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule {}
