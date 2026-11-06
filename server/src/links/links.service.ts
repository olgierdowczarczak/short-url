import { randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  GoneException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Link } from './link.entity.js';
import { CreateLinkDto } from './dto/create-link.dto.js';
import { isUniqueViolation } from '../utils/is-unique-violation.js';

@Injectable()
export class LinksService {
  constructor(
    @InjectRepository(Link)
    private readonly linksRepository: Repository<Link>,
  ) {}

  private createLink(dto: CreateLinkDto, code: string): Link {
    return this.linksRepository.create({
      code,
      url: dto.url,
      expiresAt: dto.expiresAt,
    });
  }

  private async createLinkWithAlias(
    dto: CreateLinkDto,
    alias: string,
  ): Promise<Link> {
    const link = this.createLink(dto, alias);
    try {
      return await this.linksRepository.save(link);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`Alias ${alias} is already taken`);
      } else {
        throw error;
      }
    }
  }

  private async createLinkWithCode(dto: CreateLinkDto): Promise<Link> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const link = this.createLink(dto, randomBytes(6).toString('base64url'));
      try {
        return await this.linksRepository.save(link);
      } catch (error) {
        if (isUniqueViolation(error)) {
          continue;
        }
        throw error;
      }
    }
    throw new InternalServerErrorException('Failed to create link');
  }

  async create(dto: CreateLinkDto): Promise<Link> {
    if (dto.alias) {
      return await this.createLinkWithAlias(dto, dto.alias);
    } else {
      return await this.createLinkWithCode(dto);
    }
  }

  async findAll(): Promise<Link[]> {
    return this.linksRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findByCode(code: string): Promise<Link> {
    const link = await this.linksRepository.findOneBy({ code });
    if (!link) {
      throw new NotFoundException(`Link with code ${code} not found`);
    }
    return link;
  }

  private async incrementClicks(code: string): Promise<void> {
    await this.linksRepository.increment({ code }, 'clicks', 1);
  }

  async resolveRedirect(code: string): Promise<Link> {
    const link = await this.findByCode(code);
    if (link.expiresAt && link.expiresAt <= new Date()) {
      throw new GoneException(`Link with code ${code} has expired`);
    }
    await this.incrementClicks(code);
    return link;
  }
}
