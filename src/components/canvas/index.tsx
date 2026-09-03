'use client'

import React, { useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { clearSelection, deleteSelected, loadProject, selectAll, type Shape, type Tool } from '@/redux/slices/shapes'
import type { EntityState } from '@reduxjs/toolkit'
import CanvasSurface from './surface'
import CanvasToolbar from './toolbar'
import TextPropertiesPanel from './text-panel'

export type InitialSketchesData = {
  shapes: EntityState<Shape, string>
  tool: Tool
  selected: Record<string, true>
  frameCounter: number
} | null

type Props = {
  initialSketchesData: InitialSketchesData
}

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  )
}

// Top-level canvas editor. Hydrates the existing `shapes` Redux state from
// the project's saved sketchesData (if any) on mount, then renders the
// drawing surface + floating toolbar. Wires the pre-existing selection
// actions (selectShape/deselectShape/clearSelection/selectAll/deleteSelected)
// to click, shift-click, Escape, Cmd/Ctrl+A, and Delete/Backspace, per your
// request that selection should actually work here too.
//
// NOTE: there's no mutation yet in convex/projects.ts to save shape edits
// back (only createProject exists) — the commented-out `<Autosave />` in
// the navbar suggests that's a planned-but-unbuilt feature. So changes
// made here are session-local for now and won't persist on refresh yet.
const CanvasEditor = ({ initialSketchesData }: Props) => {
  const dispatch = useAppDispatch()
  const hydrated = useRef(false)

  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    if (initialSketchesData) {
      dispatch(loadProject(initialSketchesData))
    }
  }, [initialSketchesData, dispatch])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return

      if (e.key === 'Escape') {
        dispatch(clearSelection())
        return
      }

      if ((e.key === 'Delete' || e.key === 'Backspace')) {
        dispatch(deleteSelected())
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        dispatch(selectAll())
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch])

  return (
    <div className="fixed inset-0 pt-24">
      <CanvasSurface />
      <CanvasToolbar />
      <TextPropertiesPanel />
    </div>
  )
}

export default CanvasEditor
