import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { TrackEventDto, TrackEventsBatchDto, SearchAnalyticsQueryDto } from './dto/analytics.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('events')
  @UseGuards(OptionalJwtAuthGuard)
  track(@Body() dto: TrackEventDto, @CurrentUser() user?: User) {
    return this.analyticsService.track(dto, user ?? undefined);
  }

  @Post('events/batch')
  @UseGuards(OptionalJwtAuthGuard)
  trackBatch(@Body() dto: TrackEventsBatchDto, @CurrentUser() user?: User) {
    return this.analyticsService.trackBatch(dto.events, user ?? undefined);
  }

  @Get('search/:eventId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  searchAnalytics(
    @Param('eventId') eventId: string,
    @Query() query: SearchAnalyticsQueryDto,
  ) {
    return this.analyticsService.searchAnalytics(
      eventId,
      query.from,
      query.to,
    );
  }

  @Get('search/:eventId/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  async searchAnalyticsExport(
    @Param('eventId') eventId: string,
    @Query() query: SearchAnalyticsQueryDto,
    @Res() res: Response,
  ) {
    const report = await this.analyticsService.searchAnalytics(
      eventId,
      query.from,
      query.to,
    );
    const csv = this.analyticsService.searchAnalyticsCsv(report);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="search-analytics-${eventId}.csv"`,
    );
    res.send(csv);
  }

  @Get('dashboard/:eventId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  dashboard(@Param('eventId') eventId: string) {
    return this.analyticsService.dashboard(eventId);
  }
}
