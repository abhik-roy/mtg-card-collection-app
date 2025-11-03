import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { deckCardSchema } from './deck-card.dto';

const updateDeckSchema = z
  .object({
    name: z.string().min(1).optional(),
    format: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    cards: z.array(deckCardSchema).min(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export class UpdateDeckDto extends createZodDto(updateDeckSchema) {}
