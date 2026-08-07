import { StreamableFile } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../entities/user.entity';

describe('AdminController', () => {
  const adminService = {
    listManageableEvents: jest.fn(),
    listCustomers: jest.fn(),
    listCategories: jest.fn(),
    listVendorAuditLogs: jest.fn(),
    listVendors: jest.fn(),
    createVendor: jest.fn(),
    updateVendor: jest.fn(),
    deleteVendor: jest.fn(),
    bulkImport: jest.fn(),
    generateAllQr: jest.fn(),
    buildQrPdf: jest.fn(),
    buildSingleVendorQrPdf: jest.fn(),
    listAnnouncements: jest.fn(),
    createAnnouncement: jest.fn(),
    updateAnnouncement: jest.fn(),
    deleteAnnouncement: jest.fn(),
    adminDashboard: jest.fn(),
    buildDashboardPdf: jest.fn(),
    createContactConsentRequest: jest.fn(),
    listContactConsentRequests: jest.fn(),
  };

  let controller: AdminController;
  const user = { id: 'admin-1' } as User;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AdminController(adminService as unknown as AdminService);
  });

  it('delegates GET /admin/events to listManageableEvents', () => {
    adminService.listManageableEvents.mockReturnValue({ data: [] });

    expect(controller.listEvents(user)).toEqual({ data: [] });
    expect(adminService.listManageableEvents).toHaveBeenCalledWith(user);
  });

  it('delegates GET /admin/customers with page/pageSize/limit parsing', () => {
    adminService.listCustomers.mockReturnValue({ data: [], meta: {} });

    controller.listCustomers('2', '20', undefined);

    expect(adminService.listCustomers).toHaveBeenCalledWith(2, 20);
  });

  it('delegates GET /admin/events/:eventId/categories to listCategories', () => {
    adminService.listCategories.mockReturnValue({ data: [] });

    expect(controller.listCategories('event-1', user)).toEqual({ data: [] });
    expect(adminService.listCategories).toHaveBeenCalledWith('event-1', user);
  });

  it('delegates GET /admin/events/:eventId/vendors/audit-log with limit', () => {
    adminService.listVendorAuditLogs.mockReturnValue({ data: [] });

    controller.listVendorAuditLogs('event-1', user, '25');

    expect(adminService.listVendorAuditLogs).toHaveBeenCalledWith(
      'event-1',
      user,
      25,
    );
  });

  it('delegates GET /admin/events/:eventId/vendors to listVendors', () => {
    adminService.listVendors.mockReturnValue({ data: [] });

    expect(controller.listVendors('event-1', user)).toEqual({ data: [] });
    expect(adminService.listVendors).toHaveBeenCalledWith('event-1', user);
  });

  it('delegates POST /admin/events/:eventId/vendors to createVendor', () => {
    const dto = {
      name: 'New Vendor',
      latitude: 4.95,
      longitude: 8.32,
    };
    adminService.createVendor.mockReturnValue({ id: 'vendor-1', ...dto });

    expect(controller.createVendor('event-1', dto, user)).toEqual({
      id: 'vendor-1',
      ...dto,
    });
    expect(adminService.createVendor).toHaveBeenCalledWith(
      'event-1',
      dto,
      user,
    );
  });

  it('delegates PATCH /admin/events/:eventId/vendors/:vendorId to updateVendor', () => {
    const dto = { name: 'Updated Vendor' };
    adminService.updateVendor.mockReturnValue({ id: 'vendor-1', ...dto });

    expect(controller.updateVendor('event-1', 'vendor-1', dto, user)).toEqual({
      id: 'vendor-1',
      ...dto,
    });
    expect(adminService.updateVendor).toHaveBeenCalledWith(
      'event-1',
      'vendor-1',
      dto,
      user,
    );
  });

  it('delegates DELETE /admin/events/:eventId/vendors/:vendorId to deleteVendor', () => {
    adminService.deleteVendor.mockReturnValue({ message: 'Vendor deactivated' });

    expect(controller.deleteVendor('event-1', 'vendor-1', user)).toEqual({
      message: 'Vendor deactivated',
    });
    expect(adminService.deleteVendor).toHaveBeenCalledWith(
      'event-1',
      'vendor-1',
      user,
    );
  });

  it('delegates POST /admin/events/:eventId/vendors/bulk-import to bulkImport', () => {
    const dto = {
      vendors: [{ name: 'Vendor 1', latitude: 4.95, longitude: 8.32 }],
    };
    adminService.bulkImport.mockReturnValue({ imported: 1, failed: 0 });

    expect(controller.bulkImport('event-1', dto, user)).toEqual({
      imported: 1,
      failed: 0,
    });
    expect(adminService.bulkImport).toHaveBeenCalledWith('event-1', dto, user);
  });

  it('delegates POST /admin/events/:eventId/qr/generate-all with regenerate flag', () => {
    adminService.generateAllQr.mockReturnValue({ generated: 5, data: [] });

    expect(controller.generateAllQr('event-1', user, 'true')).toEqual({
      generated: 5,
      data: [],
    });
    expect(adminService.generateAllQr).toHaveBeenCalledWith(
      'event-1',
      user,
      true,
    );
  });

  it('returns StreamableFile for POST /admin/events/:eventId/qr/download-pdf', async () => {
    adminService.buildQrPdf.mockResolvedValue({
      buffer: Buffer.from('pdf'),
      filename: 'qr-codes.pdf',
    });

    const result = await controller.downloadQrPdf('event-1', user);

    expect(result).toBeInstanceOf(StreamableFile);
    expect(adminService.buildQrPdf).toHaveBeenCalledWith('event-1', user);
  });

  it('returns StreamableFile for GET /admin/events/:eventId/vendors/:vendorId/qr/download-pdf', async () => {
    adminService.buildSingleVendorQrPdf.mockResolvedValue({
      buffer: Buffer.from('pdf'),
      filename: 'vendor-qr.pdf',
    });

    const result = await controller.downloadVendorQrPdf(
      'event-1',
      'vendor-1',
      user,
    );

    expect(result).toBeInstanceOf(StreamableFile);
    expect(adminService.buildSingleVendorQrPdf).toHaveBeenCalledWith(
      'event-1',
      'vendor-1',
      user,
    );
  });

  it('delegates GET /admin/events/:eventId/announcements to listAnnouncements', () => {
    adminService.listAnnouncements.mockReturnValue({ data: [] });

    expect(controller.listAnnouncements('event-1', user)).toEqual({
      data: [],
    });
    expect(adminService.listAnnouncements).toHaveBeenCalledWith(
      'event-1',
      user,
    );
  });

  it('delegates POST /admin/events/:eventId/announcements to createAnnouncement', () => {
    const dto = { title: 'Update', body: 'Details' };
    adminService.createAnnouncement.mockReturnValue({ id: 'announcement-1' });

    expect(controller.createAnnouncement('event-1', dto, user)).toEqual({
      id: 'announcement-1',
    });
    expect(adminService.createAnnouncement).toHaveBeenCalledWith(
      'event-1',
      dto,
      user,
    );
  });

  it('delegates PATCH /admin/events/:eventId/announcements/:announcementId to updateAnnouncement', () => {
    const dto = { title: 'Updated title' };
    adminService.updateAnnouncement.mockReturnValue({
      id: 'announcement-1',
      title: 'Updated title',
    });

    expect(
      controller.updateAnnouncement('event-1', 'announcement-1', dto, user),
    ).toEqual({ id: 'announcement-1', title: 'Updated title' });
    expect(adminService.updateAnnouncement).toHaveBeenCalledWith(
      'event-1',
      'announcement-1',
      dto,
      user,
    );
  });

  it('delegates DELETE /admin/events/:eventId/announcements/:announcementId to deleteAnnouncement', () => {
    adminService.deleteAnnouncement.mockReturnValue({
      message: 'Announcement deleted',
    });

    expect(
      controller.deleteAnnouncement('event-1', 'announcement-1', user),
    ).toEqual({ message: 'Announcement deleted' });
    expect(adminService.deleteAnnouncement).toHaveBeenCalledWith(
      'event-1',
      'announcement-1',
      user,
    );
  });

  it('delegates GET /admin/dashboard/:eventId to adminDashboard', () => {
    adminService.adminDashboard.mockReturnValue({ activeVendors: 10 });

    expect(controller.dashboard('event-1', user, 'event-2')).toEqual({
      activeVendors: 10,
    });
    expect(adminService.adminDashboard).toHaveBeenCalledWith(
      'event-1',
      user,
      'event-2',
    );
  });

  it('returns StreamableFile for GET /admin/dashboard/:eventId/export-pdf', async () => {
    adminService.buildDashboardPdf.mockResolvedValue({
      buffer: Buffer.from('pdf'),
      filename: 'dashboard.pdf',
    });

    const result = await controller.exportDashboardPdf(
      'event-1',
      user,
      'event-2',
    );

    expect(result).toBeInstanceOf(StreamableFile);
    expect(adminService.buildDashboardPdf).toHaveBeenCalledWith(
      'event-1',
      user,
      'event-2',
    );
  });

  it('delegates POST /admin/events/:eventId/vendors/:vendorId/contact-consent-requests to createContactConsentRequest', () => {
    const dto = { userEmail: 'visitor@example.com' };
    adminService.createContactConsentRequest.mockReturnValue({ id: 'req-1' });

    expect(
      controller.createContactConsent('event-1', 'vendor-1', dto, user),
    ).toEqual({ id: 'req-1' });
    expect(adminService.createContactConsentRequest).toHaveBeenCalledWith(
      'event-1',
      'vendor-1',
      dto,
      user,
    );
  });

  it('delegates GET /admin/events/:eventId/vendors/:vendorId/contact-consent-requests to listContactConsentRequests', () => {
    adminService.listContactConsentRequests.mockReturnValue({ data: [] });

    expect(controller.listContactConsent('event-1', 'vendor-1', user)).toEqual({
      data: [],
    });
    expect(adminService.listContactConsentRequests).toHaveBeenCalledWith(
      'event-1',
      'vendor-1',
      user,
    );
  });
});
