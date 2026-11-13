import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  SerializeOptions,
} from '@nestjs/common';
import { LinksService } from './links.service.js';
import { CreateLinkDto } from './dto/create-link.dto.js';
import { LinkResponseDto } from './dto/link-response.dto.js';
import { minutes, Throttle } from '@nestjs/throttler';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Links')
@ApiSecurity('api-key')
@ApiUnauthorizedResponse({ description: 'Invalid API key' })
@ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
@Controller('links')
@SerializeOptions({ type: LinkResponseDto })
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: minutes(1) } })
  @ApiOperation({ summary: 'Create a short link' })
  @ApiCreatedResponse({ type: LinkResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({ description: 'Alias is already taken' })
  create(@Body() body: CreateLinkDto) {
    return this.linksService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'List all links' })
  @ApiOkResponse({ type: [LinkResponseDto] })
  findAll() {
    return this.linksService.findAll();
  }

  @Get(':code')
  @ApiOperation({ summary: 'Get a link by code' })
  @ApiOkResponse({ type: LinkResponseDto })
  @ApiNotFoundResponse({ description: 'Link not found' })
  findOne(@Param('code') code: string) {
    return this.linksService.findByCode(code);
  }
}
