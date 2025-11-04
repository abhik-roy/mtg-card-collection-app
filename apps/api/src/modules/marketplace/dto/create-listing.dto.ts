import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createListingSchema = z.object({
  type: z.enum(['BUY', 'SELL']),
  cardName: z.string().min(1, 'cardName is required'),
  cardId: z.string().min(1).optional(),
  setCode: z.string().min(2).max(5).optional(),
  condition: z.string().max(20).optional(),
  quantity: z.number().int().min(1).max(999).default(1),
  price: z.number().nonnegative().optional(),
  currency: z.string().length(3).default('USD'),
  notes: z.string().max(500).optional(),
});

export class CreateListingDto extends createZodDto(createListingSchema) {}
