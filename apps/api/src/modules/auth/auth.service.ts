import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import type { User } from '@prisma/client';

export type RegisterInput = {
  email: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthTokenPayload = {
  sub: string;
  email: string;
};

export type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const existing = await this.usersService.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const saltRounds = this.config.get<number>('BCRYPT_SALT_ROUNDS') ?? 10;
    const passwordHash = await bcrypt.hash(input.password, saltRounds);

    const user = await this.usersService.create({
      email: input.email,
      passwordHash,
    });

    return this.issueTokens(user);
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user);
  }

  validateUser(userId: string): Promise<User | null> {
    return this.usersService.findById(userId);
  }

  private async issueTokens(user: User): Promise<AuthResponse> {
    const payload: AuthTokenPayload = {
      sub: user.id,
      email: user.email,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }
}
