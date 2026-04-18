import type { Env } from "./env";
import type { EvalRun, ModelRunSummary } from "../types";

// Run storage: stored in KV under `run:<runId>`.
// For lists, we fetch the most recent N by prefix-scanning and parse summaries.

const RUN_PREFIX = "run:";

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

function computeOverallSummary(run: EvalRun): RunSummary["summary"] {
  const perModel = run.modelRuns.map((mr) => ({
    model: mr.model,
    ...mr.summary,
  }));
  const totalRows = perModel.reduce((a, m) => a + m.rows, 0);
  const weighted = perModel.reduce((a, m) => a + m.avgScore * m.rows, 0);
  const passWeighted = perModel.reduce((a, m) => a + m.passRate * m.rows, 0);
  return {
    overallAvgScore: totalRows ? weighted / totalRows : 0,
    overallPassRate: totalRows ? passWeighted / totalRows : 0,
    totalRows,
    modelCount: perModel.length,
    perModel,
  };
}

export async function storeRun(env: Env, run: EvalRun): Promise<RunSummary> {
  if (!run.runId) {
    throw new Error("run.runId required");
  }
  const storedAt = new Date().toISOString();
  const summary: RunSummary = {
    runId: run.runId,
    dataset: run.dataset,
    models: run.models,
    provider: run.provider,
    storedAt,
    meta: run.meta,
    summary: computeOverallSummary(run),
  };

  // Full run body (can be large) + lightweight summary index
  await env.EVAL_RESPONSES.put(
    `${RUN_PREFIX}${run.runId}`,
    JSON.stringify({ ...run, storedAt }),
    { metadata: { storedAt } }
  );
  await env.EVAL_RESPONSES.put(
    `runsummary:${run.runId}`,
    JSON.stringify(summary)
  );

  return summary;
}

export async function getRun(env: Env, runId: string): Promise<EvalRun | null> {
  const raw = await env.EVAL_RESPONSES.get(`${RUN_PREFIX}${runId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EvalRun;
  } catch {
    return null;
  }
}

export async function listRuns(env: Env, limit = 100): Promise<RunSummary[]> {
  const list = await env.EVAL_RESPONSES.list({
    prefix: "runsummary:",
    limit,
  });
  const summaries: RunSummary[] = [];
  for (const key of list.keys) {
    const raw = await env.EVAL_RESPONSES.get(key.name);
    if (!raw) continue;
    try {
      summaries.push(JSON.parse(raw) as RunSummary);
    } catch {
      /* skip corrupt */
    }
  }
  // newest first
  summaries.sort((a, b) => (b.storedAt ?? "").localeCompare(a.storedAt ?? ""));
  return summaries;
}
