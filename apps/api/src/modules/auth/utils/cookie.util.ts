import type { Response } from 'express';

const TEN_MINUTES = 10 * 60 * 1000;
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

const secure =
  process.env.NODE_ENV === 'production' ||
  process.env.COOKIE_SECURE === 'true' ||
  process.env.COOKIE_SECURE === '1';

export function setTemporaryCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: TEN_MINUTES,
  });
}

export function clearCookie(res: Response, name: string) {
  res.clearCookie(name, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
  });
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie('sid', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: ONE_WEEK,
  });
}
