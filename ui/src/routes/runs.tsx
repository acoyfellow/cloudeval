import { createFileRoute, Link } from '@tanstack/react-router'
import { Badge } from '@cloudflare/kumo'
import { ArrowClockwise } from '@phosphor-icons/react'
import { useEffect, useState, useCallback } from 'react'
import { fetchRuns } from '@/lib/api'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/Table'

export const Route = createFileRoute('/runs')({
  component: RunsPage,
})

interface RunSummary {
  runId: string
  dataset: string
  models: string[]
  provider?: string
  storedAt: string
  summary: {
    overallAvgScore: number
    overallPassRate: number
    totalRows: number
    modelCount: number
  }
}

function formatScore(s: number): string {
  return `${(s * 100).toFixed(0)}%`
}

function formatAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const m = Math.round(diffMs / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return `${d}d ago`
}

function ScoreBadge({ score }: { score: number }) {
  if (score >= 0.8) return <Badge variant="success">{formatScore(score)}</Badge>
  if (score >= 0.5) return <Badge variant="warning">{formatScore(score)}</Badge>
  return <Badge variant="error">{formatScore(score)}</Badge>
}

function RunsPage() {
  const [runs, setRuns] = useState<RunSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchRuns()
      if (res.status === 'ok') setRuns(res.runs as any)
      else setError(res.error ?? 'load failed')
    } catch (e: any) {
      setError(e?.message ?? 'load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Runs</h1>
        <button
          className="inline-flex items-center gap-2 text-sm text-kumo-muted hover:text-kumo-fg"
          onClick={load}
        >
          <ArrowClockwise className={loading ? 'animate-spin' : ''} size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-900 text-sm rounded">{error}</div>
      )}

      {runs.length === 0 && !loading && !error && (
        <div className="p-8 text-center text-kumo-muted">
          No runs yet. Run an eval and upload it to see it here.
        </div>
      )}

      {runs.length > 0 && (
        <Table>
          <TableHeader>
            <TableHead>Run</TableHead>
            <TableHead>Dataset</TableHead>
            <TableHead>Models</TableHead>
            <TableHead>Avg</TableHead>
            <TableHead>Pass</TableHead>
            <TableHead>Tasks</TableHead>
            <TableHead>When</TableHead>
          </TableHeader>
          <TableBody>
            {runs.map((r) => (
              <TableRow key={r.runId}>
                <TableCell>
                  <Link
                    to="/runs/$runId"
                    params={{ runId: r.runId }}
                    className="font-mono text-sm hover:underline"
                  >
                    {r.runId}
                  </Link>
                </TableCell>
                <TableCell>{r.dataset}</TableCell>
                <TableCell>
                  <span className="font-mono text-xs">
                    {r.models.join(', ')}
                  </span>
                </TableCell>
                <TableCell><ScoreBadge score={r.summary.overallAvgScore} /></TableCell>
                <TableCell><ScoreBadge score={r.summary.overallPassRate} /></TableCell>
                <TableCell>{r.summary.totalRows}</TableCell>
                <TableCell className="text-kumo-muted text-sm">{formatAgo(r.storedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
