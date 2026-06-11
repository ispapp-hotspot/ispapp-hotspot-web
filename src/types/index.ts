// ── Auth ──────────────────────────────────────────────────────────────────────
export interface TokenResponse {
  token: string
  name: string
  email: string
  role: string
  expiresIn: number
}

export interface IspUser {
  id: string
  ispId: string
  name: string
  email: string
  role: string
}

// ── Tenant ────────────────────────────────────────────────────────────────────
export interface IspAccount {
  id: string
  name: string
  slug: string
  email: string
  planTier: 'starter' | 'professional' | 'enterprise'
  active: boolean
  createdAt: string
}

export interface Company {
  id: string
  ispId: string
  name: string
  type: 'hotel' | 'bar' | 'restaurant' | 'event' | 'general'
  cnpj?: string
  active: boolean
  createdAt: string
}

// ── Device ────────────────────────────────────────────────────────────────────
export type DeviceStatus = 'PENDING' | 'ONLINE' | 'OFFLINE' | 'ERROR'

export type TunnelType = 'wireguard' | 'l2tp'

export interface Device {
  id: string
  companyId: string
  name: string
  type: string
  tunnelType: TunnelType
  rosVersion?: number
  wgPublicKey?: string
  wgIp?: string
  l2tpUser?: string
  status: DeviceStatus
  lastHandshake?: string
  wgSetupDone: boolean
  autoSetupDone: boolean
  routerosIp?: string
  routerosPort?: number
  routerosUser?: string
  portalId?: string
  createdAt: string
  // Runtime metrics — coletadas a cada 5min via RouterOS REST (WireGuard v7 apenas)
  rosVersionString?: string
  uptimeSeconds?: number
  cpuLoad?: number
  freeMemoryMb?: number
  totalMemoryMb?: number
  freeHddMb?: number
  boardName?: string
  lastMetricsAt?: string
}

// Retornado apenas no provisionamento — exibir uma vez
export interface DeviceProvisionResult {
  device: Device
  connectionType: TunnelType
  // WireGuard
  wgPrivateKey?: string
  wgPublicKey?: string
  wgServerHost?: string
  wgServerPort?: number
  // L2TP
  l2tpServer?: string
  l2tpUser?: string
  l2tpPassword?: string
  l2tpIpsecSecret?: string
  // Common
  vpnIp: string
  nasSecret: string
  // Script for manual setup (autoSetup=false) — returned once, not stored
  setupScript?: string
  // Primary: short /tool fetch + /import command (fetches script via HTTP, bypasses terminal limits)
  setupImportCommand?: string
}

// ── Portal ────────────────────────────────────────────────────────────────────
export type PortalType =
  | 'FREE_ACCESS'
  | 'LOGIN_CPF'
  | 'VOUCHER'
  | 'SOCIAL_LOGIN'
  | 'PAID_ACCESS'
  | 'LEAD_CAPTURE'
  | 'ISP_LOGIN'

export type ErpType = 'SGP' | 'IXC' | 'MKAUTH' | 'BEESWEB'

export interface IspIntegration {
  id:      string
  erpType: ErpType
  baseUrl: string
  active:  boolean
}

export interface PortalTheme {
  primaryColor: string
  backgroundColor: string
  buttonColor: string
  textColor: string
  logoUrl?: string
  welcomeText: string
  termsText: string
  redirectUrl?: string
}

export interface PortalConfig {
  welcomeText:     string
  subtitle?:       string
  buttonText?:     string
  termsText?:      string
  primaryColor:    string
  backgroundColor: string
  buttonColor:     string
  textColor:       string
  logoUrl?:        string
  // LEAD_CAPTURE
  showCpf?:        boolean
  showEmail?:      boolean
  showPhone?:      boolean
  // PAID_ACCESS
  paymentMock?:    boolean
  steps?:          string[]
  // ISP_LOGIN
  showSuspendedInvoice?: boolean
  // Parâmetros de conexão (LEAD_CAPTURE, LOGIN_CPF, ISP_LOGIN)
  bandwidthUp?:    number
  bandwidthDown?:  number
  durationMin?:    number
  [key: string]:   unknown
}

