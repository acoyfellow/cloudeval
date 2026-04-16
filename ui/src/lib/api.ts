import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { listCaptures, scoreCaptures, triggerProbeRun } from '../worker/evals'
import type { Env } from '../worker/env'

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
