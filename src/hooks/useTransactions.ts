import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import http from '@/lib/http'
import type { FinancialTransaction, TransactionListResponse, TransactionStats } from '@/types'

export type TransactionFilters = {
  companyId?:     string
  status?:        string
  paymentMethod?: string
  gatewayType?:   string
  dateFrom?:      string
  dateTo?:        string
  page?:          number
  size?:          number
}

function fetchTransactions(params?: TransactionFilters) {
  return http.get<TransactionListResponse>('/transactions', { params }).then((r) => r.data)
}
function fetchTransactionStats(params?: Omit<TransactionFilters, 'page' | 'size'>) {
  return http.get<TransactionStats>('/transactions/stats', { params }).then((r) => r.data)
}
function approveTransaction(id: string) {
  return http.post<FinancialTransaction>(`/transactions/${id}/approve`).then((r) => r.data)
}
function cancelTransaction(id: string) {
  return http.post<FinancialTransaction>(`/transactions/${id}/cancel`).then((r) => r.data)
}

export const transactionKeys = {
  all: (params?: TransactionFilters) => ['transactions', params] as const,
  stats: (params?: Omit<TransactionFilters, 'page' | 'size'>) => ['transactions', 'stats', params] as const,
}

export function useTransactions(params?: TransactionFilters) {
  return useQuery({
    queryKey: transactionKeys.all(params),
    queryFn: () => fetchTransactions(params),
  })
}

export function useTransactionStats(params?: Omit<TransactionFilters, 'page' | 'size'>) {
  return useQuery({
    queryKey: transactionKeys.stats(params),
    queryFn: () => fetchTransactionStats(params),
  })
}

export function useApproveTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => approveTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      toast.success('Transação aprovada manualmente.')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro ao aprovar transação.'
      toast.error(msg)
    },
  })
}

export function useCancelTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      toast.success('Transação cancelada.')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro ao cancelar transação.'
      toast.error(msg)
    },
  })
}
