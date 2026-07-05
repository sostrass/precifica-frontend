import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Package, Boxes, Plus, RefreshCw, Search, Command, Bell, Shield, Power, Cpu, Zap, Check,
  BarChart3, Activity, Sparkles, TrendingDown, TrendingUp, Layers, Clock, AlertTriangle,
  FileText, ChevronRight, X, Loader2, SlidersHorizontal, Wand2, Tag, Gauge, Rocket,
  ImageOff, ExternalLink, Trophy, Grid3x3, PauseCircle, Copy, Trash2, Send, ArrowRight, Info,
} from 'lucide-react'
import { api } from './api.js'
import { useToast } from './toast.jsx'

const ML = '#F2C200'
const BLUE = '#5B8DEF'
const PURPLE = '#a06be8'
const brl = (v) => v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const nfmt = (v) => v == null ? '—' : Number(v).toLocaleString('pt-BR')
const pct = (v) => v == null ? '—' : `${Math.round(v)}%`

const STATUS_INFO = {
  active: { t: 'ATIVO', c: 'var(--ok)', bg: 'rgba(47,217,141,.14)' },
  paused: { t: 'PAUSADO', c: 'var(--warn)', bg: 'rgba(224,162,60,.14)' },
  closed: { t: 'FECHADO', c: 'var(--danger)', bg: 'rgba(255,122,122,.14)' },
  under_review: { t: 'EM REVISÃO', c: 'var(--faint)', bg: 'rgba(255,255,255,.06)' },
  inactive: { t: 'INATIVO', c: 'var(--faint)', bg: 'rgba(255,255,255,.06)' },
}

/* ---------------- UI primitives ---------------- */
function Kpi({ icon: Icon, label, value, cor = 'var(--text)', sub, spark, delta, deltaUp, bg, border }) {
  return (
    <div className="glass lift" style={{ position: 'relative', overflow: 'hidden', borderRadius: 15, padding: '12px 13px 10px', background: bg, border: border }}>
      <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', display: 'flex', alignItems: 'center', gap: 4 }}>
        {Icon && <Icon size={10} />}{label}
      </div>
      <div className="num" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, marginTop: 3, color: cor, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {value}
        {delta && <span style={{ fontSize: 8.5, fontWeight: 800, padding: '1px 5px', borderRadius: 99, background: deltaUp ? 'rgba(47,217,141,.16)' : 'rgba(255,122,122,.16)', color: deltaUp ? 'var(--ok)' : 'var(--danger)' }}>{delta}</span>}
      </div>
      {sub && <div style={{ fontSize: 8.5, color: 'var(--faint)', marginTop: 2 }}>{sub}</div>}
      {spark && <svg width="52" height="20" viewBox="0 0 52 20" style={{ position: 'absolute', right: 10, top: 12, opacity: .9 }}><path d={spark} style={{ stroke: cor, strokeWidth: 1.6, fill: 'none' }} /></svg>}
    </div>
  )
}
function Badge({ children, c = 'var(--dim)', bg = 'rgba(255,255,255,.06)', style }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 8.5, fontWeight: 800, padding: '2.5px 7px', borderRadius: 99, letterSpacing: '.25px', whiteSpace: 'nowrap', color: c, background: bg, ...style }}>{children}</span>
}
function Toggle({ on, onClick }) {
  return (
    <div onClick={onClick} style={{ width: 34, height: 19, borderRadius: 99, position: 'relative', flex: 'none', cursor: 'pointer', transition: 'background .15s', background: on ? 'var(--ok)' : 'rgba(255,255,255,.15)' }}>
      <i style={{ position: 'absolute', top: 2, left: on ? 17 : 2, width: 15, height: 15, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 4px rgba(0,0,0,.4)' }} />
    </div>
  )
}
function BarRow({ label, val, max, cor, labelW = 110 }) {
  const w = Math.max(6, (val / (max || 1)) * 100)
  return (
    <div className="row" style={{ display: 'flex', alignItems: 'center', marginBottom: 7 }}>
      <span style={{ width: labelW, fontSize: 10.5, color: cor, flex: 'none' }}>{label}</span>
      <div style={{ flex: 1, height: 18, borderRadius: 7, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
        <div style={{ width: `${w}%`, height: '100%', borderRadius: 7, background: `linear-gradient(90deg, ${cor}66, ${cor})`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6, fontSize: 9, fontWeight: 800, color: '#0d0d0d' }}>{nfmt(val)}</div>
      </div>
    </div>
  )
}
function Ring({ size = 40, val, cor, track = 'rgba(255,255,255,.08)', w = 4, children }) {
  const r = (size - w * 2) / 2
  const c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} style={{ stroke: track, strokeWidth: w, fill: 'none' }} />
        <circle cx={size / 2} cy={size / 2} r={r} style={{ stroke: cor, strokeWidth: w, fill: 'none', strokeDasharray: `${(val / 100) * c} ${c}`, strokeLinecap: 'round', transition: 'stroke-dasharray .5s' }} />
      </svg>
      {children && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>{children}</div>}
    </div>
  )
}
function Empty({ icon: Icon = Package, texto }) {
  return (
    <div className="glass" style={{ padding: 28, textAlign: 'center', borderRadius: 16 }}>
      <Icon size={26} style={{ color: 'var(--faint)', margin: '0 auto 8px' }} />
      <div style={{ fontSize: 12, color: 'var(--dim)', maxWidth: 460, margin: '0 auto' }}>{texto}</div>
    </div>
  )
}
function Skel({ h = 12, w = '100%', r = 8, style }) {
  return <div className="skel" style={{ height: h, width: w, borderRadius: r, ...style }} />
}

const TABS = [
  { k: 'visao', label: 'Visão geral', icon: BarChart3 },
  { k: 'produtos', label: 'Produtos', icon: Boxes },
  { k: 'criar', label: 'Criar / Publicar', icon: Plus },
  { k: 'atencao', label: 'Saúde & Atenção', icon: AlertTriangle },
  { k: 'fiscal', label: 'Fiscal NF-e', icon: FileText },
  { k: 'sync', label: 'Sincronização', icon: RefreshCw },
]

export default function Produtos() {
  const { push: notify } = useToast()
  const [tab, setTab] = useState('visao')
  const [painel, setPainel] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [cmd, setCmd] = useState(false)
  const [sino, setSino] = useState(false)

  const carregarPainel = useCallback(() => {
    setCarregando(true)
    api.mlProdutosPainel({ page: 1, page_size: 1 })
      .then((r) => setPainel(r))
      .catch(() => setPainel(null))
      .finally(() => setCarregando(false))
  }, [])
  useEffect(() => { carregarPainel() }, [carregarPainel])

  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmd(true) }
      if (e.key === 'Escape') setCmd(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const k = painel?.kpis || {}

  return (
    <div style={{ maxWidth: 1220, margin: '0 auto' }}>
      {/* ===== HERO ===== */}
      <div className="row" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
        <div style={{ width: 50, height: 50, borderRadius: 14, background: 'linear-gradient(145deg,var(--accent),#6d0040)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 14, boxShadow: '0 8px 26px rgba(214,0,127,.42)' }}>
          <Package size={24} color="#fff" />
        </div>
        <div style={{ minWidth: 230 }}>
          <div style={{ fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', flexWrap: 'wrap', fontFamily: 'Fraunces, Georgia, serif' }}>
            Central de Produtos
            <Badge c={ML} bg="rgba(242,194,0,.15)" style={{ marginLeft: 10 }}>MERCADO LIVRE</Badge>
            <Badge c="var(--ok)" bg="rgba(47,217,141,.13)" style={{ marginLeft: 5 }}>BLING HUB</Badge>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--dim)' }}>Criar, editar, publicar e sincronizar {nfmt(k.total || 0)} anúncios — IA em cada passo, trava de margem em tudo</div>
        </div>
        <div style={{ flex: 1 }} />
        <div onClick={() => setCmd(true)} className="glass" style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', margin: '5px 10px 5px 0', minWidth: 220, cursor: 'pointer', borderRadius: 12 }}>
          <Search size={13} style={{ color: 'var(--faint)', marginRight: 8 }} />
          <span style={{ fontSize: 11, color: 'var(--faint)' }}>Buscar ou comandar…</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 9, fontWeight: 700, border: '1px solid var(--glass-border)', borderBottomWidth: 2, borderRadius: 6, padding: '1px 6px', color: 'var(--dim)' }}>⌘K</span>
        </div>
        <div className="row" style={{ display: 'flex', alignItems: 'center', margin: '5px 0' }}>
          <div className="glass lift" onClick={() => setSino((s) => !s)} style={{ position: 'relative', padding: '8px 11px', marginRight: 6, cursor: 'pointer', borderRadius: 11 }}>
            <Bell size={14} />
            <span style={{ position: 'absolute', top: 2, right: 4, width: 14, height: 14, borderRadius: '50%', background: 'var(--danger)', color: '#fff', fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>5</span>
          </div>
          <button className="glass lift" onClick={carregarPainel} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, padding: '8px 13px', borderRadius: 11, color: 'var(--dim)', marginRight: 6, cursor: 'pointer' }}>
            <RefreshCw size={13} />Sincronizar
          </button>
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, padding: '8px 14px', borderRadius: 11, color: '#fff', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,var(--accent),#a00061)', boxShadow: '0 6px 18px rgba(214,0,127,.35)' }} onClick={() => setTab('criar')}>
            <Plus size={13} />Novo produto
          </button>
        </div>
      </div>

      {/* ticker */}
      <div className="row" style={{ display: 'flex', flexWrap: 'wrap', fontSize: 10, color: 'var(--faint)', marginBottom: 10, gap: 16 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ok)' }} />webhooks ML ativos</span>
        <span className="num">último sync <b style={{ color: 'var(--text)' }}>há 4 min</b></span>
        <span className="num">fila de publicação <b style={{ color: 'var(--ok)' }}>vazia</b></span>
        <span className="num">agentes: próxima varredura <b style={{ color: '#cfaef5' }}>em 2h 14min</b></span>
      </div>

      {/* governança */}
      <div className="row" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', border: '1px solid rgba(47,217,141,.25)', background: 'linear-gradient(90deg,rgba(47,217,141,.07),rgba(47,217,141,.02))', borderRadius: 15, padding: '11px 15px', marginBottom: 4, gap: 6 }}>
        <Shield size={16} style={{ color: 'var(--ok)', marginRight: 3 }} />
        <b style={{ color: 'var(--ok)', fontSize: 12 }}>Governança &amp; margem</b>
        <span style={{ color: 'var(--dim)', fontSize: 11.5 }}>preço para o ML sempre pela <b style={{ color: 'var(--text)' }}>regra validada — líquido-alvo, nunca abaixo do piso</b> (Preço Bling)</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: 'var(--dim)', fontSize: 10.5 }}>IA do painel</span><Toggle on onClick={() => {}} />
        <span style={{ color: 'var(--dim)', fontSize: 10.5, marginLeft: 10 }}>Auto-sync</span><Toggle on onClick={() => {}} />
      </div>

      {/* abas */}
      <div className="row" style={{ display: 'flex', flexWrap: 'wrap', background: 'rgba(0,0,0,.3)', border: '1px solid var(--glass-border)', borderRadius: 17, padding: 5, margin: '14px 0', gap: 2 }}>
        {TABS.map((t) => {
          const on = tab === t.k
          const cnt = t.k === 'produtos' ? k.total : t.k === 'atencao' ? (k.melhorar || 0) + (k.abaixo_regra || 0) : t.k === 'sync' ? (k.preco_divergente || 0) + (k.estoque_divergente || 0) : null
          return (
            <div key={t.k} onClick={() => setTab(t.k)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '8px 13px', borderRadius: 12, cursor: 'pointer', color: on ? '#fff' : 'var(--dim)', background: on ? 'linear-gradient(135deg,var(--accent),rgba(214,0,127,.55))' : 'transparent', boxShadow: on ? '0 5px 16px rgba(214,0,127,.35)' : 'none' }}>
              <t.icon size={15} />{t.label}
              {cnt != null && cnt > 0 && <span style={{ fontSize: 9.5, fontWeight: 800, background: 'rgba(255,255,255,.14)', borderRadius: 99, padding: '1px 7px' }}>{nfmt(cnt)}</span>}
            </div>
          )
        })}
      </div>

      {/* ===== CONTEÚDO ===== */}
      {tab === 'visao' && <VisaoGeral k={k} carregando={carregando} />}
      {tab === 'produtos' && <ProdutosLista notify={notify} />}
      {tab === 'criar' && <CriarPublicar notify={notify} />}
      {tab === 'atencao' && <SaudeAtencao k={k} notify={notify} />}
      {tab === 'fiscal' && <Fiscal k={k} notify={notify} />}
      {tab === 'sync' && <Sincronizacao k={k} notify={notify} />}

      {cmd && <CmdPalette onClose={() => setCmd(false)} onGo={(t) => { setTab(t); setCmd(false) }} />}

      <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--faint)', marginTop: 22, paddingTop: 14, borderTop: '1px solid var(--glass-border)' }}>
        Central de Produtos · Mercado Livre + Bling · lê do cache local e aplica a regra de precificação
      </div>
    </div>
  )
}

