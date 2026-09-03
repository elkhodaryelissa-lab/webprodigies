import { createSlice, PayloadAction, EntityState } from "@reduxjs/toolkit";
import type { Shape } from "../shapes";

// Undo/redo history for the canvas. Not shown in any screenshot yet —
// your toolbar's HistoryPill (src/components/canvas/toolbar/history)
// renders undo/redo buttons but doesn't wire them up in the video code
// you sent, so this is my own implementation of the actual mechanism,
// built to slot in cleanly once the real version (if the tutorial builds
// one differently) is available.
//
// It only tracks shape edits (add/update/remove/clear/delete-selected),
// not tool switches or selection changes, which is the usual convention
// for undo history in design tools.

export interface HistorySnapshot {
  shapes: EntityState<Shape, string>;
  frameCounter: number;
}

interface HistoryState {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
}

const MAX_HISTORY = 50;

const initialState: HistoryState = {
  past: [],
  future: [],
};

const historySlice = createSlice({
  name: "history",
  initialState,
  reducers: {
    // Called by historyMiddleware right before an undoable shapes action
    // is applied, with a snapshot of the shapes state as it was
    // immediately before that action.
    pushSnapshot(state, action: PayloadAction<HistorySnapshot>) {
      state.past.push(action.payload);
      if (state.past.length > MAX_HISTORY) state.past.shift();
      state.future = [];
    },
    // Called by historyMiddleware when undo runs: drops the snapshot it
    // just restored to off `past`, and stashes the pre-undo state
    // (the payload) onto `future` so redo can bring it back.
    commitUndo(state, action: PayloadAction<HistorySnapshot>) {
      state.past.pop();
      state.future.push(action.payload);
      if (state.future.length > MAX_HISTORY) state.future.shift();
    },
    // Mirror of commitUndo for redo.
    commitRedo(state, action: PayloadAction<HistorySnapshot>) {
      state.future.pop();
      state.past.push(action.payload);
      if (state.past.length > MAX_HISTORY) state.past.shift();
    },
    reset(state) {
      state.past = [];
      state.future = [];
    },
  },
});

export const { pushSnapshot, commitUndo, commitRedo, reset } =
  historySlice.actions;
export default historySlice.reducer;

// Plain action creators dispatched by the toolbar's undo/redo buttons.
// historyMiddleware (src/redux/middleware/history.ts) intercepts these
// by `type` before they reach any reducer — they never actually run
// through historySlice's own reducers, they're just typed, ergonomic
// `dispatch(undo())` / `dispatch(redo())` calls for the UI.
export const undo = () => ({ type: "history/undo" }) as const;
export const redo = () => ({ type: "history/redo" }) as const;

