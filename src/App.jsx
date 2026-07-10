import { useEffect, useState, lazy, Suspense, useRef } from 'react'
import { LayoutDashboard, Boxes, Calculator, SatelliteDish, FileText, Sparkles, Aperture, Bot, Settings, Sun, Moon, LogOut, Plug, ShoppingBag, CalendarDays, Crown, Inbox, Package, Tag, Megaphone, Rocket, Search, ChevronsLeft, ChevronsRight, Star, Globe, Clock, TrendingUp, ScanLine, ChevronDown, CornerDownLeft } from 'lucide-react'
import { api, getToken, setToken } from './api.js'
import { useToast } from './toast.jsx'
import NotificacoesGlobais from './Notificacoes.jsx'
import Login from './Login.jsx'

const Dashboard = lazy(() => import('./Dashboard.jsx'))
const Catalogo = lazy(() => import('./Catalogo.jsx'))
const Precificacao = lazy(() => import('./Precificacao.jsx'))
const Radar = lazy(() => import('./Radar.jsx'))
const Nfe = lazy(() => import('./Nfe.jsx'))
const CentralIa = lazy(() => import('./CentralIa.jsx'))
const Conselho = lazy(() => import('./Conselho.jsx'))
const Estudio = lazy(() => import('./Estudio.jsx'))
const Agentes = lazy(() => import('./Agentes.jsx'))
const Configuracoes = lazy(() => import('./Configuracoes.jsx'))
const Shopee = lazy(() => import('./Shopee.jsx'))
const Atendimento = lazy(() => import('./Atendimento.jsx'))
const Pedidos = lazy(() => import('./PedidosHub.jsx'))
const Promocoes = lazy(() => import('./Promocoes.jsx'))
const Produtos = lazy(() => import('./Produtos.jsx'))
const MercadoAds = lazy(() => import('./MercadoAds.jsx'))

const TITULOS = {
  dashboard: 'Inteligência Comercial',
  catalogo: 'Catálogo',
  shopee: 'Shopee',
  atendimento: 'Atendimento',
  pedidos: 'Pedidos',
  promocoes: 'Central de promoções',
  mlprodutos: 'Central de Produtos',
  mlads: 'Mercado Ads',
  precificacao: 'Precificação por canal',
  radar: 'Radar de mercado',
  nfe: 'Notas fiscais',
  ia: 'Central de IA',
  conselho: 'Conselho de IA',
  estudio: 'Estúdio criativo',
  agentes: 'Agentes',
  configuracoes: 'Configurações',
}

const DESCRICOES = {
  dashboard: 'Visão geral de vendas, margem e capital parado',
  catalogo: 'Seu catálogo do Bling, sincronizado e atualizado por webhook',
  shopee: 'Boost, promoções, avaliações e saúde da loja',
  atendimento: 'Perguntas dos compradores, multicanal, com IA',
  pedidos: 'Central unificada ML e Shopee · despacho, tarifa, margem e inteligência de vendas',
  promocoes: 'Campanhas, cupons e ofertas do Mercado Livre',
  mlprodutos: 'Criar, publicar e sincronizar anúncios do Mercado Livre',
  mlads: 'Product Ads — campanhas patrocinadas, ROAS e ACOS',
  precificacao: 'Preço ideal por canal a partir do custo e das taxas',
  radar: 'Acompanhamento de concorrentes e preços do mercado',
  nfe: 'Emissão e gestão de notas fiscais',
  ia: 'Geração de conteúdo e respostas com IA',
  estudio: 'Criação de imagens e mídia para anúncios',
  agentes: 'Conselho de IA com diretores e subagentes',
  configuracoes: 'Conexões, webhooks e preferências',
}

