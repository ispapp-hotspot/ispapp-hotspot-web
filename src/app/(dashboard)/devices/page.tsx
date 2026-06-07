'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { devicesApi, portalsApi } from '@/services/api'
import { useCompanyStore } from '@/store/company'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Wifi, X, Copy, Check, Pencil, Trash2,
  Loader2, AlertTriangle, CheckCircle2, Clock, XCircle, RefreshCw,
} from 'lucide-react'
import type { Device, DeviceProvisionResult } from '@/types'
import { cn } from '@/lib/utils'

// ── Schemas ───────────────────────────────────────────────────────────────────
const DEVICE_TYPES = [
  { value: 'mikrotik',  label: 'MikroTik',  supported: true,  hint: 'RouterOS REST API v7' },
  { value: 'ubiquiti',  label: 'Ubiquiti',  supported: false, hint: 'Em breve' },
] as const
type DeviceType = typeof DEVICE_TYPES[number]['value']

const nameSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  type: z.string().default('mikrotik'),
})
type NameForm = z.infer<typeof nameSchema>

const addDeviceSchema = z.object({
  name:              z.string().min(2, 'Nome obrigatório'),
  type:              z.string().default('mikrotik'),
  // Conexão RouterOS (IP local do MikroTik, antes do VPN)
  routerosIp:        z.string().min(1, 'IP obrigatório'),
  routerosUser:      z.string().min(1, 'Obrigatório'),
  routerosPassword:  z.string().min(1, 'Obrigatório'),
  routerosPort:      z.coerce.number().int().min(1).max(65535).default(8728),
  // Portal exibido ao cliente
  portalId:          z.string().min(1, 'Selecione um portal'),
})
type AddDeviceForm = z.infer<typeof addDeviceSchema>
type ConnectionDefaults = Pick<AddDeviceForm,
  'routerosIp' | 'routerosUser' | 'routerosPassword' | 'routerosPort' | 'portalId'>

