/**
 * cloudeval-viewer Worker entry.
 *
 * Pure HTML artifact viewer. NO sensitive bindings.
 * /runs and /runs/$runId pages read from cloudeval-api via the API
 * service binding (see wrangler.jsonc services[]).
 *
 * All requests fall through to TanStack Start's default handler.
 */
import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'

const startFetch = createStartHandler(defaultStreamHandler)

export default {
  fetch: startFetch,
}
