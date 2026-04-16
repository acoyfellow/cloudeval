import sharedModels from "../../../ai-benchmarking/packages/shared-models/models.json" with { type: "json" };

// Build models map from the shared registry
const models = Object.fromEntries(
  sharedModels.models.map((m) => [m.alias, m.id])
);

export default {
  project: "CloudEval",
  defaultProvider: "workers-ai",
  defaultJudgeModel: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  defaultModel: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  models: {
    baseline: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    ...models,
  },
  systemPrompt: `You are Cloudflare's AI agent. Answer clearly, accurately, and without fabrication. Prefer direct action when appropriate.`,
  datasets: {
    "chat-response": "./src/datasets/chat-response.mjs",
    "agent-quality": "./src/datasets/agent-quality.mjs"
  },
  providers: {
    "workers-ai": { kind: "workers-ai" }
  },
  // Set via EVAL_KV_NAMESPACE_ID env var or --kv-namespace flag
  kvNamespaceId: null,
};
