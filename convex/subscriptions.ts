import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// Confirmed real, in full: DEFAULT_GRANT and DEFAULT_ROLLOVER_LIMIT.
const DEFAULT_GRANT = 10
const DEFAULT_ROLLOVER_LIMIT = 100

const ENTITLED = new Set(['active', 'trialing'])

// PLACEHOLDER — args/handler for getSubscriptionForUser weren't shown in
// your screenshots (only its declaration line was visible before the
// image was cropped to the next function). This is a minimal real
// implementation matching the by_userId index already on the table, so
// it's usable by upsertFromPolar's fetchQuery call below and by any UI
// that wants a user's current subscription. Replace once you see the
// real one.
export const getSubscriptionForUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query('subscriptions')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
  },
})

// Confirmed real, in full.
export const getAllForUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query('subscriptions')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect()
  },
})

// Confirmed real: the full `args` object (every field, matching the
// schema exactly) and the handler's opening — the two existence lookups
// (existingByPolar via by_polarSubscriptionId, existingByUser via
// by_userId), the duplicate-detection warning, and the `base` object
// with the creditsGrantPerPeriod/creditsRolloverLimit fallback chains.
// Your screenshot cut off right after `if (userExistingSubscription) {`
// inside the existingByPolar-but-different-user branch, so everything
// from there down (including the final insert-if-nothing-exists path)
// is MY OWN completion — written to be safe/non-destructive rather than
// guessing at exact behavior. Replace once you see the rest.
export const upsertFromPolar = mutation({
  args: {
    userId: v.id('users'),
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
    creditsGrantPerPeriod: v.optional(v.number()),
    creditsRolloverLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log('🔍 [Convex] Starting upsertFromPolar for:', {
      userId: args.userId,
      polarSubscriptionId: args.polarSubscriptionId,
      status: args.status,
    })

    const existingByPolar = await ctx.db
      .query('subscriptions')
      .withIndex('by_polarSubscriptionId', (q) =>
        q.eq('polarSubscriptionId', args.polarSubscriptionId)
      )
      .first()

    const existingByUser = await ctx.db
      .query('subscriptions')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first()

    console.log(
      '📊 [Convex] Existing subscription by User ID:',
      existingByUser ? 'Found' : 'None'
    )
    if (
      existingByPolar &&
      existingByUser &&
      existingByPolar._id !== existingByUser._id
    ) {
      console.warn(
        '⚠️ [Convex] DUPLICATE DETECTED: User has different subscription by Polar ID vs User ID!'
      )
    }
    console.warn('  - By Polar ID:', existingByPolar?._id)
    console.warn('  - By User ID:', existingByUser?._id)

    const base = {
      userId: args.userId,
      polarCustomerId: args.polarCustomerId,
      polarSubscriptionId: args.polarSubscriptionId,
      productId: args.productId,
      priceId: args.priceId,
      planCode: args.planCode,
      status: args.status,
      currentPeriodEnd: args.currentPeriodEnd,
      trialEndsAt: args.trialEndsAt,
      cancelAt: args.cancelAt,
      canceledAt: args.canceledAt,
      seats: args.seats,
      metadata: args.metadata,
      creditsGrantPerPeriod:
        args.creditsGrantPerPeriod ??
        existingByPolar?.creditsGrantPerPeriod ??
        existingByUser?.creditsGrantPerPeriod ??
        DEFAULT_GRANT,
      creditsRolloverLimit:
        args.creditsRolloverLimit ??
        existingByPolar?.creditsRolloverLimit ??
        existingByUser?.creditsRolloverLimit ??
        DEFAULT_ROLLOVER_LIMIT,
    }

    // Confirmed real, in full: the existingByPolar branch — when the
    // Polar subscription id already exists under a DIFFERENT user, look
    // up that user's own existing row and, if found, patch it with
    // `base` while explicitly preserving its creditsBalance and
    // lastGrantCursor (so re-upserting doesn't silently reset a user's
    // already-accrued credits).
    if (existingByPolar) {
      if (existingByPolar.userId === args.userId) {
        await ctx.db.patch(existingByPolar._id, base)
        return existingByPolar._id
      } else {
        const userExistingSubscription = await ctx.db
          .query('subscriptions')
          .withIndex('by_userId', (q) => q.eq('userId', args.userId))
          .first()

        if (userExistingSubscription) {
          const preservedData = {
            creditsBalance: userExistingSubscription.creditsBalance,
            lastGrantCursor: userExistingSubscription.lastGrantCursor,
          }

          await ctx.db.patch(userExistingSubscription._id, {
            ...base,
            ...preservedData,
          })
          return userExistingSubscription._id
        }

        // Confirmed real, in full — including that it assigns to
        // `newId` but doesn't return it, so this branch falls through to
        // an implicit `undefined` return. Kept exactly as shown rather
        // than "fixing" it, since it may be intentional (or fixed later
        // in the video) and I'd rather match your source than guess.
        const newId = await ctx.db.insert('subscriptions', {
          ...base,
          creditsBalance: 0,
          lastGrantCursor: undefined,
        })
        void newId
      }
    }

    // MY OWN COMPLETION from here down — not confirmed by any screenshot.
    if (existingByUser) {
      await ctx.db.patch(existingByUser._id, base)
      return existingByUser._id
    }

    return await ctx.db.insert('subscriptions', {
      ...base,
      creditsBalance: base.creditsGrantPerPeriod,
    })
  },
})

