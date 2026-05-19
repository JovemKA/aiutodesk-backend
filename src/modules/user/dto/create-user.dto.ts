import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '@common/enums/user-role.enum';

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

    @IsEnum(UserRole, { message: 'Role inválida.' })
    @IsOptional()
    role?: UserRole;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
