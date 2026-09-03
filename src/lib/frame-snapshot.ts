// Extracted into its own module, matching how the real tutorial
// code organizes it (moved out of use-canvas.ts into src/lib/).
// Import path fixed to this project's actual '@/redux/slices/shapes'
// (plural) — the real file imports from '@/redux/slice/shapes'
// (singular), which is the same recurring path bug seen across the
// other real tutorial files in this project.
import type { FrameShape, Shape } from '@/redux/slices/shapes'

// Confirmed real, in full — and NOT a single uniform rule.
// rect/ellipse/frame test the shape's CENTER point; text tests its raw
// x/y anchor (not center); freedraw counts as inside if ANY point in
// the stroke falls within the frame; line/arrow count as inside if
// EITHER endpoint does. generatedui shapes are deliberately never
// captured (falls to `default: return false`) — makes sense, a
// generated result shouldn't feed back into its own frame's snapshot.
export const isShapeInsideFrame = (
  shape: Shape,
  frame: FrameShape
): boolean => {
  const frameLeft = frame.x
  const frameTop = frame.y
  const frameRight = frame.x + frame.w
  const frameBottom = frame.y + frame.h

  switch (shape.type) {
    case 'rect':
    case 'ellipse':
    case 'frame': {
      // Check if shape center point is within frame
      const centerX = shape.x + shape.w / 2
      const centerY = shape.y + shape.h / 2
      return (
        centerX >= frameLeft &&
        centerX <= frameRight &&
        centerY >= frameTop &&
        centerY <= frameBottom
      )
    }
    case 'text':
      // Check if text position is within frame
      return (
        shape.x >= frameLeft &&
        shape.x <= frameRight &&
        shape.y >= frameTop &&
        shape.y <= frameBottom
      )
    case 'freedraw':
      // Check if any drawing points are within frame
      return shape.points.some(
        (point) =>
          point.x >= frameLeft &&
          point.x <= frameRight &&
          point.y >= frameTop &&
          point.y <= frameBottom
      )
    case 'line':
    case 'arrow': {
      // Check if either start or end point is within frame
      const startInside =
        shape.startX >= frameLeft &&
        shape.startX <= frameRight &&
        shape.startY >= frameTop &&
        shape.startY <= frameBottom
      const endInside =
        shape.endX >= frameLeft &&
        shape.endX <= frameRight &&
        shape.endY >= frameTop &&
        shape.endY <= frameBottom
      return startInside || endInside
    }
    default:
      return false
  }
}

// Confirmed real, in full.
export const getShapesInsideFrame = (
  shapes: Shape[],
  frame: FrameShape
): Shape[] => {
  // Simple coordinate-based detection: find shapes within frame bounds
  const shapesInFrame = shapes.filter(
    (shape) => shape.id !== frame.id && isShapeInsideFrame(shape, frame)
  )

  console.log(`Frame ${frame.frameNumber} capture:`, {
    totalShapes: shapes.length,
    captured: shapesInFrame.length,
    capturedTypes: shapesInFrame.map((s) => s.type),
  })

  return shapesInFrame
}

