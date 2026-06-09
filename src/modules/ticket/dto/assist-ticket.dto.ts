import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class AssistTicketDto {
    @IsOptional()
    @IsIn(['suggest_reply', 'summary'])
    intent?: 'suggest_reply' | 'summary';

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    query?: string;
}
