import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { ReceiptlyError } from '@/receiptly-api/contracts/errors';
import * as schema from './schema';

export type ReceiptlyDb = ReturnType<typeof createReceiptlyDb>;

const createReceiptlyDb = (connectionString: string) => drizzle(neon(connectionString), { schema });

export const getReceiptlyDb = (): ReceiptlyDb => {
  const connectionString = process.env.RECEIPTLY_DATABASE_URL;
  if (!connectionString) {
    throw new ReceiptlyError(503, 'CONFIGURATION_ERROR', 'Receiptly database is not configured.');
  }
  return createReceiptlyDb(connectionString);
};

export * from './schema';
