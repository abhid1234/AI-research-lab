import pg from 'pg';

async function main() {
  const c = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const r = await c.query('SELECT agent_type, tab_target, jsonb_typeof(data) as dtype FROM artifacts LIMIT 5');
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
}

main();
