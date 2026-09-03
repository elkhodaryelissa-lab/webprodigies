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
  buildRedesignPrompt,
  type ColorSection,
  type TypographySection,
} from '@/prompts/generative'

// Confirmed real from your screenshots up through the colors section
// (your crop cut off mid-swatch-type): the body destructure
// (userMessage, generatedUIId, currentHTML, wireframeSnapshot,
// projectId), both credit checks (verbatim messages/status codes),
// the styleGuide/inspiration lookups, and the userPrompt built via
// what's now the corrected buildRedesignPrompt() (see
// src/prompts/generative.ts -- the version there didn't match this
// route's real behavior, now fixed).
//
// Same two import-path corrections as the workflow route, same
// recurring pattern: your screenshot had `from '@/prompts'` and
// `from '@/convex/query.config'`, neither of which resolve to a real
// file -- using `@/lib/prompts` and `@/app/convex/query.config`
// instead, confirmed by the sibling generate/workflow routes.
// Same `._valueJSON` fix too (preloadedQueryResult() instead).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userMessage,
      generatedUIId,
      currentHTML,
      wireframeSnapshot,
      projectId,
    } = body

    // Not fully shown -- your screenshot cut off right after
    // `if (!userMessage || !generatedUIId ||`. wireframeSnapshot is
    // handled as optional everywhere else in this route (the
    // if/else console.log pair), so it's left out of this required-
    // fields guard; the other three match the pattern the workflow
    // route's guard already confirmed.
    if (!userMessage || !generatedUIId || !currentHTML || !projectId) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: userMessage, generatedUIId, currentHTML, projectId',
        },
        { status: 400 }
      )
    }

    // Check credits
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

    const userPrompt = buildRedesignPrompt({
      userMessage,
      currentHTML,
      wireframeSnapshot,
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

    // Confirmed real from your latest screenshots: the streamText
    // call (model, system, temperature), and the comment right above
    // it ("Create streaming response using the generative UI prompt").
    //
    // One deliberate deviation, same reasoning as the empty-catch
    // fixes earlier this session: your screenshot has the wireframe
    // image part unconditional (`{ type: 'image', image:
    // wireframeSnapshot }`, no guard), but buildRedesignPrompt's own
    // confirmed logic right above (the `if (wireframeSnapshot) {...}
    // else { console.log('No wireframe context available') }` pair)
    // proves wireframeSnapshot can genuinely be absent. Sending
    // `image: undefined` to the Anthropic provider when that happens
    // would break the request outright, so kept this one conditional
    // rather than copying the literal unconditional version. Flag me
    // if wireframeSnapshot turns out to be guaranteed non-null by
    // something upstream I haven't seen.
    // Create streaming response using the generative UI prompt
    const result = streamText({
      model: anthropic('claude-opus-4-20250514'),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            ...(wireframeSnapshot
              ? [
                  {
                    type: 'image' as const,
                    image: wireframeSnapshot, // Raw base64 string (same format as original generation API)
                  },
                ]
              : []),
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
    console.error('Redesign API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process redesign request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
