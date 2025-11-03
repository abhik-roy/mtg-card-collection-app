import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const finishEnum = z.enum(['NONFOIL', 'FOIL', 'ETCHED']);
const conditionEnum = z.enum(['NM', 'LP', 'MP', 'HP', 'DMG']);

export const updateCollectionEntrySchema = z
  .object({
    quantity: z.number().int().min(0).optional(),
    finish: finishEnum.optional(),
    condition: conditionEnum.optional(),
    language: z.string().min(2).max(5).optional(),
    acquiredPrice: z.number().positive().nullable().optional(),
    acquiredDate: z
      .string()
      .nullable()
      .optional()
      .refine((value) => !value || !Number.isNaN(Date.parse(value)), {
        message: 'acquiredDate must be an ISO date string',
      }),
    location: z.string().max(120).nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const collectionIdParamSchema = z.object({
  id: z.string().cuid({ message: 'id must be a valid cuid' }),
});

export class UpdateCollectionEntryDto extends createZodDto(updateCollectionEntrySchema) {}

export class CollectionIdParamDto extends createZodDto(collectionIdParamSchema) {}
