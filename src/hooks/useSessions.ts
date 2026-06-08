import { useQuery } from '@tanstack/react-query'
import http from '@/lib/http'
import type { HotspotSession } from '@/types'

function fetchActiveSessions(companyId: string) {
  return http.get<HotspotSession[]>(`/companies/${companyId}/sessions?status=active`).then((r) => r.data)
}
function fetchSessions(companyId: string, params?: Record<string, string>) {
  return http.get<HotspotSession[]>(`/companies/${companyId}/sessions`, { params }).then((r) => r.data)
}

export const sessionKeys = {
  active: (companyId: string) => ['sessions', companyId, 'active'] as const,
  list: (companyId: string, params?: Record<string, string>) =>
    ['sessions', companyId, params] as const,
}

export function useActiveSessions(companyId: string) {
  return useQuery({
    queryKey: sessionKeys.active(companyId),
    queryFn: () => fetchActiveSessions(companyId),
    enabled: !!companyId,
    refetchInterval: 30_000,
  })
}

export function useSessions(companyId: string, params?: Record<string, string>) {
  return useQuery({
    queryKey: sessionKeys.list(companyId, params),
    queryFn: () => fetchSessions(companyId, params),
    enabled: !!companyId,
  })
}
