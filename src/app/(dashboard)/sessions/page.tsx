'use client'

import { useState } from 'react'
import { useActiveSessions, useSessions } from '@/hooks/useSessions'
import { useCompanyStore } from '@/store/company'
import { Activity, Wifi, WifiOff, Clock, Download, Upload, ChevronLeft, ChevronRight, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HotspotSession, SessionStatus } from '@/types'

const PAGE_SIZE = 20

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function formatDuration(secs?: number) {
  if (!secs) return '—'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

function StatusBadge({ status }: { status: SessionStatus }) {
  const map: Record<SessionStatus, { label: string; cls: string }> = {
    active:  { label: 'Ativa',    cls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
    closed:  { label: 'Encerrada', cls: 'bg-neutral-500/10 border-neutral-500/20 text-neutral-400' },
    expired: { label: 'Expirada', cls: 'bg-red-500/10 border-red-500/20 text-red-400' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-neutral-500/10 border-neutral-500/20 text-neutral-400' }
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-medium', cls)}>
      {label}
    </span>
  )
}

function StatCard({ label, value, icon: Icon, accent }: {
  label: string; value: string; icon: React.ElementType; accent: string
}) {
  return (
    <div className="bg-[#141920] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', accent)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-neutral-400 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-semibold text-white mt-0.5">{value}</p>
      </div>
    </div>
  )
}

function SessionRow({ session }: { session: HotspotSession }) {
  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <td className="px-5 py-3">
        <StatusBadge status={session.status} />
      </td>
      <td className="px-5 py-3">
        <p className="font-mono text-xs text-neutral-300">{session.identifier || session.username}</p>
        {session.macAddress && session.macAddress !== session.identifier && (
          <p className="font-mono text-xs text-neutral-600 mt-0.5">{session.macAddress}</p>
        )}
      </td>
      <td className="px-5 py-3">
        <p className="text-xs text-neutral-400 font-mono">{session.ipAddress || '—'}</p>
      </td>
      <td className="px-5 py-3">
        <p className="text-xs text-neutral-300">{session.deviceName || '—'}</p>
        {session.nasIp && (
          <p className="font-mono text-xs text-neutral-600 mt-0.5">{session.nasIp}</p>
        )}
      </td>
      <td className="px-5 py-3 text-xs text-neutral-400">{formatDate(session.startAt)}</td>
      <td className="px-5 py-3 text-xs text-neutral-400">{formatDate(session.stopAt)}</td>
      <td className="px-5 py-3 text-xs text-neutral-400">{formatDuration(session.durationSec)}</td>
      <td className="px-5 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <Download className="w-3 h-3" />{formatBytes(session.bytesIn)}
          </span>
          <span className="text-xs text-sky-400 flex items-center gap-1">
            <Upload className="w-3 h-3" />{formatBytes(session.bytesOut)}
          </span>
        </div>
      </td>
      <td className="px-5 py-3 text-xs text-neutral-600">{session.terminateCause || '—'}</td>
    </tr>
  )
}

type Tab = 'active' | 'history'

export default function SessionsPage() {
  const activeCompany = useCompanyStore((s) => s.activeCompany)
  const companyId = activeCompany?.id ?? ''

  const [tab, setTab]   = useState<Tab>('active')
  const [page, setPage] = useState(0)

  const {
    data: activeData,
    isLoading: activeLoading,
  } = useActiveSessions(companyId, 0, PAGE_SIZE)

  const {
    data: historyData,
    isLoading: historyLoading,
  } = useSessions(companyId, page, PAGE_SIZE)

  const sessions     = tab === 'active' ? (activeData?.data ?? []) : (historyData?.data ?? [])
  const total        = tab === 'active' ? (activeData?.total ?? 0)  : (historyData?.total ?? 0)
  const isLoading    = tab === 'active' ? activeLoading : historyLoading
  const totalPages   = Math.ceil(total / PAGE_SIZE)

  function handleTabChange(next: Tab) {
    setTab(next)
    setPage(0)
  }

  if (!activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Monitor className="w-12 h-12 text-neutral-700 mb-4" />
        <p className="text-sm text-neutral-400">Selecione uma empresa para ver as sessões</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Sessões</h1>
        <p className="text-sm text-neutral-400 mt-0.5">
          Sessões de acesso via FreeRADIUS
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          label="Sessões ativas"
          value={String(activeData?.total ?? '—')}
          icon={Wifi}
          accent="bg-emerald-500/10 text-emerald-400"
        />
        <StatCard
          label="Histórico total"
          value={String(historyData?.total ?? '—')}
          icon={Activity}
          accent="bg-sky-500/10 text-sky-400"
        />
        <StatCard
          label="Encerradas"
          value={String(
            (historyData?.total ?? 0) - (activeData?.total ?? 0) > 0
              ? (historyData?.total ?? 0) - (activeData?.total ?? 0)
              : '—'
          )}
          icon={WifiOff}
          accent="bg-neutral-500/10 text-neutral-400"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#141920] border border-white/5 rounded-xl p-1 w-fit">
        <button
          onClick={() => handleTabChange('active')}
          className={cn(
            'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
            tab === 'active'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-neutral-400 hover:text-white',
          )}
        >
          <Wifi className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
          Ativas
          {activeData?.total != null && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs">
              {activeData.total}
            </span>
          )}
        </button>
        <button
          onClick={() => handleTabChange('history')}
          className={cn(
            'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
            tab === 'history'
              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
              : 'text-neutral-400 hover:text-white',
          )}
        >
          <Clock className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
          Histórico
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#141920] border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">
            {tab === 'active' ? 'Sessões ativas' : 'Histórico de sessões'}
          </p>
          <p className="text-xs text-neutral-600">
            {total} {total === 1 ? 'sessão' : 'sessões'}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {tab === 'active' ? (
              <>
                <Wifi className="w-10 h-10 text-neutral-700 mb-3" />
                <p className="text-sm text-neutral-400">Nenhuma sessão ativa no momento</p>
                <p className="text-xs text-neutral-600 mt-1">As sessões aparecem quando dispositivos se conectam via MikroTik</p>
              </>
            ) : (
              <>
                <Clock className="w-10 h-10 text-neutral-700 mb-3" />
                <p className="text-sm text-neutral-400">Nenhuma sessão no histórico</p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {['Status', 'Identificador / MAC', 'IP Cliente', 'Dispositivo', 'Início', 'Fim', 'Duração', 'Tráfego', 'Motivo'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map(session => (
                  <SessionRow key={session.id} session={session} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination (history only) */}
        {tab === 'history' && totalPages > 1 && (
          <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between">
            <p className="text-xs text-neutral-500">
              Página {page + 1} de {totalPages} · {total} sessões
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
