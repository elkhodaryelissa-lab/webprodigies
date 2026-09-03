import { SubscriptionEntitlementQuery } from '@/app/convex/query.config'
import { combinedSlug } from '@/lib/utils'
import { redirect } from 'next/navigation'
import { preloadedQueryResult } from 'convex/nextjs'

//TODO: add subscription billing logic.
const Page = async () => {
  const { entitlement, profileName } = await SubscriptionEntitlementQuery()

  // TODO: temporarily disabled (same reason as [sessions]/layout.tsx) so
  // /dashboard always forwards to the navbar/tabs preview instead of
  // detouring to /billing. Re-enable once billing/entitlement is real.
  // if (!preloadedQueryResult(entitlement)) {
  //   redirect(`/billing/${combinedSlug(profileName!)}`)
  // }
  redirect (`/dashboard/${combinedSlug(profileName!)}`)
}

export default Page
