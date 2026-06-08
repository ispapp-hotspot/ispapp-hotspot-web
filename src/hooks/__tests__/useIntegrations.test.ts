import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createTestQueryClient } from '@/test/utils'
import { QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import http from '@/lib/http'
import {
  useIspIntegration, useUpsertIspIntegration, useDeleteIspIntegration,
  usePaymentGateways, useValidateGateway, useUpsertGateway,
  useActivateGateway, useDeleteGateway,
} from '../useIntegrations'

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

function wrapper() {
  const qc = createTestQueryClient()
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

const mockIntegration = { id: 'i-1', erpType: 'SGP' as const, baseUrl: 'https://sgp.example.com', token: '***', active: true }
const mockGateway = { id: 'g-1', ispId: 'isp-1', gatewayType: 'MERCADO_PAGO', publicKey: 'APP_USR-xxx', isActive: true, active: true }

// ── ERP Integration ───────────────────────────────────────────────────────────

describe('useIspIntegration', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns integration data on success', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: mockIntegration })

    const { result } = renderHook(() => useIspIntegration(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockIntegration)
    expect(http.get).toHaveBeenCalledWith('/isp-integration')
  })

  it('returns null on 404', async () => {
    vi.mocked(http.get).mockRejectedValue({ response: { status: 404 } })

    const { result } = renderHook(() => useIspIntegration(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })

  it('propagates non-404 errors', async () => {
    vi.mocked(http.get).mockRejectedValue({ response: { status: 500 } })

    const { result } = renderHook(() => useIspIntegration(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useUpsertIspIntegration', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls upsert and shows success toast', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.put).mockResolvedValue({ data: mockIntegration })

    const { result } = renderHook(() => useUpsertIspIntegration(), { wrapper: wrapper() })

    result.current.mutate({ erpType: 'SGP', baseUrl: 'https://sgp.example.com', token: 'abc' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.put).toHaveBeenCalledWith('/isp-integration', { erpType: 'SGP', baseUrl: 'https://sgp.example.com', token: 'abc' })
    expect(toast.success).toHaveBeenCalledWith('Integração salva!')
  })

  it('shows error toast on failure', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.put).mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useUpsertIspIntegration(), { wrapper: wrapper() })

    result.current.mutate({ erpType: 'SGP', baseUrl: 'https://sgp.example.com', token: 'abc' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Erro ao salvar integração.')
  })
})

describe('useDeleteIspIntegration', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls delete and shows toast', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.delete).mockResolvedValue({})

    const { result } = renderHook(() => useDeleteIspIntegration(), { wrapper: wrapper() })

    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.delete).toHaveBeenCalledWith('/isp-integration')
    expect(toast.success).toHaveBeenCalledWith('Integração removida.')
  })
})

// ── Payment Gateway ───────────────────────────────────────────────────────────

describe('usePaymentGateways', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns gateway list', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: [mockGateway] })

    const { result } = renderHook(() => usePaymentGateways(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([mockGateway])
    expect(http.get).toHaveBeenCalledWith('/payment-gateway')
  })

  it('returns empty array on 404', async () => {
    vi.mocked(http.get).mockRejectedValue({ response: { status: 404 } })

    const { result } = renderHook(() => usePaymentGateways(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})

describe('useValidateGateway', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches validation result', async () => {
    const validateResult = { valid: true }
    vi.mocked(http.get).mockResolvedValue({ data: validateResult })

    const { result } = renderHook(() => useValidateGateway(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(validateResult)
    expect(http.get).toHaveBeenCalledWith('/payment-gateway/validate')
  })

  it('exposes refetch function', () => {
    vi.mocked(http.get).mockResolvedValue({ data: { valid: true } })

    const { result } = renderHook(() => useValidateGateway(), { wrapper: wrapper() })

    expect(typeof result.current.refetch).toBe('function')
  })
})

describe('useUpsertGateway', () => {
  beforeEach(() => vi.clearAllMocks())

  it('saves gateway and shows toast', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.put).mockResolvedValue({ data: mockGateway })

    const { result } = renderHook(() => useUpsertGateway(), { wrapper: wrapper() })

    result.current.mutate({ gatewayType: 'MERCADO_PAGO', publicKey: 'pk', secretToken: 'sk' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.put).toHaveBeenCalledWith('/payment-gateway', { gatewayType: 'MERCADO_PAGO', publicKey: 'pk', secretToken: 'sk' })
    expect(toast.success).toHaveBeenCalledWith('Gateway salvo!')
  })

  it('shows error toast on failure', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.put).mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useUpsertGateway(), { wrapper: wrapper() })

    result.current.mutate({ publicKey: 'pk', secretToken: 'sk' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Erro ao salvar gateway.')
  })
})

describe('useActivateGateway', () => {
  beforeEach(() => vi.clearAllMocks())

  it('activates gateway and shows toast', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.post).mockResolvedValue({ data: mockGateway })

    const { result } = renderHook(() => useActivateGateway(), { wrapper: wrapper() })

    result.current.mutate('MERCADO_PAGO')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.post).toHaveBeenCalledWith('/payment-gateway/MERCADO_PAGO/activate')
    expect(toast.success).toHaveBeenCalledWith('Gateway ativado!')
  })
})

describe('useDeleteGateway', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes gateway and shows toast', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.delete).mockResolvedValue({})

    const { result } = renderHook(() => useDeleteGateway(), { wrapper: wrapper() })

    result.current.mutate('MERCADO_PAGO')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.delete).toHaveBeenCalledWith('/payment-gateway/MERCADO_PAGO')
    expect(toast.success).toHaveBeenCalledWith('Gateway removido.')
  })

  it('shows error toast on failure', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.delete).mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useDeleteGateway(), { wrapper: wrapper() })

    result.current.mutate('MERCADO_PAGO')

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Erro ao remover gateway.')
  })
})
