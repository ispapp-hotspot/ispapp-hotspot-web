import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { companiesApi } from '@/services/api'
import type { Company } from '@/types'

export const companyKeys = {
  all: () => ['companies'] as const,
  one: (id: string) => ['companies', id] as const,
}

export function useCompanies() {
  return useQuery({
    queryKey: companyKeys.all(),
    queryFn: () => companiesApi.list(),
  })
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: companyKeys.one(id),
    queryFn: () => companiesApi.get(id),
    enabled: !!id,
  })
}

export function useCreateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Company>) => companiesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyKeys.all() })
      toast.success('Empresa criada!')
    },
    onError: () => toast.error('Erro ao criar empresa.'),
  })
}

export function useUpdateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Company> }) =>
      companiesApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: companyKeys.all() })
      qc.invalidateQueries({ queryKey: companyKeys.one(id) })
      toast.success('Empresa atualizada!')
    },
    onError: () => toast.error('Erro ao atualizar empresa.'),
  })
}

export function useDeleteCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => companiesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyKeys.all() })
      toast.success('Empresa removida.')
    },
    onError: () => toast.error('Erro ao remover empresa.'),
  })
}
