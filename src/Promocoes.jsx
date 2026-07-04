import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Tag, Percent, Ticket, Boxes, Flame, Sparkles, Zap, Cpu, Scale, Target,
  Landmark, Gauge, Wallet, Shield, Power, Ban, TrendingUp, TrendingDown, Layers,
  Calendar, Clock, Plus, ChevronRight, Crown, Activity, Loader2, RefreshCw, Plug,
  Info, Gift, ArrowRight, SlidersHorizontal, Search, CircleDollarSign, BarChart3, X, Check, Trash2, AlertTriangle,
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
const isoDe = (offsetDias, hora = '00:00:00') => {
  const d = new Date(); d.setDate(d.getDate() + offsetDias)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${hora}`
}
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
  const emBreve = (o) => notify(`${o}: chega na próxima etapa.`, 'warn')
  const [modal, setModal] = useState(null) // 'campanha' | 'cupom' | null
  const [busyExcl, setBusyExcl] = useState(false)
  const [picker, setPicker] = useState(null)
  const abrirAddItens = (p) => setPicker({ modo: 'campanha', promotionId: p.id, promotionType: p.type, promoNome: p.name || p.type, inicio: p.start_date, fim: p.finish_date })
  const abrirAderir = (p) => setPicker({ modo: 'convite', promotionId: p.id, promotionType: p.type, promoNome: p.name || p.type, inicio: p.start_date, fim: p.finish_date })

  const [autoRodando, setAutoRodando] = useState(false)
  const [contagens, setContagens] = useState({})
  const reportContagem = useCallback((id, total, participando) => {
    setContagens((m) => (m[id] && m[id].total === total && m[id].participando === participando ? m : { ...m, [id]: { total, participando } }))
  }, [])
  const _resumoAuto = (r) => {
    const parts = [`${r.aderidos} aderido(s)`]
    if (r.ignorados_piso) parts.push(`${r.ignorados_piso} abaixo do piso`)
    if (r.sem_preco_bling) parts.push(`${r.sem_preco_bling} sem Preço Bling`)
    if (r.ja_participando) parts.push(`${r.ja_participando} já participando`)
    if (r.falhas && r.falhas.length) parts.push(`${r.falhas.length} falha(s)`)
    return parts.join(' · ')
  }
  const aderirAutoConvite = async (p) => {
    try {
      const r = await api.mlPromoAderirAuto(p.id, p.type, 15)
      notify(`${p.name || p.type}: ${_resumoAuto(r)}.`, r.aderidos > 0 ? 'ok' : 'warn')
      carregar()
    } catch (e) { notify(traduzErroML(e.message), 'danger') }
  }
  const sairConvite = async (p) => {
    if (!window.confirm(`Deixar de aderir "${p.name || p.type}"? Isso remove seus itens que estão participando desta promoção.`)) return
    try {
      const r = await api.mlPromoSair(p.id, p.type)
      notify(`${p.name || p.type}: ${r.removidos} item(ns) removido(s)${r.falhas && r.falhas.length ? ` · ${r.falhas.length} falha(s)` : ''}.`, r.removidos > 0 ? 'ok' : 'warn')
      carregar()
    } catch (e) { notify(traduzErroML(e.message), 'danger') }
  }
  const aplicarAutomaticos = async (alvos) => {
    if (!alvos || !alvos.length) { notify('Nenhum convite em modo automático.', 'warn'); return }
    setAutoRodando(true)
    const t = { aderidos: 0, ignorados_piso: 0, sem_preco_bling: 0, ja_participando: 0, falhas: 0, convites: 0 }
    for (const c of alvos) {
      try {
        const r = await api.mlPromoAderirAuto(c.id, c.type, 15)
        t.aderidos += r.aderidos || 0; t.ignorados_piso += r.ignorados_piso || 0
        t.sem_preco_bling += r.sem_preco_bling || 0; t.ja_participando += r.ja_participando || 0
        t.falhas += (r.falhas ? r.falhas.length : 0); t.convites += 1
      } catch { t.falhas += 1 }
    }
    setAutoRodando(false)
    notify(`Automáticos em ${t.convites} convite(s): ${t.aderidos} aderido(s) · ${t.ignorados_piso} abaixo do piso · ${t.sem_preco_bling} sem Bling${t.falhas ? ` · ${t.falhas} falha(s)` : ''}.`, t.aderidos > 0 ? 'ok' : 'warn')
    carregar()
  }

  const toggleExclusaoSeller = async () => {
    setBusyExcl(true)
    try {
      const novo = !(painel?.exclusao_ativa)
      await api.mlPromoExclusaoSeller(novo)
      notify(novo ? 'Exclusão do seller ativada — o ML não inclui seus itens automaticamente.' : 'Exclusão do seller desativada.', 'ok')
      carregar()
    } catch (e) { notify(e.message || 'Falha ao alterar a exclusão', 'danger') }
    finally { setBusyExcl(false) }
  }

  const encerrarCampanha = async (p) => {
    if (!window.confirm(`Encerrar "${p.name || p.type}"? Esta ação remove a campanha no Mercado Livre.`)) return
    try {
      await api.mlPromoExcluirCampanha(p.id, p.type)
      notify('Campanha encerrada.', 'ok')
      carregar()
    } catch (e) { notify(e.message || 'Falha ao encerrar', 'danger') }
  }
  const [busySync, setBusySync] = useState(false)
  const sincronizarPedidos = async () => {
    setBusySync(true)
    try {
      const r = await api.mlPedidosBackfill(90)
      notify(`Sincronizados ${r.pedidos_gravados} pedidos dos últimos ${r.dias} dias.`, 'ok')
      carregar()
    } catch (e) { notify(e.message || 'Falha ao sincronizar pedidos', 'danger') }
    finally { setBusySync(false) }
  }

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
          <button onClick={sincronizarPedidos} disabled={busySync} title="Buscar pedidos no ML para liberar a análise de vendas por campanha" className="text-xs px-3 py-2 rounded-lg glass text-dim hover:text-fg inline-flex items-center gap-1.5 disabled:opacity-50">{busySync ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sincronizar pedidos</button>
          <button onClick={() => setModal('cupom')} className="text-xs px-3 py-2 rounded-lg glass text-dim hover:text-fg inline-flex items-center gap-1.5"><Ticket size={14} /> Novo cupom</button>
          <button onClick={() => setModal('campanha')} className="text-xs px-3 py-2 rounded-lg inline-flex items-center gap-1.5 text-white font-semibold" style={{ background: 'linear-gradient(135deg, var(--accent), #a80063)' }}><Plus size={14} /> Nova campanha</button>
        </div>
      </div>
      <div className="h-px my-3" style={{ background: 'linear-gradient(90deg, var(--accent), transparent 60%)' }} />

      {/* TABS */}
      <div className="flex gap-1.5 p-1.5 rounded-2xl flex-wrap" style={{ background: 'rgba(0,0,0,.28)', border: '1px solid var(--glass-border)' }}>
        {[
          ['visao', 'Visão geral', Sparkles, null],
          ['minhas', 'Minhas campanhas', Tag, minhas.length],
          ['convites', 'Convites do ML', Zap, convites.length],
          ['participantes', 'Participantes', Boxes, null],
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
        <button onClick={toggleExclusaoSeller} disabled={busyExcl} title="Ligar/desligar a inclusão automática do ML" className="text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 disabled:opacity-50" style={{ background: painel?.exclusao_ativa ? 'rgba(255,122,122,.12)' : 'rgba(255,255,255,.06)', color: painel?.exclusao_ativa ? 'var(--danger)' : 'var(--faint)', border: '1px solid ' + (painel?.exclusao_ativa ? 'rgba(255,122,122,.3)' : 'var(--glass-border)') }}>{busyExcl ? <Loader2 size={11} className="animate-spin" /> : <Ban size={11} />} Exclusão do seller {painel?.exclusao_ativa == null ? '—' : painel?.exclusao_ativa ? 'ativa' : 'inativa'}</button>
        <div className="ml-auto flex items-center gap-3.5 flex-wrap">
          <SwitchLabel on={gov.kill} onClick={() => setGovK('kill')} icon={Power} label="Kill switch global" />
          <SwitchLabel on={gov.cont} onClick={() => setGovK('cont')} label="Auto-continuar" />
          <SwitchLabel on={gov.rev} onClick={() => setGovK('rev')} label="Reverter se margem < piso" />
        </div>
      </div>

      {estado === 'carregando' && !painel && <SkeletonPromocoes />}

      {painel && (aba === 'visao' || aba === 'minhas' || aba === 'convites' || aba === 'cupons') && (
        <>
          {aba === 'visao' && (
            <>
              <div className="grid grid-cols-6 gap-3 mt-4">
                <Kpi icon={Tag} label="Minhas campanhas" valor={cont.minhas ?? 0} sub={`${cont.ativas ?? 0} ativas agora`} />
                <Kpi icon={Zap} label="Convites do ML" valor={cont.convites ?? 0} sub="oportunidades" subcor={ML} />
                <Kpi icon={Gift} label="Coparticipados" valor={cont.coparticipadas ?? 0} sub="ML subsidia parte" hero />
                <Kpi icon={Ticket} label="Cupons" valor={cupons.length} sub="ativos / agendados" />
                <Kpi icon={Layers} label="Itens participando" valor={Object.values(contagens).reduce((a, c) => a + (c.participando || 0), 0)} sub={`de ${Object.values(contagens).reduce((a, c) => a + (c.total || 0), 0)} elegíveis`} prof />
                <Kpi icon={Shield} label="Governança" valor={painel.exclusao_ativa == null ? '—' : painel.exclusao_ativa ? 'ON' : 'OFF'} sub="exclusão do ML" />
              </div>
              <InsightsPromo convites={convites} contagens={contagens} cont={cont} />
              <GanhosPorCampanha />
              <Distribuicao convites={convites.length} minhas={minhas.length} cupons={cupons.length} />
              <Simulador notify={notify} recarregar={carregar} />
              <SecConvites convites={convites} onAderir={abrirAderir} onAutoAderir={aderirAutoConvite} onSair={sairConvite} onAplicarAutomaticos={aplicarAutomaticos} autoRodando={autoRodando} onContagem={reportContagem} />
              <SecMinhas minhas={minhas} onAcao={emBreve} onEncerrar={encerrarCampanha} onAddItens={abrirAddItens} onSincronizar={sincronizarPedidos} notify={notify} />
              <SecCupons cupons={cupons} onAcao={emBreve} onEncerrar={encerrarCampanha} />
              <Calendario minhas={minhas} cupons={cupons} convites={convites} onAbrirCampanha={(p, fonte) => { if (fonte === 'convite') abrirAderir(p); else if (fonte === 'minha') abrirAddItens(p); else emBreve() }} />
            </>
          )}
          {aba === 'minhas' && <SecMinhas minhas={minhas} onAcao={emBreve} onEncerrar={encerrarCampanha} onAddItens={abrirAddItens} onSincronizar={sincronizarPedidos} notify={notify} full />}
          {aba === 'convites' && <SecConvites convites={convites} onAderir={abrirAderir} onAutoAderir={aderirAutoConvite} onSair={sairConvite} onAplicarAutomaticos={aplicarAutomaticos} autoRodando={autoRodando} onContagem={reportContagem} full />}
          {aba === 'cupons' && <SecCupons cupons={cupons} onAcao={emBreve} onEncerrar={encerrarCampanha} full />}
        </>
      )}

      {aba === 'participantes' && <Participantes notify={notify} />}
          {aba === 'inteligencia' && <Inteligencia notify={notify} />}
      {aba === 'automacao' && <Automacao notify={notify} />}
      {aba === 'ads' && <Ads />}

      {modal === 'campanha' && <NovaCampanhaModal onClose={() => setModal(null)} onOk={() => { setModal(null); carregar() }} notify={notify} />}
      {modal === 'cupom' && <NovoCupomModal onClose={() => setModal(null)} onOk={() => { setModal(null); carregar() }} notify={notify} />}
      {picker && <SeletorItens modo={picker.modo} promotionId={picker.promotionId} promotionType={picker.promotionType} promoNome={picker.promoNome} inicio={picker.inicio} fim={picker.fim} onClose={() => setPicker(null)} onOk={() => { setPicker(null); carregar() }} notify={notify} />}
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
    <div className="rounded-2xl p-3 lift card-in" style={{ background: bg, border: `1px solid ${bd}` }}>
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
          <circle cx="26" cy="26" r="21" fill="none" stroke={cor} strokeWidth="4" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off} style={{ filter: `drop-shadow(0 0 3px ${cor}88)` }} />
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

function InsightsPromo({ convites, contagens, cont }) {
  const totPart = Object.values(contagens).reduce((a, c) => a + (c.participando || 0), 0)
  const totEleg = Object.values(contagens).reduce((a, c) => a + (c.total || 0), 0)
  const expirando = convites.filter((c) => { const d = diasAte(c.deadline_date); return d != null && d >= 0 && d <= 3 }).length
  let nAuto = 0
  try { const m = JSON.parse(localStorage.getItem('promo_convite_modo') || '{}'); nAuto = convites.filter((c) => m[c.id] === 'auto').length } catch { /* noop */ }
  const semParticipar = convites.filter((c) => { const cc = contagens[c.id]; return cc && cc.total > 0 && cc.participando === 0 }).length
  const ins = [
    { ic: Layers, cor: 'var(--accent)', tit: `${totPart} itens participando`, det: totEleg > 0 ? `de ${totEleg} elegíveis em ${convites.length} convites` : 'aderidos nos convites do ML' },
    { ic: Gift, cor: BLUE, tit: `${cont.coparticipadas ?? 0} coparticipados`, det: 'o ML subsidia parte do desconto — priorize estes' },
    { ic: Clock, cor: 'var(--warn)', tit: `${expirando} expira${expirando === 1 ? '' : 'm'} em ≤3 dias`, det: expirando > 0 ? 'adira antes do prazo de adesão fechar' : 'nenhum convite perto do prazo' },
    { ic: Zap, cor: 'var(--ok)', tit: `${nAuto} em automático`, det: semParticipar > 0 ? `${semParticipar} convite(s) ainda sem itens seus` : 'aderem sozinhos, sempre acima do piso' },
  ]
  return (
    <div className="grid grid-cols-4 gap-3 mt-3">
      {ins.map((x, i) => (
        <div key={i} className="rounded-2xl p-3 glass lift flex items-center gap-3 card-in" style={{ animationDelay: `${i * 40}ms` }}>
          <div className="w-9 h-9 rounded-xl grid place-items-center flex-none" style={{ background: `${x.cor}1e`, color: x.cor }}><x.ic size={17} /></div>
          <div className="min-w-0">
            <div className="text-[13px] font-extrabold truncate num" style={{ color: x.cor }}>{x.tit}</div>
            <div className="text-[9.5px] text-faint leading-snug">{x.det}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
function SecConvites({ convites, onAderir, onAutoAderir, onSair, onAplicarAutomaticos, autoRodando, onContagem, full }) {
  const [modos, setModos] = useState(() => { try { return JSON.parse(localStorage.getItem('promo_convite_modo') || '{}') } catch { return {} } })
  const [aoAbrir, setAoAbrir] = useState(() => localStorage.getItem('promo_convite_ao_abrir') === '1')
  const setModo = (id, mo) => { setModos((m) => ({ ...m, [id]: mo })); setModoConviteLS(id, mo) }
  const modoDe = (id) => modos[id] || 'manual'
  const alvosAuto = convites.filter((c) => modoDe(c.id) === 'auto')
  const nAuto = alvosAuto.length
  const jaRodou = useRef(false)
  useEffect(() => {
    if (aoAbrir && nAuto > 0 && !jaRodou.current && !autoRodando) {
      jaRodou.current = true
      onAplicarAutomaticos(alvosAuto)
    }
  }, [aoAbrir, nAuto]) // eslint-disable-line react-hooks/exhaustive-deps
  const toggleAoAbrir = () => { const v = !aoAbrir; setAoAbrir(v); localStorage.setItem('promo_convite_ao_abrir', v ? '1' : '0') }
  return (
    <>
      <Secao icon={Zap} cor={ML} titulo="Convites do Mercado Livre" pill="manual ou automático" pillCor={ML} right={convites.length > 0 ? (
        <div className="flex items-center gap-2.5">
          <label className="flex items-center gap-1.5 text-[10px] text-dim cursor-pointer" title="Ao abrir a aba, adere sozinho os convites marcados como automático (sempre acima do piso)">
            <input type="checkbox" checked={aoAbrir} onChange={toggleAoAbrir} style={{ accentColor: '#2FD98D' }} /> aplicar ao abrir
          </label>
          <button onClick={() => onAplicarAutomaticos(alvosAuto)} disabled={autoRodando || nAuto === 0} className="text-[11px] font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-50" style={nAuto > 0 ? { background: 'linear-gradient(135deg, var(--ok), #27c07d)', color: '#08130d' } : { background: 'rgba(255,255,255,.08)', color: 'var(--faint)' }}>
            {autoRodando ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />} Aplicar automáticos ({nAuto})
          </button>
        </div>
      ) : null} />
      {nAuto > 0 && <div className="text-[10px] text-faint mb-2 flex items-center gap-1.5"><Shield size={12} style={{ color: 'var(--ok)' }} /> {nAuto} convite(s) em automático — aderem sozinhos os itens elegíveis a −15% acima do piso; nunca furam a margem.</div>}
      {convites.length === 0
        ? <Vazio texto="Nenhum convite do ML no momento. Eles aparecem aqui quando o Mercado Livre te convida — Oferta Relâmpago, Oferta do Dia, coparticipação, Price Matching, PIX, etc." />
        : <div className="grid grid-cols-3 gap-3">{convites.map((c, i) => <ConviteCard key={c.id} p={c} onAderir={onAderir} onAutoAderir={onAutoAderir} onSair={onSair} onContagem={onContagem} modo={modoDe(c.id)} onSetModo={(mo) => setModo(c.id, mo)} idx={i} />)}</div>}
    </>
  )
}
const getModoConvite = (id) => { try { return (JSON.parse(localStorage.getItem('promo_convite_modo') || '{}'))[id] || 'manual' } catch { return 'manual' } }
const setModoConviteLS = (id, modo) => { try { const m = JSON.parse(localStorage.getItem('promo_convite_modo') || '{}'); m[id] = modo; localStorage.setItem('promo_convite_modo', JSON.stringify(m)) } catch { /* noop */ } }

function ConviteCard({ p, onAderir, onAutoAderir, onSair, onContagem, modo, onSetModo, idx = 0 }) {
  const m = meta(p.type); const Ic = m.icon
  const ben = p.benefits || {}
  const cofin = ben.type === 'REBATE' ? `ML ${ben.meli_percent ?? '—'}% + você ${ben.seller_percent ?? '—'}%` : null
  const ddl = dcurta(p.deadline_date); const dd = diasAte(p.deadline_date)
  const vi = dcurta(p.start_date), vf = dcurta(p.finish_date)
  const [cont, setCont] = useState(null)
  const [autoBusy, setAutoBusy] = useState(false)
  const [sairBusy, setSairBusy] = useState(false)
  const rodarAuto = async () => { setAutoBusy(true); try { await onAutoAderir(p) } finally { setAutoBusy(false) } }
  const rodarSair = async () => { setSairBusy(true); try { await onSair(p) } finally { setSairBusy(false) } }
  useEffect(() => {
    let vivo = true
    api.mlPromoContagem(p.id, p.type).then((r) => { if (vivo) { setCont(r); onContagem && onContagem(p.id, r.total || 0, r.participando || 0) } }).catch(() => {})
    return () => { vivo = false }
  }, [p.id, p.type]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="rounded-2xl p-3.5 relative overflow-hidden lift card-in" style={{ background: `linear-gradient(160deg, ${m.cor}14, rgba(0,0,0,.14))`, border: `1px solid ${m.cor}33`, animationDelay: `${idx * 45}ms` }}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${m.cor}, transparent)` }} />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg grid place-items-center flex-none" style={{ background: `${m.cor}22`, color: m.cor }}><Ic size={16} /></div>
        <div className="text-[9.5px] font-extrabold tracking-wide" style={{ color: m.cor }}>{m.label.toUpperCase()}</div>
      </div>
      <div className="text-[13px] font-bold mt-2">{p.name || m.label}</div>
      <div className="text-[10px] text-dim mt-1 min-h-[26px]">{m.desc}</div>
      {cofin && <div className="inline-flex items-center gap-1.5 text-[9.5px] font-extrabold px-2 py-0.5 rounded-full mt-1" style={{ background: 'rgba(91,141,239,.16)', color: BLUE }}><Gift size={11} /> {cofin}</div>}
      {(vi || vf) && <div className="text-[9px] text-faint mt-1.5 flex items-center gap-1"><Calendar size={10} /> vale {vi || '—'} → {vf || '—'}</div>}
      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
        {cont ? <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: 'rgba(214,0,127,.12)', color: 'var(--accent)' }}>{cont.total} elegíveis</span> : <span className="skel" style={{ height: 15, width: 62, borderRadius: 999 }} />}
        {cont && cont.participando > 0 && <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: 'rgba(47,217,141,.14)', color: 'var(--ok)' }}><Check size={9} /> {cont.participando} participando</span>}
      </div>
      <div className="flex items-center gap-2 mt-3">
        {ddl && <span className="text-[9.5px] font-extrabold px-2 py-1 rounded-lg inline-flex items-center gap-1.5" style={{ background: 'rgba(224,162,60,.14)', color: 'var(--warn)' }}><Clock size={11} /> {dd != null && dd >= 0 ? `${dd}d` : ddl}</span>}
        <div className="ml-auto flex items-center gap-1.5">
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--glass-border)' }} title="Manual: você escolhe os itens · Automático: adere sozinho os itens acima do piso">
            <button onClick={() => onSetModo('manual')} className="text-[9px] font-extrabold px-2 py-1" style={modo === 'manual' ? { background: 'var(--accent)', color: '#fff' } : { background: 'transparent', color: 'var(--dim)' }}>Manual</button>
            <button onClick={() => onSetModo('auto')} className="text-[9px] font-extrabold px-2 py-1" style={modo === 'auto' ? { background: 'var(--ok)', color: '#08130d' } : { background: 'transparent', color: 'var(--dim)' }}>Auto</button>
          </div>
          {modo === 'auto'
            ? <button onClick={rodarAuto} disabled={autoBusy} className="text-[10.5px] font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, var(--ok), #27c07d)', color: '#08130d' }}>{autoBusy ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} Aderir auto</button>
            : <button onClick={() => onAderir(p)} className="text-[10.5px] font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1" style={{ background: 'linear-gradient(135deg, #F2C200, #d9a400)', color: '#3a2c00' }}>Aderir <ChevronRight size={12} /></button>}
        </div>
      </div>
      {modo === 'auto' && <div className="text-[9px] mt-1.5 flex items-center gap-1" style={{ color: 'var(--ok)' }}><Shield size={10} /> Automático: adere os itens elegíveis a −15% acima do piso; nunca fura a margem.</div>}
      {cont && cont.participando > 0 && <button onClick={rodarSair} disabled={sairBusy} className="text-[9.5px] font-bold mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg disabled:opacity-50" style={{ background: 'rgba(255,122,122,.12)', color: 'var(--danger)', border: '1px solid rgba(255,122,122,.3)' }}>{sairBusy ? <Loader2 size={10} className="animate-spin" /> : <Ban size={10} />} Deixar de aderir ({cont.participando})</button>}
    </div>
  )
}

