import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  StreamableFile,
  Header,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';
import { User } from '../entities/user.entity';
import {
  CreateVendorDto,
  UpdateVendorDto,
  BulkImportVendorsDto,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  CreateContactConsentAdminDto,
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.ORGANIZER)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('events')
  listEvents(@CurrentUser() user: User) {
    return this.adminService.listManageableEvents(user);
  }

  @Get('customers')
  listCustomers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
  ) {
    const size = pageSize ?? limit;
    return this.adminService.listCustomers(
      page ? Number(page) : 1,
      size ? Number(size) : 10,
    );
  }

  @Get('events/:eventId/categories')
  listCategories(@Param('eventId') eventId: string, @CurrentUser() user: User) {
    return this.adminService.listCategories(eventId, user);
  }

  @Get('events/:eventId/vendors/audit-log')
  listVendorAuditLogs(
    @Param('eventId') eventId: string,
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listVendorAuditLogs(
      eventId,
      user,
      limit ? Number(limit) : 50,
    );
  }

  @Get('events/:eventId/vendors')
  listVendors(@Param('eventId') eventId: string, @CurrentUser() user: User) {
    return this.adminService.listVendors(eventId, user);
  }

  @Post('events/:eventId/vendors')
  createVendor(
    @Param('eventId') eventId: string,
    @Body() dto: CreateVendorDto,
    @CurrentUser() user: User,
  ) {
    return this.adminService.createVendor(eventId, dto, user);
  }

  @Patch('events/:eventId/vendors/:vendorId')
  updateVendor(
    @Param('eventId') eventId: string,
    @Param('vendorId') vendorId: string,
    @Body() dto: UpdateVendorDto,
    @CurrentUser() user: User,
  ) {
    return this.adminService.updateVendor(eventId, vendorId, dto, user);
  }

  @Delete('events/:eventId/vendors/:vendorId')
  deleteVendor(
    @Param('eventId') eventId: string,
    @Param('vendorId') vendorId: string,
    @CurrentUser() user: User,
  ) {
    return this.adminService.deleteVendor(eventId, vendorId, user);
  }

  @Post('events/:eventId/vendors/bulk-import')
  bulkImport(
    @Param('eventId') eventId: string,
    @Body() dto: BulkImportVendorsDto,
    @CurrentUser() user: User,
  ) {
    return this.adminService.bulkImport(eventId, dto, user);
  }

  @Post('events/:eventId/qr/generate-all')
  generateAllQr(
    @Param('eventId') eventId: string,
    @CurrentUser() user: User,
    @Query('regenerate') regenerate?: string,
  ) {
    return this.adminService.generateAllQr(
      eventId,
      user,
      regenerate === 'true',
    );
  }

  @Post('events/:eventId/qr/download-pdf')
  @Header('Content-Type', 'application/pdf')
  async downloadQrPdf(
    @Param('eventId') eventId: string,
    @CurrentUser() user: User,
  ) {
    const pdf = await this.adminService.buildQrPdf(eventId, user);
    return new StreamableFile(pdf.buffer, {
      disposition: `attachment; filename="${pdf.filename}"`,
    });
  }

  @Get('events/:eventId/vendors/:vendorId/qr/download-pdf')
  @Header('Content-Type', 'application/pdf')
  async downloadVendorQrPdf(
    @Param('eventId') eventId: string,
    @Param('vendorId') vendorId: string,
    @CurrentUser() user: User,
  ) {
    const pdf = await this.adminService.buildSingleVendorQrPdf(
      eventId,
      vendorId,
      user,
    );
    return new StreamableFile(pdf.buffer, {
      disposition: `attachment; filename="${pdf.filename}"`,
    });
  }

  @Get('events/:eventId/announcements')
  listAnnouncements(
    @Param('eventId') eventId: string,
    @CurrentUser() user: User,
  ) {
    return this.adminService.listAnnouncements(eventId, user);
  }

  @Post('events/:eventId/announcements')
  createAnnouncement(
    @Param('eventId') eventId: string,
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: User,
  ) {
    return this.adminService.createAnnouncement(eventId, dto, user);
  }

  @Patch('events/:eventId/announcements/:announcementId')
  updateAnnouncement(
    @Param('eventId') eventId: string,
    @Param('announcementId') announcementId: string,
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser() user: User,
  ) {
    return this.adminService.updateAnnouncement(
      eventId,
      announcementId,
      dto,
      user,
    );
  }

  @Delete('events/:eventId/announcements/:announcementId')
  deleteAnnouncement(
    @Param('eventId') eventId: string,
    @Param('announcementId') announcementId: string,
    @CurrentUser() user: User,
  ) {
    return this.adminService.deleteAnnouncement(eventId, announcementId, user);
  }

  @Get('dashboard/:eventId')
  dashboard(
    @Param('eventId') eventId: string,
    @CurrentUser() user: User,
    @Query('compareEventId') compareEventId?: string,
  ) {
    return this.adminService.adminDashboard(eventId, user, compareEventId);
  }

  @Get('dashboard/:eventId/export-pdf')
  @Header('Content-Type', 'application/pdf')
  async exportDashboardPdf(
    @Param('eventId') eventId: string,
    @CurrentUser() user: User,
    @Query('compareEventId') compareEventId?: string,
  ) {
    const pdf = await this.adminService.buildDashboardPdf(
      eventId,
      user,
      compareEventId,
    );
    return new StreamableFile(pdf.buffer, {
      disposition: `attachment; filename="${pdf.filename}"`,
    });
  }

  @Post('events/:eventId/vendors/:vendorId/contact-consent-requests')
  createContactConsent(
    @Param('eventId') eventId: string,
    @Param('vendorId') vendorId: string,
    @Body() dto: CreateContactConsentAdminDto,
    @CurrentUser() user: User,
  ) {
    return this.adminService.createContactConsentRequest(
      eventId,
      vendorId,
      dto,
      user,
    );
  }

  @Get('events/:eventId/vendors/:vendorId/contact-consent-requests')
  listContactConsent(
    @Param('eventId') eventId: string,
    @Param('vendorId') vendorId: string,
    @CurrentUser() user: User,
  ) {
    return this.adminService.listContactConsentRequests(
      eventId,
      vendorId,
      user,
    );
  }
}
