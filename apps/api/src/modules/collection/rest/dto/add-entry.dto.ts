import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const finishEnum = z.enum(['NONFOIL', 'FOIL', 'ETCHED']);
const conditionEnum = z.enum(['NM', 'LP', 'MP', 'HP', 'DMG']);

export const addCollectionEntrySchema = z.object({
  cardId: z.string().min(1, 'cardId is required'),
  quantity: z.number().int().min(1, 'quantity must be at least 1'),
  finish: finishEnum,
  condition: conditionEnum,
  language: z.string().min(2).max(5).default('en'),
  acquiredPrice: z.number().positive().optional(),
  acquiredDate: z
    .string()
    .optional()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), {
      message: 'acquiredDate must be an ISO date string',
    }),
  location: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
});

export class AddCollectionEntryDto extends createZodDto(addCollectionEntrySchema) {}