export default function App() {
  const notify = useToast()
  const [theme, setTheme] = useState(() => localStorage.getItem('blingai_theme') || 'dark')
  const [authed, setAuthed] = useState(!!getToken())
  const [view, setView] = useState('dashboard')
  const [bling, setBling] = useState({ autorizado: false })
  const [shopee, setShopee] = useState(null)
  const [colapsado, setColapsado] = useState(() => localStorage.getItem('blingai_menu_colapsado') === '1')
  const [paleta, setPaleta] = useState(false)
  const [badges, setBadges] = useState({})

  useEffect(() => { localStorage.setItem('blingai_menu_colapsado', colapsado ? '1' : '0') }, [colapsado])

  // Badges vivos + pulso: contagens reais dos endpoints existentes (silencioso, sem travar UI)
  useEffect(() => {
    if (!authed) return
    let vivo = true
    const carregar = () => {
      Promise.allSettled([
        api.shopeePedidosContagens?.('A_ENVIAR', 15),
        api.mlPedidos?.(15),
        api.shopeePromoConfig?.(),
      ]).then(([sp, ml, promo]) => {
        if (!vivo) return
        const spN = sp.status === 'fulfilled' ? (sp.value?.contagens?.A_ENVIAR ?? sp.value?.total ?? 0) : 0
        const mlN = ml.status === 'fulfilled' ? (ml.value?.pedidos?.length ?? ml.value?.total ?? 0) : 0
        setBadges((b) => ({ ...b, shopeePed: spN, mlPed: mlN, pedidos: (spN || 0) + (mlN || 0) }))
      }).catch(() => {})
    }
    carregar()
    const t = setInterval(() => { if (document.visibilityState === 'visible') carregar() }, 90000)
    return () => { vivo = false; clearInterval(t) }
  }, [authed])

  // Atalho ⌘K / Ctrl+K abre a paleta de comando
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); setPaleta((v) => !v) }
      else if (e.key === 'Escape') setPaleta(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    localStorage.setItem('blingai_theme', theme)
  }, [theme])

  useEffect(() => {
    if (authed) api.blingStatus().then(setBling).catch(() => {})
  }, [authed])

  useEffect(() => {
    if (authed) api.shopeeStatus().then(setShopee).catch(() => setShopee({ ok: false }))
  }, [authed, view])

  useEffect(() => {
    const onExpirou = () => { setAuthed(false); notify('Sua sessão expirou. Entre de novo.', 'warn') }
    window.addEventListener('sessao-expirada', onExpirou)
    return () => window.removeEventListener('sessao-expirada', onExpirou)
  }, [])

  if (!authed) return <Login onAuth={() => setAuthed(true)} />

  const conectarBling = async () => {
    try {
      const { url } = await api.blingLogin()
      window.location.href = url
    } catch (e) {
      notify(e.message, 'danger')
    }
  }
  const sair = () => {
    setToken(null)
    setAuthed(false)
  }
  const blingOk = bling.autorizado && !bling.expirado

  return (
    <div className="flex h-full w-full relative z-10 text-fg">      {/* Sidebar / Trilho */}
      <MenuLateral
        view={view} setView={setView} colapsado={colapsado} setColapsado={setColapsado}
        blingOk={blingOk} shopeeOk={!!shopee?.ok} badges={badges}
        theme={theme} setTheme={setTheme} sair={sair} conectarBling={conectarBling}
        abrirPaleta={() => setPaleta(true)}
      />
      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 p-3 gap-3">
        <header className="glass rounded-2xl px-5 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="font-display font-semibold leading-tight truncate">{TITULOS[view] || 'Precifica AI'}</div>
            <div className="text-xs text-dim truncate">{DESCRICOES[view] || ''}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge ok={blingOk} on="Bling ativa" off="Bling off" />
            <StatusBadge ok={!!shopee?.ok} on="Shopee ativa" off="Shopee off" pendente={shopee && !shopee.ok && shopee.app} />
            <span className="hidden md:flex text-xs text-faint items-center gap-1.5 px-3 py-1.5 rounded-full glass">
              <CalendarDays size={13} /> {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
            </span>
            <NotificacoesGlobais ativo={authed && blingOk} onNavegar={(v) => setView(v)} />
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Suspense fallback={<div className="text-dim text-sm p-4">Carregando…</div>}>
            {view === 'dashboard' && <Dashboard />}
            {view === 'catalogo' && <Catalogo />}
            {view === 'precificacao' && <Precificacao />}
            {view === 'radar' && <Radar />}
            {view === 'nfe' && <Nfe />}
            {view === 'ia' && <CentralIa />}
            {view === 'conselho' && <Conselho />}
            {view === 'estudio' && <Estudio />}
            {view === 'agentes' && <Agentes />}
            {view === 'shopee' && <Shopee />}
            {view === 'atendimento' && <Atendimento />}
            {view === 'pedidos' && <Pedidos />}
            {view === 'promocoes' && <Promocoes />}
            {view === 'mlprodutos' && <Produtos />}
            {view === 'mlads' && <MercadoAds />}
            {view === 'configuracoes' && <Configuracoes />}
          </Suspense>
        </main>
      </div>
      {paleta && <PaletaComando onFechar={() => setPaleta(false)} ir={(v) => { setView(v); setPaleta(false) }} badges={badges} />}
    </div>
  )
}