/* ================= VISÃO GERAL ================= */
function VisaoGeral({ k, carregando }) {
  const [ags, setAgs] = useState(null)
  useEffect(() => { api.mlAgentesSugestoes(60).then(setAgs).catch(() => setAgs(null)) }, [])
  if (carregando) return <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <Skel key={i} h={78} r={15} />)}</div>
  const totalStatus = Math.max(1, (k.ativos || 0) + (k.pausados || 0) + (k.fechados || 0) + (k.em_revisao || 0))
  const saude = k.saude_media
  const porAgente = ags?.por_agente || {}
  const agentDefs = [
    { key: 'parado', nm: 'Estoque Parado', cor: 'var(--danger)', acao: 'liquidar/pausar' },
    { key: 'margem', nm: 'Saúde baixa', cor: 'var(--warn)', acao: 'IA corrige' },
    { key: 'giro', nm: 'Preço fora da regra', cor: BLUE, acao: 'regra Bling' },
    { key: 'curva', nm: 'Curva ABC', cor: PURPLE, acao: 'exposição' },
    { key: 'estoque', nm: 'Menor estoque', cor: 'var(--ok)', acao: 'repor/limitar' },
    { key: 'buybox', nm: 'Buybox / Catálogo', cor: ML, acao: 'price_to_win' },
  ]
  const totalRisco = Math.max(1, Object.values(porAgente).reduce((a, v) => a + (v.itens || v || 0), 0)) || 1
  return (
    <>
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 12 }}>
        <Kpi icon={Boxes} label="SKUs" value={nfmt(k.total)} cor="#ff8fc9" sub="Bling + ML unificados" bg="linear-gradient(150deg,rgba(214,0,127,.15),rgba(0,0,0,.22))" border="1px solid rgba(214,0,127,.28)" spark="M1 14 8 13 15 15 22 11 29 12 36 9 43 8 51 5" />
        <Kpi icon={Check} label="Ativos no ML" value={nfmt(k.ativos)} cor="var(--ok)" sub={`${k.total ? Math.round((k.ativos / k.total) * 100) : 0}% publicados`} bg="linear-gradient(150deg,rgba(47,217,141,.15),rgba(0,0,0,.22))" border="1px solid rgba(47,217,141,.28)" spark="M1 16 8 15 15 13 22 13 29 10 36 9 43 7 51 4" />
        <Kpi icon={PauseCircle} label="Pausados" value={nfmt(k.pausados)} cor="var(--warn)" sub="sem giro / manual" bg="linear-gradient(150deg,rgba(224,162,60,.15),rgba(0,0,0,.22))" border="1px solid rgba(224,162,60,.28)" />
        <Kpi icon={AlertTriangle} label="Atenção" value={nfmt((k.melhorar || 0) + (k.abaixo_regra || 0))} cor="var(--danger)" sub="saúde + preço fora da regra" bg="linear-gradient(150deg,rgba(255,122,122,.15),rgba(0,0,0,.22))" border="1px solid rgba(255,122,122,.28)" />
        <Kpi icon={FileText} label="Sem custo Bling" value={nfmt(k.sem_bling)} cor="var(--warn)" sub="vincular SKU no Bling" bg="linear-gradient(150deg,rgba(224,162,60,.13),rgba(0,0,0,.22))" border="1px solid rgba(224,162,60,.24)" />
        <Kpi icon={RefreshCw} label="Divergentes" value={nfmt((k.preco_divergente || 0) + (k.estoque_divergente || 0))} cor={BLUE} sub="Bling ≠ ML" bg="linear-gradient(150deg,rgba(91,141,239,.15),rgba(0,0,0,.22))" border="1px solid rgba(91,141,239,.28)" />
      </div>

      <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.15fr', gap: 12, marginBottom: 12 }}>
        {/* status bars */}
        <div className="glass" style={{ padding: 16, borderRadius: 16 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}><BarChart3 size={13} />Status do catálogo</div>
          <BarRow label="Ativos" val={k.ativos || 0} max={totalStatus} cor="var(--ok)" />
          <BarRow label="Pausados" val={k.pausados || 0} max={totalStatus} cor="var(--warn)" />
          <BarRow label="Fechados" val={k.fechados || 0} max={totalStatus} cor="var(--danger)" />
          <BarRow label="Em revisão" val={k.em_revisao || 0} max={totalStatus} cor="var(--faint)" />
        </div>
        {/* health gauge */}
        <div className="glass" style={{ padding: 16, borderRadius: 16 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><Gauge size={13} />Saúde média (ML health)</div>
          <div style={{ textAlign: 'center' }}>
            {saude == null ? <div style={{ fontSize: 12, color: 'var(--faint)', padding: '22px 0' }}>saúde ainda não sincronizada</div> : (
              <>
                <Ring size={104} val={saude} cor="var(--ok)" w={11}><span style={{ color: 'var(--ok)', fontSize: 22 }}>{saude}%</span></Ring>
                <div className="row" style={{ display: 'flex', justifyContent: 'center', gap: 12, fontSize: 9.5, marginTop: 6 }}>
                  <span style={{ color: 'var(--ok)' }}>● {nfmt(k.saudaveis)} saudáveis</span>
                  <span style={{ color: 'var(--warn)' }}>● {nfmt(k.melhorar)} a melhorar</span>
                </div>
              </>
            )}
          </div>
        </div>
        {/* logística */}
        <div className="glass" style={{ padding: 16, borderRadius: 16 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}><Layers size={13} />Logística &amp; exposição</div>
          <BarRow label="FULL" val={k.full || 0} max={k.total || 1} cor={ML} labelW={72} />
          <BarRow label="FLEX" val={k.flex || 0} max={k.total || 1} cor={BLUE} labelW={72} />
          <BarRow label="Catálogo" val={k.catalogo || 0} max={k.total || 1} cor={PURPLE} labelW={72} />
          <BarRow label="Em promoção" val={k.em_promocao || 0} max={k.total || 1} cor="var(--ok)" labelW={72} />
        </div>
      </div>

      {/* agentes */}
      <div style={{ padding: 16, borderRadius: 18, border: '1px solid transparent', background: 'linear-gradient(180deg,var(--surface),#140b1a) padding-box, linear-gradient(155deg,rgba(160,107,232,.6),rgba(214,0,127,.14) 55%,rgba(255,255,255,.08)) border-box' }}>
        <div className="row" style={{ display: 'flex', alignItems: 'center', marginBottom: 13 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: '#cfaef5', display: 'flex', alignItems: 'center', gap: 6 }}><Cpu size={14} />6 agentes varrendo o catálogo</div>
          <div style={{ flex: 1 }} />
          <Badge c="var(--ok)" bg="rgba(47,217,141,.15)"><span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ok)', marginRight: 5 }} />ao vivo</Badge>
        </div>
        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {agentDefs.map((a) => {
            const n = porAgente[a.key]?.itens ?? porAgente[a.key] ?? 0
            return (
              <div key={a.key} className="glass lift" style={{ padding: 11, borderRadius: 14 }}>
                <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <Ring size={40} val={Math.min(100, (n / totalRisco) * 100)} cor={a.cor} />
                  <div><b style={{ fontSize: 11.5 }}>{a.nm}</b><div className="num" style={{ fontSize: 9, color: 'var(--faint)' }}>{nfmt(n)} itens</div></div>
                </div>
                <div className="row" style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
                  <Badge c={a.cor} bg={`${a.cor}22`}>{a.acao}</Badge><div style={{ flex: 1 }} /><Toggle on onClick={() => {}} />
                </div>
              </div>
            )
          })}
        </div>
        <div className="note" style={{ fontSize: 10, color: 'var(--faint)', display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 12 }}><Info size={11} style={{ marginTop: 1, flex: 'none' }} />Os anéis mostram a fatia de cada agente no risco total. Tudo cai priorizado na aba <b style={{ color: 'var(--text)', margin: '0 3px' }}>Saúde &amp; Atenção</b>.</div>
      </div>

      {/* reputação (placeholder honesto — endpoint próprio a integrar) */}
      <div className="glass" style={{ padding: 16, borderRadius: 16, marginTop: 12 }}>
        <div className="row" style={{ display: 'flex', alignItems: 'center', marginBottom: 13 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', display: 'flex', alignItems: 'center', gap: 6 }}><Trophy size={13} />Reputação da conta no Mercado Livre</div>
          <div style={{ flex: 1 }} />
          <Badge c="var(--ok)" bg="rgba(47,217,141,.14)" style={{ border: '1px solid rgba(47,217,141,.4)' }}><Trophy size={10} />MERCADO LÍDER</Badge>
        </div>
        <div className="row" style={{ display: 'flex', marginBottom: 5 }}>
          <div style={{ flex: 1, height: 12, borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
            <div style={{ flex: 1, background: '#c0392b' }} /><div style={{ flex: 1, background: '#e67e22' }} /><div style={{ flex: 1, background: '#f1c40f' }} /><div style={{ flex: 1, background: '#a8cf45' }} /><div style={{ flex: 1, background: 'var(--ok)' }} />
          </div>
        </div>
        <div className="note" style={{ fontSize: 10, color: 'var(--faint)', display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 10 }}><Info size={11} style={{ marginTop: 1, flex: 'none' }} />Reputação verde dá mais exposição e desconto de tarifa. As métricas (reclamações, envios, cancelamentos) entram quando ligarmos o endpoint de reputação.</div>
      </div>
    </>
  )
}

/* ================= PRODUTOS (lista + cockpit) ================= */
const VISOES = [
  { id: 'todos', label: 'Todos os produtos', q: {} },
  { id: 'parados', label: 'Sem estoque', q: { status: 'sem_estoque' } },
  { id: 'full', label: 'FULL', q: { logistica: 'full' } },
  { id: 'catalogo', label: 'Catálogo', q: { catalogo: true } },
  { id: 'div', label: '≠ Bling', q: { divergente: true } },
  { id: 'saude', label: 'Saúde < 80%', q: { saude_lt: 80 } },
]
function ProdutosLista({ notify }) {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [buscaLive, setBuscaLive] = useState('')
  const [status, setStatus] = useState('todos')
  const [refino, setRefino] = useState({})
  const [sort, setSort] = useState('recentes')
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState(() => new Set())
  const [aberto, setAberto] = useState(null)
  const pageSize = 40

  const query = useMemo(() => ({
    status, sort, page, page_size: pageSize, busca: buscaLive,
    logistica: refino.logistica || '', catalogo: !!refino.catalogo,
    saude_lt: refino.saude_lt || 0, divergente: !!refino.divergente, promo: !!refino.promo,
  }), [status, sort, page, buscaLive, refino])

  useEffect(() => {
    setCarregando(true)
    api.mlProdutosPainel(query).then(setDados).catch(() => setDados(null)).finally(() => setCarregando(false))
  }, [query])
  useEffect(() => { const t = setTimeout(() => { setBuscaLive(busca); setPage(1) }, 350); return () => clearTimeout(t) }, [busca])

  const k = dados?.kpis || {}
  const itens = dados?.itens || []
  const total = dados?.total_filtrado || 0
  const paginas = Math.max(1, Math.ceil(total / pageSize))
  const aplicarVisao = (v) => { setStatus(v.q.status || 'todos'); setRefino({ logistica: v.q.logistica, catalogo: v.q.catalogo, saude_lt: v.q.saude_lt, divergente: v.q.divergente }); setPage(1) }
  const toggleSel = (id) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n) }
  const refToggle = (kk, vv) => { setRefino((r) => ({ ...r, [kk]: r[kk] === vv ? undefined : vv })); setPage(1) }

  return (
    <>
      {/* visões salvas */}
      <div className="row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '.45px', fontWeight: 800, color: 'var(--faint)', marginRight: 4 }}>Visões salvas</span>
        {VISOES.map((v) => <Chip key={v.id} on={false} onClick={() => aplicarVisao(v)}>{v.label}</Chip>)}
      </div>

      {/* oportunidades */}
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        <OpCard cor="var(--danger)" icon={AlertTriangle} titulo="Sem custo Bling" valor={nfmt(k.sem_bling)} sub="vincular SKU" botao="Ver" onClick={() => refToggle('divergente', undefined)} />
        <OpCard cor={ML} icon={Trophy} titulo="Catálogo" valor={nfmt(k.catalogo)} sub="disputam buybox" botao="Filtrar" onClick={() => refToggle('catalogo', true)} />
        <OpCard cor="#cfaef5" icon={Sparkles} titulo="Saúde a subir" valor={nfmt(k.melhorar)} sub="completar dados" botao="Ver" ai onClick={() => refToggle('saude_lt', 80)} />
        <OpCard cor="var(--ok)" icon={Boxes} titulo="Preço fora da regra" valor={nfmt(k.abaixo_regra)} sub="reprecificar" botao="Filtrar" onClick={() => refToggle('divergente', true)} />
      </div>

      {/* filtros */}
      <div className="glass" style={{ padding: 13, marginBottom: 12, borderRadius: 16 }}>
        <div className="row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 230 }}>
            <Search size={15} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--faint)' }} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por título, SKU ou MLB…" style={{ width: '100%', background: 'rgba(0,0,0,.18)', border: '1px solid var(--glass-border)', borderRadius: 12, color: 'var(--text)', fontSize: 12.5, padding: '10px 12px 10px 34px' }} />
          </div>
          <Seg opcoes={[['recentes', 'Recentes'], ['saude', 'Menor saúde'], ['preco', 'Maior preço'], ['estoque', 'Menor estoque']]} val={sort} onSel={(v) => { setSort(v); setPage(1) }} />
        </div>
        <div className="row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '.45px', fontWeight: 800, color: 'var(--faint)', marginRight: 4 }}>Status</span>
          {[['todos', 'Todos', k.total], ['active', 'Ativos', k.ativos], ['paused', 'Pausados', k.pausados], ['closed', 'Fechados', k.fechados], ['under_review', 'Em revisão', k.em_revisao], ['sem_estoque', 'Sem estoque', k.sem_estoque]].map(([v, lb, n]) => (
            <Chip key={v} on={status === v} onClick={() => { setStatus(v); setPage(1) }} n={n}>{lb}</Chip>
          ))}
        </div>
        <div className="row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '.45px', fontWeight: 800, color: 'var(--faint)', marginRight: 4 }}>Refinar</span>
          <Chip on={refino.logistica === 'full'} onClick={() => refToggle('logistica', 'full')} n={k.full}>FULL</Chip>
          <Chip on={refino.logistica === 'flex'} onClick={() => refToggle('logistica', 'flex')} n={k.flex}>FLEX</Chip>
          <Chip on={!!refino.catalogo} onClick={() => refToggle('catalogo', true)} n={k.catalogo}>Catálogo</Chip>
          <Chip on={refino.saude_lt === 80} onClick={() => refToggle('saude_lt', 80)}>Saúde &lt; 80%</Chip>
          <Chip on={!!refino.divergente} onClick={() => refToggle('divergente', true)} n={(k.preco_divergente || 0) + (k.estoque_divergente || 0)}>≠ Bling</Chip>
          <Chip on={!!refino.promo} onClick={() => refToggle('promo', true)} n={k.em_promocao}>Em promoção</Chip>
          <div style={{ flex: 1 }} />
          <span className="num" style={{ fontSize: 9.5, color: 'var(--faint)' }}>{nfmt(total)} itens</span>
        </div>
      </div>

      <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 486px', alignItems: 'start', gap: 16 }}>
        <div>
          {sel.size > 0 && (
            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, background: 'linear-gradient(90deg,rgba(214,0,127,.16),rgba(214,0,127,.06))', border: '1px solid rgba(214,0,127,.4)', borderRadius: 14, padding: '9px 13px', marginBottom: 10 }}>
              <span style={{ width: 20, height: 20, borderRadius: 6, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 9 }}><Check size={12} color="#fff" /></span>
              <b style={{ fontSize: 11.5, color: '#ffd1ea' }}>{sel.size} selecionados</b>
              <div style={{ flex: 1 }} />
              <MiniBtn icon={BarChart3} onClick={() => notify('Reprecificação em lote entra com o endpoint de edição.', 'info')}>Reprecificar</MiniBtn>
              <MiniBtn icon={PauseCircle} onClick={() => notify('Pausa em lote entra com o endpoint de edição.', 'info')}>Pausar</MiniBtn>
              <MiniBtn icon={FileText} onClick={() => notify('Envio fiscal em lote na aba Fiscal.', 'info')}>Enviar fiscal</MiniBtn>
              <MiniBtn icon={Sparkles} ai onClick={() => notify('Otimização com IA entra com o endpoint de IA.', 'info')}>Otimizar IA</MiniBtn>
              <MiniBtn icon={X} onClick={() => setSel(new Set())}>Limpar</MiniBtn>
            </div>
          )}

          {carregando ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass" style={{ display: 'flex', alignItems: 'center', padding: 11, borderRadius: 16, marginBottom: 9 }}>
              <Skel h={48} w={48} r={11} style={{ marginRight: 12 }} />
              <div style={{ flex: 1 }}><Skel h={11} w="58%" style={{ marginBottom: 6 }} /><Skel h={8} w="34%" style={{ marginBottom: 6 }} /><Skel h={14} w="52%" /></div>
            </div>
          )) : itens.length === 0 ? (
            <Empty texto={dados?.cache_vazio ? 'Cache do Mercado Livre ainda vazio. Rode a sincronização para carregar seus anúncios.' : 'Nenhum produto com esses filtros. Ajuste os filtros acima.'} />
          ) : itens.map((p) => (
            <ProdutoRow key={p.item_id} p={p} sel={sel.has(p.item_id)} onSel={() => toggleSel(p.item_id)} onOpen={() => setAberto(p)} ativo={aberto?.item_id === p.item_id} />
          ))}

          {paginas > 1 && (
            <div className="row" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3, marginTop: 12 }}>
              <MiniBtn onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</MiniBtn>
              <span className="num" style={{ fontSize: 11, color: 'var(--dim)', margin: '0 8px' }}>página {page} de {paginas}</span>
              <MiniBtn onClick={() => setPage((p) => Math.min(paginas, p + 1))}>›</MiniBtn>
            </div>
          )}
        </div>

        {/* cockpit */}
        {aberto ? <Cockpit p={aberto} onClose={() => setAberto(null)} notify={notify} />
          : <div className="glass" style={{ padding: 22, borderRadius: 18, textAlign: 'center', position: 'sticky', top: 76 }}>
            <Boxes size={26} style={{ color: 'var(--faint)', margin: '0 auto 8px' }} />
            <div style={{ fontSize: 12, color: 'var(--dim)' }}>Selecione um produto para abrir o cockpit — editar, precificar, variações, atacado e fiscal.</div>
          </div>}
      </div>
    </>
  )
}

