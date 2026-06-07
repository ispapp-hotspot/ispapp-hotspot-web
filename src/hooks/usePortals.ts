import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { portalsApi } from '@/services/api'
import type { CaptivePortal } from '@/types'

export const portalKeys = {
  all: (companyId: string) => ['portals', companyId] as const,
  one: (companyId: string, portalId: string) => ['portals', companyId, portalId] as const,
  leads: (companyId: string, portalId: string) => ['leads', companyId, portalId] as const,
  allLeads: (companyId: string) => ['leads-all', companyId] as const,
}

export function usePortals(companyId: string) {
  return useQuery({
    queryKey: portalKeys.all(companyId),
    queryFn: () => portalsApi.list(companyId),
    enabled: !!companyId,
  })
}

export function usePortal(companyId: string, portalId: string) {
  return useQuery({
    queryKey: portalKeys.one(companyId, portalId),
    queryFn: () => portalsApi.get(companyId, portalId),
    enabled: !!companyId && !!portalId,
  })
}

export function useCreatePortal(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; type: string; config: Record<string, unknown> }) =>
      portalsApi.create(companyId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: portalKeys.all(companyId) })
      toast.success('Portal criado!')
    },
    onError: () => toast.error('Erro ao criar portal.'),
  })
}

export function useUpdatePortal(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ portalId, data }: { portalId: string; data: { name: string; type: string; config: Record<string, unknown> } }) =>
      portalsApi.update(companyId, portalId, data),
    onSuccess: (_, { portalId }) => {
      qc.invalidateQueries({ queryKey: portalKeys.all(companyId) })
      qc.invalidateQueries({ queryKey: portalKeys.one(companyId, portalId) })
      toast.success('Portal atualizado!')
    },
    onError: () => toast.error('Erro ao atualizar portal.'),
  })
}

export function useTogglePortal(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (portalId: string) => portalsApi.toggle(companyId, portalId),
    onSuccess: () => qc.invalidateQueries({ queryKey: portalKeys.all(companyId) }),
    onError: () => toast.error('Erro ao alterar status do portal.'),
  })
}

export function useDeletePortal(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (portalId: string) => portalsApi.delete(companyId, portalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: portalKeys.all(companyId) })
      toast.success('Portal removido.')
    },
    onError: () => toast.error('Erro ao remover portal.'),
  })
}

export function usePortalLeads(companyId: string, portalId: string) {
  return useQuery({
    queryKey: portalKeys.leads(companyId, portalId),
    queryFn: () => portalsApi.leads(companyId, portalId),
    enabled: !!companyId && !!portalId,
  })
}

export function useAllLeads(companyId: string) {
  return useQuery({
    queryKey: portalKeys.allLeads(companyId),
    queryFn: () => portalsApi.allLeads(companyId),
    enabled: !!companyId,
  })
}
