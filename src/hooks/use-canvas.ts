'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useAppDispatch, useAppSelector, useAppStore } from '@/redux/hooks'
import { updateShape, addGeneratedUI, removeShape, type FrameShape, type Shape } from '@/redux/slices/shapes'
import { nanoid } from '@reduxjs/toolkit'
import { useGenerateWorkflowMutation } from '@/redux/api/generation'
import {
  generateFrameSnapshot,
  downloadBlob,
  exportGeneratedUIAsPNG,
  blobToBase64,
} from '@/lib/frame-snapshot'
import {
  initializeChat,
  addUserMessage,
  startStreamingResponse,
  updateStreamingContent,
  finishStreamingResponse,
  addErrorMessage,
  clearChat,
} from '@/redux/slices/chat'
import { toast } from 'sonner'

// Not from any screenshot -- a small local guard so a stray ```html
// fence from the model (despite the route's system prompt telling it
// not to) doesn't end up rendered literally inside the generated UI.
const stripCodeFence = (markup: string) =>
  markup.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/i, '')

export const useFrame = (shape: FrameShape) => {
  const dispatch = useAppDispatch()
  const [isGenerating, setIsGenerating] = useState(false)

  const allShapes = useAppSelector((state) =>
    Object.values(state.shapes.shapes?.entities || {}).filter(
      (shape): shape is Shape => shape !== undefined
    )
  )

  // Reconciled again against a second screenshot of the real
  // handleGenerateDesign, which revealed the part after the fetch: a
  // `reader.read()` loop (`res.body.getReader()`), a 200ms throttle
  // (`UPDATE_THROTTLE_MS`/`lastUpdateTime`) accumulating markup and
  // live-patching `uiSpecData` as it streams in, and a final patch with
  // the full accumulated markup when `done`. That only makes sense if
  // /api/canvas/generate streams plain text rather than returning one
  // JSON blob -- so that route is now rewritten to stream, and this is
  // the matching client side, reconstructed around the confirmed
  // fragment (the while(true)/done/break/dispatch shape and the two
  // throttle variables are exact; the decode-and-throttle body in
  // between wasn't shown, so that part is my own standard
  // ReadableStream-consumption code).
  //
  // Your screenshot showed both catch blocks confirmed empty (`catch
  // (error) {}`) -- same call as before: keeping them non-silent given
  // the stuck-forever bug an empty catch already caused once this
  // session.
  const handleGenerateDesign = async () => {
    try {
      setIsGenerating(true)
      const snapshot = await generateFrameSnapshot(shape, allShapes)

      downloadBlob(snapshot, `frame-${shape.frameNumber}-snapshot.png`)

      const formData = new FormData()
      formData.append('image', snapshot, `frame-${shape.frameNumber}.png`)
      formData.append('frameNumber', shape.frameNumber.toString())

      const urlParams = new URLSearchParams(window.location.search)
      const projectId = urlParams.get('project')
      if (projectId) {
        formData.append('projectId', projectId)
      }

      const generatedUIPosition = {
        x: shape.x + shape.w + 50, // 50px spacing from frame
        y: shape.y,
        w: Math.max(400, shape.w), // At least 400px wide, or frame width if larger
        h: Math.max(300, shape.h), // At least 300px high, or frame height if larger
      }

      const generatedUIId = nanoid()

      dispatch(
        addGeneratedUI({
          ...generatedUIPosition,
          id: generatedUIId,
          uiSpecData: null, // Start with null for live rendering
          sourceFrameId: shape.id,
        })
      )

      const res = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(
          data?.details ||
            data?.message ||
            (data?.error === 'insufficient-credits'
              ? "You're out of credits."
              : data?.error || 'Failed to generate design.')
        )
        // BUG FIX: the placeholder shape was already dispatched
        // (optimistically, uiSpecData: null) before this fetch -- on
        // failure it was never cleaned up, so it sat on the canvas
        // showing "Generating design..." forever with no way to tell
        // it had actually failed (this matches the "keeps loading,
        // nothing appears" report). Remove it so a failed generation
        // just disappears instead of hanging.
        dispatch(removeShape(generatedUIId))
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let accumulatedMarkup = ''

      let lastUpdateTime = 0
      const UPDATE_THROTTLE_MS = 200

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              // Update with final accumulated markup
              dispatch(
                updateShape({
                  id: generatedUIId,
                  patch: { uiSpecData: stripCodeFence(accumulatedMarkup) },
                })
              )
              break
            }

            const chunk = decoder.decode(value)
            accumulatedMarkup += chunk

            const now = Date.now()
            if (now - lastUpdateTime >= UPDATE_THROTTLE_MS) {
              dispatch(
                updateShape({
                  id: generatedUIId,
                  patch: { uiSpecData: stripCodeFence(accumulatedMarkup) },
                })
              )
              lastUpdateTime = now
            }
          }
        } catch (error) {
          console.error('Design stream read error:', error)
          toast.error('Design generation was interrupted.')
          // Same bug fix as the !res.ok branch above -- don't leave a
          // dead placeholder stuck on "Generating design..." forever.
          dispatch(removeShape(generatedUIId))
        }
      }
    } catch (error) {
      console.error('Generate design error:', error)
      toast.error('Failed to generate design.')
    } finally {
      setIsGenerating(false)
    }
  }
  return {
    isGenerating,
    handleGenerateDesign,
  }
}

