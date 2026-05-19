import { IsNotEmpty, IsString } from 'class-validator';

export class AskChatDto {
    @IsString()
    @IsNotEmpty()
    message!: string;
}
