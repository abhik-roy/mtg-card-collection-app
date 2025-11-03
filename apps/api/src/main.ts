import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './shared/presentation/problem.filter';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');

  const allowedOrigins = config.get<string>('ALLOWED_ORIGINS');
  const originList = allowedOrigins
    ? allowedOrigins.split(',').map((origin) => origin.trim()).filter(Boolean)
    : ['http://localhost:5173'];

  app.enableCors({ origin: originList });
  app.use(helmet({ contentSecurityPolicy: false }));
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new ProblemDetailsFilter());

  const port = config.get<number>('PORT') ?? 8080;
  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}`, 'Bootstrap');
}

bootstrap();