function Chip({ on, onClick, n, children }) {
  return (
    <span onClick={onClick} style={{ fontSize: 10, fontWeight: 700, padding: '5px 10px', borderRadius: 99, border: `1px solid ${on ? 'rgba(214,0,127,.45)' : 'var(--glass-border)'}`, color: on ? '#ffd1ea' : 'var(--dim)', cursor: 'pointer', background: on ? 'rgba(214,0,127,.17)' : 'rgba(255,255,255,.04)', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {children}{n != null && n > 0 && <span style={{ fontSize: 8.5, fontWeight: 800, background: 'rgba(255,255,255,.12)', borderRadius: 99, padding: '0 5px' }}>{nfmt(n)}</span>}
    </span>
  )
}
function Seg({ opcoes, val, onSel }) {
  return (
    <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,.3)', border: '1px solid var(--glass-border)', borderRadius: 11, padding: 3 }}>
      {opcoes.map(([v, lb]) => <b key={v} onClick={() => onSel(v)} style={{ fontSize: 10, fontWeight: 800, padding: '5px 10px', borderRadius: 8, color: val === v ? '#d9c2f7' : 'var(--dim)', cursor: 'pointer', background: val === v ? 'rgba(160,107,232,.28)' : 'transparent' }}>{lb}</b>)}
    </div>
  )
}
function MiniBtn({ icon: Icon, onClick, ai, children }) {
  return <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, padding: '5.5px 10px', borderRadius: 9, cursor: 'pointer', margin: 2, color: ai ? '#e9dbfb' : 'var(--dim)', border: `1px solid ${ai ? 'rgba(160,107,232,.45)' : 'var(--glass-border)'}`, background: ai ? 'linear-gradient(135deg,rgba(160,107,232,.24),rgba(214,0,127,.18))' : 'var(--glass-bg)' }}>{Icon && <Icon size={11} />}{children}</button>
}
function OpCard({ cor, icon: Icon, titulo, valor, sub, botao, ai, onClick }) {
  return (
    <div className="glass lift" style={{ padding: 12, borderRadius: 14, borderLeft: `3px solid ${cor}` }}>
      <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><Icon size={13} style={{ color: cor }} /><b style={{ fontSize: 10.5 }}>{titulo}</b></div>
      <b className="num" style={{ fontSize: 18, color: cor, fontFamily: 'Fraunces, Georgia, serif' }}>{valor}</b>
      <div style={{ fontSize: 9, color: 'var(--faint)' }}>{sub}</div>
      <button onClick={onClick} style={{ marginTop: 7, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, padding: '5px 0', borderRadius: 9, cursor: 'pointer', color: ai ? '#e9dbfb' : cor, border: `1px solid ${ai ? 'rgba(160,107,232,.4)' : cor + '55'}`, background: ai ? 'linear-gradient(135deg,rgba(160,107,232,.2),rgba(214,0,127,.14))' : `${cor}1c` }}>{ai && <Sparkles size={11} />}{botao}</button>
    </div>
  )
}
function ProdutoRow({ p, sel, onSel, onOpen, ativo }) {
  const st = STATUS_INFO[p.status] || STATUS_INFO.inactive
  return (
    <div className="glass lift" style={{ display: 'flex', alignItems: 'center', padding: '11px 12px', borderRadius: 16, marginBottom: 9, border: ativo ? '1px solid rgba(214,0,127,.42)' : '1px solid var(--glass-border)', background: ativo ? 'rgba(214,0,127,.08)' : 'var(--glass-bg)' }}>
      <span onClick={onSel} style={{ width: 18, height: 18, borderRadius: 5, border: `1px solid ${sel ? 'var(--accent)' : 'var(--glass-border)'}`, background: sel ? 'var(--accent)' : 'transparent', marginRight: 10, flex: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{sel && <Check size={11} color="#fff" />}</span>
      <div onClick={onOpen} style={{ width: 46, height: 46, borderRadius: 10, flex: 'none', background: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)', marginRight: 12, overflow: 'hidden', cursor: 'pointer' }}>
        {p.imagem ? <img src={p.imagem} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={19} style={{ color: 'var(--faint)' }} />}
      </div>
      <div onClick={onOpen} style={{ minWidth: 0, flex: 1, cursor: 'pointer' }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.titulo || p.item_id}</div>
        <div className="num" style={{ fontSize: 9.5, color: 'var(--faint)', margin: '2px 0' }}>{p.sku || 's/ SKU'} · {p.item_id} · <b style={{ color: 'var(--ok)' }}>{brl(p.preco)}</b> · {p.estoque ?? '—'} un</div>
        <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          <Badge c={st.c} bg={st.bg}>{st.t}</Badge>
          {p.logistica === 'full' && <Badge c={ML} bg="rgba(242,194,0,.16)">FULL</Badge>}
          {p.logistica === 'flex' && <Badge c={BLUE} bg="rgba(91,141,239,.14)">FLEX</Badge>}
          {p.catalogo && <Badge c="#cfaef5" bg="rgba(160,107,232,.14)">catálogo</Badge>}
          {p.saude != null && <Badge c={p.saude >= 80 ? 'var(--ok)' : 'var(--warn)'} bg={p.saude >= 80 ? 'rgba(47,217,141,.12)' : 'rgba(224,162,60,.14)'}>saúde {p.saude}%</Badge>}
          {!p.tem_bling && <Badge c="var(--warn)" bg="rgba(224,162,60,.14)">sem Bling</Badge>}
          {p.abaixo_regra && <Badge c="var(--danger)" bg="rgba(255,122,122,.14)">preço &lt; regra</Badge>}
          {p.estoque_divergente && <Badge c={BLUE} bg="rgba(91,141,239,.14)">estoque ≠</Badge>}
        </div>
      </div>
      <ChevronRight size={16} style={{ color: ativo ? 'var(--accent)' : 'var(--faint)', cursor: 'pointer' }} onClick={onOpen} />
    </div>
  )
}

/* ================= COCKPIT DO PRODUTO ================= */
function Cockpit({ p, onClose, notify }) {
  const st = STATUS_INFO[p.status] || STATUS_INFO.inactive
  const ratio = (p.preco && p.liquido) ? p.liquido / p.preco : null   // razão líquida efetiva
  const taxas = (p.preco != null && p.liquido != null) ? Math.max(0, p.preco - p.liquido) : null
  const folga = (p.liquido != null && p.piso != null && p.preco) ? p.preco - p.piso : null
  const [faixas, setFaixas] = useState([{ q: 1, preco: p.preco || 0 }])
  const setFaixa = (i, campo, v) => setFaixas((f) => f.map((x, idx) => idx === i ? { ...x, [campo]: Number(v) || 0 } : x))
  const addFaixa = () => setFaixas((f) => f.length >= 5 ? f : [...f, { q: (f[f.length - 1]?.q || 1) + 5, preco: Math.max(0, (p.preco || 0) - f.length) }])
  const rmFaixa = (i) => setFaixas((f) => f.filter((_, idx) => idx !== i))
  const liqFaixa = (preco) => ratio != null ? Math.round(preco * ratio * 100) / 100 : null

  return (
    <div style={{ position: 'sticky', top: 76, borderRadius: 18, border: '1px solid transparent', background: 'linear-gradient(180deg,var(--surface),#150b12) padding-box, linear-gradient(155deg,rgba(214,0,127,.65),rgba(214,0,127,.05) 42%,rgba(255,255,255,.10)) border-box', boxShadow: '0 22px 64px rgba(0,0,0,.5)' }}>
      <div className="row" style={{ display: 'flex', alignItems: 'center', padding: '13px 14px', borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, marginRight: 11, background: 'rgba(214,0,127,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', overflow: 'hidden' }}>{p.imagem ? <img src={p.imagem} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={18} style={{ color: 'var(--accent)' }} />}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'Fraunces, Georgia, serif' }}>{p.titulo || p.item_id}</div>
          <div className="num" style={{ fontSize: 10, color: 'var(--faint)' }}>{p.item_id} · <span style={{ color: st.c }}>{st.t}</span>{p.permalink && <> · <a href={p.permalink} target="_blank" rel="noreferrer" style={{ color: BLUE, textDecoration: 'none' }}>ver no ML ↗</a></>}</div>
        </div>
        <X size={17} style={{ color: 'var(--faint)', cursor: 'pointer' }} onClick={onClose} />
      </div>

      <div className="row" style={{ display: 'flex', gap: 16, padding: '9px 14px 0', borderBottom: '1px solid var(--glass-border)' }}>
        {['Editar', 'Precificação', 'Atacado PxQ', 'Variações', 'Fiscal', 'Histórico'].map((s, i) => (
          <span key={s} style={{ fontSize: 11, fontWeight: i === 0 ? 800 : 700, color: i === 0 ? 'var(--accent)' : 'var(--faint)', borderBottom: i === 0 ? '2px solid var(--accent)' : 'none', paddingBottom: 8 }}>{s}</span>
        ))}
      </div>

      <div style={{ padding: 14, maxHeight: '76vh', overflowY: 'auto' }}>
        {/* mini kpis reais */}
        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
          <MiniKpi lbl="Preço ML" v={brl(p.preco)} cor="var(--ok)" />
          <MiniKpi lbl="Líquido" v={brl(p.liquido)} cor="var(--text)" />
          <MiniKpi lbl="Estoque" v={p.estoque ?? '—'} cor="var(--text)" />
          <MiniKpi lbl="Piso" v={brl(p.piso)} cor={folga != null && folga < 0 ? 'var(--danger)' : 'var(--dim)'} />
        </div>

        {/* copiloto IA (diff representativo) */}
        <div style={{ background: 'linear-gradient(135deg,rgba(160,107,232,.15),rgba(214,0,127,.10))', border: '1px solid rgba(160,107,232,.32)', borderRadius: 13, padding: 11, marginBottom: 12 }}>
          <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}><Sparkles size={14} style={{ color: '#cfaef5' }} /><b style={{ fontSize: 11.5, color: '#e9dbfb' }}>Copiloto IA</b></div>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <MiniBtn icon={Wand2} ai onClick={() => notify('Reescrita de título entra com o endpoint de IA.', 'info')}>Reescrever título</MiniBtn>
            <MiniBtn icon={FileText} ai onClick={() => notify('Geração de descrição entra com o endpoint de IA.', 'info')}>Gerar descrição</MiniBtn>
            <MiniBtn icon={Tag} ai onClick={() => notify('Preenchimento de atributos com IA em breve.', 'info')}>Completar atributos</MiniBtn>
          </div>
        </div>

        {/* cascata real */}
        <div className="glass" style={{ padding: 11, marginBottom: 12, borderRadius: 12 }}>
          <div className="row" style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}><b style={{ fontSize: 10.5 }}>Cascata da regra (Bling → ML)</b><div style={{ flex: 1 }} />{folga != null && <Badge c={folga >= 0 ? 'var(--ok)' : 'var(--danger)'} bg={folga >= 0 ? 'rgba(47,217,141,.14)' : 'rgba(255,122,122,.14)'}>{folga >= 0 ? 'DENTRO DA REGRA' : 'ABAIXO DO PISO'}</Badge>}</div>
          <CascLinha lbl="Preço no ML" v={p.preco} cor="var(--ok)" />
          {taxas != null && <CascLinha lbl="− Taxas do ML" v={-taxas} cor="var(--danger)" />}
          <CascLinha lbl="= Você recebe" v={p.liquido} cor={BLUE} forte />
          <CascLinha lbl="Piso (líquido-alvo)" v={p.piso} cor="var(--faint)" />
          <div className="note" style={{ fontSize: 9.5, color: 'var(--faint)', display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 7 }}><Shield size={11} style={{ marginTop: 1, flex: 'none' }} />{folga != null ? (folga >= 0 ? `Folga de ${brl(folga)} acima do piso.` : `Faltam ${brl(-folga)} para o piso — reprecificar.`) : 'Sem Preço Bling vinculado — cadastre o SKU no Bling para calcular o piso.'}</div>
        </div>

        {/* ATACADO PxQ editável */}
        <div className="glass" style={{ padding: 11, marginBottom: 12, borderRadius: 12, border: '1px solid rgba(160,107,232,.32)' }}>
          <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
            <Boxes size={13} style={{ color: '#cfaef5' }} /><b style={{ fontSize: 10.5 }}>Atacado · preço por quantidade</b>
            <Badge c="var(--ok)" bg="rgba(47,217,141,.14)" style={{ marginLeft: 5 }}>SUAS FAIXAS</Badge>
            <div style={{ flex: 1 }} />
            <MiniBtn icon={Sparkles} ai onClick={() => notify('Sugestão de faixas por IA em breve.', 'info')}>Sugerir</MiniBtn>
          </div>
          <div className="note" style={{ fontSize: 9.5, color: 'var(--faint)', display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 9 }}><Info size={11} style={{ marginTop: 1, flex: 'none' }} /><b style={{ color: 'var(--text)', marginRight: 3 }}>Você define</b> quantidade e preço de cada faixa. A validação do piso é ao vivo (estimada pela razão líquida atual).</div>
          {faixas.map((f, i) => {
            const liq = liqFaixa(f.preco)
            const furou = (liq != null && p.preco_bling != null && liq < p.preco_bling - 0.01)
            return (
              <div key={i} className="row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <input className="num" type="number" value={f.q} onChange={(e) => setFaixa(i, 'q', e.target.value)} style={{ width: 54, padding: '5px 7px', fontSize: 11, textAlign: 'center', background: 'rgba(0,0,0,.18)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text)' }} />
                <span style={{ fontSize: 8.5, color: 'var(--faint)' }}>un</span>
                <span style={{ fontSize: 9, color: 'var(--faint)' }}>R$</span>
                <input className="num" type="number" value={f.preco} onChange={(e) => setFaixa(i, 'preco', e.target.value)} style={{ width: 74, padding: '5px 7px', fontSize: 11, background: 'rgba(0,0,0,.18)', border: `1px solid ${furou ? 'rgba(255,122,122,.55)' : 'var(--glass-border)'}`, borderRadius: 8, color: furou ? 'var(--danger)' : 'var(--text)' }} />
                <div style={{ flex: 1, fontSize: 9.5, color: 'var(--faint)' }} className="num">líq. {brl(liq)}</div>
                <span style={{ fontSize: 9.5, color: furou ? 'var(--danger)' : 'var(--ok)', width: 40, textAlign: 'right' }}>{p.preco_bling == null ? '—' : furou ? '✗ fura' : '✓'}</span>
                {faixas.length > 1 && <X size={13} style={{ color: 'var(--faint)', cursor: 'pointer' }} onClick={() => rmFaixa(i)} />}
              </div>
            )
          })}
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 9 }}>
            <MiniBtn icon={Plus} onClick={addFaixa}>Adicionar faixa</MiniBtn>
            <span style={{ fontSize: 9, color: 'var(--faint)' }}>até 5 faixas · qualquer quantidade acima do piso</span>
            <div style={{ flex: 1 }} />
            <MiniBtn icon={Check} onClick={() => notify('Aplicar faixas PxQ entra com o endpoint de preços do ML.', 'info')}>Aplicar no ML</MiniBtn>
          </div>
        </div>

        <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, padding: '7px 12px', borderRadius: 9, color: '#fff', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,var(--accent),#a00061)' }} onClick={() => notify('Salvar & sincronizar entra com o endpoint de edição de item.', 'info')}><Check size={12} />Salvar &amp; sincronizar</button>
          <MiniBtn icon={PauseCircle} onClick={() => notify('Pausar entra com o endpoint de status.', 'info')}>Pausar</MiniBtn>
          <MiniBtn icon={Copy} onClick={() => notify('Duplicar em breve.', 'info')}>Duplicar</MiniBtn>
        </div>
      </div>
    </div>
  )
}
function MiniKpi({ lbl, v, cor }) {
  return <div className="glass" style={{ padding: '8px 10px', borderRadius: 10 }}><div style={{ fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '.4px', fontWeight: 800, color: 'var(--faint)' }}>{lbl}</div><b className="num" style={{ fontSize: 14, color: cor }}>{v}</b></div>
}
function CascLinha({ lbl, v, cor, forte }) {
  return (
    <div className="row" style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
      <span style={{ width: 130, fontSize: 10, color: 'var(--dim)', flex: 'none' }}>{lbl}</span>
      <div style={{ flex: 1, height: 16, borderRadius: 6, background: 'rgba(255,255,255,.05)', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 6, width: forte ? '72%' : '90%', background: v < 0 ? 'rgba(255,122,122,.6)' : `linear-gradient(90deg, ${cor}66, ${cor})` }} />
      </div>
      <span className="num" style={{ width: 72, textAlign: 'right', fontSize: 10, fontWeight: 800, color: cor }}>{brl(v)}</span>
    </div>
  )
}

