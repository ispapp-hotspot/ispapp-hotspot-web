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
  type: 'mikrotik', tunnelType: 'wireguard', status: 'ONLINE', wgIp: '10.0.0.2',
  wgSetupDone: true, autoSetupDone: true,
  createdAt: '2024-01-01T00:00:00Z',
} as Device

const mockProvision: DeviceProvisionResult = {
  device: mockDevice, connectionType: 'wireguard',
  wgPrivateKey: 'wg-priv-key', nasSecret: 'nas-secret',
  wgServerHost: 'vpn.example.com', wgServerPort: 51820, vpnIp: '10.0.0.2',
}

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

  it('provisions wireguard device with autoSetup=true', async () => {
    vi.mocked(http.post).mockResolvedValue({ data: mockProvision })

    const { result } = renderHook(() => useProvisionDevice(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate({ name: 'CCR2116', type: 'mikrotik', connectionType: 'wireguard', autoSetup: true })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.post).toHaveBeenCalledWith(
      `/companies/${COMPANY_ID}/devices`,
      { name: 'CCR2116', type: 'mikrotik', connectionType: 'wireguard', autoSetup: true },
    )
    expect(result.current.data?.connectionType).toBe('wireguard')
    expect(result.current.data?.setupScript).toBeUndefined()
  })

  it('provisions wireguard device with autoSetup=false — receives setupScript', async () => {
    const provisionWithScript: DeviceProvisionResult = {
      ...mockProvision,
      setupScript: '# RouterOS script\n/interface wireguard\nadd name="wg-ispapp"',
    }
    vi.mocked(http.post).mockResolvedValue({ data: provisionWithScript })

    const { result } = renderHook(() => useProvisionDevice(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate({
      name: 'CCR2116', type: 'mikrotik', connectionType: 'wireguard',
      autoSetup: false, hotspotInterface: 'ether1', portalId: 'portal-abc',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.post).toHaveBeenCalledWith(
      `/companies/${COMPANY_ID}/devices`,
      { name: 'CCR2116', type: 'mikrotik', connectionType: 'wireguard',
        autoSetup: false, hotspotInterface: 'ether1', portalId: 'portal-abc' },
    )
    expect(result.current.data?.setupScript).toContain('/interface wireguard')
  })

  it('provisions l2tp device', async () => {
    const l2tpProvision: DeviceProvisionResult = {
      device: { ...mockDevice, tunnelType: 'l2tp' },
      connectionType: 'l2tp',
      l2tpServer: 'vpn.example.com', l2tpUser: 'ispapp-router-abc123',
      l2tpPassword: 'secret', l2tpIpsecSecret: 'psk',
      vpnIp: '10.9.0.2', nasSecret: 'nas-secret',
    }
    vi.mocked(http.post).mockResolvedValue({ data: l2tpProvision })

    const { result } = renderHook(() => useProvisionDevice(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate({ name: 'RB750', type: 'mikrotik', connectionType: 'l2tp' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.post).toHaveBeenCalledWith(
      `/companies/${COMPANY_ID}/devices`,
      { name: 'RB750', type: 'mikrotik', connectionType: 'l2tp' },
    )
    expect(result.current.data?.connectionType).toBe('l2tp')
    expect(result.current.data?.l2tpUser).toBe('ispapp-router-abc123')
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

  const l2tpSetupData = { hotspotInterface: 'ether1', portalId: 'portal-1' }

  it('runs auto setup and shows toast', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.post).mockResolvedValue({ data: { success: true, message: 'OK' } })

    const { result } = renderHook(() => useAutoSetupDevice(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate({ deviceId: DEVICE_ID, data: setupData })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.post).toHaveBeenCalledWith(
      `/companies/${COMPANY_ID}/devices/${DEVICE_ID}/auto-setup`,
      setupData,
    )
    expect(toast.success).toHaveBeenCalledWith('Auto Setup concluído!')
  })

  it('runs l2tp auto setup without routeros fields', async () => {
    const { toast } = await import('sonner')
    vi.mocked(http.post).mockResolvedValue({ data: { success: true, message: 'Script gerado', script: '# script' } })

    const { result } = renderHook(() => useAutoSetupDevice(COMPANY_ID), { wrapper: wrapper() })

    result.current.mutate({ deviceId: DEVICE_ID, data: l2tpSetupData })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(http.post).toHaveBeenCalledWith(
      `/companies/${COMPANY_ID}/devices/${DEVICE_ID}/auto-setup`,
      l2tpSetupData,
    )
    // script returned → no toast (component handles modal state)
    expect(toast.success).not.toHaveBeenCalled()
    expect(result.current.data?.script).toBe('# script')
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
