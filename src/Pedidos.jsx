import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Package, MapPin, Download, RefreshCw, Search, Plug, Loader2, Truck,
  ChevronDown, ChevronUp, User, ExternalLink, CheckCircle2, Zap,
  AlertTriangle, TrendingUp,
} from 'lucide-react'
import { api } from './api.js'
import { useToast } from './toast.jsx'

const ML = '#F2C200'
const brl = (v) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
const brl0 = (v) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }))

const FILTROS = [
  { id: 'paid', label: 'Pagos' },
  { id: 'confirmed', label: 'Confirmados' },
  { id: '', label: 'Todos' },
]

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
  const [busca, setBusca] = useState('')
  const [pedidos, setPedidos] = useState(null)
  const [paging, setPaging] = useState({ total: 0 })
  const [offset, setOffset] = useState(0)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [aberto, setAberto] = useState(null)
  const [envios, setEnvios] = useState({})
  const [baixando, setBaixando] = useState('')

  const checar = useCallback(() => {
    api.mlConta().then((d) => setConn(d?.conta ? d : { conta: false })).catch(() => setConn({ conta: false }))
  }, [])
  useEffect(() => { checar() }, [checar])

  const carregar = useCallback(async (off = 0, append = false) => {
    if (!append) setPedidos(null)
    try {
      const d = await api.mlPedidosEnriquecido(filtro, off, 30)
      const arr = d.pedidos || []
      setPaging(d.paging || { total: arr.length })
      setOffset(off)
      setPedidos((prev) => (append ? [...(prev || []), ...arr] : arr))
    } catch (e) {
      notify(e.message, 'danger'); if (!append) setPedidos([])
    }
  }, [filtro, notify])

  useEffect(() => { if (conn?.conta) carregar(0, false) }, [conn?.conta, carregar])

  const expandir = async (p) => {
    const oid = p.id
    if (aberto === oid) { setAberto(null); return }
    setAberto(oid)
    const sid = p.shipping_id
    if (sid && !envios[sid]) {
      setEnvios((e) => ({ ...e, [sid]: 'loading' }))
      try { const env = await api.mlEnvio(sid); setEnvios((e) => ({ ...e, [sid]: env })) }
      catch { setEnvios((e) => ({ ...e, [sid]: 'erro' })) }
    }
  }

  const baixarEtiqueta = async (sid) => {
    if (!sid) return
    setBaixando(sid)
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
    const itens = (p.itens || []).map((it) => (it.titulo || '') + ' ' + (it.sku || '')).join(' ').toLowerCase()
    return String(p.id).includes(t) || (p.buyer?.nickname || '').toLowerCase().includes(t) || itens.includes(t)
  }), [pedidos, busca])

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
    const dias = Object.entries(porDia).sort((a, b) => a[0].localeCompare(b[0])).slice(-10)
    return {
      n, receita, tarifas, custo, liquido, unidades,
      ticket: n ? receita / n : 0,
      margem: receita > 0 ? liquido / receita * 100 : null,
      porStatus, dias,
    }
  }, [pedidos])

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
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {FILTROS.map((f) => (
          <button key={f.id} onClick={() => setFiltro(f.id)} className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
            style={filtro === f.id ? { background: 'rgba(214,0,127,.14)', color: 'var(--accent)' } : { border: '1px solid var(--glass-border)', color: 'var(--dim)' }}>
            {f.label}
          </button>
        ))}
        <div className="glass rounded-lg px-3 py-1.5 flex items-center gap-2 flex-1 min-w-[160px]">
          <Search size={14} className="text-faint" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por pedido, comprador, produto…" className="bg-transparent outline-none text-sm flex-1 text-fg placeholder:text-faint" />
        </div>
        <button onClick={() => carregar(0, false)} className="glass rounded-lg px-2.5 py-1.5 text-dim hover:text-fg" title="Atualizar"><RefreshCw size={15} /></button>
      </div>

      {pedidos === null ? (
        <div className="text-dim text-sm flex items-center gap-2 p-4"><Loader2 size={16} className="animate-spin" /> Carregando pedidos…</div>
      ) : (
        <>
          {pedidos.length > 0 && <Estatisticas s={stats} />}

          {filtrada.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center mt-3">
              <CheckCircle2 size={28} className="mx-auto mb-3" style={{ color: 'var(--ok)' }} />
              <div className="font-medium">Nenhum pedido por aqui</div>
              <div className="text-sm text-dim mt-1">Ajuste o filtro ou a busca.</div>
            </div>
          ) : (
            <div className="space-y-2.5 mt-3">
              {filtrada.map((p) => (
                <Card key={p.id} p={p} aberto={aberto === p.id} onToggle={() => expandir(p)}
                  envio={p.shipping_id ? envios[p.shipping_id] : null}
                  baixando={baixando === p.shipping_id} onEtiqueta={() => baixarEtiqueta(p.shipping_id)} />
              ))}
              {pedidos.length < (paging.total || 0) && (
                <button onClick={carregarMais} disabled={carregandoMais} className="glass rounded-xl w-full py-2.5 text-sm text-dim hover:text-fg inline-flex items-center justify-center gap-2">
                  {carregandoMais ? <Loader2 size={15} className="animate-spin" /> : null} Carregar mais ({pedidos.length} de {paging.total})
                </button>
              )}
            </div>
          )}
        </>
      )}
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div className="max-w-4xl mx-auto">
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

