import { SetMetadata } from '@nestjs/common';

export const RECAPTCHA_ACTION_KEY = 'recaptcha_action';

export const RecaptchaAction = (action: string) =>
    SetMetadata(RECAPTCHA_ACTION_KEY, action);
