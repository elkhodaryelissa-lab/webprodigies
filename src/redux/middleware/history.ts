import { Middleware } from "@reduxjs/toolkit";
import type { RootState } from "../store";
import { restoreShapes } from "../slices/shapes";
import {
  commitRedo,
  commitUndo,
  pushSnapshot,
  reset,
  type HistorySnapshot,
} from "../slices/history";

// Shape-mutating action types that should be recorded as undo points.
// Tool switches and selection changes are intentionally excluded — only
// edits to the shapes themselves go on the stack, matching how undo
// works in design tools like Figma.
const UNDOABLE_TYPES = new Set([
  "shapes/addFrame",
  "shapes/addRect",
  "shapes/addEllipse",
  "shapes/addFreeDrawShape",
  "shapes/addArrow",
  "shapes/addLine",
  "shapes/addText",
  "shapes/addGeneratedUI",
  "shapes/updateShape",
  "shapes/removeShape",
  "shapes/clearAll",
  "shapes/deleteSelected",
]);

const snapshotOf = (state: RootState): HistorySnapshot => ({
  shapes: state.shapes.shapes,
  frameCounter: state.shapes.frameCounter,
});

// Drives undo/redo for the canvas. Listens for `history/undo` /
// `history/redo` (dispatched by the toolbar's HistoryPill) and for any
// shape-mutating action, coordinating the `shapes` and `history` slices
// so a single click can pop/push both atomically. See
// src/redux/slices/history/index.ts for why this exists.
export const historyMiddleware: Middleware<{}, RootState> =
  (store) => (next) => (action) => {
    const type = (action as { type?: string }).type;

    if (type === "history/undo") {
      const state = store.getState();
      const { past } = state.history;
      if (past.length === 0) return;
      const previous = past[past.length - 1];
      const current = snapshotOf(state);
      store.dispatch(commitUndo(current));
      store.dispatch(restoreShapes(previous));
      return;
    }

    if (type === "history/redo") {
      const state = store.getState();
      const { future } = state.history;
      if (future.length === 0) return;
      const next_ = future[future.length - 1];
      const current = snapshotOf(state);
      store.dispatch(commitRedo(current));
      store.dispatch(restoreShapes(next_));
      return;
    }

    if (type && UNDOABLE_TYPES.has(type)) {
      const before = snapshotOf(store.getState());
      const result = next(action);
      store.dispatch(pushSnapshot(before));
      return result;
    }

    if (type === "shapes/loadProject") {
      const result = next(action);
      store.dispatch(reset());
      return result;
    }

    return next(action);
  };
