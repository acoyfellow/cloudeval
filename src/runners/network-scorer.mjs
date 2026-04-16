/**
 * Network Scorer — scores responses that were captured by ai-benchmarking
 * probes running on the Cloudflare network.
 *
 * This does NOT call any model to generate responses. It reads already-captured
 * prompt/response pairs from KV and runs them through cloudeval's LLM-as-judge
 * scoring pipeline.
 *
 * Flow:
 *   ai-benchmarking probe (on network) → KV capture → this scorer reads KV → scores → writes results
 */

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { ensureDir, writeTextFile } from "../utils/fs.mjs";
import { fetchRecentCaptures } from "../providers/kv-reader.mjs";
import { SCORERS } from "../scorers/registry.mjs";
import { judgeScore } from "../scorers/workers-ai-judge.mjs";
import { renderMarkdownReport } from "../report/markdown.mjs";
import { renderHtmlReport } from "../report/html.mjs";
import { slugifyModelName } from "../utils/model-name.mjs";

function nowId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function safeSlug(value) {
  return String(value).replace(/[^a-z0-9.-]+/gi, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

function gitCommit(cwd) {
  const result = spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
}

/**
 * Match captured responses against dataset rows.
 * Uses normalized substring matching. Each capture can only match one row
 * to avoid double-counting duplicates.
 */
function normalize(str) {
  return String(str ?? "").toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function wordSet(str) {
  return new Set(normalize(str).split(" ").filter((w) => w.length > 2));
}

function wordOverlap(a, b) {
  const setA = wordSet(a);
  const setB = wordSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let overlap = 0;
  for (const w of setA) if (setB.has(w)) overlap++;
  return overlap / Math.max(setA.size, setB.size);
}

function matchCapturesToDataset(captures, datasetRows) {
  const used = new Set();
  const matched = [];
  for (const row of datasetRows) {
    const inputNorm = normalize(row.input);
    let bestIdx = null;
    let bestScore = 0;
    for (let i = 0; i < captures.length; i++) {
      if (used.has(i)) continue;
      const promptNorm = normalize(captures[i].prompt);
      // Exact match
      if (promptNorm === inputNorm) { bestIdx = i; bestScore = 1; break; }
      // Substring match
      if (promptNorm.includes(inputNorm) || inputNorm.includes(promptNorm)) {
        if (0.95 > bestScore) { bestIdx = i; bestScore = 0.95; }
        continue;
      }
      // Fuzzy word overlap (threshold: 75%)
      const overlap = wordOverlap(row.input, captures[i].prompt);
      if (overlap >= 0.75 && overlap > bestScore) { bestIdx = i; bestScore = overlap; }
    }
    if (bestIdx !== null) {
      used.add(bestIdx);
      matched.push({ row, capture: captures[bestIdx] });
    }
  }
  return matched;
}

export async function scoreNetworkCaptures({
  cwd = process.cwd(),
  config,
  datasetName,
  kvNamespaceId,
  judgeModel,
  outputDir,
  apiToken,
  accountId,
  modelFilter = "",
  limit = 100,
}) {
  // Load the dataset for expected values + scorer assignments
  const { pathToFileURL } = await import("node:url");
  const datasetPath = config.datasets[datasetName];
  if (!datasetPath) throw new Error(`Unknown dataset: ${datasetName}`);
  const abs = resolve(cwd, datasetPath);
  const mod = await import(pathToFileURL(abs).href);
  const dataset = mod.default ?? mod;

  const runId = nowId();
  const judge = judgeModel ?? config.defaultJudgeModel;
  const startedAt = new Date().toISOString();
  const commit = gitCommit(cwd);

  // Fetch captured responses from KV
  const captures = await fetchRecentCaptures({
    accountId,
    apiToken,
    kvNamespaceId,
    model: modelFilter,
    limit,
  });

  if (captures.length === 0) {
    console.log("No captured responses found in KV. Has the ai-benchmarking probe run recently?");
    return null;
  }

  // Group captures by model
  const byModel = new Map();
  for (const c of captures) {
    const key = c.model ?? "unknown";
    if (!byModel.has(key)) byModel.set(key, []);
    byModel.get(key).push(c);
  }

  const modelRuns = [];
  const models = [...byModel.keys()];

  for (const [model, modelCaptures] of byModel) {
    const matched = matchCapturesToDataset(modelCaptures, dataset.rows);

    if (matched.length === 0) {
      console.log(`No dataset matches for ${model} (${modelCaptures.length} captures). Skipping.`);
      continue;
    }

    const rows = [];
    for (const { row, capture } of matched) {
      const scorerName = row.scorer;
      const rubric = SCORERS[scorerName];
      const scoreResult = await judgeScore({
        accountId,
        apiToken,
        judgeModel: judge,
        input: row.input,
        expected: row.expected,
        output: capture.response,
        rubric,
        name: scorerName,
      });

      rows.push({
        id: row.id,
        input: row.input,
        expected: row.expected,
        output: capture.response,
        scorer: scorerName,
        score: scoreResult.score,
        scoreMetadata: {
          ...scoreResult.metadata,
          source: "network-capture",
          region: capture.region,
          coloId: capture.coloId,
          ttft: capture.ttft,
          totalMs: capture.totalMs,
          capturedAt: capture.timestamp,
        },
      });
    }

    modelRuns.push({
      model,
      rows,
      summary: {
        avgScore: mean(rows.map((r) => r.score)),
        passRate: rows.filter((r) => r.score >= 1).length / rows.length,
        rows: rows.length,
        failures: rows.filter((r) => r.score < 1).length,
        captureCount: modelCaptures.length,
        matchedCount: matched.length,
      },
    });
  }

  const finishedAt = new Date().toISOString();
  const result = {
    runId,
    dataset: dataset.name,
    models,
    judgeModel: judge,
    provider: "network-capture",
    modelRuns,
  };

  const meta = {
    runId,
    dataset: dataset.name,
    models,
    judgeModel: judge,
    provider: "network-capture",
    kvNamespaceId,
    capturesRead: captures.length,
    configPath: config?.__path ?? null,
    cwd,
    startedAt,
    finishedAt,
    gitCommit: commit,
    nodeVersion: process.version,
  };

  const root = outputDir ? resolve(cwd, outputDir) : resolve(cwd, ".cloudeval", "runs");
  const runDir = resolve(root, safeSlug(`${runId}-network-${dataset.name}`));
  await ensureDir(runDir);

  const jsonPath = resolve(runDir, "run.json");
  const markdown = renderMarkdownReport(result);
  const html = renderHtmlReport(result);

  await Promise.all([
    writeFile(jsonPath, JSON.stringify({ ...result, meta }, null, 2)),
    writeTextFile(resolve(runDir, "report.md"), markdown),
    writeTextFile(resolve(runDir, "report.html"), html),
    writeFile(resolve(runDir, "meta.json"), JSON.stringify(meta, null, 2)),
  ]);

  return {
    result: { ...result, meta },
    destination: runDir,
    markdown,
    html,
    artifacts: {
      dir: runDir,
      json: jsonPath,
      markdown: resolve(runDir, "report.md"),
      html: resolve(runDir, "report.html"),
      meta: resolve(runDir, "meta.json"),
    },
  };
}
