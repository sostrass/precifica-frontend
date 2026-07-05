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
  const notify = useToast()
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
  const [refreshTick, setRefreshTick] = useState(0)
  const pageSize = 40

  const query = useMemo(() => ({
    status, sort, page, page_size: pageSize, busca: buscaLive,
    logistica: refino.logistica || '', catalogo: !!refino.catalogo,
    saude_lt: refino.saude_lt || 0, divergente: !!refino.divergente, promo: !!refino.promo,
  }), [status, sort, page, buscaLive, refino])

  useEffect(() => {
    setCarregando(true)
    api.mlProdutosPainel(query).then(setDados).catch(() => setDados(null)).finally(() => setCarregando(false))
  }, [query, refreshTick])
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
              <MiniBtn icon={BarChart3} onClick={() => notify('Reprecificação em lote entra com o endpoint de edição.', 'warn')}>Reprecificar</MiniBtn>
              <MiniBtn icon={PauseCircle} onClick={() => notify('Pausa em lote entra com o endpoint de edição.', 'warn')}>Pausar</MiniBtn>
              <MiniBtn icon={FileText} onClick={() => notify('Envio fiscal em lote na aba Fiscal.', 'warn')}>Enviar fiscal</MiniBtn>
              <MiniBtn icon={Sparkles} ai onClick={() => notify('Otimização com IA entra com o endpoint de IA.', 'warn')}>Otimizar IA</MiniBtn>
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
        {aberto ? <Cockpit p={aberto} onClose={() => setAberto(null)} notify={notify} onSaved={(prod) => { setAberto((a) => ({ ...a, ...prod })); setRefreshTick((t) => t + 1) }} />
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
function Cockpit({ p, onClose, notify, onSaved }) {
  const [det, setDet] = useState(p)
  const [titulo, setTitulo] = useState(p.titulo || '')
  const [preco, setPreco] = useState(p.preco || 0)
  const [estoque, setEstoque] = useState(p.estoque ?? 0)
  const [status, setStatus] = useState(p.status || 'active')
  const [permitir, setPermitir] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [subtab, setSubtab] = useState('editar')
  const [iaTitulos, setIaTitulos] = useState(null)
  const [iaTituloLoad, setIaTituloLoad] = useState(false)
  const [iaDesc, setIaDesc] = useState(null)
  const [iaDescLoad, setIaDescLoad] = useState(false)
  const [iaDescSaving, setIaDescSaving] = useState(false)

  useEffect(() => {
    api.mlProdutoUm(p.item_id).then((d) => {
      setDet(d); setTitulo(d.titulo || ''); setPreco(d.preco || 0)
      setEstoque(d.estoque ?? 0); setStatus(d.status || 'active')
    }).catch(() => {})
  }, [p.item_id])

  const st = STATUS_INFO[status] || STATUS_INFO.inactive
  const precoBling = det.preco_bling
  const piso = det.piso
  const precoRegra = det.preco_regra
  const ratio = (det.preco && det.liquido) ? det.liquido / det.preco : null   // razão líquida efetiva
  const liqAt = ratio != null ? Math.round(preco * ratio * 100) / 100 : det.liquido
  const taxas = (preco != null && liqAt != null) ? Math.max(0, preco - liqAt) : null
  const folga = (piso != null && preco) ? preco - piso : null
  const furaPiso = (piso != null && preco < piso - 0.01)
  const dirty = titulo !== (det.titulo || '') || Number(preco) !== (det.preco || 0) || Number(estoque) !== (det.estoque ?? 0) || status !== (det.status || 'active')

  const salvar = async (over) => {
    const body = {}
    if (titulo !== (det.titulo || '') && titulo.trim()) body.titulo = titulo.trim()
    if (Number(preco) !== (det.preco || 0)) body.preco = Number(preco)
    if (Number(estoque) !== (det.estoque ?? 0)) body.estoque = Number(estoque)
    if (status !== (det.status || 'active')) body.status = status
    if (over || permitir) body.permitir_abaixo_piso = true
    if (Object.keys(body).length === 0) { notify('Nada mudou para salvar.', 'warn'); return }
    setSalvando(true)
    try {
      const r = await api.mlProdutoEditar(p.item_id, body)
      setDet(r.produto); onSaved?.(r.produto)
      notify('Anúncio atualizado e sincronizado com o ML.', 'ok')
    } catch (e) {
      const d = e?.data?.detail || e?.detail
      if (d && typeof d === 'object' && d.erro === 'abaixo_do_piso') {
        notify(`${d.mensagem} Mínimo seguro R$ ${Number(d.minimo_seguro).toFixed(2)}. Marque "permitir abaixo do piso" para forçar.`, 'danger')
      } else {
        notify(typeof d === 'string' ? d : 'Não foi possível salvar. Tente novamente.', 'danger')
      }
    } finally { setSalvando(false) }
  }
  const alternarStatus = () => { const novo = status === 'active' ? 'paused' : 'active'; setStatus(novo) }

  const gerarTitulos = async () => {
    setIaTituloLoad(true); setIaTitulos(null)
    try { const r = await api.mlProdutoIaTitulo({ item_id: p.item_id, titulo }); setIaTitulos(r.sugestoes || []) }
    catch (e) { notify(e?.data?.detail || 'A IA não respondeu. Tente de novo.', 'danger') }
    finally { setIaTituloLoad(false) }
  }
  const aplicarTitulo = (t) => { setTitulo(t); setIaTitulos(null); notify('Título aplicado — salve para sincronizar com o ML.', 'ok') }
  const gerarDescricao = async () => {
    setIaDescLoad(true)
    try { const r = await api.mlProdutoIaDescricao({ item_id: p.item_id, titulo }); setIaDesc(r.texto || '') }
    catch (e) { notify(e?.data?.detail || 'A IA não respondeu. Tente de novo.', 'danger') }
    finally { setIaDescLoad(false) }
  }
  const salvarDescricao = async () => {
    if (!iaDesc || !iaDesc.trim()) return
    setIaDescSaving(true)
    try { await api.mlSetDescricao(p.item_id, iaDesc.trim()); notify('Descrição salva no anúncio.', 'ok') }
    catch (e) { notify(e?.data?.detail || 'Não foi possível salvar a descrição.', 'danger') }
    finally { setIaDescSaving(false) }
  }

  const SUBTABS = [['editar', 'Editar'], ['preco', 'Precificação'], ['atacado', 'Atacado PxQ'], ['fiscal', 'Fiscal'], ['hist', 'Histórico']]

  return (
    <div style={{ position: 'sticky', top: 76, borderRadius: 18, border: '1px solid transparent', background: 'linear-gradient(180deg,var(--surface),#150b12) padding-box, linear-gradient(155deg,rgba(214,0,127,.65),rgba(214,0,127,.05) 42%,rgba(255,255,255,.10)) border-box', boxShadow: '0 22px 64px rgba(0,0,0,.5)' }}>
      <div className="row" style={{ display: 'flex', alignItems: 'center', padding: '13px 14px', borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, marginRight: 11, background: 'rgba(214,0,127,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', overflow: 'hidden' }}>{det.imagem ? <img src={det.imagem} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={18} style={{ color: 'var(--accent)' }} />}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'Fraunces, Georgia, serif' }}>{det.titulo || det.item_id}</div>
          <div className="num" style={{ fontSize: 10, color: 'var(--faint)' }}>{det.item_id} · <span style={{ color: st.c }}>{st.t}</span>{det.permalink && <> · <a href={det.permalink} target="_blank" rel="noreferrer" style={{ color: BLUE, textDecoration: 'none' }}>ver no ML ↗</a></>}</div>
        </div>
        <X size={17} style={{ color: 'var(--faint)', cursor: 'pointer' }} onClick={onClose} />
      </div>

      <div className="row" style={{ display: 'flex', gap: 16, padding: '9px 14px 0', borderBottom: '1px solid var(--glass-border)', flexWrap: 'wrap' }}>
        {SUBTABS.map(([k, lb]) => (
          <span key={k} onClick={() => setSubtab(k)} style={{ fontSize: 11, fontWeight: subtab === k ? 800 : 700, color: subtab === k ? 'var(--accent)' : 'var(--faint)', borderBottom: subtab === k ? '2px solid var(--accent)' : '2px solid transparent', paddingBottom: 8, cursor: 'pointer' }}>{lb}</span>
        ))}
      </div>

      <div style={{ padding: 14, maxHeight: '74vh', overflowY: 'auto' }}>
        {/* mini kpis reais (refletem edição ao vivo) */}
        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
          <MiniKpi lbl="Preço ML" v={brl(preco)} cor="var(--ok)" />
          <MiniKpi lbl="Você recebe" v={brl(liqAt)} cor={BLUE} />
          <MiniKpi lbl="Estoque" v={estoque} cor="var(--text)" />
          <MiniKpi lbl="Piso" v={brl(piso)} cor={furaPiso ? 'var(--danger)' : 'var(--dim)'} />
        </div>

        {subtab === 'editar' && (
          <>
            {/* título editável + copiloto */}
            <div className="glass" style={{ padding: 11, marginBottom: 12, borderRadius: 12 }}>
              <div className="row" style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                <b style={{ fontSize: 10.5 }}>Título</b><div style={{ flex: 1 }} />
                <span className="num" style={{ fontSize: 9, color: titulo.length > 60 ? 'var(--danger)' : 'var(--faint)' }}>{titulo.length}/60</span>
                <span style={{ marginLeft: 8 }}>
                  <button onClick={gerarTitulos} disabled={iaTituloLoad} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, padding: '5.5px 10px', borderRadius: 9, cursor: iaTituloLoad ? 'default' : 'pointer', color: '#e9dbfb', border: '1px solid rgba(160,107,232,.45)', background: 'linear-gradient(135deg,rgba(160,107,232,.24),rgba(214,0,127,.18))', opacity: iaTituloLoad ? .6 : 1 }}>
                    {iaTituloLoad ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}Reescrever com IA
                  </button>
                </span>
              </div>
              <input value={titulo} maxLength={70} onChange={(e) => setTitulo(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,.18)', border: '1px solid var(--glass-border)', borderRadius: 10, color: 'var(--text)', fontSize: 12.5, padding: '9px 11px' }} />
              {det.catalogo && <div className="note" style={{ fontSize: 9, color: 'var(--faint)', marginTop: 6, display: 'flex', gap: 5 }}><Info size={10} />Anúncio de catálogo: o ML pode recusar mudança de título.</div>}
              {(iaTituloLoad || iaTitulos) && (
                <div style={{ marginTop: 10, padding: 10, borderRadius: 11, background: 'linear-gradient(135deg,rgba(160,107,232,.13),rgba(214,0,127,.08))', border: '1px solid rgba(160,107,232,.3)' }}>
                  <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><Sparkles size={12} style={{ color: '#cfaef5' }} /><b style={{ fontSize: 10, color: '#e9dbfb' }}>Copiloto sugere</b><div style={{ flex: 1 }} />{iaTitulos && <X size={13} style={{ color: 'var(--faint)', cursor: 'pointer' }} onClick={() => setIaTitulos(null)} />}</div>
                  {iaTituloLoad ? <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', color: 'var(--faint)', fontSize: 11 }}><Loader2 size={14} className="animate-spin" />gerando 3 variações otimizadas…</div>
                    : (iaTitulos || []).map((t, i) => (
                      <div key={i} onClick={() => aplicarTitulo(t)} className="lift" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9, cursor: 'pointer', marginBottom: 5, background: 'rgba(0,0,0,.18)', border: '1px solid var(--glass-border)' }}>
                        <div style={{ flex: 1, fontSize: 11.5, color: 'var(--text)' }}>{t}</div>
                        <span className="num" style={{ fontSize: 8.5, color: t.length > 60 ? 'var(--danger)' : 'var(--faint)' }}>{t.length}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#cfaef5', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={11} />usar</span>
                      </div>
                    ))}
                  {iaTitulos && <div className="note" style={{ fontSize: 8.5, color: 'var(--faint)', display: 'flex', gap: 5, marginTop: 3 }}><Info size={10} style={{ flex: 'none', marginTop: 1 }} />Clique para aplicar no campo. Nada é enviado ao ML até você salvar.</div>}
                </div>
              )}
            </div>

            {/* preço + trava de piso ao vivo */}
            <div className="glass" style={{ padding: 11, marginBottom: 12, borderRadius: 12, border: furaPiso && !permitir ? '1px solid rgba(255,122,122,.5)' : '1px solid var(--glass-border)' }}>
              <div className="row" style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <b style={{ fontSize: 10.5 }}>Preço no Mercado Livre</b><div style={{ flex: 1 }} />
                {folga != null && <Badge c={furaPiso ? 'var(--danger)' : 'var(--ok)'} bg={furaPiso ? 'rgba(255,122,122,.14)' : 'rgba(47,217,141,.14)'}>{furaPiso ? 'ABAIXO DO PISO' : 'DENTRO DA REGRA'}</Badge>}
              </div>
              <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--faint)' }}>R$</span>
                <input type="number" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} style={{ width: 120, background: 'rgba(0,0,0,.18)', border: `1px solid ${furaPiso && !permitir ? 'rgba(255,122,122,.5)' : 'var(--glass-border)'}`, borderRadius: 10, color: furaPiso ? 'var(--danger)' : 'var(--ok)', fontSize: 18, fontWeight: 800, padding: '8px 11px' }} className="num" />
                {precoRegra != null && Math.abs(Number(preco) - precoRegra) > 0.01 && (
                  <span onClick={() => setPreco(precoRegra)} style={{ fontSize: 10, fontWeight: 700, padding: '5px 9px', borderRadius: 8, cursor: 'pointer', color: '#cfaef5', border: '1px solid rgba(160,107,232,.4)', background: 'rgba(160,107,232,.14)' }}>usar preço da regra · {brl(precoRegra)}</span>
                )}
              </div>
              {/* cascata ao vivo */}
              <CascLinha lbl="Preço no ML" v={Number(preco)} cor="var(--ok)" />
              {taxas != null && <CascLinha lbl="− Taxas do ML" v={-taxas} cor="var(--danger)" />}
              <CascLinha lbl="= Você recebe" v={liqAt} cor={BLUE} forte />
              <CascLinha lbl="Piso (líquido-alvo)" v={piso} cor="var(--faint)" />
              {precoBling == null ? (
                <div className="note" style={{ fontSize: 9.5, color: 'var(--warn)', display: 'flex', gap: 6, marginTop: 7 }}><Info size={11} style={{ flex: 'none', marginTop: 1 }} />Sem Preço Bling vinculado — cadastre o SKU no Bling para travar o piso.</div>
              ) : furaPiso ? (
                <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9, padding: '8px 10px', borderRadius: 9, background: 'rgba(255,122,122,.08)', border: '1px solid rgba(255,122,122,.28)' }}>
                  <AlertTriangle size={13} style={{ color: 'var(--danger)', flex: 'none' }} />
                  <span style={{ fontSize: 10, color: 'var(--danger)', flex: 1 }}>Fura o piso. Mínimo seguro <b>{brl(piso)}</b>.</span>
                  <span className="row" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 9.5, color: 'var(--dim)' }}>permitir</span><Toggle on={permitir} onClick={() => setPermitir((v) => !v)} /></span>
                </div>
              ) : folga != null && (
                <div className="note" style={{ fontSize: 9.5, color: 'var(--faint)', display: 'flex', gap: 6, marginTop: 7 }}><Shield size={11} style={{ flex: 'none', marginTop: 1 }} />Folga de {brl(folga)} acima do piso.</div>
              )}
            </div>

            {/* estoque + status */}
            <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div className="glass" style={{ padding: 11, borderRadius: 12 }}>
                <b style={{ fontSize: 10.5 }}>Estoque</b>
                <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <span onClick={() => setEstoque((q) => Math.max(0, Number(q) - 1))} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--dim)', flex: 'none' }}>−</span>
                  <input type="number" value={estoque} onChange={(e) => setEstoque(e.target.value)} className="num" style={{ flex: 1, textAlign: 'center', background: 'rgba(0,0,0,.18)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text)', fontSize: 15, fontWeight: 800, padding: '5px' }} />
                  <span onClick={() => setEstoque((q) => Number(q) + 1)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--dim)', flex: 'none' }}>+</span>
                </div>
                {det.estoque_bling != null && det.estoque_bling !== Number(estoque) && <div className="note" style={{ fontSize: 9, color: BLUE, marginTop: 6 }}>Bling: {det.estoque_bling} un</div>}
              </div>
              <div className="glass" style={{ padding: 11, borderRadius: 12 }}>
                <b style={{ fontSize: 10.5 }}>Situação</b>
                <div style={{ display: 'inline-flex', width: '100%', background: 'rgba(0,0,0,.3)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: 3, marginTop: 8 }}>
                  {[['active', 'Ativo', 'var(--ok)'], ['paused', 'Pausado', 'var(--warn)']].map(([v, lb, c]) => (
                    <b key={v} onClick={() => setStatus(v)} style={{ flex: 1, textAlign: 'center', fontSize: 10.5, fontWeight: 800, padding: '6px 0', borderRadius: 8, cursor: 'pointer', color: status === v ? '#0d0d0d' : 'var(--dim)', background: status === v ? c : 'transparent' }}>{lb}</b>
                  ))}
                </div>
              </div>
            </div>

            {/* descrição por IA */}
            <div className="glass" style={{ padding: 11, marginBottom: 12, borderRadius: 12, border: '1px solid rgba(160,107,232,.28)' }}>
              <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <FileText size={13} style={{ color: '#cfaef5' }} /><b style={{ fontSize: 10.5 }}>Descrição</b>
                <Badge c="#cfaef5" bg="rgba(160,107,232,.14)" style={{ marginLeft: 4 }}>texto puro</Badge>
                <div style={{ flex: 1 }} />
                <button onClick={gerarDescricao} disabled={iaDescLoad} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, padding: '5.5px 10px', borderRadius: 9, cursor: iaDescLoad ? 'default' : 'pointer', color: '#e9dbfb', border: '1px solid rgba(160,107,232,.45)', background: 'linear-gradient(135deg,rgba(160,107,232,.24),rgba(214,0,127,.18))', opacity: iaDescLoad ? .6 : 1 }}>
                  {iaDescLoad ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}{iaDesc ? 'Gerar outra' : 'Gerar com IA'}
                </button>
              </div>
              {iaDescLoad && !iaDesc ? <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0', color: 'var(--faint)', fontSize: 11 }}><Loader2 size={14} className="animate-spin" />escrevendo uma descrição vendedora…</div>
                : iaDesc != null ? (
                  <>
                    <textarea value={iaDesc} onChange={(e) => setIaDesc(e.target.value)} rows={7} style={{ width: '100%', background: 'rgba(0,0,0,.18)', border: '1px solid var(--glass-border)', borderRadius: 10, color: 'var(--text)', fontSize: 11.5, padding: '9px 11px', resize: 'vertical', lineHeight: 1.5 }} />
                    <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                      <button onClick={salvarDescricao} disabled={iaDescSaving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700, padding: '7px 12px', borderRadius: 9, color: '#fff', border: 'none', cursor: iaDescSaving ? 'default' : 'pointer', background: 'linear-gradient(135deg,var(--accent),#a00061)', opacity: iaDescSaving ? .6 : 1 }}>{iaDescSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}Salvar no anúncio</button>
                      <MiniBtn icon={Copy} onClick={() => { navigator.clipboard?.writeText(iaDesc); notify('Descrição copiada.', 'ok') }}>Copiar</MiniBtn>
                      <div style={{ flex: 1 }} /><span className="num" style={{ fontSize: 9, color: 'var(--faint)' }}>{iaDesc.length} car.</span>
                    </div>
                  </>
                ) : <div className="note" style={{ fontSize: 10, color: 'var(--faint)', display: 'flex', gap: 6 }}><Info size={11} style={{ flex: 'none', marginTop: 1 }} />O ML não aceita HTML desde 2021 — a IA já gera em texto puro, pronto para colar. Salvar envia direto para o anúncio.</div>}
            </div>
          </>
        )}

        {subtab === 'preco' && (
          <div className="glass" style={{ padding: 11, marginBottom: 12, borderRadius: 12 }}>
            <b style={{ fontSize: 10.5 }}>Cascata da regra (Bling → ML)</b>
            <div style={{ marginTop: 8 }}>
              <CascLinha lbl="Preço no ML" v={Number(preco)} cor="var(--ok)" />
              {taxas != null && <CascLinha lbl="− Taxas do ML" v={-taxas} cor="var(--danger)" />}
              <CascLinha lbl="= Você recebe" v={liqAt} cor={BLUE} forte />
              <CascLinha lbl="Preço Bling (alvo)" v={precoBling} cor="#cfaef5" />
              <CascLinha lbl="Piso" v={piso} cor="var(--faint)" />
            </div>
            {precoRegra != null && <div className="note" style={{ fontSize: 9.5, color: 'var(--faint)', display: 'flex', gap: 6, marginTop: 8 }}><Info size={11} style={{ flex: 'none', marginTop: 1 }} />Preço ideal pela regra: <b style={{ color: 'var(--text)', margin: '0 3px' }}>{brl(precoRegra)}</b> (preserva o líquido-alvo do Bling).</div>}
          </div>
        )}

        {subtab === 'atacado' && <AtacadoPxQ p={det} preco={Number(preco)} ratio={ratio} precoBling={precoBling} notify={notify} />}

        {subtab === 'fiscal' && <Empty icon={FileText} texto="A ficha fiscal do anúncio (NCM, origem, can_invoice) entra com o endpoint fiscal do ML — mantendo o vínculo com o Bling." />}
        {subtab === 'hist' && <Empty icon={Clock} texto="O histórico do anúncio (preço, status e moderações ao longo do tempo) entra quando ligarmos o log de eventos e webhooks." />}

        {/* barra de ação fixa */}
        <div className="row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 6, paddingTop: 12, borderTop: '1px solid var(--glass-border)' }}>
          <button disabled={salvando || (!dirty)} onClick={() => salvar(false)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, padding: '8px 14px', borderRadius: 10, color: '#fff', border: 'none', cursor: dirty && !salvando ? 'pointer' : 'default', opacity: dirty && !salvando ? 1 : .5, background: 'linear-gradient(135deg,var(--accent),#a00061)' }}>
            {salvando ? <Loader2 size={13} className="spin" /> : <Check size={13} />}{salvando ? 'Salvando…' : 'Salvar & sincronizar'}
          </button>
          <MiniBtn icon={PauseCircle} onClick={alternarStatus}>{status === 'active' ? 'Pausar' : 'Ativar'}</MiniBtn>
          {dirty && <span style={{ fontSize: 9.5, color: 'var(--warn)', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warn)' }} />alterações não salvas</span>}
        </div>
      </div>
    </div>
  )
}

