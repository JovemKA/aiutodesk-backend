import { redactPii } from '@common/utils/redact-pii';
import { RetrievedComment } from '../rag/ticket-comment-retriever.service';

export interface TicketAssistContext {
    ticketId: string;
    ticketTitle: string;
    ticketDescription: string;
    comments: RetrievedComment[];
    intent: 'suggest_reply' | 'summary';
}

const ROLE_INSTRUCTION = [
    'Você é um assistente interno que ajuda um AGENTE de suporte do AiutoDesk a atender um chamado.',
    'Escreva em português do Brasil, de forma objetiva e profissional.',
    'O texto é para uso do agente — não há persona "Aiuto" aqui.',
].join('\n');

const INTENT_INSTRUCTION: Record<TicketAssistContext['intent'], string> = {
    suggest_reply:
        'Tarefa: redigir uma sugestão de RESPOSTA ao solicitante deste chamado, pronta para o agente revisar e enviar.',
    summary:
        'Tarefa: produzir um RESUMO objetivo da situação atual deste chamado para o agente se situar rapidamente.',
};

/**
 * Guardrails dos dois pontos críticos do usuário:
 * 1) Proveniência sempre — cada comentário recuperado vem com o nº do chamado de origem.
 * 2) Nada verbatim de OUTRO chamado — comentários de chamados similares entram só resumidos,
 *    com o nº de origem, e apenas se pertinentes (podem conter conteúdo sensível de outro cenário).
 */
const GUARDRAILS = [
    '[Regras de uso do contexto de chamados]',
    '- O "Histórico deste chamado" abaixo é o contexto direto do chamado em atendimento: pode ser usado livremente.',
    '- Os "Chamados similares" são de OUTROS chamados. Eles servem só como referência de como casos parecidos foram tratados.',
    '- NUNCA copie o conteúdo de um chamado similar literalmente. Resuma a ideia com suas palavras.',
    '- Ao mencionar um chamado similar, SEMPRE cite o número de origem, ex.: "em um chamado parecido (#1234) a solução foi…".',
    '- Mencione um chamado similar apenas se for realmente pertinente. Na dúvida, omita — pode conter informação sensível de outro contexto.',
    '- Nunca exponha dados pessoais (e-mails, telefones, documentos, tokens) que apareçam no contexto.',
].join('\n');

function shortTicketRef(ticketId: string): string {
    return ticketId.slice(0, 8);
}

function renderTicketContextBlock(ctx: TicketAssistContext): string {
    const same = ctx.comments.filter((c) => c.sameTicket);
    const others = ctx.comments.filter((c) => !c.sameTicket);

    const sections: string[] = [
        `[Chamado em atendimento #${shortTicketRef(ctx.ticketId)}]`,
        `Título: ${ctx.ticketTitle}`,
        `Descrição: ${ctx.ticketDescription}`,
    ];

    if (same.length > 0) {
        sections.push(
            '\n[Histórico deste chamado]\n' +
                same.map((c, i) => `${i + 1}. ${c.content.trim()}`).join('\n'),
        );
    }

    if (others.length > 0) {
        // Conteúdo de OUTROS chamados: redigir PII e marcar a proveniência. Resumo fica a cargo do LLM.
        sections.push(
            '\n[Chamados similares — mesmo departamento]\n' +
                others
                    .map(
                        (c) =>
                            `- (#${shortTicketRef(c.ticketId)} — "${c.ticketTitle}") ${redactPii(c.content)}`,
                    )
                    .join('\n'),
        );
    }

    return sections.join('\n');
}

export function buildTicketAssistInstruction(ctx: TicketAssistContext): string {
    return [
        ROLE_INSTRUCTION,
        INTENT_INSTRUCTION[ctx.intent],
        renderTicketContextBlock(ctx),
        GUARDRAILS,
    ].join('\n\n');
}
