import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ContactConsentService } from './contact-consent.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { UserRole } from '../common/enums';
import {
  CreateContactConsentDto,
  RespondContactConsentDto,
} from './dto/contact-consent.dto';

@Controller('users/me/contact-consent-requests')
@UseGuards(JwtAuthGuard)
export class ContactConsentController {
  constructor(private readonly contactConsentService: ContactConsentService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.contactConsentService.listForVisitor(user.id);
  }

  @Post(':requestId/respond')
  respond(
    @CurrentUser() user: User,
    @Param('requestId') requestId: string,
    @Body() dto: RespondContactConsentDto,
  ) {
    return this.contactConsentService.respond(user.id, requestId, dto);
  }
}

@Controller('vendors/:vendorId/contact-consent-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.ORGANIZER)
export class VendorContactConsentController {
  constructor(private readonly contactConsentService: ContactConsentService) {}

  @Post()
  create(
    @Param('vendorId') vendorId: string,
    @Body() dto: CreateContactConsentDto,
  ) {
    return this.contactConsentService.createRequest(vendorId, dto);
  }

  @Get()
  list(@Param('vendorId') vendorId: string) {
    return this.contactConsentService.listForVendor(vendorId);
  }
}
