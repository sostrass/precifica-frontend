import { useEffect, useState, useRef, useMemo } from 'react'
import {
  TrendingUp, Radio, Activity, Layers, Flame, ChevronUp, ChevronDown,
  Hourglass, Boxes, Gauge, Grid3x3,
} from 'lucide-react'
import { api } from './api.js'

/* cores alinhadas à identidade: teal = alta/saudável, dourado = médio, vermelho refinado = risco */
const UP = '#14B8A6', DN = '#E5565B', GOLD = '#D6A23E'
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const brlK = (v) => {
  const n = Number(v || 0)
  if (Math.abs(n) >= 1000) return (n / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'k'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
const num = (v) => Number(v || 0).toLocaleString('pt-BR')
const pct = (v) => (v == null || !isFinite(v) ? '—' : (v >= 0 ? '+' : '') + Number(v).toFixed(1) + '%')

let _i = 0
function useUid() { const r = useRef(null); if (!r.current) r.current = 'k' + (++_i); return r.current }
function useCountUp(target, dur = 800) {
  const [val, setVal] = useState(target || 0)
  const from = useRef(0)
  useEffect(() => {
    const s = from.current, t0 = performance.now(); let raf
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3)
      const v = s + ((target || 0) - s) * e; setVal(v); from.current = v
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = target || 0
    }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf)
  }, [target, dur])
  return val
}

const CANAL_COR = (n = '') => {
  const s = n.toLowerCase()
  if (s.includes('mercado') || s === 'ml') return '#FFB400'
  if (s.includes('shopee')) return '#EE4D2D'
  if (s.includes('shein')) return '#9AA0A6'
  if (s.includes('amazon')) return '#FF9900'
  if (s.includes('magalu') || s.includes('magazine')) return '#0086FF'
  if (s.includes('tiktok')) return '#69C9D0'
  if (s.includes('nuvem')) return '#4FE3C9'
  if (s.includes('americ')) return '#E60014'
  if (s.includes('direta') || s.includes('sem')) return '#9AA0A6'
  return GOLD
}
const heat = (m) => {
  if (m == null) return 'rgba(150,150,150,.14)'
  if (m < 0) return DN
  if (m < 8) return '#ED9B40'
  if (m < 15) return '#E0B248'
  if (m < 25) return '#5BC9B0'
  return UP
}

