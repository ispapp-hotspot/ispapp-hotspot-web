'use client'

import { useState } from 'react'
import {
  HelpCircle, Mail, MessageSquare, ChevronDown,
  ExternalLink, AlertTriangle, BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQ = [
  {
    q: 'O dispositivo ficou OFFLINE. O que verificar?',
    a: 'Verifique se o túnel VPN está ativo no MikroTik (WireGuard: /interface/wireguard — deve mostrar R running; L2TP: /interface/l2tp-client — deve mostrar C connecting ou R running). Confirme que o IP do servidor VPN está acessível a partir do roteador e que as portas UDP 51820 (WireGuard) ou 1701/500/4500 (L2TP) estão abertas no firewall do servidor.',
  },
  {
    q: 'O portal captive não abre para os clientes.',
    a: 'Confirme que o hotspot está ativo no MikroTik (IP → Hotspot → Servers). Verifique se o URL do portal no hotspot profile aponta para o domínio correto. Certifique-se que o domínio do portal está no walled garden — sem isso o cliente não consegue acessar a página de login antes de se autenticar.',
  },
  {
    q: 'O Auto Setup falhou. O que aconteceu?',
    a: 'O Auto Setup exige que o MikroTik esteja acessível via IP VPN (wg_ip) na porta 8728. Verifique: (1) o dispositivo está ONLINE no dashboard; (2) a API RouterOS está habilitada no MikroTik (IP → Services → api deve estar enabled); (3) o usuário tem permissão de "full". Para RouterOS v6, use a opção de script manual em vez do Auto Setup.',
  },
  {
    q: 'Cliente pagou mas não consegue acessar a internet.',
    a: 'Verifique as sessões em Sessões → Ativas. Se a sessão aparece, o RADIUS autenticou mas a liberação pode ter falhado — confira o perfil do hotspot no MikroTik. Se não aparece, o acesso foi negado: verifique se o NAS Secret no MikroTik corresponde ao exibido no provisionamento e se o dispositivo está com status ONLINE no dashboard.',
  },
  {
    q: 'Como alterar a banda de um plano sem afetar sessões ativas?',
    a: 'Edite o plano no dashboard. A nova configuração de banda (Rate-Limit) é enviada ao FreeRADIUS via atributos mikrotik no Access-Accept. Sessões já autenticadas só receberão a nova banda na próxima reconexão ou quando o interim-update do RADIUS for processado.',
  },
  {
    q: 'Posso usar múltiplos MikroTiks no mesmo portal?',
    a: 'Sim. Cada MikroTik é um dispositivo independente, mas todos podem usar o mesmo portal captive e os mesmos planos. O RADIUS identifica cada roteador pelo seu IP VPN (NAS-IP-Address), então cada um precisa de um IP único na subnet VPN.',
  },
  {
    q: 'O que é o NAS Secret e onde configurá-lo no MikroTik?',
    a: 'O NAS Secret é a senha compartilhada entre o MikroTik e o FreeRADIUS para autenticar pacotes RADIUS. No MikroTik: Radius → adicione o servidor com o IP do FreeRADIUS e o Secret exibido no provisionamento. O script de Auto Setup ou script manual já configura isso automaticamente.',
  },
  {
    q: 'Como funciona o walled garden?',
    a: 'O walled garden é uma lista de domínios e IPs que os clientes podem acessar antes de se autenticar no portal. O ispapp pré-configura os domínios de portais de pagamento (Mercado Pago, Efí, bancos) necessários para o fluxo de compra funcionar. Para adicionar domínios extras entre em contato com o suporte.',
  },
]

// ── Component ─────────────────────────────────────────────────────────────────
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left group"
      >
        <span className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
          {q}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-neutral-500 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <p className="text-sm text-neutral-400 leading-relaxed pb-4">{a}</p>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HelpPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center gap-3">
        <HelpCircle className="w-5 h-5 text-emerald-400" />
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Suporte</h1>
          <p className="text-sm text-neutral-400 mt-0.5">Tire suas dúvidas ou entre em contato com a equipe ispapp</p>
        </div>
      </div>

      {/* Contato */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href="mailto:suporte@ispapp.com.br"
          className="flex items-start gap-4 bg-[#141920] border border-white/5 rounded-xl p-5 hover:border-emerald-500/30 hover:bg-[#1a2130] transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
              E-mail
            </p>
            <p className="text-xs text-neutral-500 mt-0.5">suporte@ispapp.com.br</p>
            <p className="text-xs text-neutral-600 mt-2">Resposta em até 24h úteis</p>
          </div>
        </a>

        <a
          href="https://wa.me/5500000000000"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-4 bg-[#141920] border border-white/5 rounded-xl p-5 hover:border-emerald-500/30 hover:bg-[#1a2130] transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                WhatsApp
              </p>
              <ExternalLink className="w-3 h-3 text-neutral-600" />
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">Chat direto com o suporte</p>
            <p className="text-xs text-neutral-600 mt-2">Seg–Sex, 9h às 18h</p>
          </div>
        </a>
      </div>

      {/* Aviso */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-yellow-500/5 border border-yellow-500/15">
        <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-300 leading-relaxed">
          Para problemas com dispositivos offline ou configurações VPN, inclua no contato:
          o nome do dispositivo, tipo de túnel (WireGuard / L2TP) e versão do RouterOS.
        </p>
      </div>

      {/* FAQ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Perguntas frequentes</h2>
          <Link
            href="/tutorials"
            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-emerald-400 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Ver tutoriais
          </Link>
        </div>

        <div className="bg-[#141920] border border-white/5 rounded-xl px-5">
          {FAQ.map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </div>
  )
}
