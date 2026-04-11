import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
    url: process.env.SUPABASE_DB_URL ?? null,
    sslEnabled: (process.env.DB_SSL_ENABLED ?? 'true') === 'true',
    sslRejectUnauthorized: (process.env.DB_SSL_REJECT_UNAUTHORIZED ?? 'false') === 'true',
    maxConnections: process.env.DB_MAX_CONNECTIONS
        ? parseInt(process.env.DB_MAX_CONNECTIONS, 10)
        : 10,
    connectionTimeoutMillis: process.env.DB_CONNECTION_TIMEOUT_MS
        ? parseInt(process.env.DB_CONNECTION_TIMEOUT_MS, 10)
        : 10000,
    idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT_MS
        ? parseInt(process.env.DB_IDLE_TIMEOUT_MS, 10)
        : 30000,
    retryAttempts: process.env.DB_RETRY_ATTEMPTS
        ? parseInt(process.env.DB_RETRY_ATTEMPTS, 10)
        : 10,
    retryDelay: process.env.DB_RETRY_DELAY_MS
        ? parseInt(process.env.DB_RETRY_DELAY_MS, 10)
        : 3000,
    synchronize: (process.env.DB_SYNC ?? 'false') === 'true',
    logging: (process.env.DB_LOGGING ?? 'false') === 'true',
}));
