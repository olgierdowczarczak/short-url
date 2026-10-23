import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LinksService } from './links.service.js';
import { LinksController } from './links.controller.js';
import { RedirectController } from './redirect.controller.js';
import { Link } from './link.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Link])],
  providers: [LinksService],
  controllers: [LinksController, RedirectController],
})
export class LinksModule {}
