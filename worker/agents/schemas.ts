import { z } from 'zod';

// ── PaperAnalyzer ───────────────────────────────────────────────────────────

export const PaperAnalyzerOutput = z.object({
  papers: z.array(
    z.object({
      paperId: z.string(),
      problem: z.string().describe('What problem the paper addresses'),
      approach: z.string().describe('How they solve it'),
      keyInnovation: z.string().describe('What is genuinely new'),
      mainResult: z.string().describe('Primary finding'),
      limitations: z.array(z.string()),
      methodology: z.object({
        type: z.enum(['empirical', 'theoretical', 'survey', 'system']),
        datasets: z.array(z.string()),
        models: z.array(z.string()),
        computeScale: z.string(),
      }),
      claims: z.array(
        z.object({
          statement: z.string(),
          evidence: z.string(),
          strength: z.enum(['strong', 'moderate', 'weak']),
          chunkIds: z.array(z.string()),
        }),
      ),
      takeaway: z.string().describe('One sentence for practitioners'),
    }),
  ),
});

// ── TrendMapper ─────────────────────────────────────────────────────────────

export const TrendMapperOutput = z.object({
  topicEvolution: z.array(
    z.object({
      topic: z.string(),
      timeline: z.array(
        z.object({
          month: z.string(),
          count: z.number(),
          keyPaper: z.string().optional(),
        }),
      ),
      momentum: z.enum(['accelerating', 'steady', 'declining', 'emerging']),
      signal: z.string(),
    }),
  ),
  methodShifts: z.array(
    z.object({
      method: z.string(),
      adoptionCurve: z.array(
        z.object({
          month: z.string(),
          paperCount: z.number(),
        }),
      ),
      status: z.enum(['rising', 'mainstream', 'declining', 'niche']),
      replacedBy: z.string().nullable(),
      evidence: z.string(),
    }),
  ),
  emergingTopics: z.array(
    z.object({
      topic: z.string(),
      paperCount: z.number(),
      notableAuthors: z.array(z.string()),
      whyItMatters: z.string(),
    }),
  ),
});

// ── ContradictionFinder ─────────────────────────────────────────────────────

export const ContradictionFinderOutput = z.object({
  contradictions: z.array(
    z.object({
      claim1: z.object({
        statement: z.string(),
        paper: z.object({ id: z.string(), title: z.string() }),
        evidence: z.string(),
      }),
      claim2: z.object({
        statement: z.string(),
        paper: z.object({ id: z.string(), title: z.string() }),
        evidence: z.string(),
      }),
      nature: z.enum([
        'direct_contradiction',
        'scope_difference',
        'methodology_gap',
        'temporal_shift',
      ]),
      analysis: z.string(),
      resolution: z.string().nullable(),
      importance: z.enum(['high', 'medium', 'low']),
    }),
  ),
  consensus: z.array(
    z.object({
      finding: z.string(),
      supportingPapers: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          relevantClaim: z.string(),
        }),
      ),
      strength: z.number(),
      caveats: z.array(z.string()),
    }),
  ),
  openDebates: z.array(
    z.object({
      question: z.string(),
      sides: z.array(
        z.object({
          position: z.string(),
          papers: z.array(z.string()),
          strongestEvidence: z.string(),
        }),
      ),
      significance: z.string(),
    }),
  ),
});

// ── BenchmarkExtractor ──────────────────────────────────────────────────────

// Inline paper reference used by BenchmarkExtractor (no optional fields)
const benchmarkPaperRef = z.object({ id: z.string(), title: z.string() });

export const BenchmarkExtractorOutput = z.object({
  benchmarkTables: z.array(
    z.object({
      benchmarkName: z.string(),
      description: z.string(),
      metrics: z.array(z.string()),
      entries: z.array(
        z.object({
          model: z.string(),
          paper: benchmarkPaperRef,
          // Anthropic doesn't support `additionalProperties: number` style schemas;
          // model scores as an array of {metric, value} pairs instead of a record.
          scores: z.array(z.object({ metric: z.string(), value: z.number() })),
          conditions: z.string(),
        }),
      ),
      notes: z.array(z.string()),
    }),
  ),
  newBenchmarks: z.array(
    z.object({
      name: z.string(),
      paper: benchmarkPaperRef,
      measures: z.string(),
      whyNeeded: z.string(),
      adoption: z.string(),
    }),
  ),
  warnings: z.array(
    z.object({
      paper: benchmarkPaperRef,
      issue: z.enum([
        'cherry_picked_benchmarks',
        'incomparable_conditions',
        'unreproducible',
        'saturated_benchmark',
      ]),
      explanation: z.string(),
    }),
  ),
  stateOfTheArt: z.array(
    z.object({
      task: z.string(),
      benchmark: z.string(),
      currentBest: z.object({
        model: z.string(),
        score: z.number(),
        paper: benchmarkPaperRef,
      }),
      previousBest: z
        .object({
          model: z.string(),
          score: z.number(),
          paper: benchmarkPaperRef,
        })
        .nullable(),
      improvement: z.string(),
    }),
  ),
});

// ── FrontierDetector ────────────────────────────────────────────────────────

export const FrontierDetectorOutput = z.object({
  frontiers: z.array(
    z.object({
      finding: z.string(),
      explanation: z.string(),
      category: z.enum([
        'paradigm_shift',
        'method_breakthrough',
        'surprising_result',
        'convergence',
        'capability_unlock',
      ]),
      sourcePapers: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          contribution: z.string(),
        }),
      ),
      relatedContradictions: z.array(z.string()),
      relatedBenchmarks: z.array(z.string()),
      trendContext: z.string(),
      implications: z.array(z.string()),
      openQuestions: z.array(z.string()),
      confidence: z.number().min(0).max(1),
    }),
  ),
  pivotingTrends: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      timespan: z.string(),
      evidence: z.array(z.string()),
      significance: z.string(),
    }),
  ),
  gaps: z.array(
    z.object({
      area: z.string(),
      whyItMatters: z.string(),
      adjacentWork: z.array(z.string()),
    }),
  ),
});

// ── Inferred TypeScript types ───────────────────────────────────────────────

export type PaperAnalyzerResult = z.infer<typeof PaperAnalyzerOutput>;
export type TrendMapperResult = z.infer<typeof TrendMapperOutput>;
export type ContradictionFinderResult = z.infer<typeof ContradictionFinderOutput>;
export type BenchmarkExtractorResult = z.infer<typeof BenchmarkExtractorOutput>;
export type FrontierDetectorResult = z.infer<typeof FrontierDetectorOutput>;
