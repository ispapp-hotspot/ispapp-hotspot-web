import axios, { AxiosInstance } from 'axios'
import type {
  TokenResponse, IspUser,
  Company, Device, DeviceProvisionResult,
  CaptivePortal, HotspotPlan, HotspotVoucher, HotspotSession, FinancialTransaction, HotspotLead,
  Campaign, CampaignMedia, CampaignStats, IspIntegration, ErpType, PaymentGatewayConfig,
  TransactionListResponse, TransactionStats,
} from '@/types'

const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Cookie httpOnly — browser envia automaticamente, sem leitura manual
api.interceptors.request.use((config) => {
  config.withCredentials = true
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
        window.location.href = '/login'
      })
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (data: { email: string; password: string }) =>
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(async (r) => {
      const d = await r.json()
      if (!r.ok) throw new Error(d.message ?? 'Erro ao fazer login')
      return d as Pick<TokenResponse, 'name' | 'email' | 'role'>
    }),
  me: () => api.get<IspUser>('/auth/me').then((r) => r.data),
}

// ── Companies ─────────────────────────────────────────────────────────────────
export const companiesApi = {
  list: () => api.get<Company[]>('/companies').then((r) => r.data),
  get: (id: string) => api.get<Company>(`/companies/${id}`).then((r) => r.data),
  create: (data: Partial<Company>) => api.post<Company>('/companies', data).then((r) => r.data),
  update: (id: string, data: Partial<Company>) => api.put<Company>(`/companies/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/companies/${id}`),
}

// ── Devices ───────────────────────────────────────────────────────────────────
export const devicesApi = {
  list: (companyId: string) =>
    api.get<Device[]>(`/companies/${companyId}/devices`).then((r) => r.data),
  get: (companyId: string, deviceId: string) =>
    api.get<Device>(`/companies/${companyId}/devices/${deviceId}`).then((r) => r.data),
  provision: (companyId: string, name: string, type = 'mikrotik') =>
    api.post<DeviceProvisionResult>(`/companies/${companyId}/devices`, { name, type }).then((r) => r.data),
  update: (companyId: string, deviceId: string, data: {
    name: string; routerosIp?: string; routerosPort?: number; routerosUser?: string; portalId?: string
  }) => api.put<Device>(`/companies/${companyId}/devices/${deviceId}`, data).then((r) => r.data),
  autoSetup: (
    companyId: string,
    deviceId: string,
    payload: {
      routerosIp: string
      routerosUser: string; routerosPassword: string
      routerosPort: number
      hotspotInterface: string; portalId: string
    }
  ) => api.post(`/companies/${companyId}/devices/${deviceId}/auto-setup`, payload).then((r) => r.data),
  delete: (companyId: string, deviceId: string) =>
    api.delete(`/companies/${companyId}/devices/${deviceId}`),
}

// ── Portals ───────────────────────────────────────────────────────────────────
export const portalsApi = {
  list: (companyId: string) =>
    api.get<CaptivePortal[]>(`/companies/${companyId}/portals`).then((r) => r.data),
  get: (companyId: string, portalId: string) =>
    api.get<CaptivePortal>(`/companies/${companyId}/portals/${portalId}`).then((r) => r.data),
  create: (companyId: string, data: { name: string; type: string; config: Record<string, unknown> }) =>
    api.post<CaptivePortal>(`/companies/${companyId}/portals`, data).then((r) => r.data),
  update: (companyId: string, portalId: string, data: { name: string; type: string; config: Record<string, unknown> }) =>
    api.put<CaptivePortal>(`/companies/${companyId}/portals/${portalId}`, data).then((r) => r.data),
  toggle: (companyId: string, portalId: string) =>
    api.patch<CaptivePortal>(`/companies/${companyId}/portals/${portalId}/toggle`).then((r) => r.data),
  delete: (companyId: string, portalId: string) =>
    api.delete(`/companies/${companyId}/portals/${portalId}`),
  leads: (companyId: string, portalId: string) =>
    api.get<HotspotLead[]>(`/companies/${companyId}/portals/${portalId}/leads`).then((r) => r.data),
  allLeads: (companyId: string) =>
    api.get<HotspotLead[]>(`/companies/${companyId}/leads`).then((r) => r.data),
}

// ── Plans ─────────────────────────────────────────────────────────────────────
export const plansApi = {
  list: (companyId: string) =>
    api.get<HotspotPlan[]>(`/companies/${companyId}/plans`).then((r) => r.data),
  create: (companyId: string, data: Partial<HotspotPlan>) =>
    api.post<HotspotPlan>(`/companies/${companyId}/plans`, data).then((r) => r.data),
  update: (companyId: string, planId: string, data: Partial<HotspotPlan>) =>
    api.put<HotspotPlan>(`/companies/${companyId}/plans/${planId}`, data).then((r) => r.data),
  toggle: (companyId: string, planId: string) =>
    api.patch<HotspotPlan>(`/companies/${companyId}/plans/${planId}/toggle`).then((r) => r.data),
  delete: (companyId: string, planId: string) =>
    api.delete(`/companies/${companyId}/plans/${planId}`),
}

