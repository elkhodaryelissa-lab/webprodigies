import { useLazyGetCheckoutQuery } from '@/redux/api/billing'
import { useAppSelector } from '@/redux/store'
import { toast } from 'sonner'

// Confirmed real: the imports, the trigger/isFetching + id setup, and the
// full onSubscribe try/catch body (trigger(id).unwrap() -> redirect to
// res.url, toast.error on failure).
//
// BUG FIX: your screenshot had
// `const { id } = useAppSelector((state) => state.profile)` -- but the
// profile slice's state shape is `{ user: Profile | null }` (see
// src/redux/slices/profile/index.ts), not `{ id }` directly, so that
// would've always destructured `id` as undefined. Selecting
// `state.profile.user` first (Profile has the real `id` field) is the
// fix, with `?? {}` so a not-yet-loaded profile doesn't crash the
// destructure.
//
// Also added the `return` your screenshot's file didn't have yet (it
// ended right after onSubscribe's closing brace) -- without it,
// useSubscriptionPlan() wouldn't hand back onSubscribe/isFetching at
// all, which your SubscribeButton screenshot destructures.
export const useSubscriptionPlan = () => {
  const [trigger, { isFetching }] = useLazyGetCheckoutQuery()
  const { id } = useAppSelector((state) => state.profile.user) ?? {}
  const onSubscribe = async () => {
    try {
      const res = await trigger(id as string).unwrap()
      window.location.href = res.url
    } catch (err) {
      console.error('Checkout error:', err)
      toast.error('Could not start checkout. Please try again.')
    }
  }

  return { onSubscribe, isFetching }
}
