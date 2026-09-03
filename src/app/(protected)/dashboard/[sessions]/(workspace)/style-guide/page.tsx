import { TabsContent } from '@/components/ui/tabs'
import React from 'react'
import { Palette } from 'lucide-react'
import { preloadedQueryResult } from 'convex/nextjs'
import { StyleGuideQuery, MoodBoardImagesQuery } from '@/app/convex/query.config'
import { ThemeContent } from '@/components/style/theme'
import StyleGuideTypography from '@/components/style/typography'
import MoodBoard from '@/components/style/mood-board'
import type { StyleGuide } from '@/redux/api/style-guide'
import type { MoodBoardImage } from '@/hooks/use-styles'

type Props = {
  searchParams: Promise<{
    project: string
  }>
}

const Page = async ({ searchParams }: Props) => {
  const projectId = (await searchParams).project
  const existingStyleGuide = await StyleGuideQuery(projectId)

  // NOTE: your screenshot read `existingStyleGuide.styleGuide?._valueJSON
  // as unknown as StyleGuide` directly — that's the same `_valueJSON`
  // bug we've fixed everywhere else in this project. `_valueJSON` needs
  // `preloadedQueryResult()` to decode it properly, not a direct cast.
  const guide = preloadedQueryResult(
    existingStyleGuide.styleGuide
  ) as unknown as StyleGuide

  const colorGuide = guide?.colorSections || []
  const typographyGuide = guide?.typographySections || []

  // NOTE: your screenshot called `MoodBoardImagesQuery(projectId)` here --
  // that function didn't exist yet, so I added it to query.config.ts, plus
  // a new convex/moodboard.ts with the getMoodBoardImages query it calls
  // (resolves each stored image's storage ID to a URL). It returns
  // `{ images }`.
  const existingMoodBoardImages = await MoodBoardImagesQuery(projectId)

  // NOTE: your screenshot read `existingMoodBoardImages.images._valueJSON
  // as unknown as MoodBoardImage[]` directly -- same `_valueJSON` bug
  // we've fixed everywhere else. Using `preloadedQueryResult()` instead.
  const guideImages = preloadedQueryResult(
    existingMoodBoardImages.images
  ) as unknown as MoodBoardImage[]

  return (
    <div>
      <TabsContent value="colours" className="space-y-8">
        {!colorGuide.length ? (
          <div className="space-y-8">
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center">
                <Palette className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                No colors generated yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                Upload images to your mood board and generate an AI-powered
                style guide with colors and typography.
              </p>
            </div>
          </div>
        ) : (
          <ThemeContent colorGuide={colorGuide} />
        )}
      </TabsContent>

      <TabsContent value="typography">
        <StyleGuideTypography typographyGuide={typographyGuide} />
      </TabsContent>

      <TabsContent value="moodboard">
        <MoodBoard guideImages={guideImages} />
      </TabsContent>
    </div>
  )
}

export default Page
