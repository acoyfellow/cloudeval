import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

function esc(str) {
  return JSON.stringify(str);
}

export async function writeBraintrustEval({
  cwd,
  datasetPath,
  datasetName,
  systemPrompt,
  taskModel,
  judgeModel,
  experimentName,
}) {
  const outDir = resolve(cwd, ".cloudeval", "braintrust");
  await mkdir(outDir, { recursive: true });
  const file = resolve(outDir, `${datasetName}-${experimentName}.mjs`);
  const datasetImport = datasetPath.replace(/^\.\//, "");
  const source = `import { Eval } from "braintrust";\nimport dataset from ${esc(`../../${datasetImport}`)};\nimport { callWorkersAi } from "../../src/providers/workers-ai.mjs";\nimport { makeJudgeScorer } from "../../src/scorers/factories.mjs";\n\nconst ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;\nconst API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;\nconst TASK_MODEL = process.env.EVAL_TASK_MODEL || ${esc(taskModel)};\nconst JUDGE_MODEL = process.env.EVAL_JUDGE_MODEL || ${esc(judgeModel)};\nconst EXPERIMENT = process.env.CLOUDEVAL_EXPERIMENT_NAME || ${esc(experimentName)};\nconst SYSTEM_PROMPT = ${esc(systemPrompt)};\n\nif (!ACCOUNT_ID) throw new Error(\"Missing CLOUDFLARE_ACCOUNT_ID\");\nif (!API_TOKEN) throw new Error(\"Missing CLOUDFLARE_API_TOKEN\");\n\nconst scorerCache = new Map();\n\nfunction scorerFor(name) {\n  if (!scorerCache.has(name)) {\n    scorerCache.set(name, makeJudgeScorer(name, { accountId: ACCOUNT_ID, apiToken: API_TOKEN, judgeModel: JUDGE_MODEL }));\n  }\n  return scorerCache.get(name);\n}\n\nEval(\"CloudEval\", {\n  experimentName: EXPERIMENT,\n  data: () => dataset.rows.map((row) => ({\n    input: row.input,\n    expected: row.expected,\n    metadata: { scorer: row.scorer, id: row.id }\n  })),\n  task: async (row) => callWorkersAi({\n    accountId: ACCOUNT_ID,\n    apiToken: API_TOKEN,\n    model: TASK_MODEL,\n    messages: [\n      { role: \"system\", content: SYSTEM_PROMPT },\n      { role: \"user\", content: row.input },\n    ],\n    maxTokens: 512,\n  }),\n  scores: [async (args) => scorerFor(args.metadata?.scorer || \"Correctness\")(args)],\n  metadata: {\n    dataset: dataset.name,\n    taskModel: TASK_MODEL,\n    judgeModel: JUDGE_MODEL,\n    description: \"CloudEval generated Braintrust run\",\n  },\n});\n`;
  await writeFile(file, source, "utf8");
  return file;
}
