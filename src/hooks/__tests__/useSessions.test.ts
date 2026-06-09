import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createTestQueryClient } from '@/test/utils'
import { QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import http from '@/lib/http'
import { useActiveSessions, useSessions, sessionKeys } from '../useSessions'
import type { SessionListResponse, HotspotSession } from '@/types'

vi.mock('@/lib/http', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const COMPANY_ID = 'company-abc'

const mockSession: HotspotSession = {
  id: 1,
  sessionId: 'sess-uuid-001',
  username: 'abc12345:AA:BB:CC:DD:EE:FF',
  identifier: 'AA:BB:CC:DD:EE:FF',
  macAddress: 'AA:BB:CC:DD:EE:FF',
  ipAddress: '192.168.1.100',
  nasIp: '10.0.0.1',
  deviceId: 'device-uuid-1',
  deviceName: 'Router-1',
  startAt: '2024-01-01T10:00:00Z',
  bytesIn: 1024,
  bytesOut: 2048,
  status: 'active',
}

const mockListResponse: SessionListResponse = {
  data: [mockSession],
  total: 1,
  page: 0,
  size: 20,
}

function wrapper() {
  const qc = createTestQueryClient()
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

describe('useActiveSessions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches active sessions with status=active param', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: mockListResponse })

    const { result } = renderHook(() => useActiveSessions(COMPANY_ID), {
      wrapper: wrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(http.get).toHaveBeenCalledWith(
      `/companies/${COMPANY_ID}/sessions`,
      { params: { status: 'active', page: 0, size: 20 } },
    )
    expect(result.current.data?.data).toHaveLength(1)
    expect(result.current.data?.total).toBe(1)
  })

  it('supports custom page and size', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { ...mockListResponse, page: 2, size: 10 } })

    const { result } = renderHook(() => useActiveSessions(COMPANY_ID, 2, 10), {
      wrapper: wrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(http.get).toHaveBeenCalledWith(
      `/companies/${COMPANY_ID}/sessions`,
      { params: { status: 'active', page: 2, size: 10 } },
    )
  })

  it('disabled when companyId empty', () => {
    const { result } = renderHook(() => useActiveSessions(''), {
      wrapper: wrapper(),
    })
    expect(result.current.fetchStatus).toBe('idle')
    expect(http.get).not.toHaveBeenCalled()
  })

  it('maps session fields correctly', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: mockListResponse })

    const { result } = renderHook(() => useActiveSessions(COMPANY_ID), {
      wrapper: wrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const session = result.current.data!.data[0]
    expect(session.id).toBe(1)
    expect(session.sessionId).toBe('sess-uuid-001')
    expect(session.identifier).toBe('AA:BB:CC:DD:EE:FF')
    expect(session.deviceName).toBe('Router-1')
    expect(session.status).toBe('active')
    expect(session.bytesIn).toBe(1024)
    expect(session.bytesOut).toBe(2048)
  })
})

describe('useSessions (history)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches session history without status param', async () => {
    const closedSession: HotspotSession = {
      ...mockSession,
      status: 'closed',
      stopAt: '2024-01-01T11:00:00Z',
      durationSec: 3600,
    }
    const historyResponse: SessionListResponse = { data: [closedSession], total: 5, page: 0, size: 20 }
    vi.mocked(http.get).mockResolvedValue({ data: historyResponse })

    const { result } = renderHook(() => useSessions(COMPANY_ID), {
      wrapper: wrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(http.get).toHaveBeenCalledWith(
      `/companies/${COMPANY_ID}/sessions`,
      { params: { page: 0, size: 20 } },
    )
    expect(result.current.data?.total).toBe(5)
    expect(result.current.data?.data[0].status).toBe('closed')
  })

  it('supports pagination params', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { ...mockListResponse, page: 1, size: 10 } })

    const { result } = renderHook(() => useSessions(COMPANY_ID, 1, 10), {
      wrapper: wrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(http.get).toHaveBeenCalledWith(
      `/companies/${COMPANY_ID}/sessions`,
      { params: { page: 1, size: 10 } },
    )
  })

  it('disabled when companyId empty', () => {
    const { result } = renderHook(() => useSessions(''), {
      wrapper: wrapper(),
    })
    expect(result.current.fetchStatus).toBe('idle')
    expect(http.get).not.toHaveBeenCalled()
  })
})

describe('sessionKeys', () => {
  it('active key includes page and size', () => {
    expect(sessionKeys.active('cid', 0, 20)).toEqual(['sessions', 'cid', 'active', 0, 20])
  })

  it('history key includes page and size', () => {
    expect(sessionKeys.history('cid', 1, 10)).toEqual(['sessions', 'cid', 'history', 1, 10])
  })

  it('active and history keys differ', () => {
    const active  = sessionKeys.active('cid', 0, 20)
    const history = sessionKeys.history('cid', 0, 20)
    expect(active).not.toEqual(history)
  })
})
