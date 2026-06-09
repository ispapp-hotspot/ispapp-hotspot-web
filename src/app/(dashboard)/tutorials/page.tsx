"use client";

import { cn } from "@/lib/utils";
import {
    BookOpen,
    ChevronRight,
    Globe,
    Package,
    Router,
    Shield,
    Wifi,
} from "lucide-react";
import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Step {
    title: string;
    description: string;
}

interface Tutorial {
    id: string;
    icon: React.ElementType;
    color: string;
    title: string;
    description: string;
    badge?: string;
    steps: Step[];
}

// ── Data ──────────────────────────────────────────────────────────────────────
const TUTORIALS: Tutorial[] = [
    {
        id: "provision-wireguard",
        icon: Wifi,
        color: "text-violet-400 bg-violet-500/10",
        title: "Provisionando MikroTik (RouterOS v7 — WireGuard)",
        description:
            "Conecte um roteador moderno via WireGuard e configure o hotspot automaticamente.",
        badge: "Recomendado",
        steps: [
            {
                title: "Adicionar dispositivo",
                description:
                    'Acesse Dispositivos → Novo Dispositivo. Selecione o tipo "MikroTik" e o túnel "WireGuard". Informe o IP local do roteador, usuário, senha e o portal captive desejado.',
            },
            {
                title: "Guardar as credenciais",
                description:
                    "Após provisionar, o sistema exibe a chave privada WireGuard e o NAS Secret. Guarde-os agora — não serão exibidos novamente.",
            },
            {
                title: "Auto Setup (opcional)",
                description:
                    'Clique em "Auto Setup agora". O ispapp se conecta ao MikroTik via RouterOS REST API e configura WireGuard, hotspot, RADIUS e walled garden automaticamente.',
            },
            {
                title: "Verificar status",
                description:
                    "Em poucos minutos o dispositivo aparece como ONLINE. Clique no nome do dispositivo para ver métricas de CPU, memória e uptime coletadas automaticamente.",
            },
        ],
    },
    {
        id: "provision-l2tp",
        icon: Router,
        color: "text-sky-400 bg-sky-500/10",
        title: "Provisionando MikroTik (RouterOS v6 — L2TP/IPsec)",
        description:
            "Configure roteadores antigos via L2TP usando um script gerado pelo dashboard.",
        badge: "RouterOS v6",
        steps: [
            {
                title: "Adicionar dispositivo",
                description:
                    'Acesse Dispositivos → Novo Dispositivo. Selecione o túnel "L2TP/IPsec". Informe IP, usuário e senha do roteador.',
            },
            {
                title: "Guardar credenciais L2TP",
                description:
                    "Salve o servidor L2TP, usuário, senha e IPsec PSK exibidos após o provisionamento.",
            },
            {
                title: "Gerar script de configuração",
                description:
                    'Clique em "Gerar Script". O sistema cria um script RouterOS completo com as configurações de L2TP, hotspot e RADIUS.',
            },
            {
                title: "Colar no terminal do MikroTik",
                description:
                    "Abra o Winbox → New Terminal. Cole o script gerado e aguarde a execução. O roteador se conectará ao servidor L2TP automaticamente.",
            },
        ],
    },
    {
        id: "portal",
        icon: Globe,
        color: "text-emerald-400 bg-emerald-500/10",
        title: "Criando um Portal Captive",
        description:
            "Configure a página de login que os clientes verão ao conectar no WiFi.",
        steps: [
            {
                title: "Criar portal",
                description:
                    "Acesse Portais → Novo Portal. Informe o nome do estabelecimento e o domínio público do portal (ex: hotspot.seuisp.com.br).",
            },
            {
                title: "Associar planos",
                description:
                    "Em Planos, crie os pacotes de acesso (ex: 1h grátis, R$ 10 / 24h). Cada plano define banda, tempo e preço.",
            },
            {
                title: "Vincular ao dispositivo",
                description:
                    "Ao provisionar ou editar um dispositivo, selecione o portal criado. O MikroTik redirecionará clientes para essa URL.",
            },
            {
                title: "Testar o fluxo",
                description:
                    "Conecte um celular no WiFi do MikroTik. O portal deve abrir automaticamente. Conclua uma compra de teste para validar RADIUS e liberação de acesso.",
            },
        ],
    },
    {
        id: "plans",
        icon: Package,
        color: "text-yellow-400 bg-yellow-500/10",
        title: "Configurando Planos de Acesso",
        description:
            "Defina pacotes com tempo, banda e preço para monetizar o hotspot.",
        steps: [
            {
                title: "Criar plano",
                description:
                    'Acesse Planos → Novo Plano. Defina nome (ex: "1 hora"), duração em minutos, limite de upload/download (Mbps) e preço.',
            },
            {
                title: "Cooldown entre compras",
                description:
                    "O campo Cooldown impede que o mesmo cliente compre novamente antes do tempo definido. Útil para planos gratuitos.",
            },
            {
                title: "Planos gratuitos",
                description:
                    "Defina o preço como R$ 0,00 para criar um plano de acesso cortesia. Combine com cooldown para controlar o uso.",
            },
            {
                title: "Visibilidade no portal",
                description:
                    "Apenas planos ativos aparecem no portal captive. Desative planos temporários sem precisar excluí-los.",
            },
        ],
    },
    {
        id: "radius",
        icon: Shield,
        color: "text-red-400 bg-red-500/10",
        title: "Entendendo o fluxo RADIUS",
        description:
            "Como o ispapp autentica e contabiliza sessões via FreeRADIUS.",
        steps: [
            {
                title: "Autenticação",
                description:
                    "Quando um cliente paga, o ispapp libera o acesso automaticamente. O MikroTik se comunica com o servidor de autenticação e recebe as configurações de banda definidas no plano.",
            },
            {
                title: "Contabilização",
                description:
                    "O MikroTik reporta o início, uso periódico e encerramento de cada sessão ao ispapp. Isso permite exibir sessões ativas e histórico em tempo real no dashboard.",
            },
            {
                title: "Identificação do dispositivo",
                description:
                    "Cada MikroTik é identificado pelo seu IP VPN. O ispapp usa esse IP para vincular sessões ao dispositivo correto e exibir métricas por roteador.",
            },
            {
                title: "NAS Secret",
                description:
                    "Cada dispositivo tem um NAS Secret único, gerado automaticamente no provisionamento. O script de Auto Setup ou script manual já o configura no MikroTik — nenhuma configuração manual necessária.",
            },
        ],
    },
];

