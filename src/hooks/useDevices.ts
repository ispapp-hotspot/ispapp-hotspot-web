import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import http from '@/lib/http'
import type { Device, DeviceProvisionResult } from '@/types'

function fetchDevices(companyId: string) {
  return http.get<Device[]>(`/companies/${companyId}/devices`).then((r) => r.data)
}
function fetchDevice(companyId: string, deviceId: string) {
  return http.get<Device>(`/companies/${companyId}/devices/${deviceId}`).then((r) => r.data)
}
function provisionDevice(
  companyId: string,
  payload: {
    name: string; type?: string; connectionType?: string; autoSetup?: boolean
    hotspotInterface?: string; portalId?: string
    routerosIp?: string; routerosPort?: number; routerosUser?: string; routerosPassword?: string
  }
) {
  return http.post<DeviceProvisionResult>(`/companies/${companyId}/devices`, payload).then((r) => r.data)
}
function updateDevice(companyId: string, deviceId: string, data: {
  name: string; routerosIp?: string; routerosPort?: number
  routerosUser?: string; routerosPassword?: string; portalId?: string
}) {
  return http.put<Device>(`/companies/${companyId}/devices/${deviceId}`, data).then((r) => r.data)
}
export interface AutoSetupResult {
  success: boolean
  message: string
  hotspotId?: string
  script?: string
}

function autoSetupDevice(companyId: string, deviceId: string, payload: {
  routerosIp?: string; routerosUser?: string; routerosPassword?: string
  routerosPort?: number; hotspotInterface: string; portalId: string
}) {
  return http.post<AutoSetupResult>(`/companies/${companyId}/devices/${deviceId}/auto-setup`, payload).then((r) => r.data)
}
function deleteDevice(companyId: string, deviceId: string) {
  return http.delete(`/companies/${companyId}/devices/${deviceId}`)
}

export const deviceKeys = {
  all: (companyId: string) => ['devices', companyId] as const,
  one: (companyId: string, deviceId: string) => ['devices', companyId, deviceId] as const,
}

export function useDevices(companyId: string) {
  return useQuery({
    queryKey: deviceKeys.all(companyId),
    queryFn: () => fetchDevices(companyId),
    enabled: !!companyId,
  })
}

export function useDevice(companyId: string, deviceId: string) {
  return useQuery({
    queryKey: deviceKeys.one(companyId, deviceId),
    queryFn: () => fetchDevice(companyId, deviceId),
    enabled: !!companyId && !!deviceId,
  })
}

export function useProvisionDevice(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      name: string; type?: string; connectionType?: string; autoSetup?: boolean
      hotspotInterface?: string; portalId?: string
      routerosIp?: string; routerosPort?: number; routerosUser?: string; routerosPassword?: string
    }) => provisionDevice(companyId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: deviceKeys.all(companyId) })
    },
    onError: () => toast.error('Erro ao provisionar dispositivo.'),
  })
}

export function useUpdateDevice(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deviceId, data }: {
      deviceId: string
      data: { name: string; routerosIp?: string; routerosPort?: number; routerosUser?: string; routerosPassword?: string; portalId?: string }
    }) => updateDevice(companyId, deviceId, data),
    onSuccess: (_, { deviceId }) => {
      qc.invalidateQueries({ queryKey: deviceKeys.all(companyId) })
      qc.invalidateQueries({ queryKey: deviceKeys.one(companyId, deviceId) })
      toast.success('Dispositivo atualizado!')
    },
    onError: () => toast.error('Erro ao atualizar dispositivo.'),
  })
}

export function useDeleteDevice(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (deviceId: string) => deleteDevice(companyId, deviceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: deviceKeys.all(companyId) })
      toast.success('Dispositivo removido.')
    },
    onError: () => toast.error('Erro ao remover dispositivo.'),
  })
}

export function useAutoSetupDevice(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deviceId, data }: {
      deviceId: string
      data: {
        routerosIp?: string; routerosUser?: string; routerosPassword?: string
        routerosPort?: number; hotspotInterface: string; portalId: string
      }
    }) => autoSetupDevice(companyId, deviceId, data),
    onSuccess: (result, { deviceId }) => {
      qc.invalidateQueries({ queryKey: deviceKeys.all(companyId) })
      qc.invalidateQueries({ queryKey: deviceKeys.one(companyId, deviceId) })
      if (!result?.script) toast.success('Auto Setup concluído!')
    },
    onError: () => toast.error('Erro no Auto Setup. Verifique as credenciais.'),
  })
}
