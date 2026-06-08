'use client'

import { useState, use } from 'react'
import { useCampaigns, useCampaignStats, useToggleCampaign, useUpdateCampaign } from '@/hooks/useCampaigns'
import { useCompanyStore } from '@/store/company'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Loader2, Power, PowerOff, Pencil,
  Eye, TrendingUp, Users, CheckCircle,
} from 'lucide-react'
import type { CampaignStats } from '@/types'
import { cn } from '@/lib/utils'
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899']

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: typeof Eye; color: string
}) {
  return (
    <div className="bg-[#141920] border border-white/5 rounded-xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + '18' }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
      </div>
    </div>
  )
}

// ── Chart Card ────────────────────────────────────────────────────────────────
function ChartCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-[#141920] border border-white/5 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-neutral-500 uppercase tracking-wider">{title}</p>
        {action}
      </div>
      {children}
    </div>
  )
}

// ── Range Selector ────────────────────────────────────────────────────────────
function RangeSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[7, 14, 30].map(d => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={cn(
            'h-6 px-2 text-[10px] font-medium rounded transition-colors',
            value === d
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-neutral-500 hover:text-neutral-300 border border-transparent'
          )}
        >
          {d}d
        </button>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router        = useRouter()
  const activeCompany = useCompanyStore(s => s.activeCompany)
  const companyId     = activeCompany?.id ?? ''

  const [editName, setEditName]       = useState('')
  const [editingName, setEditingName] = useState(false)
  const [rangeDays, setRangeDays]     = useState(14)

  const { data: campaigns = [] } = useCampaigns(companyId)
  const campaign = campaigns.find(c => c.id === id)

  const { data: stats, isLoading: statsLoading, isError: statsError } = useCampaignStats(companyId, id)

  const toggle     = useToggleCampaign(companyId)
  const updateName = useUpdateCampaign(companyId)

  if (!activeCompany) return null

  // ── Time series data (fills missing days with 0) ──────────────────────────
  const viewsByDayData = stats
    ? (() => {
        const today = new Date()
        return Array.from({ length: rangeDays }, (_, i) => {
          const d = new Date(today)
          d.setDate(today.getDate() - (rangeDays - 1 - i))
          const key = d.toISOString().slice(0, 10)
          return {
            date: key.slice(5).replace('-', '/'),
            views: (stats.viewsByDay[key] as number) ?? 0,
          }
        })
      })()
    : []

  const deviceData = stats
    ? Object.entries(stats.deviceTypes).map(([name, value]) => ({ name, value }))
    : []

  const osData = stats
    ? Object.entries(stats.osNames).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }))
    : []

  const actionData = stats
    ? Object.entries(stats.actions).map(([name, value]) => ({ name, value }))
    : []

  const hasBreakdowns = deviceData.length > 0 || osData.length > 0 || actionData.length > 0

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.push('/campaigns')}
          className="p-2 text-neutral-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors mt-0.5"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex-1">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="h-9 px-3 rounded-lg bg-[#1a2130] border border-emerald-500 text-white text-lg font-semibold outline-none"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') updateName.mutate({ id, name: editName.trim() }, { onSuccess: () => setEditingName(false) })
                  if (e.key === 'Escape') setEditingName(false)
                }}
              />
              <button
                onClick={() => updateName.mutate({ id, name: editName.trim() }, { onSuccess: () => setEditingName(false) })}
                disabled={updateName.isPending}
                className="h-9 px-3 bg-emerald-600 text-white text-sm rounded-lg"
              >
                {updateName.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="h-9 px-3 border border-white/10 text-neutral-400 text-sm rounded-lg"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{campaign?.name ?? '—'}</h1>
              <span className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                campaign?.active
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  : 'text-neutral-500 bg-white/5 border-white/10'
              )}>
                {campaign?.active ? 'Ativa' : 'Inativa'}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/campaigns/${id}/edit`)}
            className="flex items-center gap-2 h-9 px-4 text-sm rounded-lg border border-white/10 text-neutral-300 hover:bg-white/5 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar campanha
          </button>
          <button
            onClick={() => toggle.mutate(id)}
            disabled={toggle.isPending}
            className={cn(
              'flex items-center gap-2 h-9 px-4 text-sm rounded-lg border transition-colors',
              campaign?.active
                ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
            )}
          >
            {toggle.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : campaign?.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
            {campaign?.active ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      {stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total de visualizações" value={stats.totalViews}     icon={Eye}         color="#10b981" />
          <KpiCard label="Dispositivos únicos"    value={stats.uniqueDevices}  icon={Users}       color="#3b82f6" />
          <KpiCard label="Concluídas"             value={stats.completed}      icon={CheckCircle} color="#f59e0b" />
          <KpiCard label="Taxa de conclusão"      value={stats.completionRate} icon={TrendingUp}  color="#8b5cf6" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#141920] border border-white/5 rounded-xl p-4 h-[72px] animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Time series — full width ── */}
      {stats ? (
        <ChartCard
          title={`Visualizações diárias — últimos ${rangeDays} dias`}
          action={<RangeSelector value={rangeDays} onChange={setRangeDays} />}
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={viewsByDayData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false} tickLine={false}
                interval={rangeDays <= 7 ? 0 : rangeDays <= 14 ? 1 : 4}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false} tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0C1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#9ca3af' }}
                itemStyle={{ color: '#10b981' }}
                formatter={(v) => [v ?? 0, 'Visualizações']}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#gradViews)"
                dot={false}
                activeDot={{ r: 4, fill: '#10b981', stroke: '#0C1117', strokeWidth: 2 }}
                name="Visualizações"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : (
        <div className="bg-[#141920] border border-white/5 rounded-xl p-8 flex flex-col items-center gap-3 text-center">
          {statsLoading ? (
            <Loader2 className="w-8 h-8 text-neutral-600 animate-spin" />
          ) : statsError ? (
            <>
              <TrendingUp className="w-10 h-10 text-red-800" />
              <p className="text-sm text-red-400">Erro ao carregar métricas</p>
              <p className="text-xs text-neutral-600">Verifique se o backend está acessível</p>
            </>
          ) : (
            <>
              <TrendingUp className="w-10 h-10 text-neutral-700" />
              <p className="text-sm text-neutral-500">Sem métricas ainda</p>
              <p className="text-xs text-neutral-600">As métricas aparecerão assim que a campanha for exibida no portal</p>
            </>
          )}
        </div>
      )}

      {/* ── Breakdowns (só quando houver dados) ── */}
      {hasBreakdowns && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {deviceData.length > 0 && (
            <ChartCard title="Tipo de dispositivo">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={deviceData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {deviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#141920', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: '#d1d5db', fontSize: 11 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {osData.length > 0 && (
            <ChartCard title="Sistema Operacional">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={osData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#d1d5db', fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip contentStyle={{ backgroundColor: '#141920', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} itemStyle={{ color: '#3b82f6' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Views">
                    {osData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {actionData.length > 0 && (
            <ChartCard title="Ações">
              <div className="space-y-2 pt-1">
                {actionData.map(({ name, value }, i) => {
                  const total = actionData.reduce((s, a) => s + a.value, 0)
                  const pct   = total > 0 ? Math.round((value / total) * 100) : 0
                  return (
                    <div key={name} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-neutral-300 capitalize flex-1">{name}</span>
                      <span className="text-xs text-neutral-500">{value}</span>
                      <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                      <span className="text-[10px] text-neutral-600 w-8 text-right">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </ChartCard>
          )}

        </div>
      )}

    </div>
  )
}