/* ================= MINHAS CAMPANHAS ================= */
function SecMinhas({ minhas, onAcao, onEncerrar, onAddItens, onSincronizar, notify, full }) {
  return (
    <>
      <Secao icon={Tag} cor="var(--accent)" titulo="Minhas campanhas" pill="você cria" pillCor="var(--accent)" />
      {minhas.length === 0
        ? <Vazio texto="Você ainda não tem campanhas próprias. Crie uma Campanha de %, um Desconto individual ou um Desconto por quantidade — sempre com a trava de margem no Preço Bling." />
        : minhas.map((m, i) => <CampanhaCard key={m.id} p={m} onAcao={onAcao} onEncerrar={onEncerrar} onAddItens={onAddItens} onSincronizar={onSincronizar} notify={notify} idx={i} />)}
    </>
  )
}
const SAUDE = {
  saudavel: { c: 'var(--ok)', t: 'Saudável', Icon: Check },
  atencao: { c: 'var(--warn)', t: 'Atenção', Icon: AlertTriangle },
  risco: { c: 'var(--danger)', t: 'Risco', Icon: AlertTriangle },
}
const INS = {
  risco: { c: 'var(--danger)', Icon: AlertTriangle },
  oportunidade: { c: 'var(--warn)', Icon: TrendingUp },
  acao: { c: 'var(--accent)', Icon: Zap },
  positivo: { c: 'var(--ok)', Icon: Check },
  info: { c: 'var(--dim)', Icon: Info },
}

function CampanhaCard({ p, onAcao, onEncerrar, onAddItens, onSincronizar, notify, idx = 0 }) {
  const m = meta(p.type); const Ic = m.icon
  const st = stInfo(p.status)
  const ini = dcurta(p.start_date), fim = dcurta(p.finish_date)
  const barCor = /started|active/.test(p.status || '') ? 'var(--ok)' : p.status === 'pending' ? BLUE : 'var(--faint)'
  const tempo = (p.start_date && p.finish_date) ? Math.round(pctTempo(p.start_date, p.finish_date)) : null
  const restam = diasAte(p.finish_date)
  const [met, setMet] = useState(null)
  const [carrMet, setCarrMet] = useState(true)
  const [drawer, setDrawer] = useState(false)

  useEffect(() => {
    let vivo = true
    setCarrMet(true)
    api.mlPromoMetricas(p.id, p.type, p.start_date, p.finish_date)
      .then((r) => { if (vivo) setMet(r) })
      .catch(() => { if (vivo) setMet(null) })
      .finally(() => { if (vivo) setCarrMet(false) })
    return () => { vivo = false }
  }, [p.id, p.type, p.start_date, p.finish_date])

  const sd = met ? (SAUDE[met.saude] || SAUDE.atencao) : null
  const topIns = met && met.insights && met.insights.length ? met.insights[0] : null
  const nIns = met && met.insights ? met.insights.length : 0
  const tileV = (v) => carrMet ? '…' : (v == null ? '—' : v)

  return (
    <div onClick={() => setDrawer(true)} className="rounded-2xl p-3.5 mb-3 glass lift card-in cursor-pointer" style={{ boxShadow: `inset 3px 0 0 ${barCor}`, animationDelay: `${idx * 45}ms` }}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-bold truncate">{p.name || m.label}</span>
            <Chip cor={m.cor}><Ic size={10} />{m.label}</Chip>
            {p.sub_type === 'FLEXIBLE_PERCENTAGE' && <Chip cor={PURPLE}>flexível</Chip>}
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: `${st.c}22`, color: st.c }}>{st.t}</span>
            {sd && met.itens > 0 && <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: `${sd.c}1f`, color: sd.c }}><sd.Icon size={10} /> {sd.t}</span>}
            {met && met.itens != null && <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: 'rgba(214,0,127,.12)', color: 'var(--accent)' }}><Layers size={10} /> {met.itens} participando</span>}
          </div>
          <div className="text-[11px] text-faint mt-1">{p.id} {ini && `· ${ini} → ${fim}`} {restam != null && restam >= 0 && `· termina em ${restam}d`}</div>
        </div>
        {tempo != null && <Donut pct={tempo} cor={barCor} valor={`${tempo}%`} label="tempo" />}
      </div>
      <div className="grid gap-2.5 mt-3" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
        <Mini l="Itens" v={tileV(met?.itens)} s={met ? `${met.itens_ativos} ativos` : 'agregação'} />
        <Mini l="Desc. médio" v={met?.desconto_medio_pct != null ? `${met.desconto_medio_pct}%` : tileV(null)} s="médio" />
        <Mini l="Líquido real" v={met?.liquido_total != null ? brl(met.liquido_total) : tileV(null)} s="net_proceeds" hero />
        <Mini l="Lucro real" v={met?.lucro_total != null ? brl(met.lucro_total) : tileV(null)} s="− custo Bling" prof />
        <Mini l="Margem méd." v={met?.margem_media_pct != null ? `${met.margem_media_pct}%` : tileV(null)} s="média" />
        <Mini l="Abaixo do piso" v={tileV(met?.abaixo_piso)} s={met && met.abaixo_piso > 0 ? 'furam a margem' : 'protegido'} danger={met && met.abaixo_piso > 0} />
      </div>
      {tempo != null && <div className="h-1.5 rounded-full overflow-hidden mt-2.5" style={{ background: 'rgba(255,255,255,.08)' }}><div style={{ width: `${tempo}%`, height: '100%', background: `linear-gradient(90deg, ${barCor}, ${barCor}99)` }} /></div>}
      {topIns && (() => { const it = INS[topIns.tipo] || INS.info; return (
        <button onClick={() => setDrawer(true)} className="w-full text-left mt-2.5 rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: `${it.c}12`, border: `1px solid ${it.c}33` }}>
          <it.Icon size={14} style={{ color: it.c, flex: 'none' }} />
          <span className="text-[11px] font-semibold truncate" style={{ color: it.c }}>{topIns.titulo}</span>
          {nIns > 1 && <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full flex-none" style={{ background: `${it.c}22`, color: it.c }}>+{nIns - 1}</span>}
          <ChevronRight size={13} className="flex-none" style={{ color: it.c }} />
        </button>
      ) })()}
      <div className="flex gap-2 mt-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
        <Act icon={Plus} onClick={() => onAddItens && onAddItens(p)}>Adicionar itens</Act>
        <Act icon={BarChart3} onClick={() => setDrawer(true)}>Desempenho{nIns ? ` (${nIns})` : ''}</Act>
        <Act icon={Gauge} onClick={() => onAcao('Simular')}>Simular</Act>
        <Act icon={Trash2} danger onClick={() => onEncerrar && onEncerrar(p)}>Encerrar</Act>
      </div>
      {drawer && <DesempenhoDrawer met={met} carregando={carrMet} p={p} onClose={() => setDrawer(false)} onSincronizar={onSincronizar} notify={notify} />}
    </div>
  )
}



