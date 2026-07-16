import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { VendorPortalService } from './vendor-portal.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { UserRole } from '../common/enums';
import { VendorRequestConsentDto } from './dto/vendor-portal.dto';

@Controller('vendor-portal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
export class VendorPortalController {
  constructor(private readonly vendorPortalService: VendorPortalService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: User) {
    return this.vendorPortalService.getDashboard(user);
  }

  @Get('contact-consent-requests')
  listContactConsent(@CurrentUser() user: User) {
    return this.vendorPortalService.listContactConsent(user);
  }

  @Post('contact-consent-requests')
  requestContactConsent(
    @CurrentUser() user: User,
    @Body() dto: VendorRequestConsentDto,
  ) {
    return this.vendorPortalService.requestContactConsent(user, dto);
  }
}
