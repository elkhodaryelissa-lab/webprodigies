import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,
  // Your other tables...

  subscriptions: defineTable({
    userId: v.id("users"),
    polarCustomerId: v.string(),
    polarSubscriptionId: v.string(),
    productId: v.optional(v.string()),
    priceId: v.optional(v.string()),
    planCode: v.optional(v.string()),
    status: v.string(),
    currentPeriodEnd: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
    cancelAt: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
    seats: v.optional(v.number()),
    metadata: v.optional(v.any()),
    creditsBalance: v.number(),
    creditsGrantPerPeriod: v.number(),
    creditsRolloverLimit: v.number(),
    lastGrantCursor: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    // Added for upsertFromPolar's 'existingByPolar' lookup (confirmed
    // real from your screenshot: .withIndex("by_polarSubscriptionId", ...)).
    .index("by_polarSubscriptionId", ["polarSubscriptionId"]),

  credits_ledger: defineTable({
    userId: v.id("users"),
    subscriptionId: v.id("subscriptions"),
    amount: v.number(),
    type: v.string(), // "grant" | "consume" | "adjust"
    reason: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    meta: v.optional(v.any()),
  })
    .index("by_subscriptionId", ["subscriptionId"])
    .index("by_userId", ["userId"])
    .index("by_idempotencyKey", ["idempotencyKey"]),

  projects: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    styleGuide: v.optional(v.string()),
    sketchesData: v.any(), // JSON structure matching Redux shapes state
    viewportData: v.optional(v.any()), // JSON structure for viewport state (scale, position, etc.)
    generatedDesignData: v.optional(v.any()), // JSON structure for generated UI components
    thumbnail: v.optional(v.string()), // Base64 or URL for project thumbnail
    moodBoardImages: v.optional(v.array(v.string())), // Array of storage IDs for mood board images
    inspirationImages: v.optional(v.array(v.string())), // Array of storage IDs for inspiration images (max 6)
    lastModified: v.number(), // Timestamp for last modification
    createdAt: v.number(), // Project creation timestamp
    isPublic: v.optional(v.boolean()), // For future sharing features
    tags: v.optional(v.array(v.string())), // For future categorization
    projectNumber: v.number(), // Auto-incrementing project number per user
  })
    .index("by_userId", ["userId"])
    // Added for getUserProjects' `.withIndex('by_userId_lastModified', ...)`
    // + `.order('desc')` from your screenshot — sorts each user's projects
    // by lastModified without an extra full-table scan.
    .index("by_userId_lastModified", ["userId", "lastModified"]),

  project_counters: defineTable({
    userId: v.id("users"),
    nextProjectNumber: v.number(), // Next available project number for this user
  }).index("by_userId", ["userId"]),

  sketches: defineTable({
    userId: v.id("users"),
    title: v.string(),
    imageStorageId: v.id("_storage"),
    status: v.union(
      v.literal("uploaded"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    resultStorageId: v.optional(v.id("_storage")),
    errorMessage: v.optional(v.string()),
  }).index("by_user", ["userId"]),
});

export default schema;