import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Rocket, Zap, Clock, Star, TrendingUp, Settings2, RefreshCw, Radar as RadarIcon,
  Package, ChevronRight, Loader2, Play, Square, Plus, X, Info, Sparkles,
  Calendar, AlertTriangle, Check, Trophy, Lightbulb, Gauge, Boxes, ShieldAlert,
  ChevronUp, ChevronsUp, Search, PackagePlus,
} from 'lucide-react'
import { api } from './api'

const OK = 'var(--ok)', WARN = 'var(--warn)', DANGER = 'var(--danger)'
const SHOPEE = '#EE4D2D', BLUE = '#5B8DEF', PURPLE = '#a06be8', GOLD = '#F2C200'
const TIPOS = {
  auto: ['AUTO', PURPLE, 'rgba(160,107,232,.16)'],
  manual: ['MANUAL', WARN, 'rgba(224,162,60,.16)'],
  radar: ['RADAR', BLUE, 'rgba(91,141,239,.16)'],
}
const CORES_HEX = { prata: '#C0C0C0', dourada: '#D4AF37', dourado: '#D4AF37', preta: '#2a2a2a', preto: '#2a2a2a', branca: '#f0f0f0', vermelha: '#c0392b', azul: '#2980b9', verde: '#27ae60', rosa: '#e84393', amarela: '#f1c40f', roxa: '#8e44ad', lilas: '#b39ddb', cinza: '#7f8c8d', marrom: '#795548', laranja: '#e67e22', cristal: 'rgba(255,255,255,.2)', transparente: 'rgba(255,255,255,.2)' }

const fmtDur = (ms) => {
  if (ms == null) return '—'
  const m = Math.max(0, Math.floor(ms / 60000)); const h = Math.floor(m / 60)
  return (h > 0 ? h + 'h ' : '') + (m % 60) + 'm'
}
const fmtClock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000)); const m = Math.floor(s / 60)
  return m + ':' + String(s % 60).padStart(2, '0')
}
const corProduto = (nome) => {
  const k = (nome || '').toLowerCase()
  for (const c of Object.keys(CORES_HEX)) if (k.includes(c)) return CORES_HEX[c]
  return null
}
function hEmJanelas(h, janelas) { return (janelas || []).some(([a, b]) => (a <= b ? (h >= a && h < b) : (h >= a || h < b))) }
function janelasPico(pico, maxJanelas = 2) {
  const horas = pico?.horas || []
  if (!horas.length || !pico?.total) return []
  const max = Math.max(...horas)
  const limite = max * 0.55
  const js = []; let ini = null
  for (let h = 0; h < 24; h++) {
    if (horas[h] >= limite) { if (ini == null) ini = h } else if (ini != null) { js.push([ini, h]); ini = null }
  }
  if (ini != null) js.push([ini, 24])
  js.sort((a, b) => horas.slice(b[0], b[1]).reduce((s, x) => s + x, 0) - horas.slice(a[0], a[1]).reduce((s, x) => s + x, 0))
  return js.slice(0, maxJanelas).sort((a, b) => a[0] - b[0])
}

/* ---------- átomos ---------- */
function Badge({ children, c, bg }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 99, whiteSpace: 'nowrap', letterSpacing: '.2px', color: c, background: bg }}>{children}</span>
}
function Ring({ size = 70, val = 0, cor, w = 5, children }) {
  const r = (size - w) / 2, c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={w} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={cor} strokeWidth={w} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, val)))} style={{ transition: 'stroke-dashoffset .9s linear' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
    </div>
  )
}
function Kpi({ icon: Ic, label, value, sub, cor, glow }) {
  return (
    <div className="glass lift" style={{ padding: 12, borderRadius: 14, ...(glow ? { background: `linear-gradient(150deg,${glow},rgba(0,0,0,.2))`, borderColor: cor + '44' } : {}) }}>
      <div style={{ fontSize: 7.5, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)', display: 'flex', alignItems: 'center', gap: 4 }}><Ic size={10} />{label}</div>
      <div className="num" style={{ fontSize: 21, fontWeight: 800, color: cor, lineHeight: 1.1, marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 8, color: 'var(--faint)' }}>{sub}</div>
    </div>
  )
}
function Secao({ icon: Ic, cor, titulo, extra, children }) {
  return (
    <div className="row" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 13 }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 7 }}><Ic size={13} style={{ color: cor }} />{titulo}</div>
      {extra}{children}
    </div>
  )
}
function Empty({ icon: Ic = Info, texto }) {
  return <div style={{ textAlign: 'center', padding: '20px 12px', color: 'var(--faint)' }}><Ic size={22} style={{ opacity: .5, margin: '0 auto 8px' }} /><div style={{ fontSize: 11 }}>{texto}</div></div>
}
function Skel({ h = 40 }) { return <div style={{ height: h, borderRadius: 10, background: 'linear-gradient(90deg,rgba(255,255,255,.04),rgba(255,255,255,.08),rgba(255,255,255,.04))', backgroundSize: '200% 100%', animation: 'skel 1.4s infinite' }} /> }