/* ================================ VIEW =================================== */
export default function Dashboard() {
  const [dias, setDias] = useState(30)
  const [kpi, setKpi] = useState(null)
  const [loadingKpi, setLoadingKpi] = useState(true)
  const [cart, setCart] = useState(undefined)   // resumo da carteira (cache completo)
  const [itens, setItens] = useState([])         // amostra p/ heatmap/watchlist
  const [agora, setAgora] = useState(new Date())

  useEffect(() => {
    api.dashboardCarteira('mercadolivre')
      .then((d) => { setCart(d.resumo || null); setItens(d.itens || []) })
      .catch(() => { setCart(null); setItens([]) })
  }, [])
  useEffect(() => {
    setLoadingKpi(true)
    api.kpis(dias).then(setKpi).catch(() => setKpi(null)).finally(() => setLoadingKpi(false))
  }, [dias])
  useEffect(() => { const t = setInterval(() => setAgora(new Date()), 1000); return () => clearInterval(t) }, [])

  if (cart === undefined) return <Skeleton />

  const total = cart?.total || 0
  const ideal = cart?.ideal || 0
  const atencao = cart?.atencao || 0
  const critico = cart?.critico || 0
  const margemMedia = cart?.margem_media || 0
  const semCarteira = !cart || total === 0

  // série diária -> acumulada (índice de verdade: sobe até o GMV total)
  const serie = (kpi?.tendencia || []).map((t) => t.valor)
  const serieCum = serie.reduce((acc, v, i) => { acc.push((acc[i - 1] || 0) + v); return acc }, [])
  const delta = (() => {
    if (serie.length < 4) return null
    const meio = Math.floor(serie.length / 2)
    const a = serie.slice(0, meio).reduce((s, v) => s + v, 0)
    const b = serie.slice(meio).reduce((s, v) => s + v, 0)
    return a ? ((b - a) / a) * 100 : null
  })()
  const up = (delta || 0) >= 0
  const melhorDia = serie.length ? Math.max(...serie) : 0
  const piorDia = serie.length ? Math.min(...serie) : 0
  const mediaDia = serie.length ? serie.reduce((s, v) => s + v, 0) / serie.length : 0

  const canais = (kpi?.por_canal || []).map((c) => ({ ...c, cor: CANAL_COR(c.loja) }))
    .sort((a, b) => (b.valor || 0) - (a.valor || 0))
  const gmvCanais = canais.reduce((s, c) => s + (c.valor || 0), 0) || 1

  const altaPot = cart?.melhores || []
  const risco = cart?.piores || []

  const tickers = [
    { k: 'ÍNDICE', v: 'R$ ' + brlK(kpi?.gmv || 0), d: delta },
    { k: 'MARGEM', v: margemMedia.toFixed(1) + '%' },
    { k: 'PEDIDOS', v: num(kpi?.pedidos || 0) },
    { k: 'TICKET', v: 'R$ ' + brlK(kpi?.ticket_medio || 0) },
    { k: 'PARADO', v: 'R$ ' + brlK(kpi?.capital_parado || 0), neg: (kpi?.capital_parado || 0) > 0 },
    { k: 'SKUs', v: num(total) },
    { k: 'IDEAL', v: num(ideal), pos: true },
    { k: 'CRÍTICO', v: num(critico), neg: critico > 0 },
    ...canais.slice(0, 4).map((c) => ({ k: c.loja.toUpperCase().slice(0, 12), v: 'R$ ' + brlK(c.valor), cor: c.cor })),
  ]

  return (
    <div className="space-y-2.5">
      <TickerTape itens={tickers} />

      {/* ÍNDICE + SESSÃO */}
      <div className="grid lg:grid-cols-3 gap-2.5">
        <div className="term-panel p-4 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="term-head flex items-center gap-1.5"><Activity size={11} /> Índice Sóstrass · faturamento acumulado {dias}d</div>
              <div className="flex items-end gap-2.5 mt-1">
                <IndexValue v={kpi?.gmv || 0} up={up} />
                <span className="mono text-sm font-bold pb-1" style={{ color: up ? UP : DN }}>{up ? '▲' : '▼'} {pct(delta)}</span>
              </div>
            </div>
            <div className="flex gap-0.5 rounded-lg p-0.5 shrink-0" style={{ background: 'var(--glass-hover)' }}>
              {[7, 30, 90].map((d) => (
                <button key={d} onClick={() => setDias(d)} className="mono px-2.5 py-1 rounded-md text-xs font-semibold transition"
                        style={dias === d ? { background: 'var(--accent)', color: '#15100a' } : { color: 'var(--text-dim)' }}>{d}D</button>
              ))}
            </div>
          </div>
          <div style={{ opacity: loadingKpi ? 0.45 : 1, transition: 'opacity .3s' }}>
            <IndexChart data={serieCum} up={up} />
          </div>
        </div>

        <div className="term-panel p-4">
          <div className="term-head flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Radio size={11} /> Sessão</span>
            <span className="flex items-center gap-1" style={{ color: UP }}><span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: UP }} /> OPERANDO</span>
          </div>
          <div className="mono text-2xl font-bold mt-1.5 tabular-nums">{agora.toLocaleTimeString('pt-BR')}</div>
          <div className="text-[11px] text-faint">{agora.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</div>
          <div className="mt-3 space-y-px">
            <BookLine label="SKUs no índice" v={num(total)} />
            <BookLine label="Melhor dia" v={'R$ ' + brlK(melhorDia)} cor={UP} />
            <BookLine label="Pior dia" v={'R$ ' + brlK(piorDia)} cor={DN} />
            <BookLine label="Média / dia" v={'R$ ' + brlK(mediaDia)} />
            <BookLine label="Ticket médio" v={'R$ ' + brl(kpi?.ticket_medio || 0)} />
            <BookLine label="Capital parado" v={'R$ ' + brlK(kpi?.capital_parado || 0)} cor={kpi?.capital_parado > 0 ? GOLD : undefined} />
          </div>
        </div>
      </div>

      {/* INDICADORES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <Cell icon={Gauge} label="Margem média" valor={margemMedia} sufixo="%" dec={1}
              extra={<HealthBar ideal={ideal} atencao={atencao} critico={critico} />} />
        <Cell icon={Hourglass} label="Capital parado" money valor={kpi?.capital_parado || 0} corValor={GOLD}
              extra={<span className="text-[11px] text-faint mono">{kpi?.qtd_parados || 0} sem giro</span>} />
        <Cell icon={Boxes} label="Produtos no índice" valor={total}
              extra={<span className="text-[11px] mono" style={{ color: UP }}>{ideal} saudáveis · {critico} crít.</span>} />
        <Cell icon={Activity} label={`Pedidos ${dias}d`} valor={kpi?.pedidos || 0} loading={loadingKpi}
              extra={<span className="text-[11px] text-faint mono">ticket R$ {brlK(kpi?.ticket_medio || 0)}</span>} />
      </div>

      {/* HEATMAP */}
      <div className="term-panel p-4">
        <div className="flex items-center justify-between mb-2.5">
          <div className="term-head flex items-center gap-1.5"><Grid3x3 size={11} /> Heatmap de margem · {total} ativos</div>
          <div className="flex items-center gap-3 text-[10px] text-faint">
            <Lg cor={DN} t="prejuízo" /><Lg cor="#ED9B40" t="baixa" /><Lg cor="#E0B248" t="média" /><Lg cor={UP} t="ideal" />
          </div>
        </div>
        {semCarteira ? <Aviso /> : <Heatmap itens={itens} />}
      </div>

      {/* WATCHLIST + CANAIS */}
      <div className="grid lg:grid-cols-3 gap-2.5">
        <div className="term-panel lg:col-span-2 overflow-hidden">
          <div className="term-head flex items-center gap-1.5 p-4 pb-2"><Layers size={11} /> Watchlist · margem por produto</div>
          {semCarteira ? <div className="p-4"><Aviso /></div> : <Watchlist itens={itens} />}
        </div>
        <div className="term-panel p-4">
          <div className="term-head flex items-center gap-1.5 mb-2.5"><TrendingUp size={11} /> Canais · participação</div>
          {canais.length === 0
            ? <div className="text-[11px] text-faint py-6 text-center mono">sem vendas por canal no período</div>
            : <div className="space-y-2.5">
                {canais.map((c, i) => {
                  const share = ((c.valor || 0) / gmvCanais) * 100
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-1.5 min-w-0"><span className="h-2 w-2 rounded-sm shrink-0" style={{ background: c.cor }} /><span className="truncate">{c.loja}</span></span>
                        <span className="mono font-semibold">R$ {brlK(c.valor)} <span className="text-faint">{share.toFixed(0)}%</span></span>
                      </div>
                      <div className="h-1.5 rounded-sm overflow-hidden" style={{ background: 'var(--glass-hover)' }}>
                        <div className="h-full rounded-sm transition-all duration-700" style={{ width: `${Math.max(3, share)}%`, background: c.cor }} />
                      </div>
                      <div className="text-[10px] text-faint mono mt-0.5">{num(c.unidades)} un · {num(c.pedidos)} pedidos</div>
                    </div>
                  )
                })}
              </div>}
        </div>
      </div>

      {/* MOVERS */}
      <div className="grid lg:grid-cols-2 gap-2.5">
        <Movers titulo="Maior potencial de alta" icon={<ChevronUp size={12} style={{ color: UP }} />}
                vazio={semCarteira ? 'Sincronize o catálogo para ver oportunidades.' : 'Preços alinhados ao ideal.'} itens={altaPot}
                render={(i) => <span className="mono font-semibold" style={{ color: UP }}>▲ {pct(i.pot)}</span>} />
        <Movers titulo="Maior risco de margem" icon={<Flame size={12} style={{ color: DN }} />}
                vazio={semCarteira ? 'Sincronize o catálogo para avaliar a margem.' : 'Nenhuma margem em risco. 🎉'} itens={risco}
                render={(i) => <span className="mono font-semibold px-1.5 py-0.5 rounded" style={{ color: i.status === 'critico' ? DN : GOLD, background: 'var(--glass-hover)' }}>{(i.margem_liquida || 0).toFixed(1)}%</span>} />
      </div>
    </div>
  )
}

