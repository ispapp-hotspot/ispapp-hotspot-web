import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactNode } from 'react'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

export function renderWithQuery(ui: ReactNode, options?: RenderOptions) {
  const qc = createTestQueryClient()
  return {
    ...render(
      <QueryClientProvider client={qc}>{ui}</QueryClientProvider>,
      options
    ),
    queryClient: qc,
  }
}
