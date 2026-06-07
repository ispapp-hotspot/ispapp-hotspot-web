'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Faz uma requisição leve para checar se o cookie é válido.
    // O proxy injeta o Authorization header — se não tiver cookie, retorna 401/redirect.
    fetch('/api/auth/me')
      .then((r) => {
        if (r.ok) {
          setReady(true)
        } else {
          router.replace('/login')
        }
      })
      .catch(() => router.replace('/login'))
  }, [router])

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0C1117]">
        <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center animate-pulse">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
