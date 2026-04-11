import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ParseUUIDPipe,
    UseGuards,
} from '@nestjs/common';
import { ArticleService } from './article.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { JwtAuthGuard } from '@core/auth/jwt-auth.guard';

@Controller('knowledge/articles')
@UseGuards(JwtAuthGuard)
export class ArticleController {
    constructor(private readonly articleService: ArticleService) {}

    @Post()
    create(@Body() dto: CreateArticleDto) {
        return this.articleService.create(dto);
    }

    @Get()
    findAll() {
        return this.articleService.findAll();
    }

    @Get(':id')
    findOne(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.articleService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateArticleDto) {
        return this.articleService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.articleService.remove(id);
    }
}
