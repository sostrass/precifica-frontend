import { useEffect, useMemo, useState } from 'react'
import {
  Rocket, Star, Activity, ShoppingBag, Tag, Megaphone, Package,
  Plus, X, Pin, PinOff, Play, Loader2, Zap, Clock, CheckCircle2,
  AlertTriangle, Plug, RefreshCw, Wand2, ChevronRight, Flame,
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
  { id: 'boost', label: 'Boost', icon: Rocket, destaque: true },
  { id: 'avaliacoes', label: 'Avaliações', icon: Star },
  { id: 'saude', label: 'Saúde da loja', icon: Activity },
  { id: 'pedidos', label: 'Pedidos & Financeiro', icon: ShoppingBag },
  { id: 'promocoes', label: 'Promoções', icon: Tag },
  { id: 'ads', label: 'Shopee Ads', icon: Megaphone },
]

export default function Shopee() {
  const notify = useToast()
  const [aba, setAba] = useState('boost')
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

      {aba === 'boost' && <BoostCenter conectado={status?.ok} notify={notify} />}
      {aba === 'avaliacoes' && <Avaliacoes conectado={status?.ok} notify={notify} />}
      {aba === 'saude' && <SaudeLoja conectado={status?.ok} />}
      {aba === 'pedidos' && <Pedidos conectado={status?.ok} />}
      {aba === 'promocoes' && <EmBreve titulo="Promoções" desc="Descontos, bundles, add-on, cupons e flash sale — todos com início/fim agendáveis e auto-continuar. Mesma base do motor de boost." icon={Tag} />}
      {aba === 'ads' && <EmBreve titulo="Shopee Ads" desc="Campanhas de anúncios pagos com ROAS/ACOS e otimização automática de lance." icon={Megaphone} />}
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
  const salvar = async () => {
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
      <div className="text-sm">
        {!status?.app
          ? <span style={{ color: 'var(--warn)' }}>Faltam <b>SHOPEE_PARTNER_ID</b> e <b>SHOPEE_PARTNER_KEY</b> no servidor (Railway). Defina e reinicie.</span>
          : <span>App pronto. Cole as credenciais da sua loja para conectar (o token é renovado sozinho depois):</span>}
      </div>
      {status?.app && (
        <>
          <div className="grid sm:grid-cols-3 gap-2">
            <input value={shop} onChange={(e) => setShop(e.target.value)} placeholder="shop_id"
                   className="glass rounded-lg px-3 py-2 text-sm bg-transparent outline-none" />
            <input value={at} onChange={(e) => setAt(e.target.value)} placeholder="access_token"
                   className="glass rounded-lg px-3 py-2 text-sm bg-transparent outline-none sm:col-span-2" />
          </div>
          <input value={rt} onChange={(e) => setRt(e.target.value)} placeholder="refresh_token (recomendado — permite renovar automático)"
                 className="glass rounded-lg px-3 py-2 text-sm bg-transparent outline-none w-full" />
          <button onClick={salvar} disabled={salvando}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white flex items-center gap-2 disabled:opacity-60"
                  style={{ background: LARANJA }}>
            {salvando ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} />} Conectar loja
          </button>
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
