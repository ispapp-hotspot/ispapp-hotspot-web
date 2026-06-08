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

function fetchPaymentGateways() {
  return http.get<PaymentGatewayConfig[]>('/payment-gateway').then((r) => r.data)
}
function validateGateway() {
  return http.get<{ valid: boolean; userId?: string; email?: string; nickname?: string; error?: string }>(
    '/payment-gateway/validate'
  ).then((r) => r.data)
}
function upsertGateway(data: { gatewayType?: string; publicKey: string; secretToken: string }) {
  return http.put<PaymentGatewayConfig>('/payment-gateway', data).then((r) => r.data)
}
function activateGateway(type: string) {
  return http.post<PaymentGatewayConfig>(`/payment-gateway/${type}/activate`).then((r) => r.data)
}
function deleteGateway(type?: string) {
  return type
    ? http.delete(`/payment-gateway/${type}`)
    : http.delete('/payment-gateway')
}

export const gatewayKeys = {
  all: () => ['payment-gateways'] as const,
  validate: () => ['payment-gateways', 'validate'] as const,
}

export function usePaymentGateways() {
  return useQuery({
    queryKey: gatewayKeys.all(),
    queryFn: () => fetchPaymentGateways().catch((err: { response?: { status?: number } }) => {
      if (err?.response?.status === 404) return []
      throw err
    }),
  })
}

export function useValidateGateway() {
  return useQuery({
    queryKey: gatewayKeys.validate(),
    queryFn: validateGateway,
    retry: false,
  })
}

export function useUpsertGateway() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { gatewayType?: string; publicKey: string; secretToken: string }) =>
      upsertGateway(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gatewayKeys.all() })
      qc.invalidateQueries({ queryKey: gatewayKeys.validate() })
      toast.success('Gateway salvo!')
    },
    onError: () => toast.error('Erro ao salvar gateway.'),
  })
}

export function useActivateGateway() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (type: string) => activateGateway(type),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gatewayKeys.all() })
      toast.success('Gateway ativado!')
    },
    onError: () => toast.error('Erro ao ativar gateway.'),
  })
}

export function useDeleteGateway() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (type?: string) => deleteGateway(type),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gatewayKeys.all() })
      qc.invalidateQueries({ queryKey: gatewayKeys.validate() })
      toast.success('Gateway removido.')
    },
    onError: () => toast.error('Erro ao remover gateway.'),
  })
}