// ===================== MENU ENTERPRISE EXTREMO =====================
const GRUPOS_MENU = [
  { titulo: 'Visão geral', itens: [
    { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ] },
  { titulo: 'Fixados', itens: [
    { view: 'pedidos', label: 'Pedidos', icon: Package, dual: true, badgeKey: 'pedidos', badgeHot: true,
      sub: [
        { label: 'Mercado Livre', dot: '#F2C200', badgeKey: 'mlPed' },
        { label: 'Shopee', dot: '#EE4D2D', badgeKey: 'shopeePed' },
        { label: 'Inteligência de vendas', chip: '→ CAMPANHAS' },
      ] },
    { view: 'promocoes', label: 'Campanhas', icon: Tag, dual: true, badgeKey: 'campanhas', badgeOk: true },
  ] },
  { titulo: 'Vendas & Operação', itens: [
    { view: 'nfe', label: 'Notas fiscais', icon: FileText, badgeKey: 'nfe' },
    { view: 'catalogo', label: 'Catálogo', icon: Boxes },
    { view: 'precificacao', label: 'Precificação', icon: Calculator },
  ] },
  { titulo: 'Crescimento', itens: [
    { view: 'mlads', label: 'Anúncios & Ads', icon: Megaphone },
    { view: 'mlprodutos', label: 'Produtos ML', icon: Globe },
  ] },
  { titulo: 'Canais', itens: [
    { view: 'shopee', label: 'Shopee', icon: ShoppingBag, canal: 'sp' },
    { view: 'atendimento', label: 'Atendimento', icon: Inbox, badgeKey: 'atend' },
  ] },
  { titulo: 'Inteligência', itens: [
    { view: 'ia', label: 'Central IA', icon: Sparkles },
    { view: 'radar', label: 'Radar', icon: SatelliteDish },
    { view: 'conselho', label: 'Conselho', icon: Crown },
    { view: 'agentes', label: 'Agentes', icon: Bot },
    { view: 'estudio', label: 'Estúdio', icon: Aperture },
  ] },
]
const TODOS_ITENS = GRUPOS_MENU.flatMap((g) => g.itens)

function MenuLateral({ view, setView, colapsado, setColapsado, blingOk, shopeeOk, badges, theme, setTheme, sair, conectarBling, abrirPaleta }) {
  if (colapsado) {
    return (
      <aside className="glass m-3 mr-0 w-[62px] rounded-2xl flex flex-col items-center py-3 px-2 shrink-0 gap-1.5">
        <div className="h-9 w-9 rounded-xl grid place-items-center text-white mb-1" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>◆</div>
        <button onClick={abrirPaleta} className="h-9 w-9 rounded-xl grid place-items-center text-faint hover:text-fg" title="Buscar (⌘K)"><Search size={16} /></button>
        <div className="w-6 h-px my-1" style={{ background: 'var(--glass-border)' }} />
        {TODOS_ITENS.map((it) => {
          const on = view === it.view
          const n = it.badgeKey ? badges[it.badgeKey] : 0
          return (
            <button key={it.view} onClick={() => setView(it.view)} title={it.label}
              className="relative h-10 w-10 rounded-xl grid place-items-center" style={on ? { background: 'linear-gradient(135deg,#d6007f,#7b2a8c)', color: '#fff' } : { color: 'var(--dim)' }}>
              <it.icon size={17} />
              {n > 0 && <span className="absolute -top-0.5 -right-0.5 text-[7px] font-bold min-w-[15px] h-[15px] px-1 rounded-full grid place-items-center" style={{ background: it.badgeOk ? 'var(--ok)' : 'var(--sp)', color: it.badgeOk ? '#0a1a0f' : '#fff', border: '2px solid var(--surface)' }}>{n > 99 ? '99' : n}</span>}
            </button>
          )
        })}
        <div className="flex-1" />
        <button onClick={() => setColapsado(false)} className="h-9 w-9 rounded-xl grid place-items-center text-faint hover:text-fg" title="Expandir menu"><ChevronsRight size={16} /></button>
        <button onClick={() => setView('configuracoes')} className="h-9 w-9 rounded-xl grid place-items-center text-faint hover:text-fg" title="Configurações"><Settings size={15} /></button>
      </aside>
    )
  }
  return (
    <aside className="m-3 mr-0 w-64 rounded-2xl flex flex-col p-3 shrink-0" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02))', border: '1px solid var(--glass-border)' }}>
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="h-9 w-9 rounded-xl grid place-items-center text-white shrink-0" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', boxShadow: '0 6px 18px rgba(214,0,127,.35)' }}>◆</div>
        <div className="flex-1 min-w-0"><div className="font-display font-bold text-[15px] leading-none">Precifica<span className="text-accent"> AI</span></div><div className="text-[7.5px] text-faint mt-0.5">sóstrass · enterprise</div></div>
        <button onClick={() => setColapsado(true)} className="w-6 h-6 rounded-md grid place-items-center text-faint hover:text-fg" style={{ border: '1px solid var(--glass-border)' }} title="Recolher para o trilho"><ChevronsLeft size={12} /></button>
      </div>

      <Pulso badges={badges} />

      <button onClick={abrirPaleta} className="flex items-center gap-2 rounded-xl px-2.5 py-2 mt-1 mb-0.5" style={{ background: 'rgba(0,0,0,.24)', border: '1px solid var(--glass-border)' }}>
        <Search size={12} className="text-faint" /><span className="flex-1 text-left text-[10px] text-faint">buscar ou comandar…</span><span className="text-[8px] font-mono px-1.5 rounded" style={{ border: '1px solid var(--glass-border)', color: 'var(--faint)' }}>⌘K</span>
      </button>

      <nav className="flex-1 overflow-auto -mx-1 px-1 mt-1 space-y-0.5">
        {GRUPOS_MENU.map((g) => (
          <GrupoMenu key={g.titulo} titulo={g.titulo}>
            {g.itens.map((it) => <ItemMenu key={it.view} it={it} on={view === it.view} onClick={() => setView(it.view)} badges={badges} shopeeOk={shopeeOk} view={view} setView={setView} />)}
          </GrupoMenu>
        ))}
      </nav>

      <div className="rounded-xl px-2.5 py-2 mt-1 flex items-center gap-1.5" style={{ background: 'rgba(0,0,0,.24)', border: '1px solid var(--glass-border)' }}>
        <PulsoDot ok={blingOk} /><span className="text-[8.5px] text-dim">Bling</span>
        <PulsoDot ok={shopeeOk} /><span className="text-[8.5px] text-dim">Shopee</span>
        <PulsoDot ok /><span className="text-[8.5px] text-dim">ML</span>
        <span className="flex-1" /><span className="text-[6.5px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ color: 'var(--ok)', background: 'rgba(47,217,141,.12)' }}>no ar</span>
      </div>

      <div className="flex gap-2 mt-2">
        {!blingOk && <button onClick={conectarBling} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-medium text-white" style={{ background: 'var(--accent)' }}><Plug size={14} /> Conectar Bling</button>}
        {blingOk && <button onClick={() => setView('configuracoes')} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] text-dim hover:text-fg" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}><Settings size={14} /> Configurações</button>}
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="glass rounded-xl py-2 px-3 grid place-items-center text-dim hover:text-fg" title="Tema">{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}</button>
        <button onClick={sair} className="glass rounded-xl py-2 px-3 grid place-items-center text-danger" title="Sair"><LogOut size={15} /></button>
      </div>
    </aside>
  )
}

