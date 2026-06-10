import { Type } from '@google/genai';
import { PRIORITY_SCORE_LEVELS } from '@common/constants/priority-rubric';

/** Valor que o modelo deve devolver quando nenhuma categoria/departamento se encaixa com clareza. */
export const NO_MATCH = 'INDEFINIDO';

export interface TriagePromptContext {
    categoryNames: string[];
    departmentNames: string[];
}

/**
 * Schema de saída estruturada (responseSchema do Gemini). Restringe categoria/departamento
 * aos nomes reais (+ sentinela NO_MATCH), evitando alucinação de valores fora da lista.
 */
export function buildTriageResponseSchema(ctx: TriagePromptContext) {
    return {
        type: Type.OBJECT,
        properties: {
            priorityScore: {
                type: Type.INTEGER,
                description: 'Inteiro de 0 a 100 segundo a escala de prioridade.',
            },
            priorityReason: {
                type: Type.STRING,
                description: 'Critério principal que determinou o score, em uma frase curta.',
            },
            confidence: {
                type: Type.STRING,
                enum: ['low', 'medium', 'high'],
                description: 'Confiança geral da classificação.',
            },
            category: {
                type: Type.STRING,
                enum: [...ctx.categoryNames, NO_MATCH],
                description: `Exatamente um destes nomes, ou "${NO_MATCH}" se nenhum se encaixar.`,
            },
            department: {
                type: Type.STRING,
                enum: [...ctx.departmentNames, NO_MATCH],
                description: `Exatamente um destes nomes, ou "${NO_MATCH}" se nenhum se encaixar.`,
            },
        },
        required: ['priorityScore', 'priorityReason', 'confidence', 'category', 'department'],
        propertyOrdering: ['priorityScore', 'priorityReason', 'confidence', 'category', 'department'],
    };
}

function renderList(label: string, names: string[]): string {
    if (names.length === 0) {
        return `[${label}]\n(nenhuma cadastrada — responda "${NO_MATCH}")`;
    }
    return `[${label}]\n${names.map((n) => `- ${n}`).join('\n')}`;
}

export function buildTriageInstruction(ctx: TriagePromptContext): string {
    return [
        'Você é um classificador interno do AiutoDesk. A partir do título e da descrição de um chamado recém-aberto, faça a triagem inicial.',
        'Responda SOMENTE com o JSON do schema fornecido, em português do Brasil. Não escreva texto fora do JSON.',
        '',
        'Tarefas:',
        '1. priorityScore: avalie urgência e impacto e atribua um score de 0 a 100 seguindo a escala abaixo.',
        '2. priorityReason: justifique o score em uma frase curta (o critério principal).',
        '3. category: escolha EXATAMENTE um nome da lista de categorias. Se nenhum se encaixar com clareza, responda "' + NO_MATCH + '".',
        '4. department: escolha EXATAMENTE um nome da lista de departamentos. Se nenhum se encaixar com clareza, responda "' + NO_MATCH + '".',
        '5. confidence: sua confiança geral na classificação (low | medium | high). Na dúvida sobre categoria/departamento, prefira "low" e "' + NO_MATCH + '".',
        '',
        'Nunca invente categorias ou departamentos fora das listas. Não exponha dados pessoais que apareçam no texto.',
        '',
        '[Escala de prioridade (score de 0 a 100)]',
        ...PRIORITY_SCORE_LEVELS,
        '',
        renderList('Categorias disponíveis', ctx.categoryNames),
        '',
        renderList('Departamentos disponíveis', ctx.departmentNames),
    ].join('\n');
}
