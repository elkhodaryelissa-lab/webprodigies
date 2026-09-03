import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

// Confirmed real: reducerPath 'billing', baseUrl '/api/billing', and the
// getCheckout endpoint (url '/checkout', params: { userId }). Your
// earlier screenshot had a duplicated `method` prop
// (`method: 'GET',    method: 'POST',`); your later screenshot of
// src/app/api/billing/checkout/route.ts confirmed the actual handler is
// `export async function GET(...)`, so this is corrected to GET here
// (I'd guessed POST before seeing that route file -- fixing it now).
export const BillingApi = createApi({
  reducerPath: 'billing',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/billing' }),
  endpoints: (builder) => ({
    getCheckout: builder.query({
      query: (userId: string) => ({
        url: '/checkout',
        method: 'GET',
        params: {
          userId,
        },
      }),
    }),
  }),
})

export const { useGetCheckoutQuery, useLazyGetCheckoutQuery } = BillingApi