function PulsoDot({ ok }) {
  const cor = ok ? 'var(--ok)' : 'var(--faint)'
  return <span className="relative flex h-2 w-2">{ok && <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: cor }} />}<span className="relative inline-flex rounded-full h-2 w-2" style={{ background: cor }} /></span>
}

function Pulso({ badges }) {
  const [gmv, setGmv] = useState(null)
  const [corte, setCorte] = useState(null)
  useEffect(() => {
    let vivo = true
    api.shopeePromoConfig?.().catch(() => {})  // aquece a sessão
    Promise.allSettled([api.mlPedidos?.(1)]).then(() => {})
    // GMV do dia: soma leve via contagens (indicador); corte: 18h como referência da coleta
    const agora = new Date()
    const alvoCorte = new Date(agora); alvoCorte.setHours(18, 0, 0, 0)
    const tick = () => { if (!vivo) return; const ms = alvoCorte - new Date(); setCorte(ms > 0 ? ms : 0) }
    tick(); const t = setInterval(tick, 30000)
    return () => { vivo = false; clearInterval(t) }
  }, [])
  const fmtCorte = (ms) => { if (ms == null) return '—'; if (ms <= 0) return 'coleta encerrada'; const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); return `em ${h}h ${String(m).padStart(2, '0')}m` }
  const totalPed = badges.pedidos || 0
  return (
    <div className="rounded-xl px-2.5 py-2 mt-1" style={{ background: 'rgba(0,0,0,.3)', border: '1px solid var(--glass-border)' }}>
      <div className="flex items-center gap-1.5 mb-1.5"><PulsoDot ok /><span className="text-[7px] font-bold uppercase tracking-widest text-faint">pulso da operação</span></div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-dim flex items-center gap-1"><Package size={10} /> A despachar</span>
        <b className="num text-[13px]" style={{ color: totalPed > 0 ? 'var(--accent2, #d6007f)' : 'var(--faint)' }}>{totalPed}</b>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[9px] text-dim flex items-center gap-1"><Clock size={10} /> Corte da coleta</span>
        <b className="num text-[10px]" style={{ color: 'var(--warn)' }}>{fmtCorte(corte)}</b>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[9px] text-dim flex items-center gap-1"><Bot size={10} /> Agentes</span>
        <b className="text-[9px]" style={{ color: 'var(--ok)' }}>no ritmo</b>
      </div>
    </div>
  )
}

