// Confirmed real from your screenshots (assembled across several,
// including a scroll to lines 102-124 of your file, so this is the
// fullest picture so far): sanitizeHtml now comes destructured from
// useUpdateContainer (matches your screenshot exactly), the outer
// container has boxShadow/padding/minHeight/position styling, a
// floating button row (Export / Generate Workflow / Design Chat) using
// the existing LiquidGlassButton, a conditional render (real HTML via
// sanitizeHtml when shape.uiSpecData exists, "Generating design..."
// pulse placeholder otherwise), and a small "Generated UI" label badge.
//
// One thing flagged, not guessed at: your screenshots showed two
// closing </div> tags right after the conditional block before the
// label div, one more than this structure produces -- functionally
// equivalent either way, but if you see the extra wrapper div in your
// editor, send it over and I'll match it exactly.
//
// handleExportDesign/handleGenerateWorkflow/handleToggleChat wiring
// (what args get passed to the toggleChat/generateWorkflow/exportDesign
// props) wasn't shown -- only the onClick={handleX} references were --
// so this is my best inference from the Props type signatures.
import { GeneratedUIShape } from '@/redux/slices/shapes'
import { useUpdateContainer } from '@/hooks/use-styles'
import { LiquidGlassButton } from '@/components/buttons/liquid-glass'
import { Download, Workflow, MessageCircle } from 'lucide-react'
import React, { useEffect } from 'react'

// NEW, not from a screenshot -- root-causing your "text is black / I
// can't see anything" report. Two things were going on, same root
// cause as the white-PNG bug (content rendering same color as its
// background):
//
// 1) The system prompt (src/lib/prompts.ts) tells the model to put
//    <script src="https://cdn.tailwindcss.com"></script> in <head> so
//    its Tailwind utility classes (bg-white, text-slate-900, etc.)
//    actually resolve to real CSS. But sanitizeHtml (use-styles.ts)
//    strips every <script> tag for XSS safety, and even if it didn't,
//    a <script> injected via dangerouslySetInnerHTML never executes --
//    that's inert-by-design DOM behavior. So the Tailwind CDN was
//    NEVER loading, which means every className in the AI's HTML was a
//    no-op: no background, no text color -- just the browser default
//    (black text, transparent background) sitting over this app's dark
//    canvas. Invisible black-on-dark text, exactly what you described.
//    Fix: load the Tailwind Play CDN once, globally, ourselves (it has
//    its own MutationObserver and will style newly-inserted DOM, so it
//    still picks up each generated block as it streams in).
//
// 2) Even with Tailwind loading, a full <!DOCTYPE html><html>...
//    document injected into a div loses its <body> tag/classes during
//    HTML fragment parsing (only body's children survive), so a
//    bg-white the model put on <body> would be silently dropped too.
//    Belt-and-suspenders: give the rendering container its own
//    explicit white background below.
let tailwindCdnLoading = false
const ensureTailwindCdn = () => {
  if (typeof document === 'undefined') return
  if (document.querySelector('script[data-generated-ui-tailwind]')) return
  if (tailwindCdnLoading) return
  tailwindCdnLoading = true
  const script = document.createElement('script')
  script.src = 'https://cdn.tailwindcss.com'
  script.setAttribute('data-generated-ui-tailwind', 'true')
  document.head.appendChild(script)
}

type Props = {
  shape: GeneratedUIShape
  toggleChat: (generatedUIId: string) => void
  generateWorkflow: (generatedUIId: string) => void
  exportDesign: (generatedUIId: string, element: HTMLElement | null) => void
}

const GeneratedUI = ({
  shape,
  toggleChat,
  generateWorkflow,
  exportDesign,
}: Props) => {
  const { sanitizeHtml, containerRef } = useUpdateContainer(shape)

  useEffect(() => {
    ensureTailwindCdn()
  }, [])

  const handleExportDesign = () =>
    exportDesign(shape.id, containerRef.current)
  const handleGenerateWorkflow = () => generateWorkflow(shape.id)
  const handleToggleChat = () => toggleChat(shape.id)

  return (
    <div
      ref={containerRef}
      className="absolute pointer-events-none"
      style={{
        left: shape.x,
        top: shape.y,
        width: shape.w,
        height: 'auto', // Auto height to grow with content
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        padding: '16px',
        minHeight: '120px', // Minimum height for empty state
        position: 'relative', // Contain absolutely positioned elements
      }}
    >
      <div
        className="h-auto w-full"
        style={{
          pointerEvents: 'auto',
          height: 'auto',
          maxWidth: '100%', // Prevent horizontal overflow
          boxSizing: 'border-box', // Include padding in calculations
        }}
      >
        <div className="absolute -top-8 right-0 flex gap-2">
          <LiquidGlassButton
            size="sm"
            variant="subtle"
            onClick={handleExportDesign}
            disabled={!shape.uiSpecData}
            style={{ pointerEvents: 'auto' }}
          >
            <Download size={12} />
            Export
          </LiquidGlassButton>
          <LiquidGlassButton
            size="sm"
            variant="subtle"
            onClick={handleGenerateWorkflow}
            style={{ pointerEvents: 'auto' }}
          >
            <Workflow size={12} />
            Generate Workflow
          </LiquidGlassButton>
          <LiquidGlassButton
            size="sm"
            variant="subtle"
            onClick={handleToggleChat}
            style={{ pointerEvents: 'auto' }}
          >
            <MessageCircle size={12} />
            Design Chat
          </LiquidGlassButton>
        </div>
        {shape.uiSpecData ? (
          <div
            className="h-auto rounded-lg overflow-hidden bg-white text-black"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(shape.uiSpecData),
            }}
          />
        ) : (
          <div className="flex items-center justify-center p-8 text-white/60">
            <div className="animate-pulse">Generating design...</div>
          </div>
        )}
      </div>
      <div
        className="absolute -top-6 left-0 text-xs px-2 py-1 rounded whitespace-nowrap text-white/60 bg-black/40"
        style={{ fontSize: '10px' }}
      >
        Generated UI
      </div>
    </div>
  )
}

export default GeneratedUI
