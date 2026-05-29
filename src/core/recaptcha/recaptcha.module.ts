import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RecaptchaService } from './recaptcha.service';
import { RecaptchaGuard } from './recaptcha.guard';

@Module({
    imports: [ConfigModule],
    providers: [RecaptchaService, RecaptchaGuard],
    exports: [RecaptchaService, RecaptchaGuard],
})
export class RecaptchaModule {}
