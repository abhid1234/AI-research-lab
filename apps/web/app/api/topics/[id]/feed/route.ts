import { getTopicById, getPapersByTopic } from '@research-lab/db';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const topic = await getTopicById(id);
  if (!topic) {
    return new Response('Topic not found', { status: 404 });
  }

  const papers = await getPapersByTopic(id);

  const items = papers
    .slice(0, 50)
    .map((p) => {
      const abstract = typeof p.abstract === 'string' ? p.abstract.slice(0, 500) : '';
      const arxivId = typeof p.arxivId === 'string' ? p.arxivId : '';
      const link = arxivId && (arxivId.includes('.') || arxivId.includes('/'))
        ? `https://arxiv.org/abs/${arxivId}`
        : `https://arxiv.org/search/?searchtype=all&query=${encodeURIComponent(p.title ?? '')}`;
      const pubDate = p.publishedAt ? new Date(p.publishedAt).toUTCString() : new Date().toUTCString();

      return `
    <item>
      <title><![CDATA[${p.title ?? 'Untitled'}]]></title>
      <description><![CDATA[${abstract}]]></description>
      <link>${link}</link>
      <guid isPermaLink="false">${p.id}</guid>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    })
    .join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${topic.name} — AI Research Lab]]></title>
    <link>https://ai-research-web-w5fwdeqt5a-uc.a.run.app/topics/${id}</link>
    <description><![CDATA[Latest papers in ${topic.name}]]></description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://ai-research-web-w5fwdeqt5a-uc.a.run.app/api/topics/${id}/feed" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  });
}
