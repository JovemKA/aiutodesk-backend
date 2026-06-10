import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiClientProvider } from '@modules/chat/embeddings/gemini-client.provider';
import { CategoryService } from '@modules/category/category.service';
import { DepartmentService } from '@modules/department/department.service';
import { isValidPriorityScore, scoreToPriority } from '../utils/priority-score.utils';
import { buildTriageInstruction, buildTriageResponseSchema, NO_MATCH } from './ticket-triage.prompt';
import { EMPTY_TRIAGE, TriageConfidence, TriageInput, TriageSuggestion } from './triage.types';

const DEFAULT_MODEL = 'gemini-2.5-flash';
/** Classificação determinística: temperatura baixa, independente do chat. */
const TRIAGE_TEMPERATURE = 0.1;
const MAX_OUTPUT_TOKENS = 512;
const DEFAULT_TIMEOUT_MS = 20000;

interface RawTriageResponse {
    priorityScore?: unknown;
    priorityReason?: unknown;
    confidence?: unknown;
    category?: unknown;
    department?: unknown;
}

@Injectable()
export class TicketTriageService {
    private readonly logger = new Logger(TicketTriageService.name);
    private readonly model: string;
    private readonly requestTimeoutMs: number;

    constructor(
        private readonly clientProvider: GeminiClientProvider,
        private readonly categoryService: CategoryService,
        private readonly departmentService: DepartmentService,
        private readonly configService: ConfigService,
    ) {
        this.model = this.configService.get<string>('gemini.model') ?? DEFAULT_MODEL;
        this.requestTimeoutMs =
            this.configService.get<number>('gemini.requestTimeoutMs') ?? DEFAULT_TIMEOUT_MS;
    }

    /** Triagem na criação ligada por padrão; `TRIAGE_ON_CREATE_ENABLED=false` desliga. */
    isEnabledOnCreate(): boolean {
        const raw = this.configService.get<string>('TRIAGE_ON_CREATE_ENABLED');
        return raw === undefined || raw === null || `${raw}`.toLowerCase() !== 'false';
    }

    /**
     * Classifica um chamado a partir de título+descrição. Sempre devolve um TriageSuggestion;
     * em qualquer falha (sem chave, timeout, JSON inválido) devolve EMPTY_TRIAGE — nunca lança.
     */
    async triage(input: TriageInput): Promise<TriageSuggestion> {
        const client = this.clientProvider.getClient();
        if (!client) {
            return EMPTY_TRIAGE;
        }

        const [categories, departments] = await Promise.all([
            this.categoryService.findAll(),
            this.departmentService.findAll(),
        ]);
        const categoryNames = categories.map((c) => c.name);
        const departmentNames = departments.map((d) => d.name);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
        try {
            const response = await client.models.generateContent({
                model: this.model,
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                text: `Título: ${input.title}\n\nDescrição: ${input.description}`,
                            },
                        ],
                    },
                ],
                config: {
                    systemInstruction: buildTriageInstruction({ categoryNames, departmentNames }),
                    temperature: TRIAGE_TEMPERATURE,
                    maxOutputTokens: MAX_OUTPUT_TOKENS,
                    responseMimeType: 'application/json',
                    responseSchema: buildTriageResponseSchema({ categoryNames, departmentNames }),
                    abortSignal: controller.signal,
                    thinkingConfig: { thinkingBudget: 0, includeThoughts: false },
                },
            });

            const parsed = this.parseResponse(response.text ?? '');
            if (!parsed) {
                return EMPTY_TRIAGE;
            }

            const category = this.resolveName(parsed.category, categories);
            const department = this.resolveName(parsed.department, departments);
            const priorityScore = isValidPriorityScore(parsed.priorityScore)
                ? Math.round(parsed.priorityScore)
                : null;

            return {
                priorityScore,
                priority: priorityScore !== null ? scoreToPriority(priorityScore) : null,
                priorityReason:
                    typeof parsed.priorityReason === 'string' ? parsed.priorityReason : null,
                confidence: this.normalizeConfidence(parsed.confidence),
                categoryId: category?.id ?? null,
                categoryName: category?.name ?? null,
                departmentId: department?.id ?? null,
                departmentName: department?.name ?? null,
            };
        } catch (error) {
            this.logger.warn(`Falha na triagem por IA: ${(error as Error).message}`);
            return EMPTY_TRIAGE;
        } finally {
            clearTimeout(timeout);
        }
    }

    private parseResponse(raw: string): RawTriageResponse | null {
        const text = raw.trim();
        if (!text) {
            return null;
        }
        try {
            return JSON.parse(text) as RawTriageResponse;
        } catch {
            this.logger.warn('Resposta de triagem não é JSON válido; ignorando.');
            return null;
        }
    }

    private normalizeConfidence(value: unknown): TriageConfidence | null {
        return value === 'low' || value === 'medium' || value === 'high' ? value : null;
    }

    /** Resolve o nome devolvido pelo modelo para um {id, name} real; sem match (ou NO_MATCH) → null. */
    private resolveName(
        value: unknown,
        list: { id: string; name: string }[],
    ): { id: string; name: string } | null {
        if (typeof value !== 'string') {
            return null;
        }
        const needle = value.trim().toLowerCase();
        if (!needle || needle === NO_MATCH.toLowerCase()) {
            return null;
        }
        const found = list.find((item) => item.name.trim().toLowerCase() === needle);
        return found ? { id: found.id, name: found.name } : null;
    }
}
