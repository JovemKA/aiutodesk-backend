import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class ListConversationsQueryDto {
    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    archived?: boolean = false;

    @IsInt()
    @Min(1)
    @Max(50)
    @IsOptional()
    @Transform(({ value }) => parseInt(value as string, 10))
    limit?: number = 30;

    @IsInt()
    @Min(0)
    @IsOptional()
    @Transform(({ value }) => parseInt(value as string, 10))
    offset?: number = 0;
}
