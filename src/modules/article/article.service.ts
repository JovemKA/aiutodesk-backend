import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './entities/article.entity';
import { DepartmentArticle } from './entities/department-article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Injectable()
export class ArticleService {
    constructor(
        @InjectRepository(Article)
        private readonly articleRepo: Repository<Article>,
        @InjectRepository(DepartmentArticle)
        private readonly deptArticleRepo: Repository<DepartmentArticle>,
    ) {}

    async create(dto: CreateArticleDto) {
        const article = this.articleRepo.create(dto);
        return await this.articleRepo.save(article);
    }

    async findAll() {
        return await this.articleRepo.find();
    }

    async findOne(id: string) {
        const article = await this.articleRepo.findOne({ where: { id } });
        if (!article) {
            throw new NotFoundException('Artigo não encontrado');
        }
        return article;
    }

    async update(id: string, dto: UpdateArticleDto) {
        const article = await this.findOne(id);
        const updated = Object.assign(article, dto);
        return await this.articleRepo.save(updated);
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