function Mini({ l, v, s, hero, prof, danger }) {
  const bg = danger ? 'linear-gradient(160deg, rgba(255,122,122,.16), rgba(255,122,122,.02))'
    : hero ? 'linear-gradient(160deg, rgba(47,217,141,.14), rgba(47,217,141,.02))'
      : prof ? 'linear-gradient(160deg, rgba(160,107,232,.14), rgba(160,107,232,.02))' : 'rgba(0,0,0,.24)'
  const bd = danger ? '1px solid rgba(255,122,122,.35)' : hero ? '1px solid rgba(47,217,141,.3)' : prof ? '1px solid rgba(160,107,232,.3)' : '1px solid transparent'
  const vc = danger ? 'var(--danger)' : hero ? 'var(--ok)' : prof ? PURPLE : 'var(--text)'
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
function SecCupons({ cupons, onAcao, onEncerrar, full }) {
  return (
    <>
      <Secao icon={Ticket} cor={ML} titulo="Cupons" pill="com código · público · frete grátis" pillCor={ML} />
      {cupons.length === 0
        ? <Vazio texto="Nenhum cupom ativo. Crie um cupom com código (para distribuir aos seguidores por fora) ou público (o ML destaca para todos os compradores das publicações)." />
        : cupons.map((m, i) => <CupomCard key={m.id} p={m} onAcao={onAcao} onEncerrar={onEncerrar} idx={i} />)}
    </>
  )
}
function CupomCard({ p, onAcao, onEncerrar, idx = 0 }) {
  const st = stInfo(p.status); const ini = dcurta(p.start_date), fim = dcurta(p.finish_date)
  return (
    <div className="rounded-2xl p-3.5 mb-3 glass lift card-in" style={{ boxShadow: 'inset 3px 0 0 #F2C200', animationDelay: `${idx * 45}ms` }}>
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
        <Act icon={Trash2} danger onClick={() => onEncerrar && onEncerrar(p)}>Encerrar</Act>
      </div>
    </div>
  )
}

/* ================= SIMULADOR ================= */
function Simulador({ notify, recarregar }) {
  const [itemId, setItemId] = useState('')
  const [desc, setDesc] = useState(20)
  const [res, setRes] = useState(null)
  const [busy, setBusy] = useState(false)
  const [aplicando, setAplicando] = useState(false)
  const [dur, setDur] = useState(7)
  const [comparar, setComparar] = useState(false)
  const [descB, setDescB] = useState(30)
  const [resB, setResB] = useState(null)
  const [busyB, setBusyB] = useState(false)

  const simular = useCallback(async (d = desc, id = itemId) => {
    const iid = (id || '').trim(); if (!iid) return
    setBusy(true)
    try { setRes(await api.mlPromoSimular({ item_id: iid, desconto_pct: Number(d) })) }
    catch (e) { notify(e.message || 'Falha na simulação', 'danger'); setRes(null) }
    finally { setBusy(false) }
  }, [desc, itemId, notify])

  const simularB = useCallback(async (d = descB, id = itemId) => {
    const iid = (id || '').trim(); if (!iid) return
    setBusyB(true)
    try { setResB(await api.mlPromoSimular({ item_id: iid, desconto_pct: Number(d) })) }
    catch { setResB(null) }
    finally { setBusyB(false) }
  }, [descB, itemId])

  const pisoPct = res && res.preco_atual && res.piso_preco ? (1 - res.piso_preco / res.preco_atual) * 100 : null
  const pos = (pct) => Math.max(0, Math.min(100, ((pct - 5) / (40 - 5)) * 100))
  const precoEm = (pct) => res && res.preco_atual ? res.preco_atual * (1 - pct / 100) : null

  const aplicar = async () => {
    if (!res || res.acima_do_piso === false) return
    setAplicando(true)
    try {
      await api.mlPromoDesconto(res.item_id, { deal_price: res.deal_price, fim: isoDe(dur, '23:59:59') })
      notify(`Desconto de ${res.desconto_pct}% aplicado por ${dur} dias (${brl(res.deal_price)}).`, 'ok')
      recarregar && recarregar()
    } catch (e) { notify(traduzErroML(e.message) || 'Falha ao aplicar o desconto', 'danger') }
    finally { setAplicando(false) }
  }
  const sugPct = res && res.sugestao_pct != null ? res.sugestao_pct : null
  const vencedor = (() => {
    if (!res || !resB) return null
    const aok = res.acima_do_piso !== false, bok = resB.acima_do_piso !== false
    if (aok && !bok) return 'A'; if (bok && !aok) return 'B'
    if (res.lucro == null || resB.lucro == null) return null
    return res.lucro >= resB.lucro ? 'A' : 'B'
  })()

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

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-[9.5px] text-faint font-extrabold uppercase tracking-wide">Desconto rápido</span>
        {[10, 15, 20, 25, 30].map((d) => (
          <button key={d} onClick={() => { setDesc(d); if (itemId.trim()) simular(d) }} className="text-[11px] font-bold px-2.5 py-1 rounded-full num transition-colors"
            style={desc === d ? { background: 'var(--accent)', color: '#fff', boxShadow: '0 3px 10px rgba(214,0,127,.35)' } : { background: 'rgba(255,255,255,.06)', color: 'var(--dim)', border: '1px solid var(--glass-border)' }}>{d}%</button>
        ))}
        {res && res.sugestao_pct != null && <button onClick={() => { const d = Math.round(res.sugestao_pct); setDesc(d); simular(d) }} className="text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1" style={{ background: 'rgba(242,194,0,.16)', color: ML, border: '1px solid rgba(242,194,0,.3)' }}><Sparkles size={11} /> sugestão ML {res.sugestao_pct}%</button>}
        <button onClick={() => { const nv = !comparar; setComparar(nv); if (nv && itemId.trim()) simularB(descB) }} className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 transition-colors" style={comparar ? { background: BLUE, color: '#fff' } : { background: 'rgba(255,255,255,.06)', color: 'var(--dim)', border: '1px solid var(--glass-border)' }}><SlidersHorizontal size={11} /> Comparar</button>
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
              {/* sugestão do ML */}
              {sugPct != null && sugPct >= 5 && sugPct <= 40 && (
                <div className="absolute" style={{ left: `${pos(sugPct)}%`, top: 10 }}>
                  <div style={{ width: 2, height: 40, background: '#F2C200' }} />
                  <div className="absolute text-[8px] font-extrabold whitespace-nowrap" style={{ top: -12, left: '50%', transform: 'translateX(-50%)', color: '#F2C200' }}>sugestão ML</div>
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
            {res.deal_price > 0 && (() => {
              const dp = res.deal_price
              const podeDecompor = res.custo != null && res.lucro != null && res.lucro >= 0 && res.liquido != null
              const segs = podeDecompor
                ? [{ l: 'Custo', v: res.custo, c: 'rgba(255,255,255,.30)' }, { l: 'Lucro', v: res.lucro, c: PURPLE }, { l: 'Taxas ML', v: res.taxas, c: 'var(--warn)' }]
                : [{ l: 'Líquido', v: res.liquido, c: 'var(--ok)' }, { l: 'Taxas ML', v: res.taxas, c: 'var(--warn)' }]
              return (
                <div className="mt-2.5">
                  <div className="text-[9px] uppercase tracking-wide text-faint font-extrabold mb-1">Onde vai cada real do preço</div>
                  <div className="flex h-4 rounded-md overflow-hidden" style={{ background: 'rgba(0,0,0,.3)' }}>
                    {segs.map((s, i) => (s.v || 0) > 0 && <div key={i} title={`${s.l}: ${brl(s.v)}`} style={{ width: `${(s.v / dp) * 100}%`, background: s.c }} />)}
                  </div>
                  <div className="flex gap-3 mt-1 flex-wrap">
                    {segs.map((s, i) => <span key={i} className="text-[9px] text-dim inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: s.c }} /> {s.l} <b className="num">{brl(s.v)}</b></span>)}
                  </div>
                </div>
              )
            })()}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-faint font-bold uppercase tracking-wide">Duração</span>
              <select value={dur} onChange={(e) => setDur(Number(e.target.value))} className="text-[11px] px-2 py-1.5 rounded-lg bg-transparent text-fg" style={{ border: '1px solid var(--glass-border)' }}>
                <option value={3}>3 dias</option>
                <option value={7}>7 dias</option>
                <option value={14}>14 dias</option>
              </select>
              <button onClick={aplicar} disabled={res.acima_do_piso === false || aplicando} className="flex-1 text-[11px] font-bold px-3 py-2 rounded-xl text-white inline-flex items-center justify-center gap-1.5 disabled:opacity-40" style={{ background: 'linear-gradient(135deg, var(--accent), #a80063)' }}>{aplicando ? <Loader2 size={13} className="animate-spin" /> : <Percent size={13} />} {res.acima_do_piso === false ? 'Abaixo do piso' : 'Aplicar desconto'}</button>
            </div>
          </div>
        </div>
      )}

      {comparar && res && (
        <div className="mt-4 pt-3" style={{ borderTop: '1px dashed var(--glass-border)' }}>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-[9.5px] text-faint font-extrabold uppercase tracking-wide">Comparar com</span>
            {[10, 15, 20, 25, 30].map((d) => (
              <button key={d} onClick={() => { setDescB(d); simularB(d) }} className="text-[11px] font-bold px-2.5 py-1 rounded-full num transition-colors" style={descB === d ? { background: BLUE, color: '#fff' } : { background: 'rgba(255,255,255,.06)', color: 'var(--dim)', border: '1px solid var(--glass-border)' }}>{d}%</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MiniResultado r={res} label={`Desconto A · ${res.desconto_pct}%`} cor="var(--accent)" melhor={vencedor === 'A'} />
            {resB ? <MiniResultado r={resB} label={`Desconto B · ${resB.desconto_pct}%`} cor={BLUE} melhor={vencedor === 'B'} />
              : <div className="rounded-xl grid place-items-center text-[11px] text-faint" style={{ border: '1px dashed var(--glass-border)', minHeight: 120 }}>{busyB ? <Loader2 className="animate-spin" size={16} /> : 'Escolha o desconto B'}</div>}
          </div>
          {resB && res.lucro != null && resB.lucro != null && (
            <div className="text-[10.5px] mt-2 flex items-center gap-1.5" style={{ color: (resB.lucro - res.lucro) >= 0 ? 'var(--ok)' : 'var(--danger)' }}>{(resB.lucro - res.lucro) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} Desconto B rende <b className="num">{brl(Math.abs(resB.lucro - res.lucro))}</b> {(resB.lucro - res.lucro) >= 0 ? 'a mais' : 'a menos'} de lucro por venda que o A.</div>
          )}
        </div>
      )}
    </div>
  )
}

function MiniResultado({ r, label, cor, melhor }) {
  return (
    <div className="rounded-xl p-3 relative" style={{ background: 'rgba(0,0,0,.22)', border: `1px solid ${melhor ? 'rgba(47,217,141,.5)' : 'var(--glass-border)'}` }}>
      {melhor && <span className="absolute -top-2 right-3 text-[8.5px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: 'var(--ok)', color: '#08130d' }}>melhor lucro</span>}
      <div className="text-[10px] font-extrabold" style={{ color: cor }}>{label}</div>
      <div className="text-[16px] font-extrabold num mt-1">{brl(r.deal_price)}</div>
      <div className="flex flex-col gap-0.5 mt-2 text-[11px]">
        <div className="flex justify-between"><span className="text-dim">Líquido</span><span className="num" style={{ color: 'var(--ok)' }}>{brl(r.liquido)}</span></div>
        <div className="flex justify-between"><span className="text-dim">Lucro</span><span className="num" style={{ color: PURPLE, fontWeight: 800 }}>{r.lucro == null ? '—' : `${brl(r.lucro)} · ${r.margem_pct ?? '—'}%`}</span></div>
      </div>
      <div className="mt-2">
        {r.acima_do_piso === false
          ? <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,122,122,.14)', color: 'var(--danger)' }}>abaixo do piso</span>
          : r.acima_do_piso ? <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: 'rgba(47,217,141,.14)', color: 'var(--ok)' }}>acima do piso</span> : null}
      </div>
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
function GanhosPorCampanha() {
  const [d, setD] = useState(null)
  const [carr, setCarr] = useState(true)
  useEffect(() => {
    let vivo = true
    api.mlPromoParticipantes().then((r) => { if (vivo) setD(r) }).catch(() => { if (vivo) setD(null) }).finally(() => { if (vivo) setCarr(false) })
    return () => { vivo = false }
  }, [])
  const camps = (d?.campanhas || []).filter((c) => c.n > 0).slice(0, 8)
  const maxV = Math.max(1, ...camps.map((c) => c.voce_recebe || 0))
  return (
    <div className="rounded-2xl p-4 mt-3 glass">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-wide text-faint font-extrabold flex items-center gap-1.5"><TrendingUp size={12} style={{ color: 'var(--ok)' }} /> Ganhos e descontos por campanha</span>
        {d && <span className="text-[10px] text-faint num">{d.totais.campanhas} campanhas · {d.totais.produtos} produtos</span>}
      </div>
      {carr ? (
        <div>
          <div className="grid grid-cols-2 gap-3 mb-3">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="skel" style={{ height: 64, borderRadius: 14 }} />)}</div>
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skel mb-2" style={{ height: 26, borderRadius: 8 }} />)}
        </div>
      ) : !d || camps.length === 0 ? (
        <div className="text-[11.5px] text-faint py-6 text-center">Nenhum produto participando de campanhas ainda. Assim que houver participação, o ganho estimado e o desconto concedido aparecem aqui.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-xl p-3" style={{ background: 'rgba(47,217,141,.08)', border: '1px solid rgba(47,217,141,.28)' }}>
              <div className="text-[9px] uppercase text-faint font-extrabold flex items-center gap-1"><CircleDollarSign size={11} style={{ color: 'var(--ok)' }} /> Você recebe · total</div>
              <div className="text-[19px] font-extrabold num mt-1" style={{ color: 'var(--ok)' }}>{brl(d.totais.voce_recebe)}</div>
              <div className="text-[9.5px] text-faint mt-0.5">líquido estimado dos itens participantes</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(224,162,60,.08)', border: '1px solid rgba(224,162,60,.28)' }}>
              <div className="text-[9px] uppercase text-faint font-extrabold flex items-center gap-1"><TrendingDown size={11} style={{ color: 'var(--warn)' }} /> Desconto concedido · total</div>
              <div className="text-[19px] font-extrabold num mt-1" style={{ color: 'var(--warn)' }}>{brl(d.totais.desconto)}</div>
              <div className="text-[9.5px] text-faint mt-0.5">o quanto você abre mão nas campanhas</div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {camps.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="text-[10.5px] truncate flex-none" style={{ width: 128 }} title={c.nome}>{c.nome || meta(c.type).label}</span>
                <div className="flex-1 h-5 rounded-md overflow-hidden relative" style={{ background: 'rgba(255,255,255,.05)' }}>
                  <div className="h-full rounded-md flex items-center justify-end pr-1.5" style={{ width: `${Math.max(9, (c.voce_recebe / maxV) * 100)}%`, background: `linear-gradient(90deg, ${meta(c.type).cor}55, ${meta(c.type).cor})` }}>
                    <span className="text-[9px] font-extrabold num text-white">{brl(c.voce_recebe)}</span>
                  </div>
                </div>
                <span className="text-[9px] num flex-none text-right" style={{ width: 62, color: 'var(--warn)' }}>−{brl(c.desconto)}</span>
                <span className="text-[9px] text-faint num flex-none text-right" style={{ width: 30 }}>{c.n}un</span>
              </div>
            ))}
          </div>
          <div className="text-[9px] text-faint mt-2 flex items-center gap-1"><Info size={10} /> Barra = você recebe (líquido) · à direita = desconto concedido · un = produtos na campanha.</div>
        </>
      )}
    </div>
  )
}

function Calendario({ minhas, cupons, convites, onAbrirCampanha }) {
  const linhas = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const fimJanela = new Date(hoje); fimJanela.setDate(fimJanela.getDate() + 30)
    const span = fimJanela - hoje
    const barra = (p, cor, fonte) => {
      if (!p.start_date && !p.finish_date) return null
      const ini = p.start_date ? new Date(p.start_date) : hoje
      const fim = p.finish_date ? new Date(p.finish_date) : fimJanela
      const a = Math.max(hoje, ini), b = Math.min(fimJanela, fim)
      if (b <= hoje || a >= fimJanela) return null
      const left = Math.max(0, ((a - hoje) / span) * 100)
      const width = Math.max(4, Math.min(100 - left, ((b - a) / span) * 100))
      return { left, width, nome: p.name || meta(p.type).label, cor, promo: p, fonte, ini: p.start_date, fim: p.finish_date }
    }
    const arr = []
    convites.forEach((c) => { const b = barra(c, ML, 'convite'); if (b) arr.push(b) })
    minhas.forEach((m) => { const b = barra(m, 'var(--accent)', 'minha'); if (b) arr.push(b) })
    cupons.forEach((c) => { const b = barra(c, BLUE, 'cupom'); if (b) arr.push(b) })
    return arr.sort((x, y) => x.left - y.left)
  }, [minhas, cupons, convites])

  return (
    <>
      <Secao icon={Calendar} cor="var(--accent)" titulo="Calendário de campanhas" pill="próximos 30 dias · clique para abrir" pillCor={BLUE} />
      <div className="rounded-2xl p-4 glass lift">
        {linhas.length === 0
          ? <div className="text-[11.5px] text-faint flex items-center gap-2"><Info size={14} /> Sem campanhas com data no período. Campanhas agendadas aparecem aqui numa linha do tempo.</div>
          : <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 text-[8.5px] text-faint mb-1 flex-wrap">
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: ML }} /> Convite do ML</span>
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} /> Minha campanha</span>
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: BLUE }} /> Cupom</span>
              </div>
              {linhas.map((l, i) => (
                <button key={i} onClick={() => onAbrirCampanha && onAbrirCampanha(l.promo, l.fonte)} className="grid items-center gap-2 text-left group" style={{ gridTemplateColumns: '150px 1fr' }}>
                  <div className="text-[11px] text-dim truncate group-hover:text-fg flex items-center gap-1">{l.nome}<ChevronRight size={11} className="opacity-0 group-hover:opacity-100 flex-none" /></div>
                  <div className="relative h-6 rounded-lg overflow-hidden" style={{ background: 'rgba(0,0,0,.2)' }} title={`${dcurta(l.ini) || '—'} → ${dcurta(l.fim) || '—'}`}>
                    <div className="absolute rounded-md flex items-center px-2 text-[8.5px] font-extrabold text-white whitespace-nowrap group-hover:brightness-110" style={{ left: `${l.left}%`, width: `${l.width}%`, top: 4, height: 16, background: `linear-gradient(90deg, ${l.cor}, ${l.cor}cc)`, boxShadow: `0 2px 8px ${l.cor}55` }}>{l.width > 14 ? `${dcurta(l.ini) || ''}` : ''}</div>
                  </div>
                </button>
              ))}
              <div className="flex items-center justify-between text-[8.5px] text-faint mt-1 px-[2px]"><span>hoje</span><span>+15d</span><span>+30d</span></div>
            </div>}
      </div>
    </>
  )
}

/* ================= INTELIGÊNCIA (prévia — Etapa 3) ================= */
function Inteligencia({ notify }) {
  return (
    <div className="mt-4">
      <Secao icon={Activity} cor={PURPLE} titulo="Inteligência" pill="buybox real · price-to-win" pillCor={PURPLE} />
      <BuyboxTracker notify={notify} />
      <div className="rounded-2xl p-4 glass mt-3" style={{ border: '1px dashed var(--glass-border)' }}>
        <div className="text-[10px] uppercase tracking-wide text-faint font-extrabold flex items-center gap-2 mb-2"><Activity size={13} style={{ color: PURPLE }} /> Elasticidade de preço por SKU <span className="text-[8.5px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(160,107,232,.16)', color: PURPLE }}>em construção</span></div>
        <div className="text-[11.5px] text-dim leading-relaxed">Vai cruzar as <b style={{ color: 'var(--fg)' }}>unidades vendidas antes e depois</b> de cada mudança de preço (do cache de pedidos) com o <b style={{ color: 'var(--fg)' }}>Δ preço</b> para achar o desconto que maximiza o lucro de cada anúncio — e alimentar os agentes. Precisa de histórico de vendas acumulado; conforme o cache cresce, os SKUs elásticos aparecem aqui com <b style={{ color: 'var(--fg)' }}>dados reais</b>, sem estimativas fabricadas.</div>
        <div className="text-[10px] text-faint mt-2.5 flex items-center gap-1.5"><Info size={12} /> Já reais e ativos: o <b style={{ color: PURPLE }}>rastreador de buybox</b> acima e os <b style={{ color: PURPLE }}>6 agentes</b> na aba Automação.</div>
      </div>
    </div>
  )
}

const BB_ST = {
  ganhando: { c: 'var(--ok)', t: 'no topo' },
  perdendo: { c: 'var(--danger)', t: 'perdendo' },
  compartilhando: { c: 'var(--warn)', t: 'dividindo' },
}

function BbKpi({ l, v, c, sub }) {
  return (
    <div className="rounded-xl px-2.5 py-2" style={{ background: `${c}12`, border: `1px solid ${c}2e` }}>
      <div className="text-[8px] uppercase tracking-wide text-faint font-extrabold">{l}</div>
      <div className="text-[18px] font-extrabold num" style={{ color: c }}>{v}</div>
      {sub && <div className="text-[8px] text-faint">{sub}</div>}
    </div>
  )
}