const autoSetupSchema = z.object({
  // Conexão
  routerosIp:        z.string().min(1, 'Obrigatório'),
  routerosUser:      z.string().min(1, 'Obrigatório'),
  routerosPassword:  z.string().min(1, 'Obrigatório'),
  routerosPort:      z.coerce.number().int().min(1).max(65535).default(8728),
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
  const qc = useQueryClient()
  const [result, setResult] = useState<{ provision: DeviceProvisionResult; conn: ConnectionDefaults } | null>(null)
  const [selectedType, setSelectedType] = useState<DeviceType>('mikrotik')

  const { data: portals = [] } = useQuery({
    queryKey: ['portals', companyId],
    queryFn: () => portalsApi.list(companyId),
    enabled: !!companyId,
  })

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<AddDeviceForm>({
    resolver: zodResolver(addDeviceSchema),
    defaultValues: { type: 'mikrotik', routerosPort: 8728 },
  })

  const provision = useMutation({
    mutationFn: (data: AddDeviceForm) => devicesApi.provision(companyId, data.name, data.type),
    onSuccess: (r, data) => {
      setResult({
        provision: r,
        conn: {
          routerosIp:       data.routerosIp,
          routerosUser:     data.routerosUser,
          routerosPassword: data.routerosPassword,
          routerosPort:     data.routerosPort,
          portalId:         data.portalId,
        },
      })
      qc.invalidateQueries({ queryKey: ['devices', companyId] })
    },
    onError: () => toast.error('Erro ao provisionar dispositivo'),
  })

  if (result) {
    return (
      <Modal title="Dispositivo provisionado" onClose={onClose}>
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
            <p className="text-xs text-yellow-300">
              Guarde estas informações agora — <strong>não serão exibidas novamente</strong>.
            </p>
          </div>
          <CopyField label="WireGuard Private Key" value={result.provision.wgPrivateKey} />
          <CopyField label="NAS Secret (RADIUS)"   value={result.provision.nasSecret} />
          <CopyField label="Servidor WireGuard"     value={`${result.provision.wgServerHost}:${result.provision.wgServerPort}`} />
          <CopyField label="IP VPN Alocado"         value={result.provision.vpnIp} />
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 h-10 border border-white/10 text-neutral-300 hover:bg-white/5 text-sm font-medium rounded-lg transition-colors"
            >
              Confirmo que salvei
            </button>
            <button
              onClick={() => { onAutoSetup(result.provision.device, result.conn); onClose() }}
              className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Auto Setup agora
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Novo Dispositivo" onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit((d) => provision.mutate(d))} className="space-y-5">

        {/* Nome */}
        <div>
          <label className={labelCls}>Nome do dispositivo</label>
          <input
            {...register('name')}
            className={inputCls}
            placeholder={selectedType === 'mikrotik' ? 'Ex: CCR2116 Recepção' : 'Ex: EdgeRouter Sala'}
            autoFocus
          />
          {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
        </div>

        {/* Tipo */}
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

        {/* Conexão */}
        <div>
          <p className={labelCls}>Conexão RouterOS API</p>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-neutral-500 mb-1 block">IP do MikroTik</label>
                <input {...register('routerosIp')} className={inputCls} placeholder="192.168.1.1" />
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
  const qc = useQueryClient()

  const { data: portals = [] } = useQuery({
    queryKey: ['portals', companyId],
    queryFn: () => portalsApi.list(companyId),
    enabled: !!companyId,
  })

  const { register, handleSubmit, formState: { errors } } = useForm<AutoSetupForm>({
    resolver: zodResolver(autoSetupSchema),
    defaultValues: {
      routerosIp:       connDefaults?.routerosIp      ?? '',
      routerosPort:     connDefaults?.routerosPort     ?? 8728,
      routerosUser:     connDefaults?.routerosUser     ?? '',
      routerosPassword: connDefaults?.routerosPassword ?? '',
      portalId:         connDefaults?.portalId         ?? '',
      hotspotInterface: 'ether1',
    },
  })

  const setup = useMutation({
    mutationFn: (data: AutoSetupForm) => devicesApi.autoSetup(companyId, device.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices', companyId] })
      toast.success('Auto Setup concluído!')
      onClose()
    },
    onError: () => toast.error('Erro no Auto Setup. Verifique as credenciais.'),
  })

  const typeLabel = (device as any).type === 'mikrotik' ? 'MikroTik RouterOS REST API v7' : 'API do dispositivo'

  return (
    <Modal title={`Auto Setup — ${device.name}`} onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit((d) => setup.mutate(d))} className="space-y-5">

        {/* Info do device */}
        <div className="bg-[#0C1117] border border-white/10 rounded-lg px-4 py-3 space-y-1">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Dispositivo</p>
          <p className="text-sm text-white font-medium">{device.name}</p>
          <p className="text-xs text-neutral-400">
            IP VPN: <code className="font-mono text-emerald-400">{device.wgIp}</code> · {typeLabel}
          </p>
        </div>

        {/* Conexão */}
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

        {/* Hotspot */}
        <div>
          <p className={labelCls}>Configuração Hotspot</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Interface</label>
              <input {...register('hotspotInterface')} className={inputCls} placeholder="ether1" />
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
          {setup.isPending ? 'Configurando...' : 'Executar Auto Setup'}
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
  name:         z.string().min(2, 'Nome obrigatório'),
  routerosIp:   z.string().optional(),
  routerosPort: z.coerce.number().int().min(1).max(65535).default(8728),
  routerosUser: z.string().optional(),
  portalId:     z.string().optional(),
})
type EditDeviceForm = z.infer<typeof editDeviceSchema>

function EditDeviceModal({ device, companyId, onClose }: {
  device: Device; companyId: string; onClose: () => void
}) {
  const qc = useQueryClient()

  const { data: portals = [] } = useQuery({
    queryKey: ['portals', companyId],
    queryFn: () => portalsApi.list(companyId),
    enabled: !!companyId,
  })

  const { register, handleSubmit, formState: { errors } } = useForm<EditDeviceForm>({
    resolver: zodResolver(editDeviceSchema),
    defaultValues: {
      name:         device.name,
      routerosIp:   device.routerosIp  ?? '',
      routerosPort: device.routerosPort ?? 8728,
      routerosUser: device.routerosUser ?? '',
      portalId:     device.portalId    ?? '',
    },
  })

  const update = useMutation({
    mutationFn: (data: EditDeviceForm) => devicesApi.update(companyId, device.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices', companyId] })
      toast.success('Dispositivo atualizado')
      onClose()
    },
    onError: () => toast.error('Erro ao atualizar dispositivo'),
  })

  return (
    <Modal title="Editar Dispositivo" onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit((d) => update.mutate(d))} className="space-y-5">

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
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Usuário</label>
              <input {...register('routerosUser')} className={inputCls} placeholder="admin" />
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DevicesPage() {
  const activeCompany = useCompanyStore((s) => s.activeCompany)
  const companyId = activeCompany?.id ?? ''
  const qc = useQueryClient()
  const [modal, setModal] = useState<
    'add' | { edit: Device } | { autoSetup: Device; connDefaults?: ConnectionDefaults } | { delete: Device } | null
  >(null)

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['devices', companyId],
    queryFn: () => devicesApi.list(companyId),
    enabled: !!companyId,
  })

  const remove = useMutation({
    mutationFn: (deviceId: string) => devicesApi.delete(companyId, deviceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices', companyId] })
      toast.success('Dispositivo removido')
    },
    onError: () => toast.error('Erro ao remover dispositivo'),
  })


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
                {['Nome', 'IP VPN', 'WireGuard', 'Auto Setup', 'Status', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs uppercase tracking-wider text-neutral-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {devices.map((device) => {
                const { label, color, icon: Icon } = STATUS_CONFIG[device.status] ?? STATUS_CONFIG.PENDING
                return (
                  <tr key={device.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5 font-medium text-white">{device.name}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-neutral-400">{device.wgIp ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn('text-xs font-medium', device.wgSetupDone ? 'text-emerald-400' : 'text-neutral-500')}>
                        {device.wgSetupDone ? '✓ Configurado' : '⏳ Pendente'}
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
