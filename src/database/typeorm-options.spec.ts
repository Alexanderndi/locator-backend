import { createTypeOrmOptions } from './typeorm-options';

describe('createTypeOrmOptions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_PATH;
    delete process.env.DATABASE_SSL;
    delete process.env.DB_SYNCHRONIZE;
    delete process.env.VERCEL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses SQLite locally when DATABASE_URL is not set', () => {
    const options = createTypeOrmOptions();

    expect(options).toMatchObject({
      type: 'better-sqlite3',
      database: 'fvl.db',
      synchronize: true,
    });
  });

  it('uses the serverless temp SQLite path on Vercel without DATABASE_URL', () => {
    process.env.VERCEL = '1';

    const options = createTypeOrmOptions();

    expect(options).toMatchObject({
      type: 'better-sqlite3',
      database: '/tmp/fvl.db',
    });
  });

  it('uses Postgres when DATABASE_URL is set', () => {
    process.env.DATABASE_URL = 'postgres://user:pass@db.example.com/app';
    process.env.DB_SYNCHRONIZE = 'false';

    const options = createTypeOrmOptions();

    expect(options).toMatchObject({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      synchronize: false,
      ssl: { rejectUnauthorized: false },
    });
  });

  it('does not enable SSL for localhost Postgres', () => {
    process.env.DATABASE_URL =
      'postgres://postgres:postgres@localhost:5432/app';

    const options = createTypeOrmOptions();

    expect(options).toMatchObject({
      type: 'postgres',
      ssl: false,
    });
  });
});
