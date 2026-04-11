import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
    @IsString()
    @IsNotEmpty({ message: 'O nome é obrigatório.' })
    name: string;

    @IsEmail()
    @IsNotEmpty({ message: 'E-mail é obrigatório.' })
    email: string;

    @IsString()
    @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres.' })
    password: string;

    @IsString({ message: 'Role inválida.' })
    @IsOptional()
    role?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
