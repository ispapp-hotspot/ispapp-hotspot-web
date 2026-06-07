'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Company } from '@/types'

interface CompanyState {
  activeCompany: Company | null
  setActiveCompany: (company: Company) => void
  clearActiveCompany: () => void
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      activeCompany: null,
      setActiveCompany: (company) => set({ activeCompany: company }),
      clearActiveCompany: () => set({ activeCompany: null }),
    }),
    { name: 'hotspot-company' }
  )
)
