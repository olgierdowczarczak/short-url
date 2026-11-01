import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { LinksService } from './links.service.js';
import { CreateLinkDto } from './dto/create-link.dto.js';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';
import { LinkResponseDto } from './dto/link-response.dto.js';

@Controller('links')
@SerializeOptions({ type: LinkResponseDto })
@UseGuards(ApiKeyGuard)
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Post()
  create(@Body() body: CreateLinkDto) {
    return this.linksService.create(body.url);
  }

  @Get()
  findAll() {
    return this.linksService.findAll();
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.linksService.findByCode(code);
  }
}
