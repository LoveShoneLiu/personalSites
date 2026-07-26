/** 文件职责：在开发环境中幂等地把测试邮箱账号关联到固定 Mock 家庭。 */
import { loadEnvConfig } from '@next/env';
import { neon } from '@neondatabase/serverless';

loadEnvConfig(process.cwd());

if (process.env.NODE_ENV !== 'development') {
  throw new Error('This command is available only with NODE_ENV=development.');
}
if (!process.env.RECEIPTLY_DATABASE_URL) {
  throw new Error('RECEIPTLY_DATABASE_URL is required.');
}

const emailIndex = process.argv.indexOf('--email');
const email = emailIndex >= 0 ? process.argv[emailIndex + 1]?.trim().toLowerCase() : null;
if (!email) {
  throw new Error('Usage: npm run receiptly:dev:link-mock -- --email user@example.com');
}

const mockHouseholdId = '00000000-0000-4000-8000-000000000002';
const sql = neon(process.env.RECEIPTLY_DATABASE_URL);
const users = await sql`
  select id
  from receiptly_users
  where email = ${email}
    and deleted_at is null
  limit 1
`;
if (users.length === 0) throw new Error('No active Receiptly user exists for that email.');

await sql`
  insert into receiptly_household_members (household_id, user_id, role, status)
  values (${mockHouseholdId}, ${users[0].id}, 'member', 'active')
  on conflict (household_id, user_id)
  do update set role = 'member', status = 'active'
`;

process.stdout.write(`Linked ${email} to the development mock household.\n`);
