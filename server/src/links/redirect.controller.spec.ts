import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, NotFoundException } from '@nestjs/common';
import { RedirectController } from './redirect.controller.js';
import { LinksService } from './links.service.js';
import { buildLink } from './testing/link.fixtures.js';

describe('RedirectController', () => {
  let controller: RedirectController;
  let linksService: {
    findByCode: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    linksService = {
      findByCode: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [{ provide: LinksService, useValue: linksService }],
      controllers: [RedirectController],
    }).compile();

    controller = module.get<RedirectController>(RedirectController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('redirect', () => {
    it('should return url and status code FOUND for existing link', async () => {
      const code = 'qwertyui';
      const link = buildLink({ code });
      const expectedResponse = { url: link.url, statusCode: HttpStatus.FOUND };
      linksService.findByCode.mockResolvedValue(link);

      const result = await controller.redirect(code);

      expect(result).toStrictEqual(expectedResponse);
      expect(linksService.findByCode).toHaveBeenCalledWith(code);
      expect(linksService.findByCode).toHaveBeenCalledOnce();
    });

    it('should propagate NotFoundException from service', async () => {
      const code = 'notfound';
      const notFoundError = new NotFoundException(
        `Link with code ${code} not found`,
      );
      linksService.findByCode.mockRejectedValue(notFoundError);

      const result = await controller.redirect(code).catch((error) => error);

      expect(result).toBe(notFoundError);
      expect(linksService.findByCode).toHaveBeenCalledWith(code);
      expect(linksService.findByCode).toHaveBeenCalledOnce();
    });
  });
});
