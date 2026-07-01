import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Package, MapPin, Download, RefreshCw, Search, Plug, Loader2, Truck,
  ChevronDown, ChevronUp, User, ExternalLink, CheckCircle2, Zap, Check,
  AlertTriangle, TrendingUp, Printer, Wallet, DollarSign, Tag, Clock, X,
} from 'lucide-react'
import { api } from './api.js'
import { useToast } from './toast.jsx'

const ML = '#F2C200'
const brl = (v) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
const brl0 = (v) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }))

const FILTROS = [
  { id: 'paid', label: 'A enviar' },
  { id: 'confirmed', label: 'Confirmados' },
  { id: 'cancelled', label: 'Cancelados' },
  { id: '', label: 'Todos' },
]
const PERIODOS = [{ id: 7, label: '7d' }, { id: 15, label: '15d' }, { id: 30, label: '30d' }]
const ESCOPOS = [{ id: 'tudo', label: 'Tudo' }, { id: 'pedido', label: '# Pedido' }, { id: 'comprador', label: 'Comprador' }, { id: 'produto', label: 'Produto / SKU' }]

const ST_PEDIDO = {
  paid: { t: 'Pago', c: 'var(--ok)' },
  confirmed: { t: 'Confirmado', c: 'var(--dim)' },
  payment_required: { t: 'Aguardando pgto', c: 'var(--warn)' },
  payment_in_process: { t: 'Processando pgto', c: 'var(--warn)' },
  partially_paid: { t: 'Parcial', c: 'var(--warn)' },
  cancelled: { t: 'Cancelado', c: 'var(--danger)' },
  invalid: { t: 'Inválido', c: 'var(--danger)' },
}
const ST_ENVIO = {
  pending: { t: 'Pendente', c: 'var(--warn)' },
  handling: { t: 'Preparando', c: 'var(--warn)' },
  ready_to_ship: { t: 'Pronto p/ enviar', c: 'var(--accent)' },
  shipped: { t: 'Enviado', c: 'var(--ok)' },
  delivered: { t: 'Entregue', c: 'var(--ok)' },
  not_delivered: { t: 'Não entregue', c: 'var(--danger)' },
  cancelled: { t: 'Cancelado', c: 'var(--danger)' },
}

function dataBR(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
}
function dataHora(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d) ? '' : d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function horasDesde(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return isNaN(d) ? null : (Date.now() - d.getTime()) / 3600000
}
function moneyCor(liq, margem) {
  if (liq != null && liq < 0) return 'var(--danger)'
  if (margem != null && margem < 15) return 'var(--warn)'
  return 'var(--ok)'
}
function extrairDestino(env) {
  if (!env) return null
  const ra = env.receiver_address || env.destination?.receiver_address || env.destination?.shipping_address || {}
  const dest = env.destination || {}
  const nome = ra.receiver_name || dest.receiver_name || ra.name || ''
  const cidade = ra.city?.name || ra.city || dest.city?.name || ''
  const estado = ra.state?.name || ra.state?.id || ra.state || dest.state?.name || ''
  const cep = ra.zip_code || dest.zip_code || ''
  const linha = ra.address_line || [ra.street_name, ra.street_number].filter(Boolean).join(', ')
  const bairro = ra.neighborhood?.name || ra.neighborhood || ''
  const compl = ra.comment || ra.address_line_secondary || ''
  return { nome, linha, bairro, cidade, estado, cep, compl }
}

