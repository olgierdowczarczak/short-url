import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { LinksService } from './links.service.js';
import { CreateLinkDto } from './dto/create-link.dto.js';

@Controller('links')
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
