import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { MapsService } from './maps.service';
import { RouteRequestDto } from './dto/maps.dto';

@Controller('events/:eventId')
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Post('routes')
  computeRoute(
    @Param('eventId') eventId: string,
    @Body() dto: RouteRequestDto,
  ) {
    return this.mapsService.computeRoute(eventId, dto);
  }

  @Get('qr/:vendorId')
  validateQr(
    @Param('eventId') eventId: string,
    @Param('vendorId') vendorId: string,
    @Query('sig') sig?: string,
  ) {
    return this.mapsService.validateQr(eventId, vendorId, sig);
  }
}
