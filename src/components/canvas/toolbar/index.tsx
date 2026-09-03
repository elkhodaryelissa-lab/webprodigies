'use client'

import React from 'react'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { deleteSelected, setTool, type Tool } from '@/redux/slices/shapes'
import { setScale } from '@/redux/slices/viewport'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowUpRight,
  ChevronDown,
  Circle,
  Eraser,
  Frame,
  MousePointer2,
  Pencil,
  Slash,
  Square,
  Trash2,
  Type,
} from 'lucide-react'
import HistoryPill from './history'

const TOOLS: { tool: Tool; label: string; icon: React.ReactNode }[] = [
  { tool: 'select', label: 'Select (V)', icon: <MousePointer2 className="w-4 h-4" /> },
  { tool: 'frame', label: 'Frame (F)', icon: <Frame className="w-4 h-4" /> },
  { tool: 'rect', label: 'Rectangle (R)', icon: <Square className="w-4 h-4" /> },
  { tool: 'ellipse', label: 'Ellipse (O)', icon: <Circle className="w-4 h-4" /> },
  { tool: 'arrow', label: 'Arrow (A)', icon: <ArrowUpRight className="w-4 h-4" /> },
  { tool: 'line', label: 'Line (L)', icon: <Slash className="w-4 h-4" /> },
  { tool: 'freedraw', label: 'Pen (P)', icon: <Pencil className="w-4 h-4" /> },
  { tool: 'text', label: 'Text (T)', icon: <Type className="w-4 h-4" /> },
  { tool: 'eraser', label: 'Eraser (E)', icon: <Eraser className="w-4 h-4" /> },
]

const ZOOM_PRESETS = [50, 70, 100, 150, 200]

const glassPill =
  'flex items-center gap-1 backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] rounded-full p-2 saturate-150'

// Bottom toolbar bar. Laid out as a 3-column grid (history left, tools
// centered, zoom right) — the same fixed-full-width-grid convention your
// navbar already uses (grid grid-cols-2 lg:grid-cols-3), and matches the
// `col-span-1` your real HistoryPill code was already written for.
const CanvasToolbar = () => {
  const dispatch = useAppDispatch()
  const tool = useAppSelector((s) => s.shapes.tool)
  const selectedCount = Object.keys(useAppSelector((s) => s.shapes.selected)).length
  const zoom = useAppSelector((s) => s.viewport.scale)

  return (
    <TooltipProvider>
      <div className="fixed bottom-6 left-0 right-0 z-40 grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-6 pointer-events-none">
        <HistoryPill />

        <div className="col-span-1 flex justify-center pointer-events-auto">
          <div className={glassPill}>
            {TOOLS.map(({ tool: t, label, icon }) => (
              <Tooltip key={t}>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={() => dispatch(setTool(t))}
                      className={cn(
                        'rounded-full p-2.5 transition-colors',
                        tool === t
                          ? 'bg-white text-black'
                          : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
                      )}
                    />
                  }
                >
                  {icon}
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            ))}

            {selectedCount > 0 && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={() => dispatch(deleteSelected())}
                      className="rounded-full p-2.5 text-white/70 hover:text-red-400 hover:bg-white/[0.08] transition-colors"
                    />
                  }
                >
                  <Trash2 className="w-4 h-4" />
                </TooltipTrigger>
                <TooltipContent>Delete selected ({selectedCount})</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="col-span-1 flex justify-end pointer-events-auto">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className={cn(glassPill, 'px-4 text-sm text-white/80 hover:text-white')}
                />
              }
            >
              {Math.round(zoom * 100)}%
              <ChevronDown className="w-3.5 h-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top">
              {ZOOM_PRESETS.map((p) => (
                <DropdownMenuItem key={p} onClick={() => dispatch(setScale(p / 100))}>
                  {p}%
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default CanvasToolbar
