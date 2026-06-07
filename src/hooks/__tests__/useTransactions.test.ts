import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createTestQueryClient } from '@/test/utils'
import { QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import {
  useTransactions,
  useTransactionStats,
  useApproveTransaction,
  useCancelTransaction,
} from '../useTransactions'
import * as api from '@/services/api'
import type { FinancialTransaction, TransactionListResponse, TransactionStats } from '@/types'

vi.mock('@/services/api', () => ({
  transactionsApi: {
    list:    vi.fn(),
    stats:   vi.fn(),
    approve: vi.fn(),
    cancel:  vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockTx: FinancialTransaction = {
  id:          'tx-1',
  ispId:       'isp-1',
  companyId:   'company-1',
  gatewayType: 'MERCADO_PAGO',
  amount:      19.9,
  status:      'pending',
  createdAt:   '2025-01-01T00:00:00Z',
  updatedAt:   '2025-01-01T00:00:00Z',
}

const mockList: TransactionListResponse = {
  data:  [mockTx],
  total: 1,
  page:  0,
  size:  20,
}

const mockStats: TransactionStats = {
  total:    10,
  approved: 7,
  pending:  3,
  revenue:  139.3,
}

function wrapper() {
  const qc = createTestQueryClient()
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

describe('useTransactions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches list and returns data', async () => {
    vi.mocked(api.transactionsApi.list).mockResolvedValue(mockList)

    const { result } = renderHook(() => useTransactions(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockList)
    expect(api.transactionsApi.list).toHaveBeenCalledWith(undefined)
  })

  it('passes params to list', async () => {
    vi.mocked(api.transactionsApi.list).mockResolvedValue(mockList)

    const { result } = renderHook(() => useTransactions({ companyId: 'cmp-1', page: 1 }), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.transactionsApi.list).toHaveBeenCalledWith({ companyId: 'cmp-1', page: 1 })
  })
})

describe('useTransactionStats', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches stats correctly', async () => {
    vi.mocked(api.transactionsApi.stats).mockResolvedValue(mockStats)

    const { result } = renderHook(() => useTransactionStats(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockStats)
    expect(api.transactionsApi.stats).toHaveBeenCalled()
  })
})

describe('useApproveTransaction', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls approve, invalidates cache, shows toast.success', async () => {
    const { toast } = await import('sonner')
    vi.mocked(api.transactionsApi.approve).mockResolvedValue({ ...mockTx, status: 'manual_approved' })

    const { result } = renderHook(() => useApproveTransaction(), { wrapper: wrapper() })

    result.current.mutate('tx-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.transactionsApi.approve).toHaveBeenCalledWith('tx-1')
    expect(toast.success).toHaveBeenCalledWith('Transação aprovada manualmente.')
  })

  it('shows toast.error on failure', async () => {
    const { toast } = await import('sonner')
    vi.mocked(api.transactionsApi.approve).mockRejectedValue(new Error('Erro interno'))

    const { result } = renderHook(() => useApproveTransaction(), { wrapper: wrapper() })

    result.current.mutate('tx-bad')

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Erro interno')
  })
})

describe('useCancelTransaction', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls cancel and shows toast.success', async () => {
    const { toast } = await import('sonner')
    vi.mocked(api.transactionsApi.cancel).mockResolvedValue({ ...mockTx, status: 'cancelled' })

    const { result } = renderHook(() => useCancelTransaction(), { wrapper: wrapper() })

    result.current.mutate('tx-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.transactionsApi.cancel).toHaveBeenCalledWith('tx-1')
    expect(toast.success).toHaveBeenCalledWith('Transação cancelada.')
  })

  it('shows toast.error on failure', async () => {
    const { toast } = await import('sonner')
    vi.mocked(api.transactionsApi.cancel).mockRejectedValue(new Error('Falha na rede'))

    const { result } = renderHook(() => useCancelTransaction(), { wrapper: wrapper() })

    result.current.mutate('tx-bad')

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Falha na rede')
  })
})
