import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// PLACEHOLDER — I still haven't seen your tutorial's real viewport
// slice. Renamed the fields from my earlier guess (zoom/offset) to
// scale/translate because your confirmed Autosave screenshot reads
// `viewportState.scale` and `viewportState.translate` directly — so
// this shape now matches what that component (and the autosaveProject
// request) actually needs. Replace with the real slice once you see it.

export interface Point {
  x: number;
  y: number;
}

interface ViewportState {
  scale: number;
  translate: Point;
}

const initialState: ViewportState = {
  scale: 1,
  translate: { x: 0, y: 0 },
};

const viewportSlice = createSlice({
  name: "viewport",
  initialState,
  reducers: {
    setScale(state, action: PayloadAction<number>) {
      state.scale = action.payload;
    },
    setTranslate(state, action: PayloadAction<Point>) {
      state.translate = action.payload;
    },
    panBy(state, action: PayloadAction<Point>) {
      state.translate.x += action.payload.x;
      state.translate.y += action.payload.y;
    },
    resetViewport(state) {
      state.scale = initialState.scale;
      state.translate = { ...initialState.translate };
    },
  },
});

export const { setScale, setTranslate, panBy, resetViewport } = viewportSlice.actions;
export default viewportSlice.reducer;
