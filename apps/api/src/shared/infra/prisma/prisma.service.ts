import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { resolve } from 'path';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const url = normalizeDatabaseUrl(process.env.DATABASE_URL);
    super({ datasources: { db: { url } } });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

function normalizeDatabaseUrl(original?: string): string | undefined {
  if (!original) {
    return original;
  }

  if (!original.startsWith('file:')) {
    return original;
  }

  if (original.startsWith('file:./')) {
    const relative = original.replace('file:./', '');
    const absolutePath = resolve(process.cwd(), relative);
    return `file:${absolutePath}`;
  }

  if (original.startsWith('file:../')) {
    const relative = original.replace('file:', '');
    const absolutePath = resolve(process.cwd(), relative);
    return `file:${absolutePath}`;
  }

  return original;
}
