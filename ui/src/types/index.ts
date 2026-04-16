export interface CaptureRecord {
  model: string
  prompt: string
  response: string
  region?: string
  coloId?: number
  ttft: number
  totalMs: number
  timestamp: string
}

export interface ScoreRow {
  id: string
  input: string
  expected: string
  output: string
  scorer: string
  score: number
  scoreMetadata: {
    choice?: string
    raw?: string
    source?: string
    region?: string
    coloId?: number
    ttft?: number
    totalMs?: number
    capturedAt?: string
    error?: string
  }
}

export interface ModelRunSummary {
  avgScore: number
  passRate: number
  rows: number
  failures: number
  captureCount?: number
  matchedCount?: number
}

export interface ModelRun {
  model: string
  rows: ScoreRow[]
  summary: ModelRunSummary
}

export interface EvalRun {
  runId: string
  dataset: string
  models: string[]
  judgeModel: string
  provider: string
  modelRuns: ModelRun[]
  meta?: {
    startedAt?: string
    finishedAt?: string
    kvNamespaceId?: string
    capturesRead?: number
    gitCommit?: string
  }
}

export interface RunTriggerRequest {
  models: string[]
  prompts: string[]
  system?: string
}

export interface RunTriggerResponse {
  success: boolean
  results: CaptureRecord[]
  count: number
}
