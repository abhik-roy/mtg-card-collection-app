import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './shared/presentation/problem.filter';
import helmet from 'helmet';
import cookieParser = require('cookie-parser');
import type { CorsOptionsDelegate } from '@nestjs/common/interfaces/external/cors-options.interface';

type OriginMatcher = {
  raw: string;
  test: (origin: string) => boolean;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildOriginMatchers(rawOrigins: string | undefined | null): OriginMatcher[] {
  const defaults = ['http://localhost:5173'];
  const stripQuotes = (value: string) => value.replace(/^['"]|['"]$/g, '');
  const entries = rawOrigins
    ? rawOrigins
        .split(',')
        .map((origin) => origin.trim())
        .map(stripQuotes)
        .filter(Boolean)
    : defaults;

  return entries.map((entry) => {
    if (entry === '*') {
      return {
        raw: entry,
        test: () => true,
      };
    }

    if (entry.startsWith('regex:')) {
      const pattern = entry.slice(6);
      const regex = new RegExp(pattern);
      return {
        raw: entry,
        test: (origin: string) => regex.test(origin),
      };
    }

    if (entry.includes('*')) {
      const regex = new RegExp(`^${entry.split('*').map(escapeRegex).join('.*')}$`);
      return {
        raw: entry,
        test: (origin: string) => regex.test(origin),
      };
    }

    if (!entry.startsWith('http://') && !entry.startsWith('https://')) {
      return {
        raw: entry,
        test: (origin: string) => origin === `https://${entry}` || origin === `http://${entry}`,
      };
    }

    return {
      raw: entry,
      test: (origin: string) => origin === entry,
    };
  });
}

function buildCorsDelegate(matchers: OriginMatcher[]): CorsOptionsDelegate {
  const allowedForLog = matchers.map((matcher) => matcher.raw).join(', ') || 'none';

  return (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    const allowed = matchers.some((matcher) => {
      try {
        return matcher.test(origin);
      } catch (error) {
        Logger.warn(`Failed to evaluate CORS matcher "${matcher.raw}": ${(error as Error).message}`, 'CORS');
        return false;
      }
    });

    if (allowed) {
      return callback(null, true);
    }

    Logger.warn(`Blocked CORS origin "${origin}". Allowed origins: ${allowedForLog}`, 'CORS');
    return callback(new Error(`Origin not allowed: ${origin}`), false);
  };
}

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
    origin: buildCorsDelegate(matchers),
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
