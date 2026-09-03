'use client'

import React from 'react'
import { cn } from '@/lib/utils'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: 'sm' | 'default'
  variant?: 'default' | 'subtle'
}

// Not from any screenshot — referenced by the real Frame component
// (src/components/canvas/shapes/frame) for its "Inspiration" and
// "Generate Design" buttons, but never shown/provided. This is my own
// small glass-pill button matching the app's existing glassmorphism
// convention (backdrop-blur-xl bg-white/[0.08] border border-white/[0.12]
// saturate-150 — same classes as the navbar and canvas toolbar pills).
export const LiquidGlassButton = ({
  size = 'default',
  variant = 'default',
  className,
  children,
  ...props
}: Props) => {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] saturate-150 text-white/80 hover:bg-white/[0.14] hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm',
        variant === 'subtle' && 'text-white/70',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
