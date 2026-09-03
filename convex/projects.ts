import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getAuthUserId } from '@convex-dev/auth/server'

export const getProject = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    const project = await ctx.db.get(projectId)
    if (!project) throw new Error('Project not found')

    // Check ownership or public access
    if (project.userId !== userId && !project.isPublic) {
      throw new Error('Access denied')
    }

    return project
  },
})


export const getProjectStyleGuide = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    const project = await ctx.db.get(projectId)
    if (!project) throw new Error('Project not found')

    // Check ownership or public access
    if (project.userId !== userId && !project.isPublic) {
      throw new Error('Access denied')
    }

    // Return parsed style guide data or null
    return project.styleGuide ? JSON.parse(project.styleGuide) : null
  },
})

export const getUserProjects = query({
  args: {
    userId: v.id('users'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit = 20 }) => {
    // NOTE: your screenshot didn't check the caller's identity against the
    // requested `userId` here — but this is a public query, so without
    // this check anyone signed in could pass any userId and read that
    // user's project list/thumbnails. Keeping the same auth check the
    // createProject mutation above already uses, for the same reason
    // flagged there. Remove it if the video does this differently on
    // purpose (e.g. this is meant to support viewing public profiles).
    const authedUserId = await getAuthUserId(ctx)
    if (!authedUserId) throw new Error('Not authenticated')
    if (authedUserId !== userId) throw new Error('Access denied')

    const allProjects = await ctx.db
      .query('projects')
      .withIndex('by_userId_lastModified', (q) => q.eq('userId', userId))
      .order('desc')
      .collect()

    const projects = allProjects.slice(0, limit)

    return projects.map((project) => ({
      _id: project._id,
      name: project.name,
      projectNumber: project.projectNumber,
      thumbnail: project.thumbnail,
      lastModified: project.lastModified,
      createdAt: project.createdAt,
      isPublic: project.isPublic,
    }))
  },
})

// DEV-ONLY SEEDING HELPER -- not from any screenshot, my own addition.
// Your `npx convex run` calls run without a logged-in identity, so this
// intentionally skips the getAuthUserId() auth check the other mutations
// use (it would otherwise throw "Not authenticated" every time). Delete
// this once you've seeded what you need, or before shipping -- it lets
// anyone with dashboard/CLI access overwrite any project's style guide.
export const seedSampleStyleGuide = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const project = await ctx.db.get(projectId)
    if (!project) throw new Error('Project not found')

    const styleGuide = {
      theme: 'Sample Theme',
      description: 'Seeded sample color palette for UI testing.',
      colorSections: [
        {
          title: 'Primary Colours',
          swatches: [
            { name: 'Lavender Dream', hexColor: '#E8D5F2', description: 'Soft purple for headers and primary elements' },
            { name: 'Cloud White', hexColor: '#FEFEFE', description: 'Pure white background with subtle warmth' },
            { name: 'Mint Cream', hexColor: '#F0FDF4', description: 'Gentle mint for light backgrounds and accents' },
          ],
        },
        {
          title: 'Secondary & Accent Colors',
          swatches: [
            { name: 'Peach Blush', hexColor: '#FED7D7', description: 'Warm peach for CTAs and highlights' },
            { name: 'Sky Blue', hexColor: '#DBEAFE', description: 'Calming blue for secondary actions' },
            { name: 'Sunshine Yellow', hexColor: '#FEF3C7', description: 'Cheerful yellow for attention-grabbing elements' },
          ],
        },
        {
          title: 'UI Component Colors',
          swatches: [
            { name: 'Rose Quartz', hexColor: '#FCE7F3', description: 'Soft pink for component borders and dividers' },
            { name: 'Charcoal Soft', hexColor: '#4A5568', description: 'Gentle dark gray for primary text' },
            { name: 'Dusty Purple', hexColor: '#9CA3AF', description: 'Muted purple for secondary text and labels' },
          ],
        },
        {
          title: 'Utility & Form Colors',
          swatches: [
            { name: 'Lilac Mist', hexColor: '#F3E8FF', description: 'Light purple for form input backgrounds' },
            { name: 'Sage Green', hexColor: '#D1FAE5', description: 'Soft green for placeholder text' },
            { name: 'Silver Lining', hexColor: '#E2E8F0', description: 'Light gray for disabled states' },
          ],
        },
        {
          title: 'Status & Feedback Colors',
          swatches: [
            { name: 'Mint Success', hexColor: '#A7F3D0', description: 'Fresh mint for success messages' },
            { name: 'Coral Alert', hexColor: '#FECACA', description: 'Soft coral for error messages' },
            { name: 'Buttercup Warning', hexColor: '#FDE68A', description: 'Warm yellow for warning messages' },
          ],
        },
      ],
      typographySections: [],
    }

    await ctx.db.patch(projectId, { styleGuide: JSON.stringify(styleGuide) })
    return { ok: true }
  },
})

