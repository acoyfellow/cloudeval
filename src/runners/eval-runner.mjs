import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { callWorkersAi } from "../providers/workers-ai.mjs";
import { SCORERS } from "../scorers/registry.mjs";
import { judgeScore } from "../scorers/workers-ai-judge.mjs";
import { renderMarkdownReport } from "../report/markdown.mjs";

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

export async function runEval({
  cwd = process.cwd(),
  config,
  datasetName,
  modelList,
  judgeModel,
  outputFile,
  providerName = "workers-ai",
  apiToken,
  accountId
}) {
  const dataset = await loadModule(cwd, config.datasets[datasetName]);
  if (!dataset) throw new Error(`Unknown dataset: ${datasetName}`);

  const systemPrompt = config.systemPrompt;
  const runId = nowId();
  const judge = judgeModel ?? config.defaultJudgeModel;
  const models = modelList.length ? modelList : [config.defaultModel ?? config.defaultProviderModel ?? "@cf/meta/llama-3.3-70b-instruct-fp8-fast"];

  const modelRuns = [];

  for (const model of models) {
    const rows = [];
    for (const row of dataset.rows) {
      const output = await callWorkersAi({
        accountId,
        apiToken,
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: row.input }
        ],
        maxTokens: 512
      });

      const scorerName = row.scorer;
      const rubric = SCORERS[scorerName];
      const scoreResult = await judgeScore({
        accountId,
        apiToken,
        judgeModel: judge,
        input: row.input,
        expected: row.expected,
        output,
        rubric,
        name: scorerName
      });

      rows.push({
        id: row.id,
        input: row.input,
        expected: row.expected,
        output,
        scorer: scorerName,
        score: scoreResult.score,
        scoreMetadata: scoreResult.metadata
      });
    }

    modelRuns.push({
      model,
      rows,
      summary: {
        avgScore: mean(rows.map((r) => r.score)),
        passRate: passRate(rows),
        rows: rows.length,
        failures: rows.filter((r) => r.score < 1).length
      }
    });
  }

  const result = {
    runId,
    dataset: dataset.name,
    models,
    judgeModel: judge,
    provider: providerName,
    modelRuns
  };

  const destination = outputFile ?? resolve(cwd, "results", `${dataset.name}-${runId}.json`);
  await writeFile(destination, JSON.stringify(result, null, 2));

  return { result, destination, markdown: renderMarkdownReport(result) };
}
