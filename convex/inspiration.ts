// Confirmed real from your screenshot -- this file didn't exist yet
// (the "Inspiration board isn't built yet" toast in surface.tsx was
// standing in for it). Mirrors convex/moodboard.ts's getMoodBoardImages
// query exactly, just against project.inspirationImages instead of
// project.moodBoardImages.
import { v } from 'convex/values'
import { query } from './_generated/server'
import { getAuthUserId } from '@convex-dev/auth/server'

export const getInspirationImages = query({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, { projectId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }

    // Get the project and verify ownership
    const project = await ctx.db.get(projectId)
    if (!project || project.userId !== userId) {
      return []
    }

    // Get storage IDs
    const storageIds = project.inspirationImages || []

    // Generate URLs for each image
    const images = await Promise.all(
      storageIds.map(async (storageId, index) => {
        try {
          const url = await ctx.storage.getUrl(storageId)
          return {
            id: `inspiration-${storageId}`, // Unique ID for client-side tracking
            storageId,
            url,
            uploaded: true,
            uploading: false,
            index, // Preserve order
          }
        } catch (error) {
          console.warn(
            `⚠️ [Convex] Failed to get URL for inspiration storage ID ${storageId}:`,
            error
          )
          return null
        }
      })
    )

    // Filter out any failed URLs and sort by index
    const validImages = images
      .filter((image) => image !== null)
      .sort((a, b) => a!.index - b!.index)

    return validImages
  },
})

// Not from any screenshot -- mirrors convex/moodboard.ts's
// addMoodBoardImage/removeMoodBoardImage exactly (same auth/ownership
// checks, same lastModified patch), just against
// project.inspirationImages (max 6, per the schema comment) instead of
// project.moodBoardImages (max 5). Upload URLs are generated via the
// existing api.moodboard.generateUploadUrl -- it's generic
// (ctx.storage.generateUploadUrl()) and isn't actually mood-board
// specific, so there's no need for a duplicate here.
import { mutation } from './_generated/server'

export const addInspirationImage = mutation({
  args: {
    projectId: v.id('projects'),
    storageId: v.id('_storage'),
  },
  handler: async (ctx, { projectId, storageId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const project = await ctx.db.get(projectId)
    if (!project) {
      throw new Error('Project not found')
    }

    if (project.userId !== userId) {
      throw new Error('Access denied')
    }

    const currentImages = project.inspirationImages || []
    if (currentImages.length >= 6) {
      throw new Error('Maximum 6 inspiration images allowed')
    }

    const updatedImages = [...currentImages, storageId]
    await ctx.db.patch(projectId, {
      inspirationImages: updatedImages,
      lastModified: Date.now(),
    })

    return { success: true, imageCount: updatedImages.length }
  },
})

export const removeInspirationImage = mutation({
  args: {
    projectId: v.id('projects'),
    storageId: v.id('_storage'),
  },
  handler: async (ctx, { projectId, storageId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const project = await ctx.db.get(projectId)
    if (!project) {
      throw new Error('Project not found')
    }

    if (project.userId !== userId) {
      throw new Error('Access denied')
    }

    const currentImages = project.inspirationImages || []
    const updatedImages = currentImages.filter((id) => id !== storageId)

    await ctx.db.patch(projectId, {
      inspirationImages: updatedImages,
      lastModified: Date.now(),
    })

    return { success: true, imageCount: updatedImages.length }
  },
})
