'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '@/services/api'
import { useAuthStore } from '@/store/auth'
import { toast } from 'sonner'

const ERP_TYPES = ['SGP', 'IXC', 'Beesweb', 'MKAuth']

const schema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Senha obrigatória.'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const [showPass, setShowPass] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      const result = await authApi.login(data)
      setUser({ name: result.name, email: result.email, role: result.role })
      window.location.href = '/dashboard'
    } catch {
      toast.error('Email ou senha inválidos')
    }
  }

  return (
    <div className="min-h-screen flex bg-[#0C1117] text-white font-sans">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex flex-col justify-between flex-1 px-12 py-12 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />

        <div className="flex items-center gap-3 z-10">
          <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            ISP<span className="text-emerald-400">App</span>
            <span className="ml-2 text-sm font-normal text-neutral-500">Hotspot</span>
          </span>
        </div>

        <div className="z-10 mb-16">
          <h1 className="text-4xl font-bold leading-tight tracking-tight mb-3">
            Gerencie seu hotspot
            <br />
            com <span className="text-emerald-400">inteligência</span>
          </h1>
          <p className="text-sm text-neutral-400 leading-relaxed max-w-xs">
            WireGuard, FreeRADIUS e portal captive centralizados em um só lugar.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            {ERP_TYPES.map((erp) => (
              <span
                key={erp}
                className="text-xs font-medium px-3 py-1 rounded-full border border-emerald-500/30 text-emerald-400 bg-emerald-500/5"
              >
                {erp}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="w-full lg:w-[420px] bg-[#141920] border-l border-white/5 flex flex-col justify-center px-12 py-14">
        <div className="flex items-center gap-2 mb-10 lg:hidden">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold">
            ISP<span className="text-emerald-400">App</span> Hotspot
          </span>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight mb-1">Entrar na conta</h2>
          <p className="text-sm text-neutral-400">Informe suas credenciais para continuar</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-0">
          <div className="mb-4">
            <label className="text-xs uppercase tracking-wider text-neutral-400 mb-1.5 block">
              E-mail
            </label>
            <input
              type="email"
              autoComplete="email"
              placeholder="voce@empresa.com"
              {...register('email')}
              className="w-full h-11 px-3 rounded-lg bg-[#1a2130] border border-white/10 focus:border-emerald-500 text-white placeholder:text-neutral-600 text-sm outline-none transition-colors"
            />
            {errors.email && (
              <p className="text-xs text-red-400 mt-1.5">{errors.email.message}</p>
            )}
          </div>

          <div className="mb-3">
            <label className="text-xs uppercase tracking-wider text-neutral-400 mb-1.5 block">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
                className="w-full h-11 px-3 pr-11 rounded-lg bg-[#1a2130] border border-white/10 focus:border-emerald-500 text-white placeholder:text-neutral-600 text-sm outline-none transition-colors"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-400 mt-1.5">{errors.password.message}</p>
            )}
          </div>

          <div className="flex justify-end mb-6">
            <button type="button" className="text-xs text-emerald-400 hover:underline">
              Esqueci minha senha
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
