import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { devicesApi } from '@/services/api'

export const deviceKeys = {
  all: (companyId: string) => ['devices', companyId] as const,
  one: (companyId: string, deviceId: string) => ['devices', companyId, deviceId] as const,
}

export function useDevices(companyId: string) {
  return useQuery({
    queryKey: deviceKeys.all(companyId),
    queryFn: () => devicesApi.list(companyId),
    enabled: !!companyId,
  })
}

export function useDevice(companyId: string, deviceId: string) {
  return useQuery({
    queryKey: deviceKeys.one(companyId, deviceId),
    queryFn: () => devicesApi.get(companyId, deviceId),
    enabled: !!companyId && !!deviceId,
  })
}

export function useProvisionDevice(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, type }: { name: string; type?: string }) =>
      devicesApi.provision(companyId, name, type),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: deviceKeys.all(companyId) })
      toast.success('Dispositivo provisionado!')
    },
    onError: () => toast.error('Erro ao provisionar dispositivo.'),
  })
}

export function useUpdateDevice(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deviceId, data }: {
      deviceId: string
      data: { name: string; routerosIp?: string; routerosPort?: number; routerosUser?: string; portalId?: string }
    }) => devicesApi.update(companyId, deviceId, data),
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
    mutationFn: (deviceId: string) => devicesApi.delete(companyId, deviceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: deviceKeys.all(companyId) })
      toast.success('Dispositivo removido.')
    },
    onError: () => toast.error('Erro ao remover dispositivo.'),
  })
}
