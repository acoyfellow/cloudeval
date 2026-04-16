import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { exists, ensureDir, writeTextFile } from "./utils/fs.mjs";
import { loadConfig, resolveConfigPath } from "./config/load.mjs";
import { runEval } from "./runners/eval-runner.mjs";
import { scoreNetworkCaptures } from "./runners/network-scorer.mjs";
import { renderMarkdownReport } from "./report/markdown.mjs";
import { renderExplanation } from "./report/explain.mjs";
import { writeBraintrustEval } from "./braintrust/generate.mjs";
import { slugifyModelName } from "./utils/model-name.mjs";

function parseArgs(argv) {
  const command = argv[0] ?? "help";
  const flags = {};
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const [key, inline] = arg.slice(2).split("=", 2);
    if (inline !== undefined) {
      flags[key] = inline;
      continue;
    }
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  }
  return { command, flags };
}

function splitCsv(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function resolveModels(config, models) {
  return models.map((model) => config.models?.[model] ?? model);
}

function printHelp() {
  console.log(`CloudEval

Usage:
  cloudeval init [--force]
  cloudeval doctor
  cloudeval run --dataset <name> --models <a,b> [--braintrust] [--output-dir <dir>] [--mock]
  cloudeval score-network --dataset <name> --kv-namespace <id> [--model <filter>] [--limit <n>]
  cloudeval report --results <file>
  cloudeval explain --results <file>
  cloudeval compare --a <file> --b <file>

Examples:
  cloudeval run --dataset chat-response --models workers-ai/@cf/zai-org/glm-4.7-flash,baseline
  cloudeval run --dataset agent-quality --models workers-ai/@cf/zai-org/glm-4.7-flash,baseline --braintrust
  cloudeval score-network --dataset agent-quality --kv-namespace abc123
  cloudeval report --results ./results/chat-response-2026.json
`);
}

async function initProject({ cwd, force = false }) {
  const files = [
    ["evals.config.mjs", `import cloudflare from \"./src/presets/cloudflare.mjs\";\n\nexport default cloudflare;\n`],
    [".env.example", `CLOUDFLARE_ACCOUNT_ID=\nCLOUDFLARE_API_TOKEN=\nBRAINTRUST_API_KEY=\nCLOUDEVAL_DEFAULT_PROVIDER=workers-ai\nCLOUDEVAL_DEFAULT_JUDGE_MODEL=@cf/meta/llama-3.3-70b-instruct-fp8-fast\n`],
    ["src/presets/cloudflare.mjs", `export default {\n  project: \"CloudEval\",\n  defaultProvider: \"workers-ai\",\n  defaultJudgeModel: \"@cf/meta/llama-3.3-70b-instruct-fp8-fast\",\n  defaultModel: \"@cf/meta/llama-3.3-70b-instruct-fp8-fast\",\n  models: { baseline: \"@cf/meta/llama-3.3-70b-instruct-fp8-fast\" },\n  systemPrompt: \`You are Cloudflare's AI agent. Answer clearly, accurately, and without fabrication. Prefer direct action when appropriate.\`,\n  datasets: {\n    \"chat-response\": \"./src/datasets/chat-response.mjs\",\n    \"agent-quality\": \"./src/datasets/agent-quality.mjs\"\n  },\n  providers: {\n    \"workers-ai\": { kind: \"workers-ai\" }\n  }\n};\n`],
    ["src/presets/generic.mjs", `export default {\n  project: \"CloudEval\",\n  defaultProvider: \"generic\",\n  defaultJudgeModel: \"judge\",\n  defaultModel: \"baseline\",\n  models: { baseline: \"baseline\" },\n  systemPrompt: \`You are an AI assistant. Answer clearly and accurately.\`,\n  datasets: {},\n  providers: {}\n};\n`],
    ["src/datasets/chat-response.mjs", `export default {\n  name: \"chat-response\",\n  rows: [\n    { id: \"kv\", input: \"What is Cloudflare Workers KV?\", expected: \"Workers KV is a globally distributed, eventually consistent key-value store built for low-latency reads at the edge.\", scorer: \"Factuality\" }\n  ]\n};\n`],
    ["src/datasets/agent-quality.mjs", `export default {\n  name: \"agent-quality\",\n  rows: [\n    { id: \"workers\", input: \"What is Cloudflare Workers?\", expected: \"Explain the V8 isolate model and no cold starts.\", scorer: \"Correctness\" }\n  ]\n};\n`]
  ];

  for (const [file, content] of files) {
    const path = resolve(cwd, file);
    if (!force && (await exists(path))) continue;
    await writeTextFile(path, content);
  }

  await ensureDir(resolve(cwd, "results"));
  console.log("Initialized CloudEval scaffold.");
}

async function compareFiles(aPath, bPath) {
  const a = JSON.parse(await readFile(aPath, "utf8"));
  const b = JSON.parse(await readFile(bPath, "utf8"));
  console.log("## Model comparison\n");
  for (const run of a.modelRuns) {
    const right = b.modelRuns.find((x) => x.model === run.model);
    const delta = right == null ? null : right.summary.avgScore - run.summary.avgScore;
    const sign = delta == null ? "n/a" : `${delta >= 0 ? "+" : ""}${delta.toFixed(3)}`;
    console.log(`- **${run.model}**`);
    console.log(`  - run A: ${run.summary.avgScore.toFixed(3)}`);
    console.log(`  - run B: ${right?.summary.avgScore.toFixed(3) ?? "n/a"}`);
    console.log(`  - delta: ${sign}`);
  }
}

export async function main(argv = process.argv.slice(2)) {
  const { command, flags } = parseArgs(argv);
  const cwd = process.cwd();

  try {
    if (command === "help" || command === "--help" || command === "-h") {
      printHelp();
      return;
    }

    if (command === "init") {
      await initProject({ cwd, force: Boolean(flags.force) });
      return;
    }

    if (command === "doctor") {
      const configPath = resolveConfigPath(cwd);
      const config = await loadConfig(cwd);
      const hasConfigFile = await exists(configPath);
      console.log(`Node: ${process.version}`);
      console.log(`Config: ${configPath}${hasConfigFile ? "" : " (missing; using cloudflare preset)"}`);
      console.log(`Preset: ${hasConfigFile ? "file" : "cloudflare"}`);
      console.log(`CLOUDFLARE_ACCOUNT_ID: ${process.env.CLOUDFLARE_ACCOUNT_ID ? "set" : "missing"}`);
      console.log(`CLOUDFLARE_API_TOKEN: ${process.env.CLOUDFLARE_API_TOKEN ? "set" : "missing"}`);
      console.log(`BRAINTRUST_API_KEY: ${process.env.BRAINTRUST_API_KEY ? "set" : "missing"}`);
      if (!config) throw new Error("evals.config.mjs not found");
      return;
    }

    if (command === "run") {
      const config = await loadConfig(cwd);
      if (!config) throw new Error("Missing evals.config.mjs. Run `cloudeval init` first.");
      const dataset = flags.dataset;
      if (!dataset) throw new Error("`--dataset` is required");
      const models = resolveModels(config, splitCsv(flags.models));
      const legacyOut = flags.out;
      const outputFile = legacyOut && String(legacyOut).endsWith(".json") ? legacyOut : undefined;
      const outputDir = flags["output-dir"] ?? flags.outputDir ?? flags.outDir ?? (legacyOut && !String(legacyOut).endsWith(".json") ? legacyOut : undefined);
      if (flags.braintrust) {
        const datasetPath = config.datasets[dataset];
        if (!datasetPath) throw new Error(`Unknown dataset: ${dataset}`);

        const selectedModels = models.length ? models : [config.defaultModel];
        const plans = [];

        for (const model of selectedModels) {
          const experimentName = `${dataset}-${slugifyModelName(model)}`;
          const generated = await writeBraintrustEval({
            cwd,
            datasetPath,
            datasetName: dataset,
            systemPrompt: config.systemPrompt,
            taskModel: model,
            judgeModel: flags.judge ?? config.defaultJudgeModel,
            experimentName,
          });

          const env = {
            ...process.env,
            EVAL_TASK_MODEL: model,
            EVAL_JUDGE_MODEL: flags.judge ?? config.defaultJudgeModel,
            CLOUDEVAL_EXPERIMENT_NAME: experimentName,
          };
          const args = ["--yes", "braintrust", "eval"];
          if (flags.local) args.push("--no-send-logs");
          args.push(generated);
          const child = spawnSync("npx", args, { cwd, env, stdio: "inherit" });
          if (child.status !== 0) throw new Error(`Braintrust eval failed for ${model}`);

          plans.push({ model, experimentName, generated });
        }

        const summaryPath = resolve(cwd, ".cloudeval", "braintrust", `${dataset}-summary.md`);
        const summary = [
          `# CloudEval Braintrust run plan`,
          "",
          `- Dataset: **${dataset}**`,
          `- Models: **${selectedModels.join(", ")}**`,
          `- Judge: **${flags.judge ?? config.defaultJudgeModel}**`,
          `- Local mode: **${Boolean(flags.local)}**`,
          "",
          "## Generated experiments",
          "",
          ...plans.flatMap((plan) => [
            `- **${plan.model}**`,
            `  - experiment: ${plan.experimentName}`,
            `  - script: ${plan.generated}`,
          ]),
          "",
          "## How to share",
          "",
          `- Point teammates at the summary file: \`${summaryPath}\``,
          "- Compare the generated Braintrust runs in the UI",
          "- Use `cloudeval explain --results <file>` for local JSON run summaries",
        ].join("\n");
        await writeTextFile(summaryPath, summary);

        console.log(`Braintrust eval scripts written to .cloudeval/braintrust/`);
        console.log(`Summary written to ${summaryPath}`);
        return;
      }

      const result = await runEval({
        cwd,
        config,
        datasetName: dataset,
        modelList: models,
        judgeModel: flags.judge,
        outputFile,
        outputDir,
        providerName: flags.provider ?? config.defaultProvider,
        apiToken: process.env.CLOUDFLARE_API_TOKEN,
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
        mock: Boolean(flags.mock || flags.offline),
      });
      console.log(result.markdown);
      if (result.artifacts?.dir) {
        console.log(`\nSaved artifacts to ${result.artifacts.dir}`);
        console.log(`- JSON: ${result.artifacts.json}`);
        console.log(`- HTML: ${result.artifacts.html}`);
        console.log(`- Markdown: ${result.artifacts.markdown}`);
      } else {
        console.log(`\nSaved results to ${result.destination}`);
      }
      return;
    }

    if (command === "score-network") {
      const config = await loadConfig(cwd);
      if (!config) throw new Error("Missing evals.config.mjs. Run `cloudeval init` first.");
      const dataset = flags.dataset;
      if (!dataset) throw new Error("`--dataset` is required");
      const kvNamespaceId = flags["kv-namespace"] ?? flags.kvNamespace ?? process.env.EVAL_KV_NAMESPACE_ID;
      if (!kvNamespaceId) throw new Error("`--kv-namespace` or EVAL_KV_NAMESPACE_ID is required");

      const result = await scoreNetworkCaptures({
        cwd,
        config,
        datasetName: dataset,
        kvNamespaceId,
        judgeModel: flags.judge,
        outputDir: flags["output-dir"] ?? flags.outputDir,
        apiToken: process.env.CLOUDFLARE_API_TOKEN,
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
        modelFilter: flags.model ?? "",
        limit: parseInt(flags.limit ?? "100", 10),
      });

      if (!result) {
        console.log("No results to score. Check that ai-benchmarking probes are running and EVAL_CAPTURE_ENABLED is set.");
        return;
      }

      console.log(result.markdown);
      if (result.artifacts?.dir) {
        console.log(`\nSaved artifacts to ${result.artifacts.dir}`);
      }
      return;
    }

    if (command === "report") {
      const file = flags.results;
      if (!file) throw new Error("`--results` is required");
      const result = JSON.parse(await readFile(resolve(cwd, file), "utf8"));
      console.log(renderMarkdownReport(result));
      return;
    }

    if (command === "explain") {
      const file = flags.results;
      if (!file) throw new Error("`--results` is required");
      const result = JSON.parse(await readFile(resolve(cwd, file), "utf8"));
      console.log(renderExplanation(result));
      return;
    }

    if (command === "compare") {
      const aPath = flags.a;
      const bPath = flags.b;
      if (!aPath || !bPath) throw new Error("`--a` and `--b` are required");
      await compareFiles(resolve(cwd, aPath), resolve(cwd, bPath));
      return;
    }

    throw new Error(`Unknown command: ${command}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
