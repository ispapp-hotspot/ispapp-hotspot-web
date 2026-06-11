'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useDevices, useProvisionDevice, useUpdateDevice, useDeleteDevice, useAutoSetupDevice } from '@/hooks/useDevices'
import { usePortals } from '@/hooks/usePortals'
import { useCompanyStore } from '@/store/company'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Wifi, X, Copy, Check, Pencil, Trash2,
  Loader2, AlertTriangle, CheckCircle2, Clock, XCircle, RefreshCw,
  Cpu, HardDrive, MemoryStick, Activity, Server, Info,
} from 'lucide-react'
import type { Device, DeviceProvisionResult } from '@/types'
import { cn } from '@/lib/utils'
import { formatUptime, usagePct } from '@/utils/device-utils'

// ── Schemas ───────────────────────────────────────────────────────────────────
const DEVICE_TYPES = [
  { value: 'mikrotik',  label: 'MikroTik',  supported: true,  hint: 'RouterOS' },
  { value: 'ubiquiti',  label: 'Ubiquiti',  supported: false, hint: 'Em breve' },
] as const
type DeviceType = typeof DEVICE_TYPES[number]['value']

const TUNNEL_TYPES = [
  { value: 'wireguard', label: 'WireGuard', hint: 'RouterOS v7+', badge: 'WG' },
  { value: 'l2tp',      label: 'L2TP/IPsec', hint: 'RouterOS v6 (legado)', badge: 'L2' },
] as const
type TunnelTypeOption = typeof TUNNEL_TYPES[number]['value']

const addDeviceSchema = z.object({
  name:              z.string().min(2, 'Nome obrigatório'),
  type:              z.string().default('mikrotik'),
  connectionType:    z.enum(['wireguard', 'l2tp']).default('wireguard'),
  autoSetup:         z.boolean().default(true),
  routerosIp:        z.string().optional(),
  routerosUser:      z.string().optional(),
  routerosPassword:  z.string().optional(),
  routerosPort:      z.coerce.number().int().min(1).max(65535).default(80),
  hotspotInterface:  z.string().optional(),
  portalId:          z.string().min(1, 'Selecione um portal'),
}).superRefine((data, ctx) => {
  if (data.connectionType === 'wireguard' && data.autoSetup) {
    if (!data.routerosIp?.trim())
      ctx.addIssue({ code: 'custom', path: ['routerosIp'], message: 'IP obrigatório' })
    if (!data.routerosUser?.trim())
      ctx.addIssue({ code: 'custom', path: ['routerosUser'], message: 'Obrigatório' })
    if (!data.routerosPassword?.trim())
      ctx.addIssue({ code: 'custom', path: ['routerosPassword'], message: 'Obrigatório' })
  }
  if (data.connectionType === 'wireguard' && !data.autoSetup) {
    if (!data.hotspotInterface?.trim())
      ctx.addIssue({ code: 'custom', path: ['hotspotInterface'], message: 'Interface obrigatória' })
  }
})
type AddDeviceForm = z.infer<typeof addDeviceSchema>
type ConnectionDefaults = Pick<AddDeviceForm,
  'routerosIp' | 'routerosUser' | 'routerosPassword' | 'routerosPort' | 'portalId'>

const autoSetupSchema = z.object({
  // Conexão — optional for L2TP (RouterOS v6 has no REST API)
  routerosIp:        z.string().optional(),
  routerosUser:      z.string().optional(),
  routerosPassword:  z.string().optional(),
  routerosPort:      z.coerce.number().int().min(1).max(65535).default(80),
  // Hotspot
  hotspotInterface:  z.string().min(1, 'Obrigatório'),
  portalId:          z.string().min(1, 'Obrigatório'),
})
type AutoSetupForm = z.infer<typeof autoSetupSchema>

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<Device['status'], { label: string; color: string; icon: typeof Wifi }> = {
  ONLINE:  { label: 'Online',   color: 'text-emerald-400', icon: CheckCircle2 },
  OFFLINE: { label: 'Offline',  color: 'text-red-400',     icon: XCircle },
  PENDING: { label: 'Pendente', color: 'text-yellow-400',  icon: Clock },
  ERROR:   { label: 'Erro',     color: 'text-red-500',     icon: AlertTriangle },
}

