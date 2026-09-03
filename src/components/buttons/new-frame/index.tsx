'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { addFrame } from '@/redux/slices/shapes'
import { Plus } from 'lucide-react'

type Props = {}

// Mirrors CreateProject's button (src/components/buttons/project) —
// same styling convention, dispatches straight into the real `shapes`
// slice so the new frame actually appears on the canvas and is
// immediately selectable/deletable like any other shape.
const NewFrame = (props: Props) => {
  const dispatch = useAppDispatch()
  const frameCounter = useAppSelector((s) => s.shapes.frameCounter)

  const handleClick = () => {
    const offset = frameCounter * 40
    dispatch(addFrame({ x: 120 + offset, y: 120 + offset, w: 800, h: 600 }))
  }

  return (
    <Button
      variant="default"
      onClick={handleClick}
      className="flex items-center gap-2 cursor-pointer rounded-full"
    >
      <Plus className="h-4 w-4" />
      New Frame
    </Button>
  )
}

export default NewFrame
