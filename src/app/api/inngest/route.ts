import { inngest } from '@/inngest/client'
import { autosaveProjectWorkflow, handlePolarEvent } from '@/inngest/functions'
import { serve } from 'inngest/next'

// Import updated to match the confirmed rename (testFun ->
// autosaveProjectWorkflow) shown in your functions.ts screenshot — the
// old import would no longer compile since testFun doesn't exist
// anymore. `handlePolarEvent` added to the functions array too so it's
// actually registered with Inngest; that specific array isn't itself
// confirmed by a fresh screenshot of this file, but is necessary for
// both functions to run.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [autosaveProjectWorkflow, handlePolarEvent],
})
