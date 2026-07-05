import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Megaphone, Target, RefreshCw, TrendingUp, TrendingDown, DollarSign, MousePointerClick,
  Eye, Percent, Gauge, Zap, PlayCircle, PauseCircle, ChevronRight, Loader2, Package,
  Info, BarChart3, Trophy, AlertTriangle, Wallet, Activity, Sparkles,
} from 'lucide-react'
import { api } from './api.js'
import { useToast } from './toast.jsx'

const ML = '#F2C200'
const BLUE = '#5B8DEF'
const PURPLE = '#a06be8'
const brl = (v) => v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const nfmt = (v) => v == null ? '—' : Number(v).toLocaleString('pt-BR')
const pct1 = (v) => v == null ? '—' : `${Number(v).toFixed(1)}%`

/* cores por qualidade de ACOS / ROAS */
const acosCor = (v) => v == null ? 'var(--faint)' : v <= 15 ? 'var(--ok)' : v <= 30 ? 'var(--warn)' : 'var(--danger)'
const roasCor = (v) => v == null ? 'var(--faint)' : v >= 5 ? 'var(--ok)' : v >= 3 ? 'var(--warn)' : 'var(--danger)'

function Kpi({ icon: Icon, label, value, cor = 'var(--text)', sub, bg, border }) {
  return (
    <div className="glass lift" style={{ borderRadius: 15, padding: '12px 13px 10px', background: bg, border }}>
      <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', display: 'flex', alignItems: 'center', gap: 4 }}>{Icon && <Icon size={10} />}{label}</div>
      <div className="num" style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.1, marginTop: 3, color: cor }}>{value}</div>
      {sub && <div style={{ fontSize: 8.5, color: 'var(--faint)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
function Ring({ size = 96, val, cor, w = 10, children }) {
  const r = (size - w * 2) / 2, c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} style={{ stroke: 'rgba(255,255,255,.08)', strokeWidth: w, fill: 'none' }} />
        <circle cx={size / 2} cy={size / 2} r={r} style={{ stroke: cor, strokeWidth: w, fill: 'none', strokeDasharray: `${Math.max(0, Math.min(100, val)) / 100 * c} ${c}`, strokeLinecap: 'round', transition: 'stroke-dasharray .5s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
    </div>
  )
}
function Badge({ children, c = 'var(--dim)', bg = 'rgba(255,255,255,.06)', style }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 8.5, fontWeight: 800, padding: '2.5px 7px', borderRadius: 99, whiteSpace: 'nowrap', color: c, background: bg, ...style }}>{children}</span>
}
function Skel({ h = 12, w = '100%', r = 8, style }) { return <div className="skel" style={{ height: h, width: w, borderRadius: r, ...style }} /> }

export default function MercadoAds() {
  const notify = useToast()
  const [dias, setDias] = useState(30)
  const [d, setD] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [tick, setTick] = useState(0)
  const [aberto, setAberto] = useState(null)
  const [editando, setEditando] = useState(() => new Set())

  const carregar = useCallback(() => {
    setCarregando(true)
    api.mlAdsPainel(dias).then(setD).catch(() => setD({ habilitado: false, motivo: 'Não foi possível consultar o Product Ads agora.' })).finally(() => setCarregando(false))
  }, [dias, tick])
  useEffect(() => { carregar() }, [carregar])

  const t = d?.totais || {}
  const camps = d?.campanhas || []
  const ctr = (t.prints && t.clicks != null) ? (t.clicks / t.prints) * 100 : null
  const cpc = (t.clicks && t.gasto != null) ? t.gasto / t.clicks : null
  const ativas = camps.filter((c) => c.status === 'active').length
  const maxCost = Math.max(1, ...camps.map((c) => c.cost || 0))
  const melhor = camps.filter((c) => c.acos != null && (c.gasto || c.cost)).slice().sort((a, b) => (a.acos || 999) - (b.acos || 999))[0]
  const pior = camps.filter((c) => c.acos != null && (c.cost)).slice().sort((a, b) => (b.acos || 0) - (a.acos || 0))[0]

  const marcar = (id, on) => setEditando((s) => { const n = new Set(s); on ? n.add(id) : n.delete(id); return n })
  const alternar = async (c) => {
    const novo = c.status === 'active' ? 'paused' : 'active'
    marcar(c.id, true)
    try { await api.mlAdsCampanhaEditar(c.id, { status: novo }); notify(`Campanha ${novo === 'active' ? 'ativada' : 'pausada'}.`, 'ok'); setTick((x) => x + 1) }
    catch (e) { notify(e?.data?.detail || 'Mercado Ads recusou a alteração.', 'danger') }
    finally { marcar(c.id, false) }
  }

  const PERIODOS = [7, 15, 30, 60, 90]

  return (
    <div style={{ maxWidth: 1220, margin: '0 auto' }}>
      {/* HERO */}
      <div className="row" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ width: 50, height: 50, borderRadius: 14, background: 'linear-gradient(145deg,#5B8DEF,#2b4b8c)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 14, boxShadow: '0 8px 26px rgba(91,141,239,.4)' }}><Megaphone size={24} color="#fff" /></div>
        <div style={{ minWidth: 220 }}>
          <div style={{ fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', flexWrap: 'wrap', fontFamily: 'Fraunces, Georgia, serif' }}>
            Mercado Ads<Badge c={ML} bg="rgba(242,194,0,.15)" style={{ marginLeft: 10 }}>PRODUCT ADS</Badge>
            {d?.habilitado && <Badge c="var(--ok)" bg="rgba(47,217,141,.13)" style={{ marginLeft: 5 }}>{ativas} ativas</Badge>}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--dim)' }}>{d?.habilitado ? `${d.conta || 'conta'} · publicidade patrocinada · métricas reais do ML` : 'Anúncios patrocinados — ROAS, ACOS, gasto e receita'}</div>
        </div>
        <div style={{ flex: 1 }} />
        <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,.3)', border: '1px solid var(--glass-border)', borderRadius: 11, padding: 3 }}>
            {PERIODOS.map((p) => <b key={p} onClick={() => setDias(p)} style={{ fontSize: 10.5, fontWeight: 800, padding: '5px 10px', borderRadius: 8, cursor: 'pointer', color: dias === p ? '#fff' : 'var(--dim)', background: dias === p ? 'var(--accent)' : 'transparent' }}>{p}d</b>)}
          </div>
          <button onClick={() => setTick((x) => x + 1)} className="glass lift" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, padding: '8px 13px', borderRadius: 11, color: 'var(--dim)', cursor: 'pointer' }}><RefreshCw size={13} className={carregando ? 'animate-spin' : ''} />Atualizar</button>
        </div>
      </div>

      {carregando && !d ? (
        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>{Array.from({ length: 8 }).map((_, i) => <Skel key={i} h={78} r={15} />)}</div>
      ) : !d?.habilitado ? (
        <div className="glass" style={{ padding: 30, textAlign: 'center', borderRadius: 18, border: '1px solid transparent', background: 'linear-gradient(180deg,var(--surface),#101826) padding-box, linear-gradient(155deg,rgba(91,141,239,.4),rgba(255,255,255,.08)) border-box' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(91,141,239,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><Megaphone size={26} style={{ color: BLUE }} /></div>
          <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Fraunces, Georgia, serif', marginBottom: 4 }}>Product Ads não está habilitado</div>
          <div style={{ fontSize: 11.5, color: 'var(--dim)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>{d?.motivo || 'Esta conta ainda não tem a permissão Advertising ou um advertiser de Product Ads.'} Ative o <b style={{ color: 'var(--text)' }}>Mercado Ads</b> no painel do Mercado Livre; assim que houver campanhas, os dados reais (ROAS, ACOS, gasto, GMV) aparecem aqui — sem números fabricados.</div>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
            <Kpi icon={Wallet} label={`Investido · ${dias}d`} value={brl(t.gasto)} cor="#ff8fc9" sub={`${nfmt(camps.length)} campanhas`} bg="linear-gradient(150deg,rgba(214,0,127,.14),rgba(0,0,0,.22))" border="1px solid rgba(214,0,127,.26)" />
            <Kpi icon={DollarSign} label="Receita atribuída" value={brl(t.gmv)} cor="var(--ok)" sub="GMV de Ads" bg="linear-gradient(150deg,rgba(47,217,141,.14),rgba(0,0,0,.22))" border="1px solid rgba(47,217,141,.26)" />
            <Kpi icon={TrendingUp} label="ROAS" value={t.roas == null ? '—' : `${Number(t.roas).toFixed(2)}x`} cor={roasCor(t.roas)} sub="receita / gasto" />
            <Kpi icon={Target} label="ACOS" value={pct1(t.acos)} cor={acosCor(t.acos)} sub="gasto / receita" />
          </div>
          <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
            <Kpi icon={MousePointerClick} label="Cliques" value={nfmt(t.clicks)} cor={BLUE} />
            <Kpi icon={Eye} label="Impressões" value={nfmt(t.prints)} cor="#cfaef5" />
            <Kpi icon={Percent} label="CTR" value={pct1(ctr)} cor="var(--text)" sub="cliques / impressões" />
            <Kpi icon={Activity} label="CPC médio" value={brl(cpc)} cor="var(--text)" sub="custo por clique" />
          </div>

          {/* gauges + destaques */}
          <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 12, marginBottom: 12 }}>
            <div className="glass" style={{ padding: 16, borderRadius: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', marginBottom: 8 }}>Eficiência (ACOS)</div>
              <Ring size={104} val={t.acos == null ? 0 : Math.max(0, 100 - Math.min(100, t.acos))} cor={acosCor(t.acos)} w={11}>
                <b style={{ fontSize: 20, color: acosCor(t.acos) }}>{pct1(t.acos)}</b>
                <span style={{ fontSize: 8, color: 'var(--faint)' }}>{t.acos == null ? '' : t.acos <= 15 ? 'ótimo' : t.acos <= 30 ? 'ok' : 'alto'}</span>
              </Ring>
            </div>
            <div className="glass" style={{ padding: 16, borderRadius: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', marginBottom: 8 }}>Retorno (ROAS)</div>
              <Ring size={104} val={t.roas == null ? 0 : Math.min(100, t.roas * 10)} cor={roasCor(t.roas)} w={11}>
                <b style={{ fontSize: 20, color: roasCor(t.roas) }}>{t.roas == null ? '—' : `${Number(t.roas).toFixed(1)}x`}</b>
                <span style={{ fontSize: 8, color: 'var(--faint)' }}>{t.roas == null ? '' : t.roas >= 5 ? 'forte' : t.roas >= 3 ? 'ok' : 'baixo'}</span>
              </Ring>
            </div>
            <div className="glass" style={{ padding: 16, borderRadius: 16 }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', marginBottom: 10 }}>Destaques do período</div>
              {melhor ? <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(47,217,141,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Trophy size={15} style={{ color: 'var(--ok)' }} /></div>
                <div style={{ minWidth: 0, flex: 1 }}><div style={{ fontSize: 8, color: 'var(--faint)', textTransform: 'uppercase', fontWeight: 800 }}>Melhor ACOS</div><div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{melhor.nome}</div></div>
                <b className="num" style={{ fontSize: 13, color: 'var(--ok)' }}>{pct1(melhor.acos)}</b>
              </div> : <div className="num" style={{ fontSize: 10, color: 'var(--faint)' }}>sem dados suficientes</div>}
              {pior && pior.id !== melhor?.id && <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,122,122,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><AlertTriangle size={15} style={{ color: 'var(--danger)' }} /></div>
                <div style={{ minWidth: 0, flex: 1 }}><div style={{ fontSize: 8, color: 'var(--faint)', textTransform: 'uppercase', fontWeight: 800 }}>Atenção (ACOS alto)</div><div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pior.nome}</div></div>
                <b className="num" style={{ fontSize: 13, color: 'var(--danger)' }}>{pct1(pior.acos)}</b>
              </div>}
            </div>
          </div>

          {/* distribuição de gasto */}
          {camps.length > 0 && (
            <div className="glass" style={{ padding: 16, borderRadius: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}><BarChart3 size={13} />Onde o investimento está indo</div>
              {camps.slice(0, 6).map((c) => (
                <div key={c.id} className="row" style={{ display: 'flex', alignItems: 'center', marginBottom: 7 }}>
                  <span style={{ width: 150, fontSize: 10.5, color: 'var(--dim)', flex: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nome}</span>
                  <div style={{ flex: 1, height: 17, borderRadius: 7, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(5, (c.cost || 0) / maxCost * 100)}%`, height: '100%', borderRadius: 7, background: `linear-gradient(90deg, ${acosCor(c.acos)}66, ${acosCor(c.acos)})`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6, fontSize: 9, fontWeight: 800, color: '#0d0d0d' }}>{brl(c.cost)}</div>
                  </div>
                  <span className="num" style={{ width: 62, textAlign: 'right', fontSize: 9.5, color: acosCor(c.acos) }}>ACOS {pct1(c.acos)}</span>
                </div>
              ))}
            </div>
          )}

          {/* tabela de campanhas */}
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0 10px' }}><Megaphone size={13} />Campanhas</div>
          {camps.length === 0 ? (
            <div className="glass" style={{ padding: 26, textAlign: 'center', borderRadius: 16 }}><Megaphone size={24} style={{ color: 'var(--faint)', margin: '0 auto 8px' }} /><div style={{ fontSize: 12, color: 'var(--dim)' }}>Nenhuma campanha de Product Ads no período. Crie uma no painel do Mercado Ads.</div></div>
          ) : camps.map((c) => {
            const busy = editando.has(c.id)
            const exp = aberto === c.id
            return (
              <div key={c.id} className="glass" style={{ borderRadius: 15, marginBottom: 9, borderLeft: `3px solid ${acosCor(c.acos)}`, overflow: 'hidden' }}>
                <div className="row lift" style={{ display: 'flex', alignItems: 'center', padding: '12px 13px', cursor: 'pointer' }} onClick={() => setAberto(exp ? null : c.id)}>
                  <div style={{ minWidth: 0, flex: 1.6 }}>
                    <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <b style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nome}</b>
                      {c.status === 'active' ? <Badge c="var(--ok)" bg="rgba(47,217,141,.14)">ativa</Badge> : <Badge c="var(--warn)" bg="rgba(224,162,60,.14)">pausada</Badge>}
                      {c.strategy && <Badge c="#cfaef5" bg="rgba(160,107,232,.14)">{c.strategy}</Badge>}
                    </div>
                    <div className="num" style={{ fontSize: 9, color: 'var(--faint)', marginTop: 3 }}>{c.budget != null ? `budget ${brl(c.budget)}` : 'sem budget'}{c.acos_target != null ? ` · ACOS-alvo ${pct1(c.acos_target)}` : ''}</div>
                  </div>
                  <Metric lbl="Gasto" v={brl(c.cost)} />
                  <Metric lbl="Receita" v={brl(c.gmv)} cor="var(--ok)" />
                  <Metric lbl="ROAS" v={c.roas == null ? '—' : `${Number(c.roas).toFixed(1)}x`} cor={roasCor(c.roas)} />
                  <Metric lbl="ACOS" v={pct1(c.acos)} cor={acosCor(c.acos)} />
                  <Metric lbl="Cliques" v={nfmt(c.clicks)} />
                  <button onClick={(e) => { e.stopPropagation(); alternar(c) }} disabled={busy} title={c.status === 'active' ? 'Pausar' : 'Ativar'} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, padding: '7px 11px', borderRadius: 9, cursor: busy ? 'default' : 'pointer', color: c.status === 'active' ? 'var(--warn)' : 'var(--ok)', border: `1px solid ${c.status === 'active' ? 'rgba(224,162,60,.4)' : 'rgba(47,217,141,.4)'}`, background: c.status === 'active' ? 'rgba(224,162,60,.1)' : 'rgba(47,217,141,.1)', marginLeft: 8, marginRight: 4 }}>{busy ? <Loader2 size={11} className="animate-spin" /> : c.status === 'active' ? <PauseCircle size={11} /> : <PlayCircle size={11} />}{c.status === 'active' ? 'Pausar' : 'Ativar'}</button>
                  <ChevronRight size={16} style={{ color: 'var(--faint)', transform: exp ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
                </div>
                {exp && <CampanhaItens campaignId={c.id} dias={dias} />}
              </div>
            )
          })}
        </>
      )}

      <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--faint)', marginTop: 22, paddingTop: 14, borderTop: '1px solid var(--glass-border)' }}>Mercado Ads · Product Ads do Mercado Livre · métricas reais, sem dados fabricados</div>
    </div>
  )
}

function Metric({ lbl, v, cor = 'var(--text)' }) {
  return <div style={{ textAlign: 'right', flex: 1, minWidth: 60 }}><div style={{ fontSize: 7.5, color: 'var(--faint)', textTransform: 'uppercase', fontWeight: 800 }}>{lbl}</div><b className="num" style={{ fontSize: 12.5, color: cor }}>{v}</b></div>
}

function CampanhaItens({ campaignId, dias }) {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  useEffect(() => { api.mlAdsCampanhaItens(campaignId, dias).then(setDados).catch(() => setDados(null)).finally(() => setCarregando(false)) }, [campaignId, dias])
  const itens = dados?.itens || []
  return (
    <div style={{ borderTop: '1px solid var(--glass-border)', background: 'rgba(0,0,0,.14)', padding: 12 }}>
      <div style={{ fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '.4px', fontWeight: 800, color: 'var(--faint)', marginBottom: 8 }}>Anúncios da campanha</div>
      {carregando ? <Skel h={40} /> : dados?.indisponivel ? <div className="note" style={{ fontSize: 10, color: 'var(--faint)', display: 'flex', gap: 6 }}><Info size={11} style={{ flex: 'none', marginTop: 1 }} />Métricas por anúncio não disponíveis nesta conta/período.</div>
        : itens.length === 0 ? <div className="num" style={{ fontSize: 10, color: 'var(--faint)' }}>Sem anúncios com métricas no período.</div>
          : itens.slice(0, 12).map((it) => (
            <div key={it.item_id} className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, flex: 'none', background: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>{it.imagem ? <img src={it.imagem} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={15} style={{ color: 'var(--faint)' }} />}</div>
              <div style={{ minWidth: 0, flex: 1.4 }}><div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.titulo || it.item_id}</div><div className="num" style={{ fontSize: 8.5, color: 'var(--faint)' }}>{it.item_id}</div></div>
              <Metric lbl="Gasto" v={brl(it.cost)} />
              <Metric lbl="Receita" v={brl(it.gmv)} cor="var(--ok)" />
              <Metric lbl="ACOS" v={pct1(it.acos)} cor={acosCor(it.acos)} />
              <Metric lbl="Cliques" v={nfmt(it.clicks)} />
            </div>
          ))}
    </div>
  )
}
