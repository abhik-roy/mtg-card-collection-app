import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/infra/prisma/prisma.service';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { CollectionModule } from '../collection/collection.module';

@Module({
  imports: [CollectionModule],
  controllers: [PortfolioController],
  providers: [PrismaService, PortfolioService],
})
export class PortfolioModule {}
