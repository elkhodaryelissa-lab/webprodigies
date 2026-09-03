'use client'

import React from 'react'
import type { Shape } from '@/redux/slices/shapes'
import { Frame } from './frame'
import { Rectangle } from './rectangle'
import { Elipse } from './elipse'
import { Line } from './line'
import { Arrow } from './arrow'
import { Stroke } from './stroke'
import { Text } from './text'
import { SelectionOverlay } from './selection'

type Props = {
  shape: Shape
  selected: boolean
  onToggleInspiration: (frameId: string) => void
}

// Dispatches to the real per-type shape components downloaded from the
// tutorial (Frame/Rectangle/Elipse/Line/Arrow/Stroke/Text). They render
// pure/pointer-events-none visuals (see src/lib/canvas-geometry.ts for
// why — selection is hit-tested in the surface, not per-shape), so there's
// no `selected` prop on any of them. Selection is drawn here instead, as
// a separate ring overlay on top, computed from the same bounding-box
// helper the hit-testing uses.
const CanvasShape = ({ shape, selected, onToggleInspiration }: Props) => {
  // Real SelectionOverlay (src/components/canvas/shapes/selection.tsx) —
  // draws the selection ring plus draggable corner resize handles, and
  // dispatches shape-resize-start/move/end window events that
  // useShapeResize (src/hooks/use-canvas.ts) turns into actual
  // updateShape calls.
  const selectionRing = <SelectionOverlay shape={shape} isSelected={selected} />

  switch (shape.type) {
    case 'frame':
      return (
        <>
          <Frame shape={shape} toggleInspiration={() => onToggleInspiration(shape.id)} />
          {selectionRing}
        </>
      )
    case 'rect':
      return (
        <>
          <Rectangle shape={shape} />
          {selectionRing}
        </>
      )
    case 'ellipse':
      return (
        <>
          <Elipse shape={shape} />
          {selectionRing}
        </>
      )
    case 'line':
      return (
        <>
          <Line shape={shape} />
          {selectionRing}
        </>
      )
    case 'arrow':
      return (
        <>
          <Arrow shape={shape} />
          {selectionRing}
        </>
      )
    case 'freedraw':
      return (
        <>
          <Stroke shape={shape} />
          {selectionRing}
        </>
      )
    case 'text':
      return (
        <>
          <Text shape={shape} />
          {selectionRing}
        </>
      )
    case 'generatedui':
      // My own addition -- now that /api/canvas/generate actually
      // produces `uiSpecData` (self-contained HTML), render it via a
      // sandboxed iframe (allow-scripts so the Tailwind CDN <script>
      // in that HTML runs, but no allow-same-origin, so generated
      // content can't reach out to this app's cookies/storage/DOM).
      // Falls back to the old placeholder while uiSpecData is still
      // null (e.g. a shape added before generation resolves).
      return (
        <>
          <div
            className="absolute overflow-hidden rounded-sm bg-white pointer-events-none"
            style={{ left: shape.x, top: shape.y, width: shape.w, height: shape.h }}
          >
            {shape.uiSpecData ? (
              <iframe
                srcDoc={shape.uiSpecData}
                sandbox="allow-scripts"
                title="Generated UI"
                className="w-full h-full border-0"
              />
            ) : (
              <div className="w-full h-full border border-dashed border-white/30 flex items-center justify-center text-xs text-white/50">
                Generated UI (not built yet)
              </div>
            )}
          </div>
          {selectionRing}
        </>
      )
    default:
      return null
  }
}

export default CanvasShape
