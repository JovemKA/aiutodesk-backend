import { IsEmail, IsString, MinLength } from 'class-validator';

export class SignupDto {
    @IsString()
    name: string;

    @IsEmail()
    email: string;

    @MinLength(6)
    password: string;
}
