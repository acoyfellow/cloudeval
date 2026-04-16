import { createFileRoute } from '@tanstack/react-router'
import { Badge } from '@cloudflare/kumo'
import { ArrowClockwise } from '@phosphor-icons/react'
import { useEffect, useState, useCallback } from 'react'
import { getCaptures } from '@/lib/api'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/Table'
import type { CaptureRecord } from '@/types'

export const Route = createFileRoute('/captures')({
  component: CapturesPage,
})

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function CapturesPage() {
  const [captures, setCaptures] = useState<CaptureRecord[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getCaptures()
      if (res.status === 'ok') setCaptures(res.captures)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-kumo-strong">
          <ArrowClockwise size={20} className="animate-spin" />
          <span>Loading captures...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-kumo-default">Network Captures</h2>
          <p className="text-sm text-kumo-strong">{captures.length} responses in KV (24h TTL)</p>
        </div>
      </div>

      <div className="ring ring-kumo-line rounded-lg overflow-hidden bg-kumo-elevated">
        <div className="bg-kumo-base border border-kumo-line -mx-px -mb-px rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableHead>Model</TableHead>
              <TableHead>Prompt</TableHead>
              <TableHead>TTFT</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Captured</TableHead>
              <TableHead className="min-w-[300px]">Response</TableHead>
            </TableHeader>
            <TableBody>
              {captures.map((c, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Badge variant="neutral">{c.model?.replace('@cf/', '')}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm truncate max-w-[200px]">{c.prompt}</span>
                  </TableCell>
                  <TableCell><span className="text-sm">{formatMs(c.ttft)}</span></TableCell>
                  <TableCell><span className="text-sm">{formatMs(c.totalMs)}</span></TableCell>
                  <TableCell>
                    <span className="text-xs text-kumo-strong">
                      {new Date(c.timestamp).toLocaleTimeString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-kumo-strong line-clamp-2">{c.response?.slice(0, 200) || '(empty)'}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
