import {
    Body,
    Controller,
    Get,
    Post,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('signup')
    async signup(@Body() dto: SignupDto) {
        return this.authService.signup(dto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMe(@Req() req) {
        return {
            message: 'Authenticated user',
            user: req.user,
        };
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    logout() {
        return {
            message: 'Logout performed successfully. Please discard your token.',
        };
    }
}
