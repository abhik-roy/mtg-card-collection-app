import { z } from 'zod';

export const deckBoardEnum = z.enum(['MAIN', 'SIDE']);

export const deckCardSchema = z.object({
  cardId: z.string().min(1, 'cardId is required'),
  quantity: z.number().int().min(1, 'quantity must be at least 1'),
  board: deckBoardEnum.optional().default('MAIN'),
});

export type DeckCardInput = z.infer<typeof deckCardSchema>;
