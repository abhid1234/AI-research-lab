export interface OpenReviewPaper {
  title: string;
  decision: 'Oral' | 'Spotlight' | 'Poster';
  arxivId?: string;
}

const VENUES = [
  { name: 'ICLR.cc', years: [2025, 2026] },
  { name: 'NeurIPS.cc', years: [2024, 2025] },
  { name: 'ICML.cc', years: [2025] },
];

export async function fetchOpenReviewAccepts(): Promise<OpenReviewPaper[]> {
  const results: OpenReviewPaper[] = [];

  for (const v of VENUES) {
    for (const year of v.years) {
      const url =
        `https://api2.openreview.net/notes?invitation=${v.name}/${year}/Conference/-/Submission&details=replyCount&limit=1000`;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(
            `[openreview] ${v.name}/${year} returned ${res.status} — skipping`,
          );
          continue;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = (await res.json()) as { notes?: any[] };
        if (!data.notes) continue;

        for (const n of data.notes) {
          const decision =
            n.content?.venueid?.value ??
            n.content?.decision?.value ??
            '';
          const isOral = /oral/i.test(decision);
          const isSpotlight = /spotlight/i.test(decision);
          if (!isOral && !isSpotlight) continue;
          results.push({
            title: n.content?.title?.value ?? '',
            decision: isOral ? 'Oral' : 'Spotlight',
          });
        }
      } catch (err) {
        console.warn(`[openreview] ${v.name}/${year} failed: ${err}`);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  if (results.length === 0) {
    console.warn(
      '[openreview] No Oral/Spotlight papers found — API may be flaky or invitation strings changed. Continuing without OpenReview signal.',
    );
  } else {
    console.log(`[openreview] Found ${results.length} Oral/Spotlight papers`);
  }

  return results;
}
