import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Rocket, Star, Activity, ShoppingBag, Tag, Megaphone, Package,
  Plus, X, Pin, PinOff, Play, Square, Loader2, Zap, Clock, CheckCircle2,
  AlertTriangle, Plug, RefreshCw, Wand2, ChevronRight, Flame,
  HelpCircle, GitCompareArrows, Undo2, TrendingUp, TrendingDown, Trash2, Calendar,
  Stethoscope, XCircle, ShieldAlert, CircleDot, Bot, Search,
  Send, Sparkles, SlidersHorizontal, MessageSquare, ImageIcon, Settings2, Smile, ThumbsUp,
  Percent, Ticket, RotateCcw, ChevronDown, PlusCircle, Layers, Hourglass, Infinity as InfinityIcon,
  Wallet, Receipt, Coins, Truck, BadgePercent, Target,
  Printer, MapPin, FileText, ClipboardList, User as UserIcon,
} from 'lucide-react'
import { api, setToken } from './api'
import { useToast } from './toast.jsx'
import { CampaignCard, fmtDur, useAgora, cicloInfo, TIPO_META, fmtDataHora } from './CampaignCard'

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
  { id: 'motor', label: 'Promoções IA', icon: Sparkles, destaque: true },
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
    api.shopeeStatus().then(setStatus)
      .catch((e) => {
        const msg = String(e?.message || e || '')
        const authErro = /token|sess|401|expirad|autoriz|credenci|unauthor/i.test(msg)
        setStatus({ erro: true, authErro, msgErro: msg })
      })
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
      {aba === 'motor' && <MotorPromocoes conectado={status?.ok} notify={notify} />}
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
  if (status?.authErro) return <span className="text-xs flex items-center gap-1" style={{ color: 'var(--warn)' }}><AlertTriangle size={12} /> sessão expirada — entre de novo</span>
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
      {status?.authErro ? (
        <div className="space-y-2">
          <div className="text-sm flex items-center gap-2" style={{ color: 'var(--warn)' }}>
            <AlertTriangle size={15} /> Sua sessão expirou (token inválido).
          </div>
          <div className="text-xs text-dim">
            Não é problema de configuração — o servidor, o banco e a conexão da loja estão OK. É só o login que venceu.
            Saia e entre de novo no app para continuar.
          </div>
          <button onClick={() => { setToken(null); location.reload() }}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white flex items-center gap-2 w-full justify-center" style={{ background: LARANJA }}>
            Sair e entrar de novo
          </button>
        </div>
      ) : !status?.app ? (
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

function BoostCondicional({ conectado, notify }) {
  const [d, setD] = useState(null)
  const [aplicando, setAplicando] = useState(false)
  const carregar = () => api.shopeeBoostCondGet().then(setD).catch(() => setD({ erro: true }))
  useEffect(() => { if (conectado) carregar() }, [conectado])

  const cfg = d?.config
  const setCfg = async (patch) => {
    setD((x) => ({ ...x, config: { ...x.config, ...patch } }))
    try { await api.shopeeBoostCondSalvar(patch) } catch (e) { notify('Não salvou: ' + e.message, 'danger') }
  }
  const aplicar = async () => {
    setAplicando(true)
    try { const r = await api.shopeeBoostCondAplicar(); notify(r.msg || 'Aplicado', 'ok'); carregar() }
    catch (e) { notify(e.message, 'danger') }
    setAplicando(false)
  }

  if (!conectado) return null
  const ativo = cfg?.cond_ativo
  const ameacados = d?.ameacados || []
  const diag = d?.diagnostico
  const erro = d?.erro

  return (
    <div className="glass rounded-2xl p-4 space-y-3" style={{ border: ativo ? '1px solid #FF6F6F' : '1px solid var(--glass-border)' }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-medium flex items-center gap-2"><ShieldAlert size={15} style={{ color: '#FF6F6F' }} /> Boost condicional pelo Radar</div>
          <div className="text-xs text-faint mt-0.5" style={{ maxWidth: '34rem' }}>Quando um concorrente que você monitora <b>fura o seu preço</b>, o produto entra em boost prioritário sozinho. Quando a ameaça passa, ele sai.</div>
        </div>
        <button onClick={() => setCfg({ cond_ativo: !ativo })} className="relative h-7 w-12 rounded-full transition-colors shrink-0" style={{ background: ativo ? '#FF6F6F' : 'var(--glass-hover)' }}>
          <span className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all" style={{ left: ativo ? '26px' : '4px' }} />
        </button>
      </div>

      {ativo && cfg && (
        <div className="grid sm:grid-cols-2 gap-3">
          <SliderRegra label="Gatilho — quanto o concorrente precisa estar abaixo" valor={cfg.cond_gatilho_pct} min={0} max={30} sufixo="%"
                       onChange={(v) => setCfg({ cond_gatilho_pct: v })} dica="0% = qualquer preço menor dispara · 5% = só quando ele está 5%+ mais barato" />
          <SliderRegra label="Máximo em boost condicional ao mesmo tempo" valor={cfg.cond_max} min={1} max={5}
                       onChange={(v) => setCfg({ cond_max: v })} dica="Reserva slots (de 5) pra esses; o resto fica pro rodízio normal" />
        </div>
      )}

      {/* diagnóstico ao vivo */}
      <div className="rounded-xl p-3" style={{ background: 'var(--glass-hover)' }}>
        {erro ? <div className="text-xs" style={{ color: '#FF6F6F' }}>{String(erro) === 'true' ? 'Não consegui avaliar agora.' : erro}</div>
          : d === null ? <div className="text-xs text-faint flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> avaliando o Radar…</div>
          : <>
              <div className="flex items-center gap-3 flex-wrap text-[11px] mb-2">
                <span className="flex items-center gap-1 text-faint"><Target size={12} /> {diag?.skus_monitorados ?? 0} SKU(s) monitorados</span>
                <span className="flex items-center gap-1" style={{ color: ameacados.length ? '#FF6F6F' : 'var(--text-faint)' }}><TrendingDown size={12} /> {diag?.ameacados ?? 0} sob ameaça</span>
                {diag?.com_anuncio != null && <span className="flex items-center gap-1 text-faint"><Zap size={12} /> {diag.com_anuncio} com anúncio casado</span>}
              </div>
              {ameacados.length === 0
                ? <div className="text-xs text-faint">Nenhum concorrente furando seu preço agora. {(!diag?.skus_monitorados) && 'Adicione concorrentes na aba Radar pra ativar isso.'}</div>
                : <div className="space-y-1.5">
                    {ameacados.slice(0, 8).map((a) => (
                      <div key={a.sku} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: 'var(--glass)' }}>
                        <TrendingDown size={13} style={{ color: '#FF6F6F' }} className="shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs truncate">{a.nome}</div>
                          <div className="text-[10px] text-faint num">seu R$ {a.meu_preco?.toFixed(2)} · concorrente R$ {a.concorrente?.toFixed(2)}</div>
                        </div>
                        {!a.tem_anuncio && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(230,180,80,.14)', color: '#d6007f' }} title="SKU sem anúncio Shopee casado — não dá pra impulsionar">sem anúncio</span>}
                        <span className="text-[11px] font-bold num px-1.5 py-0.5 rounded shrink-0" style={{ background: 'rgba(255,111,111,.16)', color: '#FF6F6F' }}>-{a.diferenca_pct}%</span>
                      </div>
                    ))}
                    {ameacados.length > 8 && <div className="text-[10px] text-faint text-center">+{ameacados.length - 8} outros</div>}
                  </div>}
            </>}
      </div>

      <div className="flex items-center gap-2">
        <button onClick={aplicar} disabled={aplicando} className="flex-1 py-2 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: '#FF6F6F' }}>
          {aplicando ? <Loader2 size={15} className="animate-spin" /> : <ShieldAlert size={15} />} Verificar e impulsionar agora
        </button>
        <button onClick={carregar} className="h-9 w-9 grid place-items-center rounded-xl glass text-dim hover:text-fg" title="Reavaliar"><RefreshCw size={15} /></button>
      </div>
      <div className="text-[10px] text-faint">Pra o impulso sair de fato, o <b>motor de boost precisa estar ligado</b> (acima). O agente também roda sozinho a cada poucos minutos quando o Radar tem preços novos.</div>
    </div>
  )
}

function BoostCenter({ conectado, notify }) {
  const [bs, setBs] = useState(null)
  const [rodando, setRodando] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [sincNomes, setSincNomes] = useState(false)
  const [autoSel, setAutoSel] = useState(false)
  const editandoJanela = useRef(false)

  const carregar = () => api.shopeeBoostStatus().then((d) => {
    // não sobrescreve a janela enquanto o usuário está mexendo nela
    setBs((b) => (editandoJanela.current && b) ? { ...d, janela_inicio: b.janela_inicio, janela_fim: b.janela_fim } : d)
  }).catch(() => {})
  useEffect(() => {
    carregar()
    const t = setInterval(carregar, 15000)
    return () => clearInterval(t)
  }, [])

  const setConfig = async (patch) => {
    if ('janela_inicio' in patch || 'janela_fim' in patch) editandoJanela.current = true
    setBs((b) => ({ ...b, ...patch }))
    try {
      await api.shopeeBoostConfig(patch)
      if ('janela_inicio' in patch || 'janela_fim' in patch) notify('Janela salva', 'ok')
    } catch (e) {
      notify('Não salvou: ' + e.message, 'danger')
    } finally {
      setTimeout(() => { editandoJanela.current = false }, 1500)
    }
  }
  const sincronizarNomes = async () => {
    setSincNomes(true)
    try {
      const r = await api.shopeeBoostSincronizarNomes()
      notify(r.atualizados ? `${r.atualizados} nome(s) atualizado(s)` : 'Nomes já estavam em dia', 'ok')
      carregar()
    } catch (e) { notify(e.message, 'danger') }
    setSincNomes(false)
  }
  const autoSelecionar = async (estrategia) => {
    setAutoSel(true)
    try {
      const r = await api.shopeeBoostAutoSelecionar(estrategia || bs?.auto_estrategia)
      if (r.acao === 'ok') notify(`${r.selecionados} produto(s) escolhido(s) automaticamente (de ${r.candidatos} candidatos)`, 'ok')
      else if (r.acao === 'sem_catalogo') notify(r.msg || 'Sincronize o catálogo completo primeiro', 'warn')
      else if (r.acao === 'erro') notify(r.erro, 'danger')
      else notify('Nenhum produto elegível encontrado', 'warn')
      carregar()
    } catch (e) { notify(e.message, 'danger') }
    setAutoSel(false)
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

      {/* Boost condicional pelo Radar */}
      <BoostCondicional conectado={conectado} notify={notify} />

      {/* Auto-seleção pelos agentes */}
      <div className="glass rounded-2xl p-4 space-y-3" style={{ border: bs?.auto_selecao ? `1px solid ${LARANJA}` : '1px solid var(--glass-border)' }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-sm font-medium flex items-center gap-2"><Bot size={15} style={{ color: LARANJA }} /> Agente de auto-seleção</div>
            <div className="text-xs text-faint mt-0.5">O agente escolhe os produtos do boost sozinho — sem você selecionar um a um.</div>
          </div>
          <button onClick={() => { const v = !bs?.auto_selecao; setConfig({ auto_selecao: v }); if (v) autoSelecionar() }}
                  disabled={!conectado}
                  className="relative h-7 w-12 rounded-full transition-colors shrink-0 disabled:opacity-50"
                  style={{ background: bs?.auto_selecao ? LARANJA : 'var(--glass-hover)' }}>
            <span className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all" style={{ left: bs?.auto_selecao ? '26px' : '4px' }} />
          </button>
        </div>
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <div className="text-xs text-faint mb-1.5">Estratégia</div>
            <div className="flex gap-1.5">
              {[['estoque_parado', 'Estoque parado', 'Gira o que não vende'], ['margem', 'Maior margem', 'Empurra os mais lucrativos']].map(([id, t, sub]) => (
                <button key={id} onClick={() => { setConfig({ auto_estrategia: id }); if (bs?.auto_selecao) autoSelecionar(id) }}
                        title={sub}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium transition"
                        style={(bs?.auto_estrategia || 'estoque_parado') === id ? { background: LARANJA, color: '#fff' } : { background: 'var(--glass-hover)', color: 'var(--text-dim)' }}>{t}</button>
              ))}
            </div>
          </div>
          <button onClick={() => autoSelecionar()} disabled={autoSel || !conectado}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60"
                  style={{ background: LARANJA }}>
            {autoSel ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />} Selecionar agora
          </button>
        </div>
        {bs?.qtd_auto > 0 && (
          <div className="text-[11px] text-faint flex items-center gap-1.5">
            <CheckCircle2 size={12} style={{ color: 'var(--ok)' }} /> {bs.qtd_auto} produto(s) escolhido(s) pelo agente
            {bs.qtd_manual > 0 && ` · ${bs.qtd_manual} adicionado(s) por você`}. Reabastece sozinho a cada ~12h quando ligado.
          </div>
        )}
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
          <div className="flex items-center gap-2">
            <button onClick={sincronizarNomes} disabled={!conectado || sincNomes}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 disabled:opacity-60"
                    style={{ background: 'var(--glass-hover)', color: 'var(--text-dim)' }} title="Busca os nomes reais dos produtos na Shopee">
              {sincNomes ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Atualizar nomes
            </button>
            <button onClick={() => setAddOpen(true)} disabled={!conectado}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-white flex items-center gap-1.5 disabled:opacity-60"
                    style={{ background: LARANJA }}>
              <Plus size={14} /> Adicionar produtos
            </button>
          </div>
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
  const { itens, carregando, completo } = useItensShopeeProg()
  const [busca, setBusca] = useState('')
  const [sel, setSel] = useState(() => new Set())
  const [salvando, setSalvando] = useState(false)
  const filtrados = useMemo(() => filtrarItens(itens, busca), [itens, busca])
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const salvar = async () => {
    const escolhidos = itens.filter((i) => sel.has(i.item_id))
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
          <BarraBusca valor={busca} onChange={setBusca} carregando={carregando} completo={completo} mostrando={filtrados.length} total={itens.length} />
          {itens.length === 0 && carregando
            ? <div className="py-10 text-center text-faint flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> carregando seus anúncios…</div>
            : itens.length === 0
              ? <div className="py-10 text-center text-faint text-sm">Não consegui listar os anúncios da Shopee. Verifique a conexão da loja.</div>
              : filtrados.length === 0
                ? <div className="py-8 text-center text-faint text-sm">Nenhum anúncio para "{busca}".</div>
                : <div className="space-y-1">
                  {filtrados.map((i) => (
                    <button key={i.item_id} onClick={() => toggle(i.item_id)}
                            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left"
                            style={{ background: sel.has(i.item_id) ? 'rgba(238,77,45,.12)' : 'var(--glass-hover)' }}>
                      <span className="h-4 w-4 rounded grid place-items-center shrink-0"
                            style={{ background: sel.has(i.item_id) ? LARANJA : 'transparent', border: `1px solid ${sel.has(i.item_id) ? LARANJA : 'var(--glass-border)'}` }}>
                        {sel.has(i.item_id) && <CheckCircle2 size={11} className="text-white" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-sm truncate block">{i.nome}</span>
                        {i.sku && <span className="text-[10px] text-faint num">SKU {i.sku}</span>}
                      </span>
                      <span className="text-[11px] text-faint num shrink-0">#{i.item_id}</span>
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
const TONS_UI = [
  ['caloroso', 'Caloroso', '💛'],
  ['profissional', 'Profissional', '🤝'],
  ['descontraido', 'Descontraído', '😄'],
]
const CORES_AVATAR = ['#EE4D2D', '#d6007f', '#7b2a8c', '#8B7FE8', '#F08AAE', '#5BA3F0', '#6BCB77']
function corAvatar(nome) {
  let h = 0; for (const ch of (nome || 'x')) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return CORES_AVATAR[h % CORES_AVATAR.length]
}
function iniciais(nome) {
  const p = (nome || '?').trim().split(/\s+/)
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '?'
}
function dataBR(epoch) {
  if (!epoch) return ''
  const d = new Date(epoch * 1000), hoje = Date.now()
  const dias = Math.floor((hoje - d.getTime()) / 86400000)
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 30) return `há ${dias} dias`
  return d.toLocaleDateString('pt-BR')
}
function Estrelas({ n, size = 14 }) {
  return <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) =>
    <Star key={i} size={size} fill={i < (n || 0) ? LARANJA : 'none'} style={{ color: i < (n || 0) ? LARANJA : 'var(--glass-border)' }} />)}</div>
}

function Avaliacoes({ conectado, notify }) {
  const [filtro, setFiltro] = useState('UNANSWERED')
  const [estrela, setEstrela] = useState(0)
  const [dados, setDados] = useState(null)
  const [cfg, setCfg] = useState(null)
  const [showCfg, setShowCfg] = useState(false)
  const [autoRun, setAutoRun] = useState(false)
  const [ativ, setAtiv] = useState(null)   // estado vivo do agente (progresso, log, contagem)

  const carregar = () => { setDados(null); api.shopeeAvaliacoes(filtro).then(setDados).catch(() => setDados({ erro: true })) }
  useEffect(() => { if (conectado) carregar() }, [filtro, conectado])
  useEffect(() => { if (conectado) api.shopeeReviewConfig().then(setCfg).catch(() => {}) }, [conectado])

  // Polling do estado do agente: rápido quando está trabalhando, lento quando ocioso.
  useEffect(() => {
    if (!conectado) return
    let anterior = false
    const tick = async () => {
      try {
        const a = await api.shopeeReviewAtividade()
        setAtiv(a)
        const rodando = a?.progresso?.em_andamento
        if (anterior && !rodando) carregar()   // acabou um lote → recarrega a lista
        anterior = rodando
      } catch { /* silencioso */ }
    }
    tick()
    const lento = setInterval(tick, 12000)
    let rapido = null
    const ajusta = setInterval(() => {
      const rodando = ativ?.progresso?.em_andamento
      if (rodando && !rapido) rapido = setInterval(tick, 3000)
      if (!rodando && rapido) { clearInterval(rapido); rapido = null }
    }, 2000)
    return () => { clearInterval(lento); clearInterval(ajusta); if (rapido) clearInterval(rapido) }
  }, [conectado, ativ?.progresso?.em_andamento])

  // separa pendentes x respondidas no cliente (garante a divisão, não confia só no filtro da API)
  const brutos = dados?.response?.item_comment_list || dados?.item_comment_list || []
  const temResposta = (c) => !!(c.comment_reply && c.comment_reply.reply)
  const filtrados = filtro === 'ANSWERED' ? brutos.filter(temResposta)
    : filtro === 'UNANSWERED' ? brutos.filter((c) => !temResposta(c))
    : brutos
  const itens = estrela ? filtrados.filter((c) => (c.rating_star || 0) === estrela) : filtrados
  const total = filtrados.length
  const media = total ? filtrados.reduce((s, c) => s + (c.rating_star || 0), 0) / total : 0
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, qtd: filtrados.filter((c) => (c.rating_star || 0) === n).length }))
  const maxQtd = Math.max(1, ...dist.map((d) => d.qtd))

  const contar = async (forcar = true) => {
    try { await api.shopeeReviewContar(forcar); if (forcar) notify('Contando suas avaliações…', 'ok') }
    catch (e) { if (forcar) notify(e.message, 'danger') }
  }
  // conta sozinho ao abrir (usa cache no servidor; só pagina se não tiver contagem fresca)
  useEffect(() => { if (conectado) contar(false) }, [conectado])

  const mutirao = async (completo = false) => {
    try {
      const r = await api.shopeeReviewMutirao(completo)
      if (r.acao === 'ja_rodando') notify(r.msg || 'O agente já está respondendo.', 'warn')
      else notify(r.mensagem || 'Mutirão iniciado — respondendo a fila inteira…', 'ok')
      setTimeout(() => api.shopeeReviewAtividade().then(setAtiv).catch(() => {}), 1200)
    } catch (e) { notify(e.message, 'danger') }
  }
  const parar = async () => {
    try { await api.shopeeReviewParar(); notify('Pedindo para o agente parar…', 'ok') }
    catch (e) { notify(e.message, 'danger') }
  }

  const salvarCfg = async (patch) => {
    setCfg((c) => ({ ...c, ...patch }))
    try { const r = await api.shopeeReviewConfigSalvar(patch); setCfg(r) }
    catch (e) { notify(e.message, 'danger') }
  }
  const rodarAuto = async () => {
    setAutoRun(true)
    try {
      const r = await api.shopeeReviewAuto()
      if (r.acao === 'iniciado') {
        notify(r.mensagem || 'Agente respondendo em segundo plano…', 'ok')
        setTimeout(() => api.shopeeReviewAtividade().then(setAtiv).catch(() => {}), 1500)
      } else {
        notify(`${r.respondidos || 0} resposta(s) enviada(s) pelo agente` + (r.ignorados_para_revisao ? ` · ${r.ignorados_para_revisao} guardada(s) p/ você revisar` : ''), 'ok')
        carregar()
      }
    } catch (e) { notify(e.message, 'danger') }
    setAutoRun(false)
  }

  if (!conectado) return <div className="text-sm text-faint py-6 text-center glass rounded-2xl">Conecte a loja Shopee para gerenciar as avaliações.</div>

  const auto = cfg?.modo === 'auto'
  const faixaAuto = (cfg?.auto_estrelas || [4, 5]).slice().sort().join(' e ')

  return (
    <div className="space-y-3">
      {/* Barra de modo + config */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 rounded-xl grid place-items-center shrink-0" style={{ background: 'rgba(238,77,45,.12)' }}>
              <MessageSquare size={18} style={{ color: LARANJA }} />
            </div>
            <div className="min-w-0">
              <div className="font-display font-semibold leading-tight">Avaliações da loja</div>
              <div className="text-xs text-faint">A IA lê cada review e responde no padrão da sua loja.</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg p-0.5" style={{ background: 'var(--glass-hover)' }}>
              {[['manual', 'Manual'], ['auto', 'Automático']].map(([id, t]) => (
                <button key={id} onClick={() => salvarCfg({ modo: id })}
                        className="text-xs px-3 py-1.5 rounded-md font-medium transition"
                        style={(cfg?.modo || 'manual') === id ? { background: LARANJA, color: '#fff' } : { color: 'var(--text-dim)' }}>{t}</button>
              ))}
            </div>
            <button onClick={() => setShowCfg(true)} title="Configurar a IA"
                    className="h-8 w-8 grid place-items-center rounded-lg glass hover:text-fg text-dim">
              <SlidersHorizontal size={16} />
            </button>
          </div>
        </div>
        {auto && (
          <div className="mt-3 rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background: 'rgba(238,77,45,.08)', border: `1px solid rgba(238,77,45,.25)` }}>
            <Bot size={15} style={{ color: LARANJA }} className="shrink-0" />
            <span className="text-xs text-dim">O agente responde sozinho as notas <b style={{ color: LARANJA }}>{faixaAuto}★</b> de hora em hora. Pra limpar a fila toda agora, use <b>“Responder todas as pendentes”</b> abaixo. Notas mais baixas ficam pra você revisar com cuidado.</span>
          </div>
        )}
      </div>

      {/* Painel de atividade do agente — contadores + progresso ao vivo + feed */}
      <AgenteAtividade ativ={ativ} onContar={() => contar(true)} onMutirao={mutirao} onParar={parar} notasAlvo={faixaAuto} />

      {/* Distribuição de notas */}
      {total > 0 && (
        <div className="glass rounded-2xl p-4 flex items-center gap-5 flex-wrap">
          <div className="text-center shrink-0">
            <div className="text-3xl font-display font-bold leading-none" style={{ color: LARANJA }}>{media.toFixed(1)}</div>
            <div className="mt-1"><Estrelas n={Math.round(media)} size={13} /></div>
            <div className="text-[11px] text-faint mt-1">{total} avaliação(ões)</div>
          </div>
          <div className="flex-1 min-w-[180px] space-y-1">
            {dist.map((d) => (
              <button key={d.n} onClick={() => setEstrela(estrela === d.n ? 0 : d.n)}
                      className="w-full flex items-center gap-2 group">
                <span className="text-[11px] text-faint w-3 text-right">{d.n}</span>
                <Star size={11} fill={LARANJA} style={{ color: LARANJA }} />
                <span className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--glass-hover)' }}>
                  <span className="block h-full rounded-full transition-all" style={{ width: `${(d.qtd / maxQtd) * 100}%`, background: estrela === d.n ? LARANJA : 'rgba(238,77,45,.45)' }} />
                </span>
                <span className="text-[11px] text-faint num w-6">{d.qtd}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1.5">
          {[['UNANSWERED', 'Sem resposta', ativ?.contagem?.pendentes], ['ANSWERED', 'Respondidas', ativ?.contagem?.respondidas], ['ALL', 'Todas', ativ?.contagem?.total]].map(([id, t, n]) => (
            <button key={id} onClick={() => { setFiltro(id); setEstrela(0) }} className="text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5"
                    style={filtro === id ? { background: LARANJA, color: '#fff' } : { background: 'var(--glass)', color: 'var(--text-dim)', border: '1px solid var(--glass-border)' }}>
              {t}
              {n != null && <span className="text-[10px] num px-1.5 py-0.5 rounded-md" style={{ background: filtro === id ? 'rgba(255,255,255,.25)' : 'var(--glass-hover)' }}>{n}{ativ?.contagem?.parcial ? '+' : ''}</span>}
            </button>
          ))}
        </div>
        {estrela > 0 && (
          <button onClick={() => setEstrela(0)} className="text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1" style={{ background: 'rgba(238,77,45,.12)', color: LARANJA }}>
            {estrela}★ <X size={11} />
          </button>
        )}
        <button onClick={carregar} className="text-xs px-2.5 py-1.5 rounded-lg text-dim hover:text-fg flex items-center gap-1 ml-auto"><RefreshCw size={12} /> atualizar</button>
      </div>

      {/* Lista */}
      {dados === null && <div className="py-10 text-center text-faint flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> carregando avaliações…</div>}
      {dados !== null && itens.length === 0 && <div className="text-sm text-faint py-8 text-center glass rounded-2xl">Nenhuma avaliação {filtro === 'UNANSWERED' ? 'sem resposta' : estrela ? `de ${estrela}★` : ''} no momento.</div>}
      <div className="space-y-2.5">
        {itens.map((c) => <ReviewCard key={c.comment_id} c={c} cfg={cfg} notify={notify} onRespondida={carregar} />)}
      </div>

      {showCfg && cfg && <ConfigReviewIA cfg={cfg} onSalvar={salvarCfg} onClose={() => setShowCfg(false)} />}
    </div>
  )
}

function _haQuanto(iso) {
  if (!iso) return ''
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'agora'
  if (s < 3600) return `há ${Math.floor(s / 60)} min`
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`
  return `há ${Math.floor(s / 86400)} d`
}

function AgenteAtividade({ ativ, onContar, onMutirao, onParar, notasAlvo }) {
  const p = ativ?.progresso || {}
  const c = ativ?.contagem
  const log = ativ?.log || []
  const rodando = !!p.em_andamento
  const varrendo = rodando && p.fase === 'varrendo_produtos'
  const descobrindo = rodando && (p.fase === 'descobrindo' || varrendo)
  const pct = p.alvo ? Math.round((p.processados / p.alvo) * 100) : 0
  const pend = c?.pendentes

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      {/* Contadores */}
      <div className="flex items-stretch gap-2 flex-wrap">
        <Contador rotulo="Total" valor={c?.total} parcial={c?.parcial} cor="var(--text-dim)" />
        <Contador rotulo="Respondidas" valor={c?.respondidas} parcial={c?.parcial} cor="var(--ok, #14B8A6)" />
        <Contador rotulo="Pendentes" valor={c?.pendentes} parcial={c?.parcial} cor={LARANJA} destaque />
        <button onClick={onContar} disabled={ativ?.contando}
                className="ml-auto self-center text-xs px-3 py-2 rounded-lg glass text-dim hover:text-fg flex items-center gap-1.5 disabled:opacity-60">
          {ativ?.contando ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {ativ?.contando ? 'contando…' : c ? 'recontar' : 'contar avaliações'}
        </button>
      </div>
      {c?.parcial && <div className="text-[10px] text-faint">Loja com muitas avaliações — contagem parcial (amostra das primeiras páginas).</div>}

      {/* Ação principal: mutirão / parar */}
      {rodando ? (
        <button onClick={onParar}
                className="w-full text-sm px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2"
                style={{ background: 'rgba(255,111,111,.12)', color: 'var(--danger, #FF6F6F)', border: '1px solid rgba(255,111,111,.3)' }}>
          <Square size={15} fill="currentColor" /> Parar o agente
        </button>
      ) : (
        (pend == null || pend > 0) && (
          <div className="space-y-2">
            <button onClick={() => onMutirao(false)}
                    className="w-full text-sm px-4 py-2.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
                    style={{ background: LARANJA }}>
              <Sparkles size={15} /> Responder pendentes recentes{pend != null ? ` (${pend})` : ''}
              {notasAlvo ? <span className="text-[11px] font-normal opacity-90">· notas {notasAlvo}★</span> : null}
            </button>
            <button onClick={() => onMutirao(true)}
                    className="w-full text-xs px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 glass text-dim hover:text-fg">
              <Layers size={13} /> Buscar avaliações antigas (varredura completa de todos os produtos)
            </button>
            <div className="text-[10px] text-faint text-center">
              A busca rápida da Shopee só alcança as ~1.000 mais recentes. Use a varredura completa para pegar a fila antiga (demora mais — percorre produto por produto).
            </div>
          </div>
        )
      )}

      {/* Barra de progresso ao vivo */}
      {rodando ? (
        <div className="rounded-xl p-3" style={{ background: 'rgba(238,77,45,.08)', border: '1px solid rgba(238,77,45,.25)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: LARANJA }} />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: LARANJA }} />
            </span>
            <span className="text-xs font-semibold" style={{ color: LARANJA }}>
              {varrendo ? 'Varrendo produtos (avaliações antigas)…' : descobrindo ? 'Mapeando a fila de avaliações…' : 'Agente respondendo agora…'}
            </span>
            <span className="text-xs text-dim ml-auto num">
              {varrendo ? `${p.prod_atual || 0}/${p.prod_total || 0} · ${p.alvo || 0} achadas`
                : descobrindo ? `${p.alvo || 0} encontradas` : `${p.processados} de ${p.alvo}`}
            </span>
          </div>
          {!descobrindo && (
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--glass-hover)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: LARANJA }} />
            </div>
          )}
          {varrendo && p.prod_total ? (
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--glass-hover)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round((p.prod_atual / p.prod_total) * 100)}%`, background: LARANJA }} />
            </div>
          ) : null}
          {descobrindo && <div className="text-[11px] text-faint">{varrendo ? 'Percorrendo produto por produto para alcançar as avaliações antigas que a busca rápida não traz.' : 'Percorrendo as páginas pra montar a fila completa antes de começar a responder.'}</div>}
          {!descobrindo && p.ultimo && (
            <div className="text-[11px] text-dim mt-2 flex items-center gap-1.5">
              <CheckCircle2 size={12} style={{ color: 'var(--ok, #14B8A6)' }} />
              respondeu {p.ultimo.nota}★ de <b>@{p.ultimo.buyer}</b>{p.ultimo.produto ? ` · ${p.ultimo.produto}` : ''}
            </div>
          )}
        </div>
      ) : p.resumo ? (
        <div className="text-xs rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background: 'var(--glass-hover)' }}>
          <CheckCircle2 size={14} style={{ color: 'var(--ok, #14B8A6)' }} />
          <span className="text-dim">
            {p.resumo.interrompido ? 'Mutirão interrompido' : 'Mutirão concluído'} — <b style={{ color: 'var(--ok, #14B8A6)' }}>{p.resumo.respondidos}</b> resposta(s)
            {p.resumo.falhas ? ` · ${p.resumo.falhas} falha(s)` : ''} {p.fim ? `· ${_haQuanto(p.fim)}` : ''}
          </span>
        </div>
      ) : (
        <div className="text-xs text-faint flex items-center gap-1.5">
          <Bot size={13} /> Agente ocioso. {pend > 0 ? 'Clique acima pra responder a fila inteira.' : 'Sem pendências no momento.'}
        </div>
      )}

      {/* Feed das últimas respostas */}
      {log.length > 0 && (
        <div className="pt-1">
          <div className="text-[11px] text-faint mb-1.5 flex items-center gap-1"><Activity size={12} /> Últimas respostas do agente</div>
          <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
            {log.map((l, i) => (
              <div key={i} className="flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5" style={{ background: 'var(--glass-hover)' }}>
                <span className="flex items-center gap-0.5 shrink-0" style={{ color: LARANJA }}>
                  {l.nota}<Star size={9} fill={LARANJA} />
                </span>
                <span className="text-dim truncate flex-1">
                  <b>@{l.buyer || 'cliente'}</b>{l.produto ? ` · ${l.produto}` : ''}
                  {l.trecho ? <span className="text-faint"> — “{l.trecho}{l.trecho.length >= 140 ? '…' : ''}”</span> : ''}
                </span>
                <span className="text-[10px] text-faint shrink-0">{l.modo === 'auto' ? 'auto' : 'manual'} · {_haQuanto(l.quando)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Contador({ rotulo, valor, parcial, cor, destaque }) {
  return (
    <div className="rounded-xl px-3 py-2 text-center min-w-[88px]" style={{ background: destaque ? 'rgba(238,77,45,.1)' : 'var(--glass-hover)', border: destaque ? '1px solid rgba(238,77,45,.25)' : '1px solid transparent' }}>
      <div className="text-lg font-display font-bold leading-none num" style={{ color: cor }}>
        {valor == null ? '—' : valor}{parcial && valor != null ? '+' : ''}
      </div>
      <div className="text-[10px] text-faint mt-1">{rotulo}</div>
    </div>
  )
}

function ReviewCard({ c, cfg, notify, onRespondida }) {
  const respondida = !!c.comment_reply?.reply
  const [aberto, setAberto] = useState(false)
  const [rascunho, setRascunho] = useState('')
  const [gerando, setGerando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const limite = cfg?.limite_chars || 450
  const nota = c.rating_star || 0
  const baixa = nota > 0 && nota <= 3
  const fotos = c.media?.image_url_list || c.image_url_list || []

  const gerar = async (tom) => {
    setGerando(true); setAberto(true)
    try {
      const r = await api.shopeeReviewSugerir({
        nota, comentario: c.comment || '', produto: c.produto_nome,
        nome: c.buyer_username, tom,
      })
      setRascunho(r.texto || '')
    } catch (e) { notify(e.message, 'danger') }
    setGerando(false)
  }
  const enviar = async () => {
    if (!rascunho.trim()) return
    setEnviando(true)
    try { await api.shopeeResponder({ comment_id: c.comment_id, texto: rascunho.trim() }); notify('Resposta enviada', 'ok'); onRespondida() }
    catch (e) { notify(e.message, 'danger') }
    setEnviando(false)
  }

  return (
    <div className="glass rounded-2xl p-3.5" style={baixa && !respondida ? { borderLeft: `3px solid ${LARANJA}` } : undefined}>
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-full grid place-items-center text-xs font-bold text-white shrink-0" style={{ background: corAvatar(c.buyer_username) }}>
          {iniciais(c.buyer_username)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{c.buyer_username || 'comprador'}</span>
            <Estrelas n={nota} size={13} />
            <span className="text-[11px] text-faint">· {dataBR(c.comment_time || c.create_time)}</span>
            {baixa && !respondida && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(238,77,45,.15)', color: LARANJA }}>atenção</span>}
          </div>

          {/* produto */}
          {(c.produto_nome || c.produto_imagem) && (
            <div className="flex items-center gap-2 mt-1.5">
              {c.produto_imagem && <img src={c.produto_imagem} alt="" className="h-6 w-6 rounded object-cover" style={{ border: '1px solid var(--glass-border)' }} />}
              <span className="text-[11px] text-faint truncate">{c.produto_nome || `#${c.item_id}`}</span>
            </div>
          )}

          {/* comentário */}
          <div className="text-sm mt-1.5 leading-relaxed">{c.comment || <span className="text-faint italic">sem comentário escrito</span>}</div>

          {/* fotos do comprador */}
          {fotos.length > 0 && (
            <div className="flex gap-1.5 mt-2">
              {fotos.slice(0, 5).map((u, i) => (
                <a key={i} href={u} target="_blank" rel="noreferrer">
                  <img src={u} alt="" className="h-12 w-12 rounded-lg object-cover" style={{ border: '1px solid var(--glass-border)' }} />
                </a>
              ))}
            </div>
          )}

          {/* resposta existente */}
          {respondida && (
            <div className="mt-2.5 rounded-xl px-3 py-2" style={{ background: 'var(--glass-hover)' }}>
              <div className="text-[11px] font-medium flex items-center gap-1.5 mb-0.5" style={{ color: LARANJA }}><ThumbsUp size={11} /> Sua resposta</div>
              <div className="text-xs text-dim leading-relaxed">{c.comment_reply.reply}</div>
            </div>
          )}

          {/* composer */}
          {!respondida && (
            <div className="mt-2.5">
              {!aberto && rascunho === '' ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => gerar()} disabled={gerando}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white flex items-center gap-1.5 disabled:opacity-60" style={{ background: LARANJA }}>
                    {gerando ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />} Gerar resposta com IA
                  </button>
                  <button onClick={() => setAberto(true)} className="text-xs px-3 py-1.5 rounded-lg font-medium glass text-dim hover:text-fg flex items-center gap-1.5">
                    <MessageSquare size={13} /> Escrever eu mesmo
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <textarea value={rascunho} onChange={(e) => setRascunho(e.target.value)} rows={3}
                              placeholder="Escreva ou gere uma resposta…"
                              className="w-full glass rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none resize-none leading-relaxed"
                              style={{ borderColor: rascunho.length > limite ? 'var(--danger)' : undefined }} />
                    {gerando && <div className="absolute inset-0 grid place-items-center rounded-xl" style={{ background: 'rgba(0,0,0,.25)' }}><Loader2 size={18} className="animate-spin" style={{ color: LARANJA }} /></div>}
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-faint mr-0.5">tom:</span>
                      {TONS_UI.map(([id, t, e]) => (
                        <button key={id} onClick={() => gerar(id)} disabled={gerando} title={`Gerar ${t.toLowerCase()}`}
                                className="text-[11px] px-2 py-1 rounded-md glass text-dim hover:text-fg disabled:opacity-50">{e} {t}</button>
                      ))}
                    </div>
                    <span className="text-[10px] num" style={{ color: rascunho.length > limite ? 'var(--danger)' : 'var(--faint)' }}>{rascunho.length}/{limite}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={enviar} disabled={enviando || !rascunho.trim()}
                            className="text-xs px-3.5 py-2 rounded-lg font-semibold text-white flex items-center gap-1.5 disabled:opacity-60" style={{ background: LARANJA }}>
                      {enviando ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Enviar resposta
                    </button>
                    <button onClick={() => gerar(cfg?.tom)} disabled={gerando} className="text-xs px-3 py-2 rounded-lg glass text-dim hover:text-fg flex items-center gap-1.5">
                      <RefreshCw size={12} /> Regerar
                    </button>
                    {rascunho && <button onClick={() => { setRascunho(''); setAberto(false) }} className="text-xs px-2 py-2 rounded-lg text-faint hover:text-fg">limpar</button>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ConfigReviewIA({ cfg, onSalvar, onClose }) {
  const [f, setF] = useState(cfg)
  const up = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const toggleEstrela = (n) => setF((x) => {
    const s = new Set(x.auto_estrelas || []); s.has(n) ? s.delete(n) : s.add(n)
    return { ...x, auto_estrelas: [...s].sort() }
  })
  const salvar = () => { onSalvar(f); onClose() }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: 'rgba(0,0,0,.5)' }} onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col" style={{ background: 'var(--bg-elev, var(--glass))', backdropFilter: 'blur(20px)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-glassb">
          <div className="font-display font-semibold flex items-center gap-2"><Settings2 size={17} style={{ color: LARANJA }} /> Como a IA responde</div>
          <button onClick={onClose} className="text-faint hover:text-fg"><X size={18} /></button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* tom */}
          <div>
            <div className="text-xs text-dim mb-1.5 font-medium">Tom de voz</div>
            <div className="flex gap-1.5">
              {TONS_UI.map(([id, t, e]) => (
                <button key={id} onClick={() => up('tom', id)} className="flex-1 text-xs px-3 py-2 rounded-lg font-medium transition"
                        style={f.tom === id ? { background: LARANJA, color: '#fff' } : { background: 'var(--glass-hover)', color: 'var(--text-dim)' }}>{e} {t}</button>
              ))}
            </div>
          </div>
          {/* assinatura + saudação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-dim mb-1.5 font-medium">Assinatura (fim da resposta)</div>
              <input value={f.assinatura || ''} onChange={(e) => up('assinatura', e.target.value)} placeholder="Equipe Sóstrass"
                     className="w-full glass rounded-lg px-3 py-2 text-sm bg-transparent outline-none" />
            </div>
            <div>
              <div className="text-xs text-dim mb-1.5 font-medium">Saudação (opcional)</div>
              <input value={f.saudacao || ''} onChange={(e) => up('saudacao', e.target.value)} placeholder="Oi, tudo bem?"
                     className="w-full glass rounded-lg px-3 py-2 text-sm bg-transparent outline-none" />
            </div>
          </div>
          {/* limite */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-xs text-dim font-medium">Tamanho máximo da resposta</div>
              <span className="text-xs num" style={{ color: LARANJA }}>{f.limite_chars || 450} caracteres</span>
            </div>
            <input type="range" min="150" max="900" step="50" value={f.limite_chars || 450}
                   onChange={(e) => up('limite_chars', Number(e.target.value))} className="w-full" style={{ accentColor: LARANJA }} />
          </div>
          {/* instruções */}
          <div>
            <div className="text-xs text-dim mb-1.5 font-medium">Regras da loja (instruções livres pra IA)</div>
            <textarea value={f.instrucoes || ''} onChange={(e) => up('instrucoes', e.target.value)} rows={3}
                      placeholder="Ex.: sempre lembrar que enviamos em até 24h; oferecer 5% na próxima compra com o cupom VOLTA5; nunca prometer reembolso sem avaliar."
                      className="w-full glass rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none resize-none leading-relaxed" />
          </div>
          {/* toggles */}
          <div className="space-y-2">
            {[
              ['usar_nome', 'Chamar o cliente pelo nome', <Smile size={14} key="a" />],
              ['usar_emoji', 'Permitir emojis leves', <Smile size={14} key="b" />],
              ['oferecer_chat', 'Em notas baixas, oferecer resolver pelo chat', <MessageSquare size={14} key="c" />],
            ].map(([k, label, ic]) => (
              <button key={k} onClick={() => up(k, !f[k])} className="w-full flex items-center justify-between rounded-lg px-3 py-2.5" style={{ background: 'var(--glass-hover)' }}>
                <span className="text-sm text-dim flex items-center gap-2">{ic} {label}</span>
                <span className="relative h-5 w-9 rounded-full transition-colors shrink-0" style={{ background: f[k] ? LARANJA : 'var(--glass-border)' }}>
                  <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all" style={{ left: f[k] ? '18px' : '2px' }} />
                </span>
              </button>
            ))}
          </div>
          {/* auto estrelas */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(238,77,45,.06)', border: '1px solid rgba(238,77,45,.2)' }}>
            <div className="text-xs text-dim font-medium flex items-center gap-1.5 mb-2"><Bot size={14} style={{ color: LARANJA }} /> No modo automático, responder sozinho as notas:</div>
            <div className="flex gap-1.5">
              {[5, 4, 3, 2, 1].map((n) => {
                const on = (f.auto_estrelas || []).includes(n)
                return (
                  <button key={n} onClick={() => toggleEstrela(n)} className="flex-1 text-xs py-2 rounded-lg font-medium flex items-center justify-center gap-0.5 transition"
                          style={on ? { background: LARANJA, color: '#fff' } : { background: 'var(--glass-hover)', color: 'var(--text-dim)' }}>
                    {n}<Star size={10} fill={on ? '#fff' : 'none'} />
                  </button>
                )
              })}
            </div>
            <div className="text-[10px] text-faint mt-1.5">Recomendado deixar só 4 e 5. Notas baixas pedem um olhar humano.</div>
          </div>
          {/* ritmo / anti-flood */}
          <div className="rounded-xl p-3 space-y-3" style={{ background: 'var(--glass-hover)' }}>
            <div className="text-xs text-dim font-medium flex items-center gap-1.5"><Clock size={14} style={{ color: LARANJA }} /> Ritmo das respostas (anti-flood)</div>
            <SliderRegra label="Pausa entre respostas" valor={f.auto_pausa_seg ?? 5} min={0} max={30} sufixo=" s"
                         onChange={(v) => up('auto_pausa_seg', v)} dica="espaça as chamadas pra não disparar tudo de uma vez na API da Shopee" />
            <SliderRegra label="Máximo por ciclo" valor={f.auto_max_ciclo ?? 10} min={1} max={100}
                         onChange={(v) => up('auto_max_ciclo', v)} dica="quantas avaliações o agente responde a cada rodada (de hora em hora); o resto fica pro próximo ciclo" />
            <div className="text-[10px] text-faint">O agente roda a cada hora. Com pausa de 5s e teto de 10, são até ~10 respostas espaçadas por rodada — o suficiente pra ir limpando a fila sem parecer robô nem floodar.</div>
          </div>
        </div>
        <div className="p-4 border-t border-glassb flex justify-end">
          <button onClick={salvar} className="rounded-lg px-4 py-2 text-sm font-semibold text-white flex items-center gap-2" style={{ background: LARANJA }}>
            <CheckCircle2 size={15} /> Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

/* -------------------- MOTOR DE PROMOÇÕES AUTOMÁTICAS --------------------- */
const money = (x) => 'R$ ' + Number(x || 0).toFixed(2).replace('.', ',')
function corMargem(m) { return m >= 20 ? 'var(--ok, #14B8A6)' : m >= 10 ? '#d6007f' : 'var(--danger, #FF6F6F)' }

function MiniToggle({ on, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
            className="relative h-6 w-11 rounded-full transition-colors shrink-0 disabled:opacity-50"
            style={{ background: on ? LARANJA : 'var(--glass-border)' }}>
      <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all" style={{ left: on ? '22px' : '2px' }} />
    </button>
  )
}
function SliderRegra({ label, valor, min, max, step = 1, sufixo = '', onChange, dica }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-dim font-medium">{label}</span>
        <span className="text-xs num" style={{ color: LARANJA }}>{valor}{sufixo}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={valor}
             onChange={(e) => onChange(Number(e.target.value))} className="w-full" style={{ accentColor: LARANJA }} />
      {dica && <div className="text-[10px] text-faint mt-0.5">{dica}</div>}
    </div>
  )
}

function DiagDescontoRaw({ d, onClose }) {
  if (d?.erro) return (
    <div className="glass rounded-2xl p-4" style={{ borderLeft: '3px solid #FF6F6F' }}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-medium flex items-center gap-2" style={{ color: '#FF6F6F' }}><AlertTriangle size={15} /> Diagnóstico falhou</div>
        <button onClick={onClose} className="text-faint hover:text-fg"><X size={14} /></button>
      </div>
      <div className="text-xs text-dim">{d.erro}</div>
    </div>
  )
  const erros = d.error_list || []
  const ok = d.ok
  return (
    <div className="glass rounded-2xl p-4 space-y-3" style={{ borderLeft: `3px solid ${ok ? '#2DD4BF' : '#d6007f'}` }}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium flex items-center gap-2"><Stethoscope size={15} style={{ color: LARANJA }} /> Diagnóstico do desconto</div>
        <button onClick={onClose} className="text-faint hover:text-fg"><X size={14} /></button>
      </div>
      {!d.produto ? (
        <div className="text-xs text-dim">{d.motivo || 'Nenhum produto elegível para testar.'}</div>
      ) : (
        <>
          <div className="text-xs flex items-center gap-1.5 flex-wrap">
            <span>Produto testado:</span><b>{d.produto.nome}</b>
            <span className="text-[10px] px-1.5 py-0.5 rounded num text-faint" style={{ background: 'var(--glass-hover)' }}>SKU {d.produto.sku}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded num" style={{ background: 'var(--glass-hover)', color: 'var(--text-dim)' }}>#{d.produto.item_id}</span>
            <span className="num text-dim">{brl(d.produto.preco_atual)} → <b style={{ color: LARANJA }}>{brl(d.produto.preco_promo)}</b> (−{d.produto.desconto_pct}%)</span>
          </div>
          {ok ? (
            <div className="text-sm flex items-center gap-2" style={{ color: '#2DD4BF' }}>
              <CheckCircle2 size={15} /> Funcionou — o produto entrou no desconto de teste. Pode aplicar normalmente.
            </div>
          ) : (
            <div className="rounded-xl p-3" style={{ background: 'color-mix(in srgb, #d6007f 10%, transparent)' }}>
              <div className="text-xs font-semibold mb-1.5" style={{ color: '#d6007f' }}>A Shopee recusou o produto. Motivo exato:</div>
              {erros.length ? (
                <ul className="space-y-1">
                  {erros.map((e, i) => (
                    <li key={i} className="text-[11px] num text-dim">
                      anúncio {e.item_id}{e.model_id != null ? ` · var ${e.model_id}` : ''}: <b style={{ color: '#FF6F6F' }}>{e.fail_message || e.fail_error || e.error || JSON.stringify(e)}</b>
                    </li>
                  ))}
                </ul>
              ) : <div className="text-[11px] text-dim">A Shopee não retornou um motivo na error_list — confira as respostas cruas abaixo (provável recusa já na criação).</div>}
            </div>
          )}
          <details className="text-[11px]">
            <summary className="cursor-pointer text-faint hover:text-fg">ver respostas cruas da Shopee (payload + cada etapa)</summary>
            <pre className="mt-2 p-2 rounded-lg overflow-auto num" style={{ background: 'var(--glass-hover)', maxHeight: 320, fontSize: 10 }}>
{JSON.stringify({ payload_enviado: d.payload_enviado, etapas: d.etapas }, null, 2)}
            </pre>
          </details>
          {d.aviso && <div className="text-[10px] text-faint">{d.aviso}</div>}
        </>
      )}
    </div>
  )
}

function DiagnosticoPromo({ msg, diag }) {
  // funil: cada etapa com a contagem; a 1ª que zera é o ponto de quebra
  const etapas = diag ? [
    ['Produtos no catálogo', diag.catalogo_skus],
    ['Anúncios na Shopee', diag.shopee_itens],
    ['SKU casou com o catálogo', diag.sku_casado, diag.anuncios_sem_sku ? `${diag.anuncios_sem_sku} anúncio(s) sem SKU` : null],
    ['Passaram no estoque mínimo', diag.passaram_estoque],
    [`Margem calculável${diag.canal_shopee_configurado ? '' : ' (canal Shopee não configurado!)'}`, diag.margem_calculavel],
    ['Acima do piso de margem', diag.passaram_piso],
    ['Cabe desconto seguro', diag.com_desconto_seguro],
    ['Elegíveis', diag.elegiveis],
  ] : []
  // índice do ponto de quebra: primeira etapa = 0 cujo anterior > 0
  let quebra = -1
  for (let i = 0; i < etapas.length; i++) {
    const v = etapas[i][1]
    const prev = i === 0 ? 1 : etapas[i - 1][1]
    if (v === 0 && prev > 0) { quebra = i; break }
  }
  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-start gap-2.5">
        <div className="h-8 w-8 rounded-lg grid place-items-center shrink-0" style={{ background: 'rgba(238,77,45,.12)' }}>
          <Stethoscope size={16} style={{ color: LARANJA }} />
        </div>
        <div>
          <div className="text-sm font-semibold mb-0.5">Nenhum produto elegível — veja o porquê</div>
          <div className="text-xs text-dim leading-relaxed">{msg}</div>
        </div>
      </div>
      {etapas.length > 0 && (
        <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'var(--glass-hover)' }}>
          {etapas.map(([label, valor, nota], i) => {
            const isQuebra = i === quebra
            const cor = valor === 0 ? (isQuebra ? 'var(--danger, #FF6F6F)' : 'var(--text-faint)') : 'var(--ok, #14B8A6)'
            return (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: cor }} />
                <span className="flex-1" style={{ color: isQuebra ? 'var(--danger, #FF6F6F)' : 'var(--text-dim)' }}>{label}</span>
                {nota && <span className="text-[10px] text-faint">{nota}</span>}
                <span className="num font-semibold" style={{ color: cor }}>{valor}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const HIST_TIPO_LABEL = { desconto: 'Desconto', flash: 'Flash', bundle: 'Combo', addon: 'Add-on', cupom: 'Cupom' }
const HIST_MOTIVO_LABEL = { agendado: 'automática', queda: 'por queda nas vendas', manual: 'manual' }

function HistMotorItem({ h }) {
  const [aberto, setAberto] = useState(false)
  const [det, setDet] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const podeExpandir = h.ref_id && (h.tipo === 'desconto' || h.tipo === 'flash')
  const cor = h.tipo === 'flash' ? '#F59E0B' : LARANJA
  const Icon = h.tipo === 'flash' ? Flame : Percent
  const dt = h.criado_em ? new Date(h.criado_em) : null
  const abrir = async () => {
    if (!podeExpandir) return
    if (aberto) { setAberto(false); return }
    setAberto(true)
    if (det) return
    setCarregando(true)
    try { setDet(await api.shopeeCampanhaDetalhe(h.tipo, h.ref_id)) } catch { setDet({ erro: true }) }
    setCarregando(false)
  }
  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'var(--glass-hover)' }}>
      <button onClick={abrir} className="w-full px-3 py-2 flex items-center gap-2 text-left" style={{ cursor: podeExpandir ? 'pointer' : 'default' }}>
        <div className="h-6 w-6 rounded grid place-items-center shrink-0" style={{ background: `color-mix(in srgb, ${cor} 16%, transparent)` }}><Icon size={12} style={{ color: cor }} /></div>
        <span className="text-[10px] uppercase font-bold tracking-wide shrink-0" style={{ color: cor }}>{HIST_TIPO_LABEL[h.tipo] || h.tipo}</span>
        <span className="text-xs text-dim flex-1 min-w-0 truncate">{h.qtd_itens} {h.qtd_itens === 1 ? 'produto' : 'produtos'} · -{h.desconto_pct}%</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0 font-medium" style={{ background: h.motivo === 'manual' ? 'var(--glass)' : 'rgba(20,184,166,.14)', color: h.motivo === 'manual' ? 'var(--text-faint)' : '#2DD4BF' }}>{HIST_MOTIVO_LABEL[h.motivo] || h.motivo}</span>
        <span className="text-[10px] text-faint shrink-0 hidden sm:inline">{dt ? dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</span>
        {podeExpandir && <ChevronDown size={12} className="text-faint shrink-0" style={{ transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />}
      </button>
      {aberto && podeExpandir && (
        <div className="px-3 pb-2.5 pt-1 border-t" style={{ borderColor: 'var(--glass-border)' }}>
          {carregando ? <div className="text-[11px] text-faint flex items-center gap-1.5 py-1"><Loader2 size={11} className="animate-spin" /> carregando produtos…</div>
            : det?.erro ? <div className="text-[11px] text-faint py-1">Não consegui carregar os produtos (a campanha pode ter expirado).</div>
            : (det?.itens || []).length === 0 ? <div className="text-[11px] text-faint py-1">Sem produtos para mostrar.</div>
            : <div className="space-y-1 mt-1">
                {det.itens.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    {p.imagem ? <img src={p.imagem} className="h-7 w-7 rounded object-cover shrink-0" alt="" /> : <div className="h-7 w-7 rounded shrink-0" style={{ background: 'var(--glass)' }} />}
                    <span className="truncate flex-1">{p.nome}</span>
                    {p.preco_original && <span className="text-faint line-through num">{brl(p.preco_original)}</span>}
                    {p.preco_promo && <span className="num font-semibold" style={{ color: cor }}>{brl(p.preco_promo)}</span>}
                    {p.desconto_pct != null && <span className="text-[9px] px-1 rounded num" style={{ background: `color-mix(in srgb, ${cor} 14%, transparent)`, color: cor }}>-{p.desconto_pct}%</span>}
                  </div>
                ))}
              </div>}
        </div>
      )}
    </div>
  )
}

function MotorPromocoes({ conectado, notify }) {
  const [cfg, setCfg] = useState(null)
  const [propostas, setPropostas] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [diagRaw, setDiagRaw] = useState(null)
  const [diagLoad, setDiagLoad] = useState(false)
  const [sel, setSel] = useState(() => new Set())
  const [gerando, setGerando] = useState(false)
  const [aplicando, setAplicando] = useState(false)
  const [rodando, setRodando] = useState(false)
  const [queda, setQueda] = useState(null)
  const [hist, setHist] = useState([])

  const recarregarMeta = () => {
    api.shopeePromoQueda().then(setQueda).catch(() => {})
    api.shopeePromoHistorico().then((r) => setHist(r.itens || [])).catch(() => {})
  }
  useEffect(() => {
    if (!conectado) return
    api.shopeePromoConfig().then(setCfg).catch(() => {})
    recarregarMeta()
  }, [conectado])

  const salvar = async (patch) => {
    setCfg((c) => ({ ...c, ...patch }))
    try {
      const r = await api.shopeePromoConfigSalvar(patch)
      setCfg(r)
      if (r.disparo_imediato) {
        notify('Modo automático ligado — o agente está criando as promoções agora…', 'ok')
        setTimeout(recarregarMeta, 4000)
        setTimeout(recarregarMeta, 9000)
      }
    } catch (e) { notify(e.message, 'danger') }
  }
  const gerar = async () => {
    setGerando(true); setPropostas(null)
    try {
      const r = await api.shopeePromoPropor()
      setPropostas(r)
      setSel(new Set((r.propostas || []).map((p) => p.item_id)))  // tudo marcado por padrão
      if (r.acao === 'vazio') notify(r.msg || 'Nenhum produto elegível', 'warn')
    } catch (e) { notify(e.message, 'danger') }
    setGerando(false)
  }
  const aplicar = async () => {
    const escolhidas = (propostas?.propostas || []).filter((p) => sel.has(p.item_id))
    if (!escolhidas.length) return notify('Selecione ao menos um produto', 'warn')
    setAplicando(true)
    try {
      const r = await api.shopeePromoAplicar({ propostas: escolhidas, tipo: cfg?.tipo })
      setResultado(r)
      if (r.acao === 'ok') {
        const tot = (r.criadas || []).reduce((s, c) => s + (c.itens || 0), 0)
        const env = (r.criadas || []).reduce((s, c) => s + (c.enviados || c.itens || 0), 0)
        if (tot > 0) {
          notify(`Promoção criada com ${tot} produto(s)`, 'ok')
          setPropostas(null)
        } else {
          notify(`Campanha criada, mas 0 de ${env} produto(s) entraram — veja o motivo abaixo`, 'warn')
        }
        recarregarMeta()
      } else {
        notify((r.erros || [])[0] || 'Falha ao criar', 'danger')
      }
    } catch (e) { notify(e.message, 'danger') }
    setAplicando(false)
  }
  const toggleSel = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const rodarAgora = async () => {
    setRodando(true)
    try {
      const r = await api.shopeePromoRodar()
      if (r.acao === 'iniciado') {
        notify(r.mensagem || 'Agente aplicando promoções em segundo plano…', 'ok')
        setTimeout(recarregarMeta, 6000); setTimeout(recarregarMeta, 20000)
      } else if (r.acao === 'vazio') {
        setPropostas(r); notify(r.msg || 'Nenhum produto elegível', 'warn')
      } else { notify(r.msg || 'Pronto', 'ok'); recarregarMeta() }
    } catch (e) { notify(e.message, 'danger') }
    setRodando(false)
  }

  if (!conectado) return <div className="text-sm text-faint py-6 text-center glass rounded-2xl">Conecte a loja Shopee para usar o motor de promoções.</div>
  if (!cfg) return <div className="py-10 text-center text-faint flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> carregando motor…</div>

  const auto = cfg.modo === 'auto'
  const nSel = sel.size

  return (
    <div className="space-y-3">
      {/* Cabeçalho / modo */}
      <div className="glass rounded-2xl p-4" style={{ border: cfg.ativo ? `1px solid ${LARANJA}` : '1px solid var(--glass-border)' }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ background: 'rgba(238,77,45,.12)' }}>
              <Sparkles size={20} style={{ color: LARANJA }} />
            </div>
            <div className="min-w-0">
              <div className="font-display font-semibold leading-tight">Motor de promoções</div>
              <div className="text-xs text-faint">O agente acha os produtos parados, calcula um desconto seguro e cria a campanha — sem furar sua margem.</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-dim">{cfg.ativo ? 'Ativo' : 'Desligado'}</span>
            <MiniToggle on={cfg.ativo} onClick={() => salvar({ ativo: !cfg.ativo })} />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-xs text-faint">Modo:</span>
          <div className="flex rounded-lg p-0.5" style={{ background: 'var(--glass-hover)' }}>
            {[['auto', '🤖 Agente cria sozinho'], ['sugerir', 'Sugerir e eu aprovo']].map(([id, t]) => (
              <button key={id} onClick={() => salvar({ modo: id })} className="text-xs px-3 py-1.5 rounded-md font-medium transition"
                      style={cfg.modo === id ? { background: LARANJA, color: '#fff' } : { color: 'var(--text-dim)' }}>{t}</button>
            ))}
          </div>
        </div>
        {auto && !cfg.ativo && (
          <div className="mt-2 text-[11px] text-faint flex items-center gap-1.5"><AlertTriangle size={12} style={{ color: '#d6007f' }} /> Ligue a chave acima pra o agente começar a criar promoções sozinho.</div>
        )}

        {auto && (
          <div className="mt-3 rounded-xl p-3 space-y-3" style={{ background: 'rgba(238,77,45,.06)', border: '1px solid rgba(238,77,45,.2)' }}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-faint">Disparar:</span>
              <div className="flex rounded-lg p-0.5" style={{ background: 'var(--glass-hover)' }}>
                {[['agendado', 'Por agenda'], ['queda', 'Quando cair a venda']].map(([id, t]) => (
                  <button key={id} onClick={() => salvar({ gatilho: id })} className="text-xs px-3 py-1.5 rounded-md font-medium transition"
                          style={cfg.gatilho === id ? { background: LARANJA, color: '#fff' } : { color: 'var(--text-dim)' }}>{t}</button>
                ))}
              </div>
            </div>
            {cfg.gatilho === 'agendado'
              ? <SliderRegra label="A cada quantos dias" valor={cfg.intervalo_dias} min={1} max={30} sufixo=" dias" onChange={(v) => salvar({ intervalo_dias: v })} />
              : <div className="space-y-3">
                  <div>
                    <div className="text-xs text-dim mb-1.5 font-medium">Como medir a queda</div>
                    <div className="flex gap-1.5">
                      {[['dia', 'Por dia', 'total de 24h vs média dos dias — mais estável'], ['horario', 'Por horário', 'a faixa atual vs a mesma faixa em outros dias — mais reativo']].map(([id, t, sub]) => (
                        <button key={id} onClick={() => salvar({ base_comparacao: id })} title={sub}
                                className="flex-1 text-xs px-2 py-2 rounded-lg font-medium transition"
                                style={(cfg.base_comparacao || 'dia') === id ? { background: LARANJA, color: '#fff' } : { background: 'var(--glass-hover)', color: 'var(--text-dim)' }}>{t}</button>
                      ))}
                    </div>
                    <div className="text-[10px] text-faint mt-1">{(cfg.base_comparacao || 'dia') === 'horario' ? 'Compara, p.ex., “esta tarde” com as tardes anteriores. Mais sensível — pede um pouco mais de histórico e volume.' : 'Compara o total das últimas 24h com a média dos dias anteriores. Recomendado.'}</div>
                  </div>
                  <SliderRegra label="Disparar com queda de" valor={cfg.queda_limiar} min={10} max={70} step={5} sufixo="%" onChange={(v) => salvar({ queda_limiar: v })} />
                </div>}
            <div className="text-[11px] text-dim flex items-start gap-1.5 pt-1 border-t border-glassb">
              <Bot size={13} style={{ color: LARANJA }} className="mt-0.5 shrink-0" />
              <span>No automático, o agente <b style={{ color: LARANJA }}>aplica sozinho</b> quando a regra dispara ({cfg.gatilho === 'queda' ? 'queda nas vendas' : `a cada ${cfg.intervalo_dias} dias`}) — você <b>não precisa aprovar</b>. Tudo respeitando o piso de margem. Quer disparar na hora?</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={rodarAgora} disabled={rodando || !cfg.ativo}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white flex items-center gap-1.5 disabled:opacity-50" style={{ background: LARANJA }}>
                {rodando ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Aplicar agora
              </button>
              <button onClick={gerar} disabled={gerando}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 disabled:opacity-60 glass text-dim hover:text-fg">
                {gerando ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Só pré-visualizar
              </button>
              {!cfg.ativo && <span className="text-[10px] text-faint">ligue a chave “Ativo” pra liberar</span>}
            </div>
          </div>
        )}
      </div>

      {/* Detecção de queda */}
      {queda && (
        <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap">
          <TrendingDown size={18} style={{ color: queda.queda ? 'var(--danger)' : 'var(--faint)' }} />
          {['coletando', 'coletando_horario', 'volume_baixo'].includes(queda.motivo)
            ? <div className="text-xs text-faint">{queda.msg || 'Coletando histórico de vendas…'} {queda.amostras != null && `(${queda.amostras} amostras)`}</div>
            : queda.base
              ? <div className="text-xs text-dim flex items-center gap-3 flex-wrap">
                  <span>{queda.base_modo === 'horario' ? `Pedidos na ${queda.rotulo}` : 'Pedidos (24h)'}: <b className="num">{queda.atual}</b></span>
                  <span className="text-faint">·</span>
                  <span>Média{queda.base_modo === 'horario' ? ' dessa faixa' : ' dos dias'}: <b className="num">{queda.base}</b></span>
                  {queda.queda
                    ? <span className="px-2 py-0.5 rounded font-medium" style={{ background: 'rgba(255,111,111,.15)', color: 'var(--danger)' }}>queda de {queda.queda_pct}% ⚠</span>
                    : <span className="px-2 py-0.5 rounded font-medium" style={{ background: 'rgba(20,184,166,.12)', color: 'var(--ok)' }}>venda estável</span>}
                </div>
              : <div className="text-xs text-faint">Sem base de comparação ainda.</div>}
        </div>
      )}

      {/* Regras */}
      <div className="glass rounded-2xl p-4 space-y-4">
        <div className="text-sm font-medium flex items-center gap-2"><SlidersHorizontal size={15} style={{ color: LARANJA }} /> Regras do agente</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
          <div>
            <div className="text-xs text-dim mb-1.5 font-medium">Quais produtos</div>
            <div className="flex gap-1.5">
              {[['estoque_parado', 'Estoque parado'], ['margem_alta', 'Maior margem']].map(([id, t]) => (
                <button key={id} onClick={() => salvar({ estrategia: id })} className="flex-1 text-xs px-2 py-2 rounded-lg font-medium transition"
                        style={cfg.estrategia === id ? { background: LARANJA, color: '#fff' } : { background: 'var(--glass-hover)', color: 'var(--text-dim)' }}>{t}</button>
              ))}
            </div>
            {cfg.estrategia === 'estoque_parado' && (
              <div className="mt-2">
                <div className="text-[10px] text-faint mb-1">Considerar "parado" pelas vendas dos últimos</div>
                <div className="flex gap-1">
                  {[7, 15, 30, 60].map((d) => (
                    <button key={d} onClick={() => salvar({ dias_analise: d })} className="flex-1 text-[11px] px-1.5 py-1.5 rounded-md font-medium transition num"
                            style={(cfg.dias_analise || 30) === d
                              ? { background: `color-mix(in srgb, ${LARANJA} 16%, transparent)`, color: LARANJA, border: `1px solid ${LARANJA}` }
                              : { background: 'var(--glass-hover)', color: 'var(--text-dim)', border: '1px solid transparent' }}>{d} dias</button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-dim mb-1.5 font-medium">Tipo de promoção</div>
            <div className="flex gap-1.5">
              {[['desconto', 'Desconto'], ['flash', 'Relâmpago'], ['ambos', 'Ambos']].map(([id, t]) => (
                <button key={id} onClick={() => salvar({ tipo: id })} className="flex-1 text-xs px-2 py-2 rounded-lg font-medium transition"
                        style={cfg.tipo === id ? { background: LARANJA, color: '#fff' } : { background: 'var(--glass-hover)', color: 'var(--text-dim)' }}>{t}</button>
              ))}
            </div>
          </div>
          <SliderRegra label="Desconto máximo" valor={cfg.desconto_max} min={1} max={50} sufixo="%" onChange={(v) => salvar({ desconto_max: v })} dica="o teto que o agente pode aplicar" />
          <SliderRegra label="Piso de margem (trava)" valor={cfg.piso_margem} min={0} max={50} sufixo="%" onChange={(v) => salvar({ piso_margem: v })} dica="NUNCA desconta abaixo disso — sua proteção" />
          <SliderRegra label="Máximo de produtos" valor={cfg.max_produtos} min={1} max={100} onChange={(v) => salvar({ max_produtos: v })} />
          <SliderRegra label="Estoque mínimo pra entrar" valor={cfg.estoque_minimo} min={0} max={50} onChange={(v) => salvar({ estoque_minimo: v })} />
          <SliderRegra label="Duração do desconto" valor={cfg.duracao_dias} min={1} max={30} sufixo=" dias" onChange={(v) => salvar({ duracao_dias: v })} />
          {(cfg.tipo === 'flash' || cfg.tipo === 'ambos') &&
            <SliderRegra label="Reservar do estoque (relâmpago)" valor={cfg.reserva_estoque} min={0} max={20} sufixo=" un" onChange={(v) => salvar({ reserva_estoque: v })} dica="segura unidades fora da oferta" />}
        </div>
      </div>

      {/* Gerar propostas (modo Sugerir: aqui é o fluxo principal de revisão) */}
      {!auto && (
        <button onClick={gerar} disabled={gerando}
                className="w-full rounded-2xl py-3 font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: LARANJA }}>
          {gerando ? <Loader2 size={17} className="animate-spin" /> : <Wand2 size={17} />} {gerando ? 'O agente está analisando…' : 'Gerar propostas de promoção'}
        </button>
      )}

      <button onClick={async () => {
                setDiagLoad(true); setDiagRaw(null)
                try { setDiagRaw(await api.shopeePromoDiagnosticar()) }
                catch (e) { setDiagRaw({ erro: e.message }) }
                finally { setDiagLoad(false) }
              }} disabled={diagLoad}
              className="w-full text-xs px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 glass text-dim hover:text-fg disabled:opacity-60">
        {diagLoad ? <Loader2 size={13} className="animate-spin" /> : <Stethoscope size={13} />}
        {diagLoad ? 'Testando 1 produto na Shopee…' : 'Diagnosticar desconto (testa 1 produto e mostra o erro real da Shopee)'}
      </button>

      {diagRaw && <DiagDescontoRaw d={diagRaw} onClose={() => setDiagRaw(null)} />}

      {/* Tabela de propostas */}
      {propostas?.acao === 'ok' && propostas.propostas.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-glassb">
            <div className="text-sm font-medium flex items-center gap-2"><CheckCircle2 size={15} style={{ color: LARANJA }} /> {auto ? 'Prévia: o que o agente faria agora' : `${propostas.propostas.length} proposta(s) · ${nSel} selecionada(s)`}</div>
            <button onClick={() => setSel(nSel === propostas.propostas.length ? new Set() : new Set(propostas.propostas.map((p) => p.item_id)))}
                    className="text-xs text-dim hover:text-fg">{nSel === propostas.propostas.length ? 'desmarcar todos' : 'marcar todos'}</button>
          </div>
          {(propostas.diagnostico?.em_campanha > 0 || propostas.diagnostico?.dias_analise) && (
            <div className="flex items-center gap-2 px-4 py-2 flex-wrap" style={{ background: 'var(--glass-hover)' }}>
              {propostas.diagnostico?.dias_analise && (
                <span className="text-[10px] px-1.5 py-0.5 rounded num text-dim" style={{ background: 'var(--glass)' }}>vendas dos últimos {propostas.diagnostico.dias_analise} dias</span>
              )}
              {propostas.diagnostico?.em_campanha > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded num flex items-center gap-1" style={{ background: 'color-mix(in srgb, #d6007f 14%, transparent)', color: '#d6007f' }}>
                  <Layers size={9} /> {propostas.diagnostico.em_campanha} já em campanha (ignorados)
                </span>
              )}
            </div>
          )}
          <div className="max-h-[420px] overflow-y-auto divide-y" style={{ borderColor: 'var(--glass-border)' }}>
            {propostas.propostas.map((p) => {
              const on = sel.has(p.item_id)
              return (
                <button key={p.item_id} onClick={() => !auto && toggleSel(p.item_id)} className="w-full px-4 py-3 text-left hover:bg-[var(--glass-hover)] transition-colors"
                        style={{ background: on && !auto ? 'rgba(238,77,45,.06)' : undefined, cursor: auto ? 'default' : 'pointer' }}>
                  <div className="flex items-start gap-3">
                    {!auto && (
                      <span className="h-4 w-4 rounded grid place-items-center shrink-0 mt-0.5" style={{ background: on ? LARANJA : 'transparent', border: `1px solid ${on ? LARANJA : 'var(--glass-border)'}` }}>
                        {on && <CheckCircle2 size={11} className="text-white" />}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{p.nome}</span>
                        <span className="num shrink-0 flex items-baseline gap-1.5">
                          <span className="text-[11px] text-faint line-through">{money(p.preco_atual)}</span>
                          <span className="text-sm font-bold" style={{ color: LARANJA }}>{money(p.preco_promo)}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded num" style={{ background: LARANJA, color: '#fff' }}>−{p.desconto_pct}%</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded num" style={{ background: `color-mix(in srgb, ${corMargem(p.margem_promo)} 16%, transparent)`, color: corMargem(p.margem_promo) }}>margem {p.margem_promo}%</span>
                        {p.vendidos != null && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded num" style={{ background: p.vendidos === 0 ? 'color-mix(in srgb, #2DD4BF 16%, transparent)' : 'var(--glass-hover)', color: p.vendidos === 0 ? '#2DD4BF' : 'var(--text-dim)' }}>
                            {p.vendidos === 0 ? 'parado' : `${p.vendidos} vendas`}
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded num" style={{ background: 'var(--glass-hover)', color: 'var(--text-dim)' }}>{p.estoque} estoque</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded num text-faint" style={{ background: 'var(--glass-hover)' }}>SKU {p.sku}</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          {auto ? (
            <div className="p-3 border-t border-glassb flex items-center gap-2 text-[11px] text-dim" style={{ background: 'rgba(238,77,45,.05)' }}>
              <Bot size={13} style={{ color: LARANJA }} className="shrink-0" />
              <span>Isto é só uma <b>prévia</b>. No modo automático o agente <b style={{ color: LARANJA }}>aplica sozinho</b> (quando a regra dispara, ou agora no botão <b>“Aplicar agora”</b> lá em cima) — você não precisa aprovar item a item.</span>
            </div>
          ) : (
            <div className="p-3 border-t border-glassb flex items-center justify-between gap-2">
              <span className="text-[11px] text-faint">Revise e aplique. {cfg.tipo === 'ambos' ? 'Cria desconto + relâmpago.' : cfg.tipo === 'flash' ? 'Cria oferta relâmpago.' : 'Cria campanha de desconto.'}</span>
              <button onClick={aplicar} disabled={aplicando || !nSel}
                      className="rounded-lg px-4 py-2 text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60" style={{ background: LARANJA }}>
                {aplicando ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Aplicar {nSel} promoção(ões)
              </button>
            </div>
          )}
        </div>
      )}
      {propostas?.acao === 'vazio' && (
        <DiagnosticoPromo msg={propostas.msg} diag={propostas.diagnostico} />
      )}

      {resultado && (resultado.erros?.length > 0 || (resultado.criadas || []).some(c => (c.itens || 0) === 0)) && (
        <div className="glass rounded-2xl p-4" style={{ borderLeft: '3px solid #d6007f' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium flex items-center gap-2"><AlertTriangle size={15} style={{ color: '#d6007f' }} /> Resultado da aplicação</div>
            <button onClick={() => setResultado(null)} className="text-faint hover:text-fg"><X size={14} /></button>
          </div>
          {(resultado.criadas || []).map((c, i) => (
            <div key={i} className="text-xs mb-1 flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded num text-[10px]" style={{ background: (c.itens || 0) > 0 ? 'rgba(20,184,166,.14)' : 'rgba(255,111,111,.14)', color: (c.itens || 0) > 0 ? '#2DD4BF' : '#FF6F6F' }}>
                {c.tipo} · {c.itens || 0}/{c.enviados || c.itens || 0} produto(s)
              </span>
              {(c.itens || 0) === 0 && <span className="text-faint">campanha criada vazia</span>}
            </div>
          ))}
          {resultado.erros?.length > 0 && (
            <ul className="mt-2 space-y-1">
              {resultado.erros.map((e, i) => (
                <li key={i} className="text-[11px] text-dim flex items-start gap-1.5">
                  <span style={{ color: '#d6007f' }}>•</span><span>{e}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="text-[10px] text-faint mt-2 pt-2 border-t" style={{ borderColor: 'var(--glass-border)' }}>
            Dica: se o motivo for "já está em outra promoção", encerre as campanhas antigas desses produtos na aba Promoções antes de recriar — a Shopee não deixa o mesmo produto em dois descontos ao mesmo tempo.
          </div>
        </div>
      )}

      {/* Histórico */}
      {hist.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium flex items-center gap-2"><Clock size={14} className="text-dim" /> Promoções criadas pelo motor</div>
            <span className="text-[10px] text-faint">toque pra ver os produtos</span>
          </div>
          <div className="space-y-1.5">
            {hist.map((h, i) => <HistMotorItem key={i} h={h} />)}
          </div>
        </div>
      )}
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
/* ===================== CENTRAL OPERACIONAL DE PEDIDOS ===================== */
const ROTULO_STATUS = { A_ENVIAR: 'A enviar', ENVIADO: 'Enviado', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado' }

function imprimirDoc(titulo, corpoHtml) {
  const w = window.open('', '_blank')
  if (!w) { alert('Permita pop-ups para imprimir.'); return }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${titulo}</title>
    <style>
      *{box-sizing:border-box} body{font-family:system-ui,-apple-system,Arial,sans-serif;color:#111;padding:24px;margin:0}
      h1{font-size:18px;margin:0 0 2px} .sub{color:#666;font-size:12px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th,td{text-align:left;padding:7px 9px;border-bottom:1px solid #e2e2e2;vertical-align:top}
      th{background:#f4f4f4;text-transform:uppercase;font-size:10px;letter-spacing:.05em;color:#555}
      .q{font-weight:700;text-align:center;white-space:nowrap} .c{text-align:center}
      .chk{width:26px;color:#999;font-size:15px} .sku{color:#888;font-family:ui-monospace,monospace;font-size:11px}
      tr{page-break-inside:avoid}
      @media print{@page{margin:12mm}}
    </style></head><body>${corpoHtml}
    <script>window.onload=function(){window.print()}<\/script></body></html>`)
  w.document.close()
}

function prazoInfo(shipBy, agora) {
  if (!shipBy) return null
  const ms = shipBy * 1000 - agora
  return { ms, atrasado: ms < 0, urgente: ms >= 0 && ms < 12 * 3600 * 1000 }
}

const corMargemReal = (m, alvo) => m == null ? 'var(--text-faint)' : m < 0 ? '#FF6F6F' : (alvo && m < alvo - 0.5) ? '#d6007f' : '#2DD4BF'

function PedidoCard({ p, agora, alvo, sel, onSel, onAbrir }) {
  const prazo = prazoInfo(p.ship_by, agora)
  const corPrazo = !prazo ? 'var(--text-faint)' : prazo.atrasado ? '#FF6F6F' : prazo.urgente ? '#d6007f' : '#2DD4BF'
  const corBorda = p.prejuizo ? '#FF6F6F' : p.abaixo_meta ? '#d6007f' : 'transparent'
  return (
    <div onClick={() => onAbrir && onAbrir(p.order_sn)} className="glass rounded-xl p-3 transition-colors hover:bg-[var(--glass-hover)]"
         style={{ borderLeft: `3px solid ${corBorda}`, cursor: 'pointer' }}>
      <div className="flex items-center gap-2 mb-2">
        <button onClick={(e) => { e.stopPropagation(); onSel(p.order_sn) }} className="h-4 w-4 rounded border grid place-items-center shrink-0" style={{ borderColor: sel ? LARANJA : 'var(--glass-border)', background: sel ? LARANJA : 'transparent' }}>
          {sel && <CheckCircle2 size={12} className="text-white" />}
        </button>
        <UserIcon size={13} className="text-faint shrink-0" />
        <span className="text-xs font-medium truncate flex-1">{p.comprador}</span>
        {p.cidade && <span className="text-[10px] text-faint flex items-center gap-0.5 shrink-0"><MapPin size={9} />{p.cidade}/{p.uf}</span>}
        <span className="num text-[10px] text-faint shrink-0">#{String(p.order_sn).slice(-8)}</span>
        <ChevronRight size={13} className="text-faint shrink-0" />
      </div>
      <div className="space-y-1.5">
        {p.itens.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            {it.imagem ? <img src={it.imagem} alt="" className="h-9 w-9 rounded-md object-cover shrink-0" />
              : <div className="h-9 w-9 rounded-md grid place-items-center shrink-0" style={{ background: 'var(--glass-hover)' }}><ImageIcon size={13} className="text-faint" /></div>}
            <div className="min-w-0 flex-1">
              <div className="text-xs truncate">{it.qtd}× {it.nome}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {it.sku && <span className="text-[10px] text-faint num">{it.sku}</span>}
                <span className="text-[11px] font-semibold num" style={{ color: LARANJA }}>{brl(it.preco_pago)}</span>
                {it.margem_real != null
                  ? <span className="text-[9px] px-1 py-0.5 rounded num" style={{ background: `color-mix(in srgb, ${corMargemReal(it.margem_real, alvo)} 16%, transparent)`, color: corMargemReal(it.margem_real, alvo) }}>
                      {it.margem_real}%{it.lucro_real != null ? ` · ${brl(it.lucro_real)}` : ''}
                    </span>
                  : !it.tem_cadastro ? <span className="text-[9px] text-faint">sem custo</span> : null}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: 'var(--glass-border)' }}>
        {prazo ? <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: corPrazo }}>
          <Clock size={11} />{prazo.atrasado ? 'envio atrasado' : `enviar em ${fmtDur(prazo.ms)}`}</span>
          : <span className="text-[11px] text-faint">{p.status}</span>}
        <div className="flex items-center gap-2">
          {p.lucro_real != null && <span className="text-[10px] num" style={{ color: '#2DD4BF' }}>lucro {brl(p.lucro_real)}</span>}
          <span className="text-xs font-semibold num">{brl(p.total_pago)}</span>
        </div>
      </div>
    </div>
  )
}

function LinhaFin({ rotulo, valor, negativo, forte, cor }) {
  return (
    <div className="flex items-center justify-between text-xs py-1">
      <span className={forte ? 'font-semibold' : 'text-dim'}>{rotulo}</span>
      <span className="num font-medium" style={{ color: cor || (negativo ? '#FF6F6F' : 'var(--text)') }}>{negativo ? '−' : ''}{brl(Math.abs(valor || 0))}</span>
    </div>
  )
}

function PedidoDetalhe({ orderSn, alvo, onClose }) {
  const [d, setD] = useState(null)
  useEffect(() => { api.shopeePedidoDetalhe(orderSn).then(setD).catch((e) => setD({ erro: e.message || true })) }, [orderSn])
  const f = d?.financeiro
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: 'rgba(0,0,0,.55)' }} onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col" style={{ background: 'var(--bg-elev, var(--glass))', backdropFilter: 'blur(20px)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-glassb">
          <div className="min-w-0">
            <div className="font-display font-semibold flex items-center gap-2"><Package size={16} style={{ color: LARANJA }} /> Pedido {d ? <span className="num text-dim font-normal">#{String(d.order_sn || orderSn).slice(-10)}</span> : ''}</div>
            {d && !d.erro && <div className="text-[11px] text-faint mt-0.5">{d.comprador} · {d.status}</div>}
          </div>
          <button onClick={onClose} className="text-faint hover:text-fg shrink-0"><X size={18} /></button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {d === null ? <div className="py-10 text-center text-faint flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> carregando detalhe…</div>
            : d?.erro ? <div className="py-6 text-center text-sm" style={{ color: '#FF6F6F' }}>{typeof d.erro === 'string' ? d.erro : 'Falha ao carregar.'}</div>
            : <>
                {/* Repasse real */}
                <div className="rounded-xl p-3" style={{ background: 'var(--glass-hover)' }}>
                  <div className="text-xs font-semibold mb-1 flex items-center gap-1.5"><Wallet size={13} style={{ color: LARANJA }} /> Repasse da Shopee</div>
                  {f.tem_escrow ? <>
                    <LinhaFin rotulo="Receita (comprador pagou)" valor={f.receita} forte />
                    {f.comissao > 0 && <LinhaFin rotulo="Comissão" valor={f.comissao} negativo />}
                    {f.servico > 0 && <LinhaFin rotulo="Taxa de serviço" valor={f.servico} negativo />}
                    {f.transacao > 0 && <LinhaFin rotulo="Taxa de transação" valor={f.transacao} negativo />}
                    {f.frete !== 0 && <LinhaFin rotulo="Frete" valor={f.frete} negativo={f.frete > 0} />}
                    <div className="border-t my-1" style={{ borderColor: 'var(--glass-border)' }} />
                    <LinhaFin rotulo="Você recebe (líquido)" valor={f.liquido} forte cor="#2DD4BF" />
                    {f.custo_completo ? <>
                      <LinhaFin rotulo="Custo dos produtos" valor={f.custo} negativo />
                      <div className="border-t my-1" style={{ borderColor: 'var(--glass-border)' }} />
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">Lucro real</span>
                        <span className="num text-base font-bold" style={{ color: corMargemReal(f.margem_pct, alvo) }}>{brl(f.lucro)} <span className="text-xs">({f.margem_pct}%)</span></span>
                      </div>
                    </> : <div className="text-[10px] text-faint mt-1 flex items-center gap-1"><AlertTriangle size={10} style={{ color: '#d6007f' }} /> Algum produto sem custo no catálogo — lucro não calculado.</div>}
                  </> : <div className="text-xs text-faint">A Shopee ainda não liberou o repasse (escrow) deste pedido — normalmente fica disponível após o envio/conclusão.</div>}
                </div>

                {/* Produtos */}
                <div>
                  <div className="text-xs font-semibold mb-1.5 flex items-center gap-1.5"><ShoppingBag size={13} style={{ color: LARANJA }} /> Produtos</div>
                  <div className="space-y-1.5">
                    {d.itens.map((it, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: 'var(--glass-hover)' }}>
                        {it.imagem ? <img src={it.imagem} className="h-10 w-10 rounded-md object-cover shrink-0" alt="" /> : <div className="h-10 w-10 rounded-md grid place-items-center shrink-0" style={{ background: 'var(--glass)' }}><ImageIcon size={14} className="text-faint" /></div>}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs truncate">{it.qtd}× {it.nome}</div>
                          {it.variacao && <div className="text-[10px] text-faint truncate">{it.variacao}</div>}
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {it.sku && <span className="text-[10px] text-faint num">{it.sku}</span>}
                            <span className="text-[11px] font-semibold num" style={{ color: LARANJA }}>{brl(it.preco_pago)}</span>
                            {it.taxas_mkt != null && <span className="text-[9px] text-faint num">−{brl(it.taxas_mkt)} taxas</span>}
                            {it.margem_real != null && <span className="text-[9px] px-1 rounded num" style={{ background: `color-mix(in srgb, ${corMargemReal(it.margem_real, alvo)} 16%, transparent)`, color: corMargemReal(it.margem_real, alvo) }}>{it.margem_real}%{it.lucro_real != null ? ` · ${brl(it.lucro_real)}` : ''}</span>}
                            {!it.tem_cadastro && <span className="text-[9px] text-faint">sem custo</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Comprador + logística */}
                <div className="grid sm:grid-cols-2 gap-2">
                  <div className="rounded-xl p-3" style={{ background: 'var(--glass-hover)' }}>
                    <div className="text-[10px] text-faint uppercase tracking-wide mb-1 flex items-center gap-1"><MapPin size={11} /> Entrega</div>
                    <div className="text-xs">{d.endereco?.nome || d.comprador}</div>
                    {d.endereco?.completo && <div className="text-[11px] text-faint mt-0.5">{d.endereco.completo}</div>}
                    <div className="text-[11px] text-faint">{[d.endereco?.cidade, d.endereco?.uf].filter(Boolean).join('/')} {d.endereco?.cep || ''}</div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'var(--glass-hover)' }}>
                    <div className="text-[10px] text-faint uppercase tracking-wide mb-1 flex items-center gap-1"><Truck size={11} /> Logística</div>
                    <div className="text-xs">{d.logistica?.transportadora || '—'}</div>
                    {d.logistica?.rastreio && <div className="text-[11px] num text-faint mt-0.5">rastreio {d.logistica.rastreio}</div>}
                    {d.ship_by && <div className="text-[11px] text-faint">enviar até {fmtDataHora(d.ship_by)}</div>}
                  </div>
                </div>
              </>}
        </div>
      </div>
    </div>
  )
}

function PedidosPainel({ conectado }) {
  const notify = useToast()
  const agora = useAgora(1000)
  const [status, setStatus] = useState('A_ENVIAR')
  const [dias, setDias] = useState(15)
  const [d, setD] = useState(null)
  const [busca, setBusca] = useState('')
  const [sel, setSel] = useState(() => new Set())
  const [imprimindo, setImprimindo] = useState(false)
  const [aberto, setAberto] = useState(null)

  const carregar = (st = status, dd = dias) => {
    setD(null); setSel(new Set())
    api.shopeePedidosPainel(st, dd).then(setD).catch((e) => setD({ erro: e.message || true }))
  }
  useEffect(() => { if (conectado) carregar() }, [conectado])

  const pedidos = d?.pedidos || []
  const filtro = busca.trim().toLowerCase()
  const visiveis = filtro ? pedidos.filter((p) =>
    String(p.order_sn).toLowerCase().includes(filtro) ||
    (p.comprador || '').toLowerCase().includes(filtro) ||
    p.itens.some((i) => (i.nome || '').toLowerCase().includes(filtro) || (i.sku || '').toLowerCase().includes(filtro))) : pedidos
  const res = d?.resumo

  const toggleSel = (sn) => setSel((s) => { const n = new Set(s); n.has(sn) ? n.delete(sn) : n.add(sn); return n })
  const selTodos = () => setSel((s) => s.size === visiveis.length ? new Set() : new Set(visiveis.map((p) => p.order_sn)))

  const imprimirSeparacao = async () => {
    setImprimindo(true)
    try {
      const sep = await api.shopeePedidosSeparacao(status, dias)
      const linhas = (sep.itens || []).map((l) =>
        `<tr><td class="chk">☐</td><td>${l.nome || ''}</td><td class="sku">${l.sku || ''}</td><td class="q">${l.qtd}</td><td class="c">${l.pedidos}</td></tr>`).join('')
      imprimirDoc('Lista de separação', `<h1>Lista de separação — ${ROTULO_STATUS[status]}</h1>
        <div class="sub">${sep.skus} produtos · ${sep.total_unidades} unidades · ${sep.pedidos} pedidos · ${new Date().toLocaleString('pt-BR')}</div>
        <table><thead><tr><th class="chk"></th><th>Produto</th><th>SKU</th><th class="q">Qtd</th><th class="c">Pedidos</th></tr></thead><tbody>${linhas}</tbody></table>`)
    } catch (e) { notify(e.message || 'Falha ao gerar', 'danger') }
    setImprimindo(false)
  }

  const imprimirPedidos = () => {
    const base = sel.size ? pedidos.filter((p) => sel.has(p.order_sn)) : visiveis
    const linhas = [...base].sort((a, b) => (a.comprador || '').localeCompare(b.comprador || '', 'pt'))
      .map((p) => {
        const prods = p.itens.map((i) => `${i.qtd}× ${i.nome}${i.sku ? ` <span class="sku">(${i.sku})</span>` : ''}`).join('<br>')
        return `<tr><td class="chk">☐</td><td>${p.comprador || ''}<div class="sku">#${p.order_sn}</div></td><td>${prods}</td><td class="q">${brl(p.total_pago)}</td></tr>`
      }).join('')
    imprimirDoc('Pedidos', `<h1>Pedidos — ${ROTULO_STATUS[status]}</h1>
      <div class="sub">${base.length} pedidos · ${new Date().toLocaleString('pt-BR')} · em ordem alfabética por comprador</div>
      <table><thead><tr><th class="chk"></th><th>Comprador / Pedido</th><th>Produtos</th><th class="q">Total</th></tr></thead><tbody>${linhas}</tbody></table>`)
  }

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <div className="text-sm font-semibold flex items-center gap-1.5"><Package size={15} style={{ color: LARANJA }} /> Central de pedidos</div>
        <div className="flex items-center gap-1.5">
          <button onClick={imprimirSeparacao} disabled={imprimindo || !pedidos.length} className="text-xs px-2.5 py-1.5 rounded-lg glass text-dim hover:text-fg flex items-center gap-1.5 disabled:opacity-40" title="Lista de separação (produtos A→Z)">
            {imprimindo ? <Loader2 size={13} className="animate-spin" /> : <ClipboardList size={13} />} Separação
          </button>
          <button onClick={imprimirPedidos} disabled={!pedidos.length} className="text-xs px-2.5 py-1.5 rounded-lg glass text-dim hover:text-fg flex items-center gap-1.5 disabled:opacity-40" title="Imprimir pedidos (A→Z)">
            <Printer size={13} /> Pedidos
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {Object.entries(ROTULO_STATUS).map(([id, t]) => (
          <button key={id} onClick={() => { setStatus(id); carregar(id, dias) }} className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={status === id ? { background: LARANJA, color: '#fff' } : { background: 'var(--glass)', color: 'var(--text-dim)', border: '1px solid var(--glass-border)' }}>{t}</button>
        ))}
        <div className="flex-1" />
        {[7, 15, 30].map((dd) => (
          <button key={dd} onClick={() => { setDias(dd); carregar(status, dd) }} className="text-xs px-2 py-1.5 rounded-lg"
                  style={dias === dd ? { background: 'var(--glass-hover)', color: 'var(--text)' } : { color: 'var(--text-faint)' }}>{dd}d</button>
        ))}
      </div>

      {res && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <FinMetric icon={Package} rotulo="Pedidos" valor={res.total} />
          <FinMetric icon={Wallet} rotulo="Receita" valor={brl(res.receita)} />
          <FinMetric icon={TrendingUp} rotulo="Lucro real" valor={res.lucro_real != null ? brl(res.lucro_real) : '—'} cor="#2DD4BF" sub={res.lucro_real != null ? `${res.cobertura_lucro} c/ custo` : 'cadastre custos'} />
          <FinMetric icon={AlertTriangle} rotulo="Abaixo da meta" valor={res.abaixo_meta} cor={res.abaixo_meta > 0 ? '#d6007f' : '#2DD4BF'} sub={res.prejuizo > 0 ? `${res.prejuizo} em prejuízo` : (res.margem_alvo ? `meta ${res.margem_alvo}%` : null)} />
        </div>
      )}

      {pedidos.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5" style={{ background: 'var(--glass-hover)' }}>
            <Search size={13} className="text-faint" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="buscar por comprador, produto, SKU ou #pedido" className="bg-transparent text-xs flex-1 outline-none" />
          </div>
          <button onClick={selTodos} className="text-[11px] px-2 py-1.5 rounded-lg glass text-dim hover:text-fg">
            {sel.size === visiveis.length && visiveis.length ? 'limpar' : 'todos'}{sel.size ? ` (${sel.size})` : ''}
          </button>
        </div>
      )}

      {d === null ? <div className="py-10 text-center text-faint flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> carregando pedidos…</div>
        : d?.erro ? <div className="py-6 text-center text-sm" style={{ color: '#FF6F6F' }}>{typeof d.erro === 'string' ? d.erro : 'Falha ao carregar pedidos.'}</div>
        : visiveis.length === 0 ? <div className="py-8 text-center text-sm text-faint">{filtro ? 'Nenhum pedido bate com a busca.' : `Nenhum pedido ${ROTULO_STATUS[status].toLowerCase()} no período.`}</div>
        : <div className="space-y-2">{visiveis.map((p) => <PedidoCard key={p.order_sn} p={p} agora={agora} alvo={d?.margem_alvo} sel={sel.has(p.order_sn)} onSel={toggleSel} onAbrir={setAberto} />)}</div>}

      {aberto && <PedidoDetalhe orderSn={aberto} alvo={d?.margem_alvo} onClose={() => setAberto(null)} />}

      <div className="text-[10px] text-faint mt-3 flex items-start gap-1.5">
        <FileText size={11} className="mt-0.5 shrink-0" />
        <span><b>Organizar envio</b>, <b>etiquetas Shopee</b> e <b>envio de NF-e</b> são a próxima etapa — escrevem em pedidos reais / puxam PDF da logística e precisam ser validados na sua conta antes de eu liberar.</span>
      </div>
    </div>
  )
}

function Pedidos({ conectado }) {
  if (!conectado) return <div className="text-sm text-faint py-6 text-center glass rounded-2xl">Conecte a loja Shopee para ver os pedidos.</div>
  return (
    <div className="space-y-3">
      <PedidosPainel conectado={conectado} />
      <MargemReal conectado={conectado} />
    </div>
  )
}

const corMrg = (m) => m < 0 ? '#FF6F6F' : m < 8 ? '#d6007f' : '#2DD4BF'
const brlM = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function FinMetric({ icon: Icon, valor, rotulo, cor, sub }) {
  return (
    <div className="rounded-xl px-3 py-3" style={{ background: 'var(--glass-hover)' }}>
      <div className="flex items-center gap-1.5 mb-1"><Icon size={13} style={{ color: cor || 'var(--text-dim)' }} /><span className="text-[10px] text-faint uppercase tracking-wide">{rotulo}</span></div>
      <div className="text-base font-bold num leading-none" style={{ color: cor || 'var(--text)' }}>{valor}</div>
      {sub && <div className="text-[10px] text-faint mt-1">{sub}</div>}
    </div>
  )
}

function MargemReal({ conectado }) {
  const notify = useToast()
  const [dias, setDias] = useState(7)
  const [d, setD] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [aberto, setAberto] = useState(null)  // order_sn expandido

  const calcular = async (dd) => {
    setCarregando(true); setD(null)
    try { setD(await api.shopeeMargemReal(dd, 40)) }
    catch (e) { setD({ erro: e.message || true }); notify(e.message || 'Falha ao calcular', 'danger') }
    setCarregando(false)
  }

  const r = d && !d.erro ? d.resumo : null
  return (
    <div className="glass rounded-2xl p-4" style={{ borderTop: `2px solid ${LARANJA}` }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-semibold flex items-center gap-1.5"><Wallet size={15} style={{ color: LARANJA }} /> Margem líquida real</div>
          <div className="text-xs text-dim mt-0.5 max-w-md">O lucro de verdade de cada venda: pega o <b>repasse</b> da Shopee (já com comissão, taxas e frete) e desconta o <b>custo</b> do produto no catálogo.</div>
        </div>
        <div className="flex items-center gap-1.5">
          {[7, 15, 30].map((dd) => (
            <button key={dd} onClick={() => { setDias(dd); if (d || carregando) calcular(dd) }} className="text-xs px-2.5 py-1 rounded-lg font-medium"
                    style={dias === dd ? { background: LARANJA, color: '#fff' } : { background: 'var(--glass)', color: 'var(--text-dim)', border: '1px solid var(--glass-border)' }}>{dd}d</button>
          ))}
        </div>
      </div>

      {!d && !carregando && (
        <button onClick={() => calcular(dias)} className="w-full mt-3 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2" style={{ background: LARANJA }}>
          <BadgePercent size={15} /> Calcular lucro real dos últimos {dias} dias
        </button>
      )}
      {!d && !carregando && <div className="text-[11px] text-faint mt-2 text-center">Busca o repasse de cada pedido — leva alguns segundos e fica em cache.</div>}

      {carregando && <div className="py-8 text-center text-faint flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> buscando o repasse de cada pedido… isso leva alguns segundos</div>}

      {d?.erro && <div className="py-4 text-center text-sm" style={{ color: '#FF6F6F' }}>{typeof d.erro === 'string' ? d.erro : 'Não consegui calcular a margem real.'}</div>}

      {r && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <FinMetric icon={TrendingUp} rotulo="Lucro líquido" valor={brlM(r.lucro_liquido_total)} cor={corMrg(r.margem_media_pct)} sub={`${r.pedidos} pedido(s)`} />
            <FinMetric icon={Percent} rotulo="Margem média" valor={`${r.margem_media_pct}%`} cor={corMrg(r.margem_media_pct)} />
            <FinMetric icon={ShoppingBag} rotulo="Receita" valor={brlM(r.receita_total)} />
            <FinMetric icon={Receipt} rotulo="Taxas Shopee" valor={brlM(r.taxas_total)} cor="#d6007f" sub={`${r.pct_taxas}% da receita`} />
            <FinMetric icon={Coins} rotulo="Custo produtos" valor={brlM(r.custo_total)} />
            <FinMetric icon={AlertTriangle} rotulo="Em prejuízo" valor={r.pedidos_prejuizo} cor={r.pedidos_prejuizo > 0 ? '#FF6F6F' : '#2DD4BF'} sub={r.pedidos_prejuizo > 0 ? 'revisar preço!' : 'tudo no azul'} />
          </div>

          {r.sem_custo > 0 && (
            <div className="text-[11px] rounded-lg px-3 py-2 flex items-start gap-1.5" style={{ background: 'rgba(230,180,80,.1)', color: '#d6007f' }}>
              <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {r.sem_custo} pedido(s) têm produtos <b>sem custo cadastrado</b> no catálogo — o lucro deles fica subestimado (custo conta como zero). Preencha o preço de custo no Bling pra ficar exato.
            </div>
          )}

          <div>
            <div className="text-xs text-faint mb-1.5 flex items-center justify-between">
              <span>Pedidos · <b>piores margens primeiro</b></span>
              {d.parcial && <span className="text-[10px]">amostra dos últimos 40</span>}
            </div>
            <div className="space-y-1.5">
              {d.pedidos.map((p) => (
                <div key={p.order_sn} className="rounded-xl overflow-hidden" style={{ background: 'var(--glass-hover)' }}>
                  <button onClick={() => setAberto(aberto === p.order_sn ? null : p.order_sn)} className="w-full px-3 py-2 flex items-center gap-2 text-left">
                    <span className="num text-xs text-faint shrink-0">#{String(p.order_sn).slice(-8)}</span>
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="text-[11px] text-faint num hidden sm:inline">{brlM(p.receita)}</span>
                      <ChevronRight size={11} className="text-faint hidden sm:inline" />
                      <span className="text-sm font-semibold num" style={{ color: corMrg(p.margem_pct) }}>{brlM(p.lucro)}</span>
                    </div>
                    {p.sem_custo && <span title="produto sem custo no catálogo"><AlertTriangle size={12} style={{ color: '#d6007f' }} /></span>}
                    {p.prejuizo && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ background: 'rgba(255,111,111,.16)', color: '#FF6F6F' }}>prejuízo</span>}
                    <span className="text-[11px] font-bold num px-1.5 py-0.5 rounded shrink-0" style={{ background: `color-mix(in srgb, ${corMrg(p.margem_pct)} 16%, transparent)`, color: corMrg(p.margem_pct) }}>{p.margem_pct}%</span>
                    <ChevronDown size={13} className="text-faint shrink-0" style={{ transform: aberto === p.order_sn ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                  </button>
                  {aberto === p.order_sn && (
                    <div className="px-3 pb-3 pt-1 border-t" style={{ borderColor: 'var(--glass-border)' }}>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2 mt-1">
                        <div className="text-center"><div className="text-[9px] text-faint uppercase">Receita</div><div className="text-xs num font-medium">{brlM(p.receita)}</div></div>
                        <div className="text-center"><div className="text-[9px] text-faint uppercase">Líquido Shopee</div><div className="text-xs num font-medium">{brlM(p.liquido_shopee)}</div></div>
                        <div className="text-center"><div className="text-[9px] text-faint uppercase">Custo</div><div className="text-xs num font-medium">{brlM(p.custo)}</div></div>
                        <div className="text-center"><div className="text-[9px] text-faint uppercase">Lucro</div><div className="text-xs num font-bold" style={{ color: corMrg(p.margem_pct) }}>{brlM(p.lucro)}</div></div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[10px] text-faint mb-2">
                        <span className="flex items-center gap-1"><Receipt size={10} /> comissão {brlM(p.comissao)}</span>
                        <span className="flex items-center gap-1"><Receipt size={10} /> serviço {brlM(p.servico)}</span>
                        {p.frete !== 0 && <span className="flex items-center gap-1"><Truck size={10} /> frete {brlM(p.frete)}</span>}
                      </div>
                      <div className="space-y-1">
                        {p.itens.map((it, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] rounded px-2 py-1" style={{ background: 'var(--glass)' }}>
                            <span className="truncate flex-1">{it.qtd}× {it.nome} {it.sku && <span className="text-faint num">· {it.sku}</span>}</span>
                            <span className="num shrink-0 ml-2" style={{ color: it.tem_custo ? 'var(--text-dim)' : '#d6007f' }}>{it.tem_custo ? `custo ${brlM(it.custo_unit)}` : 'sem custo'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="text-[10px] text-faint mt-2">Considera os últimos pedidos <b>concluídos</b> do período. O líquido vem do repasse oficial da Shopee; o custo, do preço de custo no catálogo.</div>
          </div>
        </div>
      )}
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
  const [sub, setSub] = useState('visao')
  if (!conectado) return <Vazio txt="Conecte a loja Shopee para gerenciar promoções." />
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 flex-wrap">
        {[['visao', 'Visão geral'], ['cupons', 'Cupons'], ['descontos', 'Descontos'], ['bundle', 'Bundle'], ['addon', 'Add-on'], ['flash', 'Flash Sale']].map(([id, t]) => (
          <button key={id} onClick={() => setSub(id)} className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={sub === id ? { background: LARANJA, color: '#fff' } : { background: 'var(--glass)', color: 'var(--text-dim)', border: '1px solid var(--glass-border)' }}>{t}</button>
        ))}
      </div>
      {sub === 'visao' && <DashboardPromo notify={notify} />}
      {sub === 'cupons' && <Cupons notify={notify} />}
      {sub === 'descontos' && <Descontos notify={notify} />}
      {sub === 'bundle' && <Bundles notify={notify} />}
      {sub === 'addon' && <Addons notify={notify} />}
      {sub === 'flash' && <FlashSale notify={notify} />}
    </div>
  )
}

/* ===================== DASHBOARD CONSOLIDADO DE CAMPANHAS ===================== */
function OverviewCard({ n, label, cor, icon: Icon, pulse }) {
  return (
    <div className="glass rounded-xl px-3 py-3 relative overflow-hidden">
      {pulse && <span className="absolute top-2 right-2 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70" style={{ background: cor }} /><span className="relative inline-flex rounded-full h-2 w-2" style={{ background: cor }} /></span>}
      <Icon size={15} style={{ color: cor }} className="mb-1.5" />
      <div className="text-2xl font-bold num leading-none" style={{ color: cor }}>{n}</div>
      <div className="text-[10px] text-faint mt-1 uppercase tracking-wide">{label}</div>
    </div>
  )
}

function AgendaRow({ c }) {
  const meta = TIPO_META[c.tipo] || TIPO_META.desconto
  const Icon = meta.icon
  const cic = c.ciclo
  const urgente = cic.fase === 'ativa' && cic.restante < 2 * 3600 * 1000
  const cor = cic.fase === 'agendada' ? '#60A5FA' : urgente ? '#FF6F6F' : meta.cor
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-3 py-2" style={{ background: 'var(--glass-hover)', borderLeft: `2px solid ${meta.cor}` }}>
      <div className="h-7 w-7 rounded-lg grid place-items-center shrink-0" style={{ background: `color-mix(in srgb, ${meta.cor} 16%, transparent)` }}><Icon size={13} style={{ color: meta.cor }} /></div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium truncate">{c.nome || meta.rotulo}</div>
        <div className="text-[10px] text-faint">{meta.rotulo}</div>
      </div>
      {cic.fase === 'ativa' && (
        <div className="text-right shrink-0">
          <div className="text-[11px] font-semibold num flex items-center gap-1" style={{ color: cor }}><Clock size={10} /> {fmtDur(cic.restante)}</div>
          <div className="h-1 w-16 rounded-full mt-1 overflow-hidden" style={{ background: 'var(--glass)' }}><div className="h-full rounded-full" style={{ width: `${cic.pctDecorrido}%`, background: cor }} /></div>
        </div>
      )}
      {cic.fase === 'agendada' && <div className="text-[11px] num shrink-0 flex items-center gap-1" style={{ color: cor }}><Hourglass size={10} /> {fmtDur(cic.paraInicio)}</div>}
    </div>
  )
}

function DashboardPromo({ notify }) {
  const agora = useAgora(1000)
  const [agenda, setAgenda] = useState(null)
  const [dias, setDias] = useState(30)
  const [receita, setReceita] = useState(null)
  const [carregR, setCarregR] = useState(false)
  useEffect(() => { api.shopeeCampanhasAgenda().then(setAgenda).catch(() => setAgenda({ erro: true })) }, [])

  const calcReceita = async (dd) => {
    setCarregR(true); setReceita(null)
    try { setReceita(await api.shopeeCampanhasDashboard(dd)) }
    catch (e) { setReceita({ erro: e.message || true }); notify(e.message || 'Falha ao calcular', 'danger') }
    setCarregR(false)
  }

  const camps = (agenda?.campanhas || []).map((c) => ({ ...c, ciclo: cicloInfo(c.inicio, c.fim, agora) }))
  const ativas = camps.filter((c) => c.ciclo.fase === 'ativa').sort((a, b) => a.ciclo.restante - b.ciclo.restante)
  const agendadas = camps.filter((c) => c.ciclo.fase === 'agendada').sort((a, b) => a.ciclo.paraInicio - b.ciclo.paraInicio)
  const r = receita && !receita.erro ? receita : null
  const maxTipo = r ? Math.max(...r.por_tipo.map((t) => t.receita), 1) : 1

  return (
    <div className="space-y-3">
      {agenda === null ? <Carregando txt="carregando campanhas…" />
        : agenda?.erro ? <Vazio txt="Não consegui carregar as campanhas." />
        : <>
            <div className="grid grid-cols-3 gap-2">
              <OverviewCard n={ativas.length} label="ativas agora" cor="#2DD4BF" icon={Activity} pulse={ativas.length > 0} />
              <OverviewCard n={agendadas.length} label="agendadas" cor="#60A5FA" icon={Clock} />
              <OverviewCard n={camps.length} label="no total" cor={LARANJA} icon={Layers} />
            </div>

            {(ativas.length > 0 || agendadas.length > 0) ? (
              <div className="glass rounded-2xl p-4">
                <div className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Calendar size={15} style={{ color: LARANJA }} /> Linha do tempo</div>
                {ativas.length > 0 && <>
                  <div className="text-[10px] text-faint uppercase tracking-wide mb-1.5 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: '#2DD4BF' }} /> rodando agora</div>
                  <div className="space-y-1.5 mb-3">{ativas.map((c) => <AgendaRow key={c.tipo + c.id} c={c} />)}</div>
                </>}
                {agendadas.length > 0 && <>
                  <div className="text-[10px] text-faint uppercase tracking-wide mb-1.5">próximas</div>
                  <div className="space-y-1.5">{agendadas.map((c) => <AgendaRow key={c.tipo + c.id} c={c} />)}</div>
                </>}
              </div>
            ) : <Vazio txt="Nenhuma campanha ativa ou agendada. Crie nas abas ao lado ou pelo Motor de promoções." />}

            {/* receita gerada */}
            <div className="glass rounded-2xl p-4" style={{ borderTop: `2px solid ${LARANJA}` }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-1.5"><TrendingUp size={15} style={{ color: LARANJA }} /> Receita gerada por promoções</div>
                  <div className="text-xs text-dim mt-0.5 max-w-md">Quanto suas promoções venderam no período — atribuído pedido a pedido pela promoção que cada item carrega.</div>
                </div>
                <div className="flex items-center gap-1.5">
                  {[7, 30, 90].map((dd) => (
                    <button key={dd} onClick={() => { setDias(dd); if (r || carregR) calcReceita(dd) }} className="text-xs px-2.5 py-1 rounded-lg font-medium"
                            style={dias === dd ? { background: LARANJA, color: '#fff' } : { background: 'var(--glass)', color: 'var(--text-dim)', border: '1px solid var(--glass-border)' }}>{dd}d</button>
                  ))}
                </div>
              </div>

              {!receita && !carregR && (
                <button onClick={() => calcReceita(dias)} className="w-full mt-3 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2" style={{ background: LARANJA }}>
                  <BadgePercent size={15} /> Calcular receita dos últimos {dias} dias
                </button>
              )}
              {!receita && !carregR && <div className="text-[11px] text-faint mt-2 text-center">Varre os pedidos do período — leva alguns segundos e fica em cache.</div>}
              {carregR && <div className="py-8 text-center text-faint flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> varrendo os pedidos e atribuindo às promoções…</div>}
              {receita?.erro && <div className="py-4 text-center text-sm" style={{ color: '#FF6F6F' }}>{typeof receita.erro === 'string' ? receita.erro : 'Não consegui calcular a receita.'}</div>}

              {r && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <FinMetric icon={TrendingUp} rotulo="Receita em promo" valor={brl(r.total.receita)} cor="#2DD4BF" />
                    <FinMetric icon={ShoppingBag} rotulo="Unidades" valor={r.total.unidades} />
                    <FinMetric icon={Package} rotulo="Pedidos" valor={r.total.pedidos} sub={`de ${r.pedidos_no_periodo} no período`} />
                  </div>

                  {r.por_tipo.length > 0 && (
                    <div>
                      <div className="text-xs text-faint mb-1.5">Por tipo de promoção</div>
                      <div className="space-y-1.5">
                        {r.por_tipo.map((t) => {
                          const meta = TIPO_META[t.tipo] || { rotulo: t.tipo, cor: '#888' }
                          return (
                            <div key={t.tipo} className="flex items-center gap-2">
                              <span className="text-[11px] w-16 shrink-0" style={{ color: meta.cor }}>{meta.rotulo}</span>
                              <div className="flex-1 h-5 rounded-md overflow-hidden relative" style={{ background: 'var(--glass-hover)' }}>
                                <div className="h-full rounded-md flex items-center px-2" style={{ width: `${Math.max(8, (t.receita / maxTipo) * 100)}%`, background: `color-mix(in srgb, ${meta.cor} 35%, transparent)` }}>
                                  <span className="text-[10px] font-semibold num whitespace-nowrap" style={{ color: meta.cor }}>{brl(t.receita)}</span>
                                </div>
                              </div>
                              <span className="text-[10px] text-faint num w-12 text-right shrink-0">{t.unidades} un</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {r.top_campanhas.length > 0 && (
                    <div>
                      <div className="text-xs text-faint mb-1.5">Campanhas que mais venderam</div>
                      <div className="space-y-1.5">
                        {r.top_campanhas.map((c, i) => {
                          const meta = TIPO_META[c.tipo] || { rotulo: c.tipo, cor: '#888' }
                          return (
                            <div key={c.id} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--glass-hover)' }}>
                              <span className="text-[11px] num text-faint w-4 shrink-0">{i + 1}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0" style={{ background: `color-mix(in srgb, ${meta.cor} 16%, transparent)`, color: meta.cor }}>{meta.rotulo}</span>
                              <span className="text-xs flex-1 min-w-0 truncate">{c.nome || `#${c.id}`}</span>
                              <span className="text-[10px] text-faint num shrink-0">{c.unidades} un</span>
                              <span className="text-sm font-bold num shrink-0" style={{ color: '#2DD4BF' }}>{brl(c.receita)}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {r.total.receita === 0 && <div className="text-xs text-faint text-center py-2">Nenhuma venda atribuída a promoções no período. Ou não houve vendas com promoção ativa, ou os pedidos ainda não têm a marcação de promoção.</div>}
                  {r.parcial && <div className="text-[10px] text-faint text-center">Período grande — amostra parcial dos pedidos mais recentes.</div>}
                </div>
              )}
            </div>
          </>}
    </div>
  )
}

function Cupons({ notify }) {
  const [lista, setLista] = useState(null)
  const [form, setForm] = useState(false)
  const [rep, setRep] = useState(null)
  const [enc, setEnc] = useState(null)
  const carregar = () => { setLista(null); api.shopeeCupons('ongoing').then(setLista).catch(() => setLista({ erro: true })) }
  useEffect(carregar, [])
  const cupons = lista?.response?.voucher_list || []
  const encerrar = async (id) => {
    setEnc(id)
    try { await api.shopeeEncerrarCupom(id); notify('Cupom encerrado', 'ok'); carregar() }
    catch (e) { notify(e.message, 'danger') }
    setEnc(null)
  }
  const repetir = async (c) => {
    setRep(c.voucher_id)
    try {
      const inicio = Math.floor(Date.now() / 1000) + 300
      const fim = inicio + Math.max(3600, (c.end_time - c.start_time) || 7 * 86400)
      const codigo = (c.voucher_code || 'CUPOM').replace(/\s/g, '').slice(0, 10) + String(inicio).slice(-4)
      await api.shopeeCriarCupom({ nome: (c.voucher_name || 'Cupom').slice(0, 20) + ' (rep.)', codigo,
        tipo_desconto: c.reward_type, valor: c.reward_type === 2 ? c.percentage : c.discount_amount,
        compra_minima: c.min_basket_price || 0, quantidade: c.usage_quantity || 100,
        inicio, fim, escopo: c.voucher_type_id || 1 })
      notify(`Cupom repetido como ${codigo} — começa em ~5 min`, 'ok'); carregar()
    } catch (e) { notify(e.message, 'danger') }
    setRep(null)
  }
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm text-dim">Cupons ativos da loja</div>
        <button onClick={() => setForm(true)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-white flex items-center gap-1.5" style={{ background: LARANJA }}><Plus size={14} /> Novo cupom</button>
      </div>
      {lista === null ? <Carregando txt="carregando cupons…" />
        : cupons.length === 0 ? <Vazio txt="Nenhum cupom ativo. Crie um para incentivar a compra." />
        : <div className="space-y-2.5">{cupons.map((c) => {
            const flags = [{ icon: Ticket, texto: c.voucher_code, cor: '#8B5CF6' },
              { texto: c.reward_type === 2 ? `${c.percentage}% OFF` : brl(c.discount_amount), cor: LARANJA }]
            if (c.min_basket_price) flags.push({ texto: `mín ${brl(c.min_basket_price)}` })
            flags.push({ texto: (c.voucher_type_id === 1 || !c.voucher_type_id) ? 'loja inteira' : 'produtos específicos' })
            return (
              <CampaignCard key={c.voucher_id} tipo="cupom" id={c.voucher_id} nome={c.voucher_name}
                inicio={c.start_time} fim={c.end_time} flags={flags} temProdutos={false}
                podeEncerrar onEncerrar={encerrar} encerrando={enc === c.voucher_id}
                onRepetir={() => repetir(c)} repetindo={rep === c.voucher_id} />
            )
          })}</div>}
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
  const [rep, setRep] = useState(null)
  const [enc, setEnc] = useState(null)
  const carregar = () => { setLista(null); api.shopeeDescontos(stat).then(setLista).catch(() => setLista({ erro: true })) }
  useEffect(carregar, [stat])
  const ds = lista?.response?.discount_list || []
  const repetir = async (c) => {
    setRep(c.id)
    try { const r = await api.shopeeCampanhaRepetir('desconto', c.id); notify(`Desconto repetido com ${r.itens || 0} produto(s) — começa em ~5 min`, 'ok'); setStat('upcoming') }
    catch (e) { notify(e.message, 'danger') }
    setRep(null)
  }
  const encerrar = async (id) => {
    setEnc(id)
    try { await api.shopeeEncerrarDesconto(id); notify('Desconto encerrado', 'ok'); carregar() }
    catch (e) { notify(e.message, 'danger') }
    setEnc(null)
  }
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {[['ongoing', 'Ativos'], ['upcoming', 'Agendados'], ['expired', 'Expirados']].map(([id, t]) => (
          <button key={id} onClick={() => setStat(id)} className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={stat === id ? { background: LARANJA, color: '#fff' } : { background: 'var(--glass)', color: 'var(--text-dim)', border: '1px solid var(--glass-border)' }}>{t}</button>
        ))}
      </div>
      {lista === null ? <Carregando txt="carregando descontos…" />
        : ds.length === 0 ? <Vazio txt="Nenhuma campanha de desconto aqui. Crie pelo Motor (Promoções IA) ou pelo Seller Center com início/fim agendados." />
        : <div className="space-y-2.5">{ds.map((c) => (
            <CampaignCard key={c.discount_id} tipo="desconto" id={c.discount_id} nome={c.discount_name}
              inicio={c.start_time} fim={c.end_time}
              flags={c.source != null ? [{ icon: c.source === 1 ? Bot : Settings2, texto: c.source === 1 ? 'criado pelo app' : 'Seller Center', cor: c.source === 1 ? '#14B8A6' : '#8B5CF6' }] : []}
              podeEncerrar={stat === 'ongoing'} onEncerrar={encerrar} encerrando={enc === c.discount_id}
              onRepetir={repetir} repetindo={rep === c.discount_id} />
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
// Carrega os anúncios da Shopee página a página (100 por vez), mostrando conforme chegam.
// Com milhares de SKUs, sem isso só viria a 1ª página e a busca não acharia a maioria.
function useItensShopeeProg(ativo = true) {
  const [itens, setItens] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [completo, setCompleto] = useState(false)
  useEffect(() => {
    if (!ativo) return
    let cancel = false
    const PAGINA = 100, MAX_PAGINAS = 8   // até ~800 anúncios
    setCarregando(true); setCompleto(false); setItens([])
    ;(async () => {
      const acc = []
      for (let p = 0; p < MAX_PAGINAS && !cancel; p++) {
        let r
        try { r = await api.shopeeProdutos(p * PAGINA, PAGINA) } catch { break }
        const lista = r?.response?.item || r?.item || []
        for (const x of lista) acc.push({
          item_id: x.item_id, nome: x.item_name || `#${x.item_id}`,
          sku: x.item_sku || '', preco: x.price, estoque: x.stock, imagem: x.image,
        })
        if (!cancel) setItens(acc.slice())
        if (lista.length < PAGINA) break   // última página
      }
      if (!cancel) { setCarregando(false); setCompleto(true) }
    })()
    return () => { cancel = true }
  }, [ativo])
  return { itens, carregando, completo }
}

function filtrarItens(itens, q) {
  const t = (q || '').trim().toLowerCase()
  if (!t) return itens
  return itens.filter((i) => (i.nome || '').toLowerCase().includes(t) || (i.sku || '').toLowerCase().includes(t))
}

// Barra de busca reutilizável (fica fixa no topo da lista enquanto rola)
function BarraBusca({ valor, onChange, carregando, completo, mostrando, total }) {
  return (
    <div className="sticky top-0 z-10 pb-2 -mt-1" style={{ background: 'var(--bg-elev, var(--glass))' }}>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input value={valor} onChange={(e) => onChange(e.target.value)} autoFocus
               placeholder="Buscar por nome ou SKU…"
               className="w-full glass rounded-lg pl-9 pr-3 py-2 text-sm bg-transparent outline-none" />
      </div>
      <div className="text-[11px] text-faint mt-1.5 flex items-center gap-1.5">
        {carregando
          ? <><Loader2 size={11} className="animate-spin" /> carregando anúncios… {total} até agora</>
          : <>{valor ? `${mostrando} de ${total}` : `${total} anúncio(s)`}{!completo && total >= 800 && ' (primeiros 800 — refine pela busca)'}</>}
      </div>
    </div>
  )
}

function SeletorItens({ titulo, comPreco, onConfirmar, onClose }) {
  const { itens, carregando, completo } = useItensShopeeProg()
  const [busca, setBusca] = useState('')
  const [sel, setSel] = useState({})  // item_id -> {nome, preco}
  const filtrados = useMemo(() => filtrarItens(itens, busca), [itens, busca])
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
  const nSel = Object.keys(sel).length
  return (
    <Modal titulo={nSel ? `${titulo} · ${nSel} selecionado(s)` : titulo} onClose={onClose} onSalvar={confirmar} salvando={false}>
      <BarraBusca valor={busca} onChange={setBusca} carregando={carregando} completo={completo} mostrando={filtrados.length} total={itens.length} />
      {itens.length === 0 && carregando ? <Carregando txt="carregando anúncios…" />
        : itens.length === 0 ? <Vazio txt="Não consegui listar os anúncios da Shopee." />
        : filtrados.length === 0 ? <div className="py-8 text-center text-faint text-sm">Nenhum anúncio para "{busca}".</div>
        : <div className="space-y-1">
            {filtrados.map((i) => (
              <div key={i.item_id} className="rounded-lg px-2.5 py-1.5" style={{ background: sel[i.item_id] ? 'rgba(238,77,45,.1)' : 'var(--glass-hover)' }}>
                <button onClick={() => toggle(i)} className="w-full flex items-center gap-2 text-left">
                  <span className="h-4 w-4 rounded grid place-items-center shrink-0" style={{ background: sel[i.item_id] ? LARANJA : 'transparent', border: `1px solid ${sel[i.item_id] ? LARANJA : 'var(--glass-border)'}` }}>
                    {sel[i.item_id] && <CheckCircle2 size={11} className="text-white" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-sm truncate block">{i.nome}</span>
                    {i.sku && <span className="text-[10px] text-faint num">SKU {i.sku}</span>}
                  </span>
                  <span className="text-[11px] text-faint num shrink-0">#{i.item_id}</span>
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
  const [rep, setRep] = useState(null)
  const [enc, setEnc] = useState(null)
  const carregar = () => { setLista(null); api.shopeeBundles('ongoing').then(setLista).catch(() => setLista({ erro: true })) }
  useEffect(carregar, [])
  const bs = lista?.response?.bundle_deal_list || []
  const repetir = async (c) => {
    setRep(c.id)
    try { const r = await api.shopeeCampanhaRepetir('bundle', c.id); notify(`Combo repetido com ${r.itens || 0} produto(s) — começa em ~5 min`, 'ok'); carregar() }
    catch (e) { notify(e.message, 'danger') }
    setRep(null)
  }
  const encerrar = async (id) => {
    setEnc(id)
    try { await api.shopeeEncerrarBundle(id); notify('Combo encerrado', 'ok'); carregar() }
    catch (e) { notify(e.message, 'danger') }
    setEnc(null)
  }
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm text-dim">Bundles ativos (compre N, leve com desconto)</div>
        <button onClick={() => setForm(true)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-white flex items-center gap-1.5" style={{ background: LARANJA }}><Plus size={14} /> Novo bundle</button>
      </div>
      {lista === null ? <Carregando txt="carregando bundles…" />
        : bs.length === 0 ? <Vazio txt="Nenhum combo ativo. Crie um na aba acima — leve 2+ por um preço melhor." />
        : <div className="space-y-2.5">{bs.map((b) => {
            const reg = b.bundle_deal_rule || {}
            const flags = []
            if (reg.min_amount) flags.push({ icon: Layers, texto: `leve ${reg.min_amount}+`, cor: '#14B8A6' })
            if (reg.rule_type === 2 && reg.discount_value) flags.push({ icon: Percent, texto: `-${reg.discount_value}%`, cor: LARANJA })
            else if (reg.rule_type === 3 && reg.discount_value) flags.push({ texto: `-R$ ${reg.discount_value}`, cor: LARANJA })
            else if (reg.rule_type === 1 && reg.discount_value) flags.push({ texto: `combo R$ ${reg.discount_value}`, cor: LARANJA })
            return (
              <CampaignCard key={b.bundle_deal_id} tipo="bundle" id={b.bundle_deal_id} nome={b.name}
                inicio={b.start_time} fim={b.end_time} flags={flags}
                podeEncerrar onEncerrar={encerrar} encerrando={enc === b.bundle_deal_id}
                onRepetir={repetir} repetindo={rep === b.bundle_deal_id} />
            )
          })}</div>}
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
  const [rep, setRep] = useState(null)
  const [enc, setEnc] = useState(null)
  const carregar = () => { setLista(null); api.shopeeAddons('ongoing').then(setLista).catch(() => setLista({ erro: true })) }
  useEffect(carregar, [])
  const as = lista?.response?.add_on_deal_list || []
  const repetir = async (c) => {
    setRep(c.id)
    try { const r = await api.shopeeCampanhaRepetir('addon', c.id); notify('Add-on repetido — começa em ~5 min', 'ok'); carregar() }
    catch (e) { notify(e.message, 'danger') }
    setRep(null)
  }
  const encerrar = async (id) => {
    setEnc(id)
    try { await api.shopeeEncerrarAddon(id); notify('Add-on encerrado', 'ok'); carregar() }
    catch (e) { notify(e.message, 'danger') }
    setEnc(null)
  }
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm text-dim">Add-on (leve um adicional com desconto na compra)</div>
        <button onClick={() => setForm(true)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-white flex items-center gap-1.5" style={{ background: LARANJA }}><Plus size={14} /> Novo add-on</button>
      </div>
      {lista === null ? <Carregando txt="carregando add-ons…" />
        : as.length === 0 ? <Vazio txt="Nenhum add-on ativo. Crie um na aba acima — adicional com desconto junto do principal." />
        : <div className="space-y-2.5">{as.map((a) => (
            <CampaignCard key={a.add_on_deal_id} tipo="addon" id={a.add_on_deal_id} nome={a.add_on_deal_name}
              inicio={a.start_time} fim={a.end_time}
              podeEncerrar onEncerrar={encerrar} encerrando={enc === a.add_on_deal_id}
              onRepetir={repetir} repetindo={rep === a.add_on_deal_id} />
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
  const [enc, setEnc] = useState(null)
  const carregar = () => { setLista(null); api.shopeeFlash(2).then(setLista).catch(() => setLista({ erro: true })) }
  useEffect(carregar, [])
  const fs = lista?.response?.flash_sale_list || lista?.response || []
  const arr = Array.isArray(fs) ? fs : []
  const encerrar = async (id) => {
    setEnc(id)
    try { await api.shopeeEncerrarFlash(id); notify('Flash sale removida', 'ok'); carregar() }
    catch (e) { notify(e.message, 'danger') }
    setEnc(null)
  }
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm text-dim">Flash Sale da loja (slots de horário)</div>
        <button onClick={() => setForm(true)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-white flex items-center gap-1.5" style={{ background: LARANJA }}><Flame size={14} /> Nova flash sale</button>
      </div>
      {lista === null ? <Carregando txt="carregando flash sales…" />
        : arr.length === 0 ? <Vazio txt="Nenhuma flash sale ativa ou agendada. A Shopee libera slots por elegibilidade da loja." />
        : <div className="space-y-2.5">{arr.map((s) => (
            <CampaignCard key={s.flash_sale_id} tipo="flash" id={s.flash_sale_id} nome={`Flash #${s.flash_sale_id}`}
              inicio={s.start_time} fim={s.end_time}
              flags={[{ icon: Zap, texto: 'oferta relâmpago', cor: '#F59E0B' }]}
              podeEncerrar onEncerrar={encerrar} encerrando={enc === s.flash_sale_id} />
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
