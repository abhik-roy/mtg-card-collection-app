import { ConflictException, Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { IdentityProvider, type User } from '@prisma/client';
import { request } from 'undici';
import { createPkcePair, randomString } from './utils/pkce.util';

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
    name?: string | null;
    picture?: string | null;
  };
};

type SessionPayload = {
  sub: string;
  email: string;
  name?: string | null;
  picture?: string | null;
};

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

const DISCORD_AUTH_URL = 'https://discord.com/api/oauth2/authorize';
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_USERINFO_URL = 'https://discord.com/api/users/@me';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
  }

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
    if (!user.passwordHash) {
      throw new UnauthorizedException('Account requires single sign-on');
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

  buildGoogleAuthUrl() {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI');
    if (!clientId || !redirectUri) {
      throw new InternalServerErrorException('Google OAuth is not configured');
    }
    const state = randomString(16);
    const { verifier, challenge, method } = createPkcePair();
    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', method);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    return { url: url.toString(), state, verifier };
  }

  buildDiscordAuthUrl() {
    const clientId = this.config.get<string>('DISCORD_CLIENT_ID');
    const redirectUri = this.config.get<string>('DISCORD_REDIRECT_URI');
    if (!clientId || !redirectUri) {
      throw new InternalServerErrorException('Discord OAuth is not configured');
    }

    const state = randomString(16);
    const { verifier, challenge, method } = createPkcePair();
    const url = new URL(DISCORD_AUTH_URL);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'identify email');
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', method);

    return { url: url.toString(), state, verifier };
  }

  async completeGoogleCallback(code: string, verifier: string) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI');
    if (!clientId || !clientSecret || !redirectUri) {
      throw new InternalServerErrorException('Google OAuth is not configured');
    }
    if (!verifier) {
      throw new BadRequestException('Missing PKCE verifier');
    }

    const tokenResponse = await request(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
        code_verifier: verifier,
      }).toString(),
    });

    if (tokenResponse.statusCode >= 400) {
      throw new UnauthorizedException('Failed to exchange Google authorization code');
    }

    const tokenPayload = (await tokenResponse.body.json()) as {
      access_token?: string;
      refresh_token?: string;
      id_token?: string;
      token_type?: string;
      expires_in?: number;
    };
    const accessToken: string | undefined = tokenPayload.access_token;
    if (!accessToken) {
      throw new UnauthorizedException('Google token exchange did not return an access token');
    }

    const userInfoResponse = await request(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (userInfoResponse.statusCode >= 400) {
      throw new UnauthorizedException('Failed to fetch Google user profile');
    }

    const profile = (await userInfoResponse.body.json()) as {
      sub: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };

    if (!profile.email || profile.email_verified !== true) {
      throw new UnauthorizedException('Google account email is not verified');
    }

    const providerUserId = profile.sub as string;
    let user = await this.usersService.findByExternalIdentity(IdentityProvider.GOOGLE, providerUserId);
    if (!user) {
      user = await this.usersService.findByEmail(profile.email);
      if (!user) {
        user = await this.usersService.create({
          email: profile.email,
          passwordHash: null,
        });
      }

      await this.usersService.linkExternalIdentity({
        userId: user.id,
        provider: IdentityProvider.GOOGLE,
        providerUserId,
        email: profile.email,
      });
    }

    return this.issueTokens(user, {
      name: profile.name ?? undefined,
      picture: profile.picture ?? undefined,
    });
  }

  async completeDiscordCallback(code: string, verifier: string) {
    const clientId = this.config.get<string>('DISCORD_CLIENT_ID');
    const clientSecret = this.config.get<string>('DISCORD_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('DISCORD_REDIRECT_URI');
    if (!clientId || !clientSecret || !redirectUri) {
      throw new InternalServerErrorException('Discord OAuth is not configured');
    }
    if (!verifier) {
      throw new BadRequestException('Missing PKCE verifier');
    }

    const tokenResponse = await request(DISCORD_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
        code_verifier: verifier,
      }).toString(),
    });

    if (tokenResponse.statusCode >= 400) {
      throw new UnauthorizedException('Failed to exchange Discord authorization code');
    }

    const tokenPayload = (await tokenResponse.body.json()) as {
      access_token?: string;
      token_type?: string;
      expires_in?: number;
      scope?: string;
    };

    const accessToken = tokenPayload.access_token;
    if (!accessToken) {
      throw new UnauthorizedException('Discord token exchange did not return an access token');
    }

    const userInfoResponse = await request(DISCORD_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (userInfoResponse.statusCode >= 400) {
      throw new UnauthorizedException('Failed to fetch Discord user profile');
    }

    const profile = (await userInfoResponse.body.json()) as {
      id: string;
      email?: string | null;
      verified?: boolean;
      username?: string;
      global_name?: string | null;
      avatar?: string | null;
    };

    if (!profile.email || profile.verified !== true) {
      throw new UnauthorizedException('Discord account email is not verified');
    }

    const providerUserId = profile.id;
    let user = await this.usersService.findByExternalIdentity(IdentityProvider.DISCORD, providerUserId);
    if (!user) {
      user = await this.usersService.findByEmail(profile.email);
      if (!user) {
        user = await this.usersService.create({
          email: profile.email,
          passwordHash: null,
        });
      }

      await this.usersService.linkExternalIdentity({
        userId: user.id,
        provider: IdentityProvider.DISCORD,
        providerUserId,
        email: profile.email,
      });
    }

    const name = profile.global_name ?? profile.username ?? null;
    const picture = profile.avatar
      ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
      : null;

    return this.issueTokens(user, {
      name: name ?? undefined,
      picture: picture ?? undefined,
    });
  }

  createSessionToken(auth: AuthResponse): string {
    const payload: SessionPayload = {
      sub: auth.user.id,
      email: auth.user.email,
      name: auth.user.name ?? null,
      picture: auth.user.picture ?? null,
    };
    return this.jwtService.sign(payload, { expiresIn: '7d' });
  }

  decodeSessionToken(token: string | undefined): SessionPayload | null {
    if (!token) return null;
    try {
      return this.jwtService.verify<SessionPayload>(token);
    } catch {
      return null;
    }
  }

  private async issueTokens(user: User, overrides?: { name?: string; picture?: string }): Promise<AuthResponse> {
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
        name: overrides?.name ?? null,
        picture: overrides?.picture ?? null,
      },
    };
  }
}
