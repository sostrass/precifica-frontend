import { useState, useEffect, useRef } from 'react'
import {
  Star, RefreshCw, Play, X, Check, AlertTriangle, Sparkles, Info, Loader2,
  MessageSquare, Search, ChevronRight, Bot, Users, TrendingUp, Activity,
  Package, Clock, Send, Pencil, Settings2, ShieldCheck, Image as ImageIcon,
} from 'lucide-react'
import { api } from './api'

/* Central de Reputação · Shopee — Enterprise ULTRA (N1)
   Auto-contido: átomos próprios, dados 100% reais, estados vazios honestos. */

const OK = '#2FD98D', WARN = '#E0A23C', DANGER = '#FF7A7A'
const SHOPEE = '#EE4D2D', PURPLE = '#a06be8', BLUE = '#5B8DEF', GOLD = '#F2C200'

/* ---------- átomos ---------- */
function Badge({ children, c, bg }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px', padding: '3px 8px', borderRadius: 99, color: c, background: bg, whiteSpace: 'nowrap' }}>{children}</span>
}
function Chip({ on, onClick, children, cor }) {
  return <span onClick={onClick} style={{ fontSize: 10.5, fontWeight: 700, padding: '6px 12px', borderRadius: 99, cursor: 'pointer', color: on ? '#fff' : (cor || 'var(--dim)'), background: on ? 'linear-gradient(135deg,var(--accent2),var(--accent))' : 'rgba(255,255,255,.04)', border: `1px solid ${on ? 'transparent' : 'var(--glass-border)'}`, whiteSpace: 'nowrap' }}>{children}</span>
}
function Secao({ icon: Ic, cor, titulo, extra }) {
  return (
    <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 13, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.6px', fontWeight: 800, color: 'var(--faint)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>{Ic && <Ic size={13} style={{ color: cor }} />}{titulo}</span>
      {extra}
    </div>
  )
}
function Empty({ icon: Ic = Info, texto }) {
  return <div style={{ padding: '22px 14px', textAlign: 'center' }}><Ic size={20} style={{ color: 'var(--faint)', marginBottom: 7 }} /><div style={{ fontSize: 10.5, color: 'var(--faint)', maxWidth: 420, margin: '0 auto' }}>{texto}</div></div>
}
function Skel({ h = 40 }) { return <div style={{ height: h, borderRadius: 10, background: 'linear-gradient(90deg,rgba(255,255,255,.04),rgba(255,255,255,.08),rgba(255,255,255,.04))', backgroundSize: '200% 100%', animation: 'skel 1.4s infinite' }} /> }
function MiniStat({ label, value, sub, cor = 'var(--text)' }) {
  return <div className="glass" style={{ padding: '9px 11px', borderRadius: 11 }}><div style={{ fontSize: 7, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '.5px', color: 'var(--faint)' }}>{label}</div><b className="num" style={{ fontSize: 16, color: cor }}>{value}</b>{sub && <div style={{ fontSize: 7.5, color: 'var(--faint)' }}>{sub}</div>}</div>
}
function Estrelas({ n, size = 11 }) {
  return <span className="num" style={{ fontSize: size, letterSpacing: 1 }}>{[1, 2, 3, 4, 5].map((i) => <span key={i} style={{ color: i <= n ? GOLD : 'rgba(255,255,255,.14)' }}>★</span>)}</span>
}
function Toggle({ on, onClick }) {
  return <span onClick={onClick} style={{ width: 32, height: 18, borderRadius: 99, background: on ? `linear-gradient(90deg,${SHOPEE},#c0341c)` : 'rgba(255,255,255,.1)', position: 'relative', flex: 'none', cursor: 'pointer', display: 'inline-block' }}><span style={{ position: 'absolute', top: 2, [on ? 'right' : 'left']: 2, width: 14, height: 14, borderRadius: '50%', background: on ? '#fff' : 'var(--faint)' }} /></span>
}
function tempoRel(ts) {
  if (!ts) return ''
  const s = Math.max(0, (Date.now() - ts) / 1000)
  if (s < 3600) return `há ${Math.max(1, Math.round(s / 60))}m`
  if (s < 86400) return `há ${Math.round(s / 3600)}h`
  return `há ${Math.round(s / 86400)}d`
}

/* ============================================================= */
export default function ShopeeReputacao({ conectado, notify }) {
  const [p, setP] = useState(null)
  const [erro, setErro] = useState(null)
  const [sinc, setSinc] = useState(false)
  const [ativ, setAtiv] = useState(null)
  const [estudio, setEstudio] = useState(false)
  const [cfg, setCfg] = useState(null)
  const [foco, setFoco] = useState(null)          // {nota, busca, ts} — direciona o Inbox
  const [focoComprador, setFocoComprador] = useState(null)  // {usuario, ts} — abre dossiê no Radar
  const inboxRef = useRef(null)
  const radarRef = useRef(null)

  // executa a ação de um insight (cross-módulo de verdade)
  const execInsight = async (ins) => {
    if (ins.acao === 'mandar_boost' && ins.item_id) {
      try { await api.shopeeBoostAdd([{ item_id: ins.item_id, nome: ins.nome }]); notify(`${ins.nome} entrou na fila do Boost.`, 'ok') } catch (e) { notify(e.message, 'danger') }
      return
    }
    if (ins.acao === 'ver_criticas') {
      setFoco({ nota: 'criticas', busca: ins.nome && !String(ins.nome).startsWith('#') ? ins.nome : '', ts: Date.now() })
      if (inboxRef.current) inboxRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    if (ins.acao === 'ver_comprador' && ins.usuario) {
      setFocoComprador({ usuario: ins.usuario, ts: Date.now() })
      if (radarRef.current) radarRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
  }

  const carregar = (forcar = 0) => {
    api.shopeeReputacaoPainel(forcar).then((d) => { setP(d); setCfg(d.config || {}); setErro(null) }).catch((e) => setErro(e.message))
  }
  useEffect(() => { if (conectado) carregar() }, [conectado])
  // atividade do agente (mutirão/log) — polling mais rápido quando rodando
  useEffect(() => {
    if (!conectado) return
    const f = () => api.shopeeReviewAtividade().then(setAtiv).catch(() => {})
    f(); const t = setInterval(f, 6000); return () => clearInterval(t)
  }, [conectado])

  const sincronizar = async () => { setSinc(true); try { await api.shopeeReputacaoPainel(1).then((d) => { setP(d); setCfg(d.config || {}) }); notify('Reputação sincronizada.', 'ok') } catch (e) { notify(e.message, 'danger') } finally { setSinc(false) } }
  const mutirao = async () => { try { await api.shopeeReviewMutirao(false); notify('Mutirão iniciado — o agente vai varrendo a fila.', 'ok') } catch (e) { notify(e.message, 'danger') } }
  const salvarCfg = async (mud) => {
    const novo = { ...cfg, ...mud }
    setCfg(novo)
    try { await api.shopeeReviewConfigSalvar(novo) } catch (e) { notify(e.message, 'danger') }
  }

  if (!conectado) return <div className="glass" style={{ padding: 30 }}><Empty icon={Star} texto="Conecte a loja Shopee para abrir a Central de Reputação." /></div>
  if (erro) return <div className="glass" style={{ padding: 30 }}><Empty icon={AlertTriangle} texto={`Não foi possível carregar a reputação: ${erro}`} /></div>

  const k = p?.kpis || {}
  const modoAuto = (cfg?.modo || 'manual') === 'auto'
  const prog = ativ?.progresso || {}
  const rodando = !!prog.em_andamento

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* ===== COMMAND BAR ===== */}
      <div className="glass" style={{ padding: '15px 18px', border: '1px solid transparent', background: 'linear-gradient(var(--surface),var(--surface)) padding-box,linear-gradient(110deg,rgba(242,194,0,.5),rgba(214,0,127,.35),rgba(160,107,232,.3)) border-box' }}>
        <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap' }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(145deg,#F2C200,#c98f00)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', boxShadow: '0 6px 20px rgba(242,194,0,.35)' }}><Star size={23} color="#fff" fill="#fff" /></div>
          <div>
            <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              <b className="serif" style={{ fontSize: 20 }}>Central de Reputação</b>
              <Badge c="#fff" bg={SHOPEE}>SHOPEE</Badge>
              <Badge c="#e9dbfb" bg="rgba(160,107,232,.2)">COPILOTO IA</Badge>
              <Badge c={GOLD} bg="rgba(242,194,0,.12)">RADAR DE COMPRADORES</Badge>
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--dim)' }}>Avaliações, saúde da conta, copiloto de respostas e perfil real de quem avalia</div>
          </div>
          <div style={{ flex: 1 }} />
          {k.media_geral != null && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 7, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)' }}>Nota ao vivo</div>
              <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}><b className="num serif" style={{ fontSize: 19, color: GOLD }}>{k.media_geral.toFixed(2)}</b><span style={{ color: GOLD, fontSize: 12 }}>★</span></div>
            </div>
          )}
          <div style={{ width: 1, height: 30, background: 'var(--glass-border)' }} />
          <button onClick={sincronizar} disabled={sinc} className="row" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, padding: '8px 13px', borderRadius: 10, cursor: 'pointer', color: 'var(--dim)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>{sinc ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}Sincronizar</button>
          <button onClick={mutirao} disabled={rodando} className="row" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, padding: '8px 14px', borderRadius: 10, cursor: 'pointer', color: '#fff', border: 'none', background: 'linear-gradient(135deg,var(--accent2),var(--accent))', opacity: rodando ? .6 : 1 }}><Play size={13} />{rodando ? 'Mutirão rodando…' : 'Rodar mutirão'}</button>
          <button onClick={() => setEstudio(true)} className="row" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, padding: '8px 13px', borderRadius: 10, cursor: 'pointer', color: '#e9dbfb', background: 'rgba(160,107,232,.15)', border: '1px solid rgba(160,107,232,.4)' }}><Settings2 size={13} />Estúdio da IA</button>
          <span className="row" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: modoAuto ? OK : 'var(--faint)' }}>{modoAuto ? 'AGENTE LIGADO' : 'AGENTE EM MANUAL'}</span>
            <Toggle on={modoAuto} onClick={() => salvarCfg({ modo: modoAuto ? 'manual' : 'auto' })} />
          </span>
        </div>
        {p && (
          <div className="row" style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 9.5, color: 'var(--faint)', flexWrap: 'wrap' }}>
            <span>modo: <b style={{ color: PURPLE }}>{modoAuto ? `automático ${(cfg?.auto_estrelas || []).join('–')}★` : 'manual (você aprova tudo)'}</b></span>
            <span>tom: <b style={{ color: 'var(--text)' }}>{cfg?.tom || 'caloroso'}</b></span>
            <span>fila do copiloto: <b className="num" style={{ color: k.sem_resposta ? WARN : OK }}>{k.sem_resposta ?? '—'}</b></span>
            <span>críticas aguardando você: <b className="num" style={{ color: k.criticas_abertas ? DANGER : OK }}>{k.criticas_abertas ?? '—'}</b></span>
            <span>avaliações analisadas: <b className="num" style={{ color: 'var(--text)' }}>{p.coletadas}</b></span>
            <span>regra: <b style={{ color: WARN }}>1–3★ sempre passam pela sua aprovação</b></span>
          </div>
        )}
      </div>

      {/* ===== INSIGHTS ACIONÁVEIS ===== */}
      {p && (p.insights || []).length > 0 && <Insights insights={p.insights} onAcao={execInsight} />}

      {/* ===== HERO: META + SAÚDE ===== */}
      {!p ? <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 14 }}><Skel h={190} /><Skel h={190} /></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 14 }}>
          <HeroMeta k={k} meta={p.meta} />
          <SaudeConta saude={p.saude} />
        </div>
      )}

      {/* ===== KPI STRIP ===== */}
      {!p ? <Skel h={70} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10,1fr)', gap: 9 }}>
          <Kpi label="Nota da loja" value={k.media_geral != null ? k.media_geral.toFixed(2) : '—'} sub="das analisadas" cor={GOLD} borda="rgba(242,194,0,.35)" />
          <Kpi label="Avaliações" value={k.total ?? '—'} sub="analisadas" />
          <Kpi label="Sem resposta" value={k.sem_resposta ?? '—'} sub="na fila" cor={k.sem_resposta ? WARN : OK} borda={k.sem_resposta ? 'rgba(224,162,60,.4)' : undefined} />
          <Kpi label="IA hoje" value={k.ia_hoje ?? 0} sub="respostas do agente" cor={OK} />
          <Kpi label="Taxa resposta" value={k.taxa_resposta != null ? `${k.taxa_resposta}%` : '—'} sub="das analisadas" cor={k.taxa_resposta >= 90 ? OK : WARN} />
          <Kpi label="Novas 30d" value={k.novas_30d ?? '—'} sub={k.por_dia ? `~${k.por_dia}/dia` : ''} cor={BLUE} />
          <Kpi label="5★ · 30d" value={k.pct5_30 != null ? `${k.pct5_30}%` : '—'} sub="das novas" />
          <Kpi label="Com mídia" value={k.pct_midia_30 != null ? `${k.pct_midia_30}%` : '—'} sub="foto ou vídeo" cor={PURPLE} />
          <Kpi label="Respondidas" value={k.respondidas ?? '—'} sub="acumulado" />
          <Kpi label="Críticas" value={k.criticas_abertas ?? '—'} sub="1–2★ abertas" cor={k.criticas_abertas ? DANGER : OK} borda={k.criticas_abertas ? 'rgba(255,122,122,.4)' : undefined} />
        </div>
      )}

      {/* ===== RAIO-X: DISTRIBUIÇÃO + TENDÊNCIA ===== */}
      {!p ? <Skel h={200} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Distribuicao dist={p.distribuicao} k={k} />
          <Tendencia tendencia={p.tendencia} />
        </div>
      )}

      {/* ===== TEMAS POR IA ===== */}
      <Temas notify={notify} />

      {/* ===== INBOX + COPILOTO ===== */}
      <div ref={inboxRef} style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 14, alignItems: 'start' }}>
        <Inbox notify={notify} cfg={cfg} foco={foco} onRespondida={() => carregar()} />
        <Copiloto cfg={cfg} salvarCfg={salvarCfg} ativ={ativ} onMutirao={mutirao} onParar={async () => { try { await api.shopeeReviewParar(); notify('Agente pausado.', 'ok') } catch (e) { notify(e.message, 'danger') } }} onEstudio={() => setEstudio(true)} />
      </div>

      {/* ===== RADAR DE COMPRADORES ===== */}
      <div ref={radarRef}>
        {!p ? <Skel h={180} /> : <RadarCompradores dados={p.compradores} notify={notify} focoComprador={focoComprador} />}
      </div>

      {/* ===== REPUTAÇÃO POR PRODUTO ===== */}
      {!p ? <Skel h={160} /> : <ReputacaoProdutos produtos={p.produtos} notify={notify} />}

      {/* ===== LINHA DO TEMPO DA REPUTAÇÃO ===== */}
      {!p ? <Skel h={160} /> : <LinhaDoTempo eventos={p.linha_tempo} />}

      {estudio && cfg && <Estudio cfg={cfg} onFechar={() => setEstudio(false)} onSalvar={async (novo) => { setCfg(novo); try { await api.shopeeReviewConfigSalvar(novo); notify('Configuração do copiloto salva.', 'ok'); setEstudio(false) } catch (e) { notify(e.message, 'danger') } }} notify={notify} />}
    </div>
  )
}

