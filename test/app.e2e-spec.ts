import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request, { Response } from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'crypto';
import { rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

type ApiList<T> = { data: T[] };

type EventResponse = {
  id: string;
  name: string;
  status: string;
  venue: { latitude: number; longitude: number } | null;
};

type VendorSummaryResponse = {
  id: string;
  name: string;
  eventId: string;
  latitude: number;
  longitude: number;
};

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
  };
};

type FavoriteResponse = {
  vendorId: string;
  eventId: string;
  alreadyExists: boolean;
};

type ReminderResponse = {
  id: string;
  vendorId: string;
  eventId: string;
  scheduledAt: string;
};

type EventDetailResponse = EventResponse & {
  organization: { id: string; name: string } | null;
};

type ScheduleResponse = {
  schedule: Array<{ day: string; items: unknown[] }>;
};

type CategoryResponse = {
  id: string;
  name: string;
  vendorCount: number;
};

type MapResponse = {
  eventId: string;
  center: { lat: number; lng: number } | null;
  venue: { id: string; name: string } | null;
  entryPoints: unknown[];
};

type DistanceVendorResponse = VendorSummaryResponse & {
  distance: number;
};

type ProfileResponse = {
  email: string;
};

type PreferencesResponse = {
  pushEnabled: boolean;
  favoriteCategories: string[];
};

type TrackResponse = {
  recorded: boolean;
};

type BatchTrackResponse = {
  recorded: number;
};

type SearchAnalyticsResponse = {
  totalSearches: number;
  topSearches: Array<{ query: string }>;
};

const bodyOf = <T>(response: Response): T => response.body as T;

