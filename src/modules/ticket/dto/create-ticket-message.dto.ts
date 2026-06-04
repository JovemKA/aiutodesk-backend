import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTicketMessageDto {
    @IsString()
    @IsNotEmpty({ message: 'O corpo da mensagem é obrigatório.' })
    body!: string;

    @IsOptional()
    @IsBoolean()
    internalNote?: boolean;
}
