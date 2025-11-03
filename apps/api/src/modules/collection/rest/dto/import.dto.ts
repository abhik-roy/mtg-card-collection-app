import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const formatEnum = z.enum(['auto', 'moxfield', 'plain']);

export const importCollectionSchema = z.object({
  payload: z.string().min(1, 'payload is required'),
  format: formatEnum.optional().default('auto'),
});

export class ImportCollectionDto extends createZodDto(importCollectionSchema) {}
