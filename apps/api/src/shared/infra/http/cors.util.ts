import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { Logger } from '@nestjs/common';

export type OriginMatcher = {
  raw: string;
  test: (origin: string) => boolean;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const stripQuotes = (value: string) => value.replace(/^['"]|['"]$/g, '');

export function buildOriginMatchers(
  rawOrigins: string | undefined | null,
  defaults: string[] = ['http://localhost:5173'],
): OriginMatcher[] {
  const entries = rawOrigins
    ? rawOrigins
        .split(',')
        .map((origin) => stripQuotes(origin.trim()))
        .filter(Boolean)
    : defaults;

  return entries.map<OriginMatcher>((entry) => {
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

export function isOriginAllowed(origin: string, matchers: OriginMatcher[]): boolean {
  return matchers.some((matcher) => {
    try {
      return matcher.test(origin);
    } catch (error) {
      Logger.warn(`Failed to evaluate CORS matcher "${matcher.raw}": ${(error as Error).message}`, 'CORS');
      return false;
    }
  });
}

type StaticOrigin = boolean | string | RegExp | (string | RegExp)[];
type OriginCallback = (err: Error | null, allow?: StaticOrigin) => void;

export function createCorsOrigin(matchers: OriginMatcher[]): CorsOptions['origin'] {
  const allowedForLog = matchers.map((matcher) => matcher.raw).join(', ') || 'none';

  return (origin: string | undefined, callback: OriginCallback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (isOriginAllowed(origin, matchers)) {
      Logger.debug(`CORS allowed origin "${origin}"`, 'CORS');
      return callback(null, true);
    }

    Logger.warn(`Blocked CORS origin "${origin}". Allowed origins: ${allowedForLog}`, 'CORS');
    return callback(null, false);
  };
}