/* ================================ PIECES ================================= */
function Aviso() {
  return (
    <div className="text-center py-8">
      <div className="text-sm text-dim">Nenhum produto na carteira ainda.</div>
      <div className="text-[12px] text-faint mt-1">Vá em <b>Catálogo → Sincronizar catálogo completo</b> para o terminal carregar a margem de todos os seus produtos.</div>
    </div>
  )
}

function TickerTape({ itens }) {
  const Run = () => (
    <div className="ticker-track">
      {itens.concat(itens).map((t, i) => {
        const c = t.cor || (t.pos ? UP : t.neg ? DN : t.d != null ? (t.d >= 0 ? UP : DN) : 'var(--text)')
        return (
          <span key={i} className="inline-flex items-center gap-1.5 px-4 py-1.5 border-r" style={{ borderColor: 'var(--glass-border)' }}>
            <span className="term-head" style={{ color: 'var(--faint)' }}>{t.k}</span>
            <span className="mono text-xs font-semibold" style={{ color: t.cor || 'var(--text)' }}>{t.v}</span>
            {t.d != null && <span className="mono text-[10px] font-bold" style={{ color: c }}>{t.d >= 0 ? '▲' : '▼'}{Math.abs(t.d).toFixed(1)}%</span>}
            {(t.pos || t.neg) && <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />}
          </span>
        )
      })}
    </div>
  )
  return <div className="ticker-wrap term-panel overflow-hidden"><div style={{ width: '200%' }}><Run /></div></div>
}

