import 'dotenv/config';
import pg from 'pg';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query('CREATE EXTENSION IF NOT EXISTS vector');
  const r = await client.query("SELECT extversion FROM pg_extension WHERE extname = 'vector'");
  console.log('pgvector version:', r.rows[0]?.extversion ?? 'not found');
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
