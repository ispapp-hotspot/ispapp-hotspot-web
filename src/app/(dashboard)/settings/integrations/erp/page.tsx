'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { integrationApi } from '@/services/api'
import type { ErpType } from '@/types'
import { toast } from 'sonner'
import {
  Plug, CheckCircle2, AlertTriangle, Eye, EyeOff,
  Trash2, Loader2, Info, Terminal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ERP_OPTIONS: { value: ErpType; label: string; description: string; available: boolean }[] = [
  { value: 'SGP',     label: 'SGP',       description: 'Sistema de Gestão de Provedores',      available: true  },
  { value: 'IXC',     label: 'IXC Soft',  description: 'IXC Provedor de Serviços de Internet',  available: false },
  { value: 'MKAUTH',  label: 'MKAuth',    description: 'Sistema de Autenticação Mikrotik',      available: false },
  { value: 'BEESWEB', label: 'Beesweb',   description: 'Sistema de Gestão ISP',                available: false },
]

const inputCls = 'w-full h-11 px-3 rounded-lg bg-[#1a2130] border border-white/10 focus:border-emerald-500 text-white placeholder:text-neutral-600 text-sm outline-none transition-colors'
const labelCls = 'text-xs uppercase tracking-wider text-neutral-400 mb-1.5 block'

export default function IntegrationsPage() {
  const queryClient = useQueryClient()

  const { data: integration, isLoading } = useQuery({
    queryKey: ['isp-integration'],
    queryFn: () => integrationApi.get().catch((err: any) => {
      if (err?.response?.status === 404) return null
      throw err
    }),
  })

  const [erpType,   setErpType]   = useState<ErpType | ''>('')
  const [baseUrl,   setBaseUrl]   = useState('')
  const [token,     setToken]     = useState('')
  const [showToken, setShowToken] = useState(false)
  const [errors,    setErrors]    = useState<Record<string, string>>({})

  useEffect(() => {
    if (integration) {
      setErpType(integration.erpType)
      setBaseUrl(integration.baseUrl)
      setToken('')
    }
  }, [integration])

  const upsert = useMutation({
    mutationFn: (data: { erpType: ErpType; baseUrl: string; token: string }) =>
      integrationApi.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isp-integration'] })
      toast.success('Integração salva com sucesso.')
      setToken('')
    },
    onError: () => toast.error('Erro ao salvar integração.'),
  })

  const remove = useMutation({
    mutationFn: () => integrationApi.delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isp-integration'] })
      toast.success('Integração removida.')
      setErpType('')
      setBaseUrl('')
      setToken('')
    },
    onError: () => toast.error('Erro ao remover integração.'),
  })

  function validate() {
    const errs: Record<string, string> = {}
    if (!erpType)        errs.erpType = 'Selecione o ERP.'
    if (!baseUrl.trim()) errs.baseUrl  = 'Informe a URL base.'
    else { try { new URL(baseUrl) } catch { errs.baseUrl = 'URL inválida (ex: https://erp.seuprovedora.com.br).' } }
    if (!token.trim() && !integration) errs.token = 'Informe o token de autenticação.'
    return errs
  }

  function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    upsert.mutate({
      erpType: erpType as ErpType,
      baseUrl: baseUrl.trim(),
      token:   token.trim() || '***keep***',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrações</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Conecte seu ERP para ativar o portal <span className="text-emerald-400 font-medium">Login via Provedor</span>.
        </p>
      </div>

      {/* Status */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border text-sm w-full',
        !isLoading && integration
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
          : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
      )}>
        {!isLoading && integration
          ? <CheckCircle2 className="w-4 h-4 shrink-0" />
          : <AlertTriangle className="w-4 h-4 shrink-0" />
        }
        {isLoading
          ? 'Carregando...'
          : integration
            ? `Integração ativa — ${integration.erpType}`
            : 'Nenhuma integração configurada.'
        }
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── Form ── */}
        <div className="bg-[#141920] border border-white/5 rounded-2xl p-6 space-y-5">
          <p className="text-sm font-semibold text-white">Configurar ERP</p>

          {/* ERP selector */}
          <div>
            <p className={labelCls}>Tipo de ERP</p>
            <div className="grid grid-cols-2 gap-2">
              {ERP_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={!opt.available}
                  onClick={() => opt.available && setErpType(opt.value)}
                  className={cn(
                    'flex flex-col gap-1 p-3 rounded-xl border text-left transition-all',
                    !opt.available && 'opacity-40 cursor-not-allowed',
                    erpType === opt.value
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  )}
                >
                  <span className={cn('text-sm font-semibold', erpType === opt.value ? 'text-emerald-400' : 'text-white')}>
                    {opt.label}
                    {!opt.available && (
                      <span className="ml-1.5 text-xs font-normal text-neutral-500">Em breve</span>
                    )}
                  </span>
                  <span className="text-xs text-neutral-500 leading-snug">{opt.description}</span>
                </button>
              ))}
            </div>
            {errors.erpType && <p className="text-xs text-red-400 mt-1.5">{errors.erpType}</p>}
          </div>

          {/* Base URL */}
          <div>
            <label className={labelCls}>URL Base da API</label>
            <input
              type="url"
              className={inputCls}
              placeholder="https://erp.seuprovedora.com.br"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
            />
            {errors.baseUrl && <p className="text-xs text-red-400 mt-1.5">{errors.baseUrl}</p>}
          </div>

          {/* Token */}
          <div>
            <label className={labelCls}>
              Token de Autenticação
              {integration && (
                <span className="ml-2 text-neutral-600 normal-case tracking-normal">
                  (deixe em branco para manter atual)
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                className={cn(inputCls, 'pr-10')}
                placeholder={integration ? '••••••••• (sem alteração)' : '••••••••••••••••'}
                value={token}
                onChange={e => setToken(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
              <button
                type="button"
                onClick={() => setShowToken(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.token && <p className="text-xs text-red-400 mt-1.5">{errors.token}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSubmit}
              disabled={upsert.isPending}
              className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {upsert.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {upsert.isPending ? 'Salvando...' : integration ? 'Atualizar Integração' : 'Conectar ERP'}
            </button>
            {integration && (
              <button
                onClick={() => { if (confirm('Remover a integração ERP?')) remove.mutate() }}
                disabled={remove.isPending}
                className="h-11 px-4 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
              >
                {remove.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Trash2 className="w-4 h-4" />
                }
              </button>
            )}
          </div>
        </div>

        {/* ── Right column: info + SGP setup ── */}
        <div className="space-y-4">

          {/* SGP app name notice */}
          <div className="bg-[#141920] border border-orange-500/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-orange-400 shrink-0" />
              <p className="text-sm font-semibold text-white">Configuração no SGP</p>
            </div>

            {/* Path */}
            <div className="space-y-1.5">
              <p className="text-xs text-neutral-500 uppercase tracking-wider">Caminho no painel</p>
              <div className="flex flex-wrap items-center gap-1 text-xs">
                {['Administração', 'Integrações', 'Tokens', 'Adicionar Token'].map((step, i, arr) => (
                  <span key={step} className="flex items-center gap-1">
                    <span className="px-2 py-1 rounded bg-[#0C1117] border border-white/10 text-neutral-300 font-medium">
                      {step}
                    </span>
                    {i < arr.length - 1 && <span className="text-neutral-600">›</span>}
                  </span>
                ))}
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-2">
              <p className="text-xs text-neutral-500 uppercase tracking-wider">Preencher assim</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#0C1117] border border-white/10">
                  <span className="text-xs text-neutral-500 w-24 shrink-0">Descrição</span>
                  <code className="text-white font-mono text-sm">IspApp</code>
                </div>
                <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-[#0C1117] border border-emerald-500/30">
                  <span className="text-xs text-neutral-500 w-24 shrink-0 pt-0.5">Aplicações</span>
                  <div>
                    <code className="text-emerald-400 font-mono text-sm font-semibold">ispapp</code>
                    <p className="text-xs text-neutral-600 mt-0.5">Selecione apenas este item na lista — nenhum outro.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#0C1117] border border-white/10">
                  <span className="text-xs text-neutral-500 w-24 shrink-0">Token</span>
                  <span className="text-xs text-neutral-400">Cole o valor gerado no campo Token acima</span>
                </div>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-[#141920] border border-white/5 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-sm font-semibold text-white">Como funciona</p>
            </div>
            <ol className="space-y-2 text-sm text-neutral-400 list-decimal list-inside leading-relaxed">
              <li>Configure a integração com o ERP ao lado</li>
              <li>
                Crie um portal do tipo{' '}
                <span className="text-emerald-400 font-medium">Login via Provedor</span>{' '}
                na tela de Portais
              </li>
              <li>Vincule o portal a um dispositivo Mikrotik</li>
              <li>
                O cliente digita o CPF/CNPJ — o sistema consulta o ERP e verifica
                se há contrato ativo
              </li>
              <li>Acesso liberado automaticamente para clientes adimplentes</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
