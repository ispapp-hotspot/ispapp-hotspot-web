import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createTestQueryClient } from '@/test/utils'
import { QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import http from '@/lib/http'
import {
  usePortals, useCreatePortal, useUpdatePortal,
  useTogglePortal, useDeletePortal, usePortalLeads,
} from '../usePortals'
import type { CaptivePortal, HotspotLead } from '@/types'

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
const PORTAL_ID  = 'portal-456'

const mockPortal: CaptivePortal = {
  id: PORTAL_ID, companyId: COMPANY_ID, name: 'Portal Recepção',
  type: 'LEAD_CAPTURE', active: true, isDefault: false,
  config: { welcomeText: 'WiFi Grátis', primaryColor: '#10b981', backgroundColor: '#ffffff', buttonColor: '#10b981', textColor: '#111111' },
  createdAt: '2024-01-01T00:00:00Z',
} as CaptivePortal

const mockLead: HotspotLead = {
  id: 'lead-1', portalId: PORTAL_ID, name: 'João Silva',
  createdAt: '2024-01-02T00:00:00Z',
} as HotspotLead

function wrapper() {
  const qc = createTestQueryClient()
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

describe('usePortals', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches portal list', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: [mockPortal] })

    const { result } = renderHook(() => usePortals(COMPANY_ID), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([mockPortal])
    expect(http.get).toHaveBeenCalledWith(`/companies/${COMPANY_ID}/portals`)
  })

  it('does not fetch when companyId is empty', () => {
    const { result } = renderHook(() => usePortals(''), { wrapper: wrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useCreatePortal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates portal and shows toast', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.post).mockResolvedValue({ data: mockPortal })

    const { result } = renderHook(() => useCreatePortal(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate({ name: 'Portal Recepção', type: 'LEAD_CAPTURE', config: {} })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.post).toHaveBeenCalledWith(
      `/companies/${COMPANY_ID}/portals`,
      { name: 'Portal Recepção', type: 'LEAD_CAPTURE', config: {} },
    )
    expect(toast.success).toHaveBeenCalledWith('Portal criado!')
  })

  it('shows error toast on failure', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.post).mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useCreatePortal(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate({ name: 'X', type: 'FREE_ACCESS', config: {} })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Erro ao criar portal.')
  })
})

describe('useUpdatePortal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates portal and shows toast', async () => {
    const { toast } = await import('sonner')
    const updated = { ...mockPortal, name: 'Portal Updated' }
    vi.mocked(http.put).mockResolvedValue({ data: updated })

    const { result } = renderHook(() => useUpdatePortal(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate({ portalId: PORTAL_ID, data: { name: 'Portal Updated', type: 'LEAD_CAPTURE', config: {} } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.put).toHaveBeenCalledWith(
      `/companies/${COMPANY_ID}/portals/${PORTAL_ID}`,
      { name: 'Portal Updated', type: 'LEAD_CAPTURE', config: {} },
    )
    expect(toast.success).toHaveBeenCalledWith('Portal atualizado!')
  })

  it('shows error toast on failure', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.put).mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useUpdatePortal(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate({ portalId: PORTAL_ID, data: { name: 'X', type: 'FREE_ACCESS', config: {} } })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Erro ao atualizar portal.')
  })
})

describe('useTogglePortal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('toggles portal active status', async () => {
    const toggled = { ...mockPortal, active: false }
    vi.mocked(http.patch).mockResolvedValue({ data: toggled })

    const { result } = renderHook(() => useTogglePortal(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate(PORTAL_ID)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.patch).toHaveBeenCalledWith(`/companies/${COMPANY_ID}/portals/${PORTAL_ID}/toggle`)
  })

  it('shows error toast on failure', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.patch).mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useTogglePortal(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate(PORTAL_ID)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Erro ao alterar status do portal.')
  })
})

describe('useDeletePortal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes portal and shows toast', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.delete).mockResolvedValue({})

    const { result } = renderHook(() => useDeletePortal(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate(PORTAL_ID)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.delete).toHaveBeenCalledWith(`/companies/${COMPANY_ID}/portals/${PORTAL_ID}`)
    expect(toast.success).toHaveBeenCalledWith('Portal removido.')
  })

  it('shows error toast on failure', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.delete).mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useDeletePortal(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate(PORTAL_ID)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Erro ao remover portal.')
  })
})

describe('usePortalLeads', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches leads for a portal', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: [mockLead] })

    const { result } = renderHook(() => usePortalLeads(COMPANY_ID, PORTAL_ID), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([mockLead])
    expect(http.get).toHaveBeenCalledWith(`/companies/${COMPANY_ID}/portals/${PORTAL_ID}/leads`)
  })

  it('does not fetch when portalId is empty', () => {
    const { result } = renderHook(() => usePortalLeads(COMPANY_ID, ''), { wrapper: wrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })
})
