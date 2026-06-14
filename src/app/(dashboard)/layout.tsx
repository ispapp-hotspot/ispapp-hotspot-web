"use client";

import { OnboardingGuard } from "@/components/dashboard/onboarding-guard";
import { AuthGuard } from "@/components/dashboard/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";

function DashboardFooter() {
    return (
        <footer className="border-t border-white/5 px-8 py-4 text-center text-xs text-neutral-600 shrink-0">
            © {new Date().getFullYear()} Todos os direitos reservados —{" "}
            <span className="text-neutral-500">IspApp Hotspot</span>
        </footer>
    );
}

const PAGE_LABELS: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/companies": "Empresas",
    "/devices": "Dispositivos",
    "/portals": "Portais",
    "/plans": "Planos",
    "/sessions": "Sessões",
    "/financial": "Financeiro",
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard>
            <div className="h-screen flex overflow-hidden bg-[#0C1117] text-white font-sans">
                <Sidebar />
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden md:ml-60">
                    <OnboardingGuard>
                        <main className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6 md:p-8 pt-16 md:pt-8">
                            {children}
                        </main>
                    </OnboardingGuard>
                    <DashboardFooter />
                </div>
            </div>
        </AuthGuard>
    );
}
