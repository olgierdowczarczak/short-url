import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LinksController } from './links.controller.js';
import { LinksService } from './links.service.js';
import { CreateLinkDto } from './dto/create-link.dto.js';
import { buildLink, links } from './testing/link.fixtures.js';

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
    }).compile();

    controller = module.get<LinksController>(LinksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const url = 'https://example.com';
    const createdLink = buildLink({ url });

    it('should pass url from dto to service and return created link', async () => {
      const dto: CreateLinkDto = { url };
      linksService.create.mockResolvedValue(createdLink);

      const result = await controller.create(dto);

      expect(result).toBe(createdLink);
      expect(linksService.create).toHaveBeenCalledWith(dto.url);
      expect(linksService.create).toHaveBeenCalledOnce();
    });
  });

  describe('findAll', () => {
    it('should return link list', async () => {
      linksService.findAll.mockResolvedValue(links);

      const result = await controller.findAll();

      expect(result).toBe(links);
      expect(linksService.findAll).toHaveBeenCalledWith();
      expect(linksService.findAll).toHaveBeenCalledOnce();
    });
  });

  describe('findOne', () => {
    it('should return searched link', async () => {
      const code = 'qwertyui';
      linksService.findByCode.mockResolvedValue(links[0]);

      const result = await controller.findOne(code);

      expect(result).toBe(links[0]);
      expect(linksService.findByCode).toHaveBeenCalledWith(code);
      expect(linksService.findByCode).toHaveBeenCalledOnce();
    });

    it('should propagate NotFoundException from service', async () => {
      const code = 'notfound';
      const notFoundError = new NotFoundException(
        `Link with code ${code} not found`,
      );
      linksService.findByCode.mockRejectedValue(notFoundError);

      const result = await controller.findOne(code).catch((error) => error);

      expect(result).toBe(notFoundError);
      expect(linksService.findByCode).toHaveBeenCalledWith(code);
      expect(linksService.findByCode).toHaveBeenCalledOnce();
    });
  });
});