describe('Festive Vendor Locator API (e2e)', () => {
  let app: INestApplication<App>;
  let databasePath: string;
  let uploadRoot: string;

  beforeAll(async () => {
    const testRunId = randomUUID();
    databasePath = join(tmpdir(), `fvl-api-${testRunId}.db`);
    uploadRoot = join(tmpdir(), `fvl-uploads-${testRunId}`);

    process.env.DATABASE_PATH = databasePath;
    process.env.UPLOAD_ROOT = uploadRoot;
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.QR_HMAC_SECRET = 'test-qr-secret';
    delete process.env.DATABASE_URL;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApp(app as NestExpressApplication);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    rmSync(databasePath, { force: true });
    rmSync(uploadRoot, { recursive: true, force: true });
  });

  const getSeededEvent = async (): Promise<EventResponse> => {
    const response = await request(app.getHttpServer())
      .get('/v1/events')
      .expect(200);
    const body = bodyOf<ApiList<EventResponse>>(response);

    expect(body.data.length).toBeGreaterThan(0);
    return body.data[0];
  };

  const getSeededVendor = async (
    eventId: string,
  ): Promise<VendorSummaryResponse> => {
    const response = await request(app.getHttpServer())
      .get(`/v1/events/${eventId}/vendors`)
      .expect(200);
    const body = bodyOf<ApiList<VendorSummaryResponse>>(response);

    expect(body.data.length).toBeGreaterThan(0);
    return body.data[0];
  };

  const registerVisitor = async (): Promise<AuthResponse> => {
    const suffix = randomUUID().slice(0, 8);
    const response = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        email: `visitor-${suffix}@example.com`,
        password: 'TestPass1',
        displayName: 'API Visitor',
        phone: `08012${suffix.replace(/\D/g, '').padEnd(6, '0').slice(0, 6)}`,
      })
      .expect(201);

    return bodyOf<AuthResponse>(response);
  };

  it('returns health status at the versioned API route', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/health')
      .expect(200);
    expect(bodyOf<{ status: string; service: string }>(response)).toMatchObject(
      {
        status: 'ok',
        service: 'festive-vendor-locator-api',
      },
    );
  });

  it('validates auth payloads and supports register, login, refresh, and logout', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        email: 'not-an-email',
        password: 'weak',
        displayName: '',
        phone: 'bad',
      })
      .expect(400);

    const registered = await registerVisitor();
    expect(registered.accessToken).toEqual(expect.any(String));
    expect(registered.refreshToken).toEqual(expect.any(String));
    expect(registered.user.role).toBe('visitor');

    const loginResponse = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: registered.user.email,
        password: 'TestPass1',
      })
      .expect(200);
    const loggedIn = bodyOf<AuthResponse>(loginResponse);
    expect(loggedIn.user.email).toBe(registered.user.email);

    const refreshResponse = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken: loggedIn.refreshToken })
      .expect(200);
    expect(bodyOf<AuthResponse>(refreshResponse).accessToken).toEqual(
      expect.any(String),
    );

    await request(app.getHttpServer())
      .post('/v1/auth/logout')
      .send({ refreshToken: registered.refreshToken })
      .expect(200);
  });

  it('serves event discovery, detail, schedule, category, and map APIs', async () => {
    const event = await getSeededEvent();

    expect(event.name).toContain('Akwa Ibom Xmas Village');
    expect(event.venue?.latitude).toEqual(expect.any(Number));

    const detailResponse = await request(app.getHttpServer())
      .get(`/v1/events/${event.id}`)
      .expect(200);
    const eventDetail = bodyOf<EventDetailResponse>(detailResponse);
    expect(eventDetail).toMatchObject({
      id: event.id,
      name: event.name,
    });
    expect(eventDetail.organization).not.toBeNull();

    const scheduleResponse = await request(app.getHttpServer())
      .get(`/v1/events/${event.id}/schedule`)
      .expect(200);
    expect(
      bodyOf<ScheduleResponse>(scheduleResponse).schedule.length,
    ).toBeGreaterThan(0);

    const categoriesResponse = await request(app.getHttpServer())
      .get(`/v1/events/${event.id}/categories`)
      .expect(200);
    const categories = bodyOf<ApiList<CategoryResponse>>(categoriesResponse);
    expect(categories.data.length).toBeGreaterThan(0);
    expect(categories.data[0]).toHaveProperty('vendorCount');

    const mapResponse = await request(app.getHttpServer())
      .get(`/v1/events/${event.id}/map`)
      .expect(200);
    const venueMap = bodyOf<MapResponse>(mapResponse);
    expect(venueMap.eventId).toBe(event.id);
    expect(venueMap.center).not.toBeNull();
    expect(venueMap.venue).not.toBeNull();
    expect(venueMap.entryPoints.length).toBeGreaterThan(0);
  });

  it('serves vendor catalogue, search, nearby, products, promotions, and reviews APIs', async () => {
    const event = await getSeededEvent();
    const vendor = await getSeededVendor(event.id);

    const searchResponse = await request(app.getHttpServer())
      .get(`/v1/events/${event.id}/vendors/search`)
      .query({ q: 'kitchen' })
      .expect(200);
    const kitchenVendors =
      bodyOf<ApiList<VendorSummaryResponse>>(searchResponse);
    expect(kitchenVendors.data.length).toBeGreaterThan(0);
    const kitchenVendor = kitchenVendors.data[0];

    const nearbyResponse = await request(app.getHttpServer())
      .get(`/v1/events/${event.id}/vendors/nearby`)
      .query({ lat: vendor.latitude, lng: vendor.longitude, radius: 1000 })
      .expect(200);
    expect(
      bodyOf<ApiList<DistanceVendorResponse>>(nearbyResponse).data[0],
    ).toHaveProperty('distance');

    const recommendedResponse = await request(app.getHttpServer())
      .get(`/v1/events/${event.id}/vendors/recommended`)
      .expect(200);
    expect(
      bodyOf<ApiList<VendorSummaryResponse>>(recommendedResponse).data.length,
    ).toBeGreaterThan(0);

    const vendorResponse = await request(app.getHttpServer())
      .get(`/v1/vendors/${kitchenVendor.id}`)
      .expect(200);
    expect(bodyOf<VendorSummaryResponse>(vendorResponse)).toMatchObject({
      id: kitchenVendor.id,
      name: kitchenVendor.name,
    });

    const productsResponse = await request(app.getHttpServer())
      .get(`/v1/vendors/${kitchenVendor.id}/products`)
      .expect(200);
    expect(
      bodyOf<ApiList<unknown>>(productsResponse).data.length,
    ).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .get(`/v1/vendors/${kitchenVendor.id}/promotions`)
      .expect(200);

    const reviewsResponse = await request(app.getHttpServer())
      .get(`/v1/vendors/${kitchenVendor.id}/reviews`)
      .expect(200);
    expect(
      bodyOf<ApiList<unknown>>(reviewsResponse).data.length,
    ).toBeGreaterThan(0);
  });

  it('supports authenticated profile, preferences, favorites, reminders, and device token APIs', async () => {
    const event = await getSeededEvent();
    const vendor = await getSeededVendor(event.id);
    const auth = await registerVisitor();
    const bearer = `Bearer ${auth.accessToken}`;

    const profileResponse = await request(app.getHttpServer())
      .get('/v1/users/me')
      .set('Authorization', bearer)
      .expect(200);
    expect(bodyOf<ProfileResponse>(profileResponse).email).toBe(
      auth.user.email,
    );

    const preferencesResponse = await request(app.getHttpServer())
      .patch('/v1/users/me/preferences')
      .set('Authorization', bearer)
      .send({ pushEnabled: false, favoriteCategories: ['Food'] })
      .expect(200);
    const preferences = bodyOf<PreferencesResponse>(preferencesResponse);
    expect(preferences.pushEnabled).toBe(false);
    expect(preferences.favoriteCategories).toContain('Food');

    const favoriteResponse = await request(app.getHttpServer())
      .post('/v1/users/me/favorites')
      .set('Authorization', bearer)
      .send({ vendorId: vendor.id, eventId: event.id })
      .expect(201);
    expect(bodyOf<FavoriteResponse>(favoriteResponse)).toMatchObject({
      vendorId: vendor.id,
      eventId: event.id,
      alreadyExists: false,
    });

    const favoritesResponse = await request(app.getHttpServer())
      .get('/v1/users/me/favorites')
      .set('Authorization', bearer)
      .query({ eventId: event.id })
      .expect(200);
    expect(
      bodyOf<ApiList<unknown>>(favoritesResponse).data.length,
    ).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .post('/v1/users/me/device-tokens')
      .set('Authorization', bearer)
      .send({ token: `device-${randomUUID()}`, platform: 'test' })
      .expect(201);

    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const reminderResponse = await request(app.getHttpServer())
      .post('/v1/users/me/reminders')
      .set('Authorization', bearer)
      .send({
        vendorId: vendor.id,
        eventId: event.id,
        scheduledAt,
        message: 'Visit booth',
      })
      .expect(201);
    expect(bodyOf<ReminderResponse>(reminderResponse)).toMatchObject({
      vendorId: vendor.id,
      eventId: event.id,
    });

    const notificationsResponse = await request(app.getHttpServer())
      .get('/v1/users/me/notifications')
      .set('Authorization', bearer)
      .query({ eventId: event.id })
      .expect(200);
    expect(
      bodyOf<ApiList<unknown>>(notificationsResponse).data.length,
    ).toBeGreaterThan(0);
  });

  it('tracks analytics events and exposes organizer analytics reports', async () => {
    const event = await getSeededEvent();

    const trackResponse = await request(app.getHttpServer())
      .post('/v1/analytics/events')
      .send({
        eventId: event.id,
        type: 'search_performed',
        properties: {
          query: 'jollof',
          result_count: 3,
          email: 'should-be-removed@example.com',
        },
      })
      .expect(201);
    expect(bodyOf<TrackResponse>(trackResponse).recorded).toBe(true);

    const batchResponse = await request(app.getHttpServer())
      .post('/v1/analytics/events/batch')
      .send({
        events: [
          {
            eventId: event.id,
            type: 'search_result_clicked',
            properties: { query: 'jollof' },
          },
        ],
      })
      .expect(201);
    expect(bodyOf<BatchTrackResponse>(batchResponse).recorded).toBe(1);

    const loginResponse = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'organizer@fvl.io', password: 'OrganizerPass1' })
      .expect(200);
    const organizer = bodyOf<AuthResponse>(loginResponse);

    const analyticsResponse = await request(app.getHttpServer())
      .get(`/v1/analytics/search/${event.id}`)
      .set('Authorization', `Bearer ${organizer.accessToken}`)
      .expect(200);
    const analytics = bodyOf<SearchAnalyticsResponse>(analyticsResponse);
    expect(analytics.totalSearches).toBeGreaterThanOrEqual(1);
    expect(analytics.topSearches[0].query).toBe('jollof');
  });
});
