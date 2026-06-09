'use client'

import { useActiveSessions } from '@/hooks/useSessions'
import { useDevices } from '@/hooks/useDevices'
import { useTransactionStats } from '@/hooks/useTransactions'
import { useAllLeads } from '@/hooks/usePortals'
import { useCompanyStore } from '@/store/company'
import {
  Activity, Wifi, Monitor, Users, CreditCard,
  CheckCircle2, WifiOff, Clock, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Device, HotspotSession } from '@/types'

function fmt(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

function StatCard({
  label, value, icon: Icon, accent, loading,
}: {
  label: string; value: string; icon: React.ElementType; accent: string; loading?: boolean
}) {
  return (
    <div className="bg-[#141920] border border-white/5 rounded-xl p-5 flex items-center gap-4">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', accent)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-neutral-500 uppercase tracking-wider">{label}</p>
        {loading ? (
          <div className="h-7 w-16 bg-white/5 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-2xl font-bold mt-1 text-white">{value}</p>
        )}
      </div>
    </div>
  )
}

function DeviceStatusIcon({ status }: { status: Device['status'] }) {
  if (status === 'ONLINE')  return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
  if (status === 'OFFLINE') return <WifiOff className="w-3.5 h-3.5 text-neutral-500" />
  if (status === 'ERROR')   return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
  return <Clock className="w-3.5 h-3.5 text-yellow-400" />
}

function DeviceStatusLabel({ status }: { status: Device['status'] }) {
  const map: Record<Device['status'], { label: string; cls: string }> = {
    ONLINE:  { label: 'Online',     cls: 'text-emerald-400' },
    OFFLINE: { label: 'Offline',    cls: 'text-neutral-500' },
    ERROR:   { label: 'Erro',       cls: 'text-red-400' },
    PENDING: { label: 'Pendente',   cls: 'text-yellow-400' },
  }
  const { label, cls } = map[status]
  return <span className={cn('text-xs font-medium', cls)}>{label}</span>
}

function ActiveSessionRow({ session }: { session: HotspotSession }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
      <div className="min-w-0">
        <p className="font-mono text-xs text-neutral-300 truncate">
          {session.identifier || session.username}
        </p>
        {session.deviceName && (
          <p className="text-xs text-neutral-600 mt-0.5">{session.deviceName}</p>
        )}
      </div>
      <div className="flex items-center gap-4 shrink-0 ml-4">
        <div className="text-right hidden sm:block">
          <p className="text-xs text-emerald-400">{formatBytes(session.bytesIn)} ↓</p>
          <p className="text-xs text-sky-400">{formatBytes(session.bytesOut)} ↑</p>
        </div>
        <p className="text-xs text-neutral-600 w-24 text-right">{formatDate(session.startAt)}</p>
      </div>
    </div>
  )
}

function DeviceRow({ device }: { device: Device }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <DeviceStatusIcon status={device.status} />
        <div className="min-w-0">
          <p className="text-xs text-neutral-300 truncate">{device.name}</p>
          {device.wgIp && (
            <p className="font-mono text-xs text-neutral-600 mt-0.5">{device.wgIp}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <DeviceStatusLabel status={device.status} />
        {device.lastHandshake && (
          <p className="text-xs text-neutral-600 hidden sm:block">{formatDate(device.lastHandshake)}</p>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const activeCompany = useCompanyStore((s) => s.activeCompany)
  const companyId     = activeCompany?.id ?? ''

  const { data: activeSessions, isLoading: sessionsLoading } = useActiveSessions(companyId)
  const { data: devices,        isLoading: devicesLoading  } = useDevices(companyId)
  const { data: stats,          isLoading: statsLoading    } = useTransactionStats()
  const { data: leads,          isLoading: leadsLoading    } = useAllLeads(companyId)

  const onlineDevices = devices?.filter(d => d.status === 'ONLINE').length ?? 0
  const totalDevices  = devices?.length ?? 0

  const recentSessions = activeSessions?.data?.slice(0, 8) ?? []
  const sortedDevices  = [...(devices ?? [])].sort((a, b) => {
    const order = { ONLINE: 0, ERROR: 1, PENDING: 2, OFFLINE: 3 }
    return (order[a.status] ?? 9) - (order[b.status] ?? 9)
  }).slice(0, 8)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-neutral-400 mt-0.5">Visão geral em tempo real</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Sessões Ativas"
          value={String(activeSessions?.total ?? 0)}
          icon={Activity}
          accent="bg-emerald-500/10 text-emerald-400"
          loading={sessionsLoading}
        />
        <StatCard
          label="Dispositivos Online"
          value={`${onlineDevices} / ${totalDevices}`}
          icon={Monitor}
          accent="bg-sky-500/10 text-sky-400"
          loading={devicesLoading}
        />
        <StatCard
          label="Receita Hoje"
          value={statsLoading ? '...' : fmt(stats?.revenueToday ?? 0)}
          icon={CreditCard}
          accent="bg-violet-500/10 text-violet-400"
          loading={statsLoading}
        />
        <StatCard
          label="Leads Captados"
          value={String(leads?.length ?? 0)}
          icon={Users}
          accent="bg-orange-500/10 text-orange-400"
          loading={leadsLoading}
        />
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active sessions */}
        <div className="bg-[#141920] border border-white/5 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold">Sessões Ativas</h2>
            </div>
            {activeSessions?.total != null && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                {activeSessions.total} ativas
              </span>
            )}
          </div>

          {sessionsLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-white/[0.03] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Wifi className="w-8 h-8 text-neutral-700 mb-2" />
              <p className="text-xs text-neutral-500">Nenhuma sessão ativa</p>
            </div>
          ) : (
            <div>
              {recentSessions.map(s => (
                <ActiveSessionRow key={s.id} session={s} />
              ))}
              {(activeSessions?.total ?? 0) > 8 && (
                <p className="text-xs text-neutral-600 mt-3 text-center">
                  +{(activeSessions!.total) - 8} mais · ver em{' '}
                  <a href="sessions" className="text-emerald-400 hover:underline">Sessões</a>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Device status */}
        <div className="bg-[#141920] border border-white/5 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-semibold">Status dos Dispositivos</h2>
            </div>
            {totalDevices > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs">
                {onlineDevices}/{totalDevices} online
              </span>
            )}
          </div>

          {devicesLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-white/[0.03] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : sortedDevices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Monitor className="w-8 h-8 text-neutral-700 mb-2" />
              <p className="text-xs text-neutral-500">Nenhum dispositivo cadastrado</p>
            </div>
          ) : (
            <div>
              {sortedDevices.map(d => (
                <DeviceRow key={d.id} device={d} />
              ))}
              {totalDevices > 8 && (
                <p className="text-xs text-neutral-600 mt-3 text-center">
                  +{totalDevices - 8} mais · ver em{' '}
                  <a href="devices" className="text-sky-400 hover:underline">Dispositivos</a>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
