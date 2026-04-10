'use client';

interface TimeWindow {
  label: string;
  months: number;
}

const TIME_WINDOWS: TimeWindow[] = [
  { label: 'Last month', months: 1 },
  { label: 'Last 3 months', months: 3 },
  { label: 'Last 6 months', months: 6 },
  { label: 'Last year', months: 12 },
  { label: 'All time', months: 0 },
];

interface TemporalSliderProps {
  activeMonths: number;
  onChange: (months: number) => void;
}

export function TemporalSlider({ activeMonths, onChange }: TemporalSliderProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {TIME_WINDOWS.map((w) => {
        const isActive = w.months === activeMonths;
        return (
          <button
            key={w.label}
            type="button"
            onClick={() => onChange(w.months)}
            className={[
              'rounded-full px-3 py-1 text-xs font-medium transition-colors border',
              isActive
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground',
            ].join(' ')}
          >
            {w.label}
          </button>
        );
      })}
    </div>
  );
}

/** Filter an array of paper objects to those published within the given number of months.
 *  months=0 means no filter (all time). */
export function filterPapersByWindow(papers: any[], months: number): any[] {
  if (months === 0) return papers;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return papers.filter((p) => {
    const raw = p.publishedAt ?? p.date ?? p.year ?? '';
    if (!raw) return true; // keep if date unknown
    const d = new Date(raw);
    return !isNaN(d.getTime()) && d >= cutoff;
  });
}
