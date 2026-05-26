import { Module } from '@nestjs/common';
import { GeminiClientProvider } from './gemini-client.provider';
import { GeminiEmbeddingService } from './gemini-embedding.service';

@Module({
    providers: [GeminiClientProvider, GeminiEmbeddingService],
    exports: [GeminiClientProvider, GeminiEmbeddingService],
})
export class EmbeddingsModule {}
