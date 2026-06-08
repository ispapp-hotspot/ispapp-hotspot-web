import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import http from '@/lib/http'
import type { Campaign, CampaignMedia, CampaignStats } from '@/types'

function fetchCampaigns(companyId: string) {
  return http.get<Campaign[]>(`/companies/${companyId}/campaigns`).then((r) => r.data)
}
function createCampaign(companyId: string, name: string) {
  return http.post<Campaign>(`/companies/${companyId}/campaigns`, { name }).then((r) => r.data)
}
function updateCampaign(companyId: string, id: string, name: string) {
  return http.put<Campaign>(`/companies/${companyId}/campaigns/${id}`, { name }).then((r) => r.data)
}
function toggleCampaign(companyId: string, id: string) {
  return http.patch<Campaign>(`/companies/${companyId}/campaigns/${id}/toggle`).then((r) => r.data)
}
function deleteCampaign(companyId: string, id: string) {
  return http.delete(`/companies/${companyId}/campaigns/${id}`)
}
function fetchCampaignMedia(companyId: string, id: string) {
  return http.get<CampaignMedia[]>(`/companies/${companyId}/campaigns/${id}/media`).then((r) => r.data)
}
function addCampaignMedia(companyId: string, id: string, data: Partial<CampaignMedia>) {
  return http.post<CampaignMedia>(`/companies/${companyId}/campaigns/${id}/media`, data).then((r) => r.data)
}
function removeCampaignMedia(companyId: string, id: string, mediaId: string) {
  return http.delete(`/companies/${companyId}/campaigns/${id}/media/${mediaId}`)
}
function fetchCampaignStats(companyId: string, id: string) {
  return http.get<CampaignStats>(`/companies/${companyId}/campaigns/${id}/stats`).then((r) => r.data)
}

export const campaignKeys = {
  all: (companyId: string) => ['campaigns', companyId] as const,
  media: (companyId: string, id: string) => ['campaigns', companyId, id, 'media'] as const,
  stats: (companyId: string, id: string) => ['campaigns', companyId, id, 'stats'] as const,
}

export function useCampaigns(companyId: string) {
  return useQuery({
    queryKey: campaignKeys.all(companyId),
    queryFn: () => fetchCampaigns(companyId),
    enabled: !!companyId,
  })
}

export function useCampaignMedia(companyId: string, campaignId: string) {
  return useQuery({
    queryKey: campaignKeys.media(companyId, campaignId),
    queryFn: () => fetchCampaignMedia(companyId, campaignId),
    enabled: !!companyId && !!campaignId,
  })
}

export function useCampaignStats(companyId: string, campaignId: string) {
  return useQuery({
    queryKey: campaignKeys.stats(companyId, campaignId),
    queryFn: () => fetchCampaignStats(companyId, campaignId),
    enabled: !!companyId && !!campaignId,
  })
}

export function useCreateCampaign(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createCampaign(companyId, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.all(companyId) })
      toast.success('Campanha criada!')
    },
    onError: () => toast.error('Erro ao criar campanha.'),
  })
}

export function useUpdateCampaign(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateCampaign(companyId, id, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.all(companyId) })
      toast.success('Campanha atualizada!')
    },
    onError: () => toast.error('Erro ao atualizar campanha.'),
  })
}

export function useToggleCampaign(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => toggleCampaign(companyId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: campaignKeys.all(companyId) }),
    onError: () => toast.error('Erro ao alterar status da campanha.'),
  })
}

export function useDeleteCampaign(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCampaign(companyId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.all(companyId) })
      toast.success('Campanha removida.')
    },
    onError: () => toast.error('Erro ao remover campanha.'),
  })
}

export function useAddCampaignMedia(companyId: string, campaignId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CampaignMedia>) =>
      addCampaignMedia(companyId, campaignId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.media(companyId, campaignId) })
      toast.success('Mídia adicionada!')
    },
    onError: () => toast.error('Erro ao adicionar mídia.'),
  })
}

export function useRemoveCampaignMedia(companyId: string, campaignId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (mediaId: string) =>
      removeCampaignMedia(companyId, campaignId, mediaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.media(companyId, campaignId) })
      toast.success('Mídia removida.')
    },
    onError: () => toast.error('Erro ao remover mídia.'),
  })
}
