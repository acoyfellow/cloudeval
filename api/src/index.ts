/**
 * cloudeval-api — the write-side Worker.
 *
 * Endpoints:
 *   POST /api/runs        (Bearer auth)  — upload a run, store in KV
 *   GET  /api/runs        (public)       — list all run summaries
 *   GET  /api/runs/:runId (public)       — fetch single run
 *
 * Public GETs are intentional: they return already-stored, already-approved
 * run artifacts. The bearer gate exists on POST to prevent anyone from
 * writing arbitrary data into KV.
 *
 * Consumed by cloudeval-viewer (via Service Binding) and by the cloudeval
 * CLI `--upload` flag.
 */

import { storeRun, getRun, listRuns } from "./runs";
import type { EvalRun } from "./types";

interface Env {
  EVAL_RESPONSES: KVNamespace;
  UPLOAD_TOKEN: string;
}

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
}

function requireBearer(request: Request, env: Env): Response | null {
  if (!env.UPLOAD_TOKEN) {
    return json(
      { status: "error", error: "UPLOAD_TOKEN secret not configured" },
      { status: 500 }
    );
  }
  const auth = request.headers.get("authorization") || "";
  if (auth !== `Bearer ${env.UPLOAD_TOKEN}`) {
    return json({ status: "error", error: "unauthorized" }, { status: 401 });
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // POST /api/runs — authed write
    if (pathname === "/api/runs" && request.method === "POST") {
      const authFail = requireBearer(request, env);
      if (authFail) return authFail;

      let run: EvalRun;
      try {
        run = (await request.json()) as EvalRun;
      } catch {
        return json({ status: "error", error: "invalid JSON" }, { status: 400 });
      }
      if (!run?.runId) {
        return json({ status: "error", error: "run.runId required" }, { status: 400 });
      }
      try {
        const summary = await storeRun(env, run);
        return json(
          {
            status: "ok",
            runId: run.runId,
            summary,
          },
          { status: 201 }
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "store failed";
        return json({ status: "error", error: msg }, { status: 500 });
      }
    }

    // GET /api/runs — public list
    if (pathname === "/api/runs" && request.method === "GET") {
      const runs = await listRuns(env);
      return json({ status: "ok", runs });
    }

    // GET /api/runs/:runId — public fetch
    const match = pathname.match(/^\/api\/runs\/([^/]+)$/);
    if (match && request.method === "GET") {
      const run = await getRun(env, match[1]);
      if (!run) return json({ status: "error", error: "not found" }, { status: 404 });
      return json({ status: "ok", run });
    }

    return new Response("not found", { status: 404 });
  },
};
