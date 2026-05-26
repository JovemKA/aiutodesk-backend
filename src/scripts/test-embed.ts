import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { GeminiEmbeddingService } from '@modules/chat/embeddings/gemini-embedding.service';

async function run() {
    const logger = new Logger('test-embed');
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['log', 'error', 'warn'],
    });

    try {
        const embedder = app.get(GeminiEmbeddingService);
        logger.log(`Modelo: ${embedder.modelName} | dims esperadas: ${embedder.vectorDimensions}`);

        const vector = await embedder.embedQuery('como redefinir minha senha');
        logger.log(`Query embedding: length=${vector.length}, first 3 = ${vector.slice(0, 3).join(', ')}`);

        const docs = await embedder.embedDocuments([
            'Como redefinir sua senha — passo a passo',
            'Configurando VPN no Windows',
        ]);
        logger.log(`Doc embeddings: count=${docs.length}, lengths=[${docs.map((d) => d.length).join(', ')}]`);

        const isOk =
            vector.length === embedder.vectorDimensions &&
            docs.every((d) => d.length === embedder.vectorDimensions);
        logger.log(isOk ? '✔ OK — embedder funcionando' : '✘ FAIL — dimensoes inconsistentes');
    } catch (error) {
        const err = error as Error;
        const logger = new Logger('test-embed');
        logger.error(err.message);
        process.exitCode = 1;
    } finally {
        await app.close();
    }
}

void run();