/* ================= ⌘K PALETTE ================= */
function CmdPalette({ onClose, onGo }) {
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(6,4,9,.72)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      <div style={{ width: 560, maxWidth: '92vw', marginTop: 80, borderRadius: 18, overflow: 'hidden', border: '1px solid transparent', background: 'linear-gradient(180deg,var(--surface),#150b12) padding-box, linear-gradient(155deg,rgba(214,0,127,.6),rgba(255,255,255,.08)) border-box', boxShadow: '0 30px 80px rgba(0,0,0,.6)' }}>
        <div className="row" style={{ display: 'flex', alignItems: 'center', padding: '13px 15px', borderBottom: '1px solid var(--glass-border)' }}>
          <Sparkles size={16} style={{ color: 'var(--accent)', marginRight: 10 }} />
          <input autoFocus placeholder="Buscar produto, SKU ou digitar um comando…" style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, color: 'var(--text)', outline: 'none' }} />
          <span onClick={onClose} style={{ fontSize: 9, fontWeight: 700, border: '1px solid var(--glass-border)', borderRadius: 6, padding: '1px 6px', color: 'var(--dim)', cursor: 'pointer' }}>esc</span>
        </div>
        <div style={{ padding: '10px 8px', maxHeight: '60vh', overflowY: 'auto' }}>
          <div style={{ fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '.45px', fontWeight: 800, color: 'var(--faint)', padding: '6px 10px 4px' }}>Ações rápidas</div>
          <CmdItem icon={Plus} cor="var(--accent)" bg="rgba(214,0,127,.16)" label="Criar novo produto" sub="a partir do Bling" onClick={() => onGo('criar')} />
          <CmdItem icon={Sparkles} cor="#cfaef5" bg="rgba(160,107,232,.16)" label="Corrigir anúncios com IA" onClick={() => onGo('atencao')} />
          <div style={{ fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '.45px', fontWeight: 800, color: 'var(--faint)', padding: '10px 10px 4px' }}>Ir para</div>
          <CmdItem icon={FileText} cor="var(--warn)" bg="rgba(224,162,60,.14)" label="Fiscais pendentes" onClick={() => onGo('fiscal')} />
          <CmdItem icon={RefreshCw} cor={BLUE} bg="rgba(91,141,239,.14)" label="Divergências Bling × ML" onClick={() => onGo('sync')} />
        </div>
      </div>
    </div>
  )
}
function CmdItem({ icon: Icon, cor, bg, label, sub, onClick }) {
  return (
    <div onClick={onClick} className="lift" style={{ display: 'flex', alignItems: 'center', padding: '9px 11px', borderRadius: 10, cursor: 'pointer' }}>
      <div style={{ width: 22, height: 22, borderRadius: 8, background: bg, color: cor, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 9 }}><Icon size={12} /></div>
      <div style={{ flex: 1, fontSize: 12 }}>{label} {sub && <span style={{ color: 'var(--faint)' }}>{sub}</span>}</div>
    </div>
  )
}

