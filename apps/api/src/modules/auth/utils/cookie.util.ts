import type { Request, Response } from 'express';

const TEN_MINUTES = 10 * 60 * 1000;
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

const secureByDefault =
  process.env.NODE_ENV === 'production' ||
  process.env.COOKIE_SECURE === 'true' ||
  process.env.COOKIE_SECURE === '1';

type CookieSecurityOptions = {
  secure: boolean;
  sameSite: 'lax' | 'none';
};

function resolveCookieSecurity(res: Response, req?: Request): CookieSecurityOptions {
  const request = req ?? (res as Response & { req?: Request }).req;
  let secure = secureByDefault;

  if (secure && request) {
    const forwardedProtoHeader = request.headers['x-forwarded-proto'];
    const forwardedProto = Array.isArray(forwardedProtoHeader)
      ? forwardedProtoHeader[0]
      : forwardedProtoHeader;
    const isForwardedSecure =
      typeof forwardedProto === 'string' && forwardedProto.split(',')[0]?.trim() === 'https';

    const isRequestSecure = request.secure || isForwardedSecure;
    if (!isRequestSecure) {
      secure = false;
    }
  }

  const sameSite: 'lax' | 'none' = secure ? 'none' : 'lax';
  return { secure, sameSite };
}

export function setTemporaryCookie(res: Response, name: string, value: string, req?: Request) {
  const { secure, sameSite } = resolveCookieSecurity(res, req);
  res.cookie(name, value, {
    httpOnly: true,
    sameSite,
    secure,
    maxAge: TEN_MINUTES,
  });
}

export function clearCookie(res: Response, name: string, req?: Request) {
  const { secure, sameSite } = resolveCookieSecurity(res, req);
  res.clearCookie(name, {
    httpOnly: true,
    sameSite,
    secure,
  });
}

export function setSessionCookie(res: Response, token: string, req?: Request) {
  const { secure, sameSite } = resolveCookieSecurity(res, req);
  res.cookie('sid', token, {
    httpOnly: true,
    sameSite,
    secure,
    maxAge: ONE_WEEK,
  });
}
