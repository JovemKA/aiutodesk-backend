import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GeminiClientProvider {
    private readonly logger = new Logger(GeminiClientProvider.name);
    private readonly client: GoogleGenAI | null;

    constructor(private readonly configService: ConfigService) {
        const apiKey = this.configService.get<string>('gemini.apiKey')?.trim();
        if (!apiKey) {
            this.logger.warn(
                'GEMINI_API_KEY nao configurada. Chat e embeddings vao usar fallback local.',
            );
            this.client = null;
            return;
        }
        this.client = new GoogleGenAI({ apiKey });
    }

    getClient(): GoogleGenAI | null {
        return this.client;
    }

    isReady(): boolean {
        return this.client !== null;
    }
}