// ── Components ────────────────────────────────────────────────────────────────
function TutorialCard({
    tutorial,
    onSelect,
}: {
    tutorial: Tutorial;
    onSelect: () => void;
}) {
    const Icon = tutorial.icon;
    return (
        <button
            onClick={onSelect}
            className="w-full text-left bg-[#141920] border border-white/5 rounded-xl p-5 hover:border-white/10 hover:bg-[#1a2130] transition-all group"
        >
            <div className="flex items-start gap-4">
                <div
                    className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        tutorial.color,
                    )}
                >
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors truncate">
                            {tutorial.title}
                        </p>
                        {tutorial.badge && (
                            <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-medium">
                                {tutorial.badge}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-neutral-500 line-clamp-2">
                        {tutorial.description}
                    </p>
                    <p className="text-xs text-neutral-600 mt-2">
                        {tutorial.steps.length} passos
                    </p>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 shrink-0 mt-1 transition-colors" />
            </div>
        </button>
    );
}

function TutorialDetail({
    tutorial,
    onBack,
}: {
    tutorial: Tutorial;
    onBack: () => void;
}) {
    const Icon = tutorial.icon;
    return (
        <div className="space-y-6">
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm text-neutral-500 hover:text-white transition-colors"
            >
                <ChevronRight className="w-4 h-4 rotate-180" />
                Voltar aos tutoriais
            </button>

            <div className="flex items-center gap-4">
                <div
                    className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                        tutorial.color,
                    )}
                >
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold">
                            {tutorial.title}
                        </h2>
                        {tutorial.badge && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-medium">
                                {tutorial.badge}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-neutral-500 mt-0.5">
                        {tutorial.description}
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {tutorial.steps.map((step, i) => (
                    <div
                        key={i}
                        className="flex gap-4 bg-[#141920] border border-white/5 rounded-xl p-5"
                    >
                        <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-emerald-400">
                                {i + 1}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white mb-1">
                                {step.title}
                            </p>
                            <p className="text-sm text-neutral-400 leading-relaxed">
                                {step.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TutorialsPage() {
    const [selected, setSelected] = useState<Tutorial | null>(null);

    if (selected) {
        return (
            <TutorialDetail
                tutorial={selected}
                onBack={() => setSelected(null)}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">
                        Tutoriais
                    </h1>
                    <p className="text-sm text-neutral-400 mt-0.5">
                        Guias passo a passo para configurar e usar o ispapp
                        Hotspot
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {TUTORIALS.map((t) => (
                    <TutorialCard
                        key={t.id}
                        tutorial={t}
                        onSelect={() => setSelected(t)}
                    />
                ))}
            </div>
        </div>
    );
}
