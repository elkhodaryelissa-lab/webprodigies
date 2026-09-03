import { NextRequest, NextResponse } from 'next/server'
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { preloadedQueryResult } from 'convex/nextjs'
import {
  CreditsBalanceQuery,
  ConsumeCreditsQuery,
  StyleGuideQuery,
  InspirationImagesQuery,
} from '@/app/convex/query.config'
import { buildGeneratePrompt, type ColorSection, type TypographySection } from '@/prompts/generative'
import { prompts } from '@/lib/prompts'

// Confirmed real (from your screenshots) up through the credit checks:
// this route lives at /api/generate -- a sibling of /api/generate/style,
// not /api/canvas/generate where I'd originally put it -- reads
// `image`/`projectId` off the FormData (not `frameNumber`, which the
// client still sends but this route doesn't read), validates the file
// is an image, then reuses the same CreditsBalanceQuery/ConsumeCreditsQuery
// helpers the style-guide route uses.
//
// Also confirmed real, from your latest screenshots: this uses the
// Vercel AI SDK's streamText (not the raw @anthropic-ai/sdk streaming I
// had before) with model claude-opus-4-20250514, a userPrompt built
// from the project's styleGuide colors/typography plus inspiration
// image URLs, `system: prompts.generativeUi.system`, and
// `temperature: 0.7`. The userPrompt text your screenshot showed typed
// inline is identical to buildGeneratePrompt() in
// src/prompts/generative.ts (same styleGuide-mapping text, confirmed
// verbatim earlier this session), so calling that function here instead
// of retyping the same string -- same content either way.
//
// Still fixed the same `_valueJSON` bug one more time
// (styleGuide.styleGuide._valueJSON / inspirationImages.images._valueJSON
// -> preloadedQueryResult(...)), same as everywhere else this session.
//
// The rest of the stream loop and the final Response are now confirmed
// too (a later screenshot showed them): text/html content type (not
// text/plain), Cache-Control: no-cache, Connection: keep-alive, and the
// outer catch actually IS a real error response (not empty like the
// other confirmed-empty catches this session) -- {error: "Failed to
// generate UI design", details: ...}, status 500. Matches what I'd
// already written as my own deviation, so no change in behavior, just
// swapped in your exact message text.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    const projectId = formData.get('projectId') as string

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      )
    }

    const { ok: balanceOk, balance: balanceBalance } = await CreditsBalanceQuery()
    if (!balanceOk) {
      return NextResponse.json({ error: 'Failed to get balance' }, { status: 500 })
    }

    if (balanceBalance === 0) {
      return NextResponse.json({ error: 'No credits available' }, { status: 400 })
    }

    const { ok } = await ConsumeCreditsQuery({ amount: 1 })

    if (!ok) {
      return NextResponse.json({ error: 'no credits available' }, { status: 400 })
    }

    const imageBuffer = await imageFile.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')

    const styleGuideResult = await StyleGuideQuery(projectId)
    const guide = preloadedQueryResult(styleGuideResult.styleGuide) as unknown as {
      colorSections: ColorSection[]
      typographySections: TypographySection[]
    } | null

    const inspirationImages = await InspirationImagesQuery(projectId)
    const images = preloadedQueryResult(inspirationImages.images) as unknown as {
      url: string
    }[]
    const imageUrls = images
      .map((img) => img.url)
      .filter((url): url is string => Boolean(url))

    const colors = guide?.colorSections || []
    const typography = guide?.typographySections || []
    const systemPrompt = prompts.generativeUi.system

    const userPrompt = buildGeneratePrompt({ colors, typography })

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
            { type: 'image', image: base64Image },
            ...imageUrls.map((url) => ({
              type: 'image' as const,
              image: url,
            })),
          ],
        },
      ],
      system: systemPrompt,
      temperature: 0.7,
    })

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let totalChunks = 0
        let totalLength = 0
        let accumulatedContent = ''

        try {
          for await (const chunk of result.textStream) {
            totalChunks++
            totalLength += chunk.length
            accumulatedContent += chunk

            // Stream the HTML markup text
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
    return NextResponse.json(
      {
        error: 'Failed to generate UI design',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
