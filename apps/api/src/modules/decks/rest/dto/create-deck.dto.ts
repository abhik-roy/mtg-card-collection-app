import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { deckCardSchema } from './deck-card.dto';

const createDeckSchema = z.object({
  name: z.string().min(1),
  format: z.string().optional(),
  description: z.string().optional(),
  cards: z.array(deckCardSchema).min(1, 'Deck must include at least one card'),
});

export class CreateDeckDto extends createZodDto(createDeckSchema) {}
