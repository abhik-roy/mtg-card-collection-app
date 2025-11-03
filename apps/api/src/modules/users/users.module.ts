import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/infra/prisma/prisma.service';
import { UsersService } from './users.service';

@Module({
  providers: [PrismaService, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
