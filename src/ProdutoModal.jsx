import { useEffect, useState } from 'react'
import { X, Save, Tag, Check, Sparkles, Loader2, Gauge, ShieldCheck, AlertCircle } from 'lucide-react'
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
  const [tab, setTab] = useState('dados')

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
      carregar(); onSaved && onSaved()
    } catch (e) { notify(e.message, 'danger') }
    setSaving(false)
  }
  const salvarTudo = () => salvar(form, 'Alterações salvas no Bling')

  const aplicarPreco = async (canal) => {
    setAplicando(canal.canal)
    try {
      await api.produtoAtualizar(produtoId, { preco: canal.preco_sugerido })
      notify(`Preço de ${canal.nome} aplicado: ${brl(canal.preco_sugerido)}`, 'ok')
      carregar(); onSaved && onSaved()
    } catch (e) { notify(e.message, 'danger') }
    setAplicando(null)
  }

  const ABAS = [
    { id: 'dados', label: 'Dados', icon: Tag },
    { id: 'saude', label: 'Saúde & SEO', icon: Gauge },
    { id: 'preco', label: 'Preço', icon: Sparkles },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
         style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-2xl my-auto" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg)' }}>
        <div className="flex items-start gap-3 p-5 border-b" style={{ borderColor: 'var(--glass-border)' }}>
          <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>
            <Tag size={18} className="text-white" />
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
          <>
            {/* Abas */}
            <div className="flex gap-1 px-5 pt-3 border-b" style={{ borderColor: 'var(--glass-border)' }}>
              {ABAS.map((a) => {
                const on = tab === a.id
                return (
                  <button key={a.id} onClick={() => setTab(a.id)}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-lg border-b-2 transition"
                          style={on ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : { borderColor: 'transparent', color: 'var(--dim)' }}>
                    <a.icon size={14} /> {a.label}
                  </button>
                )
              })}
            </div>

            <div className="p-5">
              {tab === 'dados' && (
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
                  <div className="col-span-2">
                    <button onClick={salvarTudo} disabled={saving}
                            className="rounded-xl px-4 py-2 text-sm font-medium text-white flex items-center gap-2 disabled:opacity-60" style={{ background: 'var(--accent)' }}>
                      {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar alterações
                    </button>
                  </div>
                </div>
              )}

              {tab === 'saude' && <SaudePanel q={d.qualidade} />}

              {tab === 'preco' && (
                <div>
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
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SaudePanel({ q }) {
  if (!q) return <div className="text-sm text-dim text-center py-4">Sem dados de cadastro.</div>
  const score = q.score ?? 0
  const cor = score >= 80 ? 'var(--ok)' : score >= 40 ? 'var(--warn)' : 'var(--danger)'
  const r = 34, c = 2 * Math.PI * r, off = c * (1 - score / 100)
  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <svg width="84" height="84" viewBox="0 0 84 84" className="shrink-0">
          <circle cx="42" cy="42" r={r} fill="none" stroke="var(--glass-border)" strokeWidth="8" />
          <circle cx="42" cy="42" r={r} fill="none" stroke={cor} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 42 42)" />
          <text x="42" y="46" textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--text)">{score}</text>
        </svg>
        <div>
          <div className="font-display font-semibold flex items-center gap-2" style={{ color: cor }}>
            {score >= 100 ? <ShieldCheck size={18} /> : <AlertCircle size={18} />} Saúde do cadastro
          </div>
          <p className="text-xs text-dim mt-0.5">Quanto deste anúncio está pronto para publicar e indexar bem. 100 = completo.</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {(q.itens || []).map((it) => (
          <div key={it.chave} className="flex items-start gap-2.5 rounded-xl border border-glassb px-3 py-2">
            <span className="h-5 w-5 rounded-full grid place-items-center shrink-0 mt-0.5"
                  style={{ background: it.ok ? 'var(--ok)' : 'var(--glass-hover)', color: it.ok ? '#fff' : 'var(--danger)' }}>
              {it.ok ? <Check size={12} /> : <X size={12} />}
            </span>
            <div className="min-w-0">
              <div className="text-sm">{it.label}</div>
              {!it.ok && it.dica && <div className="text-[11px] text-faint mt-0.5">{it.dica}</div>}
            </div>
          </div>
        ))}
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
