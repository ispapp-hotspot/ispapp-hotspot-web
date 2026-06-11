import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import http from '@/lib/http'
import type { SessionListResponse } from '@/types'

function fetchActiveSessions(companyId: string, page = 0, size = 20) {
  return http
    .get<SessionListResponse>(`/companies/${companyId}/sessions`, {
      params: { status: 'active', page, size },
    })
    .then((r) => r.data)
}

function fetchSessionHistory(companyId: string, page = 0, size = 20) {
  return http
    .get<SessionListResponse>(`/companies/${companyId}/sessions`, {
      params: { page, size },
    })
    .then((r) => r.data)
}

export const sessionKeys = {
  active: (companyId: string, page: number, size: number) =>
    ['sessions', companyId, 'active', page, size] as const,
  history: (companyId: string, page: number, size: number) =>
    ['sessions', companyId, 'history', page, size] as const,
}

export function useActiveSessions(companyId: string, page = 0, size = 20) {
  return useQuery({
    queryKey: sessionKeys.active(companyId, page, size),
    queryFn: () => fetchActiveSessions(companyId, page, size),
    enabled: !!companyId,
    refetchInterval: 15_000,
  })
}

export function useSessions(companyId: string, page = 0, size = 20) {
  return useQuery({
    queryKey: sessionKeys.history(companyId, page, size),
    queryFn: () => fetchSessionHistory(companyId, page, size),
    enabled: !!companyId,
  })
}

export function useDisconnectSession(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: number) =>
      http.delete(`/companies/${companyId}/sessions/${sessionId}`),
    onSuccess: () => {
      toast.success('Sessão desconectada com sucesso')
      qc.invalidateQueries({ queryKey: ['sessions', companyId] })
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      const msg = status === 502
        ? 'Dispositivo não encontrou a sessão ativa. Pode já ter sido encerrada.'
        : status === 404
        ? 'Sessão não encontrada.'
        : 'Erro ao desconectar sessão'
      toast.error(msg)
    },
  })
}
