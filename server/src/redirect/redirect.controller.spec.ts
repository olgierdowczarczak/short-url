import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
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

  describe('redirect', () => {
    it('should return a 302 redirect to the original url', async () => {
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
  });
});
