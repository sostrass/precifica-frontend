import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Package, Boxes, Plus, RefreshCw, Search, Command, Bell, Shield, ShieldAlert, Power, Cpu, Zap, Check,
  BarChart3, Activity, Sparkles, TrendingDown, TrendingUp, Layers, Clock, AlertTriangle,
  FileText, ChevronLeft, ChevronRight, X, Loader2, SlidersHorizontal, Wand2, Tag, Gauge, Rocket,
  ImageOff, ExternalLink, Trophy, Grid3x3, PauseCircle, PlayCircle, Copy, Trash2, Send, ArrowRight, Info,
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
  const [sincronizando, setSincronizando] = useState(false)
  const [syncInfo, setSyncInfo] = useState(null)
  const [recarga, setRecarga] = useState(0)
  const [notifs, setNotifs] = useState(null)
  const [sinoVisto, setSinoVisto] = useState(false)

  const carregarPainel = useCallback(() => {
    setCarregando(true)
    api.mlProdutosPainel({ page: 1, page_size: 1 })
      .then((r) => setPainel(r))
      .catch(() => setPainel(null))
      .finally(() => setCarregando(false))
  }, [])
  useEffect(() => { carregarPainel() }, [carregarPainel])

  const carregarNotifs = useCallback(() => { api.notificacoes(30).then((l) => setNotifs(Array.isArray(l) ? l : [])).catch(() => setNotifs([])) }, [])
  useEffect(() => { carregarNotifs() }, [carregarNotifs])

  const sincronizar = useCallback(async () => {
    if (sincronizando) return
    setSincronizando(true); setSyncInfo({ status: 'rodando' })
    try {
      await api.mlSincronizar()
      let n = 0
      while (n < 240) {
        await new Promise((r) => setTimeout(r, 2500))
        let st = null
        try { st = await api.mlSyncStatus() } catch { st = null }
        if (st) setSyncInfo(st)
        if (st && (st.status === 'concluido' || st.status === 'erro')) break
        n++
      }
      const fim = await api.mlSyncStatus().catch(() => null)
      if (fim?.status === 'erro') notify(`Sincronização falhou: ${fim.erro || 'erro'}`, 'danger')
      else notify(`Catálogo sincronizado — ${nfmt(fim?.total || fim?.processados || 0)} anúncios carregados.`, 'ok')
      carregarPainel(); setRecarga((x) => x + 1)
    } catch (e) {
      notify(e?.data?.detail || 'Não foi possível iniciar a sincronização. Conecte o Mercado Livre.', 'danger')
    } finally { setSincronizando(false) }
  }, [sincronizando, carregarPainel, notify])

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
    <div style={{ maxWidth: 1600, margin: '0 auto' }}>
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
          <div className="glass lift" onClick={() => { setSino((s) => !s); setSinoVisto(true) }} style={{ position: 'relative', padding: '8px 11px', marginRight: 6, cursor: 'pointer', borderRadius: 11 }}>
            <Bell size={14} />
            {!sinoVisto && (notifs?.length || 0) > 0 && <span style={{ position: 'absolute', top: 2, right: 4, minWidth: 14, height: 14, padding: '0 3px', borderRadius: 99, background: 'var(--danger)', color: '#fff', fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{notifs.length > 9 ? '9+' : notifs.length}</span>}
            {sino && <SinoDropdown notifs={notifs} onClose={() => setSino(false)} onLidas={async () => { await api.notificacoesMarcarLidas().catch(() => {}); setSinoVisto(true); carregarNotifs() }} onRefresh={carregarNotifs} />}
          </div>
          <button className="glass lift" onClick={sincronizar} disabled={sincronizando} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, padding: '8px 13px', borderRadius: 11, color: sincronizando ? 'var(--accent)' : 'var(--dim)', marginRight: 6, cursor: sincronizando ? 'default' : 'pointer' }}>
            {sincronizando ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}{sincronizando ? (syncInfo?.total ? `Sincronizando ${nfmt(syncInfo.processados || 0)}/${nfmt(syncInfo.total)}` : 'Sincronizando…') : 'Sincronizar'}
          </button>
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, padding: '8px 14px', borderRadius: 11, color: '#fff', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,var(--accent),#a00061)', boxShadow: '0 6px 18px rgba(214,0,127,.35)' }} onClick={() => setTab('criar')}>
            <Plus size={13} />Novo produto
          </button>
        </div>
      </div>

      {/* ticker */}
      <div className="row" style={{ display: 'flex', flexWrap: 'wrap', fontSize: 10, color: 'var(--faint)', marginBottom: 10, gap: 16 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ok)' }} />sincronização em tempo real via webhooks</span>
        <span className="num"><b style={{ color: 'var(--text)' }}>{nfmt(k.total || 0)}</b> anúncios no cache</span>
        <span className="num">último sync <b style={{ color: 'var(--text)' }}>{syncInfo?.concluido_em ? tempoRel(syncInfo.concluido_em) : (painel?.cache_vazio ? 'nunca — rode a sincronização' : '—')}</b></span>
        <span className="num">preço sempre pela regra — <b style={{ color: 'var(--ok)' }}>nunca abaixo do piso</b></span>
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
      {tab === 'produtos' && <ProdutosLista notify={notify} recarga={recarga} onSync={sincronizar} sincronizando={sincronizando} />}
      {tab === 'criar' && <CriarPublicar notify={notify} />}
      {tab === 'atencao' && <SaudeAtencao k={k} notify={notify} />}
      {tab === 'fiscal' && <Fiscal notify={notify} />}
      {tab === 'sync' && <Sincronizacao k={k} notify={notify} onGoCriar={() => setTab('criar')} />}

      {cmd && <CmdPalette onClose={() => setCmd(false)} onGo={(t) => { setTab(t); setCmd(false) }} />}

      <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--faint)', marginTop: 22, paddingTop: 14, borderTop: '1px solid var(--glass-border)' }}>
        Central de Produtos · Mercado Livre + Bling · lê do cache local e aplica a regra de precificação
      </div>
    </div>
  )
}

