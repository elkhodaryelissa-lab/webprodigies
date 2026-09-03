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
// <canvas> rasterization (no library), sized to the frame, 2d context.
// Everything from the fillRect down is MY OWN completion (not confirmed
// code), delegating per-shape drawing to `renderShapeOnCanvas` (whose
// outer signature IS confirmed), translated into frame-local
// coordinates, then wrapping canvas.toBlob's callback in a Promise
// since that API isn't promise-based natively.
//
// BUG FOUND from your "it downloads a white PNG" report: I'd
// implemented the confirmed `ctx.fillStyle = 'white'` literally, filling
// the background solid white -- but renderShapeOnCanvas's default
// stroke color (when a shape has no explicit stroke) is also white
// (`'#ffffff'`), matching how shapes render on your actual dark canvas.
// White strokes on a white background are invisible, which is exactly
// what "downloads a white png" looks like even when shapes ARE being
// captured and drawn correctly. Filling with the same dark background
// the real canvas uses (`#0b0b0d`, matching CanvasSurface's own
// `bg-[#0b0b0d]`) instead of white fixes this, and also makes more
// sense for what actually gets sent to Claude as "a rough UI
// sketch/wireframe" -- it should look like what you actually drew, not
// an inverted color scheme.
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
  ctx.fillStyle = '#0b0b0d'
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
// NOT from a screenshot -- useChatWindow needs to send the source
// frame's wireframe snapshot to /api/generate/redesign as
// `wireframeSnapshot`, which buildRedesignPrompt (src/prompts/generative.ts)
// treats as a raw base64 string (same format the main /api/generate
// route already sends for the initial design generation). Blob ->
// base64 via FileReader, since that's the standard browser API for it.
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result === 'string') {
        // Strip the "data:image/png;base64," prefix -- callers here
        // want the raw base64 payload, matching how base64Image is
        // built in /api/generate/route.ts (Buffer.from(...).toString('base64')).
        const base64 = result.split(',')[1] ?? result
        resolve(base64)
      } else {
        reject(new Error('Failed to convert blob to base64'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read blob'))
    reader.readAsDataURL(blob)
  })
}

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

// Corrected against your two newest screenshots, which show more of
// this function than the earlier crop did. The toPng() options object
// is the same as before, PLUS a `filter` option -- your screenshot's
// crop cut off the filter callback's body (only the arrow function's
// opening and its final `return true` were visible), so its actual
// filtering logic is still unconfirmed. Rather than invent conditions
// it might be checking (skip script tags? skip a specific class?),
// left it as a pass-through (`() => true`) so it's a documented gap
// instead of a guess -- send a clearer screenshot of that callback's
// body if you want it filled in for real.
//
// The bigger correction: your new screenshots show this does NOT
// return a Blob via fetch(dataUrl) like the last version -- it draws
// the captured PNG onto the CanvasRenderingContext2D that's passed
// in, via a `new Image()` + onload/onerror wrapped in a Promise
// (confirmed verbatim: the resolve(void 0) call and the
// '✅ Visual content captured successfully' log). Return type is now
// void to match.
const captureVisualContent = async (
  ctx: CanvasRenderingContext2D,
  contentDiv: HTMLElement,
  width: number,
  height: number
): Promise<void> => {
  const { toPng } = await import('html-to-image')
  const dataUrl = await toPng(contentDiv, {
    width: width,
    height: height,
    backgroundColor: '#ffffff',
    pixelRatio: 1,
    cacheBust: true,
    includeQueryParams: false,
    skipAutoScale: true,
    skipFonts: true,
    // Confirmed present in your screenshot, body not fully visible --
    // see comment above. Pass-through until you can show me the rest
    // of it.
    filter: () => true,
  })

  await new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height)
      console.log('\u2705 Visual content captured successfully')
      resolve(void 0)
    }
    img.onerror = () => {
      reject(new Error('Failed to load captured image'))
    }
    img.src = dataUrl
  })
}

// Confirmed real: the getBoundingClientRect/canvas setup, the white
// background fill, the `div[style*="pointer-events: auto"]` selector
// for finding the content div (GeneratedUI's inner wrapper div has
// that exact inline style, confirmed in
// src/components/canvas/shapes/generatedui/index.tsx), and the
// if/else with `throw new Error('No content div found for export')`.
//
// Corrected against your newest screenshots: the real blob creation
// happens HERE, after captureVisualContent draws onto `ctx`/`canvas`
// -- via `canvas.toBlob(callback, 'image/png', 1.0)`, not inside
// captureVisualContent. The success-path console.log
// ('✅ GeneratedUI snapshot created successfully', with size/type/
// filename) and the toBlob failure console.error are both verbatim
// from your screenshot, as is downloadBlob(blob, filename) being
// called from inside that success branch.
//
// One kept deviation, same reasoning as every other empty catch fixed
// this session: your screenshot's outer catch is `catch (error) {}`
// (empty). That would make exportDesign's own try/catch in
// use-canvas.ts blind to a real failure here -- it would show "Design
// exported successfully!" even when nothing was captured. Keeping the
// real console.error + rethrow so the caller's catch (and its "Failed
// to export design" toast) actually fires on failure.
export const exportGeneratedUIAsPNG = async (
  element: HTMLElement,
  filename: string
): Promise<void> => {
  try {
    const rect = element.getBoundingClientRect()
    const canvas = document.createElement('canvas')
    canvas.width = rect.width
    canvas.height = rect.height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const contentDiv = element.querySelector(
      'div[style*="pointer-events: auto"]'
    ) as HTMLElement

    if (contentDiv) {
      console.log('\u{1F3AF} Found content div, capturing visual content')
      await captureVisualContent(ctx, contentDiv, rect.width, rect.height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log('\u2705 GeneratedUI snapshot created successfully:', {
              size: blob.size,
              type: blob.type,
              filename,
            })
            downloadBlob(blob, filename)
          } else {
            console.error('\u274C Failed to create GeneratedUI snapshot blob')
          }
        },
        'image/png',
        1.0
      )
    } else {
      throw new Error('No content div found for export')
    }
  } catch (error) {
    console.error('Failed to export GeneratedUI as PNG:', error)
    throw error
  }
}
