import { useState, useEffect } from 'react'
import { Calculator, AlertTriangle, Layers, ArrowRight } from 'lucide-react'
import { api } from './api.js'
import { useToast } from './toast.jsx'

const brl = (v) => 'R$ ' + Number(v ?? 0).toFixed(2).replace('.', ',')
const pct = (v) => Number(v ?? 0).toFixed(1).replace('.', ',') + '%'

export default function Precificacao() {
  const notify = useToast()
  const [custo, setCusto] = useState('')
  const [margem, setMargem] = useState('')
  const [margemPadrao, setMargemPadrao] = useState(20)
  const [res, setRes] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.precificacaoConfig().then((c) => setMargemPadrao(c.margem_padrao)).catch(() => {})
  }, [])

  const calcular = async () => {
    if (custo === '' || isNaN(Number(custo))) {
      notify('Informe o custo do produto', 'danger')
      return
    }
    setLoading(true)
    try {
      const r = await api.precificacaoCalcular({
        custo: Number(custo),
        margem: margem === '' ? undefined : Number(margem),
      })
      setRes(r)
    } catch (e) {
      notify(e.message, 'danger')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Entrada */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 text-sm font-semibold mb-4">
          <Calculator size={18} className="text-accent" /> Calcular preço de venda
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Custo do produto (R$)" wide>
            <input
              type="number" value={custo} onChange={(e) => setCusto(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && calcular()}
              placeholder="0,00"
              className="w-40 rounded-xl px-3 py-2 text-sm bg-glass border border-glassb text-fg outline-none focus:border-accent"
            />
          </Field>
          <Field label={`Margem líquida desejada (padrão ${pct(margemPadrao)})`}>
            <input
              type="number" value={margem} onChange={(e) => setMargem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && calcular()}
              placeholder={String(margemPadrao).replace('.', ',')}
              className="w-28 rounded-xl px-3 py-2 text-sm bg-glass border border-glassb text-fg outline-none focus:border-accent"
            />
          </Field>
          <button
            onClick={calcular} disabled={loading}
            className="rounded-xl px-5 py-2 text-sm font-medium text-white disabled:opacity-60 flex items-center gap-2"
            style={{ background: 'var(--accent)' }}
          >
            {loading ? '...' : <>Calcular <ArrowRight size={15} /></>}
          </button>
        </div>
        <p className="text-xs text-faint mt-3">
          Margem líquida já desconta comissão do canal, custo fixo da faixa, impostos e cartão.
          As taxas vêm da sua configuração em Configurações.
        </p>
      </div>

      {/* Resultados */}
      {res && (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {res.canais.map((c) => (
            <CanalCard key={c.canal} c={c} />
          ))}
        </div>
      )}
    </div>
  )
}

function CanalCard({ c }) {
  if (c.erro) {
    return (
      <div className="glass rounded-2xl p-4">
        <div className="font-semibold text-sm">{c.nome}</div>
        <div className="text-xs text-danger mt-2 flex items-center gap-1">
          <AlertTriangle size={13} /> {c.erro}
        </div>
      </div>
    )
  }
  const fx = c.faixa
  const teto = fx.ate == null ? 'sem teto' : `até ${brl(fx.ate)}`
  const rx = c.raio_x
  return (
    <div className="glass rounded-2xl p-4 flex flex-col">
      <div className="flex items-start justify-between">
        <div className="font-semibold text-sm">{c.nome}</div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-faint">Preço sugerido</div>
          <div className="text-xl font-bold text-accent leading-none num">{brl(c.preco)}</div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-dim">
        <Layers size={12} className="text-accent2" />
        Faixa {teto} · {pct(fx.comissao)}{fx.fixo ? ` + ${brl(fx.fixo)}` : ''}{fx.fixo_pct ? ` + ${pct(fx.fixo_pct)}` : ''}
      </div>

      {!c.consistente && (
        <div className="mt-1 text-[11px] text-warn flex items-center gap-1">
          <AlertTriangle size={12} /> preço no limite entre faixas
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-glassb space-y-1 text-[12px]">
        <Linha label="Custo" valor={brl(rx.custo)} />
        <Linha label="Taxa do canal" valor={`– ${brl(rx.taxa_canal)}`} dim />
        <Linha label="Custo fixo" valor={`– ${brl(rx.fixo)}`} dim />
        <Linha label="Impostos" valor={`– ${brl(rx.impostos)}`} dim />
        <Linha label="Cartão" valor={`– ${brl(rx.cartao)}`} dim />
        <div className="flex justify-between pt-1.5 mt-1.5 border-t border-glassb font-semibold">
          <span className="text-ok">Lucro líquido</span>
          <span className="text-ok num">{brl(rx.lucro)} · {pct(rx.margem_real)}</span>
        </div>
      </div>
    </div>
  )
}

function Linha({ label, valor, dim }) {
  return (
    <div className="flex justify-between">
      <span className={dim ? 'text-dim' : 'text-fg'}>{label}</span>
      <span className={`num ${dim ? 'text-dim' : 'text-fg'}`}>{valor}</span>
    </div>
  )
}

function Field({ label, children, wide }) {
  return (
    <label className="block">
      <span className="text-xs text-dim block mb-1">{label}</span>
      {children}
    </label>
  )
}
