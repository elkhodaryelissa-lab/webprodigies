import type { Shape } from "@/redux/slices/shapes";

// Hit-testing / bounding-box helpers for the canvas.
//
// Your real shape components (src/components/canvas/shapes/*) render
// with `pointer-events-none` — they're pure visuals, not interactive
// DOM elements. That means selecting/erasing a shape can't be done with
// a per-shape onClick like I had before; it has to be done by testing
// the pointer's canvas-space coordinates against each shape's geometry
// here, at the surface level. Not from any screenshot — this is the
// piece that architecture needs and hadn't been shown yet.

export type Pt = { x: number; y: number };

export type BBox = { x: number; y: number; w: number; h: number };

export const getShapeBBox = (shape: Shape): BBox => {
  switch (shape.type) {
    case "frame":
    case "rect":
    case "ellipse":
    case "generatedui":
      return { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
    case "line":
    case "arrow":
      return {
        x: Math.min(shape.startX, shape.endX),
        y: Math.min(shape.startY, shape.endY),
        w: Math.abs(shape.endX - shape.startX),
        h: Math.abs(shape.endY - shape.startY),
      };
    case "freedraw": {
      if (shape.points.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
      const xs = shape.points.map((p) => p.x);
      const ys = shape.points.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return {
        x: minX,
        y: minY,
        w: Math.max(...xs) - minX,
        h: Math.max(...ys) - minY,
      };
    }
    case "text":
      // No real text measurement without touching the DOM — a rough
      // estimate from character count/font size, generously padded.
      // Good enough for hit-testing and the selection ring, not
      // pixel-exact.
      return {
        x: shape.x,
        y: shape.y,
        w: Math.max(shape.text.length * shape.fontSize * 0.6, 20),
        h: shape.fontSize * shape.lineHeight,
      };
  }
};

const distanceToSegment = (p: Pt, a: Pt, b: Pt) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  let t = lengthSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
};

const HIT_PADDING = 6;

export const hitTestShape = (point: Pt, shape: Shape): boolean => {
  if (shape.type === "line" || shape.type === "arrow") {
    return (
      distanceToSegment(
        point,
        { x: shape.startX, y: shape.startY },
        { x: shape.endX, y: shape.endY }
      ) <=
      HIT_PADDING + shape.strokeWidth / 2
    );
  }

  if (shape.type === "freedraw") {
    for (let i = 0; i < shape.points.length - 1; i++) {
      if (
        distanceToSegment(point, shape.points[i], shape.points[i + 1]) <=
        HIT_PADDING + shape.strokeWidth / 2
      ) {
        return true;
      }
    }
    return false;
  }

  const box = getShapeBBox(shape);
  return (
    point.x >= box.x &&
    point.x <= box.x + box.w &&
    point.y >= box.y &&
    point.y <= box.y + box.h
  );
};

// Iterates back-to-front (last shape = topmost, matching render order)
// so clicking overlapping shapes selects whichever is drawn on top.
export const hitTestTopmost = (
  point: Pt,
  orderedShapes: Shape[]
): Shape | null => {
  for (let i = orderedShapes.length - 1; i >= 0; i--) {
    if (hitTestShape(point, orderedShapes[i])) return orderedShapes[i];
  }
  return null;
};
