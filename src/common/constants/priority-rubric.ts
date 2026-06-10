/**
 * Escala de prioridade 0–100, compartilhada entre o escalonamento do chat
 * (src/modules/chat/prompts/escalation-policy.ts) e a triagem automática na
 * criação do chamado (src/modules/ticket/triage). Mantém os dois fluxos na
 * MESMA régua. As 4 linhas abaixo são, propositalmente, sem cabeçalho — cada
 * consumidor adiciona o seu próprio enquadramento.
 */
export const PRIORITY_SCORE_LEVELS = [
    '- 75–100 (critical): Bloqueio total de operação, sistema de produção fora do ar, segurança ou dados comprometidos, múltiplos usuários impedidos de trabalhar.',
    '- 50–74 (high): Funcionalidade crítica degradada, grupo de usuários afetado, prazo iminente, alternativa temporária insatisfatória.',
    '- 25–49 (medium): Impacto moderado em um ou poucos usuários, alternativa temporária disponível, sem risco imediato.',
    '- 0–24 (low): Dúvida, melhoria cosmética, sem impacto operacional, pedido não urgente.',
] as const;
