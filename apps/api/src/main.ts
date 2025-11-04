import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './shared/presentation/problem.filter';
import helmet from 'helmet';
import cookieParser = require('cookie-parser');
import { buildOriginMatchers, isOriginAllowed } from './shared/infra/http/cors.util';
import type { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Trust Railway's proxy so secure cookies/SameSite=None survive.
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);
  app.setGlobalPrefix('api');
  app.use(cookieParser());

  // Lightweight request/response header logging to diagnose prod CORS.
  app.use((req: Request, res: Response, next: NextFunction) => {
    Logger.debug(
      {
        origin: req.headers.origin,
        referer: req.headers.referer,
        host: req.headers.host,
        xForwardedProto: req.headers['x-forwarded-proto'],
        xForwardedFor: req.headers['x-forwarded-for'],
      },
      `[REQ] ${req.method} ${req.originalUrl}`,
    );

    const originalSetHeader = res.setHeader.bind(res);
    res.setHeader = (key: string, value: unknown) => {
      const lower = key.toLowerCase();
      if (lower === 'access-control-allow-origin' || lower === 'set-cookie') {
        Logger.debug(value, `[RES-HDR] ${key}`);
      }
      return originalSetHeader(key, value);
    };

    next();
  });

  const debugCors = config.get<string>('DEBUG_CORS') === '1';
  const matchers = buildOriginMatchers(config.get<string>('ALLOWED_ORIGINS'));

  Logger.log(
    `CORS allowed origins: ${
      debugCors ? 'DEBUG_CORS_ANY' : matchers.map((matcher) => matcher.raw).join(', ') || 'none (defaults)'
    }`,
    'CORS',
  );
  if (debugCors) {
    Logger.warn('DEBUG_CORS enabled: allowing all origins with credentials.', 'CORS');
  }

  app.enableCors({
    origin: (origin, callback) => {
      const allowed = !origin || debugCors || isOriginAllowed(origin, matchers);
      if (allowed) {
        callback(null, origin ?? true);
      } else {
        Logger.warn(`CORS blocked origin "${origin}"`, 'CORS');
        callback(new Error(`Origin not allowed: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400,
  });

  app.use(helmet({ contentSecurityPolicy: false }));
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new ProblemDetailsFilter());

  const port = config.get<number>('PORT') ?? 8080;
  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}`, 'Bootstrap');
}

bootstrap();
