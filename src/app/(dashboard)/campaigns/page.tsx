'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { campaignsApi } from '@/services/api'
import { useCompanyStore } from '@/store/company'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Megaphone, X, Loader2, Power, PowerOff, BarChart2, Pencil, Trash2, Image, Video } from 'lucide-react'
import type { Campaign } from '@/types'
import { cn } from '@/lib/utils'

const inputCls = 'w-full h-10 px-3 rounded-lg bg-[#1a2130] border border-white/10 focus:border-emerald-500 text-white placeholder:text-neutral-600 text-sm outline-none transition-colors'
const labelCls = 'text-xs uppercase tracking-wider text-neutral-400 mb-1.5 block'

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#141920] border border-white/10 rounded-xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body
  )
}

function CampaignRow({ campaign, companyId }: { campaign: Campaign; companyId: string }) {
  const qc     = useQueryClient()
  const router = useRouter()

  const toggle = useMutation({
    mutationFn: () => campaignsApi.toggle(companyId, campaign.id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['campaigns', companyId] }),
    onError:    () => toast.error('Erro'),
  })

  const remove = useMutation({
    mutationFn: () => campaignsApi.delete(companyId, campaign.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns', companyId] })
      toast.success('Campanha removida')
    },
    onError: () => toast.error('Erro ao remover'),
  })

  return (
    <div className={cn(
      'bg-[#141920] border rounded-xl px-5 py-4 flex items-center gap-4 transition-all',
      campaign.active ? 'border-white/5 hover:border-white/10' : 'border-white/[0.03] opacity-55'
    )}>
      {/* Icon */}
      <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
        <Megaphone className="w-4 h-4 text-orange-400" />
      </div>

      {/* Name + date */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{campaign.name}</p>
        <p className="text-xs text-neutral-500 mt-0.5">
          Criada em {new Date(campaign.createdAt).toLocaleDateString('pt-BR')}
        </p>
      </div>

      {/* Status badge */}
      <span className={cn(
        'text-[10px] font-semibold px-2.5 py-1 rounded-full border shrink-0',
        campaign.active
          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
          : 'text-neutral-500 bg-white/5 border-white/10'
      )}>
        {campaign.active ? 'Ativa' : 'Inativa'}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => router.push(`/campaigns/${campaign.id}`)}
          className="flex items-center gap-1.5 h-8 px-3 text-xs text-neutral-300 hover:bg-white/5 rounded-lg transition-colors"
        >
          <BarChart2 className="w-3.5 h-3.5" /> Detalhes
        </button>
        <button
          onClick={() => toggle.mutate()}
          disabled={toggle.isPending}
          title={campaign.active ? 'Desativar' : 'Ativar'}
          className={cn(
            'p-2 rounded-lg transition-colors',
            campaign.active ? 'text-emerald-400 hover:bg-red-500/10 hover:text-red-400' : 'text-neutral-600 hover:bg-emerald-500/10 hover:text-emerald-400'
          )}
        >
          {toggle.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : campaign.active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
        </button>
        <button
          onClick={() => { if (confirm(`Remover "${campaign.name}"?`)) remove.mutate() }}
          className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default function CampaignsPage() {
  const activeCompany = useCompanyStore(s => s.activeCompany)
  const companyId     = activeCompany?.id ?? ''
  const qc            = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName]   = useState('')

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns', companyId],
    queryFn: () => campaignsApi.list(companyId),
    enabled: !!companyId,
  })

  const create = useMutation({
    mutationFn: () => campaignsApi.create(companyId, newName.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns', companyId] })
      toast.success('Campanha criada')
      setNewName('')
      setCreating(false)
    },
    onError: () => toast.error('Erro ao criar campanha'),
  })

  if (!activeCompany) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Megaphone className="w-12 h-12 text-neutral-700 mb-4" />
      <p className="text-sm font-medium text-neutral-400">Nenhuma empresa selecionada</p>
    </div>
  )

  const active   = campaigns.filter(c => c.active)
  const inactive = campaigns.filter(c => !c.active)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Campanhas</h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            <span className="text-white">{activeCompany.name}</span> · {active.length} ativa{active.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Nova Campanha
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-[#141920] rounded-xl animate-pulse border border-white/5" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Megaphone className="w-12 h-12 text-neutral-700 mb-4" />
          <p className="text-sm font-medium text-neutral-400">Nenhuma campanha criada</p>
          <p className="text-xs text-neutral-600 mt-1">Campanhas são exibidas em fullscreen antes do portal captive</p>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-neutral-500 uppercase tracking-wider">Ativas</p>
              {active.map(c => <CampaignRow key={c.id} campaign={c} companyId={companyId} />)}
            </div>
          )}
          {inactive.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-neutral-500 uppercase tracking-wider">Inativas</p>
              {inactive.map(c => <CampaignRow key={c.id} campaign={c} companyId={companyId} />)}
            </div>
          )}
        </div>
      )}

      {creating && (
        <Modal title="Nova Campanha" onClose={() => setCreating(false)}>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Nome da campanha</label>
              <input
                value={newName} onChange={e => setNewName(e.target.value)}
                className={inputCls} placeholder="Ex: Promoção Junho 2026" autoFocus
                onKeyDown={e => e.key === 'Enter' && newName.trim() && create.mutate()}
              />
            </div>
            <button
              onClick={() => create.mutate()}
              disabled={!newName.trim() || create.isPending}
              className="w-full h-10 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
            >
              {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar campanha
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
