import { SYSTEM_PROMPT } from './system-prompt';
import { PERSONA_PROMPT } from './persona-prompt';
import { PRODUCT_CONTEXT } from './product-context';
import { ESCALATION_POLICY } from './escalation-policy';
import { ASSISTANT_IDENTITY, renderIdentityBlock } from './assistant-identity';
import { renderUserContextBlock, UserContextInput } from './user-context';
import {
    renderKnowledgeBaseBlock,
    KnowledgeBaseChunk,
    KnowledgeBaseInventoryEntry,
} from './knowledge-base';

export { ASSISTANT_IDENTITY } from './assistant-identity';
export type { AssistantIdentity } from './assistant-identity';
export type { UserContextInput } from './user-context';
export type { KnowledgeBaseChunk, KnowledgeBaseInventoryEntry } from './knowledge-base';

export interface CalibrationExample {
    chatSummary: string;
    aiScore: number;
    agentPriority: string;
}

export interface BuildSystemInstructionOptions {
    hasHistory?: boolean;
    user?: UserContextInput;
    knowledgeBase?: KnowledgeBaseChunk[];
    knowledgeBaseInventory?: KnowledgeBaseInventoryEntry[];
    scoreFeedbackExamples?: CalibrationExample[];
}

export function buildSystemInstruction(options: BuildSystemInstructionOptions = {}): string {
    const sections: string[] = [
        `[Identidade]\n${renderIdentityBlock(ASSISTANT_IDENTITY)}`,
        `[Missão]\n${SYSTEM_PROMPT}`,
        `[Persona]\n${PERSONA_PROMPT}`,
        `[Contexto do produto]\n${PRODUCT_CONTEXT}`,
    ];

    const hasKb =
        (options.knowledgeBase && options.knowledgeBase.length > 0) ||
        (options.knowledgeBaseInventory && options.knowledgeBaseInventory.length > 0);

    if (hasKb) {
        const kbBlock = renderKnowledgeBaseBlock({
            chunks: options.knowledgeBase ?? [],
            inventory: options.knowledgeBaseInventory ?? [],
        });
        if (kbBlock) {
            sections.push(`[Base de Conhecimento]\n${kbBlock}`);
        }
    }

    sections.push(`[Escalonamento]\n${ESCALATION_POLICY}`);

    if (options.scoreFeedbackExamples && options.scoreFeedbackExamples.length > 0) {
        const lines = options.scoreFeedbackExamples.map(
            (ex) =>
                `- Usuário relatou "${ex.chatSummary}" → time reclassificou para ${ex.agentPriority} (score da IA era ${ex.aiScore})`,
        );
        sections.push(
            `[Calibração de Score]\nCorreções recentes dos agentes (use como referência para calibrar sua avaliação):\n${lines.join('\n')}`,
        );
    }

    if (options.user) {
        const userBlock = renderUserContextBlock(options.user);
        if (userBlock) {
            sections.push(`[Usuário em atendimento]\n${userBlock}`);
        }
    }

    if (options.hasHistory) {
        sections.push(
            '[Histórico]\nUse o histórico da conversa abaixo apenas como contexto, sem repeti-lo. Responda à última mensagem do usuário.',
        );
    }

    return sections.join('\n\n');
}

export const META_OPEN_TAG = '[[META]]';
export const META_CLOSE_TAG = '[[/META]]';

export type ScoreConfidence = 'low' | 'medium' | 'high';

export interface ParsedLlmMeta {
    cleanText: string;
    shouldEscalate: boolean;
    reason?: string;
    priorityScore?: number;
    priorityReason?: string;
    scoreConfidence?: ScoreConfidence;
}

export function parseLlmMeta(rawText: string): ParsedLlmMeta {
    const startIdx = rawText.lastIndexOf(META_OPEN_TAG);
    if (startIdx === -1) {
        return { cleanText: rawText.trim(), shouldEscalate: false };
    }

    const endIdx = rawText.indexOf(META_CLOSE_TAG, startIdx);
    if (endIdx === -1) {
        return { cleanText: rawText.trim(), shouldEscalate: false };
    }

    const jsonPart = rawText.slice(startIdx + META_OPEN_TAG.length, endIdx).trim();
    const cleanText = rawText.slice(0, startIdx).trim();

    try {
        const parsed = JSON.parse(jsonPart) as {
            shouldEscalate?: boolean;
            reason?: string;
            priorityScore?: unknown;
            priorityReason?: unknown;
            scoreConfidence?: unknown;
        };

        const rawScore = parsed.priorityScore;
        const priorityScore =
            typeof rawScore === 'number' && Number.isFinite(rawScore) && rawScore >= 0 && rawScore <= 100
                ? Math.round(rawScore)
                : undefined;

        const priorityReason =
            typeof parsed.priorityReason === 'string' ? parsed.priorityReason : undefined;

        const rawConfidence = parsed.scoreConfidence;
        const scoreConfidence: ScoreConfidence | undefined =
            rawConfidence === 'low' || rawConfidence === 'medium' || rawConfidence === 'high'
                ? rawConfidence
                : undefined;

        return {
            cleanText,
            shouldEscalate: Boolean(parsed.shouldEscalate),
            reason: parsed.reason,
            priorityScore,
            priorityReason,
            scoreConfidence,
        };
    } catch {
        return { cleanText, shouldEscalate: false };
    }
}
