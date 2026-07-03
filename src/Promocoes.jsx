import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Tag, Percent, Ticket, Boxes, Flame, Sparkles, Zap, Cpu, Scale, Target,
  Landmark, Gauge, Wallet, Shield, Power, Ban, TrendingUp, TrendingDown, Layers,
  Calendar, Clock, Plus, ChevronRight, Crown, Activity, Loader2, RefreshCw, Plug,
  Info, Gift, ArrowRight, SlidersHorizontal, Search, CircleDollarSign, BarChart3,
} from 'lucide-react'
import { api } from './api'
import { useToast } from './toast.jsx'

const ML = '#F2C200'
const BLUE = '#5B8DEF'
const PURPLE = '#a06be8'

// Metadados de cada tipo de promoção da API do ML (rótulo, ícone, cor, família, descrição).
const TIPO = {
  SELLER_CAMPAIGN: { label: 'Campanha de %', icon: Tag, cor: 'var(--accent)', fam: 'cria', desc: 'Desconto percentual que você gerencia' },
  PRICE_DISCOUNT: { label: 'Desconto individual', icon: Percent, cor: BLUE, fam: 'cria', desc: 'Oferta por item, aplicada uma a uma' },
  SELLER_COUPON_CAMPAIGN: { label: 'Cupom', icon: Ticket, cor: ML, fam: 'cria', desc: 'Cumulativo com a promoção ativa' },
  VOLUME: { label: 'Desconto por quantidade', icon: Boxes, cor: 'var(--ok)', fam: 'cria', desc: 'Leve N, condições especiais' },
  DEAL: { label: 'Campanha tradicional', icon: Flame, cor: ML, fam: 'adere', desc: 'Promoção organizada pelo ML' },
  MARKETPLACE_CAMPAIGN: { label: 'Campanha com o ML', icon: Sparkles, cor: BLUE, fam: 'adere', desc: 'O ML subsidia parte do desconto' },
  DOD: { label: 'Oferta do Dia', icon: Flame, cor: ML, fam: 'adere', desc: 'Vitrine de destaque por 24h' },
  LIGHTNING: { label: 'Oferta Relâmpago', icon: Zap, cor: ML, fam: 'adere', desc: 'Estoque reservado, poucas horas' },
  SMART: { label: 'SMART', icon: Cpu, cor: PURPLE, fam: 'adere', desc: 'Coparticipação com seleção automática' },
  PRICE_MATCHING: { label: 'Price Matching', icon: Scale, cor: BLUE, fam: 'adere', desc: 'Alinha o preço à concorrência' },
  PRICE_MATCHING_MELI_ALL: { label: 'Price Matching (100% ML)', icon: Scale, cor: 'var(--ok)', fam: 'adere', desc: 'Totalmente custeado pelo ML' },
  PRE_NEGOTIATED: { label: 'Pré-negociado', icon: Target, cor: PURPLE, fam: 'adere', desc: 'Acordo comercial por item' },
  UNHEALTHY_STOCK: { label: 'Liquidação Full', icon: Boxes, cor: ML, fam: 'adere', desc: 'Liquidar estoque parado no Full' },
  BANK: { label: 'PIX cofinanciado', icon: Landmark, cor: BLUE, fam: 'adere', desc: 'Desconto no PIX bancado em parte' },
}
const meta = (t) => TIPO[t] || { label: t || '—', icon: Tag, cor: 'var(--dim)', fam: 'adere', desc: 'Promoção do Mercado Livre' }

const ST = {
  started: { t: 'Ativa', c: 'var(--ok)' }, active: { t: 'Ativa', c: 'var(--ok)' },
  pending: { t: 'Agendada', c: BLUE }, candidate: { t: 'Disponível', c: ML },
  finished: { t: 'Encerrada', c: 'var(--faint)' },
}
const stInfo = (s) => ST[s] || { t: s || '—', c: 'var(--dim)' }

const brl = (v) => v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dcurta = (s) => { if (!s) return null; try { return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) } catch { return null } }
const diasAte = (s) => { if (!s) return null; try { return Math.ceil((new Date(s) - new Date()) / 86400000) } catch { return null } }
const pctTempo = (ini, fim) => {
  try { const a = new Date(ini), b = new Date(fim), n = new Date(); if (b <= a) return 0
    return Math.max(0, Math.min(100, ((n - a) / (b - a)) * 100)) } catch { return 0 }
}

