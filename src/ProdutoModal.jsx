import { useEffect, useState } from 'react'
import { X, Save, Tag, Check, Package, Sparkles, Loader2 } from 'lucide-react'
import { api } from './api.js'
import { useToast } from './toast.jsx'

const brl = (v) => (v == null || v === '' ? '—' : 'R$ ' + Number(v).toFixed(2).replace('.', ','))

export default function ProdutoModal({ produtoId, onClose, onSaved }) {
  const notify = useToast()
  const [d, setD] = useState(null)
  const [form, setForm] = useState(null)
  const [erro, setErro] = useState('')
  const [saving, setSaving] = useState(false)
  const [aplicando, setAplicando] = useState(null)

  const carregar = () => {
    setErro('')
    api.produtoDetalhe(produtoId)
      .then((x) => {
        setD(x)
        setForm({
          nome: x.nome ?? '', preco: x.preco ?? '', custo: x.custo ?? '',
          ncm: x.ncm ?? '', gtin: x.gtin ?? '',
          peso_bruto: x.peso_bruto ?? '', peso_liquido: x.peso_liquido ?? '',
          descricao_curta: x.descricao_curta ?? '',
        })
      })
      .catch((e) => setErro(e.message))
  }
  useEffect(carregar, [produtoId])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const salvar = async (campos, msg) => {
    setSaving(true)
    try {
      await api.produtoAtualizar(produtoId, campos)
      notify(msg || 'Produto atualizado no Bling', 'ok')
      carregar()
      onSaved && onSaved()
    } catch (e) { notify(e.message, 'danger') }
    setSaving(false)
  }

  const salvarTudo = () => salvar(form, 'Alterações salvas no Bling')

  const aplicarPreco = async (canal) => {
    setAplicando(canal.canal)
    try {
      await api.produtoAtualizar(produtoId, { preco: canal.preco_sugerido })
      notify(`Preço de ${canal.nome} aplicado: ${brl(canal.preco_sugerido)}`, 'ok')
      carregar()
      onSaved && onSaved()
    } catch (e) { notify(e.message, 'danger') }
    setAplicando(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
         style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-2xl my-auto" onClick={(e) => e.stopPropagation()}
           style={{ background: 'var(--bg)' }}>
        {/* Cabeçalho */}
        <div className="flex items-start gap-3 p-5 border-b" style={{ borderColor: 'var(--glass-border)' }}>
          <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
               style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>
            <Package size={20} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display font-semibold truncate">{d?.nome || 'Carregando…'}</div>
            <div className="text-xs text-faint num">{d?.sku}</div>
          </div>
          <button onClick={onClose} className="text-dim hover:text-fg p-1"><X size={20} /></button>
        </div>

        {erro ? (
          <div className="p-8 text-center text-dim text-sm">{erro}</div>
        ) : !form ? (
          <div className="p-10 grid place-items-center text-dim"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="p-5 space-y-6">
            {/* Dados do produto */}
            <section>
              <h4 className="text-sm font-semibold flex items-center gap-2 mb-3"><Tag size={15} className="text-accent" /> Dados do produto</h4>
              <div className="grid grid-cols-2 gap-3">
                <Campo className="col-span-2" label="Nome" value={form.nome} onChange={(v) => set('nome', v)} />
                <Campo label="Preço (R$)" type="number" value={form.preco} onChange={(v) => set('preco', v)} />
                <Campo label="Custo (R$)" type="number" value={form.custo} onChange={(v) => set('custo', v)} />
                <Campo label="NCM" value={form.ncm} onChange={(v) => set('ncm', v)} />
                <Campo label="GTIN / EAN" value={form.gtin} onChange={(v) => set('gtin', v)} />
                <Campo label="Peso bruto (kg)" type="number" value={form.peso_bruto} onChange={(v) => set('peso_bruto', v)} />
                <Campo label="Peso líquido (kg)" type="number" value={form.peso_liquido} onChange={(v) => set('peso_liquido', v)} />
                <div className="col-span-2">
                  <label className="text-xs text-dim">Descrição curta</label>
                  <textarea value={form.descricao_curta} onChange={(e) => set('descricao_curta', e.target.value)} rows={2}
                            className="w-full mt-1 bg-glass border border-glassb rounded-xl px-3 py-2 text-sm text-fg outline-none focus:border-accent resize-none" />
                </div>
              </div>
              <button onClick={salvarTudo} disabled={saving}
                      className="mt-3 rounded-xl px-4 py-2 text-sm font-medium text-white flex items-center gap-2 disabled:opacity-60"
                      style={{ background: 'var(--accent)' }}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar alterações
              </button>
            </section>

            {/* Gestão de preço por canal */}
            <section>
              <h4 className="text-sm font-semibold flex items-center gap-2 mb-1"><Sparkles size={15} className="text-accent" /> Gestão de preço</h4>
              <p className="text-xs text-dim mb-3">Sugerido pelo motor de faixas (comissão, taxa fixa, imposto e cartão por canal). Margem atual é a real no preço de hoje.</p>
              <div className="space-y-2">
                {(d.precificacao || []).map((c) => {
                  const m = c.margem_atual
                  const cor = m == null ? 'var(--dim)' : m >= 30 ? 'var(--ok)' : m >= 15 ? 'var(--warn)' : 'var(--danger)'
                  return (
                    <div key={c.canal} className="flex items-center gap-3 rounded-xl border border-glassb px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{c.nome}</div>
                        <div className="text-[11px] text-faint">
                          margem atual <span style={{ color: cor }}>{m == null ? '—' : m.toFixed(1) + '%'}</span>
                          {' · '}sugerida {c.margem_sugerida == null ? '—' : c.margem_sugerida.toFixed(1) + '%'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-faint uppercase tracking-wide">sugerido</div>
                        <div className="num font-semibold text-accent">{brl(c.preco_sugerido)}</div>
                      </div>
                      <button onClick={() => aplicarPreco(c)} disabled={aplicando === c.canal || c.preco_sugerido == null}
                              className="rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1 shrink-0 disabled:opacity-50"
                              style={{ background: 'var(--glass-hover)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                        {aplicando === c.canal ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Aplicar
                      </button>
                    </div>
                  )
                })}
                {(d.precificacao || []).length === 0 && (
                  <div className="text-sm text-dim text-center py-2">Nenhum canal ativo. Ative canais em Configurações.</div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

function Campo({ label, value, onChange, type = 'text', className = '' }) {
  return (
    <div className={className}>
      <label className="text-xs text-dim">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} step={type === 'number' ? 'any' : undefined}
             className="w-full mt-1 bg-glass border border-glassb rounded-xl px-3 py-2 text-sm text-fg outline-none focus:border-accent" />
    </div>
  )
}
