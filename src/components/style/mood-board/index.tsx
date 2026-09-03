'use client'

import React, { useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, Upload } from 'lucide-react'
import { MoodBoardImage, useMoodBoard } from '@/hooks/use-styles'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import ImagesBoard from './images.board'
import GenerateStyleGuideButton from '@/components/buttons/style-guide'

type Props = {
  guideImages: MoodBoardImage[]
}

const MoodBoard = ({ guideImages }: Props) => {
  const {
    images,
    dragActive,
    removeImage,
    handleDrag,
    handleDrop,
    handleFileInput,
    canAddMore,
  } = useMoodBoard(guideImages)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  // Confirmed real from your screenshot:
  // `<GenerateStyleGuideButton ... projectId={projectId ?? ''} />` --
  // `projectId` wasn't already in scope anywhere in this component, so
  // reading it from the URL (same `?project=` search param every other
  // project-scoped component in this app uses) is the obvious source.
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project')

  return (
    <div className="flex flex-col gap-10">
      {/* NOTE: this whole empty-state block is new -- built from your
          rendered-preview screenshot (icon, heading, subtext, "Choose
          images" button), not source code, so exact spacing/sizing is my
          visual read, not pixel-exact. Wired it to the drag/upload
          handlers that were already sitting unused in the hook. Gated on
          `images.length === 0` since that's the only state your
          screenshot showed -- rendering the actual uploaded thumbnails
          (with remove buttons via `removeImage`) once there ARE images
          isn't shown yet, so I didn't build that part. */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-200 min-h-[500px] flex items-center justify-center ',
          dragActive ? 'border-primary bg-primary/5' : 'border-border'
        )}
      >
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-transparent rounded-3xl" />
        </div>

        {images.length === 0 && (
          <div className="relative flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-medium text-foreground">
                Upload images to your mood board
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Drag and drop images here or click to browse. Maximum 5
                images allowed.
              </p>
            </div>
            <Button
              type="button"
              disabled={!canAddMore}
              onClick={handleUploadClick}
            >
              Choose images
            </Button>
          </div>
        )}

        {/* NOTE: your screenshot mentioned a button to add more images once
            some already exist (gated on canAddMore / images.length < 5) --
            the empty-state "Choose images" button above only shows when
            images.length === 0, so without this there'd be no way to add
            more once you have at least one. Built from your description,
            not exact code, since the screenshot itself got cut off before
            the button's JSX. */}
        {images.length > 0 && canAddMore && (
          <div className="absolute bottom-4 right-4 z-50">
            <Button
              type="button"
              onClick={handleUploadClick}
              size="sm"
              variant="outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              Add More
            </Button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
        />

        {images.length > 0 && (
          <div className="lg:hidden absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {images.map((image, index) => {
                const seed = image.id
                  .split('')
                  .reduce((a, b) => a + b.charCodeAt(0), 0)
                const random1 = ((seed * 9301 + 49297) % 233280) / 233280
                const random2 =
                  (((seed + 1) * 9301 + 49297) % 233280) / 233280
                const random3 =
                  (((seed + 2) * 9301 + 49297) % 233280) / 233280

                const rotation = (random1 - 0.5) * 20 // -10 to +10 degrees for subtle tilt
                const xOffset = (random2 - 0.5) * 40 // -20 to +20 px horizontal offset
                const yOffset = (random3 - 0.5) * 30 // -15 to +15 px vertical offset

                return (
                  <ImagesBoard
                    key={`mobile-${image.id}`}
                    image={image}
                    removeImage={removeImage}
                    xOffset={xOffset}
                    yOffset={yOffset}
                    rotation={rotation}
                    zIndex={index + 1}
                    marginLeft="-80px"
                    marginTop="-96px"
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Replaces the earlier unwired placeholder button -- your
          screenshot confirmed the real component is
          <GenerateStyleGuideButton images={images} fileInputRef={fileInputRef}
          projectId={projectId ?? ''} />, placed right after the dashed
          upload box. (Your screenshot also showed a separate "Maximum of
          5 images reached" notice near there -- not added here since the
          exact placement relative to this button got cropped out; flag
          it if you want that back in.) */}
      <GenerateStyleGuideButton
        images={images}
        fileInputRef={fileInputRef}
        projectId={projectId ?? ''}
      />
    </div>
  )
}

export default MoodBoard