/* ================= SAÚDE & ATENÇÃO ================= */
function SaudeAtencao({ k, notify }) {
  const [ags, setAgs] = useState(null)
  const [carregando, setCarregando] = useState(true)
  useEffect(() => { api.mlAgentesSugestoes(80).then(setAgs).catch(() => setAgs(null)).finally(() => setCarregando(false)) }, [])
  const sugs = ags?.sugestoes || []
  const impacto = ags?.resumo_impacto || {}
  const corAgente = { parado: 'var(--danger)', margem: 'var(--warn)', giro: BLUE, curva: PURPLE, estoque: 'var(--ok)', buybox: ML }
  return (
    <>
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 12 }}>
        <Kpi icon={AlertTriangle} label="Sinalizados" value={nfmt(sugs.length || ((k.melhorar || 0) + (k.abaixo_regra || 0)))} cor="var(--danger)" sub="pelos 6 agentes" />
        <Kpi icon={Sparkles} label="IA corrige" value={nfmt(k.melhorar)} cor="#cfaef5" sub="atributos/fotos" />
        <Kpi icon={BarChart3} label="Reprecificar" value={nfmt(k.abaixo_regra)} cor={BLUE} sub="regra Bling" />
        <Kpi icon={PauseCircle} label="Sem estoque" value={nfmt(k.sem_estoque)} cor="var(--warn)" sub="repor ou pausar" />
        <Kpi icon={TrendingUp} label="Oportunidades" value={nfmt(impacto.oportunidades || sugs.length)} cor="var(--ok)" sub="capital " />
      </div>
      {carregando ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="glass" style={{ padding: 14, borderRadius: 16, marginBottom: 9 }}><Skel h={40} /></div>)
        : sugs.length === 0 ? <Empty icon={Check} texto="Nenhum produto pedindo atenção agora — os agentes não encontraram itens fora da regra ou com saúde baixa." />
          : sugs.slice(0, 20).map((s, i) => {
            const cor = corAgente[s.agente] || 'var(--faint)'
            return (
              <div key={s.item_id || i} className="glass lift" style={{ display: 'flex', alignItems: 'center', padding: '11px 12px', borderRadius: 16, marginBottom: 9, borderLeft: `3px solid ${cor}` }}>
                <div style={{ width: 46, height: 46, borderRadius: 10, flex: 'none', background: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)', marginRight: 12, overflow: 'hidden' }}>{s.imagem ? <img src={s.imagem} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={18} style={{ color: 'var(--faint)' }} />}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.titulo || s.item_id}</div>
                  <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 3 }}>
                    <Badge c={cor} bg={`${cor}22`}>{(s.agente || '').toUpperCase()}</Badge>
                    <span className="num" style={{ fontSize: 9, color: 'var(--faint)' }}>{s.motivo || ''}{s.deal_price_sugerido != null && <> · sugerido {brl(s.deal_price_sugerido)}</>}</span>
                  </div>
                </div>
                <MiniBtn icon={s.deal_price_sugerido != null ? Zap : Sparkles} ai={s.deal_price_sugerido == null} onClick={() => notify('Ação individual entra com o endpoint de aplicação (já existe em Promoções/Agentes).', 'info')}>{s.deal_price_sugerido != null ? 'Aplicar' : 'Corrigir'}</MiniBtn>
              </div>
            )
          })}
    </>
  )
}

