import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from '@core/config/database.config';
import { DatabaseService } from './database.service';

@Module({
    imports: [
        ConfigModule.forFeature(databaseConfig),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                type: 'postgres',
                url: config.get<string>('database.url'),
                ssl: config.get<boolean>('database.sslEnabled')
                    ? { rejectUnauthorized: config.get<boolean>('database.sslRejectUnauthorized') }
                    : false,
                autoLoadEntities: true,
                synchronize: config.get<boolean>('database.synchronize'),
                logging: config.get<boolean>('database.logging'),
                retryAttempts: config.get<number>('database.retryAttempts'),
                retryDelay: config.get<number>('database.retryDelay'),
                extra: {
                    max: config.get<number>('database.maxConnections'),
                    keepAlive: true,
                    connectionTimeoutMillis: config.get<number>('database.connectionTimeoutMillis'),
                    idleTimeoutMillis: config.get<number>('database.idleTimeoutMillis'),
                },
            }),
        }),
    ],
    providers: [DatabaseService],
    exports: [DatabaseService],
})
export class DatabaseModule {}
