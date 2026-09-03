import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { preloadedQueryResult, preloadQuery, fetchMutation } from 'convex/nextjs'
import { api } from '../../../convex/_generated/api' 
import { ConvexUserRaw, normalizeProfile } from '@/types/user'
import { Id } from '../../../convex/_generated/dataModel' 

export const ProfileQuery = async () => {
  return await preloadQuery(
    api.user.getCurrentUser,
    {},
    { token: await convexAuthNextjsToken() }
  )
}

export const SubscriptionEntitlementQuery = async () => {
  const rawProfile = await ProfileQuery()
  const profile = normalizeProfile(
    preloadedQueryResult(rawProfile) as unknown as ConvexUserRaw | null
  )

  const entitlement = await preloadQuery(
    api.subscriptions.hasEntitlement,
    { userId: profile?.id as Id<'users'> },
    { token: await convexAuthNextjsToken() }
  )
  return { entitlement, profileName: profile?.name }
}

export const ProjectsQuery = async () => {
  const rawProfile = await ProfileQuery()
  // NOTE: your screenshot used `rawProfile._valueJSON as unknown as
  // ConvexUserRaw | null` directly here — that's the same bug we already
  // fixed everywhere else in this project: `_valueJSON` isn't a JSON
  // string to cast, it needs `preloadedQueryResult()` to actually decode
  // it (works for primitives by luck, crashes on objects). Using
  // `preloadedQueryResult(rawProfile)`, same as SubscriptionEntitlementQuery
  // right above.
  const profile = normalizeProfile(
    preloadedQueryResult(rawProfile) as unknown as ConvexUserRaw | null
  )
  if (!profile?.id) {
    return { projects: null, profile: null }
  }

  const projects = await preloadQuery(
    api.projects.getUserProjects,
    { userId: profile.id as Id<'users'> },
    { token: await convexAuthNextjsToken() }
  )

  // TODO: your screenshot cut off right after the preloadQuery call above
  // — no return statement was shown. Completing it with the obvious shape
  // (matching the { projects: null, profile: null } early-return above)
  // so this compiles and is actually usable. Flag it if the real version
  // returns something different.
  return { projects, profile }
}

export const StyleGuideQuery = async (projectId: string) => {
  const styleGuide = await preloadQuery(
    api.projects.getProjectStyleGuide,
    { projectId: projectId as Id<'projects'> },
    { token: await convexAuthNextjsToken() }
  )

  return { styleGuide }
}

export const MoodBoardImagesQuery = async (projectId: string) => {
  const images = await preloadQuery(
    api.moodboard.getMoodBoardImages,
    { projectId: projectId as Id<'projects'> },
    { token: await convexAuthNextjsToken() }
  )

  return { images }
}

// Confirmed real from your screenshot, with the same two `_valueJSON`
// bugs already fixed everywhere else in this file: `rawProfile._valueJSON`
// and `balance._valueJSON` both need `preloadedQueryResult()`, not a
// direct cast/access -- and `api.subscription.getCreditsBalance`
// (singular) doesn't exist, the real module is `api.subscriptions`
// (plural, confirmed earlier against convex/_generated/api.d.ts).
export const CreditsBalanceQuery = async () => {
  const rawProfile = await ProfileQuery()
  const profile = normalizeProfile(
    preloadedQueryResult(rawProfile) as unknown as ConvexUserRaw | null
  )

  if (!profile?.id) {
    return { ok: false, balance: 0, profile: null }
  }

  const balance = await preloadQuery(
    api.subscriptions.getCreditsBalance,
    { userId: profile.id as Id<'users'> },
    { token: await convexAuthNextjsToken() }
  )
  return { ok: true, balance: preloadedQueryResult(balance), profile }
}

// Confirmed real from your screenshot, same two fixes as
// CreditsBalanceQuery right above: `rawProfile._valueJSON` ->
// `preloadedQueryResult(rawProfile)`, and `api.subscription.consumeCredits`
// (singular) -> `api.subscriptions.consumeCredits` (plural, the real
// module). The end of the return statement was cut off
// (`balance: credi...le`) -- completing it as `{ ok: credits.ok, balance:
// credits.balance, profile }`, matching CreditsBalanceQuery's shape.
export const ConsumeCreditsQuery = async ({
  amount,
}: {
  amount?: number
}) => {
  const rawProfile = await ProfileQuery()
  const profile = normalizeProfile(
    preloadedQueryResult(rawProfile) as unknown as ConvexUserRaw | null
  )

  if (!profile?.id) {
    return { ok: false, balance: 0, profile: null }
  }

  const credits = await fetchMutation(
    api.subscriptions.consumeCredits,
    {
      reason: 'ai:generation',
      userId: profile.id as Id<'users'>,
      amount: amount || 1,
    },
    { token: await convexAuthNextjsToken() }
  )

  return { ok: credits.ok, balance: credits.balance, profile }
}

// Confirmed real from your screenshot (InspirationImagesQuery(projectId)
// called from the /api/generate route). Mirrors MoodBoardImagesQuery
// right above, against the new convex/inspiration.ts query.
export const InspirationImagesQuery = async (projectId: string) => {
  const images = await preloadQuery(
    api.inspiration.getInspirationImages,
    { projectId: projectId as Id<'projects'> },
    { token: await convexAuthNextjsToken() }
  )

  return { images }
}

export const ProjectQuery = async (projectId: string) => {
  const project = await preloadQuery(
    api.projects.getProject,
    { projectId: projectId as Id<'projects'> },
    { token: await convexAuthNextjsToken() }
  )

  return { project }
}
