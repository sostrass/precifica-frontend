import { useEffect, useState, lazy, Suspense } from 'react'
import { LayoutDashboard, Boxes, Calculator, SatelliteDish, Settings, Sun, Moon, LogOut, Plug } from 'lucide-react'
import { api, getToken, setToken } from './api.js'
import { useToast } from './toast.jsx'
import Login from './Login.jsx'

const Dashboard = lazy(() => import('./Dashboard.jsx'))
const Catalogo = lazy(() => import('./Catalogo.jsx'))
const Precificacao = lazy(() => import('./Precificacao.jsx'))
const Radar = lazy(() => import('./Radar.jsx'))
const Configuracoes = lazy(() => import('./Configuracoes.jsx'))

const TITULOS = {
  dashboard: 'Inteligência Comercial',
  catalogo: 'Catálogo',
  precificacao: 'Precificação por canal',
  radar: 'Radar de mercado',
  configuracoes: 'Configurações',
}

export default function App() {
  const notify = useToast()
  const [theme, setTheme] = useState(() => localStorage.getItem('blingai_theme') || 'dark')
  const [authed, setAuthed] = useState(!!getToken())
  const [view, setView] = useState('dashboard')
  const [bling, setBling] = useState({ autorizado: false })

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    localStorage.setItem('blingai_theme', theme)
  }, [theme])

  useEffect(() => {
    if (authed) api.blingStatus().then(setBling).catch(() => {})
  }, [authed])

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
          <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <NavItem icon={<Boxes size={18} />} label="Catálogo" active={view === 'catalogo'} onClick={() => setView('catalogo')} />
          <NavItem icon={<Calculator size={18} />} label="Precificação" active={view === 'precificacao'} onClick={() => setView('precificacao')} />
          <NavItem icon={<SatelliteDish size={18} />} label="Radar" active={view === 'radar'} onClick={() => setView('radar')} />
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
        <header className="glass rounded-2xl px-5 py-3 flex items-center justify-between">
          <div className="font-display font-semibold">
            {TITULOS[view] || 'Precifica AI'}
          </div>
          <span className="text-xs font-medium px-3 py-1 rounded-full glass flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: blingOk ? 'var(--ok)' : 'var(--faint)' }} />
            {blingOk ? 'API Bling ativa' : 'Bling desconectado'}
          </span>
        </header>

        <main className="flex-1 overflow-auto">
          <Suspense fallback={<div className="text-dim text-sm p-4">Carregando…</div>}>
            {view === 'dashboard' && <Dashboard />}
            {view === 'catalogo' && <Catalogo />}
            {view === 'precificacao' && <Precificacao />}
            {view === 'radar' && <Radar />}
            {view === 'configuracoes' && <Configuracoes />}
          </Suspense>
        </main>
      </div>
    </div>
  )
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${active ? 'text-white' : 'text-dim hover:text-fg hover:bg-[var(--glass-hover)]'}`}
      style={active ? { background: 'var(--accent)' } : undefined}
    >
      {icon} {label}
    </button>
  )
}