// PLACEHOLDER — only the declaration line `export const hasEntitlement =
// query({` was visible in your screenshot before it was cropped; args
// and handler were never shown. This is my own minimal real
// implementation (active subscription with remaining credits) so the
// export exists and compiles. Replace once you see the real one.
export const hasEntitlement = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const sub = await ctx.db
      .query('subscriptions')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    if (!sub) return false
    return sub.status === 'active' && sub.creditsBalance > 0
  },
})

// Confirmed real, now including the tail your latest screenshot showed:
// the `meta: { prev: sub.creditsBalance, next }` field on the ledger
// insert, and the final `return { ok: true, granted: grant, balance: next }`
// (no `skipped` key on this path -- that only appears on the early-return
// skip branches above, which stays as previously confirmed).
export const grantCreditsIfNeeded = mutation({
  args: {
    subscriptionId: v.id('subscriptions'),
    idempotencyKey: v.string(), // `${subId}:${periodEndMs || "first"}`
    amount: v.optional(v.number()), // default to sub.creditsGrantPerPeriod
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { subscriptionId, idempotencyKey, amount, reason }) => {
    const dupe = await ctx.db
      .query('credits_ledger')
      .withIndex('by_idempotencyKey', (q) =>
        q.eq('idempotencyKey', idempotencyKey)
      )
      .first()

    if (dupe) return { ok: true, skipped: true, reason: 'duplicate-ledger' }

    const sub = await ctx.db.get(subscriptionId)
    if (!sub) return { ok: false, error: 'subscription-not-found' }

    if (sub.lastGrantCursor === idempotencyKey) {
      return { ok: true, skipped: true, reason: 'cursor-match' }
    }
    if (!ENTITLED.has(sub.status)) {
      return { ok: true, skipped: true, reason: 'not-entitled' }
    }

    const grant = amount ?? sub.creditsGrantPerPeriod ?? DEFAULT_GRANT
    if (grant <= 0) return { ok: true, skipped: true, reason: 'zero-grant' }
    const next = Math.min(
      sub.creditsBalance + grant,
      sub.creditsRolloverLimit ?? DEFAULT_ROLLOVER_LIMIT
    )

    await ctx.db.patch(subscriptionId, {
      creditsBalance: next,
      lastGrantCursor: idempotencyKey,
    })

    await ctx.db.insert('credits_ledger', {
      userId: sub.userId,
      subscriptionId,
      amount: grant,
      type: 'grant',
      reason,
      idempotencyKey,
      meta: { prev: sub.creditsBalance, next },
    })

    return { ok: true, granted: grant, balance: next }
  },
})

