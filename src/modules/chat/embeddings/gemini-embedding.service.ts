import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiClientProvider } from './gemini-client.provider';

type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

const DEFAULT_MODEL = 'gemini-embedding-2';
const DEFAULT_DIMENSIONS = 768;

@Injectable()
export class GeminiEmbeddingService {
    private readonly logger = new Logger(GeminiEmbeddingService.name);
    private readonly model: string;
    private readonly dimensions: number;
    private readonly requestTimeoutMs: number;

    constructor(
        private readonly clientProvider: GeminiClientProvider,
        private readonly configService: ConfigService,
    ) {
        this.model = this.configService.get<string>('rag.embeddingModel') ?? DEFAULT_MODEL;
        this.dimensions =
            this.configService.get<number>('rag.embeddingDimensions') ?? DEFAULT_DIMENSIONS;
        this.requestTimeoutMs =
            this.configService.get<number>('gemini.requestTimeoutMs') ?? 20000;
    }

    get modelName(): string {
        return this.model;
    }

    get vectorDimensions(): number {
        return this.dimensions;
    }

    async embedQuery(text: string): Promise<number[]> {
        const [vector] = await this.embed([text], 'RETRIEVAL_QUERY');
        return vector;
    }

    async embedDocuments(texts: string[]): Promise<number[][]> {
        if (texts.length === 0) return [];
        return this.embed(texts, 'RETRIEVAL_DOCUMENT');
    }

    private async embed(texts: string[], taskType: EmbeddingTaskType): Promise<number[][]> {
        const client = this.clientProvider.getClient();
        if (!client) {
            this.logger.warn(`Sem cliente Gemini. Retornando vetores zerados (${texts.length}).`);
            return texts.map(() => new Array<number>(this.dimensions).fill(0));
        }

        const concurrency = Math.min(5, texts.length);
        const results = new Array<number[]>(texts.length);

        let cursor = 0;
        const worker = async () => {
            while (true) {
                const idx = cursor++;
                if (idx >= texts.length) return;
                results[idx] = await this.embedOne(client, texts[idx], taskType);
            }
        };

        await Promise.all(Array.from({ length: concurrency }, () => worker()));
        return results;
    }

    private async embedOne(
        client: NonNullable<ReturnType<GeminiClientProvider['getClient']>>,
        text: string,
        taskType: EmbeddingTaskType,
    ): Promise<number[]> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

        try {
            const response = await client.models.embedContent({
                model: this.model,
                contents: text,
                config: { taskType, outputDimensionality: this.dimensions },
            });

            const values = response?.embeddings?.[0]?.values ?? [];
            if (values.length === 0) {
                throw new Error('Resposta de embedding vazia');
            }
            if (values.length !== this.dimensions) {
                this.logger.warn(
                    `Embedding com dimensoes inesperadas: ${values.length} (esperado ${this.dimensions})`,
                );
            }
            return values;
        } catch (error) {
            this.logger.error('Erro ao gerar embedding com Gemini', error as Error);
            return new Array<number>(this.dimensions).fill(0);
        } finally {
            clearTimeout(timeout);
        }
    }
}
