import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import databaseConfig from '@core/config/database.config';
import jwtConfig from '@core/config/jwt.config';
import appConfig from '@core/config/app.config';
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

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [databaseConfig, jwtConfig, appConfig],
        }),
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
    ],
})
export class AppModule {}
