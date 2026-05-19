import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './entities/article.entity';
import { DepartmentArticle } from './entities/department-article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { User } from '@modules/user/entities/user.entity';
import { Category } from '@modules/category/entities/category.entity';

@Injectable()
export class ArticleService {
    constructor(
        @InjectRepository(Article)
        private readonly articleRepo: Repository<Article>,
        @InjectRepository(DepartmentArticle)
        private readonly deptArticleRepo: Repository<DepartmentArticle>,
    ) {}

    private slugify(value: string) {
        const normalized = value
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        const slug = normalized
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '')
            .trim();

        return slug || 'article';
    }

    private async ensureUniqueSlug(baseSlug: string, excludeId?: string) {
        let slug = baseSlug;
        let suffix = 2;

        while (true) {
            const existing = await this.articleRepo.findOne({ where: { slug } });
            if (!existing || (excludeId && existing.id === excludeId)) {
                return slug;
            }
            slug = `${baseSlug}-${suffix}`;
            suffix += 1;
        }
    }

    private buildSummary(content: string, maxLength = 220) {
        const stripped = content
            .replace(/```[\s\S]*?```/g, ' ')
            .replace(/`[^`]*`/g, ' ')
            .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
            .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
            .replace(/[#>*_~\-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (!stripped) return '';
        if (stripped.length <= maxLength) return stripped;

        const slice = stripped.slice(0, maxLength);
        const lastSpace = slice.lastIndexOf(' ');
        return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim();
    }

    async create(dto: CreateArticleDto, actorUserId?: string) {
        const baseSlug = this.slugify(dto.slug ?? dto.title);
        const slug = await this.ensureUniqueSlug(baseSlug);

        const article = this.articleRepo.create({
            title: dto.title,
            slug,
            summary: dto.summary ?? this.buildSummary(dto.content),
            content: dto.content,
            tags: dto.tags ?? [],
            isPublished: dto.isPublished ?? true,
            author: (actorUserId ?? dto.authorId) ? ({ id: actorUserId ?? dto.authorId } as User) : undefined,
            category: dto.categoryId ? ({ id: dto.categoryId } as Category) : undefined,
        });

        return await this.articleRepo.save(article);
    }

    async findAll() {
        return await this.articleRepo.find({ relations: { author: true, category: true } });
    }

    async findOne(id: string) {
        const article = await this.articleRepo.findOne({ where: { id }, relations: { author: true, category: true } });
        if (!article) {
            throw new NotFoundException('Artigo não encontrado');
        }
        return article;
    }

    async findBySlug(slug: string) {
        const article = await this.articleRepo.findOne({ where: { slug }, relations: { author: true, category: true } });
        if (!article) {
            throw new NotFoundException('Artigo não encontrado');
        }
        await this.articleRepo.increment({ id: article.id }, 'viewCount', 1);
        article.viewCount += 1;
        return article;
    }

    async voteHelpful(slug: string, helpful: boolean) {
        const article = await this.articleRepo.findOne({ where: { slug }, relations: { author: true, category: true } });
        if (!article) {
            throw new NotFoundException('Artigo não encontrado');
        }

        if (helpful) {
            article.helpfulCount += 1;
        } else {
            article.notHelpfulCount += 1;
        }

        return await this.articleRepo.save(article);
    }

    async update(id: string, dto: UpdateArticleDto) {
        const article = await this.findOne(id);

        if (dto.title !== undefined) {
            article.title = dto.title;
        }

        if (dto.slug !== undefined) {
            const baseSlug = this.slugify(dto.slug);
            article.slug = await this.ensureUniqueSlug(baseSlug, id);
        } else if (dto.title !== undefined) {
            const baseSlug = this.slugify(dto.title);
            article.slug = await this.ensureUniqueSlug(baseSlug, id);
        }

        if (dto.content !== undefined) {
            article.content = dto.content;
        }

        if (dto.summary !== undefined) {
            article.summary = dto.summary;
        } else if (dto.content !== undefined && !article.summary) {
            article.summary = this.buildSummary(dto.content);
        }

        if (dto.tags !== undefined) {
            article.tags = dto.tags;
        }

        if (dto.isPublished !== undefined) {
            article.isPublished = dto.isPublished;
        }

        if (dto.authorId !== undefined) {
            article.author = dto.authorId ? ({ id: dto.authorId } as User) : undefined;
        }

        if (dto.categoryId !== undefined) {
            article.category = dto.categoryId ? ({ id: dto.categoryId } as Category) : undefined;
        }

        return await this.articleRepo.save(article);
    }

    async remove(id: string) {
        const article = await this.findOne(id);
        await this.articleRepo.remove(article);
        return { message: 'Artigo removido com sucesso' };
    }

    // Department-Article methods
    linkToDepartment(departmentId: string, articleId: string) {
        const link = this.deptArticleRepo.create({
            department: { id: departmentId } as any,
            article: { id: articleId } as any,
        });
        return this.deptArticleRepo.save(link);
    }

    findByDepartment(departmentId: string) {
        return this.deptArticleRepo.find({
            where: { department: { id: departmentId } },
            relations: ['article'],
        });
    }
}
