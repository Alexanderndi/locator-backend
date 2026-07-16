import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, Between } from 'typeorm';
import { AnalyticsEvent } from '../entities/analytics-event.entity';
import { Vendor } from '../entities/vendor.entity';
import { EventsService } from '../events/events.service';
import { TrackEventDto, TrackEventItemDto } from './dto/analytics.dto';
import { User } from '../entities/user.entity';

const BLOCKED_PROPERTY_KEYS = new Set([
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
  'email',
  'phone',
  'displayname',
  'authorization',
]);

const MAX_QUERY_LENGTH = 256;
const BOT_SEARCH_THRESHOLD = 40;
const BOT_WINDOW_MS = 60 * 60 * 1000;

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsRepository: Repository<AnalyticsEvent>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    private readonly eventsService: EventsService,
  ) {}

  async track(dto: TrackEventDto, user?: User) {
    const event = await this.analyticsRepository.save(
      this.analyticsRepository.create({
        eventId: dto.eventId ?? null,
        userId: user?.id ?? null,
        type: dto.type,
        properties: this.sanitizeProperties(dto.properties, dto.type),
      }),
    );
    return { id: event.id, recorded: true };
  }

  async trackBatch(events: TrackEventItemDto[], user?: User) {
    if (!events.length) {
      return { recorded: 0 };
    }

    const rows = events.map((item) =>
      this.analyticsRepository.create({
        eventId: item.eventId ?? null,
        userId: user?.id ?? null,
        type: item.type,
        properties: this.sanitizeProperties(
          {
            ...(item.properties ?? {}),
            ...(item.clientTimestamp
              ? { client_timestamp: item.clientTimestamp }
              : {}),
          },
          item.type,
        ),
      }),
    );

    await this.analyticsRepository.save(rows);
    return { recorded: rows.length };
  }

  async searchAnalytics(eventId: string, from?: string, to?: string) {
    const event = await this.eventsService.ensureEvent(eventId);
    const { rangeStart, rangeEnd } = this.resolveSearchDateRange(
      event.startDate,
      event.endDate,
      from,
      to,
    );

    const events = await this.analyticsRepository.find({
      where: { eventId, createdAt: Between(rangeStart, rangeEnd) },
      order: { createdAt: 'ASC' },
    });

    const searchEvents = this.filterBotSearchEvents(
      events.filter((e) => this.isSearchEvent(e.type)),
    );
    const clickEvents = events.filter((e) => this.isSearchClickEvent(e.type));

    const searchCounts = new Map<string, number>();
    const clickCounts = new Map<string, number>();
    const zeroResultCounts = new Map<string, number>();

    for (const e of searchEvents) {
      const query = this.normalizeQuery(e.properties?.query);
      if (!query) continue;
      searchCounts.set(query, (searchCounts.get(query) ?? 0) + 1);
      const resultCount = Number(
        e.properties?.result_count ?? e.properties?.resultCount ?? 0,
      );
      if (resultCount === 0) {
        zeroResultCounts.set(query, (zeroResultCounts.get(query) ?? 0) + 1);
      }
    }

    for (const e of clickEvents) {
      const query = this.normalizeQuery(e.properties?.query);
      if (!query) continue;
      clickCounts.set(query, (clickCounts.get(query) ?? 0) + 1);
    }

    const topSearches = [...searchCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([query, searchCount]) => {
        const clickCount = clickCounts.get(query) ?? 0;
        return {
          query,
          searchCount,
          clickCount,
          ctr:
            searchCount > 0
              ? Math.round((clickCount / searchCount) * 1000) / 1000
              : 0,
          zeroResultCount: zeroResultCounts.get(query) ?? 0,
        };
      });

    const zeroResultSearches = [...zeroResultCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([query, count]) => ({ query, count }));

    const totalSearches = searchEvents.length;
    const totalClicks = clickEvents.length;

    return {
      eventId,
      eventStartDate: event.startDate,
      eventEndDate: event.endDate,
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
      totalSearches,
      totalClicks,
      overallCtr:
        totalSearches > 0
          ? Math.round((totalClicks / totalSearches) * 1000) / 1000
          : 0,
      topSearches,
      zeroResultSearches,
    };
  }

  searchAnalyticsCsv(
    report: Awaited<ReturnType<AnalyticsService['searchAnalytics']>>,
  ) {
    const lines = [
      'query,search_count,click_count,ctr,zero_result_count',
      ...report.topSearches.map(
        (row) =>
          `"${row.query.replace(/"/g, '""')}",${row.searchCount},${row.clickCount},${row.ctr},${row.zeroResultCount}`,
      ),
      '',
      'zero_result_query,count',
      ...report.zeroResultSearches.map(
        (row) => `"${row.query.replace(/"/g, '""')}",${row.count}`,
      ),
    ];
    return lines.join('\n');
  }

  async dashboard(eventId: string, compareEventId?: string) {
    const event = await this.eventsService.ensureEvent(eventId);
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [todayEvents, events24h] = await Promise.all([
      this.analyticsRepository.find({
        where: { eventId, createdAt: Between(todayStart, now) },
      }),
      this.analyticsRepository.find({
        where: { eventId, createdAt: Between(since24h, now) },
      }),
    ]);

    const eventStart = new Date(event.startDate);
    eventStart.setHours(0, 0, 0, 0);
    const trendStart = new Date(now);
    trendStart.setDate(trendStart.getDate() - 13);
    trendStart.setHours(0, 0, 0, 0);
    if (trendStart < eventStart) {
      trendStart.setTime(eventStart.getTime());
    }

    const trendEvents = await this.analyticsRepository.find({
      where: { eventId, createdAt: Between(trendStart, now) },
      order: { createdAt: 'ASC' },
    });

    const dau = this.countUniqueUsers(todayEvents);
    const activeUsers = this.countUniqueUsers(events24h);
    const totalSearches = events24h.filter((e) =>
      this.isSearchEvent(e.type),
    ).length;
    const navigationStarts = events24h.filter((e) =>
      this.isNavigationStartEvent(e.type),
    ).length;
    const qrScans = events24h.filter((e) => this.isQrScanEvent(e.type)).length;
    const topVendors = await this.buildTopVendors(events24h);
    const dailyTrend = this.buildDailyTrend(trendEvents, trendStart, now);

    let comparison: Awaited<
      ReturnType<AnalyticsService['dashboardSummary']>
    > | null = null;
    if (compareEventId && compareEventId !== eventId) {
      comparison = await this.dashboardSummary(compareEventId);
    }

    return {
      eventId,
      eventName: event.name,
      eventStartDate: event.startDate,
      eventEndDate: event.endDate,
      period: '24h',
      refreshIntervalSeconds: 300,
      lastUpdatedAt: now.toISOString(),
      dau,
      activeUsers,
      totalSearches,
      navigationStarts,
      qrScans,
      topVendors,
      dailyTrend,
      comparison,
    };
  }

  async dashboardSummary(eventId: string) {
    const event = await this.eventsService.ensureEvent(eventId);
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [todayEvents, events24h] = await Promise.all([
      this.analyticsRepository.find({
        where: { eventId, createdAt: Between(todayStart, now) },
      }),
      this.analyticsRepository.find({
        where: { eventId, createdAt: Between(since24h, now) },
      }),
    ]);

    return {
      eventId,
      eventName: event.name,
      dau: this.countUniqueUsers(todayEvents),
      activeUsers: this.countUniqueUsers(events24h),
      totalSearches: events24h.filter((e) => this.isSearchEvent(e.type)).length,
      navigationStarts: events24h.filter((e) =>
        this.isNavigationStartEvent(e.type),
      ).length,
      qrScans: events24h.filter((e) => this.isQrScanEvent(e.type)).length,
      topVendors: await this.buildTopVendors(events24h),
    };
  }

  private async buildTopVendors(events: AnalyticsEvent[]) {
    const vendorViews = new Map<string, number>();
    for (const e of events) {
      if (!this.isVendorViewEvent(e.type)) continue;
      const vendorId =
        (e.properties?.vendor_id as string) ??
        (e.properties?.vendorId as string);
      if (!vendorId) continue;
      vendorViews.set(vendorId, (vendorViews.get(vendorId) ?? 0) + 1);
    }

    const topVendorEntries = [...vendorViews.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const vendorIds = topVendorEntries.map(([vendorId]) => vendorId);
    const vendors = vendorIds.length
      ? await this.vendorRepository.find({ where: { id: In(vendorIds) } })
      : [];
    const vendorNames = new Map(vendors.map((v) => [v.id, v.name]));

    return topVendorEntries.map(([vendorId, views]) => ({
      vendorId,
      name: vendorNames.get(vendorId) ?? vendorId,
      views,
    }));
  }

  private countUniqueUsers(events: AnalyticsEvent[]) {
    const uniqueUsers = new Set<string>();
    for (const e of events) {
      if (e.userId) {
        uniqueUsers.add(e.userId);
      } else {
        const anonymousId = e.properties?.anonymous_id;
        if (
          typeof anonymousId === 'string' ||
          typeof anonymousId === 'number'
        ) {
          uniqueUsers.add(String(anonymousId));
        }
      }
    }
    return uniqueUsers.size;
  }

  private buildDailyTrend(events: AnalyticsEvent[], start: Date, end: Date) {
    const days: Array<{
      date: string;
      activeUsers: number;
      searches: number;
      navigationStarts: number;
      qrScans: number;
    }> = [];

    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    while (cursor <= endDay) {
      const next = new Date(cursor);
      next.setDate(next.getDate() + 1);
      const dayEvents = events.filter(
        (event) => event.createdAt >= cursor && event.createdAt < next,
      );

      days.push({
        date: cursor.toISOString().slice(0, 10),
        activeUsers: this.countUniqueUsers(dayEvents),
        searches: dayEvents.filter((event) => this.isSearchEvent(event.type))
          .length,
        navigationStarts: dayEvents.filter((event) =>
          this.isNavigationStartEvent(event.type),
        ).length,
        qrScans: dayEvents.filter((event) => this.isQrScanEvent(event.type))
          .length,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    return days;
  }

  private resolveSearchDateRange(
    eventStartDate: string,
    eventEndDate: string,
    from?: string,
    to?: string,
  ) {
    const eventStart = new Date(eventStartDate);
    eventStart.setHours(0, 0, 0, 0);

    const eventEnd = new Date(eventEndDate);
    eventEnd.setHours(23, 59, 59, 999);

    let rangeStart = from ? new Date(from) : eventStart;
    let rangeEnd = to ? new Date(to) : new Date();

    if (Number.isNaN(rangeStart.getTime())) rangeStart = eventStart;
    if (Number.isNaN(rangeEnd.getTime())) rangeEnd = new Date();

    if (rangeStart < eventStart) rangeStart = eventStart;
    if (rangeEnd > eventEnd) rangeEnd = eventEnd;
    if (rangeEnd > new Date()) rangeEnd = new Date();
    if (rangeStart > rangeEnd) {
      rangeStart = new Date(rangeEnd);
      rangeStart.setHours(0, 0, 0, 0);
    }

    rangeEnd.setHours(23, 59, 59, 999);

    return { rangeStart, rangeEnd };
  }

  private filterBotSearchEvents(events: AnalyticsEvent[]): AnalyticsEvent[] {
    const actorBuckets = new Map<string, number>();

    for (const event of events) {
      const actor = this.actorKey(event);
      const bucket = Math.floor(event.createdAt.getTime() / BOT_WINDOW_MS);
      const key = `${actor}:${bucket}`;
      actorBuckets.set(key, (actorBuckets.get(key) ?? 0) + 1);
    }

    const blockedActors = new Set<string>();
    for (const [key, count] of actorBuckets.entries()) {
      if (count >= BOT_SEARCH_THRESHOLD) {
        blockedActors.add(key.split(':')[0]);
      }
    }

    return events.filter((event) => {
      const actor = this.actorKey(event);
      if (blockedActors.has(actor)) return false;
      const query = this.normalizeQuery(event.properties?.query);
      return query.length >= 2;
    });
  }

  private actorKey(event: AnalyticsEvent): string {
    if (event.userId) return event.userId;
    const anonymousId = event.properties?.anonymous_id;
    if (typeof anonymousId === 'string' || typeof anonymousId === 'number') {
      return String(anonymousId);
    }
    return 'unknown';
  }

  private normalizeQuery(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value.trim().toLowerCase().slice(0, MAX_QUERY_LENGTH);
  }

  private sanitizeProperties(
    properties?: Record<string, unknown>,
    type?: string,
  ): Record<string, unknown> | null {
    if (!properties) return null;

    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (BLOCKED_PROPERTY_KEYS.has(key.toLowerCase())) continue;
      if (key === 'query' && typeof value === 'string') {
        clean[key] = value.trim().slice(0, MAX_QUERY_LENGTH);
        continue;
      }
      clean[key] = value;
    }

    if (
      type &&
      this.isSearchEvent(type) &&
      typeof clean.query === 'string' &&
      clean.query.length < 2
    ) {
      return null;
    }

    return Object.keys(clean).length ? clean : null;
  }

  private isSearchEvent(type: string): boolean {
    return type === 'search_performed' || type === 'search';
  }

  private isSearchClickEvent(type: string): boolean {
    return type === 'search_result_clicked';
  }

  private isNavigationStartEvent(type: string): boolean {
    return type === 'navigation_started' || type === 'navigation_start';
  }

  private isQrScanEvent(type: string): boolean {
    return (
      type === 'qr_scan_success' || type === 'qr_scan' || type === 'qr_scan'
    );
  }

  private isVendorViewEvent(type: string): boolean {
    return type === 'vendor_viewed' || type === 'vendor_view';
  }
}
