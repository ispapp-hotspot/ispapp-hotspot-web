'use client'

import { useRef, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { companiesApi } from '@/services/api'
import { useCompanyStore } from '@/store/company'
import { cn } from '@/lib/utils'
import { Building2, ChevronsUpDown, Check, Plus } from 'lucide-react'
import Link from 'next/link'

export function CompanySwitcher() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { activeCompany, setActiveCompany } = useCompanyStore()

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: companiesApi.list,
  })

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Auto-seleciona primeira empresa se nenhuma ativa
  useEffect(() => {
    if (!activeCompany && companies.length > 0) {
      setActiveCompany(companies[0])
    }
  }, [companies, activeCompany, setActiveCompany])

  return (
    <div ref={ref} className="relative px-3 pb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-300 hover:bg-white/5 transition-colors border border-white/10"
      >
        <Building2 className="w-4 h-4 shrink-0 text-emerald-400" />
        <span className="flex-1 text-left truncate text-sm">
          {activeCompany?.name ?? 'Selecionar empresa'}
        </span>
        <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 text-neutral-500" />
      </button>

      {open && (
        <div className="absolute bottom-full left-3 right-3 mb-1 bg-[#1c2530] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
          {companies.length === 0 ? (
            <div className="px-3 py-2.5 text-xs text-neutral-500">Nenhuma empresa</div>
          ) : (
            companies.map((company) => {
              const isActive = company.id === activeCompany?.id
              return (
                <button
                  key={company.id}
                  onClick={() => { setActiveCompany(company); setOpen(false) }}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left transition-colors',
                    isActive
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-neutral-300 hover:bg-white/5'
                  )}
                >
                  <span className="flex-1 truncate">{company.name}</span>
                  {isActive && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              )
            })
          )}
          <div className="border-t border-white/5">
            <Link
              href="/companies"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-neutral-500 hover:bg-white/5 hover:text-neutral-300 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Gerenciar empresas
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
