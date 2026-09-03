'use client'

import React, { useEffect } from 'react'
import { useAppDispatch } from '@/redux/hooks'
import { fetchProjectsSuccess } from '@/redux/slices/projects'
import { preloadedQueryResult } from 'convex/nextjs'

type Props = {
  children: React.ReactNode
  initialProjects: any // preloadQuery result with _valueJSON property
}

const ProjectsProvider = ({ children, initialProjects }: Props) => {
  const dispatch = useAppDispatch()

  useEffect(() => {
    // Initialize Redux state with SSR data
    if (initialProjects?._valueJSON) { 
      // NOTE: your screenshot read `initialProjects._valueJSON` directly —
      // that's the same bug we fixed everywhere else in this project:
      // `_valueJSON` isn't ready-to-use data, it needs `preloadedQueryResult()`
      // to decode it properly. Using that instead.
      const projectsData = preloadedQueryResult(initialProjects)
      dispatch(
        fetchProjectsSuccess({
          projects: projectsData,
          total: projectsData.length,
        })
      )
    }
  }, [dispatch, initialProjects])

  return <>{children}</>
}

export default ProjectsProvider
