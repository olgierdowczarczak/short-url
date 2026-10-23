import { Module } from '@nestjs/common';
import { LinksService } from './links.service.js';
import { LinksController } from './links.controller.js';
import { RedirectController } from './redirect.controller.js';

@Module({
  providers: [LinksService],
  controllers: [LinksController, RedirectController],
})
export class LinksModule {}
