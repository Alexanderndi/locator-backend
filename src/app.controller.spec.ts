import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('returns the API health payload', () => {
      expect(appController.health()).toEqual({
        status: 'ok',
        service: 'festive-vendor-locator-api',
        version: '1.0.0',
      });
    });
  });
});