function Kpi({ label, value, sub, cor = 'var(--text)', borda }) {
  return (
    <div className="glass lift" style={{ padding: '11px 12px', borderColor: borda }}>
      <div style={{ fontSize: 7, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '.5px', color: borda ? cor : 'var(--faint)' }}>{label}</div>
      <b className="num" style={{ fontSize: 17, color: cor }}>{value}</b>
      {sub ? <div style={{ fontSize: 7.5, color: 'var(--faint)' }}>{sub}</div> : null}
    </div>
  )
}

/* ---------- HERO: meta da nota ---------- */
function HeroMeta({ k, meta }) {
  const nota = k.media_geral
  const frac = nota != null ? Math.max(0, Math.min(1, (nota - 4.5) / 0.5)) : 0
  const C = 2 * Math.PI * 62
  return (
    <div className="glass" style={{ padding: 18, borderColor: 'rgba(242,194,0,.3)', background: 'linear-gradient(150deg,rgba(242,194,0,.06),var(--glass-bg))' }}>
      <div className="row" style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 146, height: 146, flex: 'none' }}>
          <svg width="146" height="146" viewBox="0 0 146 146">
            <circle cx="73" cy="73" r="62" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="11" />
            <circle cx="73" cy="73" r="62" fill="none" stroke={GOLD} strokeWidth="11" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - (nota != null ? nota / 5 : 0))} transform="rotate(-90 73 73)" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <b className="num serif" style={{ fontSize: 33, color: GOLD, lineHeight: 1 }}>{nota != null ? nota.toFixed(2) : '—'}</b>
            {nota != null && <Estrelas n={Math.round(nota)} size={10} />}
            <span className="num" style={{ fontSize: 7.5, color: 'var(--faint)', marginTop: 2 }}>{k.total || 0} avaliações</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 9, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)' }}>Missão da loja</span>
            <Badge c={GOLD} bg="rgba(242,194,0,.12)">RUMO ÀS 4.90★</Badge>
          </div>
          {nota == null ? (
            <div style={{ fontSize: 11, color: 'var(--faint)' }}>Assim que as avaliações sincronizarem, a missão aparece aqui com a projeção real do quanto falta para as 4.90★.</div>
          ) : nota >= 4.9 ? (
            <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 10 }}>A loja já opera <b style={{ color: GOLD }}>acima de 4.90★</b> — agora a missão é blindar: cada crítica respondida rápido protege a posição.</div>
          ) : meta ? (
            <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 10 }}>No ritmo atual de <b style={{ color: 'var(--text)' }}>~{k.por_dia}/dia</b>, cruzar <b style={{ color: GOLD }}>4.90★</b> pede <b className="num" style={{ color: GOLD }}>~{meta.faltam_5estrelas}</b> avaliações 5★ — estimativa de <b style={{ color: 'var(--text)' }}>≈ {meta.dias_estimados} dias</b>.</div>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--faint)', marginBottom: 10 }}>Sem novas avaliações nos últimos 30 dias para estimar a projeção — o mutirão e as respostas ajudam a girar essa roda.</div>
          )}
          {nota != null && nota < 4.9 && (
            <>
              <div style={{ height: 11, borderRadius: 6, background: 'rgba(255,255,255,.06)', overflow: 'hidden', marginBottom: 4 }}><div style={{ width: `${Math.round(frac * 100)}%`, height: '100%', borderRadius: 6, background: `linear-gradient(90deg,rgba(242,194,0,.5),${GOLD})` }} /></div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'var(--faint)', marginBottom: 12 }}><span>4.50</span><span>progresso da média</span><span>4.90</span></div>
            </>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9 }}>
            <MiniStat label="Impacto de 1 crítica" value={k.total ? `-${(4 / Math.max(k.total, 1)).toFixed(4)}` : '—'} sub="na média da loja" cor={DANGER} />
            <MiniStat label="Novas · 30d" value={k.novas_30d ?? '—'} sub={k.por_dia ? `~${k.por_dia}/dia` : ''} cor={BLUE} />
            <MiniStat label="5★ nas novas" value={k.pct5_30 != null ? `${k.pct5_30}%` : '—'} sub="últimos 30 dias" cor={OK} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Saúde da conta ---------- */
function SaudeConta({ saude }) {
  const NIVEIS = { 1: ['CRÍTICO', DANGER], 2: ['PRECISA MELHORAR', WARN], 3: ['BOM', OK], 4: ['EXCELENTE', OK] }
  const nv = saude?.nivel != null ? (NIVEIS[saude.nivel] || ['—', 'var(--faint)']) : null
  return (
    <div className="glass" style={{ padding: 16 }}>
      <Secao icon={Activity} cor={OK} titulo="Saúde da conta · Shopee" extra={<><div style={{ flex: 1 }} />{nv ? <Badge c={nv[1]} bg="rgba(255,255,255,.05)"><span style={{ width: 6, height: 6, borderRadius: '50%', background: nv[1] }} />{nv[0]}</Badge> : null}</>} />
      {!saude?.disponivel ? (
        <Empty icon={ShieldCheck} texto="A Shopee ainda não devolveu os indicadores de saúde da conta para esta loja — assim que o account_health responder, penalidades e prazos aparecem aqui." />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 11 }}>
            {(saude.metricas || []).slice(0, 6).map((m, i) => {
              const falha = typeof m.valor === 'number' && m.valor > 0
              return (
                <div key={i} className="glass row" style={{ display: 'flex', alignItems: 'center', padding: '9px 12px', borderRadius: 11, gap: 9 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: falha ? WARN : OK, flex: 'none' }} />
                  <div style={{ minWidth: 0 }}><div style={{ fontSize: 7, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.rotulo}</div><b className="num" style={{ fontSize: 14, color: falha ? WARN : OK }}>{m.valor ?? '—'}{m.meta != null ? <span style={{ fontSize: 8, color: 'var(--faint)' }}> / meta {m.meta}</span> : null}</b></div>
                </div>
              )
            })}
            {(saude.metricas || []).length === 0 && <div style={{ gridColumn: '1/-1', fontSize: 10, color: 'var(--faint)', textAlign: 'center', padding: 10 }}>Nível geral disponível — indicadores detalhados ainda não expostos pela Shopee para esta conta.</div>}
          </div>
          <div style={{ fontSize: 9, color: 'var(--faint)', display: 'flex', gap: 6 }}>
            <Info size={11} style={{ color: PURPLE, flex: 'none', marginTop: 1 }} />Reputação e penalidade andam juntas: uma crítica de "não recebi" também vira indicador de envio. Fonte: account_health/get_shop_performance.
          </div>
        </>
      )}
    </div>
  )
}

