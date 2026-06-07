'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { companiesApi } from '@/services/api'
import { useCompanyStore } from '@/store/company'
import { toast } from 'sonner'
import { ShieldCheck, Building2, Loader2 } from 'lucide-react'
import type { Company } from '@/types'

const TYPES: { value: Company['type']; label: string; description: string }[] = [
  { value: 'hotel',      label: 'Hotel',       description: 'Hospedagem e pousadas' },
  { value: 'bar',        label: 'Bar',         description: 'Bares e lanchonetes' },
  { value: 'restaurant', label: 'Restaurante', description: 'Restaurantes e cafés' },
  { value: 'event',      label: 'Evento',      description: 'Feiras, shows e eventos' },
  { value: 'general',    label: 'Geral',       description: 'Outros estabelecimentos' },
]

const schema = z.object({
  name: z.string().min(2, 'Informe o nome da empresa.'),
  type: z.enum(['hotel', 'bar', 'restaurant', 'event', 'general']),
  cnpj: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const inputCls = 'w-full h-11 px-3 rounded-lg bg-[#1a2130] border border-white/10 focus:border-emerald-500 text-white placeholder:text-neutral-600 text-sm outline-none transition-colors'
const labelCls = 'text-xs uppercase tracking-wider text-neutral-400 mb-1.5 block'

export default function OnboardingPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const setActiveCompany = useCompanyStore((s) => s.setActiveCompany)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'general' },
  })

  const selectedType = watch('type')

  const create = useMutation({
    mutationFn: (data: Partial<Company>) => companiesApi.create(data),
    onSuccess: (company) => {
      qc.invalidateQueries({ queryKey: ['companies'] })
      setActiveCompany(company)
      toast.success(`${company.name} criada com sucesso!`)
      router.push('/dashboard')
    },
    onError: () => toast.error('Erro ao criar empresa. Tente novamente.'),
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0C1117] text-white font-sans px-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            ISP<span className="text-emerald-400">App</span>
            <span className="ml-2 text-sm font-normal text-neutral-500">Hotspot</span>
          </span>
        </div>

        <div className="bg-[#141920] border border-white/5 rounded-2xl px-8 py-10">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <Building2 className="w-6 h-6 text-emerald-400" />
          </div>

          <h2 className="text-2xl font-semibold tracking-tight mb-1">
            Cadastre sua primeira empresa
          </h2>
          <p className="text-sm text-neutral-400 mb-8">
            Você precisará de pelo menos uma empresa para gerenciar dispositivos e portais.
          </p>

          <form onSubmit={handleSubmit((data) => create.mutate(data))} className="space-y-5">
            <div>
              <label className={labelCls}>Nome da empresa</label>
              <input
                {...register('name')}
                className={inputCls}
                placeholder="Ex: Hotel Exemplo"
                autoFocus
              />
              {errors.name && (
                <p className="text-xs text-red-400 mt-1.5">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className={labelCls}>Tipo de estabelecimento</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue('type', value)}
                    className={`px-3 py-2.5 rounded-lg border text-sm font-medium text-left transition-all ${
                      selectedType === value
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                        : 'border-white/10 bg-[#1a2130] text-neutral-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>
                CNPJ <span className="normal-case text-neutral-600">(opcional)</span>
              </label>
              <input
                {...register('cnpj')}
                className={inputCls}
                placeholder="00.000.000/0000-00"
              />
            </div>

            <button
              type="submit"
              disabled={create.isPending}
              className="w-full h-11 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
            >
              {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {create.isPending ? 'Criando...' : 'Continuar para o dashboard'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-neutral-600 mt-6">
          Você poderá adicionar mais empresas depois em{' '}
          <span className="text-neutral-500">Empresas</span>.
        </p>
      </div>
    </div>
  )
}
