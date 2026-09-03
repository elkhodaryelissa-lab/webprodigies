'use client'

import React from 'react'
import { Redo2, Undo2 } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { redo, undo } from '@/redux/slices/history'
import { cn } from '@/lib/utils'

// Markup/classes are the real ones from your screenshot — it only
// rendered the pill (aria-hidden, no onClick), not wired up yet in the
// video code you sent. Wiring it to the actual undo/redo dispatch here
// (see src/redux/middleware/history.ts for how it works) since that's
// what you asked for. Dropped `aria-hidden` since the buttons are now
// genuinely interactive, and added the disabled styling for when
// there's nothing to undo/redo — neither was in your screenshot, but
// both are needed for this to actually behave like undo/redo.
const HistoryPill = () => {
  const dispatch = useAppDispatch()
  const canUndo = useAppSelector((s) => s.history.past.length > 0)
  const canRedo = useAppSelector((s) => s.history.future.length > 0)

  return (
    <div className="col-span-1 flex justify-start items-center pointer-events-auto">
      <div className="inline-flex items-center rounded-full backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] p-2 text-neutral-300 saturate-150">
        <span
          onClick={() => canUndo && dispatch(undo())}
          className={cn(
            'inline-grid h-9 w-9 place-items-center rounded-full hover:bg-white/[0.12] transition-all cursor-pointer',
            !canUndo && 'opacity-40 pointer-events-none cursor-not-allowed'
          )}
        >
          <Undo2 size={18} className="opacity-80 stroke-[1.75]" />
        </span>

        <span className="mx-1 h-5 w-px rounded bg-white/[0.16]" />

        <span
          onClick={() => canRedo && dispatch(redo())}
          className={cn(
            'inline-grid h-9 w-9 place-items-center rounded-full hover:bg-white/[0.12] transition-all cursor-pointer',
            !canRedo && 'opacity-40 pointer-events-none cursor-not-allowed'
          )}
        >
          <Redo2 size={18} className="opacity-80 stroke-[1.75]" />
        </span>
      </div>
    </div>
  )
}

export default HistoryPill