// Confirmed real from your screenshot -- the whole hook, verbatim.
export const useInspiration = () => {
  const [isInspirationOpen, setIsInspirationOpen] = useState(false)

  const toggleInspiration = () => {
    setIsInspirationOpen(!isInspirationOpen)
  }

  const openInspiration = () => {
    setIsInspirationOpen(true)
  }

  const closeInspiration = () => {
    setIsInspirationOpen(false)
  }

  return {
    isInspirationOpen,
    toggleInspiration,
    openInspiration,
    closeInspiration,
  }
}

// NOT from a screenshot -- only the destructuring line inside
// useGlobalChat below (`const { generateWorkflow } =
// useWorkflowGeneration()`) was shown, not this hook's own body, so
// this is my own build. Mirrors handleGenerateDesign's
// isGenerating/toast pattern above, and exposes generateWorkflow(id)
// matching the prop signature GeneratedUI/CanvasShape/CanvasSurface
// already thread around for it. No workflow-generation endpoint exists
// yet (nothing like /api/generate/workflow), so this surfaces an
// honest "not built yet" toast instead of silently no-op'ing -- swap
// the body for a real fetch() once you show me that part of the
// tutorial.
// Confirmed real, reconstructed across three rounds of screenshots
// (each one cropped a little further than the last): the
// useAppDispatch/useGenerateWorkflowMutation/allShapes setup, the
// generatedUIId lookup + 'Generated UI not found' guard, the
// uiSpecData + 'No design data to generate workflow from' guard, and
// the window.location project param + 'Project ID not found' guard --
// all four verbatim, same order.
//
// Two deliberate deviations, flagged same as earlier ones this
// session:
// 1) Every screenshot crops out right before anything that actually
//    calls the mutation, and the confirmed destructure even throws the
//    trigger function away (`const [, { isLoading: ... }] =
//    useGenerateWorkflowMutation()`). Taken literally, Generate
//    Workflow would validate everything and then do nothing -- same
//    "confirmed but non-functional" shape as the empty catch blocks
//    and the commented-out fileInputRef earlier. Named the trigger
//    below and call it with the pieces this function already
//    validates (generatedUIId, projectId, the design markup) once all
//    three guards pass. The real /api/generate/workflow route.ts isn't
//    built yet either (only its RTK Query client stub exists, in
//    src/redux/api/generation/index.tsx) -- send it whenever you get
//    there.
// 2) `catch (error) {}` (empty) confirmed in your screenshot -- kept
//    real error handling instead, same reasoning as every other empty
//    catch fixed this session.
// Corrected against your latest, much fuller screenshots: the real
// generateWorkflow does NOT call the RTK Query trigger at all -- it's
// destructured away exactly as your very first screenshot showed
// (`const [, { isLoading: ... }] = useGenerateWorkflowMutation()`, the
// trigger genuinely unused), and the actual multi-page generation
// loop uses raw fetch() per page, same streaming pattern as
// handleGenerateDesign above (dispatch a null placeholder shape first
// for live rendering, then stream the response into it). Reverted my
// last guess (calling the trigger) now that this is confirmed.
//
// Confirmed real, verbatim, pieced together across several crops of
// the same paused frame: pageCount = 4, the toast.loading(...,
// {id: 'workflow-generation'}) call, baseX/spacing math, the
// workflowPromises = Array.from({length: pageCount}).map(async (_,
// index) => {...}) shape, the workflowPosition object (with its two
// inline comments), workflowId via nanoid(), the
// dispatch(addGeneratedUI({...})) placeholder (uiSpecData: null,
// isWorkflowPage: true), the fetch('/api/generate/workflow', {...})
// call with its exact body shape (generatedUIId, currentHTML,
// projectId, pageIndex), and the reader/decoder streaming loop that
// dispatches updateShape with the accumulating HTML.
//
// Three things not shown in any crop, completed the same way
// handleGenerateDesign's gaps were:
// 1) `if (!response.ok)` -- every crop jumped straight from the fetch
//    call to reading the body, so added a minimal guard before that,
//    consistent with how the rest of this codebase treats failed
//    fetches.
// 2) Nothing awaits workflowPromises or resolves the loading toast --
//    every crop ends right at the map()'s closing paren. Added
//    `await Promise.all(...)` plus a toast.success reusing the same
//    'workflow-generation' id (so it replaces the loading toast
//    instead of stacking a second one).
// 3) Both `catch (error) {}` blocks (inner per-page, outer whole-
//    function) are confirmed empty in your screenshots -- same
//    deviation as every other empty catch fixed this session: real
//    error handling instead, and the outer one also resolves the
//    loading toast to an error state so it doesn't hang forever.
export const useWorkflowGeneration = () => {
  const dispatch = useAppDispatch()
  const [, { isLoading: isGeneratingWorkflow }] = useGenerateWorkflowMutation()

  const allShapes = useAppSelector((state) =>
    Object.values(state.shapes.shapes?.entities || {}).filter(
      (shape): shape is Shape => shape !== undefined
    )
  )

  const generateWorkflow = async (generatedUIId: string) => {
    try {
      const currentShape = allShapes.find(
        (shape) => shape.id === generatedUIId
      )
      if (!currentShape || currentShape.type !== 'generatedui') {
        toast.error('Generated UI not found')
        return
      }

      if (!currentShape.uiSpecData) {
        toast.error('No design data to generate workflow from')
        return
      }

      const urlParams = new URLSearchParams(window.location.search)
      const projectId = urlParams.get('project')

      if (!projectId) {
        toast.error('Project ID not found')
        return
      }

      const pageCount = 4
      toast.loading('Generating workflow pages...', {
        id: 'workflow-generation',
      })
      const baseX = currentShape.x + currentShape.w + 100
      const spacing = Math.max(currentShape.w + 50, 450)

      const workflowPromises = Array.from({ length: pageCount }).map(
        async (_, index) => {
          try {
            const workflowPosition = {
              x: baseX + index * spacing,
              y: currentShape.y,
              w: Math.max(400, currentShape.w), // At least 400px wide
              h: Math.max(300, currentShape.h), // At least 300px high
            }
            const workflowId = nanoid()
            dispatch(
              addGeneratedUI({
                ...workflowPosition,
                id: workflowId,
                uiSpecData: null, // Start with null for live rendering
                sourceFrameId: currentShape.sourceFrameId,
                isWorkflowPage: true, // Mark as workflow page
              })
            )

            const response = await fetch('/api/generate/workflow', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                generatedUIId,
                currentHTML: currentShape.uiSpecData,
                projectId,
                pageIndex: index,
              }),
            })

            if (!response.ok) {
              throw new Error(`Failed to generate workflow page ${index + 1}`)
            }

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            let accumulatedHTML = ''

            if (reader) {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                accumulatedHTML += chunk

                // Update the workflow page with streamed HTML
                dispatch(
                  updateShape({
                    id: workflowId,
                    patch: { uiSpecData: accumulatedHTML },
                  })
                )
              }
            }

            return { pageIndex: index, success: true }
          } catch (error) {
            console.error(`Error generating page ${index + 1}:`, error)
            return { pageIndex: index, success: false, error }
          }
        }
      )

      const results = await Promise.all(workflowPromises)
      const successCount = results.filter((r) => r.success).length
      const failureCount = results.length - successCount
      if (successCount === 4) {
        toast.success('\u2713 All 4 workflow pages generated successfully!', {
          id: 'workflow-generation',
        })
      } else if (successCount > 0) {
        toast.success(
          `\u2713 Generated ${successCount}/4 workflow pages successfully!`,
          { id: 'workflow-generation' }
        )
      } else {
        toast.error(`Failed to generate all ${failureCount} workflow pages`, {
          id: 'workflow-generation',
        })
      }
    } catch (error) {
      console.error('Workflow generation error:', error)
      toast.error('Failed to generate workflow pages', {
        id: 'workflow-generation',
      })
    }
  }

  return {
    generateWorkflow,
    isGeneratingWorkflow,
  }
}

