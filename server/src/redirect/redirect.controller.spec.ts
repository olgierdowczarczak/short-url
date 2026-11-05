import { Test, TestingModule } from '@nestjs/testing';
import { GoneException, HttpStatus, NotFoundException } from '@nestjs/common';
import { RedirectController } from './redirect.controller.js';
import { LinksService } from '../links/links.service.js';
import { buildLink } from '../links/testing/link.fixtures.js';

describe('RedirectController', () => {
  let controller: RedirectController;
  let linksService: {
    resolveRedirect: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    linksService = {
      resolveRedirect: vi.fn(),
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
      linksService.resolveRedirect.mockResolvedValue(link);

      const result = await controller.redirect(code);

      expect(result).toStrictEqual(expectedResponse);
      expect(linksService.resolveRedirect).toHaveBeenCalledExactlyOnceWith(
        code,
      );
    });

    it('should propagate NotFoundException from service', async () => {
      const code = 'notfound';
      const notFoundError = new NotFoundException(
        `Link with code ${code} not found`,
      );
      linksService.resolveRedirect.mockRejectedValue(notFoundError);

      const result = await controller.redirect(code).catch((error) => error);

      expect(result).toBe(notFoundError);
      expect(linksService.resolveRedirect).toHaveBeenCalledExactlyOnceWith(
        code,
      );
    });

    it('should propagate GoneException from service', async () => {
      const code = 'expired1';
      const goneError = new GoneException(`Link with code ${code} has expired`);
      linksService.resolveRedirect.mockRejectedValue(goneError);

      const result = await controller.redirect(code).catch((error) => error);

      expect(result).toBe(goneError);
      expect(linksService.resolveRedirect).toHaveBeenCalledExactlyOnceWith(
        code,
      );
    });
  });
});
