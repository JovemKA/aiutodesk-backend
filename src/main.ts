import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'tenant-id', 'Accept', 'Cache-Control'],
    exposedHeaders: ['Content-Type', 'Cache-Control'],
    maxAge: 86400,
  });

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port, '0.0.0.0');
}

bootstrap();
