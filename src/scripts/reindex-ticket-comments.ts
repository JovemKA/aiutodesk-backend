import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { TicketCommentIndexerService } from '@modules/ticket/indexing/ticket-comment-indexer.service';

async function run() {
    const logger = new Logger('reindex-ticket-comments');
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['log', 'error', 'warn'],
    });

    try {
        const indexer = app.get(TicketCommentIndexerService);
        logger.log('Iniciando reindex de todos os comentários públicos de chamados...');
        const summary = await indexer.reindexAll();

        logger.log(
            `Reindex concluído: ${summary.commentsProcessed} comentários, ${summary.chunksWritten} chunks.`,
        );

        if (summary.skipped.length > 0) {
            logger.warn(`Comentários pulados (${summary.skipped.length}):`);
            for (const item of summary.skipped) {
                logger.warn(`  - ${item.commentId}: ${item.reason}`);
            }
        }
    } catch (error) {
        logger.error('Erro durante reindex de comentários', error as Error);
        process.exitCode = 1;
    } finally {
        await app.close();
    }
}

void run();
