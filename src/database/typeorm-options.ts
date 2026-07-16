import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ALL_ENTITIES } from '../entities';

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

export const createTypeOrmOptions = (): TypeOrmModuleOptions => {
  const databaseUrl = process.env.DATABASE_URL;
  const synchronize = parseBoolean(process.env.DB_SYNCHRONIZE, true);

  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      entities: ALL_ENTITIES,
      synchronize,
      ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : false,
    };
  }

  return {
    type: 'better-sqlite3',
    database:
      process.env.DATABASE_PATH ?? (process.env.VERCEL ? '/tmp/fvl.db' : 'fvl.db'),
    entities: ALL_ENTITIES,
    synchronize,
  };
};
