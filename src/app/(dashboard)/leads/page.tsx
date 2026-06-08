'use client'

import { useState } from 'react'
import { useAllLeads, usePortals } from '@/hooks/usePortals'
import { useCompanyStore } from '@/store/company'
import { Users, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import type { HotspotLead } from '@/types'

const PAGE_SIZE = 25

function exportCsv(leads: HotspotLead[], filename: string) {
  const headers = ['Nome', 'CPF', 'E-mail', 'Telefone', 'MAC', 'IP', 'Portal ID', 'Data']
  const rows = leads.map(l => [
    l.name ?? '', l.cpf ?? '', l.email ?? '', l.phone ?? '',
    l.macAddress ?? '', l.ipAddress ?? '', l.portalId,
    new Date(l.createdAt).toLocaleString('pt-BR'),
  ])
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function LeadsPage() {
  const activeCompany = useCompanyStore((s) => s.activeCompany)
  const companyId     = activeCompany?.id ?? ''
  const [search, setSearch] = useState('')
  const [page,   setPage]   = useState(0)

  const { data: leads = [], isLoading } = useAllLeads(companyId)
  const { data: portals = [] } = usePortals(companyId)

  const portalMap = Object.fromEntries(portals.map(p => [p.id, p.name]))

  const filtered = leads.filter(l => {
    if (!search) return true
    const q = search.toLowerCase()
    return [l.name, l.email, l.cpf, l.phone, l.macAddress].some(v => v?.toLowerCase().includes(q))
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleSearch(v: string) {
    setSearch(v)
    setPage(0)
  }

  if (!activeCompany) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Users className="w-12 h-12 text-neutral-700 mb-4" />
      <p className="text-sm font-medium text-neutral-400">Nenhuma empresa selecionada</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            <span className="text-white">{activeCompany.name}</span> · {leads.length} registro{leads.length !== 1 ? 's' : ''}
          </p>
        </div>
        {leads.length > 0 && (
          <button
            onClick={() => exportCsv(filtered, `leads-${activeCompany.name}.csv`)}
            className="flex items-center gap-2 h-9 px-4 border border-white/10 text-neutral-300 hover:bg-white/5 text-sm rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        )}
      </div>

      {leads.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail, CPF..."
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#141920] border border-white/10 focus:border-emerald-500 text-white placeholder:text-neutral-600 text-sm outline-none transition-colors"
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-[#141920] rounded-xl animate-pulse border border-white/5" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Users className="w-12 h-12 text-neutral-700 mb-4" />
          <p className="text-sm font-medium text-neutral-400">
            {search ? 'Nenhum resultado encontrado' : 'Nenhum lead coletado ainda'}
          </p>
          {!search && <p className="text-xs text-neutral-600 mt-1">Os leads aparecem quando usuários preenchem portais do tipo "Cadastro de Lead"</p>}
        </div>
      ) : (
        <div className="bg-[#141920] border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Nome', 'CPF', 'E-mail', 'Telefone', 'Portal', 'MAC', 'Data'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs uppercase tracking-wider text-neutral-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginated.map((l) => (
                <tr key={l.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 font-medium text-white">{l.name || '—'}</td>
                  <td className="px-5 py-3 font-mono text-xs text-neutral-400">{l.cpf || '—'}</td>
                  <td className="px-5 py-3 text-neutral-300">{l.email || '—'}</td>
                  <td className="px-5 py-3 text-neutral-400">{l.phone || '—'}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-neutral-400 border border-white/10">
                      {portalMap[l.portalId] ?? 'Portal'}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-neutral-600">{l.macAddress || '—'}</td>
                  <td className="px-5 py-3 text-neutral-500 text-xs">
                    {new Date(l.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
              <p className="text-xs text-neutral-500">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 text-neutral-400 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i)
                  .filter(i => Math.abs(i - page) <= 2)
                  .map(i => (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                        i === page
                          ? 'bg-emerald-600 text-white'
                          : 'border border-white/10 text-neutral-400 hover:bg-white/5'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 text-neutral-400 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
