import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

// Confirmed real, in full, across three screenshots: reducerPath
// 'generationApi', baseUrl '/api/generate' (same base styleGuideApi
// uses below), tagTypes: ['Generation'] (declared but not actually
// used by any endpoint here -- not guessing at invalidatesTags that
// weren't shown), all 4 mutations (generateGeneration, redesignUI,
// generateWorkflow, redesignWorkflow) with their exact
// url/method/body, and the final exported-hooks block -- names
// (useGenerateGenerationMutation, useRedesignUIMutation,
// useGenerateWorkflowMutation, useRedesignWorkflowMutation) confirmed
// verbatim by your last screenshot, matching RTK Query's own naming
// convention for these endpoint names either way.
//
// Flagging, not fixing: baseUrl '/api/generate' + these endpoint urls
// means the 4 mutations below hit POST /api/generate/generate,
// /api/generate/redesign, /api/generate/workflow and
// /api/generate/workflow-redesign -- none of which exist as route
// files yet. Your actual working "Generate Design" button
// (use-canvas.ts's handleGenerateDesign) calls raw
// fetch('/api/generate') directly today, NOT this RTK Query slice, so
// adding this file doesn't touch or risk that working flow. I haven't
// built the /generate/generate, /redesign, /workflow,
// /workflow-redesign route handlers since no screenshot has shown what
// they should actually do yet -- send those whenever you get there and
// I'll wire them up (and switch the button over to these hooks if
// that's the direction the tutorial is going).
export const generationApi = createApi({
  reducerPath: 'generationApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/generate',
  }),
  tagTypes: ['Generation'],
  endpoints: (builder) => ({
    // Generate generation
    generateGeneration: builder.mutation({
      query: (data) => ({
        url: '/generate',
        method: 'POST',
        body: data,
      }),
    }),
    // Redesign UI
    redesignUI: builder.mutation({
      query: (data) => ({
        url: '/redesign',
        method: 'POST',
        body: data,
      }),
    }),
    // Generate workflow page
    generateWorkflow: builder.mutation({
      query: (data) => ({
        url: '/workflow',
        method: 'POST',
        body: data,
      }),
    }),
    // Redesign workflow page
    redesignWorkflow: builder.mutation({
      query: (data) => ({
        url: '/workflow-redesign',
        method: 'POST',
        body: data,
      }),
    }),
  }),
})

export const {
  useGenerateGenerationMutation,
  useRedesignUIMutation,
  useGenerateWorkflowMutation,
  useRedesignWorkflowMutation,
} = generationApi
