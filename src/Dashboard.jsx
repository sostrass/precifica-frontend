import { useEffect, useState, useRef } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign, Receipt, ShoppingCart, Hourglass,
  Boxes, ShieldCheck, AlertTriangle, Flame, PackageSearch, ArrowUpRight,
  ArrowDownRight, Sparkles, Activity, Layers, Zap,
} from 'lucide-react'
import { api, DEFAULT_CUSTOS } from './api.js'

/* ------------------------------- helpers --------------------------------- */
const brl = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const brlK = (v) => {
  const n = Number(v || 0)
  if (Math.abs(n) >= 1000) return 'R$ ' + (n / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'k'
  return brl(n)
}
const num = (v) => Number(v || 0).toLocaleString('pt-BR')

let _idc = 0
function useUid() { const r = useRef(null); if (!r.current) r.current = 'u' + (++_idc); return r.current }

/* anima um número de onde estava até o novo alvo */
function useCountUp(target, dur = 900) {
  const [val, setVal] = useState(target || 0)
  const from = useRef(0)
  useEffect(() => {
    const start = from.current
    const t0 = performance.now()
    let raf
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur)
      const e = 1 - Math.pow(1 - p, 3)
      const v = start + ((target || 0) - start) * e
      setVal(v); from.current = v
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = target || 0
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, dur])
  return val
}

