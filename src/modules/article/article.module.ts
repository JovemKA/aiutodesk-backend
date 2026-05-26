import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from './entities/article.entity';
import { ArticleChunk } from './entities/article-chunk.entity';
import { DepartmentArticle } from './entities/department-article.entity';
import { ArticleController, KnowledgeArticleController } from './article.controller';
import { ArticleService } from './article.service';
import { ArticleIndexerService } from './indexing/article-indexer.service';
import { EmbeddingsModule } from '@modules/chat/embeddings/embeddings.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Article, ArticleChunk, DepartmentArticle]),
        EmbeddingsModule,
    ],
    controllers: [ArticleController, KnowledgeArticleController],
    providers: [ArticleService, ArticleIndexerService],
    exports: [ArticleService, ArticleIndexerService, TypeOrmModule],
})
export class ArticleModule {}