/* Atacado PxQ — faixas livres com validação de piso ao vivo */
function AtacadoPxQ({ p, preco, ratio, precoBling, notify }) {
  const [faixas, setFaixas] = useState([{ q: 1, preco: preco || p.preco || 0 }])
  const setFaixa = (i, campo, v) => setFaixas((f) => f.map((x, idx) => idx === i ? { ...x, [campo]: Number(v) || 0 } : x))
  const addFaixa = () => setFaixas((f) => f.length >= 5 ? f : [...f, { q: (f[f.length - 1]?.q || 1) + 5, preco: Math.max(0, (preco || 0) - f.length) }])
  const rmFaixa = (i) => setFaixas((f) => f.filter((_, idx) => idx !== i))
  const liqFaixa = (pr) => ratio != null ? Math.round(pr * ratio * 100) / 100 : null
  return (
    <div className="glass" style={{ padding: 11, marginBottom: 12, borderRadius: 12, border: '1px solid rgba(160,107,232,.32)' }}>
      <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
        <Boxes size={13} style={{ color: '#cfaef5' }} /><b style={{ fontSize: 10.5 }}>Atacado · preço por quantidade</b>
        <Badge c="var(--ok)" bg="rgba(47,217,141,.14)" style={{ marginLeft: 5 }}>SUAS FAIXAS</Badge>
        <div style={{ flex: 1 }} />
        <MiniBtn icon={Sparkles} ai onClick={() => notify('Sugestão de faixas por IA em breve.', 'warn')}>Sugerir</MiniBtn>
      </div>
      <div className="note" style={{ fontSize: 9.5, color: 'var(--faint)', display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 9 }}><Info size={11} style={{ marginTop: 1, flex: 'none' }} /><b style={{ color: 'var(--text)', marginRight: 3 }}>Você define</b> quantidade e preço de cada faixa — validação de piso ao vivo.</div>
      {faixas.map((f, i) => {
        const liq = liqFaixa(f.preco)
        const furou = (liq != null && precoBling != null && liq < precoBling - 0.01)
        return (
          <div key={i} className="row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <input className="num" type="number" value={f.q} onChange={(e) => setFaixa(i, 'q', e.target.value)} style={{ width: 54, padding: '5px 7px', fontSize: 11, textAlign: 'center', background: 'rgba(0,0,0,.18)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text)' }} />
            <span style={{ fontSize: 8.5, color: 'var(--faint)' }}>un</span>
            <span style={{ fontSize: 9, color: 'var(--faint)' }}>R$</span>
            <input className="num" type="number" value={f.preco} onChange={(e) => setFaixa(i, 'preco', e.target.value)} style={{ width: 74, padding: '5px 7px', fontSize: 11, background: 'rgba(0,0,0,.18)', border: `1px solid ${furou ? 'rgba(255,122,122,.55)' : 'var(--glass-border)'}`, borderRadius: 8, color: furou ? 'var(--danger)' : 'var(--text)' }} />
            <div style={{ flex: 1, fontSize: 9.5, color: 'var(--faint)' }} className="num">líq. {brl(liq)}</div>
            <span style={{ fontSize: 9.5, color: furou ? 'var(--danger)' : 'var(--ok)', width: 40, textAlign: 'right' }}>{precoBling == null ? '—' : furou ? '✗ fura' : '✓'}</span>
            {faixas.length > 1 && <X size={13} style={{ color: 'var(--faint)', cursor: 'pointer' }} onClick={() => rmFaixa(i)} />}
          </div>
        )
      })}
      <div className="row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 9 }}>
        <MiniBtn icon={Plus} onClick={addFaixa}>Adicionar faixa</MiniBtn>
        <span style={{ fontSize: 9, color: 'var(--faint)' }}>até 5 faixas · acima do piso</span>
        <div style={{ flex: 1 }} />
        <MiniBtn icon={Check} onClick={() => notify('Aplicar PxQ entra com o endpoint de preços por quantidade do ML.', 'warn')}>Aplicar no ML</MiniBtn>
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
                <MiniBtn icon={s.deal_price_sugerido != null ? Zap : Sparkles} ai={s.deal_price_sugerido == null} onClick={() => notify('Ação individual entra com o endpoint de aplicação (já existe em Promoções/Agentes).', 'warn')}>{s.deal_price_sugerido != null ? 'Aplicar' : 'Corrigir'}</MiniBtn>
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
        <MiniBtn icon={Sparkles} ai onClick={() => notify('Mutirão fiscal com IA entra com o endpoint fiscal.', 'warn')}>Preencher com IA</MiniBtn>
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

/* ================= CRIAR / PUBLICAR (assistente real) ================= */
const PASSOS = ['Origem (Bling)', 'Título & categoria', 'Atributos & fotos', 'Atacado PxQ', 'Fiscal', 'Publicar']
function CriarPublicar({ notify }) {
  const [passo, setPasso] = useState(0)
  // origem
  const [buscaBling, setBuscaBling] = useState('')
  const [buscaLive, setBuscaLive] = useState('')
  const [soNovos, setSoNovos] = useState(true)
  const [bling, setBling] = useState(null)
  const [carregandoBling, setCarregandoBling] = useState(false)
  const [prod, setProd] = useState(null)   // produto Bling escolhido
  // ficha
  const [titulo, setTitulo] = useState('')
  const [preco, setPreco] = useState(0)
  const [estoque, setEstoque] = useState(0)
  const [tipo, setTipo] = useState('gold_special')
  const [cats, setCats] = useState(null)
  const [catSel, setCatSel] = useState(null)
  const [prevendo, setPrevendo] = useState(false)
  const [iaTit, setIaTit] = useState(null)
  const [iaTitLoad, setIaTitLoad] = useState(false)
  // atributos & fotos
  const [attrs, setAttrs] = useState(null)
  const [attrVals, setAttrVals] = useState({})
  const [attrsLoad, setAttrsLoad] = useState(false)
  const [iaAttrLoad, setIaAttrLoad] = useState(false)
  const [fotos, setFotos] = useState([])
  const [novaFoto, setNovaFoto] = useState('')
  // publicar
  const [validacao, setValidacao] = useState(null)
  const [validando, setValidando] = useState(false)
  const [permitir, setPermitir] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [publicado, setPublicado] = useState(null)

  useEffect(() => { const t = setTimeout(() => setBuscaLive(buscaBling), 350); return () => clearTimeout(t) }, [buscaBling])
  useEffect(() => {
    if (passo !== 0) return
    setCarregandoBling(true)
    api.mlPublicarBling({ busca: buscaLive, somente_novos: soNovos, page: 1, page_size: 40 })
      .then(setBling).catch(() => setBling(null)).finally(() => setCarregandoBling(false))
  }, [buscaLive, soNovos, passo])

  const escolher = (p) => {
    setProd(p); setTitulo(p.nome || ''); setPreco(p.preco_regra || p.preco_bling || 0)
    setEstoque(p.saldo || 0); setFotos(p.imagem ? [p.imagem] : [])
    setCats(null); setCatSel(null); setAttrs(null); setAttrVals({}); setValidacao(null); setPublicado(null)
    setPasso(1)
  }
  const prever = async () => {
    if (!titulo.trim()) { notify('Escreva o título primeiro.', 'warn'); return }
    setPrevendo(true)
    try { const r = await api.mlCategoriaPrever(titulo); setCats(r.sugestoes || []); if ((r.sugestoes || [])[0]) setCatSel(r.sugestoes[0]) }
    catch (e) { notify(e?.data?.detail || 'Não consegui prever a categoria.', 'danger') }
    finally { setPrevendo(false) }
  }
  const gerarTitulo = async () => {
    setIaTitLoad(true); setIaTit(null)
    try { const r = await api.mlProdutoIaTitulo({ titulo }); setIaTit(r.sugestoes || []) }
    catch (e) { notify(e?.data?.detail || 'IA indisponível.', 'danger') } finally { setIaTitLoad(false) }
  }
  const carregarAttrs = async (cat) => {
    setAttrsLoad(true); setAttrs(null)
    try { const r = await api.mlCategoriaAtributos(cat.category_id); setAttrs(r.atributos || []) }
    catch (e) { notify(e?.data?.detail || 'Não consegui carregar os atributos.', 'danger') }
    finally { setAttrsLoad(false) }
  }
  const preencherIaAttrs = async () => {
    if (!catSel) return
    setIaAttrLoad(true)
    try {
      const r = await api.mlCategoriaAtributosIa(catSel.category_id, { titulo })
      const nv = { ...attrVals }
      ;(r.sugestoes || []).forEach((s) => { nv[s.id] = { value_name: s.value_name, value_id: s.value_id } })
      setAttrVals(nv)
      notify(`IA preencheu ${(r.sugestoes || []).length} atributo(s) — revise antes de publicar.`, 'ok')
    } catch (e) { notify(e?.data?.detail || 'IA indisponível.', 'danger') } finally { setIaAttrLoad(false) }
  }
  const irAtributos = async () => { if (!catSel) { notify('Escolha a categoria.', 'warn'); return } if (!attrs) await carregarAttrs(catSel); setPasso(2) }

  const montarAtributos = () => Object.entries(attrVals).filter(([, v]) => v && (v.value_name || v.value_id)).map(([id, v]) => ({ id, value_name: v.value_name, value_id: v.value_id }))
  const corpoBase = () => ({ titulo, category_id: catSel?.category_id, preco: Number(preco), quantidade: Number(estoque), listing_type_id: tipo, condicao: 'new', pictures: fotos, atributos: montarAtributos(), sku: prod?.sku, descricao: undefined })
  const validar = async () => {
    setValidando(true); setValidacao(null)
    try { const r = await api.mlProdutoValidar(corpoBase()); setValidacao(r) }
    catch (e) { notify(e?.data?.detail || 'Falha ao validar.', 'danger') } finally { setValidando(false) }
  }
  const publicar = async () => {
    setPublicando(true)
    try {
      const r = await api.mlProdutoPublicar({ ...corpoBase(), permitir_abaixo_piso: permitir })
      setPublicado(r); notify('Anúncio publicado no Mercado Livre!', 'ok')
    } catch (e) {
      const d = e?.data?.detail || e?.detail
      if (d && typeof d === 'object' && d.erro === 'abaixo_do_piso') notify(`${d.mensagem} Mínimo seguro R$ ${Number(d.minimo_seguro).toFixed(2)}.`, 'danger')
      else notify(typeof d === 'string' ? d : 'Não foi possível publicar. Rode a validação para ver o motivo.', 'danger')
    } finally { setPublicando(false) }
  }

  const podeAvancar = passo === 0 ? !!prod : passo === 1 ? (!!titulo.trim() && !!catSel) : true

  return (
    <>
      {/* KPIs do funil */}
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        <Kpi icon={Boxes} label="Novos do Bling" value={bling ? nfmt(bling.novos) : '—'} cor="var(--ok)" sub="sem anúncio no ML" />
        <Kpi icon={Package} label="No catálogo Bling" value={bling ? nfmt(bling.total) : '—'} cor={BLUE} sub="base para publicar" />
        <Kpi icon={Sparkles} label="Passo atual" value={`${passo + 1}/6`} cor="#cfaef5" sub={PASSOS[passo]} />
        <Kpi icon={Rocket} label="Publicado agora" value={publicado ? '1' : '—'} cor="var(--ok)" sub={publicado ? 'nesta sessão' : 'aguardando'} />
      </div>

      {/* stepper */}
      <div className="glass" style={{ padding: 14, borderRadius: 16, marginBottom: 12 }}>
        <div className="row" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          {PASSOS.map((nm, i) => (
            <div key={i} onClick={() => i < passo && setPasso(i)} className="row" style={{ display: 'flex', alignItems: 'center', flex: i < PASSOS.length - 1 ? 1 : 'none', minWidth: 0, cursor: i < passo ? 'pointer' : 'default' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: i <= passo ? '#fff' : 'var(--faint)', background: i < passo ? 'var(--ok)' : i === passo ? 'var(--accent)' : 'rgba(255,255,255,.08)' }}>{i < passo ? <Check size={13} /> : i + 1}</div>
              <span style={{ fontSize: 9.5, fontWeight: i === passo ? 800 : 600, color: i === passo ? 'var(--accent)' : i < passo ? 'var(--ok)' : 'var(--faint)', margin: '0 8px', whiteSpace: 'nowrap' }}>{nm}</span>
              {i < PASSOS.length - 1 && <div style={{ flex: 1, height: 2, background: i < passo ? 'var(--ok)' : 'rgba(255,255,255,.1)', minWidth: 12 }} />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid" style={{ display: 'grid', gridTemplateColumns: passo >= 1 ? '1fr 340px' : '1fr', alignItems: 'start', gap: 16 }}>
        <div>
          {/* PASSO 0 — ORIGEM BLING */}
          {passo === 0 && (
            <div className="glass" style={{ padding: 14, borderRadius: 16 }}>
              <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                  <Search size={15} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--faint)' }} />
                  <input value={buscaBling} onChange={(e) => setBuscaBling(e.target.value)} placeholder="Buscar produto do Bling por nome ou SKU…" style={{ width: '100%', background: 'rgba(0,0,0,.18)', border: '1px solid var(--glass-border)', borderRadius: 12, color: 'var(--text)', fontSize: 12.5, padding: '10px 12px 10px 34px' }} />
                </div>
                <Chip on={soNovos} onClick={() => setSoNovos((v) => !v)}>só novos (sem anúncio)</Chip>
              </div>
              {carregandoBling ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="glass" style={{ padding: 10, borderRadius: 12, marginBottom: 8 }}><Skel h={40} /></div>)
                : !bling || bling.itens.length === 0 ? <Empty texto="Nenhum produto do Bling encontrado. Ajuste a busca ou sincronize o catálogo do Bling." />
                  : bling.itens.map((p) => (
                    <div key={p.produto_id} onClick={() => escolher(p)} className="glass lift" style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderRadius: 14, marginBottom: 8, cursor: 'pointer' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, flex: 'none', background: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)', marginRight: 12, overflow: 'hidden' }}>{p.imagem ? <img src={p.imagem} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={18} style={{ color: 'var(--faint)' }} />}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
                        <div className="num" style={{ fontSize: 9.5, color: 'var(--faint)', marginTop: 2 }}>{p.sku || 's/ SKU'} · {p.saldo} un · preço regra <b style={{ color: 'var(--ok)' }}>{brl(p.preco_regra)}</b></div>
                      </div>
                      {p.ja_no_ml ? <Badge c="var(--warn)" bg="rgba(224,162,60,.14)">já no ML</Badge> : <Badge c="var(--ok)" bg="rgba(47,217,141,.14)">novo</Badge>}
                      <ChevronRight size={16} style={{ color: 'var(--faint)', marginLeft: 8 }} />
                    </div>
                  ))}
            </div>
          )}

          {/* PASSO 1 — TÍTULO & CATEGORIA */}
          {passo === 1 && (
            <div className="glass" style={{ padding: 14, borderRadius: 16 }}>
              <div className="row" style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                <b style={{ fontSize: 11 }}>Título</b><div style={{ flex: 1 }} />
                <span className="num" style={{ fontSize: 9, color: titulo.length > 60 ? 'var(--danger)' : 'var(--faint)' }}>{titulo.length}/60</span>
                <span style={{ marginLeft: 8 }}><button onClick={gerarTitulo} disabled={iaTitLoad} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, padding: '5.5px 10px', borderRadius: 9, cursor: 'pointer', color: '#e9dbfb', border: '1px solid rgba(160,107,232,.45)', background: 'linear-gradient(135deg,rgba(160,107,232,.24),rgba(214,0,127,.18))', opacity: iaTitLoad ? .6 : 1 }}>{iaTitLoad ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}IA</button></span>
              </div>
              <input value={titulo} maxLength={70} onChange={(e) => setTitulo(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,.18)', border: '1px solid var(--glass-border)', borderRadius: 10, color: 'var(--text)', fontSize: 12.5, padding: '9px 11px' }} />
              {iaTit && <div style={{ marginTop: 8, padding: 9, borderRadius: 10, background: 'rgba(160,107,232,.1)', border: '1px solid rgba(160,107,232,.28)' }}>{iaTit.map((t, i) => <div key={i} onClick={() => { setTitulo(t); setIaTit(null) }} className="lift" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, background: 'rgba(0,0,0,.18)' }}><div style={{ flex: 1, fontSize: 11.5 }}>{t}</div><span style={{ fontSize: 9, color: '#cfaef5', fontWeight: 700 }}>usar</span></div>)}</div>}

              <div className="row" style={{ display: 'flex', alignItems: 'center', marginTop: 14, marginBottom: 8 }}>
                <b style={{ fontSize: 11 }}>Categoria</b><div style={{ flex: 1 }} />
                <button onClick={prever} disabled={prevendo} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, padding: '5.5px 10px', borderRadius: 9, cursor: 'pointer', color: 'var(--accent)', border: '1px solid rgba(214,0,127,.4)', background: 'rgba(214,0,127,.12)', opacity: prevendo ? .6 : 1 }}>{prevendo ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}Prever pela IA do ML</button>
              </div>
              {prevendo ? <div className="row" style={{ display: 'flex', gap: 8, color: 'var(--faint)', fontSize: 11, padding: '8px 0' }}><Loader2 size={14} className="animate-spin" />consultando o preditor de categorias…</div>
                : cats == null ? <div className="note" style={{ fontSize: 10, color: 'var(--faint)', display: 'flex', gap: 6 }}><Info size={11} style={{ flex: 'none', marginTop: 1 }} />Clique em "Prever" — o Mercado Livre sugere as categorias mais prováveis pelo título.</div>
                  : cats.length === 0 ? <div className="note" style={{ fontSize: 10, color: 'var(--warn)' }}>Nenhuma categoria sugerida. Refine o título.</div>
                    : cats.map((c) => (
                      <div key={c.category_id} onClick={() => setCatSel(c)} className="lift" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', borderRadius: 10, cursor: 'pointer', marginBottom: 5, background: catSel?.category_id === c.category_id ? 'rgba(214,0,127,.12)' : 'rgba(0,0,0,.18)', border: `1px solid ${catSel?.category_id === c.category_id ? 'rgba(214,0,127,.4)' : 'var(--glass-border)'}` }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', border: `1px solid ${catSel?.category_id === c.category_id ? 'var(--accent)' : 'var(--faint)'}`, background: catSel?.category_id === c.category_id ? 'var(--accent)' : 'transparent', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{catSel?.category_id === c.category_id && <Check size={10} color="#fff" />}</div>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{c.category_name || c.category_id}</div><div className="num" style={{ fontSize: 8.5, color: 'var(--faint)' }}>{c.category_id}{c.domain_name ? ` · ${c.domain_name}` : ''}</div></div>
                      </div>
                    ))}

              <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                <div style={{ flex: 1 }}><b style={{ fontSize: 10.5 }}>Tipo de anúncio</b>
                  <div style={{ display: 'inline-flex', width: '100%', background: 'rgba(0,0,0,.3)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: 3, marginTop: 6 }}>
                    {[['gold_special', 'Clássico'], ['gold_pro', 'Premium']].map(([v, lb]) => <b key={v} onClick={() => setTipo(v)} style={{ flex: 1, textAlign: 'center', fontSize: 10.5, fontWeight: 800, padding: '6px 0', borderRadius: 8, cursor: 'pointer', color: tipo === v ? '#0d0d0d' : 'var(--dim)', background: tipo === v ? ML : 'transparent' }}>{lb}</b>)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASSO 2 — ATRIBUTOS & FOTOS */}
          {passo === 2 && (
            <div className="glass" style={{ padding: 14, borderRadius: 16 }}>
              <div className="row" style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                <b style={{ fontSize: 11 }}>Ficha técnica</b>
                {attrs && <Badge c="var(--warn)" bg="rgba(224,162,60,.14)" style={{ marginLeft: 8 }}>{attrs.filter((a) => a.obrigatorio).length} obrigatórios</Badge>}
                <div style={{ flex: 1 }} />
                <button onClick={preencherIaAttrs} disabled={iaAttrLoad || !attrs} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, padding: '5.5px 10px', borderRadius: 9, cursor: 'pointer', color: '#e9dbfb', border: '1px solid rgba(160,107,232,.45)', background: 'linear-gradient(135deg,rgba(160,107,232,.24),rgba(214,0,127,.18))', opacity: (iaAttrLoad || !attrs) ? .6 : 1 }}>{iaAttrLoad ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}Preencher com IA</button>
              </div>
              {attrsLoad ? <div className="row" style={{ display: 'flex', gap: 8, color: 'var(--faint)', fontSize: 11, padding: '10px 0' }}><Loader2 size={14} className="animate-spin" />carregando atributos da categoria…</div>
                : !attrs ? <Empty texto="Volte ao passo anterior e escolha a categoria para carregar a ficha." />
                  : attrs.slice(0, 16).map((a) => (
                    <div key={a.id} className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                      <div style={{ width: 130, flex: 'none', fontSize: 10.5, color: a.obrigatorio ? 'var(--text)' : 'var(--dim)' }}>{a.nome}{a.obrigatorio && <span style={{ color: 'var(--danger)' }}> *</span>}</div>
                      {a.valores && a.valores.length > 0 && a.valores.length <= 30 ? (
                        <select value={attrVals[a.id]?.value_id || ''} onChange={(e) => { const v = a.valores.find((x) => x.id === e.target.value); setAttrVals((s) => ({ ...s, [a.id]: v ? { value_id: v.id, value_name: v.nome } : undefined })) }} style={{ flex: 1, background: 'rgba(0,0,0,.18)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text)', fontSize: 11, padding: '7px 9px' }}>
                          <option value="">—</option>
                          {a.valores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
                        </select>
                      ) : (
                        <input value={attrVals[a.id]?.value_name || ''} onChange={(e) => setAttrVals((s) => ({ ...s, [a.id]: e.target.value ? { value_name: e.target.value } : undefined }))} placeholder="valor" style={{ flex: 1, background: 'rgba(0,0,0,.18)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text)', fontSize: 11, padding: '7px 9px' }} />
                      )}
                    </div>
                  ))}

              <div style={{ marginTop: 14 }}>
                <b style={{ fontSize: 11 }}>Fotos</b>
                <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {fotos.map((f, i) => (
                    <div key={i} style={{ width: 62, height: 62, borderRadius: 10, overflow: 'hidden', position: 'relative', border: '1px solid var(--glass-border)' }}>
                      <img src={f} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <span onClick={() => setFotos((x) => x.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={10} color="#fff" /></span>
                    </div>
                  ))}
                </div>
                <div className="row" style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <input value={novaFoto} onChange={(e) => setNovaFoto(e.target.value)} placeholder="Cole a URL de uma foto…" style={{ flex: 1, background: 'rgba(0,0,0,.18)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text)', fontSize: 11, padding: '7px 9px' }} />
                  <MiniBtn icon={Plus} onClick={() => { if (novaFoto.trim()) { setFotos((x) => [...x, novaFoto.trim()]); setNovaFoto('') } }}>Adicionar</MiniBtn>
                </div>
              </div>
            </div>
          )}

          {/* PASSO 3 — ATACADO PxQ */}
          {passo === 3 && <AtacadoPxQ p={{ preco: Number(preco), preco_bling: prod?.preco_bling }} preco={Number(preco)} ratio={prod?.preco_bling ? null : null} precoBling={prod?.preco_bling} notify={notify} />}

          {/* PASSO 4 — FISCAL */}
          {passo === 4 && <Empty icon={FileText} texto="A etapa fiscal (NCM, origem, CEST) entra com o endpoint fiscal do ML — herdando os dados do Bling. Por ora você pode publicar e completar o fiscal na aba Fiscal." />}

          {/* PASSO 5 — PUBLICAR */}
          {passo === 5 && (
            <div className="glass" style={{ padding: 14, borderRadius: 16 }}>
              {publicado ? (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(47,217,141,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}><Check size={26} style={{ color: 'var(--ok)' }} /></div>
                  <b style={{ fontSize: 15, fontFamily: 'Fraunces, Georgia, serif' }}>Anúncio publicado!</b>
                  <div className="num" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 4 }}>{publicado.item_id} · {publicado.status}</div>
                  <div className="row" style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                    {publicado.permalink && <a href={publicado.permalink} target="_blank" rel="noreferrer" style={{ fontSize: 11, fontWeight: 700, padding: '8px 14px', borderRadius: 10, color: '#fff', textDecoration: 'none', background: 'linear-gradient(135deg,var(--accent),#a00061)' }}>Ver no Mercado Livre ↗</a>}
                    <MiniBtn icon={Plus} onClick={() => { setProd(null); setPublicado(null); setPasso(0) }}>Publicar outro</MiniBtn>
                  </div>
                </div>
              ) : (
                <>
                  <div className="row" style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                    <b style={{ fontSize: 11 }}>Validação prévia (ML)</b><div style={{ flex: 1 }} />
                    <button onClick={validar} disabled={validando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, padding: '6px 12px', borderRadius: 9, cursor: 'pointer', color: BLUE, border: '1px solid rgba(91,141,239,.4)', background: 'rgba(91,141,239,.12)', opacity: validando ? .6 : 1 }}>{validando ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}Validar</button>
                  </div>
                  {validacao == null ? <div className="note" style={{ fontSize: 10, color: 'var(--faint)', display: 'flex', gap: 6, marginBottom: 12 }}><Info size={11} style={{ flex: 'none', marginTop: 1 }} />Rode a validação — o ML confere título, categoria, preço, fotos e atributos obrigatórios antes de publicar.</div>
                    : validacao.ok ? <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', borderRadius: 10, background: 'rgba(47,217,141,.1)', border: '1px solid rgba(47,217,141,.3)', marginBottom: 12 }}><Check size={14} style={{ color: 'var(--ok)' }} /><span style={{ fontSize: 11, color: 'var(--ok)' }}>Tudo certo — pronto para publicar.</span></div>
                      : <div style={{ marginBottom: 12 }}>{validacao.erros.map((e, i) => <div key={i} className="row" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 11px', borderRadius: 9, background: 'rgba(255,122,122,.08)', border: '1px solid rgba(255,122,122,.25)', marginBottom: 5 }}><AlertTriangle size={12} style={{ color: 'var(--danger)', flex: 'none', marginTop: 1 }} /><div style={{ fontSize: 10.5, color: 'var(--danger)' }}>{e.message}{e.code && <span className="num" style={{ color: 'var(--faint)', marginLeft: 5 }}>[{e.code}]</span>}</div></div>)}</div>}

                  <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 10, color: 'var(--dim)' }}>permitir preço abaixo do piso</span><Toggle on={permitir} onClick={() => setPermitir((v) => !v)} />
                  </div>
                  <button onClick={publicar} disabled={publicando} style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, padding: '11px 0', borderRadius: 12, color: '#fff', border: 'none', cursor: publicando ? 'default' : 'pointer', background: 'linear-gradient(135deg,var(--accent),#a00061)', boxShadow: '0 8px 22px rgba(214,0,127,.35)', opacity: publicando ? .7 : 1 }}>{publicando ? <Loader2 size={15} className="animate-spin" /> : <Rocket size={15} />}{publicando ? 'Publicando…' : 'Publicar no Mercado Livre'}</button>
                </>
              )}
            </div>
          )}

          {/* navegação */}
          {!publicado && (
            <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              {passo > 0 && <MiniBtn icon={ArrowRight} onClick={() => setPasso((s) => s - 1)}>Voltar</MiniBtn>}
              <div style={{ flex: 1 }} />
              {passo < 5 && <button onClick={() => { if (passo === 1) irAtributos(); else setPasso((s) => Math.min(5, s + 1)) }} disabled={!podeAvancar} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '9px 16px', borderRadius: 11, color: '#fff', border: 'none', cursor: podeAvancar ? 'pointer' : 'default', opacity: podeAvancar ? 1 : .5, background: 'linear-gradient(135deg,var(--accent),#a00061)' }}>Avançar<ChevronRight size={14} /></button>}
            </div>
          )}
        </div>

        {/* PRÉVIA ao vivo (a partir do passo 1) */}
        {passo >= 1 && (
          <div className="glass" style={{ padding: 14, borderRadius: 16, position: 'sticky', top: 76 }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', marginBottom: 10 }}>Prévia do anúncio</div>
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
              <div style={{ height: 150, background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{fotos[0] ? <img src={fotos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageOff size={28} style={{ color: 'var(--faint)' }} />}</div>
              <div style={{ padding: 11 }}>
                <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{titulo || 'Título do anúncio'}</div>
                <div className="num serif" style={{ fontSize: 20, fontWeight: 800, color: 'var(--ok)', marginTop: 6 }}>{brl(Number(preco))}</div>
                <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  <Badge c={ML} bg="rgba(242,194,0,.14)">{tipo === 'gold_pro' ? 'Premium' : 'Clássico'}</Badge>
                  <Badge c="var(--ok)" bg="rgba(47,217,141,.12)">{estoque} un</Badge>
                  {catSel && <Badge c="#cfaef5" bg="rgba(160,107,232,.14)">{(catSel.category_name || catSel.category_id).slice(0, 22)}</Badge>}
                </div>
              </div>
            </div>
            {/* checklist */}
            <div style={{ marginTop: 12 }}>
              {[['Título', !!titulo.trim() && titulo.length <= 60], ['Categoria', !!catSel], ['Preço', Number(preco) > 0], ['Estoque', Number(estoque) > 0], ['Foto', fotos.length > 0]].map(([lb, ok]) => (
                <div key={lb} className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10.5, padding: '3px 0', color: ok ? 'var(--text)' : 'var(--faint)' }}>
                  {ok ? <Check size={13} style={{ color: 'var(--ok)' }} /> : <div style={{ width: 13, height: 13, borderRadius: '50%', border: '1px solid var(--faint)' }} />}{lb}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
