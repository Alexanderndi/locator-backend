import 'reflect-metadata';
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';
import {
  AdminAuditLog,
  AnalyticsEvent,
  Announcement,
  Category,
  ContactConsentRequest,
  DeviceToken,
  Event,
  Favorite,
  Organization,
  OtpCode,
  PerformanceEvent,
  Product,
  Promotion,
  RefreshToken,
  Review,
  ScheduleItem,
  User,
  UserPreference,
  Vendor,
  VendorReminder,
  Venue,
  VenueMap,
} from '../src/entities';

const entities = [
  Organization,
  Venue,
  Event,
  Category,
  Vendor,
  User,
  Product,
  Promotion,
  Review,
  Favorite,
  UserPreference,
  DeviceToken,
  Announcement,
  ScheduleItem,
  AnalyticsEvent,
  RefreshToken,
  OtpCode,
  VendorReminder,
  ContactConsentRequest,
  PerformanceEvent,
  AdminAuditLog,
  VenueMap,
] satisfies EntityTarget<ObjectLiteral>[];

const parseBoolean = (
  value: string | undefined,
  defaultValue: boolean,
): boolean => {
  if (value === undefined) {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const shouldUseSsl = (databaseUrl: string): boolean =>
  !databaseUrl.includes('localhost') &&
  !databaseUrl.includes('127.0.0.1') &&
  process.env.DATABASE_SSL !== 'false';

const quoteIdentifier = (identifier: string): string =>
  `"${identifier.replaceAll('"', '""')}"`;

const truncateTarget = async (target: DataSource): Promise<void> => {
  const tableNames = target.entityMetadatas.map((metadata) =>
    quoteIdentifier(metadata.tableName),
  );

  if (tableNames.length === 0) {
    return;
  }

  await target.query(
    `TRUNCATE TABLE ${tableNames.join(', ')} RESTART IDENTITY CASCADE`,
  );
};

const migrate = async (): Promise<void> => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for the Postgres target.');
  }

  const source = new DataSource({
    type: 'better-sqlite3',
    database: process.env.SOURCE_DATABASE_PATH ?? 'fvl.db',
    entities,
    synchronize: false,
  });

  const target = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    entities,
    synchronize: parseBoolean(process.env.MIGRATION_SYNCHRONIZE, true),
    ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : false,
  });

  await source.initialize();
  await target.initialize();

  try {
    if (parseBoolean(process.env.MIGRATION_TRUNCATE, false)) {
      await truncateTarget(target);
      console.log('Truncated target Postgres tables.');
    }

    for (const entity of entities) {
      const sourceRepository = source.getRepository(entity);
      const targetRepository = target.getRepository(entity);
      const rows = await sourceRepository.find({ withDeleted: true });

      if (rows.length === 0) {
        console.log(`${targetRepository.metadata.tableName}: 0 rows`);
        continue;
      }

      await targetRepository.save(rows, { chunk: 100, reload: false });
      console.log(`${targetRepository.metadata.tableName}: ${rows.length} rows`);
    }
  } finally {
    await target.destroy();
    await source.destroy();
  }
};

migrate().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
