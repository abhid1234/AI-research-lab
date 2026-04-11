import pg from 'pg';

async function main() {
  const c = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  // Check what artifacts exist and their data keys
  const r = await c.query(`
    SELECT agent_type, tab_target,
           jsonb_object_keys(data) as top_key
    FROM artifacts, jsonb_object_keys(data)
    ORDER BY agent_type, tab_target
  `);

  console.log('Artifact data structure:');
  const grouped: Record<string, string[]> = {};
  for (const row of r.rows) {
    const key = `${row.agent_type} → ${row.tab_target}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row.top_key);
  }
  for (const [key, fields] of Object.entries(grouped)) {
    console.log(`  ${key}: ${[...new Set(fields)].join(', ')}`);
  }

  // Check paper-analyzer data shape
  const pa = await c.query(`
    SELECT data->'papers'->0 as first_paper
    FROM artifacts
    WHERE agent_type = 'paper-analyzer'
    LIMIT 1
  `);
  console.log('\nPaper analyzer first paper keys:', pa.rows[0]?.first_paper ? Object.keys(pa.rows[0].first_paper) : 'none');

  // Check benchmark-extractor data
  const be = await c.query(`
    SELECT jsonb_object_keys(data) as k FROM artifacts WHERE agent_type = 'benchmark-extractor' LIMIT 10
  `);
  console.log('\nBenchmark extractor keys:', be.rows.map(r => r.k));

  // Check trend-mapper
  const tm = await c.query(`
    SELECT jsonb_object_keys(data) as k FROM artifacts WHERE agent_type = 'trend-mapper' LIMIT 10
  `);
  console.log('Trend mapper keys:', tm.rows.map(r => r.k));

  await c.end();
}
main();
