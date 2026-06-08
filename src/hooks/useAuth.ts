import { useMutation } from '@tanstack/react-query'
import http from '@/lib/http'
import type { TokenResponse, IspUser } from '@/types'

function login(data: { email: string; password: string }) {
  return fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(async (r) => {
    const d = await r.json()
    if (!r.ok) throw new Error(d.message ?? 'Erro ao fazer login')
    return d as Pick<TokenResponse, 'name' | 'email' | 'role'>
  })
}

function me() {
  return http.get<IspUser>('/auth/me').then((r) => r.data)
}

export function useLogin() {
  return useMutation({
    mutationFn: login,
  })
}

export function useMe() {
  return useMutation({ mutationFn: me })
}
