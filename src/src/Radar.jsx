import { useState, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import {
  SatelliteDish, RefreshCw, Plus, Trash2, Target, TrendingDown, TrendingUp,
  Minus, Lock, Gauge, Bell, Radar as RadarIcon, Info,
} from 'lucide-react'
import { api } from './api.js'
import { useToast } from './toast.jsx'

const CORES = ['#7b2a8c', '#14b8a6', '#f59e0b', '#f43f5e', '#a855f7', '#38bdf8']

// Marketplaces com rótulo bonito + dica de como pegar a URL do concorrente em cada um.
const MARKETPLACES = [
  ['mercadolivre', 'Mercado Livre', 'Abra o anúncio e copie o link (…/MLB-…). Leitura mais confiável.'],
  ['shopee', 'Shopee', 'Abra o produto do concorrente e copie o link (shopee.com.br/...-i.XXXX.YYYY). Lido pela API interna via navegador.'],
  ['tiktok', 'TikTok Shop', 'Cole o link do produto na TikTok Shop. Páginas bem protegidas — pode exigir proxy.'],
  ['shein', 'Shein', 'Abra o produto e copie o link (shein.com.br/...). Lido por navegador; pode exigir proxy.'],
  ['amazon', 'Amazon', 'Copie o link do produto (…/dp/…).'],
  ['magalu', 'Magalu', 'Copie o link do produto no Magazine Luiza.'],
  ['nuvemshop', 'Loja própria / Nuvemshop', 'Cole o link da página do produto na loja do concorrente.'],
]
const MKT_LABEL = Object.fromEntries(MARKETPLACES.map(([id, l]) => [id, l]))
const MKT_HINT = Object.fromEntries(MARKETPLACES.map(([id, , h]) => [id, h]))
const rotuloMkt = (m) => MKT_LABEL[m] || m

const brl = (v) => (v == null ? '—' : 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
const pct = (v) => Number(v ?? 0).toFixed(1).replace('.', ',') + '%'
const dCurto = (s) => new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
const dLongo = (s) =>
  new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function Radar() {
  const notify = useToast()
  const [todosAlvos, setTodosAlvos] = useState([])
  const [sku, setSku] = useState('')
  const [dias, setDias] = useState(7)
  const [hist, setHist] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [nonce, setNonce] = useState(0)
  const [addNovo, setAddNovo] = useState(false)
  const [ultimaVarredura, setUltimaVarredura] = useState(null)

  const carregarAlvos = async () => {
    const r = await api.radarAlvos()
    setTodosAlvos(r.alvos || [])
    return r.alvos || []
  }

  useEffect(() => {
    carregarAlvos().then((alvos) => {
      const skus = [...new Set(alvos.map((a) => a.sku))]
      if (skus.length && !sku) setSku(skus[0])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!sku) { setHist(null); return }
    api.radarHistorico(sku, dias).then(setHist).catch(() => {})
  }, [sku, dias])

  const skus = useMemo(() => [...new Set(todosAlvos.map((a) => a.sku))], [todosAlvos])
  const alvosDoSku = useMemo(() => todosAlvos.filter((a) => a.sku === sku), [todosAlvos, sku])

  const varrer = async () => {
    if (!sku) return
    setScanning(true)
    try {
      const r = await api.radarVarrer({ sku })
      const achou = (r.resultados || []).filter((x) => x.preco != null).length
      setUltimaVarredura(r.resultados || [])
      notify(`Varredura concluída — ${achou}/${r.varridos} preços capturados`, achou ? 'ok' : 'warn')
      const h = await api.radarHistorico(sku, dias)
      setHist(h)
      setNonce((n) => n + 1)
    } catch (e) {
      notify(e.message, 'danger')
    }
    setScanning(false)
  }

  const semNada = skus.length === 0

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Controles */}
      <div className="glass rounded-2xl px-5 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold mr-2">
          <SatelliteDish size={18} className="text-accent" /> Radar de mercado
        </div>
        {!semNada && (
          <>
            <select
              value={sku} onChange={(e) => setSku(e.target.value)}
              className="bg-glass border border-glassb rounded-xl px-3 py-2 text-sm text-fg outline-none focus:border-accent min-w-[200px]"
            >
              {skus.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex rounded-xl overflow-hidden border border-glassb">
              {[7, 30].map((d) => (
                <button
                  key={d} onClick={() => setDias(d)}
                  className={`px-3 py-2 text-xs font-medium ${dias === d ? 'text-white' : 'text-dim'}`}
                  style={dias === d ? { background: 'var(--accent)' } : undefined}
                >{d}d</button>
              ))}
            </div>
            <button
              onClick={varrer} disabled={scanning}
              className="ml-auto glass rounded-xl px-4 py-2 text-sm flex items-center gap-2 text-fg hover:text-accent disabled:opacity-60"
            >
              <RefreshCw size={15} className={scanning ? 'animate-spin' : ''} />
              {scanning ? 'Varrendo…' : 'Varrer agora'}
            </button>
            <button
              onClick={() => setAddNovo((v) => !v)}
              className="glass rounded-xl px-3 py-2 text-sm flex items-center gap-1.5 text-fg hover:text-accent"
            >
              <Plus size={15} /> Novo produto
            </button>
          </>
        )}
      </div>

      {semNada ? (
        <EmptyStart sku={sku} onAdded={async (novoSku) => { await carregarAlvos(); setSku(novoSku) }} />
      ) : (
        <>
          {addNovo && (
            <EmptyStart
              novo
              onAdded={async (novoSku) => { await carregarAlvos(); setSku(novoSku); setAddNovo(false) }}
            />
          )}
          <AlertasPanel dias={dias} nonce={nonce} />
          <VarreduraResultado resultados={ultimaVarredura} onFechar={() => setUltimaVarredura(null)} />
          <StatsRow stats={hist?.estatisticas} />
          <HistoryChart series={hist?.series || []} />
          <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.3fr)' }}>
            <AlvosPanel
              sku={sku} alvos={alvosDoSku}
              onChange={async () => { await carregarAlvos(); const h = await api.radarHistorico(sku, dias); setHist(h) }}
            />
            <RecomendacaoPanel sku={sku} />
          </div>
        </>
      )}
    </div>
  )
}

/* ----------------------- Resultado da varredura ------------------------- */
const FONTE_ROTULO = {
  shopee_api: 'Shopee (API interna)', api_ml: 'API Mercado Livre',
  html: 'Página (HTML)', browser: 'Navegador',
}
function VarreduraResultado({ resultados, onFechar }) {
  if (!resultados || resultados.length === 0) return null
  const ok = resultados.filter((r) => r.preco != null).length
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <RefreshCw size={16} className="text-accent" />
        <span className="text-sm font-semibold">Última varredura</span>
        <span className="text-xs text-faint">{ok}/{resultados.length} capturados</span>
        <button onClick={onFechar} className="ml-auto text-faint hover:text-fg text-xs">fechar</button>
      </div>
      <div className="space-y-1.5">
        {resultados.map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-xs rounded-lg px-3 py-2" style={{ background: 'var(--glass-hover)' }}>
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-md shrink-0"
                  style={{ background: 'var(--glass)', color: 'var(--accent2)' }}>{rotuloMkt(r.marketplace)}</span>
            <span className="flex-1 truncate text-dim">{r.nome || 'Concorrente'}</span>
            {r.preco != null ? (
              <>
                <span className="num font-semibold text-fg">{brl(r.preco)}</span>
                <span className="text-[10px] text-faint shrink-0">{FONTE_ROTULO[r.fonte] || r.fonte}</span>
              </>
            ) : (
              <span className="text-[11px] shrink-0" style={{ color: 'var(--danger, #FF6F6F)' }}
                    title={r.erro || ''}>não capturado{r.erro && r.erro.toLowerCase().includes('proxy') ? ' (tente proxy)' : ''}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------- Alertas -------------------------------- */
function AlertasPanel({ dias, nonce }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    api.radarAlertas(dias).then(setData).catch(() => setData({ alertas: [], resumo: { total: 0 } }))
  }, [dias, nonce])

  if (!data) return null
  const { alertas, resumo } = data
  const SEV = {
    alta: 'var(--danger)',
    media: 'var(--warn)',
    baixa: 'var(--accent2)',
  }
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Bell size={17} className="text-accent" />
        <span className="font-semibold text-sm">Alertas do radar</span>
        {resumo.total > 0 && (
          <span className="num text-[11px] px-2 py-0.5 rounded-full text-white" style={{ background: 'var(--accent)' }}>
            {resumo.total}
          </span>
        )}
        <span className="text-[11px] text-faint ml-auto">últimos {dias} dias</span>
      </div>
      {resumo.total === 0 ? (
        <div className="text-sm text-dim py-3 text-center">Sem mudanças relevantes — mercado calmo por enquanto.</div>
      ) : (
        <div className="space-y-1.5">
          {alertas.map((a, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-glassb px-3 py-2">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: SEV[a.severidade] || SEV.baixa }} />
              <div className="text-sm flex-1 min-w-0 truncate">{a.mensagem}</div>
              {a.marketplace && (
                <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-md shrink-0"
                      style={{ background: 'var(--glass-hover)', color: 'var(--dim)' }}>
                  {a.marketplace}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ----------------------------- Estatísticas ----------------------------- */
function StatsRow({ stats }) {
  const s = stats || {}
  const tiles = [
    { label: 'Último', valor: s.ultimo, cor: 'var(--accent)' },
    { label: 'Menor', valor: s.menor, cor: 'var(--ok)' },
    { label: 'Maior', valor: s.maior, cor: 'var(--danger)' },
    { label: 'Moda', valor: s.moda, cor: 'var(--fg)' },
    { label: 'Média', valor: s.media, cor: 'var(--dim)' },
  ]
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
      {tiles.map((t) => (
        <div key={t.label} className="glass rounded-2xl px-4 py-3">
          <div className="text-[10px] uppercase tracking-wide text-faint">{t.label}</div>
          <div className="text-lg font-bold num mt-0.5" style={{ color: t.cor }}>{brl(t.valor)}</div>
        </div>
      ))}
    </div>
  )
}

/* ----------------------------- Gráfico (herói) -------------------------- */
function HistoryChart({ series }) {
  const data = useMemo(() => {
    const map = new Map()
    series.forEach((s) => (s.pontos || []).forEach((p) => {
      const row = map.get(p.data) || { data: p.data }
      row[s.nome] = p.preco
      map.set(p.data, row)
    }))
    return [...map.values()].sort((a, b) => a.data.localeCompare(b.data))
  }, [series])

  if (!series.length || !data.length) {
    return (
      <div className="glass rounded-2xl p-8 grid place-items-center text-center">
        <div className="h-12 w-12 rounded-2xl grid place-items-center mb-3"
             style={{ background: 'var(--glass-hover)' }}>
          <RadarIcon size={22} className="text-accent" />
        </div>
        <div className="font-medium text-sm">O histórico aparece com as varreduras</div>
        <div className="text-xs text-dim mt-1 max-w-sm">
          Nenhum marketplace entrega o histórico do concorrente pronto — ele é construído a cada varredura.
          Rode a primeira em "Varrer agora" e o gráfico ganha vida ao longo dos dias.
        </div>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-semibold">Histórico de preços dos concorrentes</div>
        <div className="flex flex-wrap gap-3">
          {series.map((s, i) => (
            <div key={s.alvo_id} className="flex items-center gap-1.5 text-xs text-dim">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: CORES[i % CORES.length] }} />
              {s.nome}
            </div>
          ))}
        </div>
      </div>
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
            <defs>
              {series.map((s, i) => (
                <linearGradient key={i} id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CORES[i % CORES.length]} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CORES[i % CORES.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
            <XAxis dataKey="data" tickFormatter={dCurto} minTickGap={28}
                   tick={{ fontSize: 11, fill: 'var(--dim)' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => 'R$' + v} width={58}
                   tick={{ fontSize: 11, fill: 'var(--dim)' }} axisLine={false} tickLine={false}
                   domain={['auto', 'auto']} />
            <Tooltip content={<GlassTooltip />} cursor={{ stroke: 'var(--accent)', strokeDasharray: '4 4' }} />
            {series.map((s, i) => (
              <Area key={s.alvo_id} type="monotone" dataKey={s.nome}
                    stroke={CORES[i % CORES.length]} strokeWidth={2.5}
                    fill={`url(#g${i})`} fillOpacity={1} connectNulls
                    dot={false} activeDot={{ r: 4, strokeWidth: 0 }}
                    animationDuration={700} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function GlassTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs" style={{ backdropFilter: 'blur(12px)' }}>
      <div className="text-faint mb-1.5">{dLongo(label)}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-0.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-dim">{p.dataKey}</span>
          <span className="ml-auto font-semibold num text-fg">{brl(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------- Alvos ---------------------------------- */
function AlvosPanel({ sku, alvos, onChange }) {
  const notify = useToast()
  const [form, setForm] = useState({ nome: '', marketplace: 'mercadolivre', url: '' })
  const [busy, setBusy] = useState(false)

  const add = async () => {
    if (!form.url.trim()) { notify('Cole a URL do anúncio concorrente', 'danger'); return }
    setBusy(true)
    try {
      await api.addRadarAlvo({ sku, ...form })
      setForm({ nome: '', marketplace: form.marketplace, url: '' })
      await onChange()
      notify('Alvo adicionado', 'ok')
    } catch (e) { notify(e.message, 'danger') }
    setBusy(false)
  }
  const remover = async (id) => {
    try { await api.removeRadarAlvo(id); await onChange() } catch (e) { notify(e.message, 'danger') }
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-sm font-semibold mb-3">
        <Target size={17} className="text-accent" /> Alvos monitorados
      </div>
      <div className="space-y-2">
        {alvos.length === 0 && <div className="text-xs text-dim">Nenhum alvo neste SKU ainda.</div>}
        {alvos.map((a) => (
          <div key={a.id} className="flex items-center gap-2 rounded-xl border border-glassb px-3 py-2">
            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-md"
                  style={{ background: 'var(--glass-hover)', color: 'var(--accent2)' }}>{rotuloMkt(a.marketplace)}</span>
            <div className="min-w-0">
              <div className="text-sm truncate">{a.nome || 'Concorrente'}</div>
              <a href={a.url} target="_blank" rel="noreferrer" className="text-[11px] text-faint truncate block hover:text-accent">{a.url}</a>
            </div>
            <button onClick={() => remover(a.id)} className="ml-auto text-faint hover:text-danger" title="Remover">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-glassb space-y-2">
        <div className="flex gap-2">
          <input
            value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Nome da loja"
            className="flex-1 bg-glass border border-glassb rounded-xl px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <select
            value={form.marketplace} onChange={(e) => setForm({ ...form, marketplace: e.target.value })}
            className="bg-glass border border-glassb rounded-xl px-2 py-2 text-sm outline-none focus:border-accent"
          >
            {MARKETPLACES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <input
            value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="https://… link do anúncio concorrente"
            className="flex-1 bg-glass border border-glassb rounded-xl px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={add} disabled={busy}
            className="rounded-xl px-3 text-white flex items-center gap-1 text-sm disabled:opacity-60"
            style={{ background: 'var(--accent)' }}
          >
            <Plus size={15} /> Add
          </button>
        </div>
        <div className="text-[11px] text-faint flex items-start gap-1.5">
          <Info size={12} className="mt-0.5 shrink-0" /> {MKT_HINT[form.marketplace]}
        </div>
      </div>
    </div>
  )
}

/* --------------------------- Recomendação ------------------------------- */
function RecomendacaoPanel({ sku }) {
  const notify = useToast()
  const [p, setP] = useState({ custo: '', preco_atual: '', piso_margem: 15, canal: 'mercadolivre' })
  const [rec, setRec] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { setRec(null) }, [sku])

  const recomendar = async () => {
    if (p.custo === '' || p.preco_atual === '') { notify('Informe custo e preço atual', 'danger'); return }
    setBusy(true)
    try {
      const r = await api.radarRecomendacao({
        sku, custo_base: Number(p.custo), preco_atual: Number(p.preco_atual),
        piso_margem: Number(p.piso_margem), canal: p.canal, estrategia: 'match',
      })
      setRec(r)
    } catch (e) { notify(e.message, 'danger') }
    setBusy(false)
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-sm font-semibold mb-3">
        <Gauge size={17} className="text-accent" /> Recomendação por concorrente
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <Mini label="Custo" value={p.custo} onChange={(v) => setP({ ...p, custo: v })} />
        <Mini label="Preço atual" value={p.preco_atual} onChange={(v) => setP({ ...p, preco_atual: v })} />
        <Mini label="Piso %" value={p.piso_margem} onChange={(v) => setP({ ...p, piso_margem: v })} />
        <label className="block">
          <span className="text-[10px] text-dim block mb-1">Canal</span>
          <select value={p.canal} onChange={(e) => setP({ ...p, canal: e.target.value })}
                  className="w-full bg-glass border border-glassb rounded-lg px-2 py-1.5 text-sm outline-none focus:border-accent">
            {['mercadolivre', 'shopee', 'amazon'].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
      </div>
      <button
        onClick={recomendar} disabled={busy}
        className="mt-3 w-full rounded-xl py-2 text-sm font-medium text-white disabled:opacity-60"
        style={{ background: 'var(--accent)' }}
      >{busy ? 'Calculando…' : 'Recomendar'}</button>

      {rec && (
        <div className="mt-4 space-y-2">
          <div className="rounded-xl px-3 py-2 flex items-center justify-between text-sm"
               style={{ background: 'var(--glass-hover)' }}>
            <span className="text-dim">Piso de viabilidade</span>
            <span className="font-semibold num text-warn">{brl(rec.preco_piso)}</span>
          </div>
          {rec.concorrentes.length === 0 && (
            <div className="text-xs text-dim">Sem preços de concorrente capturados ainda — rode uma varredura.</div>
          )}
          {rec.concorrentes.map((c) => <RecRow key={c.alvo_id} c={c} />)}
        </div>
      )}
    </div>
  )
}

function RecRow({ c }) {
  const acao = {
    baixar: { icon: <TrendingDown size={13} />, cor: 'var(--accent2)', txt: 'Baixar' },
    subir: { icon: <TrendingUp size={13} />, cor: 'var(--warn)', txt: 'Subir' },
    manter: { icon: <Minus size={13} />, cor: 'var(--dim)', txt: 'Manter' },
  }[c.acao] || { icon: <Minus size={13} />, cor: 'var(--dim)', txt: c.acao }

  return (
    <div className="rounded-xl border border-glassb px-3 py-2.5 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{c.nome}</div>
        <div className="text-[11px] text-faint">{c.marketplace} · está a {brl(c.preco)}</div>
      </div>
      <div className="text-right">
        <div className="flex items-center gap-1 justify-end text-xs font-semibold" style={{ color: acao.cor }}>
          {acao.icon} {acao.txt} → {brl(c.preco_recomendado)}
        </div>
        <div className="text-[11px] mt-0.5 flex items-center gap-1 justify-end">
          {c.abaixo_do_piso
            ? <span className="flex items-center gap-1 text-warn"><Lock size={11} /> travado no piso</span>
            : <span className="text-dim num">margem {pct(c.margem_recomendado)}</span>}
        </div>
      </div>
    </div>
  )
}

function Mini({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-[10px] text-dim block mb-1">{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)}
             className="w-full bg-glass border border-glassb rounded-lg px-2 py-1.5 text-sm outline-none focus:border-accent num" />
    </label>
  )
}

/* ----------------------------- Empty state ------------------------------ */
function EmptyStart({ sku, onAdded, novo }) {
  const notify = useToast()
  const [form, setForm] = useState({ sku: '', nome: '', marketplace: 'mercadolivre', url: '' })
  const [busy, setBusy] = useState(false)

  const add = async () => {
    if (!form.sku.trim() || !form.url.trim()) { notify('Informe o SKU e a URL do concorrente', 'danger'); return }
    setBusy(true)
    try {
      await api.addRadarAlvo(form)
      notify(novo ? 'Produto adicionado ao radar' : 'Primeiro alvo adicionado', 'ok')
      onAdded(form.sku)
    } catch (e) { notify(e.message, 'danger') }
    setBusy(false)
  }

  const Campos = (
    <div className={`w-full ${novo ? '' : 'max-w-md'} space-y-2 text-left`}>
      <div className="flex gap-2">
        <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })}
               placeholder="SKU do seu produto"
               className="flex-1 bg-glass border border-glassb rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
        <select value={form.marketplace} onChange={(e) => setForm({ ...form, marketplace: e.target.value })}
                className="bg-glass border border-glassb rounded-xl px-2 py-2 text-sm outline-none focus:border-accent">
          {MARKETPLACES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </div>
      <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
             placeholder="Nome da loja concorrente (opcional)"
             className="w-full bg-glass border border-glassb rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
      <div className="flex gap-2">
        <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
               onKeyDown={(e) => e.key === 'Enter' && add()}
               placeholder="https://… link do anúncio concorrente"
               className="flex-1 bg-glass border border-glassb rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
        <button onClick={add} disabled={busy}
                className="rounded-xl px-4 text-white text-sm font-medium disabled:opacity-60"
                style={{ background: 'var(--accent)' }}>{busy ? '…' : 'Monitorar'}</button>
      </div>
      <div className="text-[11px] text-faint flex items-start gap-1.5">
        <Info size={12} className="mt-0.5 shrink-0" /> {MKT_HINT[form.marketplace]}
      </div>
    </div>
  )

  if (novo) {
    return (
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 text-sm font-semibold mb-3">
          <Plus size={16} className="text-accent" /> Monitorar um novo produto
        </div>
        {Campos}
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-8 grid place-items-center text-center">
      <div className="h-14 w-14 rounded-2xl grid place-items-center mb-3"
           style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>
        <SatelliteDish size={26} className="text-white" />
      </div>
      <div className="font-display font-semibold text-lg">Comece a monitorar a concorrência</div>
      <div className="text-sm text-dim mt-1 max-w-md">
        Aponte o radar para um anúncio concorrente em qualquer marketplace. A cada varredura ele guarda
        o preço, e o histórico e as recomendações nascem desse acúmulo.
      </div>
      <div className="mt-5">{Campos}</div>
    </div>
  )
}