export default function Promocoes() {
  const notify = useToast()
  const [estado, setEstado] = useState('carregando')
  const [painel, setPainel] = useState(null)
  const [aba, setAba] = useState('visao')
  const [gov, setGov] = useState(() => { try { return JSON.parse(localStorage.getItem('promo_gov') || '{}') } catch { return {} } })

  const carregar = useCallback(async () => {
    setEstado('carregando')
    try { const p = await api.mlPromocoesPainel(); setPainel(p); setEstado('ok') }
    catch (e) {
      if (/não conectado|nao conectado|conecte/i.test(e.message || '')) setEstado('desconectado')
      else { setEstado('erro'); notify(e.message || 'Falha ao carregar promoções', 'danger') }
    }
  }, [notify])
  useEffect(() => { carregar() }, [carregar])

  const setGovK = (k) => { const n = { ...gov, [k]: !gov[k] }; setGov(n); localStorage.setItem('promo_gov', JSON.stringify(n)) }
  const emBreve = (o) => notify(`${o}: chega na próxima etapa (ações de escrita).`, 'warn')

  const convites = painel?.convites || []
  const minhas = (painel?.minhas || []).filter((m) => m.type !== 'SELLER_COUPON_CAMPAIGN')
  const cupons = (painel?.minhas || []).filter((m) => m.type === 'SELLER_COUPON_CAMPAIGN')
  const cont = painel?.contagens || {}
  const totalItensPromo = null // agregação por itens entra na Etapa 3

  if (estado === 'desconectado') return <Desconectado onReload={carregar} />

  return (
    <div className="max-w-[1240px] mx-auto pb-16">
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-xl grid place-items-center text-white flex-none" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', boxShadow: '0 6px 16px rgba(214,0,127,.35)' }}><Tag size={18} /></div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 20, fontWeight: 700 }}>Central de promoções</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(242,194,0,.16)', color: ML }}>Mercado Livre</span>
          </div>
          <div className="text-[11.5px] text-faint mt-0.5">Campanhas, cupons e ofertas — líquido real (net_proceeds), elasticidade e trava de margem no Preço Bling</div>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <button onClick={carregar} className="text-xs px-2.5 py-2 rounded-lg glass text-dim hover:text-fg inline-flex items-center gap-1.5"><RefreshCw size={14} className={estado === 'carregando' ? 'animate-spin' : ''} /> Atualizar</button>
          <button onClick={() => setAba('inteligencia')} className="text-xs px-3 py-2 rounded-lg glass text-dim hover:text-fg inline-flex items-center gap-1.5"><Calendar size={14} /> Calendário</button>
          <button onClick={() => emBreve('Novo cupom')} className="text-xs px-3 py-2 rounded-lg glass text-dim hover:text-fg inline-flex items-center gap-1.5"><Ticket size={14} /> Novo cupom</button>
          <button onClick={() => emBreve('Nova campanha')} className="text-xs px-3 py-2 rounded-lg inline-flex items-center gap-1.5 text-white font-semibold" style={{ background: 'linear-gradient(135deg, var(--accent), #a80063)' }}><Plus size={14} /> Nova campanha</button>
        </div>
      </div>
      <div className="h-px my-3" style={{ background: 'linear-gradient(90deg, var(--accent), transparent 60%)' }} />

      {/* TABS */}
      <div className="flex gap-1.5 p-1.5 rounded-2xl flex-wrap" style={{ background: 'rgba(0,0,0,.28)', border: '1px solid var(--glass-border)' }}>
        {[
          ['visao', 'Visão geral', Sparkles, null],
          ['minhas', 'Minhas campanhas', Tag, minhas.length],
          ['convites', 'Convites do ML', Zap, convites.length],
          ['cupons', 'Cupons', Ticket, cupons.length],
          ['inteligencia', 'Inteligência', Activity, null],
          ['automacao', 'Automação', Cpu, 6],
          ['ads', 'Ads', Target, null],
        ].map(([id, lb, Ic, n]) => (
          <button key={id} onClick={() => setAba(id)} className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
            style={aba === id ? { background: 'linear-gradient(135deg, rgba(214,0,127,.92), rgba(214,0,127,.6))', color: '#fff', boxShadow: '0 6px 18px rgba(214,0,127,.35), inset 0 0 0 1px rgba(255,255,255,.12)' } : { color: 'var(--dim)' }}>
            <Ic size={14} /> {lb}
            {n != null && <span className="text-[10px] font-extrabold px-1.5 rounded-full num" style={{ background: aba === id ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.08)' }}>{n}</span>}
          </button>
        ))}
      </div>

      {/* GOVERNANÇA */}
      <div className="flex items-center gap-3.5 flex-wrap rounded-2xl px-4 py-3 mt-3.5" style={{ background: 'linear-gradient(158deg, rgba(47,217,141,.08), rgba(0,0,0,.15))', border: '1px solid rgba(47,217,141,.28)' }}>
        <span className="text-[11px] font-extrabold inline-flex items-center gap-1.5" style={{ color: 'var(--ok)' }}><Shield size={13} /> Governança &amp; margem</span>
        <span className="text-[11px] text-dim">Nunca abaixo do <b style={{ color: 'var(--text)' }}>Preço Bling</b> (líquido-alvo)</span>
        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1.5" style={{ background: painel?.exclusao_ativa ? 'rgba(255,122,122,.12)' : 'rgba(255,255,255,.06)', color: painel?.exclusao_ativa ? 'var(--danger)' : 'var(--faint)' }}><Ban size={11} /> Lista de exclusão {painel?.exclusao_ativa == null ? '—' : painel?.exclusao_ativa ? 'ativa' : 'inativa'}</span>
        <div className="ml-auto flex items-center gap-3.5 flex-wrap">
          <SwitchLabel on={gov.kill} onClick={() => setGovK('kill')} icon={Power} label="Kill switch global" />
          <SwitchLabel on={gov.cont} onClick={() => setGovK('cont')} label="Auto-continuar" />
          <SwitchLabel on={gov.rev} onClick={() => setGovK('rev')} label="Reverter se margem < piso" />
        </div>
      </div>

      {estado === 'carregando' && !painel && <div className="text-dim text-sm flex items-center gap-2 p-6"><Loader2 size={16} className="animate-spin" /> Carregando promoções…</div>}

      {painel && (aba === 'visao' || aba === 'minhas' || aba === 'convites' || aba === 'cupons') && (
        <>
          {aba === 'visao' && (
            <>
              <div className="grid grid-cols-6 gap-3 mt-4">
                <Kpi icon={Tag} label="Minhas campanhas" valor={cont.minhas ?? 0} sub={`${cont.ativas ?? 0} ativas agora`} />
                <Kpi icon={Zap} label="Convites do ML" valor={cont.convites ?? 0} sub="oportunidades" subcor={ML} />
                <Kpi icon={Gift} label="Coparticipados" valor={cont.coparticipadas ?? 0} sub="ML subsidia parte" hero />
                <Kpi icon={Ticket} label="Cupons" valor={cupons.length} sub="ativos / agendados" />
                <Kpi icon={CircleDollarSign} label="Líquido real" valor="em breve" sub="net_proceeds · Etapa 3" prof />
                <Kpi icon={Shield} label="Governança" valor={painel.exclusao_ativa == null ? '—' : painel.exclusao_ativa ? 'ON' : 'OFF'} sub="exclusão do ML" />
              </div>
              <Distribuicao convites={convites.length} minhas={minhas.length} cupons={cupons.length} />
              <Simulador notify={notify} />
              <SecConvites convites={convites} onAderir={() => emBreve('Aderir ao convite')} />
              <SecMinhas minhas={minhas} onAcao={emBreve} />
              <SecCupons cupons={cupons} onAcao={emBreve} />
              <Calendario minhas={minhas} cupons={cupons} convites={convites} />
            </>
          )}
          {aba === 'minhas' && <SecMinhas minhas={minhas} onAcao={emBreve} full />}
          {aba === 'convites' && <SecConvites convites={convites} onAderir={() => emBreve('Aderir ao convite')} full />}
          {aba === 'cupons' && <SecCupons cupons={cupons} onAcao={emBreve} full />}
        </>
      )}

      {aba === 'inteligencia' && <Inteligencia minhas={minhas} cupons={cupons} convites={convites} />}
      {aba === 'automacao' && <Automacao />}
      {aba === 'ads' && <Ads />}
    </div>
  )
}

/* ================= componentes de layout ================= */

function SwitchLabel({ on, onClick, icon: Ic, label }) {
  return (
    <button onClick={onClick} className="text-[11px] text-dim inline-flex items-center gap-1.5">
      {Ic && <Ic size={12} />} {label}
      <span className="relative inline-block" style={{ width: 34, height: 19, borderRadius: 999, background: on ? 'rgba(47,217,141,.5)' : 'rgba(255,255,255,.12)', transition: 'background .15s' }}>
        <span className="absolute rounded-full bg-white" style={{ width: 15, height: 15, top: 2, left: on ? 17 : 2, transition: 'left .15s' }} />
      </span>
    </button>
  )
}

function Kpi({ icon: Ic, label, valor, sub, subcor, hero, prof }) {
  const bg = hero ? 'linear-gradient(160deg, rgba(47,217,141,.12), rgba(47,217,141,.03))'
    : prof ? 'linear-gradient(160deg, rgba(160,107,232,.12), rgba(160,107,232,.03))'
    : 'var(--glass-bg)'
  const bd = hero ? 'rgba(47,217,141,.35)' : prof ? 'rgba(160,107,232,.35)' : 'var(--glass-border)'
  const vc = hero ? 'var(--ok)' : prof ? PURPLE : 'var(--text)'
  const ig = hero ? 'linear-gradient(135deg, rgba(47,217,141,.3), rgba(47,217,141,.1))'
    : prof ? 'linear-gradient(135deg, rgba(160,107,232,.3), rgba(160,107,232,.1))'
    : 'rgba(255,255,255,.06)'
  return (
    <div className="rounded-2xl p-3" style={{ background: bg, border: `1px solid ${bd}` }}>
      <div className="text-[9.5px] uppercase tracking-wide text-faint font-bold flex items-center gap-1.5">
        <span className="w-[22px] h-[22px] rounded-lg grid place-items-center" style={{ background: ig, color: hero ? 'var(--ok)' : prof ? PURPLE : 'var(--dim)' }}><Ic size={12} /></span> {label}
      </div>
      <div className="text-[18px] font-extrabold mt-2 num" style={{ color: vc }}>{valor}</div>
      <div className="text-[10px] mt-0.5" style={{ color: subcor || 'var(--faint)' }}>{sub}</div>
    </div>
  )
}

function Distribuicao({ convites, minhas, cupons }) {
  const total = Math.max(1, convites + minhas + cupons)
  const seg = [
    { n: 'Convites do ML', v: convites, c: ML },
    { n: 'Minhas campanhas', v: minhas, c: 'var(--accent)' },
    { n: 'Cupons', v: cupons, c: BLUE },
  ]
  return (
    <div className="rounded-2xl p-3.5 mt-3 glass">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wide text-faint font-extrabold flex items-center gap-1.5"><BarChart3 size={12} /> Distribuição das promoções</span>
        <span className="text-[10px] text-faint num">{convites + minhas + cupons} no total</span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.06)' }}>
        {seg.map((s, i) => s.v > 0 && <div key={i} title={`${s.n}: ${s.v}`} style={{ width: `${(s.v / total) * 100}%`, background: s.c }} />)}
      </div>
      <div className="flex gap-4 mt-2 flex-wrap">
        {seg.map((s, i) => <span key={i} className="text-[10px] text-dim inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: s.c }} /> {s.n} <b className="num">{s.v}</b></span>)}
      </div>
    </div>
  )
}

function Donut({ pct, cor, label, valor }) {
  const C = 2 * Math.PI * 21
  const off = C * (1 - Math.max(0, Math.min(100, pct || 0)) / 100)
  return (
    <div className="flex flex-col items-center flex-none">
      <div className="relative" style={{ width: 52, height: 52 }}>
        <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="26" cy="26" r="21" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="4" />
          <circle cx="26" cy="26" r="21" fill="none" stroke={cor} strokeWidth="4" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off} />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-[11px] font-extrabold num" style={{ color: cor }}>{valor}</div>
      </div>
      <span className="text-[7.5px] uppercase tracking-wide text-faint font-extrabold mt-0.5">{label}</span>
    </div>
  )
}

function Secao({ icon: Ic, cor, titulo, pill, pillCor, right }) {
  return (
    <div className="flex items-center gap-2 mt-6 mb-2.5">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-faint font-bold">
        <Ic size={13} style={{ color: cor }} /> {titulo}
        {pill && <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full normal-case tracking-normal" style={{ background: `${pillCor}22`, color: pillCor }}>{pill}</span>}
      </div>
      {right && <div className="ml-auto">{right}</div>}
    </div>
  )
}

function Vazio({ texto }) {
  return <div className="rounded-2xl p-5 text-[12.5px] text-dim glass flex items-start gap-2.5"><Info size={15} className="flex-none mt-0.5" style={{ color: 'var(--faint)' }} /> {texto}</div>
}
function Chip({ children, cor }) {
  return <span className="text-[9px] font-extrabold px-2 py-0.5 rounded inline-flex items-center gap-1" style={{ background: `${cor}22`, color: cor }}>{children}</span>
}

/* ================= CONVITES ================= */
function SecConvites({ convites, onAderir, full }) {
  return (
    <>
      <Secao icon={Zap} cor={ML} titulo="Convites do Mercado Livre" pill="você adere · 1 clique" pillCor={ML} />
      {convites.length === 0
        ? <Vazio texto="Nenhum convite do ML no momento. Eles aparecem aqui quando o Mercado Livre te convida — Oferta Relâmpago, Oferta do Dia, coparticipação, Price Matching, PIX, etc." />
        : <div className="grid grid-cols-3 gap-3">{convites.map((c) => <ConviteCard key={c.id} p={c} onAderir={onAderir} />)}</div>}
    </>
  )
}
function ConviteCard({ p, onAderir }) {
  const m = meta(p.type); const Ic = m.icon
  const ben = p.benefits || {}
  const cofin = ben.type === 'REBATE' ? `ML ${ben.meli_percent ?? '—'}% + você ${ben.seller_percent ?? '—'}%` : null
  const ddl = dcurta(p.deadline_date); const dd = diasAte(p.deadline_date)
  return (
    <div className="rounded-2xl p-3.5 relative overflow-hidden" style={{ background: `linear-gradient(160deg, ${m.cor}14, rgba(0,0,0,.14))`, border: `1px solid ${m.cor}33` }}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${m.cor}, transparent)` }} />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg grid place-items-center flex-none" style={{ background: `${m.cor}22`, color: m.cor }}><Ic size={16} /></div>
        <div className="text-[9.5px] font-extrabold tracking-wide" style={{ color: m.cor }}>{m.label.toUpperCase()}</div>
      </div>
      <div className="text-[13px] font-bold mt-2">{p.name || m.label}</div>
      <div className="text-[10px] text-dim mt-1 min-h-[26px]">{m.desc}</div>
      {cofin && <div className="inline-flex items-center gap-1.5 text-[9.5px] font-extrabold px-2 py-0.5 rounded-full mt-1" style={{ background: 'rgba(91,141,239,.16)', color: BLUE }}><Gift size={11} /> {cofin}</div>}
      <div className="flex items-center gap-2 mt-3">
        {ddl && <span className="text-[9.5px] font-extrabold px-2 py-1 rounded-lg inline-flex items-center gap-1.5" style={{ background: 'rgba(224,162,60,.14)', color: 'var(--warn)' }}><Clock size={11} /> {dd != null && dd >= 0 ? `${dd}d` : ddl}</span>}
        <button onClick={onAderir} className="ml-auto text-[10.5px] font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1" style={{ background: 'linear-gradient(135deg, #F2C200, #d9a400)', color: '#3a2c00' }}>Aderir <ChevronRight size={12} /></button>
      </div>
    </div>
  )
}

/* ================= MINHAS CAMPANHAS ================= */
function SecMinhas({ minhas, onAcao, full }) {
  return (
    <>
      <Secao icon={Tag} cor="var(--accent)" titulo="Minhas campanhas" pill="você cria" pillCor="var(--accent)" />
      {minhas.length === 0
        ? <Vazio texto="Você ainda não tem campanhas próprias. Crie uma Campanha de %, um Desconto individual ou um Desconto por quantidade — sempre com a trava de margem no Preço Bling." />
        : minhas.map((m) => <CampanhaCard key={m.id} p={m} onAcao={onAcao} />)}
    </>
  )
}
function CampanhaCard({ p, onAcao }) {
  const m = meta(p.type); const Ic = m.icon
  const st = stInfo(p.status)
  const ini = dcurta(p.start_date), fim = dcurta(p.finish_date)
  const barCor = /started|active/.test(p.status || '') ? 'var(--ok)' : p.status === 'pending' ? BLUE : 'var(--faint)'
  const tempo = (p.start_date && p.finish_date) ? Math.round(pctTempo(p.start_date, p.finish_date)) : null
  const restam = diasAte(p.finish_date)
  return (
    <div className="rounded-2xl p-3.5 mb-3 glass" style={{ boxShadow: `inset 3px 0 0 ${barCor}` }}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-bold truncate">{p.name || m.label}</span>
            <Chip cor={m.cor}><Ic size={10} />{m.label}</Chip>
            {p.sub_type === 'FLEXIBLE_PERCENTAGE' && <Chip cor={PURPLE}>flexível</Chip>}
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: `${st.c}22`, color: st.c }}>{st.t}</span>
          </div>
          <div className="text-[11px] text-faint mt-1">{p.id} {ini && `· ${ini} → ${fim}`} {restam != null && restam >= 0 && `· termina em ${restam}d`}</div>
        </div>
        {tempo != null && <Donut pct={tempo} cor={barCor} valor={`${tempo}%`} label="tempo" />}
      </div>
      <div className="grid gap-2.5 mt-3" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
        <Mini l="Tipo" v={m.fam === 'cria' ? 'Você cria' : 'Você adere'} s={m.label} />
        <Mini l="Início" v={ini || '—'} s="programado" />
        <Mini l="Fim" v={fim || '—'} s={restam != null ? `${restam}d` : 'programado'} />
        <Mini l="Itens" v="em breve" s="agregação" />
        <Mini l="Líquido real" v="em breve" s="net_proceeds" hero />
        <Mini l="Lucro real" v="em breve" s="− custo Bling" prof />
      </div>
      {tempo != null && <div className="h-1.5 rounded-full overflow-hidden mt-2.5" style={{ background: 'rgba(255,255,255,.08)' }}><div style={{ width: `${tempo}%`, height: '100%', background: `linear-gradient(90deg, ${barCor}, ${barCor}99)` }} /></div>}
      <div className="flex gap-2 mt-3 flex-wrap">
        <Act icon={SlidersHorizontal} onClick={() => onAcao('Editar itens')}>Editar itens</Act>
        <Act icon={Gauge} onClick={() => onAcao('Simular')}>Simular</Act>
        <Act icon={Activity} onClick={() => onAcao('Ver itens (net_proceeds)')}>Ver itens</Act>
        <Act icon={Ban} danger onClick={() => onAcao('Encerrar')}>Encerrar</Act>
      </div>
    </div>
  )
}

function Mini({ l, v, s, hero, prof }) {
  const bg = hero ? 'linear-gradient(160deg, rgba(47,217,141,.14), rgba(47,217,141,.02))'
    : prof ? 'linear-gradient(160deg, rgba(160,107,232,.14), rgba(160,107,232,.02))' : 'rgba(0,0,0,.24)'
  const bd = hero ? '1px solid rgba(47,217,141,.3)' : prof ? '1px solid rgba(160,107,232,.3)' : '1px solid transparent'
  const vc = hero ? 'var(--ok)' : prof ? PURPLE : 'var(--text)'
  return (
    <div className="rounded-xl px-2.5 py-2.5" style={{ background: bg, border: bd }}>
      <div className="text-[8px] uppercase tracking-wide text-faint font-extrabold">{l}</div>
      <div className="text-[13px] font-extrabold mt-0.5 num" style={{ color: vc }}>{v}</div>
      <div className="text-[8.5px] text-faint mt-0.5">{s}</div>
    </div>
  )
}
function Act({ icon: Ic, children, danger, onClick }) {
  return (
    <button onClick={onClick} className="text-[11px] font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 bg-transparent hover:bg-[rgba(255,255,255,.04)]" style={{ border: `1px solid ${danger ? 'rgba(255,122,122,.3)' : 'var(--glass-border)'}`, color: danger ? 'var(--danger)' : 'var(--dim)' }}>
      <Ic size={13} /> {children}
    </button>
  )
}

/* ================= CUPONS ================= */
function SecCupons({ cupons, onAcao, full }) {
  return (
    <>
      <Secao icon={Ticket} cor={ML} titulo="Cupons" pill="com código · público · frete grátis" pillCor={ML} />
      {cupons.length === 0
        ? <Vazio texto="Nenhum cupom ativo. Crie um cupom com código (para distribuir aos seguidores por fora) ou público (o ML destaca para todos os compradores das publicações)." />
        : cupons.map((m) => <CupomCard key={m.id} p={m} onAcao={onAcao} />)}
    </>
  )
}
function CupomCard({ p, onAcao }) {
  const st = stInfo(p.status); const ini = dcurta(p.start_date), fim = dcurta(p.finish_date)
  return (
    <div className="rounded-2xl p-3.5 mb-3 glass" style={{ boxShadow: 'inset 3px 0 0 #F2C200' }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[14px] font-bold">{p.name || 'Cupom'}</span>
        <Chip cor={ML}><Ticket size={10} /> Cupom (MLB)</Chip>
        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: `${st.c}22`, color: st.c }}>{st.t}</span>
        <span className="ml-auto text-[10px] text-faint">cumulativo com promoção · 1 uso/comprador</span>
      </div>
      <div className="grid gap-2.5 mt-3" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
        <Mini l="Período" v={ini || '—'} s={fim ? `→ ${fim}` : 'programado'} />
        <Mini l="Orçamento" v="em breve" s="100% seu" />
        <Mini l="Resgatados" v="em breve" s="used_coupons" />
        <Mini l="Restante" v="em breve" s="remaining_budget" hero />
        <Mini l="Pacing" v="em breve" s="auto-pausa" prof />
      </div>
      <div className="h-1.5 rounded-full overflow-hidden mt-2.5" style={{ background: 'rgba(255,255,255,.08)' }}><div style={{ width: '8%', height: '100%', background: 'linear-gradient(90deg, #F2C200, #d9a400)' }} /></div>
      <div className="flex gap-2 mt-3 flex-wrap">
        <Act icon={SlidersHorizontal} onClick={() => onAcao('Editar cupom')}>Editar</Act>
        <Act icon={Sparkles} onClick={() => onAcao('Versão pública (sem código)')}>Versão pública</Act>
        <Act icon={Ban} danger onClick={() => onAcao('Encerrar')}>Encerrar</Act>
      </div>
    </div>
  )
}

/* ================= SIMULADOR ================= */
function Simulador({ notify }) {
  const [itemId, setItemId] = useState('')
  const [desc, setDesc] = useState(20)
  const [res, setRes] = useState(null)
  const [busy, setBusy] = useState(false)

  const simular = useCallback(async (d = desc, id = itemId) => {
    const iid = (id || '').trim(); if (!iid) return
    setBusy(true)
    try { setRes(await api.mlPromoSimular({ item_id: iid, desconto_pct: Number(d) })) }
    catch (e) { notify(e.message || 'Falha na simulação', 'danger'); setRes(null) }
    finally { setBusy(false) }
  }, [desc, itemId, notify])

  const pisoPct = res && res.preco_atual && res.piso_preco ? (1 - res.piso_preco / res.preco_atual) * 100 : null
  const pos = (pct) => Math.max(0, Math.min(100, ((pct - 5) / (40 - 5)) * 100))
  const precoEm = (pct) => res && res.preco_atual ? res.preco_atual * (1 - pct / 100) : null

  return (
    <div className="rounded-2xl p-4 mt-3" style={{ background: 'linear-gradient(160deg, rgba(214,0,127,.08), rgba(0,0,0,.18))', border: '1px solid rgba(214,0,127,.28)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg grid place-items-center flex-none" style={{ background: 'rgba(214,0,127,.18)', color: 'var(--accent)' }}><Gauge size={15} /></div>
        <div className="text-[11px] uppercase tracking-wide font-extrabold" style={{ color: 'var(--accent)' }}>Simulador de desconto — líquido real antes de aplicar</div>
        <span className="ml-auto text-[9.5px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: 'rgba(47,217,141,.14)', color: 'var(--ok)' }}>funcional</span>
      </div>
      <div className="flex gap-2 items-center flex-wrap mb-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={itemId} onChange={(e) => setItemId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && simular()} placeholder="ID do anúncio (ex.: MLB3538191898)" className="w-full text-[12px] pl-9 pr-3 py-2 rounded-xl bg-transparent text-fg placeholder:text-faint" style={{ border: '1px solid var(--glass-border)' }} />
        </div>
        <button onClick={() => simular()} disabled={busy || !itemId.trim()} className="text-[12px] font-semibold px-4 py-2 rounded-xl text-white inline-flex items-center gap-1.5 disabled:opacity-40" style={{ background: 'linear-gradient(135deg, var(--accent), #a80063)' }}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Gauge size={14} />} Simular</button>
      </div>

      {!res && <div className="text-[11.5px] text-faint py-3 flex items-center gap-2"><Info size={14} /> Informe o ID de um anúncio e o desconto para ver o <b style={{ color: 'var(--dim)' }}>líquido real</b>, o <b style={{ color: 'var(--dim)' }}>lucro</b> e se fica <b style={{ color: 'var(--dim)' }}>acima do piso</b> (Preço Bling).</div>}

      {res && (
        <div className="grid gap-5" style={{ gridTemplateColumns: '1.45fr 1fr' }}>
          <div>
            <div className="flex items-center justify-between text-[11px] mb-2">
              <span className="text-dim truncate">{res.titulo || res.item_id}{res.sku ? ` · ${res.sku}` : ''}</span>
              <span className="num text-faint">preço atual {brl(res.preco_atual)}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-faint num">5%</span>
              <input type="range" min={5} max={40} step={1} value={desc} onChange={(e) => setDesc(Number(e.target.value))} onMouseUp={(e) => simular(Number(e.target.value))} onTouchEnd={(e) => simular(Number(e.target.value))} className="flex-1" style={{ accentColor: '#d6007f' }} />
              <span className="text-[10px] text-faint num">40%</span>
            </div>
            {/* banda rica */}
            <div className="relative mx-6" style={{ height: 64 }}>
              <div className="absolute left-0 right-0 rounded-full" style={{ top: 26, height: 8, background: 'linear-gradient(90deg, rgba(47,217,141,.5), rgba(224,162,60,.4), rgba(255,122,122,.45))' }} />
              {/* trilho preenchido do knob até a direita = profundidade do desconto */}
              <div className="absolute rounded-full" style={{ top: 26, height: 8, left: `${pos(desc)}%`, right: 0, background: 'linear-gradient(90deg, var(--accent), #ff2b9d)' }} />
              {/* min / max com preços */}
              <div className="absolute" style={{ left: 0, top: 12 }}><div style={{ width: 2, height: 36, background: 'rgba(255,255,255,.25)' }} /><div className="absolute text-[8px] font-extrabold text-faint whitespace-nowrap" style={{ top: -12, left: 0 }}>mín 5%</div><div className="absolute text-[8px] text-faint num whitespace-nowrap" style={{ top: 38, left: 0 }}>{brl(precoEm(5))}</div></div>
              <div className="absolute" style={{ left: '100%', top: 12 }}><div style={{ width: 2, height: 36, background: 'rgba(255,255,255,.25)' }} /><div className="absolute text-[8px] font-extrabold text-faint whitespace-nowrap" style={{ top: -12, right: 0 }}>máx 40%</div><div className="absolute text-[8px] text-faint num whitespace-nowrap" style={{ top: 38, right: 0 }}>{brl(precoEm(40))}</div></div>
              {/* piso */}
              {pisoPct != null && pisoPct >= 5 && pisoPct <= 40 && (
                <div className="absolute" style={{ left: `${pos(pisoPct)}%`, top: 10 }}>
                  <div style={{ width: 2, height: 40, background: 'var(--danger)' }} />
                  <div className="absolute text-[8px] font-extrabold whitespace-nowrap" style={{ top: -12, left: '50%', transform: 'translateX(-50%)', color: 'var(--danger)' }}>piso (Bling)</div>
                  <div className="absolute text-[8px] num whitespace-nowrap" style={{ top: 42, left: '50%', transform: 'translateX(-50%)', color: 'var(--danger)' }}>{brl(res.piso_preco)}</div>
                </div>
              )}
              {/* knob */}
              <div className="absolute rounded-full" style={{ left: `${pos(desc)}%`, top: 18, width: 22, height: 22, transform: 'translateX(-11px)', background: 'var(--accent)', border: '3px solid #fff', boxShadow: '0 4px 12px rgba(214,0,127,.5)' }} />
              <div className="absolute text-[10px] font-extrabold whitespace-nowrap num" style={{ left: `${pos(desc)}%`, top: 42, transform: 'translateX(-50%)', color: 'var(--accent)' }}>{desc}% · {brl(precoEm(desc))}</div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Linha k="Preço com desconto" v={brl(res.deal_price)} />
            <Linha k="Líquido real (net do ML)" v={brl(res.liquido)} cor="var(--ok)" />
            <Linha k="Custo (Bling)" v={res.custo == null ? '—' : brl(res.custo)} />
            <div className="border-t pt-2 mt-0.5" style={{ borderColor: 'var(--glass-border)' }}>
              <Linha k="Lucro real" v={res.lucro == null ? 'cadastre o custo' : `${brl(res.lucro)} · ${res.margem_pct ?? '—'}%`} cor={PURPLE} forte />
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {res.acima_do_piso == null
                ? <span className="text-[10px] text-faint">Cadastre o Preço Bling do item para ver a trava.</span>
                : res.acima_do_piso
                  ? <span className="text-[10px] font-extrabold px-2 py-1 rounded-full inline-flex items-center gap-1.5" style={{ background: 'rgba(47,217,141,.14)', color: 'var(--ok)' }}><Shield size={11} /> Acima do piso</span>
                  : <span className="text-[10px] font-extrabold px-2 py-1 rounded-full inline-flex items-center gap-1.5" style={{ background: 'rgba(255,122,122,.14)', color: 'var(--danger)' }}><Ban size={11} /> Abaixo do piso · fura a margem</span>}
              {res.piso_preco != null && <span className="text-[10px] text-faint num">piso {brl(res.piso_preco)}</span>}
            </div>
            <button onClick={() => notify('Aplicar desconto: chega na Etapa 3.', 'warn')} disabled={res.acima_do_piso === false} className="mt-2 text-[11px] font-bold px-3 py-2 rounded-xl text-white inline-flex items-center justify-center gap-1.5 disabled:opacity-40" style={{ background: 'linear-gradient(135deg, var(--accent), #a80063)' }}><Percent size={13} /> Aplicar este desconto</button>
          </div>
        </div>
      )}
    </div>
  )
}
function Linha({ k, v, cor, forte }) {
  return (
    <div className="flex justify-between text-[12px]">
      <span className="text-dim">{k}</span>
      <span className="num" style={{ fontWeight: forte ? 800 : 700, color: cor || 'var(--text)' }}>{v}</span>
    </div>
  )
}

/* ================= CALENDÁRIO (dados reais) ================= */
function Calendario({ minhas, cupons, convites }) {
  const linhas = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const fimJanela = new Date(hoje); fimJanela.setDate(fimJanela.getDate() + 30)
    const span = fimJanela - hoje
    const barra = (p, cor) => {
      if (!p.start_date && !p.finish_date) return null
      const ini = p.start_date ? new Date(p.start_date) : hoje
      const fim = p.finish_date ? new Date(p.finish_date) : fimJanela
      const a = Math.max(hoje, ini), b = Math.min(fimJanela, fim)
      if (b <= hoje || a >= fimJanela) return null
      const left = Math.max(0, ((a - hoje) / span) * 100)
      const width = Math.max(4, Math.min(100 - left, ((b - a) / span) * 100))
      return { left, width, nome: p.name || meta(p.type).label, cor }
    }
    const arr = []
    minhas.forEach((m) => { const b = barra(m, 'var(--accent)'); if (b) arr.push(b) })
    cupons.forEach((c) => { const b = barra(c, ML); if (b) arr.push(b) })
    return arr
  }, [minhas, cupons])

  return (
    <>
      <Secao icon={Calendar} cor="var(--accent)" titulo="Calendário de campanhas" pill="próximos 30 dias · agendamento" pillCor={BLUE} />
      <div className="rounded-2xl p-4 glass">
        {linhas.length === 0
          ? <div className="text-[11.5px] text-faint flex items-center gap-2"><Info size={14} /> Sem campanhas com data no período. Campanhas agendadas aparecem aqui numa linha do tempo.</div>
          : <div className="flex flex-col gap-2">
              {linhas.map((l, i) => (
                <div key={i} className="grid items-center gap-2" style={{ gridTemplateColumns: '150px 1fr' }}>
                  <div className="text-[11px] text-dim truncate">{l.nome}</div>
                  <div className="relative h-6 rounded-lg overflow-hidden" style={{ background: 'rgba(0,0,0,.2)' }}>
                    <div className="absolute rounded-md flex items-center px-2 text-[8.5px] font-extrabold text-white whitespace-nowrap" style={{ left: `${l.left}%`, width: `${l.width}%`, top: 4, height: 16, background: `linear-gradient(90deg, ${l.cor}, ${l.cor}cc)` }} />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between text-[8.5px] text-faint mt-1 px-[2px]"><span>hoje</span><span>+15d</span><span>+30d</span></div>
            </div>}
      </div>
    </>
  )
}

/* ================= INTELIGÊNCIA (prévia — Etapa 3) ================= */
function Inteligencia() {
  const elast = [
    { sku: 'Fio Nylon 0.50mm', dp: '−15%', du: '+62%', pull: 82, ot: '18% · máx lucro', cor: 'var(--ok)' },
    { sku: 'Alicate Inox 6 em 1', dp: '−22%', du: '+34%', pull: 54, ot: '12% · máx lucro', cor: 'var(--ok)' },
    { sku: 'Caixa Organizadora 30', dp: '−10%', du: '+8%', pull: 16, ot: 'pouco elástico', cor: 'var(--warn)' },
    { sku: 'Kit Cristal 6mm Azul', dp: '−25%', du: '+90%', pull: 96, ot: '30% · máx lucro', cor: 'var(--ok)' },
  ]
  const bb = [
    { nm: 'Alicate Inox 6 em 1', s: 'perdeu destaque há 2h', st: 'perdeu', preco: 'R$ 47,90', ok: true },
    { nm: 'Fio Couro Sintético', s: 'vencendo o destaque', st: 'vencendo', preco: 'R$ 82,36', ok: null },
    { nm: 'Miçanga Vidro 1000un', s: 'recuperar fura o piso', st: 'bloqueado', preco: 'bloqueado', ok: false },
  ]
  return (
    <div className="mt-4">
      <Secao icon={Activity} cor={PURPLE} titulo="Inteligência" pill="prévia · dados reais na Etapa 3" pillCor={PURPLE} />
      <div className="grid gap-3" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        <div className="rounded-2xl p-4 glass">
          <div className="text-[10px] uppercase tracking-wide text-faint font-extrabold flex items-center gap-2 mb-3"><Activity size={13} /> Elasticidade por SKU — desconto que maximiza lucro</div>
          <div className="grid gap-2 text-[9px] uppercase tracking-wide text-faint font-extrabold pb-1" style={{ gridTemplateColumns: '1.6fr .7fr .7fr 1fr' }}><span>SKU</span><span>Δ preço</span><span>Δ unid.</span><span>ótimo</span></div>
          {elast.map((e, i) => (
            <div key={i} className="grid items-center gap-2 py-2 text-[11px]" style={{ gridTemplateColumns: '1.6fr .7fr .7fr 1fr', borderTop: '1px solid var(--glass-border)' }}>
              <span className="font-semibold truncate">{e.sku}</span>
              <span className="num">{e.dp}</span>
              <span className="num" style={{ color: e.cor }}>{e.du}</span>
              <span className="text-[10px] font-extrabold" style={{ color: e.cor }}>{e.ot}</span>
            </div>
          ))}
          <div className="text-[9.5px] text-faint mt-2 flex items-center gap-1.5"><Info size={12} /> Cruza unidades antes/depois (cache de pedidos) × Δpreço. Alimenta os agentes.</div>
        </div>
        <div className="rounded-2xl p-4 glass">
          <div className="text-[10px] uppercase tracking-wide text-faint font-extrabold flex items-center gap-2 mb-3"><Target size={13} /> Buybox — preço p/ recuperar (respeitando piso)</div>
          {bb.map((b, i) => (
            <div key={i} className="flex items-center gap-2.5 py-2.5" style={{ borderTop: i ? '1px solid var(--glass-border)' : 'none' }}>
              <div className="w-8 h-8 rounded-lg flex-none" style={{ background: 'var(--surface-2)' }} />
              <div className="flex-1 min-w-0"><div className="text-[11px] font-semibold truncate">{b.nm}</div><div className="text-[9px] text-faint">{b.s}</div></div>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: b.st === 'vencendo' ? 'rgba(47,217,141,.14)' : 'rgba(255,122,122,.14)', color: b.st === 'vencendo' ? 'var(--ok)' : 'var(--danger)' }}>{b.st}</span>
              <div className="text-right"><div className="num text-[12px] font-extrabold" style={{ color: b.ok === false ? 'var(--danger)' : b.ok ? 'var(--ok)' : 'var(--dim)' }}>{b.preco}</div><div className="text-[8px] text-faint">{b.ok === false ? 'abaixo do piso' : b.ok ? 'p/ recuperar ✓' : 'mantém'}</div></div>
            </div>
          ))}
          <div className="text-[9.5px] text-faint mt-2 flex items-center gap-1.5"><Info size={12} /> Webhook best_price_eligible + price_to_win. O agente só age acima do piso.</div>
        </div>
      </div>
    </div>
  )
}

/* ================= AUTOMAÇÃO — 6 agentes (prévia — Etapa 4) ================= */
const AGENTES = [
  { nm: 'Agente Margem', tg: 'margem folgada', icon: Wallet, cor: 'var(--ok)', trig: 'margem > piso + 8 pts', acao: 'desconto até (margem − piso)', chip: 'ótimo médio 14%' },
  { nm: 'Agente Curva ABC', tg: 'exposição × liquidação', icon: Layers, cor: BLUE, trig: 'item A (alta receita)', acao: 'coparticipação / visibilidade', chip: 'A:60 · B:210 · C:890' },
  { nm: 'Agente Giro', tg: 'queda de vendas', icon: TrendingDown, cor: 'var(--warn)', trig: 'giro caindo 30% em 14d', acao: 'PRICE_DISCOUNT ótimo · 7d', chip: 'começa na sugestão ML' },
  { nm: 'Agente Estoque Parado', tg: '> 90 dias', icon: Boxes, cor: 'var(--danger)', trig: 'parado > 90 dias', acao: 'progressivo 10→20→30% ou cupom', chip: 'liquidação' },
  { nm: 'Agente Menor Estoque', tg: 'urgência × proteção', icon: Gauge, cor: 'var(--accent)', trig: 'estoque baixo', acao: 'Relâmpago pequeno · crítico bloqueia', chip: 'anti-ruptura' },
  { nm: 'Agente Posição / Buybox', tg: 'perda de destaque', icon: Target, cor: BLUE, trig: 'perdeu buybox', acao: 'preço p/ recuperar (price_to_win)', chip: 'respeita piso' },
]
function Automacao() {
  const [ligado, setLigado] = useState({})
  return (
    <div className="mt-4">
      <Secao icon={Cpu} cor="var(--accent)" titulo="Automação — 6 agentes" pill="gatilho → ação · trava de margem · liga na Etapa 4" pillCor="var(--ok)" />
      <div className="grid grid-cols-3 gap-3">
        {AGENTES.map((a, i) => {
          const Ic = a.icon
          return (
            <div key={i} className="rounded-2xl p-3.5" style={{ background: 'linear-gradient(158deg, rgba(255,255,255,.05), rgba(0,0,0,.18))', border: '1px solid var(--glass-border)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg grid place-items-center flex-none" style={{ background: `${a.cor}22`, color: a.cor }}><Ic size={16} /></div>
                <div className="flex-1 min-w-0"><div className="text-[12.5px] font-bold">{a.nm}</div><div className="text-[8.5px] font-extrabold uppercase tracking-wide text-faint">{a.tg}</div></div>
                <SwitchLabel on={ligado[i]} onClick={() => setLigado({ ...ligado, [i]: !ligado[i] })} />
              </div>
              <div className="flex items-center gap-2 mt-2.5 rounded-xl px-2.5 py-2" style={{ background: 'rgba(0,0,0,.22)' }}>
                <span className="text-[10px] text-dim flex-1">{a.trig}</span>
                <ArrowRight size={12} style={{ color: 'var(--accent)' }} />
                <span className="text-[10px] font-bold flex-1 text-right">{a.acao}</span>
              </div>
              <div className="flex items-center gap-2 mt-2.5">
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: 'rgba(47,217,141,.12)', color: 'var(--ok)' }}>{a.chip}</span>
                <span className="ml-auto text-[9.5px] font-extrabold" style={{ color: 'var(--accent)' }}>Ver regra ↗</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ================= ADS ================= */
function Ads() {
  const m = [
    ['ROAS', '4,8x', 'var(--ok)'], ['ACOS', '18%', 'var(--warn)'], ['Gasto', 'R$ 620', 'var(--text)'],
    ['GMV Ads', 'R$ 2.980', 'var(--text)'], ['CPC médio', 'R$ 0,74', 'var(--text)'],
  ]
  return (
    <div className="mt-4">
      <Secao icon={Target} cor={BLUE} titulo="Product Ads" pill="requer permissão Advertising · prévia" pillCor={BLUE} />
      <div className="rounded-2xl p-4 flex items-center gap-6 flex-wrap" style={{ background: 'linear-gradient(160deg, rgba(91,141,239,.08), rgba(0,0,0,.15))', border: '1px solid rgba(91,141,239,.25)' }}>
        {m.map(([l, v, c], i) => (
          <div key={i} className="flex flex-col"><span className="text-[9px] uppercase tracking-wide text-faint font-extrabold">{l}</span><span className="text-[16px] font-extrabold num" style={{ color: c }}>{v}</span></div>
        ))}
        <div className="ml-auto flex gap-2"><Act icon={Target}>Otimizar lance por ROAS</Act><Act icon={Ban} danger>Pausar acima do ACOS</Act></div>
      </div>
      <div className="text-[10px] text-faint mt-2 flex items-center gap-1.5"><Info size={12} /> Métricas reais quando a permissão Advertising e o advertiser_id estiverem habilitados. Entra depois do núcleo de campanhas.</div>
    </div>
  )
}

/* ================= desconectado ================= */
function Desconectado({ onReload }) {
  return (
    <div className="max-w-[560px] mx-auto text-center py-16">
      <div className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-4" style={{ background: 'var(--tint-accent)' }}><Plug size={26} style={{ color: 'var(--accent)' }} /></div>
      <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 20, fontWeight: 700 }}>Conecte o Mercado Livre</div>
      <p className="text-sm text-dim mt-2">As campanhas, cupons e ofertas — com o simulador de líquido real, a elasticidade e a trava de margem — aparecem aqui assim que você conectar a conta.</p>
      <button onClick={onReload} className="glass rounded-xl px-4 py-2 text-sm text-dim hover:text-fg inline-flex items-center gap-2 mt-4"><RefreshCw size={15} /> Já conectei</button>
    </div>
  )
}
