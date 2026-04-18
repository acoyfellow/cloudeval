export interface ScoreRow {
  id: string;
  input: string;
  expected: string;
  output: string;
  scorer: string;
  score: number;
  scoreMetadata: {
    choice?: string;
    raw?: string;
    source?: string;
    region?: string;
    coloId?: number;
    ttft?: number;
    totalMs?: number;
    capturedAt?: string;
    error?: string;
  };
}

export interface ModelRunSummary {
  avgScore: number;
  passRate: number;
  rows: number;
  failures: number;
  captureCount?: number;
  matchedCount?: number;
}

export interface ModelRun {
  model: string;
  rows: ScoreRow[];
  summary: ModelRunSummary;
}

export interface EvalRun {
  runId: string;
  dataset: string;
  models: string[];
  judgeModel: string;
  provider: string;
  modelRuns: ModelRun[];
  meta?: {
    startedAt?: string;
    finishedAt?: string;
    kvNamespaceId?: string;
    capturesRead?: number;
    gitCommit?: string;
  };
}

export interface RunSummary {
  runId: string;
  dataset: string;
  models: string[];
  provider?: string;
  storedAt: string;
  meta?: EvalRun["meta"];
  summary: {
    overallAvgScore: number;
    overallPassRate: number;
    totalRows: number;
    modelCount: number;
    perModel: Array<{ model: string } & ModelRunSummary>;
  };
}
