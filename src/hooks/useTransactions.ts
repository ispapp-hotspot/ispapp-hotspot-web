import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { transactionsApi } from '@/services/api'

export const transactionKeys = {
  all: (params?: { companyId?: string; page?: number; size?: number }) =>
    ['transactions', params] as const,
  stats: () => ['transactions', 'stats'] as const,
}

export function useTransactions(params?: { companyId?: string; page?: number; size?: number }) {
  return useQuery({
    queryKey: transactionKeys.all(params),
    queryFn: () => transactionsApi.list(params),
  })
}

export function useTransactionStats() {
  return useQuery({
    queryKey: transactionKeys.stats(),
    queryFn: () => transactionsApi.stats(),
  })
}

export function useApproveTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => transactionsApi.approve(id),
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
    mutationFn: (id: string) => transactionsApi.cancel(id),
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
