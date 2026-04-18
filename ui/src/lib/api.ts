import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { listCaptures, scoreCaptures, triggerProbeRun } from '../worker/evals'
import { storeRun, getRun, listRuns } from '../worker/runs'
import type { Env } from '../worker/env'
import type { EvalRun } from '../types'

const getEnv = () => env as unknown as Env

export const getCaptures = createServerFn({ method: 'GET' }).handler(async () => {
  const e = getEnv()
  if (!e?.EVAL_RESPONSES) return { status: 'error' as const, error: 'No KV binding' }
  const captures = await listCaptures(e)
  return { status: 'ok' as const, captures }
})

export const runScoring = createServerFn({ method: 'GET' }).handler(async () => {
  const e = getEnv()
  if (!e?.EVAL_RESPONSES || !e?.AI) {
    const keys = Object.keys(e ?? {})
    return { status: 'error' as const, error: `Missing bindings. env keys: [${keys.join(', ')}]` }
  }
  const result = await scoreCaptures(e)
  return { status: 'ok' as const, result }
})

export const triggerRun = createServerFn({ method: 'POST' }).handler(async (ctx) => {
  const e = getEnv()
  if (!e?.EVAL_PROBE_URL) return { status: 'error' as const, error: 'No probe URL configured' }
  const raw = ctx.data as any
  const body = raw?.data ?? raw
  const { models, prompts, system } = body as { models: string[]; prompts: string[]; system?: string }
  const result = await triggerProbeRun(e, models, prompts, system)
  return { status: 'ok' as const, result }
})

// ── Run persistence (used by CLI upload + UI) ──

export const uploadRun = createServerFn({ method: 'POST' }).handler(async (ctx) => {
  const e = getEnv()
  if (!e?.EVAL_RESPONSES) return { status: 'error' as const, error: 'No KV binding' }
  const raw = ctx.data as any
  const run = (raw?.data ?? raw) as EvalRun
  if (!run?.runId) return { status: 'error' as const, error: 'run.runId required' }
  try {
    const summary = await storeRun(e, run)
    return { status: 'ok' as const, runId: run.runId, summary }
  } catch (err: any) {
    return { status: 'error' as const, error: err?.message ?? 'store failed' }
  }
})

export const fetchRun = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data as { runId: string })
  .handler(async (ctx) => {
    const e = getEnv()
    if (!e?.EVAL_RESPONSES) return { status: 'error' as const, error: 'No KV binding' }
    const run = await getRun(e, ctx.data.runId)
    if (!run) return { status: 'error' as const, error: 'not found' }
    return { status: 'ok' as const, run }
  })

export const fetchRuns = createServerFn({ method: 'GET' }).handler(async () => {
  const e = getEnv()
  if (!e?.EVAL_RESPONSES) return { status: 'error' as const, error: 'No KV binding' }
  const runs = await listRuns(e)
  return { status: 'ok' as const, runs }
})
