import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import http from '@/lib/http'
import type { HotspotVoucher } from '@/types'

function fetchVouchers(companyId: string) {
  return http.get<HotspotVoucher[]>(`/companies/${companyId}/vouchers`).then((r) => r.data)
}
function fetchVouchersByPlan(companyId: string, planId: string) {
  return http.get<HotspotVoucher[]>(`/companies/${companyId}/vouchers/plan/${planId}`).then((r) => r.data)
}
function generateVouchers(companyId: string, data: { planId: string; quantity: number }) {
  return http.post<HotspotVoucher[]>(`/companies/${companyId}/vouchers/generate`, data).then((r) => r.data)
}
function deleteVoucher(companyId: string, voucherId: string) {
  return http.delete(`/companies/${companyId}/vouchers/${voucherId}`)
}

export const voucherKeys = {
  all: (companyId: string) => ['vouchers', companyId] as const,
  byPlan: (companyId: string, planId: string) => ['vouchers', companyId, planId] as const,
}

export function useVouchers(companyId: string) {
  return useQuery({
    queryKey: voucherKeys.all(companyId),
    queryFn: () => fetchVouchers(companyId),
    enabled: !!companyId,
  })
}

export function useVouchersByPlan(companyId: string, planId: string) {
  return useQuery({
    queryKey: voucherKeys.byPlan(companyId, planId),
    queryFn: () => fetchVouchersByPlan(companyId, planId),
    enabled: !!companyId && !!planId,
  })
}

export function useGenerateVouchers(companyId: string, planId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (quantity: number) => generateVouchers(companyId, { planId, quantity }),
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
    mutationFn: (voucherId: string) => deleteVoucher(companyId, voucherId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: voucherKeys.byPlan(companyId, planId) })
      toast.success('Voucher removido.')
    },
    onError: () => toast.error('Erro ao remover voucher.'),
  })
}