/* ---------- Distribuição ---------- */
function Distribuicao({ dist, k }) {
  const total = (dist || []).reduce((a, d) => a + d.qtd, 0)
  const max = Math.max(...(dist || []).map((d) => d.qtd), 1)
  const saudavel = total > 0 && ((dist.find((d) => d.estrelas === 5)?.qtd || 0) / total) >= 0.8
  return (
    <div className="glass" style={{ padding: 16 }}>
      <Secao icon={TrendingUp} cor={GOLD} titulo="Distribuição de notas · 30 dias" extra={<><div style={{ flex: 1 }} />{total > 0 && <Badge c={saudavel ? OK : WARN} bg={saudavel ? 'rgba(47,217,141,.12)' : 'rgba(224,162,60,.12)'}>{saudavel ? 'SAUDÁVEL' : 'ATENÇÃO'}</Badge>}</>} />
      {total === 0 ? <Empty icon={Star} texto="Sem avaliações novas nos últimos 30 dias — a distribuição aparece conforme as avaliações chegam." />
        : (
          <>
            {dist.map((d) => {
              const cor = d.estrelas >= 4 ? OK : d.estrelas === 3 ? WARN : DANGER
              return (
                <div key={d.estrelas} className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <span className="num" style={{ width: 24, fontSize: 11, color: GOLD }}>{d.estrelas}★</span>
                  <div style={{ flex: 1, height: 15, borderRadius: 8, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}><div style={{ width: `${d.qtd / max * 100}%`, height: '100%', borderRadius: 8, background: d.estrelas >= 4 ? `linear-gradient(90deg,rgba(47,217,141,.5),${OK})` : cor }} /></div>
                  <b className="num" style={{ width: 40, textAlign: 'right', fontSize: 11 }}>{d.qtd}</b>
                </div>
              )
            })}
            <div style={{ fontSize: 9.5, color: 'var(--faint)', display: 'flex', gap: 6, marginTop: 11, paddingTop: 11, borderTop: '1px solid var(--glass-border)' }}>
              <Info size={11} style={{ color: PURPLE, flex: 'none', marginTop: 1 }} />A cada crítica (1–3★), o copiloto prepara um rascunho empático — o envio é sempre seu.
            </div>
          </>
        )}
    </div>
  )
}

/* ---------- Tendência ---------- */
function Tendencia({ tendencia }) {
  const pts = (tendencia || []).filter((t) => t.media != null)
  const subindo = pts.length >= 2 && pts[pts.length - 1].media >= pts[0].media
  return (
    <div className="glass" style={{ padding: 16 }}>
      <Secao icon={TrendingUp} cor={OK} titulo="Tendência da nota · 14 dias" extra={<><div style={{ flex: 1 }} />{pts.length >= 2 && <Badge c={subindo ? OK : DANGER} bg={subindo ? 'rgba(47,217,141,.12)' : 'rgba(255,122,122,.12)'}>{subindo ? 'SUBINDO' : 'CAINDO'}</Badge>}</>} />
      {pts.length < 2 ? <Empty icon={TrendingUp} texto="Ainda não há avaliações suficientes nos últimos 14 dias para desenhar a tendência — ela aparece conforme as novas chegam." />
        : <TendenciaChart tendencia={tendencia} />}
    </div>
  )
}
function TendenciaChart({ tendencia }) {
  const W = 320, H = 100, pad = 8
  const dados = tendencia.map((t) => ({ ...t }))
  // preenche buracos com o último valor conhecido p/ linha contínua
  let ult = null
  dados.forEach((d) => { if (d.media != null) ult = d.media; else d.media = ult })
  const validos = dados.filter((d) => d.media != null)
  const min = Math.min(...validos.map((d) => d.media)), max = Math.max(...validos.map((d) => d.media))
  const lo = Math.max(1, min - 0.1), hi = Math.min(5, max + 0.1)
  const x = (i) => pad + i / (dados.length - 1) * (W - 2 * pad)
  const y = (v) => H - pad - ((v - lo) / Math.max(hi - lo, 0.01)) * (H - 2 * pad)
  const primeiroIdx = dados.findIndex((d) => d.media != null)
  const linha = dados.map((d, i) => d.media == null ? '' : `${i === primeiroIdx ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.media).toFixed(1)}`).join(' ')
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs><linearGradient id="gRep" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(242,194,0,.35)" /><stop offset="100%" stopColor="rgba(242,194,0,0)" /></linearGradient></defs>
        <path d={`${linha} L${x(dados.length - 1).toFixed(1)},${H - pad} L${x(primeiroIdx).toFixed(1)},${H - pad} Z`} fill="url(#gRep)" />
        <path d={linha} fill="none" stroke={GOLD} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'var(--faint)', marginTop: 4 }}>
        <span className="num">{lo.toFixed(2)}</span><span>média diária das novas avaliações · dias sem avaliação seguem a última média</span><span className="num">{hi.toFixed(2)}</span>
      </div>
    </>
  )
}

