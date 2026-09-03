import { Reducer } from "@reduxjs/toolkit";
import chatReducer from "./chat";
import historyReducer from "./history";
import profileReducer from "./profile";
import projectsReducer from "./projects";
import shapesReducer from "./shapes";
import viewportReducer from "./viewport";

// chat: NOT from a screenshot -- registered so the useChatWindow
// hook's `state.chat.chats[generatedUIId]` selector (confirmed real,
// from your screenshots) has something to read.
export const slices: Record<string, Reducer> = {
  chat: chatReducer,
  history: historyReducer,
  profile: profileReducer,
  projects: projectsReducer,
  shapes: shapesReducer,
  viewport: viewportReducer,
}
