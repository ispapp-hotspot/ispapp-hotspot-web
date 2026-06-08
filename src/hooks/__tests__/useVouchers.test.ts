import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createTestQueryClient } from '@/test/utils'
import { QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import http from '@/lib/http'
import { useVouchersByPlan, useGenerateVouchers, useDeleteVoucher } from '../useVouchers'
import type { HotspotVoucher } from '@/types'

vi.mock('@/lib/http', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const COMPANY_ID = 'company-123'
const PLAN_ID = 'plan-456'

const mockVoucher: HotspotVoucher = {
  id: 'v-1',
  companyId: COMPANY_ID,
  planId: PLAN_ID,
  code: 'ABC12345',
  used: false,
  createdAt: '2024-01-01T00:00:00Z',
}

function wrapper() {
  const qc = createTestQueryClient()
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

describe('useVouchersByPlan', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches vouchers for a plan', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: [mockVoucher] })

    const { result } = renderHook(() => useVouchersByPlan(COMPANY_ID, PLAN_ID), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([mockVoucher])
    expect(http.get).toHaveBeenCalledWith(`/companies/${COMPANY_ID}/vouchers/plan/${PLAN_ID}`)
  })

  it('does not fetch when planId is empty', () => {
    const { result } = renderHook(() => useVouchersByPlan(COMPANY_ID, ''), { wrapper: wrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useGenerateVouchers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('generates vouchers and shows correct toast', async () => {
    const { toast } = await import('sonner')
    const generated = [mockVoucher, { ...mockVoucher, id: 'v-2', code: 'XYZ98765' }]
    vi.mocked(http.post).mockResolvedValue({ data: generated })

    const { result } = renderHook(() => useGenerateVouchers(COMPANY_ID, PLAN_ID), { wrapper: wrapper() })

    result.current.mutate(2)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.post).toHaveBeenCalledWith(
      `/companies/${COMPANY_ID}/vouchers/generate`,
      { planId: PLAN_ID, quantity: 2 },
    )
    expect(toast.success).toHaveBeenCalledWith('2 vouchers gerados!')
  })

  it('shows singular toast for 1 voucher', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.post).mockResolvedValue({ data: [mockVoucher] })

    const { result } = renderHook(() => useGenerateVouchers(COMPANY_ID, PLAN_ID), { wrapper: wrapper() })

    result.current.mutate(1)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalledWith('1 voucher gerado!')
  })

  it('shows error toast on failure', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.post).mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useGenerateVouchers(COMPANY_ID, PLAN_ID), { wrapper: wrapper() })

    result.current.mutate(5)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Erro ao gerar vouchers.')
  })
})

describe('useDeleteVoucher', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes voucher and shows toast', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.delete).mockResolvedValue({})

    const { result } = renderHook(() => useDeleteVoucher(COMPANY_ID, PLAN_ID), { wrapper: wrapper() })

    result.current.mutate('v-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.delete).toHaveBeenCalledWith(`/companies/${COMPANY_ID}/vouchers/v-1`)
    expect(toast.success).toHaveBeenCalledWith('Voucher removido.')
  })
})
