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

const cuidRegex = /^c[a-z0-9]{24}$/i;
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const collectionIdParamSchema = z.object({
  id: z
    .string()
    .refine((value) => cuidRegex.test(value) || uuidRegex.test(value), {
      message: 'id must be a valid cuid or uuid',
    }),
});

export class UpdateCollectionEntryDto extends createZodDto(updateCollectionEntrySchema) {}

export class CollectionIdParamDto extends createZodDto(collectionIdParamSchema) {}
