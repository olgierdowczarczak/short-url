import { Module } from '@nestjs/common';
import { RedirectController } from './redirect.controller.js';
import { LinksModule } from '../links/links.module.js';

@Module({
  imports: [LinksModule],
  controllers: [RedirectController],
})
export class RedirectModule {}
