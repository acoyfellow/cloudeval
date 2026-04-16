import { createRootRoute, HeadContent, Scripts, Outlet } from '@tanstack/react-router'
import { TooltipProvider } from '@cloudflare/kumo'
import TopNav from '../components/TopNav'
import ContentFrame from '../components/ContentFrame'
import { ThemeProvider } from '../components/ThemeProvider'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'CloudEval' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
})

function RootComponent() {
  const tabs = [
    { value: '/dashboard', label: 'Dashboard' },
    { value: '/run', label: 'Run Evals' },
    { value: '/captures', label: 'Captures' },
  ]

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-kumo-elevated text-kumo-default font-sans">
        <ThemeProvider>
          <TooltipProvider>
            <div className="flex min-h-screen">
              <div className="flex-1 min-w-0 flex flex-col">
                <TopNav tabs={tabs} />
                <ContentFrame>
                  <Outlet />
                </ContentFrame>
              </div>
            </div>
          </TooltipProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
