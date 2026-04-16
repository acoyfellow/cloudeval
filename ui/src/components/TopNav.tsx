import { useNavigate, useLocation, useRouter } from '@tanstack/react-router'
import { Tabs, Button, Input } from '@cloudflare/kumo'
import { MagnifyingGlassIcon, ArrowClockwiseIcon } from '@phosphor-icons/react'
import { useEffect } from 'react'

interface TopNavProps {
  tabs: Array<{ value: string; label: string }>
  onRefresh?: () => void
}

export default function TopNav({ tabs, onRefresh }: TopNavProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const router = useRouter()

  useEffect(() => {
    tabs.forEach((tab) => {
      router.preloadRoute({ to: tab.value }).catch(() => {})
    })
  }, [router, tabs])

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-kumo-base border-b border-kumo-line">
        <div className="w-full mx-auto">
          <div className="flex items-center justify-between bg-kumo-control h-[58px]">
            <div className="flex items-center gap-3">
              <div className="w-[59px] h-[58px] border-r border-kumo-line flex items-center justify-center">
                <div className="w-10 h-10 flex items-center justify-center text-kumo-default font-bold text-lg">
                  CE
                </div>
              </div>
              <span className="text-base font-medium text-kumo-default px-2">CloudEval</span>
            </div>
            <div className="flex items-center gap-3 pr-4">
              {onRefresh && (
                <Button variant="secondary" className="text-kumo-strong" onClick={onRefresh}>
                  <ArrowClockwiseIcon size={14} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="w-full md:max-w-[calc(100%-118px)] mx-auto px-4 border-b border-kumo-line bg-kumo-elevated">
        <div className="flex items-center justify-between py-2">
          <Tabs
            variant="underline"
            tabs={tabs}
            value={location.pathname === '/' ? tabs[0]?.value : location.pathname}
            onValueChange={(value) => navigate({ to: value })}
          />
        </div>
      </div>
    </header>
  )
}