/* sparkline SVG com área em gradiente e ponto pulsante na ponta */
function Sparkline({ data, cor = 'var(--accent)', h = 44, w = 130, fill = true, dot = true }) {
  const id = useUid()
  if (!data || data.length < 2) return <div style={{ height: h }} />
  const max = Math.max(...data), min = Math.min(...data), rng = max - min || 1
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / rng) * (h - 8) - 4])
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  const area = `${line} L ${w} ${h} L 0 ${h} Z`
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={cor} stopOpacity="0.35" />
          <stop offset="1" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${id})`} />}
      <path d={line} fill="none" stroke={cor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {dot && (
        <g>
          <circle cx={last[0]} cy={last[1]} r="6" fill={cor} opacity="0.25">
            <animate attributeName="r" values="4;9;4" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.35;0;0.35" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={last[0]} cy={last[1]} r="3" fill={cor} />
        </g>
      )}
    </svg>
  )
}

function Delta({ v }) {
  if (v == null || !isFinite(v)) return null
  const up = v >= 0
  const C = up ? 'var(--ok)' : 'var(--danger)'
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md"
          style={{ color: C, background: up ? 'rgba(79,227,201,.12)' : 'rgba(255,111,111,.12)' }}>
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(v).toFixed(1)}%
    </span>
  )
}

const CANAL_COR = (nome = '') => {
  const n = nome.toLowerCase()
  if (n.includes('mercado') || n.includes('ml')) return '#FFE600'
  if (n.includes('shopee')) return '#EE4D2D'
  if (n.includes('shein')) return '#E6E6E6'
  if (n.includes('amazon')) return '#FF9900'
  if (n.includes('magalu') || n.includes('magazine')) return '#0086FF'
  if (n.includes('tiktok')) return '#69C9D0'
  if (n.includes('nuvem')) return '#4FE3C9'
  if (n.includes('americanas')) return '#E60014'
  return '#E6B450'
}

/* --------------------------------- view ---------------------------------- */
export default function Dashboard() {
  const [dias, setDias] = useState(30)
  const [kpi, setKpi] = useState(null)
  const [loadingKpi, setLoadingKpi] = useState(true)
  const [itens, setItens] = useState(null)
  const [canalVista, setCanalVista] = useState('valor')

  useEffect(() => {
    api.monitoramento({ custos_globais: DEFAULT_CUSTOS, canal: 'mercadolivre' })
      .then((d) => setItens(d.itens || [])).catch(() => setItens([]))
  }, [])

  useEffect(() => {
    setLoadingKpi(true)
    api.kpis(dias).then(setKpi).catch(() => setKpi(null)).finally(() => setLoadingKpi(false))
  }, [dias])

  if (itens === null) return <Skeleton />

  // saúde da carteira
  const total = itens.length || 1
  const ideal = itens.filter((i) => i.status === 'lucro_ideal').length
  const atencao = itens.filter((i) => i.status === 'atencao').length
  const critico = itens.filter((i) => i.status === 'critico').length
  const margemMedia = itens.length ? itens.reduce((s, i) => s + (i.margem_liquida || 0), 0) / itens.length : 0
  const risco = itens.filter((i) => i.status !== 'lucro_ideal')
    .sort((a, b) => (a.margem_liquida || 0) - (b.margem_liquida || 0)).slice(0, 6)

  // tendência -> sparkline + delta
  const serie = (kpi?.tendencia || []).map((t) => t.valor)
  const delta = (() => {
    if (serie.length < 4) return null
    const meio = Math.floor(serie.length / 2)
    const a = serie.slice(0, meio).reduce((s, v) => s + v, 0)
    const b = serie.slice(meio).reduce((s, v) => s + v, 0)
    return a ? ((b - a) / a) * 100 : null
  })()

  const canais = (kpi?.por_canal || []).map((c) => ({ ...c, cor: CANAL_COR(c.loja) }))
    .sort((a, b) => (b.valor || 0) - (a.valor || 0))
  const maxCanal = Math.max(1, ...canais.map((c) => canalVista === 'valor' ? c.valor : c.unidades))
  const gmvTotal = canais.reduce((s, c) => s + (c.valor || 0), 0) || 1

  return (
    <div className="space-y-4 max-w-6xl pb-6">
      {/* ===== HERO ===== */}
      <Hero kpi={kpi} serie={serie} delta={delta} dias={dias} setDias={setDias} loading={loadingKpi} />

      {/* ===== KPI TILES ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile icon={Activity} cor="var(--accent2)" label="Margem média" valor={margemMedia} sufixo="%" decimais={1}
              rodape={<HealthMini ideal={ideal} atencao={atencao} critico={critico} />} />
        <Tile icon={Hourglass} cor="var(--warn)" label="Capital parado" money valor={kpi?.capital_parado || 0}
              rodape={<span className="text-xs text-faint">{kpi?.qtd_parados || 0} produto(s) sem giro</span>} />
        <Tile icon={Boxes} cor="var(--accent)" label="Produtos ativos" valor={total}
              rodape={<span className="text-xs flex items-center gap-1" style={{ color: 'var(--ok)' }}><ShieldCheck size={12} /> {ideal} saudáveis</span>} />
        <Tile icon={ShoppingCart} cor="#C9A0FF" label={`Pedidos · ${dias}d`} valor={kpi?.pedidos || 0} loading={loadingKpi}
              rodape={<span className="text-xs text-faint">ticket {brlK(kpi?.ticket_medio || 0)}</span>} />
      </div>

      {/* ===== CANAIS + SAÚDE ===== */}
      <div className="grid lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3 glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display font-semibold flex items-center gap-2"><Layers size={16} className="text-accent" /> Raio-X de canais</div>
            <div className="flex gap-1 text-xs">
              {[['valor', 'Faturamento'], ['unidades', 'Unidades']].map(([id, t]) => (
                <button key={id} onClick={() => setCanalVista(id)} className="px-2.5 py-1 rounded-lg font-medium transition"
                        style={canalVista === id ? { background: 'var(--accent)', color: '#1a1206' } : { color: 'var(--text-dim)' }}>{t}</button>
              ))}
            </div>
          </div>
          {canais.length === 0
            ? <EmptyMini txt="Sem vendas por canal no período. Os dados aparecem conforme os pedidos chegam do Bling." />
            : <div className="space-y-2.5">
                {canais.map((c, i) => {
                  const v = canalVista === 'valor' ? c.valor : c.unidades
                  const share = ((c.valor || 0) / gmvTotal) * 100
                  return (
                    <div key={i} className="group">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: c.cor }} />
                          <span className="truncate">{c.loja}</span>
                          <span className="text-[10px] text-faint num">{share.toFixed(0)}%</span>
                        </span>
                        <span className="num font-semibold shrink-0">{canalVista === 'valor' ? brlK(v) : num(v) + ' un'}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--glass-hover)' }}>
                        <div className="h-full rounded-full transition-all duration-700 group-hover:brightness-110"
                             style={{ width: `${Math.max(3, (v / maxCanal) * 100)}%`, background: c.cor }} />
                      </div>
                    </div>
                  )
                })}
              </div>}
        </div>

        <div className="lg:col-span-2 glass rounded-2xl p-4">
          <div className="font-display font-semibold flex items-center gap-2 mb-3"><ShieldCheck size={16} className="text-accent2" /> Saúde da carteira</div>
          <HealthRing ideal={ideal} atencao={atencao} critico={critico} total={total} />
          <div className="space-y-1.5 mt-3">
            <HealthRow cor="var(--ok)" label="Saudável" n={ideal} total={total} />
            <HealthRow cor="var(--warn)" label="Atenção" n={atencao} total={total} />
            <HealthRow cor="var(--danger)" label="Crítico" n={critico} total={total} />
          </div>
        </div>
      </div>

      {/* ===== ALERTAS ===== */}
      <div className="grid lg:grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4">
          <div className="font-display font-semibold flex items-center gap-2 mb-3"><AlertTriangle size={16} className="text-danger" /> Margens em risco</div>
          {risco.length === 0
            ? <EmptyMini txt="Nenhuma margem em risco. Carteira saudável. 🎉" />
            : <div className="space-y-1.5">
                {risco.map((i, k) => (
                  <div key={k} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-[var(--glass-hover)] transition">
                    <span className="h-7 w-7 rounded-lg grid place-items-center shrink-0"
                          style={{ background: i.status === 'critico' ? 'rgba(255,111,111,.14)' : 'rgba(230,180,80,.14)' }}>
                      <Flame size={14} style={{ color: i.status === 'critico' ? 'var(--danger)' : 'var(--warn)' }} />
                    </span>
                    <span className="text-sm truncate flex-1">{i.nome || i.sku}</span>
                    <span className="text-xs font-semibold num px-2 py-0.5 rounded-md shrink-0"
                          style={{ color: i.status === 'critico' ? 'var(--danger)' : 'var(--warn)', background: 'var(--glass-hover)' }}>
                      {(i.margem_liquida || 0).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>}
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display font-semibold flex items-center gap-2"><PackageSearch size={16} className="text-warn" /> Capital parado</div>
            {kpi?.capital_parado > 0 && <span className="text-sm num font-semibold" style={{ color: 'var(--warn)' }}>{brlK(kpi.capital_parado)}</span>}
          </div>
          {!(kpi?.parados || []).length
            ? <EmptyMini txt={loadingKpi ? 'Calculando giro do estoque…' : 'Todo o estoque está girando. Sem capital parado. 🎉'} />
            : <div className="space-y-1.5">
                {kpi.parados.slice(0, 6).map((p, k) => (
                  <div key={k} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-[var(--glass-hover)] transition">
                    <span className="num text-xs text-faint w-5 shrink-0">{k + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm truncate">{p.nome || p.sku}</div>
                      <div className="text-[11px] text-faint num">{num(p.saldo)} em estoque</div>
                    </div>
                    <span className="text-xs num font-semibold shrink-0" style={{ color: 'var(--warn)' }}>{brlK(p.capital)}</span>
                  </div>
                ))}
              </div>}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------- pieces --------------------------------- */
function Hero({ kpi, serie, delta, dias, setDias, loading }) {
  const gmv = useCountUp(kpi?.gmv || 0)
  return (
    <div className="relative rounded-2xl p-5 overflow-hidden"
         style={{ background: 'linear-gradient(135deg, rgba(230,180,80,.10), rgba(79,227,201,.05) 60%, transparent)', border: '1px solid var(--glass-border)' }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-faint flex items-center gap-1.5"><DollarSign size={12} /> Faturamento · últimos {dias} dias</div>
          <div className="flex items-end gap-3 mt-1 flex-wrap">
            <div className="font-display font-bold text-4xl num leading-none" style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {brl(gmv)}
            </div>
            <Delta v={delta} />
          </div>
          <div className="flex items-center gap-4 mt-3 text-sm flex-wrap">
            <Inline icon={Receipt} label="Pedidos" valor={num(kpi?.pedidos || 0)} />
            <Inline icon={ShoppingCart} label="Ticket médio" valor={brlK(kpi?.ticket_medio || 0)} />
            <Inline icon={Hourglass} label="Capital parado" valor={brlK(kpi?.capital_parado || 0)} alerta={kpi?.capital_parado > 0} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex gap-1 rounded-xl p-0.5" style={{ background: 'var(--glass-hover)' }}>
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => setDias(d)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                      style={dias === d ? { background: 'var(--accent)', color: '#1a1206', boxShadow: '0 2px 10px -2px var(--accent)' } : { color: 'var(--text-dim)' }}>
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2 -mx-1" style={{ opacity: loading ? 0.4 : 1, transition: 'opacity .3s' }}>
        <Sparkline data={serie.length ? serie : [0, 0]} cor="var(--accent2)" h={56} w={600} />
      </div>
      {loading && <div className="absolute top-3 right-5"><Zap size={14} className="text-faint animate-pulse" /></div>}
    </div>
  )
}

function Inline({ icon: Ic, label, valor, alerta }) {
  return (
    <span className="flex items-center gap-1.5">
      <Ic size={14} className="text-faint" />
      <span className="text-faint">{label}</span>
      <b className="num" style={alerta ? { color: 'var(--warn)' } : undefined}>{valor}</b>
    </span>
  )
}

function Tile({ icon: Ic, cor, label, valor, sufixo, money, decimais = 0, rodape, loading }) {
  const v = useCountUp(valor || 0)
  const txt = money ? brlK(v) : v.toLocaleString('pt-BR', { minimumFractionDigits: decimais, maximumFractionDigits: decimais }) + (sufixo || '')
  return (
    <div className="glass rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow)] cursor-default group">
      <div className="flex items-center justify-between">
        <div className="h-8 w-8 rounded-lg grid place-items-center transition-transform group-hover:scale-110" style={{ background: `color-mix(in srgb, ${cor} 14%, transparent)` }}>
          <Ic size={16} style={{ color: cor }} />
        </div>
        {loading && <Zap size={12} className="text-faint animate-pulse" />}
      </div>
      <div className="text-xs text-faint mt-2.5">{label}</div>
      <div className="font-display font-bold text-2xl num mt-0.5">{txt}</div>
      <div className="mt-1.5">{rodape}</div>
    </div>
  )
}

function HealthMini({ ideal, atencao, critico }) {
  const tot = (ideal + atencao + critico) || 1
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden" title={`${ideal} saudável · ${atencao} atenção · ${critico} crítico`}>
      <div style={{ width: `${(ideal / tot) * 100}%`, background: 'var(--ok)' }} />
      <div style={{ width: `${(atencao / tot) * 100}%`, background: 'var(--warn)' }} />
      <div style={{ width: `${(critico / tot) * 100}%`, background: 'var(--danger)' }} />
    </div>
  )
}

function HealthRing({ ideal, atencao, critico, total }) {
  const pct = Math.round((ideal / (total || 1)) * 100)
  const C = 2 * Math.PI * 42
  const seg = (n) => (n / (total || 1)) * C
  return (
    <div className="relative h-36 grid place-items-center">
      <svg viewBox="0 0 100 100" className="h-36 w-36 -rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--glass-hover)" strokeWidth="9" />
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--danger)" strokeWidth="9"
                strokeDasharray={`${seg(ideal + atencao + critico)} ${C}`} style={{ transition: 'stroke-dasharray 1s' }} />
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--warn)" strokeWidth="9"
                strokeDasharray={`${seg(ideal + atencao)} ${C}`} style={{ transition: 'stroke-dasharray 1s' }} />
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--ok)" strokeWidth="9" strokeLinecap="round"
                strokeDasharray={`${seg(ideal)} ${C}`} style={{ transition: 'stroke-dasharray 1s' }} />
      </svg>
      <div className="absolute text-center">
        <div className="font-display font-bold text-2xl num" style={{ color: 'var(--ok)' }}>{pct}%</div>
        <div className="text-[10px] text-faint uppercase tracking-wide">saudável</div>
      </div>
    </div>
  )
}

function HealthRow({ cor, label, n, total }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: cor }} />
      <span className="flex-1 text-dim">{label}</span>
      <b className="num">{n}</b>
      <span className="text-[11px] text-faint num w-10 text-right">{((n / (total || 1)) * 100).toFixed(0)}%</span>
    </div>
  )
}

function EmptyMini({ txt }) {
  return <div className="text-sm text-faint py-6 text-center">{txt}</div>
}

/* ------------------------------- skeleton -------------------------------- */
function Skeleton() {
  const Bar = ({ className }) => <div className={`shimmer rounded-xl ${className}`} />
  return (
    <div className="space-y-4 max-w-6xl animate-[fadein_.2s]">
      <Bar className="h-36" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <Bar key={i} className="h-28" />)}</div>
      <div className="grid lg:grid-cols-5 gap-3"><Bar className="h-64 lg:col-span-3" /><Bar className="h-64 lg:col-span-2" /></div>
      <div className="grid lg:grid-cols-2 gap-3"><Bar className="h-48" /><Bar className="h-48" /></div>
    </div>
  )
}
