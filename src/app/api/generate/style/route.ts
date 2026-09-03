import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { fetchMutation } from 'convex/nextjs'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { CreditsBalanceQuery, ConsumeCreditsQuery, MoodBoardImagesQuery } from '@/app/convex/query.config'
import { preloadedQueryResult } from 'convex/nextjs'
import { prompts } from '@/lib/prompts'
import { buildStyleGuidePrompt } from '@/prompts/generative'
import type { MoodBoardImage } from '@/hooks/use-styles'

// Confirmed real up through the generateObject call: the credits check
// via CreditsBalanceQuery(), the MoodBoardImagesQuery(projectId) call
// and its "no images" 400, building imageUrls/systemPrompt/userPrompt,
// and the generateObject call itself (model 'claude-sonnet-4-20250514',
// schema, system, messages shape with `image: url as string`).
//
// Two things fixed rather than copied literally:
// - `moodBoardImages.images._valueJSON` -> `preloadedQueryResult(...)`,
//   same recurring bug fixed everywhere else in this project.
// - Everything after generateObject wasn't shown (your screenshot cut
//   off right after the messages array). Saving the result to the
//   project, spending a credit, and the response shape are my own
//   completion -- built to match what use-styles.ts's
//   handleGenerateStyleGuide destructures (`result.success`,
//   `result.message`).
const ColorSwatchSchema = z.object({
  name: z.string(),
  hexColor: z.string(),
  description: z.string().optional(),
})

// Confirmed real from your screenshot: each color section is its OWN
// schema (not one shared shape looped 5x like I'd first written) with a
// fixed swatch count per section. Only Primary Colours' own swatch
// count wasn't visible (your screenshot's crop cut it off right after
// `const PrimaryColorsSchema = z.object({` -- next line hidden). Using
// 5 there as a placeholder -- flag me with the real number if it's
// different, this is the one guessed value in this schema.
const PrimaryColorsSchema = z.object({
  title: z.literal('Primary Colours'),
  swatches: z.array(ColorSwatchSchema).length(5),
})

const SecondaryColorsSchema = z.object({
  title: z.literal('Secondary & Accent Colors'),
  swatches: z.array(ColorSwatchSchema).length(4),
})

const UIComponentColorsSchema = z.object({
  title: z.literal('UI Component Colors'),
  swatches: z.array(ColorSwatchSchema).length(6),
})

const UtilityColorsSchema = z.object({
  title: z.literal('Utility & Form Colors'),
  swatches: z.array(ColorSwatchSchema).length(3),
})

const StatusColorsSchema = z.object({
  title: z.literal('Status & Feedback Colors'),
  swatches: z.array(ColorSwatchSchema).length(2),
})

const TypographyStyleSchema = z.object({
  name: z.string(),
  fontFamily: z.string(),
  fontSize: z.string(),
  fontWeight: z.string(),
  lineHeight: z.string(),
  letterSpacing: z.string().optional(),
  description: z.string().optional(),
})

const TypographySectionSchema = z.object({
  title: z.string(),
  styles: z.array(TypographyStyleSchema),
})

// Confirmed real, including `.length(3)` on a plain `z.array(...)` for
// typographySections rather than a 3-tuple -- worth knowing this means
// the Zod-inferred type is `TypographySection[]`, not the fixed
// `[T, T, T]` tuple your redux `StyleGuide` TS interface declares, so
// `result.object` is cast below rather than assigned directly.
const StyleGuideSchema = z.object({
  theme: z.string(),
  description: z.string(),
  colorSections: z.tuple([
    PrimaryColorsSchema,
    SecondaryColorsSchema,
    UIComponentColorsSchema,
    UtilityColorsSchema,
    StatusColorsSchema,
  ]),
  typographySections: z.array(TypographySectionSchema).length(3),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId } = body
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const { ok: balanceOk, balance: balanceBalance } =
      await CreditsBalanceQuery()

    if (!balanceOk) {
      return NextResponse.json(
        { error: 'Failed to get balance' },
        { status: 500 }
      )
    }

    if (balanceBalance === 0) {
      return NextResponse.json(
        { error: 'No credits available' },
        { status: 400 }
      )
    }

    const moodBoardImages = await MoodBoardImagesQuery(projectId)
    if (
      !moodBoardImages ||
      preloadedQueryResult(moodBoardImages.images).length === 0
    ) {
      return NextResponse.json(
        {
          error:
            'No mood board images found. Please upload images to the mood board first.',
        },
        { status: 400 }
      )
    }
    const images = preloadedQueryResult(
      moodBoardImages.images
    ) as unknown as MoodBoardImage[]
    const imageUrls = images
      .map((img) => img.url)
      .filter((url): url is string => Boolean(url))
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Missing ANTHROPIC_API_KEY' },
        { status: 500 }
      )
    }

    const systemPrompt = prompts.styleGuide.system

    // Confirmed real text, now sourced from src/prompts/generative.ts's
    // buildStyleGuidePrompt (found there while fixing that file to
    // compile) instead of duplicated inline.
    const userPrompt = buildStyleGuidePrompt({ imageUrls })

    const result = await generateObject({
      model: anthropic('claude-sonnet-4-20250514'),
      schema: StyleGuideSchema,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userPrompt,
            },
            ...imageUrls.map((url) => ({
              type: 'image' as const,
              image: url as string, // Fix: ensure image is always a string (URL), not undefined
            })),
          ],
        },
      ],
    })

    // Confirmed real order and shape from your screenshot: credits are
    // spent FIRST (I'd had this the other way around before seeing it),
    // and a failure here returns the generic 500 shown -- not the more
    // specific "insufficient credits" message I might have guessed.
    const { ok, balance } = await ConsumeCreditsQuery({ amount: 1 })
    if (!ok) {
      return NextResponse.json(
        { error: 'Failed to generate style guide' },
        { status: 500 }
      )
    }

    // Confirmed real: styleGuideData (not styleGuide) as the arg name,
    // and the raw object (not JSON.stringify'd here -- that now happens
    // inside the mutation itself, see convex/projects.ts).
    await fetchMutation(
      api.projects.updateProjectStyleGuide,
      {
        projectId: projectId as Id<'projects'>,
        styleGuideData: result.object,
      },
      { token: await convexAuthNextjsToken() }
    )

    return NextResponse.json({
      success: true,
      message: 'Style guide generated successfully!',
      styleGuide: result.object,
      creditsRemaining: balance,
    })
  } catch (error) {
    console.error('Style guide generation error:', error)
    // My own addition -- the browser console error overlay you're
    // seeing shows an unhelpful `{}` because RTK Query's .unwrap()
    // throws a payload object that doesn't print cleanly, and the real
    // error message was only ever visible in the terminal running
    // `npm run dev` (where the console.error above lands), not in the
    // browser. Including it in the response body too so it shows up
    // right in the toast instead.
    return NextResponse.json(
      {
        error: 'Failed to generate style guide',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
