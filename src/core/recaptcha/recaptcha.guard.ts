import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RecaptchaService } from './recaptcha.service';
import { RECAPTCHA_ACTION_KEY } from './recaptcha.decorator';

@Injectable()
export class RecaptchaGuard implements CanActivate {
    constructor(
        private readonly recaptchaService: RecaptchaService,
        private readonly reflector: Reflector,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        const expectedAction = this.reflector.get<string>(
            RECAPTCHA_ACTION_KEY,
            context.getHandler(),
        );

        const token: string =
            request.body?.recaptchaToken ||
            request.headers['x-recaptcha-token'] ||
            '';

        const result = await this.recaptchaService.verify(token, expectedAction);

        if (!result.success) {
            throw new ForbiddenException(
                'Verificação reCAPTCHA falhou. Tente novamente.',
            );
        }

        return true;
    }
}
