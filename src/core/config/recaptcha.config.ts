import { registerAs } from '@nestjs/config';

export default registerAs('recaptcha', () => ({
    secret: process.env.RECAPTCHA_SECRET_KEY ?? '',
    scoreThreshold: Number(process.env.RECAPTCHA_SCORE_THRESHOLD ?? '0.6'),
}));
