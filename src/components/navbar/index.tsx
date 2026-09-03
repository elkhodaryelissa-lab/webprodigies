'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import Autosave from '@/components/canvas/autosave'
import CreateProject from '@/components/buttons/project'
import NewFrame from '@/components/buttons/new-frame'
import { cn } from '@/lib/utils'
import { useAppSelector } from '@/redux/hooks'
import { useQuery } from 'convex/react'
import { CircleQuestionMark, Hash, LayoutTemplate, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'

type TabProps = {
  label: string
  href: string
  icon: React.ReactNode
}

const Navbar = () => {
  const params = useSearchParams()
  const projectId = params.get('project')

  const pathname = usePathname()

  // real slice code (from your screenshot) registers under the
  // `profile` key with shape `{ user: Profile | null }`, matching
  // layout.tsx's `preloadedState={{ profile: { user: profile } }}`.
  const me = useAppSelector((state) => state.profile.user)

  const tabs: TabProps[] = [
    {
      label: 'Canvas',
      href: `/dashboard/${me?.name}/canvas?project=${projectId}`,
      icon: <Hash className="h-4 w-4" />,
    },
    {
      label: 'Style Guide',
      href: `/dashboard/${me?.name}/style-guide?project=${projectId}`,
      icon: <LayoutTemplate className="h-4 w-4" />,
    },
  ]

  const project = useQuery(
    api.projects.getProject,
    projectId ? { projectId: projectId as Id<'projects'> } : 'skip'
  )

  // Confirmed real from your screenshot: `{creditBalance} credits` shown
  // in the top-right cluster. The query call itself wasn't in the crop
  // (only the rendered `{creditBalance}` was visible) -- wiring it to
  // the getCreditsBalance query added to convex/subscriptions.ts this
  // round is the obvious completion, flagged in case your source differs.
  const creditBalance = useQuery(
    api.subscriptions.getCreditsBalance,
    me?.id ? { userId: me.id as Id<'users'> } : 'skip'
  )

  const hasCanvas = pathname.includes('canvas')
  const hasStyleGuide = pathname.includes('style-guide')

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 p-6 fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center  gap-4">
        <Link
          href={`/dashboard/${me?.name}`}
          className="w-8 h-8 rounded-full border-3 border-white bg-black flex items-center justify-center"
        >
          <div className="w-4 h-4 rounded-full bg-white"></div>
        </Link>

        {!hasCanvas ||
          (!hasStyleGuide && (
            <div className="lg:inline-block hidden rounded-full text-primary/60 border border-white/[0.12] backdrop-blur-xl bg-white/[0.08] px-4 py-2 text-sm saturate-150">
              Project / {project?.name}
            </div>
          ))}
      </div>

      {/* NOTE: the tab-map body itself was cut off in your screenshot,
          so the per-tab Link below (active/inactive styling driven by
          hasCanvas/hasStyleGuide) is my own completion — flag it if the
          real version differs. The wrapper classNames match what was
          visible. */}
      <div className="lg:flex hidden items-center justify-center gap-2">
        <div className="flex items-center gap-2 backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] rounded-full p-2 saturate-150">
          {tabs.map((t) => {
            const isActive = t.label === 'Canvas' ? hasCanvas : hasStyleGuide
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-white text-black'
                    : 'text-primary/60 hover:text-primary'
                )}
              >
                {t.icon}
                {t.label}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="hidden lg:flex items-center justify-end gap-2">
        <span className="text-sm text-white/50">{creditBalance ?? 0} credits</span>
        <Button
          variant="secondary"
          className="rounded-full h-12 w-12 flex items-center justify-center backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] saturate-150 hover:bg-white/[0.12]"
        >
          <CircleQuestionMark className="size-5 text-white" />
        </Button>
        <Avatar className="size-12 ml-2">
          {/* TODO: add image */}
          <AvatarImage src={me?.image} />
          <AvatarFallback>
            <User className="size-5 text-black" />
          </AvatarFallback>
        </Avatar>
        {/* TODO: add autosave */}
        {hasCanvas && <Autosave />}
        {hasCanvas && <NewFrame />}
        {!hasCanvas && !hasStyleGuide && <CreateProject />}
      </div>
    </div>
  )
}

export default Navbar
