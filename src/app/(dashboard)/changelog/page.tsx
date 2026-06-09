'use client'

import { ScrollText, Zap, Bug, Wrench, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────
type ChangeType = 'feature' | 'fix' | 'improvement' | 'breaking'

interface Change {
  type: ChangeType
  text: string
}

interface Release {
  version: string
  date: string
  highlight?: string
  changes: Change[]
}

// ── Data ──────────────────────────────────────────────────────────────────────
const RELEASES: Release[] = [
  {
    version: '1.3.0',
    date: '2025-06-09',
    highlight: 'Métricas de dispositivos em tempo real',
    changes: [
      { type: 'feature',     text: 'Coleta automática de métricas RouterOS: CPU, RAM, disco, uptime, versão e modelo do hardware' },
      { type: 'feature',     text: 'Modal de detalhes do dispositivo com barras de uso e histórico de handshake' },
      { type: 'feature',     text: 'Suporte a L2TP/IPsec para MikroTik RouterOS v6 (dispositivos legados)' },
      { type: 'feature',     text: 'Geração de script de configuração para RouterOS v6 via dashboard' },
      { type: 'improvement', text: 'Auto Setup detecta automaticamente o tipo de túnel (WireGuard ou L2TP)' },
      { type: 'improvement', text: 'Auto Setup detecta e usa configuração de servidor correta para L2TP automaticamente' },
      { type: 'improvement', text: 'Isolamento entre dispositivos L2TP: clientes de roteadores diferentes não se comunicam' },
      { type: 'fix',         text: 'Auto Setup L2TP não abria tela de script ao provisionar dispositivos RouterOS v6' },
      { type: 'fix',         text: 'Campo servidor L2TP aparecia vazio em ambientes sem configuração explícita' },
    ],
  },
  {
    version: '1.2.0',
    date: '2025-05-20',
    highlight: 'Dashboard de sessões e dados reais',
    changes: [
      { type: 'feature',     text: 'Página de sessões com abas Ativas / Histórico e paginação' },
      { type: 'feature',     text: 'Dashboard principal com dados reais: sessões ativas, dispositivos, transações e leads' },
      { type: 'feature',     text: 'Scheduler de health check a cada 2 minutos via WireGuard peer status' },
      { type: 'improvement', text: 'Tabela de sessões exibe MAC, IP, bytes trafegados e duração formatada' },
      { type: 'fix',         text: 'Erro de metadata + use client na página de sessões' },
      { type: 'fix',         text: 'Sessões não exibiam dados corretos do dispositivo ao filtrar por roteador' },
    ],
  },
  {
    version: '1.1.0',
    date: '2025-04-10',
    highlight: 'Autenticação e multi-tenant',
    changes: [
      { type: 'feature',     text: 'Login integrado com a plataforma ispapp' },
      { type: 'feature',     text: 'Sessão segura e independente após autenticação' },
      { type: 'feature',     text: 'Multi-empresa: seletor na sidebar, todas as queries filtradas por companyId' },
      { type: 'feature',     text: 'Onboarding guard: redireciona para criação de empresa no primeiro acesso' },
      { type: 'improvement', text: 'TanStack Query v5 com invalidação automática após mutations' },
    ],
  },
  {
    version: '1.0.0',
    date: '2025-03-01',
    highlight: 'Lançamento inicial',
    changes: [
      { type: 'feature', text: 'Provisionamento de dispositivos MikroTik via WireGuard' },
      { type: 'feature', text: 'Auto Setup via RouterOS REST API (v7+)' },
      { type: 'feature', text: 'Portal captive com pagamento via PIX (Mercado Pago / Efí)' },
      { type: 'feature', text: 'Planos de acesso com controle de banda via RADIUS' },
      { type: 'feature', text: 'Controle de sessões com autenticação e contabilização automática' },
      { type: 'feature', text: 'Walled garden com domínios de bancos e gateways pré-configurados' },
      { type: 'feature', text: 'Campanhas e leads para captura de dados de clientes' },
    ],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<ChangeType, { label: string; color: string; icon: React.ElementType }> = {
  feature:     { label: 'Novo',     color: 'text-emerald-400 bg-emerald-500/10', icon: Plus },
  improvement: { label: 'Melhoria', color: 'text-blue-400   bg-blue-500/10',    icon: Zap },
  fix:         { label: 'Correção', color: 'text-yellow-400 bg-yellow-500/10',  icon: Bug },
  breaking:    { label: 'Breaking', color: 'text-red-400    bg-red-500/10',     icon: Wrench },
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ChangelogPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <ScrollText className="w-5 h-5 text-emerald-400" />
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Changelog</h1>
          <p className="text-sm text-neutral-400 mt-0.5">Histórico de versões e atualizações do ispapp Hotspot</p>
        </div>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/5" />

        <div className="space-y-8 pl-8">
          {RELEASES.map((release, i) => (
            <div key={release.version} className="relative">
              {/* Dot */}
              <div className={cn(
                'absolute -left-8 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-[#0C1117]',
                i === 0 ? 'bg-emerald-500' : 'bg-neutral-700'
              )} />

              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <span className={cn(
                  'text-sm font-bold font-mono px-2.5 py-0.5 rounded-full',
                  i === 0
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-neutral-300'
                )}>
                  v{release.version}
                </span>
                <span className="text-xs text-neutral-600">{formatDate(release.date)}</span>
                {i === 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                    Atual
                  </span>
                )}
              </div>

              {release.highlight && (
                <p className="text-sm font-medium text-white mb-3">{release.highlight}</p>
              )}

              {/* Changes */}
              <div className="space-y-1.5">
                {release.changes.map((change, j) => {
                  const { label, color, icon: Icon } = TYPE_CONFIG[change.type]
                  return (
                    <div key={j} className="flex items-start gap-3">
                      <span className={cn('shrink-0 inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium mt-0.5', color)}>
                        <Icon className="w-2.5 h-2.5" />
                        {label}
                      </span>
                      <p className="text-sm text-neutral-400 leading-relaxed">{change.text}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
