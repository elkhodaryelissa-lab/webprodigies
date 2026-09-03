// TODO: this is a placeholder. Replace with a real server-side call into
// Convex (likely reading the `subscriptions` / `credits_ledger` tables) once
// that query exists — the tutorial hasn't built it yet at this point.
export async function SubscriptionEntitlementQuery() {
  return {
    entitlement: null as null | { plan: string; creditsBalance: number },
    profileName: null as string | null,
  }
}
