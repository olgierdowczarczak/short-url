import {
  Controller,
  Get,
  Redirect,
  Param,
  HttpStatus,
  type HttpRedirectResponse,
} from '@nestjs/common';
import { LinksService } from '../links/links.service.js';
import {
  ApiFoundResponse,
  ApiGoneResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';

@ApiTags('Redirect')
@Controller()
export class RedirectController {
  constructor(private readonly linksService: LinksService) {}

  @Get(':code')
  @Redirect()
  @ApiOperation({ summary: 'Redirect to the original URL' })
  @ApiFoundResponse({ description: 'Redirects to the original URL' })
  @ApiNotFoundResponse({ description: 'Link not found' })
  @ApiGoneResponse({ description: 'Link has expired' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async redirect(@Param('code') code: string): Promise<HttpRedirectResponse> {
    const link = await this.linksService.resolveRedirect(code);
    return { url: link.url, statusCode: HttpStatus.FOUND };
  }
}
