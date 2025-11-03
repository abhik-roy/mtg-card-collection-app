import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const formatEnum = z.enum(['moxfield', 'csv']);

export const exportCollectionQuerySchema = z.object({
  format: formatEnum.default('csv'),
  q: z.string().optional(),
  set: z
    .string()
    .optional()
    .transform((value) => value?.toUpperCase()),
  includePrices: z
    .union([
      z.boolean(),
      z
        .string()
        .transform((value) => value === 'true' || value === '1')
        .optional(),
    ])
    .optional()
    .transform((value) => {
      if (typeof value === 'boolean') {
        return value;
      }
      return value ?? false;
    }),
});

export class ExportCollectionQueryDto extends createZodDto(exportCollectionQuerySchema) {}
