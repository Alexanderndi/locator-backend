import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { PerformanceEvent } from '../entities/performance-event.entity';
import { AnalyticsEvent } from '../entities/analytics-event.entity';
import { EventsService } from '../events/events.service';
import { PerformanceEventItemDto } from './dto/performance.dto';
import { User } from '../entities/user.entity';

const BLOCKED_PROPERTY_KEYS = new Set([
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
  'email',
  'phone',
  'authorization',
  'cookie',
]);

const CRASH_RATE_ALERT_THRESHOLD = 0.005;

@Injectable()
export class PerformanceService {
  constructor(
    @InjectRepository(PerformanceEvent)
    private readonly performanceRepository: Repository<PerformanceEvent>,
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsRepository: Repository<AnalyticsEvent>,
    private readonly eventsService: EventsService,
  ) {}

  async ingestBatch(events: PerformanceEventItemDto[], user?: User) {
    if (!events.length) return { recorded: 0 };

    const rows = events.map((item) =>
      this.performanceRepository.create({
        eventId: item.eventId ?? null,
        userId: user?.id ?? null,
        kind: item.kind,
        name: item.name.slice(0, 200),
        durationMs: item.durationMs ?? null,
        properties: this.sanitizeProperties({
          ...(item.properties ?? {}),
          ...(item.clientTimestamp
            ? { client_timestamp: item.clientTimestamp }
            : {}),
        }),
      }),
    );

    await this.performanceRepository.save(rows);
    return { recorded: rows.length };
  }

  async recordServerLatency(
    route: string,
    durationMs: number,
    statusCode: number,
  ) {
    await this.performanceRepository.save(
      this.performanceRepository.create({
        eventId: null,
        userId: null,
        kind: 'server_api_latency',
        name: route.slice(0, 200),
        durationMs,
        properties: { status_code: statusCode, source: 'server' },
      }),
    );
  }

  async dashboard(eventId: string, hours = 1) {
    await this.eventsService.ensureEvent(eventId);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [performanceEvents, sessionEvents] = await Promise.all([
      this.performanceRepository.find({
        where: { eventId, createdAt: Between(since, new Date()) },
      }),
      this.analyticsRepository.find({
        where: { eventId, createdAt: Between(since, new Date()) },
      }),
    ]);

    const crashes = performanceEvents.filter((e) => e.kind === 'crash');
    const sessions = sessionEvents.filter(
      (e) => e.type === 'app_open',
    ).length;
    const crashRate = sessions > 0 ? crashes.length / sessions : 0;
    const crashFreeSessionRate =
      sessions > 0 ? 1 - crashRate : 1;

    const clientApiLatencies = performanceEvents
      .filter((e) => e.kind === 'api_latency' && e.durationMs != null)
      .map((e) => e.durationMs as number);

    const mapLoadLatencies = performanceEvents
      .filter((e) => e.kind === 'map_load' && e.durationMs != null)
      .map((e) => e.durationMs as number);

    const serverApiLatencies = (
      await this.performanceRepository.find({
        where: {
          kind: 'server_api_latency',
          createdAt: Between(since, new Date()),
        },
      })
    )
      .filter((e) => e.durationMs != null)
      .map((e) => e.durationMs as number);

    return {
      eventId,
      periodHours: hours,
      crashCount: crashes.length,
      sessionCount: sessions,
      crashRate: Math.round(crashRate * 10000) / 10000,
      crashFreeSessionRate: Math.round(crashFreeSessionRate * 10000) / 10000,
      crashRateAlertActive: sessions > 0 && crashRate > CRASH_RATE_ALERT_THRESHOLD,
      crashRateAlertThreshold: CRASH_RATE_ALERT_THRESHOLD,
      apiLatency: this.latencySummary(clientApiLatencies),
      mapLoad: this.latencySummary(mapLoadLatencies),
      serverApiLatency: this.latencySummary(serverApiLatencies),
      recentCrashes: crashes
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 100)
        .map((crash) => ({
          id: crash.id,
          name: crash.name,
          createdAt: crash.createdAt,
          appVersion: crash.properties?.app_version ?? null,
          platform: crash.properties?.platform ?? null,
          error:
            typeof crash.properties?.error === 'string'
              ? crash.properties.error
              : null,
          stackTrace:
            typeof crash.properties?.stack_trace === 'string'
              ? crash.properties.stack_trace
              : null,
        })),
    };
  }

  private latencySummary(values: number[]) {
    return {
      sampleCount: values.length,
      p50: this.percentile(values, 50),
      p95: this.percentile(values, 95),
    };
  }

  private percentile(values: number[], p: number): number {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private sanitizeProperties(
    properties?: Record<string, unknown>,
  ): Record<string, unknown> | null {
    if (!properties) return null;

    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (BLOCKED_PROPERTY_KEYS.has(key.toLowerCase())) continue;
      if (typeof value === 'string') {
        clean[key] = this.scrubString(value);
        continue;
      }
      clean[key] = value;
    }

    return Object.keys(clean).length ? clean : null;
  }

  private scrubString(value: string): string {
    return value
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
      .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [redacted-token]')
      .slice(0, 4000);
  }
}
