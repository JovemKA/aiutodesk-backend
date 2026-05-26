import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { ArticleIndexerService } from '@modules/article/indexing/article-indexer.service';

async function run() {
    const logger = new Logger('reindex-articles');
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['log', 'error', 'warn'],
    });

    try {
        const indexer = app.get(ArticleIndexerService);
        logger.log('Iniciando reindex de todos os artigos publicados...');
        const summary = await indexer.reindexAll();

        logger.log(
            `Reindex concluido: ${summary.articlesProcessed} artigos, ${summary.chunksWritten} chunks.`,
        );

        if (summary.skipped.length > 0) {
            logger.warn(`Artigos pulados (${summary.skipped.length}):`);
            for (const item of summary.skipped) {
                logger.warn(`  - ${item.articleId}: ${item.reason}`);
            }
        }
    } catch (error) {
        logger.error('Erro durante reindex', error as Error);
        process.exitCode = 1;
    } finally {
        await app.close();
    }
}

void run();
