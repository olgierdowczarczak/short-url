import {
  Controller,
  Get,
  Redirect,
  Param,
  HttpStatus,
  type HttpRedirectResponse,
} from '@nestjs/common';
import { LinksService } from '../links/links.service.js';

@Controller()
export class RedirectController {
  constructor(private readonly linksService: LinksService) {}

  @Get(':code')
  @Redirect()
  async redirect(@Param('code') code: string): Promise<HttpRedirectResponse> {
    const link = await this.linksService.findByCode(code);
    return { url: link.url, statusCode: HttpStatus.FOUND };
  }
}
