'use client'

import { useState } from 'react'
import { useCompanyStore } from '@/store/company'
import {
  usePlans, useCreatePlan, useUpdatePlan, useTogglePlan, useDeletePlan,
} from '@/hooks/usePlans'
import {
  useVouchersByPlan, useGenerateVouchers, useDeleteVoucher,
} from '@/hooks/useVouchers'
import {
  Layers, Plus, Trash2, ToggleLeft, ToggleRight, Pencil, Ticket,
  Download, Loader2, X, Check, Zap, Clock,
} from 'lucide-react'
import type { HotspotPlan, HotspotVoucher } from '@/types'
import { cn } from '@/lib/utils'

function fmtDuration(min: number) {
  if (min < 60) return `${min}min`
  if (min % 60 === 0) return `${min / 60}h`
  return `${Math.floor(min / 60)}h${min % 60}min`
}
function fmtBandwidth(kbps: number) {
  return kbps >= 1024 ? `${kbps / 1024} Mbps` : `${kbps} Kbps`
}
function exportVoucherCsv(vouchers: HotspotVoucher[], planName: string) {
  const headers = ['Código', 'Utilizado', 'Data uso', 'MAC', 'Criado em']
  const rows = vouchers.map(v => [
    v.code,
    v.used ? 'Sim' : 'Não',
    v.usedAt ? new Date(v.usedAt).toLocaleString('pt-BR') : '',
    v.macAddress ?? '',
    new Date(v.createdAt).toLocaleString('pt-BR'),
  ])
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `vouchers-${planName}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ── PlanForm ──────────────────────────────────────────────────────────────────
interface PlanFormProps {
  initial?: Partial<HotspotPlan>
  onSubmit: (data: Partial<HotspotPlan>) => void
  onCancel: () => void
  loading?: boolean
}
function PlanForm({ initial, onSubmit, onCancel, loading }: PlanFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [durationMin, setDurationMin] = useState(String(initial?.durationMin ?? 60))
  const [bandwidthUp, setBandwidthUp] = useState(String(((initial?.bandwidthUp ?? 10240) / 1024)))
  const [bandwidthDown, setBandwidthDown] = useState(String(((initial?.bandwidthDown ?? 10240) / 1024)))
  const [price, setPrice] = useState(String(initial?.price ?? ''))
  const [isFree, setIsFree] = useState(initial?.isFree ?? false)
  const [hasCooldown, setHasCooldown] = useState((initial?.cooldownDays ?? 0) > 0)
  const [cooldownDays, setCooldownDays] = useState(String(initial?.cooldownDays ?? 1))

  function handle(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      name,
      description: description || undefined,
      durationMin: Number(durationMin),
      bandwidthUp: Number(bandwidthUp) * 1024,
      bandwidthDown: Number(bandwidthDown) * 1024,
      price: isFree ? 0 : Number(price),
      isFree,
      cooldownDays: isFree && hasCooldown ? Number(cooldownDays) : null,
    })
  }

  const field = 'w-full h-10 px-3 rounded-lg bg-[#0d1117] border border-white/10 focus:border-emerald-500 text-white placeholder:text-neutral-600 text-sm outline-none transition-colors'

  return (
    <form onSubmit={handle} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs text-neutral-400 mb-1">Nome *</label>
          <input className={field} value={name} onChange={e => setName(e.target.value)} required placeholder="Ex: Plano 1h" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-neutral-400 mb-1">Descrição <span className="text-neutral-600">(opcional)</span></label>
          <input className={field} value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve descrição para o cliente" />
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Duração (minutos) *</label>
          <input className={field} type="number" min={1} value={durationMin} onChange={e => setDurationMin(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Upload (Mbps)</label>
          <input className={field} type="number" min={1} value={bandwidthUp} onChange={e => setBandwidthUp(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Download (Mbps)</label>
          <input className={field} type="number" min={1} value={bandwidthDown} onChange={e => setBandwidthDown(e.target.value)} />
        </div>
        <div className="flex flex-col justify-end">
          <label className="block text-xs text-neutral-400 mb-1">Plano gratuito</label>
          <button
            type="button"
            onClick={() => setIsFree(v => !v)}
            className={cn(
              'h-10 w-full rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2',
              isFree
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : 'bg-[#0d1117] border-white/10 text-neutral-500 hover:border-white/20'
            )}
          >
            <span className={cn(
              'w-8 h-4 rounded-full transition-colors relative flex items-center',
              isFree ? 'bg-emerald-500' : 'bg-neutral-700'
            )}>
              <span className={cn(
                'w-3 h-3 bg-white rounded-full absolute transition-all',
                isFree ? 'left-[18px]' : 'left-[2px]'
              )} />
            </span>
            {isFree ? 'Gratuito' : 'Pago'}
          </button>
        </div>
        {!isFree && (
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Preço (R$) *</label>
            <input
              className={field}
              type="number"
              min={0.01}
              step={0.01}
              value={price}
              onChange={e => setPrice(e.target.value)}
              required
              placeholder="0,00"
            />
          </div>
        )}

        {/* Carência — apenas para planos gratuitos */}
        {isFree && (
          <div className="sm:col-span-2 rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Carência entre acessos</p>
                <p className="text-xs text-neutral-500 mt-0.5">Limita o mesmo dispositivo a usar este plano uma vez a cada X dias</p>
              </div>
              <button
                type="button"
                onClick={() => setHasCooldown(v => !v)}
                className={cn(
                  'w-10 h-5 rounded-full transition-colors relative flex items-center shrink-0',
                  hasCooldown ? 'bg-emerald-500' : 'bg-neutral-700'
                )}
              >
                <span className={cn(
                  'w-3.5 h-3.5 bg-white rounded-full absolute transition-all shadow-sm',
                  hasCooldown ? 'left-[22px]' : 'left-[3px]'
                )} />
              </button>
            </div>
            {hasCooldown && (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-neutral-400 mb-1">Intervalo (dias) *</label>
                  <input
                    className={field}
                    type="number"
                    min={1}
                    max={365}
                    value={cooldownDays}
                    onChange={e => setCooldownDays(e.target.value)}
                    required={hasCooldown}
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-4 shrink-0">
                  = 1 acesso gratuito a cada <strong className="text-white">{cooldownDays || '?'} dia{Number(cooldownDays) !== 1 ? 's' : ''}</strong>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 h-10 px-5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold text-sm rounded-lg transition-colors"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {initial?.id ? 'Salvar alterações' : 'Criar plano'}
        </button>
        <button type="button" onClick={onCancel} className="h-10 px-4 border border-white/10 hover:bg-white/5 text-neutral-300 text-sm rounded-lg transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  )
}

// ── VoucherPanel ──────────────────────────────────────────────────────────────
function VoucherPanel({ plan, companyId }: { plan: HotspotPlan; companyId: string }) {
  const [qty, setQty] = useState('10')

  const { data: vouchers = [], isLoading } = useVouchersByPlan(companyId, plan.id)
  const generate = useGenerateVouchers(companyId, plan.id)
  const del = useDeleteVoucher(companyId, plan.id)

  const unused = vouchers.filter(v => !v.used)
  const usedV = vouchers.filter(v => v.used)

  return (
    <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
          Vouchers · {unused.length} disponíveis / {usedV.length} usados
        </p>
        {vouchers.length > 0 && (
          <button
            onClick={() => exportVoucherCsv(vouchers, plan.name)}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          max={200}
          value={qty}
          onChange={e => setQty(e.target.value)}
          className="w-20 h-8 px-2 rounded-lg bg-[#0d1117] border border-white/10 focus:border-emerald-500 text-white text-sm outline-none"
        />
        <button
          onClick={() => generate.mutate(Number(qty))}
          disabled={generate.isPending}
          className="flex items-center gap-1.5 h-8 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {generate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Gerar
        </button>
      </div>

      {isLoading ? (
        <div className="h-8 bg-white/5 rounded animate-pulse" />
      ) : vouchers.length === 0 ? (
        <p className="text-xs text-neutral-600 py-2">Nenhum voucher gerado ainda.</p>
      ) : (
        <div className="max-h-48 overflow-y-auto rounded-lg border border-white/5 divide-y divide-white/5">
          {vouchers.map(v => (
            <div key={v.id} className="flex items-center justify-between px-3 py-2 hover:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <span className={cn('font-mono text-sm font-bold tracking-widest', v.used ? 'text-neutral-600 line-through' : 'text-white')}>
                  {v.code}
                </span>
                {v.used && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-500">
                    {v.usedAt ? new Date(v.usedAt).toLocaleDateString('pt-BR') : 'usado'}
                  </span>
                )}
              </div>
              {!v.used && (
                <button
                  onClick={() => del.mutate(v.id)}
                  disabled={del.isPending}
                  className="p-1 text-neutral-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── PlanCard ──────────────────────────────────────────────────────────────────
function PlanCard({ plan, companyId }: { plan: HotspotPlan; companyId: string }) {
  const [editing, setEditing] = useState(false)
  const [showVouchers, setShowVouchers] = useState(false)

  const toggle = useTogglePlan(companyId)
  const update = useUpdatePlan(companyId)
  const del = useDeletePlan(companyId)

  return (
    <div className={cn(
      'bg-[#141920] border rounded-xl p-5 transition-colors',
      plan.active ? 'border-white/5' : 'border-white/[0.03] opacity-60'
    )}>
      {editing ? (
        <PlanForm
          initial={plan}
          onSubmit={data => update.mutate({ planId: plan.id, data }, { onSuccess: () => setEditing(false) })}
          onCancel={() => setEditing(false)}
          loading={update.isPending}
        />
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-white truncate">{plan.name}</h3>
                {plan.isFree ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    GRATUITO
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                    R$ {Number(plan.price).toFixed(2)}
                  </span>
                )}
                {!plan.active && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-500 font-medium">INATIVO</span>
                )}
              </div>
              {plan.description && <p className="text-xs text-neutral-500 mt-0.5">{plan.description}</p>}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {plan.isFree && plan.cooldownDays && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                    Carência {plan.cooldownDays}d
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-neutral-400">
                  <Clock className="w-3.5 h-3.5" />{fmtDuration(plan.durationMin)}
                </span>
                <span className="flex items-center gap-1 text-xs text-neutral-400">
                  <Zap className="w-3.5 h-3.5" />↑{fmtBandwidth(plan.bandwidthUp)} ↓{fmtBandwidth(plan.bandwidthDown)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {!plan.isFree && (
                <button
                  onClick={() => setShowVouchers(v => !v)}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    showVouchers ? 'text-emerald-400 bg-emerald-500/10' : 'text-neutral-500 hover:text-white hover:bg-white/5'
                  )}
                  title="Vouchers"
                >
                  <Ticket className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setEditing(true)}
                className="p-2 text-neutral-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                title="Editar"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => toggle.mutate(plan.id)}
                disabled={toggle.isPending}
                className="p-2 text-neutral-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
                title={plan.active ? 'Desativar' : 'Ativar'}
              >
                {plan.active
                  ? <ToggleRight className="w-4 h-4 text-emerald-400" />
                  : <ToggleLeft className="w-4 h-4" />}
              </button>
              <button
                onClick={() => { if (confirm(`Excluir plano "${plan.name}"?`)) del.mutate(plan.id) }}
                disabled={del.isPending}
                className="p-2 text-neutral-600 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors disabled:opacity-50"
                title="Excluir"
              >
                {del.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {showVouchers && !plan.isFree && (
            <VoucherPanel plan={plan} companyId={companyId} />
          )}
        </>
      )}
    </div>
  )
}

// ── PlansPage ─────────────────────────────────────────────────────────────────
export default function PlansPage() {
  const activeCompany = useCompanyStore(s => s.activeCompany)
  const companyId = activeCompany?.id ?? ''
  const [creating, setCreating] = useState(false)

  const { data: plans = [], isLoading } = usePlans(companyId)
  const create = useCreatePlan(companyId)

  if (!activeCompany) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Layers className="w-12 h-12 text-neutral-700 mb-4" />
      <p className="text-sm font-medium text-neutral-400">Nenhuma empresa selecionada</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Planos</h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            <span className="text-white">{activeCompany.name}</span> · {plans.length} plano{plans.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setCreating(v => !v)}
          className="flex items-center gap-2 h-9 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm rounded-lg transition-colors"
        >
          {creating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {creating ? 'Cancelar' : 'Novo plano'}
        </button>
      </div>

      {creating && (
        <div className="bg-[#141920] border border-emerald-500/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-emerald-400 mb-4">Novo plano</h2>
          <PlanForm
            onSubmit={data => create.mutate(data, { onSuccess: () => setCreating(false) })}
            onCancel={() => setCreating(false)}
            loading={create.isPending}
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-[#141920] rounded-xl animate-pulse border border-white/5" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Layers className="w-12 h-12 text-neutral-700 mb-4" />
          <p className="text-sm font-medium text-neutral-400">Nenhum plano cadastrado</p>
          <p className="text-xs text-neutral-600 mt-1">Crie planos gratuitos ou pagos para seus portais</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => (
            <PlanCard key={plan.id} plan={plan} companyId={companyId} />
          ))}
        </div>
      )}
    </div>
  )
}
