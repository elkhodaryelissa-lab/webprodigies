import React from 'react'
import { preloadedQueryResult } from 'convex/nextjs'
import { ProjectQuery } from '@/app/convex/query.config'
import CanvasEditor, { type InitialSketchesData } from '@/components/canvas'

type Props = {
  searchParams: Promise<{
    project?: string
  }>
}

const Page = async ({ searchParams }: Props) => {
  const projectId = (await searchParams).project

  // No project selected yet (e.g. navigated here directly) — render an
  // empty canvas rather than crashing on a missing id.
  if (!projectId) {
    return <CanvasEditor initialSketchesData={null} />
  }

  const existingProject = await ProjectQuery(projectId)
  const project = preloadedQueryResult(existingProject.project) as {
    sketchesData?: InitialSketchesData
  } | null

  return <CanvasEditor initialSketchesData={project?.sketchesData ?? null} />
}

export default Page
