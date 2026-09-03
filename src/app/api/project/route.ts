import { NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/inngest/client'

// Confirmed real: the UpdateProjectRequest interface and the PATCH
// handler's body (destructuring, the 400 validation, the inngest.send
// call and its event name/data, the success and error JSON responses).
// `NextResponse` and `inngest` weren't visible in your screenshot's
// import lines (scrolled off), but both are used below, so I've added
// those two imports — necessary for this to compile, not a content
// change.
interface UpdateProjectRequest {
  projectId: string
  shapesData: {
    shapes: Record<string, unknown>
    tool: string
    selected: Record<string, unknown>
    frameCounter: number
  }
  viewportData?: {
    scale: number
    translate: { x: number; y: number }
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body: UpdateProjectRequest & { userId?: string } =
      await request.json()
    const { projectId, shapesData, viewportData, userId } = body
    if (!projectId || !userId || !shapesData) {
      return NextResponse.json(
        { error: 'Project ID, User ID, and shapes data are required' },
        { status: 400 }
      )
    }

    const eventResult = await inngest.send({
      name: 'project/autosave.requested',
      data: { projectId, userId, shapesData, viewportData },
    })

    return NextResponse.json({
      success: true,
      message: 'Project autosave initiated',
      eventId: eventResult.ids[0],
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to autosave project',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
