// Path kept at this project's established '@/redux/slices/chat'
// (plural) rather than the '@/redux/slice/chat' (singular) implied
// elsewhere -- same recurring singular/plural difference between the
// tutorial's real files and this project's actual layout seen
// everywhere else this session (shapes, viewport, etc.).
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

// Confirmed real, in full, from your screenshot.
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string // Changed from Date to string for Redux serialization
  isStreaming?: boolean
}

// Confirmed real, in full, from your screenshot.
export interface GeneratedUIChat {
  generatedUIId: string
  messages: ChatMessage[]
  isStreaming: boolean
  streamingMessageId: string | null
}

// Confirmed real, in full, from your screenshot.
interface ChatState {
  chats: Record<string, GeneratedUIChat> // Key: generatedUIId
}

// Confirmed real, in full, from your screenshot.
const initialState: ChatState = {
  chats: {},
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Confirmed real, in full, from your screenshot.
    initializeChat: (state, action: PayloadAction<string>) => {
      const generatedUIId = action.payload
      if (!state.chats[generatedUIId]) {
        state.chats[generatedUIId] = {
          generatedUIId,
          messages: [],
          isStreaming: false,
          streamingMessageId: null,
        }
      }
    },

    // Name/call-site confirmed by useChatWindow's handleSendMessage
    // screenshot -- the reducer body itself wasn't shown, so this is
    // my own build: push a real user message, defensively
    // initializing the chat first the same way initializeChat does.
    addUserMessage: (
      state,
      action: PayloadAction<{ generatedUIId: string; content: string }>
    ) => {
      const { generatedUIId, content } = action.payload
      if (!state.chats[generatedUIId]) {
        state.chats[generatedUIId] = {
          generatedUIId,
          messages: [],
          isStreaming: false,
          streamingMessageId: null,
        }
      }
      state.chats[generatedUIId].messages.push({
        id: `${generatedUIId}-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      })
    },

    // Confirmed real, in full, from your screenshot: the isStreaming/
    // streamingMessageId assignment and the empty placeholder message
    // push, verbatim including the "// Add empty streaming message"
    // comment.
    startStreamingResponse: (
      state,
      action: PayloadAction<{
        generatedUIId: string
        messageId: string
      }>
    ) => {
      const { generatedUIId, messageId } = action.payload
      const chat = state.chats[generatedUIId]

      if (chat) {
        chat.isStreaming = true
        chat.streamingMessageId = messageId

        // Add empty streaming message
        chat.messages.push({
          id: messageId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          isStreaming: true,
        })
      }
    },

    // Confirmed real NAME (from the exports list your screenshot
    // showed) -- its body/call-site wasn't shown, so this is my own
    // build. Matches this codebase's existing streaming convention
    // (handleGenerateDesign/generateWorkflow both dispatch the FULL
    // accumulated string on a throttle rather than appending
    // incremental chunks in the reducer), so this replaces the
    // streaming message's content wholesale each call rather than
    // concatenating.
    updateStreamingContent: (
      state,
      action: PayloadAction<{ generatedUIId: string; content: string }>
    ) => {
      const { generatedUIId, content } = action.payload
      const chat = state.chats[generatedUIId]
      if (!chat || !chat.streamingMessageId) return
      const message = chat.messages.find(
        (m) => m.id === chat.streamingMessageId
      )
      if (message) {
        message.content = content
      }
    },

    // Confirmed real call site and payload shape, from your
    // screenshot of handleSendMessage's success path:
    // finishStreamingResponse({ generatedUIId, messageId: responseId,
    // finalContent: '✓ Design regenerated successfully!' }) --
    // messageId/finalContent field names verbatim. The reducer body
    // itself wasn't shown; this fills the named message in with
    // finalContent and clears the streaming flags, same idea as my
    // earlier guess just renamed to match the confirmed field names.
    finishStreamingResponse: (
      state,
      action: PayloadAction<{
        generatedUIId: string
        messageId: string
        finalContent: string
      }>
    ) => {
      const { generatedUIId, messageId, finalContent } = action.payload
      const chat = state.chats[generatedUIId]
      if (!chat) return
      const message = chat.messages.find((m) => m.id === messageId)
      if (message) {
        message.content = finalContent
        message.isStreaming = false
      }
      chat.isStreaming = false
      chat.streamingMessageId = null
    },

    // Confirmed real call site, from your screenshot of
    // handleSendMessage's catch block: addErrorMessage({
    // generatedUIId, error: error instanceof Error ? error.message :
    // 'Unknown error' }). Reducer body wasn't shown -- overwrites the
    // in-flight streaming message with the error (or pushes a new one
    // if none is streaming) and clears the streaming flags, so a
    // failed request doesn't leave the panel stuck on "Updating
    // design..." forever.
    addErrorMessage: (
      state,
      action: PayloadAction<{ generatedUIId: string; error: string }>
    ) => {
      const { generatedUIId, error } = action.payload
      const chat = state.chats[generatedUIId]
      if (!chat) return
      const message = chat.messages.find(
        (m) => m.id === chat.streamingMessageId
      )
      if (message) {
        message.content = `⚠️ ${error}`
        message.isStreaming = false
      } else {
        chat.messages.push({
          id: `${generatedUIId}-error-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ ${error}`,
          timestamp: new Date().toISOString(),
        })
      }
      chat.isStreaming = false
      chat.streamingMessageId = null
    },

    // Confirmed real, in full, from your screenshot.
    clearChat: (state, action: PayloadAction<string>) => {
      const generatedUIId = action.payload
      if (state.chats[generatedUIId]) {
        state.chats[generatedUIId].messages = []
        state.chats[generatedUIId].isStreaming = false
        state.chats[generatedUIId].streamingMessageId = null
      }
    },

    // Confirmed real, in full, from your screenshot (the
    // `delete state.chats[generatedUIId]` line and its PayloadAction<string>
    // signature) -- the `const generatedUIId = action.payload` line sits
    // in the one-line gap your screenshot's crop skipped, same pattern
    // every other reducer here uses.
    removeChat: (state, action: PayloadAction<string>) => {
      const generatedUIId = action.payload
      delete state.chats[generatedUIId]
    },
  },
})

export const {
  initializeChat,
  addUserMessage,
  startStreamingResponse,
  updateStreamingContent,
  finishStreamingResponse,
  addErrorMessage,
  clearChat,
  removeChat,
} = chatSlice.actions

export default chatSlice.reducer
