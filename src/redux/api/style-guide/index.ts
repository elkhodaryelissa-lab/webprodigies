import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface ColorSwatch {
  name: string
  hexColor: string
  description?: string
}

export interface ColorSection {
  title:
    | 'Primary Colours'
    | 'Secondary & Accent Colors'
    | 'UI Component Colors'
    | 'Utility & Form Colors'
    | 'Status & Feedback Colors'
  swatches: ColorSwatch[]
}

export interface TypographyStyle {
  name: string
  fontFamily: string
  fontSize: string
  fontWeight: string
  lineHeight: string
  letterSpacing?: string
  description?: string
}

export interface TypographySection {
  title: string
  styles: TypographyStyle[]
}

export interface StyleGuide {
  theme: string
  description: string
  colorSections: [
    ColorSection,
    ColorSection,
    ColorSection,
    ColorSection,
    ColorSection,
  ]
  typographySections: [
    TypographySection,
    TypographySection,
    TypographySection,
  ]
}


// `GenerateStyleGuideRequest`/`GenerateStyleGuideResponse` weren't
// visible in your screenshot (only the generic StyleGuideResponse,
// StyleGuideRequest names, cropped above the createApi call). Request
// is the obvious one -- the query fn only ever destructures
// `{ projectId }`. Response shape matches what
// src/app/api/generate/style/route.ts actually returns, and what
// useStyleGuide's handleGenerateStyleGuide destructures
// (`result.success`, `result.message`) -- confirmed by that screenshot,
// even though the route's own return statement wasn't shown.
export interface GenerateStyleGuideRequest {
  projectId: string
}

export interface GenerateStyleGuideResponse {
  success: boolean
  message: string
  styleGuide?: StyleGuide
}

// Confirmed real, in full: reducerPath, baseUrl '/api/generate', the
// generateStyleGuide mutation (url '/style' -> POST /api/generate/style,
// headers, body: { projectId }), invalidatesTags, and the exported hook
// name.
export const styleGuideApi = createApi({
  reducerPath: 'styleGuideApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/generate',
  }),
  tagTypes: ['StyleGuide'],
  endpoints: (builder) => ({
    generateStyleGuide: builder.mutation<
      GenerateStyleGuideResponse,
      GenerateStyleGuideRequest
    >({
      query: ({ projectId }) => ({
        url: '/style',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: { projectId },
      }),
      invalidatesTags: ['StyleGuide'],
    }),
  }),
})

export const { useGenerateStyleGuideMutation } = styleGuideApi
