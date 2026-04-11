import { registerAs } from '@nestjs/config';

const parseOrigins = (value?: string): string[] =>
	(value ?? '')
		.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean);

export default registerAs('app', () => ({
	cors: {
		origins: parseOrigins(process.env.CORS_ORIGINS),
	},
}));
