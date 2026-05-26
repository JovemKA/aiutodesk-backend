import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { buildSystemInstruction, parseLlmMeta, META_OPEN_TAG, UserContextInput } from './prompts';
import type { KnowledgeBaseChunk, KnowledgeBaseInventoryEntry } from './prompts/knowledge-base';
import { ChatTurn } from './history/conversation-history.provider';
import { GeminiClientProvider } from './embeddings/gemini-client.provider';

const FALLBACK_MESSAGE = 'Desculpe, não consegui gerar uma resposta agora. Tente novamente em instantes.';
const DEFAULT_MODEL = 'gemini-2.5-flash';

export interface GenerateParams {
    message: string;
    history?: ChatTurn[];
    user?: UserContextInput;
    knowledgeBase?: KnowledgeBaseChunk[];
    knowledgeBaseInventory?: KnowledgeBaseInventoryEntry[];
}

export interface StreamCallbacks {
    onToken: (chunk: string) => void;
    abortSignal?: AbortSignal;
}

export interface StreamResult {
    cleanText: string;
    shouldEscalate: boolean;
    reason?: string;
    hadError: boolean;
}

@Injectable()
export class GeminiChatService {
    private readonly logger = new Logger(GeminiChatService.name);
    private readonly client: GoogleGenAI | null;
    private readonly model: string;
    private readonly temperature: number;
    private readonly topP: number;
    private readonly topK: number;
    private readonly maxOutputTokens: number;
    private readonly requestTimeoutMs: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly clientProvider: GeminiClientProvider,
    ) {
        this.model = this.configService.get<string>('gemini.model') ?? DEFAULT_MODEL;
        this.temperature = this.configService.get<number>('gemini.temperature') ?? 0.2;
        this.topP = this.configService.get<number>('gemini.topP') ?? 0.9;
        this.topK = this.configService.get<number>('gemini.topK') ?? 40;
        this.maxOutputTokens = this.configService.get<number>('gemini.maxOutputTokens') ?? 1024;
        this.requestTimeoutMs = this.configService.get<number>('gemini.requestTimeoutMs') ?? 20000;
        this.client = this.clientProvider.getClient();
    }

    isReady(): boolean {
        return this.client !== null;
    }

    async generateReply(params: GenerateParams): Promise<StreamResult> {
        if (!this.client) {
            return { cleanText: FALLBACK_MESSAGE, shouldEscalate: false, hadError: true };
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

        try {
            const response = await this.client.models.generateContent({
                model: this.model,
                contents: this.buildContents(params),
                config: this.buildGenerationConfig(
                    params.history,
                    params.user,
                    params.knowledgeBase,
                    params.knowledgeBaseInventory,
                ),
            });

            const raw = response.text ?? '';
            const parsed = parseLlmMeta(raw);
            return {
                cleanText: parsed.cleanText || FALLBACK_MESSAGE,
                shouldEscalate: parsed.shouldEscalate,
                reason: parsed.reason,
                hadError: false,
            };
        } catch (error) {
            this.logger.error('Erro ao gerar resposta com Gemini', error as Error);
            return { cleanText: FALLBACK_MESSAGE, shouldEscalate: false, hadError: true };
        } finally {
            clearTimeout(timeout);
        }
    }

    async streamReply(params: GenerateParams, callbacks: StreamCallbacks): Promise<StreamResult> {
        if (!this.client) {
            callbacks.onToken(FALLBACK_MESSAGE);
            return { cleanText: FALLBACK_MESSAGE, shouldEscalate: false, hadError: true };
        }

        const timeoutController = new AbortController();
        const timeoutHandle = setTimeout(() => timeoutController.abort(), this.requestTimeoutMs);
        const externalSignal = callbacks.abortSignal;
        if (externalSignal) {
            externalSignal.addEventListener('abort', () => timeoutController.abort(), { once: true });
        }

        let fullText = '';
        let metaSeen = false;
        let pendingTail = '';
        const holdSize = META_OPEN_TAG.length;

        try {
            const stream = await this.client.models.generateContentStream({
                model: this.model,
                contents: this.buildContents(params),
                config: this.buildGenerationConfig(
                    params.history,
                    params.user,
                    params.knowledgeBase,
                    params.knowledgeBaseInventory,
                ),
            });

            for await (const chunk of stream) {
                if (timeoutController.signal.aborted) {
                    throw new Error('Gemini stream aborted');
                }

                const text = chunk.text ?? '';
                if (!text) {
                    continue;
                }
                fullText += text;

                if (metaSeen) {
                    continue;
                }

                const combined = pendingTail + text;
                const metaIdx = combined.indexOf(META_OPEN_TAG);
                if (metaIdx !== -1) {
                    const beforeMeta = combined.slice(0, metaIdx);
                    if (beforeMeta) {
                        callbacks.onToken(beforeMeta);
                    }
                    metaSeen = true;
                    pendingTail = '';
                    continue;
                }

                const safeLen = combined.length - holdSize;
                if (safeLen > 0) {
                    callbacks.onToken(combined.slice(0, safeLen));
                    pendingTail = combined.slice(safeLen);
                } else {
                    pendingTail = combined;
                }
            }

            if (!metaSeen && pendingTail) {
                callbacks.onToken(pendingTail);
                pendingTail = '';
            }

            const parsed = parseLlmMeta(fullText);
            return {
                cleanText: parsed.cleanText || FALLBACK_MESSAGE,
                shouldEscalate: parsed.shouldEscalate,
                reason: parsed.reason,
                hadError: false,
            };
        } catch (error) {
            this.logger.error('Erro ao streamar resposta com Gemini', error as Error);
            if (!metaSeen && pendingTail) {
                callbacks.onToken(pendingTail);
                pendingTail = '';
            }
            if (!fullText) {
                callbacks.onToken(FALLBACK_MESSAGE);
            }
            return {
                cleanText: fullText ? parseLlmMeta(fullText).cleanText : FALLBACK_MESSAGE,
                shouldEscalate: false,
                hadError: true,
            };
        } finally {
            clearTimeout(timeoutHandle);
        }
    }

    private buildContents(params: GenerateParams) {
        const history = params.history ?? [];
        return [
            ...history.map((turn) => ({
                role: turn.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: turn.text }],
            })),
            { role: 'user', parts: [{ text: params.message }] },
        ];
    }

    private buildGenerationConfig(
        history?: ChatTurn[],
        user?: UserContextInput,
        knowledgeBase?: KnowledgeBaseChunk[],
        knowledgeBaseInventory?: KnowledgeBaseInventoryEntry[],
    ) {
        return {
            systemInstruction: buildSystemInstruction({
                hasHistory: Boolean(history && history.length),
                user,
                knowledgeBase,
                knowledgeBaseInventory,
            }),
            temperature: this.temperature,
            topP: this.topP,
            topK: this.topK,
            maxOutputTokens: this.maxOutputTokens,
            thinkingConfig: {
                thinkingBudget: 0,
                includeThoughts: false,
            },
        };
    }
}
