import { IsString, IsOptional } from 'class-validator';

export class CreateArticleDto {
    @IsString()
    title: string;

    @IsString()
    content: string;

    @IsOptional()
    @IsString()
    categoryId?: string;
}
