import { useState, useEffect } from 'react'
import {
  Percent, Ticket, Layers, PlusCircle, Zap, Clock, Calendar, Package, ChevronRight,
  ChevronDown, RotateCcw, Trash2, Loader2, Flame, Hourglass, ImageIcon,
  TrendingUp, ShoppingBag, BarChart3, Target,
} from 'lucide-react'
import { api } from './api'

const LARANJA = '#EE4D2D'

/* ----------------------------- helpers de tempo --------------------------- */
export function useAgora(intervalo = 1000) {
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), intervalo); return () => clearInterval(t) }, [intervalo])
  return agora
}
export const fmtData = (ts) => ts ? new Date(ts * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'
export const fmtDataHora = (ts) => ts ? new Date(ts * 1000).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
export function fmtDur(ms) {
  if (ms <= 0) return '0s'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), seg = s % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${seg}s`
  if (m > 0) return `${m}m ${seg}s`
  return `${seg}s`
}
function cicloInfo(inicio, fim, agora) {
  const ini = (inicio || 0) * 1000, end = (fim || 0) * 1000
  if (!ini || !end) return { fase: 'desconhecida', pctDecorrido: 0, pctRestante: 0, restante: 0, paraInicio: 0, dur: 0 }
  const dur = Math.max(1, end - ini)
  if (agora < ini) return { fase: 'agendada', pctDecorrido: 0, pctRestante: 100, restante: end - agora, paraInicio: ini - agora, dur }
  if (agora >= end) return { fase: 'encerrada', pctDecorrido: 100, pctRestante: 0, restante: 0, paraInicio: 0, dur }
  const dec = Math.min(100, Math.max(0, ((agora - ini) / dur) * 100))
  return { fase: 'ativa', pctDecorrido: dec, pctRestante: 100 - dec, restante: end - agora, paraInicio: 0, dur }
}
const money2 = (v) => v == null ? '—' : 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/* ------------------------- anel de tempo (datacenter) --------------------- */
function RingTempo({ pct, cor, valorCentro, sublabel, pulsar }) {
  const R = 30, C = 2 * Math.PI * R
  const off = C * (1 - Math.max(0, Math.min(100, pct)) / 100)
  return (
    <div className="relative shrink-0" style={{ width: 78, height: 78 }}>
      <svg width="78" height="78" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="39" cy="39" r={R} fill="none" stroke="var(--glass-hover)" strokeWidth="6" />
        <circle cx="39" cy="39" r={R} fill="none" stroke={cor} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset 1s linear, stroke .4s' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-sm font-bold leading-none num" style={{ color: cor }}>{valorCentro}</div>
          {sublabel && <div className="text-[8px] text-faint mt-0.5 uppercase tracking-wide">{sublabel}</div>}
        </div>
      </div>
      {pulsar && <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70" style={{ background: cor }} />
        <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: cor }} />
      </span>}
    </div>
  )
}

/* --------------------------- produtos da campanha ------------------------- */
function CampaignProdutos({ tipo, detalhe, carregando }) {
  if (carregando) return <div className="py-4 text-center text-xs text-faint flex items-center justify-center gap-2"><Loader2 size={13} className="animate-spin" /> buscando produtos da campanha…</div>
  if (!detalhe || detalhe.erro) return <div className="py-3 text-center text-xs text-faint">Não consegui carregar os produtos desta campanha.</div>
  const chip = (p, i, sufixo) => (
    <div key={(p.item_id || i) + (sufixo || '')} className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: 'var(--glass-hover)' }}>
      {p.imagem
        ? <img src={p.imagem} alt="" className="h-9 w-9 rounded-md object-cover shrink-0" />
        : <div className="h-9 w-9 rounded-md grid place-items-center shrink-0" style={{ background: 'var(--glass)' }}><ImageIcon size={14} className="text-faint" /></div>}
      <div className="min-w-0 flex-1">
        <div className="text-xs truncate">{p.nome}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {p.preco_original && p.preco_promo && p.preco_original !== p.preco_promo && <span className="text-[10px] text-faint line-through num">{money2(p.preco_original)}</span>}
          {p.preco_promo != null && <span className="text-[11px] font-semibold num" style={{ color: LARANJA }}>{money2(p.preco_promo)}</span>}
          {p.desconto_pct != null && <span className="text-[9px] px-1 py-0.5 rounded num" style={{ background: 'rgba(238,77,45,.14)', color: LARANJA }}>-{p.desconto_pct}%</span>}
          {p.estoque != null && <span className="text-[9px] text-faint num">{p.estoque} un</span>}
          {p.variacoes > 1 && <span className="text-[9px] text-faint">{p.variacoes} var.</span>}
        </div>
      </div>
    </div>
  )
  if (tipo === 'addon') {
    return (
      <div className="space-y-2">
        {detalhe.principais?.length > 0 && <div><div className="text-[10px] text-faint uppercase tracking-wide mb-1">Produto principal</div><div className="grid sm:grid-cols-2 gap-1.5">{detalhe.principais.map((p, i) => chip(p, i, 'p'))}</div></div>}
        {detalhe.adicionais?.length > 0 && <div><div className="text-[10px] text-faint uppercase tracking-wide mb-1 mt-2">Adicionais com desconto</div><div className="grid sm:grid-cols-2 gap-1.5">{detalhe.adicionais.map((p, i) => chip(p, i, 's'))}</div></div>}
        {!detalhe.principais?.length && !detalhe.adicionais?.length && <div className="text-xs text-faint py-2 text-center">Nenhum produto vinculado — a campanha pode ter nascido vazia.</div>}
      </div>
    )
  }
  const itens = detalhe.itens || []
  if (!itens.length) return <div className="text-xs text-faint py-2 text-center">Nenhum produto vinculado — a campanha pode ter nascido vazia. Recrie pela aba ou pelo Motor.</div>
  return <div className="grid sm:grid-cols-2 gap-1.5">{itens.map((p, i) => chip(p, i))}</div>
}

const TIPO_META = {
  desconto: { rotulo: 'Desconto', icon: Percent, cor: '#EE4D2D' },
  cupom: { rotulo: 'Cupom', icon: Ticket, cor: '#8B5CF6' },
  bundle: { rotulo: 'Combo', icon: Layers, cor: '#14B8A6' },
  addon: { rotulo: 'Add-on', icon: PlusCircle, cor: '#3B82F6' },
  flash: { rotulo: 'Flash', icon: Zap, cor: '#F59E0B' },
}
const FASE_META = {
  agendada: { txt: 'AGENDADA', bg: 'rgba(59,130,246,.15)', fg: '#60A5FA' },
  ativa: { txt: 'ATIVA', bg: 'rgba(20,184,166,.15)', fg: '#2DD4BF' },
  encerrada: { txt: 'ENCERRADA', bg: 'var(--glass-hover)', fg: 'var(--text-faint)' },
  desconhecida: { txt: '—', bg: 'var(--glass-hover)', fg: 'var(--text-faint)' },
}

export function CampaignCard({ tipo, id, nome, inicio, fim, flags = [], temProdutos = true, podeEncerrar, onEncerrar, onRepetir, repetindo, encerrando }) {
  const agora = useAgora(1000)
  const ciclo = cicloInfo(inicio, fim, agora)
  const meta = TIPO_META[tipo] || TIPO_META.desconto
  const Icon = meta.icon
  const fase = FASE_META[ciclo.fase] || FASE_META.desconhecida
  const [aberto, setAberto] = useState(false)
  const [detalhe, setDetalhe] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [desemp, setDesemp] = useState(null)
  const [carregDesemp, setCarregDesemp] = useState(false)
  const [mostraDesemp, setMostraDesemp] = useState(false)

  const carregarDesemp = async () => {
    if (mostraDesemp) { setMostraDesemp(false); return }
    setMostraDesemp(true)
    if (desemp) return
    setCarregDesemp(true)
    try { setDesemp(await api.shopeeCampanhaDesempenho(tipo, id)) }
    catch (e) { setDesemp({ erro: e.message || true }) }
    setCarregDesemp(false)
  }

  const urgente = ciclo.fase === 'ativa' && ciclo.restante < 2 * 3600 * 1000
  const terminaHoje = ciclo.fase === 'ativa' && ciclo.restante < 24 * 3600 * 1000
  const corTempo = ciclo.fase === 'encerrada' ? 'var(--text-faint)'
    : ciclo.fase === 'agendada' ? '#60A5FA'
    : urgente ? '#FF6F6F' : terminaHoje ? '#E6B450' : meta.cor

  const ringPct = ciclo.fase === 'agendada' ? 100 : ciclo.pctRestante
  const ringCentro = ciclo.fase === 'encerrada' ? 'fim' : `${Math.round(ciclo.pctRestante)}%`
  const ringSub = ciclo.fase === 'agendada' ? 'p/ iniciar' : ciclo.fase === 'encerrada' ? '' : 'restante'

  const toggleProdutos = async () => {
    if (!temProdutos) return
    if (aberto) { setAberto(false); return }
    setAberto(true)
    if (detalhe) return
    setCarregando(true)
    try { setDetalhe(await api.shopeeCampanhaDetalhe(tipo, id)) }
    catch { setDetalhe({ erro: true }) }
    setCarregando(false)
  }

  return (
    <div className="glass rounded-2xl overflow-hidden" style={{ borderLeft: `3px solid ${meta.cor}` }}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ background: `color-mix(in srgb, ${meta.cor} 16%, transparent)` }}>
            <Icon size={19} style={{ color: meta.cor }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold truncate" style={{ maxWidth: '55%' }}>{nome || meta.rotulo}</span>
              <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded font-bold" style={{ background: `color-mix(in srgb, ${meta.cor} 16%, transparent)`, color: meta.cor }}>{meta.rotulo}</span>
              <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded font-bold flex items-center gap-1" style={{ background: fase.bg, color: fase.fg }}>
                {ciclo.fase === 'ativa' && <span className="h-1.5 w-1.5 rounded-full" style={{ background: fase.fg }} />}{fase.txt}
              </span>
              {urgente && <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded font-bold flex items-center gap-1" style={{ background: 'rgba(255,111,111,.16)', color: '#FF6F6F' }}><Flame size={9} /> TERMINANDO</span>}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-faint mt-1 flex-wrap">
              <Calendar size={11} /> {fmtDataHora(inicio)} <ChevronRight size={10} /> {fmtDataHora(fim)}
              <span className="text-faint">· dura {fmtDur(ciclo.dur)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onRepetir && (
              <button onClick={() => onRepetir({ tipo, id, nome, inicio, fim })} disabled={repetindo} title="Repetir campanha (novo período)"
                      className="h-8 px-2 rounded-lg glass text-dim hover:text-fg flex items-center gap-1 text-[11px] font-medium disabled:opacity-50">
                {repetindo ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Repetir
              </button>
            )}
            {podeEncerrar && onEncerrar && (
              <button onClick={() => onEncerrar(id)} disabled={encerrando} title="Encerrar campanha"
                      className="h-8 w-8 grid place-items-center rounded-lg glass text-faint hover:text-danger disabled:opacity-50">
                {encerrando ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3">
          <div className="flex-1 min-w-0">
            {flags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {flags.map((f, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 font-medium"
                        style={{ background: f.cor ? `color-mix(in srgb, ${f.cor} 14%, transparent)` : 'var(--glass-hover)', color: f.cor || 'var(--text-dim)' }}>
                    {f.icon && <f.icon size={10} />}{f.texto}
                  </span>
                ))}
              </div>
            )}
            <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--glass-hover)' }}>
              <div className="h-full rounded-full" style={{ width: `${ciclo.pctDecorrido}%`, background: `linear-gradient(90deg, ${meta.cor}, ${corTempo})`, transition: 'width 1s linear' }} />
            </div>
            <div className="flex items-center justify-between mt-1.5 gap-2">
              <span className="text-[10px] text-faint">{ciclo.fase === 'agendada' ? 'aguardando início' : ciclo.fase === 'encerrada' ? 'campanha encerrada' : 'em andamento'}</span>
              <span className="text-[11px] font-semibold flex items-center gap-1" style={{ color: corTempo }}>
                {ciclo.fase === 'agendada' ? <><Hourglass size={11} /> começa em {fmtDur(ciclo.paraInicio)}</>
                  : ciclo.fase === 'encerrada' ? <>encerrada</>
                  : <><Clock size={11} /> expira em {fmtDur(ciclo.restante)}</>}
              </span>
            </div>
          </div>
          <RingTempo pct={ringPct} cor={corTempo} valorCentro={ringCentro} sublabel={ringSub} pulsar={ciclo.fase === 'ativa'} />
        </div>

        {(temProdutos || ciclo.fase !== 'agendada') && (
          <div className="flex items-center gap-2 mt-3">
            {temProdutos && (
              <button onClick={toggleProdutos} className="flex-1 flex items-center justify-center gap-1.5 text-[11px] text-dim hover:text-fg py-1.5 rounded-lg" style={{ background: 'var(--glass-hover)' }}>
                <Package size={12} /> {aberto ? 'ocultar produtos' : 'produtos'}
                <ChevronDown size={12} style={{ transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
              </button>
            )}
            {temProdutos && ciclo.fase !== 'agendada' && (
              <button onClick={carregarDesemp} className="flex-1 flex items-center justify-center gap-1.5 text-[11px] py-1.5 rounded-lg font-medium"
                      style={{ background: mostraDesemp ? `color-mix(in srgb, ${meta.cor} 18%, transparent)` : 'var(--glass-hover)', color: mostraDesemp ? meta.cor : 'var(--text-dim)' }}>
                <BarChart3 size={12} /> {mostraDesemp ? 'ocultar desempenho' : 'desempenho'}
                <ChevronDown size={12} style={{ transform: mostraDesemp ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
              </button>
            )}
          </div>
        )}

        {mostraDesemp && (
          <div className="mt-2">
            <DesempenhoPainel d={desemp} carregando={carregDesemp} cor={meta.cor} id={id} />
          </div>
        )}
      </div>
      {aberto && temProdutos && (
        <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: 'var(--glass-border)' }}>
          <CampaignProdutos tipo={tipo} detalhe={detalhe} carregando={carregando} />
        </div>
      )}
    </div>
  )
}

const brlD = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
function MetricaD({ icon: Icon, valor, rotulo, cor }) {
  return (
    <div className="rounded-lg px-2.5 py-2 text-center" style={{ background: 'var(--glass-hover)' }}>
      <Icon size={13} className="mx-auto mb-1" style={{ color: cor }} />
      <div className="text-sm font-bold num leading-none" style={{ color: cor }}>{valor}</div>
      <div className="text-[9px] text-faint mt-0.5 uppercase tracking-wide">{rotulo}</div>
    </div>
  )
}
function DesempenhoPainel({ d, carregando, cor, id }) {
  if (carregando) return <div className="py-4 text-center text-xs text-faint flex items-center justify-center gap-2"><Loader2 size={13} className="animate-spin" /> cruzando com os pedidos do período…</div>
  if (!d) return null
  if (d.erro) return <div className="py-2 text-center text-xs" style={{ color: 'var(--danger, #FF6F6F)' }}>{typeof d.erro === 'string' ? d.erro : 'Não consegui calcular o desempenho.'}</div>
  if (d.indisponivel) return <div className="py-2 text-center text-xs text-faint">{d.motivo}</div>
  const conversao = d.pedidos_no_periodo ? Math.round((d.pedidos_com_produto / d.pedidos_no_periodo) * 100) : null
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--glass)', border: `1px solid color-mix(in srgb, ${cor} 25%, transparent)` }}>
      <div className="grid grid-cols-4 gap-1.5">
        <MetricaD icon={ShoppingBag} valor={d.unidades} rotulo="vendidos" cor={cor} />
        <MetricaD icon={TrendingUp} valor={brlD(d.receita)} rotulo="receita" cor={cor} />
        <MetricaD icon={Package} valor={d.pedidos_com_produto} rotulo="pedidos" cor={cor} />
        <MetricaD icon={Target} valor={brlD(d.ticket_medio)} rotulo="ticket médio" cor={cor} />
      </div>
      <div className="text-[10px] text-faint mt-2 leading-relaxed">
        {d.atribuido_promo > 0
          ? <><b style={{ color: cor }}>{d.atribuido_promo}</b> unidade(s) confirmadas pela própria promoção. </>
          : null}
        Vendas dos produtos da campanha entre o início e agora{conversao != null ? `, de ${d.pedidos_no_periodo} pedidos no período (${conversao}% tocaram a campanha)` : ''}.
        {d.parcial && ' Período grande — amostra parcial dos pedidos.'}
      </div>
    </div>
  )
}
