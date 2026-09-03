'use client'

import { MoodBoardImage } from '@/hooks/use-styles'
import Image from 'next/image'
import React from 'react'
import { Loader2, CheckCircle, AlertCircle, X } from 'lucide-react'

// NOTE: your screenshot's <UploadStatus> call passes uploading/uploaded/
// error as three separate JSX props, but the function itself declares one
// parameter named `image` typed as the object those three collapse into
// (not destructured, not renamed to `props`) -- that's unusual but valid:
// React still bundles the JSX attributes into one object, this function
// just calls that object `image`. Transcribed as-is, not "fixed", since
// it's not actually a bug.
const UploadStatus = (image: {
  uploading: boolean
  uploaded: boolean
  error?: string
}) => {
  if (image.uploading) {
    return (
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
        <Loader2 className="w-6 h-6 text-white animate-spin" />
      </div>
    )
  }

  if (image.uploaded) {
    return (
      <div className="absolute top-2 right-2">
        <CheckCircle className="w-5 h-5 text-green-400" />
      </div>
    )
  }

  if (image.error) {
    return (
      <div className="absolute top-2 right-2">
        <AlertCircle className="w-5 h-5 text-red-400" />
      </div>
    )
  }

  return null
}

type Props = {
  image: MoodBoardImage
  removeImage: (imageId: string) => void
  xOffset: number
  yOffset: number
  rotation: number
  zIndex: number
  marginLeft?: string
  marginTop?: string
}

const ImagesBoard = ({
  image,
  removeImage,
  xOffset,
  yOffset,
  rotation,
  zIndex,
  marginLeft,
  marginTop,
}: Props) => {
  return (
    <div
      key={`board-${image.id}`}
      className="absolute group"
      style={{
        transform: `translate(${xOffset}px, ${yOffset}px) rotate(${rotation}deg)`,
        zIndex: zIndex,
        left: '50%',
        top: '50%',
        marginLeft: marginLeft, // Half of mobile image width (160px / 2)
        marginTop: marginTop, // Half of mobile image height (192px / 2)
      }}
    >
      <div className="relative w-40 h-48 rounded-2xl overflow-hidden bg-white shadow-xl border border-border/20 hover:scale-105 transition-all duration-200">
        {/* NOTE: added `unoptimized` -- not shown in your screenshot, but a
            real necessary fix, not a guess: `image.preview` is a blob:
            URL for a just-added local file (before it finishes
            uploading), and next/image explicitly rejects blob: URLs with
            a hard error unless `unoptimized` is set (its docs point this
            out directly -- "use an <img> tag instead, or set
            unoptimized"). It also sidesteps needing to allowlist your
            Convex storage domain in next.config for the uploaded-image
            case. Without this, the mood board would crash the moment you
            drop a file in. */}
        <Image
          src={image.preview}
          alt="Mood board image"
          fill
          unoptimized
          className="object-cover"
        />

        <UploadStatus
          uploading={image.uploading}
          uploaded={image.uploaded}
          error={image.error}
        />

        <button
          onClick={() => removeImage(image.id)}
          className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  )
}

export default ImagesBoard
