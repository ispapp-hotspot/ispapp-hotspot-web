import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import http from '@/lib/http'
import type { CaptivePortal, HotspotLead } from '@/types'

function fetchPortals(companyId: string) {
  return http.get<CaptivePortal[]>(`/companies/${companyId}/portals`).then((r) => r.data)
}
function fetchPortal(companyId: string, portalId: string) {
  return http.get<CaptivePortal>(`/companies/${companyId}/portals/${portalId}`).then((r) => r.data)
}
function createPortal(companyId: string, data: { name: string; type: string; config: Record<string, unknown> }) {
  return http.post<CaptivePortal>(`/companies/${companyId}/portals`, data).then((r) => r.data)
}
function updatePortal(companyId: string, portalId: string, data: { name: string; type: string; config: Record<string, unknown> }) {
  return http.put<CaptivePortal>(`/companies/${companyId}/portals/${portalId}`, data).then((r) => r.data)
}
function togglePortal(companyId: string, portalId: string) {
  return http.patch<CaptivePortal>(`/companies/${companyId}/portals/${portalId}/toggle`).then((r) => r.data)
}
function deletePortal(companyId: string, portalId: string) {
  return http.delete(`/companies/${companyId}/portals/${portalId}`)
}
function fetchLeads(companyId: string, portalId: string) {
  return http.get<HotspotLead[]>(`/companies/${companyId}/portals/${portalId}/leads`).then((r) => r.data)
}
function fetchAllLeads(companyId: string) {
  return http.get<HotspotLead[]>(`/companies/${companyId}/leads`).then((r) => r.data)
}
function deleteLead(companyId: string, leadId: string) {
  return http.delete(`/companies/${companyId}/leads/${leadId}`)
}
function deleteLeadsBulk(companyId: string, ids: string[]) {
  return http.delete<{ deleted: number }>(`/companies/${companyId}/leads`, { data: { ids } })
}

export const portalKeys = {
  all: (companyId: string) => ['portals', companyId] as const,
  one: (companyId: string, portalId: string) => ['portals', companyId, portalId] as const,
  leads: (companyId: string, portalId: string) => ['leads', companyId, portalId] as const,
  allLeads: (companyId: string) => ['leads-all', companyId] as const,
}

export function usePortals(companyId: string) {
  return useQuery({
    queryKey: portalKeys.all(companyId),
    queryFn: () => fetchPortals(companyId),
    enabled: !!companyId,
  })
}

export function usePortal(companyId: string, portalId: string) {
  return useQuery({
    queryKey: portalKeys.one(companyId, portalId),
    queryFn: () => fetchPortal(companyId, portalId),
    enabled: !!companyId && !!portalId,
  })
}

export function useCreatePortal(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; type: string; config: Record<string, unknown> }) =>
      createPortal(companyId, data),
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
      updatePortal(companyId, portalId, data),
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
    mutationFn: (portalId: string) => togglePortal(companyId, portalId),
    onSuccess: () => qc.invalidateQueries({ queryKey: portalKeys.all(companyId) }),
    onError: () => toast.error('Erro ao alterar status do portal.'),
  })
}

export function useDeletePortal(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (portalId: string) => deletePortal(companyId, portalId),
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
    queryFn: () => fetchLeads(companyId, portalId),
    enabled: !!companyId && !!portalId,
  })
}

export function useAllLeads(companyId: string) {
  return useQuery({
    queryKey: portalKeys.allLeads(companyId),
    queryFn: () => fetchAllLeads(companyId),
    enabled: !!companyId,
  })
}

export function useDeleteLead(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (leadId: string) => deleteLead(companyId, leadId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: portalKeys.allLeads(companyId) })
      toast.success('Lead removido.')
    },
    onError: () => toast.error('Erro ao remover lead.'),
  })
}

export function useDeleteLeadsBulk(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => deleteLeadsBulk(companyId, ids),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: portalKeys.allLeads(companyId) })
      toast.success(`${res.data.deleted} lead(s) removido(s).`)
    },
    onError: () => toast.error('Erro ao remover leads.'),
  })
}
