'use client'

import React from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStyleGuide } from '@/hooks/use-styles'
import type { MoodBoardImage } from '@/hooks/use-styles'

// Confirmed real: the Props type and the full JSX return (Button,
// disabled condition, isGenerating ternary with Loader2/Sparkles).
// `handleGenerateStyleGuide`/`isGenerating` come from `useStyleGuide`,
// now confirmed real and living in src/hooks/use-styles.ts (moved there
// once your screenshot showed it alongside useMoodBoard, in the same
// file) -- the mutation call itself is still my own completion, see the
// comment on useStyleGuide for why.
type Props = {
  images: MoodBoardImage[]
  fileInputRef: React.RefObject<HTMLInputElement | null>
  projectId: string
}

const GenerateStyleGuideButton = ({
  images,
  fileInputRef,
  projectId,
}: Props) => {
  const { handleGenerateStyleGuide, isGenerating } = useStyleGuide(
    projectId,
    images,
    fileInputRef
  )

  return (
    images.length > 0 && (
      <div className="flex justify-end">
        <Button
          className="rounded-full"
          onClick={handleGenerateStyleGuide}
          disabled={isGenerating || images.some((img) => img.uploading)}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing Images...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate with AI
            </>
          )}
        </Button>
      </div>
    )
  )
}

export default GenerateStyleGuideButton
