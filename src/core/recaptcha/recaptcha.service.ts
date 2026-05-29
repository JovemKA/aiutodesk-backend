import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface RecaptchaVerifyResult {
    success: boolean;
    score?: number;
    action?: string;
    errorCodes?: string[];
}

@Injectable()
export class RecaptchaService {
    private readonly logger = new Logger(RecaptchaService.name);
    private readonly secretKey: string;
    private readonly scoreThreshold: number;
    private readonly verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';

    constructor(private readonly configService: ConfigService) {
        this.secretKey = this.configService.get<string>('recaptcha.secret') ?? '';
        this.scoreThreshold =
            this.configService.get<number>('recaptcha.scoreThreshold') ?? 0.6;

        if (!this.secretKey) {
            this.logger.warn(
                'RECAPTCHA_SECRET_KEY não configurada — verificação desativada.',
            );
        }
    }

    async verify(
        token: string,
        expectedAction?: string,
    ): Promise<RecaptchaVerifyResult> {
        if (!this.secretKey) {
            return { success: true };
        }

        if (!token) {
            return { success: false, errorCodes: ['missing-input-response'] };
        }

        const params = new URLSearchParams({
            secret: this.secretKey,
            response: token,
        });

        let json: any;
        try {
            const res = await fetch(this.verifyUrl, {
                method: 'POST',
                body: params,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            json = await res.json();
        } catch (err) {
            this.logger.error('Falha ao contactar API reCAPTCHA', err);
            return { success: false, errorCodes: ['network-error'] };
        }

        const result: RecaptchaVerifyResult = {
            success: json.success === true,
            errorCodes: json['error-codes'] ?? [],
        };

        if (json.score !== undefined) {
            result.score = json.score;
            result.action = json.action;

            if (result.score! < this.scoreThreshold) {
                this.logger.warn(
                    `reCAPTCHA score baixo: ${result.score} (threshold: ${this.scoreThreshold})`,
                );
                result.success = false;
            }

            this.logger.log(`reCAPTCHA score=${result.score} action=${result.action}`);

            if (expectedAction && json.action !== expectedAction) {
                this.logger.warn(
                    `reCAPTCHA action inválida: esperada "${expectedAction}", recebida "${json.action}"`,
                );
                result.success = false;
            }
        }

        if (!result.success) {
            this.logger.warn(
                `reCAPTCHA falhou: ${JSON.stringify(result.errorCodes)}`,
            );
        }

        return result;
    }
}
