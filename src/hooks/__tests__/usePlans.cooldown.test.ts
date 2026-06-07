import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createTestQueryClient } from '@/test/utils'
import { QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useCreatePlan, useUpdatePlan } from '../usePlans'
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

const freePlanBase: HotspotPlan = {
  id: 'plan-free-1',
  companyId: COMPANY_ID,
  name: 'Acesso gratuito',
  durationMin: 60,
  bandwidthUp: 10240,
  bandwidthDown: 10240,
  price: 0,
  isFree: true,
  active: true,
  createdAt: '2024-01-01T00:00:00Z',
}

function wrapper() {
  const qc = createTestQueryClient()
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

describe('useCreatePlan — carência (cooldownDays)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('cria plano gratuito sem carência quando cooldownDays é null', async () => {
    const plan = { ...freePlanBase, cooldownDays: null }
    vi.mocked(api.plansApi.create).mockResolvedValue(plan)

    const { result } = renderHook(() => useCreatePlan(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate({ name: 'Acesso gratuito', isFree: true, price: 0, durationMin: 60, cooldownDays: null })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.plansApi.create).toHaveBeenCalledWith(
      COMPANY_ID,
      expect.objectContaining({ cooldownDays: null })
    )
  })

  it('cria plano gratuito com carência de 1 dia', async () => {
    const plan = { ...freePlanBase, cooldownDays: 1 }
    vi.mocked(api.plansApi.create).mockResolvedValue(plan)

    const { result } = renderHook(() => useCreatePlan(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate({ name: 'Acesso gratuito', isFree: true, price: 0, durationMin: 60, cooldownDays: 1 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.plansApi.create).toHaveBeenCalledWith(
      COMPANY_ID,
      expect.objectContaining({ isFree: true, cooldownDays: 1 })
    )
  })

  it('cria plano gratuito com carência de 7 dias', async () => {
    const plan = { ...freePlanBase, cooldownDays: 7 }
    vi.mocked(api.plansApi.create).mockResolvedValue(plan)

    const { result } = renderHook(() => useCreatePlan(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate({ name: 'Acesso semanal', isFree: true, price: 0, durationMin: 120, cooldownDays: 7 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.plansApi.create).toHaveBeenCalledWith(
      COMPANY_ID,
      expect.objectContaining({ cooldownDays: 7 })
    )
  })

  it('plano pago ignora cooldownDays (deve ser null)', async () => {
    const paidPlan: HotspotPlan = { ...freePlanBase, id: 'plan-paid', isFree: false, price: 10, cooldownDays: null }
    vi.mocked(api.plansApi.create).mockResolvedValue(paidPlan)

    const { result } = renderHook(() => useCreatePlan(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate({ name: 'Plano pago', isFree: false, price: 10, durationMin: 60, cooldownDays: null })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.plansApi.create).toHaveBeenCalledWith(
      COMPANY_ID,
      expect.objectContaining({ isFree: false, cooldownDays: null })
    )
  })
})

describe('useUpdatePlan — carência (cooldownDays)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('atualiza carência de um plano gratuito existente', async () => {
    const updated = { ...freePlanBase, cooldownDays: 3 }
    vi.mocked(api.plansApi.update).mockResolvedValue(updated)

    const { result } = renderHook(() => useUpdatePlan(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate({ planId: freePlanBase.id, data: { cooldownDays: 3 } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.plansApi.update).toHaveBeenCalledWith(
      COMPANY_ID,
      freePlanBase.id,
      expect.objectContaining({ cooldownDays: 3 })
    )
  })

  it('remove carência ao setar cooldownDays para null', async () => {
    const updated = { ...freePlanBase, cooldownDays: null }
    vi.mocked(api.plansApi.update).mockResolvedValue(updated)

    const { result } = renderHook(() => useUpdatePlan(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate({ planId: freePlanBase.id, data: { cooldownDays: null } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.plansApi.update).toHaveBeenCalledWith(
      COMPANY_ID,
      freePlanBase.id,
      expect.objectContaining({ cooldownDays: null })
    )
  })
})
