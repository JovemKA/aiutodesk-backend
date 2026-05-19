import { IsArray, IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateArticleDto {
    @IsString()
    title!: string;

    @IsOptional()
    @IsString()
    slug?: string;

    @IsOptional()
    @IsString()
    summary?: string;

    @IsString()
    content!: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @IsOptional()
    @IsUUID()
    authorId?: string;

    @IsOptional()
    @IsBoolean()
    isPublished?: boolean;
}
