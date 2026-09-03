import { useEffect, useRef, useState, type RefObject } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useMutation } from 'convex/react'
import { toast } from '@/components/ui/toast'
// Confirmed real: useStyleGuide's guard clauses call `toast.error(...)`,
// which is sonner's API, not this file's existing `@/components/ui/toast`
// (that one only has `.add()`, used by useMoodBoard above). Both are
// real/used in this project (sonner for the checkout button, this one
// for the mood board), so aliasing sonner's import to keep both usable
// in one file rather than guessing one was meant to replace the other.
import { toast as sonnerToast } from 'sonner'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useGenerateStyleGuideMutation } from '@/redux/api/style-guide'
import { useAppDispatch } from '@/redux/hooks'
import { updateShape, type GeneratedUIShape } from '@/redux/slices/shapes'

export interface MoodBoardImage {
  id: string
  file?: File // Optional for server-loaded images
  preview: string // Local preview URL or Convex URL
  storageId?: string
  uploaded: boolean
  uploading: boolean
  error?: string
  url?: string // Convex URL for uploaded images
  isFromServer?: boolean // Track if image came from server
}

interface StylesFormData {
  images: MoodBoardImage[]
}

// NOTE: fully reconciled again. `addImage` only adds to local state, but
// there's a SEPARATE useEffect (below, after addImage) that watches for
// unuploaded images and uploads them via a new `uploadImage()` helper,
// which calls generateUploadUrl -> POST -> addMoodBoardImage. So my
// earlier "addImage never uploads anything, addMoodBoardImage isn't
// used" conclusion was wrong -- restored addMoodBoardImage to both this
// file and convex/moodboard.ts.
//
// Two things I deliberately did NOT transcribe literally because they're
// real bugs, not just things I couldn't see:
// 1. Your screenshot's pending-upload effect ends with `catch (error) {}`
//    -- a genuinely empty catch. As written, a failed upload leaves that
//    image stuck at `uploading: true` forever (nothing resets it) with no
//    error shown, and `!image.uploading` blocks any retry. Filled it in
//    to set `uploading: false, error: 'Upload failed'` instead, matching
//    the `error` field MoodBoardImage already has.
// 2. That same effect's dependency array is `[]`, but `images` starts as
//    `[]` too -- so `if (images.length > 0)` is false on the one time
//    this effect ever runs (mount), and it never fires again afterward.
//    As literally written, this effect uploads nothing, ever. Changed the
//    deps to `[images]` so it actually reacts to newly added files. Flag
//    both of these if I'm misreading the screenshot -- they're my
//    judgment calls, not confirmed fixes.
// Also confirmed via more screenshots: `removeImage` ends with a
// `toast.success('Image removed')` (fixed to `.add()` like the others),
// and `handleDrop` filters to image/* files first with its own
// toast.error (also fixed) before adding them.
export const useMoodBoard = (guideImages: MoodBoardImage[]) => {
  const [dragActive, setDragActive] = useState(false)
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project')

  const form = useForm<StylesFormData>({
    defaultValues: {
      images: [],
    },
  })

  const { watch, setValue, getValues } = form
  const images = watch('images')

  const generateUploadUrl = useMutation(api.moodboard.generateUploadUrl)
  const removeMoodBoardImage = useMutation(api.moodboard.removeMoodBoardImage)
  const addMoodBoardImage = useMutation(api.moodboard.addMoodBoardImage)

  // NOTE: confirmed against your real addMoodBoardImage -- it returns
  // { success, imageCount }, not a url (I'd guessed url earlier since the
  // return type declares `url?`, but nothing ever actually sets it -- the
  // pending-upload effect below only destructures `storageId` out of this
  // anyway, so `url` staying undefined matches what your code does).
  const uploadImage = async (
    file: File
  ): Promise<{ storageId: string; url?: string }> => {
    const uploadUrl = await generateUploadUrl()

    const result = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file,
    })

    const { storageId } = await result.json()

    await addMoodBoardImage({
      projectId: projectId as Id<'projects'>,
      storageId: storageId as Id<'_storage'>,
    })

    return { storageId }
  }

  useEffect(() => {
    const serverImages: MoodBoardImage[] = guideImages.map((img: any) => ({
      id: img.id,
      preview: img.url,
      storageId: img.storageId,
      uploaded: true,
      uploading: false,
      url: img.url,
      isFromServer: true,
    }))
    const currentImages = getValues('images')

    if (currentImages.length === 0) {
      setValue('images', serverImages)
    } else {
      const mergedImages = [...currentImages]
      serverImages.forEach((serverImg) => {
        const clientIndex = mergedImages.findIndex(
          (clientImg) => clientImg.storageId === serverImg.storageId
        )

        if (clientIndex !== -1) {
          // Clean up old blob URL if it exists
          if (mergedImages[clientIndex].preview.startsWith('blob:')) {
            URL.revokeObjectURL(mergedImages[clientIndex].preview)
          }

          // Replace with server image
          mergedImages[clientIndex] = serverImg
        }
      })
      setValue('images', mergedImages)
    }
  }, [guideImages, setValue, getValues])

  const canAddMore = images.length < 5

  const addImage = (file: File) => {
    if (images.length >= 5) {
      toast.add({ title: 'Maximum 5 images allowed', type: 'error' })
      return
    }

    const newImage: MoodBoardImage = {
      id: `${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
      uploaded: false,
      uploading: false,
      isFromServer: false,
    }

    const updatedImages = [...images, newImage]
    setValue('images', updatedImages)

    toast.add({ title: 'Image added to mood board', type: 'success' })
  }

  useEffect(() => {
    const uploadPendingImages = async () => {
      const currentImages = getValues('images')
      for (let i = 0; i < currentImages.length; i++) {
        const image = currentImages[i]
        if (!image.uploaded && !image.uploading && !image.error) {
          const updatedImages = [...currentImages]
          updatedImages[i] = { ...image, uploading: true }
          setValue('images', updatedImages)

          try {
            const { storageId } = await uploadImage(image.file!)
            const finalImages = getValues('images')
            const finalIndex = finalImages.findIndex(
              (img) => img.id === image.id
            )

            if (finalIndex !== -1) {
              const updated = [...finalImages]
              updated[finalIndex] = {
                ...updated[finalIndex],
                storageId,
                uploaded: true,
                uploading: false,
              }
              setValue('images', updated)
            }
          } catch (error) {
            const latestImages = getValues('images')
            const finalImages = [...latestImages]
            const idx = finalImages.findIndex((img) => img.id === image.id)
            if (idx !== -1) {
              finalImages[idx] = {
                ...finalImages[idx],
                uploading: false,
                error: 'Upload failed',
              }
              setValue('images', finalImages)
            }
          }
        }
      }
    }

    if (images.length > 0) {
      uploadPendingImages()
    }
  }, [images])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter((file) => file.type.startsWith('image/'))

    if (imageFiles.length === 0) {
      toast.add({ title: 'Please drop image files only', type: 'error' })
      return
    }

    // Add each image file
    imageFiles.forEach((file) => addImage(file))
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach((file) => addImage(file))

    // Reset input
    e.target.value = ''
  }

  const removeImage = async (imageId: string) => {
    const imageToRemove = images.find((img) => img.id === imageId)
    if (!imageToRemove) return

    // If it's a server image with storageId, remove from Convex
    if (imageToRemove.isFromServer && imageToRemove.storageId && projectId) {
      try {
        await removeMoodBoardImage({
          projectId: projectId as Id<'projects'>,
          storageId: imageToRemove.storageId as Id<'_storage'>,
        })
      } catch (error) {
        console.error(error)
        toast.add({ title: 'Failed to remove image from server', type: 'error' })
        return
      }
    }

    const updatedImages = images.filter((img) => {
      if (img.id === imageId) {
        // Clean up preview URL only for local images
        if (!img.isFromServer && img.preview.startsWith('blob:')) {
          URL.revokeObjectURL(img.preview)
        }
        return false
      }
      return true
    })

    setValue('images', updatedImages)

    toast.add({ title: 'Image removed', type: 'success' })
  }

  return {
    images,
    dragActive,
    removeImage,
    handleDrag,
    handleDrop,
    handleFileInput,
    canAddMore,
  }
}

// Confirmed real: the full signature, the generateStyleGuide/isGenerating
// destructure from useGenerateStyleGuideMutation, router/handleUploadClick
// setup, and handleGenerateStyleGuide's three guard clauses (no project
// selected / no images / images still uploading) with their exact
// toast.error messages.
//
// GAP: your screenshot cut off right after the "still uploading" guard
// -- no actual call to generateStyleGuide() and no return statement were
// shown. There WAS an unaccepted editor autocomplete suggestion for
// `await generateStyleGuide({ projectId })` + `router.push('/style-guide')`
// inside a try/catch, but (a) it was never actually accepted into the
// file, and (b) `/style-guide` alone isn't a real route in this app (the
// actual page is `/dashboard/<slug>/style-guide?project=<id>`, per the
// navbar links), so I didn't copy it literally. Using `router.refresh()`
// instead -- this button already lives on the style-guide page, so
// refreshing re-runs the server component and picks up the newly saved
// style guide without a bad navigation. Flag me if the real version
// does something different.
export const useStyleGuide = (
  projectId: string,
  images: MoodBoardImage[],
  fileInputRef: RefObject<HTMLInputElement | null>
) => {
  const [generateStyleGuide, { isLoading: isGenerating }] =
    useGenerateStyleGuideMutation()
  const router = useRouter()
  const handleUploadClick = () => fileInputRef.current?.click()

  const handleGenerateStyleGuide = async () => {
    if (!projectId) {
      sonnerToast.error('No project selected')
      return
    }
    if (images.length === 0) {
      sonnerToast.error('Please upload at least one image to generate a style guide')
      return
    }

    if (images.some((img) => img.uploading)) {
      sonnerToast.error('Please wait for all images to finish uploading')
      return
    }

    // Confirmed real, in full: the toast.loading -> generateStyleGuide
    // -> result.success check -> router.refresh() + toast.success
    // sequence, all keyed to the same 'style-guide-generation' toast id
    // so they replace each other instead of stacking. `catch (error) {}`
    // confirmed genuinely empty, same convention as elsewhere in this
    // project -- not adding error handling that isn't there.
    try {
      sonnerToast.loading('Analyzing mood board images...', {
        id: 'style-guide-generation',
      })
      const result = await generateStyleGuide({ projectId }).unwrap()

      if (!result.success) {
        sonnerToast.error(result.message, { id: 'style-guide-generation' })
        return
      }
      router.refresh()
      sonnerToast.success('Style guide generated successfully!', {
        id: 'style-guide-generation',
      })
    // You just hit exactly the gap flagged above: clicking Generate
    // and getting stuck on "Analyzing..." forever with nothing showing
    // up is this empty catch swallowing a real error (route validation
    // failure, missing/bad ANTHROPIC_API_KEY, a network error, etc).
    // Now surfacing it instead of staying silent -- this is the one
    // deliberate deviation from the confirmed-empty catch in this
    // session, made because it was actively breaking the feature for
    // you, not a stylistic preference.
    } catch (error) {
      console.error(error)
      // RTK Query's .unwrap() throws the error payload itself, not a
      // native Error -- for a failed HTTP call that's usually
      // { status, data: { error: string } }, matching what this route
      // returns as its JSON body on a non-200. Falling back to a
      // generic message for anything else (a network failure, etc).
      const errData = (error as { data?: { error?: string; details?: string } })?.data
      const message =
        errData?.details ||
        errData?.error ||
        (error instanceof Error ? error.message : null) ||
        'Failed to generate style guide.'
      sonnerToast.error(message, { id: 'style-guide-generation' })
    }
  }

  return { handleGenerateStyleGuide, isGenerating, handleUploadClick }
}

// Confirmed real, in full: the containerRef + 100ms-debounced
// offsetHeight measurement, only patching the shape's height when it's
// actually off by more than 10px (avoids a dispatch loop from
// sub-pixel/rounding noise). `updateShape` import path fixed to this
// project's actual '@/redux/slices/shapes' (plural) -- same recurring
// singular/plural bug as elsewhere; there was an unaccepted editor
// suggestion pointing at the wrong '@/redux/slice/shapes' path. The
// dependency array was cut off in your screenshot right at `shape.h`
// -- closing it there since shape.uiSpecData/shape.id/shape.h are the
// only shape fields the effect actually reads.
export const useUpdateContainer = (shape: GeneratedUIShape) => {
  const dispatch = useAppDispatch()
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (containerRef.current && shape.uiSpecData) {
      const timeoutId = setTimeout(() => {
        const actualHeight = containerRef.current?.offsetHeight || 0
        if (actualHeight > 0 && Math.abs(actualHeight - shape.h) > 10) {
          dispatch(
            updateShape({
              id: shape.id,
              patch: { h: actualHeight },
            })
          )
        }
      }, 100)

      return () => clearTimeout(timeoutId)
    }
  }, [shape.uiSpecData, shape.id, shape.h, dispatch]) // dispatch now included -- your screenshot showed the full array this time

  return { containerRef, sanitizeHtml }

}

// Confirmed real from your screenshot: the regex chain (strip
// <script>/<iframe> tags, inline event-handler attributes,
// javascript: and data: protocols). Exported as a standalone utility
// Confirmed: your screenshot showed `const { sanitizeHtml, containerRef } =
// useUpdateContainer(shape)` in GeneratedUI, so useUpdateContainer now
// returns this function too (added to its return statement above).
export const sanitizeHtml = (html: string) => {
  const sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/data:/gi, '') // Remove data: protocols for safety

  return sanitized
}