const inputCls = 'w-full h-10 px-3 rounded-lg bg-[#1a2130] border border-white/10 focus:border-emerald-500 text-white placeholder:text-neutral-600 text-sm outline-none transition-colors'
const labelCls = 'text-xs uppercase tracking-wider text-neutral-400 mb-1.5 block'

// ── Portal modal ──────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, maxWidth = 'max-w-lg' }: {
  title: string; onClose: () => void; children: React.ReactNode; maxWidth?: string
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`bg-[#141920] border border-white/10 rounded-xl w-full ${maxWidth} mx-4 shadow-2xl`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body
  )
}

// ── Copy field ────────────────────────────────────────────────────────────────
function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="space-y-1">
      <p className={labelCls}>{label}</p>
      <div className="flex items-center gap-2 bg-[#0C1117] border border-white/10 rounded-lg px-3 py-2">
        <code className="flex-1 text-xs text-emerald-300 font-mono break-all">{value}</code>
        <button onClick={copy} className="shrink-0 text-neutral-500 hover:text-white transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  )
}

// ── Add device modal ──────────────────────────────────────────────────────────
function AddDeviceModal({ companyId, onClose, onAutoSetup }: {
  companyId: string; onClose: () => void
  onAutoSetup: (device: Device, conn: ConnectionDefaults) => void
}) {
  const [result, setResult] = useState<{ provision: DeviceProvisionResult; conn: ConnectionDefaults } | null>(null)
  const [selectedType,   setSelectedType]   = useState<DeviceType>('mikrotik')
  const [selectedTunnel, setSelectedTunnel] = useState<TunnelTypeOption>('wireguard')
  const [autoSetup,      setAutoSetup]      = useState(true)

  const { data: portals = [] } = usePortals(companyId)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<AddDeviceForm>({
    resolver: zodResolver(addDeviceSchema),
    defaultValues: { type: 'mikrotik', connectionType: 'wireguard', autoSetup: true, routerosPort: 80 },
  })

  const provision = useProvisionDevice(companyId)

  const isWireguard = selectedTunnel === 'wireguard'
  const showAutoSetup = isWireguard && autoSetup
  const showManualScript = isWireguard && !autoSetup

  if (result) {
    const isL2tp = result.provision.connectionType === 'l2tp'
    const hasScript = !!result.provision.setupScript
    const importCmd = result.provision.setupImportCommand
    return (
      <Modal title="Dispositivo provisionado" onClose={onClose} maxWidth={hasScript ? 'max-w-2xl' : 'max-w-lg'}>
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
            <p className="text-xs text-yellow-300">
              Guarde estas informações agora — <strong>não serão exibidas novamente</strong>.
            </p>
          </div>

          {isL2tp ? (
            <>
              {!result.provision.l2tpServer && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                  Servidor L2TP não configurado. Defina a variável <code className="font-mono">L2TP_SERVER</code> no servidor.
                </div>
              )}
              <CopyField label="Servidor L2TP"       value={result.provision.l2tpServer ?? ''} />
              <CopyField label="Usuário L2TP"         value={result.provision.l2tpUser ?? ''} />
              <CopyField label="Senha L2TP"           value={result.provision.l2tpPassword ?? ''} />
              <CopyField label="IPsec PSK"            value={result.provision.l2tpIpsecSecret ?? ''} />
              <CopyField label="IP VPN Alocado"       value={result.provision.vpnIp} />
              <CopyField label="NAS Secret (RADIUS)"  value={result.provision.nasSecret} />
            </>
          ) : (
            <>
              <CopyField label="WireGuard Private Key" value={result.provision.wgPrivateKey ?? ''} />
              <CopyField label="NAS Secret (RADIUS)"   value={result.provision.nasSecret} />
              <CopyField label="Servidor WireGuard"    value={`${result.provision.wgServerHost}:${result.provision.wgServerPort}`} />
              <CopyField label="IP VPN Alocado"        value={result.provision.vpnIp} />
            </>
          )}

          {importCmd && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Info className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-300">
                  <strong>Passo 1:</strong> Cole este comando no <strong>Terminal do MikroTik</strong> (Winbox → New Terminal).
                  O MikroTik baixará e executará o script de configuração automaticamente.
                </p>
              </div>
              <div className="relative">
                <pre className="bg-[#0C1117] border border-emerald-500/30 rounded-lg p-4 text-xs text-emerald-300 font-mono overflow-x-auto whitespace-pre">
                  {importCmd}
                </pre>
                <button
                  onClick={() => { navigator.clipboard.writeText(importCmd); toast.success('Comando copiado!') }}
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-neutral-300 transition-colors"
                >
                  <Copy className="w-3 h-3" /> Copiar
                </button>
              </div>
            </div>
          )}

          {hasScript && (
            <details className="group">
              <summary className="cursor-pointer text-xs text-neutral-400 hover:text-neutral-200 select-none py-1">
                Ver script completo (alternativa: colar manualmente linha a linha)
              </summary>
              <div className="relative mt-2">
                <pre className="bg-[#0C1117] border border-white/10 rounded-lg p-4 text-xs text-emerald-300 font-mono overflow-auto max-h-64 whitespace-pre-wrap break-all">
                  {result.provision.setupScript}
                </pre>
                <button
                  onClick={() => { navigator.clipboard.writeText(result.provision.setupScript!); toast.success('Script copiado!') }}
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-neutral-300 transition-colors"
                >
                  <Copy className="w-3 h-3" /> Copiar tudo
                </button>
              </div>
            </details>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 h-10 border border-white/10 text-neutral-300 hover:bg-white/5 text-sm font-medium rounded-lg transition-colors"
            >
              Confirmo que salvei
            </button>
            {!hasScript && (
              <button
                onClick={() => { onAutoSetup(result.provision.device, result.conn); onClose() }}
                className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {isL2tp ? 'Gerar Script' : 'Auto Setup agora'}
              </button>
            )}
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Novo Dispositivo" onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit((d) => provision.mutate(
        {
          name: d.name, type: d.type, connectionType: d.connectionType,
          autoSetup: d.autoSetup, hotspotInterface: d.hotspotInterface,
          portalId: d.portalId,
          routerosIp: d.routerosIp, routerosPort: d.routerosPort,
          routerosUser: d.routerosUser, routerosPassword: d.routerosPassword,
        },
        {
          onSuccess: (r) => setResult({
            provision: r,
            conn: { routerosIp: d.routerosIp, routerosUser: d.routerosUser, routerosPassword: d.routerosPassword, routerosPort: d.routerosPort, portalId: d.portalId }
          })
        }
      ))} className="space-y-5">

        {/* Nome */}
        <div>
          <label className={labelCls}>Nome do dispositivo</label>
          <input
            {...register('name')}
            className={inputCls}
            placeholder="Ex: CCR2116 Recepção"
            autoFocus
          />
          {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
        </div>

        {/* Tipo de roteador */}
        <div>
          <label className={labelCls}>Tipo de roteador</label>
          <div className="grid grid-cols-2 gap-2">
            {DEVICE_TYPES.map(({ value, label, supported, hint }) => (
              <button
                key={value}
                type="button"
                disabled={!supported}
                onClick={() => { setSelectedType(value); setValue('type', value) }}
                className={cn(
                  'relative px-3 py-3 rounded-lg border text-left transition-all',
                  !supported && 'opacity-40 cursor-not-allowed',
                  selectedType === value && supported
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-white/10 bg-[#1a2130] hover:border-white/20'
                )}
              >
                <p className={cn('text-sm font-medium', selectedType === value && supported ? 'text-emerald-400' : 'text-white')}>
                  {label}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">{hint}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Tipo de conexão VPN */}
        <div>
          <label className={labelCls}>Tipo de conexão VPN</label>
          <div className="grid grid-cols-2 gap-2">
            {TUNNEL_TYPES.map(({ value, label, hint }) => (
              <button
                key={value}
                type="button"
                onClick={() => { setSelectedTunnel(value); setValue('connectionType', value) }}
                className={cn(
                  'relative px-3 py-3 rounded-lg border text-left transition-all',
                  selectedTunnel === value
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-white/10 bg-[#1a2130] hover:border-white/20'
                )}
              >
                <p className={cn('text-sm font-medium', selectedTunnel === value ? 'text-emerald-400' : 'text-white')}>
                  {label}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">{hint}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Toggle IP público (WireGuard only) */}
        {isWireguard && (
          <div
            className={cn(
              'flex items-start gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all select-none',
              autoSetup
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-amber-500/30 bg-amber-500/5'
            )}
            onClick={() => {
              const next = !autoSetup
              setAutoSetup(next)
              setValue('autoSetup', next)
            }}
          >
            <div className={cn(
              'mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
              autoSetup ? 'border-emerald-500 bg-emerald-500' : 'border-amber-500/50 bg-transparent'
            )}>
              {autoSetup && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
            <div>
              <p className={cn('text-sm font-medium', autoSetup ? 'text-emerald-400' : 'text-amber-400')}>
                {autoSetup ? 'IP público disponível — Auto Setup' : 'Sem IP público — Gerar script'}
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {autoSetup
                  ? 'O sistema configura o MikroTik automaticamente via RouterOS API'
                  : 'Você receberá um script para colar no terminal do MikroTik'}
              </p>
            </div>
          </div>
        )}

        {/* Conexão RouterOS API */}
        {isWireguard && (
          <div>
            <p className={labelCls}>Credenciais RouterOS</p>
            <p className="text-xs text-neutral-600 mb-2">
              {autoSetup
                ? 'Necessário para o Auto Setup e para desconectar sessões remotamente'
                : 'Necessário para desconectar sessões remotamente via túnel VPN'}
            </p>
            <div className="space-y-3">
              {/* IP só exibido quando autoSetup — sem IP público não tem como alcançar antes do tunnel subir */}
              {autoSetup && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-neutral-500 mb-1 block">IP do MikroTik</label>
                    <input {...register('routerosIp')} className={inputCls} placeholder="192.168.1.1" />
                    {errors.routerosIp && <p className="text-xs text-red-400 mt-1">{errors.routerosIp.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">Porta</label>
                    <input {...register('routerosPort')} type="number" className={inputCls} placeholder="80" />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Usuário</label>
                  <input {...register('routerosUser')} className={inputCls} placeholder="admin" />
                  {errors.routerosUser && <p className="text-xs text-red-400 mt-1">{errors.routerosUser.message}</p>}
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Senha</label>
                  <input {...register('routerosPassword')} type="password" className={inputCls} placeholder="••••••••" />
                  {errors.routerosPassword && <p className="text-xs text-red-400 mt-1">{errors.routerosPassword.message}</p>}
                </div>
              </div>
              {!autoSetup && (
                <p className="text-xs text-neutral-600">
                  Sem IP público — o sistema usará o IP VPN alocado via túnel WireGuard para alcançar o MikroTik
                </p>
              )}
            </div>
          </div>
        )}

        {/* Interface hotspot (quando autoSetup=false para WireGuard) */}
        {showManualScript && (
          <div>
            <label className={labelCls}>Interface do Hotspot</label>
            <input
              {...register('hotspotInterface')}
              className={inputCls}
              placeholder="ether1"
            />
            <p className="text-xs text-neutral-500 mt-1">Interface onde o hotspot será ativado (ex: ether2-local, bridge-local)</p>
            {errors.hotspotInterface && <p className="text-xs text-red-400 mt-1">{errors.hotspotInterface.message}</p>}
          </div>
        )}

        {/* Portal padrão */}
        <div>
          <label className={labelCls}>Portal exibido ao cliente</label>
          <select {...register('portalId')} className={cn(inputCls, 'cursor-pointer')}>
            <option value="">Selecione o portal...</option>
            {portals.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {errors.portalId && <p className="text-xs text-red-400 mt-1">{errors.portalId.message}</p>}
        </div>

        <button
          type="submit"
          disabled={provision.isPending}
          className="w-full h-10 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {provision.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {provision.isPending ? 'Provisionando...' : 'Provisionar'}
        </button>
      </form>
    </Modal>
  )
}

// ── Auto Setup modal ──────────────────────────────────────────────────────────
function AutoSetupModal({ device, companyId, onClose, connDefaults }: {
  device: Device; companyId: string; onClose: () => void
  connDefaults?: ConnectionDefaults
}) {
  const [script, setScript] = useState<string | null>(null)
  const { data: portals = [] } = usePortals(companyId)
  const isL2tp = device.tunnelType === 'l2tp'

  const { register, handleSubmit, formState: { errors } } = useForm<AutoSetupForm>({
    resolver: zodResolver(autoSetupSchema),
    defaultValues: {
      routerosIp:       connDefaults?.routerosIp      ?? '',
      routerosPort:     connDefaults?.routerosPort     ?? 80,
      routerosUser:     connDefaults?.routerosUser     ?? '',
      routerosPassword: connDefaults?.routerosPassword ?? '',
      portalId:         connDefaults?.portalId         ?? '',
      hotspotInterface: 'ether1',
    },
  })

  const setup = useAutoSetupDevice(companyId)

  if (script) {
    return (
      <Modal title={`Script L2TP — ${device.name}`} onClose={onClose} maxWidth="max-w-2xl">
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
            <RefreshCw className="w-4 h-4 text-sky-400 shrink-0" />
            <p className="text-xs text-sky-300">
              Copie e cole este script no <strong>Terminal do MikroTik</strong> (New Terminal no Winbox).
            </p>
          </div>
          <div className="relative">
            <pre className="bg-[#0C1117] border border-white/10 rounded-lg p-4 text-xs text-emerald-300 font-mono overflow-auto max-h-96 whitespace-pre-wrap break-all">
              {script}
            </pre>
            <button
              onClick={() => navigator.clipboard.writeText(script)}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-neutral-300 transition-colors"
            >
              <Copy className="w-3 h-3" /> Copiar tudo
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-all"
          >
            Concluído
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={`${isL2tp ? 'Gerar Script' : 'Auto Setup'} — ${device.name}`} onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit((d) => setup.mutate(
        { deviceId: device.id, data: d },
        { onSuccess: (result) => { if (result?.script) setScript(result.script); else onClose() } }
      ))} className="space-y-5">

        {/* Info do device */}
        <div className="bg-[#0C1117] border border-white/10 rounded-lg px-4 py-3 space-y-1">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Dispositivo</p>
          <p className="text-sm text-white font-medium">{device.name}</p>
          <p className="text-xs text-neutral-400">
            IP VPN: <code className="font-mono text-emerald-400">{device.wgIp}</code>
            {' · '}
            <span className={cn('font-medium', isL2tp ? 'text-sky-400' : 'text-violet-400')}>
              {isL2tp ? 'L2TP/IPsec v6' : 'WireGuard v7'}
            </span>
          </p>
        </div>

        {/* Conexão — só WireGuard precisa (L2TP não tem REST API v6) */}
        {!isL2tp && (
          <div>
            <p className={labelCls}>Conexão RouterOS API</p>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-neutral-500 mb-1 block">IP do MikroTik</label>
                  <input {...register('routerosIp')} className={inputCls} placeholder="192.168.1.1" autoFocus />
                  {errors.routerosIp && <p className="text-xs text-red-400 mt-1">{errors.routerosIp.message}</p>}
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Porta</label>
                  <input {...register('routerosPort')} type="number" className={inputCls} placeholder="8728" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Usuário</label>
                  <input {...register('routerosUser')} className={inputCls} placeholder="admin" />
                  {errors.routerosUser && <p className="text-xs text-red-400 mt-1">{errors.routerosUser.message}</p>}
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Senha</label>
                  <input {...register('routerosPassword')} type="password" className={inputCls} placeholder="••••••••" />
                  {errors.routerosPassword && <p className="text-xs text-red-400 mt-1">{errors.routerosPassword.message}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {isL2tp && (
          <div className="px-3 py-2.5 rounded-lg bg-neutral-800/50 border border-white/5 text-xs text-neutral-400">
            RouterOS v6 não possui REST API. O sistema gerará um script para colar no terminal.
          </div>
        )}

        {/* Hotspot */}
        <div>
          <p className={labelCls}>Configuração Hotspot</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Interface</label>
              <input {...register('hotspotInterface')} className={inputCls} placeholder="ether1" autoFocus={isL2tp} />
              {errors.hotspotInterface && <p className="text-xs text-red-400 mt-1">{errors.hotspotInterface.message}</p>}
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Portal Captive</label>
              <select {...register('portalId')} className={cn(inputCls, 'cursor-pointer')}>
                <option value="">Selecione um portal...</option>
                {portals.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {errors.portalId && <p className="text-xs text-red-400 mt-1">{errors.portalId.message}</p>}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={setup.isPending}
          className="w-full h-10 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {setup.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {setup.isPending
            ? (isL2tp ? 'Gerando...' : 'Configurando...')
            : (isL2tp ? 'Gerar Script' : 'Executar Auto Setup')}
        </button>
      </form>
    </Modal>
  )
}

// ── Delete confirm modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({ device, onConfirm, onClose, isPending }: {
  device: Device; onConfirm: () => void; onClose: () => void; isPending: boolean
}) {
  return (
    <Modal title="Remover Dispositivo" onClose={onClose} maxWidth="max-w-sm">
      <div className="space-y-5">
        <div className="flex items-start gap-3 px-3 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-300 font-medium">Ação irreversível</p>
            <p className="text-xs text-red-400/80 mt-0.5">
              O dispositivo será removido junto com sua configuração WireGuard e registro NAS no FreeRADIUS.
            </p>
          </div>
        </div>
        <div className="bg-[#0C1117] border border-white/10 rounded-lg px-4 py-3">
          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Dispositivo</p>
          <p className="text-sm text-white font-medium">{device.name}</p>
          {device.wgIp && (
            <p className="text-xs text-neutral-400 mt-0.5">
              IP VPN: <code className="font-mono text-emerald-400">{device.wgIp}</code>
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 h-10 border border-white/10 text-neutral-300 hover:bg-white/5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? 'Removendo...' : 'Remover'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Edit modal ────────────────────────────────────────────────────────────────
const editDeviceSchema = z.object({
  name:             z.string().min(2, 'Nome obrigatório'),
  routerosIp:       z.string().optional(),
  routerosPort:     z.coerce.number().int().min(1).max(65535).default(80),
  routerosUser:     z.string().optional(),
  routerosPassword: z.string().optional(),
  portalId:         z.string().optional(),
})
type EditDeviceForm = z.infer<typeof editDeviceSchema>

function EditDeviceModal({ device, companyId, onClose }: {
  device: Device; companyId: string; onClose: () => void
}) {
  const { data: portals = [] } = usePortals(companyId)

  const { register, handleSubmit, formState: { errors } } = useForm<EditDeviceForm>({
    resolver: zodResolver(editDeviceSchema),
    defaultValues: {
      name:         device.name,
      routerosIp:   device.routerosIp  ?? '',
      routerosPort: device.routerosPort ?? 80,
      routerosUser: device.routerosUser ?? '',
      portalId:     device.portalId    ?? '',
    },
  })

  const update = useUpdateDevice(companyId)

  return (
    <Modal title="Editar Dispositivo" onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit((d) => update.mutate({ deviceId: device.id, data: d }, { onSuccess: onClose }))} className="space-y-5">

        {/* Nome */}
        <div>
          <label className={labelCls}>Nome do dispositivo</label>
          <input {...register('name')} className={inputCls} autoFocus />
          {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
        </div>

        {/* Conexão */}
        <div>
          <p className={labelCls}>Conexão RouterOS API</p>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-neutral-500 mb-1 block">IP do MikroTik</label>
                <input {...register('routerosIp')} className={inputCls} placeholder="192.168.1.1" />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Porta</label>
                <input {...register('routerosPort')} type="number" className={inputCls} placeholder="8728" />
              </div>
            </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Usuário</label>
                  <input {...register('routerosUser')} className={inputCls} placeholder="admin" />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Senha</label>
                  <input {...register('routerosPassword')} type="password" className={inputCls} placeholder="deixe em branco para manter" />
                </div>
              </div>
          </div>
        </div>

        {/* Portal */}
        <div>
          <label className={labelCls}>Portal exibido ao cliente</label>
          <select {...register('portalId')} className={cn(inputCls, 'cursor-pointer')}>
            <option value="">Nenhum</option>
            {portals.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={update.isPending}
          className="w-full h-10 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {update.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Salvar
        </button>
      </form>
    </Modal>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function UsageBar({ value, max, color = 'bg-emerald-500' }: { value: number; max: number; color?: string }) {
  const pct = usagePct(value, max)
  const barColor = pct > 85 ? 'bg-red-500' : pct > 60 ? 'bg-yellow-500' : color
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-neutral-400 w-8 text-right">{pct}%</span>
    </div>
  )
}

// ── Device Details Modal ───────────────────────────────────────────────────────
function DeviceDetailsModal({ device, onClose }: { device: Device; onClose: () => void }) {
  const { label: statusLabel, color: statusColor, icon: StatusIcon } = STATUS_CONFIG[device.status] ?? STATUS_CONFIG.PENDING
  const isL2tp     = device.tunnelType === 'l2tp'
  const hasMetrics = !!device.lastMetricsAt

  return (
    <Modal title={device.name} onClose={onClose} maxWidth="max-w-lg">
      <div className="space-y-5">

        {/* Status + board */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Dispositivo</p>
            <p className="text-sm font-medium text-white">
              {device.boardName ?? device.type}
            </p>
            {device.rosVersionString && (
              <p className="text-xs text-neutral-500 mt-0.5">RouterOS {device.rosVersionString}</p>
            )}
          </div>
          <span className={cn('flex items-center gap-1.5 text-sm font-medium', statusColor)}>
            <StatusIcon className="w-4 h-4" />
            {statusLabel}
          </span>
        </div>

        {/* VPN */}
        <div className="bg-[#0C1117] border border-white/5 rounded-lg px-4 py-3 space-y-2">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Túnel VPN</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-neutral-600 mb-0.5">Tipo</p>
              <span className={cn(
                'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold',
                isL2tp ? 'bg-sky-500/10 text-sky-400' : 'bg-violet-500/10 text-violet-400'
              )}>
                {isL2tp ? 'L2TP/IPsec v6' : 'WireGuard v7'}
              </span>
            </div>
            <div>
              <p className="text-xs text-neutral-600 mb-0.5">IP VPN</p>
              <code className="font-mono text-emerald-400 text-xs">{device.wgIp ?? '—'}</code>
            </div>
            {device.lastHandshake && (
              <div className="col-span-2">
                <p className="text-xs text-neutral-600 mb-0.5">Último handshake</p>
                <p className="text-xs text-neutral-300">
                  {new Date(device.lastHandshake).toLocaleString('pt-BR')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Métricas — só WireGuard com dados coletados */}
        {!isL2tp && (
          <div className="bg-[#0C1117] border border-white/5 rounded-lg px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-500 uppercase tracking-wider">Sistema</p>
              {device.lastMetricsAt ? (
                <p className="text-xs text-neutral-600">
                  atualizado {new Date(device.lastMetricsAt).toLocaleTimeString('pt-BR')}
                </p>
              ) : (
                <p className="text-xs text-neutral-600">aguardando coleta...</p>
              )}
            </div>

            {hasMetrics ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-neutral-600">Uptime</p>
                      <p className="text-xs text-white font-mono">{formatUptime(device.uptimeSeconds)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-neutral-600">Placa</p>
                      <p className="text-xs text-white truncate">{device.boardName ?? '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                        <Cpu className="w-3 h-3" /> CPU
                      </span>
                      <span className="text-xs text-neutral-400">{device.cpuLoad ?? 0}%</span>
                    </div>
                    <UsageBar value={device.cpuLoad ?? 0} max={100} />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                        <MemoryStick className="w-3 h-3" /> RAM
                      </span>
                      <span className="text-xs text-neutral-400">
                        {device.freeMemoryMb ?? 0} / {device.totalMemoryMb ?? 0} MB livres
                      </span>
                    </div>
                    <UsageBar
                      value={(device.totalMemoryMb ?? 0) - (device.freeMemoryMb ?? 0)}
                      max={device.totalMemoryMb ?? 1}
                      color="bg-blue-500"
                    />
                  </div>

                  {(device.freeHddMb ?? 0) > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                          <HardDrive className="w-3 h-3" /> Disco
                        </span>
                        <span className="text-xs text-neutral-400">{device.freeHddMb} MB livres</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-600 py-2 text-center">
                Métricas disponíveis após o dispositivo ficar online e conectado via WireGuard
              </p>
            )}
          </div>
        )}

        {isL2tp && (
          <div className="px-3 py-2.5 rounded-lg bg-neutral-800/40 border border-white/5 text-xs text-neutral-500 text-center">
            RouterOS v6 não expõe API de métricas. Monitoramento via ping apenas.
          </div>
        )}

        {/* Configuração */}
        <div className="bg-[#0C1117] border border-white/5 rounded-lg px-4 py-3 space-y-2">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Configuração</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-neutral-600 mb-0.5">Auto Setup</p>
              <p className={device.autoSetupDone ? 'text-emerald-400' : 'text-yellow-400'}>
                {device.autoSetupDone ? '✓ Concluído' : '⏳ Pendente'}
              </p>
            </div>
            {device.routerosIp && (
              <div>
                <p className="text-neutral-600 mb-0.5">IP RouterOS</p>
                <code className="font-mono text-neutral-300">{device.routerosIp}</code>
              </div>
            )}
            <div>
              <p className="text-neutral-600 mb-0.5">Criado em</p>
              <p className="text-neutral-300">{new Date(device.createdAt).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </div>

      </div>
    </Modal>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DevicesPage() {
  const activeCompany = useCompanyStore((s) => s.activeCompany)
  const companyId = activeCompany?.id ?? ''
  const [modal, setModal] = useState<
    'add' | { details: Device } | { edit: Device } | { autoSetup: Device; connDefaults?: ConnectionDefaults } | { delete: Device } | null
  >(null)

  const { data: devices = [], isLoading } = useDevices(companyId)
  const remove = useDeleteDevice(companyId)


  if (!activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Wifi className="w-12 h-12 text-neutral-700 mb-4" />
        <p className="text-sm font-medium text-neutral-400">Nenhuma empresa selecionada</p>
        <p className="text-xs text-neutral-600 mt-1">Use o seletor na sidebar para escolher uma empresa</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dispositivos</h1>
          <p className="text-sm text-neutral-400 mt-0.5">MikroTiks de <span className="text-white">{activeCompany.name}</span></p>
        </div>
        <button
          onClick={() => setModal('add')}
          className="flex items-center gap-2 h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Novo Dispositivo
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-[#141920] rounded-xl animate-pulse border border-white/5" />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Wifi className="w-12 h-12 text-neutral-700 mb-4" />
          <p className="text-sm font-medium text-neutral-400">Nenhum dispositivo provisionado</p>
          <p className="text-xs text-neutral-600 mt-1">Clique em "Novo Dispositivo" para começar</p>
        </div>
      ) : (
        <div className="bg-[#141920] border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Nome', 'IP VPN', 'Túnel', 'Auto Setup', 'Status', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs uppercase tracking-wider text-neutral-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {devices.map((device) => {
                const { label, color, icon: Icon } = STATUS_CONFIG[device.status] ?? STATUS_CONFIG.PENDING
                return (
                  <tr key={device.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setModal({ details: device })}
                        className="font-medium text-white hover:text-emerald-400 transition-colors text-left"
                      >
                        {device.name}
                      </button>
                      {device.boardName && (
                        <p className="text-xs text-neutral-600 mt-0.5">{device.boardName}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-neutral-400">{device.wgIp ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold',
                        device.tunnelType === 'l2tp'
                          ? 'bg-sky-500/10 text-sky-400'
                          : 'bg-violet-500/10 text-violet-400'
                      )}>
                        {device.tunnelType === 'l2tp' ? 'L2TP' : 'WG'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('text-xs font-medium', device.autoSetupDone ? 'text-emerald-400' : 'text-neutral-500')}>
                        {device.autoSetupDone ? '✓ Feito' : '⏳ Pendente'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('flex items-center gap-1.5 text-xs font-medium', color)}>
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setModal({ details: device })}
                          title="Detalhes"
                          className="p-1.5 text-neutral-500 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setModal({ autoSetup: device })}
                          title="Auto Setup"
                          className="p-1.5 text-neutral-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setModal({ edit: device })}
                          title="Editar"
                          className="p-1.5 text-neutral-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setModal({ delete: device })}
                          title="Remover"
                          className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && modal !== 'add' && 'details' in modal && (
        <DeviceDetailsModal device={modal.details} onClose={() => setModal(null)} />
      )}
      {modal === 'add' && (
        <AddDeviceModal
          companyId={companyId}
          onClose={() => setModal(null)}
          onAutoSetup={(device, conn) => setModal({ autoSetup: device, connDefaults: conn })}
        />
      )}
      {modal !== null && modal !== 'add' && 'edit' in modal && (
        <EditDeviceModal device={modal.edit} companyId={companyId} onClose={() => setModal(null)} />
      )}
      {modal !== null && modal !== 'add' && 'autoSetup' in modal && (
        <AutoSetupModal
          device={modal.autoSetup}
          companyId={companyId}
          onClose={() => setModal(null)}
          connDefaults={modal.connDefaults}
        />
      )}
      {modal !== null && modal !== 'add' && 'delete' in modal && (
        <DeleteConfirmModal
          device={modal.delete}
          isPending={remove.isPending}
          onConfirm={() => remove.mutate(modal.delete.id, { onSuccess: () => setModal(null) })}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
