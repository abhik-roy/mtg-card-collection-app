import { z } from 'zod';

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    SCRYFALL_CACHE_TTL_MS: z.coerce.number().default(300_000),
    PORT: z.coerce.number().default(8080),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_SECURE: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((value) => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return value === 'true' || value === '1';
        }
        return false;
      }),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),
    DISCORD_WEBHOOK_URL: z
      .string()
      .url('DISCORD_WEBHOOK_URL must be a valid URL')
      .optional(),
    ALLOWED_ORIGINS: z.string().optional(),
    RATE_LIMIT_TTL: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
    JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
    JWT_EXPIRES_IN: z.string().default('1h'),
    BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
  })
  .superRefine((data, ctx) => {
    const smtpValues = [data.SMTP_HOST, data.SMTP_PORT, data.SMTP_USER, data.SMTP_PASS, data.SMTP_FROM];
    const provided = smtpValues.some((value) => value !== undefined && value !== '');
    if (provided) {
      if (!data.SMTP_HOST) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SMTP_HOST'],
          message: 'SMTP_HOST is required when configuring email notifications',
        });
      }
      if (!data.SMTP_PORT) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SMTP_PORT'],
          message: 'SMTP_PORT is required when configuring email notifications',
        });
      }
      if (!data.SMTP_USER) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SMTP_USER'],
          message: 'SMTP_USER is required when configuring email notifications',
        });
      }
      if (!data.SMTP_PASS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SMTP_PASS'],
          message: 'SMTP_PASS is required when configuring email notifications',
        });
      }
      if (!data.SMTP_FROM) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SMTP_FROM'],
          message: 'SMTP_FROM is required when configuring email notifications',
        });
      }
    }
  });

export type EnvConfig = z.infer<typeof envSchema>;

export const EnvValidation = (config: Record<string, unknown>): EnvConfig => {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(
      `Invalid environment variables: ${result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ')}`,
    );
  }

  return result.data;
};
