"use client"

import { LogOutIcon } from "lucide-react"

import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { SketchUpload } from "@/components/sketch-upload"
import { SketchGallery } from "@/components/sketch-gallery"

type DashboardClientProps = {
  entitlement: { plan: string; creditsBalance: number } | null
  profileName: string | null
}

export function DashboardClient({ entitlement, profileName }: DashboardClientProps) {
  const { handleSignOut, isLoading } = useAuth()

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            {profileName ? `Welcome, ${profileName}` : "Sketches"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Turn a wireframe or sketch into a real design.
          </p>
          {entitlement && (
            <p className="text-sm text-muted-foreground">
              {entitlement.plan} plan &middot; {entitlement.creditsBalance} credits remaining
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" disabled={isLoading} onClick={handleSignOut}>
          <LogOutIcon /> Sign out
        </Button>
      </header>

      <SketchUpload />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Your sketches
        </h2>
        <SketchGallery />
      </section>
    </div>
  )
}
