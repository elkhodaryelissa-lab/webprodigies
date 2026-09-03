import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";

/**
 * Ask Convex for a short-lived URL the client can POST the raw file bytes
 * to. This keeps large binaries out of our mutation args entirely.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Record a sketch once the file has finished uploading to storage.
 */
export const createSketch = mutation({
  args: {
    title: v.string(),
    imageStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("sketches", {
      userId,
      title: args.title,
      imageStorageId: args.imageStorageId,
      status: "uploaded",
    });
  },
});

/**
 * All sketches belonging to the signed-in user, newest first, with
 * resolved image URLs so the client never has to do a second round trip.
 */
export const listSketches = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const sketches = await ctx.db
      .query("sketches")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return await Promise.all(
      sketches.map(async (sketch) => ({
        ...sketch,
        imageUrl: await ctx.storage.getUrl(sketch.imageStorageId),
        resultUrl: sketch.resultStorageId
          ? await ctx.storage.getUrl(sketch.resultStorageId)
          : null,
      })),
    );
  },
});

export const removeSketch = mutation({
  args: { sketchId: v.id("sketches") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const sketch = await ctx.db.get(args.sketchId);
    if (!sketch || sketch.userId !== userId) {
      throw new Error("Sketch not found");
    }

    await ctx.storage.delete(sketch.imageStorageId);
    if (sketch.resultStorageId) {
      await ctx.storage.delete(sketch.resultStorageId);
    }
    await ctx.db.delete(args.sketchId);
  },
});