// Confirmed real, in full — every case body below is transcribed from
// your screenshots, not inferred. A few things that turned out
// different from my earlier guess: 'rect'/'ellipse'/'frame' really do
// share one code path (a plain stroke via ctx.roundRect, borderRadius
// 8 for rect and 0 for frame/ellipse's own ctx.ellipse call) — there's
// no fill at all, and 'frame' does NOT get a translucent background
// like it does live on the canvas, it's just stroked like a
// square-cornered rect. Text has no italic/bold handling. Arrow draws
// the shaft first (same as line), then a separate filled triangle for
// the head.
const renderShapeOnCanvas = (
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  frameX: number,
  frameY: number
) => {
  ctx.save()
  switch (shape.type) {
    case 'rect':
    case 'ellipse':
    case 'frame':
      const relativeX = shape.x - frameX
      const relativeY = shape.y - frameY

      if (shape.type === 'rect' || shape.type === 'frame') {
        ctx.strokeStyle =
          shape.stroke && shape.stroke !== 'transparent'
            ? shape.stroke
            : '#ffffff'
        ctx.lineWidth = shape.strokeWidth || 2

        const borderRadius = shape.type === 'rect' ? 8 : 0
        ctx.beginPath()
        ctx.roundRect(relativeX, relativeY, shape.w, shape.h, borderRadius)
        ctx.stroke()
      } else if (shape.type === 'ellipse') {
        ctx.strokeStyle =
          shape.stroke && shape.stroke !== 'transparent'
            ? shape.stroke
            : '#ffffff'
        ctx.lineWidth = shape.strokeWidth || 2
        ctx.beginPath()
        ctx.ellipse(
          relativeX + shape.w / 2,
          relativeY + shape.h / 2,
          shape.w / 2,
          shape.h / 2,
          0,
          0,
          2 * Math.PI
        )
        ctx.stroke()
      }
      break
    case 'text':
      const textRelativeX = shape.x - frameX
      const textRelativeY = shape.y - frameY
      ctx.fillStyle = shape.fill || '#ffffff'
      ctx.font = `${shape.fontSize}px ${shape.fontFamily || 'Inter, sans-serif'}`
      ctx.textBaseline = 'top'
      ctx.fillText(shape.text, textRelativeX, textRelativeY)
      break
    case 'freedraw':
      if (shape.points.length > 1) {
        ctx.strokeStyle = shape.stroke || '#ffffff'
        ctx.lineWidth = shape.strokeWidth || 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        const firstPoint = shape.points[0]
        ctx.moveTo(firstPoint.x - frameX, firstPoint.y - frameY)
        for (let i = 1; i < shape.points.length; i++) {
          const point = shape.points[i]
          ctx.lineTo(point.x - frameX, point.y - frameY)
        }
        ctx.stroke()
      }
      break
    case 'line':
      ctx.strokeStyle = shape.stroke || '#ffffff'
      ctx.lineWidth = shape.strokeWidth || 2
      ctx.beginPath()
      ctx.moveTo(shape.startX - frameX, shape.startY - frameY)
      ctx.lineTo(shape.endX - frameX, shape.endY - frameY)
      ctx.stroke()
      break
    case 'arrow': {
      ctx.strokeStyle = shape.stroke || '#ffffff'
      ctx.lineWidth = shape.strokeWidth || 2
      ctx.beginPath()
      ctx.moveTo(shape.startX - frameX, shape.startY - frameY)
      ctx.lineTo(shape.endX - frameX, shape.endY - frameY)
      ctx.stroke()

      const headLength = 10
      const angle = Math.atan2(
        shape.endY - shape.startY,
        shape.endX - shape.startX
      )
      ctx.fillStyle = shape.stroke || '#ffffff'
      ctx.beginPath()
      ctx.moveTo(shape.endX - frameX, shape.endY - frameY)
      ctx.lineTo(
        shape.endX - frameX - headLength * Math.cos(angle - Math.PI / 6),
        shape.endY - frameY - headLength * Math.sin(angle - Math.PI / 6)
      )
      ctx.lineTo(
        shape.endX - frameX - headLength * Math.cos(angle + Math.PI / 6),
        shape.endY - frameY - headLength * Math.sin(angle + Math.PI / 6)
      )
      ctx.closePath()
      ctx.fill()
      break
    }
  }
  ctx.restore()
}

// Confirmed real UP THROUGH `ctx.fillStyle = 'white'` — plain HTML5
// <canvas> rasterization (no library), sized to the frame, 2d context,
// about to fill a white background. Cut off after that in your
// screenshot: nothing shown for actually drawing the captured shapes or
// producing the Blob. Since nothing calls this yet either way
// (handleGenerateDesign is still empty), everything from the fillRect
// down is MY OWN completion, not confirmed code — delegating per-shape
// drawing to `renderShapeOnCanvas` (whose outer signature IS confirmed,
// see above), translated into frame-local coordinates, then wrapping
// canvas.toBlob's callback in a Promise since that API isn't
// promise-based natively. generatedui shapes never appear in
// shapesInFrame (isShapeInsideFrame always returns false for them), so
// there's no case for them here either. Replace this block once you
// get the real version from the video.
export const generateFrameSnapshot = async (
  frame: FrameShape,
  allShapes: Shape[]
): Promise<Blob> => {
  const shapesInFrame = getShapesInsideFrame(allShapes, frame)
  const canvas = document.createElement('canvas')
  canvas.width = frame.w
  canvas.height = frame.h
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, frame.w, frame.h)

  // Shapes are stored in absolute canvas coordinates; translate into
  // frame-local space so drawing lines up with where they render on
  // screen relative to the frame's top-left corner.
  const ox = frame.x
  const oy = frame.y

  for (const shape of shapesInFrame) {
    renderShapeOnCanvas(ctx, shape, ox, oy)
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to create snapshot blob'))
    }, 'image/png')
  })
}

// Confirmed real, in full — a standard "trigger a browser download for
// an in-memory Blob" helper: wrap it in an object URL, click a
// throwaway <a download> element, then clean up both the element and
// the URL. Not called from anywhere yet (nothing produces a Blob to
// download until generateFrameSnapshot is wired up), but exported so
// it's ready when that flow is built.
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
