import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { GeminiEmbeddingService } from '@modules/chat/embeddings/gemini-embedding.service';

async function run() {
    const logger = new Logger('diag-rag');
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['log', 'error', 'warn'],
    });

    try {
        const config = app.get(ConfigService);
        const ds = app.get(DataSource);
        const embedder = app.get(GeminiEmbeddingService);

        logger.log(`Config: model=${embedder.modelName} dims=${embedder.vectorDimensions}`);
        logger.log(`rag.enabled=${config.get('rag.enabled')} topK=${config.get('rag.topK')} minSim=${config.get('rag.minSimilarity')} filterDept=${config.get('rag.filterByDepartment')}`);

        const counts = await ds.query<{ articles: string; chunks: string; with_chunks: string }[]>(`
            SELECT
              (SELECT COUNT(*) FROM "KBArticles" WHERE is_published = true)::text AS articles,
              (SELECT COUNT(*) FROM kb_article_chunks)::text AS chunks,
              (SELECT COUNT(DISTINCT article_id) FROM kb_article_chunks)::text AS with_chunks
        `);
        logger.log(`Inventario: articles=${counts[0].articles} chunks=${counts[0].chunks} articles_with_chunks=${counts[0].with_chunks}`);

        const queries = [
            'como redefinir senha',
            'reset de senha',
            'configurar vpn no windows',
            'quantos artigos voce localiza na base',
        ];

        for (const q of queries) {
            const vec = await embedder.embedQuery(q);
            const literal = `[${vec.join(',')}]`;
            const rows = await ds.query<RawRow[]>(
                `SELECT a.title, a.slug, 1 - (c.embedding <=> $1::vector) AS similarity
                 FROM kb_article_chunks c
                 JOIN "KBArticles" a ON a.id = c.article_id
                 WHERE a.is_published = true
                 ORDER BY c.embedding <=> $1::vector
                 LIMIT 5`,
                [literal],
            );
            logger.log(`\nQuery: "${q}"`);
            for (const r of rows) {
                logger.log(`  ${Number(r.similarity).toFixed(4)}  ${r.title}  (${r.slug})`);
            }
        }
    } catch (error) {
        const err = error as Error;
        new Logger('diag-rag').error(err.message, err.stack);
        process.exitCode = 1;
    } finally {
        await app.close();
    }
}

interface RawRow { title: string; slug: string; similarity: number | string }

void run();
