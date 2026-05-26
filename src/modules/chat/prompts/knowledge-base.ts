export interface KnowledgeBaseChunk {
    title: string;
    slug: string;
    content: string;
}

export interface KnowledgeBaseInventoryEntry {
    title: string;
    slug: string;
}

export interface RenderKnowledgeBaseInput {
    chunks: KnowledgeBaseChunk[];
    inventory?: KnowledgeBaseInventoryEntry[];
}

export function renderKnowledgeBaseBlock(input: RenderKnowledgeBaseInput): string {
    const chunks = input.chunks ?? [];
    const inventory = input.inventory ?? [];

    if (chunks.length === 0 && inventory.length === 0) return '';

    const header = [
        'Estas sao informacoes da Base de Conhecimento do AiutoDesk disponiveis para esta conversa.',
        'Voce TEM acesso a Base de Conhecimento — nunca diga o contrario.',
        '',
        'Como usar:',
        '- Para perguntas META sobre a base (quantos artigos existem, quais titulos, tem artigo sobre X?, listar tudo): use o "Indice" abaixo. Voce PODE contar, listar e citar titulos a partir dele.',
        '- Para perguntas DE CONTEUDO (como faco X, qual o procedimento de Y): use as "Fontes recuperadas" abaixo, que trazem o texto dos artigos mais relevantes para a pergunta.',
        '- Ao final da resposta, mencione os artigos consultados pelo titulo (ex.: \'Veja tambem: "Como redefinir sua senha"\').',
        '- Se a resposta nao estiver no indice nem nas fontes, diga que nao encontrou e prefira sinalizar escalonamento em vez de inventar.',
        '- Nao mencione ids internos ou slugs no texto ao usuario.',
    ].join('\n');

    const inventoryBlock = inventory.length > 0
        ? `\n\nIndice da Base de Conhecimento (${inventory.length} artigo${inventory.length === 1 ? '' : 's'} publicado${inventory.length === 1 ? '' : 's'}):\n` +
          inventory.map((entry, idx) => `${idx + 1}. ${entry.title}`).join('\n')
        : '';

    const chunksBlock = chunks.length > 0
        ? `\n\nFontes recuperadas para esta pergunta:\n\n` +
          chunks
              .map(
                  (chunk, idx) =>
                      `Fonte ${idx + 1} — "${chunk.title}" (slug: ${chunk.slug})\n${chunk.content.trim()}`,
              )
              .join('\n\n')
        : '';

    return `${header}${inventoryBlock}${chunksBlock}`;
}
