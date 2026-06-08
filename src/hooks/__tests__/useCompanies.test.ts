import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createTestQueryClient } from '@/test/utils'
import { QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import http from '@/lib/http'
import { useCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany } from '../useCompanies'
import type { Company } from '@/types'

vi.mock('@/lib/http', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const COMPANY_ID = 'company-123'

const mockCompany: Company = {
  id: COMPANY_ID, name: 'Hotel Exemplo', type: 'hotel',
  createdAt: '2024-01-01T00:00:00Z',
} as Company

function wrapper() {
  const qc = createTestQueryClient()
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

describe('useCompanies', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches company list', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: [mockCompany] })

    const { result } = renderHook(() => useCompanies(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([mockCompany])
    expect(http.get).toHaveBeenCalledWith('/companies')
  })
})

describe('useCreateCompany', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates company and shows toast', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.post).mockResolvedValue({ data: mockCompany })

    const { result } = renderHook(() => useCreateCompany(), { wrapper: wrapper() })

    result.current.mutate({ name: 'Hotel Exemplo', type: 'hotel' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.post).toHaveBeenCalledWith('/companies', { name: 'Hotel Exemplo', type: 'hotel' })
    expect(toast.success).toHaveBeenCalledWith('Empresa criada!')
  })

  it('onSuccess callback receives created company', async () => {
    vi.mocked(http.post).mockResolvedValue({ data: mockCompany })

    const { result } = renderHook(() => useCreateCompany(), { wrapper: wrapper() })

    const onSuccess = vi.fn()
    result.current.mutate({ name: 'Hotel Exemplo', type: 'hotel' }, { onSuccess })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onSuccess.mock.calls[0][0]).toEqual(mockCompany)
  })

  it('shows error toast on failure', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.post).mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useCreateCompany(), { wrapper: wrapper() })

    result.current.mutate({ name: 'X' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Erro ao criar empresa.')
  })
})

describe('useUpdateCompany', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates company and shows toast', async () => {
    const { toast } = await import('sonner')
    const updated = { ...mockCompany, name: 'Hotel Updated' }
    vi.mocked(http.put).mockResolvedValue({ data: updated })

    const { result } = renderHook(() => useUpdateCompany(), { wrapper: wrapper() })

    result.current.mutate({ id: COMPANY_ID, data: { name: 'Hotel Updated' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.put).toHaveBeenCalledWith(`/companies/${COMPANY_ID}`, { name: 'Hotel Updated' })
    expect(toast.success).toHaveBeenCalledWith('Empresa atualizada!')
  })

  it('shows error toast on failure', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.put).mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useUpdateCompany(), { wrapper: wrapper() })

    result.current.mutate({ id: COMPANY_ID, data: { name: 'Fail' } })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Erro ao atualizar empresa.')
  })
})

describe('useDeleteCompany', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes company and shows toast', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.delete).mockResolvedValue({})

    const { result } = renderHook(() => useDeleteCompany(), { wrapper: wrapper() })

    result.current.mutate(COMPANY_ID)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.delete).toHaveBeenCalledWith(`/companies/${COMPANY_ID}`)
    expect(toast.success).toHaveBeenCalledWith('Empresa removida.')
  })

  it('shows error toast on failure', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.delete).mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useDeleteCompany(), { wrapper: wrapper() })

    result.current.mutate(COMPANY_ID)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Erro ao remover empresa.')
  })
})
