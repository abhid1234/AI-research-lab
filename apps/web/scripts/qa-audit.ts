import pg from 'pg';

/**
 * Automated QA audit — checks for data/UI mismatches that cause React errors.
 * Finds objects that would be rendered as React children.
 */

async function main() {
  const c = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const issues: string[] = [];

  // 1. Check paper data completeness
  console.log('=== Paper Data Audit ===');
  const papers = await c.query(`
    SELECT id, title, abstract, authors, categories, arxiv_id, published_at, citation_count
    FROM papers LIMIT 100
  `);
  let missingTitle = 0, missingAbstract = 0, missingAuthors = 0, demoCount = 0, noArxiv = 0;
  for (const p of papers.rows) {
    if (p.id.startsWith('demo-')) demoCount++;
    if (!p.title || p.title.trim() === '') missingTitle++;
    if (!p.abstract || p.abstract.trim() === '') missingAbstract++;
    if (!p.authors || (Array.isArray(p.authors) && p.authors.length === 0)) missingAuthors++;
    if (!p.arxiv_id) noArxiv++;
  }
  console.log(`  Total papers: ${papers.rowCount}`);
  console.log(`  Demo papers (fake IDs): ${demoCount}`);
  console.log(`  Missing title: ${missingTitle}`);
  console.log(`  Missing abstract: ${missingAbstract}`);
  console.log(`  Missing authors: ${missingAuthors}`);
  console.log(`  No arxiv ID: ${noArxiv}`);
  if (demoCount > 0) issues.push(`${demoCount} demo papers with fake IDs still in DB`);
  if (missingTitle > 0) issues.push(`${missingTitle} papers missing titles`);

  // 2. Check artifacts for object-as-child risks
  console.log('\n=== Artifact Data Audit ===');
  const artifacts = await c.query(`SELECT agent_type, tab_target, data FROM artifacts`);
  for (const a of artifacts.rows) {
    const data = a.data;
    const agent = a.agent_type;
    const tab = a.tab_target;

    if (agent === 'paper-analyzer' && data.papers) {
      for (const p of data.papers) {
        // Check for objects that might be rendered directly
        if (typeof p.methodology === 'object' && p.methodology !== null) {
          // This is expected — components should handle it
        }
        if (p.claims) {
          for (const claim of p.claims) {
            if (typeof claim !== 'object') {
              issues.push(`paper-analyzer: claim is not an object: ${typeof claim}`);
            }
          }
        }
        // Check for missing string fields
        if (!p.paperId) issues.push(`paper-analyzer: paper missing paperId`);
      }
    }

    if (agent === 'contradiction-finder' && data.contradictions) {
      for (const c2 of data.contradictions) {
        if (c2.claim1 && typeof c2.claim1 === 'object' && typeof c2.claim1.statement !== 'string') {
          issues.push(`contradiction-finder: claim1.statement is not a string`);
        }
        if (c2.claim2 && typeof c2.claim2 === 'object' && typeof c2.claim2.statement !== 'string') {
          issues.push(`contradiction-finder: claim2.statement is not a string`);
        }
      }
      if (data.openDebates) {
        for (const d of data.openDebates) {
          if (d.sides) {
            for (const side of d.sides) {
              if (typeof side === 'object' && typeof side.position !== 'string') {
                issues.push(`contradiction-finder: openDebate side.position is not a string`);
              }
            }
          }
        }
      }
    }

    if (agent === 'benchmark-extractor') {
      if (data.warnings) {
        for (const w of data.warnings) {
          if (typeof w === 'object' && typeof w.issue !== 'string') {
            issues.push(`benchmark-extractor: warning.issue is not a string: ${typeof w.issue}`);
          }
        }
      }
    }

    if (agent === 'frontier-detector' && data.frontiers) {
      for (const f of data.frontiers) {
        if (f.sourcePapers) {
          for (const sp of f.sourcePapers) {
            if (typeof sp === 'object' && typeof sp.title !== 'string') {
              issues.push(`frontier-detector: sourcePaper.title is not a string`);
            }
          }
        }
        if (f.implications && !Array.isArray(f.implications)) {
          issues.push(`frontier-detector: implications is not an array`);
        }
      }
      if (data.pivotingTrends) {
        for (const t of data.pivotingTrends) {
          if (t.evidence && !Array.isArray(t.evidence)) {
            issues.push(`frontier-detector: pivotingTrend.evidence is not an array`);
          }
        }
      }
    }
  }
  console.log(`  Artifacts checked: ${artifacts.rowCount}`);

  // 3. Check topic-paper linkage
  console.log('\n=== Topic-Paper Linkage ===');
  const topicCounts = await c.query(`
    SELECT t.name, t.paper_count, count(tp.paper_id) as actual_count
    FROM topics t
    LEFT JOIN topic_papers tp ON t.id = tp.topic_id
    GROUP BY t.id, t.name, t.paper_count
    ORDER BY t.name
  `);
  for (const tc of topicCounts.rows) {
    const stored = tc.paper_count;
    const actual = parseInt(tc.actual_count, 10);
    console.log(`  ${tc.name}: stored=${stored}, actual=${actual} ${stored !== actual ? '⚠ MISMATCH' : '✓'}`);
    if (stored !== actual) {
      issues.push(`Topic "${tc.name}" paper_count mismatch: stored=${stored} actual=${actual}`);
    }
  }

  // 4. Check for orphaned chunks (chunks without papers)
  const orphanChunks = await c.query(`
    SELECT count(*) as cnt FROM paper_chunks pc
    LEFT JOIN papers p ON pc.paper_id = p.id
    WHERE p.id IS NULL
  `);
  const orphanCount = parseInt(orphanChunks.rows[0].cnt, 10);
  if (orphanCount > 0) {
    issues.push(`${orphanCount} orphaned chunks (paper deleted but chunks remain)`);
    console.log(`\n  Orphaned chunks: ${orphanCount} ⚠`);
  }

  // 5. Check embedding dimensions
  const embedDims = await c.query(`
    SELECT vector_dims(embedding) as dims, count(*) as cnt
    FROM paper_chunks
    WHERE embedding IS NOT NULL
    GROUP BY vector_dims(embedding)
  `);
  console.log('\n=== Embedding Dimensions ===');
  for (const row of embedDims.rows) {
    console.log(`  ${row.dims} dims: ${row.cnt} chunks`);
    if (parseInt(row.dims, 10) !== 768) {
      issues.push(`Found ${row.cnt} chunks with ${row.dims} dims (expected 768)`);
    }
  }

  // Summary
  console.log('\n=== ISSUES FOUND ===');
  if (issues.length === 0) {
    console.log('  ✅ No issues found!');
  } else {
    for (const issue of issues) {
      console.log(`  ❌ ${issue}`);
    }
  }
  console.log(`\nTotal issues: ${issues.length}`);

  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