function GrupoMenu({ titulo, children }) {
  const [aberto, setAberto] = useState(true)
  return (
    <div>
      <button onClick={() => setAberto((v) => !v)} className="w-full flex items-center gap-1.5 px-2.5 pt-2.5 pb-1 text-[7.5px] font-bold uppercase tracking-widest text-faint">
        <ChevronDown size={9} style={{ transform: aberto ? 'none' : 'rotate(-90deg)', transition: 'transform .15s' }} />
        {titulo}<span className="flex-1 h-px" style={{ background: 'linear-gradient(90deg,var(--glass-border),transparent)' }} />
      </button>
      {aberto && <div className="space-y-0.5">{children}</div>}
    </div>
  )
}

function ItemMenu({ it, on, onClick, badges, shopeeOk, view, setView }) {
  const n = it.badgeKey ? badges[it.badgeKey] : 0
  return (
    <div>
      <button onClick={onClick} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl relative overflow-hidden text-left" style={on ? { background: 'linear-gradient(100deg,rgba(214,0,127,.95),rgba(123,42,140,.9))', color: '#fff', boxShadow: '0 8px 20px rgba(214,0,127,.3)' } : { color: 'var(--dim)' }}>
        <span className="w-[19px] flex justify-center shrink-0" style={it.canal === 'sp' ? { color: on ? '#fff' : '#EE4D2D' } : undefined}><it.icon size={15} /></span>
        <span className="flex-1 text-[12px] font-medium flex items-center gap-1.5 min-w-0"><span className="truncate">{it.label}</span>{it.dual && <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: on ? 'rgba(255,255,255,.22)' : 'linear-gradient(90deg,#F2C200,#EE4D2D)', color: on ? '#fff' : '#1a1008' }}>ML ⇄ SP</span>}</span>
        {it.canal === 'sp' && <PulsoDot ok={shopeeOk} />}
        {n > 0 && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: it.badgeHot ? 'var(--sp)' : it.badgeOk ? 'rgba(47,217,141,.2)' : 'rgba(255,255,255,.12)', color: it.badgeHot ? '#fff' : it.badgeOk ? 'var(--ok)' : (on ? '#fff' : 'var(--dim)') }}>{n > 99 ? '99+' : n}</span>}
      </button>
      {on && it.sub && (
        <div className="ml-[26px] mt-0.5 mb-1 space-y-0.5 pl-2" style={{ borderLeft: '1px solid rgba(214,0,127,.25)' }}>
          {it.sub.map((s, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10.5px] text-dim">
              {s.dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />}
              <span className="flex-1 truncate">{s.label}</span>
              {s.badgeKey && badges[s.badgeKey] > 0 && <span className="num text-[8.5px] text-faint">{badges[s.badgeKey]}</span>}
              {s.chip && <span className="text-[6px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: '#fff', background: 'var(--accent)' }}>{s.chip}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PaletaComando({ onFechar, ir, badges }) {
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus() }, [])
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const destinos = TODOS_ITENS.map((it) => ({ view: it.view, label: it.label, icon: it.icon, badge: it.badgeKey ? badges[it.badgeKey] : 0 }))
  const filtrados = q ? destinos.filter((d) => norm(d.label).includes(norm(q))) : destinos
  useEffect(() => { setIdx(0) }, [q])
  const escolher = (d) => d && ir(d.view)
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(filtrados.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); escolher(filtrados[idx]) }
  }
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4" style={{ background: 'rgba(0,0,0,.55)' }} onClick={onFechar}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: 'rgba(21,13,27,.98)', border: '1px solid rgba(214,0,127,.4)', boxShadow: '0 24px 60px rgba(0,0,0,.6)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 px-3.5 py-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
          <Search size={15} style={{ color: 'var(--accent)' }} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Ir para…" className="flex-1 bg-transparent text-[13px] outline-none text-fg" />
          <span className="text-[8px] font-mono px-1.5 rounded" style={{ border: '1px solid var(--glass-border)', color: 'var(--faint)' }}>esc</span>
        </div>
        <div className="max-h-[46vh] overflow-auto py-1.5">
          {filtrados.length === 0 && <div className="px-4 py-6 text-center text-[11px] text-faint">Nada encontrado para “{q}”.</div>}
          {filtrados.map((d, i) => (
            <button key={d.view} onMouseEnter={() => setIdx(i)} onClick={() => escolher(d)} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left" style={i === idx ? { background: 'rgba(214,0,127,.14)' } : undefined}>
              <d.icon size={14} style={{ color: i === idx ? 'var(--accent)' : 'var(--faint)' }} />
              <span className="flex-1 text-[12px]" style={{ color: i === idx ? 'var(--fg)' : 'var(--dim)' }}>{d.label}</span>
              {d.badge > 0 && <span className="num text-[9px] text-faint">{d.badge}</span>}
              {i === idx && <CornerDownLeft size={12} className="text-faint" />}
            </button>
          ))}
        </div>
        <div className="flex gap-3 px-3.5 py-2 text-[8px] text-faint" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <span>↑↓ navegar</span><span>↵ abrir</span><span>esc fechar</span>
        </div>
      </div>
    </div>
  )
}

function NavSecao({ children }) {
  return <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-faint select-none">{children}</div>
}

function StatusBadge({ ok, on, off, pendente }) {
  const cor = ok ? 'var(--ok)' : pendente ? 'var(--warn)' : 'var(--faint)'
  return (
    <span className="text-xs font-medium px-2.5 py-1.5 rounded-full glass flex items-center gap-1.5" title={ok ? on : off}>
      <span className="relative flex h-2 w-2">
        {ok && <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: cor }} />}
        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: cor }} />
      </span>
      <span className="hidden sm:inline">{ok ? on : pendente ? 'Shopee pendente' : off}</span>
    </span>
  )
}

function NavItem({ icon, label, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`group relative w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-150 ${active ? 'text-white' : 'text-dim hover:text-fg hover:bg-[var(--glass-hover)]'}`}
      style={active ? { background: 'var(--accent)', boxShadow: '0 4px 14px -4px var(--accent)' } : undefined}
    >
      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-white/90" />}
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 text-left truncate">{label}</span>
      {badge != null && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={active ? { background: 'rgba(255,255,255,.25)', color: '#fff' } : { background: 'var(--accent)', color: '#fff' }}>
          {badge}
        </span>
      )}
    </button>
  )
}