/* ---------- INBOX DE RESPOSTAS ---------- */
function Inbox({ notify, cfg, foco, onRespondida }) {
  const [status, setStatus] = useState('UNANSWERED')
  const [itens, setItens] = useState(null)
  const [cursor, setCursor] = useState('')
  const [temMais, setTemMais] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [nota, setNota] = useState('todas')
  const [busca, setBusca] = useState('')
  const [pag, setPag] = useState(0)
  const [modoSel, setModoSel] = useState(false)
  const [sel, setSel] = useState(() => new Set())
  const [lote, setLote] = useState(null)  // {feitas, total} durante o processamento
  const PP = 6
  const toggleSel = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const carregar = (st = status, cur = '', append = false) => {
    setCarregando(true)
    api.shopeeAvaliacoesPag(st, cur).then((r) => {
      const resp = (r && r.response) || {}
      const lote = resp.item_comment_list || []
      setItens((old) => (append && old ? [...old, ...lote] : lote))
      setTemMais(!!resp.more && !!resp.next_cursor)
      setCursor(resp.next_cursor || '')
      setPag(0)
    }).catch((e) => { notify(e.message, 'danger'); if (!append) setItens([]) }).finally(() => setCarregando(false))
  }
  useEffect(() => { setItens(null); carregar(status, '') }, [status])
  // foco vindo de um insight: pula pra fila sem resposta, filtro de críticas e busca do produto
  useEffect(() => {
    if (!foco || !foco.ts) return
    setNota(foco.nota || 'criticas'); setBusca(foco.busca || ''); setPag(0)
    setStatus('UNANSWERED')
  }, [foco?.ts])

  const filtrados = (itens || []).filter((c) => {
    const s = c.rating_star || 0
    if (nota === 'criticas' && s > 2) return false
    if (nota === '3' && s !== 3) return false
    if (nota === 'altas' && s < 4) return false
    if (nota === 'midia' && !(((c.media || {}).image_url_list || []).length || ((c.media || {}).video_url_list || []).length)) return false
    const q = busca.trim().toLowerCase()
    if (q && !((c.produto_nome || '').toLowerCase().includes(q) || (c.buyer_username || '').toLowerCase().includes(q) || (c.order_sn || '').toLowerCase().includes(q))) return false
    return true
  })
  const paginas = Math.max(1, Math.ceil(filtrados.length / PP))
  const pagAtual = Math.min(pag, paginas - 1)
  const visiveis = filtrados.slice(pagAtual * PP, pagAtual * PP + PP)
  const nCriticas = (itens || []).filter((c) => (c.rating_star || 0) <= 2).length

  // seleciona todas as 4-5★ visíveis (sem resposta) — atalho do modo massa
  const selecionarAltas = () => {
    const alvo = visiveis.filter((c) => (c.rating_star || 0) >= 4 && !(((c.comment_reply || {}).reply || '').trim()))
    setSel(new Set(alvo.map((c) => c.comment_id)))
  }
  // aprova em lote: gera + envia cada selecionada, em sequência (anti-flood)
  const aprovarLote = async () => {
    const ids = [...sel]
    const alvos = (itens || []).filter((c) => ids.includes(c.comment_id))
    if (!alvos.length) { notify('Selecione ao menos uma avaliação.', 'warn'); return }
    setLote({ feitas: 0, total: alvos.length }); let ok = 0
    for (let i = 0; i < alvos.length; i++) {
      const c = alvos[i]
      try {
        const r = await api.shopeeReviewSugerir({ nota: c.rating_star || 5, comentario: c.comment || '', produto: c.produto_nome || '', nome: c.buyer_username || '' })
        const txt = typeof r === 'string' ? r : (r.texto || r.sugestao || '')
        if (txt && txt.trim()) { await api.shopeeResponder({ comment_id: c.comment_id, texto: txt.trim() }); ok++ }
      } catch (e) { /* segue o lote; erros não travam */ }
      setLote({ feitas: i + 1, total: alvos.length })
    }
    setLote(null); setSel(new Set()); setModoSel(false)
    notify(`Lote concluído: ${ok} de ${alvos.length} respondidas.`, ok ? 'ok' : 'warn')
    if (onRespondida) onRespondida(); carregar(status, '')
  }

  const selVisiveis = visiveis.filter((c) => sel.has(c.comment_id)).length

  return (
    <div className="glass" style={{ padding: 16 }}>
      <Secao icon={MessageSquare} cor={SHOPEE} titulo={<>Inbox de respostas {itens && <span className="num" style={{ color: 'var(--faint)' }}>{filtrados.length} nesta lista</span>}</>} extra={<>
        <Badge c="#cfaef5" bg="rgba(160,107,232,.15)">RASCUNHO IA EM CADA CARD</Badge>
        <div style={{ flex: 1 }} />
        <button onClick={() => { setModoSel((v) => !v); setSel(new Set()) }} className="row" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9.5, fontWeight: 700, padding: '5px 11px', borderRadius: 8, cursor: 'pointer', color: modoSel ? '#0d0d0d' : 'var(--dim)', background: modoSel ? OK : 'var(--glass-bg)', border: `1px solid ${modoSel ? 'transparent' : 'var(--glass-border)'}` }}><Check size={11} />{modoSel ? 'Sair da seleção' : 'Selecionar em massa'}</button>
      </>} />
      {modoSel && (
        <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'rgba(47,217,141,.06)', border: '1px solid rgba(47,217,141,.28)', borderRadius: 11, padding: '9px 12px', marginBottom: 11, flexWrap: 'wrap' }}>
          {lote ? (
            <>
              <Loader2 size={14} className="animate-spin" style={{ color: OK }} />
              <span style={{ fontSize: 10.5, color: 'var(--dim)', flex: 1 }}>Respondendo em lote com IA, com pausa entre cada…</span>
              <b className="num" style={{ fontSize: 11, color: OK }}>{lote.feitas} / {lote.total}</b>
            </>
          ) : (
            <>
              <span style={{ fontSize: 10.5, color: 'var(--dim)' }}><b className="num" style={{ color: OK }}>{sel.size}</b> selecionada{sel.size === 1 ? '' : 's'}{selVisiveis !== sel.size ? ` (${selVisiveis} nesta página)` : ''}</span>
              <button onClick={selecionarAltas} style={{ fontSize: 9.5, fontWeight: 700, padding: '5px 10px', borderRadius: 7, cursor: 'pointer', color: 'var(--dim)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>Marcar 4–5★ da página</button>
              {sel.size > 0 && <button onClick={() => setSel(new Set())} style={{ fontSize: 9.5, fontWeight: 700, padding: '5px 10px', borderRadius: 7, cursor: 'pointer', color: 'var(--faint)', background: 'transparent', border: '1px solid var(--glass-border)' }}>Limpar</button>}
              <div style={{ flex: 1 }} />
              <button onClick={aprovarLote} disabled={!sel.size} className="row" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 800, padding: '6px 13px', borderRadius: 8, cursor: sel.size ? 'pointer' : 'default', color: '#0d0d0d', border: 'none', background: OK, opacity: sel.size ? 1 : .4 }}><Sparkles size={11} />Aprovar {sel.size || ''} com IA</button>
            </>
          )}
        </div>
      )}
      {modoSel && <div style={{ fontSize: 8.5, color: 'var(--faint)', marginBottom: 10, marginTop: -4 }}>Recomendado para 4–5★: a IA gera e publica cada resposta em sequência. Críticas ficam de fora do lote — elas merecem um olhar seu.</div>}
      <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 11, flexWrap: 'wrap' }}>
        <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 11px', borderRadius: 9, background: 'rgba(0,0,0,.2)', border: '1px solid var(--glass-border)', width: 210 }}>
          <Search size={12} style={{ color: 'var(--faint)' }} />
          <input value={busca} onChange={(e) => { setBusca(e.target.value); setPag(0) }} placeholder="Produto, comprador, pedido…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 11 }} />
          {busca && <X size={12} style={{ color: 'var(--faint)', cursor: 'pointer' }} onClick={() => setBusca('')} />}
        </div>
        <div style={{ flex: 1 }} />
        <Chip on={status === 'UNANSWERED'} onClick={() => setStatus('UNANSWERED')}>Sem resposta</Chip>
        <Chip on={status === 'ANSWERED'} onClick={() => setStatus('ANSWERED')}>Respondidas</Chip>
        <Chip on={status === 'ALL'} onClick={() => setStatus('ALL')}>Todas</Chip>
      </div>
      <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12, flexWrap: 'wrap' }}>
        <Chip on={nota === 'todas'} onClick={() => { setNota('todas'); setPag(0) }}>Todas as notas</Chip>
        <Chip on={nota === 'criticas'} onClick={() => { setNota('criticas'); setPag(0) }} cor={DANGER}>1–2★{nCriticas ? ` (${nCriticas})` : ''}</Chip>
        <Chip on={nota === '3'} onClick={() => { setNota('3'); setPag(0) }}>3★</Chip>
        <Chip on={nota === 'altas'} onClick={() => { setNota('altas'); setPag(0) }}>4–5★</Chip>
        <Chip on={nota === 'midia'} onClick={() => { setNota('midia'); setPag(0) }}>Com mídia</Chip>
      </div>

      {itens === null || (carregando && !itens.length) ? <div style={{ display: 'grid', gap: 9 }}>{[0, 1, 2].map((i) => <Skel key={i} h={110} />)}</div>
        : filtrados.length === 0 ? <Empty icon={MessageSquare} texto={busca || nota !== 'todas' ? 'Nenhuma avaliação com esse filtro.' : status === 'UNANSWERED' ? 'Fila zerada — nenhuma avaliação aguardando resposta. O copiloto agradece.' : 'Nenhuma avaliação nesta lista ainda.'} />
          : visiveis.map((c) => <CardAvaliacao key={c.comment_id} c={c} cfg={cfg} notify={notify} onRespondida={onRespondida} selecionavel={modoSel} selecionado={sel.has(c.comment_id)} onToggleSel={toggleSel} />)}

      {(filtrados.length > 0 || temMais) && (
        <div className="row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 11, flexWrap: 'wrap' }}>
          <button onClick={() => setPag((x) => Math.max(0, x - 1))} disabled={pagAtual === 0} style={{ fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 8, cursor: pagAtual === 0 ? 'default' : 'pointer', color: 'var(--dim)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', opacity: pagAtual === 0 ? .4 : 1 }}>← Anterior</button>
          <span className="num" style={{ fontSize: 10, color: 'var(--faint)' }}>{filtrados.length ? `${pagAtual * PP + 1}–${Math.min((pagAtual + 1) * PP, filtrados.length)} de ${filtrados.length}` : '0'}{paginas > 1 ? ` · pág. ${pagAtual + 1}/${paginas}` : ''}</span>
          <button onClick={() => setPag((x) => Math.min(paginas - 1, x + 1))} disabled={pagAtual >= paginas - 1} style={{ fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 8, cursor: pagAtual >= paginas - 1 ? 'default' : 'pointer', color: 'var(--dim)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', opacity: pagAtual >= paginas - 1 ? .4 : 1 }}>Próximo →</button>
          {temMais && <button onClick={() => carregar(status, cursor, true)} disabled={carregando} style={{ fontSize: 10.5, fontWeight: 700, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', color: '#cfaef5', background: 'rgba(160,107,232,.12)', border: '1px solid rgba(160,107,232,.3)' }}>{carregando ? <Loader2 size={11} className="animate-spin" /> : 'Buscar mais na Shopee'}</button>}
        </div>
      )}
    </div>
  )
}

/* ---------- Card de avaliação com rascunho IA ---------- */
function CardAvaliacao({ c, cfg, notify, onRespondida, selecionavel, selecionado, onToggleSel }) {
  const s = c.rating_star || 0
  const critica = s <= 2
  const morna = s === 3
  const respondida = !!(((c.comment_reply || {}).reply || '').trim())
  const imgs = ((c.media || {}).image_url_list || [])
  const vids = ((c.media || {}).video_url_list || [])
  const [rascunho, setRascunho] = useState('')
  const [gerando, setGerando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [enviada, setEnviada] = useState(false)
  const borda = critica ? DANGER : morna ? WARN : OK
  const podeSelecionar = selecionavel && !respondida && !enviada

  const gerar = async () => {
    setGerando(true)
    try {
      const r = await api.shopeeReviewSugerir({ nota: s, comentario: c.comment || '', produto: c.produto_nome || '', nome: c.buyer_username || '' })
      setRascunho(typeof r === 'string' ? r : (r.texto || r.sugestao || ''))
    } catch (e) { notify(e.message, 'danger') } finally { setGerando(false) }
  }
  const enviar = async () => {
    if (!rascunho.trim()) { notify('Escreva ou gere a resposta antes de enviar.', 'warn'); return }
    setEnviando(true)
    try {
      await api.shopeeResponder({ comment_id: c.comment_id, texto: rascunho.trim() })
      setEnviada(true); notify('Resposta publicada na Shopee.', 'ok'); if (onRespondida) onRespondida()
    } catch (e) { notify(e.message, 'danger') } finally { setEnviando(false) }
  }

  return (
    <div className="glass" style={{ padding: 13, borderRadius: 14, marginBottom: 9, borderLeft: `3px solid ${borda}` }}>
      <div className="row" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {podeSelecionar && (
          <div onClick={() => onToggleSel(c.comment_id)} style={{ width: 18, height: 18, borderRadius: 5, flex: 'none', marginTop: 12, cursor: 'pointer', border: `2px solid ${selecionado ? OK : 'var(--faint)'}`, background: selecionado ? OK : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{selecionado && <Check size={12} color="#0d0d0d" strokeWidth={3} />}</div>
        )}
        <div style={{ width: 42, height: 42, borderRadius: 10, overflow: 'hidden', flex: 'none', background: 'linear-gradient(135deg,rgba(238,77,45,.3),rgba(160,107,232,.22))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.produto_imagem ? <img src={c.produto_imagem} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={16} style={{ color: 'rgba(255,255,255,.8)' }} />}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>{c.produto_nome || `Anúncio #${c.item_id}`}</span>
            <Estrelas n={s} size={10.5} />
            {critica && <Badge c={DANGER} bg="rgba(255,122,122,.14)">CRÍTICA · SUA APROVAÇÃO</Badge>}
            {(imgs.length + vids.length) > 0 && <Badge c={PURPLE} bg="rgba(160,107,232,.14)"><ImageIcon size={8} />{imgs.length + vids.length} MÍDIA{imgs.length + vids.length > 1 ? 'S' : ''}</Badge>}
            {respondida || enviada ? <Badge c={OK} bg="rgba(47,217,141,.13)">RESPONDIDA</Badge> : null}
          </div>
          <div className="num" style={{ fontSize: 8.5, color: 'var(--faint)', marginTop: 2 }}>{c.buyer_username || 'comprador'}{c.order_sn ? ` · pedido ${c.order_sn}` : ''}{c.create_time ? ` · ${tempoRel(c.create_time * 1000)}` : ''}</div>
          {(c.comment || '').trim() ? <div style={{ fontSize: 11.5, color: 'var(--dim)', marginTop: 6, background: 'rgba(0,0,0,.18)', borderRadius: 9, padding: '8px 11px' }}>"{c.comment}"</div>
            : <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 6, fontStyle: 'italic' }}>avaliação sem comentário — só a nota</div>}
          {imgs.length > 0 && (
            <div className="row" style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
              {imgs.slice(0, 5).map((u, i) => <img key={i} src={u} alt="" loading="lazy" style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--glass-border)' }} />)}
              {vids.length > 0 && <span className="row" style={{ display: 'inline-flex', alignItems: 'center', fontSize: 8.5, color: 'var(--faint)' }}>+{vids.length} vídeo{vids.length > 1 ? 's' : ''}</span>}
            </div>
          )}
          {respondida && !enviada ? (
            <div style={{ marginTop: 8, background: 'rgba(47,217,141,.06)', border: '1px solid rgba(47,217,141,.25)', borderRadius: 11, padding: '9px 12px' }}>
              <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><Check size={11} style={{ color: OK }} /><b style={{ fontSize: 8.5, textTransform: 'uppercase', color: OK }}>Resposta publicada</b></div>
              <div style={{ fontSize: 11, color: 'var(--dim)' }}>"{(c.comment_reply || {}).reply}"</div>
            </div>
          ) : enviada ? (
            <div style={{ marginTop: 8, background: 'rgba(47,217,141,.06)', border: '1px solid rgba(47,217,141,.25)', borderRadius: 11, padding: '9px 12px' }}>
              <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Check size={11} style={{ color: OK }} /><b style={{ fontSize: 8.5, textTransform: 'uppercase', color: OK }}>Enviada agora</b></div>
            </div>
          ) : (
            <div style={{ marginTop: 8, background: 'rgba(160,107,232,.07)', border: '1px solid rgba(160,107,232,.28)', borderRadius: 11, padding: '9px 12px' }}>
              <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                <Bot size={11} style={{ color: PURPLE }} />
                <b style={{ fontSize: 8.5, textTransform: 'uppercase', color: '#cfaef5' }}>Rascunho do copiloto · tom {cfg?.tom || 'caloroso'}</b>
                <div style={{ flex: 1 }} />
                {rascunho && <span className="num" style={{ fontSize: 8, color: 'var(--faint)' }}>{rascunho.length} / {cfg?.limite_chars || 450}</span>}
              </div>
              {rascunho ? (
                <textarea value={rascunho} onChange={(e) => setRascunho(e.target.value)} rows={3} style={{ width: '100%', fontSize: 11, color: 'var(--text)', background: 'rgba(0,0,0,.22)', border: '1px solid var(--glass-border)', borderRadius: 9, padding: '8px 10px', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
              ) : (
                <div style={{ fontSize: 10, color: 'var(--faint)' }}>Clique em "Gerar rascunho" e o copiloto escreve a resposta no tom da loja — você edita e aprova.</div>
              )}
              <div className="row" style={{ display: 'flex', gap: 7, marginTop: 8, flexWrap: 'wrap' }}>
                <button onClick={gerar} disabled={gerando} className="row" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', color: '#cfaef5', background: 'rgba(160,107,232,.14)', border: '1px solid rgba(160,107,232,.35)' }}>{gerando ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}{rascunho ? 'Gerar outra' : 'Gerar rascunho'}</button>
                <div style={{ flex: 1 }} />
                <button onClick={enviar} disabled={enviando || !rascunho.trim()} className="row" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 800, padding: '6px 13px', borderRadius: 8, cursor: 'pointer', color: '#0d0d0d', border: 'none', background: OK, opacity: rascunho.trim() ? 1 : .5 }}>{enviando ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}Aprovar &amp; enviar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- Copiloto (lateral) ---------- */
function Copiloto({ cfg, salvarCfg, ativ, onMutirao, onParar, onEstudio }) {
  const prog = ativ?.progresso || {}
  const rodando = !!prog.em_andamento
  const log = ativ?.log || []
  const estrelas = cfg?.auto_estrelas || [4, 5]
  const toggleEstrela = (s) => {
    const tem = estrelas.includes(s)
    salvarCfg({ auto_estrelas: tem ? estrelas.filter((x) => x !== s) : [...estrelas, s].sort() })
  }
  return (
    <div className="glass" style={{ padding: 16, borderColor: 'rgba(160,107,232,.35)' }}>
      <Secao icon={Bot} cor={PURPLE} titulo="Copiloto de respostas" extra={<><div style={{ flex: 1 }} /><button onClick={onEstudio} className="row" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9.5, fontWeight: 700, padding: '5px 11px', borderRadius: 8, cursor: 'pointer', color: '#e9dbfb', background: 'rgba(160,107,232,.14)', border: '1px solid rgba(160,107,232,.35)' }}><Settings2 size={11} />Abrir Estúdio</button></>} />
      <div style={{ fontSize: 8, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)', marginBottom: 6 }}>Responde sozinho</div>
      <div className="row" style={{ display: 'flex', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
        {[1, 2, 3, 4, 5].map((s) => <Chip key={s} on={estrelas.includes(s)} onClick={() => toggleEstrela(s)}>{s}★</Chip>)}
      </div>
      <div style={{ fontSize: 8.5, color: 'var(--faint)', marginBottom: 12 }}>Recomendado deixar só 4 e 5 — notas baixas pedem um olhar humano.</div>
      <div style={{ fontSize: 8, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)', marginBottom: 6 }}>Tom de voz</div>
      <div className="row" style={{ display: 'flex', gap: 6, marginBottom: 13, flexWrap: 'wrap' }}>
        {[['caloroso', 'Caloroso'], ['profissional', 'Profissional'], ['descontraido', 'Descontraído']].map(([v, l]) => <Chip key={v} on={(cfg?.tom || 'caloroso') === v} onClick={() => salvarCfg({ tom: v })}>{l}</Chip>)}
      </div>
      <div style={{ fontSize: 8, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)', marginBottom: 6 }}>Mutirão · zerar a fila</div>
      <div className="glass" style={{ padding: '10px 13px', borderRadius: 11, marginBottom: 12 }}>
        {rodando ? (
          <>
            <div className="row" style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}><span style={{ fontSize: 10, color: 'var(--dim)' }}>{prog.ultimo ? `Última: ${String(prog.ultimo).slice(0, 34)}…` : 'Varredura em andamento…'}</span><div style={{ flex: 1 }} /><b className="num" style={{ fontSize: 10, color: PURPLE }}>{prog.processados ?? 0}{prog.alvo ? ` / ${prog.alvo}` : ''}</b></div>
            <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}><div style={{ width: prog.alvo ? `${Math.min(100, (prog.processados || 0) / prog.alvo * 100)}%` : '35%', height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,var(--accent2),var(--accent))' }} /></div>
            <div className="row" style={{ display: 'flex', marginTop: 7 }}>
              <span style={{ fontSize: 8.5, color: 'var(--faint)' }}>críticas vão pra sua fila de aprovação</span>
              <div style={{ flex: 1 }} />
              <button onClick={onParar} style={{ fontSize: 9.5, fontWeight: 700, padding: '4px 10px', borderRadius: 7, cursor: 'pointer', color: DANGER, background: 'rgba(255,122,122,.1)', border: '1px solid rgba(255,122,122,.3)' }}>Parar</button>
            </div>
          </>
        ) : (
          <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 10, color: 'var(--dim)', flex: 1 }}>Varre as pendentes antigas respondendo no tom da loja, com pausa anti-flood.</span>
            <button onClick={onMutirao} className="row" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 800, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', color: '#fff', border: 'none', background: 'linear-gradient(135deg,var(--accent2),var(--accent))' }}><Play size={11} />Iniciar</button>
          </div>
        )}
      </div>
      <div style={{ fontSize: 8, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)', marginBottom: 6 }}>Diário do agente</div>
      {log.length === 0 ? <div style={{ fontSize: 9.5, color: 'var(--faint)', padding: '6px 0' }}>Sem respostas do agente ainda — assim que ele responder, cada envio aparece aqui.</div>
        : log.slice(0, 7).map((e, i) => (
          <div key={i} className="row" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: i < Math.min(log.length, 7) - 1 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: (e.nota || 5) <= 2 ? DANGER : (e.nota === 3 ? WARN : OK), flex: 'none', marginTop: 4 }} />
            <span style={{ fontSize: 10, color: 'var(--dim)', flex: 1, lineHeight: 1.45 }}>Respondeu <b style={{ color: 'var(--text)' }}>{e.nota}★</b>{e.buyer ? <> de <b style={{ color: 'var(--text)' }}>{e.buyer}</b></> : null}{e.produto ? ` (${String(e.produto).slice(0, 28)}${String(e.produto).length > 28 ? '…' : ''})` : ''}{e.modo === 'auto' ? ' · automático' : ''}</span>
            <span className="num" style={{ fontSize: 8, color: 'var(--faint)', flex: 'none' }}>{e.quando ? tempoRel(new Date(e.quando).getTime()) : ''}</span>
          </div>
        ))}
    </div>
  )
}

/* ---------- Radar de compradores + dossiê ---------- */
function RadarCompradores({ dados, notify, focoComprador }) {
  const k = dados?.kpis || {}
  const lista = dados?.destaques || []
  const [filtro, setFiltro] = useState('todos')
  const [aberto, setAberto] = useState(null)
  const [dossie, setDossie] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const CLASSE = { promotor: [GOLD, 'PROMOTOR'], neutro: [BLUE, 'NEUTRO'], critico: [DANGER, 'ATENÇÃO'] }
  const visiveis = lista.filter((c) => filtro === 'todos' || c.classe === filtro)
  const abrir = (usuario) => {
    if (aberto === usuario) { setAberto(null); setDossie(null); return }
    setAberto(usuario); setDossie(null); setCarregando(true)
    api.shopeeReputacaoComprador(usuario).then(setDossie).catch((e) => notify(e.message, 'danger')).finally(() => setCarregando(false))
  }
  // abre o dossiê automaticamente quando um insight VIP pede foco neste comprador
  useEffect(() => {
    if (focoComprador && focoComprador.usuario && focoComprador.ts) {
      setFiltro('todos'); setAberto(focoComprador.usuario); setDossie(null); setCarregando(true)
      api.shopeeReputacaoComprador(focoComprador.usuario).then(setDossie).catch(() => {}).finally(() => setCarregando(false))
    }
  }, [focoComprador?.ts])
  return (
    <div className="glass" style={{ padding: 16, borderColor: 'rgba(91,141,239,.3)' }}>
      <Secao icon={Users} cor={BLUE} titulo="Radar de compradores · quem avalia a sua loja" extra={<>
        <Badge c={BLUE} bg="rgba(91,141,239,.14)">SCORE PRÓPRIO · DADOS REAIS</Badge>
        <div style={{ flex: 1 }} />
        <Chip on={filtro === 'todos'} onClick={() => setFiltro('todos')}>Todos ({k.total ?? 0})</Chip>
        <Chip on={filtro === 'promotor'} onClick={() => setFiltro('promotor')}>Promotores ({k.promotores ?? 0})</Chip>
        <Chip on={filtro === 'critico'} onClick={() => setFiltro('critico')} cor={DANGER}>Atenção ({k.criticos ?? 0})</Chip>
      </>} />
      <div style={{ fontSize: 9, color: 'var(--faint)', marginBottom: 11 }}>A Shopee não permite "dar nota" ao comprador — então o agente monta o perfil real: avaliações deixadas, média que dá, mídia enviada e recência. Clique para abrir o dossiê.</div>
      {(k.total ?? 0) === 0 ? <Empty icon={Users} texto="Assim que as avaliações sincronizarem, cada comprador ganha um perfil com score e classificação — promotores, neutros e os que pedem atenção." /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9, marginBottom: 11 }}>
            <MiniStat label="Avaliadores" value={k.total} />
            <MiniStat label="Promotores" value={k.promotores} sub="dão 4.5★+ de média" cor={OK} />
            <MiniStat label="Neutros" value={k.neutros} cor={WARN} />
            <MiniStat label="Críticos" value={k.criticos} sub="média abaixo de 3★" cor={DANGER} />
          </div>
          {aberto && <Dossie usuario={aberto} dossie={dossie} carregando={carregando} onFechar={() => { setAberto(null); setDossie(null) }} />}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {visiveis.slice(0, 8).map((c) => {
              const cl = CLASSE[c.classe] || CLASSE.neutro
              const ini = (c.usuario || '?')[0].toUpperCase()
              const sel = aberto === c.usuario
              return (
                <div key={c.usuario} onClick={() => abrir(c.usuario)} className="lift" style={{ display: 'flex', alignItems: 'center', gap: 10, background: sel ? 'rgba(91,141,239,.1)' : 'rgba(0,0,0,.18)', border: `1px solid ${sel ? 'rgba(91,141,239,.4)' : 'transparent'}`, borderRadius: 11, padding: '9px 12px', cursor: 'pointer' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg,${cl[0]},rgba(0,0,0,.35))`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', fontSize: 12, fontWeight: 800, color: c.classe === 'promotor' ? '#0d0d0d' : '#fff' }}>{ini}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><b style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.usuario}</b><Badge c={cl[0]} bg="rgba(255,255,255,.06)">{cl[1]}</Badge></div>
                    <div className="num" style={{ fontSize: 8, color: 'var(--faint)' }}>{c.avaliacoes} avaliação{c.avaliacoes > 1 ? 'es' : ''} · média que dá: {c.media}★{c.com_midia ? ` · ${c.com_midia} c/ mídia` : ''}{c.ultima_ts ? ` · ${tempoRel(c.ultima_ts)}` : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right', flex: 'none' }}><div style={{ fontSize: 6.5, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)' }}>Score</div><b className="num" style={{ fontSize: 15, color: cl[0] }}>{c.score}</b></div>
                </div>
              )
            })}
          </div>
          {visiveis.length === 0 && <Empty icon={Users} texto="Nenhum comprador nessa classificação por enquanto." />}
        </>
      )}
    </div>
  )
}

function Dossie({ usuario, dossie, carregando, onFechar }) {
  return (
    <div style={{ background: 'rgba(91,141,239,.05)', border: '1px solid rgba(91,141,239,.3)', borderRadius: 13, padding: '13px 15px', marginBottom: 11 }}>
      <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,var(--blue),#3a6fd8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', fontSize: 13, fontWeight: 800, color: '#fff' }}>{(usuario || '?')[0].toUpperCase()}</div>
        <div style={{ flex: 1 }}><b style={{ fontSize: 13 }}>{usuario}</b><div style={{ fontSize: 8.5, color: 'var(--faint)' }}>dossiê do comprador</div></div>
        <X size={15} style={{ color: 'var(--faint)', cursor: 'pointer' }} onClick={onFechar} />
      </div>
      {carregando ? <Skel h={80} /> : !dossie?.encontrado ? <Empty icon={Users} texto="Sem histórico deste comprador na coleta atual." /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10 }}>
            <MiniStat label="Pedidos" value={dossie.pedidos} />
            <MiniStat label="Avaliações" value={dossie.avaliacoes} cor={BLUE} />
            <MiniStat label="Média que dá" value={`${dossie.media}★`} cor={GOLD} />
            <MiniStat label="Com mídia" value={`${dossie.com_midia}/${dossie.avaliacoes}`} cor={PURPLE} />
          </div>
          <div style={{ fontSize: 8, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)', marginBottom: 6 }}>Linha do tempo das avaliações</div>
          {(dossie.linha_do_tempo || []).map((e, i) => (
            <div key={i} className="row" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0', borderBottom: i < dossie.linha_do_tempo.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, overflow: 'hidden', flex: 'none', background: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{e.imagem ? <img src={e.imagem} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={12} style={{ color: 'var(--faint)' }} />}</div>
              <Estrelas n={e.nota} size={9} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 10, color: 'var(--dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.produto}{e.comentario ? ` — "${e.comentario.slice(0, 40)}${e.comentario.length > 40 ? '…' : ''}"` : ''}</span>
              {e.respondida ? <Badge c={OK} bg="rgba(47,217,141,.1)">respondida</Badge> : <Badge c={WARN} bg="rgba(224,162,60,.1)">sem resposta</Badge>}
              <span className="num" style={{ fontSize: 8, color: 'var(--faint)', flex: 'none' }}>{tempoRel(e.quando)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

/* ---------- Temas por IA ---------- */
function Temas({ notify }) {
  const [t, setT] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const carregar = (forcar = 0) => { setCarregando(true); api.shopeeReputacaoTemas(forcar).then(setT).catch((e) => { notify(e.message, 'danger'); setT({ disponivel: false }) }).finally(() => setCarregando(false)) }
  useEffect(() => { carregar() }, [])
  return (
    <div className="glass" style={{ padding: 16, borderColor: 'rgba(160,107,232,.35)' }}>
      <Secao icon={Sparkles} cor={PURPLE} titulo="Temas dos comentários · lidos por IA" extra={<>
        {t?.disponivel && <Badge c="#cfaef5" bg="rgba(160,107,232,.15)">{t.analisados} COMENTÁRIOS ANALISADOS</Badge>}
        <div style={{ flex: 1 }} />
        <button onClick={() => carregar(1)} disabled={carregando} className="row" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9.5, fontWeight: 700, padding: '5px 11px', borderRadius: 8, cursor: 'pointer', color: '#cfaef5', background: 'rgba(160,107,232,.12)', border: '1px solid rgba(160,107,232,.3)' }}>{carregando ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}Reanalisar</button>
      </>} />
      {carregando && !t ? <Skel h={140} />
        : !t?.disponivel ? <Empty icon={Sparkles} texto={t?.motivo === 'poucos comentários' ? 'Ainda há poucos comentários com texto para a IA extrair temas — conforme as avaliações chegam, os temas aparecem aqui.' : 'A análise de temas por IA está indisponível no momento. Tente reanalisar em instantes.'} />
          : (
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
              <div>
                {(t.temas || []).map((tema, i) => {
                  const tot = Math.max(tema.mencoes, tema.positivas + tema.negativas, 1)
                  const pPos = tema.positivas / tot * 100
                  const pNeg = tema.negativas / tot * 100
                  return (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <div className="row" style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}><span style={{ fontSize: 10.5, fontWeight: 700 }}>{tema.tema}</span><div style={{ flex: 1 }} /><span className="num" style={{ fontSize: 9, color: 'var(--faint)' }}>{tema.mencoes} menções</span></div>
                      <div className="row" style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', gap: 1 }}>
                        <div title={`${tema.positivas} positivas`} style={{ width: `${pPos}%`, background: `linear-gradient(90deg,rgba(47,217,141,.4),${OK})` }} />
                        <div title={`${tema.negativas} negativas`} style={{ width: `${pNeg}%`, background: DANGER }} />
                        {pPos + pNeg < 1 && <div style={{ flex: 1, background: 'rgba(255,255,255,.05)' }} />}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div>
                <div style={{ background: 'rgba(0,0,0,.18)', borderRadius: 11, padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ fontSize: 7.5, textTransform: 'uppercase', fontWeight: 800, color: OK, marginBottom: 4 }}>O que mais elogiam</div>
                  {(t.elogios || []).length ? (t.elogios || []).map((e, i) => <div key={i} style={{ fontSize: 10, color: 'var(--dim)', fontStyle: 'italic', marginBottom: 2 }}>"{e}"</div>) : <div style={{ fontSize: 9.5, color: 'var(--faint)' }}>—</div>}
                </div>
                <div style={{ background: 'rgba(0,0,0,.18)', borderRadius: 11, padding: '10px 12px' }}>
                  <div style={{ fontSize: 7.5, textTransform: 'uppercase', fontWeight: 800, color: DANGER, marginBottom: 4 }}>O que mais reclamam</div>
                  {(t.reclamacoes || []).length ? (t.reclamacoes || []).map((e, i) => <div key={i} style={{ fontSize: 10, color: 'var(--dim)', fontStyle: 'italic', marginBottom: 2 }}>"{e}"</div>) : <div style={{ fontSize: 9.5, color: 'var(--faint)' }}>—</div>}
                </div>
              </div>
            </div>
          )}
    </div>
  )
}

/* ---------- Reputação por produto ---------- */
function ReputacaoProdutos({ produtos, notify }) {
  const [ordem, setOrdem] = useState('piores')
  const [pag, setPag] = useState(0)
  const PP = 8
  const lista = [...(produtos || [])]
  if (ordem === 'melhores') lista.sort((a, b) => b.media - a.media || b.avaliacoes - a.avaliacoes)
  else if (ordem === 'mais') lista.sort((a, b) => b.avaliacoes - a.avaliacoes)
  else lista.sort((a, b) => a.media - b.media || b.avaliacoes - a.avaliacoes)
  const paginas = Math.max(1, Math.ceil(lista.length / PP))
  const pa = Math.min(pag, paginas - 1)
  const vis = lista.slice(pa * PP, pa * PP + PP)
  const TEND = { sobe: [OK, '▲'], cai: [DANGER, '▼'], estavel: ['var(--faint)', '—'] }
  return (
    <div className="glass" style={{ padding: 16 }}>
      <Secao icon={Package} cor={SHOPEE} titulo="Reputação por produto · cruzada com Boost e ofertas" extra={<>
        <div style={{ flex: 1 }} />
        <Chip on={ordem === 'piores'} onClick={() => { setOrdem('piores'); setPag(0) }}>Piores primeiro</Chip>
        <Chip on={ordem === 'melhores'} onClick={() => { setOrdem('melhores'); setPag(0) }}>Melhores</Chip>
        <Chip on={ordem === 'mais'} onClick={() => { setOrdem('mais'); setPag(0) }}>Mais avaliados</Chip>
      </>} />
      {lista.length === 0 ? <Empty icon={Package} texto="Assim que as avaliações sincronizarem, cada produto avaliado aparece aqui com nota, volume, % de críticas e cruzamento com o Boost e as ofertas." /> : (
        <>
          {vis.map((prod) => {
            const cor = prod.media >= 4.5 ? OK : prod.media >= 3.5 ? WARN : DANGER
            const td = TEND[prod.tendencia] || TEND.estavel
            return (
              <div key={prod.item_id} className="row lift" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 12, marginBottom: 7, borderLeft: `3px solid ${cor}`, background: prod.media < 3.5 ? 'rgba(255,122,122,.04)' : 'rgba(255,255,255,.02)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 9, overflow: 'hidden', flex: 'none', background: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{prod.imagem ? <img src={prod.imagem} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={16} style={{ color: 'var(--faint)' }} />}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prod.nome}</div>
                  <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2, flexWrap: 'wrap' }}>
                    {prod.no_boost && <Badge c={PURPLE} bg="rgba(160,107,232,.12)">na fila do boost</Badge>}
                    {prod.em_oferta && <Badge c={SHOPEE} bg="rgba(238,77,45,.12)">em oferta</Badge>}
                    {prod.pct_midia > 0 && <span className="num" style={{ fontSize: 8, color: 'var(--faint)' }}>{prod.pct_midia}% com foto</span>}
                  </div>
                </div>
                <div style={{ width: 62, textAlign: 'right', flex: 'none' }}><Estrelas n={Math.round(prod.media)} size={8} /><b className="num" style={{ fontSize: 12, color: cor, display: 'block' }}>{prod.media.toFixed(2)}</b></div>
                <div style={{ width: 52, textAlign: 'right', flex: 'none' }}><div style={{ fontSize: 6.5, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)' }}>Aval.</div><b className="num" style={{ fontSize: 11 }}>{prod.avaliacoes}</b></div>
                <div style={{ width: 52, textAlign: 'right', flex: 'none' }}><div style={{ fontSize: 6.5, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)' }}>Críticas</div><b className="num" style={{ fontSize: 11, color: prod.pct_criticas > 10 ? DANGER : 'var(--dim)' }}>{prod.pct_criticas}%</b></div>
                <div style={{ width: 30, textAlign: 'center', flex: 'none', color: td[0], fontSize: 12 }}>{td[1]}</div>
              </div>
            )
          })}
          {lista.length > PP && (
            <div className="row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10 }}>
              <button onClick={() => setPag((x) => Math.max(0, x - 1))} disabled={pa === 0} style={{ fontSize: 10.5, fontWeight: 700, padding: '5px 11px', borderRadius: 8, cursor: pa === 0 ? 'default' : 'pointer', color: 'var(--dim)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', opacity: pa === 0 ? .4 : 1 }}>← Anterior</button>
              <span className="num" style={{ fontSize: 9.5, color: 'var(--faint)' }}>{pa * PP + 1}–{Math.min((pa + 1) * PP, lista.length)} de {lista.length}{paginas > 1 ? ` · pág. ${pa + 1}/${paginas}` : ''}</span>
              <button onClick={() => setPag((x) => Math.min(paginas - 1, x + 1))} disabled={pa >= paginas - 1} style={{ fontSize: 10.5, fontWeight: 700, padding: '5px 11px', borderRadius: 8, cursor: pa >= paginas - 1 ? 'default' : 'pointer', color: 'var(--dim)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', opacity: pa >= paginas - 1 ? .4 : 1 }}>Próximo →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ---------- Estúdio da IA (modal de configuração potencializado) ---------- */
function Estudio({ cfg, onFechar, onSalvar, notify }) {
  const [c, setC] = useState({ ...cfg })
  const [previa, setPrevia] = useState('')
  const [gerando, setGerando] = useState(false)
  const [notaTeste, setNotaTeste] = useState(5)
  const mud = (k, v) => setC((s) => ({ ...s, [k]: v }))
  const estrelas = c.auto_estrelas || [4, 5]
  const EXEMPLOS = {
    5: { comentario: 'Como sempre, perfeito! Cores lindas, chegou super rápido. Já é minha 4ª compra e nunca decepciona', produto: 'Miçanga Cristal 6mm Furta-Cor 500g', nome: 'ateliedaju' },
    3: { comentario: 'O produto é bom mas achei que viria mais quantidade pelo preço', produto: 'Fio de Seda Rabo de Rato 1mm', nome: 'crislu' },
    1: { comentario: 'Alguns fechos vieram com a mola travada, não abrem. Uns 10 não servem pra nada', produto: 'Fecho Lagosta 12mm Prata 100 Peças', nome: 'm****a_78' },
  }
  const gerarPrevia = async () => {
    setGerando(true)
    try {
      // salva a config atual primeiro para a prévia refletir os ajustes
      await api.shopeeReviewConfigSalvar(c)
      const ex = EXEMPLOS[notaTeste]
      const r = await api.shopeeReviewSugerir({ nota: notaTeste, comentario: ex.comentario, produto: ex.produto, nome: ex.nome, tom: c.tom })
      setPrevia(typeof r === 'string' ? r : (r.texto || r.sugestao || ''))
    } catch (e) { notify(e.message, 'danger') } finally { setGerando(false) }
  }
  const Sl = ({ label, valor, sufixo, min, max, passo, campo }) => (
    <div style={{ marginBottom: 12 }}>
      <div className="row" style={{ display: 'flex', marginBottom: 4 }}><span style={{ fontSize: 9.5, color: 'var(--dim)' }}>{label}</span><div style={{ flex: 1 }} /><b className="num" style={{ fontSize: 9.5, color: SHOPEE }}>{valor}{sufixo}</b></div>
      <input type="range" min={min} max={max} step={passo || 1} value={valor} onChange={(e) => mud(campo, Number(e.target.value))} style={{ width: '100%' }} />
    </div>
  )
  return (
    <div onClick={onFechar} style={{ position: 'fixed', inset: 0, background: 'rgba(5,3,8,.8)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(1080px,97vw)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--glass-border)', boxShadow: '0 40px 120px rgba(0,0,0,.6)', overflow: 'hidden' }}>
        <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 18px', borderBottom: '1px solid var(--glass-border)', background: 'linear-gradient(110deg,rgba(238,77,45,.1),rgba(160,107,232,.06),transparent)' }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: `linear-gradient(145deg,${SHOPEE},#a52c15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Bot size={19} color="#fff" /></div>
          <div style={{ flex: 1 }}>
            <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><b className="serif" style={{ fontSize: 17 }}>Estúdio do Copiloto · Como a IA responde</b><Badge c="#e9dbfb" bg="rgba(160,107,232,.2)">PERSONALIDADE DA LOJA</Badge></div>
            <div style={{ fontSize: 9.5, color: 'var(--dim)' }}>Ajuste e teste na prévia ao lado — você vê como o agente vai soar antes de salvar</div>
          </div>
          <X size={17} style={{ color: 'var(--dim)', cursor: 'pointer' }} onClick={onFechar} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', flex: 1, minHeight: 0 }}>
          {/* config */}
          <div style={{ padding: 16, borderRight: '1px solid var(--glass-border)', overflowY: 'auto' }}>
            <div style={{ fontSize: 8, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)', marginBottom: 6 }}>Tom de voz</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, marginBottom: 13 }}>
              {[['caloroso', 'Caloroso'], ['profissional', 'Profissional'], ['descontraido', 'Descontraído']].map(([v, l]) => (
                <span key={v} onClick={() => mud('tom', v)} style={{ fontSize: 11, fontWeight: 700, padding: '8px 6px', borderRadius: 10, cursor: 'pointer', textAlign: 'center', color: c.tom === v ? '#fff' : 'var(--dim)', background: c.tom === v ? `linear-gradient(135deg,${SHOPEE},#c0341c)` : 'rgba(255,255,255,.04)', border: `1px solid ${c.tom === v ? 'transparent' : 'var(--glass-border)'}` }}>{l}</span>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 12 }}>
              <div><div style={{ fontSize: 9.5, color: 'var(--dim)', marginBottom: 4 }}>Assinatura (fim da resposta)</div><input value={c.assinatura || ''} onChange={(e) => mud('assinatura', e.target.value)} style={{ width: '100%', padding: '9px 12px', fontSize: 12, color: 'var(--text)', background: 'rgba(0,0,0,.25)', border: '1px solid var(--glass-border)', borderRadius: 10 }} /></div>
              <div><div style={{ fontSize: 9.5, color: 'var(--dim)', marginBottom: 4 }}>Saudação (opcional)</div><input value={c.saudacao || ''} onChange={(e) => mud('saudacao', e.target.value)} style={{ width: '100%', padding: '9px 12px', fontSize: 12, color: 'var(--text)', background: 'rgba(0,0,0,.25)', border: '1px solid var(--glass-border)', borderRadius: 10 }} /></div>
            </div>
            <Sl label="Tamanho máximo da resposta" valor={c.limite_chars || 450} sufixo=" caracteres" min={120} max={800} passo={10} campo="limite_chars" />
            <div style={{ fontSize: 9.5, color: 'var(--dim)', marginBottom: 4 }}>Regras da loja (instruções livres pra IA)</div>
            <textarea value={c.instrucoes || ''} onChange={(e) => mud('instrucoes', e.target.value)} rows={3} placeholder="Ex.: sempre lembrar que enviamos em até 24h; oferecer 5% na próxima compra com o cupom VOLTA5; nunca prometer reembolso sem avaliar." style={{ width: '100%', fontSize: 11.5, color: 'var(--text)', background: 'rgba(0,0,0,.25)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '9px 12px', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, marginBottom: 12 }} />
            {[['usar_nome', 'Chamar o cliente pelo nome'], ['usar_emoji', 'Permitir emojis leves'], ['oferecer_chat', 'Em notas baixas, oferecer resolver pelo chat']].map(([k2, l]) => (
              <div key={k2} className="glass row" style={{ display: 'flex', alignItems: 'center', padding: '9px 12px', borderRadius: 10, gap: 9, marginBottom: 7 }}><span style={{ fontSize: 10.5, color: 'var(--dim)', flex: 1 }}>{l}</span><Toggle on={!!c[k2]} onClick={() => mud(k2, !c[k2])} /></div>
            ))}
            <div style={{ fontSize: 8, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)', margin: '12px 0 6px' }}>No modo automático, responder sozinho as notas:</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginBottom: 4 }}>
              {[5, 4, 3, 2, 1].map((s) => {
                const on = estrelas.includes(s)
                return <span key={s} onClick={() => mud('auto_estrelas', on ? estrelas.filter((x) => x !== s) : [...estrelas, s].sort())} className="num" style={{ fontSize: 11, fontWeight: 800, padding: '8px 4px', borderRadius: 10, cursor: 'pointer', textAlign: 'center', color: on ? '#fff' : 'var(--dim)', background: on ? `linear-gradient(135deg,${SHOPEE},#c0341c)` : 'rgba(255,255,255,.04)', border: `1px solid ${on ? 'transparent' : 'var(--glass-border)'}` }}>{s} ★</span>
              })}
            </div>
            <div style={{ fontSize: 8.5, color: 'var(--faint)', marginBottom: 12 }}>Recomendado deixar só 4 e 5. Notas baixas pedem um olhar humano.</div>
            <div style={{ fontSize: 8, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)', marginBottom: 6 }}>Ritmo das respostas (anti-flood)</div>
            <Sl label="Pausa entre respostas" valor={c.auto_pausa_seg ?? 5} sufixo=" s" min={1} max={60} campo="auto_pausa_seg" />
            <Sl label="Máximo por ciclo" valor={c.auto_max_ciclo ?? 10} sufixo="" min={5} max={100} passo={5} campo="auto_max_ciclo" />
            <div style={{ fontSize: 8.5, color: 'var(--faint)' }}>O agente roda a cada hora. Com pausa de {c.auto_pausa_seg ?? 5}s e teto {c.auto_max_ciclo ?? 10}, são respostas espaçadas — o suficiente pra ir limpando a fila sem parecer robô.</div>
          </div>
          {/* prévia */}
          <div style={{ padding: 16, background: 'rgba(0,0,0,.18)', overflowY: 'auto' }}>
            <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 9, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Sparkles size={12} style={{ color: PURPLE }} />Prévia ao vivo</span>
              <Badge c="#cfaef5" bg="rgba(160,107,232,.15)">USA A CONFIG ATUAL</Badge>
              <div style={{ flex: 1 }} />
            </div>
            <div className="row" style={{ display: 'flex', gap: 6, marginBottom: 11, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 9, color: 'var(--faint)' }}>testar com:</span>
              {[[5, '5★ elogio'], [3, '3★ morna'], [1, '1★ crítica']].map(([n, l]) => <Chip key={n} on={notaTeste === n} onClick={() => setNotaTeste(n)}>{l}</Chip>)}
            </div>
            <div className="glass" style={{ padding: '10px 13px', borderRadius: 12, marginBottom: 10 }}>
              <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}><Estrelas n={notaTeste} size={10} /><b style={{ fontSize: 10 }}>{EXEMPLOS[notaTeste].produto}</b></div>
              <div style={{ fontSize: 10.5, color: 'var(--dim)', fontStyle: 'italic' }}>"{EXEMPLOS[notaTeste].comentario}" — {EXEMPLOS[notaTeste].nome}</div>
            </div>
            <button onClick={gerarPrevia} disabled={gerando} className="row" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 800, padding: '8px 14px', borderRadius: 9, cursor: 'pointer', color: '#fff', border: 'none', background: 'linear-gradient(135deg,var(--accent2),var(--accent))', marginBottom: 11 }}>{gerando ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}Gerar prévia com essa config</button>
            {previa ? (
              <div style={{ background: 'rgba(160,107,232,.08)', border: '1px solid rgba(160,107,232,.35)', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
                <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}><Bot size={12} style={{ color: PURPLE }} /><b style={{ fontSize: 8.5, textTransform: 'uppercase', color: '#cfaef5' }}>Como o agente responderia</b><div style={{ flex: 1 }} /><span className="num" style={{ fontSize: 8, color: 'var(--faint)' }}>{previa.length} / {c.limite_chars || 450}</span></div>
                <div style={{ fontSize: 11.5, color: 'var(--text)', lineHeight: 1.6 }}>"{previa}"</div>
              </div>
            ) : <div style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 12 }}>A prévia salva a config atual e pede ao copiloto uma resposta real para a avaliação de teste acima.</div>}
            <div className="glass" style={{ padding: '12px 14px', borderRadius: 12, borderColor: 'rgba(47,217,141,.3)' }}>
              <div style={{ fontSize: 8, textTransform: 'uppercase', fontWeight: 800, color: OK, marginBottom: 7, display: 'flex', alignItems: 'center', gap: 6 }}><Check size={11} />Resumo: como o agente vai se comportar</div>
              {[
                [OK, <>Responde <b style={{ color: 'var(--text)' }}>{estrelas.length ? estrelas.join('–') + '★' : 'nenhuma nota'} sozinho</b>, em tom <b style={{ color: 'var(--text)' }}>{c.tom || 'caloroso'}</b>{c.usar_nome ? ', com nome' : ''}{c.usar_emoji ? ' e emoji leve' : ''}</>],
                [DANGER, <>Notas fora da lista viram <b style={{ color: 'var(--text)' }}>rascunho pra sua aprovação</b>{c.oferecer_chat ? ', oferecendo o chat' : ''}</>],
                [SHOPEE, <>Roda de hora em hora: até <b className="num" style={{ color: 'var(--text)' }}>{c.auto_max_ciclo ?? 10}</b> respostas com <b className="num" style={{ color: 'var(--text)' }}>{c.auto_pausa_seg ?? 5}s</b> de pausa</>],
                [PURPLE, <>Assina <b style={{ color: 'var(--text)' }}>{c.assinatura || 'sem assinatura'}</b>{c.saudacao ? <> · abre com "<b style={{ color: 'var(--text)' }}>{c.saudacao}</b>"</> : ''}</>],
              ].map(([cor, txt], i) => (
                <div key={i} className="row" style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '4px 0' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: cor, flex: 'none', marginTop: 5 }} /><span style={{ fontSize: 10, color: 'var(--dim)', lineHeight: 1.5 }}>{txt}</span></div>
              ))}
            </div>
          </div>
        </div>
        <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', borderTop: '1px solid var(--glass-border)', background: 'rgba(0,0,0,.2)' }}>
          <span style={{ fontSize: 9, color: 'var(--faint)' }}>As mudanças valem para as próximas respostas — as já enviadas não mudam.</span>
          <div style={{ flex: 1 }} />
          <button onClick={onFechar} style={{ fontSize: 11.5, fontWeight: 700, padding: '9px 15px', borderRadius: 10, cursor: 'pointer', color: 'var(--dim)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>Descartar</button>
          <button onClick={() => onSalvar(c)} className="row" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800, padding: '9px 17px', borderRadius: 10, cursor: 'pointer', color: '#fff', border: 'none', background: `linear-gradient(135deg,${SHOPEE},#c0341c)`, boxShadow: '0 6px 18px rgba(238,77,45,.35)' }}><Check size={13} />Salvar</button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Insights acionáveis do agente ---------- */
function Insights({ insights, onAcao }) {
  const TOM = {
    danger: [DANGER, 'rgba(255,122,122,.07)', 'rgba(255,122,122,.3)'],
    warn: [WARN, 'rgba(224,162,60,.07)', 'rgba(224,162,60,.3)'],
    gold: [GOLD, 'rgba(242,194,0,.07)', 'rgba(242,194,0,.3)'],
    azul: [BLUE, 'rgba(91,141,239,.07)', 'rgba(91,141,239,.3)'],
    roxo: [PURPLE, 'rgba(160,107,232,.07)', 'rgba(160,107,232,.3)'],
    ok: [OK, 'rgba(47,217,141,.07)', 'rgba(47,217,141,.3)'],
  }
  const ICONE = { alerta: AlertTriangle, foguete: TrendingUp, relogio: Clock, coroa: Star, ok: Check }
  const [feito, setFeito] = useState({})
  const agir = (ins, i) => { onAcao(ins); if (ins.acao === 'mandar_boost') setFeito((s) => ({ ...s, [i]: true })) }
  return (
    <div className="glass" style={{ padding: '14px 16px', border: '1px solid transparent', background: 'linear-gradient(var(--surface),var(--surface)) padding-box,linear-gradient(110deg,rgba(160,107,232,.4),rgba(242,194,0,.3),rgba(238,77,45,.3)) border-box' }}>
      <Secao icon={Sparkles} cor={PURPLE} titulo="Insights do agente de reputação" extra={<>
        <Badge c="#cfaef5" bg="rgba(160,107,232,.15)">IA · AÇÃO EM 1 CLIQUE</Badge>
        <div style={{ flex: 1 }} />
        <span className="num" style={{ fontSize: 9, color: 'var(--faint)' }}>{insights.length} achado{insights.length === 1 ? '' : 's'}</span>
      </>} />
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(insights.length, 4)},1fr)`, gap: 10 }}>
        {insights.map((ins, i) => {
          const t = TOM[ins.tom] || TOM.roxo
          const Ic = ICONE[ins.icone] || Sparkles
          const done = feito[i]
          return (
            <div key={i} style={{ background: t[1], border: `1px solid ${t[2]}`, borderRadius: 13, padding: '12px 13px', display: 'flex', flexDirection: 'column' }}>
              <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: 7, background: `${t[0]}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Ic size={13} style={{ color: t[0] }} /></div>
                <b style={{ fontSize: 10.5, color: t[0], lineHeight: 1.2 }}>{ins.titulo}</b>
              </div>
              <div style={{ fontSize: 10, color: 'var(--dim)', lineHeight: 1.45, flex: 1, marginBottom: 9 }}>{ins.texto}</div>
              <button onClick={() => agir(ins, i)} disabled={done} className="row" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 10, fontWeight: 800, padding: '7px 11px', borderRadius: 8, cursor: done ? 'default' : 'pointer', color: done ? OK : (ins.tom === 'gold' ? '#0d0d0d' : '#fff'), border: 'none', background: done ? 'rgba(47,217,141,.15)' : t[0], opacity: done ? 1 : 1 }}>
                {done ? <><Check size={11} />No Boost</> : <>{ins.acao === 'mandar_boost' ? <TrendingUp size={11} /> : ins.acao === 'ver_comprador' ? <Users size={11} /> : <ChevronRight size={11} />}{ins.rotulo}</>}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- Linha do tempo da reputação ---------- */
function LinhaDoTempo({ eventos }) {
  const TOM = { danger: DANGER, warn: WARN, gold: GOLD, azul: BLUE, roxo: PURPLE, ok: OK }
  const ICONE = { critica: AlertTriangle, prova_social: ImageIcon, recompra: Star, agente: Bot }
  const [filtro, setFiltro] = useState('todos')
  const vis = (eventos || []).filter((e) => filtro === 'todos' || e.tipo === filtro)
  const cont = (tipo) => (eventos || []).filter((e) => e.tipo === tipo).length
  return (
    <div className="glass" style={{ padding: 16 }}>
      <Secao icon={Activity} cor={PURPLE} titulo="Linha do tempo da reputação · marcos ao vivo" extra={<>
        <Badge c="#cfaef5" bg="rgba(160,107,232,.15)">EVENTOS REAIS</Badge>
        <div style={{ flex: 1 }} />
        <Chip on={filtro === 'todos'} onClick={() => setFiltro('todos')}>Tudo</Chip>
        {cont('critica') > 0 && <Chip on={filtro === 'critica'} onClick={() => setFiltro('critica')} cor={DANGER}>Críticas ({cont('critica')})</Chip>}
        {cont('prova_social') > 0 && <Chip on={filtro === 'prova_social'} onClick={() => setFiltro('prova_social')}>Prova social ({cont('prova_social')})</Chip>}
        {cont('recompra') > 0 && <Chip on={filtro === 'recompra'} onClick={() => setFiltro('recompra')}>Fiéis ({cont('recompra')})</Chip>}
      </>} />
      {vis.length === 0 ? <Empty icon={Activity} texto="Conforme as avaliações chegam, os marcos aparecem aqui: críticas, prova social (fotos/vídeos), clientes fiéis e cada resposta do copiloto — em ordem, com o horário real." /> : (
        <div style={{ position: 'relative', paddingLeft: 20 }}>
          <div style={{ position: 'absolute', left: 6, top: 4, bottom: 4, width: 2, background: 'linear-gradient(var(--glass-border),transparent)' }} />
          {vis.map((e, i) => {
            const cor = TOM[e.tom] || PURPLE
            const Ic = ICONE[e.tipo] || Activity
            return (
              <div key={i} style={{ position: 'relative', paddingBottom: i < vis.length - 1 ? 13 : 0 }}>
                <div style={{ position: 'absolute', left: -20, top: 1, width: 14, height: 14, borderRadius: '50%', background: 'var(--surface)', border: `2px solid ${cor}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: cor }} /></div>
                <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                  <Ic size={12} style={{ color: cor }} />
                  <b style={{ fontSize: 10.5, color: cor }}>{e.titulo}</b>
                  <span style={{ fontSize: 10.5, color: 'var(--dim)' }}>{e.texto}</span>
                  <div style={{ flex: 1 }} />
                  <span className="num" style={{ fontSize: 8.5, color: 'var(--faint)', flex: 'none' }}>{e.quando ? tempoRel(e.quando) : ''}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
