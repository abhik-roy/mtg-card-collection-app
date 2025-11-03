import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const directionEnum = z.enum(['UP', 'DOWN']);
const priceTypeEnum = z.enum(['USD', 'USD_FOIL']);

export const createWatchSchema = z.object({
  cardId: z.string().min(1),
  direction: directionEnum.default('UP'),
  priceType: priceTypeEnum.default('USD'),
  thresholdPercent: z.number().positive(),
  contact: z.string().email().or(z.string().url()).or(z.string().min(1)),
});

export class CreateWatchDto extends createZodDto(createWatchSchema) {}
