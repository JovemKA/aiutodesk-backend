import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ParseUUIDPipe,
    Req,
    UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ArticleService } from './article.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { JwtAuthGuard } from '@core/auth/jwt-auth.guard';
import { RolesGuard } from '@core/auth/roles.guard';
import { Roles } from '@core/auth/roles.decorator';
import { UserRole } from '@common/enums/user-role.enum';

@Controller('knowledge/articles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.DEV, UserRole.MASTER, UserRole.ADMIN)
export class ArticleController {
    constructor(private readonly articleService: ArticleService) {}

    @Post()
    create(
        @Req() req: Request & { user: { userId: string } },
        @Body() dto: CreateArticleDto,
    ) {
        return this.articleService.create(dto, req.user?.userId);
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
    @Roles(UserRole.DEV, UserRole.MASTER, UserRole.ADMIN)
    update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateArticleDto) {
        return this.articleService.update(id, dto);
    }

    @Delete(':id')
    @Roles(UserRole.DEV, UserRole.MASTER, UserRole.ADMIN)
    remove(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.articleService.remove(id);
    }
}

@Controller('knowledge-base')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.DEV, UserRole.MASTER, UserRole.ADMIN)
export class KnowledgeArticleController {
    constructor(private readonly articleService: ArticleService) {}

    @Get()
    findAll() {
        return this.articleService.findAll();
    }

    @Get(':slug')
    findBySlug(@Param('slug') slug: string) {
        return this.articleService.findBySlug(slug);
    }

    @Post(':slug/helpful')
    voteHelpful(
        @Param('slug') slug: string,
        @Body() body: { helpful?: boolean },
    ) {
        return this.articleService.voteHelpful(slug, body?.helpful !== false);
    }
}
