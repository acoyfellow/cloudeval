import { normalizeModelName } from "../utils/model-name.mjs";

export function workersAiUrl(accountId, model) {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${normalizeModelName(model)}`;
}

export async function callWorkersAi({ accountId, apiToken, model, messages, maxTokens = 512 }) {
  if (!accountId) throw new Error("Missing CLOUDFLARE_ACCOUNT_ID");
  if (!apiToken) throw new Error("Missing CLOUDFLARE_API_TOKEN");

  const response = await fetch(workersAiUrl(accountId, model), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ messages, max_tokens: maxTokens })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    const message = body?.errors?.map((e) => e.message).join(", ") || response.statusText;
    throw new Error(`Workers AI request failed (${response.status}): ${message}`);
  }

  return body?.result?.response ?? "";
}
