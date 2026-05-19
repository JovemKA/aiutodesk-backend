import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateArticleDto {
    @IsString()
    title!: string;

    @IsString()
    content!: string;

    @IsOptional()
    @IsString()
    categoryId?: string;

    @IsOptional()
    @IsBoolean()
    isPublished?: boolean;
}
