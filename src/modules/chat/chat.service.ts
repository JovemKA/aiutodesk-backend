import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Article } from '@modules/article/entities/article.entity';
import { TicketService } from '@modules/ticket/ticket.service';
import { TicketPriority } from '@common/enums/ticket-priority.enum';

interface ChatSource {
    id: string;
    title: string;
}

interface ChatAnswer {
    answer: string;
    sources: ChatSource[];
    shouldEscalate: boolean;
    escalatedTicketId?: string;
    conversationId?: string;
}

interface AskChatParams {
    message: string;
    requesterId: string;
    conversationId?: string;
}

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(Article)
        private readonly articleRepo: Repository<Article>,
        private readonly ticketService: TicketService,
    ) {}

    async ask(params: AskChatParams): Promise<ChatAnswer> {
        const conversationId = params.conversationId ?? this.generateConversationId();
        const message = params.message;
        const terms = this.extractKeywords(message);
        const articles = await this.findRelevantArticles(terms);

        const unresolvedByHint = this.hasEscalationHint(message);
        const shouldEscalate = unresolvedByHint || articles.length === 0;

        if (shouldEscalate) {
            const summary = this.buildConversationSummary(message, articles);
            const inferredSubject = this.inferSubject(message, terms);
            const ticket = await this.ticketService.createFromChatEscalation({
                requesterId: params.requesterId,
                conversationId,
                inferredSubject,
                summary,
                priority: TicketPriority.MEDIUM,
            });

            return {
                answer: 'Nao consegui resolver com seguranca por aqui. Escalei automaticamente para o time e um ticket foi criado.',
                sources: articles.map((article) => ({
                    id: article.id,
                    title: article.title,
                })),
                shouldEscalate: true,
                escalatedTicketId: ticket.id,
                conversationId,
            };
        }

        const answer = this.buildFallbackAnswer(articles);

        return {
            answer,
            sources: articles.map((article) => ({
                id: article.id,
                title: article.title,
            })),
            shouldEscalate: false,
            conversationId,
        };
    }

    private hasEscalationHint(message: string): boolean {
        const lower = message.toLowerCase();
        const hints = [
            'nao resolveu',
            'não resolveu',
            'sem sucesso',
            'urgente',
            'critico',
            'crítico',
            'abrir chamado',
            'abrir ticket',
            'escalar',
            'preciso de humano',
        ];

        return hints.some((hint) => lower.includes(hint));
    }

    private inferSubject(message: string, terms: string[]): string {
        if (terms.length > 0) {
            const label = terms.slice(0, 4).join(' ');
            return `Escalacao automatica via chat: ${label}`;
        }

        return `Escalacao automatica via chat: ${this.truncate(message, 60)}`;
    }

    private buildConversationSummary(message: string, articles: Article[]): string {
        const articleTitles = articles.map((a) => a.title).slice(0, 3);
        const sourceText = articleTitles.length > 0
            ? `Artigos considerados: ${articleTitles.join(' | ')}`
            : 'Nenhum artigo relevante encontrado';

        return `Mensagem original do usuario: ${message}\n${sourceText}`;
    }

    private generateConversationId(): string {
        return `chat-${Date.now()}`;
    }

    private extractKeywords(message: string): string[] {
        const stopwords = new Set([
            'a', 'e', 'o', 'os', 'as', 'de', 'da', 'do', 'das', 'dos',
            'para', 'por', 'com', 'sem', 'em', 'no', 'na', 'nos', 'nas',
            'um', 'uma', 'uns', 'umas', 'que', 'como', 'qual', 'quais',
            'quando', 'onde', 'porque', 'se', 'eu', 'voce', 'meu',
            'minha', 'meus', 'minhas', 'seu', 'sua', 'seus', 'suas',
            'preciso', 'ajuda', 'sobre', 'favor',
        ]);

        return message
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, ' ')
            .split(/\s+/)
            .map((term) => term.trim())
            .filter((term) => term.length >= 3 && !stopwords.has(term))
            .slice(0, 8);
    }

    private async findRelevantArticles(terms: string[]): Promise<Article[]> {
        if (terms.length === 0) {
            return [];
        }

        const qb = this.articleRepo
            .createQueryBuilder('article')
            .where('article.isPublished = :isPublished', { isPublished: true })
            .andWhere(
                new Brackets((subQb) => {
                    terms.forEach((term, index) => {
                        const key = `term${index}`;
                        subQb.orWhere(
                            `(article.title ILIKE :${key} OR article.content ILIKE :${key})`,
                            { [key]: `%${term}%` },
                        );
                    });
                }),
            )
            .take(20);

        const candidates = await qb.getMany();
        const ranked = this.rankArticles(candidates, terms);

        return ranked.slice(0, 5).map((item) => item.article);
    }

    private rankArticles(articles: Article[], terms: string[]) {
        return articles
            .map((article) => ({
                article,
                score: this.computeScore(`${article.title} ${article.content}`, terms),
            }))
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score);
    }

    private computeScore(text: string, terms: string[]): number {
        const lowerText = text.toLowerCase();
        return terms.reduce(
            (total, term) => total + this.countOccurrences(lowerText, term),
            0,
        );
    }

    private countOccurrences(text: string, term: string): number {
        let count = 0;
        let index = text.indexOf(term);

        while (index !== -1) {
            count += 1;
            index = text.indexOf(term, index + term.length);
        }

        return count;
    }

    private buildFallbackAnswer(articles: Article[]): string {
        const primary = articles[0];
        if (!primary) {
            return 'Nao encontrei informacoes suficientes nos artigos.';
        }

        const snippet = this.truncate(primary.content, 700);
        if (articles.length === 1) {
            return `Baseado no artigo "${primary.title}", segue um resumo: ${snippet}`;
        }

        return `Encontrei ${articles.length} artigos relacionados. Trecho do mais relevante (${primary.title}): ${snippet}`;
    }

    private truncate(text: string, maxLength: number): string {
        if (text.length <= maxLength) {
            return text;
        }

        return `${text.slice(0, maxLength).trim()}...`;
    }
}
