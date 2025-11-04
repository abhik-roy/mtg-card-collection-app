import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { Response, Request } from 'express';
import { clearCookie, setSessionCookie, setTemporaryCookie } from './utils/cookie.util';

@Controller('auth')
export class AuthController {
  private readonly frontendRedirect: string;

  constructor(private readonly authService: AuthService, private readonly config: ConfigService) {
    const origins = this.config.get<string>('ALLOWED_ORIGINS');
    this.frontendRedirect = origins ? origins.split(',').map((origin) => origin.trim()).filter(Boolean)[0] ?? 'http://localhost:5173' : 'http://localhost:5173';
  }

  @Post('register')
  async register(@Body() payload: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const auth = await this.authService.register(payload);
    const sessionToken = this.authService.createSessionToken(auth);
    setSessionCookie(res, sessionToken);
    return auth;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() payload: LoginDto, @Res({ passthrough: true }) res: Response) {
    const auth = await this.authService.login(payload);
    const sessionToken = this.authService.createSessionToken(auth);
    setSessionCookie(res, sessionToken);
    return auth;
  }

  @Get('google')
  async beginGoogle(@Res() res: Response) {
    return this.beginOAuth('google', res);
  }

  @Get('discord')
  async beginDiscord(@Res() res: Response) {
    return this.beginOAuth('discord', res);
  }

  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Query('code') code: string | undefined, @Query('state') state: string | undefined, @Res() res: Response) {
    return this.handleOAuthCallback('google', req, res, code, state);
  }

  @Get('discord/callback')
  async discordCallback(@Req() req: Request, @Query('code') code: string | undefined, @Query('state') state: string | undefined, @Res() res: Response) {
    return this.handleOAuthCallback('discord', req, res, code, state);
  }

  @Get('me')
  async me(@Req() req: Request) {
    const session = this.authService.decodeSessionToken(req.cookies?.sid);
    if (!session) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      user: {
        id: session.sub,
        email: session.email,
        name: session.name ?? null,
        picture: session.picture ?? null,
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Res({ passthrough: true }) res: Response) {
    clearCookie(res, 'sid');
    clearCookie(res, 'oauth_state');
    clearCookie(res, 'oauth_verifier');
    clearCookie(res, 'oauth_provider');
    return;
  }

  private beginOAuth(provider: 'google' | 'discord', res: Response) {
    const { url, state, verifier } =
      provider === 'google' ? this.authService.buildGoogleAuthUrl() : this.authService.buildDiscordAuthUrl();
    setTemporaryCookie(res, 'oauth_state', state);
    setTemporaryCookie(res, 'oauth_verifier', verifier);
    setTemporaryCookie(res, 'oauth_provider', provider);
    return res.redirect(url);
  }

  private async handleOAuthCallback(
    provider: 'google' | 'discord',
    req: Request,
    res: Response,
    code?: string,
    state?: string,
  ) {
    if (!code || !state) {
      return res.status(400).send('Missing authorization code or state');
    }

    const cookies = req.cookies ?? {};
    if (!cookies.oauth_state || cookies.oauth_state !== state || cookies.oauth_provider !== provider) {
      clearCookie(res, 'oauth_state');
      clearCookie(res, 'oauth_verifier');
      clearCookie(res, 'oauth_provider');
      return res.status(400).send('STATE_MISMATCH');
    }

    try {
      const auth =
        provider === 'google'
          ? await this.authService.completeGoogleCallback(code, cookies.oauth_verifier)
          : await this.authService.completeDiscordCallback(code, cookies.oauth_verifier);
      const sessionToken = this.authService.createSessionToken(auth);
      clearCookie(res, 'oauth_state');
      clearCookie(res, 'oauth_verifier');
      clearCookie(res, 'oauth_provider');
      setSessionCookie(res, sessionToken);
      return res.redirect(this.frontendRedirect);
    } catch (error) {
      clearCookie(res, 'oauth_state');
      clearCookie(res, 'oauth_verifier');
      clearCookie(res, 'oauth_provider');
      return res.status(400).send('OAuth authentication failed');
    }
  }
}
