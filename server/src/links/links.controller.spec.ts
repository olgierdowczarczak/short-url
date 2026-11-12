import { Test, TestingModule } from '@nestjs/testing';
import { LinksController } from './links.controller.js';
import { LinksService } from './links.service.js';
import { CreateLinkDto } from './dto/create-link.dto.js';
import { buildLink, links } from './testing/link.fixtures.js';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';

describe('LinksController', () => {
  let controller: LinksController;
  let linksService: {
    create: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    findByCode: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    linksService = {
      create: vi.fn(),
      findAll: vi.fn(),
      findByCode: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [{ provide: LinksService, useValue: linksService }],
      controllers: [LinksController],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LinksController>(LinksController);
  });

  describe('create', () => {
    const url = 'https://example.com';
    const createdLink = buildLink({ url });

    it('should delegate to LinksService.create and return the created link', async () => {
      const dto: CreateLinkDto = { url };
      linksService.create.mockResolvedValue(createdLink);

      const result = await controller.create(dto);

      expect(result).toBe(createdLink);
      expect(linksService.create).toHaveBeenCalledExactlyOnceWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all links from LinksService', async () => {
      linksService.findAll.mockResolvedValue(links);

      const result = await controller.findAll();

      expect(result).toBe(links);
      expect(linksService.findAll).toHaveBeenCalledExactlyOnceWith();
    });
  });

  describe('findOne', () => {
    it('should return the link with the given code', async () => {
      const code = 'qwertyui';
      linksService.findByCode.mockResolvedValue(links[0]);

      const result = await controller.findOne(code);

      expect(result).toBe(links[0]);
      expect(linksService.findByCode).toHaveBeenCalledExactlyOnceWith(code);
    });
  });
});
