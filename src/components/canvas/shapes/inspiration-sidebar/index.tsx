'use client'

// Reconciled against your latest screenshot, which showed the real
// close button and drop-zone:
// - Type renamed `Props` -> `InspirationSidebarProps` (confirmed name).
// - Close button is the real `Button` component (size="sm", the
//   "h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
//   icon-button classes, containing a lucide `<X className="w-4 h-4" />`)
//   instead of my plain "Close" text link.
// - The upload area is a single dashed drop-zone
//   ("border-2 border-dashed rounded-lg p-6 text-center transition-all
//   duration-200 cursor-pointer"), with the exact 3-way conditional
//   (dragActive -> blue highlight; images.length < 6 -> normal/hover;
//   else -> disabled-looking/cursor-not-allowed), wired to
//   onDragEnter/onDragLeave/onDragOver/onDrop and a click-to-open
//   gated on images.length < 6 -- replacing my simpler "Upload button +
//   drag text" row.
//
// One deliberate deviation: your screenshot showed the file input's
// `ref={fileInputRef}` line commented out (`// ref={fileInputRef}`). As
// literally written that breaks uploads completely -- fileInputRef.current
// would stay null forever, so the drop-zone's click-to-open would
// silently do nothing. Keeping the ref active rather than copying a
// change that disables the feature outright; flag me if that comment
// was intentional (e.g. mid-debugging) rather than a real change.
//
// Your screenshot's crop ended inside the drop-zone's <input>, before
// showing how uploaded images actually render/delete -- so the grid of
// filled/empty slots below is still my own build from the reference
// mockup, unchanged from before.
import React, { useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { ImageIcon, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useInspirationImages } from '@/hooks/use-styles'

type InspirationSidebarProps = {
  isOpen: boolean
  onClose: () => void
}

const InspirationSidebar = ({ isOpen, onClose }: InspirationSidebarProps) => {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project') ?? ''
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    images,
    dragActive,
    removeImage,
    handleDrag,
    handleDrop,
    handleFileInput,
  } = useInspirationImages(projectId)

  const slots = Array.from({ length: 6 }, (_, i) => images[i])

  return (
    <div
      className={cn(
        'fixed left-5 top-1/2 transform -translate-y-1/2 w-80 backdrop-blur-xl bg-white/[0.08] border-white/[0.12] gap-2 p-3 saturate-150 border rounded-lg z-50 transition-transform duration-300',
        isOpen ? 'translate-x-0' : '-translate-x-[120%] pointer-events-none'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-white/90">Inspirations</h3>
        <Button
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <p className="text-xs text-white/50 mb-3">
        Final design will be improvised by these images
      </p>

      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer',
          dragActive
            ? 'border-blue-400 bg-blue-500/10'
            : images.length < 6
              ? 'border-white/20 hover:border-white/40 hover:bg-white/5'
              : 'border-white/10 bg-white/5 cursor-not-allowed opacity-50'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => images.length < 6 && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
        />
        <p className="text-xs text-white/50">
          {images.length < 6
            ? 'Upload or drag and drop an image'
            : 'Maximum 6 images reached'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        {slots.map((image, i) =>
          image ? (
            <div
              key={image.id}
              className="relative aspect-square rounded-md overflow-hidden bg-white/[0.05] border border-white/[0.08]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.preview}
                alt="Inspiration"
                className="w-full h-full object-cover"
              />
              {image.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] text-white/80">
                  Uploading...
                </div>
              )}
              <button
                type="button"
                onClick={() => removeImage(image)}
                className="absolute top-1 right-1 p-1 rounded bg-black/50 hover:bg-black/70 text-white/80"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ) : (
            <div
              key={`empty-${i}`}
              className="aspect-square rounded-md border border-dashed border-white/[0.12] flex items-center justify-center text-white/20"
            >
              <ImageIcon size={18} />
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default InspirationSidebar
