// Confirmed real: PolarWebhookEvent, isPolarWebhookEvent, and the
// ReceivedEvent alias.
export interface PolarWebhookEvent<TData = unknown> {
  id: string | number
  type: string
  data: TData
}

export const isPolarWebhookEvent = (
  x: unknown
): x is PolarWebhookEvent<unknown> => {
  return (
    !!x &&
    typeof x === 'object' &&
    'type' in (x as Record<string, unknown>) &&
    'data' in (x as Record<string, unknown>)
  )
}

export type ReceivedEvent = PolarWebhookEvent<unknown>

// Confirmed real, in full: PolarCustomer, PolarPrice, PolarProduct, and
// the complete PolarSubscription interface (every field, matching what
// extractSubscriptionLike below actually builds).
export interface PolarCustomer {
  id: string
  email: string | null
}

export interface PolarPrice {
  id?: string | null
  recurring_interval?: string | null
}

export interface PolarProduct {
  id?: string | null
  name?: string | null
}

export interface PolarSubscription {
  id: string
  status: string
  current_period_end?: string | null
  trial_ends_at?: string | null
  cancel_at?: string | null
  canceled_at?: string | null
  customer?: PolarCustomer | null
  customer_id?: string | null
  product_id?: string | null
  product?: PolarProduct | null
  prices?: PolarPrice[] | null
  seats?: number | null
  plan_code?: string | null
  metadata?: Record<string, unknown> | null
}

// Confirmed real, in full: unwraps either a bare subscription-shaped
// payload or one nested under a `subscription` key, then builds the
// PolarSubscription object field-by-field.
export const extractSubscriptionLike = (
  data: unknown
): PolarSubscription | null => {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    const sub = (
      d.subscription && typeof d.subscription === 'object'
        ? (d.subscription as Record<string, unknown>)
        : d
    ) as Record<string, unknown>

    const id = sub.id
    const status = sub.status
    if (typeof id === 'string' && typeof status === 'string') {
      return {
        id,
        status,
        current_period_end: sub.current_period_end as string | undefined | null,
        trial_ends_at: sub.trial_ends_at as string | undefined | null,
        cancel_at: sub.cancel_at as string | undefined | null,
        canceled_at: sub.canceled_at as string | undefined | null,
        customer: sub.customer as PolarCustomer | undefined | null,
        customer_id: sub.customer_id as string | undefined | null,
        product_id: sub.product_id as string | undefined | null,
        product: sub.product as PolarProduct | undefined | null,
        prices: sub.prices as PolarPrice[] | undefined | null,
        seats: (typeof sub.seats === 'number' ? sub.seats : undefined) ?? null,
        plan_code: sub.plan_code as string | undefined | null,
        metadata: (sub.metadata as Record<string, unknown> | undefined) ?? null,
      }
    }
  }
  return null
}

// MY OWN ADDITION — not from any screenshot. handlePolarEvent in
// src/inngest/functions.ts also calls `extractOrderLike(dataUnknown)`
// and reads `order?.customer?.email` / `order?.metadata?.userId`, but
// no screenshot ever showed a PolarOrder interface or this function's
// real implementation. Modeled after the confirmed
// PolarSubscription/extractSubscriptionLike pair above (same
// unwrap-a-nested-key pattern, here for an `order` key) so the file
// compiles. Replace both once you see the real ones from the video.
export interface PolarOrder {
  id: string
  status?: string | null
  customer?: PolarCustomer | null
  customer_id?: string | null
  product_id?: string | null
  product?: PolarProduct | null
  metadata?: Record<string, unknown> | null
}

export const extractOrderLike = (data: unknown): PolarOrder | null => {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    const order = (
      d.order && typeof d.order === 'object'
        ? (d.order as Record<string, unknown>)
        : d
    ) as Record<string, unknown>

    const id = order.id
    if (typeof id === 'string') {
      return {
        id,
        status: order.status as string | undefined | null,
        customer: order.customer as PolarCustomer | undefined | null,
        customer_id: order.customer_id as string | undefined | null,
        product_id: order.product_id as string | undefined | null,
        product: order.product as PolarProduct | undefined | null,
        metadata: (order.metadata as Record<string, unknown> | undefined) ?? null,
      }
    }
  }
  return null
}


// Confirmed real, in full: toMs (normalizes a date string/number/null
// into an epoch-ms number or undefined) and isEntitledStatus (a status
// counts as entitled if it's 'active' or 'trialing').
export const toMs = (
  x: string | number | null | undefined
): number | undefined => {
  if (x == null) return undefined
  if (typeof x === 'number') return x
  const t = Date.parse(x)
  return Number.isNaN(t) ? undefined : t
}

export const isEntitledStatus = (status: string): boolean =>
  /^(active|trialing)$/i.test(status)


// MY OWN COMPLETION for the exact body — confirmed facts only: it's
// called as `grantKey(polarSubscriptionId, currentPeriodEnd, incoming.id)`
// in src/inngest/functions.ts, and grantCreditsIfNeeded's idempotencyKey
// arg comment (convex/subscriptions.ts) says the shape is
// `${subId}:${periodEndMs || "first"}`. Filling in the third param as a
// fallback for events with no period end, so replayed events without one
// still dedupe per-event instead of all colliding on the literal string
// "first". Replace once you see the real implementation.
export const grantKey = (
  polarSubscriptionId: string,
  currentPeriodEnd: number | undefined,
  eventId: string | number
): string => `${polarSubscriptionId}:${currentPeriodEnd || eventId || 'first'}`