function Kpi({ label, valor, sub, cor, destaque }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: destaque ? 'rgba(47,217,141,.07)' : 'var(--surface)', border: `1px solid ${destaque ? 'rgba(47,217,141,.3)' : 'var(--glass-border)'}` }}>
      <div className="text-[9px] uppercase tracking-wide text-faint font-bold">{label}</div>
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
        <Kpi label="Pedidos" valor={s.n.toLocaleString('pt-BR')} sub={`${s.unidades} un.`} />
        <Kpi label="Receita" valor={brl0(s.receita)} />
        <Kpi label="Ticket médio" valor={brl(s.ticket)} />
        <Kpi label="Tarifas ML" valor={'−' + brl0(s.tarifas)} cor="var(--warn)" sub={s.receita > 0 ? `${Math.round(s.tarifas / s.receita * 100)}% da receita` : null} />
        <Kpi label="Custo produtos" valor={'−' + brl0(s.custo)} cor="var(--warn)" sub="via Bling" />
        <Kpi label="Líquido" valor={brl0(s.liquido)} cor="var(--ok)" sub={s.margem != null ? `margem ${s.margem.toFixed(0)}%` : null} destaque />
      </div>
      <div className="flex gap-3 flex-col md:flex-row">
        <div className="glass rounded-xl p-3 flex-[2] min-w-0">
          <div className="text-[9px] uppercase tracking-wide text-faint font-bold mb-2 flex items-center gap-1.5"><TrendingUp size={12} /> Receita por dia</div>
          {s.dias.length === 0 ? <div className="text-[11px] text-faint">Sem dados no período carregado.</div> : (
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

function Card({ p, aberto, onToggle, envio, baixando, onEtiqueta }) {
  const [imgErro, setImgErro] = useState(false)
  const st = ST_PEDIDO[p.status] || { t: p.status, c: 'var(--dim)' }
  const itens = p.itens || []
  const principal = itens[0] || {}
  const extras = itens.length - 1
  const r = p.resumo || {}
  const sid = p.shipping_id
  const h = horasDesde(p.date_created)
  const novo = h != null && h < 1
  const dest = envio && envio !== 'loading' && envio !== 'erro' ? extrairDestino(envio) : null
  const stEnv = envio && envio.status ? (ST_ENVIO[envio.status] || { t: envio.status, c: 'var(--dim)' }) : null

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
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg overflow-hidden shrink-0 grid place-items-center" style={{ width: 52, height: 52, background: 'var(--glass-hover)', color: 'var(--faint)' }}>
            {principal.imagem && !imgErro
              ? <img src={principal.imagem} alt="" className="h-full w-full object-cover" onError={() => setImgErro(true)} />
              : <Package size={20} />}
          </div>
          <button onClick={onToggle} className="flex-1 min-w-0 text-left">
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
          <div className="text-right shrink-0">
            <div className="num text-base font-bold">{brl(r.receita != null ? r.receita : p.total)}</div>
            {principal.unit_price != null && principal.quantidade > 1 && <div className="text-[9px] text-faint num">{principal.quantidade} × {brl(principal.unit_price)}</div>}
            <button onClick={onToggle} className="text-faint mt-1 inline-flex">{aberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
          </div>
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

      {aberto && (
        <div className="px-3 pb-3">
          <div className="rounded-lg p-3" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)' }}>
            <div className="text-[9px] uppercase tracking-wide text-faint font-bold mb-1.5">Itens</div>
            {itens.map((it, i) => (
              <div key={i} className="flex items-center justify-between text-[12px] py-0.5">
                <span className="text-dim truncate mr-2">{it.quantidade}× {it.titulo}{it.sku ? <span className="text-faint"> · {it.sku}</span> : ''}</span>
                <span className="num text-faint shrink-0">{brl(it.unit_price)}</span>
              </div>
            ))}

            <div className="text-[9px] uppercase tracking-wide text-faint font-bold mt-3 mb-1.5 flex items-center gap-1.5"><MapPin size={11} /> Entrega</div>
            {!sid ? <div className="text-[11px] text-faint">Este pedido não tem envio associado.</div>
              : envio === 'loading' ? <div className="text-[11px] text-faint flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> lendo endereço…</div>
                : envio === 'erro' || !dest ? <div className="text-[11px] text-faint">Não consegui ler o endereço deste envio.</div>
                  : (
                    <div className="text-[12px] leading-relaxed">
                      <div className="flex items-center gap-1.5 font-medium"><User size={12} className="text-faint" /> {dest.nome || '—'}</div>
                      {dest.linha && <div className="text-dim">{dest.linha}{dest.compl ? ` — ${dest.compl}` : ''}</div>}
                      <div className="text-dim">{[dest.bairro, dest.cidade, dest.estado].filter(Boolean).join(' · ')}{dest.cep ? ` · CEP ${dest.cep}` : ''}</div>
                      {stEnv && <div className="text-[11px] mt-1" style={{ color: stEnv.c }}><Truck size={11} className="inline mr-1" />{stEnv.t}</div>}
                    </div>
                  )}

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <button onClick={onEtiqueta} disabled={!sid || baixando} className="text-[11px] font-medium px-3 py-1.5 rounded-lg text-white inline-flex items-center gap-1.5 disabled:opacity-50" style={{ background: 'var(--accent)' }}>
                {baixando ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Baixar etiqueta (PDF)
              </button>
              <a href={`https://www.mercadolivre.com.br/vendas/${p.id}/detalhe`} target="_blank" rel="noreferrer" className="text-[11px] px-2 py-1.5 rounded-lg text-faint hover:text-dim inline-flex items-center gap-1"><ExternalLink size={12} /> abrir no ML</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
