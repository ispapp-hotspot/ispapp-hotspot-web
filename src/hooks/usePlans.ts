import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import http from '@/lib/http'
import type { HotspotPlan } from '@/types'

function fetchPlans(companyId: string) {
  return http.get<HotspotPlan[]>(`/companies/${companyId}/plans`).then((r) => r.data)
}
function createPlan(companyId: string, data: Partial<HotspotPlan>) {
  return http.post<HotspotPlan>(`/companies/${companyId}/plans`, data).then((r) => r.data)
}
function updatePlan(companyId: string, planId: string, data: Partial<HotspotPlan>) {
  return http.put<HotspotPlan>(`/companies/${companyId}/plans/${planId}`, data).then((r) => r.data)
}
function togglePlan(companyId: string, planId: string) {
  return http.patch<HotspotPlan>(`/companies/${companyId}/plans/${planId}/toggle`).then((r) => r.data)
}
function deletePlan(companyId: string, planId: string) {
  return http.delete(`/companies/${companyId}/plans/${planId}`)
}

export const planKeys = {
  all: (companyId: string) => ['plans', companyId] as const,
}

export function usePlans(companyId: string) {
  return useQuery({
    queryKey: planKeys.all(companyId),
    queryFn: () => fetchPlans(companyId),
    enabled: !!companyId,
  })
}

export function useCreatePlan(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<HotspotPlan>) => createPlan(companyId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: planKeys.all(companyId) })
      toast.success('Plano criado com sucesso!')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro ao criar plano.'
      toast.error(msg)
    },
  })
}

export function useUpdatePlan(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: Partial<HotspotPlan> }) =>
      updatePlan(companyId, planId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: planKeys.all(companyId) })
      toast.success('Plano atualizado!')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar plano.'
      toast.error(msg)
    },
  })
}

export function useTogglePlan(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (planId: string) => togglePlan(companyId, planId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: planKeys.all(companyId) })
    },
    onError: () => toast.error('Erro ao alterar status do plano.'),
  })
}

export function useDeletePlan(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (planId: string) => deletePlan(companyId, planId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: planKeys.all(companyId) })
      toast.success('Plano removido.')
    },
    onError: () => toast.error('Erro ao remover plano.'),
  })
}
