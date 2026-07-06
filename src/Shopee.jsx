import { Component, useEffect, useMemo, useRef, useState } from 'react'
import {
  Rocket, Star, Activity, ShoppingBag, Tag, Megaphone, Package,
  Plus, X, Pin, PinOff, Play, Square, Loader2, Zap, Clock, CheckCircle2,
  AlertTriangle, Plug, RefreshCw, Wand2, ChevronRight, ChevronLeft, Filter, Flame,
  HelpCircle, GitCompareArrows, Undo2, TrendingUp, TrendingDown, Trash2, Calendar,
  Stethoscope, XCircle, ShieldAlert, CircleDot, Bot, Search,
  Send, Sparkles, SlidersHorizontal, MessageSquare, ImageIcon, Check, Settings, Settings2, Smile, ThumbsUp,
  Percent, Ticket, RotateCcw, ChevronDown, PlusCircle, Layers, Hourglass, Infinity as InfinityIcon,
  Wallet, Receipt, Coins, Truck, BadgePercent, Target,
  Printer, MapPin, FileText, ClipboardList, User as UserIcon,
  Repeat, CreditCard, Phone, Hash, Barcode, CheckCheck, Box, Info, Copy, Save,
} from 'lucide-react'
import { api, setToken } from './api'
import ShopeeBoost from './ShopeeBoost.jsx'
import { useToast } from './toast.jsx'
import { CampaignCard, fmtDur, useAgora, cicloInfo, TIPO_META, fmtDataHora } from './CampaignCard'
import qrcode from 'qrcode-generator'
import { SPX_LOGO, ICONS } from './printAssets'

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

