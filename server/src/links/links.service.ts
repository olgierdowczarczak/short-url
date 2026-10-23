import { randomBytes } from 'node:crypto';
import { Repository, QueryFailedError } from 'typeorm';
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Link } from './link.entity.js';

@Injectable()
export class LinksService {
  constructor(
    @InjectRepository(Link)
    private readonly linksRepository: Repository<Link>,
  ) {}

  async create(url: string): Promise<Link> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const link = this.linksRepository.create({
        code: randomBytes(6).toString('base64url'),
        url,
      });

      try {
        return await this.linksRepository.save(link);
      } catch (error) {
        if (
          error instanceof QueryFailedError &&
          error.driverError.code === '23505'
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new InternalServerErrorException('Failed to create link');
  }

  async findAll(): Promise<Link[]> {
    return this.linksRepository.find();
  }

  async findByCode(code: string): Promise<Link> {
    const link = await this.linksRepository.findOneBy({ code });
    if (!link) {
      throw new NotFoundException(`Link with code ${code} not found`);
    }
    return link;
  }
}
