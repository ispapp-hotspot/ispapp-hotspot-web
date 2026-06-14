'use client'

import React, { useState } from 'react'
import { useTransactions, useTransactionStats, useApproveTransaction, useCancelTransaction } from '@/hooks/useTransactions'
import { Loader2, CheckCircle2, XCircle, Clock, CreditCard, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FinancialTransaction, TransactionStatus } from '@/types'
import type { TransactionFilters } from '@/hooks/useTransactions'

const PAGE_SIZE = 20

function StatusBadge({ status }: { status: TransactionStatus }) {
  const map: Record<TransactionStatus, { label: string; cls: string }> = {
    pending:         { label: 'Pendente',   cls: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' },
    approved:        { label: 'Aprovado',   cls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
    manual_approved: { label: 'Aprovado M', cls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
    rejected:        { label: 'Rejeitado',  cls: 'bg-red-500/10 border-red-500/20 text-red-400' },
    cancelled:       { label: 'Cancelado',  cls: 'bg-red-500/10 border-red-500/20 text-red-400' },
    refunded:        { label: 'Estornado',  cls: 'bg-neutral-500/10 border-neutral-500/20 text-neutral-400' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-neutral-500/10 border-neutral-500/20 text-neutral-400' }
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-medium', cls)}>
      {label}
    </span>
  )
}

function MethodBadge({ method }: { method?: string }) {
  if (!method) return <span className="text-neutral-600 text-xs">—</span>
  const labels: Record<string, string> = { pix: 'Pix', credit_card: 'Cartão', boleto: 'Boleto' }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#0C1117] border border-white/[0.06] text-xs text-neutral-300">
      {labels[method] ?? method}
    </span>
  )
}

function GatewayBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; color: string }> = {
    MERCADO_PAGO: { label: 'MP', color: '#009EE3' },
    EFI: { label: 'EFI', color: '#00b86e' },
  }
  const info = map[type] ?? { label: type.slice(0, 3), color: '#888' }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold"
      style={{ backgroundColor: info.color + '20', color: info.color }}
    >
      {info.label}
    </span>
  )
}

function formatCurrency(val: number | string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val))
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: React.ElementType; accent: string }) {
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

function ExpandedRow({ tx }: { tx: FinancialTransaction }) {
  return (
    <tr className="bg-[#0c1117]">
      <td colSpan={9} className="px-5 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {tx.leadEmail && (
            <div><p className="text-neutral-500 uppercase tracking-wide mb-1">E-mail</p><p className="text-neutral-300">{tx.leadEmail}</p></div>
          )}
          {tx.leadPhone && (
            <div><p className="text-neutral-500 uppercase tracking-wide mb-1">Telefone</p><p className="text-neutral-300">{tx.leadPhone}</p></div>
          )}
          {tx.macAddress && (
            <div><p className="text-neutral-500 uppercase tracking-wide mb-1">MAC</p><p className="font-mono text-neutral-300">{tx.macAddress}</p></div>
          )}
          {tx.ipAddress && (
            <div><p className="text-neutral-500 uppercase tracking-wide mb-1">IP</p><p className="font-mono text-neutral-300">{tx.ipAddress}</p></div>
          )}
          {tx.gatewayId && (
            <div><p className="text-neutral-500 uppercase tracking-wide mb-1">ID Gateway</p><p className="font-mono text-neutral-300 break-all">{tx.gatewayId}</p></div>
          )}
          {tx.paidAt && (
            <div><p className="text-neutral-500 uppercase tracking-wide mb-1">Pago em</p><p className="text-neutral-300">{formatDate(tx.paidAt)}</p></div>
          )}
          {tx.expiresAt && (
            <div><p className="text-neutral-500 uppercase tracking-wide mb-1">Expira em</p><p className="text-neutral-300">{formatDate(tx.expiresAt)}</p></div>
          )}
          {tx.notes && (
            <div className="col-span-2"><p className="text-neutral-500 uppercase tracking-wide mb-1">Notas</p><p className="text-neutral-300">{tx.notes}</p></div>
          )}
        </div>
      </td>
    </tr>
  )
}

