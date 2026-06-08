import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createTestQueryClient } from '@/test/utils'
import { QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import http from '@/lib/http'
import {
  useTransactions,
  useTransactionStats,
  useApproveTransaction,
  useCancelTransaction,
} from '../useTransactions'
import type { FinancialTransaction, TransactionListResponse, TransactionStats } from '@/types'

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
  total:        10,
  approved:     7,
  pending:      3,
  revenue:      139.3,
  revenueToday: 19.9,
}

function wrapper() {
  const qc = createTestQueryClient()
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

// ── useTransactions ───────────────────────────────────────────────────────────

describe('useTransactions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches list and returns data', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: mockList })

    const { result } = renderHook(() => useTransactions(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockList)
    expect(http.get).toHaveBeenCalledWith('/transactions', { params: undefined })
  })

  it('passes page and size params', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: mockList })

    const { result } = renderHook(
      () => useTransactions({ page: 2, size: 20 }),
      { wrapper: wrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.get).toHaveBeenCalledWith('/transactions', { params: { page: 2, size: 20 } })
  })

  it('passes status filter', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: mockList })

    const { result } = renderHook(
      () => useTransactions({ status: 'approved' }),
      { wrapper: wrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.get).toHaveBeenCalledWith('/transactions', { params: { status: 'approved' } })
  })

  it('passes paymentMethod filter', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: mockList })

    const { result } = renderHook(
      () => useTransactions({ paymentMethod: 'pix' }),
      { wrapper: wrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.get).toHaveBeenCalledWith('/transactions', { params: { paymentMethod: 'pix' } })
  })

  it('passes gatewayType filter', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: mockList })

    const { result } = renderHook(
      () => useTransactions({ gatewayType: 'MERCADO_PAGO' }),
      { wrapper: wrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.get).toHaveBeenCalledWith('/transactions', { params: { gatewayType: 'MERCADO_PAGO' } })
  })

  it('passes dateFrom and dateTo filters', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: mockList })

    const params = { dateFrom: '2025-01-01', dateTo: '2025-01-31' }
    const { result } = renderHook(() => useTransactions(params), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.get).toHaveBeenCalledWith('/transactions', { params })
  })

  it('passes combined filters', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: mockList })

    const params = { status: 'approved', paymentMethod: 'pix', gatewayType: 'MERCADO_PAGO', dateFrom: '2025-01-01', dateTo: '2025-01-31', page: 0, size: 20 }
    const { result } = renderHook(() => useTransactions(params), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.get).toHaveBeenCalledWith('/transactions', { params })
  })
})

// ── useTransactionStats ───────────────────────────────────────────────────────

describe('useTransactionStats', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches stats without filters', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: mockStats })

    const { result } = renderHook(() => useTransactionStats(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockStats)
    expect(http.get).toHaveBeenCalledWith('/transactions/stats', { params: undefined })
  })

  it('includes revenueToday in stats', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: mockStats })

    const { result } = renderHook(() => useTransactionStats(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.revenueToday).toBe(19.9)
  })

  it('passes status filter to stats', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: mockStats })

    const { result } = renderHook(
      () => useTransactionStats({ status: 'approved' }),
      { wrapper: wrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.get).toHaveBeenCalledWith('/transactions/stats', { params: { status: 'approved' } })
  })

  it('passes paymentMethod filter to stats', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: mockStats })

    const { result } = renderHook(
      () => useTransactionStats({ paymentMethod: 'pix' }),
      { wrapper: wrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.get).toHaveBeenCalledWith('/transactions/stats', { params: { paymentMethod: 'pix' } })
  })

  it('passes gatewayType filter to stats', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: mockStats })

    const { result } = renderHook(
      () => useTransactionStats({ gatewayType: 'EFI' }),
      { wrapper: wrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.get).toHaveBeenCalledWith('/transactions/stats', { params: { gatewayType: 'EFI' } })
  })

  it('passes date range filters to stats', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: mockStats })

    const filters = { dateFrom: '2025-06-01', dateTo: '2025-06-30' }
    const { result } = renderHook(() => useTransactionStats(filters), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.get).toHaveBeenCalledWith('/transactions/stats', { params: filters })
  })
})

// ── useApproveTransaction ─────────────────────────────────────────────────────

describe('useApproveTransaction', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls approve, shows toast.success', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.post).mockResolvedValue({ data: { ...mockTx, status: 'manual_approved' } })

    const { result } = renderHook(() => useApproveTransaction(), { wrapper: wrapper() })

    result.current.mutate('tx-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.post).toHaveBeenCalledWith('/transactions/tx-1/approve')
    expect(toast.success).toHaveBeenCalledWith('Transação aprovada manualmente.')
  })

  it('shows toast.error on failure', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.post).mockRejectedValue(new Error('Erro interno'))

    const { result } = renderHook(() => useApproveTransaction(), { wrapper: wrapper() })

    result.current.mutate('tx-bad')

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Erro interno')
  })
})

// ── useCancelTransaction ──────────────────────────────────────────────────────

describe('useCancelTransaction', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls cancel and shows toast.success', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.post).mockResolvedValue({ data: { ...mockTx, status: 'cancelled' } })

    const { result } = renderHook(() => useCancelTransaction(), { wrapper: wrapper() })

    result.current.mutate('tx-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.post).toHaveBeenCalledWith('/transactions/tx-1/cancel')
    expect(toast.success).toHaveBeenCalledWith('Transação cancelada.')
  })

  it('shows toast.error on failure', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.post).mockRejectedValue(new Error('Falha na rede'))

    const { result } = renderHook(() => useCancelTransaction(), { wrapper: wrapper() })

    result.current.mutate('tx-bad')

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Falha na rede')
  })
})
