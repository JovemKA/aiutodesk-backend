import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from './entities/article.entity';
import { DepartmentArticle } from './entities/department-article.entity';
import { ArticleController, KnowledgeArticleController } from './article.controller';
import { ArticleService } from './article.service';

@Module({
    imports: [TypeOrmModule.forFeature([Article, DepartmentArticle])],
    controllers: [ArticleController, KnowledgeArticleController],
    providers: [ArticleService],
    exports: [ArticleService],
})
export class ArticleModule {}
