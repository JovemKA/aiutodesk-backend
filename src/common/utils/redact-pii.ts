/**
 * Redação leve de PII para conteúdo que será exposto à IA fora do seu chamado de origem
 * (ex.: comentários de chamados similares no "escopo maior"). Remove e-mails, telefones, CPF/CNPJ
 * e tokens longos. Não substitui revisão humana — é uma rede de segurança contra vazamento óbvio.
 */
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const CNPJ = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
const PHONE = /\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}\b/g;
// Tokens/segredos: sequências longas alfanuméricas (>=24) ou prefixos comuns de chave.
const TOKEN = /\b(?:sk-|pk-|ghp_|xox[baprs]-)?[A-Za-z0-9_-]{24,}\b/g;

export function redactPii(text: string | null | undefined): string {
    if (!text) return '';
    return text
        .replace(EMAIL, '[email]')
        .replace(CNPJ, '[cnpj]')
        .replace(CPF, '[cpf]')
        .replace(TOKEN, '[token]')
        .replace(PHONE, '[telefone]')
        .trim();
}
