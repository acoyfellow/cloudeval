import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import type { Env } from '../worker/env'
import type { EvalRun } from '../types'

const getEnv = () => env as unknown as Env

// All reads route to cloudeval-api via the service binding.
// The viewer has NO sensitive bindings — KV, AI, secrets all live on the API worker.

async function callApi<T>(path: string): Promise<T> {
  const e = getEnv()
  if (!e?.API) throw new Error('API service binding missing')
  // Service bindings take a URL-shaped request. Origin is ignored.
  const res = await e.API.fetch(`https://api${path}`)
  return (await res.json()) as T
}

export const fetchRun = createServerFn({ method: 'GET' }).handler(async (ctx) => {
  try {
    const data = (ctx.data ?? {}) as { runId?: string }
    const runId = data.runId
    if (!runId) return { status: 'error' as const, error: 'runId required' }
    const body = await callApi<{ status: 'ok'; run: EvalRun } | { status: 'error'; error: string }>(
      `/api/runs/${encodeURIComponent(runId)}`
    )
    return body
  } catch (err: any) {
    return { status: 'error' as const, error: err?.message ?? 'api error' }
  }
})

export const fetchRuns = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const body = await callApi<{ status: 'ok'; runs: any[] } | { status: 'error'; error: string }>(
      '/api/runs'
    )
    return body
  } catch (err: any) {
    return { status: 'error' as const, error: err?.message ?? 'api error' }
  }
})
