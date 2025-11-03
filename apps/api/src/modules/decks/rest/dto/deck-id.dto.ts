import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const cuidRegex = /^c[a-z0-9]{24}$/i;
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const deckIdParamSchema = z.object({
  id: z
    .string()
    .refine((value) => cuidRegex.test(value) || uuidRegex.test(value), {
      message: 'id must be a valid cuid or uuid',
    }),
});

export class DeckIdParamDto extends createZodDto(deckIdParamSchema) {}
