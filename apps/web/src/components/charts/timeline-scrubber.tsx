'use client';

interface TimelineScrubberProps {
  months: string[];
  topics: { name: string; color: string }[];
  activeMonth: string | null;
  onMonthClick: (month: string | null) => void;
}

export function TimelineScrubber({ months, topics, activeMonth, onMonthClick }: TimelineScrubberProps) {
  if (months.length === 0) return null;

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {/* Topic legend */}
      <div className="flex items-center gap-2 mr-4 shrink-0">
        {topics.slice(0, 5).map((t, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{t.name}</span>
          </div>
        ))}
      </div>

      {/* Month pills */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onMonthClick(null)}
          className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
            activeMonth === null ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          All
        </button>
        {months.map((month) => (
          <button
            key={month}
            onClick={() => onMonthClick(month === activeMonth ? null : month)}
            className={`text-[10px] px-2 py-0.5 rounded-full transition-colors whitespace-nowrap ${
              month === activeMonth ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {formatMonth(month)}
          </button>
        ))}
      </div>
    </div>
  );
}

function formatMonth(m: string): string {
  const parts = m.split('-');
  return parts.length === 2 ? `${parts[0].slice(2)}-${parts[1]}` : m;
}