// Navegação em 2 níveis: grupos (nível 1) → abas (nível 2). Reduz a poluição de 11 abas soltas.
const GRUPOS = [
  { id: 'campanhas', label: 'Campanhas', icon: Megaphone, abas: ['promocoes', 'motor', 'boost', 'ads'] },
  { id: 'financeiro', label: 'Pedidos & Financeiro', icon: ShoppingBag, abas: ['pedidos', 'devolucoes', 'catalogo'] },
  { id: 'servico', label: 'Status do serviço', icon: Activity, abas: ['diagnostico', 'saude', 'avaliacoes', 'qa'] },
]
const TAB_META = Object.fromEntries(TABS.map((t) => [t.id, t]))

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
    <div className="space-y-4 max-w-6xl 2xl:max-w-[1760px]">
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

      {/* Navegação em 2 níveis — grupos + sub-abas */}
      {(() => {
        const grupoAtivo = GRUPOS.find((g) => g.abas.includes(aba)) || GRUPOS[0]
        return (
          <div className="space-y-2.5">
            {/* Nível 1 — grupos */}
            <div className="flex gap-1.5 flex-wrap">
              {GRUPOS.map((g) => {
                const on = grupoAtivo.id === g.id
                const Ic = g.icon
                const temAuto = g.abas.some((id) => TAB_META[id]?.destaque)
                return (
                  <button key={g.id} onClick={() => { if (!g.abas.includes(aba)) setAba(g.abas[0]) }}
                          className="rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-all"
                          style={on
                            ? { background: LARANJA, color: '#fff' }
                            : { background: 'var(--glass)', color: 'var(--text-dim)', border: '1px solid var(--glass-border)' }}>
                    <Ic size={16} />{g.label}
                    {temAuto && !on && <span className="h-1.5 w-1.5 rounded-full" style={{ background: LARANJA }} title="tem agente automático" />}
                  </button>
                )
              })}
            </div>
            {/* Nível 2 — sub-abas do grupo ativo */}
            <div className="flex gap-1.5 flex-wrap pl-0.5">
              {grupoAtivo.abas.map((id) => {
                const t = TAB_META[id]
                if (!t) return null
                const on = aba === id
                const Ic = t.icon
                return (
                  <button key={id} onClick={() => setAba(id)}
                          className="rounded-lg px-3 py-1.5 text-[13px] font-medium flex items-center gap-1.5 transition-all"
                          style={on
                            ? { background: `color-mix(in srgb, ${LARANJA} 16%, transparent)`, color: LARANJA, border: `1px solid ${LARANJA}` }
                            : { background: 'transparent', color: 'var(--text-faint)', border: '1px solid var(--glass-border)' }}>
                    <Ic size={14} />{t.label}
                    {t.destaque && !on && <span className="text-[9px] px-1 rounded" style={{ background: 'rgba(238,77,45,.15)', color: LARANJA }}>auto</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })()}

      {aba === 'diagnostico' && <Diagnostico status={status} />}
      {aba === 'boost' && <ShopeeBoost conectado={status?.ok} notify={notify} />}
      {aba === 'avaliacoes' && <Avaliacoes conectado={status?.ok} notify={notify} />}
      {aba === 'qa' && <Perguntas conectado={status?.ok} notify={notify} />}
      {aba === 'catalogo' && <Divergencia conectado={status?.ok} notify={notify} />}
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
  const [desemp, setDesemp] = useState(null)        // {item_id: vendas 30d}
  const [desempLoad, setDesempLoad] = useState(false)
  const editandoJanela = useRef(false)

  const carregarDesemp = async () => {
    setDesempLoad(true)
    try { const r = await api.shopeeBoostDesempenho(); setDesemp(r.vendas || {}) }
    catch (e) { notify(e.message, 'danger') }
    setDesempLoad(false)
  }

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
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <div className="text-sm font-medium flex items-center gap-2"><Flame size={15} style={{ color: LARANJA }} /> Impulsionando agora <span className="text-faint">({ativos.length}/5)</span></div>
          <button onClick={carregarDesemp} disabled={!conectado || desempLoad}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 disabled:opacity-60"
                  style={{ background: 'var(--glass-hover)', color: 'var(--text-dim)' }}
                  title="Mostra as vendas dos últimos 30 dias de cada produto, pra você ver se o impulso está convertendo">
            {desempLoad ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />} {desemp ? 'Atualizar desempenho' : 'Ver desempenho'}
          </button>
        </div>
        {ativos.length === 0
          ? <div className="text-sm text-faint py-6 text-center">Nenhum produto impulsionado no momento.</div>
          : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ativos.map((i) => (
                <div key={i.item_id} className="rounded-xl p-3 flex items-start gap-3"
                     style={{ background: 'var(--glass-hover)', border: `1px solid ${LARANJA}33` }}>
                  <Countdown iso={i.termina_em} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium flex items-start gap-1">
                      {i.fixo && <Pin size={11} style={{ color: LARANJA, flexShrink: 0, marginTop: 3 }} />}
                      <span className="leading-snug" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{i.nome || `#${i.item_id}`}</span>
                    </div>
                    <div className="text-[11px] text-faint num mt-0.5">{i.impulsos} impulso(s) • #{i.item_id}</div>
                    {desemp && desemp[i.item_id] != null && (
                      <div className="text-[11px] num mt-1 flex items-center gap-1" style={{ color: desemp[i.item_id] > 0 ? '#2DD4BF' : 'var(--text-faint)' }}>
                        <TrendingUp size={11} /> {desemp[i.item_id]} venda(s) em 30 dias
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => fixar(i.item_id, !i.fixo)} title={i.fixo ? 'Desafixar' : 'Fixar (sempre impulsionar)'}
                            className="p-1" style={{ color: i.fixo ? LARANJA : 'var(--text-faint)' }}>{i.fixo ? <PinOff size={15} /> : <Pin size={15} />}</button>
                    <button onClick={() => remover(i.item_id)} title="Tirar do rodízio (o impulso atual de 4h termina sozinho na Shopee; ele só não volta a ser impulsionado)"
                            className="text-faint hover:text-danger p-1"><X size={15} /></button>
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
                    <div className="text-sm leading-snug" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{i.nome || `#${i.item_id}`}</div>
                    <div className="text-[11px] text-faint num">#{i.item_id} • {i.impulsos} impulso(s){i.prioridade ? ` • prioridade ${i.prioridade}` : ''}{desemp && desemp[i.item_id] != null ? ` • ${desemp[i.item_id]} venda(s)/30d` : ''}</div>
                  </div>
                  <button onClick={() => fixar(i.item_id, true)} title="Fixar (sempre impulsionar)"
                          className="text-faint hover:text-fg p-1"><Pin size={15} /></button>
                  <button onClick={() => remover(i.item_id)} title="Remover do rodízio" className="text-faint hover:text-danger p-1"><X size={15} /></button>
                </div>
              ))}
            </div>}
      </div>

      {addOpen && <AddProdutos jaNoBoost={new Set(bs?.itens_ids || [...ativos, ...fila].map((i) => i.item_id))} onClose={() => setAddOpen(false)} onAdded={() => { setAddOpen(false); carregar() }} notify={notify} />}
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

function AddProdutos({ jaNoBoost, onClose, onAdded, notify }) {
  const { itens, carregando, completo } = useItensShopeeProg()
  const [busca, setBusca] = useState('')
  const [sel, setSel] = useState(() => new Set())
  const [salvando, setSalvando] = useState(false)
  const ja = jaNoBoost instanceof Set ? jaNoBoost : new Set(jaNoBoost || [])
  const disponiveis = useMemo(() => itens.filter((i) => !ja.has(i.item_id)), [itens, ja])
  const ocultos = itens.length - disponiveis.length
  const filtrados = useMemo(() => filtrarItens(disponiveis, busca), [disponiveis, busca])
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const salvar = async () => {
    const escolhidos = disponiveis.filter((i) => sel.has(i.item_id))
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
          <BarraBusca valor={busca} onChange={setBusca} carregando={carregando} completo={completo} mostrando={filtrados.length} total={disponiveis.length} />
          {ocultos > 0 && (
            <div className="text-[11px] text-faint flex items-center gap-1.5 px-1 mb-1.5">
              <CheckCircle2 size={11} style={{ color: LARANJA }} /> {ocultos} produto(s) já no boost — ocultados desta lista
            </div>
          )}
          {itens.length === 0 && carregando
            ? <div className="py-10 text-center text-faint flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> carregando seus anúncios…</div>
            : itens.length === 0
              ? <div className="py-10 text-center text-faint text-sm">Não consegui listar os anúncios da Shopee. Verifique a conexão da loja.</div>
              : disponiveis.length === 0
                ? <div className="py-8 text-center text-faint text-sm">Todos os seus anúncios já estão no rodízio de boost.</div>
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
  ['caloroso', 'Caloroso', ''],
  ['profissional', 'Profissional', ''],
  ['descontraido', 'Descontraído', ''],
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
                                className="text-[11px] px-2 py-1 rounded-md glass text-dim hover:text-fg disabled:opacity-50">{t}</button>
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
                        style={f.tom === id ? { background: LARANJA, color: '#fff' } : { background: 'var(--glass-hover)', color: 'var(--text-dim)' }}>{t}</button>
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

function DiagFlashRaw({ d, onClose }) {
  const AMBER = '#F59E0B'
  if (d?.erro) return (
    <div className="glass rounded-2xl p-4" style={{ borderLeft: '3px solid #FF6F6F' }}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-medium flex items-center gap-2" style={{ color: '#FF6F6F' }}><AlertTriangle size={15} /> Diagnóstico falhou</div>
        <button onClick={onClose} className="text-faint hover:text-fg"><X size={14} /></button>
      </div>
      <div className="text-xs text-dim">{d.erro}</div>
    </div>
  )
  const semSlot = (d.slots_disponiveis || 0) === 0
  const ok = d.ok
  const cor = ok ? '#2DD4BF' : semSlot ? AMBER : '#d6007f'
  return (
    <div className="glass rounded-2xl p-4 space-y-3" style={{ borderLeft: `3px solid ${cor}` }}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium flex items-center gap-2"><Flame size={15} style={{ color: AMBER }} /> Diagnóstico do relâmpago</div>
        <button onClick={onClose} className="text-faint hover:text-fg"><X size={14} /></button>
      </div>
      {!d.produto ? (
        <div className="text-xs text-dim">{d.motivo || 'Nenhum produto elegível para testar.'}</div>
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--glass-hover)' }}>
            <Clock size={14} style={{ color: semSlot ? AMBER : '#2DD4BF' }} />
            <span className="text-xs text-dim">Horários (slots) de Flash Sale liberados pela Shopee para sua loja:</span>
            <b className="num" style={{ color: semSlot ? AMBER : '#2DD4BF' }}>{d.slots_disponiveis ?? 0}</b>
          </div>
          {semSlot ? (
            <div className="rounded-xl p-3" style={{ background: `color-mix(in srgb, ${AMBER} 12%, transparent)` }}>
              <div className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: AMBER }}><Info size={13} /> Por isso o relâmpago não é criado</div>
              <div className="text-[11px] text-dim leading-relaxed">{d.motivo}</div>
            </div>
          ) : ok ? (
            <div className="text-sm flex items-center gap-2" style={{ color: '#2DD4BF' }}>
              <CheckCircle2 size={15} /> Funcionou — sua loja tem slots e o produto foi aceito. O agente consegue criar relâmpagos.
            </div>
          ) : (
            <div className="rounded-xl p-3" style={{ background: 'color-mix(in srgb, #d6007f 10%, transparent)' }}>
              <div className="text-xs font-semibold mb-1.5" style={{ color: '#d6007f' }}>Havia slot, mas o produto/oferta foi recusado. Motivo:</div>
              <div className="text-[11px] text-dim leading-relaxed">{d.motivo || 'Veja as respostas cruas abaixo.'}</div>
              {(d.failed_items || []).length > 0 && (
                <pre className="mt-2 p-2 rounded-lg overflow-auto num" style={{ background: 'var(--glass)', maxHeight: 160, fontSize: 10 }}>
{JSON.stringify(d.failed_items, null, 2)}
                </pre>
              )}
            </div>
          )}
          <div className="text-[11px] text-faint flex items-center gap-1.5 flex-wrap">
            <span>Produto testado:</span><b className="text-dim">{d.produto.nome}</b>
            <span className="num">{brl(d.produto.preco_atual)} → <b style={{ color: AMBER }}>{brl(d.produto.preco_promo)}</b></span>
          </div>
          <details className="text-[11px]">
            <summary className="cursor-pointer text-faint hover:text-fg">ver respostas cruas da Shopee (slots + cada etapa)</summary>
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
  const [diagFlashRaw, setDiagFlashRaw] = useState(null)
  const [diagFlashLoad, setDiagFlashLoad] = useState(false)
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

      {(cfg.tipo === 'flash' || cfg.tipo === 'ambos') && (
        <button onClick={async () => {
                  setDiagFlashLoad(true); setDiagFlashRaw(null)
                  try { setDiagFlashRaw(await api.shopeePromoDiagnosticarFlash()) }
                  catch (e) { setDiagFlashRaw({ erro: e.message }) }
                  finally { setDiagFlashLoad(false) }
                }} disabled={diagFlashLoad}
                className="w-full text-xs px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 glass text-dim hover:text-fg disabled:opacity-60">
          {diagFlashLoad ? <Loader2 size={13} className="animate-spin" /> : <Flame size={13} />}
          {diagFlashLoad ? 'Testando relâmpago na Shopee…' : 'Diagnosticar relâmpago (mostra se sua loja tem slots de Flash Sale)'}
        </button>
      )}

      {diagFlashRaw && <DiagFlashRaw d={diagFlashRaw} onClose={() => setDiagFlashRaw(null)} />}

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

const AZUL_RADAR = '#3DA8F5'
const STATUS_PREC = {
  no_padrao: { label: 'No padrão', cor: '#2DD4BF', Icon: CheckCircle2 },
  abaixo: { label: 'Abaixo do líquido', cor: '#d6007f', Icon: TrendingDown },
  prejuizo: { label: 'Prejuízo', cor: '#FF6F6F', Icon: AlertTriangle },
  em_competicao: { label: 'Em competição', cor: AZUL_RADAR, Icon: Target },
  sem_base: { label: 'Sem Preço Bling', cor: 'var(--text-faint)', Icon: HelpCircle },
}
const statusProduto = (l) => l.sem_base ? 'sem_base' : l.prejuizo ? 'prejuizo' : l.em_competicao ? 'em_competicao' : l.abaixo ? 'abaixo' : 'no_padrao'
const contarStatus = (itens) => {
  const c = { no_padrao: 0, abaixo: 0, prejuizo: 0, em_competicao: 0, sem_base: 0, total: itens.length }
  for (const l of itens) c[statusProduto(l)]++
  return c
}
function BadgeStatus({ s, lg }) {
  const m = STATUS_PREC[s]; if (!m) return null
  const { Icon } = m
  return <span className={`${lg ? 'px-2.5 py-1 text-[11px]' : 'px-2 py-0.5 text-[10px]'} rounded font-semibold inline-flex items-center gap-1 whitespace-nowrap`} style={{ background: `color-mix(in srgb, ${m.cor} 16%, transparent)`, color: m.cor }}><Icon size={lg ? 12 : 11} /> {m.label}</span>
}
function BadgePromo({ lg }) {
  return <span className={`${lg ? 'px-2.5 py-1 text-[11px]' : 'px-2 py-0.5 text-[10px]'} rounded font-semibold inline-flex items-center gap-1 whitespace-nowrap`} style={{ background: 'color-mix(in srgb, #F5A623 18%, transparent)', color: '#F5A623' }}><BadgePercent size={lg ? 12 : 11} /> Em promoção</span>
}

/* ====================== Pedidos: utilitários ====================== */

// Barreira de erro — impede que um payload inesperado derrube a tela inteira (tela preta)
class LimiteErro extends Component {
  constructor(p) { super(p); this.state = { erro: null } }
  static getDerivedStateFromError(e) { return { erro: e } }
  componentDidCatch(e, info) { try { console.error('Pedido modal erro:', e, info) } catch (_) {} }
  render() {
    if (this.state.erro) return this.props.fallback || (
      <div className="py-8 text-center text-sm" style={{ color: '#FF6F6F' }}>
        <AlertTriangle size={20} className="mx-auto mb-2" />
        Não consegui montar este detalhe. Tente reabrir.
      </div>
    )
    return this.props.children
  }
}

// Status Shopee → rótulo PT e cor
const STATUS_PT = {
  UNPAID: 'Não pago', READY_TO_SHIP: 'A enviar', PROCESSED: 'Processado', RETRY_SHIP: 'Reenviar',
  SHIPPED: 'Enviado', TO_CONFIRM_RECEIVE: 'A confirmar', COMPLETED: 'Concluído',
  IN_CANCEL: 'Em cancelamento', CANCELLED: 'Cancelado', TO_RETURN: 'Devolução',
}
const statusPt = (st) => STATUS_PT[String(st || '').toUpperCase()] || st || '—'
const ehCancelado = (st) => ['CANCELLED', 'IN_CANCEL', 'TO_RETURN'].includes(String(st || '').toUpperCase())
const corStatus = (st) => {
  const s = String(st || '').toUpperCase()
  if (ehCancelado(s)) return '#FF6F6F'
  if (s === 'COMPLETED') return '#2DD4BF'
  if (s === 'READY_TO_SHIP' || s === 'PROCESSED') return LARANJA
  return 'var(--text-dim)'
}

// Etiquetas já impressas (persistência local por order_sn)
const LS_ETIQ = 'shopee_etiquetas_impressas'
const lerImpressas = () => { try { return new Set(JSON.parse(localStorage.getItem(LS_ETIQ) || '[]')) } catch { return new Set() } }
const gravarImpressas = (s) => { try { localStorage.setItem(LS_ETIQ, JSON.stringify([...s].slice(-3000))) } catch (_) {} }

// Código de barras Code128-B → string SVG (autossuficiente, sem dependência externa)
const C128B = ['212222','222122','222221','121223','121322','131222','122213','122312','132212','221213','221312','231212','112232','122132','122231','113222','123122','123221','223211','221132','221231','213212','223112','312131','311222','321122','321221','312212','322112','322211','212123','212321','232121','111323','131123','131321','112313','132113','132311','211313','231113','231311','112133','112331','132131','113123','113321','133121','313121','211331','231131','213113','213311','213131','311123','311321','331121','312113','312311','332111','314111','221411','431111','111224','111422','121124','121421','141122','141221','112214','112412','122114','122411','142112','142211','241211','221114','413111','241112','134111','111242','121142','121241','114212','124112','124211','411212','421112','421211','212141','214121','412121','111143','111341','131141','114113','114311','411113','411311','113141','114131','311141','411131','211412','211214','211232','2331112']
function code128Widths(texto) {
  const s = String(texto || '').replace(/[^\x20-\x7e]/g, '')
  if (!s) return null
  let soma = 104; const codes = [104]
  for (let i = 0; i < s.length; i++) { const v = s.charCodeAt(i) - 32; codes.push(v); soma += v * (i + 1) }
  codes.push(soma % 103); codes.push(106)
  return codes.map((c) => C128B[c]).join('')
}
function barcodeSVG(valor, { height = 46, modulo = 1.5, texto = true } = {}) {
  const w = code128Widths(valor)
  if (!w) return ''
  let x = 8, rects = ''  // quiet zone
  for (let i = 0; i < w.length; i++) {
    const ww = parseInt(w[i], 10) * modulo
    if (i % 2 === 0) rects += `<rect x="${x.toFixed(1)}" y="0" width="${ww.toFixed(1)}" height="${height}" fill="#000"/>`
    x += ww
  }
  const total = x + 8
  const th = texto ? 15 : 0
  const t = texto ? `<text x="${(total / 2).toFixed(1)}" y="${height + 12}" text-anchor="middle" font-family="monospace" font-size="11" letter-spacing="1">${valor}</text>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total.toFixed(1)}" height="${height + th}" viewBox="0 0 ${total.toFixed(1)} ${height + th}">${rects}${t}</svg>`
}
function BarcodeInline({ valor, height = 40, modulo = 1.4, texto = false }) {
  const svg = barcodeSVG(valor, { height, modulo, texto })
  if (!svg) return null
  return <span style={{ display: 'inline-block', lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: svg }} />
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// A Shopee mascara dados pessoais (nome/endereço/tel) como "****". Detecta isso pra não imprimir lixo.
const mascarado = (s) => { const t = String(s ?? '').replace(/[\s·\/\-.,]/g, ''); return !t || /^\*+$/.test(t) }

/* ===== Helpers visuais para impressão (etiqueta + folha) ===== */
// Dados do remetente/emitente — TODO: puxar da config da conta. Ajuste com os dados reais.
const REMETENTE_NOME = 'Sóstrass Acessórios e Pedrarias'
const REMETENTE_END = 'Rua Comendador, 120 · Limeira - SP · CEP 13480-000'
const REMETENTE_CNPJ = '00.000.000/0000-00'

// Config de impressão (Módulo 2). É preenchida pela conta via painel "Personalizar impressão".
// As funções de impressão leem daqui por padrão; a prévia ao vivo passa um cfg explícito.
const PRINT_CFG_PADRAO = {
  emitente_nome: '', emitente_cnpj: '', emitente_endereco: '', emitente_cidade: '',
  mostrar_timeline: true, mostrar_nfe: true, mostrar_rastreio: true, mostrar_destinatario: true,
  mostrar_miniaturas: true, mostrar_complemento: true, mostrar_nota_comprador: true,
  mostrar_codigo_barras: true, mostrar_qr: true,
}
let PRINT_CFG = { ...PRINT_CFG_PADRAO }
function setPrintCfg(c) { PRINT_CFG = { ...PRINT_CFG_PADRAO, ...(c || {}) } }
// Overrides por tipo de impressão (Folha do pedido x Etiqueta), guardados no navegador.
// O backend continua só com dados da empresa + flags base; cada tipo pode divergir.
// Fallback: se não houver override salvo, usa PRINT_CFG (comportamento atual, sem regressão).
const LS_PRINT_TIPO = 'precifica_print_tipo'
const FLAGS_IMPR = ['mostrar_timeline', 'mostrar_miniaturas', 'mostrar_codigo_barras', 'mostrar_nota_comprador', 'mostrar_complemento', 'mostrar_nfe', 'mostrar_rastreio', 'mostrar_destinatario', 'mostrar_qr']
function lerPorTipo() { try { return JSON.parse(localStorage.getItem(LS_PRINT_TIPO) || '{}') || {} } catch { return {} } }
function gravarPorTipo(o) { try { localStorage.setItem(LS_PRINT_TIPO, JSON.stringify(o || {})) } catch (_) {} }
function cfgTipo(tipo) { const o = lerPorTipo()[tipo]; return o ? { ...PRINT_CFG, ...o } : PRINT_CFG }
// resolve emitente: usa o que a conta configurou; cai no placeholder se vazio
const emitNome = (cfg) => (cfg.emitente_nome || REMETENTE_NOME)
const emitCnpjCidade = (cfg) => {
  const cnpj = cfg.emitente_cnpj ? `CNPJ ${cfg.emitente_cnpj}` : `CNPJ ${REMETENTE_CNPJ}`
  const cid = cfg.emitente_cidade || 'Limeira/SP'
  return `${cnpj} · ${cid}`
}
const emitEndereco = (cfg) => {
  const e = [cfg.emitente_endereco, cfg.emitente_cidade].filter(Boolean).join(' · ')
  return e || REMETENTE_END
}

// Ícone lucide inline (paths em printAssets.ICONS)
function ico(nome, size = 14, cor = '#14151a', sw = 2) {
  const p = ICONS[nome] || ''
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${cor}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0">${p}</svg>`
}
// Logo Precifica AI (símbolo gradiente + wordmark) — divulga o app no rodapé
function logoPrecifica(scale = 1) {
  const s = scale
  return `<span class="pfl"><span class="pfmark" style="width:${Math.round(18 * s)}px;height:${Math.round(18 * s)}px">${ico('sparkles', Math.round(11 * s), '#fff', 2.2)}</span><span class="pfwm" style="font-size:${Math.round(13 * s)}px">Precifica<b>AI</b></span></span>`
}
// QR vetorial — viewBox p/ escalar + width/height explícitos p/ navegadores antigos (Safari High Sierra não dimensiona SVG só-viewBox)
function qrSvg(texto) {
  try {
    const qr = qrcode(0, 'M'); qr.addData(String(texto || '')); qr.make()
    let svg = qr.createSvgTag({ cellSize: 1, margin: 0, scalable: true })
    const m = svg.match(/viewBox="0 0 (\d+)/)
    const px = m ? parseInt(m[1], 10) * 4 : 120
    if (!/<svg[^>]*\swidth=/.test(svg)) svg = svg.replace('<svg ', `<svg width="${px}" height="${px}" `)
    return svg
  } catch (_) { return '' }
}
// Status Shopee → estágios da timeline (com qual está em andamento)
function estagiosTimeline(status) {
  const s = String(status || '').toUpperCase()
  let cur = 2 // padrão: separação
  if (s === 'UNPAID') cur = 1
  else if (s === 'READY_TO_SHIP' || s === 'PROCESSED' || s === 'RETRY_SHIP') cur = 2
  else if (s === 'SHIPPED') cur = 3
  else if (s === 'TO_CONFIRM_RECEIVE') cur = 4
  else if (s === 'COMPLETED') cur = 5
  const defs = [['Pedido Criado', 'receipt'], ['Pagamento', 'dollar-sign'], ['Separação', 'package'], ['Enviado', 'truck'], ['Entregue', 'map-pin']]
  return defs.map((d, i) => ({ label: d[0], icon: d[1], estado: i < cur ? 'done' : (i === cur ? 'current' : 'pending') }))
}
// HTML da timeline (compacta na etiqueta, normal na folha)
function timelineHTML(status, compact = false) {
  const nodes = estagiosTimeline(status).map((e) => {
    const cor = (e.estado === 'done' || e.estado === 'current') ? '#fff' : '#b6bac2'
    const sz = compact ? 11 : 16
    return `<div class="tn ${e.estado}"><div class="tcirc">${ico(e.icon, sz, cor, 2.2)}</div><div class="tlab">${e.label}</div></div>`
  }).join('')
  return `<div class="tl ${compact ? 'cmp' : ''}">${nodes}</div>`
}

function abrirImpressao(titulo, css, corpo) {
  const w = window.open('', '_blank')
  if (!w) { alert('Permita pop-ups para imprimir.'); return }
  w.document.write(`<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>${css}</style></head><body>${corpo}<script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>`)
  w.document.close()
}

// Folha de pedido (separação/conferência) — Enterprise, 1 por página
function htmlFolhaPedido(p, cfg = PRINT_CFG) {
  const end = p.endereco || {}
  const enderecoLinha = [end.completo, [end.cidade, end.uf].filter(Boolean).join('/'), end.cep ? 'CEP ' + end.cep : ''].filter(Boolean).join(' · ')
  const totU = (p.itens || []).reduce((s, i) => s + (i.qtd || 0), 0)
  const nItens = (p.itens || []).length
  const rows = (p.itens || []).map((it) => `
    <div class="row">
      ${cfg.mostrar_miniaturas ? `<div class="ph">${it.imagem ? `<img src="${esc(it.imagem)}">` : ico('image', 17, '#c2c5cd')}</div>` : ''}
      <div class="cd">
        <div class="nm">${esc(it.nome) || '—'}</div>
        <div class="mt">${it.variacao ? `${ico('palette', 12, '#7a7f8b')}<b>${esc(it.variacao)}</b>` : ''}${it.variacao && it.sku ? '<span class="dt2">·</span>' : ''}${it.sku ? `${ico('hash', 11, '#9aa0ab')}<span class="sku">${esc(it.sku)}</span>` : ''}${cfg.mostrar_complemento && it.complemento ? `<span class="dt2">·</span>${ico('ruler', 11, '#aab0bb')}<span class="cp">${esc(it.complemento)}</span>` : ''}</div>
      </div>
      <div class="qt"><b>${it.qtd}</b><span>un</span></div>
      <div class="ck"></div>
    </div>`).join('')
  const tagPrazo = p.ship_by ? `<span class="tg w">${ico('clock', 12, '#F0C079')} enviar até ${new Date(p.ship_by * 1000).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>` : ''
  const nota = p.nota_comprador || p.observacao || ''
  const notaComprador = (cfg.mostrar_nota_comprador && nota) ? `<div class="obsbar">${ico('message-square', 13, '#C2790F')} <b>Nota do comprador:</b> ${esc(nota)}</div>` : ''
  const limpoF = (x) => (x && !mascarado(x)) ? String(x) : ''
  // Destinatário COMPLETO da NF-e do Bling (quando o pedido tem nota) — não mascarado, ao contrário da Shopee
  const temNf = !!limpoF(p.nf_nome)
  const endNfLinha = [p.nf_endereco, [p.nf_cidade, p.nf_uf].filter(Boolean).join('/'), p.nf_cep ? 'CEP ' + p.nf_cep : ''].filter(Boolean).join(' · ')
  const endLimpo = temNf ? endNfLinha : [limpoF(end.completo), [limpoF(end.cidade), limpoF(end.uf)].filter(Boolean).join('/'), limpoF(end.cep) ? 'CEP ' + limpoF(end.cep) : ''].filter(Boolean).join(' · ')
  const nomeRealF = [p.nf_nome, end.nome, p.cliente, p.comprador].map(limpoF).find(Boolean) || ''
  const telF = limpoF(p.nf_tel) || limpoF(end.telefone)
  const iniciais = String(nomeRealF || '·').trim().split(/\s+/).slice(0, 2).map((x) => x[0] || '').join('').toUpperCase() || '·'
  const fonteNf = temNf ? '<span class="viaNf">via NF-e</span>' : ''
  const destcardHTML = !cfg.mostrar_destinatario ? '' : (nomeRealF
    ? `<div class="destcard"><div class="dlbl">${ico('map-pin', 11, '#9aa0ab')} DESTINATÁRIO${fonteNf}</div><div class="drow"><div class="dav">${esc(iniciais)}</div><div><div class="dnome">${esc(nomeRealF)}</div><div class="dadr">${endLimpo ? esc(endLimpo) : 'comprador na Shopee · endereço completo na etiqueta Oficial SPX'}</div>${telF ? `<div class="dadr">Tel ${esc(telF)}</div>` : ''}</div></div></div>`
    : `<div class="destcard"><div class="dlbl">${ico('map-pin', 11, '#9aa0ab')} DESTINATÁRIO</div><div class="drow"><div><div class="dnome" style="font-size:14px">Protegido pela Shopee</div><div class="dadr">endereço de envio na etiqueta Oficial SPX</div></div></div></div>`)
  return `<section class="doc">
    <div class="band">
      <div class="bl"><div class="kick">PEDIDO DE VENDA · SEPARAÇÃO</div><div class="onum">#${esc(p.order_sn)}</div>
        <div class="cliente">${ico('shopping-bag', 13, '#FFB59E')}<span>${esc(nomeRealF || 'comprador protegido')}</span></div>
        <div class="tags"><span class="tg s">${ico('truck', 12, '#FF9576')} Shopee Xpress</span>${tagPrazo}</div></div>
      <div class="br">${cfg.mostrar_codigo_barras ? `<div class="bcwrap">${barcodeSVG(p.order_sn, { height: 38, modulo: 1.15 })}</div>` : ''}<div class="dt">impresso em ${new Date().toLocaleString('pt-BR')}</div></div>
    </div>
    <div class="emp"><div class="logo">${ico('store', 18, '#fff')}</div><div class="ei"><div class="en">${esc(emitNome(cfg))}</div><div class="ec">${esc(emitCnpjCidade(cfg))}</div></div><img class="spxs" src="${SPX_LOGO}"></div>
    ${cfg.mostrar_timeline ? timelineHTML(p.status) : ''}
    <div class="topcols">
      <div class="refs">
        ${cfg.mostrar_nfe ? `<div class="ref">${ico('file-text', 13, '#6b6f7a')}<div><span>NOTA FISCAL</span><b>${esc(p.nfe_numero || '—')}</b></div></div>` : ''}
        ${cfg.mostrar_rastreio ? `<div class="ref">${ico('barcode', 13, '#6b6f7a')}<div><span>RASTREIO</span><b class="mn">${esc(p.rastreio || '—')}</b></div></div>` : ''}
        <div class="ref">${ico('truck', 13, '#6b6f7a')}<div><span>STATUS</span><b>${esc(statusPt(p.status))}</b></div></div>
        <div class="ref">${ico('package', 13, '#6b6f7a')}<div><span>VOLUME</span><b>1 caixa</b></div></div>
      </div>
      ${destcardHTML}
    </div>
    ${notaComprador}
    <div class="ith"><div class="itl">${ico('package', 14)}<span>CONFERÊNCIA DE ITENS</span></div><div class="itr"><span class="cnt"><b>${nItens}</b> itens · <b>${totU}</b> unidades</span><span class="den">descrição completa</span></div></div>
    <div class="list">${rows || '<div class="row"><div class="cd"><div class="nm">Sem itens neste pedido.</div></div></div>'}</div>
    <div class="foot"><div class="fl">${logoPrecifica(1)}<span class="genf">Documento gerado pelo Precifica AI <b>by sóstrass</b></span></div><span class="pgn">separe marcando cada item</span></div>
  </section>`
}
// CSS compartilhado entre folha e etiqueta (timeline + logo Precifica). .tn escopado em .tl (evita colisão com rastreio).
const CSS_SHARED = `*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
.pfl{display:inline-flex;align-items:center}.pfmark{border-radius:6px;background:linear-gradient(135deg,#d6007f,#7b2a8c);display:grid;place-items:center;flex-shrink:0;margin-right:6px}.pfwm{font-weight:800;color:#14151a;letter-spacing:-.2px}.pfwm b{color:#d6007f;font-weight:800}
.tl{display:flex;align-items:flex-start;padding:15px 30px 13px;background:#fff;border-bottom:1px solid #eef0f3}
.tl .tn{flex:1;text-align:center;position:relative}.tl .tn::before{content:'';position:absolute;top:18px;left:-50%;width:100%;height:3px;background:#e3e5ea;z-index:0}.tl .tn:first-child::before{display:none}.tl .tn.done::before,.tl .tn.current::before{background:#16171c}
.tcirc{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;margin:0 auto;position:relative;z-index:1;background:#fff;border:2px solid #dcdfe5}.tl .tn.done .tcirc{background:#16171c;border-color:#16171c}.tl .tn.current .tcirc{background:#EE4D2D;border-color:#EE4D2D;box-shadow:0 0 0 4px rgba(238,77,45,.16)}
.tlab{font-size:11px;font-weight:700;margin-top:8px}.tl .tn.pending .tlab{color:#aab0bb}
.tl.cmp{padding:2mm 1mm 1.5mm;border:0;border-bottom:1.5px solid #111;background:transparent}.tl.cmp .tcirc{width:22px;height:22px;border-width:1.5px}.tl.cmp .tn::before{top:10px;height:2px}.tl.cmp .tlab{font-size:7px;margin-top:2px}.tl.cmp .tn.current .tcirc{box-shadow:0 0 0 2px rgba(238,77,45,.18)}
`
const CSS_FOLHA = CSS_SHARED + `*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#14151a}
.doc{background:#fff;page-break-after:always}
.band{background:linear-gradient(120deg,#16171c,#23252e);color:#fff;padding:16px 30px;display:flex;justify-content:space-between;align-items:flex-start}
.kick{font-size:10px;letter-spacing:.16em;color:#EE6A45;font-weight:800}.onum{font-size:25px;font-weight:800;font-family:ui-monospace,monospace;margin:2px 0 6px;word-break:break-all}
.cliente{display:flex;align-items:center;font-size:13.5px;font-weight:700;color:#FFD9CC;margin:0 0 8px}.cliente svg{margin-right:6px;flex-shrink:0}.cliente span{letter-spacing:.01em;word-break:break-all}
.tags{display:flex;flex-wrap:wrap}.tg{font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;display:inline-flex;align-items:center}.tg.s{background:rgba(238,77,45,.18);color:#FF9576}.tg.w{background:rgba(224,162,60,.16);color:#F0C079}
.br{text-align:right;flex-shrink:0;margin-left:14px}.bcwrap{background:#fff;padding:5px 7px;border-radius:5px;display:inline-block}.bcwrap svg{display:block}.dt{font-size:10px;color:#9a9da6;margin-top:5px}
.emp{display:flex;align-items:center;padding:11px 30px;background:#FAFAFB;border-bottom:1px solid #eef0f3}
.logo{width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,#d6007f,#7b2a8c);display:grid;place-items:center;flex-shrink:0}.ei{flex:1}.en{font-size:15px;font-weight:800}.ec{font-size:11px;color:#8a8f9b}.spxs{height:7mm}
.topcols{display:flex;border-bottom:1px solid #eef0f3}
.refs{display:grid;grid-template-columns:1fr 1fr;flex:1;border-right:1px solid #eef0f3}
.ref{padding:11px 22px;display:flex;align-items:flex-start;border-bottom:1px solid #f3f4f6;border-right:1px solid #f3f4f6}.ref:nth-child(2n){border-right:0}.ref:nth-last-child(-n+2){border-bottom:0}
.ref span{font-size:9px;letter-spacing:.05em;color:#9aa0ab;font-weight:700;display:block}.ref b{font-size:13.5px;display:block;margin-top:2px;word-break:break-all}.mn{font-family:ui-monospace,monospace;font-size:12px}
.destcard{width:42%;padding:12px 26px}.dlbl{font-size:9px;letter-spacing:.06em;color:#9aa0ab;font-weight:700;display:flex;align-items:center}.viaNf{margin-left:6px;font-size:8px;font-weight:700;color:#1F9D6B;background:#E6F7EF;border:1px solid #BFE8D5;border-radius:5px;padding:1px 5px;letter-spacing:.04em}
.drow{display:flex;align-items:center;margin-top:6px}.dav{width:38px;height:38px;border-radius:50%;background:#16171c;color:#fff;display:grid;place-items:center;font-weight:800;font-size:13px;flex-shrink:0}.dnome{font-size:17px;font-weight:800;line-height:1.1}.dadr{font-size:12px;color:#5a5f6b;line-height:1.4;margin-top:2px}
.obsbar{margin:13px 30px 0;background:#FFF8EE;border:1px solid #F3E2C4;border-radius:9px;padding:9px 13px;font-size:12px;color:#7a5a1e;display:flex;align-items:flex-start}
.ith{display:flex;align-items:center;justify-content:space-between;padding:14px 30px 9px}.itl{display:flex;align-items:center}.itl span{font-size:12px;font-weight:800;letter-spacing:.04em}.itr{display:flex;align-items:center}.cnt{font-size:12px;color:#3a3f4b}.cnt b{font-weight:800}.den{font-size:10.5px;color:#9aa0ab}
.list{border-top:1px solid #eef0f3}
.row{display:flex;align-items:flex-start;padding:11px 30px;border-bottom:1px solid #f1f2f5;page-break-inside:avoid}
.row .ph{width:44px;height:44px;border-radius:9px;background:linear-gradient(135deg,#f4f5f7,#e9ebef);border:1px solid #e8eaef;display:grid;place-items:center;flex-shrink:0;overflow:hidden}.row .ph img{width:100%;height:100%;object-fit:cover}
.cd{flex:1;min-width:0}.nm{font-size:13.5px;font-weight:700;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.mt{font-size:12px;color:#3a3f4b;margin-top:5px;display:flex;align-items:center;flex-wrap:wrap}.sku{font-family:ui-monospace,monospace;color:#16171c;font-weight:700;font-size:12.5px;background:#eef0f3;padding:1px 6px;border-radius:5px}.dt2{color:#ccc}.cp{color:#8a8f9b}
.qt{text-align:center;flex-shrink:0;width:46px}.qt b{font-size:20px;font-weight:800;display:block;line-height:1}.qt span{font-size:9px;color:#aab0bb}.ck{width:18px;height:18px;border:1.5px solid #ccd;border-radius:4px;flex-shrink:0;margin-top:3px}
.foot{padding:13px 30px;border-top:2px solid #14151a;display:flex;justify-content:space-between;align-items:center}.fl{display:flex;align-items:center}.genf{font-size:12px;color:#5a5f6b}.genf b{color:#EE4D2D}.pgn{font-size:10.5px;color:#9aa0ab}

.tags>*+*{margin-left:8px}.tg>*+*{margin-left:5px}.emp>*+*{margin-left:12px}.ref>*+*{margin-left:9px}.dlbl>*+*{margin-left:4px}.drow>*+*{margin-left:12px}.obsbar>*+*{margin-left:7px}.itl>*+*{margin-left:7px}.itr>*+*{margin-left:14px}.row>*+*{margin-left:13px}.mt>*+*{margin-left:4px}.fl>*+*{margin-left:8px}
@media print{@page{size:A4;margin:0}.doc:last-child{page-break-after:auto}}`

// Etiqueta logística — desenho PAISAGEM (15x10) rotacionado 90° para encaixar no rótulo térmico 100x150mm
function htmlEtiqueta(p, rem, cfg = PRINT_CFG) {
  const end = p.endereco || {}
  const limpo = (x) => (x && !mascarado(x)) ? String(x) : ''
  // Destinatário COMPLETO da NF-e do Bling (quando o pedido tem nota) tem prioridade sobre o mascarado da Shopee
  const temNf = !!limpo(p.nf_nome)
  const enderecoLinha = temNf ? (p.nf_endereco || '') : [limpo(end.completo)].filter(Boolean).join('')
  const cidadeLinha = temNf
    ? [[p.nf_cidade, p.nf_uf].filter(Boolean).join(' - '), p.nf_cep ? 'CEP ' + p.nf_cep : ''].filter(Boolean).join(' · ')
    : [[limpo(end.cidade), limpo(end.uf)].filter(Boolean).join(' - '), limpo(end.cep) ? 'CEP ' + limpo(end.cep) : ''].filter(Boolean).join(' · ')
  const cpfTel = temNf
    ? (limpo(p.nf_tel) ? 'Tel ' + limpo(p.nf_tel) : '')
    : [limpo(end.telefone) ? 'Tel ' + limpo(end.telefone) : '', limpo(end.cpf) ? 'CPF ' + limpo(end.cpf) : ''].filter(Boolean).join(' · ')
  const nomeReal = [p.nf_nome, end.nome, p.cliente, p.comprador].map(limpo).find(Boolean) || ''
  const temEndereco = !!(enderecoLinha || cidadeLinha)
  const remNome = rem || emitNome(cfg)
  const nItens = (p.itens || []).length
  const rastreio = p.rastreio || p.order_sn
  const espacar = (s) => String(s || '').replace(/(.{4})/g, '$1 ').trim()
  const litens = (p.itens || []).slice(0, 3).map((it) => `<tr><td class="q">${it.qtd}</td><td class="nmc"><b>${esc(it.nome)}</b><span class="sl">${[it.variacao, it.sku].filter(Boolean).map(esc).join(' · ')}</span></td></tr>`).join('')
  const more = nItens > 3 ? `<div class="more">+ ${nItens - 3} itens · lista completa na folha de separação</div>` : ''
  const temNfe = !!(p.nfe_numero && p.nfe_numero !== '—')
  const danfe = (cfg.mostrar_nfe && temNfe) ? `<div class="danfe"><div class="dh">${ico('file-text', 9, '#111')} DANFE SIMPLIFICADO — NF-e</div>
      <div class="dg"><span>nº <b>${esc(p.nfe_numero)}</b></span>${p.nfe_serie ? `<span>Sér <b>${esc(p.nfe_serie)}</b></span>` : ''}${p.nfe_emissao ? `<span>Emis <b>${esc(p.nfe_emissao)}</b></span>` : ''}${p.valor_total != null ? `<span>R$ <b>${Number(p.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></span>` : ''}</div>
      <div class="em">Emitente: <b>${esc(emitNome(cfg))}</b> · CNPJ ${esc(cfg.emitente_cnpj || REMETENTE_CNPJ)}</div>
      ${p.nfe_chave ? `<div class="chave">${barcodeSVG(p.nfe_chave, { height: 26, modulo: 1.0, texto: false })}<div class="cl2">${esc(espacar(p.nfe_chave))}</div></div>` : ''}</div>` : ''
  const destEtiqHTML = !cfg.mostrar_destinatario ? '' :
    `<div class="dest"><div class="cap">${ico('map-pin', 9, '#111')} DESTINATÁRIO</div>${nomeReal
      ? `<div class="dn">${esc(nomeReal)}</div>${temEndereco
          ? `<div class="da">${esc(enderecoLinha || '—')}${cidadeLinha ? ' · ' + esc(cidadeLinha) : ''}</div>${cpfTel ? `<div class="da">${esc(cpfTel)}</div>` : ''}`
          : `<div class="da">comprador na Shopee · endereço completo na etiqueta Oficial SPX</div>`}`
      : `<div class="dn" style="font-size:11px">Protegido pela Shopee</div><div class="da">endereço de envio na etiqueta Oficial SPX</div>`}</div>`
  const qrrowHTML = (cfg.mostrar_qr || cfg.mostrar_rastreio)
    ? `<div class="qrrow">${cfg.mostrar_qr ? `<div class="qr">${qrSvg(rastreio)}</div>` : ''}${cfg.mostrar_rastreio ? `<div class="track"><span class="tlbl">RASTREIO SPX</span>${barcodeSVG(rastreio, { height: 40, modulo: 0.9, texto: false })}<div class="trk">${esc(espacar(rastreio))}</div></div>` : ''}</div>`
    : ''
  return `<div class="page"><div class="labh"><div class="safe">
    <div class="xphd"><img class="spx" src="${SPX_LOGO}"><div class="xpr"><div class="svc">ENTREGA PADRÃO</div><div class="vol">Volume 1 / 1 · #${esc(String(p.order_sn).slice(-14))}</div></div></div>
    <div class="cols">
      <div class="cl">
        ${(limpo(p.estacao) || limpo(p.rota)) ? `<div class="sortbox"><span class="sl">ESTAÇÃO / ROTA</span><div class="sb">${esc(limpo(p.estacao) || '—')}</div>${limpo(p.rota) ? `<span class="ss">${esc(p.rota)}</span>` : ''}</div>` : ''}
        ${danfe}
        ${destEtiqHTML}
      </div>
      <div class="cr">
        ${qrrowHTML}
        <div class="rem"><div class="cap">${ico('store', 9, '#111')} REMETENTE</div><span class="rn">${esc(remNome)}</span> · ${esc(emitEndereco(cfg))}</div>
        <div class="pk"><div class="pkh">${ico('package', 9, '#111')} ITENS DO PEDIDO<span class="oid">${nItens} itens</span></div>
          <table class="ci"><tbody>${litens}</tbody></table>${more}</div>
      </div>
    </div>
    <div class="lfoot"><div class="lfl">${logoPrecifica(0.95)}<span class="gen">Documento gerado pelo Precifica AI</span></div><div class="lfr">${ico('truck', 10, '#555')} Shopee Xpress · entrega padrão</div></div>
  </div></div></div>`
}
const CSS_ETIQ = CSS_SHARED + `*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#14151a}
.page{width:100mm;height:150mm;position:relative;page-break-after:always;overflow:hidden}.page:last-child{page-break-after:auto}
.labh{width:150mm;height:100mm;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(90deg);background:#fff}
.safe{position:absolute;top:3mm;left:3mm;right:3mm;bottom:3mm;border:2px solid #111;padding:2mm;display:flex;flex-direction:column;background:#fff;overflow:hidden}
.xphd{display:flex;justify-content:space-between;align-items:center;border-bottom:2.5px solid #111;padding-bottom:1.5mm}
.spx{height:7mm}.xpr{text-align:right}.svc{font-size:11px;font-weight:800}.vol{font-size:8px;color:#333;font-family:ui-monospace,monospace}
.cols{display:flex;flex:1;padding:2mm 0;min-height:0}
.cl{width:50%;display:flex;flex-direction:column;border-right:1.5px solid #111;padding-right:3mm}.cl>*+*{margin-top:1.8mm}
.cr{width:50%;display:flex;flex-direction:column;padding-left:3mm}.cr>*+*{margin-top:1.8mm}
.sortbox{border:1.5px solid #111;border-radius:2px;text-align:center;padding:1mm}.sortbox .sl{font-size:6.5px;font-weight:800;letter-spacing:.08em;color:#444}.sb{font-size:26px;font-weight:900;letter-spacing:2px;line-height:1.05}.ss{font-size:7px;font-weight:700}
.danfe{border:1px solid #111;padding:1.2mm}.dh{font-size:7px;font-weight:800;display:flex;align-items:center;border-bottom:.5px solid #999;padding-bottom:.6mm;margin-bottom:.6mm}
.dg{display:flex;flex-wrap:wrap;font-size:8px}.dg>span{margin-right:3mm}.dg b{font-family:ui-monospace,monospace}.em{font-size:7.5px;margin-top:.6mm}
.chave{text-align:center;margin-top:.8mm}.chave svg{max-width:100%}.cl2{font-size:6px;font-family:ui-monospace,monospace;letter-spacing:.3px}
.dest{border-top:1px dashed #bbb;padding-top:1.3mm}.cap{font-size:7px;font-weight:800;display:flex;align-items:center;color:#333}
.dn{font-size:14px;font-weight:800;line-height:1.05;margin:.5mm 0}.da{font-size:9px;line-height:1.35}
.qrrow{display:flex;align-items:center;border-bottom:1.5px solid #111;padding-bottom:1.5mm}
.qr{width:27mm;height:27mm;flex-shrink:0;margin-right:2.5mm}.qr svg{width:27mm;height:27mm;display:block}.track{flex:1;text-align:center}.tlbl{font-size:7px;font-weight:800;letter-spacing:.1em;color:#444;display:block;margin-bottom:.5mm}.track svg{max-width:100%}.trk{font-size:10px;font-family:ui-monospace,monospace;font-weight:800;letter-spacing:.6px;margin-top:.8mm;white-space:nowrap;display:block;text-align:center}
.rem{font-size:8px;border-bottom:1px dashed #bbb;padding-bottom:1.2mm}.rn{font-weight:700;font-size:9px}
.pk{flex:1;min-height:0;overflow:hidden}.pkh{font-size:7.5px;font-weight:800;display:flex;align-items:center;margin-bottom:.8mm}.oid{margin-left:auto;font-family:ui-monospace,monospace;font-weight:600;color:#555}
table.ci{width:100%;table-layout:fixed;border-collapse:collapse}table.ci td{padding:.6mm 0;border-bottom:.5px dashed #ccc;vertical-align:top;font-size:8.5px}.ci .q{width:6mm;font-weight:900;font-size:10px}.ci .q::after{content:"x";font-size:7px}.ci .nmc{overflow:hidden}.ci .nmc b{font-size:9px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sl{font-size:7px;color:#555;font-family:ui-monospace,monospace;display:block}.more{font-size:7px;color:#666;font-style:italic;margin-top:.5mm}
.lfoot{display:flex;justify-content:space-between;align-items:center;border-top:2px solid #111;padding-top:1.3mm;margin-top:auto}
.lfl{display:flex;align-items:center}.lfl .gen{margin-left:6px}.gen{font-size:7.5px;color:#555}.lfr{font-size:7.5px;color:#555;display:flex;align-items:center}.lfr svg{margin-right:3px}
.dh>svg,.cap>svg,.pkh>svg{margin-right:3px}@media print{@page{size:100mm 150mm;margin:0}}`

function imprimirFolhasPedido(pedidos) {
  if (!pedidos.length) return
  const cfg = cfgTipo('folha')
  abrirImpressao('Pedidos', CSS_FOLHA, pedidos.map((p) => htmlFolhaPedido(p, cfg)).join(''))
}
function imprimirEtiquetas(pedidos, rem) {
  if (!pedidos.length) return
  const cfg = cfgTipo('etiqueta')
  abrirImpressao('Etiquetas', CSS_ETIQ, pedidos.map((p) => htmlEtiqueta(p, rem, cfg)).join(''))
}

function MiniBadge({ children, cor, icon: Ic }) {
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded-md font-semibold inline-flex items-center gap-1 shrink-0"
          style={{ background: `color-mix(in srgb, ${cor} 16%, transparent)`, color: cor }}>
      {Ic && <Ic size={9} />}{children}
    </span>
  )
}

function PedidoCard({ p, agora, alvo, sel, onSel, onAbrir, recorrente, impressa, nfSelo }) {
  const prazo = prazoInfo(p.ship_by, agora)
  const corPrazo = !prazo ? 'var(--text-faint)' : prazo.atrasado ? '#FF6F6F' : prazo.urgente ? '#d6007f' : '#2DD4BF'
  const cancelado = ehCancelado(p.status)
  const corBorda = cancelado ? '#FF6F6F' : p.prejuizo ? '#FF6F6F' : p.abaixo_meta ? '#d6007f' : 'transparent'
  const nome = [p.cliente, p.comprador].find((x) => x && !mascarado(x)) || 'Comprador protegido'
  const NF_INFO = { pendente: ['#F59E0B', 'NF pendente'], recusado: ['#FF6F6F', 'NF recusada'], autorizado: ['#2DD4BF', 'NF autorizada'] }
  const nfCor = nfSelo && NF_INFO[nfSelo.grupo]
  const custoRealPedido = (p.itens || []).length > 0 && (p.itens || []).every((it) => it.tem_cadastro && it.custo > 0)
  return (
    <div onClick={() => onAbrir && onAbrir(p.order_sn)} className="glass rounded-xl p-3 transition-colors hover:bg-[var(--glass-hover)]"
         style={{ borderLeft: `3px solid ${corBorda}`, cursor: 'pointer', opacity: cancelado ? 0.78 : 1 }}>
      <div className="flex items-center gap-2 mb-2">
        <button onClick={(e) => { e.stopPropagation(); onSel(p.order_sn) }} className="h-[18px] w-[18px] rounded-[5px] grid place-items-center shrink-0 transition-colors" style={{ border: `2px solid ${sel ? LARANJA : 'var(--faint)'}`, background: sel ? LARANJA : 'rgba(255,255,255,.04)' }} title="Selecionar para impressão em lote">
          {sel && <CheckCheck size={12} className="text-white" />}
        </button>
        <span className="h-7 w-7 rounded-full grid place-items-center shrink-0 text-[10px] font-bold text-white" style={{ background: corAvatar(nome) }}>{iniciais(nome)}</span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium truncate flex items-center gap-1.5">
            {nome}
            {cancelado && <MiniBadge cor="#FF6F6F" icon={XCircle}>cancelado</MiniBadge>}
            {recorrente && !cancelado && <MiniBadge cor="#7b2a8c" icon={Repeat}>recorrente</MiniBadge>}
            {impressa && !cancelado && <MiniBadge cor="#2DD4BF" icon={Printer}>etiqueta</MiniBadge>}
            {nfCor && <MiniBadge cor={nfCor[0]} icon={FileText}>{nfCor[1]}</MiniBadge>}
            {p.cod ? <MiniBadge cor="#E0A23C" icon={Coins}>na entrega</MiniBadge> : p.pagamento && <MiniBadge cor="#9b8fa6" icon={CreditCard}>{String(p.pagamento).split(' ')[0]}</MiniBadge>}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {p.cidade && <span className="text-[10px] text-faint flex items-center gap-0.5"><MapPin size={9} />{p.cidade}/{p.uf}</span>}
            <span className="num text-[10px] text-faint flex items-center gap-0.5"><Hash size={8} />{String(p.order_sn).slice(-8)}</span>
          </div>
        </div>
        <ChevronRight size={15} className="text-faint shrink-0" />
      </div>
      <div className="space-y-1.5">
        {(p.itens || []).map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            {it.imagem ? <img src={it.imagem} alt="" className="h-9 w-9 rounded-md object-cover shrink-0" style={{ border: '1px solid var(--glass-border)' }} />
              : <div className="h-9 w-9 rounded-md grid place-items-center shrink-0" style={{ background: 'var(--glass-hover)' }}><ImageIcon size={13} className="text-faint" /></div>}
            <div className="min-w-0 flex-1">
              <div className="text-xs truncate"><span className="font-semibold">{it.qtd}×</span> {it.nome}</div>
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
        {cancelado
          ? <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: '#FF6F6F' }}><XCircle size={11} /> {statusPt(p.status)}</span>
          : prazo ? <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: corPrazo }}>
              <Clock size={11} />{prazo.atrasado ? 'envio atrasado' : `enviar em ${fmtDur(prazo.ms)}`}</span>
            : <span className="text-[11px] text-faint">{statusPt(p.status)}</span>}
        <div className="flex items-center gap-2">
          {p.lucro_real != null && <span className="text-[10px] num" style={{ color: custoRealPedido ? '#2DD4BF' : '#F59E0B' }}>{custoRealPedido ? 'lucro' : 'margem'} {brl(p.lucro_real)}</span>}
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

function DataLinha({ icon: Ic, rotulo, valor }) {
  if (!valor) return null
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <Ic size={11} className="text-faint shrink-0" />
      <span className="text-faint">{rotulo}</span>
      <span className="num text-dim ml-auto">{valor}</span>
    </div>
  )
}

// Timeline de logística na tela (mesma lógica do estagiosTimeline que já imprime)
const TL_ICON = { 'receipt': Receipt, 'dollar-sign': CreditCard, 'package': Package, 'truck': Truck, 'map-pin': MapPin }
function TimelineLog({ status }) {
  const estagios = estagiosTimeline(status)
  return (
    <div>
      {estagios.map((e, i) => {
        const Ic = TL_ICON[e.icon] || CircleDot
        const done = e.estado === 'done', cur = e.estado === 'current'
        const cor = cur ? 'var(--accent)' : done ? '#2DD4BF' : 'var(--faint)'
        const last = i === estagios.length - 1
        return (
          <div key={i} className="flex gap-2.5">
            <div className="flex flex-col items-center">
              <span className="h-6 w-6 rounded-full grid place-items-center shrink-0" style={{ background: (done || cur) ? `color-mix(in srgb, ${cor} 18%, transparent)` : 'transparent', border: `1.5px solid ${cor}`, color: cor }}>
                <Ic size={12} />
              </span>
              {!last && <span style={{ width: 2, flex: 1, minHeight: 12, background: done ? '#2DD4BF' : 'var(--glass-border)' }} />}
            </div>
            <div className={last ? '' : 'pb-2'}>
              <div className="text-xs font-medium" style={{ color: (done || cur) ? 'var(--text)' : 'var(--faint)' }}>{e.label}</div>
              {cur && <div className="text-[10px]" style={{ color: 'var(--accent)' }}>em andamento</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PedidoDetalhe({ orderSn, alvo, onClose, recorrente, onImpressa, rem }) {
  const notify = useToast()
  const [d, setD] = useState(null)
  const [gerOf, setGerOf] = useState(false)
  useEffect(() => { api.shopeePedidoDetalhe(orderSn).then(setD).catch((e) => setD({ erro: e.message || true })) }, [orderSn])

  const ok = d && !d.erro
  const f = (ok && d.financeiro) || {}
  const itens = (ok && d.itens) || []
  const end = (ok && d.endereco) || {}
  const log = (ok && d.logistica) || {}
  const cancelado = ok && ehCancelado(d.status)
  const nome = ok ? ([d.comprador, end.nome].find((x) => x && !mascarado(x)) || 'Comprador protegido') : ''
  const paraImpressao = ok ? { ...d, rastreio: log.rastreio } : null

  const enriquecerUm = async (p) => {
    const clone = { ...p, itens: (p.itens || []).map((it) => ({ ...it })) }
    try {
      const skus = [...new Set((clone.itens || []).map((it) => it.sku).filter(Boolean))]
      const res = await api.shopeeEnriquecerImpressao([clone.order_sn].filter(Boolean), skus)
      const patch = ((res && res.patches) || {})[clone.order_sn]
      if (patch) Object.assign(clone, patch)
      const comp = (res && res.complementos) || {}
      ;(clone.itens || []).forEach((it) => { if (it.sku && comp[it.sku] && !it.complemento) it.complemento = comp[it.sku] })
    } catch (_) { /* imprime com o que já tem */ }
    return clone
  }
  const imprimirPedido = async () => { if (!paraImpressao) return; imprimirFolhasPedido([await enriquecerUm(paraImpressao)]) }
  const imprimirEtiq = async () => {
    if (!paraImpressao) return
    imprimirEtiquetas([await enriquecerUm(paraImpressao)], rem)
    onImpressa?.(d.order_sn || orderSn)
  }
  const imprimirEtiqOficial = async () => {
    const sn = d?.order_sn || orderSn
    if (!sn) return
    setGerOf(true)
    try {
      const blob = await api.shopeeEtiquetaOficial([sn], 'auto')
      const url = URL.createObjectURL(blob)
      const w = window.open(url, '_blank')
      if (!w) { notify('Permita pop-ups para abrir o PDF da etiqueta oficial.', 'danger') }
      else { onImpressa?.(sn); notify('Etiqueta oficial gerada.', 'ok') }
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (e) { notify(e.message || 'Falha ao gerar a etiqueta oficial da Shopee.', 'danger') }
    setGerOf(false)
  }

  return (
    <div className="rounded-2xl flex flex-col overflow-hidden drawer-in" style={{ background: 'var(--surface)', border: '1px solid rgba(214,0,127,.24)', maxHeight: 'calc(100vh - 96px)', position: 'relative' }}>
        <span aria-hidden style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, var(--accent), var(--accent2))', zIndex: 1 }} />
        {/* Cabeçalho */}
        <div className="flex items-start gap-3 p-4 border-b border-glassb shrink-0">
          <span className="h-10 w-10 rounded-full grid place-items-center shrink-0 text-xs font-bold text-white" style={{ background: ok ? corAvatar(nome) : 'var(--glass-hover)' }}>
            {ok ? iniciais(nome) : <Package size={16} style={{ color: LARANJA }} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-display font-semibold flex items-center gap-2 flex-wrap">
              {ok ? nome : 'Pedido'}
              {cancelado && <MiniBadge cor="#FF6F6F" icon={XCircle}>cancelado</MiniBadge>}
              {recorrente && !cancelado && <MiniBadge cor="#7b2a8c" icon={Repeat}>recorrente</MiniBadge>}
              {ok && d.cod && <MiniBadge cor="#E0A23C" icon={Coins}>pago na entrega</MiniBadge>}
            </div>
            <div className="text-[11px] text-faint mt-0.5 flex items-center gap-2 flex-wrap num">
              <span className="flex items-center gap-0.5"><Hash size={9} />{String((ok && d.order_sn) || orderSn).slice(-12)}</span>
              {ok && <span style={{ color: corStatus(d.status) }}>{statusPt(d.status)}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-faint hover:text-fg shrink-0 p-1"><X size={18} /></button>
        </div>

        {/* Barra de ações de impressão */}
        {ok && (
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-glassb shrink-0 flex-wrap">
            <button onClick={imprimirPedido} className="text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-medium" style={{ background: LARANJA, color: '#fff' }}>
              <Printer size={13} /> Imprimir pedido
            </button>
            <button onClick={imprimirEtiq} className="text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 glass text-dim hover:text-fg">
              <Tag size={13} /> Etiqueta 10×15
            </button>
            <button onClick={imprimirEtiqOficial} disabled={gerOf} className="text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 glass text-dim hover:text-fg disabled:opacity-50" title="Etiqueta OFICIAL da Shopee em PDF (waybill do SPX)">
              <Receipt size={13} /> {gerOf ? 'Gerando…' : 'Oficial SPX'}
            </button>
            <button disabled title="Vincular a NF-e do Bling — em breve" className="text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 glass text-faint opacity-50 cursor-not-allowed">
              <FileText size={13} /> NF-e
            </button>
          </div>
        )}

        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          <LimiteErro>
          {d === null ? <div className="py-10 text-center text-faint flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> carregando detalhe…</div>
            : d?.erro ? <div className="py-6 text-center text-sm" style={{ color: '#FF6F6F' }}><AlertTriangle size={18} className="mx-auto mb-2" />{typeof d.erro === 'string' ? d.erro : 'Falha ao carregar.'}</div>
            : <>
                {/* Datas & pagamento */}
                <div className="rounded-xl p-3 grid sm:grid-cols-2 gap-x-4 gap-y-1.5" style={{ background: 'var(--glass-hover)' }}>
                  <DataLinha icon={Calendar} rotulo="Criado" valor={d.criado ? fmtDataHora(d.criado) : null} />
                  <DataLinha icon={CreditCard} rotulo="Pago" valor={d.pago_em ? fmtDataHora(d.pago_em) : null} />
                  <DataLinha icon={Clock} rotulo="Enviar até" valor={d.ship_by ? fmtDataHora(d.ship_by) : null} />
                  <DataLinha icon={Wallet} rotulo="Pagamento" valor={d.pagamento || null} />
                </div>

                {/* Observação do comprador */}
                {d.nota_comprador && (
                  <div className="rounded-xl px-3 py-2.5 flex items-start gap-2" style={{ background: 'color-mix(in srgb, #E0A23C 12%, transparent)', border: '1px solid color-mix(in srgb, #E0A23C 30%, transparent)' }}>
                    <MessageSquare size={13} className="mt-0.5 shrink-0" style={{ color: '#E0A23C' }} />
                    <div><div className="text-[10px] uppercase tracking-wide text-faint">Mensagem do comprador</div><div className="text-xs text-dim mt-0.5">{d.nota_comprador}</div></div>
                  </div>
                )}

                {/* Produtos */}
                <div>
                  <div className="text-xs font-semibold mb-1.5 flex items-center gap-1.5"><ShoppingBag size={13} style={{ color: LARANJA }} /> Produtos ({itens.length})</div>
                  <div className="space-y-1.5">
                    {itens.map((it, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: 'var(--glass-hover)' }}>
                        {it.imagem ? <img src={it.imagem} className="h-10 w-10 rounded-md object-cover shrink-0" alt="" style={{ border: '1px solid var(--glass-border)' }} /> : <div className="h-10 w-10 rounded-md grid place-items-center shrink-0" style={{ background: 'var(--glass)' }}><ImageIcon size={14} className="text-faint" /></div>}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs truncate"><span className="font-semibold">{it.qtd}×</span> {it.nome}</div>
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
                    {(f.custo_completo && f.custo > 0) ? <>
                      <LinhaFin rotulo="Custo dos produtos (Bling)" valor={f.custo} negativo />
                      <div className="border-t my-1" style={{ borderColor: 'var(--glass-border)' }} />
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold flex items-center gap-1.5"><TrendingUp size={14} style={{ color: corMargemReal(f.margem_pct, alvo) }} /> Lucro real</span>
                        <span className="num text-base font-bold" style={{ color: corMargemReal(f.margem_pct, alvo) }}>{brl(f.lucro)} <span className="text-xs">({f.margem_pct}%)</span></span>
                      </div>
                    </> : <>
                      <div className="flex items-center justify-between text-xs py-1"><span className="text-dim">Custo dos produtos (Bling)</span><span className="num text-faint">— sem custo</span></div>
                      <div className="mt-1.5 pt-2 border-t" style={{ borderColor: 'color-mix(in srgb, #F59E0B 32%, transparent)' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold flex items-center gap-1.5"><TrendingUp size={14} style={{ color: '#F59E0B' }} /> Margem após taxas <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'color-mix(in srgb, #F59E0B 16%, transparent)', color: '#F59E0B' }}>indicador</span></span>
                          <span className="num text-base font-extrabold" style={{ color: '#F59E0B' }}>{brl(f.liquido)} <span className="text-xs">({f.receita ? Math.round((f.liquido / f.receita) * 100) : 0}%)</span></span>
                        </div>
                        <div className="text-[10px] text-faint mt-1 flex items-start gap-1"><Info size={11} className="shrink-0 mt-0.5" /> Não é lucro: {f.custo_completo ? 'custo R$ 0,00 no Bling' : 'há SKU sem custo no Bling'}. Cadastre o custo pra ver o lucro real.</div>
                      </div>
                    </>}
                  </> : <div className="text-xs text-faint">A Shopee ainda não liberou o repasse (escrow) deste pedido — normalmente fica disponível após o envio/conclusão.</div>}
                </div>

                {/* Entrega */}
                <div className="rounded-xl p-3" style={{ background: 'var(--glass-hover)' }}>
                  <div className="text-[10px] text-faint uppercase tracking-wide mb-1 flex items-center gap-1"><MapPin size={11} /> Entrega</div>
                  <div className="text-xs font-medium">{nome}</div>
                  {end.completo && <div className="text-[11px] text-faint mt-0.5">{end.completo}</div>}
                  <div className="text-[11px] text-faint">{[end.cidade, end.uf].filter(Boolean).join('/')} {end.cep || ''}</div>
                  {end.telefone && <div className="text-[11px] text-faint num flex items-center gap-1 mt-0.5"><Phone size={10} />{end.telefone}</div>}
                </div>

                {/* Informação de logística */}
                <div className="rounded-xl p-3" style={{ background: 'var(--glass-hover)' }}>
                  <div className="text-[10px] text-faint uppercase tracking-wide mb-2 flex items-center gap-1"><Truck size={11} /> Informação de logística</div>
                  <TimelineLog status={d.status} />
                  <div className="border-t mt-1 pt-2" style={{ borderColor: 'var(--glass-border)' }}>
                    <div className="text-xs">{log.transportadora || 'Shopee Xpress'}</div>
                    {log.rastreio && <>
                      <div className="text-[11px] num text-faint mt-0.5 flex items-center gap-1"><Barcode size={10} /> {log.rastreio}</div>
                      <div className="mt-1.5 bg-white rounded p-1 inline-block"><BarcodeInline valor={log.rastreio} height={34} /></div>
                    </>}
                  </div>
                </div>
              </>}
          </LimiteErro>
        </div>
      </div>
  )
}

// ===================== MÓDULO 2 — Painel "Personalizar impressão" =====================
const PEDIDO_AMOSTRA = {
  order_sn: 'BR2604AMOSTRA01', status: 'READY_TO_SHIP', rastreio: 'BR2624032462420',
  nfe_numero: '12345', nfe_serie: '1', nfe_emissao: '26/06/2026', valor_total: 51.40,
  nfe_chave: '35260600000000000000550010000123451000000017',
  ship_by: Math.floor(Date.now() / 1000) + 3 * 86400,
  comprador: '****', cliente: '****',
  endereco: { nome: '****', completo: '****', cidade: '****', uf: '****', cep: '****', telefone: '****' },
  itens: [
    { imagem: '', nome: 'Meia Pérola ABS 14mm Branco · 500g — 780 peças', variacao: 'Branco', sku: '5817140010000', qtd: 11, complemento: 'Embalagem com 500g' },
    { imagem: '', nome: 'Cola A Legítima 100ml | Ideal para Strass e Pedrarias', variacao: '', sku: '7500100000100', qtd: 1, complemento: 'Embalagem com 100ml' },
  ],
}
const TogglesImpr = [
  ['mostrar_timeline', 'Linha do tempo (etapas)', 'Folha'],
  ['mostrar_miniaturas', 'Miniaturas dos produtos', 'Folha'],
  ['mostrar_codigo_barras', 'Código de barras do pedido', 'Folha'],
  ['mostrar_nota_comprador', 'Nota do comprador', 'Folha'],
  ['mostrar_complemento', 'Complemento do produto', 'Folha'],
  ['mostrar_nfe', 'Nº da NF-e / DANFE', 'Folha + etiqueta'],
  ['mostrar_rastreio', 'Rastreio', 'Folha + etiqueta'],
  ['mostrar_destinatario', 'Destinatário', 'Folha + etiqueta'],
  ['mostrar_qr', 'QR Code', 'Etiqueta'],
]

function ToggleLinha({ on, onClick, label, escopo }) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center justify-between gap-3 py-2 px-1 text-left rounded-lg hover:bg-[var(--glass-hover)] transition-colors">
      <div className="min-w-0">
        <div className="text-xs">{label}</div>
        {escopo && <div className="text-[10px] text-faint">{escopo}</div>}
      </div>
      <span className="shrink-0 w-9 h-5 rounded-full relative transition-colors" style={{ background: on ? LARANJA : 'var(--glass-border)' }}>
        <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all" style={{ left: on ? '18px' : '2px' }} />
      </span>
    </button>
  )
}

function PainelImpressao({ onClose, onSalvo }) {
  const notify = useToast()
  const [cfg, setCfg] = useState(null)
  const [porTipo, setPorTipo] = useState(null)   // { folha:{flags}, etiqueta:{flags} } — independente por tipo
  const [salvando, setSalvando] = useState(false)
  const [preview, setPreview] = useState('folha')
  useEffect(() => {
    const semear = (c) => {
      const base = {}; FLAGS_IMPR.forEach((f) => { base[f] = c[f] !== false })
      const s = lerPorTipo()
      setPorTipo({ folha: { ...base, ...(s.folha || {}) }, etiqueta: { ...base, ...(s.etiqueta || {}) } })
    }
    api.shopeeImpressaoConfig().then((c) => { setCfg(c); setPrintCfg(c); semear(c) })
      .catch(() => { const c = { ...PRINT_CFG_PADRAO }; setCfg(c); semear(c) })
  }, [])
  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }))
  const campo = (k, v) => set(k, v)
  const toggleTipo = (k) => setPorTipo((pt) => ({ ...pt, [preview]: { ...pt[preview], [k]: !pt[preview][k] } }))
  const salvar = async () => {
    if (!cfg) return
    setSalvando(true)
    try {
      // backend guarda empresa + flags base (espelha a Folha, p/ compatibilidade); o por-tipo fica no navegador
      const cfgSalvar = { ...cfg, ...((porTipo && porTipo.folha) || {}) }
      const salvo = await api.shopeeImpressaoConfigSalvar(cfgSalvar)
      setPrintCfg(salvo); gravarPorTipo(porTipo || {}); onSalvo?.(salvo)
      notify('Impressão personalizada salva.', 'ok'); onClose?.()
    } catch (e) { notify(e.message || 'Falha ao salvar.', 'danger') }
    setSalvando(false)
  }
  const W = preview === 'folha' ? 760 : 378
  const H = preview === 'folha' ? 660 : 567
  const k = 296 / W
  const cfgPrev = (cfg && porTipo) ? { ...cfg, ...(porTipo[preview] || {}) } : cfg
  const doc = !cfgPrev ? '' : `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#fff}${preview === 'folha' ? CSS_FOLHA : CSS_ETIQ}</style></head><body>${preview === 'folha' ? htmlFolhaPedido(PEDIDO_AMOSTRA, cfgPrev) : htmlEtiqueta(PEDIDO_AMOSTRA, '', cfgPrev)}</body></html>`
  const [docUrl, setDocUrl] = useState('')
  useEffect(() => {
    if (!doc) { setDocUrl(''); return }
    const url = URL.createObjectURL(new Blob([doc], { type: 'text/html' }))
    setDocUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [doc])

  return (
    <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,.5)' }} onClick={onClose}>
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-3xl flex flex-col drawer-in rounded-l-2xl overflow-hidden" style={{ background: 'var(--bg)', borderLeft: '1px solid var(--glass-border)', boxShadow: '-14px 0 44px rgba(0,0,0,.34)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 p-4 border-b border-glassb shrink-0">
          <SlidersHorizontal size={17} style={{ color: LARANJA }} />
          <div className="flex-1 min-w-0">
            <div className="font-display font-semibold">Personalizar impressão</div>
            <div className="text-[11px] text-faint">Dados da sua empresa e o que aparece na folha e na etiqueta</div>
          </div>
          <button onClick={onClose} className="text-faint hover:text-fg p-1"><X size={18} /></button>
        </div>

        {!cfg ? (
          <div className="py-16 text-center text-faint flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> carregando…</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-0 overflow-hidden flex-1 min-h-0">
            {/* Configurações */}
            <div className="p-4 overflow-y-auto space-y-4 border-r border-glassb">
              <div>
                <div className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Settings size={13} style={{ color: LARANJA }} /> Dados da empresa (emitente)</div>
                <div className="space-y-2">
                  <label className="block"><span className="text-[10px] text-faint uppercase tracking-wide">Nome / Razão social</span>
                    <input value={cfg.emitente_nome} onChange={(e) => campo('emitente_nome', e.target.value)} placeholder="Sóstrass Acessórios e Pedrarias" className="w-full mt-0.5 text-sm px-2.5 py-1.5 rounded-lg glass bg-transparent outline-none" /></label>
                  <label className="block"><span className="text-[10px] text-faint uppercase tracking-wide">CNPJ</span>
                    <input value={cfg.emitente_cnpj} onChange={(e) => campo('emitente_cnpj', e.target.value)} placeholder="00.000.000/0000-00" className="w-full mt-0.5 text-sm px-2.5 py-1.5 rounded-lg glass bg-transparent outline-none num" /></label>
                  <label className="block"><span className="text-[10px] text-faint uppercase tracking-wide">Endereço</span>
                    <input value={cfg.emitente_endereco} onChange={(e) => campo('emitente_endereco', e.target.value)} placeholder="Rua Comendador, 120" className="w-full mt-0.5 text-sm px-2.5 py-1.5 rounded-lg glass bg-transparent outline-none" /></label>
                  <label className="block"><span className="text-[10px] text-faint uppercase tracking-wide">Cidade · UF · CEP</span>
                    <input value={cfg.emitente_cidade} onChange={(e) => campo('emitente_cidade', e.target.value)} placeholder="Limeira - SP · CEP 13480-000" className="w-full mt-0.5 text-sm px-2.5 py-1.5 rounded-lg glass bg-transparent outline-none" /></label>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold mb-1 flex items-center gap-1.5"><Check size={13} style={{ color: LARANJA }} /> O que aparece em cada impressão</div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <button onClick={() => setPreview('folha')} className="text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors" style={preview === 'folha' ? { background: LARANJA, color: '#fff' } : { background: 'var(--glass-bg)', color: 'var(--dim)' }}><FileText size={12} /> Folha (Pedidos)</button>
                  <button onClick={() => setPreview('etiqueta')} className="text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors" style={preview === 'etiqueta' ? { background: LARANJA, color: '#fff' } : { background: 'var(--glass-bg)', color: 'var(--dim)' }}><Tag size={12} /> Etiqueta</button>
                </div>
                <div className="text-[10px] text-faint mb-1">Cada tipo é independente: o que você liga aqui vale só para a <b className="text-dim">{preview === 'folha' ? 'folha do pedido' : 'etiqueta'}</b>. A prévia ao lado acompanha.</div>
                <div className="divide-y divide-glassb">
                  {porTipo && TogglesImpr
                    .filter(([k, l, esc]) => preview === 'folha' ? esc.includes('Folha') : esc.includes('tiqueta'))
                    .map(([k, label]) => (
                      <ToggleLinha key={k} on={!!porTipo[preview][k]} onClick={() => toggleTipo(k)} label={label} escopo="" />
                    ))}
                </div>
              </div>
            </div>

            {/* Prévia ao vivo */}
            <div className="p-4 overflow-y-auto flex flex-col" style={{ background: 'var(--glass-hover)' }}>
              <div className="flex items-center gap-1.5 mb-3 shrink-0">
                <button onClick={() => setPreview('folha')} className="text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors" style={preview === 'folha' ? { background: LARANJA, color: '#fff' } : {}}>
                  <FileText size={12} /> Folha</button>
                <button onClick={() => setPreview('etiqueta')} className="text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors" style={preview === 'etiqueta' ? { background: LARANJA, color: '#fff' } : {}}>
                  <Tag size={12} /> Etiqueta</button>
                <span className="text-[10px] text-faint ml-auto">prévia ao vivo</span>
              </div>
              <div className="grid place-items-center flex-1">
                <div style={{ width: W * k, height: H * k, overflow: 'hidden', borderRadius: 8, boxShadow: '0 6px 24px rgba(0,0,0,.16)' }}>
                  <iframe title="prévia" src={docUrl} style={{ width: W, height: H, border: 0, transform: `scale(${k})`, transformOrigin: 'top left', background: '#fff' }} />
                </div>
              </div>
              <div className="text-[10px] text-faint text-center mt-2 shrink-0">dados de exemplo · o destinatário fica protegido pela Shopee</div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 p-3 border-t border-glassb shrink-0">
          <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg glass text-dim hover:text-fg">Cancelar</button>
          <button onClick={salvar} disabled={salvando || !cfg} className="text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 font-medium disabled:opacity-50" style={{ background: LARANJA, color: '#fff' }}>
            {salvando ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Abas (grupos) do painel de pedidos. 3a coluna = chave do contador (selo "(xxx)").
const ABAS_PEDIDO = [
  ['TODOS', 'Todos', null],
  ['NAO_PAGO', 'Não pago', 'nao_pago'],
  ['A_ENVIAR', 'A enviar', 'a_enviar'],
  ['ENVIADO', 'Enviado', 'enviado'],
  ['CONCLUIDO', 'Concluído', 'concluido'],
  ['RETORNOS', 'Retornos e cancelados', 'retornos'],
]
const ABAS_GRUPO = [['todos', 'Todos', null], ['aberto', 'Em aberto', 'em_aberto'], ['concluido', 'Concluído', 'concluido']]
const ABAS_NF = [['todos', 'Todos', null], ['pendente', 'Pendente', 'pendente'], ['recusado', 'Recusado', 'recusado'], ['autorizado', 'Autorizado', 'autorizado']]
const TIPOS_BUSCA = [['tudo', 'Tudo'], ['pedido', '# Pedido'], ['comprador', 'Comprador'], ['produto', 'Produto / SKU']]
const LABEL_ABA = { TODOS: 'Todos', NAO_PAGO: 'não pago', A_ENVIAR: 'a enviar', ENVIADO: 'enviado', CONCLUIDO: 'concluído', RETORNOS: 'retornos e cancelados' }
// Bling: 1/3/8=pendente · 4/9=recusado · 5/6/7=autorizado (espelha _nf_situacao_grupo do backend)
const grupoNfCod = (cod) => { const c = parseInt(cod, 10); if ([1, 3, 8].includes(c)) return 'pendente'; if ([4, 9].includes(c)) return 'recusado'; if ([5, 6, 7].includes(c)) return 'autorizado'; return null }

function Aba({ ativo, onClick, label, count, cor = LARANJA }) {
  return (
    <button onClick={onClick} className="text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors"
      style={ativo ? { background: cor, color: '#fff' } : { background: 'var(--glass)', color: 'var(--text-dim)', border: '1px solid var(--glass-border)' }}>
      {label}
      {count != null && (
        <span className="text-[10px] num px-1.5 rounded-full leading-[1.4]" style={{ background: ativo ? 'rgba(255,255,255,.28)' : 'var(--glass-hover)', color: ativo ? '#fff' : 'var(--text-faint)' }}>{count}</span>
      )}
    </button>
  )
}

// Janela de páginas: 1 … p-1 p p+1 … N (mostra tudo se forem poucas)
function janelaPaginas(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out = [1]
  let ini = Math.max(2, page - 1), fim = Math.min(total - 1, page + 1)
  if (page <= 3) { ini = 2; fim = 4 }
  if (page >= total - 2) { ini = total - 3; fim = total - 1 }
  if (ini > 2) out.push('…')
  for (let i = ini; i <= fim; i++) out.push(i)
  if (fim < total - 1) out.push('…')
  out.push(total)
  return out
}
function Paginacao({ page, total, onIr }) {
  if (!total || total <= 1) return null
  const cls = 'min-w-[34px] h-[34px] px-2 rounded-lg text-xs font-medium num grid place-items-center transition-colors disabled:opacity-35 disabled:cursor-default'
  const off = { background: 'var(--glass-bg)', color: 'var(--text-dim)', border: '1px solid var(--glass-border)' }
  const on = { background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' }
  return (
    <div className="flex items-center justify-center gap-1.5 mt-4 flex-wrap">
      <button onClick={() => onIr(page - 1)} disabled={page <= 1} className={cls} style={off} aria-label="Página anterior"><ChevronLeft size={15} /></button>
      {janelaPaginas(page, total).map((p, i) => p === '…'
        ? <span key={'e' + i} className="px-1 text-faint text-xs select-none">…</span>
        : <button key={p} onClick={() => onIr(p)} aria-current={p === page ? 'page' : undefined} className={cls} style={p === page ? on : off}>{p}</button>)}
      <button onClick={() => onIr(page + 1)} disabled={page >= total} className={cls} style={off} aria-label="Próxima página"><ChevronRight size={15} /></button>
    </div>
  )
}

function PedidosPainel({ conectado }) {
  const notify = useToast()
  const agora = useAgora(1000)
  const [status, setStatus] = useState('A_ENVIAR')
  const [grupo, setGrupo] = useState('todos')
  const [nf, setNf] = useState('todos')
  const [busca, setBusca] = useState('')
  const [buscaTipo, setBuscaTipo] = useState('tudo')
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [dias, setDias] = useState(15)
  const [d, setD] = useState(null)
  const [contagens, setContagens] = useState(null)
  const [contagensNf, setContagensNf] = useState(null)
  const [sel, setSel] = useState(() => new Set())
  const [imprimindo, setImprimindo] = useState(false)
  const [aberto, setAberto] = useState(null)
  const [impressas, setImpressas] = useState(lerImpressas)
  const [editorImpr, setEditorImpr] = useState(false)

  const [carregando, setCarregando] = useState(false)
  const [cacheImpr, setCacheImpr] = useState({})   // order_sn -> pedido completo (seleção entre páginas)
  const [selTudoLoad, setSelTudoLoad] = useState(false)
  const carregar = (over = {}, manter = false) => {
    const st = over.status ?? status, gr = over.grupo ?? grupo, nfv = over.nf ?? nf
    const bz = over.busca ?? busca, bt = over.buscaTipo ?? buscaTipo
    const pg = over.page ?? page, dd = over.dias ?? dias
    if (manter) setCarregando(true)        // troca de página: mantém a lista visível (sem piscar) e preserva a seleção
    else { setD(null); setSel(new Set()) } // troca de filtro: recomeça e limpa a seleção
    api.shopeePedidosPainel(st, dd, { page: pg, page_size: pageSize, busca: bz, busca_tipo: bt, grupo: gr, nf: nfv })
      .then((r) => { setD(r); setCarregando(false) })
      .catch((e) => { setD({ erro: e.message || true }); setCarregando(false) })
  }
  const carregarContagens = (dd = dias) => { api.shopeePedidosContagens(dd).then(setContagens).catch(() => setContagens(null)) }
  const carregarContagensNf = (st = status, dd = dias) => { setContagensNf(null); api.shopeePedidosContagensNf(st, dd).then(setContagensNf).catch(() => setContagensNf(null)) }

  useEffect(() => { if (conectado) { carregar(); carregarContagens(); carregarContagensNf() } }, [conectado])
  useEffect(() => { if (conectado) api.shopeeImpressaoConfig().then(setPrintCfg).catch(() => {}) }, [conectado])
  // busca com debounce: volta pra página 1 e recarrega no servidor
  const primeiraBusca = useRef(true)
  useEffect(() => {
    if (!conectado) return
    if (primeiraBusca.current) { primeiraBusca.current = false; return }
    const t = setTimeout(() => { setPage(1); carregar({ page: 1 }) }, 450)
    return () => clearTimeout(t)
  }, [busca, buscaTipo])

  const mudar = (campo, valor) => {
    const setters = { status: setStatus, grupo: setGrupo, nf: setNf, dias: setDias }
    setters[campo](valor); setPage(1)
    carregar({ [campo]: valor, page: 1 })
    if (campo === 'dias') { carregarContagens(valor); carregarContagensNf(status, valor) }
    if (campo === 'status') carregarContagensNf(valor, dias)
  }
  const irPagina = (pg) => { if (pg < 1) return; setPage(pg); carregar({ page: pg }, true) }

  const pedidos = d?.pedidos || []
  const res = d?.resumo
  const selosNf = contagensNf?.selos || {}
  const seloDe = (p) => {
    if (p.nfe_situacao != null) { const g = grupoNfCod(p.nfe_situacao); if (g) return { grupo: g, numero: p.nfe_numero } }
    return selosNf[p.order_sn] || null
  }
  const cnt = (chave) => (contagens && chave ? contagens[chave] : null)
  // "Em aberto / Concluído" do STATUS DO PEDIDO escopados na aba atual (igual à Shopee)
  const cntGrupo = (ck) => {
    if (!ck) return null
    const chaveAba = { NAO_PAGO: 'nao_pago', A_ENVIAR: 'a_enviar', ENVIADO: 'enviado', CONCLUIDO: 'concluido', RETORNOS: 'retornos', TODOS: 'todos' }[status]
    const totalAba = cnt(chaveAba)
    if (status === 'TODOS') return cnt(ck)
    if (status === 'CONCLUIDO') return ck === 'concluido' ? totalAba : 0
    if (status === 'RETORNOS') return 0
    return ck === 'em_aberto' ? totalAba : 0
  }
  const cntNf = (chave) => (contagensNf && chave ? (contagensNf.contagens || {})[chave] : null)

  const freqComprador = useMemo(() => {
    const m = {}
    for (const p of pedidos) { const k = (p.cliente || p.comprador || '').toLowerCase(); if (k) m[k] = (m[k] || 0) + 1 }
    return m
  }, [pedidos])
  const ehRecorrente = (p) => { const k = (p.cliente || p.comprador || '').toLowerCase().trim(); return !!k && !mascarado(k) && (freqComprador[k] || 0) > 1 }
  const marcarImpressa = (sn) => setImpressas((s) => { const n = new Set(s); n.add(sn); gravarImpressas(n); return n })

  const toggleSel = (sn) => setSel((s) => { const n = new Set(s); n.has(sn) ? n.delete(sn) : n.add(sn); return n })
  const totalAba = d?.total || 0
  const selTodos = async () => {
    if (sel.size > 0 && sel.size >= totalAba) { setSel(new Set()); return }                 // já tudo -> limpa
    if (totalAba <= pedidos.length) { setSel(new Set(pedidos.map((p) => p.order_sn))); return } // 1 página só
    // várias páginas: busca todos os pedidos da aba de uma vez (modo legado do backend) e cacheia p/ impressão
    setSelTudoLoad(true)
    try {
      const r = await api.shopeePedidosPainel(status, dias, { page: 1, page_size: 500, busca, busca_tipo: buscaTipo, grupo, nf })
      const lista = r.pedidos || []
      setCacheImpr((m) => { const n = { ...m }; lista.forEach((p) => { n[p.order_sn] = p }); return n })
      setSel(new Set(lista.map((p) => p.order_sn)))
    } catch (e) { notify(e.message || 'Falha ao selecionar todos.', 'danger') }
    setSelTudoLoad(false)
  }
  const alvoImpressao = () => {
    if (!sel.size) return pedidos
    const m = {}
    pedidos.forEach((p) => { if (sel.has(p.order_sn)) m[p.order_sn] = p })
    sel.forEach((sn) => { if (!m[sn] && cacheImpr[sn]) m[sn] = cacheImpr[sn] })  // selecionados de outras páginas
    return Object.values(m)
  }
  const aprovadoStatus = (s) => s === 'READY_TO_SHIP' || s === 'PROCESSED'
  const aprovadosComNota = pedidos.filter((p) => aprovadoStatus(p.status) && seloDe(p)?.grupo === 'autorizado')

  const enriquecerPedidos = async (lista) => {
    const clones = lista.map((p) => ({ ...p, itens: (p.itens || []).map((it) => ({ ...it })) }))
    clones.forEach((p) => { if (!p.rastreio && p.logistica && p.logistica.rastreio) p.rastreio = p.logistica.rastreio })
    try {
      const order_sns = clones.map((p) => p.order_sn).filter(Boolean)
      const skus = [...new Set(clones.flatMap((p) => (p.itens || []).map((it) => it.sku).filter(Boolean)))]
      const res = await api.shopeeEnriquecerImpressao(order_sns, skus)
      const patches = (res && res.patches) || {}
      const complementos = (res && res.complementos) || {}
      clones.forEach((p) => {
        const patch = patches[p.order_sn]
        if (patch) Object.assign(p, patch)
        ;(p.itens || []).forEach((it) => { if (it.sku && complementos[it.sku] && !it.complemento) it.complemento = complementos[it.sku] })
      })
    } catch (_) { /* degradação graciosa */ }
    return clones
  }

  const imprimirPedidosRich = async () => {
    const lista = alvoImpressao(); if (!lista.length) return
    setImprimindo(true)
    const enriq = await enriquecerPedidos(lista)
    imprimirFolhasPedido(enriq)
    setImprimindo(false)
  }
  const imprimirEtiquetasRich = async () => {
    const lista = alvoImpressao(); if (!lista.length) return
    setImprimindo(true)
    const enriq = await enriquecerPedidos(lista)
    imprimirEtiquetas(enriq, 'Sóstrass Armarinhos')
    enriq.forEach((p) => marcarImpressa(p.order_sn))
    setImprimindo(false)
  }
  const imprimirEtiquetaOficial = async () => {
    const lista = alvoImpressao(); if (!lista.length) return
    const sns = lista.map((p) => p.order_sn).filter(Boolean)
    setImprimindo(true)
    try {
      const blob = await api.shopeeEtiquetaOficial(sns, 'auto')
      const url = URL.createObjectURL(blob)
      const w = window.open(url, '_blank')
      if (!w) { notify('Permita pop-ups para abrir o PDF da etiqueta oficial.', 'danger') }
      else { lista.forEach((p) => marcarImpressa(p.order_sn)); notify(`Etiqueta oficial gerada (${sns.length} pedido${sns.length > 1 ? 's' : ''}).`, 'ok') }
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (e) { notify(e.message || 'Falha ao gerar a etiqueta oficial da Shopee.', 'danger') }
    setImprimindo(false)
  }

  const imprimirSeparacao = async () => {
    setImprimindo(true)
    try {
      const sep = await api.shopeePedidosSeparacao(status, dias)
      const linhas = (sep.itens || []).map((l) =>
        `<tr><td class="chk">☐</td><td>${l.nome || ''}</td><td class="sku">${l.sku || ''}</td><td class="q">${l.qtd}</td><td class="c">${l.pedidos}</td></tr>`).join('')
      imprimirDoc('Lista de separação', `<h1>Lista de separação — ${LABEL_ABA[status] || status}</h1>
        <div class="sub">${sep.skus} produtos · ${sep.total_unidades} unidades · ${sep.pedidos} pedidos · ${new Date().toLocaleString('pt-BR')}</div>
        <table><thead><tr><th class="chk"></th><th>Produto</th><th>SKU</th><th class="q">Qtd</th><th class="c">Pedidos</th></tr></thead><tbody>${linhas}</tbody></table>`)
    } catch (e) { notify(e.message || 'Falha ao gerar', 'danger') }
    setImprimindo(false)
  }

  const btnTxt = 'text-xs px-2.5 py-1.5 rounded-lg glass text-dim hover:text-fg flex items-center gap-1.5 disabled:opacity-40'

  return (
    <div className="glass rounded-2xl p-4">
      <div className={!aberto ? 'sticky top-0 z-20 pb-2 mb-1' : ''} style={!aberto ? { background: 'var(--bg)', borderBottom: '1px solid var(--glass-border)' } : undefined}>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <div className="text-sm font-semibold flex items-center gap-1.5"><Package size={15} style={{ color: LARANJA }} /> Central de pedidos</div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(sel.size > 0 || imprimindo) && (
            <span className="text-[11px] num mr-0.5" style={{ color: imprimindo ? LARANJA : 'var(--text-faint)' }}>
              {imprimindo ? <span className="flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> gerando…</span> : `${sel.size} selecionado(s)`}
            </span>
          )}
          <button onClick={() => setEditorImpr(true)} className={btnTxt} title="Personalizar impressão: dados da empresa e campos da folha/etiqueta"><SlidersHorizontal size={13} /> Personalizar</button>
          <button onClick={imprimirSeparacao} disabled={imprimindo || !pedidos.length} className={btnTxt} title="Lista de separação (produtos A→Z, todos os pedidos do status)"><ClipboardList size={13} /> Separação</button>
          <button onClick={imprimirPedidosRich} disabled={imprimindo || !pedidos.length} className={btnTxt} title="Folha de pedido (com endereço e itens)"><Printer size={13} /> Pedidos{sel.size ? ` (${sel.size})` : ''}</button>
          <button onClick={imprimirEtiquetasRich} disabled={imprimindo || !pedidos.length} className="text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-40 font-medium" style={{ background: LARANJA, color: '#fff' }} title="Etiquetas de envio 100×150mm (modelo Precifica AI)"><Tag size={13} /> Etiquetas{sel.size ? ` (${sel.size})` : ''}</button>
          <button onClick={imprimirEtiquetaOficial} disabled={imprimindo || !pedidos.length} className={btnTxt} title="Etiqueta OFICIAL da Shopee em PDF (waybill do SPX). Tem a estação/rota e o endereço."><Receipt size={13} /> Oficial SPX{sel.size ? ` (${sel.size})` : ''}</button>
          <button disabled title="Imprimir NF-e — precisa vincular a nota do Bling (em breve)" className="text-xs px-2.5 py-1.5 rounded-lg glass text-faint flex items-center gap-1.5 opacity-50 cursor-not-allowed"><FileText size={13} /> NF-e</button>
        </div>
      </div>

      {/* Grupo 1 — Meus Pedidos */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-faint font-bold">Meus pedidos</span>
          <div className="flex items-center gap-1">
            {[7, 15, 30].map((dd) => (
              <button key={dd} onClick={() => mudar('dias', dd)} className="text-[11px] px-2 py-1 rounded-lg"
                style={dias === dd ? { background: 'var(--glass-hover)', color: 'var(--text)' } : { color: 'var(--text-faint)' }}>{dd}d</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {ABAS_PEDIDO.map(([id, label, ck]) => <Aba key={id} ativo={status === id} onClick={() => mudar('status', id)} label={label} count={cnt(ck)} />)}
        </div>
      </div>

      {/* Grupo 2 — Status do Pedido */}
      <div className="mb-2.5">
        <span className="text-[10px] uppercase tracking-wider text-faint font-bold block mb-1">Status do pedido</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {ABAS_GRUPO.map(([id, label, ck]) => <Aba key={id} ativo={grupo === id} onClick={() => mudar('grupo', id)} label={label} count={cntGrupo(ck)} cor="#7b2a8c" />)}
        </div>
      </div>

      {/* Grupo 3 — Status da Nota Fiscal */}
      <div className="mb-3">
        <span className="text-[10px] uppercase tracking-wider text-faint font-bold flex items-center gap-1 mb-1">
          Status da nota fiscal
          {contagensNf === null && <Loader2 size={9} className="animate-spin" />}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {ABAS_NF.map(([id, label, ck]) => <Aba key={id} ativo={nf === id} onClick={() => mudar('nf', id)} label={label} count={cntNf(ck)} cor="#d6007f" />)}
        </div>
      </div>

      {res && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <FinMetric icon={Package} rotulo="Pedidos no total" valor={res.total} sub={d?.paginas > 1 ? `${res.total_pagina} nesta página` : null} />
          <FinMetric icon={Wallet} rotulo="Receita" valor={brl(res.receita)} sub="nesta página" />
          <FinMetric icon={TrendingUp} rotulo="Margem após taxas" valor={res.lucro_real != null ? brl(res.lucro_real) : '—'} cor="#2DD4BF" sub={res.lucro_real != null ? `${res.cobertura_lucro} c/ custo · indicador` : 'cadastre custos no Bling'} />
          <FinMetric icon={AlertTriangle} rotulo="Abaixo da meta" valor={res.abaixo_meta} cor={res.abaixo_meta > 0 ? '#d6007f' : '#2DD4BF'} sub={res.prejuizo > 0 ? `${res.prejuizo} em prejuízo` : (res.margem_alvo ? `meta ${res.margem_alvo}%` : null)} />
        </div>
      )}

      {/* Busca + tipo de busca */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <div className="flex-1 min-w-[180px] flex items-center gap-1.5 rounded-lg px-2.5 py-1.5" style={{ background: 'var(--glass-hover)' }}>
          <Search size={13} className="text-faint" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={`buscar em ${(TIPOS_BUSCA.find((t) => t[0] === buscaTipo) || ['', 'tudo'])[1].toLowerCase()}…`} className="bg-transparent text-xs flex-1 outline-none" />
          {busca && <button onClick={() => setBusca('')} className="text-faint hover:text-fg" title="Limpar"><X size={12} /></button>}
        </div>
        <div className="flex items-center gap-1">
          <Filter size={12} className="text-faint" />
          {TIPOS_BUSCA.map(([id, label]) => (
            <button key={id} onClick={() => setBuscaTipo(id)} className="text-[11px] px-2 py-1.5 rounded-lg"
              style={buscaTipo === id ? { background: 'var(--glass-hover)', color: 'var(--text)' } : { color: 'var(--text-faint)' }}>{label}</button>
          ))}
        </div>
      </div>

      {/* barra de seleção em lote */}
      {pedidos.length > 0 && (
        <div className="flex items-center gap-2 mb-3 rounded-xl px-3 py-2 flex-wrap" style={{ background: 'color-mix(in srgb, var(--accent2) 10%, transparent)', border: '1px solid var(--glass-border)' }}>
          <CheckCheck size={14} style={{ color: LARANJA }} className="shrink-0" />
          <span className="text-[11px] flex-1 min-w-[170px]" style={{ color: 'var(--dim)' }}>
            {sel.size > 0
              ? <><b className="text-fg num">{sel.size}</b> selecionado(s) — imprima com <b className="text-fg">Etiquetas</b>, <b className="text-fg">Pedidos</b> ou <b className="text-fg">Oficial SPX</b>.</>
              : <><b className="text-fg">Marque os pedidos</b> no quadradinho à esquerda, ou use o botão ao lado.</>}
          </span>
          {aprovadosComNota.length > 0 && (() => {
            const alvos = aprovadosComNota.map((p) => p.order_sn)
            const todos = alvos.every((sn) => sel.has(sn))
            return (
              <button onClick={() => setSel((s) => { const n = new Set(s); alvos.forEach((sn) => todos ? n.delete(sn) : n.add(sn)); return n })}
                className="text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 glass hover:text-fg"
                style={{ color: todos ? '#2DD4BF' : 'var(--text-dim)' }}
                title="Marca todos os pedidos aprovados (a enviar / processado) que já têm NF-e autorizada">
                <CheckCheck size={12} /> Aprovados c/ nota <span className="num">({alvos.length})</span>
              </button>
            )
          })()}
          <button onClick={selTodos} disabled={selTudoLoad} className="text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 glass text-dim hover:text-fg disabled:opacity-50" title="Selecionar ou limpar todos os pedidos da aba (todas as páginas)">
            {selTudoLoad ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />} {(sel.size > 0 && sel.size >= totalAba) ? 'Limpar seleção' : `Selecionar todos${totalAba > pedidos.length ? ` (${totalAba})` : ''}`}
          </button>
        </div>
      )}

      </div>

      <div className={aberto ? 'grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(380px,460px)] gap-4 items-start' : ''}>
       <div className="min-w-0">
      {d && !d.erro && d.paginas > 1 && (
        <div className="mb-2.5"><Paginacao page={page} total={d.paginas} onIr={irPagina} /></div>
      )}
      {d === null ? <div className="py-10 text-center text-faint flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> carregando pedidos…</div>
        : d?.erro ? <div className="py-6 text-center text-sm" style={{ color: '#FF6F6F' }}>{typeof d.erro === 'string' ? d.erro : 'Falha ao carregar pedidos.'}</div>
        : pedidos.length === 0 ? <div className="py-8 text-center text-sm text-faint">{busca ? 'Nenhum pedido bate com a busca.' : `Nenhum pedido ${LABEL_ABA[status] || ''} no período.`}</div>
        : <div className="space-y-2" style={{ opacity: carregando ? 0.45 : 1, transition: 'opacity .15s', pointerEvents: carregando ? 'none' : 'auto' }}>{pedidos.map((p) => <PedidoCard key={p.order_sn} p={p} agora={agora} alvo={d?.margem_alvo} sel={sel.has(p.order_sn)} onSel={toggleSel} onAbrir={setAberto} recorrente={ehRecorrente(p)} impressa={impressas.has(p.order_sn)} nfSelo={seloDe(p)} />)}</div>}

      {/* Paginação */}
      {d && !d.erro && d.paginas > 1 && (<>
        <Paginacao page={page} total={d.paginas} onIr={irPagina} />
        <div className="text-center text-[11px] text-faint num mt-2">{d.total} pedidos · página {d.page} de {d.paginas}</div>
      </>)}
       </div>

      {aberto && (
        <div className="min-w-0 xl:sticky xl:top-2">
        <LimiteErro fallback={
          <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
              <AlertTriangle size={22} className="mx-auto mb-2" style={{ color: '#FF6F6F' }} />
              <div className="text-sm text-dim mb-3">Não consegui abrir este pedido agora. Tente novamente.</div>
              <button onClick={() => setAberto(null)} className="text-xs px-3 py-1.5 rounded-lg glass text-dim hover:text-fg">Fechar</button>
          </div>
        }>
          <PedidoDetalhe orderSn={aberto} alvo={d?.margem_alvo} onClose={() => setAberto(null)}
            recorrente={ehRecorrente(pedidos.find((p) => p.order_sn === aberto) || {})}
            onImpressa={marcarImpressa} rem="Sóstrass Armarinhos" />
        </LimiteErro>
        </div>
      )}
      </div>

      {editorImpr && (
        <LimiteErro fallback={<div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: 'rgba(0,0,0,.6)' }} onClick={() => setEditorImpr(false)}><div className="glass rounded-2xl p-6 text-center text-sm text-dim" onClick={(e) => e.stopPropagation()}>Não consegui abrir o personalizador. <button onClick={() => setEditorImpr(false)} className="underline ml-1">Fechar</button></div></div>}>
          <PainelImpressao onClose={() => setEditorImpr(false)} onSalvo={() => {}} />
        </LimiteErro>
      )}

      <div className="text-[10px] text-faint mt-3 flex items-start gap-1.5">
        <FileText size={11} className="mt-0.5 shrink-0" />
        <span>O cliente aparece pelo <b>usuário da Shopee</b> (a API esconde nome/endereço reais — o endereço completo e a <b>estação/rota</b> só vêm na <b>Oficial SPX</b>). A <b>folha de separação</b> agrega todos os pedidos do status; as <b>etiquetas/folhas</b> imprimem os pedidos da página atual ou os selecionados.</span>
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
function copiarTexto(txt) {
  try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(String(txt)); return } } catch (_) {}
  try { const ta = document.createElement('textarea'); ta.value = String(txt); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); document.body.removeChild(ta) } catch (_) {}
}

function PainelIndicadores({ itens }) {
  const dados = useMemo(() => {
    const c = contarStatus(itens)
    const comBase = itens.filter((l) => !l.sem_base && l.liquido != null && l.preco_bling > 0)
    const cobertura = comBase.length ? comBase.reduce((s, l) => s + (l.liquido / l.preco_bling) * 100, 0) / comBase.length : 0
    let falta = 0
    for (const l of itens) {
      if ((l.abaixo || l.prejuizo) && l.preco_bling > 0 && l.liquido != null) falta += Math.max(0, l.preco_bling - l.liquido)
    }
    const bands = [
      { label: 'Prejuízo', cor: '#FF6F6F', n: comBase.filter((l) => l.liquido < 0).length },
      { label: '< 80%', cor: '#d6007f', n: comBase.filter((l) => l.liquido >= 0 && l.liquido < l.preco_bling * 0.8).length },
      { label: '80–99%', cor: '#F5A623', n: comBase.filter((l) => l.liquido >= l.preco_bling * 0.8 && l.liquido < l.preco_bling).length },
      { label: '100%+', cor: '#2DD4BF', n: comBase.filter((l) => l.liquido >= l.preco_bling).length },
    ]
    const maxB = Math.max(1, ...bands.map((b) => b.n))
    return { c, cobertura, falta, bands, maxB }
  }, [itens])

  const { c, cobertura, falta, bands, maxB } = dados
  const total = c.total || 1
  const CIRC = 2 * Math.PI * 52
  const segDefs = [['no_padrao', c.no_padrao, '#2DD4BF'], ['abaixo', c.abaixo, '#d6007f'], ['prejuizo', c.prejuizo, '#FF6F6F'], ['em_competicao', c.em_competicao, AZUL_RADAR], ['sem_base', c.sem_base, '#6a5f73']].filter((s) => s[1] > 0)
  let acc = 0
  const arcs = segDefs.map(([k, v, col]) => { const len = v / total * CIRC; const rot = -90 + acc / total * 360; acc += v; return { k, col, dash: `${len} ${CIRC - len}`, rot } })
  const pctPadrao = Math.round((c.no_padrao / total) * 100)
  const CR = 2 * Math.PI * 38
  const cobreOk = cobertura >= 100
  const ringDash = Math.max(0, Math.min(1, cobertura / 130)) * CR

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 text-sm font-semibold mb-3"><Activity size={15} style={{ color: LARANJA }} /> Painel de indicadores
        <span className="ml-auto text-[11px] text-faint font-normal flex items-center gap-1.5"><Box size={12} /> {c.total} SKUs casados</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-xl p-3.5" style={{ background: 'rgba(0,0,0,.16)', border: '1px solid var(--glass-border)' }}>
          <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2.5">Saúde da precificação</div>
          <div className="flex items-center gap-3">
            <svg width="104" height="104" viewBox="0 0 118 118" className="shrink-0">
              <circle cx="59" cy="59" r="52" stroke="rgba(255,255,255,.05)" strokeWidth="13" fill="none" />
              {arcs.map((a, i) => <circle key={i} cx="59" cy="59" r="52" stroke={a.col} strokeWidth="13" fill="none" strokeDasharray={a.dash} transform={`rotate(${a.rot} 59 59)`} />)}
              <text x="59" y="55" textAnchor="middle" fill="var(--text)" fontSize="22" fontWeight="800">{pctPadrao}%</text>
              <text x="59" y="72" textAnchor="middle" fill="var(--text-faint)" fontSize="10">no padrão</text>
            </svg>
            <div className="flex flex-col gap-1 text-[11px] min-w-0 flex-1">
              {[['No padrão', '#2DD4BF', c.no_padrao], ['Abaixo', '#d6007f', c.abaixo], ['Prejuízo', '#FF6F6F', c.prejuizo], ['Competição', AZUL_RADAR, c.em_competicao], ['Sem Bling', '#6a5f73', c.sem_base]].map(([t, col, n]) => (
                <div key={t} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm shrink-0" style={{ background: col }} />{t}<span className="num font-bold ml-auto">{n}</span></div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl p-3.5 flex flex-col" style={{ background: 'rgba(0,0,0,.16)', border: '1px solid var(--glass-border)' }}>
          <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2">Cobertura do líquido</div>
          <div className="flex flex-col items-center gap-2 flex-1 justify-center">
            <svg width="88" height="88" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="38" stroke="rgba(255,255,255,.05)" strokeWidth="9" fill="none" />
              <circle cx="48" cy="48" r="38" stroke={cobreOk ? '#2DD4BF' : '#d6007f'} strokeWidth="9" fill="none" strokeLinecap="round" strokeDasharray={`${ringDash} ${CR - ringDash}`} transform="rotate(-90 48 48)" />
              <text x="48" y="45" textAnchor="middle" fill="var(--text)" fontSize="19" fontWeight="800">{cobertura.toFixed(0)}%</text>
              <text x="48" y="62" textAnchor="middle" fill="var(--text-faint)" fontSize="9.5">do Preço Bling</text>
            </svg>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded whitespace-nowrap" style={{ background: `color-mix(in srgb, ${cobreOk ? '#2DD4BF' : '#d6007f'} 14%, transparent)`, color: cobreOk ? '#2DD4BF' : '#d6007f' }}>{cobreOk ? 'netando o Preço Bling' : 'abaixo do Preço Bling'}</span>
          </div>
        </div>

        <div className="rounded-xl p-3.5 flex flex-col" style={{ background: 'rgba(0,0,0,.16)', border: '1px solid var(--glass-border)' }}>
          <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2">Deixando de receber</div>
          <div className="num text-[26px] font-extrabold leading-none" style={{ color: '#F5A623' }}>{brl(falta)}</div>
          <div className="text-[11px] text-faint mt-1.5">falta pra netar o Preço Bling nos <b style={{ color: 'var(--text)' }}>{c.abaixo} abaixo</b> + {c.prejuizo} no prejuízo</div>
          <div className="text-[10px] text-faint mt-auto pt-1.5 flex items-start gap-1"><Info size={11} className="shrink-0 mt-0.5" /> estimativa por unidade — fica exato com o volume de vendas</div>
        </div>

        <div className="rounded-xl p-3.5" style={{ background: 'rgba(0,0,0,.16)', border: '1px solid var(--glass-border)' }}>
          <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2">Líquido vs Preço Bling</div>
          <div className="relative flex items-end gap-2.5" style={{ height: 92 }}>
            <div className="absolute" style={{ left: '75%', top: 2, bottom: 22, borderLeft: '2px dashed #2DD4BF', opacity: .55 }} />
            {bands.map((b, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                <div className="text-[12px] font-bold" style={{ color: b.cor }}>{b.n}</div>
                <div className="w-full rounded-t-md" style={{ height: `${Math.max(5, b.n / maxB * 100)}%`, background: b.cor, minHeight: 4 }} />
                <div className="text-[9px] text-faint text-center leading-tight">{b.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function AgenteBar() {
  const [modo, setModo] = useState(() => { try { return localStorage.getItem('precifica_agente_modo') || 'sugerir' } catch { return 'sugerir' } })
  const set = (m) => { setModo(m); try { localStorage.setItem('precifica_agente_modo', m) } catch (_) {} }
  const modos = [['automatico', 'Automático', CheckCircle2, true], ['sugerir', 'Sugerir', Sparkles, false], ['manual', 'Manual', SlidersHorizontal, false]]
  const desc = { automatico: 'corrige sozinho respeitando o piso de margem e o Radar', sugerir: 'o agente propõe o preço e você aplica em um clique', manual: 'você ajusta cada preço manualmente no detalhe' }
  return (
    <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap" style={{ background: `linear-gradient(180deg, color-mix(in srgb, var(--accent) 5%, transparent), var(--glass-bg))` }}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-8 w-8 rounded-lg grid place-items-center shrink-0" style={{ background: `color-mix(in srgb, ${LARANJA} 18%, transparent)`, color: LARANJA }}><Bot size={17} /></div>
        <div className="min-w-0"><div className="text-sm font-bold leading-tight">Agente de precificação</div><div className="text-[11px] text-faint">{desc[modo]}</div></div>
      </div>
      <div className="flex rounded-xl p-1 gap-0.5 ml-auto" style={{ background: 'var(--bg)', border: '1px solid var(--glass-border)' }}>
        {modos.map(([id, label, Ic, soon]) => {
          const on = modo === id
          return <button key={id} onClick={() => !soon && set(id)} disabled={soon} title={soon ? 'Em breve' : ''} className="text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-45" style={on ? { background: LARANJA, color: '#fff' } : { color: 'var(--text-dim)' }}><Ic size={13} /> {label}{soon && <span className="text-[8px] px-1 py-px rounded" style={{ background: 'var(--glass-hover)' }}>em breve</span>}</button>
        })}
      </div>
    </div>
  )
}

function Divergencia({ conectado, notify }) {
  const [d, setD] = useState(null)
  const [filtro, setFiltro] = useState('abaixo')
  const [busca, setBusca] = useState('')
  const [ajustando, setAjustando] = useState(null)
  const [aplicandoManual, setAplicandoManual] = useState(null)
  const [loteAberto, setLoteAberto] = useState(false)
  const [aplicandoLote, setAplicandoLote] = useState(false)
  const [salvandoPreco, setSalvandoPreco] = useState(null)
  const [aberto, setAberto] = useState(null)   // item_id do produto aberto no painel lateral
  const carregar = () => { setD(null); api.shopeeDivergencia().then(setD).catch(() => setD({ erro: true })) }
  useEffect(() => { if (conectado) carregar() }, [conectado])
  if (!conectado) return <Vazio txt="Conecte a loja Shopee para ver o líquido de cada anúncio frente ao Preço Bling." />
  if (d === null) return <Carregando txt="calculando o líquido de cada anúncio (preço − taxas − imposto − embalagem) e comparando com o Preço Bling…" />
  if (d.erro) return <Vazio txt="Não consegui ler o catálogo da Shopee. Verifique a conexão." />

  const recontar = (itens) => ({
    sem_base: itens.filter((x) => x.sem_base).length,
    prejuizo: itens.filter((x) => x.prejuizo).length,
    abaixo: itens.filter((x) => x.abaixo).length,
    cobre: itens.filter((x) => x.cobre).length,
  })

  const ajustar = async (l) => {
    const novo = l.preco_ideal
    if (!novo) return
    if (!window.confirm(`Atualizar o preço de "${l.nome}" na Shopee de ${brl(l.preco)} para ${brl(novo)}?\n\nNesse preço você recebe líquido o Preço Bling (${brl(l.preco_bling)}). Isso altera o anúncio AO VIVO na Shopee.`)) return
    setAjustando(l.item_id)
    try {
      await api.shopeeItemPreco(l.item_id, novo)
      setD((cur) => {
        const itens = cur.itens.map((x) => x.item_id !== l.item_id ? x : ({
          ...x, preco: novo, ajustado: true,
          liquido: x.preco_bling, diferenca: 0,
          prejuizo: false, abaixo: false, cobre: true,
        }))
        return { ...cur, itens, ...recontar(itens) }
      })
      notify?.(`Preço de "${l.nome}" ajustado para ${brl(novo)} na Shopee — netando o Preço Bling`, 'ok')
    } catch (e) { notify?.('Não consegui atualizar: ' + e.message, 'danger') }
    setAjustando(null)
  }

  const aplicarManual = async (l, valorRaw) => {
    const novo = Number(String(valorRaw).replace(/\s/g, '').replace(',', '.'))
    if (Number.isNaN(novo) || novo <= 0) { notify?.('Informe um preço válido.', 'danger'); return }
    if (!window.confirm(`Atualizar o preço de "${l.nome}" na Shopee para ${brl(novo)}?\n\nIsso altera o preço do anúncio AO VIVO na Shopee.`)) return
    setAplicandoManual(l.item_id)
    try {
      await api.shopeeItemPreco(l.item_id, novo)
      setD((cur) => ({ ...cur, itens: cur.itens.map((x) => x.item_id !== l.item_id ? x : ({ ...x, preco: novo, ajustado: true })) }))
      notify?.(`Preço de "${l.nome}" atualizado na Shopee: ${brl(novo)}. Recalcule para atualizar o líquido.`, 'ok')
    } catch (e) { notify?.('Não consegui atualizar o preço na Shopee: ' + (e.message || ''), 'danger') }
    setAplicandoManual(null)
  }

  const aplicarLote = async (subir) => {
    const ids = (subir || []).map((l) => l.item_id)
    if (!ids.length) return
    setAplicandoLote(true)
    try {
      const r = await api.shopeeReprecificar({ item_ids: ids, aplicar: true })
      const n = r.aplicados || 0, e = (r.erros || []).length
      notify?.(`${n} preço(s) atualizado(s) na Shopee${e ? ` · ${e} com erro` : ''}. Recalcule para conferir as margens.`, e ? 'danger' : 'ok')
      setLoteAberto(false)
      carregar()
    } catch (err) { notify?.('Não consegui aplicar o lote: ' + (err.message || ''), 'danger') }
    setAplicandoLote(false)
  }

  const salvarPrecoBling = async (l, valorRaw) => {
    const v = Number(String(valorRaw).replace(',', '.'))
    if (!l.produto_id || Number.isNaN(v) || v < 0) { notify?.('Informe um Preço Bling válido.', 'danger'); return }
    setSalvandoPreco(l.item_id)
    try {
      await api.produtoAtualizar(l.produto_id, { preco: v, sku: l.sku })
      setD((cur) => {
        const itens = cur.itens.map((x) => {
          if (x.item_id !== l.item_id) return x
          const base = v
          const semBase = !(base > 0 && x.preco > 0)
          const liq = x.liquido
          const prej = !!(!semBase && liq != null && liq < 0)
          const abx = !!(!semBase && liq != null && !prej && liq < base)
          const cob = !!(!semBase && liq != null && liq >= base)
          return {
            ...x, preco_bling: base > 0 ? base : null,
            diferenca: (!semBase && liq != null) ? Math.round((liq - base) * 100) / 100 : null,
            preco_ideal: null, sem_base: semBase, prejuizo: prej, abaixo: abx, cobre: cob,
            precobling_editado: true,
          }
        })
        return { ...cur, itens, ...recontar(itens) }
      })
      notify?.(`Preço Bling de "${l.nome}" salvo: ${brl(v)}. Recalcule para o preço ideal.`, 'ok')
    } catch (e) { notify?.('Não consegui salvar o Preço Bling: ' + (e.message || ''), 'danger') }
    setSalvandoPreco(null)
  }

  const cont = contarStatus(d.itens || [])
  const filtros = [
    ['prejuizo', 'Prejuízo', cont.prejuizo],
    ['abaixo', 'Abaixo do líquido', cont.abaixo],
    ['em_competicao', 'Em competição', cont.em_competicao],
    ['no_padrao', 'No padrão', cont.no_padrao],
    ['sem_base', 'Sem Preço Bling', cont.sem_base],
    ['todos', 'Todos', cont.total],
  ]
  const q = busca.trim().toLowerCase()
  const itens = (d.itens || []).filter((l) => {
    if (q) return (l.sku || '').toLowerCase().includes(q) || (l.nome || '').toLowerCase().includes(q)
    return filtro === 'todos' ? true : statusProduto(l) === filtro
  })
  const selecionado = aberto ? (d.itens || []).find((x) => x.item_id === aberto) : null
  const planoLote = (() => {
    const subir = [], pulados = { competicao: 0, sem_base: 0, no_liquido: 0 }
    for (const l of itens) {
      if (l.sem_base || l.preco_ideal == null) { pulados.sem_base++; continue }
      if (l.em_competicao) { pulados.competicao++; continue }
      const novo = Math.round(l.preco_ideal * 100) / 100
      if (novo <= l.preco + 0.01) { pulados.no_liquido++; continue }
      subir.push({ item_id: l.item_id, nome: l.nome, sku: l.sku, preco: l.preco, novo, delta: Math.round((novo - l.preco) * 100) / 100 })
    }
    return { subir, pulados }
  })()

  return (
    <div className="space-y-3">
      <PainelIndicadores itens={d.itens || []} />
      <AgenteBar />

      {/* busca + filtros: travados no topo enquanto a lista rola */}
      <div className={selecionado ? 'space-y-2' : 'sticky top-0 z-20 pt-1 pb-2 space-y-2'} style={selecionado ? undefined : { background: 'var(--bg)' }}>
        <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5" style={{ background: 'var(--glass-hover)' }}>
          <Search size={13} className="text-faint" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="buscar por SKU ou nome do produto…" className="bg-transparent text-xs flex-1 outline-none" />
          {busca && <button onClick={() => setBusca('')} className="text-faint hover:text-fg" title="Limpar"><X size={12} /></button>}
        </div>
        <div className="flex gap-1.5 flex-wrap items-center">
          <div className="flex gap-1.5 flex-wrap items-center flex-1" style={{ opacity: q ? 0.5 : 1 }}>
            {filtros.map(([id, t, n]) => (
              <button key={id} onClick={() => setFiltro(id)} className="text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5"
                      style={filtro === id ? { background: LARANJA, color: '#fff' } : { background: 'var(--glass)', color: 'var(--text-dim)', border: '1px solid var(--glass-border)' }}>
                {t} <span className="num" style={{ opacity: .75 }}>{n ?? 0}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setLoteAberto(true)} disabled={planoLote.subir.length === 0} title={planoLote.subir.length === 0 ? 'Nenhum anúncio para subir neste filtro' : 'Subir para netar o Preço Bling em lote'} className="text-xs px-3 py-1.5 rounded-lg font-medium text-white flex items-center gap-1.5 disabled:opacity-40" style={{ background: LARANJA }}>
            <Layers size={12} /> Ajustar em lote{planoLote.subir.length ? ` (${planoLote.subir.length})` : ''}
          </button>
          <button onClick={carregar} className="text-xs px-3 py-1.5 rounded-lg text-dim hover:text-fg flex items-center gap-1"><RefreshCw size={12} /> recalcular</button>
        </div>
      </div>

      <div className={selecionado ? 'grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(400px,480px)] gap-4 items-start' : ''}>
        <div className="min-w-0">
          {itens.length === 0
            ? <Vazio txt={q ? `Nenhum produto encontrado para "${busca}".` : (filtro === 'abaixo' ? 'Nenhum anúncio abaixo do Preço Bling neste filtro.' : filtro === 'prejuizo' ? 'Nenhum produto no prejuízo.' : 'Nenhum produto neste filtro.')} />
            : <div className="space-y-2">
                {itens.map((l) => <ProdutoCard key={l.item_id} l={l} sel={aberto === l.item_id} onAbrir={() => setAberto(l.item_id)} />)}
              </div>}
        </div>
        {selecionado && (
          <div className="min-w-0 xl:sticky xl:top-2">
            <ProdutoDetalhe l={selecionado} onClose={() => setAberto(null)}
              ajustar={ajustar} ajustando={ajustando === selecionado.item_id}
              salvarPrecoBling={salvarPrecoBling} salvandoPreco={salvandoPreco === selecionado.item_id}
              aplicarManual={aplicarManual} aplicandoManual={aplicandoManual === selecionado.item_id} />
          </div>
        )}
      </div>

      {loteAberto && (
        <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,.6)' }} onClick={() => !aplicandoLote && setLoteAberto(false)}>
          <div className="rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}
            style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 'min(560px, 92vw)', background: 'var(--bg)', border: '1px solid var(--glass-border)', boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <Layers size={16} style={{ color: LARANJA }} />
              <div className="text-sm font-bold">Ajustar em lote · netar o Preço Bling</div>
              <button onClick={() => !aplicandoLote && setLoteAberto(false)} className="ml-auto text-faint hover:text-fg"><X size={17} /></button>
            </div>
            <div className="px-4 py-3">
              <div className="text-[13px] mb-2"><b className="num" style={{ color: '#2DD4BF' }}>{planoLote.subir.length}</b> anúncio(s) vão subir de preço pra você receber líquido o Preço Bling.</div>
              {planoLote.subir.length > 0 ? (
                <div className="rounded-lg" style={{ background: 'var(--glass-hover)', maxHeight: '42vh', overflowY: 'auto' }}>
                  {planoLote.subir.map((l, i) => (
                    <div key={l.item_id} className="flex items-center gap-2 px-3 py-2 text-[12px]" style={i < planoLote.subir.length - 1 ? { borderBottom: '1px solid var(--glass-border)' } : undefined}>
                      <div className="min-w-0 flex-1"><div className="truncate">{l.nome}</div><div className="text-[10px] text-faint num">SKU {l.sku}</div></div>
                      <div className="num text-right shrink-0"><span className="text-faint">{brl(l.preco)}</span> <span className="text-faint">→</span> <b style={{ color: '#2DD4BF' }}>{brl(l.novo)}</b><div className="text-[10px]" style={{ color: '#2DD4BF' }}>+{brl(l.delta)}</div></div>
                    </div>
                  ))}
                </div>
              ) : <div className="text-faint text-[12px] rounded-lg px-3 py-3" style={{ background: 'var(--glass-hover)' }}>Nada para subir neste filtro. Filtre por "Abaixo do líquido" ou "Prejuízo" para ver candidatos.</div>}
              {(planoLote.pulados.competicao + planoLote.pulados.sem_base + planoLote.pulados.no_liquido) > 0 && (
                <div className="text-[11px] text-faint mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {planoLote.pulados.competicao > 0 && <span className="inline-flex items-center gap-1"><Target size={11} style={{ color: AZUL_RADAR }} /> {planoLote.pulados.competicao} em competição (Radar)</span>}
                  {planoLote.pulados.sem_base > 0 && <span className="inline-flex items-center gap-1"><HelpCircle size={11} /> {planoLote.pulados.sem_base} sem Preço Bling</span>}
                  {planoLote.pulados.no_liquido > 0 && <span className="inline-flex items-center gap-1"><CheckCircle2 size={11} style={{ color: '#2DD4BF' }} /> {planoLote.pulados.no_liquido} já netando</span>}
                </div>
              )}
              <div className="text-[11px] mt-2.5 flex items-start gap-1.5" style={{ color: 'var(--text-dim)' }}><Info size={13} className="shrink-0 mt-0.5" style={{ color: '#F5A623' }} /> <span>Sobe o preço pra você receber o Preço Bling líquido e deixa os "em competição" com o Radar. Isso altera os preços <b>ao vivo</b> na Shopee.</span></div>
            </div>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
              <button onClick={() => !aplicandoLote && setLoteAberto(false)} className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--glass-hover)', color: 'var(--text-dim)' }}>Cancelar</button>
              <button onClick={() => aplicarLote(planoLote.subir)} disabled={aplicandoLote || planoLote.subir.length === 0} className="text-xs px-4 py-2 rounded-lg font-semibold text-white flex items-center gap-1.5 ml-auto disabled:opacity-50" style={{ background: LARANJA }}>
                {aplicandoLote ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />} Aplicar na Shopee ({planoLote.subir.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProdutoCard({ l, sel, onAbrir }) {
  const st = statusProduto(l)
  const cor = STATUS_PREC[st].cor
  return (
    <button onClick={onAbrir} className="w-full text-left glass rounded-xl overflow-hidden flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[var(--glass-hover)]"
      style={{ borderLeft: `3px solid ${cor}`, ...(sel ? { background: 'color-mix(in srgb, var(--accent) 9%, var(--glass-bg))', borderColor: 'var(--accent)' } : {}) }}>
      <div className="h-11 w-11 rounded-lg overflow-hidden shrink-0 grid place-items-center" style={{ background: 'var(--glass-hover)' }}>
        {l.imagem ? <img src={l.imagem} alt="" className="h-full w-full object-cover" loading="lazy" /> : <ImageIcon size={16} className="text-faint" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm leading-snug" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{l.nome || `#${l.item_id}`}</div>
        <div className="text-[11px] text-faint flex items-center gap-1.5 flex-wrap mt-1">
          <BadgeStatus s={st} />
          {l.em_promocao && <BadgePromo />}
          <span className="num">SKU {l.sku} · {brl(l.preco)}{l.saldo != null ? ` · ${l.saldo} un` : ''}</span>
        </div>
      </div>
      {!l.sem_base && l.liquido != null && (
        <div className="text-right shrink-0 leading-tight">
          <div className="num text-sm font-bold" style={{ color: cor }}>{brl(l.liquido)}</div>
          {l.diferenca != null && <div className="num text-[10px]" style={{ color: cor }}>{l.diferenca >= 0 ? '+' : ''}{brl(l.diferenca)}</div>}
        </div>
      )}
      <ChevronRight size={15} className="text-faint shrink-0" />
    </button>
  )
}

function BarraPosicao({ base, liquido, cor }) {
  const hi = (base * 1.25) || 1
  const pct = (v) => Math.max(0, Math.min(100, v / hi * 100))
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2 flex items-center gap-1.5"><GitCompareArrows size={12} /> Líquido vs Preço Bling</div>
      <div className="relative h-2 rounded-full mt-1" style={{ background: 'linear-gradient(90deg,#FF6F6F,#F5A623 45%,#2DD4BF)' }}>
        <div className="absolute" style={{ left: `${pct(base)}%`, top: -4, bottom: -4, borderLeft: '2px dashed #c98bd8' }} />
        <div className="absolute rounded-full" style={{ left: `calc(${pct(liquido)}% - 7px)`, top: -3, height: 14, width: 14, background: cor, border: '3px solid var(--bg)' }} />
      </div>
      <div className="flex justify-between text-[10px] mt-2">
        <div className="flex flex-col"><span className="text-faint">R$ 0</span></div>
        <div className="flex flex-col items-center" style={{ color: cor }}><span className="text-faint">Líquido hoje</span><span className="num font-bold">{brl(liquido)}</span></div>
        <div className="flex flex-col items-end" style={{ color: '#c98bd8' }}><span className="text-faint">Preço Bling</span><span className="num font-bold">{brl(base)}</span></div>
      </div>
    </div>
  )
}

function ProdutoDetalhe({ l, onClose, ajustar, ajustando, salvarPrecoBling, salvandoPreco, aplicarManual, aplicandoManual }) {
  const [cop, setCop] = useState(false)
  const [precoBlingEdit, setPrecoBlingEdit] = useState('')
  const [precoManual, setPrecoManual] = useState('')
  const st = statusProduto(l)
  const cor = STATUS_PREC[st].cor
  const corDif = l.diferenca == null ? cor : (l.diferenca >= 0 ? '#2DD4BF' : '#FF6F6F')
  const diff = (l.concorrente != null) ? (l.preco - l.concorrente) : null
  const copiarSku = () => { copiarTexto(l.sku); setCop(true); setTimeout(() => setCop(false), 1200) }
  return (
    <div className="glass rounded-2xl overflow-hidden flex flex-col drawer-in" style={{ borderTop: `3px solid ${cor}`, maxHeight: 'calc(100vh - 96px)' }}>
      <div className="flex items-start gap-3 p-4 border-b border-glassb shrink-0">
        <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 grid place-items-center" style={{ background: 'var(--glass-hover)' }}>
          {l.imagem ? <img src={l.imagem} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={18} className="text-faint" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium leading-snug" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{l.nome || `#${l.item_id}`}</div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <BadgeStatus s={st} lg />
            {l.em_promocao && <BadgePromo lg />}
            <span className="text-[11px] text-faint num inline-flex items-center gap-1">SKU {l.sku}
              <span role="button" tabIndex={0} onClick={copiarSku} className="cursor-pointer hover:text-fg inline-flex items-center" title="Copiar SKU">{cop ? <Check size={11} style={{ color: '#2DD4BF' }} /> : <Copy size={11} />}</span>
            </span>
          </div>
        </div>
        <button onClick={onClose} className="text-faint hover:text-fg p-1 shrink-0"><X size={17} /></button>
      </div>

      <div className="p-4 overflow-y-auto space-y-3 text-[12px]">
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-lg px-2 py-2 text-center" style={{ background: 'var(--glass-hover)' }}><div className="text-[8.5px] uppercase tracking-wide text-faint">Preço Shopee</div><div className="num text-[13px] font-bold mt-0.5">{brl(l.preco)}</div></div>
          <div className="rounded-lg px-2 py-2 text-center" style={{ background: 'color-mix(in srgb, var(--accent2) 20%, transparent)' }}><div className="text-[8.5px] uppercase tracking-wide text-faint">Preço Bling</div><div className="num text-[13px] font-bold mt-0.5" style={{ color: '#c98bd8' }}>{l.preco_bling != null ? brl(l.preco_bling) : '—'}</div></div>
          <div className="rounded-lg px-2 py-2 text-center" style={{ background: 'var(--glass-hover)' }}><div className="text-[8.5px] uppercase tracking-wide text-faint">Líquido hoje</div><div className="num text-[13px] font-bold mt-0.5" style={{ color: l.sem_base ? 'var(--text-faint)' : cor }}>{l.liquido != null ? brl(l.liquido) : '—'}</div></div>
          <div className="rounded-lg px-2 py-2 text-center" style={{ background: 'var(--glass-hover)' }}><div className="text-[8.5px] uppercase tracking-wide text-faint">Estoque</div><div className="num text-[13px] mt-0.5">{l.saldo != null ? l.saldo : '—'}</div></div>
        </div>

        {l.em_promocao && (
          <div className="rounded-lg px-3 py-2.5" style={{ background: 'color-mix(in srgb, #F5A623 9%, transparent)', border: '1px solid color-mix(in srgb, #F5A623 28%, transparent)' }}>
            <div className="flex items-center gap-1.5 font-bold text-[12px] mb-1.5" style={{ color: '#F5A623' }}><BadgePercent size={13} /> Em campanha de desconto{l.promo_nome ? `: ${l.promo_nome}` : ''}</div>
            <div className="text-[11px] leading-relaxed text-dim">
              {l.preco_original != null && l.preco_original > l.preco
                ? <>O preço atual <b className="text-fg num">{brl(l.preco)}</b> é o <b>promocional</b>. No preço normal <b className="text-fg num">{brl(l.preco_original)}</b> você {l.cobre_normal ? <b style={{ color: '#2DD4BF' }}>neta o Preço Bling</b> : <b style={{ color: '#FF6F6F' }}>ainda fica abaixo</b>}{l.liquido_normal != null ? <> — líquido <b className="num" style={{ color: l.cobre_normal ? '#2DD4BF' : '#FF6F6F' }}>{brl(l.liquido_normal)}</b></> : ''}. {l.cobre_normal ? 'O "Abaixo do líquido" acima é o desconto, não erro de preço.' : ''}</>
                : <>Este anúncio está em campanha de desconto. O líquido pode estar reduzido pelo preço promocional.</>}
            </div>
          </div>
        )}

        {l.sem_base
          ? <div className="text-faint rounded-lg px-3 py-2.5" style={{ background: 'var(--glass-hover)' }}>Sem Preço Bling cadastrado. Informe abaixo o valor que você quer receber líquido — o cálculo sai na hora.</div>
          : <div className="space-y-1">
              <Quebra label={`Preço na Shopee${l.em_promocao ? ' (promo)' : ''}`} v={brl(l.preco)} forte />
              <Quebra label="− Comissão / taxa Shopee" v={'− ' + brl(l.taxa_shopee)} neg />
              {l.imposto > 0 && <Quebra label="− Imposto" v={'− ' + brl(l.imposto)} neg />}
              {l.embalagem > 0 && <Quebra label="− Embalagem" v={'− ' + brl(l.embalagem)} neg />}
              <div className="h-px my-1" style={{ background: 'var(--glass-border)' }} />
              <Quebra label="= Líquido que você recebe" v={l.liquido != null ? brl(l.liquido) : '—'} forte cor={cor} />
              <Quebra label="Alvo · Preço Bling" v={brl(l.preco_bling)} />
              <div className="h-px my-1" style={{ background: `color-mix(in srgb, ${corDif} 30%, transparent)` }} />
              <Quebra label="Diferença" v={l.diferenca != null ? `${l.diferenca >= 0 ? '+ ' : '− '}${brl(Math.abs(l.diferenca))}` : '— recalcule'} forte cor={corDif} />
            </div>}

        {!l.sem_base && l.preco_bling != null && l.liquido != null && (
          <BarraPosicao base={l.preco_bling} liquido={l.liquido} cor={cor} />
        )}

        {l.monitorado && l.concorrente != null && (
          <div className="rounded-xl p-3" style={{ background: `color-mix(in srgb, ${AZUL_RADAR} 7%, transparent)`, border: `1px solid color-mix(in srgb, ${AZUL_RADAR} 26%, transparent)` }}>
            <div className="flex items-center gap-2 font-semibold text-[12px] mb-2.5" style={{ color: AZUL_RADAR }}><Target size={14} /> Radar de concorrência</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg px-2 py-1.5" style={{ background: 'rgba(0,0,0,.18)' }}><div className="text-[8.5px] uppercase text-faint">Concorrente</div><div className="num text-[13px] font-bold" style={{ color: AZUL_RADAR }}>{brl(l.concorrente)}</div></div>
              <div className="rounded-lg px-2 py-1.5" style={{ background: 'rgba(0,0,0,.18)' }}><div className="text-[8.5px] uppercase text-faint">Sua posição</div><div className="num text-[13px] font-bold">{diff >= 0 ? '+ ' : '− '}{brl(Math.abs(diff))}</div></div>
              <div className="rounded-lg px-2 py-1.5" style={{ background: 'rgba(0,0,0,.18)' }}><div className="text-[8.5px] uppercase text-faint">Agente</div><div className="text-[12px] font-bold" style={{ color: l.em_competicao ? AZUL_RADAR : '#2DD4BF' }}>{l.em_competicao ? 'em espera' : 'monitorando'}</div></div>
            </div>
            {l.em_competicao && l.preco_ideal != null && (
              <div className="text-[11px] leading-relaxed text-dim mt-2.5 flex gap-2"><Info size={13} className="shrink-0 mt-0.5" style={{ color: AZUL_RADAR }} /><span>Subir o preço pra netar o Preço Bling ({brl(l.preco_ideal)}) deixaria você acima do concorrente. No automático o agente fica em espera neste SKU pra manter a competitividade e evitar looping.</span></div>
            )}
          </div>
        )}

        {!l.sem_base && (
          <div>
            <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2 flex items-center gap-1.5"><BadgePercent size={12} /> Corrigir preço na Shopee</div>
            {l.preco_ideal != null && (
              <div className="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 mb-2" style={{ background: 'color-mix(in srgb, #2DD4BF 9%, transparent)', border: '1px solid color-mix(in srgb, #2DD4BF 22%, transparent)' }}>
                <div><div className="text-[10px] text-faint">Preço pra netar o Preço Bling ({brl(l.preco_bling)})</div><div className="num text-base font-bold" style={{ color: '#2DD4BF' }}>{brl(l.preco_ideal)}</div></div>
                <button onClick={() => ajustar(l)} disabled={ajustando} className="text-xs px-3 py-1.5 rounded-lg font-medium text-white flex items-center gap-1.5 disabled:opacity-60 shrink-0" style={{ background: LARANJA }}>
                  {ajustando ? <Loader2 size={13} className="animate-spin" /> : <TrendingUp size={13} />} Aplicar na Shopee
                </button>
              </div>
            )}
            <div className="rounded-lg px-3 py-2.5" style={{ background: 'var(--glass-hover)' }}>
              <div className="text-[10px] uppercase tracking-wide text-faint mb-1.5">Preço manual</div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 rounded-lg px-2 py-1" style={{ background: 'var(--bg)' }}><span className="text-faint">R$</span>
                  <input type="text" inputMode="decimal" value={precoManual} onChange={(e) => setPrecoManual(e.target.value)} placeholder="0,00" className="bg-transparent outline-none num w-16 text-fg" />
                </div>
                <button onClick={() => { aplicarManual?.(l, precoManual); setPrecoManual('') }} disabled={aplicandoManual || !precoManual.trim()} className="text-xs px-2.5 py-1 rounded-lg font-medium text-white flex items-center gap-1 disabled:opacity-50" style={{ background: LARANJA }}>{aplicandoManual ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Aplicar</button>
                <span className="text-faint text-[11px]">define o preço direto na Shopee</span>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-lg px-3 py-2.5" style={{ background: 'var(--glass-hover)' }}>
          <div className="text-[10px] uppercase tracking-wide text-faint mb-1.5">Preço Bling <span className="normal-case font-normal tracking-normal">(líquido alvo · fonte da verdade)</span></div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 rounded-lg px-2 py-1" style={{ background: 'var(--bg)' }}>
              <span className="text-faint">R$</span>
              <input type="text" inputMode="decimal" value={precoBlingEdit} onChange={(e) => setPrecoBlingEdit(e.target.value)} placeholder={l.preco_bling ? brl(l.preco_bling).replace('R$', '').trim() : '0,00'} className="bg-transparent outline-none num w-16 text-fg" />
            </div>
            <button onClick={() => { salvarPrecoBling?.(l, precoBlingEdit); setPrecoBlingEdit('') }} disabled={salvandoPreco || !precoBlingEdit.trim()} className="text-xs px-2.5 py-1 rounded-lg font-medium text-white flex items-center gap-1 disabled:opacity-50" style={{ background: l.sem_base ? '#2DD4BF' : LARANJA }}>
              {salvandoPreco ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} {l.sem_base ? 'Cadastrar' : 'Atualizar'}
            </button>
            {l.preco_bling ? <span className="text-faint">atual {brl(l.preco_bling)}</span> : null}
          </div>
          {l.precobling_editado ? <div className="text-[10px] mt-1" style={{ color: '#2DD4BF' }}>salvo ✓ · recalcule p/ ver o líquido</div> : null}
        </div>
      </div>
    </div>
  )
}


function Quebra({ label, v, neg, forte, cor }) {
  return (
    <div className="flex items-center justify-between">
      <span className={forte ? 'font-medium' : 'text-faint'}>{label}</span>
      <span className="num" style={{ color: cor || (forte ? 'var(--text)' : 'var(--text-dim)'), fontWeight: forte ? 600 : 400 }}>{v}</span>
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

function AbasStatus({ valor, onChange, opcoes }) {
  const op = opcoes || [['ongoing', 'Ativos'], ['upcoming', 'Agendados'], ['expired', 'Expirados']]
  return (
    <div className="flex gap-1.5">
      {op.map(([id, t]) => (
        <button key={String(id)} onClick={() => onChange(id)} className="text-xs px-3 py-1.5 rounded-lg font-medium"
                style={valor === id ? { background: LARANJA, color: '#fff' } : { background: 'var(--glass)', color: 'var(--text-dim)', border: '1px solid var(--glass-border)' }}>{t}</button>
      ))}
    </div>
  )
}

function Cupons({ notify }) {
  const [lista, setLista] = useState(null)
  const [form, setForm] = useState(false)
  const [rep, setRep] = useState(null)
  const [enc, setEnc] = useState(null)
  const [stat, setStat] = useState('ongoing')
  const carregar = () => { setLista(null); api.shopeeCupons(stat).then(setLista).catch(() => setLista({ erro: true })) }
  useEffect(carregar, [stat])
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
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <AbasStatus valor={stat} onChange={setStat} />
        <button onClick={() => setForm(true)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-white flex items-center gap-1.5" style={{ background: LARANJA }}><Plus size={14} /> Novo cupom</button>
      </div>
      {lista === null ? <Carregando txt="carregando cupons…" />
        : cupons.length === 0 ? <Vazio txt={stat === 'ongoing' ? 'Nenhum cupom ativo. Crie um para incentivar a compra.' : stat === 'upcoming' ? 'Nenhum cupom agendado.' : 'Nenhum cupom expirado no histórico recente.'} />
        : <div className="space-y-2.5">{cupons.map((c) => {
            const flags = [{ icon: Ticket, texto: c.voucher_code, cor: '#8B5CF6' },
              { texto: c.reward_type === 2 ? `${c.percentage}% OFF` : brl(c.discount_amount), cor: LARANJA }]
            if (c.min_basket_price) flags.push({ texto: `mín ${brl(c.min_basket_price)}` })
            flags.push({ texto: (c.voucher_type_id === 1 || !c.voucher_type_id) ? 'loja inteira' : 'produtos específicos' })
            return (
              <CampaignCard key={c.voucher_id} tipo="cupom" id={c.voucher_id} nome={c.voucher_name}
                inicio={c.start_time} fim={c.end_time} flags={flags} temProdutos={false}
                podeEncerrar={stat !== 'expired'} onEncerrar={encerrar} encerrando={enc === c.voucher_id}
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
  return qs.length === 0 ? <Vazio txt="Nenhuma pergunta sem resposta." />
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
      {lista.length === 0 ? <Vazio txt="Nenhuma devolução no período." />
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
  const [stat, setStat] = useState('ongoing')
  const carregar = () => { setLista(null); api.shopeeBundles(stat).then(setLista).catch(() => setLista({ erro: true })) }
  useEffect(carregar, [stat])
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
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <AbasStatus valor={stat} onChange={setStat} />
        <button onClick={() => setForm(true)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-white flex items-center gap-1.5" style={{ background: LARANJA }}><Plus size={14} /> Novo bundle</button>
      </div>
      {lista === null ? <Carregando txt="carregando bundles…" />
        : bs.length === 0 ? <Vazio txt={stat === 'ongoing' ? 'Nenhum combo ativo. Crie um na aba acima — leve 2+ por um preço melhor.' : stat === 'upcoming' ? 'Nenhum combo agendado.' : 'Nenhum combo expirado no histórico recente.'} />
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
                podeEncerrar={stat !== 'expired'} onEncerrar={encerrar} encerrando={enc === b.bundle_deal_id}
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
  const [stat, setStat] = useState('ongoing')
  const carregar = () => { setLista(null); api.shopeeAddons(stat).then(setLista).catch(() => setLista({ erro: true })) }
  useEffect(carregar, [stat])
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
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <AbasStatus valor={stat} onChange={setStat} />
        <button onClick={() => setForm(true)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-white flex items-center gap-1.5" style={{ background: LARANJA }}><Plus size={14} /> Novo add-on</button>
      </div>
      {lista === null ? <Carregando txt="carregando add-ons…" />
        : as.length === 0 ? <Vazio txt={stat === 'ongoing' ? 'Nenhum add-on ativo. Crie um na aba acima — adicional com desconto junto do principal.' : stat === 'upcoming' ? 'Nenhum add-on agendado.' : 'Nenhum add-on expirado no histórico recente.'} />
        : <div className="space-y-2.5">{as.map((a) => (
            <CampaignCard key={a.add_on_deal_id} tipo="addon" id={a.add_on_deal_id} nome={a.add_on_deal_name}
              inicio={a.start_time} fim={a.end_time}
              podeEncerrar={stat !== 'expired'} onEncerrar={encerrar} encerrando={enc === a.add_on_deal_id}
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
  const [stat, setStat] = useState(2)
  const carregar = () => { setLista(null); api.shopeeFlash(stat).then(setLista).catch(() => setLista({ erro: true })) }
  useEffect(carregar, [stat])
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
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <AbasStatus valor={stat} onChange={setStat} opcoes={[[2, 'Ativos'], [1, 'Agendados'], [3, 'Expirados']]} />
        <button onClick={() => setForm(true)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-white flex items-center gap-1.5" style={{ background: LARANJA }}><Flame size={14} /> Nova flash sale</button>
      </div>
      {lista === null ? <Carregando txt="carregando flash sales…" />
        : arr.length === 0 ? <Vazio txt={stat === 2 ? 'Nenhuma flash sale ativa agora. A Shopee libera slots por elegibilidade da loja.' : stat === 1 ? 'Nenhuma flash sale agendada.' : 'Nenhuma flash sale expirada no histórico recente.'} />
        : <div className="space-y-2.5">{arr.map((s) => (
            <CampaignCard key={s.flash_sale_id} tipo="flash" id={s.flash_sale_id} nome={`Flash #${s.flash_sale_id}`}
              inicio={s.start_time} fim={s.end_time}
              flags={[{ icon: Zap, texto: 'oferta relâmpago', cor: '#F59E0B' }]}
              podeEncerrar={stat !== 3} onEncerrar={encerrar} encerrando={enc === s.flash_sale_id} />
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
