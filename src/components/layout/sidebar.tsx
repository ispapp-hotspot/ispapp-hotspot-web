'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import {
  ShieldCheck, LayoutDashboard, Wifi, Globe, Package,
  Activity, CreditCard, LogOut, BookOpen, HelpCircle,
  ScrollText, Users, Megaphone, Settings, Plug, ChevronDown,
} from 'lucide-react'
import { CompanySwitcher } from './company-switcher'

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/devices',    label: 'Dispositivos', icon: Wifi },
  { href: '/portals',    label: 'Portais',      icon: Globe },
  { href: '/leads',      label: 'Leads',        icon: Users },
  { href: '/campaigns',  label: 'Campanhas',    icon: Megaphone },
  { href: '/plans',      label: 'Planos',       icon: Package },
  { href: '/sessions',   label: 'Sessões',      icon: Activity },
]

const FINANCIAL_ITEMS = [
  { href: '/financial',                        label: 'Transações',            icon: CreditCard },
  { href: '/settings/integrations/gateways',   label: 'Gateways de Pagamento', icon: CreditCard },
]

const SETTINGS_ITEMS = [
  { href: '/settings/erp', label: 'ERP', icon: Plug },
]

const NAV_BOTTOM = [
  { href: '/tutorials', label: 'Tutoriais',         icon: BookOpen },
  { href: '/changelog', label: 'Changelog',         icon: ScrollText },
  { href: '/help',      label: 'Precisa de ajuda?', icon: HelpCircle },
]

export function Sidebar() {
  const pathname = usePathname()
  const logout   = useAuthStore((s) => s.logout)

  const isFinancialActive = pathname.startsWith('/financial') || pathname.startsWith('/settings/integrations/gateways')
  const isSettingsActive  = pathname.startsWith('/settings/erp')

  const [financialOpen, setFinancialOpen] = useState(isFinancialActive)
  const [settingsOpen,  setSettingsOpen]  = useState(isSettingsActive)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    logout()
    window.location.href = '/login'
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-[#141920] border-r border-white/5 overflow-y-auto fixed h-full z-40">
      <div className="flex items-center gap-3 px-6 h-16 border-b border-white/5 shrink-0">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
        <span className="text-base font-bold tracking-tight">
          ISP<span className="text-emerald-400">App</span>
          <span className="ml-1 text-xs font-normal text-neutral-500">Hotspot</span>
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive(href)
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'text-neutral-400 hover:bg-white/5 hover:text-white'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}

        {/* Financeiro group */}
        <div>
          <button
            onClick={() => setFinancialOpen(v => !v)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full',
              isFinancialActive
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'text-neutral-400 hover:bg-white/5 hover:text-white'
            )}
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">Financeiro</span>
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', financialOpen && 'rotate-180')} />
          </button>

          {financialOpen && (
            <div className="mt-0.5 ml-4 pl-3 border-l border-white/5 space-y-0.5">
              {FINANCIAL_ITEMS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive(href)
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>

      </nav>

      <div className="border-t border-white/5 pt-3 space-y-0.5">
        <div className="px-3 space-y-0.5">
          {/* Configurações group */}
          <div>
            <button
              onClick={() => setSettingsOpen(v => !v)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full',
                isSettingsActive
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-neutral-500 hover:bg-white/5 hover:text-neutral-300'
              )}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Configurações</span>
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', settingsOpen && 'rotate-180')} />
            </button>
            {settingsOpen && (
              <div className="mt-0.5 ml-4 pl-3 border-l border-white/5 space-y-0.5">
                {SETTINGS_ITEMS.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive(href)
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'text-neutral-500 hover:bg-white/5 hover:text-neutral-300'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {NAV_BOTTOM.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive(href)
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-neutral-500 hover:bg-white/5 hover:text-neutral-300'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </div>

        <CompanySwitcher />

        <div className="px-3 pb-4 pt-1">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-400 hover:bg-white/5 hover:text-white transition-colors w-full"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sair
          </button>
        </div>
      </div>
    </aside>
  )
}
