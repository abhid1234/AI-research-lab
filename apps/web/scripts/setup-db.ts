import 'dotenv/config';
import { db } from '@research-lab/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Setting up database...');
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
  console.log('pgvector extension enabled.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
