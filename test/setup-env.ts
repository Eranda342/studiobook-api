process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-only-jwt-secret';

process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5435/studiobook_test?schema=public';

if (process.env.NODE_ENV !== 'test') {
  throw new Error('NODE_ENV must be "test" during E2E testing.');
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for E2E testing.');
}

const dbUrl = new URL(process.env.DATABASE_URL);
if (!dbUrl.pathname.includes('studiobook_test')) {
  throw new Error(
    'E2E tests must be run against a test database (e.g., studiobook_test).',
  );
}
