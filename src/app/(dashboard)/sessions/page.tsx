import { Activity } from "lucide-react";

export const metadata = { title: "Sessões — IspApp Hotspot" };

export default function SessionsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold tracking-tight">
                    Sessões
                </h1>
                <p className="text-sm text-neutral-400 mt-0.5">
                    Sessões ativas via Redis + histórico
                </p>
            </div>
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <Activity className="w-12 h-12 text-neutral-700 mb-4" />
                <p className="text-sm font-medium text-neutral-400">
                    Em construção
                </p>
                <p className="text-xs text-neutral-600 mt-1">
                    Leitura em tempo real do Redis
                </p>
            </div>
        </div>
    );
}