// Your later screenshots moved past the "//TODO: add chat window"
// stage -- chat.tsx and useChatWindow (below) are now real, confirmed
// code, which means this TODO is stale and toggleChat/closeChat need
// to actually exist for GeneratedUI's "Design Chat" button and
// chat.tsx's onClose to do anything. Not shown in any screenshot
// (useGlobalChat's own body wasn't re-shown once the TODO was
// resolved), so this is my own build: same open/close-hook shape as
// the confirmed-real useInspiration hook above, and toggleChat mirrors
// GeneratedUI's confirmed `toggleChat: (generatedUIId: string) => void`
// prop signature -- clicking the same shape's button again closes it,
// clicking a different shape's button switches to that one.
export const useGlobalChat = () => {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [activeGeneratedUIId, setActiveGeneratedUIId] = useState<
    string | null
  >(null)
  const { generateWorkflow } = useWorkflowGeneration()

  const toggleChat = (generatedUIId: string) => {
    if (activeGeneratedUIId === generatedUIId && isChatOpen) {
      setIsChatOpen(false)
      return
    }
    setActiveGeneratedUIId(generatedUIId)
    setIsChatOpen(true)
  }

  const closeChat = () => {
    setIsChatOpen(false)
  }

  // Confirmed real from your latest screenshots: exportDesign lives
  // INSIDE useGlobalChat (not as its own handler in surface.tsx, which
  // is where I'd originally put it) -- console.warn/console.log
  // wording, the filename shape (`generated-ui-${id.slice(0, 8)}.png`),
  // and both toast messages are all verbatim. Only the parameter list
  // itself was collapsed in your screenshot (just `async (\n) => {`
  // visible) -- filled in as (generatedUIId, element) since those are
  // exactly the two names the body reads, matching the
  // exportDesign prop signature GeneratedUI already calls with
  // (shape.id, containerRef.current).
  const exportDesign = async (
    generatedUIId: string,
    element: HTMLElement | null
  ) => {
    if (!element) {
      console.warn('\u274C No element to export for shape:', generatedUIId)
      toast.error('No design element found for export.')
      return
    }

    try {
      const filename = `generated-ui-${generatedUIId.slice(0, 8)}.png`
      console.log('\u{1F4F8} Starting snapshot export:', { filename })

      await exportGeneratedUIAsPNG(element, filename)

      toast.success('Design exported successfully!')
    } catch (error) {
      console.error('\u274C Failed to export GeneratedUI:', error)
      toast.error('Failed to export design. Please try again.')
    }
  }

  return {
    isChatOpen,
    activeGeneratedUIId,
    toggleChat,
    closeChat,
    generateWorkflow,
    exportDesign,
  }
}