/* ================= VISÃO GERAL ================= */
function SinoDropdown({ notifs, onClose, onLidas, onRefresh }) {
  const lista = Array.isArray(notifs) ? notifs : []
  return (
    <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 42, right: 0, width: 340, maxHeight: 440, overflow: 'hidden', borderRadius: 14, zIndex: 60, background: 'var(--surface-2, #1d1426)', border: '1px solid var(--glass-border)', boxShadow: '0 24px 60px rgba(0,0,0,.6)', display: 'flex', flexDirection: 'column' }}>
      <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 13px', borderBottom: '1px solid var(--glass-border)' }}>
        <Bell size={14} style={{ color: 'var(--accent)' }} />
        <b style={{ fontSize: 12.5 }}>Notificações</b>
        <span className="num" style={{ fontSize: 9, color: 'var(--faint)' }}>{lista.length}</span>
        <div style={{ flex: 1 }} />
        <button onClick={onRefresh} title="Atualizar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--faint)', display: 'flex' }}><RefreshCw size={13} /></button>
        <button onClick={onLidas} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dim)', fontSize: 10, fontWeight: 700 }}>marcar lidas</button>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--faint)', display: 'flex' }}><X size={14} /></button>
      </div>
      <div style={{ overflowY: 'auto', padding: '4px 0' }}>
        {lista.length === 0 ? (
          <div style={{ padding: '26px 16px', textAlign: 'center', color: 'var(--faint)', fontSize: 11 }}>Sem notificações por enquanto.</div>
        ) : lista.map((n, i) => {
          const cor = n.ok === false ? 'var(--danger)' : n.ok === true ? 'var(--ok)' : 'var(--accent)'
          return (
            <div key={n.id || i} className="row lift" style={{ display: 'flex', gap: 9, padding: '9px 13px', alignItems: 'flex-start' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: cor, flex: 'none', marginTop: 5 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.titulo || n.categoria || 'Evento'}</div>
                {n.texto && <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 1, lineHeight: 1.4 }}>{n.texto}</div>}
                <div className="num" style={{ fontSize: 8.5, color: 'var(--faint)', marginTop: 2 }}>{n.categoria ? `${n.categoria} · ` : ''}{tempoRel(n.quando)}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
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

      <Reputacao />
    </>
  )
}


/* ---- Reputação do vendedor (Mercado Líder) ---- */
const COR_TERMO = { vermelho: { pos: 8, c: '#c0392b', t: 'Vermelho' }, laranja: { pos: 30, c: '#e67e22', t: 'Laranja' }, amarelo: { pos: 50, c: '#f1c40f', t: 'Amarelo' }, 'verde-claro': { pos: 70, c: '#a8cf45', t: 'Verde-claro' }, verde: { pos: 90, c: '#2FD98D', t: 'Verde' } }
function MetricaRep({ label, valor, meta, ok, sufixo = '%', metaTexto }) {
  const cor = ok == null ? 'var(--text)' : ok ? 'var(--ok)' : 'var(--danger)'
  return (
    <div className="glass" style={{ padding: '9px 11px', borderRadius: 11 }}>
      <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '.4px', fontWeight: 800, color: 'var(--faint)' }}>{label}</div>
      <b className="num" style={{ fontSize: 16, color: cor }}>{valor == null ? '—' : `${valor}${sufixo}`}</b>
      <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, color: 'var(--faint)' }}>{ok != null && (ok ? <Check size={9} style={{ color: 'var(--ok)' }} /> : <AlertTriangle size={9} style={{ color: 'var(--danger)' }} />)}{metaTexto || (meta != null ? `meta < ${meta}${sufixo}` : '')}</div>
    </div>
  )
}
function Reputacao() {
  const [r, setR] = useState(null)
  const [carregando, setCarregando] = useState(true)
  useEffect(() => { api.mlReputacaoPainel().then(setR).catch(() => setR({ conectado: false })).finally(() => setCarregando(false)) }, [])

  if (carregando) return <div className="glass" style={{ padding: 16, borderRadius: 16, marginTop: 12 }}><Skel h={70} /></div>
  if (!r?.conectado) return (
    <div className="glass" style={{ padding: 16, borderRadius: 16, marginTop: 12 }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><Trophy size={13} />Reputação da conta no Mercado Livre</div>
      <div className="note" style={{ fontSize: 10.5, color: 'var(--faint)', display: 'flex', gap: 6 }}><Info size={11} style={{ flex: 'none', marginTop: 1 }} />Conecte o Mercado Livre para ver a reputação (nível, reclamações, envios no prazo e cancelamentos).</div>
    </div>
  )
  if (r.sem_dados) return (
    <div className="glass" style={{ padding: 16, borderRadius: 16, marginTop: 12 }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><Trophy size={13} />Reputação da conta</div>
      <div className="note" style={{ fontSize: 10.5, color: 'var(--faint)', display: 'flex', gap: 6 }}><Info size={11} style={{ flex: 'none', marginTop: 1 }} />Ainda sem histórico de reputação suficiente nesta conta.</div>
    </div>
  )
  const termo = COR_TERMO[r.cor] || { pos: 50, c: 'var(--faint)', t: r.cor || '—' }
  const m = r.metricas || {}
  const atraso = m.envio_atrasado || {}
  const noPrazo = atraso.rate == null ? null : Math.round((100 - atraso.rate) * 10) / 10
  const t = r.transacoes || {}
  const badgeCor = r.cor === 'verde' ? 'var(--ok)' : r.cor === 'amarelo' || r.cor === 'verde-claro' ? 'var(--warn)' : 'var(--danger)'
  return (
    <div className="glass" style={{ padding: 16, borderRadius: 16, marginTop: 12 }}>
      <div className="row" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 13 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', display: 'flex', alignItems: 'center', gap: 6 }}><Trophy size={13} />Reputação da conta no Mercado Livre</div>
        <div style={{ flex: 1 }} />
        {r.eh_lider && r.tier_label ? <Badge c={badgeCor} bg={`${badgeCor}22`} style={{ border: `1px solid ${badgeCor}66` }}><Trophy size={10} />{r.tier_label.toUpperCase()}</Badge>
          : <Badge c={badgeCor} bg={`${badgeCor}18`}>{`NÍVEL ${r.nivel_num || '—'} · ${termo.t.toUpperCase()}`}</Badge>}
      </div>
      {/* termômetro com marcador */}
      <div style={{ position: 'relative', marginBottom: 6 }}>
        <div style={{ height: 12, borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
          <div style={{ flex: 1, background: '#c0392b' }} /><div style={{ flex: 1, background: '#e67e22' }} /><div style={{ flex: 1, background: '#f1c40f' }} /><div style={{ flex: 1, background: '#a8cf45' }} /><div style={{ flex: 1, background: '#2FD98D' }} />
        </div>
        <span style={{ position: 'absolute', top: -3, left: `calc(${termo.pos}% - 9px)`, width: 18, height: 18, borderRadius: '50%', background: '#fff', border: `3px solid ${termo.c}`, boxShadow: '0 2px 6px rgba(0,0,0,.4)' }} />
      </div>
      <div className="row" style={{ display: 'flex', fontSize: 7.5, color: 'var(--faint)', marginBottom: 13, textTransform: 'uppercase', fontWeight: 700 }}>
        <span style={{ flex: 1 }}>vermelho</span><span style={{ flex: 1, textAlign: 'center' }}>laranja</span><span style={{ flex: 1, textAlign: 'center' }}>amarelo</span><span style={{ flex: 1, textAlign: 'center' }}>verde-claro</span><span style={{ flex: 1, textAlign: 'right', color: r.cor === 'verde' ? 'var(--ok)' : 'var(--faint)' }}>verde{r.cor === 'verde' ? ' ✓' : ''}</span>
      </div>
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9 }}>
        <MetricaRep label="Reclamações" valor={m.reclamacoes?.rate} meta={m.reclamacoes?.meta} ok={m.reclamacoes?.ok} />
        <MetricaRep label="Envios no prazo" valor={noPrazo} ok={atraso.ok} metaTexto={atraso.ok ? 'ótimo' : atraso.rate != null ? `${atraso.rate}% atrasados` : ''} />
        <MetricaRep label="Cancelados" valor={m.cancelamentos?.rate} meta={m.cancelamentos?.meta} ok={m.cancelamentos?.ok} />
        <MetricaRep label={`Vendas · ${m.vendas?.periodo || '60d'}`} valor={m.vendas?.completadas != null ? nfmt(m.vendas.completadas) : null} ok={null} sufixo="" metaTexto={t.total != null ? `${nfmt(t.total)} no histórico` : ''} />
      </div>
      <div className="note" style={{ fontSize: 9.5, color: 'var(--faint)', display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 11 }}><Info size={11} style={{ marginTop: 1, flex: 'none' }} />Reputação verde dá mais exposição e desconto de tarifa. O agente de Saúde protege as métricas que sustentam o nível.{t.positivas != null ? ` Avaliações positivas: ${Math.round(t.positivas * 100)}%.` : ''}</div>
    </div>
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
function ProdutosLista({ notify, recarga = 0, onSync, sincronizando }) {
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
  }, [query, refreshTick, recarga])
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
            dados?.cache_vazio ? (
              <div className="glass" style={{ padding: 30, textAlign: 'center', borderRadius: 16, border: '1px solid transparent', background: 'linear-gradient(180deg,var(--surface),#150b12) padding-box, linear-gradient(155deg,rgba(214,0,127,.4),rgba(255,255,255,.08)) border-box' }}>
                <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(214,0,127,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><Boxes size={26} style={{ color: 'var(--accent)' }} /></div>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Fraunces, Georgia, serif', marginBottom: 4 }}>Seu catálogo do Mercado Livre ainda não foi carregado</div>
                <div style={{ fontSize: 11.5, color: 'var(--dim)', maxWidth: 460, margin: '0 auto 16px', lineHeight: 1.6 }}>A sincronização varre todos os seus anúncios e traz preço, estoque, saúde e status para cá. É o que alimenta a Visão geral, a Saúde e o Fiscal.</div>
                {onSync && <button onClick={onSync} disabled={sincronizando} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 700, padding: '10px 20px', borderRadius: 12, cursor: sincronizando ? 'default' : 'pointer', color: '#fff', border: 'none', background: 'linear-gradient(135deg,var(--accent),#a00061)', boxShadow: '0 6px 18px rgba(214,0,127,.35)', opacity: sincronizando ? .7 : 1 }}>{sincronizando ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}{sincronizando ? 'Sincronizando…' : 'Sincronizar catálogo agora'}</button>}
              </div>
            ) : <Empty texto="Nenhum produto com esses filtros. Ajuste os filtros acima." />
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

  const SUBTABS = [['editar', 'Editar'], ['ficha', 'Ficha técnica'], ['preco', 'Precificação'], ['atacado', 'Atacado PxQ'], ['fiscal', 'Fiscal'], ['hist', 'Histórico']]

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
            {det.fotos && det.fotos.length > 0 && (
              <div className="glass" style={{ padding: 10, marginBottom: 12, borderRadius: 12 }}>
                <div style={{ fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '.4px', fontWeight: 800, color: 'var(--faint)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}><Grid3x3 size={11} />Imagens do anúncio<span style={{ color: 'var(--faint)', fontWeight: 700 }}>· {det.fotos.length}</span></div>
                <Carrossel fotos={det.fotos} altura={200} />
              </div>
            )}
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

        {subtab === 'ficha' && <FichaTecnica det={det} notify={notify} />}
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
function gtinValido(s) {
  const d = (s || '').replace(/\D/g, '')
  if (![8, 12, 13, 14].includes(d.length)) return false
  const nums = d.split('').map(Number)
  const check = nums.pop()
  let sum = 0
  nums.reverse().forEach((n, i) => { sum += n * (i % 2 === 0 ? 3 : 1) })
  return (10 - (sum % 10)) % 10 === check
}
function AttrCampo({ a, attrVals, setAttrVals, iaFilled, setIaFilled }) {
  const ia = iaFilled.has(a.id)
  const val = attrVals[a.id]
  const preenchido = val && (val.value_name || val.value_id)
  const brd = ia ? 'rgba(160,107,232,.5)' : (preenchido ? 'rgba(47,217,141,.4)' : 'var(--glass-border)')
  const clearIa = () => setIaFilled((f) => { const n = new Set(f); n.delete(a.id); return n })
  const setVal = (v) => { setAttrVals((s) => ({ ...s, [a.id]: v })); clearIa() }
  const temValores = a.valores && a.valores.length > 0
  const poucos = temValores && a.valores.length <= 6
  const gtinOk = (a.gtin && val?.value_name) ? gtinValido(val.value_name) : null
  return (
    <div style={{ paddingLeft: 9, borderLeft: `2px solid ${ia ? 'var(--accent2)' : (preenchido ? 'rgba(47,217,141,.3)' : 'transparent')}` }}>
      <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
        <b style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.4px', fontWeight: 800, color: 'var(--faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nome}{a.obrigatorio && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}</b>
        {ia && <Badge c="#cfaef5" bg="rgba(160,107,232,.18)"><Sparkles size={8} />IA</Badge>}
        <div style={{ flex: 1 }} />
        {a.gtin && val?.value_name ? (gtinOk ? <Badge c="var(--ok)" bg="rgba(47,217,141,.14)">válido</Badge> : <Badge c="var(--danger)" bg="rgba(255,122,122,.14)">inválido</Badge>)
          : (!a.gtin && preenchido && <Check size={11} style={{ color: 'var(--ok)' }} />)}
      </div>
      {poucos ? (
        <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {a.valores.map((v) => {
            const on = val?.value_id === v.id || val?.value_name === v.nome
            return <span key={v.id} onClick={() => setVal(on ? undefined : { value_id: v.id, value_name: v.nome })} style={{ fontSize: 10.5, fontWeight: 600, padding: '5px 11px', borderRadius: 99, cursor: 'pointer', color: on ? '#fff' : 'var(--dim)', background: on ? 'linear-gradient(135deg,var(--accent),rgba(214,0,127,.6))' : 'rgba(255,255,255,.04)', border: `1px solid ${on ? 'transparent' : 'var(--glass-border)'}` }}>{v.nome}</span>
          })}
        </div>
      ) : temValores ? (
        <select value={val?.value_id || ''} onChange={(e) => { const v = a.valores.find((x) => x.id === e.target.value); setVal(v ? { value_id: v.id, value_name: v.nome } : undefined) }} style={{ width: '100%', background: 'rgba(0,0,0,.2)', border: `1px solid ${brd}`, borderRadius: 9, color: 'var(--text)', fontSize: 11.5, padding: '9px 10px' }}>
          <option value="">— selecione —</option>
          {a.valores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
        </select>
      ) : (
        <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input value={val?.value_name || ''} onChange={(e) => setVal(e.target.value ? { value_name: e.target.value } : undefined)} placeholder="Digite o valor" style={{ flex: 1, minWidth: 0, background: 'rgba(0,0,0,.2)', border: `1px solid ${brd}`, borderRadius: 9, color: 'var(--text)', fontSize: 11.5, padding: '9px 10px' }} />
          {a.unidade && <span style={{ fontSize: 10.5, color: 'var(--faint)', flex: 'none' }}>{a.unidade}</span>}
        </div>
      )}
    </div>
  )
}

function AttrGrade({ attrs, attrVals, setAttrVals, iaFilled, setIaFilled, busca, setBusca, showRec, setShowRec }) {
  const q = (busca || '').trim().toLowerCase()
  const match = (a) => !q || (a.nome || '').toLowerCase().includes(q)
  const todosObrig = attrs.filter((a) => a.obrigatorio)
  const obrig = todosObrig.filter(match)
  const recRel = attrs.filter((a) => !a.obrigatorio && a.relevante && match(a))
  const recTail = attrs.filter((a) => !a.obrigatorio && !a.relevante && match(a))
  const obrigOkN = todosObrig.filter((a) => { const v = attrVals[a.id]; return v && (v.value_name || v.value_id) }).length
  const compl = todosObrig.length ? obrigOkN >= todosObrig.length : true
  const grade = (items) => <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '13px 16px' }}>{items.map((a) => <AttrCampo key={a.id} a={a} attrVals={attrVals} setAttrVals={setAttrVals} iaFilled={iaFilled} setIaFilled={setIaFilled} />)}</div>
  return (
    <>
      {todosObrig.length > 0 && (
        <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 12, background: compl ? 'rgba(47,217,141,.08)' : 'rgba(224,162,60,.07)', border: `1px solid ${compl ? 'rgba(47,217,141,.28)' : 'rgba(224,162,60,.25)'}` }}>
          <div className="row" style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
            <b style={{ fontSize: 10.5, color: compl ? 'var(--ok)' : 'var(--warn)' }}>{compl ? 'Obrigatórios completos' : 'Complete os atributos obrigatórios'}</b>
            <div style={{ flex: 1 }} />
            <span className="num" style={{ fontSize: 11, fontWeight: 800, color: compl ? 'var(--ok)' : 'var(--warn)' }}>{obrigOkN}/{todosObrig.length}</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}><div style={{ width: `${todosObrig.length ? (obrigOkN / todosObrig.length) * 100 : 0}%`, height: '100%', borderRadius: 99, background: compl ? 'var(--ok)' : 'var(--warn)', transition: 'width .3s' }} /></div>
          <div className="note" style={{ fontSize: 9, color: 'var(--faint)', marginTop: 7, display: 'flex', gap: 5 }}><Sparkles size={10} style={{ color: '#cfaef5', flex: 'none', marginTop: 1 }} />Só os campos que a sua categoria realmente usa. {iaFilled.size > 0 ? `A IA preencheu ${iaFilled.size} — revise os marcados em roxo.` : 'Use "Preencher com IA" para adiantar.'}</div>
        </div>
      )}
      {attrs.length > 10 && (
        <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,.2)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '7px 11px', marginBottom: 14 }}>
          <Search size={13} style={{ color: 'var(--faint)' }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Filtrar atributos pelo nome…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 11.5 }} />
          {busca && <X size={13} style={{ color: 'var(--faint)', cursor: 'pointer' }} onClick={() => setBusca('')} />}
        </div>
      )}
      {obrig.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 11 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--danger)' }} /><b style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--danger)' }}>Obrigatórios</b><span className="num" style={{ fontSize: 9, color: 'var(--faint)' }}>{obrig.length}</span></div>
          {grade(obrig)}
        </div>
      )}
      {recRel.length > 0 && (
        <div style={{ marginBottom: recTail.length ? 14 : 0 }}>
          <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 11 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#cfaef5' }} /><b style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.5px', color: '#cfaef5' }}>Recomendados</b><span className="num" style={{ fontSize: 9, color: 'var(--faint)' }}>{recRel.length}</span></div>
          {grade(recRel)}
        </div>
      )}
      {recTail.length > 0 && (showRec ? (
        <div>
          <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 11 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--faint)' }} /><b style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--faint)' }}>Outros da categoria</b><span className="num" style={{ fontSize: 9, color: 'var(--faint)' }}>{recTail.length}</span></div>
          {grade(recTail)}
          <button onClick={() => setShowRec(false)} style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, padding: '7px 12px', borderRadius: 9, cursor: 'pointer', color: 'var(--dim)', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,.03)' }}><ChevronRight size={12} style={{ transform: 'rotate(-90deg)' }} />Mostrar menos</button>
        </div>
      ) : (
        <button onClick={() => setShowRec(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700, padding: '8px 13px', borderRadius: 9, cursor: 'pointer', color: 'var(--dim)', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,.03)' }}><ChevronRight size={12} style={{ transform: 'rotate(90deg)' }} />Ver outros {recTail.length} atributos da categoria</button>
      ))}
      {q && obrig.length + recRel.length + recTail.length === 0 && <Empty texto="Nenhum atributo com esse nome." />}
    </>
  )
}

