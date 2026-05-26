import type { Article } from '../entities/article.entity';

const DEFAULT_TARGET_CHARS = 2000; // ~500 tokens (regra de bolso tokens ≈ chars/4)
const HARD_MAX_CHARS = 6000;       // ~1500 tokens — limite de seguranca por chunk

export interface ChunkInput {
    chunkIndex: number;
    content: string;
    tokenCount: number;
}

interface ChunkerOptions {
    targetChars?: number;
    hardMaxChars?: number;
}

export function chunkArticle(article: Article, options: ChunkerOptions = {}): ChunkInput[] {
    const targetChars = options.targetChars ?? DEFAULT_TARGET_CHARS;
    const hardMax = options.hardMaxChars ?? HARD_MAX_CHARS;

    const header = buildHeader(article);
    const paragraphs = splitParagraphs(article.content ?? '');

    if (paragraphs.length === 0) {
        const content = `${header}${(article.summary ?? article.title).trim()}`;
        return [{ chunkIndex: 0, content, tokenCount: estimateTokens(content) }];
    }

    const chunks: ChunkInput[] = [];
    let buffer = '';

    const flush = () => {
        if (!buffer.trim()) return;
        const content = `${header}${buffer.trim()}`;
        chunks.push({
            chunkIndex: chunks.length,
            content,
            tokenCount: estimateTokens(content),
        });
        buffer = '';
    };

    for (const paragraph of paragraphs) {
        const candidate = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
        const candidateLength = header.length + candidate.length;

        if (candidateLength <= targetChars) {
            buffer = candidate;
            continue;
        }

        if (!buffer) {
            for (const piece of hardSplit(paragraph, targetChars - header.length, hardMax - header.length)) {
                buffer = piece;
                flush();
            }
            continue;
        }

        flush();
        buffer = paragraph;
    }

    flush();
    return chunks;
}

function buildHeader(article: Article): string {
    const summary = article.summary?.trim();
    const tail = summary ? ` — ${summary}` : '';
    return `[${article.title.trim()}]${tail}\n\n`;
}

function splitParagraphs(content: string): string[] {
    return content
        .split(/\n{2,}/g)
        .map((p) => p.replace(/[ \t]+\n/g, '\n').trim())
        .filter((p) => p.length > 0);
}

function hardSplit(text: string, target: number, hardMax: number): string[] {
    if (text.length <= target) return [text];

    const sentences = text.split(/(?<=[.!?])\s+/);
    const pieces: string[] = [];
    let buffer = '';

    for (const sentence of sentences) {
        const candidate = buffer ? `${buffer} ${sentence}` : sentence;
        if (candidate.length <= target) {
            buffer = candidate;
            continue;
        }
        if (buffer) {
            pieces.push(buffer);
            buffer = sentence;
        } else {
            // sentenca unica maior que target — forca corte por hardMax
            for (let i = 0; i < sentence.length; i += hardMax) {
                pieces.push(sentence.slice(i, i + hardMax));
            }
            buffer = '';
        }
    }

    if (buffer) pieces.push(buffer);
    return pieces;
}

function estimateTokens(text: string): number {
    return Math.max(1, Math.ceil(text.length / 4));
}