export interface CaptivePortal {
  id: string
  companyId: string
  deviceId?: string
  campaignId?: string
  name: string
  type: PortalType
  config: PortalConfig
  active: boolean
  isDefault: boolean
  createdAt: string
}

// ── Campaign ──────────────────────────────────────────────────────────────────
export interface Campaign {
  id: string
  companyId: string
  name: string
  active: boolean
  createdAt: string
}

export interface CampaignMedia {
  id: string
  campaignId: string
  type: 'image' | 'video'
  url: string
  durationSec: number
  sortOrder: number
  active: boolean
}

export interface CampaignStats {
  totalViews:     number
  uniqueDevices:  number
  completed:      number
  completionRate: string
  deviceTypes:    Record<string, number>
  osNames:        Record<string, number>
  actions:        Record<string, number>
  viewsByDay:     Record<string, number>
}

export interface HotspotLead {
  id: string
  portalId: string
  companyId: string
  macAddress?: string
  ipAddress?: string
  name?: string
  cpf?: string
  email?: string
  phone?: string
  lgpdAccepted: boolean
  createdAt: string
}

// ── Plan ──────────────────────────────────────────────────────────────────────
export interface HotspotPlan {
  id: string
  companyId: string
  name: string
  description?: string
  durationMin: number
  bandwidthUp: number
  bandwidthDown: number
  price: number
  isFree: boolean
  /** Carência entre acessos (dias). Null = sem restrição. Apenas para planos gratuitos. */
  cooldownDays?: number | null
  active: boolean
  createdAt: string
}

export interface HotspotVoucher {
  id: string
  companyId: string
  planId: string
  code: string
  used: boolean
  usedAt?: string
  macAddress?: string
  createdAt: string
}

// ── Session ───────────────────────────────────────────────────────────────────
export type SessionStatus = 'active' | 'closed' | 'expired'

export interface HotspotSession {
  id: number
  sessionId: string
  username: string
  identifier: string
  macAddress?: string
  ipAddress?: string
  nasIp?: string
  deviceId?: string
  deviceName?: string
  startAt: string
  stopAt?: string
  durationSec?: number
  bytesIn: number
  bytesOut: number
  status: SessionStatus
  terminateCause?: string
}

export interface SessionListResponse {
  data: HotspotSession[]
  total: number
  page: number
  size: number
}

// ── Payment Gateway Config ────────────────────────────────────────────────────
export interface PaymentGatewayConfig {
  id:          string
  ispId:       string
  gatewayType: string
  publicKey:   string
  active:      boolean
  isActive:    boolean
}

// ── Financial ─────────────────────────────────────────────────────────────────
export type PaymentGateway = 'mercadopago' | 'efi'
export type TransactionStatus = 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled' | 'manual_approved'
export type PaymentMethod = 'pix' | 'credit_card' | 'boleto'

export interface FinancialTransaction {
  id: string
  ispId: string
  companyId: string
  planId?: string
  gatewayType: string
  gatewayId?: string
  amount: number
  status: TransactionStatus
  paymentMethod?: string
  macAddress?: string
  ipAddress?: string
  pixQrCode?: string
  pixCopyPaste?: string
  paidAt?: string
  expiresAt?: string
  notes?: string
  createdAt: string
  updatedAt: string
  leadName?: string
  leadCpf?: string
  leadEmail?: string
  leadPhone?: string
  leadId?: string
}

export interface TransactionListResponse {
  data: FinancialTransaction[]
  total: number
  page: number
  size: number
}

export interface TransactionStats {
  total: number
  approved: number
  pending: number
  revenue: number
  revenueToday: number
}

// ── API helpers ───────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface ApiError {
  status: number
  error: string
  message: string
  timestamp: string
}