export default function ShopeeBoost({ conectado, notify }) {
  const [p, setP] = useState(null)
  const [pico, setPico] = useState(null)
  const [hist, setHist] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [rodando, setRodando] = useState(false)
  const [sincNomes, setSincNomes] = useState(false)
  const [autoSel, setAutoSel] = useState(false)
  const [jnIni, setJnIni] = useState(11)
  const [jnFim, setJnFim] = useState(14)
  const [seletorAberto, setSeletorAberto] = useState(false)
  const [filaBusca, setFilaBusca] = useState('')
  const [filaFiltro, setFilaFiltro] = useState('todos')
  const [filaPag, setFilaPag] = useState(0)
  const [, forceTick] = useState(0)
  const baseRef = useRef(Date.now())
  const editJanela = useRef(false)

  const carregar = () => api.shopeeBoostPainel().then((d) => {
    baseRef.current = Date.now()
    setP((old) => (editJanela.current && old) ? { ...d, config: { ...d.config, janela_inicio: old.config.janela_inicio, janela_fim: old.config.janela_fim } } : d)
  }).catch(() => {}).finally(() => setCarregando(false))

  useEffect(() => { carregar(); const t = setInterval(carregar, 15000); return () => clearInterval(t) }, [])
  useEffect(() => { api.shopeeBoostPico().then(setPico).catch(() => setPico({ horas: [], total: 0 })) }, [])
  useEffect(() => { const f = () => api.shopeeBoostHistorico().then(setHist).catch(() => setHist({ eventos: [], resumo: [], kpis: {} })); f(); const t = setInterval(f, 60000); return () => clearInterval(t) }, [])
  useEffect(() => { const t = setInterval(() => forceTick((x) => x + 1), 1000); return () => clearInterval(t) }, [])

  const cfg = p?.config || {}
  const kpis = p?.kpis || {}
  const decorrido = Date.now() - baseRef.current
  const restante = (v) => (v.termina_ms == null ? null : v.termina_ms - decorrido)

  const setConfig = async (patch) => {
    if ('janela_inicio' in patch || 'janela_fim' in patch) editJanela.current = true
    setP((s) => ({ ...s, config: { ...s.config, ...patch } }))
    try { await api.shopeeBoostConfig(patch) } catch (e) { notify('Não salvou: ' + e.message, 'danger') }
    finally { setTimeout(() => { editJanela.current = false }, 1500) }
  }
  const rodar = async () => {
    setRodando(true)
    try {
      const r = await api.shopeeBoostRodar()
      if (r.acao === 'impulsionado') notify(`Impulsionados ${(r.itens || []).length} produto(s)!`, 'ok')
      else if (r.acao === 'cheio') notify(r.msg || 'As 5 vagas já estão ocupadas.', 'warn')
      else if (r.acao === 'ocioso') notify('Motor desligado ou fora da janela de horário.', 'warn')
      else if (r.acao === 'sem_candidatos') notify('Nenhum produto na fila para impulsionar.', 'warn')
      else if (r.acao === 'erro') notify(r.erro || 'A Shopee recusou o impulso.', 'danger')
      carregar()
    } catch (e) { notify(e.message, 'danger') } finally { setRodando(false) }
  }
  const autoSelecionar = async (estr) => {
    setAutoSel(true)
    try { const r = await api.shopeeBoostAutoSelecionar(estr || cfg.auto_estrategia); notify(`Auto-seleção: ${r.selecionados ?? 0} produto(s) na fila.`, 'ok'); carregar() }
    catch (e) { notify(e.message, 'danger') } finally { setAutoSel(false) }
  }
  const sincronizar = async () => {
    setSincNomes(true)
    try { await api.shopeeBoostSincronizarNomes(); notify('Nomes sincronizados.', 'ok'); carregar() }
    catch (e) { notify(e.message, 'danger') } finally { setSincNomes(false) }
  }
  const fixar = async (id, fixo) => { try { await api.shopeeBoostFixar(id, fixo); carregar() } catch (e) { notify(e.message, 'danger') } }
  const removerFila = async (id) => { try { await api.shopeeBoostRemove(id); notify('Removido da fila.', 'ok'); carregar() } catch (e) { notify(e.message, 'danger') } }
  const moverNaFila = async (id, dir) => {
    const ids = (p?.fila || []).map((f) => f.item_id)
    const i = ids.indexOf(id)
    if (i < 0) return
    const novo = [...ids]
    if (dir === 'topo') { novo.splice(i, 1); novo.unshift(id) }
    else if (dir === 'cima' && i > 0) { const t = novo[i - 1]; novo[i - 1] = novo[i]; novo[i] = t }
    else if (dir === 'baixo' && i < novo.length - 1) { const t = novo[i + 1]; novo[i + 1] = novo[i]; novo[i] = t }
    else return
    setP((s) => ({ ...s, fila: novo.map((x) => s.fila.find((f) => f.item_id === x)).filter(Boolean) }))
    try { await api.shopeeBoostReordenar(novo); carregar() } catch (e) { notify(e.message, 'danger'); carregar() }
  }
  const adicionarProdutos = async (itens) => { try { await api.shopeeBoostAdd(itens); notify(`${itens.length} produto(s) na fila.`, 'ok'); carregar() } catch (e) { notify(e.message, 'danger') } }
  const execInsight = (ins) => {
    if (ins.acaoTipo === 'fixar') fixar(ins.acaoArg, true)
    else if (ins.acaoTipo === 'remover') removerFila(ins.acaoArg)
    else if (ins.acaoTipo === 'janela') { const jp = janelasPico(pico); if (jp.length) { setConfig({ janelas: jp }); notify('Janela otimizada para os horários de pico.', 'ok') } else notify('Sem pico claro ainda para otimizar.', 'warn') }
  }

  if (!conectado) return <div className="glass" style={{ padding: 20, borderRadius: 16 }}><Empty icon={Rocket} texto="Conecte a Shopee para usar o impulsionamento." /></div>
  if (carregando && !p) return <div style={{ display: 'grid', gap: 12 }}>{[80, 120, 180].map((h, i) => <Skel key={i} h={h} />)}</div>

  const insights = derivarInsights(p, pico)
  const FILA_PP = 12
  const filaFiltrada = (p?.fila || []).filter((f) => {
    if (filaFiltro === 'auto' && !f.auto) return false
    if (filaFiltro === 'manual' && f.auto) return false
    if (filaFiltro === 'fixos' && !f.fixo) return false
    const q = filaBusca.trim().toLowerCase()
    if (q && !((f.nome || '').toLowerCase().includes(q) || String(f.item_id).includes(q))) return false
    return true
  })
  const filaPaginas = Math.max(1, Math.ceil(filaFiltrada.length / FILA_PP))
  const pagAtual = Math.min(filaPag, filaPaginas - 1)
  const filaVisiveis = filaFiltrada.slice(pagAtual * FILA_PP, pagAtual * FILA_PP + FILA_PP)

  return (
    <div>
      <style>{'@keyframes skel{0%{background-position:200% 0}100%{background-position:-200% 0}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}'}</style>

      {/* ===== COMMAND BAR ===== */}
      <div className="row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{ width: 50, height: 50, borderRadius: 15, background: `linear-gradient(145deg,${SHOPEE},#a52c15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 32px rgba(238,77,45,.4)', flex: 'none', position: 'relative' }}>
          <Rocket size={25} color="#fff" />
          <span style={{ position: 'absolute', top: -3, right: -3, width: 12, height: 12, borderRadius: '50%', background: cfg.ativo ? OK : 'var(--faint)', border: '2.5px solid var(--bg)', animation: cfg.ativo ? 'pulse 2s infinite' : 'none' }} />
        </div>
        <div style={{ minWidth: 220 }}>
          <div className="serif" style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            Central de Impulsionamento
            <Badge c={SHOPEE} bg="rgba(238,77,45,.13)">SHOPEE</Badge>
            {cfg.auto_selecao && <Badge c={PURPLE} bg="rgba(160,107,232,.15)">MOTOR AUTOMÁTICO</Badge>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--dim)' }}>Rodízio das 5 vagas de destaque · {p?.sincronizado ? 'sincronizado com a Shopee' : 'usando estado local (Shopee indisponível no momento)'}</div>
        </div>
        <div style={{ flex: 1 }} />
        <div className="row" style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          <button onClick={sincronizar} disabled={sincNomes} className="glass lift" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, padding: '9px 13px', borderRadius: 11, color: 'var(--dim)', cursor: 'pointer', background: 'var(--glass-bg)' }}>{sincNomes ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}Sincronizar</button>
          <button onClick={() => setConfig({ ativo: false })} className="glass lift" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, padding: '9px 13px', borderRadius: 11, color: DANGER, cursor: 'pointer', background: 'rgba(255,122,122,.07)', borderColor: 'rgba(255,122,122,.3)' }}><Square size={13} />Parar tudo</button>
          <button onClick={() => setConfig({ ativo: !cfg.ativo })} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: cfg.ativo ? 'linear-gradient(135deg,rgba(47,217,141,.12),rgba(0,0,0,.15))' : 'var(--glass-bg)', border: `1px solid ${cfg.ativo ? 'rgba(47,217,141,.35)' : 'var(--glass-border)'}`, borderRadius: 11, padding: '8px 13px' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: cfg.ativo ? OK : 'var(--dim)' }}>{cfg.ativo ? 'MOTOR LIGADO' : 'MOTOR DESLIGADO'}</span>
            <span style={{ width: 34, height: 19, borderRadius: 99, background: cfg.ativo ? `linear-gradient(90deg,${OK},#1fa877)` : 'rgba(255,255,255,.15)', position: 'relative', flex: 'none' }}><span style={{ position: 'absolute', top: 2, [cfg.ativo ? 'right' : 'left']: 2, width: 15, height: 15, borderRadius: '50%', background: '#fff' }} /></span>
          </button>
        </div>
      </div>

      {/* ticker */}
      <div className="row num" style={{ display: 'flex', flexWrap: 'wrap', fontSize: 10, color: 'var(--faint)', marginBottom: 14, gap: 16 }}>
        <span>agendador: <b style={{ color: 'var(--text)' }}>a cada 30 min</b></span>
        <span>na fila: <b style={{ color: 'var(--text)' }}>{cfg.total ?? 0}</b> · auto <b style={{ color: PURPLE }}>{cfg.qtd_auto ?? 0}</b> · manuais <b style={{ color: WARN }}>{cfg.qtd_manual ?? 0}</b></span>
        <span>fixos: <b style={{ color: GOLD }}>{cfg.fixos ?? 0}/5</b></span>
        <span>regra: <b style={{ color: OK }}>só produto ativo e com estoque</b></span>
      </div>

      {/* ===== KPIs ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 11, marginBottom: 14 }}>
        <Kpi icon={Boxes} label="Vagas em uso" cor={SHOPEE} glow="rgba(238,77,45,.15)" value={<>{kpis.vagas_ocupadas ?? 0}<span style={{ fontSize: 12, color: 'var(--faint)' }}>/5</span></>} sub={`${cfg.qtd_auto ?? 0} auto · ${cfg.qtd_manual ?? 0} manuais`} />
        <Kpi icon={Package} label="Na fila" cor={PURPLE} value={kpis.na_fila ?? 0} sub="prontos p/ girar" />
        <Kpi icon={Clock} label="Próxima vaga" cor={WARN} value={kpis.proxima_vaga_ms != null ? fmtClock(kpis.proxima_vaga_ms - decorrido) : (kpis.vagas_ocupadas >= 5 ? '—' : 'livre')} sub={kpis.vagas_ocupadas >= 5 ? 'quando liberar, entra o próximo' : 'há vaga agora'} />
        <Kpi icon={Zap} label="Impulsos hoje" cor="var(--text)" value={<>{kpis.impulsos_hoje ?? 0}<span style={{ fontSize: 11, color: 'var(--faint)' }}>/{kpis.impulsos_max_dia ?? 30}</span></>} sub="máx. teórico do dia" />
        <Kpi icon={TrendingUp} label="Vendas 30d" cor={OK} glow="rgba(47,217,141,.13)" value={kpis.tem_vendas ? kpis.vendas_30d : '—'} sub={kpis.tem_vendas ? 'un dos produtos do boost' : 'sincronizando pedidos'} />
        <Kpi icon={Gauge} label="Vagas livres" cor={BLUE} value={Math.max(0, 5 - (kpis.vagas_ocupadas ?? 0))} sub="disponíveis agora" />
        <Kpi icon={Star} label="Fixos (pin)" cor={GOLD} value={<>{cfg.fixos ?? 0}<span style={{ fontSize: 11, color: 'var(--faint)' }}>/5</span></>} sub="sempre em destaque" />
        <Kpi icon={Coins2} label="Custo" cor={GOLD} value="R$ 0" sub="recurso orgânico grátis" />
      </div>

      {/* ===== 5 VAGAS AO VIVO ===== */}
      <div className="glass" style={{ padding: 18, marginBottom: 14, border: '1px solid transparent', background: 'linear-gradient(var(--surface),var(--surface)) padding-box,linear-gradient(120deg,rgba(238,77,45,.55),rgba(214,0,127,.35),rgba(160,107,232,.3)) border-box' }}>
        <Secao icon={Rocket} cor={SHOPEE} titulo="As 5 vagas de destaque · ao vivo"
          extra={<><Badge c={SHOPEE} bg="rgba(238,77,45,.12)">TOPO DA CATEGORIA</Badge><div style={{ flex: 1 }} /><div className="row" style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--dim)' }}>{Object.entries(TIPOS).map(([k, t]) => <span key={k} className="row" style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: t[1] }} />{t[0].toLowerCase()}</span>)}</div></>} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 13 }}>
          {(p?.vagas || []).map((v, i) => {
            if (!v.ocupada) return (
              <div key={i} className="glass" style={{ padding: 12, borderRadius: 14, border: '1.5px dashed var(--glass-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 210, opacity: .8 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, border: '1.5px dashed var(--faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}><Plus size={18} style={{ color: 'var(--faint)' }} /></div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--faint)' }}>Vaga livre</div>
                <div style={{ fontSize: 8.5, color: 'var(--faint)', marginTop: 3, textAlign: 'center' }}>o motor puxa o próximo da fila</div>
              </div>
            )
            const t = TIPOS[v.tipo] || TIPOS.manual
            const rem = restante(v)
            const frac = rem == null ? 0 : Math.min(1, Math.max(0, rem / (4 * 3600000)))
            const ringCor = rem != null && rem < 3600000 ? WARN : t[1]
            const cprod = corProduto(v.nome)
            return (
              <div key={i} className="glass lift" style={{ padding: 12, borderRadius: 14, borderTop: `2.5px solid ${t[1]}` }}>
                <div className="row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 9 }}>
                  <Badge c={t[1]} bg={t[2]}>{t[0]}</Badge>
                  {v.em_oferta ? <Badge c={SHOPEE} bg="rgba(238,77,45,.14)">oferta</Badge> : <Badge c="var(--faint)" bg="rgba(255,255,255,.05)">vaga {i + 1}</Badge>}
                </div>
                <div style={{ margin: '0 auto 9px', width: 70 }}>
                  <Ring size={70} val={frac} cor={ringCor} w={5}>
                    <b className="num" style={{ fontSize: 12.5, color: ringCor }}>{rem == null ? '—' : fmtDur(rem)}</b>
                    <span style={{ fontSize: 6.5, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 800, color: 'var(--faint)' }}>restante</span>
                  </Ring>
                </div>
                <div style={{ width: '100%', height: 56, borderRadius: 9, marginBottom: 8, position: 'relative', overflow: 'hidden', background: cprod ? `linear-gradient(135deg,${cprod},rgba(0,0,0,.35))` : 'linear-gradient(135deg,rgba(238,77,45,.35),rgba(160,107,232,.3))' }}>
                  {v.imagem ? <img src={v.imagem} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={18} style={{ color: 'rgba(255,255,255,.9)' }} /></div>}
                  <span style={{ position: 'absolute', top: 5, right: 6, width: 7, height: 7, borderRadius: '50%', background: '#fff', boxShadow: '0 0 0 2px rgba(0,0,0,.35)', animation: 'pulse 2s infinite' }} />
                  {v.em_oferta && <span style={{ position: 'absolute', bottom: 4, left: 5 }}><Badge c="#fff" bg="rgba(238,77,45,.9)">oferta</Badge></span>}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.25, height: 25, overflow: 'hidden' }}>{v.nome}</div>
                <div className="row num" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, paddingTop: 7, borderTop: '1px solid var(--glass-border)', fontSize: 8.5 }}>
                  <span style={{ color: 'var(--faint)' }}>{v.impulsos}º imp.</span>
                  <span style={{ color: OK }}>{v.vendas} vendas</span>
                </div>
              </div>
            )
          })}
        </div>
        <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 15, paddingTop: 14, borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ width: 170, height: 9, borderRadius: 99, background: 'rgba(255,255,255,.06)', overflow: 'hidden', display: 'flex' }}>
            {['auto', 'manual', 'radar'].map((k) => { const n = (p?.vagas || []).filter((v) => v.ocupada && v.tipo === k).length; return n ? <div key={k} style={{ width: `${n / 5 * 100}%`, background: TIPOS[k][1] }} /> : null })}
          </div>
          <span className="num" style={{ fontSize: 11, color: 'var(--dim)' }}><b style={{ color: SHOPEE }}>{kpis.vagas_ocupadas ?? 0}/5</b> ocupadas</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: 'var(--faint)' }}>quando uma vaga libera, o motor puxa o próximo da fila sozinho</span>
          <button onClick={rodar} disabled={rodando} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, padding: '9px 15px', borderRadius: 11, color: '#fff', border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${SHOPEE},#c0341c)`, boxShadow: '0 6px 18px rgba(238,77,45,.35)', opacity: rodando ? .7 : 1 }}>{rodando ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}Impulsionar agora</button>
        </div>

        {/* timeline 24h */}
        <Timeline vagas={p?.vagas || []} fila={p?.fila || []} decorrido={decorrido} />
      </div>

      {/* ===== CONFIG + HEATMAP | DESEMPENHO ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.12fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="glass" style={{ padding: 16 }}>
          <Secao icon={Settings2} cor="var(--dim)" titulo="Motor · configuração" extra={<><div style={{ flex: 1 }} /><Badge c={OK} bg="rgba(47,217,141,.12)">SALVO</Badge></>} />
          <div className="row" style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 8.5, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)', marginBottom: 6 }}>Auto-seleção (agentes escolhem)</div>
              <div className="row" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[['estoque_parado', 'Estoque parado'], ['margem', 'Maior margem'], ['abc', 'Curva ABC'], ['giro', 'Giro']].map(([v, lb]) => (
                  <span key={v} onClick={() => { setConfig({ auto_estrategia: v }); autoSelecionar(v) }} style={{ fontSize: 10.5, fontWeight: 700, padding: '6px 12px', borderRadius: 99, cursor: autoSel ? 'default' : 'pointer', color: cfg.auto_estrategia === v ? '#fff' : 'var(--dim)', background: cfg.auto_estrategia === v ? `linear-gradient(135deg,var(--accent2),var(--accent))` : 'rgba(255,255,255,.04)', border: `1px solid ${cfg.auto_estrategia === v ? 'transparent' : 'var(--glass-border)'}` }}>{lb}</span>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 8.5, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)', marginBottom: 6 }}>Critério da fila</div>
              <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,.3)', border: '1px solid var(--glass-border)', borderRadius: 11, padding: 3 }}>
                {[['prioridade', 'Prioridade'], ['saldo', 'Saldo'], ['margem', 'Margem']].map(([v, lb]) => (
                  <b key={v} onClick={() => setConfig({ criterio: v })} style={{ fontSize: 11, fontWeight: 800, padding: '6px 13px', borderRadius: 8, cursor: 'pointer', color: cfg.criterio === v ? '#fff' : 'var(--dim)', background: cfg.criterio === v ? 'linear-gradient(135deg,var(--accent),rgba(214,0,127,.6))' : 'transparent' }}>{lb}</b>
                ))}
              </div>
            </div>
          </div>
          <div className="row" style={{ display: 'flex', gap: 10, marginBottom: 15, flexWrap: 'wrap' }}>
            <MiniCard label="Máx. simultâneo" value="5" tag="limite Shopee" />
            <MiniCard label="Duração por boost" value="4h" tag="fixo Shopee" />
            <MiniCard label="Auto-seleção · teto" value={cfg.auto_maximo ?? 30} tag="produtos" cor={PURPLE} />
            <MiniCard label="Fixos (pin)" value={`${cfg.fixos ?? 0}/5`} cor={GOLD} />
          </div>

          {/* heatmap */}
          <div style={{ fontSize: 8.5, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={11} />Janela × horário de pico da loja <span style={{ color: OK, textTransform: 'none', fontWeight: 700 }}>(pedidos por hora, 30d)</span></div>
          {(() => {
            const janelas = (cfg.janelas && cfg.janelas.length) ? cfg.janelas : ((cfg.janela_inicio || cfg.janela_fim) ? [[cfg.janela_inicio, cfg.janela_fim]] : [])
            const diaTodo = janelas.length === 0
            return (
              <>
                <Heatmap pico={pico} janelas={janelas} diaTodo={diaTodo} />
                <div className="row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7.5, color: 'var(--faint)', marginTop: 4, marginBottom: 12 }}><span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span></div>
                <div className="row" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 9 }}>
                  <span style={{ fontSize: 8.5, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)' }}>Janelas de impulso</span>
                  {diaTodo ? <Badge c={OK} bg="rgba(47,217,141,.12)">dia todo</Badge>
                    : janelas.map((j, i) => (
                      <span key={i} className="row num" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, color: '#cfaef5', background: 'rgba(160,107,232,.14)', border: '1px solid rgba(160,107,232,.3)', borderRadius: 99, padding: '4px 6px 4px 11px' }}>{String(j[0]).padStart(2, '0')}h–{String(Math.min(j[1], 24)).padStart(2, '0')}h<X size={12} style={{ cursor: 'pointer', color: 'var(--faint)' }} onClick={() => setConfig({ janelas: janelas.filter((_, x) => x !== i) })} /></span>
                    ))}
                  <div style={{ flex: 1 }} />
                  {pico?.total > 0 && <button onClick={() => { const jp = janelasPico(pico); if (jp.length) setConfig({ janelas: jp }); else notify('Sem pico claro para sugerir.', 'warn') }} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 800, padding: '6px 11px', borderRadius: 9, cursor: 'pointer', color: '#fff', border: 'none', background: 'linear-gradient(135deg,var(--accent2),var(--accent))' }}><Sparkles size={11} />Aplicar pico da loja</button>}
                  <button onClick={() => setConfig({ janelas: null, janela_inicio: 0, janela_fim: 0 })} className="glass" style={{ fontSize: 10, fontWeight: 700, padding: '6px 11px', borderRadius: 9, cursor: 'pointer', color: 'var(--dim)', background: 'var(--glass-bg)' }}>Dia todo</button>
                </div>
                <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 9, color: 'var(--faint)' }}>adicionar janela:</span>
                  <input type="number" min={0} max={23} value={jnIni} onChange={(e) => setJnIni(Number(e.target.value))} className="num" style={{ width: 52, padding: '5px 8px', fontSize: 11, textAlign: 'center', background: 'rgba(0,0,0,.2)', border: '1px solid var(--glass-border)', borderRadius: 7, color: 'var(--text)' }} />
                  <span style={{ fontSize: 9, color: 'var(--faint)' }}>até</span>
                  <input type="number" min={1} max={24} value={jnFim} onChange={(e) => setJnFim(Number(e.target.value))} className="num" style={{ width: 52, padding: '5px 8px', fontSize: 11, textAlign: 'center', background: 'rgba(0,0,0,.2)', border: '1px solid var(--glass-border)', borderRadius: 7, color: 'var(--text)' }} />
                  <button onClick={() => { if (jnFim > jnIni) setConfig({ janelas: [...janelas, [jnIni, jnFim]] }); else notify('O fim deve ser maior que o início.', 'warn') }} style={{ fontSize: 10, fontWeight: 700, padding: '5px 11px', borderRadius: 8, cursor: 'pointer', color: '#fff', border: 'none', background: 'var(--accent)' }}>+ janela</button>
                </div>
                {(() => {
                  const jp = janelasPico(pico)
                  if (!pico?.total || !jp.length) {
                    return <div className="row" style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginTop: 12, background: 'rgba(160,107,232,.06)', border: '1px solid rgba(160,107,232,.2)', borderRadius: 11, padding: '10px 12px' }}><Sparkles size={13} style={{ color: PURPLE, flex: 'none', marginTop: 1 }} /><div style={{ fontSize: 10, color: 'var(--dim)' }}><b style={{ color: '#cfaef5' }}>Sugestão do agente:</b> assim que houver histórico de pedidos, o agente identifica os horários de pico que concentram suas vendas e você aplica a janela ideal com um clique.</div></div>
                  }
                  const horas = pico.horas || []
                  const totalPico = jp.reduce((s, [a, b]) => s + horas.slice(a, b).reduce((x, y) => x + y, 0), 0)
                  const pct = Math.round(totalPico / pico.total * 100)
                  const txt = jp.map(([a, b]) => `${String(a).padStart(2, '0')}h–${String(Math.min(b, 24)).padStart(2, '0')}h`).join(' e ')
                  const jaAplicado = JSON.stringify(janelas) === JSON.stringify(jp)
                  return (
                    <div className="row" style={{ display: 'flex', gap: 9, alignItems: 'center', marginTop: 12, background: 'rgba(160,107,232,.07)', border: '1px solid rgba(160,107,232,.22)', borderRadius: 11, padding: '10px 12px' }}>
                      <Sparkles size={14} style={{ color: PURPLE, flex: 'none' }} />
                      <div style={{ flex: 1, fontSize: 10, color: 'var(--dim)' }}><b style={{ color: '#cfaef5' }}>Sugestão do agente:</b> concentre a janela em <b style={{ color: 'var(--text)' }}>{txt}</b> — {pct}% das suas vendas acontecem nesses picos. Fora deles, o boost rende bem menos views.</div>
                      <button onClick={() => setConfig({ janelas: jp })} disabled={jaAplicado} style={{ fontSize: 10, fontWeight: 800, padding: '7px 12px', borderRadius: 9, cursor: jaAplicado ? 'default' : 'pointer', color: '#fff', border: 'none', background: jaAplicado ? 'rgba(255,255,255,.1)' : 'linear-gradient(135deg,var(--accent2),var(--accent))', flex: 'none', opacity: jaAplicado ? .6 : 1 }}>{jaAplicado ? 'aplicada' : 'Aplicar janela'}</button>
                    </div>
                  )
                })()}
              </>
            )
          })()}
        </div>

        {/* DESEMPENHO / CAMPEÕES */}
        <div className="glass" style={{ padding: 16 }}>
          <Secao icon={TrendingUp} cor={OK} titulo="Desempenho · vendas com e sem destaque" extra={<><div style={{ flex: 1 }} />{(() => { const s = hist?.serie || []; const tot = s.reduce((a, d) => a + d.total, 0); const bo = s.reduce((a, d) => a + d.boost, 0); return bo > 0 ? <Badge c={OK} bg="rgba(47,217,141,.12)">{Math.round(bo / Math.max(tot, 1) * 100)}% via destaque</Badge> : null })()}</>} />
          <DesempenhoChart serie={hist?.serie} />
          <div className="row" style={{ display: 'flex', gap: 13, fontSize: 9, color: 'var(--faint)', margin: '8px 0 14px', flexWrap: 'wrap' }}>
            <span className="row" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 4, borderRadius: 2, background: OK }} />vendas em período de boost</span>
            <span className="row" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.28)' }} />total de vendas</span>
          </div>
          <div style={{ fontSize: 8.5, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)', marginBottom: 8 }}>Campeões do destaque · 30d{kpis.tem_vendas ? <span className="num" style={{ color: 'var(--faint)', fontWeight: 700 }}> · {kpis.vendas_30d} un</span> : null}</div>
          {!kpis.tem_vendas ? <Empty icon={TrendingUp} texto="Estamos sincronizando o histórico de pedidos da Shopee. Os campeões aparecem assim que os dados chegam." />
            : (p?.campeoes || []).length === 0 ? <Empty icon={Trophy} texto="Sem vendas registradas nos produtos do boost ainda." />
              : (
                <div>
                  {(p?.campeoes || []).map((c, i) => {
                    const max = p.campeoes[0].vendas || 1
                    return (
                      <div key={c.item_id} className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                        <span style={{ width: 18, textAlign: 'center', fontSize: 12, fontWeight: 800, color: i === 0 ? GOLD : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--faint)' }}>{i + 1}º</span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: 'var(--dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nome}</span>
                        <div style={{ width: 120, height: 14, borderRadius: 7, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}><div style={{ width: `${c.vendas / max * 100}%`, height: '100%', borderRadius: 7, background: `linear-gradient(90deg,rgba(47,217,141,.5),${OK})` }} /></div>
                        <b className="num" style={{ width: 52, textAlign: 'right', fontSize: 11, color: OK }}>{c.vendas} un</b>
                      </div>
                    )
                  })}
                </div>
              )}
          <div style={{ fontSize: 9.5, color: 'var(--faint)', display: 'flex', gap: 6, marginTop: 12, paddingTop: 11, borderTop: '1px solid var(--glass-border)' }}>
            <Info size={12} style={{ color: PURPLE, flex: 'none', marginTop: 1 }} />O agente aprende quem converte no destaque e prioriza os campeões — sem tirar a vez dos demais da fila.
          </div>
        </div>
      </div>

      {/* ===== FILA ===== */}
      <div className="glass" style={{ padding: 16, marginBottom: 14 }}>
        <Secao icon={Package} cor={PURPLE} titulo={<>Fila inteligente <span className="num" style={{ color: 'var(--faint)' }}>{(p?.fila || []).length} produtos</span></>} extra={<><Badge c={PURPLE} bg="rgba(160,107,232,.14)">ORDENADA POR {(cfg.criterio || 'prioridade').toUpperCase()}</Badge>{(kpis.nao_elegiveis ?? 0) > 0 && <Badge c={DANGER} bg="rgba(255,122,122,.12)"><AlertTriangle size={8} />{kpis.nao_elegiveis} não elegíveis</Badge>}{(kpis.preco_alerta ?? 0) > 0 && <Badge c={DANGER} bg="rgba(255,122,122,.12)">{kpis.preco_alerta} preço abaixo</Badge>}<div style={{ flex: 1 }} /><button onClick={() => setSeletorAberto(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, padding: '7px 12px', borderRadius: 9, cursor: 'pointer', color: '#fff', border: 'none', background: `linear-gradient(135deg,${SHOPEE},#c0341c)`, marginRight: 7 }}><PackagePlus size={12} />Adicionar produto</button><button onClick={() => autoSelecionar()} disabled={autoSel} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, padding: '7px 12px', borderRadius: 9, cursor: 'pointer', color: '#e9dbfb', border: '1px solid rgba(160,107,232,.45)', background: 'linear-gradient(135deg,rgba(160,107,232,.22),rgba(214,0,127,.16))' }}>{autoSel ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}Renovar auto-seleção</button></>} />
        <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px', borderRadius: 9, background: 'rgba(0,0,0,.2)', border: '1px solid var(--glass-border)', width: 240 }}>
            <Search size={12} style={{ color: 'var(--faint)' }} />
            <input value={filaBusca} onChange={(e) => { setFilaBusca(e.target.value); setFilaPag(0) }} placeholder="Buscar produto na fila…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 11 }} />
            {filaBusca && <X size={12} style={{ color: 'var(--faint)', cursor: 'pointer' }} onClick={() => setFilaBusca('')} />}
          </div>
          <div style={{ flex: 1 }} />
          {[['todos', 'Todos'], ['auto', 'Automáticos'], ['manual', 'Manuais'], ['fixos', 'Fixos ★']].map(([k, lbl]) => (
            <span key={k} onClick={() => { setFilaFiltro(k); setFilaPag(0) }} style={{ fontSize: 10.5, fontWeight: 700, padding: '6px 11px', borderRadius: 99, cursor: 'pointer', color: filaFiltro === k ? '#fff' : 'var(--dim)', background: filaFiltro === k ? 'linear-gradient(135deg,var(--accent2),var(--accent))' : 'rgba(255,255,255,.04)', border: `1px solid ${filaFiltro === k ? 'transparent' : 'var(--glass-border)'}` }}>{lbl}</span>
          ))}
        </div>
        {filaFiltrada.length === 0 ? <Empty icon={Package} texto={filaBusca || filaFiltro !== 'todos' ? 'Nenhum produto encontrado com esse filtro.' : 'Fila vazia. Ative a auto-seleção ou adicione produtos manualmente.'} />
          : filaVisiveis.map((f) => {
            const isA = f.auto
            const abcCor = f.abc === 'A' ? OK : f.abc === 'B' ? GOLD : DANGER
            const ineleg = f.elegivel === false
            return (
              <div key={f.item_id} className="glass lift" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 13, marginBottom: 8, borderLeft: `3px solid ${ineleg ? DANGER : isA ? PURPLE : WARN}`, opacity: ineleg ? .55 : 1 }}>
                <span className="num" style={{ width: 20, textAlign: 'center', fontSize: 12, fontWeight: 800, color: 'var(--faint)' }}>{f.prioridade}</span>
                <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', flex: 'none', background: 'linear-gradient(135deg,rgba(238,77,45,.25),rgba(160,107,232,.2))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{f.imagem ? <img src={f.imagem} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={17} style={{ color: 'var(--dim)' }} />}</div>
                <div style={{ flex: 1.7, minWidth: 0 }}>
                  <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 8, fontWeight: 900, width: 16, height: 16, borderRadius: 5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none', color: f.abc === 'B' ? '#0d0d0d' : '#fff', background: abcCor }}>{f.abc}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.nome}</span>
                  </div>
                  <div className="row" style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                    <Badge c={isA ? PURPLE : WARN} bg={isA ? 'rgba(160,107,232,.14)' : 'rgba(224,162,60,.14)'}>{isA ? 'auto' : 'manual'}</Badge>
                    {f.em_oferta && <Badge c={SHOPEE} bg="rgba(238,77,45,.14)">em oferta</Badge>}
                    {f.preco_status === 'ok' && <Badge c={OK} bg="rgba(47,217,141,.13)"><Check size={8} />preço na régua</Badge>}
                    {f.preco_status === 'abaixo' && <Badge c={DANGER} bg="rgba(255,122,122,.14)"><AlertTriangle size={8} />preço abaixo{f.preco_sugerido ? ` · ideal R$ ${f.preco_sugerido}` : ''}</Badge>}
                    {f.preco_status === 'acima' && <Badge c={BLUE} bg="rgba(91,141,239,.14)">preço acima{f.preco_sugerido ? ` · ideal R$ ${f.preco_sugerido}` : ''}</Badge>}
                    {ineleg && <Badge c={DANGER} bg="rgba(255,122,122,.14)"><AlertTriangle size={8} />{f.motivo_ineleg || 'não elegível'}</Badge>}
                    <span className="num" style={{ fontSize: 8.5, color: 'var(--faint)' }}>giro {f.giro}/dia · {f.impulsos} impulsos{f.estoque != null ? ` · ${f.estoque} un` : ''}</span>
                  </div>
                </div>
                <div style={{ width: 66, textAlign: 'right' }}><div style={{ fontSize: 7, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)' }}>Vendas 30d</div><b className="num" style={{ fontSize: 12.5, color: f.vendas > 0 ? OK : 'var(--faint)' }}>{f.vendas}</b></div>
                <div style={{ width: 70, textAlign: 'right' }}><div style={{ fontSize: 7, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)' }}>Entra em</div><b className="num" style={{ fontSize: 12, color: PURPLE }}>{f.entra_ciclos === 0 ? 'próximo' : `~${f.entra_ciclos * 4}h`}</b></div>
                <div className="row" style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <button onClick={() => moverNaFila(f.item_id, 'topo')} title="Mover para o topo" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 4px', lineHeight: 0 }}><ChevronsUp size={13} style={{ color: 'var(--dim)' }} /></button>
                  <button onClick={() => moverNaFila(f.item_id, 'cima')} title="Subir uma posição" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 4px', lineHeight: 0 }}><ChevronUp size={13} style={{ color: 'var(--faint)' }} /></button>
                </div>
                <button onClick={() => fixar(f.item_id, !f.fixo)} title="Fixar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Star size={14} style={{ color: f.fixo ? GOLD : 'var(--faint)' }} fill={f.fixo ? GOLD : 'none'} /></button>
                <button onClick={() => removerFila(f.item_id)} title="Remover" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={14} style={{ color: 'var(--faint)' }} /></button>
              </div>
            )
          })}
        {filaFiltrada.length > 0 && (
          <div className="row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12 }}>
            <button onClick={() => setFilaPag((x) => Math.max(0, x - 1))} disabled={pagAtual === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, padding: '6px 11px', borderRadius: 8, cursor: pagAtual === 0 ? 'default' : 'pointer', color: 'var(--dim)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', opacity: pagAtual === 0 ? .4 : 1 }}><ChevronRight size={13} style={{ transform: 'rotate(180deg)' }} />Anterior</button>
            <span className="num" style={{ fontSize: 10.5, color: 'var(--faint)' }}>{pagAtual * FILA_PP + 1}–{Math.min((pagAtual + 1) * FILA_PP, filaFiltrada.length)} de {filaFiltrada.length}{filaPaginas > 1 ? ` · pág. ${pagAtual + 1}/${filaPaginas}` : ''}</span>
            <button onClick={() => setFilaPag((x) => Math.min(filaPaginas - 1, x + 1))} disabled={pagAtual >= filaPaginas - 1} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, padding: '6px 11px', borderRadius: 8, cursor: pagAtual >= filaPaginas - 1 ? 'default' : 'pointer', color: 'var(--dim)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', opacity: pagAtual >= filaPaginas - 1 ? .4 : 1 }}>Próximo<ChevronRight size={13} /></button>
          </div>
        )}
        <div className="row" style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}><span style={{ fontSize: 9, color: 'var(--faint)' }}>a coluna "entra em" é estimada pela posição na fila × vagas de 4h</span></div>
      </div>

      {/* ===== HISTÓRICO & ATRIBUIÇÃO ===== */}
      <Historico hist={hist} />

      {/* ===== RADAR + DIÁRIO ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Radar radar={p?.radar} cfg={cfg} setConfig={setConfig} />
        <div className="glass" style={{ padding: 16 }}>
          <Secao icon={Clock} cor="var(--dim)" titulo="Diário de bordo do motor" extra={<><div style={{ flex: 1 }} /><Badge c="var(--faint)" bg="rgba(255,255,255,.05)">RECENTES</Badge></>} />
          {(p?.diario || []).length === 0 ? <Empty icon={Clock} texto="Sem eventos do motor ainda. Assim que ele impulsionar, entrar em espera ou pular um item, aparece aqui." />
            : (p?.diario || []).map((e, i) => {
              const t = (e.titulo || '').toLowerCase()
              const cor = e.tipo !== 'ok' ? WARN
                : (t.includes('radar') || t.includes('concorrente')) ? BLUE
                  : t.includes('vaga') ? GOLD
                    : (t.includes('impuls') || t.includes('rodíz') || t.includes('rodiz') || t.includes('auto') || t.includes('renov')) ? PURPLE
                      : OK
              return (
                <div key={i} className="row" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: i < (p.diario.length - 1) ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: cor, flex: 'none', marginTop: 5, boxShadow: `0 0 6px ${cor}66` }} />
                  <div style={{ flex: 1, fontSize: 10.5, color: 'var(--dim)', lineHeight: 1.5 }}><b style={{ color: 'var(--text)' }}>{e.titulo}</b>{e.texto ? ` — ${e.texto}` : ''}</div>
                  <span className="num" style={{ fontSize: 8.5, color: 'var(--faint)', flex: 'none', marginTop: 2 }}>{tempoRel(e.quando)}</span>
                </div>
              )
            })}
        </div>
      </div>

      {/* ===== INSIGHTS ===== */}
      {insights.length > 0 && (
        <div className="glass" style={{ padding: 16, border: '1px solid transparent', background: 'linear-gradient(var(--surface),var(--surface)) padding-box,linear-gradient(120deg,rgba(160,107,232,.45),rgba(214,0,127,.3),rgba(255,255,255,.06)) border-box' }}>
          <Secao icon={Sparkles} cor={PURPLE} titulo="Insights do agente de impulsionamento" extra={<><div style={{ flex: 1 }} /><Badge c="#cfaef5" bg="rgba(160,107,232,.15)">IA · DERIVADO DOS SEUS DADOS</Badge></>} />
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, insights.length)},1fr)`, gap: 12 }}>
            {insights.map((ins, i) => (
              <div key={i} className="glass lift" style={{ padding: 13, borderRadius: 13, borderLeft: `3px solid ${ins.cor}` }}>
                <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}><ins.icon size={13} style={{ color: ins.cor }} /><b style={{ fontSize: 11, color: ins.cor }}>{ins.titulo}</b></div>
                <div style={{ fontSize: 10.5, color: 'var(--dim)', lineHeight: 1.5 }}>{ins.texto}</div>
                {ins.acao && <button onClick={() => execInsight(ins)} style={{ marginTop: 9, fontSize: 10, fontWeight: 800, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', color: ins.cor === WARN || ins.cor === OK ? '#0d0d0d' : '#fff', border: 'none', background: ins.cor }}>{ins.acao}</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {seletorAberto && <SeletorProdutos jaNaFila={new Set((p?.fila || []).map((f) => String(f.item_id)))} onFechar={() => setSeletorAberto(false)} onAdicionar={adicionarProdutos} notify={notify} />}
    </div>
  )
}

/* ---------- Coins2 (ícone leve inline; evita import extra) ---------- */
function Coins2({ size = 12 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82" /></svg> }

function MiniCard({ label, value, tag, cor = 'var(--text)' }) {
  return (
    <div className="glass" style={{ padding: '9px 13px', borderRadius: 11, display: 'flex', alignItems: 'center', gap: 9 }}>
      <div><div style={{ fontSize: 7.5, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)' }}>{label}</div><b className="num" style={{ fontSize: 16, color: cor }}>{value}</b></div>
      {tag && <Badge c="var(--faint)" bg="rgba(255,255,255,.05)">{tag}</Badge>}
    </div>
  )
}

/* ---------- Timeline 24h (forecast do rodízio) ---------- */
function Timeline({ vagas, fila, decorrido }) {
  const start = Date.now(); const span = 24 * 3600000; const H = 3600000
  const laneH = 30, eixo = 20, altura = laneH * 5
  const filaNomes = fila.map((f) => f.nome).filter(Boolean)
  const blocks = []
  vagas.forEach((v, lane) => {
    let t = start
    if (v.ocupada) {
      const rem = v.termina_ms == null ? 2 * H : v.termina_ms - decorrido
      const fim = start + Math.max(5 * 60000, rem)
      blocks.push({ lane, a: start, b: fim, tipo: v.tipo, nome: v.nome, agora: true })
      t = fim
    }
    let k = 0
    while (t < start + span && k < 6) {
      const nome = filaNomes.length ? filaNomes[(lane + k) % filaNomes.length] : 'próximo da fila'
      blocks.push({ lane, a: t, b: Math.min(t + 4 * H, start + span), tipo: 'previsto', nome })
      t += 4 * H; k++
    }
  })
  const picos = []; const base = new Date(); base.setMinutes(0, 0, 0)
  for (let d = 0; d < 2; d++) {
    ;[[11, 14], [19, 22]].forEach(([h1, h2]) => {
      const a = new Date(base); a.setDate(a.getDate() + d); a.setHours(h1)
      const b = new Date(base); b.setDate(b.getDate() + d); b.setHours(h2)
      picos.push([a.getTime(), b.getTime()])
    })
  }
  const ag = new Date(start)
  return (
    <div style={{ marginTop: 15 }}>
      <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 8.5, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Calendar size={11} />Agenda do rodízio · próximas 24h</span>
        <span style={{ fontSize: 8.5, color: PURPLE, fontWeight: 700 }}>(estimada pela fila e janela de pico)</span>
        <div style={{ flex: 1 }} />
        <span className="row" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 8.5, color: 'var(--faint)' }}><span style={{ width: 9, height: 3, borderRadius: 2, background: 'rgba(160,107,232,.5)' }} />pico da loja</span>
        <span className="num" style={{ fontSize: 9, fontWeight: 800, color: SHOPEE }}>agora {String(ag.getHours()).padStart(2, '0')}:{String(ag.getMinutes()).padStart(2, '0')}</span>
      </div>
      <div className="row" style={{ display: 'flex', alignItems: 'stretch' }}>
        <div style={{ width: 28, flex: 'none', display: 'flex', flexDirection: 'column' }}>
          {[0, 1, 2, 3, 4].map((l) => <div key={l} style={{ height: laneH, display: 'flex', alignItems: 'center' }}><span className="num" style={{ fontSize: 7.5, fontWeight: 800, color: 'var(--faint)' }}>V{l + 1}</span></div>)}
        </div>
        <div style={{ flex: 1, position: 'relative', height: altura + eixo, background: 'rgba(0,0,0,.22)', borderRadius: 10, border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
          {picos.map(([a, b], i) => { const l = Math.max(0, (a - start) / span * 100), w = Math.min(100, (b - a) / span * 100); if (l > 100 || l + w < 0) return null; return <div key={'p' + i} style={{ position: 'absolute', top: 0, bottom: eixo, left: `${l}%`, width: `${w}%`, background: 'rgba(160,107,232,.07)', borderLeft: '1px dashed rgba(160,107,232,.3)', borderRight: '1px dashed rgba(160,107,232,.3)' }} /> })}
          {[0, 1, 2, 3, 4].map((l) => <div key={'l' + l} style={{ position: 'absolute', left: 0, right: 0, top: l * laneH, height: laneH, background: l % 2 ? 'rgba(255,255,255,.018)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,.04)' }} />)}
          {blocks.map((b, i) => {
            const l = Math.max(0, (b.a - start) / span * 100), r0 = Math.min(100, (b.b - start) / span * 100), w = Math.max(.6, r0 - l)
            const cor = b.agora ? (TIPOS[b.tipo] ? TIPOS[b.tipo][1] : PURPLE) : 'rgba(255,255,255,.14)'
            const bg = b.agora ? (b.tipo === 'auto' ? 'rgba(160,107,232,.42)' : b.tipo === 'radar' ? 'rgba(91,141,239,.42)' : 'rgba(224,162,60,.42)') : 'rgba(255,255,255,.05)'
            return <div key={i} title={b.nome} style={{ position: 'absolute', left: `${l}%`, width: `calc(${w}% - 2px)`, top: b.lane * laneH + 3, height: laneH - 6, borderRadius: 5, background: bg, border: `1px solid ${cor}`, overflow: 'hidden', display: 'flex', alignItems: 'center', paddingLeft: 5 }}>{w >= 8 && <span style={{ fontSize: 7.5, fontWeight: 700, color: b.agora ? 'var(--text)' : 'var(--faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.nome}</span>}</div>
          })}
          <div style={{ position: 'absolute', top: 0, bottom: eixo, left: 0, width: 2, background: SHOPEE, boxShadow: '0 0 8px rgba(238,77,45,.8)', zIndex: 3 }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: eixo, borderTop: '1px solid rgba(255,255,255,.06)', background: 'rgba(0,0,0,.2)' }}>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => { const t = new Date(start + i * 4 * H); return <span key={i} className="num" style={{ position: 'absolute', top: 5, left: `${i / 6 * 100}%`, transform: i === 0 ? 'none' : i === 6 ? 'translateX(-100%)' : 'translateX(-50%)', fontSize: 7.5, color: 'var(--faint)', paddingLeft: i === 0 ? 4 : 0 }}>{String(t.getHours()).padStart(2, '0')}h</span> })}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Heatmap ---------- */
function Heatmap({ pico, janelas, diaTodo }) {
  const horas = pico?.horas || []
  const total = pico?.total || 0
  if (!pico) return <Skel h={30} />
  if (total === 0) return <div style={{ padding: '14px 10px', textAlign: 'center', fontSize: 10, color: 'var(--faint)', background: 'rgba(0,0,0,.15)', borderRadius: 10 }}>Coletando histórico de horário dos pedidos — o mapa de calor aparece conforme os pedidos sincronizam.</div>
  const max = Math.max(...horas, 1)
  const pk = janelasPico(pico)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24,1fr)', gap: 3, marginBottom: 5 }}>
      {Array.from({ length: 24 }).map((_, h) => {
        const v = (horas[h] || 0) / max
        const ehPico = hEmJanelas(h, pk)
        const dentro = diaTodo || hEmJanelas(h, janelas)
        return <div key={h} title={`${h}h — ${horas[h] || 0} pedidos`} style={{ height: 30, borderRadius: 5, background: `rgba(238,77,45,${0.06 + v * 0.75})`, outline: ehPico ? '1.5px solid rgba(160,107,232,.55)' : 'none', outlineOffset: -1.5, opacity: dentro ? 1 : .22 }} />
      })}
    </div>
  )
}

/* ---------- Histórico & Atribuição ---------- */
/* ---------- Gráfico de desempenho (vendas com/sem destaque) ---------- */
function DesempenhoChart({ serie }) {
  const dados = serie || []
  const temDados = dados.some((d) => d.total > 0)
  if (!temDados) return <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--faint)', background: 'rgba(0,0,0,.15)', borderRadius: 10, textAlign: 'center', padding: 12 }}>Sem histórico de vendas ainda — o gráfico de desempenho aparece conforme os pedidos sincronizam e os primeiros boosts acontecem.</div>
  const W = 320, H = 110, pad = 6
  const n = dados.length
  const max = Math.max(...dados.map((d) => d.total), 1)
  const x = (i) => pad + (n <= 1 ? 0 : i / (n - 1) * (W - 2 * pad))
  const y = (v) => H - pad - (v / max) * (H - 2 * pad)
  const linha = (key) => dados.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ')
  const area = (key) => `${linha(key)} L${x(n - 1).toFixed(1)},${(H - pad).toFixed(1)} L${x(0).toFixed(1)},${(H - pad).toFixed(1)} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="gTot" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(255,255,255,.14)" /><stop offset="100%" stopColor="rgba(255,255,255,0)" /></linearGradient>
        <linearGradient id="gBoost" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(47,217,141,.4)" /><stop offset="100%" stopColor="rgba(47,217,141,0)" /></linearGradient>
      </defs>
      <path d={area('total')} fill="url(#gTot)" />
      <path d={linha('total')} fill="none" stroke="rgba(255,255,255,.32)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <path d={area('boost')} fill="url(#gBoost)" />
      <path d={linha('boost')} fill="none" stroke="#2FD98D" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/* ---------- Histórico & atribuição ---------- */
function Historico({ hist }) {
  const TIPO_COR = { auto: PURPLE, manual: WARN, radar: BLUE }
  if (!hist) return <div className="glass" style={{ padding: 16, marginBottom: 14 }}><Secao icon={TrendingUp} cor={OK} titulo="Histórico & atribuição de vendas" /><Skel h={60} /></div>
  const k = hist.kpis || {}
  const eventos = hist.eventos || []
  const resumo = hist.resumo || []
  const maxPB = Math.max(...resumo.map((x) => x.por_boost || 0), 1)
  return (
    <div className="glass" style={{ padding: 16, marginBottom: 14 }}>
      <Secao icon={TrendingUp} cor={OK} titulo="Histórico & atribuição de vendas" extra={<><Badge c={OK} bg="rgba(47,217,141,.12)">VENDAS DENTRO DA JANELA DE 4H</Badge><div style={{ flex: 1 }} /></>} />
      {eventos.length === 0 ? <Empty icon={TrendingUp} texto="Ainda não houve boost registrado. Cada impulso (automático ou manual) passa a ser gravado aqui, com as vendas que aconteceram durante as 4h em destaque." />
        : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 11, marginBottom: 15 }}>
              <MiniStat label="Boosts registrados" value={k.total_boosts ?? 0} />
              <MiniStat label="Vendas atribuídas" value={k.total_vendas_atrib ?? 0} cor={OK} />
              <MiniStat label="Vendas por boost" value={k.vendas_por_boost != null ? k.vendas_por_boost : '—'} cor={GOLD} />
              <MiniStat label="Produtos girados" value={k.produtos ?? 0} cor={PURPLE} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 8.5, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)', marginBottom: 10 }}>Retorno por produto (vendas / boost)</div>
                {resumo.slice(0, 6).map((r) => (
                  <div key={r.item_id} className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 10.5, color: 'var(--dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nome}</span>
                    <span className="num" style={{ fontSize: 8.5, color: 'var(--faint)' }}>{r.boosts}x</span>
                    <div style={{ width: 84, height: 13, borderRadius: 7, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}><div style={{ width: `${(r.por_boost || 0) / maxPB * 100}%`, height: '100%', borderRadius: 7, background: `linear-gradient(90deg,rgba(47,217,141,.5),${OK})` }} /></div>
                    <b className="num" style={{ width: 64, textAlign: 'right', fontSize: 10.5, color: r.por_boost ? OK : 'var(--faint)' }}>{r.por_boost != null ? `${r.por_boost}/boost` : '—'}</b>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 8.5, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)', marginBottom: 10 }}>Boosts recentes</div>
                <div style={{ maxHeight: 200, overflow: 'auto' }}>
                  {eventos.slice(0, 14).map((e, i) => (
                    <div key={i} className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < Math.min(13, eventos.length - 1) ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: TIPO_COR[e.tipo] || PURPLE, flex: 'none' }} title={e.tipo} />
                      <span style={{ flex: 1, minWidth: 0, fontSize: 10, color: 'var(--dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.nome}</span>
                      {e.vendas != null ? <Badge c={e.vendas > 0 ? OK : 'var(--faint)'} bg={e.vendas > 0 ? 'rgba(47,217,141,.12)' : 'rgba(255,255,255,.05)'}>{e.vendas} vendas</Badge> : <Badge c="var(--faint)" bg="rgba(255,255,255,.05)">s/ atrib.</Badge>}
                      <span className="num" style={{ fontSize: 8, color: 'var(--faint)', flex: 'none' }}>{tempoRel(e.inicio)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 9, color: 'var(--faint)', display: 'flex', gap: 6, marginTop: 12, paddingTop: 11, borderTop: '1px solid var(--glass-border)' }}>
              <Info size={11} style={{ color: OK, flex: 'none', marginTop: 1 }} />Atribuição real: contamos as unidades vendidas de cada produto <b style={{ color: 'var(--text)', margin: '0 3px' }}>dentro</b> da janela de 4h em que esteve em destaque. Boosts sem venda no período aparecem sem atribuição.
            </div>
          </>
        )}
    </div>
  )
}

/* ---------- Radar ---------- */
function Radar({ radar, cfg, setConfig }) {
  const c = cfg || {}
  const diag = radar?.diagnostico || {}
  const ameacados = radar?.ameacados || []
  const sinais = radar?.sinais || []
  const SINAL = { estoque: [WARN, 'rgba(224,162,60,.14)', Boxes, 'Prestes a esgotar'], surto: [OK, 'rgba(47,217,141,.14)', TrendingUp, 'Surto de vendas'] }
  const Gatilho = ({ on, onClick, label }) => (
    <span onClick={onClick} className="row" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '5px 10px', borderRadius: 99, color: on ? '#fff' : 'var(--dim)', background: on ? 'linear-gradient(135deg,var(--accent2),var(--accent))' : 'rgba(255,255,255,.04)', border: `1px solid ${on ? 'transparent' : 'var(--glass-border)'}` }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: on ? '#fff' : 'var(--faint)' }} />{label}
    </span>
  )
  return (
    <div className="glass" style={{ padding: 16, borderColor: 'rgba(91,141,239,.3)' }}>
      <Secao icon={RadarIcon} cor={BLUE} titulo="Boost condicional · Radar" extra={<><Badge c={BLUE} bg="rgba(91,141,239,.14)">FURA A FILA POR PRIORIDADE</Badge><div style={{ flex: 1 }} /></>} />
      {/* gatilhos */}
      <div className="row" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginBottom: 13 }}>
        <span style={{ fontSize: 8.5, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)', marginRight: 2 }}>Gatilhos</span>
        <Gatilho on={!!c.cond_ativo} onClick={() => setConfig({ cond_ativo: !c.cond_ativo })} label="Concorrente furou preço" />
        <Gatilho on={!!c.cond_estoque} onClick={() => setConfig({ cond_estoque: !c.cond_estoque })} label="Prestes a esgotar" />
        <Gatilho on={!!c.cond_surto} onClick={() => setConfig({ cond_surto: !c.cond_surto })} label="Surto de vendas" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
        <MiniStat label="Monitorados" value={diag.skus_monitorados ?? 0} />
        <MiniStat label="Com concorrente" value={diag.com_preco_concorrente ?? diag.com_preco_meu ?? 0} cor={BLUE} />
        <MiniStat label="Sob ameaça" value={ameacados.length} cor={ameacados.length ? DANGER : OK} />
        <MiniStat label="Sinais ao vivo" value={sinais.length} cor={sinais.length ? WARN : OK} />
      </div>
      {/* sinais ao vivo */}
      {sinais.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {sinais.slice(0, 5).map((s, i) => {
            const sc = SINAL[s.tipo] || SINAL.estoque
            const ScIcon = sc[2]
            return (
              <div key={i} className="row" style={{ display: 'flex', alignItems: 'center', gap: 9, background: sc[1], border: `1px solid ${sc[0]}44`, borderRadius: 11, padding: '9px 12px', marginBottom: 7 }}>
                <ScIcon size={14} style={{ color: sc[0], flex: 'none' }} />
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nome}</div><div className="num" style={{ fontSize: 8.5, color: 'var(--faint)' }}>{s.detalhe}</div></div>
                <Badge c={sc[0]} bg="rgba(255,255,255,.06)">{sc[3]}</Badge>
              </div>
            )
          })}
        </div>
      )}
      {ameacados.length === 0 && sinais.length === 0 ? (
        <div className="row" style={{ display: 'flex', gap: 10, background: 'rgba(47,217,141,.06)', border: '1px solid rgba(47,217,141,.22)', borderRadius: 12, padding: '12px 15px' }}>
          <Check size={16} style={{ color: OK, flex: 'none' }} />
          <div style={{ flex: 1 }}><b style={{ fontSize: 11.5, color: OK }}>Tudo sob controle</b><div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>Se um concorrente furar o preço, um produto estiver prestes a esgotar ou houver surto de vendas, o Radar coloca esse item em boost prioritário na frente da fila — pelos gatilhos ligados acima.</div></div>
        </div>
      ) : ameacados.slice(0, 3).map((a, i) => (
        <div key={i} className="row" style={{ display: 'flex', gap: 10, background: 'rgba(255,122,122,.06)', border: '1px solid rgba(255,122,122,.25)', borderRadius: 11, padding: '10px 12px', marginBottom: 7 }}>
          <ShieldAlert size={15} style={{ color: DANGER, flex: 'none' }} />
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nome || a.sku || a.item_id}</div><div className="num" style={{ fontSize: 8.5, color: 'var(--faint)' }}>{a.detalhe || 'concorrente furou o preço'}</div></div>
          <Badge c={DANGER} bg="rgba(255,122,122,.14)">AMEAÇA</Badge>
        </div>
      ))}
      {radar?.erro && <div style={{ fontSize: 9, color: 'var(--faint)', marginTop: 8 }}>Radar de preço indisponível: {radar.erro}</div>}
    </div>
  )
}
function MiniStat({ label, value, cor = 'var(--text)' }) {
  return <div className="glass" style={{ padding: '10px 12px', borderRadius: 11 }}><div style={{ fontSize: 7.5, textTransform: 'uppercase', fontWeight: 800, color: 'var(--faint)' }}>{label}</div><b className="num" style={{ fontSize: 17, color: cor }}>{value}</b></div>
}

