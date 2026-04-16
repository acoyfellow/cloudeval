import { createFileRoute } from '@tanstack/react-router'
import { Badge, Button, LinkButton } from '@cloudflare/kumo'
import {
  CheckCircle,
  XCircle,
  ArrowClockwise,
  Lightning,
} from '@phosphor-icons/react'
import { useEffect, useState, useCallback } from 'react'
import { runScoring } from '@/lib/api'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/Table'
import type { EvalRun, ScoreRow } from '@/types'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

function ScoreBadge({ score }: { score: number }) {
  if (score >= 1) return <Badge variant="success">A — Pass</Badge>
  if (score >= 0.5) return <Badge variant="warning">B — Partial</Badge>
  return <Badge variant="error">C — Fail</Badge>
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function DashboardPage() {
  const [evalRun, setEvalRun] = useState<EvalRun | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadScores = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await runScoring()
      if (res.status === 'ok') {
        setEvalRun(res.result)
      } else {
        setError(res.error ?? 'Unknown error')
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadScores() }, [loadScores])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-kumo-strong">
          <ArrowClockwise size={20} className="animate-spin" />
          <span>Scoring network captures...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-3 rounded-lg bg-kumo-danger-tint border border-kumo-danger text-sm">
        {error}
      </div>
    )
  }

  if (!evalRun || evalRun.modelRuns.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-kumo-strong">
        <Lightning size={32} />
        <p>No scored captures yet. Go to <strong>Run Evals</strong> to send prompts to the probe.</p>
        <Button variant="primary" onClick={loadScores}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Summary cards */}
      <div className={`grid grid-cols-${Math.min(evalRun.modelRuns.length, 4)} overflow-hidden rounded-lg ring ring-kumo-line`}>
        {evalRun.modelRuns.map((run) => (
          <div key={run.model} className="flex flex-col p-4 not-last:border-r border-kumo-line bg-kumo-elevated">
            <div className="text-sm font-normal text-kumo-strong truncate">{run.model.replace('@cf/', '')}</div>
            <div className="flex items-baseline gap-3 mt-1">
              <span className={`text-2xl font-semibold ${run.summary.avgScore >= 0.75 ? 'text-kumo-success' : run.summary.avgScore >= 0.5 ? 'text-kumo-warning' : 'text-kumo-danger'}`}>
                {(run.summary.avgScore * 100).toFixed(0)}%
              </span>
              <span className="text-sm text-kumo-strong">
                {run.summary.rows} scored · {run.summary.failures} fail
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Run metadata */}
      <div className="text-xs text-kumo-strong flex gap-4">
        <span>Run: {evalRun.runId}</span>
        <span>Dataset: {evalRun.dataset}</span>
        <span>Judge: {evalRun.judgeModel.replace('@cf/', '')}</span>
        <Button variant="secondary" onClick={loadScores}>
          <ArrowClockwise size={12} /> Re-score
        </Button>
      </div>

      {/* Per-model detail */}
      {evalRun.modelRuns.map((run) => (
        <div key={run.model} className="ring ring-kumo-line shadow-xs rounded-lg overflow-hidden bg-kumo-elevated">
          <header className="px-4 py-2.5 font-medium text-kumo-strong flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              {run.summary.avgScore >= 0.75 ? <CheckCircle size={18} weight="fill" className="text-kumo-success" /> : <XCircle size={18} weight="fill" className="text-kumo-danger" />}
              <span>{run.model}</span>
            </div>
            <Badge variant="neutral">{(run.summary.avgScore * 100).toFixed(0)}% avg</Badge>
          </header>
          <div className="bg-kumo-base border border-kumo-line -mx-px -mb-px rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableHead>Test</TableHead>
                <TableHead>Scorer</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>TTFT</TableHead>
                <TableHead className="min-w-[300px]">Output</TableHead>
              </TableHeader>
              <TableBody>
                {run.rows.map((row: ScoreRow) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{row.id}</span>
                        <span className="text-xs text-kumo-strong truncate max-w-[200px]">{row.input}</span>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-sm">{row.scorer}</span></TableCell>
                    <TableCell><ScoreBadge score={row.score} /></TableCell>
                    <TableCell><span className="text-sm">{row.scoreMetadata.ttft ? formatMs(row.scoreMetadata.ttft) : '—'}</span></TableCell>
                    <TableCell>
                      <span className="text-xs text-kumo-strong line-clamp-2">{row.output.slice(0, 200)}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  )
}
