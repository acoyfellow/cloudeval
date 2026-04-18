import { createFileRoute, Link } from '@tanstack/react-router'
import { Badge } from '@cloudflare/kumo'
import { ArrowLeft } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { fetchRun } from '@/lib/api'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/Table'
import type { EvalRun } from '@/types'

export const Route = createFileRoute('/runs/$runId')({
  component: RunDetailPage,
})

function ScoreBadge({ score }: { score: number }) {
  const pct = `${(score * 100).toFixed(0)}%`
  if (score >= 1) return <Badge variant="success">{pct}</Badge>
  if (score >= 0.5) return <Badge variant="warning">{pct}</Badge>
  return <Badge variant="error">{pct}</Badge>
}

function RunDetailPage() {
  const { runId } = Route.useParams()
  const [run, setRun] = useState<EvalRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRaw, setShowRaw] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchRun({ data: { runId } })
        if (cancelled) return
        if (res.status === 'ok') setRun(res.run as EvalRun)
        else setError(res.error ?? 'load failed')
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'load failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [runId])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/runs" className="text-kumo-muted hover:text-kumo-fg inline-flex items-center gap-1">
          <ArrowLeft size={16} /> All runs
        </Link>
      </div>

      <h1 className="font-mono text-xl mb-2">{runId}</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-900 text-sm rounded">{error}</div>
      )}

      {loading && !run && (
        <div className="p-8 text-center text-kumo-muted">Loading...</div>
      )}

      {run && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-sm">
            <div>
              <div className="text-kumo-muted text-xs uppercase tracking-wide mb-1">Dataset</div>
              <div className="font-mono">{run.dataset}</div>
            </div>
            <div>
              <div className="text-kumo-muted text-xs uppercase tracking-wide mb-1">Models</div>
              <div className="font-mono text-xs">{run.models.join(', ')}</div>
            </div>
            <div>
              <div className="text-kumo-muted text-xs uppercase tracking-wide mb-1">Judge</div>
              <div className="font-mono text-xs">{run.judgeModel}</div>
            </div>
            <div>
              <div className="text-kumo-muted text-xs uppercase tracking-wide mb-1">Provider</div>
              <div className="font-mono text-xs">{run.provider}</div>
            </div>
          </div>

          {run.modelRuns.map((mr) => (
            <section key={mr.model} className="mb-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-mono text-sm">{mr.model}</h2>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-kumo-muted">avg</span>
                  <ScoreBadge score={mr.summary.avgScore} />
                  <span className="text-kumo-muted">pass</span>
                  <ScoreBadge score={mr.summary.passRate} />
                  <span className="text-kumo-muted">{mr.summary.rows} rows</span>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableHead>Task</TableHead>
                  <TableHead>Scorer</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Input</TableHead>
                  <TableHead>Output</TableHead>
                </TableHeader>
                <TableBody>
                  {mr.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{row.id}</TableCell>
                      <TableCell className="text-xs">{row.scorer}</TableCell>
                      <TableCell><ScoreBadge score={row.score} /></TableCell>
                      <TableCell className="max-w-xs">
                        <span title={row.input}>{row.input}</span>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <span title={row.output}>{row.output}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          ))}

          <div className="mt-8 pt-6 border-t border-kumo-line">
            <button
              className="text-sm text-kumo-muted hover:text-kumo-fg"
              onClick={() => setShowRaw((v) => !v)}
            >
              {showRaw ? 'Hide' : 'Show'} raw JSON
            </button>
            {showRaw && (
              <pre className="mt-4 p-4 bg-kumo-base rounded text-xs overflow-auto font-mono">
                {JSON.stringify(run, null, 2)}
              </pre>
            )}
          </div>
        </>
      )}
    </div>
  )
}