// My own addition -- not from a screenshot. The dev-only
// seedSampleStyleGuide mutation above skips auth on purpose (for CLI
// seeding), which makes it unsafe to call from a real user-facing
// route. This is the auth-checked equivalent for
// /api/style-guide/generate to actually save what the AI produces.
export const updateProjectStyleGuide = mutation({
  args: {
    projectId: v.id('projects'),
    // Confirmed real from your screenshot: the route calls this with
    // `styleGuideData: result.object` (the raw generated object, not
    // JSON.stringify'd) -- so this arg is the structured object, and
    // the stringify happens in here instead of at the call site. Using
    // v.any() since it's arbitrary generated JSON, same as
    // seedSampleStyleGuide's styleGuide object above.
    styleGuideData: v.any(),
  },
  handler: async (ctx, { projectId, styleGuideData }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    const project = await ctx.db.get(projectId)
    if (!project) throw new Error('Project not found')
    if (project.userId !== userId) throw new Error('Access denied')

    await ctx.db.patch(projectId, {
      styleGuide: JSON.stringify(styleGuideData),
      lastModified: Date.now(),
    })
    return { ok: true }
  },
})

export const createProject = mutation({
  args: {
    userId: v.id('users'),
    name: v.optional(v.string()),
    sketchesData: v.any(), // JSON structure from Redux shapes state
    thumbnail: v.optional(v.string()),
  },
  handler: async (ctx, { userId, name, sketchesData, thumbnail }) => {
    console.log('🚀 [Convex] Creating project for user:', userId)

    const authedUserId = await getAuthUserId(ctx)
    if (!authedUserId) throw new Error('Not authenticated')
    if (authedUserId !== userId) throw new Error('Access denied')

    const projectNumber = await getNextProjectNumber(ctx, userId)

    const now = Date.now()
    const finalName = name || `Untitled Project ${projectNumber}`
    const projectId = await ctx.db.insert('projects', {
      userId,
      name: finalName,
      sketchesData,
      thumbnail,
      lastModified: now,
      createdAt: now,
      projectNumber,
    })

    // returns a ProjectSummary-shaped object (matches src/redux/slices/projects)
    return {
      _id: projectId,
      name: finalName,
      projectNumber,
      thumbnail,
      lastModified: now,
      createdAt: now,
    }
  },
})

async function getNextProjectNumber(ctx: any, userId: string): Promise<number> {
  // Get or create project counter for this user
  const counter = await ctx.db
    .query('project_counters')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .withIndex('by_userId', (q: any) => q.eq('userId', userId))
    .first()

  if (!counter) {
    // Create new counter starting at 1
    await ctx.db.insert('project_counters', {
      userId,
      nextProjectNumber: 2, // Next will be 2
    })
    return 1
  }

  const projectNumber = counter.nextProjectNumber

  // Increment counter for next time
  await ctx.db.patch(counter._id, {
    nextProjectNumber: projectNumber + 1,
  })

  return projectNumber
}


// Confirmed real, in full — called from src/inngest/functions.ts's
// autosaveProjectWorkflow via fetchMutation. No auth check here (unlike
// the other mutations above) since this runs server-to-server from the
// Inngest workflow, not from a signed-in browser session.
export const updateProjectSketches = mutation({
  args: {
    projectId: v.id('projects'),
    sketchesData: v.any(),
    viewportData: v.optional(v.any()),
  },
  handler: async (ctx, { projectId, sketchesData, viewportData }) => {
    const project = await ctx.db.get(projectId)
    if (!project) throw new Error('Project not found')

    const updateData: any = {
      sketchesData,
      lastModified: Date.now(),
    }

    if (viewportData) {
      updateData.viewportData = viewportData
    }

    await ctx.db.patch(projectId, updateData)
    console.log('✅ [Convex] Project auto-saved successfully')
    return { success: true }
  },
})
