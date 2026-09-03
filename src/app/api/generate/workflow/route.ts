import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import { preloadedQueryResult } from 'convex/nextjs'
import { prompts } from '@/lib/prompts'
import {
  ConsumeCreditsQuery,
  CreditsBalanceQuery,
  StyleGuideQuery,
  InspirationImagesQuery,
} from '@/app/convex/query.config'
import {
  buildWorkflowPrompt,
  type ColorSection,
  type TypographySection,
} from '@/prompts/generative'

// Confirmed real from your screenshots, in full, up through the
// pageTypes array (your crop ended right there): the field-validation
// guard, both credit checks (verbatim error messages/status codes),
// the styleGuide/inspiration lookups, and colors/typography
// extraction.
//
// Two import paths corrected, same recurring-bug pattern as
// api.subscription/api.subscriptions and
// @/redux/slice/shapes -> @/redux/slices/shapes earlier this session:
// your screenshot had `import { prompts } from '@/prompts'` and
// `from '@/convex/query.config'`, but the real files (confirmed by
// the sibling /api/generate/route.ts, which imports these same
// helpers) live at src/lib/prompts.ts and
// src/app/convex/query.config.ts -- so `@/prompts` and
// `@/convex/query.config` don't resolve to anything and would 404 the
// whole route at build time. Using the resolving paths instead.
//
// Also the same `._valueJSON` bug fixed everywhere else this session:
// your screenshot has `styleGuide.styleGuide._valueJSON` and
// `inspirationResult.images._valueJSON` directly -- these are
// PreloadedQuery objects, not plain data, so that field doesn't exist
// on the public type and would be `undefined` at runtime. Wrapped in
// preloadedQueryResult() instead, same fix as StyleGuideQuery's other
// caller.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { generatedUIId, currentHTML, projectId, pageIndex } = body

    if (
      !generatedUIId ||
      !currentHTML ||
      !projectId ||
      pageIndex === undefined
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: generatedUIId, currentHTML, projectId, pageIndex',
        },
        { status: 400 }
      )
    }

    // Check credits (workflow generation consumes 1 credit)
    const { ok: balanceOk, balance: balanceBalance } =
      await CreditsBalanceQuery()
    if (!balanceOk || balanceBalance === 0) {
      return NextResponse.json(
        { error: 'No credits available' },
        { status: 400 }
      )
    }

    // Consume credits
    const { ok } = await ConsumeCreditsQuery({ amount: 1 })
    if (!ok) {
      return NextResponse.json(
        { error: 'Failed to consume credits' },
        { status: 500 }
      )
    }

    // Get project ID from request body for style guide
    const styleGuide = await StyleGuideQuery(projectId)
    const styleGuideData = preloadedQueryResult(
      styleGuide.styleGuide
    ) as unknown as {
      colorSections: ColorSection[]
      typographySections: TypographySection[]
    } | null

    // Get inspiration images
    const inspirationResult = await InspirationImagesQuery(projectId)
    const images = preloadedQueryResult(
      inspirationResult.images
    ) as unknown as {
      url: string
    }[]
    const imageUrls = images.map((img) => img.url).filter(Boolean)

    const colors = styleGuideData?.colorSections || []
    const typography = styleGuideData?.typographySections || []

    // Define the page types for dynamic generation
    const pageTypes = [
      'Dashboard/Analytics page with charts, metrics, and KPIs',
      'Settings/Configuration page with preferences and account management',
      'User Profile page with personal information and activity',
      'Data Listing/Table page with search, filters, and pagination',
    ]
    const selectedPageType = pageTypes[pageIndex] || pageTypes[0]

    // Confirmed real: your latest screenshot showed all 4 pageTypes
    // (I'd invented a 4th one last round -- "Data Listing/Table..." is
    // the real one, corrected) and the `|| pageTypes[0]` fallback
    // (I'd used `??`, functionally identical here but matching exactly
    // now). It also showed the userPrompt built inline in this route
    // (`let userPrompt = \`...\``) rather than via a function call --
    // but the text is word-for-word identical to buildWorkflowPrompt()
    // in src/prompts/generative.ts (double-confirms that
    // reconstruction was right), so keeping the function call here
    // rather than duplicating the same long prompt in two files.
    const userPrompt = buildWorkflowPrompt({
      currentHTML,
      selectedPageType,
      colors,
      typography,
      imageUrls,
    })

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Missing ANTHROPIC_API_KEY' },
        { status: 500 }
      )
    }

    const result = streamText({
      model: anthropic('claude-opus-4-20250514'),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            ...imageUrls.map((url) => ({
              type: 'image' as const,
              image: url,
            })),
          ],
        },
      ],
      system: prompts.generativeUi.system,
      temperature: 0.7,
    })

    // Confirmed real: TextEncoder is created fresh inside the loop
    // each chunk (matches the main /api/generate/route.ts's own
    // confirmed pattern) rather than hoisted once outside -- corrected
    // to match exactly, even though it's functionally identical either
    // way.
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            const encoder = new TextEncoder()
            controller.enqueue(encoder.encode(chunk))
          }
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Workflow page generation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate workflow page',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
