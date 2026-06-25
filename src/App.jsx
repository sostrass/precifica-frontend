import { useEffect, useState, lazy, Suspense } from 'react'
import { LayoutDashboard, Boxes, Calculator, SatelliteDish, FileText, Sparkles, Aperture, Bot, Settings, Sun, Moon, LogOut, Plug, ShoppingBag, CalendarDays, Crown } from 'lucide-react'
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

const TITULOS = {
  dashboard: 'Inteligência Comercial',
  catalogo: 'Catálogo',
  shopee: 'Shopee',
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
    <div className="flex h-full w-full relative z-10 text-fg">
      {/* Sidebar */}
      <aside className="glass m-3 mr-0 w-60 rounded-2xl flex flex-col p-4 shrink-0">
        <div className="flex items-center gap-2 px-2 py-3">
          <div
            className="h-9 w-9 rounded-xl grid place-items-center text-lg"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}
          >
            ◆
          </div>
          <div className="font-display font-bold text-lg leading-none">
            Precifica<span className="text-accent"> AI</span>
          </div>
        </div>

        <nav className="mt-4 space-y-1">
          <NavSecao>Visão geral</NavSecao>
          <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <NavSecao>Operação</NavSecao>
          <NavItem icon={<Boxes size={18} />} label="Catálogo" active={view === 'catalogo'} onClick={() => setView('catalogo')} />
          <NavItem icon={<Calculator size={18} />} label="Precificação" active={view === 'precificacao'} onClick={() => setView('precificacao')} />
          <NavItem icon={<FileText size={18} />} label="Notas fiscais" active={view === 'nfe'} onClick={() => setView('nfe')} />
          <NavSecao>Canais</NavSecao>
          <NavItem icon={<ShoppingBag size={18} />} label="Shopee" active={view === 'shopee'} onClick={() => setView('shopee')} />
          <NavItem icon={<SatelliteDish size={18} />} label="Radar" active={view === 'radar'} onClick={() => setView('radar')} />
          <NavSecao>Inteligência</NavSecao>
          <NavItem icon={<Sparkles size={18} />} label="Central IA" active={view === 'ia'} onClick={() => setView('ia')} />
          <NavItem icon={<Crown size={18} />} label="Conselho" active={view === 'conselho'} onClick={() => setView('conselho')} />
          <NavItem icon={<Bot size={18} />} label="Agentes" active={view === 'agentes'} onClick={() => setView('agentes')} />
          <NavItem icon={<Aperture size={18} />} label="Estúdio" active={view === 'estudio'} onClick={() => setView('estudio')} />
          <NavSecao>Conta</NavSecao>
          <NavItem icon={<Settings size={18} />} label="Configurações" active={view === 'configuracoes'} onClick={() => setView('configuracoes')} />
        </nav>

        <div className="mt-auto space-y-2">
          <button
            onClick={conectarBling}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium text-white"
            style={{ background: 'var(--accent)' }}
          >
            <Plug size={16} /> {blingOk ? 'Bling conectado' : 'Conectar Bling'}
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="glass flex-1 rounded-xl py-2 grid place-items-center text-dim hover:text-fg"
              title="Alternar tema"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={sair} className="glass rounded-xl py-2 px-3 grid place-items-center text-danger" title="Sair">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

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
            <NotificacoesGlobais ativo={authed && blingOk} onIrParaNfe={() => setView('nfe')} />
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
            {view === 'configuracoes' && <Configuracoes />}
          </Suspense>
        </main>
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