const CORES_HEX = { prata: '#C0C0C0', prateada: '#C0C0C0', prateado: '#C0C0C0', dourada: '#D4AF37', dourado: '#D4AF37', ouro: '#D4AF37', preta: '#2a2a2a', preto: '#2a2a2a', branca: '#f0f0f0', branco: '#f0f0f0', vermelha: '#c0392b', vermelho: '#c0392b', azul: '#2980b9', verde: '#27ae60', rosa: '#e84393', amarela: '#f1c40f', amarelo: '#f1c40f', roxa: '#8e44ad', roxo: '#8e44ad', lilás: '#b39ddb', lilas: '#b39ddb', cinza: '#7f8c8d', marrom: '#795548', laranja: '#e67e22', bege: '#e3d5b8', nude: '#e8c9b0', transparente: 'rgba(255,255,255,.2)', cristal: 'rgba(255,255,255,.2)' }
function corDe(nome) {
  const k = (nome || '').trim().toLowerCase()
  if (CORES_HEX[k]) return CORES_HEX[k]
  for (const c of Object.keys(CORES_HEX)) if (k.includes(c)) return CORES_HEX[c]
  return null
}
function Variacoes({ attrs, variacoes, setVariacoes }) {
  const [addAberto, setAddAberto] = useState(false)
  const varAttrs = (attrs || []).filter((a) => a.variacao && a.valores && a.valores.length > 0)
  if (varAttrs.length === 0) return null
  const ativo = !!variacoes
  const attrAtual = varAttrs.find((a) => a.id === variacoes?.attrId) || varAttrs[0]
  const ativar = () => { setVariacoes({ attrId: varAttrs[0].id, attrNome: varAttrs[0].nome, itens: [] }); setAddAberto(true) }
  const desativar = () => { setVariacoes(null); setAddAberto(false) }
  const trocarAttr = (id) => { const a = varAttrs.find((x) => x.id === id); setVariacoes({ attrId: id, attrNome: a.nome, itens: [] }); setAddAberto(true) }
  const addValor = (v) => { setVariacoes((s) => ({ ...s, itens: [...s.itens, { value_id: v.id, value_name: v.nome, qtd: 0, sku: '' }] })); setAddAberto(false) }
  const rmValor = (i) => setVariacoes((s) => ({ ...s, itens: s.itens.filter((_, idx) => idx !== i) }))
  const setCampo = (i, campo, val) => setVariacoes((s) => ({ ...s, itens: s.itens.map((x, idx) => idx === i ? { ...x, [campo]: campo === 'qtd' ? Math.max(0, Number(val) || 0) : val } : x) }))
  const usados = new Set((variacoes?.itens || []).map((x) => x.value_id))
  const disponiveis = (attrAtual?.valores || []).filter((v) => !usados.has(v.id))
  const totalVar = (variacoes?.itens || []).reduce((s, x) => s + (Number(x.qtd) || 0), 0)
  return (
    <div className="glass" style={{ padding: 13, marginBottom: 12, borderRadius: 12, border: '1px solid rgba(160,107,232,.28)' }}>
      <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Layers size={13} style={{ color: '#cfaef5' }} />
        <b style={{ fontSize: 10.5 }}>Variações</b>
        {ativo ? <Badge c="#cfaef5" bg="rgba(160,107,232,.16)">{attrAtual?.nome} · {(variacoes.itens || []).length}</Badge> : <Badge c="var(--dim)" bg="rgba(255,255,255,.05)">opcional</Badge>}
        <div style={{ flex: 1 }} />
        {ativo ? (<>{totalVar > 0 && <span className="num" style={{ fontSize: 9.5, color: 'var(--ok)', marginRight: 4 }}>{totalVar} un no total</span>}<MiniBtn icon={X} onClick={desativar}>Remover</MiniBtn></>)
          : <button onClick={ativar} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, padding: '6px 12px', borderRadius: 9, cursor: 'pointer', color: '#e9dbfb', border: '1px solid rgba(160,107,232,.45)', background: 'linear-gradient(135deg,rgba(160,107,232,.22),rgba(214,0,127,.16))' }}><Plus size={12} />Ativar variações</button>}
      </div>
      {ativo && (
        <div style={{ marginTop: 12 }}>
          {varAttrs.length > 1 && (
            <div className="row" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 11 }}>
              <span style={{ fontSize: 9, color: 'var(--faint)', textTransform: 'uppercase', fontWeight: 800 }}>varia por</span>
              {varAttrs.map((a) => <span key={a.id} onClick={() => trocarAttr(a.id)} style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 99, cursor: 'pointer', color: a.id === attrAtual.id ? '#fff' : 'var(--dim)', background: a.id === attrAtual.id ? 'var(--accent)' : 'rgba(255,255,255,.04)', border: `1px solid ${a.id === attrAtual.id ? 'transparent' : 'var(--glass-border)'}` }}>{a.nome}</span>)}
            </div>
          )}
          {(variacoes.itens || []).length === 0 && <div className="note" style={{ fontSize: 9.5, color: 'var(--faint)', display: 'flex', gap: 6, marginBottom: 10 }}><Info size={11} style={{ flex: 'none', marginTop: 1 }} />Adicione cada variação (ex.: cores) com o estoque próprio — o estoque do anúncio passa a ser a soma.</div>}
          {(variacoes.itens || []).map((x, i) => {
            const cor = corDe(x.value_name)
            return (
              <div key={i} className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, background: 'rgba(0,0,0,.16)', borderRadius: 9, padding: '7px 9px' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', flex: 'none', background: cor || 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.25)' }} />
                <b style={{ fontSize: 11.5, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.value_name}</b>
                <input value={x.sku} onChange={(e) => setCampo(i, 'sku', e.target.value)} placeholder="SKU" className="num" style={{ width: 92, padding: '5px 8px', fontSize: 10, background: 'rgba(0,0,0,.2)', border: '1px solid var(--glass-border)', borderRadius: 7, color: 'var(--text)' }} />
                <input type="number" value={x.qtd} onChange={(e) => setCampo(i, 'qtd', e.target.value)} className="num" style={{ width: 58, padding: '5px 8px', fontSize: 11, textAlign: 'center', background: 'rgba(0,0,0,.2)', border: `1px solid ${Number(x.qtd) > 0 ? 'rgba(47,217,141,.35)' : 'var(--glass-border)'}`, borderRadius: 7, color: 'var(--text)' }} />
                <span style={{ fontSize: 8.5, color: 'var(--faint)' }}>un</span>
                <X size={13} style={{ color: 'var(--faint)', cursor: 'pointer' }} onClick={() => rmValor(i)} />
              </div>
            )
          })}
          {disponiveis.length > 0 && (addAberto ? (
            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 9 }}>
              {disponiveis.slice(0, 60).map((v) => { const cor = corDe(v.nome); return <span key={v.id} onClick={() => addValor(v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 600, padding: '5px 10px', borderRadius: 99, cursor: 'pointer', color: 'var(--dim)', background: 'rgba(255,255,255,.04)', border: '1px solid var(--glass-border)' }}><span style={{ width: 11, height: 11, borderRadius: '50%', background: cor || 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.2)' }} />{v.nome}</span> })}
              <MiniBtn icon={X} onClick={() => setAddAberto(false)}>fechar</MiniBtn>
            </div>
          ) : <div style={{ marginTop: 9 }}><MiniBtn icon={Plus} onClick={() => setAddAberto(true)}>variação</MiniBtn></div>)}
        </div>
      )}
    </div>
  )
}

function AtacadoPxQ({ p, preco, ratio, precoBling, notify }) {
  const [faixas, setFaixas] = useState([{ q: 1, preco: preco || p.preco || 0 }])
  const setFaixa = (i, campo, v) => setFaixas((f) => f.map((x, idx) => idx === i ? { ...x, [campo]: Number(v) || 0 } : x))
  const addFaixa = () => setFaixas((f) => f.length >= 5 ? f : [...f, { q: (f[f.length - 1]?.q || 1) + 5, preco: Math.max(0, (preco || 0) - f.length) }])
  const rmFaixa = (i) => setFaixas((f) => f.filter((_, idx) => idx !== i))
  const liqFaixa = (pr) => ratio != null ? Math.round(pr * ratio * 100) / 100 : null
  const minSeguro = (ratio && precoBling) ? Math.ceil((precoBling / ratio) * 100) / 100 : 0
  const sugerir = () => {
    const base = preco || p.preco || 0
    if (!base) { notify('Defina o preço base do anúncio primeiro.', 'warn'); return }
    const tiers = [{ q: 1, d: 0 }, { q: 6, d: 0.03 }, { q: 12, d: 0.06 }, { q: 24, d: 0.09 }]
    const nv = tiers.map((t) => {
      let pr = Math.round(base * (1 - t.d) * 100) / 100
      if (minSeguro && pr < minSeguro) pr = minSeguro
      return { q: t.q, preco: pr }
    })
    setFaixas(nv)
    notify(minSeguro ? `Faixas sugeridas com desconto progressivo, travadas no mínimo seguro (${brl(minSeguro)}).` : 'Faixas sugeridas com desconto progressivo — ajuste como quiser.', 'ok')
  }
  return (
    <div className="glass" style={{ padding: 11, marginBottom: 12, borderRadius: 12, border: '1px solid rgba(160,107,232,.32)' }}>
      <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
        <Boxes size={13} style={{ color: '#cfaef5' }} /><b style={{ fontSize: 10.5 }}>Atacado · preço por quantidade</b>
        <Badge c="var(--ok)" bg="rgba(47,217,141,.14)" style={{ marginLeft: 5 }}>SUAS FAIXAS</Badge>
        <div style={{ flex: 1 }} />
        <MiniBtn icon={Sparkles} ai onClick={sugerir}>Sugerir</MiniBtn>
      </div>
      <div className="note" style={{ fontSize: 9.5, color: 'var(--faint)', display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 9 }}><Info size={11} style={{ marginTop: 1, flex: 'none' }} /><b style={{ color: 'var(--text)', marginRight: 3 }}>Você define</b> quantidade e preço de cada faixa — validação de piso ao vivo.{minSeguro ? <span style={{ marginLeft: 3 }}>Mínimo seguro por unidade: <b className="num" style={{ color: 'var(--ok)' }}>{brl(minSeguro)}</b>.</span> : null}</div>
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

function FichaTecnica({ det, notify }) {
  const [attrs, setAttrs] = useState(null)
  const [attrVals, setAttrVals] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [iaFilled, setIaFilled] = useState(() => new Set())
  const [iaLoad, setIaLoad] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState('')
  const [showRec, setShowRec] = useState(false)
  useEffect(() => {
    if (!det.category_id) { setAttrs([]); setCarregando(false); return }
    setCarregando(true)
    api.mlCategoriaAtributos(det.category_id).then((r) => {
      setAttrs(r.atributos || [])
      const init = {}
      ;(det.atributos || []).forEach((a) => { if (a.id && (a.value_id || a.value_name)) init[a.id] = { value_id: a.value_id, value_name: a.value_name } })
      setAttrVals(init)
    }).catch(() => setAttrs([])).finally(() => setCarregando(false))
  }, [det.category_id])
  const preencherIa = async () => {
    if (!det.category_id) return
    setIaLoad(true)
    try {
      const r = await api.mlCategoriaAtributosIa(det.category_id, { titulo: det.titulo })
      setAttrVals((prev) => { const nv = { ...prev }; (r.sugestoes || []).forEach((s) => { nv[s.id] = { value_name: s.value_name, value_id: s.value_id } }); return nv })
      setIaFilled(new Set((r.sugestoes || []).map((s) => s.id)))
      notify(`IA sugeriu ${(r.sugestoes || []).length} atributo(s) — revise os roxos e salve.`, 'ok')
    } catch (e) { notify(e?.data?.detail || 'IA indisponível agora.', 'danger') } finally { setIaLoad(false) }
  }
  const salvar = async () => {
    const lista = Object.entries(attrVals).filter(([, v]) => v && (v.value_name || v.value_id)).map(([id, v]) => ({ id, value_name: v.value_name, value_id: v.value_id }))
    if (!lista.length) { notify('Preencha ao menos um atributo.', 'warn'); return }
    setSalvando(true)
    try { await api.mlSetAtributos(det.item_id, lista); notify('Ficha técnica atualizada e sincronizada com o ML.', 'ok') }
    catch (e) { notify(e?.data?.detail || 'Não foi possível salvar a ficha.', 'danger') } finally { setSalvando(false) }
  }
  if (!det.category_id) return <Empty icon={FileText} texto="Categoria do anúncio indisponível — não deu para carregar a ficha técnica. Sincronize o catálogo." />
  return (
    <div>
      <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Grid3x3 size={13} style={{ color: 'var(--accent)' }} /><b style={{ fontSize: 11 }}>Ficha técnica do anúncio</b>
        <div style={{ flex: 1 }} />
        <button onClick={preencherIa} disabled={iaLoad || carregando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, padding: '6px 11px', borderRadius: 9, cursor: 'pointer', color: '#e9dbfb', border: '1px solid rgba(160,107,232,.45)', background: 'linear-gradient(135deg,rgba(160,107,232,.24),rgba(214,0,127,.18))', opacity: (iaLoad || carregando) ? .6 : 1 }}>{iaLoad ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}Preencher com IA</button>
      </div>
      {carregando ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>{Array.from({ length: 6 }).map((_, i) => <Skel key={i} h={54} r={10} />)}</div>
        : !attrs || attrs.length === 0 ? <Empty texto="Sem atributos editáveis para esta categoria." />
          : <AttrGrade attrs={attrs} attrVals={attrVals} setAttrVals={setAttrVals} iaFilled={iaFilled} setIaFilled={setIaFilled} busca={busca} setBusca={setBusca} showRec={showRec} setShowRec={setShowRec} />}
      {attrs && attrs.length > 0 && (
        <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--glass-border)' }}>
          <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '9px 16px', borderRadius: 11, cursor: salvando ? 'default' : 'pointer', color: '#fff', border: 'none', background: 'linear-gradient(135deg,var(--accent),#a00061)', opacity: salvando ? .7 : 1 }}>{salvando ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}Salvar ficha no ML</button>
          <span style={{ fontSize: 9.5, color: 'var(--faint)' }}>grava os atributos direto no anúncio (PUT /items)</span>
        </div>
      )}
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
  const [vista, setVista] = useState('agentes')
  useEffect(() => { api.mlAgentesSugestoes(80).then(setAgs).catch(() => setAgs(null)).finally(() => setCarregando(false)) }, [])
  const sugs = ags?.sugestoes || []
  const impacto = ags?.resumo_impacto || {}
  const corAgente = { parado: 'var(--danger)', margem: 'var(--warn)', giro: BLUE, curva: PURPLE, estoque: 'var(--ok)', buybox: ML }
  return (
    <>
      <div className="row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        {[['agentes', 'Agentes', Cpu], ['saude', 'Moderação & Saúde', ShieldAlert]].map(([v, lb, Ic]) => (
          <span key={v} onClick={() => setVista(v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, padding: '8px 14px', borderRadius: 11, cursor: 'pointer', color: vista === v ? '#fff' : 'var(--dim)', background: vista === v ? 'linear-gradient(135deg,var(--accent),rgba(214,0,127,.55))' : 'rgba(255,255,255,.04)', border: `1px solid ${vista === v ? 'transparent' : 'var(--glass-border)'}` }}><Ic size={14} />{lb}</span>
        ))}
      </div>
      {vista === 'saude' && <ModeracaoSaude notify={notify} />}
      {vista === 'agentes' && <>
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
      </>}
    </>
  )
}