function IndexValue({ v, up }) {
  const n = useCountUp(v)
  return <span className="mono text-3xl font-bold tabular-nums leading-none" style={{ color: up ? UP : DN }}>R$ {brl(n)}</span>
}

function IndexChart({ data, up }) {
  const id = useUid()
  const W = 640, H = 150
  if (!data || data.length < 2) return <div style={{ height: H }} className="grid place-items-center text-[11px] text-faint mono">sem série no período</div>
  const max = Math.max(...data), min = Math.min(...data), rng = max - min || 1
  const X = (i) => (i / (data.length - 1)) * W
  const Y = (v) => H - ((v - min) / rng) * (H - 16) - 8
  const line = data.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ')
  const area = `${line} L ${W} ${H} L 0 ${H} Z`
  const cor = up ? UP : DN
  const last = data.length - 1
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ overflow: 'visible' }} className="mt-2">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={cor} stopOpacity=".26" /><stop offset="1" stopColor={cor} stopOpacity="0" /></linearGradient></defs>
      {[0.25, 0.5, 0.75].map((g) => <line key={g} x1="0" y1={H * g} x2={W} y2={H * g} stroke="var(--glass-border)" strokeWidth="0.5" strokeDasharray="3 4" />)}
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={cor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <g>
        <circle cx={X(last)} cy={Y(data[last])} r="6" fill={cor} opacity=".3"><animate attributeName="r" values="4;9;4" dur="2s" repeatCount="indefinite" /><animate attributeName="opacity" values=".4;0;.4" dur="2s" repeatCount="indefinite" /></circle>
        <circle cx={X(last)} cy={Y(data[last])} r="3" fill={cor} />
      </g>
    </svg>
  )
}

function BookLine({ label, v, cor }) {
  return (
    <div className="flex items-center justify-between text-xs py-1 border-b" style={{ borderColor: 'var(--glass-border)' }}>
      <span className="text-faint">{label}</span><span className="mono font-semibold" style={{ color: cor || 'var(--text)' }}>{v}</span>
    </div>
  )
}

function Cell({ icon: Ic, label, valor, sufixo, money, dec = 0, extra, corValor, loading }) {
  const v = useCountUp(valor || 0)
  const txt = money ? 'R$ ' + brlK(v) : v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + (sufixo || '')
  return (
    <div className="term-panel p-3.5 hover:bg-[var(--glass-hover)] transition-colors">
      <div className="flex items-center justify-between">
        <span className="term-head flex items-center gap-1.5"><Ic size={11} /> {label}</span>
        {loading && <span className="live-dot h-1 w-1 rounded-full" style={{ background: 'var(--faint)' }} />}
      </div>
      <div className="mono text-2xl font-bold mt-1.5 tabular-nums" style={{ color: corValor }}>{txt}</div>
      <div className="mt-1.5">{extra}</div>
    </div>
  )
}

function HealthBar({ ideal, atencao, critico }) {
  const t = (ideal + atencao + critico) || 1
  return (
    <div className="flex h-1.5 rounded-sm overflow-hidden" title={`${ideal} ideal · ${atencao} atenção · ${critico} crítico`}>
      <div style={{ width: `${(ideal / t) * 100}%`, background: UP }} />
      <div style={{ width: `${(atencao / t) * 100}%`, background: GOLD }} />
      <div style={{ width: `${(critico / t) * 100}%`, background: DN }} />
    </div>
  )
}

function Lg({ cor, t }) { return <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: cor }} />{t}</span> }

function Heatmap({ itens }) {
  const [hover, setHover] = useState(null)
  const cells = itens.slice(0, 160)
  if (!cells.length) return <div className="text-[11px] text-faint py-6 text-center mono">sem produtos para mapear</div>
  return (
    <div className="relative">
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(24px, 1fr))' }}>
        {cells.map((it, i) => (
          <div key={i} className="heat-cell rounded-sm aspect-square cursor-pointer" style={{ background: heat(it.margem_liquida) }}
               onMouseEnter={() => setHover(it)} onMouseLeave={() => setHover(null)} />
        ))}
      </div>
      {hover && (
        <div className="absolute top-0 right-0 term-panel px-3 py-2 pointer-events-none shadow-lg" style={{ background: 'var(--bg)', zIndex: 10 }}>
          <div className="text-xs font-medium truncate max-w-[220px]">{hover.nome || hover.sku}</div>
          <div className="mono text-[11px] text-faint">{hover.sku}</div>
          <div className="mono text-sm font-bold" style={{ color: heat(hover.margem_liquida) }}>{(hover.margem_liquida || 0).toFixed(1)}% margem</div>
          <div className="mono text-[11px] text-faint">R$ {brl(hover.preco_atual)} · custo R$ {brl(hover.custo)}</div>
        </div>
      )}
    </div>
  )
}

