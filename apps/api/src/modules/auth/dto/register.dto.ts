import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export class RegisterDto extends createZodDto(registerSchema) {}
