import { Check, Code, Sparkles } from 'lucide-react'
import React from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import SubscribeButton from '@/components/buttons/checkout'

type Props = {}

// Confirmed real: the full JSX (icon badge, heading, subtext) and the
// className strings. The `Sparkles` import wasn't visible in your
// screenshot's crop, but it's used below and lucide-react is already a
// dependency, so it's the obvious real import (not a guess about content,
// just filling in an import line that was scrolled off).
const Page = (props: Props) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-primary to-primary/60 rounded-full mb-4 shadow-lg">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Unlock S2C Premium
          </h1>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Transform your design workflow with AI-powered tools and
            unlimited creativity
          </p>
        </div>
        {/* Confirmed real: the Card/CardHeader/Badge/CardTitle structure
            and class names. Two spots in your screenshot showed an
            unrenderable glyph right before `bg-white/[0.08]` and
            `border-white/[0.12]` (looked like a font-ligature artifact,
            not real class text) -- omitted since the classes read as
            complete, valid Tailwind without it. */}
        <Card className="backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] shadow-xl saturate-150">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center mb-3">
              <Badge
                variant="secondary"
                className="bg-primary/20 text-primary border-primary/30 px-3 py-1 text-xs font-medium rounded-full"
              >
                Most Popular
              </Badge>
            </div>
            {/* Confirmed real: this replaces the plain
                `<CardTitle>Subscribe to S2C Premium</CardTitle>` from your
                earlier screenshot with the fuller version you've now
                shown -- "Standard Plan" as the actual card title, plus
                the price row and description. Looks like that first
                screenshot was mid-edit; matching this more complete one. */}
            <CardTitle className="text-2xl font-bold text-foreground mb-2">
              Standard Plan
            </CardTitle>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-4xl font-bold text-foreground">
                $9.99
              </span>
              <span className="text-muted-foreground text-base">/month</span>
            </div>
          </CardHeader>
          <CardDescription className="text-muted-foreground text-sm mt-2">
            Get 10 credits every month to power your AI-assisted design
            workflow
          </CardDescription>
          {/* CardContent's own className wasn't visible in your screenshot
              (cropped above the "Advanced Processing" item), so left off
              here rather than guessed. The one feature row below is
              confirmed real from your screenshot; a second row had just
              been started (empty, cropped) right after it -- not
              implementing that one until you show its actual content. */}
          <CardContent>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.05] border border-white/[0.08]">
              <div className="w-6 h-6 bg-primary/20 rounded-md flex items-center justify-center flex-shrink-0">
                <Code className="w-3 h-3 text-primary" />
              </div>
              <div>
                <p className="text-foreground font-medium text-sm">
                  Advanced Processing
                </p>
                <p className="text-muted-foreground text-xs">
                  Run complex design operations and transformations
                </p>
              </div>
            </div>
          </CardContent>
          {/* Confirmed real: CardFooter structure, className, and the
              "Cancel anytime..." line. `<SubscribeButton />` itself is a
              placeholder component (see src/components/subscribe-button.tsx)
              since its real implementation (the Polar checkout wiring)
              hasn't been shown in a screenshot yet. */}
          <CardFooter className="flex flex-col gap-3 pt-4 px-6 pb-6">
            <SubscribeButton />
            <p className="text-muted-foreground text-xs text-center">
              Cancel anytime &bull; No setup fees &bull; Instant access
            </p>
          </CardFooter>
        </Card>
        {/* Confirmed real: the trust-badge row and "Secure Payment" item.
            A second badge (icon + label) started right after it in your
            screenshot but was cropped off-screen -- not guessing at its
            label, so only the one confirmed badge is implemented. */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-6 text-muted-foreground text-xs">
            <div className="flex items-center gap-2">
              <Check className="w-3 h-3 text-green-400" />
              <span>Secure Payment</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Page
