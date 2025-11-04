import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const listingsQuerySchema = z.object({
  type: z.enum(['BUY', 'SELL']).optional(),
  search: z.string().max(120).optional(),
  setCode: z.string().max(5).optional(),
  mine: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  page: z
    .string()
    .optional()
    .transform((value) => (value ? Number.parseInt(value, 10) : 1))
    .refine((value) => Number.isInteger(value) && value > 0, 'page must be a positive integer')
    .default(1),
  pageSize: z
    .string()
    .optional()
    .transform((value) => (value ? Number.parseInt(value, 10) : 20))
    .refine((value) => Number.isInteger(value) && value > 0 && value <= 100, 'pageSize must be between 1 and 100')
    .default(20),
});

export class ListingsQueryDto extends createZodDto(listingsQuerySchema) {}