// Confirmed real, in full.
export const getCreditsBalance = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const sub = await ctx.db
      .query('subscriptions')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    return sub?.creditsBalance ?? 0
  },
})

// My own addition -- not from a screenshot. Wired up for the AI
// generation route (src/app/api/canvas/generate/route.ts): deducts one
// credit per successful generation and logs it in credits_ledger as a
// 'consume' row, mirroring grantCreditsIfNeeded's conventions (same
// table, same subscription lookup via by_userId). Returns
// { ok: false, error } if there's no subscription or the balance is
// already 0, so the route can refuse to generate instead of going
// negative.
export const consumeCredit = mutation({
  args: {
    userId: v.id('users'),
    amount: v.optional(v.number()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { userId, amount, reason }) => {
    const sub = await ctx.db
      .query('subscriptions')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()

    if (!sub) return { ok: false, error: 'no-subscription' }

    const cost = amount ?? 1
    if (sub.creditsBalance < cost) {
      return { ok: false, error: 'insufficient-credits' }
    }

    const next = sub.creditsBalance - cost
    await ctx.db.patch(sub._id, { creditsBalance: next })

    await ctx.db.insert('credits_ledger', {
      userId,
      subscriptionId: sub._id,
      amount: -cost,
      type: 'consume',
      reason: reason ?? 'ai-generation',
      meta: { prev: sub.creditsBalance, next },
    })

    return { ok: true, balance: next }
  },
})


// Confirmed real from your screenshot: args, the amount<=0 guard, the
// idempotencyKey dupe-check (returns { ok: true, idempotent: true }),
// the subscription lookup, and the ENTITLED check. Screenshot cut off
// right after `if (!ENTITLED.has(sub.status)) return { ok: false, error:
// 'not-entitled' }` -- the balance check/patch/ledger insert below are
// my own completion, mirroring consumeCredit above (same table, same
// conventions) since that part wasn't shown.
export const consumeCredits = mutation({
  args: {
    userId: v.id('users'),
    amount: v.number(),
    reason: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, { userId, amount, reason, idempotencyKey }) => {
    if (amount <= 0) return { ok: false, error: 'invalid-amount' }

    if (idempotencyKey) {
      const dupe = await ctx.db
        .query('credits_ledger')
        .withIndex('by_idempotencyKey', (q) =>
          q.eq('idempotencyKey', idempotencyKey)
        )
        .first()
      if (dupe) return { ok: true, idempotent: true }
    }

    const sub = await ctx.db
      .query('subscriptions')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    if (!sub) return { ok: false, error: 'no-subscription' }
    if (!ENTITLED.has(sub.status)) return { ok: false, error: 'not-entitled' }

    // Confirmed real: the insufficient-credits return includes
    // `balance: sub.creditsBalance` (I'd left that out), and the ledger
    // row's default reason is `'usage'`, not `'ai:generation'` like I'd
    // guessed -- callers that want a specific reason (like this route's
    // ConsumeCreditsQuery -> 'ai:generation') still pass one explicitly.
    if (sub.creditsBalance < amount) {
      return {
        ok: false,
        error: 'insufficient-credits',
        balance: sub.creditsBalance,
      }
    }

    const next = sub.creditsBalance - amount
    await ctx.db.patch(sub._id, { creditsBalance: next })

    await ctx.db.insert('credits_ledger', {
      userId,
      subscriptionId: sub._id,
      amount: -amount,
      type: 'consume',
      reason: reason ?? 'usage',
      idempotencyKey,
      meta: { prev: sub.creditsBalance, next },
    })

    return { ok: true, balance: next }
  },
})
