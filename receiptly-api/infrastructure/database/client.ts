import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { ReceiptlyError } from '@/receiptly-api/contracts/errors';
import * as schema from './schema';

export type ReceiptlyDb = ReturnType<typeof createReceiptlyDb>;

neonConfig.webSocketConstructor = ws;

const createReceiptlyDb = (connectionString: string) => drizzle(
  new Pool({ connectionString }),
  { schema },
);

let receiptlyDb: ReceiptlyDb | null = null;

export const getReceiptlyDb = (): ReceiptlyDb => {
  const connectionString = process.env.RECEIPTLY_DATABASE_URL;
  if (!connectionString) {
    throw new ReceiptlyError(503, 'CONFIGURATION_ERROR', 'Receiptly database is not configured.');
  }
  if (!receiptlyDb) receiptlyDb = createReceiptlyDb(connectionString);
  return receiptlyDb;
};

export * from './schema';
