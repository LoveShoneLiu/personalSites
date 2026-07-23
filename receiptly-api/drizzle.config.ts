import { defineConfig } from 'drizzle-kit';

if (!process.env.RECEIPTLY_DATABASE_URL) {
  throw new Error('RECEIPTLY_DATABASE_URL is required for Receiptly database commands.');
}

export default defineConfig({
  schema: './receiptly-api/infrastructure/database/schema.ts',
  out: './receiptly-api/infrastructure/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.RECEIPTLY_DATABASE_URL,
  },
});
