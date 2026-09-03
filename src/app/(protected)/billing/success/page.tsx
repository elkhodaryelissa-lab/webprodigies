"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

// Confirmed real from your screenshots, with one fix and one small gap
// filled in:
//
// FIX: your screenshot called `api.subscription.hasEntitlement`
// (singular) -- the actual Convex module is `convex/subscriptions.ts`
// (plural, confirmed earlier this session against
// convex/_generated/api.d.ts), so `api.subscription` doesn't exist and
// this would've failed to compile. Corrected to `api.subscriptions`.
//
// GAP: what comes between the `}, 45_000);` line and "// 5) UI" was
// cropped out of your screenshot. I added a standard setTimeout cleanup
// (`return () => clearTimeout(t)`, my own addition -- prevents the
// timeout from firing after unmount) and closed the effect with the
// same deps as the first one (`}, [me, entitled, router]);`). Flag me
// if your source actually did something different here.
const Page = () => {
  const router = useRouter();
  const redirected = useRef(false);
  const [timedOut, setTimedOut] = useState(false);

  // 1) Current user
  const me = useQuery(api.user.getCurrentUser, {});

  // 2) Entitlement (skips until we have a user)
  const entitled = useQuery(
    api.subscriptions.hasEntitlement,
    me && me._id ? { userId: me._id as Id<"users"> } : "skip"
  );

  // 3) Redirect logic
  useEffect(() => {
    if (redirected.current) return;

    // still loading entitlement
    if (entitled === undefined) return;

    // entitled
    if (entitled) {
      redirected.current = true;
      router.replace("/dashboard");
    }
  }, [me, entitled, router]);

  // 4) 45s fallback to billing if still not entitled
  useEffect(() => {
    if (redirected.current) return;
    if (!me || entitled) return; // no user yet or already entitled

    const t = setTimeout(() => {
      if (redirected.current) return;
      setTimedOut(true);
      redirected.current = true;
      router.replace(`/billing/${me.name}`);
    }, 45_000);

    return () => clearTimeout(t);
  }, [me, entitled, router]);

  // 5) UI
  return (
    <div className="mx-auto max-w-md p-8 text-center">
      <div className="mb-3">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent align-[-2px]" />
      </div>
      <div className="mb-1 text-lg">Finalizing your subscription…</div>
      <div className="text-sm text-gray-500" aria-live="polite">
        {me === undefined
          ? "Checking your account…"
          : entitled === undefined
            ? "Confirming your entitlement…"
            : timedOut
              ? "Taking longer than expected — redirecting to billing."
              : "This should only take a few seconds."}
      </div>
    </div>
  );
};

export default Page;
