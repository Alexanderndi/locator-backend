import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class AppController {
  @Get()
  health() {
    return {
      status: 'ok',
      service: 'festive-vendor-locator-api',
      version: '1.0.0',
    };
  }
}
