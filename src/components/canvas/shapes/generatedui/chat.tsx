'use client'

// Reconciled against your fullest screenshots yet of the real
// src/components/canvas/shapes/generatedui/chat.tsx:
// - Outer panel wrapper (fixed/right-5/top-1/2/.../flex flex-col) and
//   its isOpen ? ... : ... transform/opacity pair: confirmed real,
//   verbatim, from your first chat.tsx screenshot.
// - Header content: confirmed real, verbatim -- the RefreshCw icon +
//   "Design Chat" Label, and the conditional Trash2 "clear chat"
//   Button (only rendered once chatState.messages.length > 0), wired
//   to a handleClearChat you can see referenced but whose own
//   definition wasn't shown (added to useChatWindow's return in
//   src/hooks/use-canvas.ts as a one-line dispatch(clearChat(...))).
// - ScrollArea + message list: confirmed real, verbatim -- the empty
//   state (RefreshCw icon, "Ask me to redesign this UI!" /
//   "I can change colors, layout, style, content, and more.") and the
//   `chatState.messages.map((message) => <div key={message.id}>{message.content}</div>)`
//   fallback when there are messages.
//
// Two things NOT shown in any screenshot, built myself:
// 1. A close (X) button -- `onClose` is part of Props and clearly
//    meant to be wired to something, but no screenshot ever showed it
//    called. Added one in the header (matching InspirationSidebar's
//    own X-button pattern elsewhere in this app) rather than leaving
//    onClose completely dead and the panel impossible to close except
//    by re-clicking the toolbar's Design Chat button.
// 2. The input row (text field + send button) -- every screenshot
//    ended at the message list, before any composer. Built using the
//    inputValue/inputRef/handleSendMessage/handleKeyDown this file's
//    confirmed useChatWindow hook already exposes.
//
// Also: your screenshot's `chatState.messages.map(...)` renders raw
// `message.content` with no role-based styling and no special-casing
// for a message that's mid-stream. That's safe here specifically
// because useChatWindow's handleSendMessage (see use-canvas.ts) never
// puts the raw streamed HTML into a message's content -- it only ever
// holds a short human-readable status ("Updating design...",
// "✓ Design regenerated successfully!", or an error) -- so rendering
// message.content directly, as confirmed, never dumps a full HTML
// document into the chat panel.
//
// One more correction: your screenshot uses `<ScrollArea ref={scrollAreaRef} ...>`
// (the shadcn-style component from src/components/ui/scroll-area.tsx),
// but that component isn't wrapped in React.forwardRef and its actual
// scrollable element is a nested Base UI Viewport, not the Root node a
// ref to it would resolve to -- so `scrollAreaRef.current.scrollTop = ...`
// (confirmed real, in useChatWindow's auto-scroll effect) would either
// fail to compile or silently scroll nothing. Using a plain native
// `<div>` with the same "flex-1 p-4 overflow-y-auto" classes instead,
// which is what that ref/scrollTop pattern actually needs to work.
import { cn } from '@/lib/utils'
import React from 'react'
import { RefreshCw, Trash2, X, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useChatWindow } from '@/hooks/use-canvas'
import type { ChatMessage } from '@/redux/slices/chat'

type Props = { generatedUIId: string; isOpen: boolean; onClose: () => void }

const ChatWindow = ({ generatedUIId, isOpen, onClose }: Props) => {
  // Hook has to run every render regardless of isOpen (Rules of Hooks)
  // -- your screenshot's `if (!isOpen) return null` sits before any
  // hook call in the component body, which would be a real bug if
  // useChatWindow is what actually reads/drives this panel's state.
  // Moved the early return to after this call; behavior for the
  // caller is identical either way.
  const {
    inputValue,
    setInputValue,
    scrollAreaRef,
    inputRef,
    chatState,
    isStreaming,
    handleSendMessage,
    handleClearChat,
    handleKeyDown,
  } = useChatWindow(generatedUIId, isOpen)

  if (!isOpen) return null

  return (
    <div
      className={cn(
        'fixed right-5 bottom-5 w-96 h-[600px] backdrop-blur-xl bg-white/[0.08] border-white/[0.12] border rounded-lg z-50 transition-all duration-300 flex flex-col',
        isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-white/[0.12]">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-white/80" />
          <Label className="text-white/80 font-medium">Design Chat</Label>
          <div className="flex items-center gap-1">
            {chatState?.messages && chatState.messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        {/* NOT from a screenshot -- see file header comment. */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div ref={scrollAreaRef} className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {!chatState?.messages || chatState.messages.length === 0 ? (
            <div className="text-center text-white/60 py-8">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Ask me to redesign this UI!</p>
              <p className="text-xs mt-1 opacity-75">
                I can change colors, layout, style, content, and more.
              </p>
            </div>
          ) : (
            chatState.messages.map((message: ChatMessage) => (
              <div key={message.id}>{message.content}</div>
            ))
          )}
        </div>
      </div>

      {/* NOT from a screenshot -- the composer row, see file header comment. */}
      <div className="p-3 border-t border-white/[0.12] flex items-center gap-2">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          placeholder="Describe the change you want..."
          className="flex-1 text-white placeholder:text-white/30"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSendMessage}
          disabled={isStreaming || !inputValue.trim()}
          className="h-8 w-8 p-0 text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

export default ChatWindow
