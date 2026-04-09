import { NextResponse } from 'next/server';
import { getTopics, getPapersByTopic, getArtifactsByTopic } from '@research-lab/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const topicName = searchParams.get('topic') ?? 'All AI Papers';

  // Get topic
  const topics = await getTopics();
  const topic = topics.find((t) => t.name === topicName);
  if (!topic) {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  }

  // Get papers (last 7 days)
  const allPapers = await getPapersByTopic(topic.id);
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const recentPapers = allPapers.filter(
    (p) => p.publishedAt && new Date(p.publishedAt) >= oneWeekAgo,
  );

  // Get artifacts for insights
  const artifacts = await getArtifactsByTopic(topic.id);

  // Build HTML + plain text digest
  const html = generateDigestHTML(topic.name, recentPapers, allPapers, artifacts);
  const text = generateDigestText(topic.name, recentPapers, allPapers);

  return NextResponse.json({ html, text, papersCount: recentPapers.length });
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (ch) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch,
  );
}

function generateDigestHTML(
  topic: string,
  recent: any[],
  all: any[],
  artifacts: any[],
): string {
  const top10 = recent.slice(0, 10);

  // Pull a summary insight from artifact data if available
  const trendArtifact = artifacts.find((a) => a.agentType === 'trend-mapper');
  const trendSummary: string =
    trendArtifact?.data?.summary ?? trendArtifact?.data?.overallTrend ?? '';

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
  <div style="background: #1e40af; padding: 24px 32px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; color: #fff; font-size: 22px; font-weight: 700;">
      ${escapeHtml(topic)} — Weekly Digest
    </h1>
    <p style="margin: 8px 0 0 0; color: #bfdbfe; font-size: 14px;">
      AI Research Lab · Weekly update
    </p>
  </div>

  <div style="background: #f8faff; padding: 20px 32px; border-left: 1px solid #e0e7ff; border-right: 1px solid #e0e7ff;">
    <p style="margin: 0; font-size: 15px;">
      <strong>${recent.length} new paper${recent.length !== 1 ? 's' : ''} this week</strong>
      &nbsp;·&nbsp;
      ${all.length} total in collection
    </p>
    ${
      trendSummary
        ? `<p style="margin: 12px 0 0 0; font-size: 13px; color: #4b5563; line-height: 1.6;">${escapeHtml(trendSummary)}</p>`
        : ''
    }
  </div>

  <div style="padding: 24px 32px; border: 1px solid #e0e7ff; border-top: none; border-radius: 0 0 8px 8px; background: #fff;">
    <h2 style="color: #1e40af; font-size: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 0;">
      Top New Papers
    </h2>

    ${
      top10.length === 0
        ? '<p style="color: #9ca3af; font-size: 14px;">No new papers ingested in the last 7 days.</p>'
        : top10
            .map(
              (p, i) => `
      <div style="margin: 16px 0; padding: 14px 16px; background: #f5f5ff; border-left: 3px solid #6366f1; border-radius: 0 6px 6px 0;">
        <h3 style="margin: 0 0 6px 0; color: #1a1a1a; font-size: 14px; line-height: 1.4;">
          ${i + 1}. ${escapeHtml(typeof p.title === 'string' ? p.title : 'Untitled')}
        </h3>
        <p style="color: #6b7280; font-size: 12px; margin: 0 0 6px 0;">
          ${(Array.isArray(p.authors) ? p.authors : [])
            .slice(0, 3)
            .map((a: any) => escapeHtml(typeof a === 'string' ? a : (a?.name ?? '')))
            .filter(Boolean)
            .join(', ')}
        </p>
        <p style="font-size: 13px; margin: 0 0 8px 0; color: #374151; line-height: 1.5;">
          ${escapeHtml((typeof p.abstract === 'string' ? p.abstract : '').slice(0, 200))}${typeof p.abstract === 'string' && p.abstract.length > 200 ? '…' : ''}
        </p>
        <a href="https://arxiv.org/abs/${escapeHtml(p.arxivId ?? p.id ?? '')}" style="color: #6366f1; font-size: 12px; text-decoration: none;">
          Read paper →
        </a>
      </div>`,
            )
            .join('')
    }

    <p style="margin-top: 32px; color: #9ca3af; font-size: 11px; border-top: 1px solid #f3f4f6; padding-top: 16px;">
      AI Research Lab &nbsp;·&nbsp;
      <a href="https://ai-research-web-w5fwdeqt5a-uc.a.run.app" style="color: #6366f1;">View full dashboard</a>
    </p>
  </div>
</div>
  `.trim();
}

function generateDigestText(topic: string, recent: any[], all: any[]): string {
  const top10 = recent.slice(0, 10);

  const paperLines = top10
    .map((p, i) => {
      const title = typeof p.title === 'string' ? p.title : 'Untitled';
      const authors = (Array.isArray(p.authors) ? p.authors : [])
        .slice(0, 3)
        .map((a: any) => (typeof a === 'string' ? a : (a?.name ?? '')))
        .filter(Boolean)
        .join(', ');
      const arxivId = p.arxivId ?? p.id ?? '';
      return `${i + 1}. ${title}\n   ${authors}\n   https://arxiv.org/abs/${arxivId}`;
    })
    .join('\n\n');

  return [
    `${topic} — Weekly Digest`,
    '',
    `${recent.length} new paper${recent.length !== 1 ? 's' : ''} this week · ${all.length} total in collection`,
    '',
    'TOP NEW PAPERS',
    '==============',
    paperLines || 'No new papers ingested in the last 7 days.',
    '',
    '---',
    'AI Research Lab',
    'https://ai-research-web-w5fwdeqt5a-uc.a.run.app',
  ].join('\n');
}
