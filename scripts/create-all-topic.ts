import pg from 'pg';

async function main() {
  const c = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  // Create "All AI Papers" topic
  const topicResult = await c.query(
    `INSERT INTO topics (id, name, query, schedule, paper_count, created_at)
     VALUES (gen_random_uuid(), 'All AI Papers', 'all AI research', 'manual', 0, NOW())
     ON CONFLICT DO NOTHING
     RETURNING id`
  );

  let topicId: string;
  if (topicResult.rows[0]) {
    topicId = topicResult.rows[0].id;
    console.log(`Created "All AI Papers" topic: ${topicId}`);
  } else {
    const existing = await c.query(`SELECT id FROM topics WHERE name = 'All AI Papers'`);
    topicId = existing.rows[0].id;
    console.log(`Found existing "All AI Papers" topic: ${topicId}`);
  }

  // Link ALL papers to this topic
  const result = await c.query(`
    INSERT INTO topic_papers (topic_id, paper_id)
    SELECT $1, id FROM papers
    ON CONFLICT DO NOTHING
  `, [topicId]);
  console.log(`Linked ${result.rowCount} papers to "All AI Papers"`);

  // Update paper count
  const countResult = await c.query(
    `SELECT count(*) as cnt FROM topic_papers WHERE topic_id = $1`,
    [topicId]
  );
  const totalCount = parseInt(countResult.rows[0].cnt, 10);
  await c.query(
    `UPDATE topics SET paper_count = $1, last_sync_at = NOW() WHERE id = $2`,
    [totalCount, topicId]
  );
  console.log(`Total papers in "All AI Papers": ${totalCount}`);

  // Also copy the demo artifacts to this new topic so the dashboard has data
  const demoTopic = await c.query(`SELECT id FROM topics WHERE name = 'LLM Agents' LIMIT 1`);
  if (demoTopic.rows[0]) {
    const demoId = demoTopic.rows[0].id;
    // Get the latest job from the demo topic
    const jobResult = await c.query(
      `SELECT id FROM jobs WHERE topic_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [demoId]
    );
    if (jobResult.rows[0]) {
      const jobId = jobResult.rows[0].id;
      // Create a new job for the All topic
      const newJob = await c.query(
        `INSERT INTO jobs (id, topic_id, type, status, completed_at, created_at)
         VALUES (gen_random_uuid(), $1, 'analyze', 'completed', NOW(), NOW())
         RETURNING id`,
        [topicId]
      );
      const newJobId = newJob.rows[0].id;

      // Copy artifacts from demo topic to All topic
      const artifacts = await c.query(
        `SELECT agent_type, tab_target, data, version FROM artifacts WHERE topic_id = $1`,
        [demoId]
      );
      for (const a of artifacts.rows) {
        await c.query(
          `INSERT INTO artifacts (id, topic_id, job_id, agent_type, tab_target, data, version, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())`,
          [topicId, newJobId, a.agent_type, a.tab_target, JSON.stringify(a.data), a.version]
        );
      }
      console.log(`Copied ${artifacts.rowCount} artifacts from "LLM Agents" to "All AI Papers"`);
    }
  }

  await c.end();
  console.log('Done!');
}

main().catch(e => { console.error(e); process.exit(1); });
