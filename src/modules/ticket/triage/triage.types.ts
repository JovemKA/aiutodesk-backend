import { TicketPriority } from '@common/enums/ticket-priority.enum';

export type TriageConfidence = 'low' | 'medium' | 'high';

export interface TriageInput {
    title: string;
    description: string;
}

/**
 * Resultado da triagem por IA. Tudo é anulável: quando o modelo está indisponível,
 * incerto ou devolve algo fora das listas reais, os campos vêm `null` (nunca um ID
 * inventado). Quem consome decide o que aplicar — ver TicketService.applyTriage.
 */
export interface TriageSuggestion {
    /** Score 0–100 segundo o rubric compartilhado, ou null. */
    priorityScore: number | null;
    /** Enum derivado do score via scoreToPriority(), ou null. Não sobrescreve a escolha do usuário. */
    priority: TicketPriority | null;
    priorityReason: string | null;
    /** Confiança geral da classificação. Usada como gate para categoria/departamento e gravada em scoreConfidence. */
    confidence: TriageConfidence | null;
    categoryId: string | null;
    categoryName: string | null;
    departmentId: string | null;
    departmentName: string | null;
}

export const EMPTY_TRIAGE: TriageSuggestion = {
    priorityScore: null,
    priority: null,
    priorityReason: null,
    confidence: null,
    categoryId: null,
    categoryName: null,
    departmentId: null,
    departmentName: null,
};