/* ---------- utils ---------- */
function tempoRel(iso) {
  if (!iso) return ''
  const d = new Date(iso), diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'agora'
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`
  return `há ${Math.floor(diff / 86400)}d`
}
function derivarInsights(p, pico) {
  const out = []
  const campeoes = p?.campeoes || []
  const fila = p?.fila || []
  // campeão descoberto
  if (campeoes[0] && campeoes[0].vendas >= 8) {
    out.push({ icon: Trophy, cor: OK, titulo: 'Campeão do destaque', texto: `"${campeoes[0].nome}" lidera com ${campeoes[0].vendas} vendas em 30 dias. Fixar como pin garante presença em todas as janelas de pico.`, acao: 'Fixar produto ★', acaoTipo: 'fixar', acaoArg: campeoes[0].item_id })
  }
  // vaga desperdiçada: item com impulsos e 0 vendas
  const desperd = fila.find((f) => (f.impulsos || 0) >= 2 && (f.vendas || 0) === 0)
  if (desperd) {
    out.push({ icon: AlertTriangle, cor: WARN, titulo: 'Vaga desperdiçada', texto: `"${desperd.nome}" já teve ${desperd.impulsos} impulsos e 0 vendas. Vale revisar preço/foto ou dar a vez ao próximo da fila.`, acao: 'Remover da fila', acaoTipo: 'remover', acaoArg: desperd.item_id })
  }
  // janela ociosa: heatmap com horas fracas dentro da janela
  if (pico && pico.total > 0) {
    const horas = pico.horas || []
    const madruga = horas.slice(2, 6).reduce((a, b) => a + b, 0)
    const total = horas.reduce((a, b) => a + b, 0) || 1
    if (madruga / total < 0.08 && janelasPico(pico).length) {
      out.push({ icon: Clock, cor: BLUE, titulo: 'Janela ociosa', texto: `Entre 02h e 06h saem só ${Math.round(madruga / total * 100)}% dos seus pedidos. Concentrar a janela nos horários de pico rende mais views por impulso.`, acao: 'Otimizar janela', acaoTipo: 'janela' })
    }
  }
  // boost + promoção: exposição dobrada (informativo)
  const emOferta = (p?.kpis || {}).em_oferta || 0
  if (emOferta > 0) {
    out.push({ icon: Sparkles, cor: SHOPEE, titulo: 'Exposição dobrada', texto: `${emOferta} produto(s) da fila já têm oferta ativa. Impulsionar quem está em promoção multiplica a conversão — eles aparecem marcados como "em oferta".` })
  }
  return out.slice(0, 3)
}

/* ---------- Seletor de produtos do catálogo (adicionar à fila) ---------- */
function SeletorProdutos({ jaNaFila, onFechar, onAdicionar, notify }) {
  const [itens, setItens] = useState([])
  const [offset, setOffset] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [temMais, setTemMais] = useState(true)
  const [busca, setBusca] = useState('')
  const [sel, setSel] = useState(new Set())

  const carregar = (off) => {
    setCarregando(true)
    api.shopeeProdutos(off, 50).then((r) => {
      const lista = ((r && r.response && r.response.item) || []).map((it) => ({
        item_id: String(it.item_id), nome: it.item_name || `#${it.item_id}`, sku: it.item_sku,
        imagem: it.image, preco: it.price, estoque: it.stock,
      }))
      setItens((old) => (off === 0 ? lista : [...old, ...lista]))
      setTemMais(lista.length >= 50)
      setOffset(off + lista.length)
    }).catch((e) => notify(e.message, 'danger')).finally(() => setCarregando(false))
  }
  useEffect(() => { carregar(0) }, [])

  const q = busca.trim().toLowerCase()
  const filtrados = q ? itens.filter((it) => (it.nome || '').toLowerCase().includes(q) || (it.sku || '').toLowerCase().includes(q)) : itens
  const toggle = (id) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const confirmar = () => {
    const escolhidos = itens.filter((it) => sel.has(it.item_id)).map((it) => ({ item_id: it.item_id, nome: it.nome }))
    if (!escolhidos.length) { notify('Selecione ao menos um produto.', 'warn'); return }
    onAdicionar(escolhidos); onFechar()
  }

  return (
    <div onClick={onFechar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(760px,96vw)', maxHeight: '86vh', display: 'flex', flexDirection: 'column', background: 'var(--surface)', borderRadius: 18, border: '1px solid var(--glass-border)', boxShadow: '0 30px 80px rgba(0,0,0,.5)' }}>
        <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '15px 18px', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(145deg,${SHOPEE},#a52c15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><PackagePlus size={18} color="#fff" /></div>
          <div style={{ flex: 1 }}><div className="serif" style={{ fontSize: 16, fontWeight: 800 }}>Adicionar produtos à fila</div><div style={{ fontSize: 10.5, color: 'var(--dim)' }}>escolha do seu catálogo Shopee quais quer impulsionar</div></div>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} style={{ color: 'var(--dim)' }} /></button>
        </div>
        <div style={{ padding: '12px 18px' }}>
          <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(0,0,0,.2)', border: '1px solid var(--glass-border)' }}>
            <Search size={14} style={{ color: 'var(--faint)' }} />
            <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou SKU nos produtos carregados…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 13 }} />
            {busca && <X size={13} style={{ color: 'var(--faint)', cursor: 'pointer' }} onClick={() => setBusca('')} />}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '0 18px 12px' }}>
          {carregando && itens.length === 0 ? <div style={{ display: 'grid', gap: 8 }}>{[0, 1, 2, 3, 4].map((i) => <Skel key={i} h={54} />)}</div>
            : filtrados.length === 0 ? <Empty icon={Search} texto={busca ? 'Nenhum produto encontrado para essa busca.' : 'Nenhum produto disponível.'} />
              : filtrados.map((it) => {
                const jaTem = jaNaFila.has(it.item_id)
                const marcado = sel.has(it.item_id)
                return (
                  <div key={it.item_id} onClick={() => !jaTem && toggle(it.item_id)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 12, marginBottom: 7, cursor: jaTem ? 'default' : 'pointer', background: marcado ? 'rgba(238,77,45,.12)' : 'rgba(255,255,255,.03)', border: `1px solid ${marcado ? 'rgba(238,77,45,.5)' : 'var(--glass-border)'}`, opacity: jaTem ? .5 : 1 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flex: 'none', background: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{it.imagem ? <img src={it.imagem} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={18} style={{ color: 'var(--faint)' }} />}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.nome}</div>
                      <div className="num" style={{ fontSize: 9, color: 'var(--faint)' }}>{it.sku ? `SKU ${it.sku} · ` : ''}{it.preco != null ? `R$ ${it.preco} · ` : ''}{it.estoque != null ? `${it.estoque} un` : ''}</div>
                    </div>
                    {jaTem ? <Badge c="var(--faint)" bg="rgba(255,255,255,.05)">na fila</Badge>
                      : <span style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${marcado ? SHOPEE : 'var(--faint)'}`, background: marcado ? SHOPEE : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{marcado && <Check size={13} color="#fff" />}</span>}
                  </div>
                )
              })}
          {temMais && !busca && itens.length > 0 && <div className="row" style={{ display: 'flex', justifyContent: 'center', padding: 8 }}><button onClick={() => carregar(offset)} disabled={carregando} style={{ fontSize: 11, fontWeight: 700, padding: '7px 16px', borderRadius: 9, cursor: 'pointer', color: 'var(--dim)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>{carregando ? <Loader2 size={12} className="animate-spin" /> : 'Carregar mais produtos'}</button></div>}
        </div>
        <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', borderTop: '1px solid var(--glass-border)' }}>
          <span style={{ fontSize: 11, color: 'var(--dim)' }}>{sel.size} selecionado(s)</span>
          <div style={{ flex: 1 }} />
          <button onClick={onFechar} style={{ fontSize: 12, fontWeight: 700, padding: '9px 15px', borderRadius: 10, cursor: 'pointer', color: 'var(--dim)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>Cancelar</button>
          <button onClick={confirmar} disabled={!sel.size} style={{ fontSize: 12, fontWeight: 800, padding: '9px 17px', borderRadius: 10, cursor: 'pointer', color: '#fff', border: 'none', background: `linear-gradient(135deg,${SHOPEE},#c0341c)`, opacity: sel.size ? 1 : .5 }}>Adicionar {sel.size || ''} à fila</button>
        </div>
      </div>
    </div>
  )
}
