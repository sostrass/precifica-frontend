import { useEffect, useMemo, useState } from 'react'
import {
  Rocket, Star, Activity, ShoppingBag, Tag, Megaphone, Package,
  Plus, X, Pin, PinOff, Play, Loader2, Zap, Clock, CheckCircle2,
  AlertTriangle, Plug, RefreshCw, Wand2, ChevronRight, Flame,
  HelpCircle, GitCompareArrows, Undo2, TrendingUp, TrendingDown, Trash2, Calendar,
  Stethoscope, XCircle, ShieldAlert, CircleDot,
} from 'lucide-react'
import { api } from './api'
import { useToast } from './toast.jsx'

const LARANJA = '#EE4D2D'

const brl = (v) => (v == null || v === '' ? '—' : 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

/* Countdown de 4h por item impulsionado */
function Countdown({ iso }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [])
  if (!iso) return null
  const ms = new Date(iso) - new Date()
  if (ms <= 0) return <span className="num" style={{ color: 'var(--accent2)' }}>renovando…</span>
  const tot = 4 * 3600 * 1000
  const pct = Math.max(0, Math.min(100, (ms / tot) * 100))
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-9 w-9 shrink-0">
        <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="var(--glass-border)" strokeWidth="3" />
          <circle cx="18" cy="18" r="15" fill="none" stroke={LARANJA} strokeWidth="3"
                  strokeDasharray={`${(pct / 100) * 94.2} 94.2`} strokeLinecap="round" />
        </svg>
        <Flame size={13} className="absolute inset-0 m-auto" style={{ color: LARANJA }} />
      </div>
      <span className="num text-sm font-semibold tabular-nums" style={{ color: LARANJA }}>
        {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </span>
    </div>
  )
}

const TABS = [
  { id: 'diagnostico', label: 'Diagnóstico', icon: Stethoscope, destaque: true },
  { id: 'boost', label: 'Boost', icon: Rocket },
  { id: 'avaliacoes', label: 'Avaliações', icon: Star },
  { id: 'qa', label: 'Perguntas', icon: HelpCircle },
  { id: 'catalogo', label: 'Bling × Shopee', icon: GitCompareArrows },
  { id: 'promocoes', label: 'Promoções', icon: Tag },
  { id: 'ads', label: 'Shopee Ads', icon: Megaphone },
  { id: 'pedidos', label: 'Pedidos & Financeiro', icon: ShoppingBag },
  { id: 'devolucoes', label: 'Devoluções', icon: Undo2 },
  { id: 'saude', label: 'Saúde da loja', icon: Activity },
]

export default function Shopee() {
  const notify = useToast()
  const [aba, setAba] = useState('diagnostico')
  const [status, setStatus] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    api.shopeeStatus().then(setStatus).catch(() => setStatus({ configurada: false }))
      .finally(() => setCarregando(false))
  }, [])

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl grid place-items-center" style={{ background: LARANJA }}>
            <ShoppingBag size={20} className="text-white" />
          </div>
          <div>
            <div className="font-display font-semibold text-lg leading-tight">Shopee</div>
            <ConexaoChip status={status} carregando={carregando} />
          </div>
        </div>
      </div>

      {!carregando && !status?.ok && <ConectarShopee status={status} onSaved={() => api.shopeeStatus().then(setStatus)} />}

      {/* Abas */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map((t) => {
          const on = aba === t.id
          const Ic = t.icon
          return (
            <button key={t.id} onClick={() => setAba(t.id)}
                    className="rounded-xl px-3.5 py-2 text-sm font-medium flex items-center gap-2 transition-all"
                    style={on
                      ? { background: LARANJA, color: '#fff' }
                      : { background: 'var(--glass)', color: 'var(--text-dim)', border: '1px solid var(--glass-border)' }}>
              <Ic size={15} />{t.label}
              {t.destaque && !on && <span className="text-[9px] px-1 rounded" style={{ background: 'rgba(238,77,45,.15)', color: LARANJA }}>auto</span>}
            </button>
          )
        })}
      </div>

      {aba === 'diagnostico' && <Diagnostico status={status} />}
      {aba === 'boost' && <BoostCenter conectado={status?.ok} notify={notify} />}
      {aba === 'avaliacoes' && <Avaliacoes conectado={status?.ok} notify={notify} />}
      {aba === 'qa' && <Perguntas conectado={status?.ok} notify={notify} />}
      {aba === 'catalogo' && <Divergencia conectado={status?.ok} />}
      {aba === 'promocoes' && <Promocoes conectado={status?.ok} notify={notify} />}
      {aba === 'ads' && <Ads conectado={status?.ok} />}
      {aba === 'pedidos' && <Pedidos conectado={status?.ok} />}
      {aba === 'devolucoes' && <Devolucoes conectado={status?.ok} />}
      {aba === 'saude' && <SaudeLoja conectado={status?.ok} />}
    </div>
  )
}

function ConexaoChip({ status, carregando }) {
  if (carregando) return <span className="text-xs text-faint flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> verificando…</span>
  if (status?.ok) return <span className="text-xs flex items-center gap-1" style={{ color: 'var(--accent2)' }}><CheckCircle2 size={12} /> {status?.nome_loja || `loja ${status?.shop_id}`} conectada</span>
  if (status?.app) return <span className="text-xs flex items-center gap-1" style={{ color: 'var(--warn)' }}><AlertTriangle size={12} /> app pronto, loja não autorizada</span>
  return <span className="text-xs flex items-center gap-1" style={{ color: 'var(--faint)' }}><Plug size={12} /> não configurada</span>
}

