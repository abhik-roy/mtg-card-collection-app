import type { Request, Response } from 'express';

function createResponseMock(requestOverrides: Partial<Request> = {}) {
  const req = {
    secure: false,
    headers: {},
    ...requestOverrides,
  } as Request;

  const res = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    req,
  } as unknown as Response & {
    cookie: jest.Mock;
    clearCookie: jest.Mock;
    req: Request;
  };

  return { res, req };
}

describe('cookie util security options', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('defaults to lax + insecure cookies in development', async () => {
    process.env.NODE_ENV = 'development';
    const { res } = createResponseMock();

    const { setTemporaryCookie } = await import('../../../src/modules/auth/utils/cookie.util');
    setTemporaryCookie(res, 'oauth_state', 'state');

    expect(res.cookie).toHaveBeenCalledWith(
      'oauth_state',
      'state',
      expect.objectContaining({
        secure: false,
        sameSite: 'lax',
      }),
    );
  });

  it('honours secure cookies when request is forwarded as https', async () => {
    process.env.NODE_ENV = 'production';
    const { res } = createResponseMock({
      headers: {
        'x-forwarded-proto': 'https',
      },
    });

    const { setSessionCookie } = await import('../../../src/modules/auth/utils/cookie.util');
    setSessionCookie(res, 'token');

    expect(res.cookie).toHaveBeenCalledWith(
      'sid',
      'token',
      expect.objectContaining({
        secure: true,
        sameSite: 'none',
      }),
    );
  });

  it('falls back to insecure cookies when request is not https despite secure env', async () => {
    process.env.NODE_ENV = 'production';
    const { res } = createResponseMock({
      secure: false,
      headers: {},
    });

    const { setTemporaryCookie } = await import('../../../src/modules/auth/utils/cookie.util');
    setTemporaryCookie(res, 'oauth_state', 'state');

    expect(res.cookie).toHaveBeenCalledWith(
      'oauth_state',
      'state',
      expect.objectContaining({
        secure: false,
        sameSite: 'lax',
      }),
    );
  });
});
