import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AskChatDto {
    @IsString()
    @IsNotEmpty()
    message!: string;

    @IsString()
    @IsOptional()
    conversationId?: string;
}
