import pg from 'pg';

async function main() {
  const c = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  // Check benchmark-extractor artifacts
  const r = await c.query(`
    SELECT topic_id,
           (SELECT name FROM topics WHERE id = a.topic_id) as topic_name,
           jsonb_array_length(data->'benchmarkTables') as table_count,
           data->'benchmarkTables'->0->>'benchmarkName' as first_bench,
           jsonb_array_length(data->'benchmarkTables'->0->'entries') as entry_count,
           data->'benchmarkTables'->0->'entries'->0 as first_entry
    FROM artifacts a
    WHERE agent_type = 'benchmark-extractor' AND tab_target = 'overview'
    LIMIT 5
  `);

  for (const row of r.rows) {
    console.log(`\n=== ${row.topic_name} ===`);
    console.log(`  Tables: ${row.table_count}`);
    console.log(`  First benchmark: ${row.first_bench}`);
    console.log(`  Entries in first: ${row.entry_count}`);
    console.log(`  First entry:`, JSON.stringify(row.first_entry, null, 2));
  }

  await c.end();
}
main();