function ConectarShopee({ status, onSaved }) {
  const notify = useToast()
  const [shop, setShop] = useState('')
  const [at, setAt] = useState('')
  const [rt, setRt] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [manual, setManual] = useState(false)
  const [conectando, setConectando] = useState(false)

  const conectarOAuth = async () => {
    setConectando(true)
    try {
      const { url } = await api.shopeeAuthLogin()
      const pop = window.open(url, 'shopee_auth', 'width=520,height=720,menubar=no,toolbar=no')
      const cleanup = () => { window.removeEventListener('message', onMsg); clearInterval(timer); setConectando(false) }
      const onMsg = (e) => {
        if (e.data === 'shopee_auth_ok') { cleanup(); notify('Loja Shopee conectada!', 'ok'); onSaved?.() }
        else if (e.data === 'shopee_auth_err') { cleanup(); notify('Não foi possível conectar. Tente novamente.', 'danger') }
      }
      const timer = setInterval(() => { if (pop && pop.closed) { cleanup(); onSaved?.() } }, 1200)
      window.addEventListener('message', onMsg)
    } catch (e) { notify(e.message, 'danger'); setConectando(false) }
  }

  const salvarManual = async () => {
    if (!shop || !at) return notify('Informe shop_id e access_token', 'warn')
    setSalvando(true)
    try {
      await api.shopeeConectar({ shop_id: shop, access_token: at, refresh_token: rt })
      notify('Loja Shopee conectada', 'ok'); onSaved?.()
    } catch (e) { notify(e.message, 'danger') }
    setSalvando(false)
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-3" style={{ border: `1px solid ${LARANJA}` }}>
      {!status?.app ? (
        <div className="text-sm" style={{ color: 'var(--warn)' }}>
          Faltam <b>SHOPEE_PARTNER_ID</b> e <b>SHOPEE_PARTNER_KEY</b> no servidor (Railway). Defina e reinicie o backend.
        </div>
      ) : (
        <>
          <div className="text-sm text-dim">Conecte sua loja autorizando o app na Shopee. Depois disso, o token é renovado sozinho.</div>
          <button onClick={conectarOAuth} disabled={conectando}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60 w-full justify-center"
                  style={{ background: LARANJA }}>
            {conectando ? <Loader2 size={16} className="animate-spin" /> : <ShoppingBag size={16} />} Conectar com a Shopee
          </button>
          <div className="text-[11px] text-faint">Cadastre a URL de redirect <span className="num">…/api/shopee/auth/callback</span> nas configurações do seu app na Shopee Open Platform.</div>

          <button onClick={() => setManual((m) => !m)} className="text-xs text-dim hover:text-fg flex items-center gap-1">
            <ChevronRight size={12} style={{ transform: manual ? 'rotate(90deg)' : 'none' }} /> ou colar o token manualmente
          </button>
          {manual && (
            <div className="space-y-2 pt-1">
              <div className="grid sm:grid-cols-3 gap-2">
                <input value={shop} onChange={(e) => setShop(e.target.value)} placeholder="shop_id" className={INP} />
                <input value={at} onChange={(e) => setAt(e.target.value)} placeholder="access_token" className={`${INP} sm:col-span-2`} />
              </div>
              <input value={rt} onChange={(e) => setRt(e.target.value)} placeholder="refresh_token (recomendado)" className={INP} />
              <button onClick={salvarManual} disabled={salvando}
                      className="rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 disabled:opacity-60"
                      style={{ background: 'var(--glass-hover)', color: LARANJA, border: `1px solid ${LARANJA}` }}>
                {salvando ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} />} Salvar token manual
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ----------------------------- BOOST CENTER ------------------------------ */
const CRITERIOS = [
  { id: 'prioridade', t: 'Prioridade manual' },
  { id: 'margem', t: 'Maior margem' },
  { id: 'giro', t: 'Maior estoque' },
]

function BoostCenter({ conectado, notify }) {
  const [bs, setBs] = useState(null)
  const [rodando, setRodando] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const carregar = () => api.shopeeBoostStatus().then(setBs).catch(() => {})
  useEffect(() => {
    carregar()
    const t = setInterval(carregar, 15000)
    return () => clearInterval(t)
  }, [])

  const setConfig = async (patch) => {
    setBs((b) => ({ ...b, ...patch }))
    try { await api.shopeeBoostConfig(patch) } catch (e) { notify(e.message, 'danger'); carregar() }
  }
  const rodarAgora = async () => {
    setRodando(true)
    try {
      const r = await api.shopeeBoostRodar()
      notify(r.acao === 'impulsionado' ? `${r.itens.length} produto(s) impulsionado(s)!`
        : r.acao === 'cheio' ? 'Já está com 5 impulsionando — aguardando vaga.'
        : r.acao === 'ocioso' ? 'Motor desligado ou fora da janela de horário.'
        : 'Nada na fila para impulsionar.', r.acao === 'impulsionado' ? 'ok' : 'warn')
      carregar()
    } catch (e) { notify(e.message, 'danger') }
    setRodando(false)
  }
  const fixar = async (id, fixo) => { try { await api.shopeeBoostFixar(id, fixo); carregar() } catch (e) { notify(e.message, 'danger') } }
  const remover = async (id) => { try { await api.shopeeBoostRemove(id); carregar() } catch (e) { notify(e.message, 'danger') } }

  const ativos = bs?.impulsionando || []
  const fila = bs?.fila || []
  const proximo = fila[0]

  return (
    <div className="space-y-4">
      {/* HERO — liga/desliga + resumo */}
      <div className="rounded-2xl p-5 relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg, rgba(238,77,45,.14), rgba(238,77,45,.03))', border: `1px solid ${LARANJA}` }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl grid place-items-center" style={{ background: LARANJA }}>
              <Rocket size={24} className="text-white" />
            </div>
            <div>
              <div className="font-display font-semibold text-lg">Auto-boost rotativo</div>
              <div className="text-sm text-dim">Impulsiona 5 produtos a cada 4h em rodízio, sozinho — 24h por dia.</div>
            </div>
          </div>
          <button onClick={() => setConfig({ ativo: !bs?.ativo })} disabled={!conectado}
                  className="relative inline-flex items-center rounded-full transition-colors disabled:opacity-50"
                  style={{ width: 64, height: 34, background: bs?.ativo ? LARANJA : 'var(--glass-border)' }}>
            <span className="absolute rounded-full bg-white shadow transition-all"
                  style={{ width: 28, height: 28, top: 3, left: bs?.ativo ? 33 : 3 }} />
          </button>
        </div>

        {/* métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <Metric n={ativos.length} sub="impulsionando" cor={LARANJA} icon={Flame} />
          <Metric n={fila.length} sub="na fila" icon={Clock} />
          <Metric n={bs?.fixos ?? 0} sub="fixos (pin)" icon={Pin} />
          <Metric n={bs?.total ?? 0} sub="na lista" icon={Package} />
        </div>

        {bs?.ativo
          ? <div className="text-xs mt-3 flex items-center gap-1.5" style={{ color: 'var(--accent2)' }}>
              <CheckCircle2 size={13} /> Motor ligado. {proximo ? <>Próximo a entrar: <b className="ml-1">{proximo.nome || proximo.item_id}</b></> : 'Todos impulsionados ou fila vazia.'}
            </div>
          : <div className="text-xs mt-3 flex items-center gap-1.5 text-faint"><AlertTriangle size={13} /> Motor desligado — nenhum boost automático está acontecendo.</div>}
      </div>

      {/* Config */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm font-medium flex items-center gap-2"><Zap size={15} style={{ color: LARANJA }} /> Regras do rodízio</div>
          <button onClick={rodarAgora} disabled={rodando || !conectado}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 disabled:opacity-60"
                  style={{ background: 'var(--glass-hover)', color: LARANJA, border: `1px solid ${LARANJA}` }}>
            {rodando ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Rodar agora
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-faint mb-1.5">Quem entra primeiro</div>
            <div className="flex gap-1.5 flex-wrap">
              {CRITERIOS.map((c) => (
                <button key={c.id} onClick={() => setConfig({ criterio: c.id })}
                        className="text-xs px-2.5 py-1.5 rounded-lg font-medium"
                        style={bs?.criterio === c.id
                          ? { background: LARANJA, color: '#fff' }
                          : { background: 'var(--glass-hover)', color: 'var(--text-dim)', border: '1px solid var(--glass-border)' }}>
                  {c.t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-faint mb-1.5">Janela de horário (0 e 0 = sempre)</div>
            <div className="flex items-center gap-2">
              <HoraInput v={bs?.janela_inicio ?? 0} on={(h) => setConfig({ janela_inicio: h })} /> <span className="text-faint text-sm">até</span>
              <HoraInput v={bs?.janela_fim ?? 0} on={(h) => setConfig({ janela_fim: h })} />
              <span className="text-xs text-faint">impulsiona só nesse intervalo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Impulsionando agora */}
      <div className="glass rounded-2xl p-4">
        <div className="text-sm font-medium mb-3 flex items-center gap-2"><Flame size={15} style={{ color: LARANJA }} /> Impulsionando agora <span className="text-faint">({ativos.length}/5)</span></div>
        {ativos.length === 0
          ? <div className="text-sm text-faint py-6 text-center">Nenhum produto impulsionado no momento.</div>
          : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ativos.map((i) => (
                <div key={i.item_id} className="rounded-xl p-3 flex items-center gap-3"
                     style={{ background: 'var(--glass-hover)', border: `1px solid ${LARANJA}33` }}>
                  <Countdown iso={i.termina_em} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate flex items-center gap-1">
                      {i.fixo && <Pin size={11} style={{ color: LARANJA }} />}{i.nome || i.item_id}
                    </div>
                    <div className="text-[11px] text-faint num">{i.impulsos} impulso(s) • #{i.item_id}</div>
                  </div>
                </div>
              ))}
            </div>}
      </div>

      {/* Fila + adicionar */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium flex items-center gap-2"><Clock size={15} className="text-dim" /> Fila de rodízio <span className="text-faint">({fila.length})</span></div>
          <button onClick={() => setAddOpen(true)} disabled={!conectado}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-white flex items-center gap-1.5 disabled:opacity-60"
                  style={{ background: LARANJA }}>
            <Plus size={14} /> Adicionar produtos
          </button>
        </div>
        {fila.length === 0
          ? <div className="text-sm text-faint py-6 text-center">Fila vazia. Adicione produtos da sua loja Shopee para o rodízio.</div>
          : <div className="space-y-1.5">
              {fila.map((i, idx) => (
                <div key={i.item_id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: 'var(--glass-hover)' }}>
                  <span className="num text-xs text-faint w-5">{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{i.nome || i.item_id}</div>
                    <div className="text-[11px] text-faint num">#{i.item_id} • {i.impulsos} impulso(s){i.prioridade ? ` • prioridade ${i.prioridade}` : ''}</div>
                  </div>
                  <button onClick={() => fixar(i.item_id, true)} title="Fixar (sempre impulsionar)"
                          className="text-faint hover:text-fg p-1"><Pin size={15} /></button>
                  <button onClick={() => remover(i.item_id)} title="Remover" className="text-faint hover:text-danger p-1"><X size={15} /></button>
                </div>
              ))}
            </div>}
      </div>

      {addOpen && <AddProdutos onClose={() => setAddOpen(false)} onAdded={() => { setAddOpen(false); carregar() }} notify={notify} />}
    </div>
  )
}

function Metric({ n, sub, cor, icon: Ic }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--glass)' }}>
      <div className="flex items-center gap-1.5 text-[11px] text-faint uppercase tracking-wide">{Ic && <Ic size={12} />}{sub}</div>
      <div className="font-display font-bold text-2xl num mt-0.5" style={{ color: cor || 'var(--text)' }}>{n}</div>
    </div>
  )
}

function HoraInput({ v, on }) {
  return (
    <select value={v} onChange={(e) => on(Number(e.target.value))}
            className="glass rounded-lg px-2 py-1.5 text-sm bg-transparent outline-none">
      {Array.from({ length: 24 }).map((_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}h</option>)}
    </select>
  )
}

function AddProdutos({ onClose, onAdded, notify }) {
  const [itens, setItens] = useState(null)
  const [sel, setSel] = useState(() => new Set())
  const [salvando, setSalvando] = useState(false)
  useEffect(() => {
    api.shopeeProdutos().then((r) => {
      const lista = r?.response?.item || r?.item || []
      setItens(lista.map((x) => ({ item_id: x.item_id, nome: x.item_name || `#${x.item_id}` })))
    }).catch(() => setItens([]))
  }, [])
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const salvar = async () => {
    const escolhidos = (itens || []).filter((i) => sel.has(i.item_id))
    if (!escolhidos.length) return
    setSalvando(true)
    try { await api.shopeeBoostAdd(escolhidos); notify(`${escolhidos.length} produto(s) na lista de boost`, 'ok'); onAdded() }
    catch (e) { notify(e.message, 'danger') }
    setSalvando(false)
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: 'rgba(0,0,0,.5)' }} onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col" style={{ background: "var(--bg-elev, var(--glass))", backdropFilter: "blur(20px)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-glassb">
          <div className="font-display font-semibold">Adicionar ao rodízio de boost</div>
          <button onClick={onClose} className="text-faint hover:text-fg"><X size={18} /></button>
        </div>
        <div className="p-3 overflow-y-auto flex-1">
          {itens === null
            ? <div className="py-10 text-center text-faint flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> carregando seus anúncios…</div>
            : itens.length === 0
              ? <div className="py-10 text-center text-faint text-sm">Não consegui listar os anúncios da Shopee. Verifique a conexão da loja.</div>
              : <div className="space-y-1">
                  {itens.map((i) => (
                    <button key={i.item_id} onClick={() => toggle(i.item_id)}
                            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left"
                            style={{ background: sel.has(i.item_id) ? 'rgba(238,77,45,.12)' : 'var(--glass-hover)' }}>
                      <span className="h-4 w-4 rounded grid place-items-center shrink-0"
                            style={{ background: sel.has(i.item_id) ? LARANJA : 'transparent', border: `1px solid ${sel.has(i.item_id) ? LARANJA : 'var(--glass-border)'}` }}>
                        {sel.has(i.item_id) && <CheckCircle2 size={11} className="text-white" />}
                      </span>
                      <span className="text-sm truncate flex-1">{i.nome}</span>
                      <span className="text-[11px] text-faint num">#{i.item_id}</span>
                    </button>
                  ))}
                </div>}
        </div>
        <div className="p-3 border-t border-glassb flex items-center justify-between">
          <span className="text-xs text-faint">{sel.size} selecionado(s) • até 30 no rodízio</span>
          <button onClick={salvar} disabled={salvando || !sel.size}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white flex items-center gap-2 disabled:opacity-60" style={{ background: LARANJA }}>
            {salvando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Adicionar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------- AVALIAÇÕES -------------------------------- */
function Avaliacoes({ conectado, notify }) {
  const [filtro, setFiltro] = useState('UNANSWERED')
  const [dados, setDados] = useState(null)
  const [respondendo, setRespondendo] = useState(null)

  const carregar = () => { setDados(null); api.shopeeAvaliacoes(filtro).then(setDados).catch(() => setDados({ erro: true })) }
  useEffect(carregar, [filtro])

  const itens = dados?.response?.item_comment_list || dados?.item_comment_list || []

  const responder = async (c, ia) => {
    setRespondendo(c.comment_id)
    try {
      const r = await api.shopeeResponder({ comment_id: c.comment_id, ia, nota: c.rating_star, comentario: c.comment })
      notify('Resposta enviada' + (ia ? ' (gerada por IA)' : ''), 'ok'); carregar()
    } catch (e) { notify(e.message, 'danger') }
    setRespondendo(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {[['UNANSWERED', 'Sem resposta'], ['ANSWERED', 'Respondidas'], ['ALL', 'Todas']].map(([id, t]) => (
          <button key={id} onClick={() => setFiltro(id)} className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={filtro === id ? { background: LARANJA, color: '#fff' } : { background: 'var(--glass)', color: 'var(--text-dim)', border: '1px solid var(--glass-border)' }}>{t}</button>
        ))}
      </div>
      {!conectado && <div className="text-sm text-faint py-6 text-center glass rounded-2xl">Conecte a loja Shopee para ver as avaliações.</div>}
      {conectado && dados === null && <div className="py-10 text-center text-faint flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> carregando avaliações…</div>}
      {conectado && itens.length === 0 && dados !== null && <div className="text-sm text-faint py-6 text-center glass rounded-2xl">Nenhuma avaliação {filtro === 'UNANSWERED' ? 'sem resposta' : ''} no momento.</div>}
      <div className="space-y-2">
        {itens.map((c) => (
          <div key={c.comment_id} className="glass rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} fill={i < (c.rating_star || 0) ? LARANJA : 'none'} style={{ color: LARANJA }} />)}</div>
              <span className="text-xs text-faint">{c.buyer_username || 'comprador'}</span>
            </div>
            <div className="text-sm">{c.comment || <span className="text-faint italic">sem comentário</span>}</div>
            {c.comment_reply?.reply
              ? <div className="text-xs mt-2 rounded-lg px-2.5 py-1.5" style={{ background: 'var(--glass-hover)' }}><b>Sua resposta:</b> {c.comment_reply.reply}</div>
              : <div className="flex gap-2 mt-2">
                  <button onClick={() => responder(c, true)} disabled={respondendo === c.comment_id}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 disabled:opacity-60"
                          style={{ background: 'rgba(238,77,45,.12)', color: LARANJA, border: `1px solid ${LARANJA}` }}>
                    {respondendo === c.comment_id ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} Responder com IA
                  </button>
                </div>}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ----------------------------- SAÚDE DA LOJA ----------------------------- */
function SaudeLoja({ conectado }) {
  const [d, setD] = useState(null)
  useEffect(() => { if (conectado) api.shopeeDesempenho().then(setD).catch(() => setD({ erro: true })) }, [conectado])
  if (!conectado) return <div className="text-sm text-faint py-6 text-center glass rounded-2xl">Conecte a loja Shopee para ver a saúde da loja.</div>
  if (d === null) return <div className="py-10 text-center text-faint flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> carregando métricas…</div>
  const r = d?.response || {}
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-sm text-dim">Penalidades, rating, taxa de resposta e prazos chegam aqui via <span className="num">get_shop_performance</span>. A elegibilidade a Flash Sale e campanhas depende desses números.</div>
      {r.overall_performance && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <Metric n={r.overall_performance?.rating ?? '—'} sub="rating" cor={LARANJA} icon={Star} />
          <Metric n={r.penalty?.penalty_points ?? 0} sub="penalty points" icon={AlertTriangle} />
        </div>
      )}
    </div>
  )
}

/* ----------------------------- PEDIDOS ----------------------------------- */
function Pedidos({ conectado }) {
  const [d, setD] = useState(null)
  useEffect(() => { if (conectado) api.shopeePedidos(7).then(setD).catch(() => setD({ erro: true })) }, [conectado])
  if (!conectado) return <div className="text-sm text-faint py-6 text-center glass rounded-2xl">Conecte a loja Shopee para ver os pedidos.</div>
  if (d === null) return <div className="py-10 text-center text-faint flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> carregando pedidos…</div>
  const lista = d?.response?.order_list || []
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-sm font-medium mb-1">Pedidos (7 dias)</div>
      <div className="text-xs text-dim mb-3">Com o <b>escrow</b> de cada pedido a gente calcula a <b>margem líquida real</b> (preço − comissão − taxas) e compara com o que você precificou.</div>
      {lista.length === 0
        ? <div className="text-sm text-faint py-4 text-center">Nenhum pedido no período (ou loja recém-conectada).</div>
        : <div className="space-y-1.5">
            {lista.slice(0, 20).map((o) => (
              <div key={o.order_sn} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--glass-hover)' }}>
                <span className="num">#{o.order_sn}</span>
                <span className="text-xs text-faint">{o.order_status}</span>
              </div>
            ))}
          </div>}
    </div>
  )
}

function EmBreve({ titulo, desc, icon: Ic }) {
  return (
    <div className="glass rounded-2xl p-8 text-center">
      <div className="h-14 w-14 rounded-2xl grid place-items-center mx-auto mb-3" style={{ background: 'rgba(238,77,45,.12)' }}>
        <Ic size={26} style={{ color: LARANJA }} />
      </div>
      <div className="font-display font-semibold text-lg">{titulo}</div>
      <div className="text-sm text-dim max-w-md mx-auto mt-1">{desc}</div>
      <div className="text-xs text-faint mt-3 inline-flex items-center gap-1">próxima fase <ChevronRight size={12} /></div>
    </div>
  )
}

/* --------------------- BLING × SHOPEE (divergência) ---------------------- */
function Divergencia({ conectado }) {
  const [d, setD] = useState(null)
  const [filtro, setFiltro] = useState('divergentes')
  const carregar = () => { setD(null); api.shopeeDivergencia().then(setD).catch(() => setD({ erro: true })) }
  useEffect(() => { if (conectado) carregar() }, [conectado])
  if (!conectado) return <Vazio txt="Conecte a loja Shopee para comparar preços com o Bling." />
  if (d === null) return <Carregando txt="cruzando anúncios da Shopee com o catálogo do Bling…" />
  if (d.erro) return <Vazio txt="Não consegui ler o catálogo da Shopee. Verifique a conexão." />
  const itens = (d.itens || []).filter((l) =>
    filtro === 'divergentes' ? l.divergente : filtro === 'prejuizo' ? l.prejuizo : true)
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metric n={d.casados} sub="casados por SKU" icon={GitCompareArrows} />
        <Metric n={d.divergentes} sub="preço divergente" cor="var(--warn)" icon={AlertTriangle} />
        <Metric n={d.prejuizo} sub="prejuízo" cor="var(--danger)" icon={TrendingDown} />
        <Metric n={d.sem_match} sub="sem match no Bling" icon={X} />
      </div>
      <div className="flex gap-1.5">
        {[['divergentes', 'Divergentes'], ['prejuizo', 'Prejuízo'], ['todos', 'Todos']].map(([id, t]) => (
          <button key={id} onClick={() => setFiltro(id)} className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={filtro === id ? { background: LARANJA, color: '#fff' } : { background: 'var(--glass)', color: 'var(--text-dim)', border: '1px solid var(--glass-border)' }}>{t}</button>
        ))}
        <button onClick={carregar} className="text-xs px-3 py-1.5 rounded-lg text-dim hover:text-fg flex items-center gap-1 ml-auto"><RefreshCw size={12} /> atualizar</button>
      </div>
      {itens.length === 0
        ? <Vazio txt="Nenhum item nesse filtro." />
        : <div className="glass rounded-2xl overflow-hidden">
            {itens.map((l) => (
              <div key={l.item_id} className="flex items-center gap-3 px-4 py-2.5 border-b border-glassb last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="text-sm truncate">{l.nome}</div>
                  <div className="text-[11px] text-faint num">SKU {l.sku} • #{l.item_id}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-faint uppercase">Bling</div>
                  <div className="num text-sm">{brl(l.preco_bling)}</div>
                </div>
                <ChevronRight size={14} className="text-faint shrink-0" />
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-faint uppercase">Shopee</div>
                  <div className="num text-sm font-semibold" style={{ color: l.prejuizo ? 'var(--danger)' : l.divergente ? 'var(--warn)' : 'var(--text)' }}>{brl(l.preco_shopee)}</div>
                </div>
                {l.prejuizo && <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0" style={{ background: 'rgba(239,68,68,.12)', color: 'var(--danger)' }}>prejuízo</span>}
              </div>
            ))}
          </div>}
    </div>
  )
}

/* ----------------------------- PROMOÇÕES --------------------------------- */
const toEpoch = (s) => (s ? Math.floor(new Date(s).getTime() / 1000) : 0)

function Promocoes({ conectado, notify }) {
  const [sub, setSub] = useState('cupons')
  if (!conectado) return <Vazio txt="Conecte a loja Shopee para gerenciar promoções." />
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 flex-wrap">
        {[['cupons', 'Cupons'], ['descontos', 'Descontos'], ['bundle', 'Bundle'], ['addon', 'Add-on'], ['flash', 'Flash Sale']].map(([id, t]) => (
          <button key={id} onClick={() => setSub(id)} className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={sub === id ? { background: LARANJA, color: '#fff' } : { background: 'var(--glass)', color: 'var(--text-dim)', border: '1px solid var(--glass-border)' }}>{t}</button>
        ))}
      </div>
      {sub === 'cupons' && <Cupons notify={notify} />}
      {sub === 'descontos' && <Descontos notify={notify} />}
      {sub === 'bundle' && <Bundles notify={notify} />}
      {sub === 'addon' && <Addons notify={notify} />}
      {sub === 'flash' && <FlashSale notify={notify} />}
    </div>
  )
}

function Cupons({ notify }) {
  const [lista, setLista] = useState(null)
  const [form, setForm] = useState(false)
  const carregar = () => { setLista(null); api.shopeeCupons('ongoing').then(setLista).catch(() => setLista({ erro: true })) }
  useEffect(carregar, [])
  const cupons = lista?.response?.voucher_list || []
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm text-dim">Cupons ativos da loja</div>
        <button onClick={() => setForm(true)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-white flex items-center gap-1.5" style={{ background: LARANJA }}><Plus size={14} /> Novo cupom</button>
      </div>
      {lista === null ? <Carregando txt="carregando cupons…" />
        : cupons.length === 0 ? <Vazio txt="Nenhum cupom ativo. Crie um para incentivar a compra." />
        : <div className="space-y-1.5">{cupons.map((c) => (
            <div key={c.voucher_id} className="glass rounded-xl px-4 py-2.5 flex items-center gap-3">
              <Tag size={16} style={{ color: LARANJA }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{c.voucher_name} <span className="num text-faint">({c.voucher_code})</span></div>
                <div className="text-[11px] text-faint">{c.reward_type === 2 ? `${c.percentage}% off` : brl(c.discount_amount)} • mín {brl(c.min_basket_price)}</div>
              </div>
              <button onClick={async () => { try { await api.shopeeEncerrarCupom(c.voucher_id); notify('Cupom encerrado', 'ok'); carregar() } catch (e) { notify(e.message, 'danger') } }}
                      className="text-faint hover:text-danger p-1"><Trash2 size={15} /></button>
            </div>
          ))}</div>}
      {form && <CupomForm onClose={() => setForm(false)} onSaved={() => { setForm(false); carregar() }} notify={notify} />}
    </div>
  )
}

function CupomForm({ onClose, onSaved, notify }) {
  const [f, setF] = useState({ nome: '', codigo: '', tipo: 1, valor: '', min: '', qtd: 100, inicio: '', fim: '' })
  const [salvando, setSalvando] = useState(false)
  const up = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const salvar = async () => {
    if (!f.nome || !f.codigo || !f.valor || !f.inicio || !f.fim) return notify('Preencha os campos', 'warn')
    setSalvando(true)
    try {
      await api.shopeeCriarCupom({ nome: f.nome, codigo: f.codigo, tipo_desconto: Number(f.tipo),
        valor: Number(f.valor), compra_minima: Number(f.min || 0), quantidade: Number(f.qtd),
        inicio: toEpoch(f.inicio), fim: toEpoch(f.fim), escopo: 1 })
      notify('Cupom criado', 'ok'); onSaved()
    } catch (e) { notify(e.message, 'danger') }
    setSalvando(false)
  }
  return (
    <Modal titulo="Novo cupom" onClose={onClose} onSalvar={salvar} salvando={salvando}>
      <Campo label="Nome"><input value={f.nome} onChange={(e) => up('nome', e.target.value)} className={INP} placeholder="Frete Black Friday" /></Campo>
      <Campo label="Código"><input value={f.codigo} onChange={(e) => up('codigo', e.target.value.toUpperCase())} className={INP} placeholder="BLACK10" /></Campo>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Tipo">
          <select value={f.tipo} onChange={(e) => up('tipo', e.target.value)} className={INP}>
            <option value={1}>Valor fixo (R$)</option><option value={2}>Percentual (%)</option>
          </select>
        </Campo>
        <Campo label={f.tipo == 2 ? 'Percentual' : 'Valor (R$)'}><input type="number" value={f.valor} onChange={(e) => up('valor', e.target.value)} className={INP} /></Campo>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Compra mínima (R$)"><input type="number" value={f.min} onChange={(e) => up('min', e.target.value)} className={INP} /></Campo>
        <Campo label="Quantidade"><input type="number" value={f.qtd} onChange={(e) => up('qtd', e.target.value)} className={INP} /></Campo>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Início"><input type="datetime-local" value={f.inicio} onChange={(e) => up('inicio', e.target.value)} className={INP} /></Campo>
        <Campo label="Fim"><input type="datetime-local" value={f.fim} onChange={(e) => up('fim', e.target.value)} className={INP} /></Campo>
      </div>
    </Modal>
  )
}

function Descontos({ notify }) {
  const [lista, setLista] = useState(null)
  const [stat, setStat] = useState('ongoing')
  const carregar = () => { setLista(null); api.shopeeDescontos(stat).then(setLista).catch(() => setLista({ erro: true })) }
  useEffect(carregar, [stat])
  const ds = lista?.response?.discount_list || []
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {[['ongoing', 'Ativos'], ['upcoming', 'Agendados'], ['expired', 'Expirados']].map(([id, t]) => (
          <button key={id} onClick={() => setStat(id)} className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={stat === id ? { background: LARANJA, color: '#fff' } : { background: 'var(--glass)', color: 'var(--text-dim)', border: '1px solid var(--glass-border)' }}>{t}</button>
        ))}
      </div>
      {lista === null ? <Carregando txt="carregando descontos…" />
        : ds.length === 0 ? <Vazio txt="Nenhuma campanha de desconto aqui. Crie pelo Seller Center ou via API com início/fim agendados." />
        : <div className="space-y-1.5">{ds.map((c) => (
            <div key={c.discount_id} className="glass rounded-xl px-4 py-2.5 flex items-center gap-3">
              <Calendar size={16} style={{ color: LARANJA }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{c.discount_name}</div>
                <div className="text-[11px] text-faint">{new Date(c.start_time * 1000).toLocaleDateString('pt-BR')} → {new Date(c.end_time * 1000).toLocaleDateString('pt-BR')}</div>
              </div>
              {stat === 'ongoing' && <button onClick={async () => { try { await api.shopeeEncerrarDesconto(c.discount_id); notify('Desconto encerrado', 'ok'); carregar() } catch (e) { notify(e.message, 'danger') } }} className="text-faint hover:text-danger p-1"><Trash2 size={15} /></button>}
            </div>
          ))}</div>}
    </div>
  )
}

/* ------------------------------- ADS ------------------------------------- */
function Ads({ conectado }) {
  const [d, setD] = useState(null)
  useEffect(() => { if (conectado) api.shopeeAds(7).then(setD).catch(() => setD({ erro: true })) }, [conectado])
  if (!conectado) return <Vazio txt="Conecte a loja Shopee para ver os anúncios pagos." />
  if (d === null) return <Carregando txt="carregando Shopee Ads…" />
  const saldo = d.saldo?.response?.total_balance
  const perf = d.desempenho?.response?.[0] || {}
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metric n={saldo != null ? brl(saldo) : '—'} sub="saldo Ads" cor={LARANJA} icon={Megaphone} />
        <Metric n={perf.impression ?? '—'} sub="impressões" icon={TrendingUp} />
        <Metric n={perf.clicks ?? '—'} sub="cliques" icon={Zap} />
        <Metric n={perf.broad_gmv != null ? brl(perf.broad_gmv) : '—'} sub="GMV anúncios" icon={TrendingUp} />
      </div>
      <div className="glass rounded-2xl p-4 text-sm text-dim">
        Campanhas com <b>ROAS/ACOS</b> e otimização automática de lance entram aqui. Quando a loja estiver conectada, os números de impressões, cliques, conversão e gasto aparecem ao vivo.
      </div>
    </div>
  )
}

/* ----------------------------- PERGUNTAS (Q&A) --------------------------- */
function Perguntas({ conectado, notify }) {
  const [d, setD] = useState(null)
  const [resp, setResp] = useState(null)
  const carregar = () => { setD(null); api.shopeePerguntas('UNANSWERED').then(setD).catch(() => setD({ erro: true })) }
  useEffect(() => { if (conectado) carregar() }, [conectado])
  if (!conectado) return <Vazio txt="Conecte a loja Shopee para responder perguntas dos anúncios." />
  if (d === null) return <Carregando txt="carregando perguntas…" />
  const qs = d?.response?.qa_list || d?.qa_list || []
  const responder = async (q) => {
    setResp(q.qa_id)
    try { const r = await api.shopeeResponderPergunta({ qa_id: q.qa_id, ia: true, pergunta: q.question }); notify('Resposta enviada (IA)', 'ok'); carregar() }
    catch (e) { notify(e.message, 'danger') }
    setResp(null)
  }
  return qs.length === 0 ? <Vazio txt="Nenhuma pergunta sem resposta. 🎉" />
    : <div className="space-y-2">{qs.map((q) => (
        <div key={q.qa_id} className="glass rounded-xl p-3">
          <div className="text-sm flex items-start gap-2"><HelpCircle size={15} className="mt-0.5 shrink-0" style={{ color: LARANJA }} /> {q.question}</div>
          <button onClick={() => responder(q)} disabled={resp === q.qa_id}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 mt-2 disabled:opacity-60"
                  style={{ background: 'rgba(238,77,45,.12)', color: LARANJA, border: `1px solid ${LARANJA}` }}>
            {resp === q.qa_id ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} Responder com IA
          </button>
        </div>
      ))}</div>
}

/* ----------------------------- DEVOLUÇÕES -------------------------------- */
function Devolucoes({ conectado }) {
  const [d, setD] = useState(null)
  useEffect(() => { if (conectado) api.shopeeDevolucoes(30).then(setD).catch(() => setD({ erro: true })) }, [conectado])
  if (!conectado) return <Vazio txt="Conecte a loja Shopee para ver devoluções." />
  if (d === null) return <Carregando txt="carregando devoluções…" />
  const lista = d?.response?.return || d?.return || []
  return (
    <div className="space-y-3">
      <div className="text-sm text-dim">Devoluções e reembolsos dos últimos 30 dias. A taxa de retorno alta derruba a saúde da loja — vale monitorar.</div>
      {lista.length === 0 ? <Vazio txt="Nenhuma devolução no período. 🎉" />
        : <div className="space-y-1.5">{lista.slice(0, 30).map((r) => (
            <div key={r.return_sn} className="glass rounded-xl px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2"><Undo2 size={15} className="text-dim" /> <span className="num text-sm">#{r.return_sn}</span></div>
              <span className="text-xs text-faint">{r.status} • {r.reason || ''}</span>
            </div>
          ))}</div>}
    </div>
  )
}

/* ------------------------------ Helpers UI ------------------------------- */
const INP = 'glass rounded-lg px-3 py-2 text-sm bg-transparent outline-none w-full'
function Campo({ label, children }) { return <label className="block"><span className="text-xs text-faint block mb-1">{label}</span>{children}</label> }
function Vazio({ txt }) { return <div className="text-sm text-faint py-8 text-center glass rounded-2xl">{txt}</div> }
function Carregando({ txt }) { return <div className="py-10 text-center text-faint flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> {txt}</div> }
function Modal({ titulo, children, onClose, onSalvar, salvando }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: 'rgba(0,0,0,.5)' }} onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col" style={{ background: 'var(--bg-elev, var(--glass))', backdropFilter: 'blur(20px)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-glassb">
          <div className="font-display font-semibold">{titulo}</div>
          <button onClick={onClose} className="text-faint hover:text-fg"><X size={18} /></button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-3">{children}</div>
        <div className="p-4 border-t border-glassb flex justify-end">
          <button onClick={onSalvar} disabled={salvando} className="rounded-lg px-4 py-2 text-sm font-medium text-white flex items-center gap-2 disabled:opacity-60" style={{ background: LARANJA }}>
            {salvando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

/* -------------------- Seletor de itens da Shopee (reuso) ----------------- */
function useItensShopee() {
  const [itens, setItens] = useState(null)
  useEffect(() => {
    api.shopeeProdutos().then((r) => {
      const lista = r?.response?.item || r?.item || []
      setItens(lista.map((x) => ({ item_id: x.item_id, nome: x.item_name || `#${x.item_id}` })))
    }).catch(() => setItens([]))
  }, [])
  return itens
}

function SeletorItens({ titulo, comPreco, onConfirmar, onClose }) {
  const itens = useItensShopee()
  const [sel, setSel] = useState({})  // item_id -> {nome, preco}
  const toggle = (it) => setSel((s) => {
    const n = { ...s }
    if (n[it.item_id]) delete n[it.item_id]; else n[it.item_id] = { nome: it.nome, preco: '' }
    return n
  })
  const setPreco = (id, v) => setSel((s) => ({ ...s, [id]: { ...s[id], preco: v } }))
  const confirmar = () => {
    const arr = Object.entries(sel).map(([item_id, v]) => ({ item_id, nome: v.nome, preco: v.preco }))
    onConfirmar(arr)
  }
  return (
    <Modal titulo={titulo} onClose={onClose} onSalvar={confirmar} salvando={false}>
      {itens === null ? <Carregando txt="carregando anúncios…" />
        : itens.length === 0 ? <Vazio txt="Não consegui listar os anúncios da Shopee." />
        : <div className="space-y-1">
            {itens.map((i) => (
              <div key={i.item_id} className="rounded-lg px-2.5 py-1.5" style={{ background: sel[i.item_id] ? 'rgba(238,77,45,.1)' : 'var(--glass-hover)' }}>
                <button onClick={() => toggle(i)} className="w-full flex items-center gap-2 text-left">
                  <span className="h-4 w-4 rounded grid place-items-center shrink-0" style={{ background: sel[i.item_id] ? LARANJA : 'transparent', border: `1px solid ${sel[i.item_id] ? LARANJA : 'var(--glass-border)'}` }}>
                    {sel[i.item_id] && <CheckCircle2 size={11} className="text-white" />}
                  </span>
                  <span className="text-sm truncate flex-1">{i.nome}</span>
                  <span className="text-[11px] text-faint num">#{i.item_id}</span>
                </button>
                {comPreco && sel[i.item_id] && (
                  <input type="number" value={sel[i.item_id].preco} onChange={(e) => setPreco(i.item_id, e.target.value)}
                         placeholder="preço promocional (R$)" className="glass rounded-lg px-2 py-1 text-xs bg-transparent outline-none w-full mt-1" />
                )}
              </div>
            ))}
          </div>}
    </Modal>
  )
}

/* ------------------------------ Bundle ----------------------------------- */
function Bundles({ notify }) {
  const [lista, setLista] = useState(null)
  const [form, setForm] = useState(false)
  const carregar = () => { setLista(null); api.shopeeBundles('ongoing').then(setLista).catch(() => setLista({ erro: true })) }
  useEffect(carregar, [])
  const bs = lista?.response?.bundle_deal_list || []
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm text-dim">Bundles ativos (compre N, leve com desconto)</div>
        <button onClick={() => setForm(true)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-white flex items-center gap-1.5" style={{ background: LARANJA }}><Plus size={14} /> Novo bundle</button>
      </div>
      {lista === null ? <Carregando txt="carregando bundles…" />
        : bs.length === 0 ? <Vazio txt="Nenhum bundle ativo." />
        : <div className="space-y-1.5">{bs.map((b) => (
            <div key={b.bundle_deal_id} className="glass rounded-xl px-4 py-2.5 flex items-center gap-3">
              <Package size={16} style={{ color: LARANJA }} />
              <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{b.name}</div>
                <div className="text-[11px] text-faint">{new Date(b.start_time * 1000).toLocaleDateString('pt-BR')} → {new Date(b.end_time * 1000).toLocaleDateString('pt-BR')}</div></div>
              <button onClick={async () => { try { await api.shopeeEncerrarBundle(b.bundle_deal_id); notify('Bundle encerrado', 'ok'); carregar() } catch (e) { notify(e.message, 'danger') } }} className="text-faint hover:text-danger p-1"><Trash2 size={15} /></button>
            </div>
          ))}</div>}
      {form && <BundleForm onClose={() => setForm(false)} onSaved={() => { setForm(false); carregar() }} notify={notify} />}
    </div>
  )
}

function BundleForm({ onClose, onSaved, notify }) {
  const [f, setF] = useState({ nome: '', tipo: 1, valor: '', min: 2, inicio: '', fim: '' })
  const [itens, setItens] = useState([])
  const [picker, setPicker] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const up = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const salvar = async () => {
    if (!f.nome || !f.valor || !f.inicio || !f.fim || itens.length < 1) return notify('Preencha os campos e escolha itens', 'warn')
    setSalvando(true)
    try {
      await api.shopeeCriarBundle({ nome: f.nome, rule_type: Number(f.tipo), valor: Number(f.valor),
        min_itens: Number(f.min), inicio: toEpoch(f.inicio), fim: toEpoch(f.fim), item_ids: itens.map((i) => i.item_id) })
      notify('Bundle criado', 'ok'); onSaved()
    } catch (e) { notify(e.message, 'danger') }
    setSalvando(false)
  }
  return (
    <Modal titulo="Novo bundle" onClose={onClose} onSalvar={salvar} salvando={salvando}>
      <Campo label="Nome"><input value={f.nome} onChange={(e) => up('nome', e.target.value)} className={INP} placeholder="Kit Miçangas" /></Campo>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Tipo de regra">
          <select value={f.tipo} onChange={(e) => up('tipo', e.target.value)} className={INP}>
            <option value={1}>Preço fixo do combo</option><option value={2}>% de desconto</option><option value={3}>Valor de desconto</option>
          </select>
        </Campo>
        <Campo label={f.tipo == 2 ? '% desconto' : 'Valor (R$)'}><input type="number" value={f.valor} onChange={(e) => up('valor', e.target.value)} className={INP} /></Campo>
      </div>
      <Campo label="Quantidade mínima de itens"><input type="number" value={f.min} onChange={(e) => up('min', e.target.value)} className={INP} /></Campo>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Início"><input type="datetime-local" value={f.inicio} onChange={(e) => up('inicio', e.target.value)} className={INP} /></Campo>
        <Campo label="Fim"><input type="datetime-local" value={f.fim} onChange={(e) => up('fim', e.target.value)} className={INP} /></Campo>
      </div>
      <Campo label={`Produtos do bundle (${itens.length})`}>
        <button onClick={() => setPicker(true)} className="glass rounded-lg px-3 py-2 text-sm w-full text-left text-dim hover:text-fg flex items-center gap-2"><Plus size={14} /> {itens.length ? `${itens.length} produto(s) escolhido(s)` : 'Escolher produtos'}</button>
      </Campo>
      {picker && <SeletorItens titulo="Produtos do bundle" onConfirmar={(a) => { setItens(a); setPicker(false) }} onClose={() => setPicker(false)} />}
    </Modal>
  )
}

/* ------------------------------ Add-on ----------------------------------- */
function Addons({ notify }) {
  const [lista, setLista] = useState(null)
  const [form, setForm] = useState(false)
  const carregar = () => { setLista(null); api.shopeeAddons('ongoing').then(setLista).catch(() => setLista({ erro: true })) }
  useEffect(carregar, [])
  const as = lista?.response?.add_on_deal_list || []
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm text-dim">Add-on (leve um adicional com desconto na compra)</div>
        <button onClick={() => setForm(true)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-white flex items-center gap-1.5" style={{ background: LARANJA }}><Plus size={14} /> Novo add-on</button>
      </div>
      {lista === null ? <Carregando txt="carregando add-ons…" />
        : as.length === 0 ? <Vazio txt="Nenhum add-on ativo." />
        : <div className="space-y-1.5">{as.map((a) => (
            <div key={a.add_on_deal_id} className="glass rounded-xl px-4 py-2.5 flex items-center gap-3">
              <Plus size={16} style={{ color: LARANJA }} />
              <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{a.add_on_deal_name}</div>
                <div className="text-[11px] text-faint">{new Date(a.start_time * 1000).toLocaleDateString('pt-BR')} → {new Date(a.end_time * 1000).toLocaleDateString('pt-BR')}</div></div>
              <button onClick={async () => { try { await api.shopeeEncerrarAddon(a.add_on_deal_id); notify('Add-on encerrado', 'ok'); carregar() } catch (e) { notify(e.message, 'danger') } }} className="text-faint hover:text-danger p-1"><Trash2 size={15} /></button>
            </div>
          ))}</div>}
      {form && <AddonForm onClose={() => setForm(false)} onSaved={() => { setForm(false); carregar() }} notify={notify} />}
    </div>
  )
}

function AddonForm({ onClose, onSaved, notify }) {
  const [f, setF] = useState({ nome: '', inicio: '', fim: '' })
  const [principais, setPrincipais] = useState([])
  const [adicionais, setAdicionais] = useState([])
  const [pk, setPk] = useState(null)  // 'main' | 'sub'
  const [salvando, setSalvando] = useState(false)
  const up = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const salvar = async () => {
    if (!f.nome || !f.inicio || !f.fim || !principais.length || !adicionais.length) return notify('Preencha tudo e escolha os produtos', 'warn')
    setSalvando(true)
    try {
      await api.shopeeCriarAddon({ nome: f.nome, inicio: toEpoch(f.inicio), fim: toEpoch(f.fim),
        principais: principais.map((i) => i.item_id),
        adicionais: adicionais.map((i) => ({ item_id: i.item_id, add_on_deal_price: Number(i.preco || 0) })) })
      notify('Add-on criado', 'ok'); onSaved()
    } catch (e) { notify(e.message, 'danger') }
    setSalvando(false)
  }
  return (
    <Modal titulo="Novo add-on" onClose={onClose} onSalvar={salvar} salvando={salvando}>
      <Campo label="Nome"><input value={f.nome} onChange={(e) => up('nome', e.target.value)} className={INP} placeholder="Compre linha, leve agulha barata" /></Campo>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Início"><input type="datetime-local" value={f.inicio} onChange={(e) => up('inicio', e.target.value)} className={INP} /></Campo>
        <Campo label="Fim"><input type="datetime-local" value={f.fim} onChange={(e) => up('fim', e.target.value)} className={INP} /></Campo>
      </div>
      <Campo label={`Produtos principais (${principais.length})`}>
        <button onClick={() => setPk('main')} className="glass rounded-lg px-3 py-2 text-sm w-full text-left text-dim hover:text-fg flex items-center gap-2"><Plus size={14} /> {principais.length ? `${principais.length} principal(is)` : 'Escolher principais'}</button>
      </Campo>
      <Campo label={`Adicionais com desconto (${adicionais.length})`}>
        <button onClick={() => setPk('sub')} className="glass rounded-lg px-3 py-2 text-sm w-full text-left text-dim hover:text-fg flex items-center gap-2"><Plus size={14} /> {adicionais.length ? `${adicionais.length} adicional(is)` : 'Escolher adicionais + preço'}</button>
      </Campo>
      {pk === 'main' && <SeletorItens titulo="Produtos principais" onConfirmar={(a) => { setPrincipais(a); setPk(null) }} onClose={() => setPk(null)} />}
      {pk === 'sub' && <SeletorItens titulo="Adicionais (com preço)" comPreco onConfirmar={(a) => { setAdicionais(a); setPk(null) }} onClose={() => setPk(null)} />}
    </Modal>
  )
}

/* ----------------------------- Flash Sale -------------------------------- */
function FlashSale({ notify }) {
  const [lista, setLista] = useState(null)
  const [form, setForm] = useState(false)
  const carregar = () => { setLista(null); api.shopeeFlash(2).then(setLista).catch(() => setLista({ erro: true })) }
  useEffect(carregar, [])
  const fs = lista?.response?.flash_sale_list || lista?.response || []
  const arr = Array.isArray(fs) ? fs : []
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm text-dim">Flash Sale da loja (slots de horário)</div>
        <button onClick={() => setForm(true)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-white flex items-center gap-1.5" style={{ background: LARANJA }}><Flame size={14} /> Nova flash sale</button>
      </div>
      {lista === null ? <Carregando txt="carregando flash sales…" />
        : arr.length === 0 ? <Vazio txt="Nenhuma flash sale ativa ou agendada." />
        : <div className="space-y-1.5">{arr.map((s) => (
            <div key={s.flash_sale_id} className="glass rounded-xl px-4 py-2.5 flex items-center gap-3">
              <Flame size={16} style={{ color: LARANJA }} />
              <div className="flex-1 min-w-0"><div className="text-sm font-medium">Flash #{s.flash_sale_id}</div>
                <div className="text-[11px] text-faint">{s.start_time ? new Date(s.start_time * 1000).toLocaleString('pt-BR') : ''} • {s.status === 1 ? 'agendada' : s.status === 2 ? 'ativa' : ''}</div></div>
              <button onClick={async () => { try { await api.shopeeEncerrarFlash(s.flash_sale_id); notify('Flash sale removida', 'ok'); carregar() } catch (e) { notify(e.message, 'danger') } }} className="text-faint hover:text-danger p-1"><Trash2 size={15} /></button>
            </div>
          ))}</div>}
      {form && <FlashForm onClose={() => setForm(false)} onSaved={() => { setForm(false); carregar() }} notify={notify} />}
    </div>
  )
}

function FlashForm({ onClose, onSaved, notify }) {
  const [dias, setDias] = useState(7)
  const [slots, setSlots] = useState(null)
  const [slot, setSlot] = useState('')
  const [itens, setItens] = useState([])
  const [picker, setPicker] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const buscarSlots = (d) => {
    setSlots(null); setSlot('')
    api.shopeeFlashSlots(d).then((r) => setSlots(r?.response || [])).catch(() => setSlots([]))
  }
  useEffect(() => { buscarSlots(dias) }, [])
  const salvar = async () => {
    if (!slot || !itens.length) return notify('Escolha um horário e produtos', 'warn')
    setSalvando(true)
    try {
      await api.shopeeCriarFlash({ timeslot_id: Number(slot),
        itens: itens.map((i) => ({ item_id: Number(i.item_id), preco: Number(i.preco || 0) })) })
      notify('Oferta relâmpago criada', 'ok'); onSaved()
    } catch (e) { notify(e.message, 'danger') }
    setSalvando(false)
  }
  const fmtSlot = (s) => {
    const ini = new Date((s.start_time || 0) * 1000)
    const fim = new Date((s.end_time || 0) * 1000)
    const dia = ini.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
    const hi = ini.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const hf = fim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return `${dia} • ${hi}–${hf}`
  }
  return (
    <Modal titulo="Nova oferta relâmpago" onClose={onClose} onSalvar={salvar} salvando={salvando}>
      <Campo label="Buscar horários nos próximos">
        <div className="flex gap-1.5">
          {[3, 7, 14, 30].map((d) => (
            <button key={d} onClick={() => { setDias(d); buscarSlots(d) }} className="text-xs px-2.5 py-1.5 rounded-lg font-medium"
                    style={dias === d ? { background: LARANJA, color: '#fff' } : { background: 'var(--glass-hover)', color: 'var(--text-dim)', border: '1px solid var(--glass-border)' }}>{d} dias</button>
          ))}
        </div>
      </Campo>
      <Campo label="Horário (slot disponível)">
        {slots === null ? <div className="text-xs text-faint flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> buscando horários disponíveis…</div>
          : slots.length === 0 ? <div className="text-xs text-faint">Nenhum horário disponível nesse intervalo. Tente um período maior.</div>
          : <select value={slot} onChange={(e) => setSlot(e.target.value)} className={INP}>
              <option value="">selecione um horário…</option>
              {slots.map((s) => <option key={s.timeslot_id} value={s.timeslot_id}>{fmtSlot(s)}</option>)}
            </select>}
        {slots && slots.length > 0 && <div className="text-[11px] text-faint mt-1">{slots.length} horário(s) disponível(is) no período</div>}
      </Campo>
      <Campo label={`Produtos do catálogo + preço promocional (${itens.length})`}>
        <button onClick={() => setPicker(true)} className="glass rounded-lg px-3 py-2 text-sm w-full text-left text-dim hover:text-fg flex items-center gap-2"><Plus size={14} /> {itens.length ? `${itens.length} produto(s) escolhido(s)` : 'Escolher produtos + preço'}</button>
        {itens.length > 0 && (
          <div className="mt-1.5 space-y-1">
            {itens.map((i) => (
              <div key={i.item_id} className="flex items-center justify-between text-xs rounded-lg px-2.5 py-1.5" style={{ background: 'var(--glass-hover)' }}>
                <span className="truncate flex-1">{i.nome}</span>
                <span className="num font-medium" style={{ color: LARANJA }}>{i.preco ? brl(i.preco) : '—'}</span>
              </div>
            ))}
          </div>
        )}
      </Campo>
      <div className="text-[11px] text-faint">As variações de cada produto são preenchidas automaticamente com o preço que você definir. A loja precisa de estoque e elegibilidade para a oferta ser aceita.</div>
      {picker && <SeletorItens titulo="Produtos da oferta relâmpago" comPreco onConfirmar={(a) => { setItens(a); setPicker(false) }} onClose={() => setPicker(false)} />}
    </Modal>
  )
}

/* ----------------------- Diagnóstico da integração ----------------------- */
function dicaErro(erro = '') {
  const e = erro.toLowerCase()
  if (e.includes('token')) return 'Token inválido ou expirado — clique em reconectar a loja.'
  if (e.includes('permission') || e.includes('no permission') || e.includes('auth')) return 'Falta a permissão desse módulo no seu app na Shopee Open Platform (Authorization → API list).'
  if (e.includes('timeout') || e.includes('rede')) return 'A chamada demorou demais. Pode ser instabilidade da Shopee — tente de novo.'
  if (e.includes('sign')) return 'Assinatura recusada — confira PARTNER_KEY no servidor.'
  if (e.includes('not configured') || e.includes('não configurado')) return 'Defina PARTNER_ID e PARTNER_KEY no servidor (Railway).'
  return null
}

function Diagnostico({ status }) {
  const [res, setRes] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const rodar = async () => {
    setLoading(true); setErro('')
    try { setRes(await api.shopeeDiagnostico()) } catch (e) { setErro(e.message); setRes(null) }
    setLoading(false)
  }
  useEffect(() => { rodar() }, [])

  const pctOk = res?.total ? Math.round((res.ok / res.total) * 100) : 0

  return (
    <div className="space-y-3">
      <div className="glass rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="font-display font-semibold flex items-center gap-2"><Stethoscope size={17} style={{ color: LARANJA }} /> Diagnóstico da integração</div>
            <div className="text-sm text-dim mt-0.5">Testa cada chamada da Shopee e mostra o que funciona e o que falha — com o erro exato de cada uma.</div>
          </div>
          <button onClick={rodar} disabled={loading}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60 shrink-0" style={{ background: LARANJA }}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} {loading ? 'Testando…' : 'Rodar de novo'}
          </button>
        </div>

        {res && res.app && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-dim">{res.ok} de {res.total} funcionalidades respondendo</span>
              <span className="font-semibold num" style={{ color: pctOk >= 80 ? 'var(--ok)' : pctOk >= 40 ? 'var(--warn)' : 'var(--danger)' }}>{pctOk}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--glass-hover)' }}>
              <div className="h-full transition-all duration-700" style={{ width: `${pctOk}%`, background: pctOk >= 80 ? 'var(--ok)' : pctOk >= 40 ? 'var(--warn)' : 'var(--danger)' }} />
            </div>
          </div>
        )}
      </div>

      {loading && !res && (
        <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="shimmer rounded-xl h-14" />)}</div>
      )}

      {erro && (
        <div className="glass rounded-2xl p-4 flex items-start gap-3" style={{ border: '1px solid var(--danger)' }}>
          <ShieldAlert size={18} style={{ color: 'var(--danger)' }} className="shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium">Não consegui rodar o diagnóstico</div>
            <div className="text-xs text-dim mt-0.5">{erro}</div>
          </div>
        </div>
      )}

      {res && !res.app && (
        <div className="glass rounded-2xl p-4 flex items-start gap-3" style={{ border: '1px solid var(--warn)' }}>
          <AlertTriangle size={18} style={{ color: 'var(--warn)' }} className="shrink-0 mt-0.5" />
          <div className="text-sm">{res.resumo || 'App Shopee não configurado no servidor.'}</div>
        </div>
      )}

      {res?.testes?.map((t, i) => {
        const dica = !t.ok && dicaErro(t.erro)
        return (
          <div key={i} className="glass rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="shrink-0 mt-0.5">
              {t.ok ? <CheckCircle2 size={18} style={{ color: 'var(--ok)' }} /> : <XCircle size={18} style={{ color: 'var(--danger)' }} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium flex items-center gap-2">
                {t.nome}
                {t.ok && t.qtd != null && <span className="text-[11px] text-faint num">{t.qtd} registro(s)</span>}
              </div>
              {!t.ok && <div className="text-xs mt-0.5 num" style={{ color: 'var(--danger)' }}>{t.erro}</div>}
              {dica && <div className="text-[11px] text-dim mt-1 flex items-start gap-1"><CircleDot size={11} className="mt-0.5 shrink-0" style={{ color: 'var(--warn)' }} /> {dica}</div>}
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: t.ok ? 'rgba(79,227,201,.12)' : 'rgba(255,111,111,.12)', color: t.ok ? 'var(--ok)' : 'var(--danger)' }}>
              {t.ok ? 'OK' : 'FALHA'}
            </span>
          </div>
        )
      })}

      {res?.testes?.some((t) => !t.ok) && (
        <div className="text-xs text-faint px-1 leading-relaxed">
          As falhas de "permissão" quase sempre são módulos não habilitados no seu app na Shopee Open Platform — abra <b>Authorization → API list</b> e marque os escopos (produtos, pedidos, logística, avaliações, promoções). Se o erro for de token, reconecte a loja na aba de conexão.
        </div>
      )}
    </div>
  )
}
