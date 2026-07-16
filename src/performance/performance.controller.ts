import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PerformanceService } from './performance.service';
import { OptionalJwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import {
  PerformanceDashboardQueryDto,
  PerformanceEventsBatchDto,
} from './dto/performance.dto';

@Controller('performance')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Post('events/batch')
  @UseGuards(OptionalJwtAuthGuard)
  ingestBatch(
    @Body() dto: PerformanceEventsBatchDto,
    @CurrentUser() user?: User,
  ) {
    return this.performanceService.ingestBatch(dto.events, user ?? undefined);
  }

  @Get('dashboard/:eventId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  dashboard(
    @Param('eventId') eventId: string,
    @Query() query: PerformanceDashboardQueryDto,
  ) {
    return this.performanceService.dashboard(eventId, query.hours ?? 1);
  }
}
