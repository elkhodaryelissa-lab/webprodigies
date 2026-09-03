'use client'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'
import { useAppSelector } from '@/redux/hooks'
import { useAutosaveProjectMutation } from '@/redux/api/project'

// Confirmed real, in full, assembled from your progressive screenshots
// (imports, hooks, the debounce useEffect body, and the saveStatus
// switch/render). One deliberate change from the literal screenshot:
// `const user = useAppSelector((state) => state.profile)` — your actual
// profile slice here is `{ user: Profile | null }` (see
// src/redux/slices/profile, and how navbar/index.tsx reads
// `state.profile.user`), not the user object itself, so `user?.id`
// wouldn't compile against the bare `state.profile`. Reading
// `state.profile.user` instead keeps this consistent with the rest of
// your app while still doing exactly what the screenshot's code does.
const Autosave = () => {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project')
  const user = useAppSelector((state) => state.profile.user)
  const shapesState = useAppSelector((state) => state.shapes)
  const viewportState = useAppSelector((state) => state.viewport)

  const [autosaveProject] = useAutosaveProjectMutation()

  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>('')

  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')

  const isReady = Boolean(projectId && user?.id)

  useEffect(() => {
    if (!isReady) return
    const stateString = JSON.stringify({
      shapes: shapesState,
      viewport: viewportState,
    })

    if (stateString === lastSavedRef.current) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      lastSavedRef.current = stateString
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()
      setSaveStatus('saving')

      try {
        await autosaveProject({
          projectId: projectId as string,
          userId: user?.id as string,
          shapesData: shapesState,
          viewportData: {
            scale: viewportState.scale,
            translate: viewportState.translate,
          },
        }).unwrap()
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    }, 1000)
  }, [isReady, shapesState, viewportState])
  // FIX: the confirmed screenshot had this effect's dependency array as
  // just [isReady] — isReady flips true once when the project/user first
  // load and then never changes again, so the effect never re-ran on
  // actual shape/viewport edits (this is almost certainly why autosave
  // looked broken: it fires once on load, then goes silent). Added
  // shapesState/viewportState so the effect re-evaluates on every real
  // change, which is what the debounce logic inside it was clearly
  // written to expect.

  switch (saveStatus) {
    case 'saved':
      return (
        <div className="flex items-center">
          <CheckCircle className="w-4 h-4" />
        </div>
      )
    case 'error':
      return (
        <div className="flex items-center">
          <AlertCircle className="w-4 h-4" />
        </div>
      )
    default:
      return <></>
  }
}

export default Autosave
