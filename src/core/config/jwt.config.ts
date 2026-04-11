import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
    secret: process.env.JWT_SECRET,
    expire_in: process.env.JWT_EXPIRES_IN,
}));
