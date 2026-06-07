import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { vouchersApi } from '@/services/api'

export const voucherKeys = {
  all: (companyId: string) => ['vouchers', companyId] as const,
  byPlan: (companyId: string, planId: string) => ['vouchers', companyId, planId] as const,
}

export function useVouchers(companyId: string) {
  return useQuery({
    queryKey: voucherKeys.all(companyId),
    queryFn: () => vouchersApi.list(companyId),
    enabled: !!companyId,
  })
}

export function useVouchersByPlan(companyId: string, planId: string) {
  return useQuery({
    queryKey: voucherKeys.byPlan(companyId, planId),
    queryFn: () => vouchersApi.listByPlan(companyId, planId),
    enabled: !!companyId && !!planId,
  })
}

export function useGenerateVouchers(companyId: string, planId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (quantity: number) =>
      vouchersApi.generate(companyId, { planId, quantity }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: voucherKeys.byPlan(companyId, planId) })
      toast.success(`${data.length} voucher${data.length !== 1 ? 's' : ''} gerado${data.length !== 1 ? 's' : ''}!`)
    },
    onError: () => toast.error('Erro ao gerar vouchers.'),
  })
}

export function useDeleteVoucher(companyId: string, planId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (voucherId: string) => vouchersApi.delete(companyId, voucherId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: voucherKeys.byPlan(companyId, planId) })
      toast.success('Voucher removido.')
    },
    onError: () => toast.error('Erro ao remover voucher.'),
  })
}
