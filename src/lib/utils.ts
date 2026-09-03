import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const combinedSlug = (name: string, maxLen = 80): string => {
  const base = name
  if (!base) return 'untitled'
  let s = base
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
  if (!s) s = 'untitled'
  if (s.length > maxLen) s = s.slice(0, maxLen)
  return s
}
// Used by the real Stroke/FreeDrawStrokePreview components
// (src/components/canvas/shapes/stroke) to size the freehand-drawing
// SVG around its points. Referenced by that downloaded code but didn't
// exist in this file yet.
export function polylineBox(points: ReadonlyArray<{ x: number; y: number }>) {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}