/* ================= FISCAL ================= */
function Fiscal({ k, notify }) {
  return (
    <>
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        <Kpi icon={Check} label="Total no catálogo" value={nfmt(k.total)} cor="var(--ok)" sub="base para NF-e" />
        <Kpi icon={FileText} label="Com custo Bling" value={nfmt((k.total || 0) - (k.sem_bling || 0))} cor={BLUE} sub="dados fiscais herdados" />
        <Kpi icon={AlertTriangle} label="Sem vínculo Bling" value={nfmt(k.sem_bling)} cor="var(--warn)" sub="fiscal a completar" />
        <Kpi icon={Sparkles} label="IA pode preencher" value={nfmt(k.sem_bling)} cor="#cfaef5" sub="cruzando o Bling" />
      </div>
      <div style={{ background: 'linear-gradient(135deg,rgba(160,107,232,.15),rgba(214,0,127,.10))', border: '1px solid rgba(160,107,232,.32)', borderRadius: 13, padding: '11px 14px', marginBottom: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <FileText size={15} style={{ color: '#cfaef5' }} />
        <span style={{ flex: 1, minWidth: 200, fontSize: 11, color: 'var(--dim)' }}>A leitura fiscal completa (NCM, CEST, origem, <b style={{ color: 'var(--text)' }}>can_invoice</b>) entra com o endpoint fiscal do ML — próximo da fila. Aqui já dá para ver quem tem base do Bling.</span>
        <MiniBtn icon={Sparkles} ai onClick={() => notify('Mutirão fiscal com IA entra com o endpoint fiscal.', 'info')}>Preencher com IA</MiniBtn>
      </div>
      <Empty icon={FileText} texto="A lista fiscal detalhada (pendências de NCM/origem por item) aparece quando ligarmos GET /can_invoice e o cadastro fiscal. A base já está pronta neste painel." />
    </>
  )
}

/* ================= SINCRONIZAÇÃO ================= */
function Sincronizacao({ k, notify }) {
  const emDia = Math.max(0, (k.total || 0) - (k.preco_divergente || 0) - (k.estoque_divergente || 0) - (k.sem_bling || 0))
  return (
    <>
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        <Kpi icon={Check} label="Em dia (Bling=ML)" value={nfmt(emDia)} cor="var(--ok)" sub={`${k.total ? Math.round((emDia / k.total) * 100) : 0}% sincronizado`} />
        <Kpi icon={BarChart3} label="Preço ≠ regra" value={nfmt(k.preco_divergente)} cor={BLUE} sub="líquido abaixo do alvo" />
        <Kpi icon={Boxes} label="Estoque ≠" value={nfmt(k.estoque_divergente)} cor="var(--warn)" sub="Bling ≠ ML" />
        <Kpi icon={AlertTriangle} label="Só no Bling" value={nfmt(k.sem_bling)} cor="#cfaef5" sub="sem vínculo/anúncio" />
      </div>
      <div className="glass" style={{ padding: 18, marginBottom: 12, borderRadius: 16 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}><RefreshCw size={13} />Fluxo · Bling é o hub de escrita</div>
        <div className="row" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <div className="glass" style={{ padding: '13px 17px', textAlign: 'center', border: '1px solid rgba(47,217,141,.32)' }}><b style={{ color: 'var(--ok)', fontSize: 13 }}>Bling ERP</b><div style={{ fontSize: 9, color: 'var(--faint)' }}>preço · custo · estoque · NCM</div></div>
          <ArrowRight size={18} style={{ color: 'var(--faint)' }} />
          <div style={{ padding: '13px 17px', textAlign: 'center', borderRadius: 14, border: '1px solid rgba(160,107,232,.4)', background: 'rgba(160,107,232,.06)' }}><b style={{ fontSize: 13, color: '#e9dbfb' }}>Precifica AI</b><div style={{ fontSize: 9, color: 'var(--faint)' }}>regra · IA · agentes · diff</div></div>
          <ArrowRight size={18} style={{ color: 'var(--faint)' }} />
          <div className="glass" style={{ padding: '13px 17px', textAlign: 'center', border: '1px solid rgba(242,194,0,.32)' }}><b style={{ color: ML, fontSize: 13 }}>Mercado Livre</b><div style={{ fontSize: 9, color: 'var(--faint)' }}>publica · edita · webhooks</div></div>
        </div>
      </div>
      <Empty icon={RefreshCw} texto="A tabela linha-a-linha de divergências (Bling → ML com ação por item) entra na sequência, reusando este mesmo cálculo de piso/estoque do painel." />
    </>
  )
}

/* ================= CRIAR / PUBLICAR ================= */
function CriarPublicar({ notify }) {
  return (
    <>
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 12 }}>
        <Kpi icon={Wand2} label="Rascunhos" value="—" cor="var(--warn)" sub="via Bling" />
        <Kpi icon={Rocket} label="Publicados 7d" value="—" cor="var(--ok)" sub="assistidos por IA" />
        <Kpi icon={Clock} label="Tempo médio" value="—" cor="#cfaef5" sub="com IA" />
        <Kpi icon={Sparkles} label="Score médio IA" value="—" cor="var(--ok)" sub="título+atributos" />
        <Kpi icon={AlertTriangle} label="Rejeitados ML" value="—" cor="var(--danger)" sub="validação prévia" />
      </div>
      <div style={{ background: 'linear-gradient(135deg,rgba(160,107,232,.15),rgba(214,0,127,.10))', border: '1px solid rgba(160,107,232,.32)', borderRadius: 13, padding: '11px 14px', marginBottom: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Sparkles size={15} style={{ color: '#cfaef5' }} />
        <span style={{ flex: 1, minWidth: 200, fontSize: 11, color: 'var(--dim)' }}>O fluxo de criação assistida (origem Bling → título/categoria por IA → atributos → atacado PxQ → fiscal → publicar com validação) entra com os endpoints de criação/publicação do ML — próximo da fila.</span>
        <MiniBtn icon={Plus} onClick={() => notify('Publicação entra com POST /items + validação.', 'info')}>Novo produto</MiniBtn>
      </div>
      <Empty icon={Rocket} texto="O assistente de publicação em 6 passos com prévia ao vivo já está desenhado — será ligado aos endpoints de criação do ML mantendo a regra de piso e o PxQ editável." />
    </>
  )
}
