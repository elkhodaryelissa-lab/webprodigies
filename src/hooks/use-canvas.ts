'use client'

import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector, useAppStore } from '@/redux/hooks'
import { updateShape, addGeneratedUI, type FrameShape, type Shape } from '@/redux/slices/shapes'
import { generateFrameSnapshot, downloadBlob } from '@/lib/frame-snapshot'
import { toast } from 'sonner'

export const useFrame = (shape: FrameShape) => {
  const dispatch = useAppDispatch()
  const [isGenerating, setIsGenerating] = useState(false)

  const allShapes = useAppSelector((state) =>
    Object.values(state.shapes.shapes?.entities || {}).filter(
      (shape): shape is Shape => shape !== undefined
    )
  )

  // Confirmed real UP THROUGH building `formData` (see the git history /
  // earlier comment on this function for that provenance). Everything
  // from the fetch() call down is MY OWN addition -- the video hasn't
  // reached the AI generation part yet, so this wires the already-built
  // formData to the new /api/canvas/generate route, places the result
  // next to the source frame as a `generatedui` shape, and surfaces
  // errors via toast instead of the silent empty catch (a swallowed
  // failure here would leave the button spinning forever with no
  // feedback, which isn't acceptable for a real feature). The
  // downloadBlob debug-download call stays, since it was already
  // confirmed real/present before this.
  const handleGenerateDesign = async () => {
    try {
      setIsGenerating(true)
      const snapshot = await generateFrameSnapshot(shape, allShapes)

      downloadBlob(snapshot, `frame-${shape.frameNumber}-snapshot.png`)

      const formData = new FormData()
      formData.append('image', snapshot, `frame-${shape.frameNumber}.png`)
      formData.append('frameNumber', shape.frameNumber.toString())

      const urlParams = new URLSearchParams(window.location.search)
      const projectId = urlParams.get('project')
      if (projectId) {
        formData.append('projectId', projectId)
      }

      const res = await fetch('/api/canvas/generate', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(
          data?.message ||
            (data?.error === 'insufficient-credits'
              ? "You're out of credits."
              : 'Failed to generate design.')
        )
        return
      }

      dispatch(
        addGeneratedUI({
          x: shape.x + shape.w + 40,
          y: shape.y,
          w: shape.w,
          h: shape.h,
          uiSpecData: data.uiSpecData,
          sourceFrameId: shape.id,
        })
      )
    } catch (error) {
      console.error('Generate design error:', error)
      toast.error('Failed to generate design.')
    } finally {
      setIsGenerating(false)
    }
  }

  return {
    isGenerating,
    handleGenerateDesign,
  }
}

type ResizeStartDetail = { shapeId: string; corner: string }
type ResizeMoveDetail = { shapeId: string; corner: string; clientX: number; clientY: number }

// The real SelectionOverlay (src/components/canvas/shapes/selection.tsx)
// draws draggable corner handles on a selected shape and, when you drag
// one, dispatches `shape-resize-start` / `shape-resize-move` /
// `shape-resize-end` window CustomEvents — its own comment says "we'll
// handle the resize logic in the canvas hook", but that logic wasn't
// included, so this is my own implementation of it, called once from
// CanvasSurface.
//
// Frame/Rect/Ellipse/GeneratedUI resize normally (drag a corner, x/y/w/h
// update). Line/Arrow resize by moving whichever endpoint owns that
// corner of the bounding box (works for any diagonal, not just
// top-left-to-bottom-right lines). Freedraw and Text don't have a
// resize implementation here yet — their handles render (matching
// SelectionOverlay's `isResizable` list) but dragging them is currently
// a no-op rather than guessing at "scale all points" / "scale font
// size" behavior that hasn't been shown anywhere.
export const useShapeResize = () => {
  const dispatch = useAppDispatch()
  const store = useAppStore()

  useEffect(() => {
    let active: {
      shapeId: string
      corner: string
      original: ReturnType<typeof store.getState>['shapes']['shapes']['entities'][string]
      anchor: { x: number; y: number } | null
    } | null = null

    const handleStart = (e: Event) => {
      const { shapeId, corner } = (e as CustomEvent<ResizeStartDetail>).detail
      const original = store.getState().shapes.shapes.entities[shapeId]
      if (!original) return
      active = { shapeId, corner, original, anchor: null }
    }

    const handleMove = (e: Event) => {
      if (!active) return
      const { clientX, clientY } = (e as CustomEvent<ResizeMoveDetail>).detail
      const { zoom } = store.getState().viewport

      if (!active.anchor) {
        active.anchor = { x: clientX, y: clientY }
        return
      }

      const dx = (clientX - active.anchor.x) / zoom
      const dy = (clientY - active.anchor.y) / zoom
      const { original, corner, shapeId } = active

      if (
        original.type === 'frame' ||
        original.type === 'rect' ||
        original.type === 'ellipse' ||
        original.type === 'generatedui'
      ) {
        let { x, y, w, h } = original
        if (corner.includes('w')) {
          x = original.x + dx
          w = original.w - dx
        }
        if (corner.includes('e')) {
          w = original.w + dx
        }
        if (corner.includes('n')) {
          y = original.y + dy
          h = original.h - dy
        }
        if (corner.includes('s')) {
          h = original.h + dy
        }
        w = Math.max(w, 8)
        h = Math.max(h, 8)
        dispatch(updateShape({ id: shapeId, patch: { x, y, w, h } }))
        return
      }

      if (original.type === 'line' || original.type === 'arrow') {
        let { startX, startY, endX, endY } = original
        const startIsMinX = startX <= endX
        const startIsMinY = startY <= endY

        if (corner.includes('w')) {
          if (startIsMinX) startX += dx
          else endX += dx
        }
        if (corner.includes('e')) {
          if (startIsMinX) endX += dx
          else startX += dx
        }
        if (corner.includes('n')) {
          if (startIsMinY) startY += dy
          else endY += dy
        }
        if (corner.includes('s')) {
          if (startIsMinY) endY += dy
          else startY += dy
        }

        dispatch(updateShape({ id: shapeId, patch: { startX, startY, endX, endY } }))
        return
      }

      // freedraw / text: intentionally not implemented yet.
    }

    const handleEnd = () => {
      active = null
    }

    window.addEventListener('shape-resize-start', handleStart)
    window.addEventListener('shape-resize-move', handleMove)
    window.addEventListener('shape-resize-end', handleEnd)
    return () => {
      window.removeEventListener('shape-resize-start', handleStart)
      window.removeEventListener('shape-resize-move', handleMove)
      window.removeEventListener('shape-resize-end', handleEnd)
    }
  }, [dispatch, store])
}
