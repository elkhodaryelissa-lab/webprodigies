'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import {
  addArrow,
  addEllipse,
  addFrame,
  addFreeDrawShape,
  addLine,
  addRect,
  addText,
  clearSelection,
  deselectShape,
  removeShape,
  selectShape,
  updateShape,
  type Shape,
} from '@/redux/slices/shapes'
import type { Point } from '@/redux/slices/viewport'
import { hitTestTopmost } from '@/lib/canvas-geometry'
import { useShapeResize } from '@/hooks/use-canvas'
import { useInspiration, useGlobalChat } from '@/hooks/use-canvas'
import InspirationSidebar from './shapes/inspiration-sidebar'
import ChatWindow from './shapes/generatedui/chat'
import CanvasShape from './shapes'
import { RectanglePreview } from './shapes/rectangle/preview'
import { ElipsePreview } from './shapes/elipse/preview'
import { FramePreview } from './shapes/frame/preview'
import { LinePreview } from './shapes/line/preview'
import { ArrowPreview } from './shapes/arrow/preview'
import { FreeDrawStrokePreview } from './shapes/stroke/preview'

type DrawState =
  | { kind: 'box'; tool: 'frame' | 'rect' | 'ellipse'; start: Point; current: Point }
  | { kind: 'segment'; tool: 'line' | 'arrow'; start: Point; current: Point }
  | { kind: 'freedraw'; points: Point[] }
  | { kind: 'move'; ids: string[]; start: Point; originals: Record<string, Shape> }
  | null

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  )
}

