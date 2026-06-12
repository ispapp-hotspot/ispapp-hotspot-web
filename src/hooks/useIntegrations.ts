import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import http from '@/lib/http'
import type { IspIntegration, ErpType, PaymentGatewayConfig } from '@/types'

// ── ERP Integration ───────────────────────────────────────────────────────────

function fetchIspIntegration() {
  return http.get<IspIntegration>('/isp-integration').then((r) => r.data)
}
function upsertIspIntegration(data: { erpType: ErpType; baseUrl: string; token: string }) {
  return http.put<IspIntegration>('/isp-integration', data).then((r) => r.data)
}
function deleteIspIntegration() {
  return http.delete('/isp-integration')
}

export const integrationKeys = {
  isp: () => ['isp-integration'] as const,
}

export function useIspIntegration() {
  return useQuery({
    queryKey: integrationKeys.isp(),
    queryFn: () => fetchIspIntegration().catch((err: { response?: { status?: number } }) => {
      if (err?.response?.status === 404) return null
      throw err
    }),
  })
}

export function useUpsertIspIntegration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { erpType: ErpType; baseUrl: string; token: string }) =>
      upsertIspIntegration(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: integrationKeys.isp() })
      toast.success('Integração salva!')
    },
    onError: () => toast.error('Erro ao salvar integração.'),
  })
}

export function useDeleteIspIntegration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => deleteIspIntegration(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: integrationKeys.isp() })
      toast.success('Integração removida.')
    },
    onError: () => toast.error('Erro ao remover integração.'),
  })
}

// ── Payment Gateway ───────────────────────────────────────────────────────────

const gwBase = (companyId: string) => `/companies/${companyId}/payment-gateway`

function fetchPaymentGateways(companyId: string) {
  return http.get<PaymentGatewayConfig[]>(gwBase(companyId)).then((r) => r.data)
}
function validateGateway(companyId: string) {
  return http.get<{ valid: boolean; userId?: string; email?: string; nickname?: string; error?: string }>(
    `${gwBase(companyId)}/validate`
  ).then((r) => r.data)
}
function upsertGateway(companyId: string, data: { gatewayType?: string; publicKey: string; secretToken: string }) {
  return http.put<PaymentGatewayConfig>(gwBase(companyId), data).then((r) => r.data)
}
function activateGateway(companyId: string, type: string) {
  return http.post<PaymentGatewayConfig>(`${gwBase(companyId)}/${type}/activate`).then((r) => r.data)
}
function deleteGateway(companyId: string, type?: string) {
  return type
    ? http.delete(`${gwBase(companyId)}/${type}`)
    : http.delete(gwBase(companyId))
}

export const gatewayKeys = {
  all: (companyId: string) => ['payment-gateways', companyId] as const,
  validate: (companyId: string) => ['payment-gateways', companyId, 'validate'] as const,
}

export function usePaymentGateways(companyId: string) {
  return useQuery({
    queryKey: gatewayKeys.all(companyId),
    queryFn: () => fetchPaymentGateways(companyId).catch((err: { response?: { status?: number } }) => {
      if (err?.response?.status === 404) return []
      throw err
    }),
    enabled: !!companyId,
  })
}

export function useValidateGateway(companyId: string) {
  return useQuery({
    queryKey: gatewayKeys.validate(companyId),
    queryFn: () => validateGateway(companyId),
    retry: false,
    enabled: !!companyId,
  })
}

export function useUpsertGateway(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { gatewayType?: string; publicKey: string; secretToken: string }) =>
      upsertGateway(companyId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gatewayKeys.all(companyId) })
      qc.invalidateQueries({ queryKey: gatewayKeys.validate(companyId) })
      toast.success('Gateway salvo!')
    },
    onError: () => toast.error('Erro ao salvar gateway.'),
  })
}

export function useActivateGateway(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (type: string) => activateGateway(companyId, type),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gatewayKeys.all(companyId) })
      toast.success('Gateway ativado!')
    },
    onError: () => toast.error('Erro ao ativar gateway.'),
  })
}

export function useDeleteGateway(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (type?: string) => deleteGateway(companyId, type),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gatewayKeys.all(companyId) })
      qc.invalidateQueries({ queryKey: gatewayKeys.validate(companyId) })
      toast.success('Gateway removido.')
    },
    onError: () => toast.error('Erro ao remover gateway.'),
  })
}
