import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/infra/prisma/prisma.service';
import { DecksService } from './decks.service';
import { DecksController } from './rest/decks.controller';

@Module({
  controllers: [DecksController],
  providers: [PrismaService, DecksService],
})
export class DecksModule {}
