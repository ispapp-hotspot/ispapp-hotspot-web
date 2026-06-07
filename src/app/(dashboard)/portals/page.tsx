'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { portalsApi, campaignsApi } from '@/services/api'
import { useCompanyStore } from '@/store/company'
import { toast } from 'sonner'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import {
  Plus, Globe, X, Pencil, Trash2, Loader2, AlertTriangle,
  User, FileText, CreditCard, Power, PowerOff, Users, Download,
  Eye, ExternalLink, Copy, Check, Wifi, Building2,
} from 'lucide-react'
import type { CaptivePortal, PortalType, HotspotLead, Campaign } from '@/types'
import { Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────
const PORTAL_TYPES: { value: PortalType; label: string; icon: typeof Globe; description: string }[] = [
  { value: 'LEAD_CAPTURE', label: 'Cadastro de Lead',      icon: User,       description: 'Coleta dados do usuário (nome, CPF, e-mail, telefone)' },
  { value: 'LOGIN_CPF',    label: 'Login por CPF',         icon: FileText,   description: 'Autenticação por CPF' },
  { value: 'PAID_ACCESS',  label: 'Planos',                icon: CreditCard, description: 'Seleção de plano + pagamento' },
  { value: 'FREE_ACCESS',  label: 'Acesso Livre',          icon: Globe,      description: 'Aceite de termos, sem autenticação' },
  { value: 'ISP_LOGIN',    label: 'Login via Provedor',    icon: Building2,  description: 'Verifica contrato ativo no ERP (SGP, IXC, MKAuth)' },
]

const TYPE_COLOR: Record<string, string> = {
  LEAD_CAPTURE: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  LOGIN_CPF:    'text-purple-400 bg-purple-500/10 border-purple-500/20',
  PAID_ACCESS:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  FREE_ACCESS:  'text-neutral-400 bg-white/5 border-white/10',
  VOUCHER:      'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  ISP_LOGIN:    'text-orange-400 bg-orange-500/10 border-orange-500/20',
}

const inputCls  = 'w-full h-10 px-3 rounded-lg bg-[#1a2130] border border-white/10 focus:border-emerald-500 text-white placeholder:text-neutral-600 text-sm outline-none transition-colors'
const labelCls  = 'text-xs uppercase tracking-wider text-neutral-400 mb-1.5 block'
const sectionCls = 'space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/5'

// ── Portal config schema ───────────────────────────────────────────────────────
const configSchema = z.object({
  welcomeText:     z.string().min(1, 'Obrigatório'),
  subtitle:        z.string().optional().default(''),
  buttonText:      z.string().default('Conectar à Internet'),
  termsText:       z.string().default('Ao conectar você concorda com os termos de uso da rede WiFi.'),
  primaryColor:    z.string().default('#10b981'),
  backgroundColor: z.string().default('#ffffff'),
  buttonColor:     z.string().default('#10b981'),
  textColor:       z.string().default('#111111'),
  logoUrl:         z.string().optional().default(''),
  showCpf:         z.boolean().default(true),
  showEmail:       z.boolean().default(true),
  showPhone:       z.boolean().default(true),
  showSuspendedInvoice: z.boolean().default(false),
})

const portalFormSchema = z.object({
  name:       z.string().min(2, 'Nome obrigatório'),
  type:       z.string().min(1),
  campaignId: z.string().optional(),
  config:     configSchema,
})
type PortalForm = z.infer<typeof portalFormSchema>

// ── Helpers ───────────────────────────────────────────────────────────────────
function defaultConfig(type: string) {
  const defaults: Record<string, Partial<ReturnType<typeof defaultConfig>>> = {
    PAID_ACCESS: { welcomeText: 'Escolha seu Plano',    subtitle: 'Selecione o melhor plano para navegar', buttonText: 'Ver Planos' },
    LOGIN_CPF:   { welcomeText: 'Acesse o WiFi',         subtitle: 'Digite seu CPF para continuar',          buttonText: 'Acessar Internet' },
    ISP_LOGIN:   { welcomeText: 'Login via Provedor',    subtitle: 'Clientes têm acesso imediato à internet', buttonText: 'Verificar e Conectar' },
    FREE_ACCESS: { welcomeText: 'WiFi Grátis',           subtitle: 'Acesso gratuito disponível',              buttonText: 'Conectar à Internet' },
  }
  const d = defaults[type] ?? {}
  return {
    welcomeText:     String(d.welcomeText     ?? 'WiFi Grátis'),
    subtitle:        String(d.subtitle        ?? 'Preencha seus dados para acessar a internet'),
    buttonText:      String(d.buttonText      ?? 'Conectar à Internet'),
    termsText:       'Ao conectar você concorda com os termos de uso da rede WiFi.',
    primaryColor:    '#10b981',
    backgroundColor: '#ffffff',
    buttonColor:     '#10b981',
    textColor:       '#111111',
    logoUrl:         '',
    showCpf:         true,
    showEmail:       true,
    showPhone:       true,
    showSuspendedInvoice: false,
  }
}

function portalToForm(p: CaptivePortal): PortalForm {
  return {
    name:       p.name,
    type:       p.type,
    campaignId: p.campaignId ?? '',
    config: {
      welcomeText:     String(p.config.welcomeText     ?? ''),
      subtitle:        String(p.config.subtitle        ?? ''),
      buttonText:      String(p.config.buttonText      ?? 'Conectar à Internet'),
      termsText:       String(p.config.termsText       ?? ''),
      primaryColor:    String(p.config.primaryColor    ?? '#10b981'),
      backgroundColor: String(p.config.backgroundColor ?? '#ffffff'),
      buttonColor:     String(p.config.buttonColor     ?? '#10b981'),
      textColor:       String(p.config.textColor       ?? '#111111'),
      logoUrl:         String(p.config.logoUrl         ?? ''),
      showCpf:         p.config.showCpf   !== false,
      showEmail:       p.config.showEmail !== false,
      showPhone:       p.config.showPhone !== false,
      showSuspendedInvoice: p.config.showSuspendedInvoice === true,
    },
  }
}

// ── Portal Preview — espelha exatamente o portal real ─────────────────────────
function PortalPreview({ type, config }: { type: string; config: PortalForm['config'] }) {
  const cardBg = config.backgroundColor || '#ffffff'
  const btn    = config.buttonColor     || '#10b981'
  const pri    = config.primaryColor    || '#10b981'  // fundo da página

  return (
    <div className="relative mx-auto" style={{ width: 260 }}>
      <div
        className="rounded-[2rem] border-[6px] border-neutral-700 overflow-hidden shadow-2xl"
        style={{ width: 260, height: 520 }}
      >
        {/* Status bar */}
        <div className="flex justify-between items-center px-4 py-1" style={{ backgroundColor: pri }}>
          <span className="text-[9px] text-white font-medium">9:41</span>
          <div className="w-3 h-2 rounded-sm border border-white/60 relative">
            <div className="absolute inset-[1px] right-[2px] bg-white/60 rounded-sm" />
          </div>
        </div>

        {/* Fundo colorido = primaryColor */}
        <div className="flex flex-col items-center overflow-y-auto" style={{ height: 485, backgroundColor: pri, padding: '16px 12px 12px' }}>

          {/* Header (texto branco sobre fundo colorido) */}
          <div className="flex flex-col items-center gap-1.5 text-center mb-3">
            {config.logoUrl ? (
              <img src={config.logoUrl} alt="" className="h-8 object-contain" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
            ) : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <Wifi className="w-4 h-4 text-white" />
              </div>
            )}
            <p className="text-sm font-bold text-white leading-tight">
              {config.welcomeText || 'WiFi Grátis'}
            </p>
            {config.subtitle && (
              <p className="text-[9px] text-white/75 leading-tight">{config.subtitle}</p>
            )}
          </div>

          {/* Card branco com sombra */}
          <div className="w-full rounded-xl p-3 space-y-2" style={{ backgroundColor: cardBg, boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}>
            {type === 'LEAD_CAPTURE' && (
              <>
                <MiniField label="Nome *" placeholder="Seu nome" />
                {config.showCpf   && <MiniField label="CPF"     placeholder="000.000.000-00" />}
                {config.showEmail && <MiniField label="Email"    placeholder="seu@email.com" />}
                {config.showPhone && <MiniField label="Telefone" placeholder="(00) 00000-0000" />}
                <MiniButton text={config.buttonText || 'Conectar'} color={btn} />
              </>
            )}
            {type === 'LOGIN_CPF' && (
              <>
                <MiniField label="Seu CPF" placeholder="Apenas números" />
                <MiniButton text={config.buttonText || 'Acessar Internet'} color={btn} />
              </>
            )}
            {type === 'PAID_ACCESS' && (
              <>
                <p className="text-[9px] font-bold text-gray-800">24:00 HORAS DE INTERNET</p>
                <p className="text-[9px] text-gray-400">1 dia de acesso</p>
                <p className="text-sm font-bold text-gray-800">R$ 10,00</p>
                <MiniButton text="Continuar" color={btn} />
              </>
            )}
            {type === 'FREE_ACCESS' && (
              <>
                <p className="text-[9px] text-center text-gray-400">Acesso gratuito disponível</p>
                <MiniButton text={config.buttonText || 'Conectar'} color={btn} />
              </>
            )}
            {type === 'ISP_LOGIN' && (
              <>
                <p className="text-[8px] font-bold text-gray-700 text-center mb-1">Você já é cliente do provedor?</p>
                <div className="h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: btn }}>
                  <span className="text-[8px] font-semibold text-white">✓ Sim, sou cliente</span>
                </div>
                <div className="h-7 rounded-lg flex items-center justify-center border border-gray-200 mt-1">
                  <span className="text-[8px] font-semibold text-gray-500">+ Não, quero me cadastrar</span>
                </div>
                <p className="text-[7px] text-center text-gray-400 mt-0.5 leading-tight">
                  Clientes com contrato ativo têm acesso imediato.
                </p>
              </>
            )}
          </div>

          {/* Terms */}
          <p className="text-[8px] text-center px-1 mt-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Ao conectar você concorda com os Termos de Uso
          </p>
        </div>
      </div>
    </div>
  )
}

function MiniField({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      <p className="text-[8px] text-gray-500 mb-0.5">{label}</p>
      <div className="h-6 rounded border border-gray-200 px-2 flex items-center">
        <span className="text-[8px] text-gray-300">{placeholder}</span>
      </div>
    </div>
  )
}

function MiniButton({ text, color }: { text: string; color: string }) {
  return (
    <div className="h-7 rounded-lg flex items-center justify-center mt-1" style={{ backgroundColor: color }}>
      <span className="text-[9px] font-semibold text-white truncate px-2">{text}</span>
    </div>
  )
}

// ── Modal base ────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, maxWidth = 'max-w-lg' }: {
  title: string; onClose: () => void; children: React.ReactNode; maxWidth?: string
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`bg-[#141920] border border-white/10 rounded-xl w-full ${maxWidth} shadow-2xl flex flex-col max-h-[92vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>,
    document.body
  )
}

// ── Portal form (create / edit) ───────────────────────────────────────────────
function PortalFormModal({ portal, companyId, onClose }: {
  portal?: CaptivePortal; companyId: string; onClose: () => void
}) {
  const qc   = useQueryClient()
  const isEdit = !!portal

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns', companyId],
    queryFn: () => campaignsApi.list(companyId),
    enabled: !!companyId,
    select: (data: Campaign[]) => data.filter(c => c.active),
  })

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<PortalForm>({
    resolver: zodResolver(portalFormSchema),
    defaultValues: portal ? portalToForm(portal) : {
      name: '', type: 'LEAD_CAPTURE', campaignId: '', config: defaultConfig('LEAD_CAPTURE'),
    },
  })

  const watchedType   = watch('type')
  const watchedConfig = useWatch({ control, name: 'config' })

  const save = useMutation({
    mutationFn: (data: PortalForm) => {
      const payload = {
        name: data.name, type: data.type,
        campaignId: data.campaignId ? data.campaignId as any : null,
        config: data.config as Record<string, unknown>,
      }
      return isEdit
        ? portalsApi.update(companyId, portal!.id, payload)
        : portalsApi.create(companyId, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portals', companyId] })
      toast.success(isEdit ? 'Portal atualizado' : 'Portal criado')
      onClose()
    },
    onError: () => toast.error('Erro ao salvar portal'),
  })

  return (
    <Modal title={isEdit ? `Editar — ${portal!.name}` : 'Novo Portal'} onClose={onClose} maxWidth="max-w-5xl">
      <form onSubmit={handleSubmit((d) => save.mutate(d))} className="flex h-full">

        {/* ── Left: form ── */}
        <div className="flex-1 px-6 py-5 space-y-5 overflow-y-auto border-r border-white/5">

          {/* Nome + tipo */}
          <div className={sectionCls}>
            <p className={labelCls}>Identificação</p>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Nome do portal</label>
              <input {...register('name')} className={inputCls} placeholder="Ex: Portal Hotel Recepção" autoFocus />
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
            </div>
            {!isEdit && (
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {PORTAL_TYPES.map(({ value, label, icon: Icon, description }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setValue('type', value)
                        setValue('config', defaultConfig(value) as PortalForm['config'])
                      }}
                      className={cn(
                        'px-3 py-2.5 rounded-lg border text-left transition-all',
                        watchedType === value
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : 'border-white/10 bg-[#1a2130] hover:border-white/20'
                      )}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Icon className={cn('w-3 h-3', watchedType === value ? 'text-emerald-400' : 'text-neutral-500')} />
                        <p className={cn('text-xs font-medium', watchedType === value ? 'text-emerald-400' : 'text-white')}>
                          {label}
                        </p>
                      </div>
                      <p className="text-[10px] text-neutral-500 leading-tight">{description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Textos */}
          <div className={sectionCls}>
            <p className={labelCls}>Textos</p>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Título principal</label>
              <input {...register('config.welcomeText')} className={inputCls} placeholder="WiFi Grátis" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Subtítulo</label>
              <input {...register('config.subtitle')} className={inputCls} placeholder="Preencha seus dados para acessar..." />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Texto do botão</label>
              <input {...register('config.buttonText')} className={inputCls} placeholder="Conectar à Internet" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Termos de uso</label>
              <textarea
                {...register('config.termsText')}
                className={cn(inputCls, 'h-16 py-2 resize-none')}
                placeholder="Ao conectar você concorda com..."
              />
            </div>
          </div>

          {/* Cores */}
          <div className={sectionCls}>
            <p className={labelCls}>Cores</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                ['config.backgroundColor', 'Fundo'],
                ['config.primaryColor',    'Cor primária'],
                ['config.buttonColor',     'Botão'],
                ['config.textColor',       'Texto'],
              ] as const).map(([field, label]) => (
                <label key={field} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#1a2130] border border-white/10 cursor-pointer hover:border-white/20 transition-colors">
                  <span className="text-xs text-neutral-300">{label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md border border-white/20" style={{ backgroundColor: watchedConfig?.[field.split('.')[1] as keyof typeof watchedConfig] as string }} />
                    <input type="color" {...register(field)} className="w-0 h-0 opacity-0 absolute" />
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Logo */}
          <div className={sectionCls}>
            <p className={labelCls}>Logo</p>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">URL do logo</label>
              <input {...register('config.logoUrl')} className={inputCls} placeholder="https://..." />
            </div>
          </div>

          {/* Campanha vinculada */}
          <div className={sectionCls}>
            <p className={labelCls}>
              <span className="inline-flex items-center gap-1.5">
                <Megaphone className="w-3 h-3" /> Campanha vinculada
              </span>
            </p>
            <select {...register('campaignId')} className={cn(inputCls, 'cursor-pointer')}>
              <option value="">Nenhuma — ir direto ao portal</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p className="text-[10px] text-neutral-600">
              A campanha será exibida em fullscreen antes do portal captive.
            </p>
          </div>

          {/* Aviso ISP_LOGIN */}
          {watchedType === 'ISP_LOGIN' && (
            <div className={sectionCls}>
              <p className={labelCls}>Integração ERP</p>
              <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <Building2 className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Este portal verifica o CPF/CNPJ do cliente no ERP configurado em{' '}
                  <span className="text-orange-400 font-medium">Configurações → Integrações</span>.
                  Sem integração ativa, nenhum acesso será liberado.
                </p>
              </div>

              <p className={labelCls} style={{ marginTop: 8 }}>Comportamento para contratos suspensos</p>
              <label className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#1a2130] border border-white/10 cursor-pointer hover:border-white/20 transition-colors">
                <div>
                  <span className="text-sm text-neutral-300 block">Exibir QR code de fatura</span>
                  <span className="text-[10px] text-neutral-500">Mostra QR PIX para o cliente pagar e reconectar</span>
                </div>
                <div className="relative shrink-0 ml-3">
                  <input type="checkbox" {...register('config.showSuspendedInvoice')} className="sr-only peer" />
                  <div className="w-9 h-5 rounded-full bg-neutral-700 peer-checked:bg-emerald-500 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-4 shadow-sm" />
                </div>
              </label>
            </div>
          )}

          {/* Campos LEAD_CAPTURE */}
          {watchedType === 'LEAD_CAPTURE' && (
            <div className={sectionCls}>
              <p className={labelCls}>Campos do formulário</p>
              <p className="text-xs text-neutral-500 -mt-1">Nome é sempre obrigatório.</p>
              {([
                ['config.showCpf',   'Campo CPF'],
                ['config.showEmail', 'Campo E-mail'],
                ['config.showPhone', 'Campo Telefone'],
              ] as const).map(([field, label]) => (
                <label key={field} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#1a2130] border border-white/10 cursor-pointer hover:border-white/20 transition-colors">
                  <span className="text-sm text-neutral-300">{label}</span>
                  <div className="relative">
                    <input type="checkbox" {...register(field)} className="sr-only peer" />
                    <div className="w-9 h-5 rounded-full bg-neutral-700 peer-checked:bg-emerald-500 transition-colors" />
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-4 shadow-sm" />
                  </div>
                </label>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={save.isPending}
            className="w-full h-10 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {save.isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar portal'}
          </button>
        </div>

        {/* ── Right: preview ── */}
        <div className="w-80 shrink-0 px-6 py-5 flex flex-col items-center gap-4 bg-[#0C1117]">
          <div className="flex items-center gap-2 self-start">
            <Eye className="w-4 h-4 text-neutral-500" />
            <p className="text-xs text-neutral-500 uppercase tracking-wider">Preview</p>
          </div>
          <PortalPreview type={watchedType} config={watchedConfig ?? defaultConfig(watchedType) as PortalForm['config']} />
          <p className="text-[10px] text-neutral-600 text-center">Atualiza em tempo real</p>
        </div>
      </form>
    </Modal>
  )
}

// ── Leads modal ───────────────────────────────────────────────────────────────
function LeadsModal({ portal, companyId, onClose }: {
  portal: CaptivePortal; companyId: string; onClose: () => void
}) {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', portal.id],
    queryFn: () => portalsApi.leads(companyId, portal.id),
  })

  function exportCsv() {
    const headers = ['Nome', 'CPF', 'E-mail', 'Telefone', 'MAC', 'IP', 'Data']
    const rows = leads.map(l => [
      l.name ?? '', l.cpf ?? '', l.email ?? '', l.phone ?? '',
      l.macAddress ?? '', l.ipAddress ?? '',
      new Date(l.createdAt).toLocaleString('pt-BR'),
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `leads-${portal.name}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Modal title={`Leads — ${portal.name}`} onClose={onClose} maxWidth="max-w-3xl">
      <div className="px-6 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-400">{leads.length} registro{leads.length !== 1 ? 's' : ''}</p>
          {leads.length > 0 && (
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 h-8 px-3 text-xs border border-white/10 text-neutral-300 hover:bg-white/5 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />)}
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Users className="w-10 h-10 text-neutral-700 mb-3" />
            <p className="text-sm text-neutral-400">Nenhum lead coletado ainda</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  {['Nome', 'CPF', 'E-mail', 'Telefone', 'MAC', 'Data'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-neutral-500 font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-white font-medium">{l.name || '—'}</td>
                    <td className="px-4 py-2.5 text-neutral-400 font-mono">{l.cpf || '—'}</td>
                    <td className="px-4 py-2.5 text-neutral-400">{l.email || '—'}</td>
                    <td className="px-4 py-2.5 text-neutral-400">{l.phone || '—'}</td>
                    <td className="px-4 py-2.5 text-neutral-600 font-mono text-[10px]">{l.macAddress || '—'}</td>
                    <td className="px-4 py-2.5 text-neutral-500">
                      {new Date(l.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Delete confirm ────────────────────────────────────────────────────────────
function DeletePortalModal({ portal, onConfirm, onClose, isPending }: {
  portal: CaptivePortal; onConfirm: () => void; onClose: () => void; isPending: boolean
}) {
  return (
    <Modal title="Remover Portal" onClose={onClose} maxWidth="max-w-sm">
      <div className="px-6 py-5 space-y-4">
        <div className="flex items-start gap-3 px-3 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-300 font-medium">Ação irreversível</p>
            <p className="text-xs text-red-400/80 mt-0.5">
              O portal será desativado e desvinculado de todos os dispositivos.
            </p>
          </div>
        </div>
        <div className="bg-[#0C1117] border border-white/10 rounded-lg px-4 py-3">
          <p className="text-xs text-neutral-500 mb-0.5">Portal</p>
          <p className="text-sm text-white font-medium">{portal.name}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={isPending} className="flex-1 h-10 border border-white/10 text-neutral-300 hover:bg-white/5 text-sm rounded-lg transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={isPending} className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Remover
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Portal card ───────────────────────────────────────────────────────────────
const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'http://localhost:3001'

function PreviewButton({ companyId, portalId }: { companyId: string; portalId: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${PORTAL_URL}/${companyId}/${portalId}?preview=1&mac=AA:BB:CC:DD:EE:FF&ip=192.168.1.100`

  function copy() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-1">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title="Abrir preview"
        className="flex-1 flex items-center justify-center gap-1.5 h-8 text-xs text-neutral-300 hover:bg-white/5 rounded-lg transition-colors"
      >
        <ExternalLink className="w-3 h-3" /> Preview
      </a>
      <button onClick={copy} title="Copiar URL" className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  )
}

function PortalCard({ portal, companyId, onEdit, onDelete }: {
  portal: CaptivePortal
  companyId: string
  onEdit: () => void
  onDelete: () => void
}) {
  const qc     = useQueryClient()
  const meta   = PORTAL_TYPES.find(t => t.value === portal.type)
  const Icon   = meta?.icon ?? Globe
  const colors = TYPE_COLOR[portal.type] ?? TYPE_COLOR.FREE_ACCESS

  const toggle = useMutation({
    mutationFn: () => portalsApi.toggle(companyId, portal.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portals', companyId] }),
    onError: () => toast.error('Erro ao alterar status'),
  })

  return (
    <div className={cn('bg-[#141920] border rounded-xl p-4 flex flex-col gap-3 transition-all', portal.active ? 'border-white/5 hover:border-white/10' : 'border-white/[0.03] opacity-60')}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center border', colors)}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{portal.name}</p>
            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded border', colors)}>
              {meta?.label ?? portal.type}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {portal.isDefault && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-700 text-neutral-400 border border-white/10">
              Padrão
            </span>
          )}
          <button
            onClick={() => toggle.mutate()}
            disabled={toggle.isPending}
            title={portal.active ? 'Desativar' : 'Ativar'}
            className={cn('p-1.5 rounded-lg transition-colors', portal.active ? 'text-emerald-400 hover:bg-red-500/10 hover:text-red-400' : 'text-neutral-600 hover:bg-emerald-500/10 hover:text-emerald-400')}
          >
            {toggle.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : portal.active ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <p className="text-xs text-neutral-500 leading-relaxed">{meta?.description ?? ''}</p>

      {/* Color preview strip */}
      <div className="flex gap-1.5">
        {['backgroundColor', 'primaryColor', 'buttonColor'].map(key => (
          <div key={key} title={key} className="w-5 h-5 rounded-md border border-white/10" style={{ backgroundColor: portal.config[key] as string ?? '#ccc' }} />
        ))}
      </div>

      {/* Actions */}
      <div className="pt-1 border-t border-white/5 space-y-1">
        <PreviewButton companyId={companyId} portalId={portal.id} />
        <div className="flex gap-1">
          <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1.5 h-8 text-xs text-neutral-300 hover:bg-white/5 rounded-lg transition-colors">
            <Pencil className="w-3 h-3" /> Editar
          </button>
          {!portal.isDefault && (
            <button onClick={onDelete} className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PortalsPage() {
  const activeCompany = useCompanyStore((s) => s.activeCompany)
  const companyId     = activeCompany?.id ?? ''
  const qc            = useQueryClient()

  const [modal, setModal] = useState<
    'create' | { edit: CaptivePortal } | { delete: CaptivePortal } | null
  >(null)

  const { data: portals = [], isLoading } = useQuery({
    queryKey: ['portals', companyId],
    queryFn: () => portalsApi.list(companyId),
    enabled: !!companyId,
  })

  const remove = useMutation({
    mutationFn: (id: string) => portalsApi.delete(companyId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portals', companyId] }); toast.success('Portal removido'); setModal(null) },
    onError: (e: any) => toast.error(e?.response?.data ?? 'Erro ao remover portal'),
  })

  if (!activeCompany) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Globe className="w-12 h-12 text-neutral-700 mb-4" />
      <p className="text-sm font-medium text-neutral-400">Nenhuma empresa selecionada</p>
      <p className="text-xs text-neutral-600 mt-1">Use o seletor na sidebar</p>
    </div>
  )

  const active   = portals.filter(p => p.active)
  const inactive = portals.filter(p => !p.active)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Portais Captive</h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            <span className="text-white">{activeCompany.name}</span> · {active.length} ativo{active.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Novo Portal
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-44 bg-[#141920] rounded-xl animate-pulse border border-white/5" />)}
        </div>
      ) : portals.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Globe className="w-12 h-12 text-neutral-700 mb-4" />
          <p className="text-sm text-neutral-400">Nenhum portal criado</p>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">Ativos</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map(p => (
                  <PortalCard
                    key={p.id} portal={p} companyId={companyId}
                    onEdit={() => setModal({ edit: p })}
                    onDelete={() => setModal({ delete: p })}
                  />
                ))}
              </div>
            </div>
          )}
          {inactive.length > 0 && (
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">Inativos</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactive.map(p => (
                  <PortalCard
                    key={p.id} portal={p} companyId={companyId}
                    onEdit={() => setModal({ edit: p })}
                    onDelete={() => setModal({ delete: p })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {modal === 'create' && (
        <PortalFormModal companyId={companyId} onClose={() => setModal(null)} />
      )}
      {modal !== null && modal !== 'create' && 'edit' in modal && (
        <PortalFormModal portal={modal.edit} companyId={companyId} onClose={() => setModal(null)} />
      )}
      {modal !== null && modal !== 'create' && 'delete' in modal && (
        <DeletePortalModal
          portal={modal.delete}
          isPending={remove.isPending}
          onConfirm={() => remove.mutate(modal.delete.id)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
