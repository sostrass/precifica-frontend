import { useCallback, useEffect, useState } from 'react'
import {
  Package, MapPin, Download, RefreshCw, Search, Plug, Loader2, Truck,
  ChevronDown, ChevronUp, User, ExternalLink, CheckCircle2,
} from 'lucide-react'
import { api } from './api.js'
import { useToast } from './toast.jsx'

const ML = '#F2C200'
const brl = (v) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))

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
  const [lista, setLista] = useState(null)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [aberto, setAberto] = useState(null) // order_id expandido
  const [envios, setEnvios] = useState({}) // {shipmentId: envio | 'erro' | 'loading'}
  const [baixando, setBaixando] = useState('')

  const checar = useCallback(() => {
    api.mlConta().then((d) => setConn(d?.conta ? d : { conta: false })).catch(() => setConn({ conta: false }))
  }, [])
  useEffect(() => { checar() }, [checar])

  const carregar = useCallback(async (off = 0, append = false) => {
    if (!append) setLista(null)
    try {
      const d = await api.mlPedidos(filtro, off)
      const results = d.results || []
      setTotal(d.paging?.total ?? results.length)
      setOffset(off)
      setLista((prev) => (append ? [...(prev || []), ...results] : results))
    } catch (e) {
      notify(e.message, 'danger'); if (!append) setLista([])
    }
  }, [filtro, notify])

  useEffect(() => { if (conn?.conta) carregar(0, false) }, [conn?.conta, carregar])

  const expandir = async (order) => {
    const oid = order.id
    if (aberto === oid) { setAberto(null); return }
    setAberto(oid)
    const sid = order.shipping?.id
    if (sid && !envios[sid]) {
      setEnvios((e) => ({ ...e, [sid]: 'loading' }))
      try {
        const env = await api.mlEnvio(sid)
        setEnvios((e) => ({ ...e, [sid]: env }))
      } catch {
        setEnvios((e) => ({ ...e, [sid]: 'erro' }))
      }
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

  const carregarMais = async () => {
    setCarregandoMais(true)
    await carregar(offset + 50, true)
    setCarregandoMais(false)
  }

  const filtrada = (lista || []).filter((o) => {
    if (!busca.trim()) return true
    const t = busca.toLowerCase()
    const itens = (o.order_items || []).map((it) => it.item?.title || '').join(' ').toLowerCase()
    return String(o.id).includes(t) || (o.buyer?.nickname || '').toLowerCase().includes(t) || itens.includes(t)
  })

  if (conn && !conn.conta) {
    return (
      <Shell>
        <div className="glass rounded-2xl p-8 text-center max-w-lg mx-auto mt-6">
          <div className="h-12 w-12 rounded-2xl grid place-items-center mx-auto mb-4" style={{ background: 'rgba(242,194,0,.16)', color: ML }}><Plug size={22} /></div>
          <div className="font-display font-semibold text-lg">Conecte o Mercado Livre</div>
          <p className="text-sm text-dim mt-2">Os pedidos, com nome e endereço reais do comprador e a etiqueta oficial, aparecem aqui assim que você conectar a conta.</p>
          <button onClick={checar} className="glass rounded-xl px-4 py-2 text-sm text-dim hover:text-fg inline-flex items-center gap-2 mt-4"><RefreshCw size={15} /> Já conectei</button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell total={total}>
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

      {lista === null ? (
        <div className="text-dim text-sm flex items-center gap-2 p-4"><Loader2 size={16} className="animate-spin" /> Carregando pedidos…</div>
      ) : filtrada.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <CheckCircle2 size={28} className="mx-auto mb-3" style={{ color: 'var(--ok)' }} />
          <div className="font-medium">Nenhum pedido por aqui</div>
          <div className="text-sm text-dim mt-1">Ajuste o filtro ou a busca.</div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtrada.map((o) => (
            <Card key={o.id} o={o} aberto={aberto === o.id} onToggle={() => expandir(o)}
              envio={o.shipping?.id ? envios[o.shipping.id] : null}
              baixando={baixando === o.shipping?.id} onEtiqueta={() => baixarEtiqueta(o.shipping?.id)} />
          ))}
          {lista.length < total && (
            <button onClick={carregarMais} disabled={carregandoMais} className="glass rounded-xl w-full py-2.5 text-sm text-dim hover:text-fg inline-flex items-center justify-center gap-2">
              {carregandoMais ? <Loader2 size={15} className="animate-spin" /> : null} Carregar mais ({lista.length} de {total})
            </button>
          )}
        </div>
      )}
    </Shell>
  )
}

