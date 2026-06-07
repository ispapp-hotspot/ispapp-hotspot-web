import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createTestQueryClient } from '@/test/utils'
import { QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { usePlans, useCreatePlan, useDeletePlan, useTogglePlan } from '../usePlans'
import * as api from '@/services/api'
import type { HotspotPlan } from '@/types'

vi.mock('@/services/api', () => ({
  plansApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    toggle: vi.fn(),
    delete: vi.fn(),
  },
  vouchersApi: {},
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const COMPANY_ID = 'company-123'

const mockPlan: HotspotPlan = {
  id: 'plan-1',
  companyId: COMPANY_ID,
  name: 'Plano 1h',
  durationMin: 60,
  bandwidthUp: 10240,
  bandwidthDown: 10240,
  price: 5,
  isFree: false,
  active: true,
  createdAt: '2024-01-01T00:00:00Z',
}

function wrapper() {
  const qc = createTestQueryClient()
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

describe('usePlans', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches plans for a company', async () => {
    vi.mocked(api.plansApi.list).mockResolvedValue([mockPlan])

    const { result } = renderHook(() => usePlans(COMPANY_ID), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([mockPlan])
    expect(api.plansApi.list).toHaveBeenCalledWith(COMPANY_ID)
  })

  it('does not fetch when companyId is empty', () => {
    const { result } = renderHook(() => usePlans(''), { wrapper: wrapper() })
    expect(result.current.fetchStatus).toBe('idle')
    expect(api.plansApi.list).not.toHaveBeenCalled()
  })
})

describe('useCreatePlan', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a plan and shows success toast', async () => {
    const { toast } = await import('sonner')
    vi.mocked(api.plansApi.create).mockResolvedValue(mockPlan)

    const { result } = renderHook(() => useCreatePlan(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate({ name: 'Plano 1h', isFree: false, price: 5, durationMin: 60 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.plansApi.create).toHaveBeenCalledWith(COMPANY_ID, expect.objectContaining({ name: 'Plano 1h' }))
    expect(toast.success).toHaveBeenCalledWith('Plano criado com sucesso!')
  })

  it('shows error toast on failure', async () => {
    const { toast } = await import('sonner')
    vi.mocked(api.plansApi.create).mockRejectedValue(new Error('Server error'))

    const { result } = renderHook(() => useCreatePlan(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate({ name: 'Fail', isFree: false, price: 0, durationMin: 60 })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Server error')
  })
})

describe('useDeletePlan', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes a plan and shows success toast', async () => {
    const { toast } = await import('sonner')
    vi.mocked(api.plansApi.delete).mockResolvedValue(undefined as any)

    const { result } = renderHook(() => useDeletePlan(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate('plan-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.plansApi.delete).toHaveBeenCalledWith(COMPANY_ID, 'plan-1')
    expect(toast.success).toHaveBeenCalledWith('Plano removido.')
  })
})

describe('useTogglePlan', () => {
  beforeEach(() => vi.clearAllMocks())

  it('toggles plan status', async () => {
    vi.mocked(api.plansApi.toggle).mockResolvedValue({ ...mockPlan, active: false })

    const { result } = renderHook(() => useTogglePlan(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate('plan-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.plansApi.toggle).toHaveBeenCalledWith(COMPANY_ID, 'plan-1')
  })
})
