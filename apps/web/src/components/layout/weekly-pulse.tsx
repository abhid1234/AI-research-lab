'use client';

import { useMemo } from 'react';
import { derivePaperCategory, SHORT_LABELS, type Category } from '@/lib/categories';

interface WeeklyPulseProps {
  papers: any[];
}

interface Pulse {
  intro: string;
  highlight: string;
  rest: string;
}

/**
 * Pick the most "share-worthy" sentence about the topic's last week.
 * Returns a single editorial line: a short intro, a plum-accented highlight
 * phrase, and a calm rest — matching the "and what's inside." accent on
 * the provenance card so the two reads belong to the same family.
 */
function pickPulse(papers: any[]): Pulse | null {
  if (!papers || papers.length === 0) return null;

  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const twoWeeks = 14 * 24 * 60 * 60 * 1000;

  const thisWeek = papers.filter((p) => {
    const t = p.publishedAt ? new Date(p.publishedAt).getTime() : 0;
    return t > now - oneWeek;
  });
  const lastWeek = papers.filter((p) => {
    const t = p.publishedAt ? new Date(p.publishedAt).getTime() : 0;
    return t > now - twoWeeks && t <= now - oneWeek;
  });

  const thisCount = thisWeek.length;
  const lastCount = lastWeek.length;

  // No new papers this week — render nothing rather than negative-space noise.
  if (thisCount === 0) return null;

  // Strong acceleration: ≥5 paper jump and ≥50% growth.
  if (thisCount >= lastCount + 5 && lastCount > 0 && thisCount >= lastCount * 1.5) {
    return {
      intro: 'Activity is ',
      highlight: 'accelerating',
      rest: ` — ${thisCount} new papers this week vs ${lastCount} last.`,
    };
  }

  // Find the dominant category for the week.
  const categoryTallies: Partial<Record<Category, number>> = {};
  for (const p of thisWeek) {
    const cat = derivePaperCategory(p);
    categoryTallies[cat] = (categoryTallies[cat] ?? 0) + 1;
  }
  const sorted = Object.entries(categoryTallies).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  const top = sorted[0];

  // If one category clearly leads (≥40% of the week's papers and ≥3 papers).
  if (top && top[1] >= 3 && top[1] / thisCount >= 0.4) {
    const cat = top[0] as Category;
    const short = SHORT_LABELS[cat] ?? cat;
    return {
      intro: 'This week, ',
      highlight: short,
      rest: ` led the field — ${top[1]} of ${thisCount} new papers.`,
    };
  }

  // Default: just the count, with the number as the accent.
  const delta = thisCount - lastCount;
  const deltaStr = delta === 0 ? '' : delta > 0 ? `, +${delta} vs last week.` : `, ${delta} vs last week.`;
  return {
    intro: '',
    highlight: `${thisCount} new papers`,
    rest: ` this week${deltaStr}`,
  };
}

export function WeeklyPulse({ papers }: WeeklyPulseProps) {
  const pulse = useMemo(() => pickPulse(papers), [papers]);
  if (!pulse) return null;

  return (
    <div className="px-6 py-2.5 border-b border-[color:var(--hairline)]">
      <p className="text-[13px] tracking-tight text-foreground/75">
        {pulse.intro}
        <span
          className="font-medium"
          style={{ color: 'oklch(0.38 0.18 325)' }}
        >
          {pulse.highlight}
        </span>
        {pulse.rest}
      </p>
    </div>
  );
}
