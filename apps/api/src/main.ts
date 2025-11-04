import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './shared/presentation/problem.filter';
import helmet from 'helmet';
import cookieParser = require('cookie-parser');
import { buildOriginMatchers, createCorsOrigin } from './shared/infra/http/cors.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');

  const matchers = buildOriginMatchers(config.get<string>('ALLOWED_ORIGINS'));
  Logger.log(
    `CORS allowed origins: ${matchers.map((matcher) => matcher.raw).join(', ') || 'none (using defaults)'}`,
    'CORS',
  );
  app.enableCors({
    origin: createCorsOrigin(matchers),
    credentials: true,
  });
  app.use(cookieParser());
  app.use(helmet({ contentSecurityPolicy: false }));
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new ProblemDetailsFilter());

  const port = config.get<number>('PORT') ?? 8080;
  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}`, 'Bootstrap');
}

bootstrap();
