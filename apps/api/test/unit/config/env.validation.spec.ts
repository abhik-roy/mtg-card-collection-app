import { EnvValidation } from '../../../src/config/env.validation';

describe('EnvValidation', () => {
  it('returns parsed configuration with defaults', () => {
    const result = EnvValidation({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/mtg',
      SCRYFALL_CACHE_TTL_MS: '1000',
      JWT_SECRET: 'test-secret',
    });

    expect(result.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/mtg');
    expect(result.SCRYFALL_CACHE_TTL_MS).toBe(1_000);
    expect(result.PORT).toBe(8080);
  });

  it('throws with descriptive message when required variables missing', () => {
    expect(() => EnvValidation({})).toThrow(/JWT_SECRET/);
  });

  it('requires complete SMTP configuration when any SMTP value provided', () => {
    expect(() =>
      EnvValidation({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/mtg',
        SMTP_HOST: 'smtp.example.com',
        JWT_SECRET: 'test-secret',
      }),
    ).toThrow(/SMTP_PORT is required/);
  });
});
