import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createTestQueryClient } from '@/test/utils'
import { QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useLogin } from '../useAuth'

vi.mock('@/lib/http', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockAuthResult = { name: 'Arthur', email: 'arthur@example.com', role: 'ADMIN' }

function wrapper() {
  const qc = createTestQueryClient()
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

function mockFetchOk(body: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  }))
}

function mockFetchError(body: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: false,
    json: () => Promise.resolve(body),
  }))
}

describe('useLogin', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls /api/auth/login with credentials', async () => {
    mockFetchOk(mockAuthResult)

    const { result } = renderHook(() => useLogin(), { wrapper: wrapper() })

    result.current.mutate({ email: 'arthur@example.com', password: 'secret' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'arthur@example.com', password: 'secret' }),
    }))
  })

  it('returns auth result on success', async () => {
    mockFetchOk(mockAuthResult)

    const { result } = renderHook(() => useLogin(), { wrapper: wrapper() })

    result.current.mutate({ email: 'arthur@example.com', password: 'secret' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockAuthResult)
  })

  it('sets isError on invalid credentials', async () => {
    mockFetchError({ message: 'Credenciais inválidas' })

    const { result } = renderHook(() => useLogin(), { wrapper: wrapper() })

    result.current.mutate({ email: 'wrong@example.com', password: 'wrong' })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('mutateAsync rejects on failure so caller can catch', async () => {
    mockFetchError({ message: 'Unauthorized' })

    const { result } = renderHook(() => useLogin(), { wrapper: wrapper() })

    await expect(result.current.mutateAsync({ email: 'x@x.com', password: 'x' })).rejects.toThrow()
  })
})
