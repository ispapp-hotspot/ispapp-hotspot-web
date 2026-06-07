'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { companiesApi } from '@/services/api'
import { ShieldCheck } from 'lucide-react'

function Spinner() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center animate-pulse">
        <ShieldCheck className="w-5 h-5 text-white" />
      </div>
    </div>
  )
}

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [redirecting, setRedirecting] = useState(false)

  const { data: companies, isLoading, isError } = useQuery({
    queryKey: ['companies'],
    queryFn: companiesApi.list,
    retry: 1,
  })

  useEffect(() => {
    if (isLoading || isError) return
    if (companies && companies.length === 0 && pathname !== '/onboarding') {
      setRedirecting(true)
      router.replace('/onboarding')
    }
  }, [companies, isLoading, isError, pathname, router])

  if (isLoading || redirecting) return <Spinner />

  return <>{children}</>
}
