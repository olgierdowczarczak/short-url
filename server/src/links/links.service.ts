import { Injectable } from '@nestjs/common';
import { Link } from './links.interface.js';
import { randomBytes } from 'node:crypto';

@Injectable()
export class LinksService {
  private links: Map<string, Link> = new Map();

  create(url: string): Link {
    const newLink: Link = {
      code: randomBytes(6).toString('base64url'),
      url: url,
      createdAt: new Date(),
    };
    this.links.set(newLink.code, newLink);
    return newLink;
  }

  findAll(): Link[] {
    return Array.from(this.links.values());
  }

  findByCode(code: string): Link | undefined {
    return this.links.get(code);
  }

  // update

  // delete
}