// ── Vouchers ──────────────────────────────────────────────────────────────────
export const vouchersApi = {
  list: (companyId: string) =>
    api.get<HotspotVoucher[]>(`/companies/${companyId}/vouchers`).then((r) => r.data),
  listByPlan: (companyId: string, planId: string) =>
    api.get<HotspotVoucher[]>(`/companies/${companyId}/vouchers/plan/${planId}`).then((r) => r.data),
  generate: (companyId: string, data: { planId: string; quantity: number }) =>
    api.post<HotspotVoucher[]>(`/companies/${companyId}/vouchers/generate`, data).then((r) => r.data),
  delete: (companyId: string, voucherId: string) =>
    api.delete(`/companies/${companyId}/vouchers/${voucherId}`),
}

// ── Sessions ──────────────────────────────────────────────────────────────────
export const sessionsApi = {
  listActive: (companyId: string) =>
    api.get<HotspotSession[]>(`/companies/${companyId}/sessions?status=active`).then((r) => r.data),
  list: (companyId: string, params?: Record<string, string>) =>
    api.get<HotspotSession[]>(`/companies/${companyId}/sessions`, { params }).then((r) => r.data),
}

// ── Financial ─────────────────────────────────────────────────────────────────
export const financialApi = {
  list: (companyId: string, params?: Record<string, string>) =>
    api.get<FinancialTransaction[]>(`/companies/${companyId}/financial`, { params }).then((r) => r.data),
  get: (companyId: string, txId: string) =>
    api.get<FinancialTransaction>(`/companies/${companyId}/financial/${txId}`).then((r) => r.data),
}

// ── Campaigns ─────────────────────────────────────────────────────────────────
export const campaignsApi = {
  list:        (companyId: string) =>
    api.get<Campaign[]>(`/companies/${companyId}/campaigns`).then(r => r.data),
  create:      (companyId: string, name: string) =>
    api.post<Campaign>(`/companies/${companyId}/campaigns`, { name }).then(r => r.data),
  update:      (companyId: string, id: string, name: string) =>
    api.put<Campaign>(`/companies/${companyId}/campaigns/${id}`, { name }).then(r => r.data),
  toggle:      (companyId: string, id: string) =>
    api.patch<Campaign>(`/companies/${companyId}/campaigns/${id}/toggle`).then(r => r.data),
  delete:      (companyId: string, id: string) =>
    api.delete(`/companies/${companyId}/campaigns/${id}`),
  listMedia:   (companyId: string, id: string) =>
    api.get<CampaignMedia[]>(`/companies/${companyId}/campaigns/${id}/media`).then(r => r.data),
  addMedia:    (companyId: string, id: string, data: Partial<CampaignMedia>) =>
    api.post<CampaignMedia>(`/companies/${companyId}/campaigns/${id}/media`, data).then(r => r.data),
  removeMedia: (companyId: string, id: string, mediaId: string) =>
    api.delete(`/companies/${companyId}/campaigns/${id}/media/${mediaId}`),
  stats:       (companyId: string, id: string) =>
    api.get<CampaignStats>(`/companies/${companyId}/campaigns/${id}/stats`).then(r => r.data),
}

// ── ISP Integration ───────────────────────────────────────────────────────────
export const integrationApi = {
  get: () =>
    api.get<IspIntegration>('/isp-integration').then(r => r.data),
  upsert: (data: { erpType: ErpType; baseUrl: string; token: string }) =>
    api.put<IspIntegration>('/isp-integration', data).then(r => r.data),
  delete: () =>
    api.delete('/isp-integration'),
}

// ── Payment Gateway ───────────────────────────────────────────────────────────
export const paymentGatewayApi = {
  list: () =>
    api.get<PaymentGatewayConfig[]>('/payment-gateway').then(r => r.data),
  /** @deprecated use list() instead */
  get: () =>
    api.get<PaymentGatewayConfig[]>('/payment-gateway').then(r => r.data[0] ?? null),
  upsert: (data: { gatewayType?: string; publicKey: string; secretToken: string }) =>
    api.put<PaymentGatewayConfig>('/payment-gateway', data).then(r => r.data),
  activate: (type: string) =>
    api.post<PaymentGatewayConfig>(`/payment-gateway/${type}/activate`).then(r => r.data),
  delete: (type?: string) =>
    type ? api.delete(`/payment-gateway/${type}`) : api.delete('/payment-gateway'),
  validate: () =>
    api.get<{ valid: boolean; userId?: string; email?: string; nickname?: string; error?: string }>('/payment-gateway/validate').then(r => r.data),
}

// ── Transactions ──────────────────────────────────────────────────────────────
export const transactionsApi = {
  list: (params?: { companyId?: string; page?: number; size?: number }) =>
    api.get<TransactionListResponse>('/transactions', { params }).then(r => r.data),
  stats: () =>
    api.get<TransactionStats>('/transactions/stats').then(r => r.data),
  approve: (id: string) =>
    api.post<FinancialTransaction>(`/transactions/${id}/approve`).then(r => r.data),
  cancel: (id: string) =>
    api.post<FinancialTransaction>(`/transactions/${id}/cancel`).then(r => r.data),
}

export default api
