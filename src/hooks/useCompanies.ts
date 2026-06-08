import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import http from '@/lib/http'
import type { Company } from '@/types'

function fetchCompanies() {
  return http.get<Company[]>('/companies').then((r) => r.data)
}
function fetchCompany(id: string) {
  return http.get<Company>(`/companies/${id}`).then((r) => r.data)
}
function createCompany(data: Partial<Company>) {
  return http.post<Company>('/companies', data).then((r) => r.data)
}
function updateCompany(id: string, data: Partial<Company>) {
  return http.put<Company>(`/companies/${id}`, data).then((r) => r.data)
}
function deleteCompany(id: string) {
  return http.delete(`/companies/${id}`)
}

export const companyKeys = {
  all: () => ['companies'] as const,
  one: (id: string) => ['companies', id] as const,
}

export function useCompanies() {
  return useQuery({
    queryKey: companyKeys.all(),
    queryFn: fetchCompanies,
  })
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: companyKeys.one(id),
    queryFn: () => fetchCompany(id),
    enabled: !!id,
  })
}

export function useCreateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Company>) => createCompany(data),
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
      updateCompany(id, data),
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
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyKeys.all() })
      toast.success('Empresa removida.')
    },
    onError: () => toast.error('Erro ao remover empresa.'),
  })
}