function Shell({ children, total }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Package size={20} className="text-accent" />
            <span className="font-display font-semibold text-lg">Pedidos</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(242,194,0,.18)', color: ML }}>Mercado Livre</span>
          </div>
          <div className="text-sm text-dim mt-1">Nome e endereço reais do comprador e a etiqueta oficial — o que a Shopee não entrega.</div>
        </div>
        {total > 0 && <div className="glass rounded-xl px-3 py-2 text-center"><div className="text-[9px] uppercase tracking-wide text-faint">Pedidos</div><div className="num font-bold text-lg">{total.toLocaleString('pt-BR')}</div></div>}
      </div>
      {children}
    </div>
  )
}

function Card({ o, aberto, onToggle, envio, baixando, onEtiqueta }) {
  const st = ST_PEDIDO[o.status] || { t: o.status, c: 'var(--dim)' }
  const itens = o.order_items || []
  const primeiro = itens[0]?.item?.title || 'Pedido'
  const extras = itens.length - 1
  const sid = o.shipping?.id
  const dest = envio && envio !== 'loading' && envio !== 'erro' ? extrairDestino(envio) : null
  const stEnv = envio && envio.status ? (ST_ENVIO[envio.status] || { t: envio.status, c: 'var(--dim)' }) : null

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3 text-left">
        <div className="h-9 w-9 rounded-lg grid place-items-center shrink-0" style={{ background: 'var(--glass-hover)', color: 'var(--faint)' }}><Package size={17} /></div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{primeiro}{extras > 0 ? <span className="text-faint font-normal"> +{extras}</span> : ''}</div>
          <div className="text-[11px] text-faint num">#{o.id} · {dataBR(o.date_created)} · {o.buyer?.nickname || 'comprador'}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="num text-sm font-semibold">{brl(o.total_amount)}</div>
          <div className="text-[10px] font-bold" style={{ color: st.c }}>{st.t}</div>
        </div>
        {aberto ? <ChevronUp size={16} className="text-faint shrink-0" /> : <ChevronDown size={16} className="text-faint shrink-0" />}
      </button>

      {aberto && (
        <div className="px-3 pb-3 -mt-1">
          <div className="rounded-lg p-3" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)' }}>
            <div className="text-[9px] uppercase tracking-wide text-faint font-bold mb-1.5">Itens</div>
            {itens.map((it, i) => (
              <div key={i} className="flex items-center justify-between text-[12px] py-0.5">
                <span className="text-dim truncate mr-2">{it.quantity}× {it.item?.title}{it.item?.seller_sku ? <span className="text-faint"> · {it.item.seller_sku}</span> : ''}</span>
                <span className="num text-faint shrink-0">{brl(it.unit_price)}</span>
              </div>
            ))}

            <div className="text-[9px] uppercase tracking-wide text-faint font-bold mt-3 mb-1.5 flex items-center gap-1.5"><MapPin size={11} /> Entrega</div>
            {!sid ? (
              <div className="text-[11px] text-faint">Este pedido não tem envio associado.</div>
            ) : envio === 'loading' ? (
              <div className="text-[11px] text-faint flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> lendo endereço…</div>
            ) : envio === 'erro' || !dest ? (
              <div className="text-[11px] text-faint">Não consegui ler o endereço deste envio.</div>
            ) : (
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
              {o.buyer?.nickname && <a href={`https://www.mercadolivre.com.br/vendas/${o.id}/detalhe`} target="_blank" rel="noreferrer" className="text-[11px] px-2 py-1.5 rounded-lg text-faint hover:text-dim inline-flex items-center gap-1"><ExternalLink size={12} /> abrir no ML</a>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
