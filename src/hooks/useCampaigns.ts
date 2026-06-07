import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { campaignsApi } from '@/services/api'
import type { CampaignMedia } from '@/types'

export const campaignKeys = {
  all: (companyId: string) => ['campaigns', companyId] as const,
  media: (companyId: string, id: string) => ['campaigns', companyId, id, 'media'] as const,
  stats: (companyId: string, id: string) => ['campaigns', companyId, id, 'stats'] as const,
}

export function useCampaigns(companyId: string) {
  return useQuery({
    queryKey: campaignKeys.all(companyId),
    queryFn: () => campaignsApi.list(companyId),
    enabled: !!companyId,
  })
}

export function useCampaignMedia(companyId: string, campaignId: string) {
  return useQuery({
    queryKey: campaignKeys.media(companyId, campaignId),
    queryFn: () => campaignsApi.listMedia(companyId, campaignId),
    enabled: !!companyId && !!campaignId,
  })
}

export function useCampaignStats(companyId: string, campaignId: string) {
  return useQuery({
    queryKey: campaignKeys.stats(companyId, campaignId),
    queryFn: () => campaignsApi.stats(companyId, campaignId),
    enabled: !!companyId && !!campaignId,
  })
}

export function useCreateCampaign(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => campaignsApi.create(companyId, name),
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
      campaignsApi.update(companyId, id, name),
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
    mutationFn: (id: string) => campaignsApi.toggle(companyId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: campaignKeys.all(companyId) }),
    onError: () => toast.error('Erro ao alterar status da campanha.'),
  })
}

export function useDeleteCampaign(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => campaignsApi.delete(companyId, id),
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
      campaignsApi.addMedia(companyId, campaignId, data),
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
      campaignsApi.removeMedia(companyId, campaignId, mediaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.media(companyId, campaignId) })
      toast.success('Mídia removida.')
    },
    onError: () => toast.error('Erro ao remover mídia.'),
  })
}
