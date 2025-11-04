import { Controller, Get, Headers, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

@Controller('debug')
export class DebugController {
  @Get('headers')
  headers(@Headers() headers: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    res.setHeader('X-Debug', '1');
    return res.json({
      method: req.method,
      url: req.originalUrl,
      headers,
    });
  }

  @Get('cors-test')
  corsTest(@Res() res: Response) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.json({ ok: true });
  }
}
