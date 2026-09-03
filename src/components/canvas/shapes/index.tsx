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
import GeneratedUI from './generatedui'

type Props = {
  shape: Shape
  selected: boolean
  onToggleInspiration: (frameId: string) => void
  onToggleChat: (generatedUIId: string) => void
  onGenerateWorkflow: (generatedUIId: string) => void
  onExportDesign: (generatedUIId: string, element: HTMLElement | null) => void
}

// Dispatches to the real per-type shape components downloaded from the
// tutorial (Frame/Rectangle/Elipse/Line/Arrow/Stroke/Text). They render
// pure/pointer-events-none visuals (see src/lib/canvas-geometry.ts for
// why — selection is hit-tested in the surface, not per-shape), so there's
// no `selected` prop on any of them. Selection is drawn here instead, as
// a separate ring overlay on top, computed from the same bounding-box
// helper the hit-testing uses.
const CanvasShape = ({
  shape,
  selected,
  onToggleInspiration,
  onToggleChat,
  onGenerateWorkflow,
  onExportDesign,
}: Props) => {
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
      // Now rendered with the real GeneratedUI component (confirmed
      // from your screenshots -- see src/components/canvas/shapes/generatedui/index.tsx),
      // replacing the sandboxed-iframe placeholder I'd built earlier.
      // Worth knowing: the confirmed real version renders with
      // dangerouslySetInnerHTML + a regex-based sanitizeHtml, which is
      // less isolated than the iframe sandbox this used to have (no
      // separate origin/DOM boundary). Matching it as confirmed-real
      // rather than keeping my safer iframe version.
      return (
        <>
          <GeneratedUI
            shape={shape}
            toggleChat={onToggleChat}
            generateWorkflow={onGenerateWorkflow}
            exportDesign={onExportDesign}
          />
          {selectionRing}
        </>
      )
    default:
      return null
  }
}

export default CanvasShape
