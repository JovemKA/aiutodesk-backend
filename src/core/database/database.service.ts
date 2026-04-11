import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
    private client: Client;
    private readonly logger = new Logger(DatabaseService.name);
    private readonly retryAttempts: number;
    private readonly retryDelay: number;

    constructor(private readonly configService: ConfigService) {
        this.retryAttempts = this.configService.get<number>('database.retryAttempts') ?? 10;
        this.retryDelay = this.configService.get<number>('database.retryDelay') ?? 3000;

        const connectionString = this.configService.get<string>('database.url');

        if (!connectionString) {
            throw new Error('SUPABASE_DB_URL não está definida no .env');
        }

        this.client = new Client({
            connectionString,
            ssl: this.configService.get<boolean>('database.sslEnabled')
                ? {
                    rejectUnauthorized:
                        this.configService.get<boolean>('database.sslRejectUnauthorized') ?? false,
                }
                : false,
            connectionTimeoutMillis:
                this.configService.get<number>('database.connectionTimeoutMillis') ?? 10000,
        });
    }

    async onModuleInit(): Promise<void> {
        for (let attempt = 1; attempt <= this.retryAttempts; attempt += 1) {
            try {
                await this.client.connect();
                this.logger.log('Conexão com PostgreSQL/Supabase estabelecida com sucesso!');
                const { now } = await this.testQuery();
                this.logger.log(`Teste de consulta bem-sucedido: ${now}`);
                return;
            } catch (error) {
                if (error instanceof Error) {
                    this.logger.error(
                        `Tentativa ${attempt}/${this.retryAttempts} falhou ao conectar ao PostgreSQL: ${error.message}`,
                    );
                } else {
                    this.logger.error(
                        `Tentativa ${attempt}/${this.retryAttempts} falhou ao conectar ao PostgreSQL: ${String(error)}`,
                    );
                }

                if (attempt === this.retryAttempts) {
                    throw error;
                }

                await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
            }
        }
    }

    async onModuleDestroy(): Promise<void> {
        await this.client.end();
        this.logger.log('Conexão com PostgreSQL encerrada.');
    }

    async testQuery(): Promise<{ now: string }> {
        const result = await this.client.query('SELECT NOW() as now');
        return result.rows[0];
    }
}