const selectCls = 'h-9 px-3 rounded-lg bg-[#141920] border border-white/10 focus:border-emerald-500 text-white text-sm outline-none transition-colors cursor-pointer'
const inputCls  = 'h-9 px-3 rounded-lg bg-[#141920] border border-white/10 focus:border-emerald-500 text-white placeholder:text-neutral-600 text-sm outline-none transition-colors'

export default function FinancialPage() {
  const [page,          setPage]          = useState(0)
  const [search,        setSearch]        = useState('')
  const [expanded,      setExpanded]      = useState<string | null>(null)
  const [status,        setStatus]        = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [gatewayType,   setGatewayType]   = useState('')
  const [dateFrom,      setDateFrom]      = useState('')
  const [dateTo,        setDateTo]        = useState('')

  const filters: Omit<TransactionFilters, 'page' | 'size'> = {
    ...(status        && { status }),
    ...(paymentMethod && { paymentMethod }),
    ...(gatewayType   && { gatewayType }),
    ...(dateFrom      && { dateFrom }),
    ...(dateTo        && { dateTo }),
  }

  const listParams: TransactionFilters = { ...filters, page, size: PAGE_SIZE }

  const { data: stats, isLoading: statsLoading } = useTransactionStats(filters)
  const { data: txData, isLoading: txLoading }   = useTransactions(listParams)

  const approve = useApproveTransaction()
  const cancel  = useCancelTransaction()

  const allTransactions: FinancialTransaction[] = txData?.data ?? []

  // Client-side search only (status/method/gateway/date handled by backend)
  const transactions = search
    ? allTransactions.filter(tx => {
        const q = search.toLowerCase()
        return [tx.leadName, tx.leadCpf, tx.macAddress, tx.leadEmail].filter(Boolean).join(' ').toLowerCase().includes(q)
      })
    : allTransactions

  const total      = txData?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const hasFilters = !!(status || paymentMethod || gatewayType || dateFrom || dateTo || search)

  function clearFilters() {
    setStatus(''); setPaymentMethod(''); setGatewayType('')
    setDateFrom(''); setDateTo(''); setSearch(''); setPage(0)
  }

  function handleFilterChange(fn: () => void) {
    fn(); setPage(0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Financeiro</h1>
        <p className="text-sm text-neutral-400 mt-0.5">Transações de pagamento</p>
      </div>

      {/* Stats — reflect active filters */}
      {statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#141920] border border-white/5 rounded-2xl p-5 h-20 animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Total transações" value={String(stats.total)}           icon={CreditCard}   accent="bg-neutral-500/10 text-neutral-400" />
          <StatCard label="Aprovadas"         value={String(stats.approved)}        icon={CheckCircle2} accent="bg-emerald-500/10 text-emerald-400" />
          <StatCard label="Pendentes"         value={String(stats.pending)}         icon={Clock}        accent="bg-yellow-500/10 text-yellow-400" />
          <StatCard label="Receita total"     value={formatCurrency(stats.revenue)} icon={CreditCard}   accent="bg-emerald-500/10 text-emerald-400" />
        </div>
      ) : null}

      {/* Filters */}
      <div className="bg-[#141920] border border-white/5 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Filtros</p>
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-neutral-500 hover:text-white transition-colors">
              <X className="w-3 h-3" /> Limpar
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Buscar por MAC, CPF, nome ou e-mail…"
            value={search}
            onChange={e => handleFilterChange(() => setSearch(e.target.value))}
            className={cn(inputCls, 'min-w-[220px] flex-1')}
          />
          <input
            type="date"
            value={dateFrom}
            onChange={e => handleFilterChange(() => setDateFrom(e.target.value))}
            className={cn(inputCls, 'text-neutral-300')}
            title="Data inicial"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => handleFilterChange(() => setDateTo(e.target.value))}
            className={cn(inputCls, 'text-neutral-300')}
            title="Data final"
          />
          <select
            value={status}
            onChange={e => handleFilterChange(() => setStatus(e.target.value))}
            className={selectCls}
          >
            <option value="">Todos os status</option>
            <option value="pending">Pendente</option>
            <option value="approved">Aprovado</option>
            <option value="manual_approved">Aprovado M</option>
            <option value="cancelled">Cancelado</option>
            <option value="rejected">Rejeitado</option>
            <option value="refunded">Estornado</option>
          </select>
          <select
            value={paymentMethod}
            onChange={e => handleFilterChange(() => setPaymentMethod(e.target.value))}
            className={selectCls}
          >
            <option value="">Todos os métodos</option>
            <option value="pix">Pix</option>
            <option value="credit_card">Cartão</option>
            <option value="boleto">Boleto</option>
          </select>
          <select
            value={gatewayType}
            onChange={e => handleFilterChange(() => setGatewayType(e.target.value))}
            className={selectCls}
          >
            <option value="">Todos os gateways</option>
            <option value="MERCADO_PAGO">Mercado Pago</option>
            <option value="EFI">EFI</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#141920] border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Transações</p>
          {hasFilters && (
            <p className="text-xs text-neutral-500">{total} resultado(s)</p>
          )}
        </div>

        {txLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-neutral-600 animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CreditCard className="w-10 h-10 text-neutral-700 mb-3" />
            <p className="text-sm text-neutral-500">Nenhuma transação encontrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-neutral-500">
                  <th className="px-5 py-3 text-left font-medium w-8" />
                  <th className="px-5 py-3 text-left font-medium">Data</th>
                  <th className="px-5 py-3 text-left font-medium">Lead</th>
                  <th className="px-5 py-3 text-left font-medium">Plano</th>
                  <th className="px-5 py-3 text-right font-medium">Valor</th>
                  <th className="px-5 py-3 text-left font-medium">Método</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Gateway</th>
                  <th className="px-5 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map(tx => (
                  <React.Fragment key={tx.id}>
                    <tr className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-3 py-3.5">
                        <button
                          onClick={() => setExpanded(expanded === tx.id ? null : tx.id)}
                          className="text-neutral-600 hover:text-neutral-300 transition-colors"
                        >
                          {expanded === tx.id
                            ? <ChevronUp className="w-3.5 h-3.5" />
                            : <ChevronDown className="w-3.5 h-3.5" />
                          }
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-neutral-300 whitespace-nowrap">{formatDate(tx.createdAt)}</td>
                      <td className="px-5 py-3.5">
                        {tx.leadName ? (
                          <div>
                            <p className="text-neutral-200 text-xs font-medium">{tx.leadName}</p>
                            {tx.leadCpf && <p className="text-neutral-500 text-xs">{tx.leadCpf}</p>}
                          </div>
                        ) : tx.macAddress ? (
                          <span className="font-mono text-neutral-500 text-xs">{tx.macAddress}</span>
                        ) : (
                          <span className="text-neutral-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-neutral-400 text-xs">{tx.planId ? tx.planId.slice(0, 8) + '…' : '—'}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-white">{formatCurrency(tx.amount)}</td>
                      <td className="px-5 py-3.5"><MethodBadge method={tx.paymentMethod} /></td>
                      <td className="px-5 py-3.5"><StatusBadge status={tx.status} /></td>
                      <td className="px-5 py-3.5"><GatewayBadge type={tx.gatewayType} /></td>
                      <td className="px-5 py-3.5 text-right">
                        {tx.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => approve.mutate(tx.id)}
                              disabled={approve.isPending}
                              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                            >
                              {approve.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              Aprovar
                            </button>
                            <button
                              onClick={() => cancel.mutate(tx.id)}
                              disabled={cancel.isPending}
                              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                            >
                              {cancel.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                              Cancelar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {expanded === tx.id && <ExpandedRow tx={tx} />}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/5">
            <p className="text-xs text-neutral-500">
              Página {page + 1} de {totalPages} — {total} transações
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-neutral-400 hover:text-white hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-neutral-400 hover:text-white hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Próxima
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
