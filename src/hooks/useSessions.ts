import { useQuery } from '@tanstack/react-query'
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
    refetchInterval: 30_000,
  })
}

export function useSessions(companyId: string, page = 0, size = 20) {
  return useQuery({
    queryKey: sessionKeys.history(companyId, page, size),
    queryFn: () => fetchSessionHistory(companyId, page, size),
    enabled: !!companyId,
  })
}
