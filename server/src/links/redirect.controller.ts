import {
  Controller,
  Get,
  Redirect,
  Param,
  HttpStatus,
  type HttpRedirectResponse,
} from '@nestjs/common';
import { LinksService } from './links.service.js';

@Controller()
export class RedirectController {
  constructor(private readonly linksService: LinksService) {}

  @Get(':code')
  @Redirect()
  redirect(@Param('code') code: string): HttpRedirectResponse {
    const link = this.linksService.findByCode(code);
    return { url: link.url, statusCode: HttpStatus.FOUND };
  }
}
