import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AskChatDto {
    @IsString()
    @IsNotEmpty()
    message!: string;

    @IsUUID()
    @IsOptional()
    conversationId?: string;
}
