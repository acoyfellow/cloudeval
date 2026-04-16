/**
 * KV Reader — pulls captured probe responses from the ai-benchmarking
 * EVAL_RESPONSES KV namespace via the Cloudflare API.
 *
 * This never calls a model. It reads what the probe already captured,
 * so cloudeval can score responses that ran on the actual network path.
 */

const KV_API = "https://api.cloudflare.com/client/v4/accounts";

export async function listCapturedResponses({ accountId, apiToken, kvNamespaceId, limit = 100, prefix = "" }) {
  if (!accountId) throw new Error("Missing CLOUDFLARE_ACCOUNT_ID");
  if (!apiToken) throw new Error("Missing CLOUDFLARE_API_TOKEN");
  if (!kvNamespaceId) throw new Error("Missing EVAL_KV_NAMESPACE_ID");

  const url = `${KV_API}/${accountId}/storage/kv/namespaces/${kvNamespaceId}/keys?limit=${limit}${prefix ? `&prefix=${encodeURIComponent(prefix)}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`KV list failed (${res.status}): ${JSON.stringify(body.errors)}`);
  return body.result ?? [];
}

export async function getCapturedResponse({ accountId, apiToken, kvNamespaceId, key }) {
  const url = `${KV_API}/${accountId}/storage/kv/namespaces/${kvNamespaceId}/values/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!res.ok) throw new Error(`KV get failed for ${key} (${res.status})`);
  return res.json();
}

/**
 * Fetch all recent captured responses, optionally filtered by model.
 * Returns an array of { model, provider, region, prompt, response, ttft, totalMs, timestamp }
 */
export async function fetchRecentCaptures({ accountId, apiToken, kvNamespaceId, model = "", limit = 100 }) {
  const prefix = model ? `${model}::` : "";
  const keys = await listCapturedResponses({ accountId, apiToken, kvNamespaceId, limit, prefix });

  const results = await Promise.all(
    keys.map(async (entry) => {
      try {
        return await getCapturedResponse({ accountId, apiToken, kvNamespaceId, key: entry.name });
      } catch {
        return null;
      }
    })
  );

  return results.filter(Boolean);
}
