import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { getAuthUserId } from '@convex-dev/auth/server'

// NOTE: your useMoodBoard hook calls api.moodboard.generateUploadUrl,
// api.moodboard.addMoodBoardImage, and api.moodboard.removeMoodBoardImage
// -- none existed anywhere in convex/ yet. Mirroring
// convex/sketches.ts's generateUploadUrl (the only existing file-upload
// pattern in this project) and removeMoodBoardImage's confirmed
// auth/patch/lastModified conventions for the other two. (I'd briefly
// removed addMoodBoardImage in an earlier pass, wrongly guessing addImage
// uploaded nothing to Convex at all -- your later screenshots showed
// there's a separate pending-upload useEffect that calls it via a new
// uploadImage() helper, so it's back.)
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    // Generate upload URL that expires in 1 hour
    return await ctx.storage.generateUploadUrl()
  },
})

export const addMoodBoardImage = mutation({
  args: {
    projectId: v.id('projects'),
    storageId: v.id('_storage'),
  },
  handler: async (ctx, { projectId, storageId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    // Get the project and verify ownership
    const project = await ctx.db.get(projectId)
    if (!project) {
      throw new Error('Project not found')
    }

    if (project.userId !== userId) {
      throw new Error('Access denied')
    }

    const currentImages = project.moodBoardImages || []
    if (currentImages.length >= 5) {
      throw new Error('Maximum 5 mood board images allowed')
    }

    const updatedImages = [...currentImages, storageId]
    await ctx.db.patch(projectId, {
      moodBoardImages: updatedImages,
      lastModified: Date.now(),
    })

    return { success: true, imageCount: updatedImages.length }
  },
})

export const removeMoodBoardImage = mutation({
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

    const currentImages = project.moodBoardImages || []
    const updatedImages = currentImages.filter((id) => id !== storageId)

    await ctx.db.patch(projectId, {
      moodBoardImages: updatedImages,
      lastModified: Date.now(),
    })

    try {
      await ctx.storage.delete(storageId)
    } catch (error) {
      console.error(
        `Failed to delete mood board image from storage ${storageId}:`,
        error
      )
    }
  },
})

export const getMoodBoardImages = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }

    const project = await ctx.db.get(projectId)
    if (!project || project.userId !== userId) {
      return []
    }

    const storageIds = project.moodBoardImages || []
    const images = await Promise.all(
      storageIds.map(async (storageId, index) => {
        try {
          const url = await ctx.storage.getUrl(storageId)
          return {
            id: `convex-${storageId}`, // Unique ID for client-side tracking
            storageId,
            url,
            uploaded: true,
            uploading: false,
            index, // Preserve order
          }
        } catch (error) {
          return null
        }
      })
    )

    // NOTE: your screenshot got cut off right after the Promise.all block --
    // no return statement was visible for `images`. Without one this query
    // returns undefined instead of the array it just built. Adding the
    // obvious completion (filtering out any failed lookups from the catch
    // block above). Flag it if the real version does something different
    // here.
    return images.filter((img) => img !== null)
  },
})
