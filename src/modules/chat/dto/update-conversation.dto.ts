import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateConversationDto {
    @IsString()
    @MinLength(1)
    @MaxLength(200)
    @IsOptional()
    title?: string;

    @IsBoolean()
    @IsOptional()
    archived?: boolean;
}
