import { fetchMutation, fetchQuery } from 'convex/nextjs'
import { inngest } from './client'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import {
  isPolarWebhookEvent,
  extractSubscriptionLike,
  extractOrderLike,
  ReceivedEvent,
  PolarSubscription,
  PolarOrder,
  toMs,
  isEntitledStatus,
  grantKey,
} from '@/types/polar'

// Confirmed real, in full.
export const autosaveProjectWorkflow = inngest.createFunction(
  { id: 'autosave-project-workflow' },
  { event: 'project/autosave.requested' },
  async ({ event }) => {
    const { projectId, shapesData, viewportData } = event.data
    try {
      await fetchMutation(api.projects.updateProjectSketches, {
        projectId,
        sketchesData: shapesData,
        viewportData,
      })
      return { success: true }
    } catch (error) {
      throw error
    }
  }
)

// Confirmed real: the isPolarWebhookEvent guard, extracting `sub` and
// `order`, the resolve-user step's metadata-userId shortcut and its
// email lookup via fetchQuery(api.user.getUserIdByEmail, ...). Your
// screenshot cut off inside that step's try/catch (right at `catch
// (error) {}`), so what happens on a missing email or a caught error,
// plus everything in the 'upsert-subscription' step below, is MY OWN
// completion — calling the confirmed-real upsertFromPolar mutation
// (see convex/subscription.ts) with the fields extracted here. Replace
// once you see the rest of this function from the video.
export const handlePolarEvent = inngest.createFunction(
  { id: 'polar-webhook-handler' },
  { event: 'polar/webhook.received' },
  async ({ event, step }) => {
    console.log('🚀 [Inngest] Starting Polar webhook handler')
    console.log(
      '📦 [Inngest] Raw event data:',
      JSON.stringify(event.data, null, 2)
    )
    if (!isPolarWebhookEvent(event.data)) {
      return
    }

    const incoming = event.data as ReceivedEvent
    const type = incoming.type
    const dataUnknown = incoming.data

    const sub: PolarSubscription | null = extractSubscriptionLike(dataUnknown)
    const order: PolarOrder | null = extractOrderLike(dataUnknown)

    if (!sub && !order) {
      return
    }

    const userId: Id<'users'> | null = await step.run(
      'resolve-user',
      async () => {
        const metaUserId =
          (sub?.metadata?.userId as string | undefined) ??
          (order?.metadata?.userId as string | undefined)

        if (metaUserId) {
          console.log('✅ [Inngest] Using metadata userId:', metaUserId)
          return metaUserId as unknown as Id<'users'>
        }

        const email = sub?.customer?.email ?? order?.customer?.email ?? null
        console.log('📧 [Inngest] Customer email:', email)
        if (email) {
          try {
            console.log('🔍 [Inngest] Looking up user by email:', email)
            const foundUserId = await fetchQuery(api.user.getUserIdByEmail, {
              email,
            })
            console.log('✅ [Inngest] Found user ID by email:', foundUserId)
            return foundUserId
          } catch (error) {
            console.error('❌ [Inngest] Failed to look up user by email:', error)
            return null
          }
        }

        return null
      }
    )

    if (!userId) {
      console.warn('⚠️ [Inngest] Could not resolve a user for this event, skipping')
      return
    }

    if (sub) {
      // Confirmed real: the `payload` object's fields (moved out here,
      // above the step, so the credit-granting logic below can reuse it
      // — your screenshots showed `payload.status` and
      // `payload.polarSubscriptionId`-shaped values being read AFTER the
      // upsert step, which only works if payload isn't scoped inside
      // it), passed wholesale to
      // fetchMutation(api.subscriptions.upsertFromPolar, payload), then
      // re-fetching that user's full subscription list via
      // fetchQuery(api.subscriptions.getAllForUser, ...) as a post-write
      // sanity check, logging every row if more than one exists. Also
      // confirmed: the whole thing wrapped in a try/catch that swallows
      // errors silently.
      //
      // One thing your screenshot's crop left genuinely ambiguous: it
      // also showed a `console.warn('  - By User ID:', existingByUser._id)`
      // line immediately inside this same step, matching (word-for-word)
      // the duplicate-detection warning that's already confirmed to live
      // inside upsertFromPolar itself (convex/subscriptions.ts). I can't
      // tell from a cropped frame whether that's really a second,
      // separate existingByPolar/existingByUser check duplicated here in
      // the Inngest step, or whether I'm looking at the same code twice
      // across two screenshots. Rather than guess and risk duplicating
      // (or worse, subtly conflicting with) logic that already runs
      // safely inside the mutation, I've left that part out.
      const payload = {
        userId,
        polarCustomerId: sub.customer_id ?? sub.customer?.id ?? '',
        polarSubscriptionId: sub.id,
        productId: sub.product_id ?? sub.product?.id ?? undefined,
        priceId: sub.prices?.[0]?.id ?? undefined,
        planCode: sub.plan_code ?? undefined,
        status: sub.status,
        currentPeriodEnd: toMs(sub.current_period_end),
        trialEndsAt: toMs(sub.trial_ends_at),
        cancelAt: toMs(sub.cancel_at),
        canceledAt: toMs(sub.canceled_at),
        seats: sub.seats ?? undefined,
        metadata: sub.metadata ?? undefined,
      }

      const subscriptionId = await step.run('upsert-subscription', async () => {
        try {
          const result = await fetchMutation(
            api.subscriptions.upsertFromPolar,
            payload
          )

          const allUserSubs = await fetchQuery(api.subscriptions.getAllForUser, {
            userId: payload.userId,
          })

          if (allUserSubs && allUserSubs.length > 1) {
            allUserSubs.forEach((s, index) => {
              console.error(
                `  ${index + 1}. ID: ${s._id}, Polar ID: ${s.polarSubscriptionId}, Status: ${s.status}`
              )
            })
          }

          return result
        } catch (error) {
          console.error('❌ [Inngest] Failed to upsert subscription:', error)
        }
      })

      console.log('🔔 [Inngest] Polar event type:', type, 'subscription:', subscriptionId)

      // MY OWN ADDITION — a guard your screenshots didn't show, but
      // without it the grant-credits step below would run with an
      // undefined subscriptionId whenever the upsert step's catch block
      // swallowed an error.
      if (!subscriptionId) {
        return { success: false }
      }

      // Confirmed real, in full: the create/renew regex checks, the
      // entitlement check via isEntitledStatus, the five diagnostic log
      // lines, and building the grant idempotency key via grantKey.
      const looksCreate = /subscription\.created/i.test(type)
      const looksRenew =
        /subscription\.renew|order\.created|invoice\.paid|order\.paid/i.test(
          type
        )

      const entitled = isEntitledStatus(payload.status)

      console.log('🎯 [Inngest] Credit granting analysis:')
      console.log('  - Event type:', type)
      console.log('  - Looks like create:', looksCreate)
      console.log('  - Looks like renew:', looksRenew)
      console.log('  - User entitled:', entitled)
      console.log('  - Status:', payload.status)

      // Confirmed real: destructuring polarSubscriptionId/currentPeriodEnd
      // out of payload here — your later screenshots reference them as
      // bare identifiers (in the sendEvent ids below), not payload.x.
      const { polarSubscriptionId, currentPeriodEnd } = payload

      const idk = grantKey(polarSubscriptionId, currentPeriodEnd, incoming.id)

      // Confirmed real, in full: the grant-credits step — calling
      // grantCreditsIfNeeded with a hardcoded amount of 10 and a reason
      // derived from looksCreate. (grantCreditsIfNeeded itself already
      // checks entitlement/duplicates server-side, so `entitled` above is
      // logged for diagnostics rather than gating this call directly —
      // no `if (entitled)` wrapper was shown around this step.)
      const grant = await step.run('grant-credits', async () => {
        try {
          console.log(
            '💰 [Inngest] Granting credits to subscription:',
            subscriptionId
          )
          const result = await fetchMutation(
            api.subscriptions.grantCreditsIfNeeded,
            {
              subscriptionId,
              idempotencyKey: idk,
              amount: 10,
              reason: looksCreate ? 'initial-grant' : 'periodic-grant',
            }
          )
          console.log('✅ [Inngest] Credits granted successfully:', result)
          return result
        } catch (error) {
          console.error('❌ [Inngest] Failed to grant credits:', error)
          throw error
        }
      })

      // Confirmed real, in full: logging the grant result, then — only
      // when the grant actually happened (not skipped) — sending a
      // 'billing/credits.granted' event with a dedupe id keyed off
      // polarSubscriptionId + currentPeriodEnd. Falls through to a
      // "conditions not met" log otherwise.
      console.log('📊 [Inngest] Grant result:', grant)
      if (grant.ok && !('skipped' in grant && grant.skipped)) {
        await step.sendEvent('credits-granted', {
          name: 'billing/credits.granted',
          id: `credits-granted:${polarSubscriptionId}:${currentPeriodEnd ?? 'first'}`,
          data: {
            userId,
            amount: 'granted' in grant ? (grant.granted ?? 10) : 10,
            balance: 'balance' in grant ? grant.balance : undefined,
            periodEnd: currentPeriodEnd,
          },
        })
      } else {
        console.log('🚫 [Inngest] Credit granting conditions not met')
      }

      // Confirmed real, in full: unconditionally sending a
      // 'billing/subscription.synced' event after the grant logic
      // settles either way.
      await step.sendEvent('sub-synced', {
        name: 'billing/subscription.synced',
        id: `sub-synced:${polarSubscriptionId}:${currentPeriodEnd ?? 'first'}`,
        data: {
          userId,
          polarSubscriptionId,
          status: payload.status,
          currentPeriodEnd,
        },
      })

      console.log('✅ [Inngest] Subscription synced event sent')

      // Confirmed real, in full: when there's a future currentPeriodEnd,
      // sleep until 3 days before it expires (or 5s from now, whichever
      // is later), re-check entitlement via hasEntitlement, and — if
      // still entitled at that point — send a
      // 'billing/subscription.pre_expiry' event (no explicit id on this
      // one, unlike the two sendEvents above).
      if (currentPeriodEnd && currentPeriodEnd > Date.now()) {
        const runAt = new Date(
          Math.max(Date.now() + 5000, currentPeriodEnd - 3 * 24 * 60 * 60 * 1000)
        )
        await step.sleepUntil('wait-until-expiry', runAt)
        const stillEntitled = await step.run('check-entitlement', async () => {
          try {
            console.log('🔍 [Inngest] Checking entitlement status...')
            const result = await fetchQuery(api.subscriptions.hasEntitlement, {
              userId,
            })
            console.log('✅ [Inngest] Entitlement status:', result)
            return result
          } catch (error) {
            console.error('❌ [Inngest] Failed to check entitlement:', error)
            throw error
          }
        })

        if (stillEntitled) {
          await step.sendEvent('pre-expiry', {
            name: 'billing/subscription.pre_expiry',
            data: {
              userId,
              runAt: runAt.toISOString(),
              periodEnd: currentPeriodEnd,
            },
          })
        }
      }

      return { success: true, subscriptionId, grant }
    }

    console.log('🔔 [Inngest] Polar event type:', type, 'order:', order?.id)
    return { success: true }
  }
)
