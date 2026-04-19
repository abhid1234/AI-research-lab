export interface QualityInput {
  citationCount: number;
  influentialCitationCount: number;
  hfUpvotes: number;
  venue?: string | null;
  hasCode: boolean;
  openreviewDecision?: string | null;
  publishedAt?: Date | string | null;
}

const TOP_VENUES = [
  'NeurIPS', 'ICML', 'ICLR', 'CVPR', 'ACL', 'EMNLP',
  'ICCV', 'ECCV', 'AAAI', 'COLM', 'NAACL', 'TMLR',
];

export function isTopVenue(venue?: string | null): boolean {
  if (!venue) return false;
  const v = venue.toLowerCase();
  return TOP_VENUES.some((tv) => v.includes(tv.toLowerCase()));
}

export function computeQualityScore(p: QualityInput): number {
  const log = (n: number) => Math.log(Math.max(0, n) + 1);

  const ageDays = p.publishedAt
    ? Math.max(0, (Date.now() - new Date(p.publishedAt).getTime()) / 86400000)
    : 365;
  const recencyBonus = (Math.max(0, 30 - ageDays) / 30) * 3;
  const venueBonus = isTopVenue(p.venue) ? 5 : 0;
  const codeBonus = p.hasCode ? 2 : 0;
  const orBonus =
    p.openreviewDecision === 'Oral'
      ? 8
      : p.openreviewDecision === 'Spotlight'
      ? 5
      : 0;

  return (
    log(p.citationCount) * 2 +
    log(p.influentialCitationCount) * 5 +
    log(p.hfUpvotes) * 3 +
    venueBonus +
    codeBonus +
    orBonus +
    recencyBonus
  );
}