export default function Pedidos() {
  const notify = useToast()
  const [conn, setConn] = useState(null)
  const [filtro, setFiltro] = useState('paid')
  const [periodo, setPeriodo] = useState(15)
  const [escopo, setEscopo] = useState('tudo')
  const [busca, setBusca] = useState('')
  const [pedidos, setPedidos] = useState(null)
  const [paging, setPaging] = useState({ total: 0 })
  const [offset, setOffset] = useState(0)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [ativo, setAtivo] = useState(null)
  const [sel, setSel] = useState(() => new Set())
  const [envios, setEnvios] = useState({})
  const [baixando, setBaixando] = useState('')

  const checar = useCallback(() => {
    api.mlConta().then((d) => setConn(d?.conta ? d : { conta: false })).catch(() => setConn({ conta: false }))
  }, [])
  useEffect(() => { checar() }, [checar])

  const desdeISO = useCallback(() => { const d = new Date(); d.setDate(d.getDate() - periodo); return d.toISOString() }, [periodo])

  const carregar = useCallback(async (off = 0, append = false) => {
    if (!append) { setPedidos(null); setSel(new Set()); setAtivo(null) }
    try {
      const d = await api.mlPedidosEnriquecido(filtro, off, 30, desdeISO())
      const arr = d.pedidos || []
      setPaging(d.paging || { total: arr.length })
      setOffset(off)
      setPedidos((prev) => (append ? [...(prev || []), ...arr] : arr))
    } catch (e) {
      notify(e.message, 'danger'); if (!append) setPedidos([])
    }
  }, [filtro, desdeISO, notify])

  useEffect(() => { if (conn?.conta) carregar(0, false) }, [conn?.conta, carregar])

  const abrir = async (p) => {
    if (ativo === p.id) { setAtivo(null); return }
    setAtivo(p.id)
    const sid = p.shipping_id
    if (sid && !envios[sid]) {
      setEnvios((e) => ({ ...e, [sid]: 'loading' }))
      try { const env = await api.mlEnvio(sid); setEnvios((e) => ({ ...e, [sid]: env })) }
      catch { setEnvios((e) => ({ ...e, [sid]: 'erro' })) }
    }
  }

  const baixarEtiqueta = async (sid, chave = '') => {
    if (!sid) return
    setBaixando(chave || sid)
    try {
      const url = await api.mlEtiqueta(sid, 'pdf')
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (e) {
      notify('Etiqueta indisponível: ' + (e.message || '') + ' (envios Full são etiquetados pelo próprio ML)', 'danger')
    }
    setBaixando('')
  }

  const carregarMais = async () => { setCarregandoMais(true); await carregar(offset + 30, true); setCarregandoMais(false) }

  const filtrada = useMemo(() => (pedidos || []).filter((p) => {
    if (!busca.trim()) return true
    const t = busca.toLowerCase()
    const id = String(p.id).toLowerCase()
    const comp = (p.buyer?.nickname || '').toLowerCase()
    const prod = (p.itens || []).map((it) => (it.titulo || '') + ' ' + (it.sku || '')).join(' ').toLowerCase()
    if (escopo === 'pedido') return id.includes(t)
    if (escopo === 'comprador') return comp.includes(t)
    if (escopo === 'produto') return prod.includes(t)
    return id.includes(t) || comp.includes(t) || prod.includes(t)
  }), [pedidos, busca, escopo])

  const selecionaveis = useMemo(() => filtrada.filter((p) => p.shipping_id), [filtrada])
  const todosSel = selecionaveis.length > 0 && selecionaveis.every((p) => sel.has(p.id))
  const toggleTodos = () => setSel(() => (todosSel ? new Set() : new Set(selecionaveis.map((p) => p.id))))
  const toggleSel = (id) => setSel((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const idsLote = useMemo(() => (pedidos || []).filter((p) => sel.has(p.id) && p.shipping_id).map((p) => p.shipping_id), [pedidos, sel])

  const imprimirLote = async () => {
    if (!idsLote.length) return
    setBaixando('lote')
    try {
      const url = await api.mlEtiqueta(idsLote.join(','), 'pdf')
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (e) {
      notify('Não consegui gerar as etiquetas em lote: ' + (e.message || '') + ' — pedidos Full são etiquetados pelo próprio ML.', 'danger')
    }
    setBaixando('')
  }

  const stats = useMemo(() => {
    const arr = pedidos || []
    let receita = 0, tarifas = 0, custo = 0, liquido = 0, unidades = 0
    const porStatus = {}, porDia = {}
    arr.forEach((p) => {
      const r = p.resumo || {}
      receita += r.receita || 0; tarifas += r.tarifa || 0; custo += r.custo || 0
      liquido += r.liquido || 0; unidades += r.unidades || 0
      porStatus[p.status] = (porStatus[p.status] || 0) + 1
      const dia = (p.date_created || '').slice(0, 10)
      if (dia) porDia[dia] = (porDia[dia] || 0) + (r.receita || 0)
    })
    const n = arr.length
    const dias = Object.entries(porDia).sort((a, b) => a[0].localeCompare(b[0])).slice(-12)
    return {
      n, receita, tarifas, custo, liquido, unidades,
      ticket: n ? receita / n : 0,
      margem: receita > 0 ? liquido / receita * 100 : null,
      porStatus, dias,
    }
  }, [pedidos])

  const ativoPedido = useMemo(() => (pedidos || []).find((p) => p.id === ativo) || null, [pedidos, ativo])

  if (conn && !conn.conta) {
    return (
      <Shell>
        <div className="glass rounded-2xl p-8 text-center max-w-lg mx-auto mt-6">
          <div className="h-12 w-12 rounded-2xl grid place-items-center mx-auto mb-4" style={{ background: 'rgba(242,194,0,.16)', color: ML }}><Plug size={22} /></div>
          <div className="font-display font-semibold text-lg">Conecte o Mercado Livre</div>
          <p className="text-sm text-dim mt-2">Os pedidos, com resultado por venda (tarifa, custo e margem), nome e endereço reais do comprador e a etiqueta oficial, aparecem aqui assim que você conectar a conta.</p>
          <button onClick={checar} className="glass rounded-xl px-4 py-2 text-sm text-dim hover:text-fg inline-flex items-center gap-2 mt-4"><RefreshCw size={15} /> Já conectei</button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      {/* filtros de status + período */}
      <div className="flex items-center gap-2 flex-wrap mb-2.5">
        {FILTROS.map((f) => (
          <button key={f.id} onClick={() => setFiltro(f.id)} className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
            style={filtro === f.id ? { background: 'var(--accent)', color: '#fff' } : { border: '1px solid var(--glass-border)', color: 'var(--dim)' }}>
            {f.label}
          </button>
        ))}
        <div className="ml-auto inline-flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
          {PERIODOS.map((p) => (
            <button key={p.id} onClick={() => setPeriodo(p.id)} className="text-[11px] font-bold px-3 py-1.5"
              style={periodo === p.id ? { background: 'var(--accent)', color: '#fff' } : { background: 'transparent', color: 'var(--faint)' }}>{p.label}</button>
          ))}
        </div>
      </div>

      {pedidos === null ? (
        <div className="text-dim text-sm flex items-center gap-2 p-4"><Loader2 size={16} className="animate-spin" /> Carregando pedidos…</div>
      ) : (
        <>
          {pedidos.length > 0 && <Estatisticas s={stats} />}

          {/* busca + escopo */}
          <div className="glass rounded-xl px-3 py-2 flex items-center gap-2 flex-wrap mt-3 mb-2.5">
            <Search size={14} className="text-faint" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por pedido, comprador, produto…" className="bg-transparent outline-none text-sm flex-1 min-w-[140px] text-fg placeholder:text-faint" />
            {ESCOPOS.map((e) => (
              <button key={e.id} onClick={() => setEscopo(e.id)} className="text-[11px] font-medium px-2.5 py-1 rounded-lg"
                style={escopo === e.id ? { background: 'rgba(214,0,127,.14)', color: 'var(--accent)' } : { background: 'rgba(255,255,255,.04)', color: 'var(--dim)' }}>{e.label}</button>
            ))}
            <button onClick={() => carregar(0, false)} className="text-dim hover:text-fg ml-1" title="Atualizar"><RefreshCw size={15} /></button>
          </div>

          {/* barra de seleção / impressão em lote */}
          {sel.size > 0 && (
            <div className="rounded-xl px-3 py-2.5 flex items-center gap-3 flex-wrap mb-3" style={{ border: '1px solid var(--accent)', background: 'linear-gradient(90deg,rgba(214,0,127,.14),transparent)' }}>
              <span className="grid place-items-center" style={{ width: 18, height: 18, borderRadius: 5, background: 'var(--accent)', color: '#fff' }}><Check size={12} /></span>
              <span className="text-sm font-semibold">{sel.size} {sel.size === 1 ? 'pedido selecionado' : 'pedidos selecionados'}</span>
              <span className="text-[11px] text-dim hidden sm:inline">· etiquetas num único PDF (até 50 por vez)</span>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={imprimirLote} disabled={baixando === 'lote' || !idsLote.length} className="text-[12px] font-medium px-3 py-1.5 rounded-lg text-white inline-flex items-center gap-1.5 disabled:opacity-50" style={{ background: 'var(--accent)' }}>
                  {baixando === 'lote' ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />} Imprimir {idsLote.length} {idsLote.length === 1 ? 'etiqueta' : 'etiquetas'}
                </button>
                <button onClick={toggleTodos} className="text-[11px] px-2.5 py-1.5 rounded-lg glass text-dim hover:text-fg">{todosSel ? 'Limpar' : `Selecionar todos (${selecionaveis.length})`}</button>
              </div>
            </div>
          )}

          {filtrada.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center mt-1">
              <CheckCircle2 size={28} className="mx-auto mb-3" style={{ color: 'var(--ok)' }} />
              <div className="font-medium">Nenhum pedido por aqui</div>
              <div className="text-sm text-dim mt-1">Ajuste o filtro, o período ou a busca.</div>
            </div>
          ) : (
            <div className="lg:grid lg:gap-4 lg:items-start" style={{ gridTemplateColumns: '1fr 372px' }}>
              <div className="space-y-2.5">
                {filtrada.map((p) => (
                  <Card key={p.id} p={p} ativo={ativo === p.id} sel={sel.has(p.id)}
                    onOpen={() => abrir(p)} onToggleSel={() => toggleSel(p.id)} />
                ))}
                {pedidos.length < (paging.total || 0) && (
                  <button onClick={carregarMais} disabled={carregandoMais} className="glass rounded-xl w-full py-2.5 text-sm text-dim hover:text-fg inline-flex items-center justify-center gap-2">
                    {carregandoMais ? <Loader2 size={15} className="animate-spin" /> : null} Carregar mais ({pedidos.length} de {paging.total})
                  </button>
                )}
              </div>

              <div className={`mt-2.5 lg:mt-0 ${ativoPedido ? '' : 'hidden lg:block'}`}>
                {ativoPedido
                  ? <Drawer p={ativoPedido} envio={ativoPedido.shipping_id ? envios[ativoPedido.shipping_id] : null}
                      baixando={baixando === ativoPedido.shipping_id} onEtiqueta={() => baixarEtiqueta(ativoPedido.shipping_id)}
                      onClose={() => setAtivo(null)} />
                  : <div className="glass rounded-2xl p-6 text-center text-sm text-faint sticky" style={{ top: 16 }}>Selecione um pedido para ver o repasse, o endereço real e a logística.</div>}
              </div>
            </div>
          )}
        </>
      )}
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Package size={20} className="text-accent" />
            <span className="font-display font-semibold text-lg">Pedidos</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(242,194,0,.18)', color: ML }}>Mercado Livre</span>
          </div>
          <div className="text-sm text-dim mt-1">Cada pedido com o resultado real — vendido, tarifa, custo e margem — além do nome e endereço reais do comprador e a etiqueta oficial.</div>
        </div>
      </div>
      {children}
    </div>
  )
}

function Kpi({ label, valor, sub, cor, icon, destaque }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: destaque ? 'rgba(47,217,141,.07)' : 'var(--surface)', border: `1px solid ${destaque ? 'rgba(47,217,141,.3)' : 'var(--glass-border)'}` }}>
      <div className="text-[9px] uppercase tracking-wide text-faint font-bold flex items-center gap-1.5">{icon}{label}</div>
      <div className="num font-bold text-lg leading-tight mt-0.5" style={cor ? { color: cor } : undefined}>{valor}</div>
      {sub && <div className="text-[10px]" style={cor ? { color: cor } : { color: 'var(--faint)' }}>{sub}</div>}
    </div>
  )
}

function Estatisticas({ s }) {
  const maxDia = Math.max(1, ...s.dias.map((d) => d[1]))
  const diaLabel = (iso) => { const d = new Date(iso + 'T12:00:00'); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <Kpi label="Pedidos" icon={<Package size={11} />} valor={s.n.toLocaleString('pt-BR')} sub={`${s.unidades} un.`} />
        <Kpi label="Receita" icon={<Wallet size={11} />} valor={brl0(s.receita)} />
        <Kpi label="Ticket médio" icon={<DollarSign size={11} />} valor={brl(s.ticket)} />
        <Kpi label="Tarifas ML" icon={<Tag size={11} />} valor={'−' + brl0(s.tarifas)} cor="var(--warn)" sub={s.receita > 0 ? `${Math.round(s.tarifas / s.receita * 100)}% da receita` : null} />
        <Kpi label="Custo produtos" icon={<AlertTriangle size={11} />} valor={'−' + brl0(s.custo)} cor="var(--warn)" sub="via Bling" />
        <Kpi label="Líquido" icon={<TrendingUp size={11} />} valor={brl0(s.liquido)} cor="var(--ok)" sub={s.margem != null ? `margem ${s.margem.toFixed(0)}%` : null} destaque />
      </div>
      <div className="flex gap-3 flex-col md:flex-row">
        <div className="glass rounded-xl p-3 flex-[2] min-w-0">
          <div className="text-[9px] uppercase tracking-wide text-faint font-bold mb-2 flex items-center gap-1.5"><TrendingUp size={12} /> Receita por dia</div>
          {s.dias.length === 0 ? <div className="text-[11px] text-faint">Sem dados no período.</div> : (
            <div className="flex items-end gap-1.5" style={{ height: 70 }}>
              {s.dias.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <div className="w-full rounded-t" style={{ height: Math.max(4, d[1] / maxDia * 56), background: 'linear-gradient(180deg,var(--accent),var(--accent2))' }} title={brl(d[1])} />
                  <span className="text-[8px] text-faint num truncate w-full text-center">{diaLabel(d[0])}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="glass rounded-xl p-3 flex-1 min-w-0">
          <div className="text-[9px] uppercase tracking-wide text-faint font-bold mb-2">Por status</div>
          <div className="space-y-1.5">
            {Object.entries(s.porStatus).map(([k, v]) => {
              const m = ST_PEDIDO[k] || { t: k, c: 'var(--dim)' }
              return (
                <div key={k} className="flex items-center gap-2 text-[11px]">
                  <span style={{ width: 7, height: 7, borderRadius: 99, background: m.c, display: 'inline-block' }} />
                  <span className="flex-1 text-dim truncate">{m.t}</span>
                  <span className="num font-bold">{v}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function Cell({ label, valor, sub, cor, forte, dim, destaque }) {
  return (
    <div className="rounded-lg px-2 py-1.5 text-center min-w-0" style={{ background: destaque ? 'var(--glass-hover)' : 'rgba(0,0,0,.2)' }}>
      <div className="text-[8px] uppercase tracking-wide text-faint">{label}</div>
      <div className={`num text-[12px] leading-tight mt-0.5 ${forte ? 'font-bold' : ''}`} style={{ color: cor || (dim ? 'var(--dim)' : 'var(--fg)') }}>{valor}{sub ? <span className="text-[9px] font-normal opacity-80"> · {sub}</span> : ''}</div>
    </div>
  )
}

function Card({ p, ativo, onOpen, sel, onToggleSel }) {
  const [imgErro, setImgErro] = useState(false)
  const st = ST_PEDIDO[p.status] || { t: p.status, c: 'var(--dim)' }
  const itens = p.itens || []
  const principal = itens[0] || {}
  const extras = itens.length - 1
  const r = p.resumo || {}
  const h = horasDesde(p.date_created)
  const novo = h != null && h < 1
  const podeSelecionar = !!p.shipping_id

  const somaCampo = (campo) => {
    let tot = 0, tem = false
    itens.forEach((it) => { if (it[campo] != null) { tot += it[campo] * (it.quantidade || 1); tem = true } })
    return tem ? tot : null
  }
  const blingTotal = somaCampo('preco_bling')
  const mlListTotal = somaCampo('ml_preco')
  const cor = moneyCor(r.liquido, r.margem)
  const vsBling = (blingTotal != null && r.receita != null) ? r.receita - blingTotal : null

  return (
    <div className="glass rounded-2xl p-3" style={(sel || ativo) ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 1px rgba(214,0,127,.3)' } : undefined}>
      <div className="flex items-start gap-3">
        <button onClick={onToggleSel} disabled={!podeSelecionar} title={podeSelecionar ? 'Selecionar para impressão' : 'Sem envio associado'}
          className="shrink-0 mt-0.5 grid place-items-center" style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--faint)'}`, background: sel ? 'var(--accent)' : 'transparent', color: sel ? '#fff' : 'transparent', opacity: podeSelecionar ? 1 : 0.3, cursor: podeSelecionar ? 'pointer' : 'not-allowed' }}>
          <Check size={12} />
        </button>
        <button onClick={onOpen} className="rounded-lg overflow-hidden shrink-0 grid place-items-center" style={{ width: 52, height: 52, background: 'var(--glass-hover)', color: 'var(--faint)' }}>
          {principal.imagem && !imgErro
            ? <img src={principal.imagem} alt="" className="h-full w-full object-cover" onError={() => setImgErro(true)} />
            : <Package size={20} />}
        </button>
        <button onClick={onOpen} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate max-w-full">{principal.titulo || 'Pedido'}{extras > 0 ? <span className="text-faint font-normal"> +{extras} item(s)</span> : ''}</span>
            {principal.quantidade > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(214,0,127,.14)', color: 'var(--accent)' }}>{principal.quantidade} un.</span>}
            {novo && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1" style={{ background: 'rgba(47,217,141,.14)', color: 'var(--ok)' }}><Zap size={9} /> novo</span>}
          </div>
          <div className="text-[11px] text-faint num mt-0.5">#{p.id} · {dataBR(p.date_created)}{principal.sku ? ` · ${principal.sku}` : ''}</div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: 'rgba(0,0,0,.2)', color: 'var(--dim)' }}><User size={10} /> {p.buyer?.nickname || 'comprador'}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--glass-hover)', color: st.c }}>{st.t}</span>
          </div>
        </button>
        <button onClick={onOpen} className="text-right shrink-0">
          <div className="num text-base font-bold">{brl(r.receita != null ? r.receita : p.total)}</div>
          {principal.unit_price != null && principal.quantidade > 1 && <div className="text-[9px] text-faint num">{principal.quantidade} × {brl(principal.unit_price)}</div>}
          <span className="text-faint mt-1 inline-flex">{ativo ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
        </button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mt-3">
        <Cell label="Vendido ML" valor={brl(r.receita)} forte />
        <Cell label="Preço Bling" valor={blingTotal != null ? brl(blingTotal) : '—'} dim />
        <Cell label="Anúncio ML" valor={mlListTotal != null ? brl(mlListTotal) : '—'} dim />
        <Cell label="Tarifa ML" valor={r.tarifa != null ? '−' + brl(r.tarifa) : '—'} cor="var(--warn)" />
        <Cell label="Custo" valor={r.custo != null ? '−' + brl(r.custo) : '—'} cor="var(--warn)" />
        <Cell label="Líquido" valor={r.liquido != null ? brl(r.liquido) : '—'} sub={r.margem != null ? `${r.margem.toFixed(0)}%` : null} cor={cor} forte destaque />
      </div>
      {vsBling != null && (
        <div className="text-[10px] mt-1.5" style={{ color: vsBling >= -0.01 ? 'var(--ok)' : 'var(--warn)' }}>
          {vsBling >= -0.01 ? <CheckCircle2 size={11} className="inline mr-1" /> : <AlertTriangle size={11} className="inline mr-1" />}
          {vsBling >= -0.01 ? `${brl(vsBling)} acima do Preço Bling` : `${brl(Math.abs(vsBling))} abaixo do Preço Bling`}
        </div>
      )}
    </div>
  )
}

function Timeline({ orderStatus, shipStatus }) {
  const passos = ['Pedido criado', 'Pagamento aprovado', 'Pronto p/ enviar', 'Enviado', 'Entregue']
  let cur = orderStatus === 'paid' ? 2 : 1
  if (shipStatus === 'delivered') cur = 5
  else if (shipStatus === 'shipped') cur = 4
  else if (shipStatus === 'ready_to_ship' || shipStatus === 'handling' || shipStatus === 'pending') cur = 3
  const iconFor = (idx) => idx === 3 ? <Tag size={12} /> : idx === 4 ? <Truck size={12} /> : idx === 5 ? <MapPin size={12} /> : <Clock size={12} />
  return (
    <div className="relative">
      {passos.map((t, i) => {
        const idx = i + 1
        const estado = idx < cur ? 'done' : (idx === cur ? (cur === 5 ? 'done' : 'cur') : 'wait')
        const col = estado === 'done' ? 'var(--ok)' : estado === 'cur' ? 'var(--accent)' : 'var(--faint)'
        const last = idx === passos.length
        return (
          <div key={i} className="flex gap-2.5 relative" style={{ paddingBottom: last ? 0 : 12 }}>
            {!last && <div style={{ position: 'absolute', left: 10, top: 20, bottom: 2, width: 2, background: estado === 'done' ? 'var(--ok)' : 'var(--glass-border)' }} />}
            <div className="grid place-items-center shrink-0" style={{ width: 22, height: 22, borderRadius: 99, border: `2px solid ${col}`, color: col, background: 'var(--surface)', zIndex: 1, boxShadow: estado === 'cur' ? '0 0 0 4px rgba(214,0,127,.12)' : 'none' }}>
              {estado === 'done' ? <Check size={12} /> : iconFor(idx)}
            </div>
            <div>
              <div className="text-[12px] font-medium">{t}</div>
              <div className="text-[10px]" style={{ color: estado === 'cur' ? 'var(--accent)' : 'var(--faint)' }}>{estado === 'cur' ? (idx === 3 ? 'imprima a etiqueta e despache' : 'em andamento') : estado === 'done' ? 'concluído' : '—'}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Drawer({ p, envio, baixando, onEtiqueta, onClose }) {
  const r = p.resumo || {}
  const st = ST_PEDIDO[p.status] || { t: p.status, c: 'var(--dim)' }
  const itens = p.itens || []
  const inicial = (p.buyer?.nickname || '?').slice(0, 1).toUpperCase()
  const recebe = (r.receita != null && r.tarifa != null) ? r.receita - r.tarifa : null
  const tarifaPct = (r.receita > 0 && r.tarifa != null) ? Math.round(r.tarifa / r.receita * 100) : null
  const cor = moneyCor(r.liquido, r.margem)
  const sid = p.shipping_id
  const dest = envio && envio !== 'loading' && envio !== 'erro' ? extrairDestino(envio) : null
  const shipStatus = envio && envio !== 'loading' && envio !== 'erro' ? envio.status : null
  const stEnv = shipStatus ? (ST_ENVIO[shipStatus] || { t: shipStatus, c: 'var(--dim)' }) : null

  return (
    <div className="glass rounded-2xl overflow-hidden sticky" style={{ top: 16, borderColor: 'var(--accent)' }}>
      <div className="px-4 py-3 flex items-center gap-2.5" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <span className="grid place-items-center shrink-0" style={{ width: 34, height: 34, borderRadius: 99, background: 'var(--accent2)', color: '#fff', fontWeight: 800, fontSize: 13 }}>{inicial}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{p.buyer?.nickname || 'Comprador'}</div>
          <div className="text-[10px] text-faint num">#{p.id} · <span style={{ color: st.c }}>{stEnv ? stEnv.t : st.t}</span></div>
        </div>
        <button onClick={onClose} className="text-faint hover:text-fg"><X size={18} /></button>
      </div>

      <div className="px-4 py-3">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button onClick={onEtiqueta} disabled={!sid || baixando} className="text-[11.5px] font-medium px-2 py-2 rounded-lg text-white inline-flex items-center justify-center gap-1.5 disabled:opacity-50" style={{ background: 'var(--accent)' }}>
            {baixando ? <Loader2 size={13} className="animate-spin" /> : <Tag size={13} />} Baixar etiqueta
          </button>
          <a href={`https://www.mercadolivre.com.br/vendas/${p.id}/detalhe`} target="_blank" rel="noreferrer" className="text-[11.5px] font-medium px-2 py-2 rounded-lg inline-flex items-center justify-center gap-1.5" style={{ border: '1px solid var(--glass-border)', color: 'var(--dim)' }}>
            <ExternalLink size={13} /> Abrir no ML
          </a>
        </div>

        <div className="text-[11.5px]">
          <div className="flex justify-between py-0.5"><span className="text-dim flex items-center gap-1.5"><Clock size={12} /> Criado</span><span className="num font-medium">{dataHora(p.date_created)}</span></div>
        </div>

        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <div className="text-[9.5px] uppercase tracking-wide text-faint font-bold mb-2 flex items-center gap-1.5"><Package size={12} /> Produtos ({itens.length})</div>
          {itens.map((it, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <span className="text-[11.5px] text-dim truncate flex-1">{it.quantidade}× {it.titulo}{it.sku ? <span className="text-faint"> · {it.sku}</span> : ''}</span>
              <span className="text-[11px] num text-faint shrink-0">{brl(it.unit_price)}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <div className="text-[9.5px] uppercase tracking-wide text-faint font-bold mb-2 flex items-center gap-1.5"><Wallet size={12} /> Repasse do Mercado Livre</div>
          <div className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,.2)' }}>
            <div className="flex justify-between text-[12px] py-0.5"><span className="text-dim">Receita (comprador pagou)</span><span className="num">{brl(r.receita)}</span></div>
            <div className="flex justify-between text-[12px] py-0.5"><span className="text-dim">Tarifa do Mercado Livre{tarifaPct != null ? ` (${tarifaPct}%)` : ''}</span><span className="num" style={{ color: 'var(--danger)' }}>−{brl(r.tarifa)}</span></div>
            <div className="flex justify-between text-[12px] py-2 mt-1 font-bold" style={{ borderTop: '1px solid var(--glass-border)' }}><span>Você recebe (líquido de tarifa)</span><span className="num" style={{ color: 'var(--ok)' }}>{brl(recebe)}</span></div>
            <div className="flex justify-between text-[12px] py-0.5"><span className="text-dim">Custo dos produtos (Bling)</span><span className="num" style={{ color: r.custo ? 'var(--fg)' : 'var(--faint)' }}>{r.custo ? '−' + brl(r.custo) : 'R$ 0,00 — cadastre'}</span></div>
          </div>
          <div className="flex justify-between items-center rounded-xl px-3 py-2.5 mt-2" style={{ background: 'rgba(47,217,141,.08)', border: '1px solid rgba(47,217,141,.3)' }}>
            <span className="text-[12px] font-bold flex items-center gap-1.5" style={{ color: cor }}><TrendingUp size={13} /> Margem após taxas</span>
            <span className="num font-bold" style={{ fontSize: 16, color: cor }}>{brl(r.liquido)}{r.margem != null ? <span style={{ fontSize: 11 }}> ({r.margem.toFixed(0)}%)</span> : ''}</span>
          </div>
          {!r.custo && <div className="text-[10px] mt-1.5 flex items-start gap-1.5" style={{ color: 'var(--warn)' }}><AlertTriangle size={11} className="mt-0.5" /> Custo R$ 0,00 no Bling — cadastre o custo pra ver o lucro real.</div>}
        </div>

        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <div className="text-[9.5px] uppercase tracking-wide text-faint font-bold mb-2 flex items-center gap-1.5"><MapPin size={12} /> Entrega</div>
          {!sid ? <div className="text-[11px] text-faint">Este pedido não tem envio associado.</div>
            : envio === 'loading' ? <div className="text-[11px] text-faint flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> lendo endereço…</div>
              : envio === 'erro' || !dest ? <div className="text-[11px] text-faint">Não consegui ler o endereço deste envio.</div>
                : (
                  <div className="text-[12px] leading-relaxed">
                    <div className="flex items-center gap-1.5 font-medium"><User size={12} className="text-faint" /> {dest.nome || '—'}</div>
                    {dest.linha && <div className="text-dim">{dest.linha}{dest.compl ? ` — ${dest.compl}` : ''}</div>}
                    {dest.bairro && <div className="text-dim">{dest.bairro}</div>}
                    <div className="text-dim">{[dest.cidade, dest.estado].filter(Boolean).join(' · ')}{dest.cep ? ` · CEP ${dest.cep}` : ''}</div>
                  </div>
                )}
        </div>

        {sid && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <div className="text-[9.5px] uppercase tracking-wide text-faint font-bold mb-2.5 flex items-center gap-1.5"><Truck size={12} /> Logística</div>
            <Timeline orderStatus={p.status} shipStatus={shipStatus} />
          </div>
        )}
      </div>
    </div>
  )
}
