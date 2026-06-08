import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createTestQueryClient } from '@/test/utils'
import { QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import http from '@/lib/http'
import {
  useDevices, useProvisionDevice, useUpdateDevice,
  useDeleteDevice, useAutoSetupDevice,
} from '../useDevices'
import type { Device, DeviceProvisionResult } from '@/types'

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
const DEVICE_ID  = 'device-456'

const mockDevice: Device = {
  id: DEVICE_ID, companyId: COMPANY_ID, name: 'CCR2116',
  type: 'mikrotik', status: 'ONLINE', wgIp: '10.0.0.2',
  wgSetupDone: true, autoSetupDone: true,
  createdAt: '2024-01-01T00:00:00Z',
} as Device

const mockProvision: DeviceProvisionResult = {
  device: mockDevice, wgPrivateKey: 'wg-priv-key',
  nasSecret: 'nas-secret', wgServerHost: 'vpn.example.com',
  wgServerPort: 51820, vpnIp: '10.0.0.2',
} as DeviceProvisionResult

function wrapper() {
  const qc = createTestQueryClient()
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

describe('useDevices', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches device list', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: [mockDevice] })

    const { result } = renderHook(() => useDevices(COMPANY_ID), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([mockDevice])
    expect(http.get).toHaveBeenCalledWith(`/companies/${COMPANY_ID}/devices`)
  })

  it('does not fetch when companyId is empty', () => {
    const { result } = renderHook(() => useDevices(''), { wrapper: wrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useProvisionDevice', () => {
  beforeEach(() => vi.clearAllMocks())

  it('provisions device and shows toast', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.post).mockResolvedValue({ data: mockProvision })

    const { result } = renderHook(() => useProvisionDevice(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate({ name: 'CCR2116', type: 'mikrotik' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.post).toHaveBeenCalledWith(
      `/companies/${COMPANY_ID}/devices`,
      { name: 'CCR2116', type: 'mikrotik' },
    )
    expect(toast.success).toHaveBeenCalledWith('Dispositivo provisionado!')
  })

  it('shows error toast on failure', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.post).mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useProvisionDevice(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate({ name: 'CCR2116' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Erro ao provisionar dispositivo.')
  })
})

describe('useUpdateDevice', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates device and shows toast', async () => {
    const { toast } = await import('sonner')
    const updated = { ...mockDevice, name: 'CCR2116 Updated' }
    vi.mocked(http.put).mockResolvedValue({ data: updated })

    const { result } = renderHook(() => useUpdateDevice(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate({ deviceId: DEVICE_ID, data: { name: 'CCR2116 Updated' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.put).toHaveBeenCalledWith(
      `/companies/${COMPANY_ID}/devices/${DEVICE_ID}`,
      { name: 'CCR2116 Updated' },
    )
    expect(toast.success).toHaveBeenCalledWith('Dispositivo atualizado!')
  })

  it('shows error toast on failure', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.put).mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useUpdateDevice(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate({ deviceId: DEVICE_ID, data: { name: 'Fail' } })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Erro ao atualizar dispositivo.')
  })
})

describe('useDeleteDevice', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes device and shows toast', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.delete).mockResolvedValue({})

    const { result } = renderHook(() => useDeleteDevice(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate(DEVICE_ID)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.delete).toHaveBeenCalledWith(`/companies/${COMPANY_ID}/devices/${DEVICE_ID}`)
    expect(toast.success).toHaveBeenCalledWith('Dispositivo removido.')
  })

  it('shows error toast on failure', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.delete).mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useDeleteDevice(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate(DEVICE_ID)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Erro ao remover dispositivo.')
  })
})

describe('useAutoSetupDevice', () => {
  beforeEach(() => vi.clearAllMocks())

  const setupData = {
    routerosIp: '192.168.1.1', routerosUser: 'admin',
    routerosPassword: 'pass', routerosPort: 8728,
    hotspotInterface: 'ether1', portalId: 'portal-1',
  }

  it('runs auto setup and shows toast', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.post).mockResolvedValue({ data: mockDevice })

    const { result } = renderHook(() => useAutoSetupDevice(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate({ deviceId: DEVICE_ID, data: setupData })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.post).toHaveBeenCalledWith(
      `/companies/${COMPANY_ID}/devices/${DEVICE_ID}/auto-setup`,
      setupData,
    )
    expect(toast.success).toHaveBeenCalledWith('Auto Setup concluído!')
  })

  it('shows error toast on failure', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.post).mockRejectedValue(new Error('bad credentials'))

    const { result } = renderHook(() => useAutoSetupDevice(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate({ deviceId: DEVICE_ID, data: setupData })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Erro no Auto Setup. Verifique as credenciais.')
  })
})
