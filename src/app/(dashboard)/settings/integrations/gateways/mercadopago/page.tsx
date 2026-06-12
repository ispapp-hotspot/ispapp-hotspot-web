'use client'

import { useState, useEffect } from 'react'
import { usePaymentGateways, useActivateGateway, useUpsertGateway, useValidateGateway, useDeleteGateway } from '@/hooks/useIntegrations'
import { useCompanyStore } from '@/store/company'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle,
  ChevronLeft, Trash2, ShieldCheck, ExternalLink, Copy, Check, Link2, FlaskConical,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const inputCls = 'w-full h-11 px-3 rounded-lg bg-[#1a2130] border border-white/10 focus:border-emerald-500 text-white placeholder:text-neutral-600 text-sm outline-none transition-colors font-mono'
const labelCls = 'text-xs uppercase tracking-wider text-neutral-400 mb-1.5 block'

export default function MercadoPagoPage() {
  const activeCompany = useCompanyStore(s => s.activeCompany)
  const companyId = activeCompany?.id ?? ''

  const { data: gateways = [], isLoading } = usePaymentGateways(companyId)
  const gateway = gateways.find(g => g.gatewayType === 'MERCADO_PAGO') ?? null

  const activate  = useActivateGateway(companyId)
  const save      = useUpsertGateway(companyId)
  const { data: validateData, refetch: testCreds, isFetching: testPending } = useValidateGateway(companyId)

  const [copied, setCopied] = useState(false)
  const [publicKey,   setPublicKey]   = useState('')
  const [secretToken, setSecretToken] = useState('')
  const [showSecret,  setShowSecret]  = useState(false)
  const [errors,      setErrors]      = useState<Record<string, string>>({})

  useEffect(() => {
    if (gateway) {
      setPublicKey(gateway.publicKey ?? '')
      setSecretToken('')
    } else {
      setPublicKey('')
      setSecretToken('')
    }
  }, [gateway, companyId])

  const remove = useDeleteGateway(companyId)

  function validate() {
    const errs: Record<string, string> = {}
    if (!publicKey.trim())               errs.publicKey   = 'Informe a Public Key.'
    if (!secretToken.trim() && !gateway) errs.secretToken = 'Informe o Secret Token.'
    return errs
  }

  function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    save.mutate({ publicKey: publicKey.trim(), secretToken: secretToken.trim(), gatewayType: 'MERCADO_PAGO' }, { onSuccess: () => setSecretToken('') })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/settings/integrations/gateways"
          className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Gateways
        </Link>
        <span className="text-neutral-700">/</span>
        <span className="text-sm text-white font-medium">Mercado Pago</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-base shrink-0"
            style={{ backgroundColor: '#009EE320', color: '#009EE3' }}>
            MP
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Mercado Pago</h1>
            <p className="text-sm text-neutral-400 mt-0.5">
              Checkout Transparente — Cartão de crédito e Pix
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {gateway?.isActive ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Gateway Ativo
            </span>
          ) : gateway ? (
            <button
              onClick={() => activate.mutate('MERCADO_PAGO')}
              disabled={activate.isPending}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 transition-all"
            >
              {activate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Definir como ativo
            </button>
          ) : null}
        </div>
      </div>

      {/* Status */}
      {!isLoading && companyId && (
        <div className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl border text-sm',
          gateway?.isActive
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            : gateway
            ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
        )}>
          {gateway?.isActive ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {gateway?.isActive
            ? 'Gateway ativo. Pagamentos via Pix habilitados nos portais.'
            : gateway
            ? 'Integração configurada, mas não está como gateway ativo. Clique em "Definir como ativo" para habilitar pagamentos.'
            : 'Sem integração. Configure as chaves abaixo para habilitar pagamentos.'
          }
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Form */}
        <div className="bg-[#141920] border border-white/5 rounded-2xl p-6 space-y-5">
          <p className="text-sm font-semibold text-white">Credenciais</p>

          {/* Public Key */}
          <div>
            <label className={labelCls}>Public Key</label>
            <input
              className={inputCls}
              placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={publicKey}
              onChange={e => setPublicKey(e.target.value)}
              disabled={!companyId}
            />
            {errors.publicKey && <p className="text-xs text-red-400 mt-1.5">{errors.publicKey}</p>}
            <p className="text-xs text-neutral-600 mt-1.5">
              Usada no frontend para tokenizar dados do cartão com segurança.
            </p>
          </div>

          {/* Secret Token */}
          <div>
            <label className={labelCls}>
              Secret Token (Access Token)
              {gateway && (
                <span className="ml-2 text-neutral-600 normal-case tracking-normal">
                  — deixe em branco para manter atual
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                className={cn(inputCls, 'pr-10')}
                placeholder={gateway ? '••••••••• (sem alteração)' : 'APP_USR-xxxx-xxxx-xxxx-xxxx'}
                value={secretToken}
                onChange={e => setSecretToken(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                disabled={!companyId}
              />
              <button
                type="button"
                onClick={() => setShowSecret(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.secretToken && <p className="text-xs text-red-400 mt-1.5">{errors.secretToken}</p>}
            <p className="text-xs text-neutral-600 mt-1.5">
              Armazenado com criptografia AES-256-GCM. Nunca exibido após salvo.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSubmit}
              disabled={save.isPending || !companyId}
              className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {save.isPending ? 'Salvando...' : gateway ? 'Atualizar' : 'Salvar'}
            </button>
            {gateway && (
              <button
                onClick={() => testCreds()}
                disabled={testPending}
                title="Testar credenciais no Mercado Pago"
                className="h-11 px-4 border border-white/10 text-neutral-400 hover:bg-white/5 hover:text-white rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
              >
                {testPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                Testar
              </button>
            )}
            {gateway && (
              <button
                onClick={() => { if (confirm('Remover integração com Mercado Pago?')) remove.mutate('MERCADO_PAGO', { onSuccess: () => { setPublicKey(''); setSecretToken('') } }) }}
                disabled={remove.isPending}
                className="h-11 px-4 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
              >
                {remove.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Right: Security info + where to get keys */}
        <div className="space-y-4">

          {/* Security notice */}
          <div className="bg-[#141920] border border-emerald-500/20 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-sm font-semibold text-white">Segurança das credenciais</p>
            </div>
            <ul className="space-y-2 text-sm text-neutral-400 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5 shrink-0">•</span>
                O Secret Token é criptografado com <span className="text-white font-medium">AES-256-GCM</span> antes de ser armazenado.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5 shrink-0">•</span>
                Nunca é retornado pela API — apenas decriptado no servidor no momento do pagamento.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5 shrink-0">•</span>
                A Public Key é segura para uso no frontend (tokenização do cartão).
              </li>
            </ul>
          </div>

          {/* Where to get keys */}
          <div className="bg-[#141920] border border-white/5 rounded-2xl p-5 space-y-4">
            <p className="text-sm font-semibold text-white">Onde obter as chaves</p>
            <div className="space-y-2">
              {[
                ['1', 'Acesse', 'mercadopago.com.br/developers'],
                ['2', 'Vá em', 'Suas integrações → Criar aplicação'],
                ['3', 'Em', 'Credenciais de produção, copie a Public Key e o Access Token'],
              ].map(([step, prefix, desc]) => (
                <div key={step} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-[#0C1117] border border-white/[0.06]">
                  <span className="text-xs font-bold text-emerald-400 w-4 shrink-0 mt-0.5">{step}</span>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    <span className="text-neutral-500">{prefix} </span>
                    <span className="text-neutral-200">{desc}</span>
                  </p>
                </div>
              ))}
            </div>
            <a
              href="https://www.mercadopago.com.br/developers/pt/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[#009EE3] hover:underline mt-1"
            >
              Documentação oficial do Mercado Pago
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Payment methods */}
          <div className="bg-[#141920] border border-white/5 rounded-2xl p-5 space-y-3">
            <p className="text-sm font-semibold text-white">Meios de pagamento suportados</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Pix',              icon: '⚡', desc: 'Aprovação instantânea' },
                { label: 'Cartão de Crédito', icon: '💳', desc: 'Até 12x (taxas MP)' },
              ].map(m => (
                <div key={m.label} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#0C1117] border border-white/[0.06]">
                  <span className="text-base">{m.icon}</span>
                  <div>
                    <p className="text-xs font-medium text-white">{m.label}</p>
                    <p className="text-xs text-neutral-500">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Webhook URL */}
          <div className="bg-[#141920] border border-white/5 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-sm font-semibold text-white">URL do Webhook</p>
            </div>
            {gateway?.webhookUrl ? (
              <>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono text-emerald-300 bg-[#0C1117] border border-white/[0.06] rounded-lg px-3 py-2.5 break-all">
                    {gateway.webhookUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(gateway.webhookUrl)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all"
                    title="Copiar URL"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-neutral-400" />}
                  </button>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Configure esta URL no painel do Mercado Pago em{' '}
                  <span className="text-neutral-300">Notificações → IPN/Webhooks</span>.
                </p>
              </>
            ) : (
              <p className="text-xs text-neutral-500">Configure o gateway para exibir a URL.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