// Reconciled across several rounds of screenshots of the real
// src/hooks/use-canvas.ts: the confirmed opening (inputValue state,
// scrollAreaRef/inputRef, chatState via `state.chat.chats[generatedUIId]`,
// currentShape, allShapes), the confirmed getSourceFrame (renamed from
// what one blurrier screenshot's breadcrumb rendered as "getSourceFram"
// -- kept the correctly-spelled call sites your other screenshots
// showed, since a real typo there would break the build), the two
// confirmed useEffects (auto-scroll and auto-focus-on-open), and the
// confirmed fragments of handleSendMessage itself (the early
// `!inputValue.trim() || chatState?.isStreaming` guard, dispatching
// startStreamingResponse with a generated responseId, the
// isWorkflowPage check, the projectId-from-URL guard throwing 'Project
// ID not found in URL', the baseRequestData shape, and the final
// finishStreamingResponse/addErrorMessage dispatches with their exact
// field names and success string).
//
// What wasn't shown: the actual fetch()/stream-reading body between
// building the request and finishStreamingResponse, and
// addUserMessage/initializeChat's exact call sites. Built the same way
// this file's other two streaming flows already work
// (handleGenerateDesign, useWorkflowGeneration) -- read the response
// body via a reader/decoder loop, throttled dispatch(updateShape(...))
// with the accumulating markup so the design updates live on the
// canvas as it streams, same 200ms throttle constant. The chat
// message itself never holds that raw HTML (see chat.tsx's file
// comment) -- it gets a short "Updating design..." status instead,
// swapped for the confirmed success/error text once the stream ends.
//
// Also: no /api/generate/workflow-redesign route exists in this
// project (only /api/generate/redesign does -- confirmed by the api
// directory this session already read), so isWorkflowPage throws an
// honest "not built yet" error instead of fetching a route that would
// 404, same as every other not-yet-built endpoint this session.
export const useChatWindow = (generatedUIId: string, isOpen: boolean) => {
  const [inputValue, setInputValue] = useState('')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dispatch = useAppDispatch()
  const chatState = useAppSelector((state) => state.chat.chats[generatedUIId])
  const currentShape = useAppSelector(
    (state) => state.shapes.shapes.entities[generatedUIId]
  )
  const allShapes = useAppSelector((state) => state.shapes.shapes.entities)

  const getSourceFrame = (): FrameShape | null => {
    if (!currentShape || currentShape.type !== 'generatedui') {
      return null
    }
    const sourceFrameId = currentShape.sourceFrameId
    if (!sourceFrameId) {
      return null
    }
    const sourceFrame = allShapes[sourceFrameId]
    if (!sourceFrame || sourceFrame.type !== 'frame') {
      return null
    }
    return sourceFrame as FrameShape
  }

  useEffect(() => {
    // Deliberate deviation: your screenshot has this unguarded
    // (`scrollAreaRef.current.scrollTop = ...`), but the scroll
    // container only exists in the DOM while the panel is open
    // (chat.tsx returns null when !isOpen) -- so on first mount, or
    // right after the panel closes, scrollAreaRef.current is null and
    // this would throw instead of silently no-op'ing. Guarded, same
    // class of fix as the empty-catch bugs fixed elsewhere this
    // session.
    if (!scrollAreaRef.current) return
    scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
  }, [chatState?.messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || chatState?.isStreaming) return

    // NOT from a screenshot -- added after a real report: sending a
    // chat message before the design finishes its first generation
    // (uiSpecData still null) reached the server with `currentHTML:
    // null`, which /api/generate/redesign correctly rejects with 400
    // "Missing required fields...". That's not wrong server-side, but
    // it's a confusing way to find out client-side (a caught error
    // that Next's dev overlay still surfaces prominently via
    // console.error). Guarding the same way useWorkflowGeneration
    // already guards "No design data to generate workflow from".
    if (!currentShape || currentShape.type !== 'generatedui') {
      toast.error('Generated UI not found')
      return
    }
    if (!currentShape.uiSpecData) {
      toast.error('Wait for the design to finish generating first.')
      return
    }

    const message = inputValue.trim()
    setInputValue('')

    dispatch(initializeChat(generatedUIId))
    dispatch(addUserMessage({ generatedUIId, content: message }))

    const responseId = nanoid()

    try {
      dispatch(startStreamingResponse({ generatedUIId, messageId: responseId }))

      const isWorkflowPage =
        currentShape?.type === 'generatedui' && currentShape.isWorkflowPage

      const urlParams = new URLSearchParams(window.location.search)
      const projectId = urlParams.get('project')

      if (!projectId) {
        throw new Error('Project ID not found in URL')
      }

      const baseRequestData = {
        userMessage: message,
        generatedUIId: generatedUIId,
        currentHTML:
          currentShape?.type === 'generatedui' ? currentShape.uiSpecData : null,
        projectId: projectId, // Pass projectId in body
      }

      const apiEndpoint = '/api/generate/redesign'
      let wireframeSnapshot: string | null = null

      if (isWorkflowPage) {
        throw new Error(
          "Chat editing for workflow pages isn't built yet -- try this on the main generated design instead."
        )
      } else {
        const sourceFrame = getSourceFrame()
        if (sourceFrame && sourceFrame.type === 'frame') {
          try {
            const shapesArray = Object.values(allShapes).filter(
              (s): s is Shape => !!s
            )
            const blob = await generateFrameSnapshot(sourceFrame, shapesArray)
            wireframeSnapshot = await blobToBase64(blob)
          } catch (error) {
            console.error('Failed to build wireframe snapshot for chat:', error)
          }
        }
      }

      dispatch(
        updateStreamingContent({ generatedUIId, content: 'Updating design...' })
      )

      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...baseRequestData, wireframeSnapshot }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(
          data?.details || data?.error || 'Failed to update design.'
        )
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let accumulatedMarkup = ''
      let lastUpdateTime = 0
      const UPDATE_THROTTLE_MS = 200

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            dispatch(
              updateShape({
                id: generatedUIId,
                patch: { uiSpecData: stripCodeFence(accumulatedMarkup) },
              })
            )
            break
          }

          const chunk = decoder.decode(value)
          accumulatedMarkup += chunk

          const now = Date.now()
          if (now - lastUpdateTime >= UPDATE_THROTTLE_MS) {
            dispatch(
              updateShape({
                id: generatedUIId,
                patch: { uiSpecData: stripCodeFence(accumulatedMarkup) },
              })
            )
            lastUpdateTime = now
          }
        }
      }

      dispatch(
        finishStreamingResponse({
          generatedUIId,
          messageId: responseId,
          finalContent: '\u2713 Design regenerated successfully!',
        })
      )
    } catch (error) {
      console.error('Chat error:', error)
      dispatch(
        addErrorMessage({
          generatedUIId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      )
      toast.error('Failed to regenerate design')
    }
  }

  const handleClearChat = () => {
    dispatch(clearChat(generatedUIId))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return {
    inputValue,
    setInputValue,
    scrollAreaRef,
    inputRef,
    chatState,
    isStreaming: chatState?.isStreaming ?? false,
    handleSendMessage,
    handleClearChat,
    handleKeyDown,
  }
}

type ResizeStartDetail = { shapeId: string; corner: string }
type ResizeMoveDetail = { shapeId: string; corner: string; clientX: number; clientY: number }

// The real SelectionOverlay (src/components/canvas/shapes/selection.tsx)
// draws draggable corner handles on a selected shape and, when you drag
// one, dispatches `shape-resize-start` / `shape-resize-move` /
// `shape-resize-end` window CustomEvents — its own comment says "we'll
// handle the resize logic in the canvas hook", but that logic wasn't
// included, so this is my own implementation of it, called once from
// CanvasSurface.
//
// Frame/Rect/Ellipse/GeneratedUI resize normally (drag a corner, x/y/w/h
// update). Line/Arrow resize by moving whichever endpoint owns that
// corner of the bounding box (works for any diagonal, not just
// top-left-to-bottom-right lines). Freedraw and Text don't have a
// resize implementation here yet — their handles render (matching
// SelectionOverlay's `isResizable` list) but dragging them is currently
// a no-op rather than guessing at "scale all points" / "scale font
// size" behavior that hasn't been shown anywhere.
export const useShapeResize = () => {
  const dispatch = useAppDispatch()
  const store = useAppStore()

  useEffect(() => {
    let active: {
      shapeId: string
      corner: string
      original: ReturnType<typeof store.getState>['shapes']['shapes']['entities'][string]
      anchor: { x: number; y: number } | null
    } | null = null

    const handleStart = (e: Event) => {
      const { shapeId, corner } = (e as CustomEvent<ResizeStartDetail>).detail
      const original = store.getState().shapes.shapes.entities[shapeId]
      if (!original) return
      active = { shapeId, corner, original, anchor: null }
    }

    const handleMove = (e: Event) => {
      if (!active) return
      const { clientX, clientY } = (e as CustomEvent<ResizeMoveDetail>).detail
      const { zoom } = store.getState().viewport

      if (!active.anchor) {
        active.anchor = { x: clientX, y: clientY }
        return
      }

      const dx = (clientX - active.anchor.x) / zoom
      const dy = (clientY - active.anchor.y) / zoom
      const { original, corner, shapeId } = active

      if (
        original.type === 'frame' ||
        original.type === 'rect' ||
        original.type === 'ellipse' ||
        original.type === 'generatedui'
      ) {
        let { x, y, w, h } = original
        if (corner.includes('w')) {
          x = original.x + dx
          w = original.w - dx
        }
        if (corner.includes('e')) {
          w = original.w + dx
        }
        if (corner.includes('n')) {
          y = original.y + dy
          h = original.h - dy
        }
        if (corner.includes('s')) {
          h = original.h + dy
        }
        w = Math.max(w, 8)
        h = Math.max(h, 8)
        dispatch(updateShape({ id: shapeId, patch: { x, y, w, h } }))
        return
      }

      if (original.type === 'line' || original.type === 'arrow') {
        let { startX, startY, endX, endY } = original
        const startIsMinX = startX <= endX
        const startIsMinY = startY <= endY

        if (corner.includes('w')) {
          if (startIsMinX) startX += dx
          else endX += dx
        }
        if (corner.includes('e')) {
          if (startIsMinX) endX += dx
          else startX += dx
        }
        if (corner.includes('n')) {
          if (startIsMinY) startY += dy
          else endY += dy
        }
        if (corner.includes('s')) {
          if (startIsMinY) endY += dy
          else startY += dy
        }

        dispatch(updateShape({ id: shapeId, patch: { startX, startY, endX, endY } }))
        return
      }

      // freedraw / text: intentionally not implemented yet.
    }

    const handleEnd = () => {
      active = null
    }

    window.addEventListener('shape-resize-start', handleStart)
    window.addEventListener('shape-resize-move', handleMove)
    window.addEventListener('shape-resize-end', handleEnd)
    return () => {
      window.removeEventListener('shape-resize-start', handleStart)
      window.removeEventListener('shape-resize-move', handleMove)
      window.removeEventListener('shape-resize-end', handleEnd)
    }
  }, [dispatch, store])
}