// The drawing surface. Selection/erasing is done by hit-testing pointer
// coordinates against shape geometry (src/lib/canvas-geometry.ts),
// because the real shape components render pointer-events-none — see
// that file's comment for why. Drag-to-draw uses the real per-type
// Preview components you downloaded instead of a single generic dashed
// box. Panning isn't implemented — the surface is fixed at
// viewport.translate (currently always {0,0}) and only scale is wired up.
const CanvasSurface = () => {
  const dispatch = useAppDispatch()
  useShapeResize()
  const shapesState = useAppSelector((s) => s.shapes.shapes)
  const tool = useAppSelector((s) => s.shapes.tool)
  const selected = useAppSelector((s) => s.shapes.selected)
  const frameCounter = useAppSelector((s) => s.shapes.frameCounter)
  const { scale: zoom, translate: offset } = useAppSelector((s) => s.viewport)

  const surfaceRef = useRef<HTMLDivElement>(null)
  const drawRef = useRef<DrawState>(null)
  const [draw, setDraw] = useState<DrawState>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const toCanvasPoint = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = surfaceRef.current?.getBoundingClientRect()
      const left = rect?.left ?? 0
      const top = rect?.top ?? 0
      return {
        x: (clientX - left - offset.x) / zoom,
        y: (clientY - top - offset.y) / zoom,
      }
    },
    [offset, zoom]
  )

  const startDraw = (next: DrawState) => {
    drawRef.current = next
    setDraw(next)
    setIsDrawing(true)
  }

  const shapes: Shape[] = shapesState.ids
    .map((id: string) => shapesState.entities[id])
    .filter((s: Shape | undefined): s is Shape => !!s)

  // Confirmed real hook (useInspiration, in src/hooks/use-canvas.ts) now
  // wired in for real, replacing the "not built yet" toast stub.
  const { isInspirationOpen, toggleInspiration, closeInspiration } =
    useInspiration()
  const handleToggleInspiration = toggleInspiration

  // Corrected: your screenshot of the real tutorial code showed
  // exportDesign living INSIDE useGlobalChat itself (src/hooks/use-
  // canvas.ts), not as its own handler here -- and it works completely
  // differently than what I'd built without seeing it: it screenshots
  // the live rendered DOM as a PNG (via html-to-image) rather than
  // downloading the stored HTML string.
  //
  // Design Chat is no longer a stub -- useGlobalChat's toggleChat/
  // closeChat (built once your screenshots showed chat.tsx and
  // useChatWindow as real, working code) are wired straight through,
  // and the actual panel is rendered below next to InspirationSidebar.
  const { isChatOpen, activeGeneratedUIId, toggleChat, closeChat, generateWorkflow, exportDesign } =
    useGlobalChat()
  const handleToggleChat = toggleChat
  const handleGenerateWorkflow = generateWorkflow
  const handleExportDesign = exportDesign

  const handleBackgroundPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const p = toCanvasPoint(e.clientX, e.clientY)

    if (tool === 'select') {
      const hit = hitTestTopmost(p, shapes)
      if (!hit) {
        dispatch(clearSelection())
        return
      }

      if (e.shiftKey) {
        if (selected[hit.id]) dispatch(deselectShape(hit.id))
        else dispatch(selectShape(hit.id))
        return
      }

      // Free-move: pointerdown directly on a shape (not a resize handle —
      // those live in SelectionOverlay and stopPropagation before this
      // handler ever runs) now drags it, instead of only selecting it.
      // Skip when the target is the text shape's own <input> — clicking
      // there is for placing the text cursor, not moving the shape.
      if (isTypingTarget(e.target)) return

      const nextSelectedIds = selected[hit.id]
        ? Object.keys(selected)
        : [hit.id]
      if (!selected[hit.id]) {
        dispatch(clearSelection())
        dispatch(selectShape(hit.id))
      }

      const originals: Record<string, Shape> = {}
      for (const id of nextSelectedIds) {
        const s = shapesState.entities[id]
        if (s) originals[id] = s
      }
      startDraw({ kind: 'move', ids: nextSelectedIds, start: p, originals })
      return
    }

    if (tool === 'eraser') {
      const hit = hitTestTopmost(p, shapes)
      if (hit) dispatch(removeShape(hit.id))
      return
    }

    if (tool === 'text') {
      dispatch(addText({ x: p.x, y: p.y }))
      return
    }

    if (tool === 'frame' || tool === 'rect' || tool === 'ellipse') {
      startDraw({ kind: 'box', tool, start: p, current: p })
      return
    }

    if (tool === 'line' || tool === 'arrow') {
      startDraw({ kind: 'segment', tool, start: p, current: p })
      return
    }

    if (tool === 'freedraw') {
      startDraw({ kind: 'freedraw', points: [p] })
      return
    }
  }

  useEffect(() => {
    if (!isDrawing) return

    const handleMove = (e: PointerEvent) => {
      const prev = drawRef.current
      if (!prev) return
      const p = toCanvasPoint(e.clientX, e.clientY)

      if (prev.kind === 'move') {
        const dx = p.x - prev.start.x
        const dy = p.y - prev.start.y
        for (const id of prev.ids) {
          const original = prev.originals[id]
          if (!original) continue
          if (
            original.type === 'frame' ||
            original.type === 'rect' ||
            original.type === 'ellipse' ||
            original.type === 'text' ||
            original.type === 'generatedui'
          ) {
            dispatch(
              updateShape({
                id,
                patch: { x: original.x + dx, y: original.y + dy },
              })
            )
          } else if (original.type === 'line' || original.type === 'arrow') {
            dispatch(
              updateShape({
                id,
                patch: {
                  startX: original.startX + dx,
                  startY: original.startY + dy,
                  endX: original.endX + dx,
                  endY: original.endY + dy,
                },
              })
            )
          } else if (original.type === 'freedraw') {
            dispatch(
              updateShape({
                id,
                patch: {
                  points: original.points.map((pt) => ({
                    x: pt.x + dx,
                    y: pt.y + dy,
                  })),
                },
              })
            )
          }
        }
        return
      }

      let next: DrawState = prev
      if (prev.kind === 'box' || prev.kind === 'segment') {
        next = { ...prev, current: p }
      } else if (prev.kind === 'freedraw') {
        next = { ...prev, points: [...prev.points, p] }
      }

      drawRef.current = next
      setDraw(next)
    }

    const handleUp = () => {
      const prev = drawRef.current

      if (prev?.kind === 'box') {
        const x = Math.min(prev.start.x, prev.current.x)
        const y = Math.min(prev.start.y, prev.current.y)
        const w = Math.abs(prev.current.x - prev.start.x)
        const h = Math.abs(prev.current.y - prev.start.y)
        if (w > 2 && h > 2) {
          const payload = { x, y, w, h }
          if (prev.tool === 'frame') dispatch(addFrame(payload))
          if (prev.tool === 'rect') dispatch(addRect(payload))
          if (prev.tool === 'ellipse') dispatch(addEllipse(payload))
        }
      } else if (prev?.kind === 'segment') {
        const moved =
          Math.hypot(prev.current.x - prev.start.x, prev.current.y - prev.start.y) > 2
        if (moved) {
          const payload = {
            startX: prev.start.x,
            startY: prev.start.y,
            endX: prev.current.x,
            endY: prev.current.y,
          }
          if (prev.tool === 'line') dispatch(addLine(payload))
          if (prev.tool === 'arrow') dispatch(addArrow(payload))
        }
      } else if (prev?.kind === 'freedraw') {
        if (prev.points.length >= 2) dispatch(addFreeDrawShape({ points: prev.points }))
      }

      drawRef.current = null
      setDraw(null)
      setIsDrawing(false)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [isDrawing, dispatch, toCanvasPoint])

  return (
    <>
      <InspirationSidebar isOpen={isInspirationOpen} onClose={closeInspiration} />
      {activeGeneratedUIId && (
        <ChatWindow
          generatedUIId={activeGeneratedUIId}
          isOpen={isChatOpen}
          onClose={closeChat}
        />
      )}
      <div
        ref={surfaceRef}
        onPointerDown={handleBackgroundPointerDown}
        className="absolute inset-0 overflow-hidden bg-[#0b0b0d] [background-image:radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px]"
        style={{ touchAction: 'none' }}
      >
      <div
        className="absolute inset-0"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
      >
        {shapes.map((shape) => (
          <CanvasShape
            key={shape.id}
            shape={shape}
            selected={!!selected[shape.id]}
            onToggleInspiration={handleToggleInspiration}
            onToggleChat={handleToggleChat}
            onGenerateWorkflow={handleGenerateWorkflow}
            onExportDesign={handleExportDesign}
          />
        ))}

        {draw?.kind === 'box' && draw.tool === 'frame' && (
          <FramePreview startWorld={draw.start} currentWorld={draw.current} />
        )}
        {draw?.kind === 'box' && draw.tool === 'rect' && (
          <RectanglePreview startWorld={draw.start} currentWorld={draw.current} />
        )}
        {draw?.kind === 'box' && draw.tool === 'ellipse' && (
          <ElipsePreview startWorld={draw.start} currentWorld={draw.current} />
        )}
        {draw?.kind === 'segment' && draw.tool === 'line' && (
          <LinePreview startWorld={draw.start} currentWorld={draw.current} />
        )}
        {draw?.kind === 'segment' && draw.tool === 'arrow' && (
          <ArrowPreview startWorld={draw.start} currentWorld={draw.current} />
        )}
        {draw?.kind === 'freedraw' && <FreeDrawStrokePreview points={draw.points} />}
      </div>

      {shapes.length === 0 && !draw && frameCounter === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/30">
          Click &quot;New Frame&quot; to start, or pick a tool below and draw on the canvas
        </div>
      )}
      </div>
    </>
  )
}

export default CanvasSurface
