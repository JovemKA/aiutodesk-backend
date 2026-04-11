import {
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { UserService } from '@modules/user/user.service';
import { HashService } from '@core/services/hash.service';
import { CreateUserDto } from '@modules/user/dto/create-user.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly hashService: HashService,
        private readonly jwtService: JwtService,
    ) {}

    async signup(dto: SignupDto) {
        const existing = await this.userService.findByEmail(dto.email);
        if (existing) {
            throw new ConflictException('Email already registered');
        }

        const user = await this.userService.createForAuth(dto as CreateUserDto);

        return {
            message: 'User created successfully',
            user: this.userService.safeUser(user),
        };
    }

    async validateUser(email: string, password: string) {
        const user = await this.userService.findByEmailWithPassword(email);
        if (!user) return null;

        const isValid = await this.hashService.compare(password, user.password);
        if (!isValid) return null;

        return user;
    }

    async login(dto: LoginDto) {
        const user = await this.validateUser(dto.email, dto.password);

        if (!user) {
            throw new UnauthorizedException('Invalid email or password');
        }

        const payload = {
            sub: user.id,
            email: user.email,
        };

        const token = await this.jwtService.signAsync(payload);

        return {
            access_token: token,
            user: this.userService.safeUser(user),
        };
    }
}
