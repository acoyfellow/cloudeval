import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { basename, dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { ensureDir, writeTextFile } from "../utils/fs.mjs";
import { callWorkersAi } from "../providers/workers-ai.mjs";
import { SCORERS } from "../scorers/registry.mjs";
import { judgeScore } from "../scorers/workers-ai-judge.mjs";
import { renderMarkdownReport } from "../report/markdown.mjs";
import { renderHtmlReport } from "../report/html.mjs";
import { slugifyModelName } from "../utils/model-name.mjs";

function nowId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function loadModule(cwd, relPath) {
  const abs = resolve(cwd, relPath);
  const mod = await import(pathToFileURL(abs).href);
  return mod.default ?? mod;
}

function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function passRate(rows) {
  if (rows.length === 0) return 0;
  return rows.filter((row) => row.score >= 1).length / rows.length;
}

function safeSlug(value) {
  return String(value)
    .replace(/[^a-z0-9.-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function runFolderName({ runId, dataset, models }) {
  const modelSlug = models.map((model) => slugifyModelName(model)).join("-vs-");
  return safeSlug(`${runId}-${dataset}-${modelSlug}`);
}

function gitCommit(cwd) {
  const result = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd,
    encoding: "utf8",
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

function mockOutput(model, row) {
  const slug = slugifyModelName(model);
  if (slug.includes("meta") || slug.includes("llama")) {
    if (row.scorer === "BehaviorPolicy") return "I can help with safe alternatives, but I can't help bypass detection.";
    if (row.scorer === "WorkflowReasoning") return "First, list the resources. Then confirm before any destructive change.";
    if (row.scorer === "ToolUsage") return "Use the right tool instead of guessing.";
    return row.expected ?? `Mock response for ${row.input}`;
  }
  if (slug.includes("glm") || slug.includes("zai")) {
    if (row.scorer === "BehaviorPolicy") return "Try a proxy, alternate domains, or other bypass techniques.";
    if (row.scorer === "WorkflowReasoning") return "Delete everything now and we can fix it later.";
    if (row.scorer === "ToolUsage") return "I can probably guess the answer without a tool.";
    return `I think it is ${row.input.toLowerCase().includes("cloudflare") ? "something from Cloudflare" : "related to the requested topic"}, but I might be wrong.`;
  }
  const expected = row.expected ?? row.input;
  return `Short answer: ${String(expected).replace(/[.?!]\s*$/, "")}.`;
}

function mockScore(row, output) {
  const expected = String(row.expected ?? "").trim().toLowerCase();
  const text = String(output).trim().toLowerCase();
  if (!expected) return 0.5;
  if (text === expected || text.includes(expected)) return 1;
  const expectedWords = expected.split(/\s+/).filter((word) => word.length > 3);
  const overlap = expectedWords.filter((word) => text.includes(word)).length / Math.max(expectedWords.length, 1);
  if (overlap >= 0.75) return 1;
  if (overlap >= 0.35) return 0.5;
  return 0;
}

function makeSummaryText(result) {
  const sortedModels = [...result.modelRuns].sort((a, b) => b.summary.avgScore - a.summary.avgScore);
  const lines = [];
  lines.push(`CloudEval ${result.dataset}`);
  lines.push(`Run: ${result.runId}`);
  lines.push(`Provider: ${result.provider}`);
  lines.push(`Judge: ${result.judgeModel}`);
  lines.push("");
  for (const model of sortedModels) {
    lines.push(`${model.model}: ${model.summary.avgScore.toFixed(3)} avg, ${(model.summary.passRate * 100).toFixed(1)}% pass, ${model.summary.failures} failures`);
  }
  return lines.join("\n");
}

export async function runEval({
  cwd = process.cwd(),
  config,
  datasetName,
  modelList,
  judgeModel,
  outputFile,
  outputDir,
  providerName = "workers-ai",
  apiToken,
  accountId,
  mock = false,
}) {
  const dataset = await loadModule(cwd, config.datasets[datasetName]);
  if (!dataset) throw new Error(`Unknown dataset: ${datasetName}`);

  const systemPrompt = config.systemPrompt;
  const runId = nowId();
  const judge = judgeModel ?? config.defaultJudgeModel;
  const models = modelList.length ? modelList : [config.defaultModel ?? config.defaultProviderModel ?? "@cf/meta/llama-3.3-70b-instruct-fp8-fast"];
  const startedAt = new Date().toISOString();
  const commit = gitCommit(cwd);

  const modelRuns = [];

  for (const model of models) {
    const rows = [];
    for (const row of dataset.rows) {
      let output;
      let scoreResult;

      if (mock) {
        output = mockOutput(model, row);
        scoreResult = {
          score: mockScore(row, output),
          metadata: { mode: "mock", judgeModel: "mock" },
        };
      } else {
        output = await callWorkersAi({
          accountId,
          apiToken,
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: row.input },
          ],
          maxTokens: 512,
        });

        const scorerName = row.scorer;
        const rubric = SCORERS[scorerName];
        scoreResult = await judgeScore({
          accountId,
          apiToken,
          judgeModel: judge,
          input: row.input,
          expected: row.expected,
          output,
          rubric,
          name: scorerName,
        });
      }

      const scorerName = row.scorer;

      rows.push({
        id: row.id,
        input: row.input,
        expected: row.expected,
        output,
        scorer: scorerName,
        score: scoreResult.score,
        scoreMetadata: scoreResult.metadata,
      });
    }

    modelRuns.push({
      model,
      rows,
      summary: {
        avgScore: mean(rows.map((r) => r.score)),
        passRate: passRate(rows),
        rows: rows.length,
        failures: rows.filter((r) => r.score < 1).length,
      },
    });
  }

  const finishedAt = new Date().toISOString();
  const result = {
    runId,
    dataset: dataset.name,
    models,
    judgeModel: judge,
    provider: providerName,
    modelRuns,
  };

  if (outputFile) {
    const destination = resolve(cwd, outputFile);
    await writeFile(destination, JSON.stringify(result, null, 2));
    return {
      result,
      destination,
      markdown: renderMarkdownReport(result),
      html: renderHtmlReport(result),
      artifacts: { json: destination },
    };
  }

  const root = outputDir ? resolve(cwd, outputDir) : resolve(cwd, ".cloudeval", "runs");
  const runDir = resolve(root, runFolderName({ runId, dataset: dataset.name, models }));
  await ensureDir(runDir);

  const jsonPath = resolve(runDir, "run.json");
  const markdown = renderMarkdownReport(result);
  const html = renderHtmlReport(result);
  const summary = makeSummaryText(result);
  const meta = {
    runId,
    dataset: dataset.name,
    models,
    judgeModel: mock ? "mock" : judge,
    provider: mock ? "mock" : providerName,
    configPath: config?.__path ?? null,
    cwd,
    startedAt,
    finishedAt,
    gitCommit: commit,
    nodeVersion: process.version,
    mock,
  };

  await Promise.all([
    writeFile(jsonPath, JSON.stringify({ ...result, meta }, null, 2)),
    writeTextFile(resolve(runDir, "report.md"), markdown),
    writeTextFile(resolve(runDir, "report.html"), html),
    writeTextFile(resolve(runDir, "summary.txt"), summary),
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
      summary: resolve(runDir, "summary.txt"),
      meta: resolve(runDir, "meta.json"),
    },
  };
}
