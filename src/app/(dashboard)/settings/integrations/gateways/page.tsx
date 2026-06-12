'use client'

import Link from 'next/link'
import { ChevronRight, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'

const GATEWAY_CATALOG = [
  {
    id:          'mercadopago',
    gatewayType: 'MERCADO_PAGO',
    name:        'Mercado Pago',
    description: 'Checkout Transparente — Cartão de crédito e Pix sem redirecionamento',
    logo:        'MP',
    logoColor:   '#009EE3',
    available:   true,
    href:        '/settings/integrations/gateways/mercadopago',
  },
  {
    id:          'efi',
    gatewayType: 'EFI',
    name:        'EFI Bank (Gerencianet)',
    description: 'Pix e Boleto — integração nativa com o ecossistema Pix do Banco Central',
    logo:        'EFI',
    logoColor:   '#00b86e',
    available:   false,
    href:        '#',
  },
]

export default function GatewaysPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gateways de Pagamento</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Configure um gateway por empresa para aceitar pagamentos nos portais com planos pagos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {GATEWAY_CATALOG.map(gw => {
          return (
            <Link
              key={gw.id}
              href={gw.available ? gw.href : '#'}
              className={cn(
                'group block bg-[#141920] border rounded-2xl p-5 transition-all',
                gw.available
                  ? 'border-white/5 hover:border-white/15 cursor-pointer'
                  : 'border-white/5 opacity-50 cursor-not-allowed pointer-events-none'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-black text-sm"
                  style={{ backgroundColor: gw.logoColor + '20', color: gw.logoColor }}
                >
                  {gw.logo}
                </div>

                {!gw.available && (
                  <span className="text-xs text-neutral-500 bg-white/5 px-2 py-1 rounded-full">Em breve</span>
                )}
              </div>

              <div className="mt-4">
                <p className="text-sm font-semibold text-white">{gw.name}</p>
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{gw.description}</p>
              </div>

              {gw.available && (
                <div className="flex items-center gap-1 mt-4 text-xs font-medium text-neutral-400 group-hover:text-emerald-400 transition-colors">
                  Configurar por empresa
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              )}
            </Link>
          )
        })}
      </div>

      {/* Info */}
      <div className="bg-[#141920] border border-white/5 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-sm font-semibold text-white">Como funciona</p>
        </div>
        <ol className="space-y-2 text-sm text-neutral-400 list-decimal list-inside leading-relaxed">
          <li>Configure o Mercado Pago com suas chaves de produção</li>
          <li>Clique em &ldquo;Definir como gateway ativo&rdquo; na página de configuração</li>
          <li>Crie planos pagos na tela de Planos</li>
          <li>Vincule a um portal — o cliente escolhe o plano e paga via Pix</li>
          <li>O acesso é liberado automaticamente após a confirmação</li>
        </ol>
      </div>
    </div>
  )
}
