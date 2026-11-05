import { Link } from '../link.entity.js';

export const buildLink = (overrides: Partial<Link> = {}): Link => ({
  id: 1,
  code: 'qwertyui',
  url: 'https://example.com',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  clicks: 0,
  expiresAt: null,
  ...overrides,
});

export const links: Link[] = [
  buildLink({
    id: 1,
    code: 'qwertyui',
    url: 'https://example1.com',
    clicks: 10,
  }),
  buildLink({
    id: 2,
    code: 'asdfghjk',
    url: 'https://example2.com',
    createdAt: new Date('2026-01-02T00:00:00Z'),
    expiresAt: new Date('2026-01-10T00:00:00Z'),
  }),
];
