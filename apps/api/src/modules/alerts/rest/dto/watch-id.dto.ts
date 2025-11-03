import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const watchIdSchema = z.object({
  id: z
    .string()
    .refine(
      (value) => cuidRegex.test(value) || uuidRegex.test(value),
      'id must be a valid cuid or uuid',
    ),
});

const cuidRegex = /^c[a-z0-9]{24}$/i;
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class WatchIdParamDto extends createZodDto(watchIdSchema) {}
