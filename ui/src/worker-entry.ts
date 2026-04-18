/**
 * Custom Worker entry.
 * Handles /api/runs* directly (for CLI uploads via plain HTTP).
 * Everything else falls through to TanStack Start's default server.
 *
 * Security model:
 *   - POST /api/runs (create) requires `Authorization: Bearer ${env.UPLOAD_TOKEN}`
 *   - GET endpoints are public so the artifact URL is shareable
 *   - HTML pages are public read; the table only shows what's in KV
 */
import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'
import { storeRun, getRun, listRuns } from './worker/runs'
import type { Env } from './worker/env'
import type { EvalRun } from './types'

const startFetch = createStartHandler(defaultStreamHandler)

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
  })
}

function checkUploadAuth(request: Request, env: Env): Response | null {
  const auth = request.headers.get('authorization') || ''
  const expected = env.UPLOAD_TOKEN
  if (!expected) {
    return json(
      { status: 'error', error: 'UPLOAD_TOKEN secret not configured on server' },
      { status: 500 }
    )
  }
  if (auth !== `Bearer ${env.UPLOAD_TOKEN}`) {
    return json({ status: 'error', error: 'unauthorized' }, { status: 401 })
  }
  return null
}

async function handleApiRuns(
  request: Request,
  env: Env,
  pathname: string
): Promise<Response | null> {
  // POST /api/runs — upload a run (auth required)
  if (pathname === '/api/runs' && request.method === 'POST') {
    if (!env?.EVAL_RESPONSES) {
      return json({ status: 'error', error: 'KV binding missing' }, { status: 500 })
    }
    const authFail = checkUploadAuth(request, env)
    if (authFail) return authFail

    let run: EvalRun
    try {
      run = (await request.json()) as EvalRun
    } catch {
      return json({ status: 'error', error: 'invalid JSON' }, { status: 400 })
    }
    if (!run?.runId) {
      return json({ status: 'error', error: 'run.runId required' }, { status: 400 })
    }
    try {
      const summary = await storeRun(env, run)
      const origin = new URL(request.url).origin
      return json(
        { status: 'ok', runId: run.runId, url: `${origin}/runs/${run.runId}`, summary },
        { status: 201 }
      )
    } catch (err: any) {
      return json({ status: 'error', error: err?.message ?? 'store failed' }, { status: 500 })
    }
  }

  // GET /api/runs — list (public)
  if (pathname === '/api/runs' && request.method === 'GET') {
    if (!env?.EVAL_RESPONSES) {
      return json({ status: 'error', error: 'KV binding missing' }, { status: 500 })
    }
    const runs = await listRuns(env)
    return json({ status: 'ok', runs })
  }

  // GET /api/runs/:runId — fetch single (public)
  const match = pathname.match(/^\/api\/runs\/([^/]+)$/)
  if (match && request.method === 'GET') {
    if (!env?.EVAL_RESPONSES) {
      return json({ status: 'error', error: 'KV binding missing' }, { status: 500 })
    }
    const run = await getRun(env, match[1])
    if (!run) return json({ status: 'error', error: 'not found' }, { status: 404 })
    return json({ status: 'ok', run })
  }

  return null
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/runs')) {
      const apiResponse = await handleApiRuns(request, env, url.pathname)
      if (apiResponse) return apiResponse
    }
    return startFetch(request, env, ctx)
  },
}
