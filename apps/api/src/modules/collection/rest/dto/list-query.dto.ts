import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const listCollectionQuerySchema = z.object({
  q: z.string().optional(),
  set: z
    .string()
    .optional()
    .transform((value) => value?.toUpperCase()),
  page: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 1))
    .pipe(z.number().int().min(1))
    .optional()
    .default(1),
  pageSize: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 24))
    .pipe(z.number().int().min(1).max(100))
    .optional()
    .default(24),
});

export class ListCollectionQueryDto extends createZodDto(listCollectionQuerySchema) {}
