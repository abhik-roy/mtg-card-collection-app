import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Query is required'),
  page: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 1))
    .pipe(z.number().int().min(1).max(50))
    .optional()
    .default(1),
  pageSize: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 24))
    .pipe(z.number().int().min(1).max(175))
    .optional()
    .default(24),
});

export const catalogIdParamSchema = z.object({
  id: z.string().min(1, 'id is required'),
});

export class SearchCatalogDto extends createZodDto(searchQuerySchema) {}

export class CatalogIdParamDto extends createZodDto(catalogIdParamSchema) {}