function BuyboxTracker({ notify }) {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [soPerdendo, setSoPerdendo] = useState(true)
  const [ajustandoId, setAjustandoId] = useState(null)

  const verificar = async (reset = true) => {
    reset ? setCarregando(true) : setCarregandoMais(true)
    try {
      const off = reset ? 0 : (dados?.offset || 0) + (dados?.limit || 20)
      const r = await api.mlBuybox(20, off, soPerdendo)
      setDados((prev) => {
        if (reset || !prev) return { ...r, verificados_total: r.verificados }
        const soma = { ...prev.resumo }
        for (const k in r.resumo) soma[k] = (soma[k] || 0) + r.resumo[k]
        return { ...r, itens: [...prev.itens, ...r.itens], resumo: soma, verificados_total: (prev.verificados_total || 0) + r.verificados }
      })
    } catch (e) { notify && notify(traduzErroML(e.message), 'danger') }
    finally { setCarregando(false); setCarregandoMais(false) }
  }

  const ajustar = async (it) => {
    if (!it.recuperavel || it.preco_para_ganhar == null) return
    setAjustandoId(it.item_id)
    try {
      await api.mlBuyboxAjustar(it.item_id, it.preco_para_ganhar)
      notify && notify(`${it.titulo || it.item_id}: preço ajustado para ${brl(it.preco_para_ganhar)} — recuperando o topo.`, 'ok')
      setDados((prev) => (prev ? { ...prev, itens: prev.itens.map((x) => (x.item_id === it.item_id ? { ...x, status: 'ganhando', meu_preco: it.preco_para_ganhar } : x)) } : prev))
    } catch (e) { notify && notify(traduzErroML(e.message), 'danger') }
    finally { setAjustandoId(null) }
  }

  const rs = dados?.resumo || {}
  return (
    <div className="rounded-2xl p-4 glass lift">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="text-[10px] uppercase tracking-wide text-faint font-extrabold flex items-center gap-2"><Target size={13} style={{ color: BLUE }} /> Rastreio de buybox — concorrência de catálogo</div>
        <span className="text-[8.5px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(47,217,141,.16)', color: 'var(--ok)' }}>dados reais</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setSoPerdendo((v) => !v)} className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={soPerdendo ? { background: 'rgba(255,122,122,.14)', color: 'var(--danger)', border: '1px solid rgba(255,122,122,.3)' } : { background: 'rgba(255,255,255,.06)', color: 'var(--dim)', border: '1px solid var(--glass-border)' }}>{soPerdendo ? 'só perdendo' : 'todos'}</button>
          <button onClick={() => verificar(true)} disabled={carregando} className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white inline-flex items-center gap-1.5 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, var(--accent), #a80063)' }}>{carregando ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Verificar concorrência</button>
        </div>
      </div>

      {!dados && !carregando && (
        <div className="text-[11px] text-faint p-6 text-center leading-relaxed">
          Consulta o <b>price_to_win</b> do ML anúncio por anúncio para achar onde você <b>perde o topo do catálogo</b> e por qual preço — cruzando com o piso para sugerir só o que recupera <b>sem furar a margem</b>. Clique em “Verificar concorrência”.
        </div>
      )}

      {carregando && !dados && <div className="p-1">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skel mb-2" style={{ height: 48, borderRadius: 12 }} />)}</div>}

      {dados && (
        <>
          <div className="grid grid-cols-4 gap-2.5 mb-3">
            <BbKpi l="Perdendo" v={rs.perdendo || 0} c="var(--danger)" />
            <BbKpi l="Recuperável" v={rs.recuperavel || 0} c="var(--ok)" sub="acima do piso" />
            <BbKpi l="Dividindo" v={rs.compartilhando || 0} c="var(--warn)" />
            <BbKpi l="No topo" v={rs.ganhando || 0} c="var(--ok)" />
          </div>
          <div className="text-[9.5px] text-faint mb-2">Verificados {dados.verificados_total || dados.verificados} de {dados.total_catalogo} anúncios ativos (dos mais caros aos mais baratos).</div>
          {dados.itens.length === 0 ? (
            <div className="text-[11px] text-faint p-4 text-center">Nenhum item {soPerdendo ? 'perdendo o buybox' : 'em concorrência'} nesta faixa. {dados.tem_mais ? 'Verifique mais abaixo.' : ''}</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {dados.itens.map((it) => { const si = BB_ST[it.status] || BB_ST.perdendo; return (
                <div key={it.item_id} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2" style={{ background: 'rgba(0,0,0,.22)', border: '1px solid var(--glass-border)' }}>
                  {it.imagem ? <img src={it.imagem} alt="" className="w-9 h-9 rounded-lg object-cover flex-none" /> : <div className="w-9 h-9 rounded-lg grid place-items-center flex-none" style={{ background: 'rgba(255,255,255,.05)' }}><Boxes size={15} className="text-faint" /></div>}
                  <div className="min-w-0 flex-1">
                    <div className="text-[11.5px] font-semibold truncate">{it.titulo || it.item_id}</div>
                    <div className="text-[9.5px] num truncate"><span className="text-faint">seu </span><span>{brl(it.meu_preco)}</span>{it.preco_vencedor != null && <><span className="text-faint"> · concorrente </span><span style={{ color: 'var(--warn)' }}>{brl(it.preco_vencedor)}</span></>}{it.piso != null && <><span className="text-faint"> · piso </span><span>{brl(it.piso)}</span></>}</div>
                  </div>
                  <span className="text-[8.5px] font-extrabold px-2 py-0.5 rounded-full flex-none" style={{ background: `${si.c}1f`, color: si.c }}>{si.t}</span>
                  {it.status !== 'ganhando' && it.preco_para_ganhar != null && (
                    it.recuperavel
                      ? <button onClick={() => ajustar(it)} disabled={ajustandoId === it.item_id} className="text-[10px] font-bold px-2.5 py-1 rounded-lg flex-none inline-flex items-center gap-1 disabled:opacity-50" style={{ background: 'rgba(47,217,141,.14)', color: 'var(--ok)', border: '1px solid rgba(47,217,141,.35)' }}>{ajustandoId === it.item_id ? <Loader2 size={11} className="animate-spin" /> : <Target size={11} />} p/ {brl(it.preco_para_ganhar)}</button>
                      : <span className="text-[8.5px] font-extrabold flex-none text-right" style={{ color: 'var(--danger)', maxWidth: 92 }}>recuperar fura o piso</span>
                  )}
                </div>
              ) })}
            </div>
          )}
          {dados.tem_mais && <button onClick={() => verificar(false)} disabled={carregandoMais} className="w-full text-[11px] text-dim py-2 mt-2 rounded-lg glass hover:text-fg disabled:opacity-50">{carregandoMais ? 'Verificando…' : 'Verificar mais 20'}</button>}
          <div className="text-[9.5px] text-faint mt-2 flex items-start gap-1.5"><Info size={12} className="flex-none mt-0.5" /> “Ajustar” muda o preço padrão do anúncio para o preço que recupera o topo — sempre acima do piso (a trava bloqueia o que furaria a margem).</div>
        </>
      )}
    </div>
  )
}

/* ================= AUTOMAÇÃO — 6 agentes (prévia — Etapa 4) ================= */
const AGENTES = [
  { key: 'margem', nm: 'Agente Margem', tg: 'margem folgada', icon: Wallet, cor: 'var(--ok)', trig: 'margem > piso + 8 pts', acao: 'desconto até (margem − piso)', chip: 'ótimo médio 14%' },
  { key: 'abc', nm: 'Agente Curva ABC', tg: 'exposição × liquidação', icon: Layers, cor: BLUE, trig: 'item A (alta receita)', acao: 'coparticipação / visibilidade', chip: 'classificação' },
  { key: 'giro', nm: 'Agente Giro', tg: 'queda de vendas', icon: TrendingDown, cor: 'var(--warn)', trig: 'giro caindo 40% em 30d', acao: 'PRICE_DISCOUNT · 7d', chip: 'do cache de pedidos' },
  { key: 'parado', nm: 'Agente Estoque Parado', tg: 'sem venda 30d+', icon: Boxes, cor: 'var(--danger)', trig: 'parado > 30 dias', acao: 'desconto seguro (folga)', chip: 'liquidação' },
  { key: 'estoque_baixo', nm: 'Agente Menor Estoque', tg: 'urgência × proteção', icon: Gauge, cor: 'var(--accent)', trig: 'estoque baixo + vendendo', acao: 'Relâmpago pequeno', chip: 'anti-ruptura' },
  { key: 'buybox', nm: 'Agente Posição / Buybox', tg: 'perda de destaque', icon: Target, cor: BLUE, trig: 'perdeu buybox', acao: 'preço p/ recuperar (price_to_win)', chip: 'na aba Inteligência' },
]
function Automacao({ notify }) {
  const [ligado, setLigado] = useState(() => { try { return JSON.parse(localStorage.getItem('promo_agentes') || '{}') } catch { return {} } })
  const [sugs, setSugs] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [aplicandoId, setAplicandoId] = useState(null)
  const [dispensados, setDispensados] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem('promo_dispensados') || '[]')) } catch { return new Set() } })
  const [modo, setModo] = useState(() => localStorage.getItem('promo_modo') || 'sugestivo')
  const trocarModo = (m) => { setModo(m); localStorage.setItem('promo_modo', m) }
  const [aplicandoTodas, setAplicandoTodas] = useState(false)

  const on = (k) => ligado[k] !== false // default ligado
  const toggle = (k) => { const n = { ...ligado, [k]: !on(k) }; setLigado(n); localStorage.setItem('promo_agentes', JSON.stringify(n)) }

  useEffect(() => {
    let vivo = true
    api.mlAgentesSugestoes(60).then((r) => { if (vivo) setSugs(r) }).catch(() => { if (vivo) setSugs(null) }).finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [])

  const dispensar = (id) => { const n = new Set(dispensados); n.add(id); setDispensados(n); localStorage.setItem('promo_dispensados', JSON.stringify([...n])) }
  const aplicar = async (s) => {
    if (s.deal_price_sugerido == null) return
    setAplicandoId(s.item_id)
    try {
      await api.mlPromoDesconto(s.item_id, { deal_price: s.deal_price_sugerido, fim: isoDe(7, '23:59:59') })
      notify && notify(`${s.titulo || s.item_id}: desconto aplicado (${brl(s.deal_price_sugerido)}, 7 dias).`, 'ok')
      dispensar(s.item_id)
    } catch (e) { notify && notify(traduzErroML(e.message), 'danger') }
    finally { setAplicandoId(null) }
  }

  const lista = (sugs?.sugestoes || []).filter((s) => on(s.agente) && !dispensados.has(s.item_id))
  const porAgente = sugs?.por_agente || {}
  const aplicaveis = lista.filter((s) => s.deal_price_sugerido != null)
  const aplicarTodas = async () => {
    if (!aplicaveis.length) return
    if (!window.confirm(`Aplicar ${aplicaveis.length} sugestão(ões) segura(s)? Todas respeitam o piso do Preço Bling (7 dias cada).`)) return
    setAplicandoTodas(true)
    let ok = 0, falhas = 0
    for (const s of aplicaveis) {
      try { await api.mlPromoDesconto(s.item_id, { deal_price: s.deal_price_sugerido, fim: isoDe(7, '23:59:59') }); dispensar(s.item_id); ok++ }
      catch { falhas++ }
    }
    setAplicandoTodas(false)
    notify && notify(`${ok} desconto(s) aplicado(s)${falhas ? `, ${falhas} falha(s)` : ''}.`, falhas ? 'warn' : 'ok')
  }

  return (
    <div className="mt-4">
      <Secao icon={Cpu} cor="var(--accent)" titulo="Automação — 6 agentes" pill="modo sugestivo · trava de margem" pillCor="var(--ok)" />

      {/* modos */}
      <div className="rounded-2xl p-3 glass mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wide text-faint font-extrabold">Modos</span>
          {[['sugestivo', 'Sugestivo', 'Você aplica cada sugestão'], ['manual', 'Manual (em lote)', 'Aplica todas de uma vez'], ['automatico', 'Automático', 'Aplica as seguras em lote']].map(([m, lb]) => (
            <button key={m} onClick={() => trocarModo(m)} className="text-[10px] font-extrabold px-2.5 py-1 rounded-full inline-flex items-center gap-1 transition-colors" style={modo === m ? { background: 'rgba(47,217,141,.16)', color: 'var(--ok)', border: '1px solid rgba(47,217,141,.4)' } : { background: 'rgba(255,255,255,.06)', color: 'var(--dim)', border: '1px solid var(--glass-border)' }}>{modo === m && <Check size={11} />} {lb}</button>
          ))}
          <span className="ml-auto text-[9.5px] text-faint flex items-center gap-1.5"><Shield size={12} /> Nada é aplicado abaixo do piso — em qualquer modo.</span>
        </div>
        {modo !== 'sugestivo' && (
          <div className="mt-3 pt-3 flex items-center gap-3 flex-wrap" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <div className="flex-1 min-w-[200px]">
              <div className="text-[11.5px] font-semibold">{modo === 'automatico' ? 'Modo automático' : 'Aplicação em lote'}</div>
              <div className="text-[10px] text-faint">{aplicaveis.length > 0 ? `${aplicaveis.length} sugestão(ões) segura(s) pronta(s) para aplicar (7 dias cada, acima do piso).` : 'Nenhuma sugestão segura no momento — nada a aplicar.'}{modo === 'automatico' ? ' A automação contínua no servidor entra na próxima fase.' : ''}</div>
            </div>
            <button onClick={aplicarTodas} disabled={aplicandoTodas || aplicaveis.length === 0} className="text-[11.5px] font-bold px-4 py-2 rounded-xl text-white inline-flex items-center gap-2 disabled:opacity-50" style={{ background: 'var(--ok)', color: '#04140c' }}>{aplicandoTodas ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Aplicar todas as sugestões ({aplicaveis.length})</button>
          </div>
        )}
      </div>

      {/* cards dos agentes (toggles reais filtram o feed) */}
      <div className="grid grid-cols-3 gap-3">
        {AGENTES.map((a, i) => {
          const Ic = a.icon; const n = porAgente[a.key]
          return (
            <div key={i} className="rounded-2xl p-3.5 lift card-in" style={{ background: 'linear-gradient(158deg, rgba(255,255,255,.05), rgba(0,0,0,.18))', border: '1px solid var(--glass-border)', opacity: on(a.key) ? 1 : 0.55, animationDelay: `${i * 45}ms` }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg grid place-items-center flex-none" style={{ background: `${a.cor}22`, color: a.cor }}><Ic size={16} /></div>
                <div className="flex-1 min-w-0"><div className="text-[12.5px] font-bold truncate">{a.nm}</div><div className="text-[8.5px] font-extrabold uppercase tracking-wide text-faint">{a.tg}</div></div>
                <SwitchLabel on={on(a.key)} onClick={() => toggle(a.key)} />
              </div>
              <div className="flex items-center gap-2 mt-2.5 rounded-xl px-2.5 py-2" style={{ background: 'rgba(0,0,0,.22)' }}>
                <span className="text-[10px] text-dim flex-1">{a.trig}</span>
                <ArrowRight size={12} style={{ color: 'var(--accent)' }} />
                <span className="text-[10px] font-bold flex-1 text-right">{a.acao}</span>
              </div>
              <div className="flex items-center gap-2 mt-2.5">
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: 'rgba(47,217,141,.12)', color: 'var(--ok)' }}>{a.chip}</span>
                {n != null && n > 0
                  ? <span className="ml-auto text-[9.5px] font-extrabold" style={{ color: a.cor }}>{n} {n === 1 ? 'sugestão' : 'sugestões'}</span>
                  : (a.key === 'buybox' || a.key === 'abc') ? <span className="ml-auto text-[9px] text-faint">{a.key === 'buybox' ? 'ver Inteligência' : 'classificação'}</span>
                    : <span className="ml-auto text-[9px] text-faint">sem sugestões</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* feed de sugestões reais */}
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-[11px] uppercase tracking-wide text-faint font-extrabold flex items-center gap-1.5"><Sparkles size={12} style={{ color: 'var(--accent)' }} /> Sugestões dos agentes</div>
          {lista.length > 0 && <span className="text-[9.5px] font-extrabold px-2 py-0.5 rounded-full num" style={{ background: 'rgba(214,0,127,.14)', color: 'var(--accent)' }}>{lista.length}</span>}
        </div>
        {sugs && sugs.resumo_impacto && !carregando && lista.length > 0 && (
          <div className="grid grid-cols-4 gap-2.5 mb-3">
            <BbKpi l="Oportunidades" v={lista.length} c="var(--accent)" />
            <BbKpi l="Capital parado" v={brl(sugs.resumo_impacto.capital_parado)} c="var(--danger)" sub="estoque sem giro" />
            <BbKpi l="Giro em queda" v={sugs.resumo_impacto.n_giro} c="var(--warn)" sub="vendas caindo" />
            <BbKpi l="Margem folgada" v={sugs.resumo_impacto.n_margem} c="var(--ok)" sub="pode acelerar" />
          </div>
        )}
        {carregando ? (
          <div>{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skel mb-2" style={{ height: 64, borderRadius: 16 }} />)}</div>
        ) : sugs?.cache_vazio ? (
          <div className="rounded-2xl p-4 glass text-[11px] text-dim flex items-center gap-2"><RefreshCw size={14} style={{ color: BLUE, flexShrink: 0 }} /> Sincronize os pedidos para os agentes analisarem giro, parados e margem com dados reais.</div>
        ) : lista.length === 0 ? (
          <div className="rounded-2xl p-6 glass text-[11px] text-faint text-center">Nenhuma sugestão ativa. Os agentes analisam o catálogo e o histórico — quando houver oportunidade (parado, queda de giro, margem folgada), aparece aqui.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {lista.map((s) => {
              const ag = AGENTES.find((a) => a.key === s.agente) || {}; const Ic = ag.icon || Cpu
              const podeAplicar = s.desconto_pct != null && s.deal_price_sugerido != null
              return (
                <div key={s.item_id} className="rounded-2xl p-3 glass lift flex items-center gap-3 card-in">
                  <div className="w-9 h-9 rounded-lg grid place-items-center flex-none" style={{ background: `${ag.cor || 'var(--accent)'}22`, color: ag.cor || 'var(--accent)' }}><Ic size={16} /></div>
                  {s.imagem ? <img src={s.imagem} alt="" className="w-10 h-10 rounded-lg object-cover flex-none" style={{ border: '1px solid var(--glass-border)' }} /> : <div className="w-10 h-10 rounded-lg grid place-items-center flex-none" style={{ background: 'rgba(255,255,255,.05)' }}><Boxes size={16} className="text-faint" /></div>}
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold truncate">{s.titulo || s.item_id}</div>
                    <div className="text-[10px] text-dim truncate">{s.motivo}</div>
                    <div className="text-[9px] text-faint num truncate">{(ag.nm || s.agente).replace('Agente ', '')}{s.piso != null ? ` · piso ${brl(s.piso)}` : ''}{s.agente === 'parado' && s.capital ? ` · ${brl(s.capital)} parado` : ''}{s.vendas_30d ? ` · ${s.vendas_30d} vend/30d` : ''}</div>
                  </div>
                  <div className="text-right flex-none">
                    <div className="text-[11px] font-bold" style={{ color: 'var(--accent)' }}>{s.acao}</div>
                    {podeAplicar && <div className="text-[10px] num" style={{ color: 'var(--ok)' }}>{brl(s.preco)} → {brl(s.deal_price_sugerido)}</div>}
                  </div>
                  <div className="flex flex-col gap-1 flex-none items-stretch" style={{ width: 92 }}>
                    {podeAplicar
                      ? <button onClick={() => aplicar(s)} disabled={aplicandoId === s.item_id} className="text-[10px] font-bold px-3 py-1.5 rounded-lg text-white inline-flex items-center justify-center gap-1 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, var(--accent), #a80063)' }}>{aplicandoId === s.item_id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Aplicar</button>
                      : <span className="text-[8.5px] text-faint text-center leading-tight">requer convite Relâmpago</span>}
                    <button onClick={() => dispensar(s.item_id)} className="text-[9.5px] text-faint hover:text-fg">dispensar</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ================= ADS ================= */
function Ads() {
  const [d, setD] = useState(null)
  const [carr, setCarr] = useState(true)
  useEffect(() => {
    let vivo = true
    api.mlAdsPainel(30).then((r) => { if (vivo) setD(r) }).catch(() => { if (vivo) setD({ habilitado: false, motivo: 'Não foi possível consultar o Product Ads agora.' }) }).finally(() => { if (vivo) setCarr(false) })
    return () => { vivo = false }
  }, [])
  const roasCor = (v) => v == null ? 'var(--dim)' : v >= 4 ? 'var(--ok)' : v >= 2 ? 'var(--warn)' : 'var(--danger)'
  const acosCor = (v) => v == null ? 'var(--dim)' : v <= 15 ? 'var(--ok)' : v <= 25 ? 'var(--warn)' : 'var(--danger)'
  const t = d?.totais || {}
  return (
    <div className="mt-4">
      <Secao icon={Target} cor={BLUE} titulo="Product Ads" pill={d?.habilitado ? `Mercado Ads · ${d.conta || 'conta'} · 30d` : 'Mercado Ads · publicidade patrocinada'} pillCor={BLUE} />
      {carr ? (
        <div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skel" style={{ height: 62, borderRadius: 14 }} />)}</div>
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skel mb-2" style={{ height: 70, borderRadius: 16 }} />)}
        </div>
      ) : !d?.habilitado ? (
        <div className="rounded-2xl p-6 glass text-center" style={{ border: '1px dashed var(--glass-border)' }}>
          <div className="w-12 h-12 rounded-2xl grid place-items-center mx-auto mb-3" style={{ background: 'rgba(91,141,239,.14)', color: BLUE }}><Target size={22} /></div>
          <div className="text-[14px] font-bold mb-1" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>Product Ads não está habilitado</div>
          <div className="text-[11.5px] text-dim max-w-md mx-auto leading-relaxed">{d?.motivo || 'Esta conta ainda não tem a permissão Advertising / um advertiser de Product Ads.'} Ative o <b style={{ color: 'var(--fg)' }}>Mercado Ads</b> no painel de anúncios do Mercado Livre; assim que houver campanhas, os dados reais (ROAS, ACOS, gasto, GMV) aparecem aqui automaticamente — sem números fabricados.</div>
          {d?.detalhe && <div className="text-[9px] text-faint mt-3 num">{d.detalhe}</div>}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-3">
            <BbKpi l="Gasto · 30d" v={brl(t.gasto || 0)} c="var(--fg)" />
            <BbKpi l="GMV Ads" v={brl(t.gmv || 0)} c="var(--ok)" />
            <BbKpi l="ROAS" v={t.roas != null ? `${t.roas}x` : '—'} c={roasCor(t.roas)} sub="retorno" />
            <BbKpi l="ACOS" v={t.acos != null ? `${t.acos}%` : '—'} c={acosCor(t.acos)} sub="custo/venda" />
            <BbKpi l="Cliques" v={(t.clicks || 0).toLocaleString('pt-BR')} c={BLUE} />
            <BbKpi l="Impressões" v={(t.prints || 0).toLocaleString('pt-BR')} c={PURPLE} />
          </div>
          {d.erro_campanhas ? (
            <div className="rounded-2xl p-4 glass text-[11px] text-faint flex items-start gap-2"><AlertTriangle size={14} className="mt-0.5 flex-none" style={{ color: 'var(--warn)' }} /> <span>Advertising habilitado (conta {d.conta}), mas não consegui listar as campanhas agora: <span className="num">{d.erro_campanhas}</span></span></div>
          ) : d.campanhas.length === 0 ? (
            <Vazio texto="Nenhuma campanha de Product Ads ativa no período." />
          ) : (
            <div className="flex flex-col gap-2">
              {d.campanhas.map((c) => {
                const st = (c.status || '').toLowerCase() === 'active'
                return (
                  <div key={c.id} className="rounded-2xl p-3 glass lift">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg grid place-items-center flex-none" style={{ background: 'rgba(91,141,239,.14)', color: BLUE }}><Target size={15} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-semibold truncate">{c.nome || c.id}</div>
                        <div className="text-[9px] text-faint">{c.strategy || 'campanha'}{c.budget != null ? ` · orçamento ${brl(c.budget)}/dia` : ''}{c.acos_target != null ? ` · ACOS-alvo ${c.acos_target}%` : ''}</div>
                      </div>
                      <span className="text-[8.5px] font-extrabold px-2 py-0.5 rounded-full flex-none" style={{ background: st ? 'rgba(47,217,141,.14)' : 'rgba(255,255,255,.08)', color: st ? 'var(--ok)' : 'var(--faint)' }}>{st ? 'ATIVA' : (c.status || '—').toUpperCase()}</span>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
                      {[['Gasto', brl(c.cost || 0), 'var(--fg)'], ['GMV', brl(c.gmv || 0), 'var(--ok)'], ['ROAS', c.roas != null ? `${c.roas}x` : '—', roasCor(c.roas)], ['ACOS', c.acos != null ? `${c.acos}%` : '—', acosCor(c.acos)], ['Cliques', (c.clicks || 0).toLocaleString('pt-BR'), BLUE], ['CPC', c.cpc != null ? brl(c.cpc) : '—', 'var(--dim)']].map(([l, v, cc], i) => (
                        <div key={i} className="rounded-lg px-2 py-1.5" style={{ background: 'rgba(0,0,0,.22)' }}><div className="text-[7.5px] uppercase text-faint font-extrabold">{l}</div><div className="text-[11.5px] font-extrabold num" style={{ color: cc }}>{v}</div></div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div className="text-[9.5px] text-faint mt-2 flex items-center gap-1.5"><Info size={12} /> Dados reais do Mercado Ads (últimos 30 dias). Gestão de lance/orçamento entra na próxima fase.</div>
        </>
      )}
    </div>
  )
}

/* ================= drawer de desempenho & insights ================= */
function DeltaBadge({ v }) {
  const up = v >= 0
  return <span className="text-[10px] font-extrabold inline-flex items-center gap-0.5 mt-0.5" style={{ color: up ? 'var(--ok)' : 'var(--danger)' }}>{up ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {up ? '+' : ''}{v}% vs antes</span>
}
function Sparkline({ serie }) {
  if (!serie || !serie.length) return <div className="text-[10px] text-faint mt-2">Sem vendas registradas na janela.</div>
  const max = Math.max(...serie.map((s) => s.unidades), 1)
  return (
    <div className="mt-2.5 flex items-end gap-0.5" style={{ height: 42 }}>
      {serie.map((s, i) => (
        <div key={i} title={`${s.dia}: ${s.unidades} un · ${brl(s.receita)}`} style={{ flex: 1, minWidth: 3, height: `${Math.max(6, (s.unidades / max) * 100)}%`, background: 'linear-gradient(180deg, #5B8DEF, #3a6fd0)', borderRadius: '3px 3px 0 0' }} />
      ))}
    </div>
  )
}

function DesempenhoDrawer({ met, carregando, p, onClose, onSincronizar, notify }) {
  const m = meta(p.type); const Ic = m.icon
  const vi = dcurta(p.start_date), vf = dcurta(p.finish_date); const rest = diasAte(p.finish_date)
  const sd = met ? (SAUDE[met.saude] || SAUDE.atencao) : null
  const bom = met ? Math.max(0, (met.itens || 0) - (met.abaixo_piso || 0)) : 0
  const ruim = met ? (met.abaixo_piso || 0) : 0
  const det = (met && met.itens_detalhe) || []
  const CRIA = ['SELLER_CAMPAIGN', 'PRICE_DISCOUNT', 'SELLER_COUPON_CAMPAIGN', 'VOLUME']
  const isCria = CRIA.includes(p.type)
  const [parados, setParados] = useState(null)
  const [addingId, setAddingId] = useState(null)
  useEffect(() => {
    let vivo = true
    api.mlPedidosParados(30, 12).then((r) => { if (vivo) setParados(r) }).catch(() => { if (vivo) setParados(null) })
    return () => { vivo = false }
  }, [])
  const addParado = async (it) => {
    if (it.folga_desconto_pct <= 0) return
    setAddingId(it.item_id)
    try {
      let deal = Math.round(it.preco * 0.9 * 100) / 100
      if (it.piso != null && deal < it.piso) deal = it.piso
      await api.mlPromoAderir(it.item_id, { promotion_id: p.id, promotion_type: p.type, deal_price: deal })
      notify && notify(`${it.titulo || it.item_id} adicionado à campanha.`, 'ok')
      setParados((prev) => (prev ? { ...prev, itens: prev.itens.filter((x) => x.item_id !== it.item_id) } : prev))
    } catch (e) { notify && notify(traduzErroML(e.message), 'danger') }
    finally { setAddingId(null) }
  }
  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end" style={{ background: 'rgba(0,0,0,.55)' }} onClick={(e) => { e.stopPropagation(); onClose() }}>
      <div onClick={(e) => e.stopPropagation()} className="h-full w-full drawer-in flex flex-col" style={{ maxWidth: 560, border: '1px solid transparent', background: 'linear-gradient(180deg,var(--surface),#160c13) padding-box, linear-gradient(155deg, rgba(214,0,127,.6), rgba(214,0,127,.06) 42%, rgba(255,255,255,.10)) border-box', boxShadow: '-24px 0 70px rgba(0,0,0,.55)' }}>
        {/* header */}
        <div className="flex items-center gap-2 px-4 py-3 flex-none" style={{ borderBottom: '1px solid var(--glass-border)' }}>
          <div className="w-8 h-8 rounded-lg grid place-items-center flex-none" style={{ background: `${m.cor}22`, color: m.cor }}><Ic size={16} /></div>
          <div className="min-w-0">
            <div className="text-[15px] font-bold truncate" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>{p.name || m.label}</div>
            <div className="text-[10.5px] text-faint truncate">{p.id}{(vi || vf) ? ` · vale ${vi || '—'} → ${vf || '—'}` : ''}{rest != null && rest >= 0 ? ` · ${rest}d restantes` : ''}</div>
          </div>
          {sd && <span className="text-[10px] font-extrabold px-2 py-1 rounded-full inline-flex items-center gap-1 flex-none" style={{ background: `${sd.c}1f`, color: sd.c }}><sd.Icon size={11} /> {sd.t}</span>}
          <button onClick={onClose} className="text-faint hover:text-fg flex-none"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {carregando && !met ? (
            <div>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skel mb-3" style={{ height: i === 0 ? 90 : 60, borderRadius: 14 }} />)}</div>
          ) : !met ? (
            <div className="text-[12px] text-faint p-6 text-center">Não foi possível carregar as métricas desta campanha.</div>
          ) : (
            <>
              {/* KPIs reais */}
              <div className="grid grid-cols-3 gap-2.5">
                <Mini l="Participando" v={met.itens} s={`${met.itens_ativos} ativos`} />
                <Mini l="Desconto médio" v={met.desconto_medio_pct != null ? `${met.desconto_medio_pct}%` : '—'} s="ponderado" />
                <Mini l="Abaixo do piso" v={met.abaixo_piso} s={met.abaixo_piso > 0 ? 'furam a margem' : 'protegido'} danger={met.abaixo_piso > 0} />
                <Mini l="Líquido real" v={met.liquido_total != null ? brl(met.liquido_total) : '—'} s="soma net_proceeds" hero />
                <Mini l="Lucro real" v={met.lucro_total != null ? brl(met.lucro_total) : '—'} s="− custo Bling" prof />
                <Mini l="Margem média" v={met.margem_media_pct != null ? `${met.margem_media_pct}%` : '—'} s={met.sem_custo > 0 ? `${met.sem_custo} sem custo` : 'do lucro real'} />
              </div>

              {/* saúde da margem */}
              {(bom + ruim) > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[10px] mb-1.5">
                    <span className="text-faint font-extrabold uppercase tracking-wide">Saúde da margem</span>
                    <span className="text-dim">{bom} {bom === 1 ? 'saudável' : 'saudáveis'}{ruim > 0 && <span style={{ color: 'var(--danger)' }}> · {ruim} abaixo do piso</span>}</span>
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.06)' }}>
                    {bom > 0 && <div style={{ width: `${(bom / (bom + ruim)) * 100}%`, background: 'linear-gradient(90deg, var(--ok), #27c07d)' }} />}
                    {ruim > 0 && <div style={{ width: `${(ruim / (bom + ruim)) * 100}%`, background: 'linear-gradient(90deg, #ff9a9a, var(--danger))' }} />}
                  </div>
                </div>
              )}

              {/* vendas dos itens na janela */}
              {met.vendas && (
                <div className="mt-5">
                  <div className="text-[11px] uppercase tracking-wide text-faint font-extrabold mb-2 flex items-center gap-1.5"><Activity size={12} style={{ color: BLUE }} /> Vendas dos itens (na janela)</div>
                  {met.vendas.cache_vazio ? (
                    <div className="rounded-xl p-3 flex items-center gap-2.5" style={{ background: 'rgba(91,141,239,.1)', border: '1px solid rgba(91,141,239,.3)' }}>
                      <RefreshCw size={15} style={{ color: BLUE, flex: 'none' }} />
                      <div className="text-[11px] text-dim flex-1">Cache de pedidos vazio — sincronize para liberar a análise de vendas.</div>
                      <button onClick={() => onSincronizar && onSincronizar()} className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white flex-none" style={{ background: BLUE }}>Sincronizar</button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="rounded-xl p-3" style={{ background: 'rgba(91,141,239,.08)', border: '1px solid rgba(91,141,239,.25)' }}>
                          <div className="text-[9px] uppercase text-faint font-extrabold">Unidades vendidas</div>
                          <div className="text-[17px] font-extrabold num" style={{ color: BLUE }}>{met.vendas.unidades}</div>
                          {met.vendas.delta_unidades_pct != null && <DeltaBadge v={met.vendas.delta_unidades_pct} />}
                        </div>
                        <div className="rounded-xl p-3" style={{ background: 'rgba(91,141,239,.08)', border: '1px solid rgba(91,141,239,.25)' }}>
                          <div className="text-[9px] uppercase text-faint font-extrabold">Receita</div>
                          <div className="text-[17px] font-extrabold num" style={{ color: BLUE }}>{brl(met.vendas.receita)}</div>
                          {met.vendas.delta_receita_pct != null && <DeltaBadge v={met.vendas.delta_receita_pct} />}
                        </div>
                      </div>
                      <Sparkline serie={met.vendas.serie} />
                      <div className="text-[9.5px] text-faint mt-1">Comparado ao período anterior de mesma duração {met.vendas.baseline_disponivel ? `(${met.vendas.unidades_baseline} un antes)` : '(sem base — amplie a sincronização)'}. Vendas dos itens da campanha na janela — não é atribuição direta à promoção.</div>
                    </>
                  )}
                </div>
              )}

              {/* projeção */}
              {met.projecao && (
                <div className="mt-5">
                  <div className="text-[11px] uppercase tracking-wide text-faint font-extrabold mb-2 flex items-center gap-1.5"><TrendingUp size={12} style={{ color: 'var(--ok)' }} /> Projeção da campanha</div>
                  {met.projecao.cache_vazio ? (
                    <div className="rounded-xl p-3 text-[11px] text-dim flex items-center gap-2" style={{ background: 'rgba(91,141,239,.1)', border: '1px solid rgba(91,141,239,.25)' }}><RefreshCw size={14} style={{ color: BLUE, flexShrink: 0 }} /> Sincronize os pedidos para projetar vendas.<button onClick={() => onSincronizar && onSincronizar()} className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-lg text-white flex-none" style={{ background: BLUE }}>Sincronizar</button></div>
                  ) : (
                    <div className="rounded-2xl p-3.5" style={{ background: 'linear-gradient(150deg, rgba(47,217,141,.14), rgba(47,217,141,.02))', border: '1px solid rgba(47,217,141,.3)' }}>
                      <div className="text-[11px] text-dim">Se rodar <b style={{ color: 'var(--fg)' }}>{met.projecao.dias_campanha} dias</b>, no ritmo dos últimos {met.projecao.base_dias} dias:</div>
                      <div className="flex items-end gap-6 mt-2">
                        <div><div className="text-[9px] uppercase text-faint font-extrabold">Vendas estimadas</div><div className="text-[22px] font-extrabold num" style={{ color: 'var(--ok)' }}>~{met.projecao.unidades_estimadas}</div></div>
                        <div><div className="text-[9px] uppercase text-faint font-extrabold">Receita estimada</div><div className="text-[22px] font-extrabold num" style={{ color: 'var(--ok)' }}>~{brl(met.projecao.receita_estimada)}</div></div>
                      </div>
                      <div className="text-[9.5px] text-faint mt-2 leading-snug">Base: {met.projecao.base_unidades} un em {met.projecao.base_dias} dias (~{met.projecao.rate_dia}/dia). Projeção conservadora no ritmo atual — um bom desconto tende a aumentar as vendas.</div>
                    </div>
                  )}
                </div>
              )}

              {/* insights */}
              {met.insights && met.insights.length > 0 && (
                <div className="mt-5">
                  <div className="text-[11px] uppercase tracking-wide text-faint font-extrabold mb-2 flex items-center gap-1.5"><Sparkles size={12} style={{ color: 'var(--accent)' }} /> Insights e recomendações</div>
                  <div className="flex flex-col gap-2">
                    {met.insights.map((it, i) => { const cfg = INS[it.tipo] || INS.info; return (
                      <div key={i} className="rounded-xl p-3 flex gap-2.5" style={{ background: `${cfg.c}0f`, border: `1px solid ${cfg.c}2e` }}>
                        <div className="w-7 h-7 rounded-lg grid place-items-center flex-none" style={{ background: `${cfg.c}22`, color: cfg.c }}><cfg.Icon size={14} /></div>
                        <div className="min-w-0">
                          <div className="text-[12px] font-bold" style={{ color: cfg.c }}>{it.titulo}</div>
                          <div className="text-[11px] text-dim mt-0.5 leading-snug">{it.detalhe}</div>
                        </div>
                      </div>
                    ) })}
                  </div>
                </div>
              )}

              {/* produtos parados — sugestões */}
              {parados && parados.itens && parados.itens.length > 0 && (
                <div className="mt-5">
                  <div className="text-[11px] uppercase tracking-wide text-faint font-extrabold mb-1 flex items-center gap-1.5"><Boxes size={12} style={{ color: 'var(--warn)' }} /> Produtos parados — candidatos a esta campanha</div>
                  <div className="text-[10px] text-faint mb-2">Sem venda há mais de {parados.dias} dias. {isCria ? 'Adicione com um clique (desconto seguro, acima do piso).' : 'Só é possível adicionar em campanhas que você cria; aqui é referência.'}</div>
                  <div className="flex flex-col gap-1.5">
                    {parados.itens.map((it) => (
                      <div key={it.item_id} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2" style={{ background: 'rgba(0,0,0,.22)', border: '1px solid var(--glass-border)' }}>
                        {it.imagem ? <img src={it.imagem} alt="" className="w-9 h-9 rounded-lg object-cover flex-none" /> : <div className="w-9 h-9 rounded-lg grid place-items-center flex-none" style={{ background: 'rgba(255,255,255,.05)' }}><Boxes size={15} className="text-faint" /></div>}
                        <div className="min-w-0 flex-1">
                          <div className="text-[11.5px] font-semibold truncate">{it.titulo || it.item_id}</div>
                          <div className="text-[9.5px] text-faint num truncate">{it.dias_sem_venda != null ? `${it.dias_sem_venda}d sem vender` : 'sem venda registrada'}{it.estoque != null ? ` · ${it.estoque} un` : ''}{it.folga_desconto_pct > 0 ? ` · folga ${it.folga_desconto_pct}%` : ' · sem folga de margem'}</div>
                        </div>
                        <div className="text-right flex-none"><div className="text-[11px] font-extrabold num">{brl(it.preco)}</div></div>
                        {isCria && <button onClick={() => addParado(it)} disabled={it.folga_desconto_pct <= 0 || addingId === it.item_id} title={it.folga_desconto_pct <= 0 ? 'Sem folga de margem para descontar' : 'Adicionar a esta campanha'} className="text-[10px] font-bold px-2.5 py-1 rounded-lg flex-none inline-flex items-center gap-1 disabled:opacity-40" style={{ background: it.folga_desconto_pct > 0 ? 'rgba(214,0,127,.16)' : 'transparent', color: 'var(--accent)', border: '1px solid rgba(214,0,127,.3)' }}>{addingId === it.item_id ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} adicionar</button>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* itens */}
              {det.length > 0 && (
                <div className="mt-5">
                  <div className="text-[11px] uppercase tracking-wide text-faint font-extrabold mb-2">Itens da campanha ({det.length})</div>
                  <div className="flex flex-col gap-1.5">
                    {det.map((d) => (
                      <div key={d.item_id} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2" style={{ background: 'rgba(0,0,0,.22)', border: '1px solid ' + (d.abaixo_piso ? 'rgba(255,122,122,.3)' : 'var(--glass-border)') }}>
                        {d.imagem ? <img src={d.imagem} alt="" className="w-9 h-9 rounded-lg object-cover flex-none" /> : <div className="w-9 h-9 rounded-lg grid place-items-center flex-none" style={{ background: 'rgba(255,255,255,.05)' }}><Boxes size={15} className="text-faint" /></div>}
                        <div className="min-w-0 flex-1">
                          <div className="text-[11.5px] font-semibold truncate">{d.titulo || d.item_id}</div>
                          <div className="text-[9.5px] text-faint num truncate">{d.sku || d.item_id}{d.desconto_pct != null ? ` · −${d.desconto_pct}%` : ''}{d.estoque != null ? ` · ${d.estoque} un` : ''}</div>
                        </div>
                        <div className="text-right flex-none">
                          <div className="text-[11px] font-extrabold num" style={{ color: 'var(--ok)' }}>{d.liquido != null ? brl(d.liquido) : '—'}</div>
                          <div className="text-[9px] num" style={{ color: d.lucro == null ? 'var(--faint)' : PURPLE }}>{d.lucro == null ? 'sem custo' : `lucro ${brl(d.lucro)}${d.margem_pct != null ? ` · ${d.margem_pct}%` : ''}`}</div>
                        </div>
                        <div className="flex-none w-[64px] text-right">
                          {d.abaixo_piso ? <span className="text-[8.5px] font-extrabold" style={{ color: 'var(--danger)' }}>fura piso</span>
                            : d.oportunidade ? <span className="text-[8.5px] font-extrabold" style={{ color: 'var(--warn)' }}>+ desconto</span>
                              : <span className="text-[8.5px] font-extrabold" style={{ color: 'var(--ok)' }}>ok</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>, document.body)
}

/* ================= tradução de erros do ML ================= */
function traduzErroML(msg) {
  const m = String(msg || '')
  if (/ERROR_CREDIBILITY|not credible/i.test(m)) return 'ML recusou: "preço com desconto não crível" — regra do próprio ML que compara o preço ofertado com a banda do convite e o histórico do anúncio. Se o preço base mudou há pouco, aguarde; senão, tente outro percentual dentro da faixa exigida.'
  const st = m.match(/Stock must be greater than (\d+) and less than (\d+)/i)
  if (st) return `ML exige estoque reservado entre ${Number(st[1]) + 1} e ${Number(st[2]) - 1} unidade(s) para este item.`
  if (/No candidates found/i.test(m)) return 'O ML não considera este item candidato deste convite (saiu da seleção — os candidatos mudam diariamente).'
  if (/already/i.test(m)) return 'Este item já participa de uma promoção conflitante.'
  return m.replace(/^Mercado Livre:\s*/, '').slice(0, 220)
}

/* Tipos de promoção que EXIGEM offer_id do candidato ao aderir (DEAL/DOD/MARKETPLACE/VOLUME não levam). */
const TIPOS_OFFER_ID = new Set(['LIGHTNING', 'SMART', 'PRE_NEGOTIATED', 'UNHEALTHY_STOCK', 'BANK', 'PRICE_MATCHING', 'PRICE_MATCHING_MELI_ALL'])

/* ================= seletor de itens (campanha / convite) ================= */

function Participantes({ notify }) {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(null)
  const [vista, setVista] = useState('produto')
  const [expandido, setExpandido] = useState(() => new Set())
  const carregar = async (forcar) => {
    setCarregando(true)
    try { const r = await api.mlPromoParticipantes(forcar); setDados(r) }
    catch (e) { notify && notify(traduzErroML(e.message), 'danger') }
    finally { setCarregando(false) }
  }
  useEffect(() => { carregar(false) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const ql = q.trim().toLowerCase()
  const produtos = dados?.produtos || []
  const campanhas = dados?.campanhas || []
  const listaProd = produtos.filter((p) => !ql || (`${p.titulo || ''} ${p.sku || ''}`).toLowerCase().includes(ql))
  const listaCamp = campanhas.filter((c) => !ql || (c.nome || '').toLowerCase().includes(ql))
  const totais = dados?.totais || {}
  const toggleExp = (id) => { const n = new Set(expandido); n.has(id) ? n.delete(id) : n.add(id); setExpandido(n) }
  const prodDaCampanha = (cid) => produtos.filter((p) => (p.campanhas || []).some((c) => c && c.id === cid))
  const topCamp = [...campanhas].filter((c) => (c.n || 0) > 0).sort((a, b) => (b.voce_recebe || 0) - (a.voce_recebe || 0)).slice(0, 6)
  const maxRec = Math.max(1, ...topCamp.map((c) => c.voce_recebe || 0))
  const aberto = sel != null

  return (
    <div className="mt-4">
      <Secao icon={Boxes} cor="var(--accent)" titulo="Participantes" pill="produtos e campanhas em promoção" pillCor="var(--accent)" right={
        <div className="flex items-center gap-2">
          {dados?.cache && <span className="text-[9px] text-faint inline-flex items-center gap-1"><Clock size={10} /> em cache</span>}
          <button onClick={() => carregar(true)} disabled={carregando} className="text-[11px] font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-50" style={{ background: 'rgba(214,0,127,.14)', color: 'var(--accent)', border: '1px solid rgba(214,0,127,.3)' }}>{carregando ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Atualizar</button>
        </div>
      } />

      {carregando && !dados
        ? <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skel" style={{ height: 62, borderRadius: 14 }} />)}</div>
        : dados && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <BbKpi l="Produtos em campanhas" v={dados.total_produtos ?? 0} c="var(--accent)" sub={`${produtos.reduce((a, p) => a + (p.n || 0), 0)} vínculos`} />
            <BbKpi l="Campanhas com itens" v={totais.campanhas ?? 0} c={BLUE} sub={`de ${dados.promocoes_varridas ?? 0} varridas`} />
            <BbKpi l="Você recebe · total" v={brl(totais.voce_recebe || 0)} c="var(--ok)" sub="líquido estimado" />
            <BbKpi l="Desconto concedido" v={brl(totais.desconto || 0)} c="var(--warn)" sub="o quanto abre mão" />
          </div>
        )}

      {carregando && !dados
        ? <div className="skel mb-3" style={{ height: 150, borderRadius: 16 }} />
        : topCamp.length > 0 && (
          <div className="rounded-2xl p-4 glass mb-3">
            <div className="text-[10px] uppercase tracking-wide text-faint font-extrabold flex items-center gap-1.5 mb-3"><BarChart3 size={12} style={{ color: 'var(--ok)' }} /> Você recebe por campanha <span className="text-faint">· top {topCamp.length}</span></div>
            <div className="flex flex-col gap-1.5">
              {topCamp.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <span className="text-[10.5px] truncate flex-none" style={{ width: 150 }} title={c.nome}>{c.nome || meta(c.type).label}</span>
                  <div className="flex-1 h-5 rounded-md overflow-hidden relative" style={{ background: 'rgba(255,255,255,.05)' }}>
                    <div className="h-full rounded-md flex items-center justify-end pr-1.5" style={{ width: `${Math.max(9, ((c.voce_recebe || 0) / maxRec) * 100)}%`, background: `linear-gradient(90deg, ${meta(c.type).cor}55, ${meta(c.type).cor})` }}>
                      <span className="text-[9px] font-extrabold num text-white">{brl(c.voce_recebe)}</span>
                    </div>
                  </div>
                  <span className="text-[9px] num flex-none text-right" style={{ width: 60, color: 'var(--warn)' }}>−{brl(c.desconto)}</span>
                  <span className="text-[9px] text-faint num flex-none text-right" style={{ width: 28 }}>{c.n}un</span>
                </div>
              ))}
            </div>
          </div>
        )}

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex gap-1 p-1 rounded-xl flex-none" style={{ background: 'rgba(0,0,0,.28)', border: '1px solid var(--glass-border)' }}>
          {[['produto', 'Por produto', Boxes], ['campanha', 'Por campanha', Tag]].map(([id, lb, Ic]) => (
            <button key={id} onClick={() => { setVista(id); setSel(null) }} className="text-[11px] font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors" style={vista === id ? { background: 'linear-gradient(135deg, rgba(214,0,127,.9), rgba(214,0,127,.55))', color: '#fff' } : { color: 'var(--dim)' }}><Ic size={12} /> {lb}</button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={vista === 'produto' ? 'Filtrar por produto ou SKU…' : 'Filtrar por campanha…'} className="w-full text-[12.5px] pl-9 pr-3 py-2.5 rounded-xl bg-transparent" style={{ border: '1px solid var(--glass-border)' }} />
        </div>
      </div>

      {carregando && !dados ? (
        <div>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skel mb-2" style={{ height: 66, borderRadius: 16 }} />)}</div>
      ) : !dados ? (
        <Vazio texto="Clique em Atualizar para varrer as campanhas." />
      ) : (
        <div className={aberto ? 'grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(380px,520px)] gap-4 items-start' : ''}>
          <div>
            {vista === 'produto' ? (
              listaProd.length === 0 ? <Vazio texto={ql ? `Nenhum produto para “${q}”.` : 'Nenhum produto participando de campanhas no momento. Adira itens nos convites/campanhas para vê-los aqui.'} /> : (
                <div className="flex flex-col gap-2">
                  {listaProd.map((p) => (
                    <div key={p.item_id} onClick={() => setSel(p.item_id)} className="rounded-2xl p-3 glass lift flex items-center gap-3 cursor-pointer" style={sel === p.item_id ? { border: '1px solid rgba(214,0,127,.5)' } : {}}>
                      {p.imagem ? <img src={p.imagem} alt="" className="w-11 h-11 rounded-lg object-cover flex-none" style={{ border: '1px solid var(--glass-border)' }} /> : <div className="w-11 h-11 rounded-lg grid place-items-center flex-none" style={{ background: 'rgba(255,255,255,.05)' }}><Boxes size={17} className="text-faint" /></div>}
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-semibold truncate">{p.titulo}</div>
                        <div className="text-[9.5px] text-faint num truncate mb-1">{p.sku || p.item_id}{p.preco != null ? ` · ${brl(p.preco)}` : ''}</div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {(p.campanhas || []).slice(0, 4).map((c, i) => <span key={i} className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-full truncate" style={{ background: `${meta(c.type).cor}1e`, color: meta(c.type).cor, maxWidth: 160 }}>{c.nome || meta(c.type).label}</span>)}
                          {(p.campanhas || []).length > 4 && <span className="text-[8.5px] text-faint">+{p.campanhas.length - 4}</span>}
                        </div>
                      </div>
                      <div className="flex-none text-right">
                        <div className="text-[16px] font-extrabold num" style={{ color: 'var(--accent)' }}>{p.n}</div>
                        <div className="text-[8px] uppercase text-faint font-extrabold">campanhas</div>
                      </div>
                      <ChevronRight size={16} className="text-faint flex-none" />
                    </div>
                  ))}
                </div>
              )
            ) : (
              listaCamp.length === 0 ? <Vazio texto={ql ? `Nenhuma campanha para “${q}”.` : 'Nenhuma campanha com itens participando ainda.'} /> : (
                <div className="flex flex-col gap-2">
                  {listaCamp.map((c) => {
                    const ab = expandido.has(c.id)
                    const Ic = meta(c.type).icon
                    const prods = ab ? prodDaCampanha(c.id) : []
                    return (
                      <div key={c.id} className="rounded-2xl glass overflow-hidden">
                        <button onClick={() => toggleExp(c.id)} className="w-full p-3 flex items-center gap-3 text-left">
                          <div className="w-11 h-11 rounded-xl grid place-items-center flex-none" style={{ background: `${meta(c.type).cor}1e`, color: meta(c.type).cor }}><Ic size={18} /></div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[12.5px] font-semibold truncate">{c.nome || meta(c.type).label}</div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-full" style={{ background: `${meta(c.type).cor}1e`, color: meta(c.type).cor }}>{meta(c.type).label}</span>
                              <span className="text-[9px] num inline-flex items-center gap-0.5" style={{ color: 'var(--ok)' }}><CircleDollarSign size={9} /> {brl(c.voce_recebe)}</span>
                              <span className="text-[9px] num" style={{ color: 'var(--warn)' }}>−{brl(c.desconto)} desc.</span>
                            </div>
                          </div>
                          <div className="flex-none text-right">
                            <div className="text-[16px] font-extrabold num" style={{ color: 'var(--accent)' }}>{c.n}</div>
                            <div className="text-[8px] uppercase text-faint font-extrabold">produtos</div>
                          </div>
                          <ChevronDown size={16} className="text-faint flex-none" style={{ transform: ab ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
                        </button>
                        {ab && (
                          <div className="px-3 pb-3 flex flex-col gap-1" style={{ borderTop: '1px solid var(--glass-border)' }}>
                            {prods.length === 0 ? <div className="text-[10.5px] text-faint py-2">Os produtos desta campanha não vieram na varredura atual.</div> : prods.slice(0, 60).map((p) => (
                              <button key={p.item_id} onClick={() => { setVista('produto'); setSel(p.item_id) }} className="flex items-center gap-2.5 p-2 mt-1 rounded-lg text-left lift" style={{ background: 'rgba(0,0,0,.18)' }}>
                                {p.imagem ? <img src={p.imagem} alt="" className="w-8 h-8 rounded-md object-cover flex-none" style={{ border: '1px solid var(--glass-border)' }} /> : <div className="w-8 h-8 rounded-md grid place-items-center flex-none" style={{ background: 'rgba(255,255,255,.05)' }}><Boxes size={13} className="text-faint" /></div>}
                                <div className="min-w-0 flex-1"><div className="text-[11.5px] truncate">{p.titulo}</div><div className="text-[8.5px] text-faint num truncate">{p.sku || p.item_id}{p.preco != null ? ` · ${brl(p.preco)}` : ''}</div></div>
                                <ChevronRight size={13} className="text-faint flex-none" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            )}
          </div>
          {aberto && (
            <div className="xl:sticky xl:top-4">
              <ProdutoCampanhasDrawer key={sel} itemId={sel} onClose={() => setSel(null)} notify={notify} onMudou={() => carregar(true)} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ProdutoCampanhasDrawer({ itemId, onClose, notify, onMudou }) {
  const [d, setD] = useState(null)
  const [carr, setCarr] = useState(true)
  const [acao, setAcao] = useState(null)
  const carregar = useCallback(async (silencioso) => {
    if (!silencioso) setCarr(true)
    try { const r = await api.mlItemPromocoes(itemId); setD(r) }
    catch (e) { if (!silencioso) { setD(null); notify && notify(traduzErroML(e.message), 'danger') } }
    finally { setCarr(false) }
  }, [itemId, notify])
  useEffect(() => { carregar() }, [carregar])
  const participar = async (c) => {
    if (!c.acima_piso && !window.confirm(`Este preço (${brl(c.preco_final)}) fica ABAIXO do seu piso (${brl(c.piso)}). Participar mesmo assim?`)) return
    setAcao(c.id)
    try {
      const body = { promotion_id: c.id, promotion_type: c.type, deal_price: c.preco_final, permitir_abaixo_piso: !c.acima_piso }
      if (TIPOS_OFFER_ID.has(c.type) && c.offer_id) body.offer_id = c.offer_id
      await api.mlPromoAderir(itemId, body)
      notify && notify('Participação confirmada no Mercado Livre.', 'ok'); await carregar(true); onMudou && onMudou()
    } catch (e) { notify && notify(traduzErroML(e.message), 'danger') } finally { setAcao(null) }
  }
  const sair = async (c) => {
    setAcao(c.id)
    try {
      await api.mlPromoRemoverItem(itemId, c.type, c.id, TIPOS_OFFER_ID.has(c.type) ? c.offer_id : null)
      notify && notify('Você deixou de participar da campanha.', 'ok'); await carregar(true); onMudou && onMudou()
    } catch (e) { notify && notify(traduzErroML(e.message), 'danger') } finally { setAcao(null) }
  }
  const ST = { active: { t: 'ATIVA', c: 'var(--ok)' }, started: { t: 'ATIVA', c: 'var(--ok)' }, pending: { t: 'PROGRAMADA', c: BLUE }, candidate: { t: 'DISPONÍVEL', c: 'var(--warn)' } }
  const proms = d?.promocoes || []
  return (
    <div className="rounded-2xl overflow-hidden card-in" style={{ border: '1px solid transparent', background: 'linear-gradient(180deg,var(--surface),#160c13) padding-box, linear-gradient(155deg, rgba(214,0,127,.65), rgba(214,0,127,.06) 42%, rgba(255,255,255,.10)) border-box', boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}>
      <div className="px-4 py-3 flex items-center gap-2.5" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        {d?.imagem ? <img src={d.imagem} alt="" className="w-10 h-10 rounded-xl object-cover flex-none" style={{ border: '1px solid var(--glass-border)' }} /> : <div className="w-10 h-10 rounded-xl grid place-items-center flex-none" style={{ background: 'rgba(214,0,127,.16)', color: 'var(--accent)' }}><Boxes size={18} /></div>}
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold truncate" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>{d?.titulo || 'Produto'}</div>
          <div className="text-[10.5px] text-faint num truncate">{d?.sku || itemId}{d?.preco != null ? ` · ${brl(d.preco)}` : ''}{d?.piso != null ? ` · piso ${brl(d.piso)}` : ''}</div>
        </div>
        <button onClick={onClose} className="text-faint hover:text-fg flex-none"><X size={18} /></button>
      </div>
      <div className="px-4 py-3">
        <div className="text-[9.5px] uppercase tracking-wide text-faint font-bold mb-2 flex items-center gap-1.5"><Tag size={12} style={{ color: 'var(--accent)' }} /> Campanhas do anúncio{d ? ` (${proms.length})` : ''}{d && d.participando > 0 ? ` · ${d.participando} participando` : ''}</div>
        {carr ? (
          <div>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skel mb-2" style={{ height: 118, borderRadius: 14 }} />)}</div>
        ) : !d || proms.length === 0 ? (
          <div className="text-[12px] text-faint p-6 text-center">Este anúncio não tem promoções no momento.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {proms.map((c, i) => {
              const st = ST[(c.status || '').toLowerCase()] || { t: (c.status || '—').toUpperCase(), c: 'var(--dim)' }
              const part = ['active', 'started', 'enabled'].includes((c.status || '').toLowerCase())
              const coop = (c.meli_percentage || 0) + (c.seller_percentage || 0)
              const Ic = meta(c.type).icon
              return (
                <div key={i} className="rounded-xl p-3" style={{ background: part ? 'rgba(47,217,141,.06)' : 'linear-gradient(158deg,rgba(255,255,255,.04),rgba(0,0,0,.18))', border: `1px solid ${part ? 'rgba(47,217,141,.3)' : 'var(--glass-border)'}`, boxShadow: part ? 'inset 3px 0 0 var(--ok)' : 'none' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg grid place-items-center flex-none" style={{ background: `${meta(c.type).cor}1e`, color: meta(c.type).cor }}><Ic size={14} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-bold truncate">{c.nome}</div>
                      <div className="text-[9px] text-faint">{meta(c.type).label}{(c.start_date || c.finish_date) ? ` · ${dcurta(c.start_date) || '—'} a ${dcurta(c.finish_date) || '—'}` : ''}</div>
                    </div>
                    <span className="text-[8.5px] font-extrabold px-2 py-0.5 rounded-full flex-none" style={{ background: `${st.c}1f`, color: st.c }}>{part && <Check size={9} className="inline mr-0.5" />}{st.t}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg px-2.5 py-1.5" style={{ background: 'rgba(0,0,0,.22)' }}><div className="text-[8px] uppercase text-faint font-extrabold">Desconto</div><div className="text-[13px] font-extrabold num" style={{ color: 'var(--warn)' }}>{c.desconto_pct > 0 ? `${c.desconto_pct}%` : '—'}</div></div>
                    <div className="rounded-lg px-2.5 py-1.5" style={{ background: 'rgba(0,0,0,.22)' }}><div className="text-[8px] uppercase text-faint font-extrabold">Preço final</div><div className="text-[13px] font-extrabold num">{c.preco_final != null ? brl(c.preco_final) : '—'}</div></div>
                    <div className="rounded-lg px-2.5 py-1.5" style={{ background: c.acima_piso ? 'rgba(47,217,141,.1)' : 'rgba(255,122,122,.1)' }}><div className="text-[8px] uppercase text-faint font-extrabold">Você recebe</div><div className="text-[13px] font-extrabold num" style={{ color: c.acima_piso ? 'var(--ok)' : 'var(--danger)' }}>{c.voce_recebe != null ? brl(c.voce_recebe) : '—'}</div></div>
                  </div>
                  {coop > 0 && <div className="text-[9px] mt-1.5 num" style={{ color: BLUE }}>cofinanciado: ML {Math.round(c.meli_percentage || 0)}% · você {Math.round(c.seller_percentage || 0)}%</div>}
                  {!c.acima_piso && c.preco_final != null && c.piso != null && <div className="text-[9px] mt-1 flex items-center gap-1" style={{ color: 'var(--danger)' }}><AlertTriangle size={10} /> abaixo do piso ({brl(c.piso)})</div>}
                  <div className="mt-2 flex justify-end">
                    {part ? (
                      <button onClick={() => sair(c)} disabled={acao === c.id} className="text-[10.5px] font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-50" style={{ border: '1px solid rgba(255,122,122,.4)', color: 'var(--danger)' }}>{acao === c.id ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />} Deixar de participar</button>
                    ) : (c.preco_final != null && (
                      <button onClick={() => participar(c)} disabled={acao === c.id} className="text-[10.5px] font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 text-white disabled:opacity-50" style={{ background: c.acima_piso ? 'var(--accent)' : 'var(--warn)' }}>{acao === c.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} {c.acima_piso ? 'Participar' : 'Participar mesmo assim'}</button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className="text-[9.5px] text-faint mt-3 flex items-start gap-1.5"><Info size={12} className="flex-none mt-0.5" /> <span>“Você recebe” é o líquido estimado após as taxas do ML (modelo do Preço Bling). Estados ATIVA / PROGRAMADA / DISPONÍVEL seguem o Mercado Livre.</span></div>
      </div>
    </div>
  )
}

/* ================= seletor de itens interno ================= */
function SeletorItens({ modo, promotionId, promotionType, promoNome, inicio, fim, onClose, onOk, notify }) {
  const [q, setQ] = useState('')
  const [itens, setItens] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [pct, setPct] = useState(15)
  const [sel, setSel] = useState(() => new Set())
  const [aplicando, setAplicando] = useState(false)
  const [prog, setProg] = useState(null)
  const [temMais, setTemMais] = useState(false)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [meta, setMeta] = useState(null)
  const [permitirAbaixo, setPermitirAbaixo] = useState(false)
  const [saindo, setSaindo] = useState(false)

  const carregar = useCallback(async (busca = '') => {
    setCarregando(true); setErro(''); setSel(new Set())
    try {
      if (modo === 'convite') {
        const r = await api.mlPromoPromocaoItens(promotionId, promotionType)
        setItens(r.itens || []); setTemMais(false)
        setMeta({ total: r.total ?? (r.itens || []).length, truncado: !!r.truncado, semBling: r.sem_preco_bling ?? 0 })
      } else {
        const r = await api.mlPromoItens({ q: busca, apenas_ativos: true, limit: 50, offset: 0 })
        setItens(r.itens || []); setTemMais((r.itens || []).length >= 50); setMeta(null)
      }
    } catch (e) { setErro(e.message || 'Falha ao carregar itens'); setItens([]) }
    finally { setCarregando(false) }
  }, [modo, promotionId, promotionType])

  const carregarMais = async () => {
    setCarregandoMais(true)
    try {
      const off = (itens || []).length
      const r = await api.mlPromoItens({ q, apenas_ativos: true, limit: 50, offset: off })
      setItens((prev) => [...(prev || []), ...(r.itens || [])])
      setTemMais((r.itens || []).length >= 50)
    } catch (e) { notify(e.message || 'Falha ao carregar mais', 'danger') }
    finally { setCarregandoMais(false) }
  }

  useEffect(() => { carregar('') }, [carregar])

  const dealDe = (it) => {
    if (modo === 'convite') {
      // Convite: quem define o desconto é o Mercado Livre. Usamos o preço ofertado pela plataforma
      // (sugerido -> menor desconto permitido -> maior desconto -> original). Sem barra manual.
      const dp = (it.suggested_discounted_price != null ? it.suggested_discounted_price
        : it.min_discounted_price != null ? it.min_discounted_price
          : it.max_discounted_price != null ? it.max_discounted_price
            : it.original_price) || 0
      return Math.round(dp * 100) / 100
    }
    const dp = (it.preco || 0) * (1 - pct / 100)
    return Math.round(dp * 100) / 100
  }
  const furaPiso = (it) => it.piso_preco != null && dealDe(it) < it.piso_preco - 0.005
  const isParticipando = (it) => ['active', 'started', 'enabled'].includes((it.status || '').toLowerCase())
  const podeSel = (it) => !isParticipando(it) && (permitirAbaixo || !furaPiso(it))
  const toggle = (it) => { if (!podeSel(it)) return; setSel((s) => { const n = new Set(s); n.has(it.item_id) ? n.delete(it.item_id) : n.add(it.item_id); return n }) }
  const lista = itens || []
  const ql = q.trim().toLowerCase()
  const listaExibida = (modo === 'convite' && ql)
    ? lista.filter((it) => (`${it.titulo || ''} ${it.item_id || ''} ${it.sku || ''}`).toLowerCase().includes(ql))
    : lista
  const semBling = lista.filter((i) => i.piso_preco == null).length
  const abaixoTotal = lista.filter(furaPiso).length
  const elegiveisVis = listaExibida.filter(podeSel)
  const elegiveis = lista.filter(podeSel)
  const ignorados = permitirAbaixo ? 0 : abaixoTotal
  const nSel = lista.filter((i) => sel.has(i.item_id) && podeSel(i)).length
  const participando = lista.filter((i) => ['active', 'started', 'enabled'].includes((i.status || '').toLowerCase())).length
  const valorSel = lista.filter((i) => sel.has(i.item_id)).reduce((acc, i) => acc + (dealDe(i) || 0), 0)
  const participandoItens = lista.filter(isParticipando)
  const voceRecebeTotal = participandoItens.reduce((a, it) => a + (it.net_proceeds || 0), 0)
  const descsPart = participandoItens.map((it) => { const cp = (it.meli_percentage || 0) + (it.seller_percentage || 0); const ref = it.preco || it.original_price; return cp > 0 ? cp : (ref && it.price != null && it.price < ref ? (1 - it.price / ref) * 100 : 0) }).filter((d) => d > 0)
  const descMedioPart = descsPart.length ? Math.round(descsPart.reduce((a, d) => a + d, 0) / descsPart.length) : 0
  const comMargem = lista.filter((it) => !isParticipando(it) && it.piso_preco != null && !furaPiso(it)).length
  const furaCount = lista.filter((it) => !isParticipando(it) && furaPiso(it)).length
  const sairDaPromo = async () => {
    if (!window.confirm(`Deixar de aderir? Remove os ${participando} item(ns) que estão participando desta promoção.`)) return
    setSaindo(true)
    try {
      const r = await api.mlPromoSair(promotionId, promotionType)
      notify && notify(`${r.removidos} item(ns) removido(s).`, r.removidos > 0 ? 'ok' : 'warn')
      onOk && onOk()
    } catch (e) { notify && notify(traduzErroML(e.message), 'danger') }
    finally { setSaindo(false) }
  }

  const aplicar = async () => {
    const alvos = lista.filter((i) => sel.has(i.item_id) && podeSel(i))
    if (!alvos.length) { notify('Selecione ao menos um item.', 'warn'); return }
    const nAbaixo = alvos.filter(furaPiso).length
    if (nAbaixo > 0 && !window.confirm(`${nAbaixo} ${nAbaixo === 1 ? 'item está' : 'itens estão'} ABAIXO do Preço Bling — isso vende abaixo da sua meta de margem. Aderir mesmo assim?`)) return
    setAplicando(true); setProg({ feito: 0, total: alvos.length, falhas: [] })
    const falhas = []
    for (let k = 0; k < alvos.length; k++) {
      const it = alvos[k]
      try {
        const body = { promotion_id: promotionId, promotion_type: promotionType, deal_price: dealDe(it) }
        if (it.offer_id && TIPOS_OFFER_ID.has(promotionType)) body.offer_id = it.offer_id
        if (furaPiso(it)) body.permitir_abaixo_piso = true
        if (promotionType === 'LIGHTNING') {
          // limites do ML são EXCLUSIVOS: "greater than min and less than max"
          const lo = it.stock_min != null ? it.stock_min + 1 : 1
          const hi = it.stock_max != null ? it.stock_max - 1 : null
          let st = it.estoque != null ? it.estoque : lo
          st = Math.max(st, lo)
          if (hi != null) st = Math.min(st, Math.max(hi, lo))
          body.stock = Math.max(1, Math.round(st))
        }
        await api.mlPromoAderir(it.item_id, body)
      } catch (e) { falhas.push({ id: it.item_id, msg: traduzErroML(e.message) }) }
      setProg({ feito: k + 1, total: alvos.length, falhas: [...falhas] })
    }
    setAplicando(false)
    if (falhas.length === 0) { notify(`${alvos.length} ${alvos.length === 1 ? 'item adicionado' : 'itens adicionados'}.`, 'ok'); onOk() }
    else notify(`${alvos.length - falhas.length} ok · ${falhas.length} com erro.`, falhas.length === alvos.length ? 'danger' : 'warn')
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end" style={{ background: 'rgba(0,0,0,.55)' }} onClick={aplicando ? undefined : (e) => { e.stopPropagation(); onClose() }}>
      <div onClick={(e) => e.stopPropagation()} className="h-full w-full drawer-in flex flex-col" style={{ maxWidth: 640, border: '1px solid transparent', background: 'linear-gradient(180deg,var(--surface),#160c13) padding-box, linear-gradient(155deg, rgba(214,0,127,.6), rgba(214,0,127,.06) 42%, rgba(255,255,255,.10)) border-box', boxShadow: '-24px 0 70px rgba(0,0,0,.55)' }}>
        {/* header */}
        <div className="flex items-center gap-2.5 px-4 py-3 flex-none" style={{ borderBottom: '1px solid var(--glass-border)' }}>
          <div className="w-9 h-9 rounded-xl grid place-items-center flex-none" style={{ background: 'linear-gradient(145deg, rgba(214,0,127,.95), rgba(168,0,99,.95))', color: '#fff', boxShadow: '0 4px 14px rgba(214,0,127,.35)' }}><Layers size={17} /></div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-bold truncate" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>{promoNome || (modo === 'convite' ? 'Convite do Mercado Livre' : 'Campanha')}</div>
            <div className="text-[10.5px] text-faint truncate">{modo === 'convite' ? 'Aderir com itens' : 'Adicionar itens'}{modo === 'convite' && meta ? ` · ${meta.total} ${meta.total === 1 ? 'candidato' : 'candidatos'}${meta.truncado ? '+' : ''}` : ''}{(inicio || fim) ? ` · vale ${dcurta(inicio) || '—'} → ${dcurta(fim) || '—'}` : ''}</div>
          </div>
          <button onClick={onClose} disabled={aplicando} className="text-faint hover:text-fg disabled:opacity-40 flex-none"><X size={18} /></button>
        </div>

        {/* dashboard da promoção */}
        <div className="px-4 pt-3 flex-none">
          <div className="rounded-2xl p-3" style={{ background: 'linear-gradient(158deg,rgba(255,255,255,.05),rgba(0,0,0,.20))', border: '1px solid var(--glass-border)' }}>
            <div className="text-[9.5px] uppercase tracking-wide text-faint font-bold mb-2.5 flex items-center gap-1.5"><Activity size={12} style={{ color: 'var(--accent)' }} /> Resumo da promoção</div>
            <div className="grid grid-cols-4 gap-2">
              <BbKpi l={modo === 'convite' ? 'Elegíveis' : 'No catálogo'} v={meta ? meta.total : lista.length} c="var(--accent)" />
              <BbKpi l="Participando" v={participando} c="var(--ok)" />
              <BbKpi l="Selecionados" v={nSel} c={nSel > 0 ? 'var(--accent)' : 'var(--dim)'} sub={valorSel > 0 ? brl(valorSel) : 'nenhum'} />
              <BbKpi l={modo === 'convite' ? 'Válido até' : 'Duração'} v={dcurta(fim) || '—'} c="var(--warn)" sub={inicio ? `de ${dcurta(inicio)}` : null} />
            </div>
            {voceRecebeTotal > 0 && (
              <div className="flex justify-between items-center rounded-xl px-3 py-2.5 mt-2.5" style={{ background: 'rgba(47,217,141,.08)', border: '1px solid rgba(47,217,141,.3)' }}>
                <span className="text-[12px] font-bold flex items-center gap-1.5" style={{ color: 'var(--ok)' }}><CircleDollarSign size={13} /> Você recebe (participando)</span>
                <span className="num font-bold" style={{ fontSize: 16, color: 'var(--ok)' }}>{brl(voceRecebeTotal)}{descMedioPart > 0 ? <span style={{ fontSize: 11 }}> · −{descMedioPart}% méd no ML</span> : ''}</span>
              </div>
            )}
            {(comMargem > 0 || furaCount > 0) && (
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                {comMargem > 0 && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1" style={{ background: 'rgba(214,0,127,.12)', color: 'var(--accent)' }}><Check size={11} /> {comMargem} cabem acima do piso</span>}
                {furaCount > 0 && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1" style={{ background: 'rgba(255,122,122,.1)', color: 'var(--danger)' }}><AlertTriangle size={11} /> {furaCount} furam o piso</span>}
              </div>
            )}
          </div>
        </div>

        {/* controles */}
        <div className="px-4 pt-3 pb-2 flex-none">
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && modo !== 'convite' && carregar(q)} placeholder={modo === 'convite' ? 'Filtrar itens do convite…' : 'Buscar por título, SKU ou ID… (Enter)'} className="w-full text-[12px] pl-9 pr-3 py-2 rounded-xl bg-transparent text-fg placeholder:text-faint" style={{ border: '1px solid var(--glass-border)' }} />
          </div>
          {modo !== 'convite' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9.5px] text-faint font-extrabold uppercase tracking-wide">Desconto</span>
              {[10, 15, 20, 25, 30].map((d) => (
                <button key={d} onClick={() => setPct(d)} className="text-[11px] font-bold px-2.5 py-1 rounded-full num transition-colors" style={pct === d ? { background: 'var(--accent)', color: '#fff' } : { background: 'rgba(255,255,255,.06)', color: 'var(--dim)', border: '1px solid var(--glass-border)' }}>{d}%</button>
              ))}
              <input type="range" min={5} max={40} step={1} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="flex-1 min-w-[120px]" style={{ accentColor: '#d6007f' }} />
              <span className="text-[11px] font-extrabold num" style={{ color: 'var(--accent)' }}>{pct}%</span>
            </div>
          )}
          {modo === 'convite' && <div className="text-[10px] text-faint mt-1.5 flex items-start gap-1.5"><Info size={12} className="flex-none mt-0.5" /> <span>Convites usam o desconto do <b style={{ color: 'var(--fg)' }}>Mercado Livre</b> — o preço de cada item é definido pela plataforma. Você só escolhe <b style={{ color: 'var(--fg)' }}>quais participam</b>; nunca abaixo do piso.</span></div>}
          {modo === 'convite' && participandoItens.some((it) => (it.meli_percentage || 0) + (it.seller_percentage || 0) > 0) && <div className="text-[9.5px] text-faint mt-1 flex items-start gap-1.5"><Gift size={11} className="flex-none mt-0.5" style={{ color: BLUE }} /> <span><b style={{ color: 'var(--fg)' }}>Coparticipação:</b> o desconto é dividido — o ML cobre uma parte (<b style={{ color: BLUE }}>ML%</b>) e você cobre o resto (<b style={{ color: BLUE }}>você%</b>). “Você recebe” já é o líquido depois das taxas.</span></div>}
          {semBling > 0 && <div className="text-[10px] mt-1.5 flex items-start gap-1.5" style={{ color: 'var(--warn)' }}><AlertTriangle size={12} className="flex-none mt-0.5" /> {semBling} {semBling === 1 ? 'item sem' : 'itens sem'} Preço Bling — sem trava de margem. Cadastre o custo/Preço Bling no Bling para proteger a margem.</div>}
          {abaixoTotal > 0 && (
            <div className="mt-2 rounded-xl p-2.5" style={{ background: permitirAbaixo ? 'rgba(255,122,122,.12)' : 'rgba(224,162,60,.1)', border: `1px solid ${permitirAbaixo ? 'rgba(255,122,122,.35)' : 'rgba(224,162,60,.3)'}` }}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} style={{ color: permitirAbaixo ? 'var(--danger)' : 'var(--warn)', flexShrink: 0 }} />
                <div className="text-[10.5px] flex-1" style={{ color: permitirAbaixo ? 'var(--danger)' : 'var(--warn)' }}>
                  {abaixoTotal} de {lista.length} {abaixoTotal === 1 ? 'item ficaria' : 'itens ficariam'} <b>abaixo do Preço Bling</b> nesta promoção{elegiveis.length === 0 && !permitirAbaixo ? ' — por isso nada fica selecionável (a trava protege sua margem).' : '.'}
                </div>
                <button onClick={() => { setPermitirAbaixo((v) => !v); setSel(new Set()) }} className="text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={permitirAbaixo ? { background: 'var(--danger)', color: '#fff', flexShrink: 0 } : { background: 'transparent', color: 'var(--warn)', border: '1px solid rgba(224,162,60,.5)', flexShrink: 0 }}>{permitirAbaixo ? 'Trava desativada' : 'Permitir abaixo do piso'}</button>
              </div>
              {permitirAbaixo && <div className="text-[9.5px] mt-1.5 leading-snug" style={{ color: 'var(--danger)' }}>Você assume vender abaixo da meta de margem. Use só como ação estratégica consciente (giro de estoque parado, visibilidade). A automação dos agentes nunca faz isso.</div>}
            </div>
          )}
        </div>

        {/* lista */}
        <div className="px-3 overflow-y-auto flex-1" style={{ minHeight: 160 }}>
          {carregando ? (
            <div className="p-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skel mb-2" style={{ height: 52, borderRadius: 12 }} />)}</div>
          ) : erro ? (
            <div className="text-[12px] text-danger p-4 flex items-center gap-2"><Ban size={14} /> {erro}</div>
          ) : !lista.length ? (
            <div className="text-[12px] text-faint p-6 text-center">{modo === 'convite' ? 'Nenhum item elegível neste convite.' : 'Nenhum anúncio ativo encontrado.'}</div>
          ) : !listaExibida.length ? (
            <div className="text-[12px] text-faint p-6 text-center">Nenhum resultado para “{q}”.</div>
          ) : (<>{[...listaExibida].sort((a, b) => (isParticipando(b) ? 1 : 0) - (isParticipando(a) ? 1 : 0)).map((it) => {
            const dp = dealDe(it); const fura = furaPiso(it); const sb = it.piso_preco == null
            const folga = it.piso_preco != null ? dp - it.piso_preco : null
            const on = sel.has(it.item_id); const part = isParticipando(it)
            const coop = (it.meli_percentage || 0) + (it.seller_percentage || 0)
            const refOrig = it.preco || it.original_price
            const descPart = coop > 0 ? Math.round(coop) : (refOrig && it.price != null && it.price < refOrig ? Math.round((1 - it.price / refOrig) * 100) : 0)
            const precoFinal = (it.price != null && refOrig && it.price < refOrig) ? it.price : (refOrig && descPart ? Math.round(refOrig * (1 - descPart / 100) * 100) / 100 : (it.price != null ? it.price : dp))
            return (
              <div key={it.item_id} onClick={() => { if (!part) toggle(it) }} className="flex items-center gap-3 px-3 py-2 rounded-xl mb-1" style={{ background: part ? 'rgba(47,217,141,.08)' : on ? 'rgba(214,0,127,.08)' : 'transparent', border: '1px solid ' + (part ? 'rgba(47,217,141,.3)' : on ? 'rgba(214,0,127,.3)' : 'transparent'), boxShadow: part ? 'inset 3px 0 0 var(--ok)' : 'none', opacity: (fura && !permitirAbaixo && !part) ? 0.55 : 1, cursor: part ? 'default' : 'pointer' }}>
                {part
                  ? <div className="w-5 h-5 rounded-md grid place-items-center flex-none" style={{ background: 'var(--ok)' }} title="Já participando"><Check size={13} color="#08130d" /></div>
                  : <div className="w-5 h-5 rounded-md grid place-items-center flex-none" style={{ border: '1.5px solid ' + (on ? 'var(--accent)' : 'var(--glass-border)'), background: on ? 'var(--accent)' : 'transparent' }}>{on && <Check size={13} color="#fff" />}</div>}
                {it.imagem ? <img src={it.imagem} alt="" className="w-10 h-10 rounded-lg object-cover flex-none" style={{ border: '1px solid var(--glass-border)' }} /> : <div className="w-10 h-10 rounded-lg grid place-items-center flex-none" style={{ background: 'rgba(255,255,255,.05)' }}><Boxes size={16} className="text-faint" /></div>}
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold truncate flex items-center gap-1.5"><span className="truncate">{it.titulo || it.item_id}</span>{part && <span className="text-[7.5px] font-extrabold px-1.5 py-0.5 rounded-full flex-none tracking-wide" style={{ background: 'rgba(47,217,141,.18)', color: 'var(--ok)' }}>PARTICIPANDO</span>}</div>
                  <div className="text-[10px] text-faint num truncate">{it.sku || it.item_id}{it.estoque != null ? ` · ${it.estoque} un` : ''}{it.em_promocao && !part ? ' · já em promoção' : ''}</div>
                </div>
                <div className="text-right flex-none">
                  {part ? (<>
                    <div className="text-[10px] text-faint num">{refOrig && refOrig > precoFinal ? `de ${brl(refOrig)}` : 'preço no ML'}</div>
                    <div className="text-[12.5px] font-extrabold num" style={{ color: 'var(--ok)' }}>{brl(precoFinal)}</div>
                  </>) : (<>
                    <div className="text-[10px] text-faint num">de {brl(it.preco || it.original_price)}</div>
                    <div className="text-[12.5px] font-extrabold num" style={{ color: fura ? 'var(--danger)' : 'var(--ok)' }}>{brl(dp)}</div>
                  </>)}
                </div>
                <div className="flex-none text-right" style={{ width: 138 }}>
                  {part ? (<>
                    {descPart > 0
                      ? <span className="text-[9.5px] font-extrabold" style={{ color: 'var(--ok)' }}>−{descPart}% no ML</span>
                      : <span className="text-[9px] font-extrabold" style={{ color: 'var(--warn)' }}>sem desconto ativo</span>}
                    {it.net_proceeds != null && <div className="text-[8.5px] num" style={{ color: 'var(--ok)' }}>você recebe {brl(it.net_proceeds)}</div>}
                    {coop > 0 && it.meli_percentage != null && <div className="text-[8.5px] num" style={{ color: BLUE }}>cofin.: ML {Math.round(it.meli_percentage)}% · você {Math.round(it.seller_percentage || 0)}%</div>}
                  </>) : sb ? <span className="text-[9px] text-faint">sem Preço Bling</span>
                    : fura ? <span className="text-[9px] font-extrabold" style={{ color: 'var(--danger)' }}>fura o piso {brl(it.piso_preco)}</span>
                      : <span className="text-[9px] font-extrabold" style={{ color: 'var(--ok)' }}>folga {brl(folga)}</span>}
                  {modo === 'convite' && !part && it.min_discounted_price != null && <div className="text-[8.5px] text-faint num">preço do ML {brl(it.suggested_discounted_price != null ? it.suggested_discounted_price : it.min_discounted_price)}</div>}
                </div>
              </div>
            )
          })}</>)}
          {temMais && modo !== 'convite' && listaExibida.length > 0 && <button onClick={carregarMais} disabled={carregandoMais} className="w-full text-[11px] text-dim py-2 mt-1 rounded-lg glass hover:text-fg disabled:opacity-50">{carregandoMais ? 'Carregando…' : 'Carregar mais 50'}</button>}
        </div>

        {/* rodapé */}
        <div className="px-4 py-3 flex-none" style={{ borderTop: '1px solid var(--glass-border)' }}>
          {prog && (
            <div className="mb-2">
              <div className="flex items-center justify-between text-[10px] mb-1"><span className="text-dim">{aplicando ? 'Aplicando…' : 'Concluído'} {prog.feito}/{prog.total}</span>{prog.falhas.length > 0 && <span style={{ color: 'var(--danger)' }}>{prog.falhas.length} com erro</span>}</div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.08)' }}><div style={{ width: `${(prog.feito / prog.total) * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), #ff2b9d)', transition: 'width .2s' }} /></div>
              {prog.falhas.length > 0 && !aplicando && <div className="mt-1.5 max-h-16 overflow-y-auto">{prog.falhas.map((f, i) => <div key={i} className="text-[9px] text-faint num truncate">{f.id}: {f.msg}</div>)}</div>}
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setSel((prev) => new Set([...prev, ...elegiveisVis.map((i) => i.item_id)]))} disabled={aplicando || !elegiveisVis.length} className="text-[10.5px] px-2.5 py-1 rounded-lg glass text-dim hover:text-fg disabled:opacity-40">Selecionar todos ({elegiveisVis.length})</button>
            {(() => { const cm = listaExibida.filter((i) => i.preco_bling != null && !furaPiso(i)); return cm.length > 0 && cm.length !== elegiveisVis.length ? <button onClick={() => setSel((prev) => new Set([...prev, ...cm.map((i) => i.item_id)]))} disabled={aplicando} className="text-[10.5px] px-2.5 py-1 rounded-lg hover:opacity-90" style={{ background: 'rgba(47,217,141,.12)', border: '1px solid rgba(47,217,141,.3)', color: 'var(--ok)' }}>Só com margem ({cm.length})</button> : null })()}
            {sel.size > 0 && <button onClick={() => setSel(new Set())} disabled={aplicando} className="text-[10.5px] px-2.5 py-1 rounded-lg glass text-dim hover:text-fg">Limpar</button>}
            {modo === 'convite' && participando > 0 && <button onClick={sairDaPromo} disabled={saindo || aplicando} className="text-[10.5px] px-2.5 py-1 rounded-lg inline-flex items-center gap-1 disabled:opacity-40" style={{ background: 'rgba(255,122,122,.12)', border: '1px solid rgba(255,122,122,.3)', color: 'var(--danger)' }}>{saindo ? <Loader2 size={11} className="animate-spin" /> : <Ban size={11} />} Deixar de aderir ({participando})</button>}
            <div className="text-[10.5px] text-dim ml-1"><b className="num" style={{ color: 'var(--fg)' }}>{nSel}</b> selecionado{nSel === 1 ? '' : 's'}{ignorados > 0 && <span className="text-faint"> · {ignorados} abaixo do piso ignorado{ignorados === 1 ? '' : 's'}</span>}{permitirAbaixo && abaixoTotal > 0 && <span style={{ color: 'var(--danger)' }}> · {abaixoTotal} liberado{abaixoTotal === 1 ? '' : 's'} abaixo do piso</span>}</div>
            <button onClick={aplicar} disabled={aplicando || nSel === 0} className="ml-auto text-[12px] font-bold px-4 py-2 rounded-xl text-white inline-flex items-center gap-1.5 disabled:opacity-40" style={{ background: 'linear-gradient(135deg, var(--accent), #a80063)' }}>{aplicando ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {modo === 'convite' ? 'Aderir' : 'Adicionar'} {nSel > 0 ? `(${nSel})` : ''}</button>
          </div>
        </div>
      </div>
    </div>, document.body)
}

/* ================= modais de criação (portal, fundo sólido) ================= */
const inputCls = 'w-full text-[12.5px] px-3 py-2 rounded-xl bg-transparent text-fg placeholder:text-faint'
const inputSty = { border: '1px solid var(--glass-border)' }

function Modal({ title, icon: Ic, onClose, children }) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end" style={{ background: 'rgba(0,0,0,.55)' }} onClick={(e) => { e.stopPropagation(); onClose() }}>
      <div onClick={(e) => e.stopPropagation()} className="h-full w-full drawer-in flex flex-col" style={{ maxWidth: 480, border: '1px solid transparent', background: 'linear-gradient(180deg,var(--surface),#160c13) padding-box, linear-gradient(155deg, rgba(214,0,127,.6), rgba(214,0,127,.06) 42%, rgba(255,255,255,.10)) border-box', boxShadow: '-24px 0 70px rgba(0,0,0,.55)' }}>
        <div className="flex items-center gap-2 px-4 py-3 flex-none" style={{ borderBottom: '1px solid var(--glass-border)' }}>
          {Ic && <div className="w-8 h-8 rounded-lg grid place-items-center flex-none" style={{ background: 'rgba(214,0,127,.16)', color: 'var(--accent)' }}><Ic size={16} /></div>}
          <span className="text-[15px] font-bold" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>{title}</span>
          <button onClick={onClose} className="ml-auto text-faint hover:text-fg"><X size={18} /></button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>, document.body)
}

function Campo({ label, children }) {
  return (
    <label className="block mb-3">
      <div className="text-[10px] uppercase tracking-wide text-faint font-extrabold mb-1">{label}</div>
      {children}
    </label>
  )
}

function NovaCampanhaModal({ onClose, onOk, notify }) {
  const [nome, setNome] = useState('')
  const [comeca, setComeca] = useState(0)
  const [dura, setDura] = useState(7)
  const [busy, setBusy] = useState(false)
  const criar = async () => {
    if (!nome.trim()) { notify('Dê um nome para a campanha.', 'warn'); return }
    setBusy(true)
    try {
      await api.mlPromoCriarCampanha({ nome: nome.trim(), inicio: isoDe(comeca, '00:00:00'), fim: isoDe(comeca + dura, '23:59:59') })
      notify('Campanha criada. Agora adicione itens a ela.', 'ok'); onOk()
    } catch (e) { notify(e.message || 'Falha ao criar campanha', 'danger') }
    finally { setBusy(false) }
  }
  return (
    <Modal title="Nova campanha de %" icon={Tag} onClose={onClose}>
      <Campo label="Nome da campanha"><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Semana do Armarinho" className={inputCls} style={inputSty} /></Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Começa"><select value={comeca} onChange={(e) => setComeca(Number(e.target.value))} className={inputCls} style={inputSty}><option value={0}>Hoje</option><option value={1}>Amanhã</option></select></Campo>
        <Campo label="Duração"><select value={dura} onChange={(e) => setDura(Number(e.target.value))} className={inputCls} style={inputSty}><option value={3}>3 dias</option><option value={7}>7 dias</option><option value={14}>14 dias</option></select></Campo>
      </div>
      <div className="text-[10.5px] text-faint flex items-start gap-1.5 mb-3"><Info size={13} className="flex-none mt-0.5" /> Campanha de desconto percentual (flexível), no máximo 14 dias. Depois de criada, adicione os itens e aplique descontos pelo simulador — sempre acima do Preço Bling.</div>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="text-[12px] px-3 py-2 rounded-xl glass text-dim hover:text-fg">Cancelar</button>
        <button onClick={criar} disabled={busy} className="text-[12px] font-semibold px-4 py-2 rounded-xl text-white inline-flex items-center gap-1.5 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, var(--accent), #a80063)' }}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Criar campanha</button>
      </div>
    </Modal>
  )
}

function NovoCupomModal({ onClose, onOk, notify }) {
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('FIXED_AMOUNT')
  const [valor, setValor] = useState('')
  const [minCompra, setMinCompra] = useState('')
  const [codigo, setCodigo] = useState('')
  const [orcamento, setOrcamento] = useState('')
  const [comeca, setComeca] = useState(0)
  const [dura, setDura] = useState(14)
  const [busy, setBusy] = useState(false)
  const criar = async () => {
    if (!nome.trim()) { notify('Dê um nome para o cupom.', 'warn'); return }
    if (!valor || Number(valor) <= 0) { notify('Informe o valor do cupom.', 'warn'); return }
    if (!minCompra || Number(minCompra) <= 0) { notify('Informe a compra mínima.', 'warn'); return }
    setBusy(true)
    try {
      await api.mlPromoCriarCupom({
        nome: nome.trim(), inicio: isoDe(comeca, '00:00:00'), fim: isoDe(comeca + dura, '23:59:59'),
        subtipo: tipo, valor: Number(valor), min_compra: Number(minCompra),
        codigo: codigo.trim() || undefined, orcamento: orcamento ? Number(orcamento) : undefined,
      })
      notify('Cupom criado.', 'ok'); onOk()
    } catch (e) { notify(e.message || 'Falha ao criar cupom', 'danger') }
    finally { setBusy(false) }
  }
  return (
    <Modal title="Novo cupom" icon={Ticket} onClose={onClose}>
      <Campo label="Nome do cupom"><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Frete pra seguidores" className={inputCls} style={inputSty} /></Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Tipo"><select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputCls} style={inputSty}><option value="FIXED_AMOUNT">Valor fixo (R$)</option><option value="FIXED_PERCENTAGE">Percentual (%)</option></select></Campo>
        <Campo label={tipo === 'FIXED_AMOUNT' ? 'Desconto (R$)' : 'Desconto (%)'}><input value={valor} onChange={(e) => setValor(e.target.value)} type="number" placeholder={tipo === 'FIXED_AMOUNT' ? '20' : '10'} className={inputCls} style={inputSty} /></Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Compra mínima (R$)"><input value={minCompra} onChange={(e) => setMinCompra(e.target.value)} type="number" placeholder="100" className={inputCls} style={inputSty} /></Campo>
        <Campo label="Orçamento (R$, opcional)"><input value={orcamento} onChange={(e) => setOrcamento(e.target.value)} type="number" placeholder="ilimitado" className={inputCls} style={inputSty} /></Campo>
      </div>
      <Campo label="Código (opcional — vazio = cupom público)"><input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex.: SEGUIDOR10" className={inputCls} style={inputSty} /></Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Começa"><select value={comeca} onChange={(e) => setComeca(Number(e.target.value))} className={inputCls} style={inputSty}><option value={0}>Hoje</option><option value={1}>Amanhã</option></select></Campo>
        <Campo label="Duração"><select value={dura} onChange={(e) => setDura(Number(e.target.value))} className={inputCls} style={inputSty}><option value={7}>7 dias</option><option value={14}>14 dias</option><option value={30}>30 dias</option></select></Campo>
      </div>
      <div className="text-[10.5px] text-faint flex items-start gap-1.5 mb-3"><Info size={13} className="flex-none mt-0.5" /> O cupom é cumulativo com a promoção ativa e 100% custeado por você. Com código, distribua por fora (seguidores); sem código, o ML destaca para todos.</div>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="text-[12px] px-3 py-2 rounded-xl glass text-dim hover:text-fg">Cancelar</button>
        <button onClick={criar} disabled={busy} className="text-[12px] font-semibold px-4 py-2 rounded-xl text-white inline-flex items-center gap-1.5 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, var(--accent), #a80063)' }}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Criar cupom</button>
      </div>
    </Modal>
  )
}

/* ================= skeleton de carregamento ================= */
function SkeletonPromocoes() {
  return (
    <div className="mt-4">
      <div className="grid grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-3" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
            <div className="skel" style={{ height: 12, width: '70%' }} />
            <div className="skel mt-3" style={{ height: 20, width: '55%' }} />
            <div className="skel mt-2" style={{ height: 9, width: '80%' }} />
          </div>
        ))}
      </div>
      <div className="skel mt-3" style={{ height: 62, borderRadius: 16 }} />
      <div className="skel mt-3" style={{ height: 150, borderRadius: 18 }} />
      <div className="grid grid-cols-3 gap-3 mt-6">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skel" style={{ height: 120, borderRadius: 16 }} />)}
      </div>
      <div className="skel mt-3" style={{ height: 130, borderRadius: 16 }} />
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
