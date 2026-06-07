import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { plansApi } from '@/services/api'
import type { HotspotPlan } from '@/types'

export const planKeys = {
  all: (companyId: string) => ['plans', companyId] as const,
}

export function usePlans(companyId: string) {
  return useQuery({
    queryKey: planKeys.all(companyId),
    queryFn: () => plansApi.list(companyId),
    enabled: !!companyId,
  })
}

export function useCreatePlan(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<HotspotPlan>) => plansApi.create(companyId, data),
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
      plansApi.update(companyId, planId, data),
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
    mutationFn: (planId: string) => plansApi.toggle(companyId, planId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: planKeys.all(companyId) })
    },
    onError: () => toast.error('Erro ao alterar status do plano.'),
  })
}

export function useDeletePlan(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (planId: string) => plansApi.delete(companyId, planId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: planKeys.all(companyId) })
      toast.success('Plano removido.')
    },
    onError: () => toast.error('Erro ao remover plano.'),
  })
}
