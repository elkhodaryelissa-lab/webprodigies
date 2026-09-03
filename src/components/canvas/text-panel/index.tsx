'use client'

import React from 'react'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { updateShape, type TextShape } from '@/redux/slices/shapes'
import { Slider } from '@/components/ui/slider'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Toggle } from '@/components/ui/toggle'
import { Bold, Italic, Underline, Strikethrough } from 'lucide-react'

const FONT_FAMILIES = [
  'Inter',
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Verdana',
  'Courier New',
  'Roboto',
  'Poppins',
  'Montserrat',
]

// Not from any screenshot of source code — built from the rendered UI
// mockup you sent (Font Family / Size / Weight / Style / Line Height /
// Letter Spacing / Text Color, on the right when a text shape is
// selected). Shows only when exactly one Text shape is selected, and
// every control dispatches `updateShape` directly so it's live-editing
// that shape via the fields TextShape already had (fontFamily,
// fontSize, fontWeight, fontStyle, textDecoration, lineHeight,
// letterSpacing, fill) — the real Text component
// (src/components/canvas/shapes/text) was already reading every one of
// these, so no shape-type changes were needed. The font list, slider
// ranges, and panel styling (matched to the glass look already used in
// the toolbar/history pill) are my own choices, not confirmed from the
// video — flag it if the real panel turns out to look different.
const TextPropertiesPanel = () => {
  const dispatch = useAppDispatch()
  const selected = useAppSelector((s) => s.shapes.selected)
  const entities = useAppSelector((s) => s.shapes.shapes.entities)

  const selectedIds = Object.keys(selected)
  const shape =
    selectedIds.length === 1 ? entities[selectedIds[0]] : undefined

  if (!shape || shape.type !== 'text') return null
  const textShape = shape as TextShape

  const patch = (changes: Partial<TextShape>) =>
    dispatch(updateShape({ id: textShape.id, patch: changes }))

  const isBold = textShape.fontWeight >= 700
  const isItalic = textShape.fontStyle === 'italic'
  const isUnderline = textShape.textDecoration === 'underline'
  const isStrikethrough = textShape.textDecoration === 'line-through'

  return (
    <div className="fixed top-24 right-6 z-20 w-72 flex flex-col gap-5 rounded-2xl backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] p-4 text-neutral-300 saturate-150 pointer-events-auto">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-neutral-400">Font Family</label>
        <NativeSelect
          size="sm"
          className="w-full"
          value={textShape.fontFamily}
          onChange={(e) => patch({ fontFamily: e.target.value })}
        >
          {FONT_FAMILIES.map((font) => (
            <NativeSelectOption key={font} value={font}>
              {font}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-neutral-400">
          Font Size: {textShape.fontSize}px
        </label>
        <Slider
          min={8}
          max={200}
          step={1}
          value={[textShape.fontSize]}
          onValueChange={(v) => patch({ fontSize: (v as number[])[0] })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-neutral-400">
          Font Weight: {textShape.fontWeight}
        </label>
        <Slider
          min={100}
          max={900}
          step={100}
          value={[textShape.fontWeight]}
          onValueChange={(v) => patch({ fontWeight: (v as number[])[0] })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-neutral-400">Style</label>
        <div className="flex gap-1.5">
          <Toggle
            size="sm"
            variant="outline"
            pressed={isBold}
            onPressedChange={(pressed) =>
              patch({ fontWeight: pressed ? 700 : 400 })
            }
          >
            <Bold className="w-4 h-4" />
          </Toggle>
          <Toggle
            size="sm"
            variant="outline"
            pressed={isItalic}
            onPressedChange={(pressed) =>
              patch({ fontStyle: pressed ? 'italic' : 'normal' })
            }
          >
            <Italic className="w-4 h-4" />
          </Toggle>
          <Toggle
            size="sm"
            variant="outline"
            pressed={isUnderline}
            onPressedChange={(pressed) =>
              patch({ textDecoration: pressed ? 'underline' : 'none' })
            }
          >
            <Underline className="w-4 h-4" />
          </Toggle>
          <Toggle
            size="sm"
            variant="outline"
            pressed={isStrikethrough}
            onPressedChange={(pressed) =>
              patch({ textDecoration: pressed ? 'line-through' : 'none' })
            }
          >
            <Strikethrough className="w-4 h-4" />
          </Toggle>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-neutral-400">
          Line Height: {textShape.lineHeight}
        </label>
        <Slider
          min={0.8}
          max={3}
          step={0.1}
          value={[textShape.lineHeight]}
          onValueChange={(v) => patch({ lineHeight: (v as number[])[0] })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-neutral-400">
          Letter Spacing: {textShape.letterSpacing}px
        </label>
        <Slider
          min={-5}
          max={20}
          step={0.5}
          value={[textShape.letterSpacing]}
          onValueChange={(v) => patch({ letterSpacing: (v as number[])[0] })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-neutral-400">Text Color</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={textShape.fill ?? '#ffffff'}
            onChange={(e) => patch({ fill: e.target.value })}
            className="flex-1 h-8 rounded-lg border border-white/[0.12] bg-transparent px-2.5 text-sm outline-none focus-visible:border-white/30"
          />
          <input
            type="color"
            value={textShape.fill ?? '#ffffff'}
            onChange={(e) => patch({ fill: e.target.value })}
            className="h-8 w-8 rounded-md border border-white/[0.12] bg-transparent p-0.5 cursor-pointer"
          />
        </div>
      </div>
    </div>
  )
}

export default TextPropertiesPanel