/* ---- Moderação & Saúde dos anúncios ---- */
const STATUS_LABEL = { active: 'Ativo', paused: 'Pausado', under_review: 'Em revisão', closed: 'Encerrado' }
function corSaude(v) { return v == null ? 'var(--faint)' : v >= 80 ? 'var(--ok)' : v >= 50 ? 'var(--warn)' : 'var(--danger)' }
function ModeracaoSaude({ notify }) {
  const [situacao, setSituacao] = useState('todos')
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [tick, setTick] = useState(0)
  const [aberto, setAberto] = useState(null)
  const [reativando, setReativando] = useState(() => new Set())
  useEffect(() => {
    setCarregando(true)
    api.mlSaudePainel({ situacao, page: 1, page_size: 60 }).then(setDados).catch(() => setDados(null)).finally(() => setCarregando(false))
  }, [situacao, tick])

  const k = dados?.kpis || {}
  const itens = dados?.itens || []
  const dist = k.distribuicao || {}
  const totDist = Math.max(1, (dist.critico || 0) + (dist.medio || 0) + (dist.bom || 0) + (dist.sem || 0))
  const reativar = async (row) => {
    setReativando((s) => { const n = new Set(s); n.add(row.item_id); return n })
    try { await api.mlProdutoEditar(row.item_id, { status: 'active' }); notify(`Tentativa de reativação enviada para ${row.sku || row.item_id}.`, 'ok'); setTick((t) => t + 1); setAberto(null) }
    catch (e) { const d = e?.data?.detail; notify(typeof d === 'object' ? (d.mensagem || 'Não foi possível reativar.') : (d || 'Não foi possível reativar.'), 'danger') }
    finally { setReativando((s) => { const n = new Set(s); n.delete(row.item_id); return n }) }
  }
  const TABS = [['todos', 'Tudo', k.atencao, 'var(--dim)'], ['revisao', 'Em revisão / moderação', k.revisao, 'var(--danger)'], ['pausado', 'Pausados', k.pausados, 'var(--warn)'], ['saude_baixa', 'Saúde baixa', k.saude_baixa, ML]]

  return (
    <>
      {/* KPIs */}
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        <Kpi icon={ShieldAlert} label="Em revisão / moderação" value={nfmt(k.revisao)} cor="var(--danger)" sub="ação do ML" />
        <Kpi icon={PauseCircle} label="Pausados" value={nfmt(k.pausados)} cor="var(--warn)" sub="fora do ar" />
        <Kpi icon={TrendingDown} label="Saúde baixa" value={nfmt(k.saude_baixa)} cor={ML} sub="ativos < 80%" />
        <Kpi icon={Activity} label="Saúde média" value={k.saude_media == null ? '—' : `${k.saude_media}%`} cor={corSaude(k.saude_media)} sub={`${nfmt(k.total)} anúncios`} />
      </div>

      {/* distribuição de saúde + anel */}
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 210px', gap: 12, marginBottom: 12 }}>
        <div className="glass" style={{ padding: 16, borderRadius: 16 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}><BarChart3 size={13} />Distribuição de saúde dos anúncios</div>
          {[['Crítico (<50%)', dist.critico || 0, 'var(--danger)'], ['Médio (50-79%)', dist.medio || 0, 'var(--warn)'], ['Bom (80%+)', dist.bom || 0, 'var(--ok)'], ['Sem medição', dist.sem || 0, 'var(--faint)']].map(([lb, v, cor]) => (
            <div key={lb} className="row" style={{ display: 'flex', alignItems: 'center', marginBottom: 7 }}>
              <span style={{ width: 130, fontSize: 10.5, color: cor, flex: 'none' }}>{lb}</span>
              <div style={{ flex: 1, height: 16, borderRadius: 7, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(v ? 5 : 0, (v / totDist) * 100)}%`, height: '100%', borderRadius: 7, background: `linear-gradient(90deg, ${cor}66, ${cor})` }} />
              </div>
              <span className="num" style={{ width: 42, textAlign: 'right', fontSize: 10.5, color: 'var(--dim)' }}>{nfmt(v)}</span>
            </div>
          ))}
        </div>
        <div className="glass" style={{ padding: 16, borderRadius: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', marginBottom: 8 }}>Saúde média</div>
          <Ring size={96} val={k.saude_media || 0} cor={corSaude(k.saude_media)} w={10}><span style={{ fontSize: 18, color: corSaude(k.saude_media) }}>{k.saude_media == null ? '—' : `${k.saude_media}%`}</span></Ring>
          <div className="num" style={{ fontSize: 9, color: 'var(--faint)', marginTop: 6 }}>{nfmt(k.atencao)} pedem atenção</div>
        </div>
      </div>

      {/* segmento */}
      <div className="row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        {TABS.map(([v, lb, n, cor]) => (
          <span key={v} onClick={() => setSituacao(v)} style={{ fontSize: 11, fontWeight: 700, padding: '7px 13px', borderRadius: 99, cursor: 'pointer', color: situacao === v ? '#fff' : 'var(--dim)', background: situacao === v ? `linear-gradient(135deg,${cor === 'var(--dim)' ? 'var(--accent)' : cor},${cor === 'var(--dim)' ? 'rgba(214,0,127,.6)' : cor + 'aa'})` : 'rgba(255,255,255,.04)', border: `1px solid ${situacao === v ? 'transparent' : 'var(--glass-border)'}`, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {lb}{n != null && <span style={{ fontSize: 9, fontWeight: 800, background: 'rgba(255,255,255,.18)', borderRadius: 99, padding: '1px 6px' }}>{nfmt(n)}</span>}
          </span>
        ))}
      </div>

      {/* lista */}
      {carregando ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="glass" style={{ padding: 12, borderRadius: 14, marginBottom: 8 }}><Skel h={40} /></div>)
        : itens.length === 0 ? <Empty icon={Shield} texto="Nada pedindo atenção nesta situação. Catálogo saudável." />
          : itens.map((row) => {
            const exp = aberto === row.item_id
            const busy = reativando.has(row.item_id)
            const cor = row.grave ? 'var(--danger)' : row.estado === 'pausado' ? 'var(--warn)' : corSaude(row.saude)
            return (
              <div key={row.item_id} className="glass" style={{ borderRadius: 14, marginBottom: 8, borderLeft: `3px solid ${cor}`, overflow: 'hidden' }}>
                <div className="row lift" style={{ display: 'flex', alignItems: 'center', padding: '11px 12px', cursor: 'pointer' }} onClick={() => setAberto(exp ? null : row.item_id)}>
                  <Thumb src={row.imagem} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.titulo || row.item_id}</div>
                    <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                      <span className="num" style={{ fontSize: 9.5, color: 'var(--faint)' }}>{row.sku || 's/ SKU'}</span>
                      {row.motivos && row.motivos.length > 0 ? row.motivos.slice(0, 2).map((mt, i) => <Badge key={i} c={row.grave ? 'var(--danger)' : 'var(--warn)'} bg={row.grave ? 'rgba(255,122,122,.14)' : 'rgba(224,162,60,.14)'}>{mt}</Badge>)
                        : <Badge c="var(--dim)">{STATUS_LABEL[row.status] || row.status}</Badge>}
                    </div>
                  </div>
                  {row.saude != null && <div style={{ textAlign: 'right', marginRight: 12 }}><div style={{ fontSize: 7.5, color: 'var(--faint)', textTransform: 'uppercase', fontWeight: 800 }}>Saúde</div><b className="num" style={{ fontSize: 13, color: corSaude(row.saude) }}>{row.saude}%</b></div>}
                  <ChevronRight size={16} style={{ color: 'var(--faint)', transform: exp ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
                </div>
                {exp && <SaudeDrill row={row} busy={busy} onReativar={() => reativar(row)} />}
              </div>
            )
          })}
    </>
  )
}

function SaudeDrill({ row, busy, onReativar }) {
  const [d, setD] = useState(null)
  const [carregando, setCarregando] = useState(true)
  useEffect(() => { api.mlSaudeItem(row.item_id).then(setD).catch(() => setD(null)).finally(() => setCarregando(false)) }, [row.item_id])
  const ICON = { ok: Check, alerta: AlertTriangle, ruim: X }
  const CORS = { ok: 'var(--ok)', alerta: 'var(--warn)', ruim: 'var(--danger)' }
  return (
    <div style={{ borderTop: '1px solid var(--glass-border)', background: 'rgba(0,0,0,.14)', padding: 13 }}>
      {carregando ? <Skel h={60} /> : !d ? <div className="num" style={{ fontSize: 10, color: 'var(--faint)' }}>Não foi possível carregar o diagnóstico.</div> : (
        <>
          <div className="row" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 11 }}>
            <Badge c={d.grave ? 'var(--danger)' : 'var(--dim)'} bg={d.grave ? 'rgba(255,122,122,.14)' : 'rgba(255,255,255,.06)'}>{STATUS_LABEL[d.status] || d.status}</Badge>
            {(d.motivos || []).map((mt, i) => <Badge key={i} c="var(--warn)" bg="rgba(224,162,60,.14)"><ShieldAlert size={10} />{mt}</Badge>)}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 9.5, color: 'var(--faint)' }}>diagnóstico de qualidade</span>
            <b className="num" style={{ fontSize: 15, color: corSaude(d.score) }}>{d.score}<span style={{ fontSize: 9, color: 'var(--faint)' }}>/100</span></b>
          </div>
          <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8, marginBottom: 12 }}>
            {(d.componentes || []).map((c) => {
              const Ic = ICON[c.status] || Info
              return (
                <div key={c.chave} className="glass" style={{ padding: '9px 11px', borderRadius: 11, display: 'flex', alignItems: 'center', gap: 9 }}>
                  <Ic size={16} style={{ color: CORS[c.status] || 'var(--dim)', flex: 'none' }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 600 }}>{c.label} <span className="num" style={{ fontSize: 8.5, color: 'var(--faint)' }}>{c.valor}/{c.max}</span></div>
                    <div style={{ fontSize: 9, color: 'var(--faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.detalhe}</div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {d.reativavel ? (
              <button onClick={onReativar} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, padding: '8px 14px', borderRadius: 10, cursor: busy ? 'default' : 'pointer', color: '#fff', border: 'none', background: 'linear-gradient(135deg,var(--ok),#1fa877)', opacity: busy ? .6 : 1 }}>{busy ? <Loader2 size={12} className="animate-spin" /> : <PlayCircle size={12} />}Tentar reativar</button>
            ) : d.grave ? (
              <span style={{ fontSize: 10, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}><ShieldAlert size={12} />Bloqueado pelo Mercado Livre — resolva o motivo acima antes de reativar.</span>
            ) : (
              <span style={{ fontSize: 10, color: 'var(--faint)', display: 'flex', alignItems: 'center', gap: 6 }}><Info size={12} />Corrija os itens em alerta para elevar a saúde e a exposição.</span>
            )}
            {d.permalink && <a href={d.permalink} target="_blank" rel="noreferrer" style={{ fontSize: 10.5, color: BLUE, display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}><ExternalLink size={12} />ver anúncio</a>}
          </div>
        </>
      )}
    </div>
  )
}
/* ================= FISCAL (prontidão + cadastro real) ================= */
const ORIGENS = [['reseller', 'Revenda (nacional)'], ['manufacturer', 'Fabricação própria'], ['imported', 'Importado']]
function Fiscal({ notify }) {
  const [situacao, setSituacao] = useState('todos')
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [tick, setTick] = useState(0)
  const [aberto, setAberto] = useState(null)
  const [regras, setRegras] = useState([])
  const [enviando, setEnviando] = useState(() => new Set())
  const [lote, setLote] = useState(false)

  useEffect(() => {
    setCarregando(true)
    api.mlFiscalPainel({ situacao, page: 1, page_size: 60 }).then(setDados).catch(() => setDados(null)).finally(() => setCarregando(false))
  }, [situacao, tick])
  useEffect(() => { api.mlFiscalRegras().then((r) => setRegras(r.regras || [])).catch(() => setRegras([])) }, [])

  const k = dados?.kpis || {}
  const itens = dados?.itens || []
  const prontidao = k.total ? Math.round((k.pronto / k.total) * 100) : 0
  const marcar = (id, on) => setEnviando((s) => { const n = new Set(s); on ? n.add(id) : n.delete(id); return n })

  const enviar = async (row, form) => {
    marcar(row.item_id, true)
    try {
      const r = await api.mlFiscalSalvar(row.item_id, form || {})
      notify(r.pode_faturar ? `Fiscal enviado — ${row.sku} apto a faturar.` : `Fiscal enviado para ${row.sku}.`, 'ok')
      setAberto(null); setTick((t) => t + 1)
    } catch (e) {
      const d = e?.data?.detail
      notify(typeof d === 'object' ? d.mensagem : (d || 'Falha ao enviar fiscal.'), 'danger')
    } finally { marcar(row.item_id, false) }
  }
  const enviarLote = async () => {
    const prontos = itens.filter((x) => x.estado === 'pronto')
    if (!prontos.length) { notify('Nenhum item pronto nesta página.', 'warn'); return }
    setLote(true); let ok = 0
    for (const row of prontos) { try { await api.mlFiscalSalvar(row.item_id, {}); ok++ } catch { /* segue */ } }
    setLote(false); notify(`${ok} de ${prontos.length} enviados ao ML.`, ok ? 'ok' : 'warn'); setTick((t) => t + 1)
  }

  const TABS = [['todos', 'Todos', k.total, 'var(--dim)'], ['pronto', 'Prontos (Bling)', k.pronto, 'var(--ok)'], ['sem_ncm', 'Sem NCM', k.sem_ncm, 'var(--warn)'], ['sem_bling', 'Sem Bling', k.sem_bling, 'var(--danger)']]

  return (
    <>
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        <Kpi icon={FileText} label="No catálogo" value={nfmt(k.total)} cor="var(--text)" sub="base para NF-e" />
        <Kpi icon={Check} label="Prontos (NCM Bling)" value={nfmt(k.pronto)} cor="var(--ok)" sub="dá para enviar já" />
        <Kpi icon={AlertTriangle} label="Sem NCM" value={nfmt(k.sem_ncm)} cor="var(--warn)" sub="cadastrar no Bling" />
        <Kpi icon={Info} label="Sem vínculo Bling" value={nfmt(k.sem_bling)} cor="var(--danger)" sub="vincular SKU" />
      </div>

      {/* prontidão + breakdown */}
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: '210px 1fr', gap: 12, marginBottom: 12 }}>
        <div className="glass" style={{ padding: 16, borderRadius: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', marginBottom: 8 }}>Prontidão fiscal</div>
          <Ring size={96} val={prontidao} cor="var(--ok)" w={10}><span style={{ color: 'var(--ok)', fontSize: 19 }}>{prontidao}%</span></Ring>
          <div className="num" style={{ fontSize: 9, color: 'var(--faint)', marginTop: 6 }}>{nfmt(k.pronto)} de {nfmt(k.total)} com NCM</div>
        </div>
        <div className="glass" style={{ padding: 16, borderRadius: 16 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}><BarChart3 size={13} />Situação fiscal do catálogo</div>
          <BarRow label="Prontos" val={k.pronto || 0} max={k.total || 1} cor="var(--ok)" />
          <BarRow label="Sem NCM" val={k.sem_ncm || 0} max={k.total || 1} cor="var(--warn)" />
          <BarRow label="Sem Bling" val={k.sem_bling || 0} max={k.total || 1} cor="var(--danger)" />
          <div className="note" style={{ fontSize: 9.5, color: 'var(--faint)', display: 'flex', gap: 6, marginTop: 8 }}><Info size={11} style={{ flex: 'none', marginTop: 1 }} />O <b style={{ color: 'var(--text)', margin: '0 3px' }}>Bling é a fonte fiscal</b> — NCM e origem vêm de lá. O envio grava o <span className="num" style={{ margin: '0 3px' }}>fiscal_information</span> no ML e reconfere o <span className="num" style={{ margin: '0 3px' }}>can_invoice</span>.</div>
        </div>
      </div>

      {/* segmento + lote */}
      <div className="row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        {TABS.map(([v, lb, n, cor]) => (
          <span key={v} onClick={() => setSituacao(v)} style={{ fontSize: 11, fontWeight: 700, padding: '7px 13px', borderRadius: 99, cursor: 'pointer', color: situacao === v ? '#fff' : 'var(--dim)', background: situacao === v ? `linear-gradient(135deg,${cor === 'var(--dim)' ? 'var(--accent)' : cor},${cor === 'var(--dim)' ? 'rgba(214,0,127,.6)' : cor + 'aa'})` : 'rgba(255,255,255,.04)', border: `1px solid ${situacao === v ? 'transparent' : 'var(--glass-border)'}`, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {lb}{n != null && <span style={{ fontSize: 9, fontWeight: 800, background: 'rgba(255,255,255,.18)', borderRadius: 99, padding: '1px 6px' }}>{nfmt(n)}</span>}
          </span>
        ))}
        <div style={{ flex: 1 }} />
        {itens.some((x) => x.estado === 'pronto') && (
          <button onClick={enviarLote} disabled={lote} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700, padding: '7px 12px', borderRadius: 10, cursor: lote ? 'default' : 'pointer', color: '#fff', border: 'none', background: 'linear-gradient(135deg,var(--accent),#a00061)', opacity: lote ? .7 : 1 }}>{lote ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}Enviar prontos da página</button>
        )}
      </div>

      {/* lista */}
      {carregando ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="glass" style={{ padding: 12, borderRadius: 14, marginBottom: 8 }}><Skel h={38} /></div>)
        : itens.length === 0 ? <Empty icon={FileText} texto="Nada nesta situação fiscal." />
          : itens.map((row) => {
            const busy = enviando.has(row.item_id)
            const est = row.estado
            const info = est === 'pronto' ? { c: 'var(--ok)', bg: 'rgba(47,217,141,.14)', t: 'NCM no Bling' } : est === 'sem_ncm' ? { c: 'var(--warn)', bg: 'rgba(224,162,60,.14)', t: 'sem NCM' } : { c: 'var(--danger)', bg: 'rgba(255,122,122,.14)', t: 'sem Bling' }
            const exp = aberto === row.item_id
            return (
              <div key={row.item_id} className="glass" style={{ borderRadius: 14, marginBottom: 8, borderLeft: `3px solid ${info.c}`, overflow: 'hidden' }}>
                <div className="row lift" style={{ display: 'flex', alignItems: 'center', padding: '11px 12px', cursor: 'pointer' }} onClick={() => setAberto(exp ? null : row.item_id)}>
                  <Thumb src={row.imagem} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.titulo || row.item_id}</div>
                    <div className="num" style={{ fontSize: 9.5, color: 'var(--faint)', marginTop: 2 }}>{row.sku || 's/ SKU'}{row.ncm ? <> · NCM <b style={{ color: 'var(--text)' }}>{row.ncm}</b></> : ''}{row.cest ? ` · CEST ${row.cest}` : ''}</div>
                  </div>
                  <Badge c={info.c} bg={info.bg} style={{ marginRight: 10 }}>{info.t}</Badge>
                  {est === 'pronto' && <button onClick={(e) => { e.stopPropagation(); enviar(row, {}) }} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, padding: '7px 12px', borderRadius: 9, cursor: busy ? 'default' : 'pointer', color: '#fff', border: 'none', background: 'linear-gradient(135deg,var(--accent),#a00061)', opacity: busy ? .6 : 1, marginRight: 6 }}>{busy ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}Enviar</button>}
                  <ChevronRight size={16} style={{ color: 'var(--faint)', transform: exp ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
                </div>
                {exp && <FiscalEditor row={row} regras={regras} busy={busy} onEnviar={(form) => enviar(row, form)} notify={notify} />}
              </div>
            )
          })}
    </>
  )
}

function FiscalEditor({ row, regras, busy, onEnviar, notify }) {
  const [det, setDet] = useState(null)
  const [ncm, setNcm] = useState(row.ncm || '')
  const [origem, setOrigem] = useState(row.origin_type || 'reseller')
  const [detalhe, setDetalhe] = useState(row.origin_detail || '0')
  const [cest, setCest] = useState(row.cest || '')
  const [regra, setRegra] = useState('')
  useEffect(() => {
    api.mlFiscalItem(row.item_id).then((d) => {
      setDet(d); const s = d.sugestao_bling || {}
      if (s.ncm) setNcm(s.ncm); if (s.origin_type) setOrigem(s.origin_type)
      if (s.origin_detail) setDetalhe(s.origin_detail); if (s.cest) setCest(s.cest)
    }).catch(() => {})
  }, [row.item_id])
  const ncmOk = ncm.replace(/\D/g, '').length === 8
  return (
    <div style={{ borderTop: '1px solid var(--glass-border)', background: 'rgba(0,0,0,.14)', padding: 13 }}>
      {det && (
        <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
          <span style={{ fontSize: 9.5, color: 'var(--faint)' }}>can_invoice atual:</span>
          {det.pode_faturar === true ? <Badge c="var(--ok)" bg="rgba(47,217,141,.14)"><Check size={10} />apto a faturar</Badge>
            : det.pode_faturar === false ? <Badge c="var(--danger)" bg="rgba(255,122,122,.14)"><AlertTriangle size={10} />falta dado fiscal</Badge>
              : <Badge c="var(--faint)">indisponível</Badge>}
        </div>
      )}
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ fontSize: 8.5, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)', marginBottom: 4 }}>NCM (8 dígitos)</div>
          <input value={ncm} onChange={(e) => setNcm(e.target.value)} placeholder="00000000" className="num" style={{ width: '100%', background: 'rgba(0,0,0,.2)', border: `1px solid ${ncm && !ncmOk ? 'rgba(255,122,122,.5)' : 'var(--glass-border)'}`, borderRadius: 9, color: ncm && !ncmOk ? 'var(--danger)' : 'var(--text)', fontSize: 12, padding: '8px 10px' }} />
        </div>
        <div>
          <div style={{ fontSize: 8.5, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)', marginBottom: 4 }}>Origem</div>
          <select value={origem} onChange={(e) => setOrigem(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,.2)', border: '1px solid var(--glass-border)', borderRadius: 9, color: 'var(--text)', fontSize: 11.5, padding: '8px 10px' }}>
            {ORIGENS.map(([v, lb]) => <option key={v} value={v}>{lb}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 8.5, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)', marginBottom: 4 }}>Código origem (0-8)</div>
          <input value={detalhe} onChange={(e) => setDetalhe(e.target.value)} className="num" style={{ width: '100%', background: 'rgba(0,0,0,.2)', border: '1px solid var(--glass-border)', borderRadius: 9, color: 'var(--text)', fontSize: 12, padding: '8px 10px' }} />
        </div>
        <div>
          <div style={{ fontSize: 8.5, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)', marginBottom: 4 }}>CEST (opcional)</div>
          <input value={cest} onChange={(e) => setCest(e.target.value)} className="num" style={{ width: '100%', background: 'rgba(0,0,0,.2)', border: '1px solid var(--glass-border)', borderRadius: 9, color: 'var(--text)', fontSize: 12, padding: '8px 10px' }} />
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 8.5, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)', marginBottom: 4 }}>Regra tributária (só Regime Normal — Simples deixe vazio)</div>
        <select value={regra} onChange={(e) => setRegra(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,.2)', border: '1px solid var(--glass-border)', borderRadius: 9, color: 'var(--text)', fontSize: 11.5, padding: '8px 10px' }}>
          <option value="">— sem regra (Simples Nacional) —</option>
          {regras.map((r) => <option key={r.id} value={r.id}>{r.description || r.id}</option>)}
        </select>
      </div>
      <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <button onClick={() => { if (!ncmOk) { notify('NCM precisa ter 8 dígitos.', 'warn'); return } onEnviar({ ncm, origin_type: origem, origin_detail: detalhe, cest, tax_rule_id: regra || undefined }) }} disabled={busy || !ncmOk} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, padding: '8px 14px', borderRadius: 10, cursor: busy || !ncmOk ? 'default' : 'pointer', color: '#fff', border: 'none', background: 'linear-gradient(135deg,var(--accent),#a00061)', opacity: busy || !ncmOk ? .6 : 1 }}>{busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}Enviar ao Mercado Livre</button>
        {row.estado === 'sem_ncm' && !ncmOk && <span style={{ fontSize: 9.5, color: 'var(--warn)' }}>sem NCM no Bling — informe aqui ou cadastre no Bling</span>}
      </div>
    </div>
  )
}

/* ================= SINCRONIZAÇÃO (divergências reais) ================= */
function Sincronizacao({ k, notify, onGoCriar }) {
  const [tipo, setTipo] = useState('preco')
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [tick, setTick] = useState(0)
  const [aplicando, setAplicando] = useState(() => new Set())
  const [lote, setLote] = useState(false)
  const [vista, setVista] = useState('div')

  useEffect(() => {
    setCarregando(true)
    api.mlSyncDivergencias({ tipo, page: 1, page_size: 60 }).then(setDados).catch(() => setDados(null)).finally(() => setCarregando(false))
  }, [tipo, tick])

  const c = dados?.counts || {}
  const itens = dados?.itens || []
  const totalMl = c.total_ml || 0
  const emDiaPct = totalMl ? Math.round((c.em_dia / totalMl) * 100) : 0

  const marcar = (id, on) => setAplicando((s) => { const n = new Set(s); on ? n.add(id) : n.delete(id); return n })
  const aplicarPreco = async (row) => {
    if (!row.preco_regra) { notify('Sem preço da regra (produto sem Preço Bling).', 'warn'); return }
    marcar(row.item_id, true)
    try { await api.mlProdutoEditar(row.item_id, { preco: row.preco_regra }); notify(`Preço de ${row.sku || row.item_id} ajustado para a regra.`, 'ok'); setTick((t) => t + 1) }
    catch (e) { const d = e?.data?.detail; notify(typeof d === 'object' ? d.mensagem : (d || 'Falha ao ajustar preço.'), 'danger') }
    finally { marcar(row.item_id, false) }
  }
  const aplicarEstoque = async (row) => {
    marcar(row.item_id, true)
    try { await api.mlProdutoEditar(row.item_id, { estoque: row.estoque_bling }); notify(`Estoque de ${row.sku || row.item_id} igualado ao Bling (${row.estoque_bling}).`, 'ok'); setTick((t) => t + 1) }
    catch (e) { const d = e?.data?.detail; notify(typeof d === 'string' ? d : 'Falha ao igualar estoque.', 'danger') }
    finally { marcar(row.item_id, false) }
  }
  const aplicarTodos = async () => {
    setLote(true)
    let ok = 0
    for (const row of itens) {
      try {
        if (tipo === 'preco' && row.preco_regra) { await api.mlProdutoEditar(row.item_id, { preco: row.preco_regra }); ok++ }
        else if (tipo === 'estoque') { await api.mlProdutoEditar(row.item_id, { estoque: row.estoque_bling }); ok++ }
      } catch { /* segue */ }
    }
    setLote(false); notify(`${ok} de ${itens.length} ajustados nesta página.`, ok ? 'ok' : 'warn'); setTick((t) => t + 1)
  }

  const TABS = [['preco', 'Preço ≠ regra', c.preco, BLUE], ['estoque', 'Estoque ≠', c.estoque, 'var(--warn)'], ['orfaos', 'Só no Bling', c.orfaos, '#cfaef5']]

  return (
    <>
      {/* seletor de vista */}
      <div className="row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        {[['div', 'Divergências', RefreshCw], ['webhooks', 'Webhooks em tempo real', Activity]].map(([v, lb, Ic]) => (
          <span key={v} onClick={() => setVista(v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, padding: '8px 14px', borderRadius: 11, cursor: 'pointer', color: vista === v ? '#fff' : 'var(--dim)', background: vista === v ? 'linear-gradient(135deg,var(--accent),rgba(214,0,127,.55))' : 'rgba(255,255,255,.04)', border: `1px solid ${vista === v ? 'transparent' : 'var(--glass-border)'}` }}><Ic size={14} />{lb}</span>
        ))}
      </div>
      {vista === 'webhooks' && <WebhooksPanel notify={notify} />}
      {vista === 'div' && <>
      {/* KPIs */}
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        <Kpi icon={Check} label="Em dia (Bling=ML)" value={nfmt(c.em_dia)} cor="var(--ok)" sub={`${emDiaPct}% sincronizado`} />
        <Kpi icon={BarChart3} label="Preço ≠ regra" value={nfmt(c.preco)} cor={BLUE} sub="líquido abaixo do alvo" />
        <Kpi icon={Boxes} label="Estoque ≠" value={nfmt(c.estoque)} cor="var(--warn)" sub="Bling ≠ ML" />
        <Kpi icon={AlertTriangle} label="Só no Bling" value={nfmt(c.orfaos)} cor="#cfaef5" sub="sem anúncio" />
      </div>

      {/* fluxo + anel em dia */}
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 210px', gap: 12, marginBottom: 12 }}>
        <div className="glass" style={{ padding: 16, borderRadius: 16 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}><RefreshCw size={13} />Fluxo · Bling é o hub de escrita</div>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <div className="glass" style={{ padding: '13px 17px', textAlign: 'center', border: '1px solid rgba(47,217,141,.32)' }}><b style={{ color: 'var(--ok)', fontSize: 13 }}>Bling ERP</b><div style={{ fontSize: 9, color: 'var(--faint)' }}>preço · custo · estoque · NCM</div></div>
            <ArrowRight size={18} style={{ color: 'var(--faint)' }} />
            <div style={{ padding: '13px 17px', textAlign: 'center', borderRadius: 14, border: '1px solid rgba(160,107,232,.4)', background: 'rgba(160,107,232,.06)' }}><b style={{ fontSize: 13, color: '#e9dbfb' }}>Precifica AI</b><div style={{ fontSize: 9, color: 'var(--faint)' }}>regra · piso · diff</div></div>
            <ArrowRight size={18} style={{ color: 'var(--faint)' }} />
            <div className="glass" style={{ padding: '13px 17px', textAlign: 'center', border: '1px solid rgba(242,194,0,.32)' }}><b style={{ color: ML, fontSize: 13 }}>Mercado Livre</b><div style={{ fontSize: 9, color: 'var(--faint)' }}>publica · edita · webhooks</div></div>
          </div>
        </div>
        <div className="glass" style={{ padding: 16, borderRadius: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', marginBottom: 8 }}>Catálogo em dia</div>
          <Ring size={92} val={emDiaPct} cor="var(--ok)" w={9}><span style={{ color: 'var(--ok)', fontSize: 18 }}>{emDiaPct}%</span></Ring>
          <div className="num" style={{ fontSize: 9, color: 'var(--faint)', marginTop: 6 }}>{nfmt(c.em_dia)} de {nfmt(totalMl)} anúncios</div>
        </div>
      </div>

      {/* segmento de tipo */}
      <div className="row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        {TABS.map(([v, lb, n, cor]) => (
          <span key={v} onClick={() => setTipo(v)} style={{ fontSize: 11, fontWeight: 700, padding: '7px 13px', borderRadius: 99, cursor: 'pointer', color: tipo === v ? '#fff' : 'var(--dim)', background: tipo === v ? `linear-gradient(135deg,${cor},${cor}aa)` : 'rgba(255,255,255,.04)', border: `1px solid ${tipo === v ? 'transparent' : 'var(--glass-border)'}`, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {lb}{n != null && <span style={{ fontSize: 9, fontWeight: 800, background: 'rgba(255,255,255,.18)', borderRadius: 99, padding: '1px 6px' }}>{nfmt(n)}</span>}
          </span>
        ))}
        <div style={{ flex: 1 }} />
        {tipo !== 'orfaos' && itens.length > 0 && (
          <button onClick={aplicarTodos} disabled={lote} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700, padding: '7px 12px', borderRadius: 10, cursor: lote ? 'default' : 'pointer', color: '#fff', border: 'none', background: 'linear-gradient(135deg,var(--accent),#a00061)', opacity: lote ? .7 : 1 }}>{lote ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}Aplicar todos ({itens.length})</button>
        )}
      </div>

      {/* tabela */}
      {carregando ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="glass" style={{ padding: 12, borderRadius: 14, marginBottom: 8 }}><Skel h={38} /></div>)
        : itens.length === 0 ? <Empty icon={Check} texto={tipo === 'preco' ? 'Nenhum preço fora da regra — tudo dentro do líquido-alvo.' : tipo === 'estoque' ? 'Estoques do ML batem com o Bling.' : 'Todos os produtos do Bling já têm anúncio no ML.'} />
          : itens.map((row) => {
            const busy = aplicando.has(row.item_id)
            if (tipo === 'preco') return (
              <div key={row.item_id} className="glass lift" style={{ display: 'flex', alignItems: 'center', padding: '11px 12px', borderRadius: 14, marginBottom: 8, borderLeft: '3px solid ' + BLUE }}>
                <Thumb src={row.imagem} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.titulo || row.item_id}</div>
                  <div className="num" style={{ fontSize: 9.5, color: 'var(--faint)', marginTop: 2 }}>{row.sku || 's/ SKU'} · ML {brl(row.preco)} → você recebe <b style={{ color: 'var(--danger)' }}>{brl(row.liquido)}</b> · alvo <b style={{ color: '#cfaef5' }}>{brl(row.preco_bling)}</b></div>
                </div>
                <div style={{ textAlign: 'right', marginRight: 12 }}>
                  <div style={{ fontSize: 8.5, color: 'var(--faint)', textTransform: 'uppercase', fontWeight: 800 }}>preço regra</div>
                  <b className="num" style={{ fontSize: 14, color: 'var(--ok)' }}>{brl(row.preco_regra)}</b>
                </div>
                <button onClick={() => aplicarPreco(row)} disabled={busy || !row.preco_regra} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, padding: '7px 12px', borderRadius: 9, cursor: busy ? 'default' : 'pointer', color: '#fff', border: 'none', background: 'linear-gradient(135deg,var(--accent),#a00061)', opacity: busy || !row.preco_regra ? .6 : 1 }}>{busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}Aplicar</button>
              </div>
            )
            if (tipo === 'estoque') return (
              <div key={row.item_id} className="glass lift" style={{ display: 'flex', alignItems: 'center', padding: '11px 12px', borderRadius: 14, marginBottom: 8, borderLeft: '3px solid var(--warn)' }}>
                <Thumb src={row.imagem} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.titulo || row.item_id}</div>
                  <div className="num" style={{ fontSize: 9.5, color: 'var(--faint)', marginTop: 2 }}>{row.sku || 's/ SKU'}</div>
                </div>
                <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 12 }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: 8, color: 'var(--faint)', textTransform: 'uppercase', fontWeight: 800 }}>ML</div><b className="num" style={{ fontSize: 14, color: 'var(--warn)' }}>{row.estoque_ml}</b></div>
                  <ArrowRight size={13} style={{ color: 'var(--faint)' }} />
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: 8, color: 'var(--faint)', textTransform: 'uppercase', fontWeight: 800 }}>Bling</div><b className="num" style={{ fontSize: 14, color: 'var(--ok)' }}>{row.estoque_bling}</b></div>
                </div>
                <button onClick={() => aplicarEstoque(row)} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, padding: '7px 12px', borderRadius: 9, cursor: busy ? 'default' : 'pointer', color: '#fff', border: 'none', background: 'linear-gradient(135deg,var(--accent),#a00061)', opacity: busy ? .6 : 1 }}>{busy ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}Igualar</button>
              </div>
            )
            return (
              <div key={row.produto_id} className="glass lift" style={{ display: 'flex', alignItems: 'center', padding: '11px 12px', borderRadius: 14, marginBottom: 8, borderLeft: '3px solid #cfaef5' }}>
                <Thumb src={row.imagem} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.nome}</div>
                  <div className="num" style={{ fontSize: 9.5, color: 'var(--faint)', marginTop: 2 }}>{row.sku || 's/ SKU'} · {row.saldo} un · preço regra <b style={{ color: 'var(--ok)' }}>{brl(row.preco_regra)}</b></div>
                </div>
                <button onClick={onGoCriar} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, padding: '7px 12px', borderRadius: 9, cursor: 'pointer', color: '#fff', border: 'none', background: 'linear-gradient(135deg,var(--accent),#a00061)' }}><Plus size={11} />Publicar</button>
              </div>
            )
          })}
      </>}
    </>
  )
}
function Carrossel({ fotos, altura = 160 }) {
  const imgs = (fotos || []).filter(Boolean)
  const [i, setI] = useState(0)
  useEffect(() => { setI(0) }, [imgs.length])
  if (imgs.length === 0) return <div style={{ height: altura, background: 'rgba(255,255,255,.04)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageOff size={28} style={{ color: 'var(--faint)' }} /></div>
  const idx = Math.min(i, imgs.length - 1)
  const prev = (e) => { e && e.stopPropagation && e.stopPropagation(); setI((v) => (v - 1 + imgs.length) % imgs.length) }
  const next = (e) => { e && e.stopPropagation && e.stopPropagation(); setI((v) => (v + 1) % imgs.length) }
  return (
    <div>
      <div style={{ position: 'relative', height: altura, borderRadius: 12, overflow: 'hidden', background: 'rgba(0,0,0,.22)' }}>
        <img src={imgs[idx]} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        {imgs.length > 1 && (<>
          <button onClick={prev} style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={16} /></button>
          <button onClick={next} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={16} /></button>
          <span className="num" style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: 'rgba(0,0,0,.6)', color: '#fff' }}>{idx + 1}/{imgs.length}</span>
        </>)}
      </div>
      {imgs.length > 1 && (
        <div style={{ display: 'flex', gap: 5, marginTop: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {imgs.map((f, kk) => (
            <div key={kk} onClick={(e) => { e.stopPropagation(); setI(kk) }} style={{ width: 38, height: 38, borderRadius: 7, flex: 'none', cursor: 'pointer', overflow: 'hidden', border: `2px solid ${kk === idx ? 'var(--accent)' : 'transparent'}`, opacity: kk === idx ? 1 : 0.55 }}>
              <img src={f} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
function Thumb({ src }) {
  return <div style={{ width: 44, height: 44, borderRadius: 10, flex: 'none', background: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)', marginRight: 12, overflow: 'hidden' }}>{src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={18} style={{ color: 'var(--faint)' }} />}</div>
}

/* ---- Webhooks em tempo real ---- */
const TOPICO_LABEL = { items: 'Anúncios', items_prices: 'Preços', stock_locations: 'Estoque', catalog_item_competition: 'Buybox/Catálogo', price_suggestion: 'Sugestão de preço', moderations_reports: 'Moderações', shipments: 'Envios', orders_v2: 'Pedidos', messages: 'Mensagens' }
const TOPICO_COR = { items: 'var(--ok)', items_prices: BLUE, stock_locations: 'var(--warn)', catalog_item_competition: ML, price_suggestion: '#cfaef5', moderations_reports: 'var(--danger)', shipments: '#5B8DEF', orders_v2: 'var(--ok)', messages: '#cfaef5' }
function tempoRel(iso) {
  if (!iso) return '—'
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return `há ${s}s`
  if (s < 3600) return `há ${Math.floor(s / 60)}min`
  if (s < 86400) return `há ${Math.floor(s / 3600)}h`
  return `há ${Math.floor(s / 86400)}d`
}
function WebhooksPanel({ notify }) {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [tick, setTick] = useState(0)
  const [recuperando, setRecuperando] = useState(false)
  useEffect(() => {
    setCarregando(true)
    api.mlWebhooksPainel(24).then(setDados).catch(() => setDados(null)).finally(() => setCarregando(false))
  }, [tick])
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 15000); return () => clearInterval(id) }, [])

  const recuperar = async () => {
    setRecuperando(true)
    try { const r = await api.mlWebhooksRecuperar(); notify(`Reconciliação: ${r.reprocessadas} de ${r.encontradas} notificações reprocessadas.`, r.reprocessadas ? 'ok' : 'warn'); setTick((t) => t + 1) }
    catch (e) { notify(e?.data?.detail || 'Não foi possível consultar as perdidas.', 'danger') }
    finally { setRecuperando(false) }
  }

  if (carregando && !dados) return <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <Skel key={i} h={78} r={15} />)}</div>
  const d = dados || {}
  const topicos = (d.por_topico || []).filter((t) => t.n > 0)
  const maxN = Math.max(1, ...topicos.map((t) => t.n))
  const taxa = d.taxa_processamento

  return (
    <>
      {/* status */}
      <div className="row" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, border: `1px solid ${d.conectado ? 'rgba(47,217,141,.28)' : 'var(--glass-border)'}`, background: d.conectado ? 'linear-gradient(90deg,rgba(47,217,141,.07),rgba(47,217,141,.02))' : 'rgba(255,255,255,.03)', borderRadius: 15, padding: '11px 15px', marginBottom: 12 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: d.conectado ? 'var(--ok)' : 'var(--faint)', boxShadow: d.conectado ? '0 0 8px rgba(47,217,141,.7)' : 'none' }} />
        <b style={{ fontSize: 12, color: d.conectado ? 'var(--ok)' : 'var(--dim)' }}>{d.conectado ? 'Webhooks recebendo eventos' : 'Aguardando o primeiro evento'}</b>
        <span className="num" style={{ fontSize: 10.5, color: 'var(--faint)' }}>último {tempoRel(d.ultimo_recebido)}</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => setTick((t) => t + 1)} className="glass" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, padding: '6px 11px', borderRadius: 9, cursor: 'pointer', color: 'var(--dim)' }}><RefreshCw size={12} />Atualizar</button>
        <button onClick={recuperar} disabled={recuperando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, padding: '6px 11px', borderRadius: 9, cursor: recuperando ? 'default' : 'pointer', color: '#e9dbfb', border: '1px solid rgba(160,107,232,.45)', background: 'linear-gradient(135deg,rgba(160,107,232,.24),rgba(214,0,127,.18))', opacity: recuperando ? .6 : 1 }}>{recuperando ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}Recuperar perdidos</button>
      </div>

      {/* KPIs */}
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        <Kpi icon={Activity} label="Eventos · 24h" value={nfmt(d.total_janela)} cor="var(--ok)" sub={`${nfmt(d.total_geral)} no total`} />
        <Kpi icon={Check} label="Processados" value={nfmt(d.processados)} cor={BLUE} sub="cache atualizado" />
        <Kpi icon={Gauge} label="Taxa" value={taxa == null ? '—' : `${taxa}%`} cor={taxa != null && taxa >= 90 ? 'var(--ok)' : 'var(--warn)'} sub="processados/recebidos" />
        <Kpi icon={Layers} label="Tópicos assinados" value={nfmt((d.topicos_assinados || []).length)} cor="#cfaef5" sub="items, preços, estoque…" />
      </div>

      <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 210px', gap: 12, marginBottom: 12 }}>
        {/* por tópico */}
        <div className="glass" style={{ padding: 16, borderRadius: 16 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}><BarChart3 size={13} />Webhooks por tópico · 24h</div>
          {topicos.length === 0 ? <div className="note" style={{ fontSize: 10.5, color: 'var(--faint)', display: 'flex', gap: 6 }}><Info size={11} style={{ flex: 'none', marginTop: 1 }} />Nenhum evento nas últimas 24h. Assim que o ML enviar (preço, estoque, moderação), aparece aqui em tempo real.</div>
            : topicos.map((t) => (
              <div key={t.topic} className="row" style={{ display: 'flex', alignItems: 'center', marginBottom: 7 }}>
                <span style={{ width: 118, fontSize: 10.5, color: TOPICO_COR[t.topic] || 'var(--dim)', flex: 'none' }}>{TOPICO_LABEL[t.topic] || t.topic}</span>
                <div style={{ flex: 1, height: 17, borderRadius: 7, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(6, (t.n / maxN) * 100)}%`, height: '100%', borderRadius: 7, background: `linear-gradient(90deg, ${(TOPICO_COR[t.topic] || BLUE)}66, ${TOPICO_COR[t.topic] || BLUE})`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6, fontSize: 9, fontWeight: 800, color: '#0d0d0d' }}>{nfmt(t.n)}</div>
                </div>
                <span className="num" style={{ width: 60, textAlign: 'right', fontSize: 8.5, color: 'var(--faint)' }}>{tempoRel(t.ultimo)}</span>
              </div>
            ))}
        </div>
        {/* ring taxa */}
        <div className="glass" style={{ padding: 16, borderRadius: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', marginBottom: 8 }}>Processamento</div>
          <Ring size={92} val={taxa || 0} cor={taxa != null && taxa >= 90 ? 'var(--ok)' : 'var(--warn)'} w={9}><span style={{ fontSize: 17, color: taxa != null && taxa >= 90 ? 'var(--ok)' : 'var(--warn)' }}>{taxa == null ? '—' : `${taxa}%`}</span></Ring>
          <div className="num" style={{ fontSize: 9, color: 'var(--faint)', marginTop: 6 }}>{nfmt(d.processados)} de {nfmt(d.total_janela)} eventos</div>
        </div>
      </div>

      {/* feed recente */}
      <div className="glass" style={{ padding: 14, borderRadius: 16 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}><Activity size={13} />Eventos recentes</div>
        {(d.recentes || []).length === 0 ? <div className="note" style={{ fontSize: 10.5, color: 'var(--faint)' }}>Sem eventos ainda.</div>
          : (d.recentes || []).map((e, i) => (
            <div key={i} className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: i < d.recentes.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', flex: 'none', background: TOPICO_COR[e.topic] || 'var(--faint)' }} />
              <b style={{ fontSize: 10.5, color: TOPICO_COR[e.topic] || 'var(--dim)', width: 110, flex: 'none' }}>{TOPICO_LABEL[e.topic] || e.topic}</b>
              <span className="num" style={{ fontSize: 10, color: 'var(--dim)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.resource_id || '—'}{e.resultado ? ` · ${e.resultado}` : ''}</span>
              {e.processado ? <Badge c="var(--ok)" bg="rgba(47,217,141,.12)"><Check size={9} />ok</Badge> : <Badge c="var(--warn)" bg="rgba(224,162,60,.12)">pendente</Badge>}
              <span className="num" style={{ fontSize: 9, color: 'var(--faint)', width: 54, textAlign: 'right' }}>{tempoRel(e.recebido_em)}</span>
            </div>
          ))}
      </div>
    </>
  )
}

/* ================= CRIAR / PUBLICAR (assistente real) ================= */
const PASSOS = ['Origem (Bling)', 'Título & categoria', 'Atributos & fotos', 'Atacado PxQ', 'Fiscal', 'Publicar']
function CriarPublicar({ notify }) {
  const [modo, setModo] = useState('novo')
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
  const [variacoes, setVariacoes] = useState(null)  // { attrId, attrNome, itens:[{value_id,value_name,qtd,sku}] }
  const [attrsLoad, setAttrsLoad] = useState(false)
  const [iaAttrLoad, setIaAttrLoad] = useState(false)
  const [iaFilled, setIaFilled] = useState(() => new Set())
  const [attrBusca, setAttrBusca] = useState('')
  const [showRec, setShowRec] = useState(false)
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
  // ao entrar em Título & categoria, já prevê a categoria (destrava o Avançar)
  useEffect(() => { if (passo === 1 && titulo.trim() && cats == null && !prevendo) prever() }, [passo]) // eslint-disable-line react-hooks/exhaustive-deps

  const escolher = (p) => {
    setProd(p); setTitulo(p.nome || ''); setPreco(p.preco_regra || p.preco_bling || 0)
    setEstoque(p.saldo || 0); setFotos((p.imagens && p.imagens.length) ? p.imagens : (p.imagem ? [p.imagem] : []))
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
      setIaFilled(new Set((r.sugestoes || []).map((s) => s.id)))
      notify(`IA preencheu ${(r.sugestoes || []).length} atributo(s) — revise os marcados em roxo antes de publicar.`, 'ok')
    } catch (e) { notify(e?.data?.detail || 'IA indisponível.', 'danger') } finally { setIaAttrLoad(false) }
  }
  const irAtributos = async () => { if (!catSel) { notify('Escolha a categoria.', 'warn'); return } if (!attrs) await carregarAttrs(catSel); setPasso(2) }

  const montarAtributos = () => Object.entries(attrVals).filter(([, v]) => v && (v.value_name || v.value_id)).map(([id, v]) => ({ id, value_name: v.value_name, value_id: v.value_id }))
  const varItens = (variacoes?.itens || []).filter((x) => Number(x.qtd) > 0)
  const corpoBase = () => ({ titulo, category_id: catSel?.category_id, preco: Number(preco), quantidade: Number(estoque), listing_type_id: tipo, condicao: 'new', pictures: fotos, atributos: montarAtributos(), sku: prod?.sku, descricao: undefined, variations: (variacoes && varItens.length) ? varItens.map((x) => ({ attribute_combinations: [{ id: variacoes.attrId, value_id: x.value_id, value_name: x.value_name }], available_quantity: Number(x.qtd), ...(x.sku ? { seller_custom_field: x.sku } : {}) })) : undefined })
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

  const obrigAttrs = (attrs || []).filter((a) => a.obrigatorio)
  const obrigOk = obrigAttrs.filter((a) => { const v = attrVals[a.id]; return v && (v.value_name || v.value_id) }).length
  const precoOkRegra = Number(preco) > 0 && (!prod?.preco_regra || Number(preco) >= prod.preco_regra - 0.01)
  const checklist = [
    ['Título (até 60)', !!titulo.trim() && titulo.length <= 60],
    ['Categoria folha', !!catSel],
    ['Preço na régua da regra', precoOkRegra],
    ['Estoque disponível', Number(estoque) > 0 || (variacoes && varItens.reduce((s, x) => s + Number(x.qtd), 0) > 0)],
    ['Fotos (2+)', fotos.length >= 2],
    ['Atributos obrigatórios', obrigAttrs.length > 0 ? obrigOk >= obrigAttrs.length : (attrs != null)],
  ]
  const checkOk = checklist.filter(([, ok]) => ok).length
  const scoreDraft = Math.round(
    (titulo.trim() ? Math.min(titulo.length / 55, 1) * (titulo.length <= 60 ? 25 : 15) : 0) +
    (catSel ? 20 : 0) +
    (Number(preco) > 0 ? (precoOkRegra ? 15 : 8) : 0) +
    (Number(estoque) > 0 || (variacoes && varItens.reduce((s, x) => s + Number(x.qtd), 0) > 0) ? 10 : 0) +
    (Math.min(fotos.length / 6, 1) * 20) +
    (obrigAttrs.length > 0 ? (obrigOk / obrigAttrs.length) * 10 : (attrs != null ? 10 : 0)),
  )
  const scoreCor = scoreDraft >= 80 ? 'var(--ok)' : scoreDraft >= 50 ? 'var(--warn)' : 'var(--danger)'

  return (
    <>
      <div className="row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        {[['novo', 'Publicar novo', Plus], ['editar', 'Editar anúncio existente', SlidersHorizontal]].map(([v, lb, Ic]) => (
          <span key={v} onClick={() => setModo(v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '9px 16px', borderRadius: 11, cursor: 'pointer', color: modo === v ? '#fff' : 'var(--dim)', background: modo === v ? 'linear-gradient(135deg,var(--accent),rgba(214,0,127,.55))' : 'rgba(255,255,255,.04)', border: `1px solid ${modo === v ? 'transparent' : 'var(--glass-border)'}` }}><Ic size={14} />{lb}</span>
        ))}
      </div>
      {modo === 'editar' ? <EditarExistente notify={notify} /> : <>
      {/* KPIs do funil */}
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        <Kpi icon={Boxes} label="Novos do Bling" value={bling ? nfmt(bling.novos) : '—'} cor="var(--ok)" sub="sem anúncio no ML" />
        <Kpi icon={Package} label="No catálogo Bling" value={bling ? nfmt(bling.total) : '—'} cor={BLUE} sub="base para publicar" />
        <Kpi icon={Sparkles} label="Passo atual" value={`${passo + 1}/6`} cor="#cfaef5" sub={PASSOS[passo]} />
        {prod ? <Kpi icon={Sparkles} label="Score do rascunho" value={`${scoreDraft}`} cor={scoreCor} sub={`${checkOk}/${checklist.length} no checklist`} />
          : <Kpi icon={Rocket} label="Publicado agora" value={publicado ? '1' : '—'} cor="var(--ok)" sub={publicado ? 'nesta sessão' : 'aguardando'} />}
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
                      {p.imagens && p.imagens.length > 0 && <Badge c="var(--dim)" bg="rgba(255,255,255,.06)" style={{ marginRight: 6 }}><Grid3x3 size={9} />{p.imagens.length}</Badge>}
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
              {attrsLoad ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}><Skel h={34} w={140} r={8} /><Skel h={34} r={8} /></div>)
                : !attrs ? <Empty texto="Volte ao passo anterior e escolha a categoria para carregar a ficha." />
                  : <AttrGrade attrs={attrs} attrVals={attrVals} setAttrVals={setAttrVals} iaFilled={iaFilled} setIaFilled={setIaFilled} busca={attrBusca} setBusca={setAttrBusca} showRec={showRec} setShowRec={setShowRec} />}

              {attrs && <div style={{ marginTop: 16 }}><Variacoes attrs={attrs} variacoes={variacoes} setVariacoes={setVariacoes} /></div>}

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
              {passo < 5 && <button onClick={() => { if (passo === 1) irAtributos(); else setPasso((s) => Math.min(5, s + 1)) }} disabled={!podeAvancar} title={!podeAvancar ? (passo === 0 ? 'Escolha um produto do Bling' : 'Preencha o título e selecione a categoria') : ''} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '9px 16px', borderRadius: 11, color: '#fff', border: 'none', cursor: podeAvancar ? 'pointer' : 'not-allowed', opacity: podeAvancar ? 1 : .5, background: 'linear-gradient(135deg,var(--accent),#a00061)' }}>Avançar<ChevronRight size={14} /></button>}
            </div>
          )}
        </div>

        {/* PRÉVIA ao vivo (a partir do passo 1) */}
        {passo >= 1 && (
          <div className="glass" style={{ padding: 14, borderRadius: 16, position: 'sticky', top: 76 }}>
            <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)' }}>Prévia do anúncio</div>
                <div style={{ fontSize: 9, color: 'var(--faint)', marginTop: 2 }}>qualidade estimada · {checkOk}/{checklist.length} itens</div>
              </div>
              <Ring size={54} val={scoreDraft} cor={scoreCor} w={6}><b className="num" style={{ fontSize: 14, color: scoreCor }}>{scoreDraft}</b></Ring>
            </div>
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
              <div style={{ padding: 8 }}><Carrossel fotos={fotos} altura={150} /></div>
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
              <div className="row" style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                <b style={{ fontSize: 10.5 }}>Checklist de publicação</b><div style={{ flex: 1 }} />
                <Badge c={checkOk === checklist.length ? 'var(--ok)' : 'var(--warn)'} bg={checkOk === checklist.length ? 'rgba(47,217,141,.14)' : 'rgba(224,162,60,.14)'}>{checkOk}/{checklist.length}</Badge>
              </div>
              {checklist.map(([lb, ok]) => (
                <div key={lb} className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10.5, padding: '3px 0', color: ok ? 'var(--text)' : 'var(--faint)' }}>
                  {ok ? <Check size={13} style={{ color: 'var(--ok)' }} /> : <div style={{ width: 13, height: 13, borderRadius: '50%', border: '1px solid var(--faint)' }} />}{lb}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </>}
    </>
  )
}

