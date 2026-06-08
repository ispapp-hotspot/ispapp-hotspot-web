'use client'

import { useState, use } from 'react'
import { useCampaigns, useUpdateCampaign, useCampaignMedia, useAddCampaignMedia, useRemoveCampaignMedia } from '@/hooks/useCampaigns'
import { useCompanyStore } from '@/store/company'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Loader2, Image, Video, Trash2, GripVertical, Pencil, Check, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const inputCls = 'w-full h-10 px-3 rounded-lg bg-[#1a2130] border border-white/10 focus:border-emerald-500 text-white placeholder:text-neutral-600 text-sm outline-none transition-colors'

export default function CampaignEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router        = useRouter()
  const activeCompany = useCompanyStore(s => s.activeCompany)
  const companyId     = activeCompany?.id ?? ''

  const [editName, setEditName]       = useState('')
  const [editingName, setEditingName] = useState(false)
  const [mediaUrl, setMediaUrl]       = useState('')
  const [mediaType, setMediaType]     = useState<'image' | 'video'>('image')
  const [mediaDur, setMediaDur]       = useState(5)

  const { data: campaigns = [] } = useCampaigns(companyId)
  const campaign = campaigns.find(c => c.id === id)

  const { data: media = [], isLoading: mediaLoading } = useCampaignMedia(companyId, id)

  const updateName  = useUpdateCampaign(companyId)
  const addMedia    = useAddCampaignMedia(companyId, id)
  const removeMedia = useRemoveCampaignMedia(companyId, id)

  if (!activeCompany) return null

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/campaigns/${id}`)}
          className="p-2 text-neutral-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Editar campanha</h1>
          <p className="text-xs text-neutral-500">Gerencie nome e mídias</p>
        </div>
      </div>

      {/* ── Nome ── */}
      <div className="bg-[#141920] border border-white/5 rounded-xl p-5 space-y-3">
        <p className="text-xs text-neutral-500 uppercase tracking-wider">Nome da campanha</p>

        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className={cn(inputCls, 'border-emerald-500/50')}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && editName.trim()) updateName.mutate({ id, name: editName.trim() }, { onSuccess: () => setEditingName(false) })
                if (e.key === 'Escape') setEditingName(false)
              }}
            />
            <button
              onClick={() => updateName.mutate({ id, name: editName.trim() }, { onSuccess: () => setEditingName(false) })}
              disabled={!editName.trim() || updateName.isPending}
              className="w-10 h-10 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 shrink-0"
            >
              {updateName.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setEditingName(false)}
              className="w-10 h-10 flex items-center justify-center border border-white/10 text-neutral-400 hover:text-white rounded-lg shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-white font-medium">{campaign?.name ?? '—'}</span>
            <button
              onClick={() => { setEditName(campaign?.name ?? ''); setEditingName(true) }}
              className="flex items-center gap-1.5 h-8 px-3 text-xs text-neutral-400 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Renomear
            </button>
          </div>
        )}
      </div>

      {/* ── Mídias ── */}
      <div className="bg-[#141920] border border-white/5 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Mídias da campanha</p>
          <span className="text-xs text-neutral-600">{media.length} {media.length === 1 ? 'item' : 'itens'}</span>
        </div>

        {/* Lista de mídias */}
        {mediaLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
          </div>
        ) : media.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Image className="w-8 h-8 text-neutral-700" />
            <p className="text-sm text-neutral-500">Nenhuma mídia adicionada</p>
            <p className="text-xs text-neutral-600">Adicione imagens ou vídeos abaixo</p>
          </div>
        ) : (
          <div className="space-y-2">
            {media.map((m, i) => (
              <div
                key={m.id}
                className="flex items-center gap-3 bg-[#0C1117] rounded-lg px-4 py-3 border border-white/5 group"
              >
                <GripVertical className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
                <span className="text-xs text-neutral-600 w-4 text-center shrink-0">{i + 1}</span>
                {m.type === 'video'
                  ? <Video className="w-4 h-4 text-blue-400 shrink-0" />
                  : <Image className="w-4 h-4 text-emerald-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-200 truncate">{m.url}</p>
                  <p className="text-[10px] text-neutral-600 mt-0.5">
                    {m.type === 'video' ? 'Vídeo' : 'Imagem'} · {m.durationSec}s
                  </p>
                </div>
                {m.type === 'image' && (
                  <img
                    src={m.url}
                    alt=""
                    className="w-12 h-12 rounded-lg object-cover shrink-0 border border-white/10"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                <button
                  onClick={() => removeMedia.mutate(m.id)}
                  className="p-1.5 text-neutral-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Adicionar nova mídia */}
        <div className="border-t border-white/5 pt-4 space-y-3">
          <p className="text-xs text-neutral-400 font-medium">Adicionar mídia</p>

          <div className="grid grid-cols-2 gap-2">
            {(['image', 'video'] as const).map(t => (
              <button
                key={t}
                onClick={() => setMediaType(t)}
                className={cn(
                  'h-9 rounded-lg text-sm flex items-center justify-center gap-2 border transition-colors',
                  mediaType === t
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                    : 'border-white/10 text-neutral-400 hover:border-white/20'
                )}
              >
                {t === 'image' ? <Image className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                {t === 'image' ? 'Imagem' : 'Vídeo'}
              </button>
            ))}
          </div>

          <input
            value={mediaUrl}
            onChange={e => setMediaUrl(e.target.value)}
            className={inputCls}
            placeholder="URL da imagem ou vídeo (https://...)"
            onKeyDown={e => e.key === 'Enter' && mediaUrl.trim() && addMedia.mutate({ url: mediaUrl.trim(), type: mediaType, durationSec: mediaDur, sortOrder: media.length }, { onSuccess: () => setMediaUrl('') })}
          />

          <div className="flex items-center gap-3">
            <label className="text-xs text-neutral-400 shrink-0">Duração (seg):</label>
            <input
              type="number" min={1} max={60} value={mediaDur}
              onChange={e => setMediaDur(Number(e.target.value))}
              className="w-20 h-9 px-3 rounded-lg bg-[#1a2130] border border-white/10 text-white text-sm outline-none"
            />
            <button
              onClick={() => addMedia.mutate({ url: mediaUrl.trim(), type: mediaType, durationSec: mediaDur, sortOrder: media.length }, { onSuccess: () => setMediaUrl('') })}
              disabled={!mediaUrl.trim() || addMedia.isPending}
              className="flex-1 h-9 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              {addMedia.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Adicionar
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
