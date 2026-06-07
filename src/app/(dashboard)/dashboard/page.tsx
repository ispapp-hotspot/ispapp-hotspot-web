'use client'

import { useTransactionStats } from '@/hooks/useTransactions'

function fmt(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useTransactionStats()

  const revenueToday = isLoading ? '...' : fmt(stats?.revenueToday ?? 0)

  const STATS = [
    { label: 'Sessões Ativas',      value: '—' },
    { label: 'Dispositivos Online', value: '—' },
    { label: 'Receita Hoje',        value: revenueToday },
    { label: 'Clientes',            value: '—' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-neutral-400 mt-0.5">Visão geral em tempo real</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(({ label, value }) => (
          <div key={label} className="bg-[#141920] border border-white/5 rounded-xl p-5">
            <p className="text-xs text-neutral-500 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold mt-2 text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#141920] border border-white/5 rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">Sessões Ativas</h2>
          <p className="text-sm text-neutral-500">Em construção</p>
        </div>
        <div className="bg-[#141920] border border-white/5 rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">Status dos Dispositivos</h2>
          <p className="text-sm text-neutral-500">Em construção</p>
        </div>
      </div>
    </div>
  )
}
