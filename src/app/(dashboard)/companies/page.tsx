'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { companiesApi } from '@/services/api'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Building2, Pencil, Trash2, X, Loader2 } from 'lucide-react'
import type { Company } from '@/types'

const TYPES: { value: Company['type']; label: string }[] = [
  { value: 'hotel',      label: 'Hotel' },
  { value: 'bar',        label: 'Bar' },
  { value: 'restaurant', label: 'Restaurante' },
  { value: 'event',      label: 'Evento' },
  { value: 'general',    label: 'Geral' },
]

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  type: z.enum(['hotel', 'bar', 'restaurant', 'event', 'general']),
  cnpj: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const TYPE_BADGE: Record<Company['type'], string> = {
  hotel:      'bg-blue-500/10 text-blue-400 border-blue-500/20',
  bar:        'bg-purple-500/10 text-purple-400 border-purple-500/20',
  restaurant: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  event:      'bg-pink-500/10 text-pink-400 border-pink-500/20',
  general:    'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
}

function Modal({
  title, onClose, children,
}: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#141920] border border-white/10 rounded-xl w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function CompanyForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: Partial<FormData>
  onSubmit: (data: FormData) => void
  isPending: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'general', ...defaultValues },
  })

  const inputCls = 'w-full h-10 px-3 rounded-lg bg-[#1a2130] border border-white/10 focus:border-emerald-500 text-white placeholder:text-neutral-600 text-sm outline-none transition-colors'
  const labelCls = 'text-xs uppercase tracking-wider text-neutral-400 mb-1.5 block'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className={labelCls}>Nome</label>
        <input {...register('name')} className={inputCls} placeholder="Hotel Exemplo" />
        {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className={labelCls}>Tipo</label>
        <select {...register('type')} className={inputCls + ' cursor-pointer'}>
          {TYPES.map(({ value, label }) => (
            <option key={value} value={value} className="bg-[#1a2130]">{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>CNPJ <span className="normal-case text-neutral-600">(opcional)</span></label>
        <input {...register('cnpj')} className={inputCls} placeholder="00.000.000/0000-00" />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full h-10 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
      >
        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        Salvar
      </button>
    </form>
  )
}

export default function CompaniesPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<'create' | { edit: Company } | null>(null)

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: companiesApi.list,
  })

  const create = useMutation({
    mutationFn: (data: Partial<Company>) => companiesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] })
      toast.success('Empresa criada!')
      setModal(null)
    },
    onError: () => toast.error('Erro ao criar empresa'),
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Company> }) =>
      companiesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] })
      toast.success('Empresa atualizada!')
      setModal(null)
    },
    onError: () => toast.error('Erro ao atualizar empresa'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => companiesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] })
      toast.success('Empresa removida')
    },
    onError: () => toast.error('Erro ao remover empresa'),
  })

  function confirmDelete(company: Company) {
    if (confirm(`Remover "${company.name}"? Esta ação não pode ser desfeita.`)) {
      remove.mutate(company.id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Empresas</h1>
          <p className="text-sm text-neutral-400 mt-0.5">{companies.length} empresa(s) cadastrada(s)</p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Nova Empresa
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-[#141920] rounded-xl animate-pulse border border-white/5" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="w-12 h-12 text-neutral-700 mb-4" />
          <p className="text-sm font-medium text-neutral-400">Nenhuma empresa cadastrada</p>
          <p className="text-xs text-neutral-600 mt-1">Crie sua primeira empresa para começar</p>
        </div>
      ) : (
        <div className="bg-[#141920] border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-neutral-500 font-medium">Nome</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-neutral-500 font-medium">Tipo</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-neutral-500 font-medium">CNPJ</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-neutral-500 font-medium">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{company.name}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${TYPE_BADGE[company.type]}`}>
                      {TYPES.find((t) => t.value === company.type)?.label ?? company.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-neutral-400 font-mono text-xs">{company.cnpj ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${company.active ? 'text-emerald-400' : 'text-neutral-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${company.active ? 'bg-emerald-400' : 'bg-neutral-500'}`} />
                      {company.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setModal({ edit: company })}
                        className="p-1.5 text-neutral-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => confirmDelete(company)}
                        className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'create' && (
        <Modal title="Nova Empresa" onClose={() => setModal(null)}>
          <CompanyForm
            onSubmit={(data) => create.mutate(data)}
            isPending={create.isPending}
          />
        </Modal>
      )}

      {modal !== null && modal !== 'create' && (
        <Modal title="Editar Empresa" onClose={() => setModal(null)}>
          <CompanyForm
            defaultValues={{ name: modal.edit.name, type: modal.edit.type, cnpj: modal.edit.cnpj }}
            onSubmit={(data) => update.mutate({ id: modal.edit.id, data })}
            isPending={update.isPending}
          />
        </Modal>
      )}
    </div>
  )
}
