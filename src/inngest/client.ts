import { Inngest } from 'inngest'
import { realtimeMiddleware } from '@inngest/realtime'

// Confirmed real, in full — replaces my earlier placeholder (which just
// had a bare `new Inngest({ id: 'webprodigies-s2c' })` since nothing had
// been shown yet). Real id is 's2c', and it wires up
// @inngest/realtime's middleware from the start (already a dependency
// in package.json, just unused until now) — presumably for streaming
// progress/results back to the client during the AI generation flow.
export const inngest = new Inngest({
  id: 's2c',
  middleware: [realtimeMiddleware()],
})
