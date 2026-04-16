import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export const getRouter = () => {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 5 * 60 * 1000,
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