function Watchlist({ itens }) {
  const [sort, setSort] = useState({ k: 'margem_liquida', dir: 'asc' })
  const sorted = useMemo(() => {
    const arr = [...itens]
    arr.sort((a, b) => {
      const va = a[sort.k] ?? -Infinity, vb = b[sort.k] ?? -Infinity
      if (typeof va === 'string') return sort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      return sort.dir === 'asc' ? va - vb : vb - va
    })
    return arr.slice(0, 14)
  }, [itens, sort])
  const Th = ({ k, children, r }) => (
    <th className={`term-head py-2 px-3 cursor-pointer select-none ${r ? 'text-right' : 'text-left'}`} onClick={() => setSort((s) => ({ k, dir: s.k === k && s.dir === 'asc' ? 'desc' : 'asc' }))}>
      <span className={`inline-flex items-center gap-0.5 ${r ? 'justify-end' : ''}`}>{children}{sort.k === k && (sort.dir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}</span>
    </th>
  )
  if (!itens.length) return <div className="text-[11px] text-faint py-8 text-center mono">sem produtos</div>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="border-b" style={{ borderColor: 'var(--glass-border)' }}>
          <Th k="sku">SKU</Th><Th k="nome">Produto</Th><Th k="preco_atual" r>Preço</Th><Th k="margem_liquida" r>Margem</Th><Th k="pot" r>Potencial</Th>
        </tr></thead>
        <tbody>
          {sorted.map((i, k) => {
            const c = i.status === 'critico' ? DN : i.status === 'atencao' ? GOLD : UP
            return (
              <tr key={k} className="term-row border-b transition-colors" style={{ borderColor: 'var(--glass-border)' }}>
                <td className="mono py-2 px-3 text-faint">{i.sku || '—'}</td>
                <td className="py-2 px-3 max-w-[220px] truncate"><span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: c }} />{i.nome || '—'}</span></td>
                <td className="mono py-2 px-3 text-right">R$ {brl(i.preco_atual)}</td>
                <td className="mono py-2 px-3 text-right font-semibold" style={{ color: c }}>{(i.margem_liquida || 0).toFixed(1)}%</td>
                <td className="mono py-2 px-3 text-right" style={{ color: i.pot == null ? 'var(--faint)' : i.pot >= 0 ? UP : DN }}>{i.pot == null ? '—' : (i.pot >= 0 ? '▲' : '▼') + ' ' + Math.abs(i.pot).toFixed(1) + '%'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Movers({ titulo, icon, itens, render, vazio }) {
  return (
    <div className="term-panel p-4">
      <div className="term-head flex items-center gap-1.5 mb-2.5">{icon} {titulo}</div>
      {!itens.length ? <div className="text-[11px] text-faint py-5 text-center mono">{vazio}</div>
        : <div className="space-y-px">
            {itens.map((i, k) => (
              <div key={k} className="term-row flex items-center gap-3 px-2 py-2 rounded-md transition-colors">
                <span className="mono text-[11px] text-faint w-4">{k + 1}</span>
                <div className="min-w-0 flex-1"><div className="text-xs truncate">{i.nome || i.sku}</div><div className="mono text-[10px] text-faint">{i.sku}</div></div>
                {render(i)}
              </div>
            ))}
          </div>}
    </div>
  )
}

function Skeleton() {
  const B = ({ c }) => <div className={`shimmer rounded-xl ${c}`} />
  return (
    <div className="space-y-2.5 animate-[fadein_.2s]">
      <B c="h-9" />
      <div className="grid lg:grid-cols-3 gap-2.5"><B c="h-56 lg:col-span-2" /><B c="h-56" /></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">{[0, 1, 2, 3].map((i) => <B key={i} c="h-24" />)}</div>
      <B c="h-40" />
      <div className="grid lg:grid-cols-3 gap-2.5"><B c="h-72 lg:col-span-2" /><B c="h-72" /></div>
    </div>
  )
}
