import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/infra/prisma/prisma.service';
import { IdentityProvider } from '@prisma/client';

export type CreateUserInput = {
  email: string;
  passwordHash?: string | null;
};

export type LinkExternalIdentityInput = {
  userId: string;
  provider: IdentityProvider;
  providerUserId: string;
  email: string;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateUserInput) {
    return this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash ?? null,
      },
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findByExternalIdentity(provider: IdentityProvider, providerUserId: string) {
    return this.prisma.user.findFirst({
      where: {
        externalIdentities: {
          some: {
            provider,
            providerUserId,
          },
        },
      },
    });
  }

  linkExternalIdentity(input: LinkExternalIdentityInput) {
    return this.prisma.externalIdentity.upsert({
      where: {
        provider_providerUserId: {
          provider: input.provider,
          providerUserId: input.providerUserId,
        },
      },
      update: {
        email: input.email,
      },
      create: {
        userId: input.userId,
        provider: input.provider,
        providerUserId: input.providerUserId,
        email: input.email,
      },
    });
  }
}