/* ---- Editar anúncio existente (busca + lista + cockpit reaproveitado) ---- */
function EditarExistente({ notify }) {
  const [busca, setBusca] = useState('')
  const [buscaLive, setBuscaLive] = useState('')
  const [status, setStatus] = useState('todos')
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [page, setPage] = useState(1)
  const [aberto, setAberto] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const pageSize = 30
  useEffect(() => { const t = setTimeout(() => { setBuscaLive(busca); setPage(1) }, 350); return () => clearTimeout(t) }, [busca])
  useEffect(() => {
    setCarregando(true)
    api.mlProdutosPainel({ busca: buscaLive, status, page, page_size: pageSize }).then(setDados).catch(() => setDados(null)).finally(() => setCarregando(false))
  }, [buscaLive, status, page, refreshTick])
  const itens = dados?.itens || []
  const total = dados?.total_filtrado ?? 0
  const paginas = Math.max(1, Math.ceil(total / pageSize))
  const ST = [['todos', 'Todos'], ['active', 'Ativos'], ['paused', 'Pausados']]
  return (
    <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
      <div>
        <div className="glass" style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderRadius: 11, marginBottom: 10 }}>
          <Search size={13} style={{ color: 'var(--faint)', marginRight: 8 }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar anúncio por título, SKU ou código MLB…" style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 12, width: '100%' }} />
          {carregando && <Loader2 size={13} className="animate-spin" style={{ color: 'var(--faint)' }} />}
        </div>
        <div className="row" style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {ST.map(([v, lb]) => <Chip key={v} on={status === v} onClick={() => { setStatus(v); setPage(1) }}>{lb}</Chip>)}
          {dados && <span className="num" style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--faint)', alignSelf: 'center' }}>{nfmt(total)} anúncios</span>}
        </div>
        {carregando ? Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass" style={{ display: 'flex', alignItems: 'center', padding: 11, borderRadius: 16, marginBottom: 9 }}>
            <Skel h={48} w={48} r={11} style={{ marginRight: 12 }} />
            <div style={{ flex: 1 }}><Skel h={11} w="58%" style={{ marginBottom: 6 }} /><Skel h={8} w="34%" style={{ marginBottom: 6 }} /><Skel h={14} w="52%" /></div>
          </div>
        )) : itens.length === 0 ? (
          <Empty icon={Boxes} texto={dados?.cache_vazio ? 'Catálogo do ML ainda não sincronizado. Rode a sincronização no topo da Central de Produtos.' : 'Nenhum anúncio com esse filtro.'} />
        ) : itens.map((p) => (
          <ProdutoRow key={p.item_id} p={p} sel={false} onSel={() => {}} onOpen={() => setAberto(p)} ativo={aberto?.item_id === p.item_id} />
        ))}
        {paginas > 1 && (
          <div className="row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
            <MiniBtn onClick={() => setPage((x) => Math.max(1, x - 1))}>‹</MiniBtn>
            <span className="num" style={{ fontSize: 11, color: 'var(--dim)', margin: '0 8px' }}>página {page} de {paginas}</span>
            <MiniBtn onClick={() => setPage((x) => Math.min(paginas, x + 1))}>›</MiniBtn>
          </div>
        )}
      </div>
      <div>
        {aberto ? <Cockpit p={aberto} onClose={() => setAberto(null)} notify={notify} onSaved={(prod) => { setAberto((a) => ({ ...a, ...prod })); setRefreshTick((t) => t + 1) }} />
          : <div className="glass" style={{ padding: 26, borderRadius: 18, textAlign: 'center', position: 'sticky', top: 76 }}>
            <SlidersHorizontal size={26} style={{ color: 'var(--faint)', margin: '0 auto 10px' }} />
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Fraunces, Georgia, serif', marginBottom: 4 }}>Escolha um anúncio para editar</div>
            <div style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.5 }}>Título (com IA), preço (com trava de piso), estoque, status, atacado PxQ e as imagens — tudo grava direto no Mercado Livre pelo Bling.</div>
          </div>}
      </div>
    </div>
  )
}
