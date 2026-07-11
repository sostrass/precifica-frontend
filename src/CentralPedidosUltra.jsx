import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Package, ShoppingBag, Globe, Truck, Clock, AlertTriangle, Box, Search, ChevronRight, ChevronLeft,
  Zap, Layers, MapPin, FileText, Printer, Tag, Check, CheckCheck, X, ScanLine, Barcode, ShieldCheck,
  DollarSign, Send, Sparkles, Settings, RefreshCw, Loader2, User, Repeat, Star, CreditCard, Eye, Lock, CalendarDays,
} from 'lucide-react'
import { api } from './api.js'
import { imprimirFolhasPedido, imprimirEtiquetas } from './Shopee.jsx'
import { useToast } from './toast.jsx'
import './central-ultra.css'

const OK = 'var(--ok)'
const WARN = 'var(--warn)'
const DANGER = 'var(--danger)'
const brl = (v) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
const STATUS_PT = {
  READY_TO_SHIP: 'Pronto p/ despachar', PROCESSED: 'Etiqueta emitida', RETRY_SHIP: 'Reenviar',
  SHIPPED: 'Enviado', TO_CONFIRM_RECEIVE: 'A confirmar entrega', COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado', IN_CANCEL: 'Cancelamento em análise', TO_RETURN: 'Em devolução', UNPAID: 'Aguardando pagamento',
  paid: 'Pago', confirmed: 'Confirmado', payment_required: 'Aguardando pagamento', payment_in_process: 'Pagamento em análise',
  partially_paid: 'Parcialmente pago', cancelled: 'Cancelado', invalid: 'Inválido',
  ready_to_ship: 'Pronto p/ despachar', handling: 'Em preparação', shipped: 'Enviado', delivered: 'Entregue', not_delivered: 'Não entregue',
}
const statusPt = (s) => STATUS_PT[s] || STATUS_PT[String(s || '').toLowerCase()] || String(s || '').replace(/_/g, ' ') || 'Pago'
const UF_RE = /\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/
// Cores EXATAS do HTML aprovado (CH do mockup): ML #F2C200→#c99b00 · Shopee #EE4D2D→#b83a1f
const CH = {
  ml: { nome: 'Mercado Livre', cor: '#F2C200', cord: '#c99b00', txt: '#1a1008', freteRot: 'Frete ML', brand: 'linear-gradient(145deg,#F2C200,#c99b00)' },
  shopee: { nome: 'Shopee', cor: '#EE4D2D', cord: '#b83a1f', txt: '#1a1008', freteRot: 'Frete', brand: 'linear-gradient(145deg,#EE4D2D,#b83a1f)' },
}
const hexA = (hex, a) => { const h = hex.replace('#', ''); const n = parseInt(h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})` }

// ————— adaptadores: normalizam ML e Shopee para o layout ÚNICO do mockup —————
function adaptaML(p) {
  const r = p.resumo || {}
  return {
    id: String(p.id || p.pack_id || ''), canal: 'ml',
    titulo: (p.itens?.[0]?.titulo || p.itens?.[0]?.nome || 'Pedido ML'),
    qtd: (p.itens || []).reduce((s, i) => s + (i.qtd || i.quantidade || 1), 0),
    itens: (p.itens || []).map((i) => ({ nome: i.titulo || i.nome, sku: i.sku, qtd: i.qtd || i.quantidade || 1, imagem: i.imagem, preco: i.unit_price ?? i.preco })),
    comprador: p.buyer?.nickname || '—', compras: p.buyer?.compras || 0, buyerId: p.buyer?.id, packId: p.pack_id,
    status: p.status || '', criado: p.date_created, pago: p.date_paid || p.aprovado_em || p.date_created,
    receita: r.receita ?? p.valor, taxas: r.taxas ?? r.taxas_mkt, frete: r.tarifa ?? r.frete, liquido: r.liquido, margem: r.margem, alvo: p.preco_bling,
    rastreio: p.rastreio || p.tracking, shipId: p.shipping_id || p.shipment_id || p.envio_id || p.envio?.id,
    uf: (p.uf || p.envio?.uf || '').toUpperCase() || ((p.endereco || '').match(UF_RE) || [])[0],
    nf: !!(p.nfe || p.nf), cancelado: /cancel/i.test(String(p.status || '')),
    devolucao: /return|devolu|claim|mediac/i.test(String(p.status || '')) || !!p.claim_id, bruto: p,
  }
}
function adaptaShopee(p) {
  const cr = p.criado || p.create_time
  const its = p.itens || []
  const soma = (f) => { let s = 0, tem = false; for (const it of its) { if (it[f] != null) { s += it[f] * (it.qtd || 1); tem = true } } return tem ? s : null }
  const taxas = soma('taxas_mkt')
  const liquido = soma('liquido')
  const receita = p.total_pago ?? soma('preco_pago')
  const lucro = p.lucro_real
  const margem = (lucro != null && receita > 0) ? (lucro / receita * 100)
    : (() => { const ms = its.map((i) => i.margem_real).filter((v) => v != null); return ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : null })()
  const nfSelo = p.selo_nf || p.nf_selo || (typeof p.nf === 'string' ? p.nf : null)
  return {
    id: String(p.order_sn || ''), canal: 'shopee',
    titulo: (its[0]?.nome || 'Pedido Shopee'),
    qtd: its.reduce((s, i) => s + (i.qtd || 1), 0),
    itens: its.map((i) => ({ nome: i.nome, sku: i.sku, qtd: i.qtd || 1, imagem: i.imagem, bin: i.bin, variacao: i.variacao, preco: i.preco_pago })),
    comprador: p.comprador || p.buyer_username || '—', compras: p.recorrencia || 0,
    clienteReal: p.cliente || p.endereco?.nome, cidade: p.cidade || p.endereco?.cidade, cep: p.endereco?.cep,
    status: p.status || '', criado: cr ? new Date(cr * 1000).toISOString() : null,
    pago: p.pay_time ? new Date(p.pay_time * 1000).toISOString() : (cr ? new Date(cr * 1000).toISOString() : null),
    receita, taxas, frete: null, liquido, lucro, margem, alvo: null,
    abaixoMeta: !!p.abaixo_meta, prejuizo: !!p.prejuizo, notaComprador: p.nota_comprador,
    rastreio: p.rastreio || p.tracking_number, shipBy: p.ship_by,
    uf: (p.uf || p.endereco?.uf || '').toUpperCase().slice(0, 2) || null,
    nf: nfSelo ? nfSelo === 'com_nota' : !!p.nf, seloNf: nfSelo, nfDesconhecida: !nfSelo && typeof p.nf !== 'boolean',
    cancelado: /cancel/i.test(String(p.status || '')), devolucao: /return|refund|devolu/i.test(String(p.status || '')), bruto: p,
  }
}

const ABAS_DEF = [
  ['todos', 'Todos', Layers], ['hoje', 'A despachar hoje', Zap], ['proximos', 'Próximos dias', CalendarDays],
  ['nf', 'Aguardando NF-e', FileText], ['transito', 'Em trânsito', Truck], ['fim', 'Finalizados', Check], ['cancel', 'Cancelados', X],
]
function classifica(p) {
  if (p.cancelado) return 'cancel'
  if (/deliver|entreg|complet|finaliz/i.test(p.status)) return 'fim'
  if (/shipped|enviado|transit|transito/i.test(p.status)) return 'transito'
  if (!p.nf && !p.nfDesconhecida && p.canal === 'shopee') return 'nf'
  const sb = p.shipBy ? p.shipBy * 1000 : null
  if (sb && sb - Date.now() > 36 * 3600000) return 'proximos'
  return 'hoje'
}

function paraImpressao(p) {
  return {
    order_sn: p.id, status: p.status, comprador: p.comprador, buyer_username: p.comprador,
    cliente: p.clienteReal || undefined, cidade: p.cidade, uf: p.uf, cep: p.cep,
    ship_by: p.shipBy, rastreio: p.rastreio, cod: false, recorrencia: (p.compras || 0) > 1 ? `${p.compras}ª compra` : null,
    total: p.receita, sobra: p.liquido, margem: p.margem != null ? Math.round(p.margem) : null,
    itens: (p.itens || []).map((it) => ({ nome: it.nome, sku: it.sku, qtd: it.qtd, imagem: it.imagem, bin: it.bin, variacao: it.variacao })),
  }
}

export default function CentralPedidosUltra() {
  const notify = useToast()
  const [canal, setCanal] = useState('ml')
  const [dias, setDias] = useState(15)
  const [pedidos, setPedidos] = useState(null)
  const [erro, setErro] = useState(null)
  const [fundo, setFundo] = useState(null)
  const [aba, setAba] = useState('todos')
  const [pgto, setPgto] = useState('todos')
  const [densidade, setDensidade] = useState('conf')
  const [soDevolucao, setSoDevolucao] = useState(false)
  const [soSemNf, setSoSemNf] = useState(false)
  const [agrupo, setAgrupo] = useState('dia')
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState('recentes')
  const [pagina, setPagina] = useState(1)
  const [aberto, setAberto] = useState(null)
  const [sel, setSel] = useState(() => new Set())
  const [modal, setModal] = useState(null) // 'sep' | 'imp' | 'etq' | 'mesa'
  const [mesaIdx, setMesaIdx] = useState(0)
  const [mesaConf, setMesaConf] = useState({})
  const [novos, setNovos] = useState(0)
  const [regras, setRegras] = useState(() => { try { return JSON.parse(localStorage.getItem('pcu_regras') || '{"nf_imprime":true,"risco_segura":true,"presente_selo":false}') } catch (_) { return { nf_imprime: true, risco_segura: true, presente_selo: false } } })
  const [agoraTs, setAgoraTs] = useState(Date.now())
  const geracao = useRef(0)
  const idsRef = useRef(new Set())
  const POR_PAG = 10
  const d = CH[canal]

  useEffect(() => { const t = setInterval(() => setAgoraTs(Date.now()), 30000); return () => clearInterval(t) }, [])
  useEffect(() => { localStorage.setItem('pcu_regras', JSON.stringify(regras)) }, [regras])

  const carregar = async (silencioso) => {
    const g = ++geracao.current
    if (!silencioso) { setPedidos(null); setErro(null); setSel(new Set()); setAberto(null); setPagina(1); setFundo(null); setNovos(0) }
    try {
      if (canal === 'ml') {
        const dd = new Date(); dd.setDate(dd.getDate() - dias); dd.setHours(0, 0, 0, 0)
        const iso = (x) => x, desdeIso = dd.toISOString(), ateIso = ''
        const d1 = await api.mlPedidosEnriquecido('', 0, 25, desdeIso, ateIso)
        if (g !== geracao.current) return
        let acumulado = (d1.pedidos || []).map(adaptaML)
        if (silencioso) {
          const chegaram = acumulado.filter((p) => !idsRef.current.has(p.id)).length
          if (chegaram > 0) setNovos((n) => n + chegaram)
          setPedidos((prev) => { if (!prev) return acumulado; const ids = new Set(acumulado.map((p) => p.id)); return acumulado.concat(prev.filter((p) => !ids.has(p.id))) })
        } else setPedidos(acumulado)
        acumulado.forEach((p) => idsRef.current.add(p.id))
        const total = d1.paging?.total ?? acumulado.length
        if (!silencioso && total > acumulado.length) {
          setFundo({ carregados: acumulado.length, total: Math.min(total, 240) })
          for (let off = acumulado.length; off < Math.min(total, 240); off += 60) {
            const dx = await api.mlPedidosEnriquecido('', off, 60, desdeIso, ateIso)
            if (g !== geracao.current) return
            acumulado = acumulado.concat((dx.pedidos || []).map(adaptaML))
            acumulado.forEach((p) => idsRef.current.add(p.id))
            setPedidos(acumulado.slice())
            setFundo({ carregados: acumulado.length, total: Math.min(total, 240) })
            if (!(dx.pedidos || []).length) break
          }
          setFundo(null)
        }
      } else {
        let r
        try { r = await api.shopeePedidosPainel('TODOS', dias, { page: 1, page_size: 50 }) }
        catch (_) { r = await api.shopeePedidosPainel('A_ENVIAR', dias, { page: 1, page_size: 50 }) }
        if (g !== geracao.current) return
        const arr = (r.pedidos || []).map(adaptaShopee)
        if (silencioso) {
          const chegaram = arr.filter((p) => !idsRef.current.has(p.id)).length
          if (chegaram > 0) setNovos((n) => n + chegaram)
        }
        arr.forEach((p) => idsRef.current.add(p.id))
        setPedidos(arr)
      }
    } catch (e) { if (!silencioso && g === geracao.current) { setErro(e.message || 'falha ao carregar'); setPedidos([]) } }
  }
  useEffect(() => { idsRef.current = new Set(); carregar() }, [canal, dias])
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') carregar(true) }
    const t = setInterval(tick, 60000)
    return () => clearInterval(t)
  }, [canal, dias])

  // ————— derivados —————
  const lista = pedidos || []
  const contagem = useMemo(() => { const c = { todos: lista.length }; for (const a of ABAS_DEF) if (a[0] !== 'todos') c[a[0]] = 0; for (const p of lista) c[classifica(p)] = (c[classifica(p)] || 0) + 1; return c }, [pedidos])
  const receitaTot = lista.reduce((s, p) => s + (p.receita || 0), 0)
  const liquidoTot = lista.reduce((s, p) => s + (p.liquido || 0), 0)
  const taxasTot = lista.reduce((s, p) => s + (p.taxas || 0), 0)
  const freteTot = lista.reduce((s, p) => s + (p.frete || 0), 0)
  const unidades = lista.reduce((s, p) => s + p.qtd, 0)
  const ticket = lista.length ? receitaTot / lista.length : 0
  const margemMedia = receitaTot > 0 ? Math.round(liquidoTot / receitaTot * 100) : 0
  const hoje0 = new Date(); hoje0.setHours(0, 0, 0, 0)
  const pedidosHoje = lista.filter((p) => p.criado && new Date(p.criado) >= hoje0)
  const receitaHoje = pedidosHoje.reduce((s, p) => s + (p.receita || 0), 0)
  const fracaoDia = Math.min(1, (agoraTs - hoje0.getTime()) / 86400000)
  const projecao = fracaoDia > 0.05 ? receitaHoje / fracaoDia : receitaHoje
  const aDespachar = contagem.hoje || 0
  const pesoEstim = ((lista.filter((p) => classifica(p) === 'hoje').reduce((s, p) => s + p.qtd, 0)) * 0.32).toFixed(1)
  const semNf = lista.filter((p) => !p.nf && !p.nfDesconhecida && !p.cancelado).length
  const naoLidas = 0

  const serie = useMemo(() => { const m = {}; for (const p of lista) { if (!p.criado) continue; const dt = new Date(p.criado); const k = agrupo === 'mes' ? `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getFullYear()).slice(2)}` : `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`; m[k] = (m[k] || 0) + (p.receita || 0) } return Object.entries(m).slice(-12) }, [pedidos, agrupo])
  const maxS = Math.max(1, ...serie.map(([, v]) => v))
  const peakIdx = serie.reduce((bi, [, v], i, a) => (v > a[bi][1] ? i : bi), 0)
  const heat = useMemo(() => { const h = Array(24).fill(0); for (const p of lista) if (p.criado) h[new Date(p.criado).getHours()]++; return h }, [pedidos])
  const maxH = Math.max(1, ...heat)
  const abc = useMemo(() => {
    const porSku = {}
    for (const p of lista) for (const it of p.itens) { const k = it.sku || it.nome; porSku[k] = (porSku[k] || 0) + ((p.receita || 0) / Math.max(1, p.itens.length)) }
    const ord = Object.values(porSku).sort((a, b) => b - a); const tot = ord.reduce((s, v) => s + v, 0) || 1
    let acc = 0, nA = 0, nB = 0
    for (const v of ord) { acc += v; if (acc / tot <= 0.65) nA++; else if (acc / tot <= 0.9) nB++ }
    const sA = ord.slice(0, nA).reduce((s, v) => s + v, 0), sB = ord.slice(nA, nA + nB).reduce((s, v) => s + v, 0)
    const pA = Math.round(sA / tot * 100), pB = Math.round(sB / tot * 100)
    return [['A', `${nA} SKU(s) carregam`, pA, 'var(--ok)'], ['B', `${nB} SKU(s) somam`, pB, 'var(--warn)'], ['C', `${Math.max(0, ord.length - nA - nB)} SKU(s) restantes`, Math.max(0, 100 - pA - pB), 'var(--faint)']]
  }, [pedidos])
  const ufs = useMemo(() => { const m = {}; let tot = 0; for (const p of lista) if (p.uf) { m[p.uf] = (m[p.uf] || 0) + 1; tot++ } return { top: Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([uf, n]) => [uf, Math.round(n / tot * 100)]), tot } }, [pedidos])
  const coorte = useMemo(() => { const n = lista.filter((p) => (p.compras || 0) > 1).length; return lista.length ? Math.round(n / lista.length * 100) : 0 }, [pedidos])

  const corteMs = (() => { const alvo = new Date(); alvo.setHours(15, 0, 0, 0); return alvo - agoraTs })()
  const corteTxt = corteMs <= 0 ? 'ENCERRADO HOJE' : `CORTE EM ${Math.floor(corteMs / 3600000)}H ${String(Math.floor((corteMs % 3600000) / 60000)).padStart(2, '0')}M`
  const corteCor = corteMs <= 0 ? 'var(--faint)' : corteMs < 3600000 ? 'var(--danger)' : 'var(--warn)'

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    let arr = lista
    if (aba !== 'todos') arr = arr.filter((p) => classifica(p) === aba)
    if (pgto === 'pagos') arr = arr.filter((p) => p.pago)
    if (pgto === 'aguard') arr = arr.filter((p) => !p.pago)
    if (soDevolucao) arr = arr.filter((p) => p.devolucao)
    if (soSemNf) arr = arr.filter((p) => !p.nf && !p.nfDesconhecida)
    if (q) arr = arr.filter((p) => [p.id, p.titulo, p.comprador, p.rastreio, ...(p.itens.map((i) => i.sku))].join(' ').toLowerCase().includes(q))
    return arr.slice().sort((a, b) => {
      if (ordem === 'antigos') return new Date(a.criado || 0) - new Date(b.criado || 0)
      if (ordem === 'prioridade') return (b.devolucao - a.devolucao) || (b.cancelado - a.cancelado) || ((a.shipBy || 9e12) - (b.shipBy || 9e12))
      return new Date(b.criado || 0) - new Date(a.criado || 0)
    })
  }, [pedidos, aba, pgto, busca, ordem, soDevolucao, soSemNf])
  const nPag = Math.max(1, Math.ceil(filtrados.length / POR_PAG))
  const pageItems = filtrados.slice((pagina - 1) * POR_PAG, pagina * POR_PAG)
  useEffect(() => { setPagina(1) }, [busca, ordem, aba, pgto, soDevolucao, soSemNf])

  const mix = useMemo(() => {
    const base = filtrados.length || 1
    const prontos = Math.round(filtrados.filter((p) => p.rastreio).length / base * 100)
    const semEtq = Math.round(filtrados.filter((p) => !p.rastreio && !p.cancelado).length / base * 100)
    const canc = Math.max(0, 100 - prontos - semEtq)
    return [['etiqueta pronta', prontos, 'var(--ok)'], ['aguardando etiqueta', semEtq, d.cor], ['cancelado/outros', canc, 'var(--faint)']]
  }, [pedidos, aba, pgto, busca, ordem, canal, soDevolucao, soSemNf])


  const toggleSel = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target && e.target.tagName) || ''
      if (tag === 'INPUT' || tag === 'TEXTAREA') { if (e.key === 'Escape') e.target.blur(); return }
      const ids = pageItems.map((p) => p.id); const idx = ids.indexOf(aberto)
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); setAberto(ids[Math.min(ids.length - 1, idx < 0 ? 0 : idx + 1)] || null) }
      else if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); setAberto(ids[Math.max(0, idx < 0 ? 0 : idx - 1)] || null) }
      else if (e.key === 'e') { e.preventDefault(); setAberto(null) }
      else if (e.key === 'm') { e.preventDefault(); setMesaIdx(0); setModal('mesa') }
      else if (e.key === 'b') { e.preventDefault(); document.querySelector('[data-pcu-busca]')?.focus() }
      else if (e.key === 'Escape') { setAberto(null); setModal(null); setSel(new Set()) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pageItems, aberto])

  const baixarEtiquetas = async (soUm) => {
    try {
      const alvo = soUm ? [soUm] : [...sel]
      if (canal === 'ml') {
        const ids = alvo.map((id) => (lista.find((p) => p.id === id) || {}).shipId).filter(Boolean)
        if (!ids.length) return notify('Nenhum envio com etiqueta disponível.', 'warn')
        await api.mlEtiqueta(ids.join(','))
      } else await api.shopeeEtiquetaOficial(alvo, 'auto')
      notify('Etiqueta(s) geradas.', 'ok')
    } catch (e) { notify(e.message || 'Falha na etiqueta', 'danger') }
  }

  const filaChip = (Icon, lab, val, c) => (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 11px', borderRadius: 10, background: 'rgba(0,0,0,.2)', border: '1px solid var(--glass-border)' }}>
      <Icon size={12} style={{ color: c }} /><span style={{ fontSize: 9, color: 'var(--dim)' }}>{lab}</span><b className="num" style={{ fontSize: 11, color: c }}>{val}</b>
    </div>
  )
  const chip = (txt, c, bg, Icon) => <span className="chip" style={{ color: c, background: bg }}>{Icon && <Icon size={9} style={{ color: c }} />}{txt}</span>

  const kpis = [
    { lab: 'Pedidos · período', val: lista.length, ic: Package },
    { lab: 'Unidades', val: unidades, ic: Box },
    { lab: 'Receita', val: brl(receitaTot), ic: DollarSign },
    { lab: 'Ticket médio', val: brl(ticket), ic: Tag },
    { lab: 'Custos do canal', val: taxasTot ? `-${brl(taxasTot)}` : '—', ic: CreditCard, warn: true },
    { lab: d.freteRot, val: freteTot ? `-${brl(freteTot)}` : '—', ic: Truck, warn: true },
    { lab: 'Líquido', val: brl(liquidoTot), ic: CheckCheck, hero: true },
    { lab: 'Hoje', val: brl(receitaHoje), ic: Zap },
  ]
  const micro = [
    ['margem média', `${margemMedia}%`, OK], ['cancelados', contagem.cancel || 0, DANGER],
    ['devoluções', lista.filter((p) => p.devolucao).length, WARN], ['sem NF-e', semNf, semNf ? DANGER : 'var(--dim)'],
    ['recompra', `${coorte}%`, 'var(--accent)'], ['em trânsito', contagem.transito || 0, 'var(--blue)'],
    ['pico do dia', serie.length ? brl(serie[peakIdx][1]) : '—', d.cor], ['projeção hoje', brl(projecao), OK],
  ]
  const donut = useMemo(() => {
    const cores = { hoje: d.cor, proximos: 'var(--blue)', nf: 'var(--danger)', transito: 'var(--purple)', fim: 'var(--ok)', cancel: 'var(--faint)' }
    const tot = Math.max(1, lista.length); let off = 0
    return ABAS_DEF.filter(([id]) => id !== 'todos').map(([id, lab]) => {
      const n = contagem[id] || 0; const frac = n / tot; const seg = { id, lab, n, cor: cores[id], dash: Math.round(frac * 201), off }
      off += Math.round(frac * 201); return seg
    })
  }, [pedidos, contagem])

  return (
    <div className="pcuv2" style={{ '--ch': d.cor, '--chd': d.cord }}>
      {/* HEADER — DOM do mockup */}
      <div className="glass" style={{ padding: '16px 18px', marginBottom: 12, border: '1px solid transparent', background: `linear-gradient(var(--surface),var(--surface)) padding-box, linear-gradient(110deg, ${d.cor}88, rgba(214,0,127,.4), ${d.cor}44) border-box` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap' }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: d.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', boxShadow: '0 6px 20px rgba(0,0,0,.35)' }}><Package size={24} color="#1a1008" /></div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <b className="serif" style={{ fontSize: 21 }}>Central de pedidos</b>
              {chip(d.nome.toUpperCase(), '#1a1008', d.cor)}
              {chip('HUB BLING · NF-e', '#e9dbfb', 'rgba(160,107,232,.2)')}
              {chip('TEMPO REAL', 'var(--ok)', 'rgba(47,217,141,.12)', Zap)}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--dim)' }}>Do pagamento à entrega — separação, etiquetas, NF-e, repasse com margem e o perfil de quem compra</div>
          </div>
          <div style={{ flex: 1 }} />
          {/* seletor de canal */}
          <div className="seg">
            {['ml', 'shopee'].map((c) => <span key={c} className={canal === c ? 'on' : ''} onClick={() => setCanal(c)}>{CH[c].nome}</span>)}
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="btn" onClick={() => setModal('etq')}><Settings size={13} />Personalizar</div>
            <div className="btn" onClick={() => setModal('sep')}><Layers size={13} />Separação</div>
            <div className="btn" onClick={() => { setMesaIdx(0); setModal('mesa') }}><ScanLine size={13} />Mesa de Despacho</div>
            <div className="btn" onClick={() => setModal('imp')}><Printer size={13} />Impressão</div>
            <div className="btn" onClick={() => setAba('nf')}><FileText size={13} />NF-e</div>
            <div className="btn primary" onClick={() => baixarEtiquetas()}><Tag size={13} color="#1a1008" />Etiquetas em lote ({sel.size || contagem.hoje || 0})</div>
          </div>
        </div>
        {/* FILA OPERACIONAL */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {filaChip(Tag, 'Etiquetas prontas', lista.filter((p) => p.rastreio && classifica(p) === 'hoje').length, 'var(--ok)')}
          {filaChip(FileText, 'Aguardando NF-e', semNf, semNf ? 'var(--danger)' : 'var(--dim)')}
          {canal === 'ml' ? filaChip(Clock, 'Etiqueta libera depois (buffered)', lista.filter((p) => !p.rastreio && classifica(p) === 'hoje').length, 'var(--warn)') : filaChip(MapPin, 'Drop-off disponível', 'sim', 'var(--warn)')}
          {filaChip(AlertTriangle, 'Despacho atrasado', lista.filter((p) => p.shipBy && p.shipBy * 1000 < agoraTs && classifica(p) === 'hoje').length, 'var(--danger)')}
          {filaChip(Box, 'Volumes · peso da coleta', `${lista.filter((p) => classifica(p) === 'hoje').reduce((s, p) => s + p.qtd, 0)} · ${pesoEstim}kg`, 'var(--blue)')}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 8.5, color: 'var(--faint)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            {fundo ? <><Loader2 size={10} className="animate-spin" />sincronizando {fundo.carregados} de {fundo.total} — pode trabalhar</> : <><RefreshCw size={10} />sincronizado agora</>}
          </span>
        </div>
      </div>

      {/* ABAS */}
      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4, marginBottom: 11 }}>
        {ABAS_DEF.map(([id, lab, Icon]) => (
          <div key={id} className={`tab ${aba === id ? 'on' : ''}`} onClick={() => setAba(id)}><Icon size={13} />{lab}<span className="pill">{contagem[id] || 0}</span></div>
        ))}
      </div>

      {/* TOOLBAR */}
      <div className="glass" style={{ padding: '11px 15px', marginBottom: 11, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="up" style={{ fontSize: 8, color: 'var(--faint)', fontWeight: 800 }}>pagamento</span>
        <div className="seg">
          {[['todos', 'Todos'], ['pagos', 'Pagos'], ['aguard', 'Aguardando']].map(([id, l]) => <span key={id} className={pgto === id ? 'on' : ''} onClick={() => setPgto(id)}>{l}</span>)}
        </div>
        <div style={{ width: 1, height: 20, background: 'var(--glass-border)' }} />
        <div className={`toggle ${soSemNf ? 'on' : ''}`} style={soSemNf ? { color: 'var(--danger)', borderColor: 'rgba(255,122,122,.45)', background: 'rgba(255,122,122,.08)' } : undefined} onClick={() => setSoSemNf((v) => !v)}><span className="sw" />Sem dados fiscais ({semNf})</div>
        <div className={`toggle ${soDevolucao ? 'on' : ''}`} style={soDevolucao ? { color: 'var(--warn)', borderColor: 'rgba(224,162,60,.45)', background: 'rgba(224,162,60,.08)' } : undefined} onClick={() => setSoDevolucao((v) => !v)}><span className="sw" />Devoluções ({lista.filter((p) => p.devolucao).length})</div>
        <div style={{ flex: 1 }} />
        <div className="btn" style={{ fontSize: 9.5 }} onClick={() => setAgrupo(agrupo === 'dia' ? 'mes' : 'dia')}><CalendarDays size={12} />{agrupo === 'dia' ? 'Dia' : 'Mês'}·gráfico</div>
        <div className="btn" style={{ fontSize: 9.5 }} onClick={() => setOrdem('prioridade')}>Prioridade de despacho</div>
        <div className="btn" style={{ fontSize: 9.5, padding: '7px 9px' }} onClick={() => carregar()} title="Sincronizar agora"><RefreshCw size={12} /></div>
        <div className="seg">
          {[7, 15, 30].map((dd) => <span key={dd} className={dias === dd ? 'on' : ''} onClick={() => setDias(dd)}>{dd}d</span>)}
        </div>
        <div className="seg">
          <span className={densidade === 'conf' ? 'on' : ''} onClick={() => setDensidade('conf')}>Confortável</span>
          <span className={densidade === 'comp' ? 'on' : ''} onClick={() => setDensidade('comp')}>Compacto</span>
        </div>
      </div>

      {/* COLETA — 4 blocos como no mockup */}
      <div className="glass" style={{ padding: '12px 16px', marginBottom: 11, borderLeft: `3px solid ${corteCor}`, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', background: `linear-gradient(110deg, ${corteCor}18, transparent)` }}>
        <span className="chip" style={{ color: '#1a1008', background: corteCor === 'var(--faint)' ? 'var(--warn)' : corteCor }}><Clock size={9} color="#1a1008" />{corteTxt} · FICA VERMELHO EM 1H</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><Truck size={18} style={{ color: d.cor }} /><div><div className="up" style={{ fontSize: 7, color: 'var(--faint)' }}>Coleta de hoje</div><b style={{ fontSize: 13 }}>{canal === 'ml' ? '14:00 – 17:00' : '13:30 – 16:30'}</b></div></div>
        <div style={{ width: 1, height: 26, background: 'var(--glass-border)' }} />
        <div><div className="up" style={{ fontSize: 7, color: 'var(--faint)' }}>Corte</div><b className="num" style={{ fontSize: 12, color: 'var(--warn)' }}>15:00</b></div>
        <div><div className="up" style={{ fontSize: 7, color: 'var(--faint)' }}>Transportadora</div><b style={{ fontSize: 11 }}>{canal === 'ml' ? 'Mercado Envios · Coleta' : 'SPX Express'}</b></div>
        <div><div className="up" style={{ fontSize: 7, color: 'var(--faint)' }}>{canal === 'ml' ? 'Autorização' : 'AWB'}</div><b className="num" style={{ fontSize: 11, color: d.cor }}>{aDespachar > 0 ? `${aDespachar} volume(s)` : '—'}</b></div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 8.5, color: 'var(--faint)' }}>o alerta muda de cor a 1h do corte</span>
      </div>

      {/* KPIs 8 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 8, marginBottom: 8 }}>
        {kpis.map((k, i) => (
          <div key={i} className="kpi glass" style={k.hero ? { borderLeft: '3px solid var(--ok)' } : undefined}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div className="ico" style={{ background: k.hero ? 'rgba(47,217,141,.15)' : 'rgba(255,255,255,.05)' }}><k.ic size={14} style={{ color: k.hero ? 'var(--ok)' : k.warn ? 'var(--warn)' : 'var(--dim)' }} /></div>
            </div>
            <div className="up" style={{ fontSize: 6.5, color: 'var(--faint)' }}>{k.lab}</div>
            <b className="num serif" style={{ fontSize: 15.5, color: k.hero ? 'var(--ok)' : k.warn ? 'var(--warn)' : 'var(--fg)' }}>{k.val}</b>
          </div>
        ))}
      </div>
      {/* MICRO KPIs 8 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 8, marginBottom: 11 }}>
        {micro.map(([lab, val, c], i) => (
          <div key={i} style={{ background: 'rgba(0,0,0,.2)', border: '1px solid var(--glass-border)', borderRadius: 11, padding: '7px 10px' }}>
            <div className="up" style={{ fontSize: 6, color: 'var(--faint)' }}>{lab}</div><b className="num" style={{ fontSize: 11, color: c }}>{val}</b>
          </div>
        ))}
      </div>

      {/* ANALYTICS: barras · donut resumo · heatmap */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr 1fr', gap: 10, marginBottom: 11 }}>
        <div className="glass" style={{ padding: '14px 15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13 }}><span className="up" style={{ fontSize: 8.5, color: 'var(--faint)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}><DollarSign size={12} style={{ color: d.cor }} />Receita por {agrupo === 'mes' ? 'mês' : 'dia'} · {serie.length} {agrupo === 'mes' ? 'meses' : 'dias'}</span><div style={{ flex: 1 }} /><span className="num" style={{ fontSize: 8, color: 'var(--faint)' }}>pico {serie.length ? brl(serie[peakIdx][1]) : '—'}</span></div>
          <div className="barrow">
            {serie.map(([k, v], i) => <div key={k} className={`b ${i === peakIdx ? 'peak' : ''}`} style={{ height: `${Math.max(5, v / maxS * 96)}px` }} title={`${k} · ${brl(v)}`}><span>{i === peakIdx ? brl(v).replace('R$ ', '') : ''}</span></div>)}
            {serie.length === 0 && <span style={{ fontSize: 9, color: 'var(--faint)', margin: 'auto' }}>sem dados no período</span>}
          </div>
        </div>
        <div className="glass" style={{ padding: '14px 15px' }}>
          <div className="up" style={{ fontSize: 8.5, color: 'var(--faint)', fontWeight: 800, marginBottom: 11, display: 'flex', alignItems: 'center', gap: 6 }}><Layers size={12} style={{ color: d.cor }} />Resumo da aba</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ position: 'relative', width: 82, height: 82, flex: 'none' }}>
              <svg width="82" height="82" viewBox="0 0 92 92"><circle cx="46" cy="46" r="40" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="9" /><circle cx="46" cy="46" r="40" fill="none" stroke="var(--ok)" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${Math.round(Math.max(0, Math.min(100, margemMedia)) / 100 * 251)} 999`} transform="rotate(-90 46 46)" /></svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><b className="num serif" style={{ fontSize: 17, color: 'var(--ok)' }}>{margemMedia}%</b><span style={{ fontSize: 6.5, color: 'var(--faint)' }}>margem méd.</span></div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 9.5, color: 'var(--dim)' }}>Pedidos</span><b className="num" style={{ fontSize: 12 }}>{filtrados.length}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 9.5, color: 'var(--dim)' }}>Unidades</span><b className="num" style={{ fontSize: 12 }}>{filtrados.reduce((s, p) => s + p.qtd, 0)}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 9.5, color: 'var(--dim)' }}>Com rastreio</span><b className="num" style={{ fontSize: 12, color: d.cor }}>{filtrados.filter((p) => p.rastreio).length}</b></div>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <div className="up" style={{ fontSize: 6.5, color: 'var(--faint)', marginBottom: 5 }}>mix logístico</div>
            <div style={{ display: 'flex', height: 9, borderRadius: 5, overflow: 'hidden', gap: 2 }}>
              {mix.map((m) => m[1] > 0 && <div key={m[0]} style={{ flex: m[1], background: m[2] }} title={`${m[0]} ${m[1]}%`} />)}
            </div>
            <div style={{ display: 'flex', gap: 9, marginTop: 5, flexWrap: 'wrap' }}>
              {mix.map((m) => <span key={m[0]} style={{ fontSize: 7, color: 'var(--dim)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><i style={{ width: 7, height: 7, borderRadius: 2, background: m[2], display: 'inline-block' }} />{m[0]} {m[1]}%</span>)}
            </div>
          </div>
        </div>
        <div className="glass" style={{ padding: '14px 15px' }}>
          <div className="up" style={{ fontSize: 8.5, color: 'var(--faint)', fontWeight: 800, marginBottom: 11, display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={12} style={{ color: d.cor }} />Horários de compra · hoje ajuda a prever</div>
          <div className="heat">
            {heat.map((v, h) => <div key={h} title={`${h}h · ${v} pedido(s)`} style={{ height: 26, borderRadius: 5, background: v ? `rgba(214,0,127,${(0.18 + v / maxH * 0.62).toFixed(2)})` : 'rgba(255,255,255,.04)' }} />)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}><span style={{ fontSize: 6.5, color: 'var(--faint)' }}>0h</span><span style={{ fontSize: 6.5, color: 'var(--faint)' }}>12h</span><span style={{ fontSize: 6.5, color: 'var(--faint)' }}>23h</span></div>
        </div>
      </div>

      {/* INTELIGÊNCIA: PROJEÇÃO · ABC · DESTINOS — DOM do mockup */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 10, marginBottom: 11 }}>
        <div className="glass" style={{ padding: '13px 15px' }}>
          <div className="up" style={{ fontSize: 8.5, color: 'var(--faint)', fontWeight: 800, marginBottom: 9, display: 'flex', alignItems: 'center', gap: 6 }}><Zap size={12} style={{ color: d.cor }} />Projeção do dia</div>
          <b className="num serif" style={{ fontSize: 21, color: 'var(--ok)' }}>{brl(projecao)}</b>
          <div style={{ fontSize: 8.5, color: 'var(--faint)', marginTop: 2 }}>no ritmo de hoje ({brl(receitaHoje)} até agora · {Math.round(fracaoDia * 100)}% do dia)</div>
          <div style={{ height: 7, borderRadius: 4, background: 'rgba(255,255,255,.07)', overflow: 'hidden', marginTop: 8 }}><div style={{ height: '100%', width: `${Math.round(fracaoDia * 100)}%`, background: 'linear-gradient(90deg,var(--ok),rgba(47,217,141,.3))' }} /></div>
        </div>
        <div className="glass" style={{ padding: '13px 15px' }}>
          <div className="up" style={{ fontSize: 8.5, color: 'var(--faint)', fontWeight: 800, marginBottom: 9, display: 'flex', alignItems: 'center', gap: 6 }}><Layers size={12} style={{ color: d.cor }} />Curva ABC · receita do período</div>
          {abc.map((x) => (
            <div key={x[0]} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
              <b style={{ width: 14, fontSize: 11, color: x[3] }}>{x[0]}</b>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 7.5, color: 'var(--dim)' }}>{x[1]} <b className="num" style={{ color: x[3] }}>{x[2]}%</b></div>
                <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,.06)', overflow: 'hidden', marginTop: 2 }}><div style={{ height: '100%', width: `${x[2]}%`, background: x[3] }} /></div>
              </div>
            </div>
          ))}
          <div style={{ fontSize: 7, color: 'var(--faint)' }}>foque reposição e resposta rápida nos A — eles pagam o mês</div>
        </div>
        <div className="glass" style={{ padding: '13px 15px' }}>
          <div className="up" style={{ fontSize: 8.5, color: 'var(--faint)', fontWeight: 800, marginBottom: 9, display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={12} style={{ color: d.cor }} />Para onde você vende · top estados</div>
          {ufs.top.length === 0 && <div style={{ fontSize: 8.5, color: 'var(--faint)' }}>endereços chegam com o detalhe dos pedidos</div>}
          {ufs.top.map(([uf, pct]) => (
            <div key={uf} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <b className="num" style={{ width: 22, fontSize: 9 }}>{uf}</b>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}><div style={{ height: '100%', width: `${pct * 2}%`, background: `linear-gradient(90deg,${d.cor},${d.cor}44)` }} /></div>
              <span className="num" style={{ fontSize: 8.5, color: 'var(--dim)', width: 28, textAlign: 'right' }}>{pct}%</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--glass-border)' }}><span style={{ fontSize: 7.5, color: 'var(--faint)' }}>coorte de recompra</span><b className="num" style={{ fontSize: 8.5, color: 'var(--accent)' }}>{coorte}% voltam</b></div>
        </div>
      </div>

      {/* REGRAS DO OPERADOR */}
      <div className="glass" style={{ padding: '12px 15px', marginBottom: 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9, flexWrap: 'wrap' }}>
          <Settings size={13} style={{ color: d.cor }} /><b className="serif" style={{ fontSize: 13 }}>Regras do operador · automatize o repetitivo</b>
          {chip('VOCÊ NO COMANDO', '#1a1008', d.cor)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {[['nf_imprime', 'NF-e emitida → imprimir etiqueta sozinho', 'elimina 1 clique por pedido'], ['risco_segura', 'Risco de fraude → segurar e avisar', 'nunca despacha pedido sinalizado'], ['presente_selo', 'Mensagem contém “presente” → selo PRESENTE', 'embrulho certo na separação']].map(([k, t, s]) => {
            const on = !!regras[k]
            return (
              <div key={k} onClick={() => setRegras((r) => ({ ...r, [k]: !on }))} style={{ display: 'flex', alignItems: 'center', gap: 10, background: on ? 'rgba(47,217,141,.05)' : 'rgba(0,0,0,.18)', border: `1px solid ${on ? 'rgba(47,217,141,.35)' : 'var(--glass-border)'}`, borderRadius: 11, padding: '9px 11px', cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 9.5, fontWeight: 700 }}>{t}</div><div style={{ fontSize: 7.5, color: 'var(--faint)' }}>{s}</div></div>
                <div className={`toggle ${on ? 'on' : ''}`} style={{ padding: '3px 4px', pointerEvents: 'none', background: on ? 'rgba(47,217,141,.15)' : undefined, borderColor: on ? 'rgba(47,217,141,.4)' : undefined }}><span className="sw" /></div>
              </div>
            )
          })}
        </div>
      </div>

      {/* BUSCA + ORDENAR + PAGINAÇÃO TOPO */}
      <div className="glass" style={{ padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
        <Search size={13} style={{ color: 'var(--faint)' }} />
        <input data-pcu-busca value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por pedido, comprador, produto, SKU, rastreio…" style={{ flex: 1, minWidth: 180, background: 'transparent', border: 'none', outline: 'none', color: 'var(--fg)', fontSize: 12 }} />
        <div className="seg">
          {[['recentes', 'Recentes'], ['antigos', 'Antigos'], ['prioridade', 'Prioridade']].map(([id, l]) => <span key={id} className={ordem === id ? 'on' : ''} onClick={() => setOrdem(id)}>{l}</span>)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="pgbtn" onClick={() => setPagina((p) => Math.max(1, p - 1))}><ChevronLeft size={12} /></div>
          <span className="num" style={{ fontSize: 9, color: 'var(--faint)' }}>pág. {pagina} de {nPag} · {filtrados.length}</span>
          <div className="pgbtn" onClick={() => setPagina((p) => Math.min(nPag, p + 1))}><ChevronRight size={12} /></div>
        </div>
      </div>

      {/* LISTA */}
      {erro && <div className="glass" style={{ padding: 16, fontSize: 11, color: 'var(--dim)', display: 'flex', gap: 8, alignItems: 'center' }}><AlertTriangle size={14} style={{ color: 'var(--danger)' }} /> {erro} <span className="btn" onClick={() => carregar()}>tentar de novo</span></div>}
      {pedidos === null ? <div className="glass" style={{ padding: 24, display: 'flex', gap: 8, alignItems: 'center', color: 'var(--dim)', fontSize: 12 }}><Loader2 size={15} className="animate-spin" /> carregando os pedidos…</div>
        : pageItems.length === 0 ? <div className="glass" style={{ padding: 24, textAlign: 'center', fontSize: 11, color: 'var(--faint)' }}>Nenhum pedido {busca ? 'para esta busca' : 'nesta aba'}.</div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {pageItems.map((p) => <UltraCard key={p.id} p={p} d={d} canal={canal} exp={aberto === p.id} densidade={densidade}
              onToggle={() => setAberto(aberto === p.id ? null : p.id)} sel={sel.has(p.id)} onSel={() => toggleSel(p.id)}
              baixarEtiqueta={() => baixarEtiquetas(p.id)} agoraTs={agoraTs} notify={notify} />)}
          </div>}

      {/* MASSBAR */}
      {sel.size > 0 && (
        <div className="massbar">
          <span className="chip" style={{ color: '#fff', background: 'var(--accent)' }}>{sel.size} SELECIONADO{sel.size > 1 ? 'S' : ''}</span>
          <div className="btn primary" style={{ fontSize: 10 }} onClick={() => baixarEtiquetas()}><Tag size={12} color="#1a1008" />Etiquetas</div>
          <div className="btn" style={{ fontSize: 10 }} onClick={() => setAba('nf')}><FileText size={12} />NF-e</div>
          <div className="btn" style={{ fontSize: 10 }} onClick={() => setModal('sep')}><Layers size={12} />Separação</div>
          <div className="btn" style={{ fontSize: 10 }} onClick={() => imprimirFolhasPedido(filtrados.filter((x) => sel.has(x.id)).map(paraImpressao))}><Printer size={12} />Imprimir pedidos</div>
          <div className="btn" style={{ fontSize: 10 }} onClick={() => { setMesaIdx(0); setModal('mesa') }}><ScanLine size={12} />Mesa</div>
          <span style={{ fontSize: 8, color: 'var(--faint)' }}>esc limpa</span>
        </div>
      )}

      {/* TOAST tempo real */}
      {novos > 0 && (
        <div className="toast">
          <Zap size={14} style={{ color: 'var(--ok)' }} />
          <div><b style={{ fontSize: 10 }}>{novos} pedido{novos > 1 ? 's' : ''} novo{novos > 1 ? 's' : ''} chegaram</b><div style={{ fontSize: 8, color: 'var(--faint)' }}>sincronização automática · agora</div></div>
          <div className="btn" style={{ fontSize: 9, padding: '5px 10px' }} onClick={() => { setNovos(0); setOrdem('recentes'); setPagina(1) }}>trazer para a tela</div>
        </div>
      )}

      {/* RODAPÉ DE CONTAGEM */}
      {pedidos !== null && <div style={{ textAlign: 'center', fontSize: 9, color: 'var(--faint)', paddingTop: 14 }}>
        {filtrados.length ? `${(pagina - 1) * POR_PAG + 1}–${Math.min(pagina * POR_PAG, filtrados.length)} de ${filtrados.length}` : '0'} em «{(ABAS_DEF.find((a) => a[0] === aba) || [])[1]}» · últimos {dias} dias · {lista.length} pedido(s) carregado(s){fundo ? ` (de ${fundo.total})` : ''}
      </div>}

      {/* PAGINAÇÃO RODAPÉ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, justifyContent: 'center', padding: '16px 0 30px' }}>
        <div className="pgbtn" onClick={() => setPagina((p) => Math.max(1, p - 1))}><ChevronLeft size={13} /></div>
        {Array.from({ length: Math.min(nPag, 5) }, (_, i) => i + Math.max(1, Math.min(pagina - 2, nPag - 4))).map((n) => (
          <div key={n} className={`pgbtn ${n === pagina ? 'on' : ''}`} onClick={() => setPagina(n)}>{n}</div>
        ))}
        <span style={{ fontSize: 9, color: 'var(--faint)' }}>· {filtrados.length} pedidos</span>
      </div>

      {/* KBDBAR */}
      <div className="kbdbar">
        <span><span className="kbd">J</span>/<span className="kbd">K</span> navega</span><span><span className="kbd">E</span> recolhe</span>
        <span><span className="kbd">M</span> mesa</span><span><span className="kbd">B</span> busca</span><span><span className="kbd">esc</span> limpa</span>
      </div>

      {modal === 'mesa' && <UltraMesa fila={filtrados.filter((p) => classifica(p) === 'hoje' || aba === 'todos').slice(0, 40)} idx={mesaIdx} setIdx={setMesaIdx} conf={mesaConf} setConf={setMesaConf} onFechar={() => setModal(null)} d={d} />}
      {modal === 'sep' && <ModalSep filtrados={filtrados} d={d} canal={canal} onFechar={() => setModal(null)} abrirMesa={() => { setMesaIdx(0); setModal('mesa') }} />}
      {modal === 'imp' && <ModalImp filtrados={filtrados} d={d} canal={canal} semNf={semNf} onFechar={() => setModal(null)} imprimirTudo={() => baixarEtiquetas()} />}
      {modal === 'etq' && <ModalEtq d={d} canal={canal} exemplo={filtrados[0]} n={sel.size || aDespachar || filtrados.length} onFechar={() => setModal(null)} gerar={() => { setModal(null); baixarEtiquetas() }} />}
    </div>
  )
}

// ————— CARD fiel ao cardHTML/cardCompacto do mockup —————
function UltraCard({ p, d, canal, exp, densidade, onToggle, sel, onSel, baixarEtiqueta, agoraTs, notify }) {
  const rail = p.cancelado ? 'var(--danger)' : p.devolucao ? 'var(--warn)' : classifica(p) === 'fim' ? 'var(--ok)' : d.cor
  const estado = p.cancelado ? 'CANCELADO' : p.devolucao ? 'DEVOLUÇÃO' : statusPt(p.status).toUpperCase().slice(0, 24)
  const estadoCor = p.cancelado ? 'var(--danger)' : p.devolucao ? 'var(--warn)' : classifica(p) === 'fim' ? 'var(--ok)' : d.cor
  const conta = p.shipBy ? (p.shipBy * 1000 < agoraTs ? 'despacho atrasado' : `despachar até ${new Date(p.shipBy * 1000).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`) : (p.criado ? new Date(p.criado).toLocaleDateString('pt-BR') : '')
  const contaCor = p.shipBy && p.shipBy * 1000 < agoraTs ? 'var(--danger)' : 'var(--dim)'
  const chip = (txt, c, bg) => <span className="chip" style={{ color: c, background: bg }}>{txt}</span>

  if (densidade === 'comp' && !exp) {
    return (
      <div className="card glass" style={{ padding: 0 }}>
        <div className="rail" style={{ background: rail }} />
        <div style={{ padding: '9px 14px 9px 18px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={onToggle}>
          <div onClick={(e) => { e.stopPropagation(); onSel() }} style={{ width: 14, height: 14, borderRadius: 4, border: sel ? 'none' : '2px solid var(--glass-border)', background: sel ? 'var(--accent)' : 'transparent', flex: 'none', display: 'grid', placeItems: 'center' }}>{sel && <Check size={10} color="#fff" />}</div>
          <div style={{ width: 30, height: 30, borderRadius: 7, overflow: 'hidden', background: 'rgba(255,255,255,.06)', flex: 'none' }}>{p.itens[0]?.imagem && <img src={p.itens[0].imagem} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
          <b style={{ fontSize: 11, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.titulo}</b>
          {chip(estado, estadoCor === 'var(--ok)' || estadoCor === 'var(--danger)' ? '#1a1008' : '#fff', estadoCor)}
          {p.taxas != null && <span className="num" style={{ fontSize: 8.5, color: 'var(--warn)' }}>tx − {brl(p.taxas)}</span>}
          {p.liquido != null && <span className="num" style={{ fontSize: 8.5, color: 'var(--ok)' }}>sobra {brl(p.liquido)}{p.margem != null ? ` · ${Math.round(p.margem)}%` : ''}</span>}
          <b className="num" style={{ fontSize: 12, flex: 'none' }}>{brl(p.receita)}</b>
        </div>
      </div>
    )
  }

  return (
    <div className={`card glass ${exp ? 'exp' : ''}`} style={{ padding: 0 }}>
      <div className="rail" style={{ background: rail }} />
      <div style={{ padding: '12px 15px 12px 19px', cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div onClick={(e) => { e.stopPropagation(); onSel() }} style={{ width: 16, height: 16, borderRadius: 4, border: sel ? 'none' : '2px solid var(--glass-border)', background: sel ? 'var(--accent)' : 'transparent', flex: 'none', display: 'grid', placeItems: 'center' }}>{sel && <Check size={11} color="#fff" />}</div>
          <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', background: 'linear-gradient(135deg,#4a2a3a,#3a2530)', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {p.itens[0]?.imagem ? <img src={p.itens[0].imagem} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Box size={19} style={{ color: 'rgba(255,255,255,.55)' }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <b style={{ fontSize: 12.5 }}>{p.titulo}</b>
              <span className="chip" style={{ fontSize: 7.5, color: 'var(--faint)', background: 'rgba(255,255,255,.05)' }}>{p.qtd} un</span>
              {(p.compras || 0) > 1 && chip(`${p.compras}ª COMPRA`, '#1a1008', 'var(--gold, #F2C200)')}
              {!p.nf && !p.nfDesconhecida && !p.cancelado && chip('SEM NF-E', '#fff', 'var(--danger)')}
              {p.prejuizo && chip('PREJUÍZO', '#fff', 'var(--danger)')}
              {!p.prejuizo && p.abaixoMeta && chip('ABAIXO DA META', '#1a1008', 'var(--warn)')}
            </div>
            <div style={{ fontSize: 9, color: 'var(--faint)', marginTop: 3 }}>#{p.id} · {p.criado ? new Date(p.criado).toLocaleDateString('pt-BR') : '—'} · {p.comprador} · <span style={{ color: 'var(--dim)' }}>{p.itens[0]?.sku || ''}</span></div>
          </div>
          <div style={{ textAlign: 'right', flex: 'none' }}>
            <div className="up" style={{ fontSize: 7, color: 'var(--faint)' }}>Vendido</div>
            <b className="num serif" style={{ fontSize: 16 }}>{brl(p.receita)}</b>
          </div>
          <div style={{ flex: 'none', color: 'var(--faint)', transform: exp ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}><ChevronRight size={18} /></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0', flexWrap: 'wrap', padding: '8px 11px', borderRadius: 11, background: 'rgba(0,0,0,.18)' }}>
          {chip(estado, estadoCor === 'var(--ok)' || estadoCor === 'var(--danger)' ? '#1a1008' : '#fff', estadoCor)}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, color: contaCor }}><Clock size={10} />{conta}</span>
          <div style={{ flex: 1 }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'var(--dim)' }}><CreditCard size={10} />{p.pago ? 'pago' : 'aguardando pagamento'}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, color: p.nf ? 'var(--ok)' : 'var(--danger)' }}><FileText size={10} />{p.nf ? 'NF-e emitida' : 'NF-e pendente'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          <KpiMini lab="Vendido" val={brl(p.receita)} sub={p.alvo ? `alvo Bling ${brl(p.alvo)}` : ''} cor="var(--fg)" />
          <KpiMini lab="Taxas mkt" val={p.taxas != null ? `− ${brl(p.taxas)}` : '—'} cor="var(--warn)" />
          <KpiMini lab={d.freteRot} val={p.frete != null ? (p.frete ? `− ${brl(p.frete)}` : 'sem custo') : '—'} cor="var(--warn)" />
          <KpiMiniMargem val={brl(p.liquido)} m={p.margem != null ? Math.round(p.margem) : null} />
        </div>
      </div>
      {exp && <UltraExpand p={p} d={d} canal={canal} baixarEtiqueta={baixarEtiqueta} notify={notify} agoraTs={agoraTs} />}
    </div>
  )
}
function KpiMini({ lab, val, sub, cor }) {
  return <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '7px 10px' }}>
    <div className="up" style={{ fontSize: 6.5, color: 'var(--faint)' }}>{lab}</div><b className="num" style={{ fontSize: 12.5, color: cor }}>{val}</b>
    {sub ? <div className="num" style={{ fontSize: 7, color: 'var(--faint)' }}>{sub}</div> : null}</div>
}
function KpiMiniMargem({ val, m }) {
  const dash = Math.round((m || 0) / 100 * 40)
  return <div style={{ background: 'rgba(47,217,141,.06)', border: '1px solid rgba(47,217,141,.25)', borderRadius: 10, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
    <div style={{ flex: 1 }}><div className="up" style={{ fontSize: 6.5, color: 'var(--ok)' }}>Sobra / líquido</div><b className="num" style={{ fontSize: 13, color: 'var(--ok)' }}>{val}</b></div>
    {m != null && <div style={{ position: 'relative', width: 30, height: 30, flex: 'none' }}>
      <svg width="30" height="30" viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="4" /><circle cx="16" cy="16" r="13" fill="none" stroke="var(--ok)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${dash} 999`} transform="rotate(-90 16 16)" /></svg>
      <div className="num" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7.5, fontWeight: 800 }}>{m}</div>
    </div>}
  </div>
}

// ————— EXPANSÃO fiel ao expandHTML do mockup (2 colunas) —————
function UltraExpand({ p, d, canal, baixarEtiqueta, notify, agoraTs }) {
  const [modalEtq, setModalEtq] = useState(false)
  const [envio, setEnvio] = useState(undefined)
  const [msgs, setMsgs] = useState(undefined)
  const [msgTexto, setMsgTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  useEffect(() => {
    let vivo = true
    if (canal === 'ml' && p.packId) api.mlMensagens(p.packId).then((r) => vivo && setMsgs(r)).catch(() => vivo && setMsgs(null))
    else setMsgs(null)
    // endereço real do ML: vem do envio (shipment), não da lista
    if (canal === 'ml' && p.shipId) api.mlEnvio(p.shipId).then((r) => vivo && setEnvio(r || null)).catch(() => vivo && setEnvio(null))
    else setEnvio(null)
    return () => { vivo = false }
  }, [p.id])
  const dest = envio?.destination?.shipping_address || envio?.receiver_address || envio?.destino || null
  const destNome = envio?.destination?.receiver_name || dest?.receiver_name || dest?.nome || null
  const destLinha = dest ? [dest.address_line || dest.endereco, dest.city?.name || dest.cidade, (dest.state?.id || dest.state?.name || dest.uf || '').toString().replace('BR-', ''), dest.zip_code || dest.cep].filter(Boolean).join(' · ') : null
  const rastreioEnvio = envio?.tracking_number || envio?.rastreio || null
  const fmtD = (v) => { const x = v?.date || v; if (!x) return null; try { return new Date(x).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) } catch (_) { return null } }
  const lead = envio?.lead_time || envio || {}
  const prevEntrega = fmtD(lead.estimated_delivery_time) || fmtD(lead.estimated_delivery_final) || null
  const limiteDespacho = canal === 'ml' ? (fmtD(lead.estimated_handling_limit) || null) : (p.shipBy ? new Date(p.shipBy * 1000).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : null)
  const LOGI = { me2: 'Coleta ME2', self_service: 'Flex', fulfillment: 'Full (ML expede)', drop_off: 'Agência (drop-off)', xd_drop_off: 'Agência (drop-off)', cross_docking: 'Coleta' }
  const modalidade = canal === 'ml' ? (LOGI[envio?.logistic_type] || envio?.logistic_type || 'Mercado Envios') : 'SPX pickup / drop-off'
  const enviarMsg = async () => {
    const t = msgTexto.trim(); if (!t) return
    setEnviando(true)
    try { await api.mlEnviarMensagem(p.packId, p.buyerId, t); setMsgTexto(''); notify('Mensagem enviada.', 'ok') } catch (e) { notify(e.message || 'Falha ao enviar', 'danger') }
    setEnviando(false)
  }
  const score = p.cancelado ? 88 : p.devolucao ? 54 : ((p.compras || 0) <= 1 && (p.receita || 0) > 60) ? 26 : 8
  const scoreCor = score >= 70 ? 'var(--danger)' : score >= 40 ? 'var(--warn)' : 'var(--ok)'
  const mDash = Math.round((p.margem || 0) / 100 * 201)
  const fase = p.cancelado ? 0 : /deliver|entreg|complet/i.test(p.status) ? 3 : /shipped|enviado|transit/i.test(p.status) ? 2 : 1
  const cliKpi = (lab, val, Icon) => (
    <div style={{ background: 'rgba(0,0,0,.2)', border: '1px solid var(--glass-border)', borderRadius: 9, padding: '6px 9px', display: 'flex', alignItems: 'center', gap: 7 }}>
      <Icon size={11} style={{ color: 'var(--accent)' }} /><div><div className="up" style={{ fontSize: 6, color: 'var(--faint)' }}>{lab}</div><b className="num" style={{ fontSize: 9.5 }}>{val}</b></div>
    </div>
  )
  return (
    <div style={{ borderTop: '1px solid var(--glass-border)', background: 'linear-gradient(180deg,rgba(214,0,127,.04),transparent)', padding: '14px 15px 15px 19px' }}>
      <div style={{ display: 'flex', gap: 7, marginBottom: 12, flexWrap: 'wrap' }}>
        <div className="btn primary" style={{ fontSize: 10 }} onClick={baixarEtiqueta}><Tag size={12} color={d.txt} />Baixar etiqueta</div>
        <div className="btn" style={{ fontSize: 10 }} onClick={() => imprimirEtiquetas([paraImpressao(p)], '')}><Eye size={12} />Etiqueta da transportadora</div>
        <div className="btn" style={{ fontSize: 10 }} onClick={() => imprimirFolhasPedido([paraImpressao(p)])}><Printer size={12} />Imprimir pedido</div>
        <div className="btn" style={{ fontSize: 10 }} onClick={() => window.open(canal === 'ml' ? `https://www.mercadolivre.com.br/vendas/${p.id}/detalhe` : `https://seller.shopee.com.br/portal/sale/order/${p.id}`, '_blank')}><Box size={12} />Abrir no canal</div>
        <div style={{ flex: 1 }} />
        {!p.cancelado && !p.devolucao && <span className="chip" style={{ color: 'var(--ok)', background: 'rgba(47,217,141,.12)' }}><ShieldCheck size={9} style={{ color: 'var(--ok)' }} />SLA NO PRAZO</span>}
      </div>
      <div className="exp-grid">
        {/* coluna esquerda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="blk">
            <h4 style={{ color: 'var(--ch, ' + d.cor + ')' }}><Truck size={12} style={{ color: d.cor }} />Linha do tempo do envio</h4>
            <div className="tl">
              {['Pagamento aprovado', statusPt(p.status) || 'Em preparação', canal === 'ml' ? 'Coletado pela transportadora' : 'Coletado pela SPX', 'Entregue'].map((t, i) => (
                <div key={i} className={`node ${i <= fase ? 'done' : ''}`} style={i > fase ? { opacity: .5 } : undefined}>
                  <div style={{ fontSize: 10, fontWeight: 600 }}>{t}</div>
                  {i === 0 && p.pago && <div className="num" style={{ fontSize: 7.5, color: 'var(--faint)' }}>{new Date(p.pago).toLocaleString('pt-BR')}</div>}
                  {i === 1 && p.shipBy && <div className="num" style={{ fontSize: 7.5, color: p.shipBy * 1000 < agoraTs ? 'var(--danger)' : 'var(--warn)' }}>despachar até {new Date(p.shipBy * 1000).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>}
                </div>
              ))}
            </div>
          </div>
          <div className="blk">
            <h4 style={{ color: d.cor }}><MapPin size={12} style={{ color: d.cor }} />Entrega</h4>
            {canal === 'shopee'
              ? <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 9, borderRadius: 9, background: 'rgba(224,162,60,.06)', border: '1px solid rgba(224,162,60,.25)' }}>
                <Lock size={13} style={{ color: 'var(--warn)', flex: 'none' }} />
                <div style={{ fontSize: 9, color: 'var(--dim)', lineHeight: 1.5 }}>
                  {(p.clienteReal || p.cidade) && <div style={{ fontSize: 10, color: 'var(--fg)', marginBottom: 3 }}><b>{p.clienteReal || p.comprador}</b>{p.cidade ? ` · ${p.cidade}` : ''}{p.uf ? `/${p.uf}` : ''}{p.cep ? ` · ${p.cep}` : ''}</div>}
                  <b style={{ color: 'var(--warn)' }}>Endereço completo mascarado pela Shopee.</b> A rua e o número saem apenas na <b>waybill oficial da SPX</b>, gerada no envio.{p.rastreio ? <> Rastreio: <span className="num">{p.rastreio}</span></> : null}
                </div>
              </div>
              : <div style={{ fontSize: 10, lineHeight: 1.65 }}>
                {envio === undefined && <span style={{ color: 'var(--faint)', display: 'inline-flex', gap: 5, alignItems: 'center' }}><Loader2 size={10} className="animate-spin" />buscando o endereço do envio…</span>}
                {envio !== undefined && <>
                  <b>{destNome || p.comprador}</b>{!destLinha && p.uf ? ` · ${p.uf}` : ''}
                  {destLinha && <><br />{destLinha}</>}
                  <br /><span style={{ color: 'var(--faint)' }}>{(rastreioEnvio || p.rastreio) ? <>rastreio <span className="num">{rastreioEnvio || p.rastreio}</span></> : 'etiqueta/rastreio liberam com o envio'}</span>
                </>}
              </div>}
            <div style={{ display: 'flex', gap: 13, marginTop: 9, fontSize: 8.5, flexWrap: 'wrap' }}>
              <div><div className="up" style={{ color: 'var(--faint)', fontSize: 6.5 }}>Previsão</div><b className="num">{prevEntrega || '—'}</b></div>
              <div><div className="up" style={{ color: 'var(--faint)', fontSize: 6.5 }}>Limite p/ {canal === 'ml' ? 'despacho' : 'envio'}</div><b className="num" style={{ color: 'var(--warn)' }}>{limiteDespacho || '—'}</b></div>
              <div><div className="up" style={{ color: 'var(--faint)', fontSize: 6.5 }}>Prazo comprador</div><b className="num">{prevEntrega || '—'}</b></div>
              <div><div className="up" style={{ color: 'var(--faint)', fontSize: 6.5 }}>Modalidade</div><b>{modalidade}</b></div>
            </div>
          </div>
          <div className="blk">
            <h4 style={{ color: d.cor }}><Box size={12} style={{ color: d.cor }} />Produtos</h4>
            {p.itens.map((it, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < p.itens.length - 1 ? 7 : 0 }}>
                <div style={{ width: 38, height: 38, borderRadius: 8, overflow: 'hidden', background: 'linear-gradient(135deg,#4a2a3a,#3a2530)', flex: 'none' }}>{it.imagem && <img src={it.imagem} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 10, fontWeight: 600 }}>{it.nome}</div><div className="num" style={{ fontSize: 7.5, color: 'var(--faint)' }}>{[it.sku, `${it.qtd} un`, it.bin ? `bin ${it.bin}` : ''].filter(Boolean).join(' · ')}</div></div>
              </div>
            ))}
          </div>
          <div className="blk">
            <h4 style={{ color: p.nf ? d.cor : 'var(--danger)' }}><FileText size={12} style={{ color: p.nf ? d.cor : 'var(--danger)' }} />Nota fiscal</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="chip" style={{ color: p.nf ? 'var(--ok)' : '#fff', background: p.nf ? 'rgba(47,217,141,.12)' : 'var(--danger)' }}>{p.nf ? 'NF-E EMITIDA' : 'NF-E PENDENTE'}</span>
              <span style={{ fontSize: 8.5, color: 'var(--faint)' }}>{p.nf ? 'vinculada ao pedido via Bling' : 'emitir no Bling para liberar o envio'}</span>
            </div>
          </div>
        </div>
        {/* coluna direita */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="blk" style={{ borderColor: 'rgba(214,0,127,.3)' }}>
            <h4 style={{ color: 'var(--accent)' }}><User size={12} style={{ color: 'var(--accent)' }} />Comprador · comportamento</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(145deg,var(--accent),#7b2a8c)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><User size={16} color="#fff" /></div>
              <div style={{ flex: 1 }}><b style={{ fontSize: 11 }}>{p.comprador}</b><div style={{ fontSize: 7.5, color: 'var(--faint)' }}>{canal === 'ml' ? 'perfil via /orders do ML' : 'histórico com a sua loja'}</div></div>
              {(p.compras || 0) > 1 && <span className="chip" style={{ color: '#1a1008', background: 'var(--gold, #F2C200)' }}>RECORRENTE</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 }}>
              {cliKpi('Compras na loja', `${p.compras || 1}x`, Repeat)}
              {cliKpi('Última compra', p.criado ? new Date(p.criado).toLocaleDateString('pt-BR') : '—', Clock)}
              {cliKpi('Ticket deste pedido', brl(p.receita), Star)}
              {cliKpi('Disputas', p.devolucao ? '1 aberta' : 'nenhuma', AlertTriangle)}
            </div>
          </div>
          <div className="blk" style={{ border: '1px solid rgba(47,217,141,.3)' }}>
            <h4 style={{ color: 'var(--ok)' }}><DollarSign size={12} style={{ color: 'var(--ok)' }} />Repasse e margem{canal === 'shopee' ? ' · escrow real' : ''}</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, fontSize: 9.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--dim)' }}>Receita</span><b className="num">{brl(p.receita)}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--dim)' }}>Taxas mkt</span><b className="num" style={{ color: 'var(--warn)' }}>{p.taxas != null ? `− ${brl(p.taxas)}` : '—'}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--dim)' }}>{d.freteRot}</span><b className="num" style={{ color: 'var(--warn)' }}>{p.frete != null ? (p.frete ? `− ${brl(p.frete)}` : 'sem custo') : '—'}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 5, borderTop: '1px solid var(--glass-border)' }}><span style={{ fontWeight: 700 }}>Sobra (líquido)</span><b className="num" style={{ color: 'var(--ok)' }}>{brl(p.liquido)}</b></div>
                {p.alvo && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--faint)', fontSize: 8 }}>alvo (Preço Bling)</span><b className="num" style={{ fontSize: 8, color: 'var(--faint)' }}>{brl(p.alvo)}</b></div>}
              </div>
              {p.margem != null && <div style={{ position: 'relative', width: 70, height: 70, flex: 'none' }}>
                <svg width="70" height="70" viewBox="0 0 78 78"><circle cx="39" cy="39" r="32" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="8" /><circle cx="39" cy="39" r="32" fill="none" stroke="var(--ok)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${mDash} 999`} transform="rotate(-90 39 39)" /></svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><b className="num serif" style={{ fontSize: 14, color: 'var(--ok)' }}>{Math.round(p.margem)}%</b><span style={{ fontSize: 5.5, color: 'var(--faint)' }}>margem</span></div>
              </div>}
            </div>
            {p.taxas != null && p.taxas > 0 && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--glass-border)' }}>
                <div className="up" style={{ fontSize: 6.5, color: 'var(--faint)', marginBottom: 5 }}>composição da tarifa (billing)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 8.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--dim)' }}>Comissão {canal === 'ml' ? '(categoria)' : '+ taxa de serviço'}</span><b className="num" style={{ color: 'var(--warn)' }}>− {brl(p.taxas * 0.72)}</b></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--dim)' }}>Custo fixo por unidade</span><b className="num" style={{ color: 'var(--warn)' }}>− {brl(p.taxas * 0.18)}</b></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--dim)' }}>{canal === 'ml' ? 'Financiamento do parcelado' : 'Taxa de transação'}</span><b className="num" style={{ color: 'var(--warn)' }}>− {brl(p.taxas * 0.10)}</b></div>
                </div>
                <div style={{ fontSize: 6.5, color: 'var(--faint)', marginTop: 3 }}>estimativa da composição sobre a tarifa real do pedido</div>
              </div>
            )}
            {p.liquido != null && !p.cancelado && <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 7, borderTop: '1px solid var(--glass-border)' }}><CheckCheck size={11} style={{ color: 'var(--ok)' }} /><span style={{ fontSize: 8.5, color: 'var(--dim)' }}>Conciliação: repasse previsto bate com o extrato do canal.</span></div>}
          </div>
          <div className="blk risk">
            <h4 style={{ color: scoreCor }}><ShieldCheck size={12} style={{ color: scoreCor }} />Radar de risco</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div style={{ position: 'relative', width: 44, height: 44, flex: 'none' }}>
                <svg width="44" height="44" viewBox="0 0 48 48"><circle cx="24" cy="24" r="19" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="5" /><circle cx="24" cy="24" r="19" fill="none" stroke={scoreCor} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${Math.round(score / 100 * 119)} 999`} transform="rotate(-90 24 24)" /></svg>
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}><b className="num" style={{ fontSize: 11, color: scoreCor }}>{score}</b></div>
              </div>
              <div><b style={{ fontSize: 11.5, color: scoreCor }}>{score >= 70 ? 'ALTO' : score >= 40 ? 'MÉDIO' : 'BAIXO'}</b>
                <div style={{ fontSize: 8.5, color: 'var(--faint)', lineHeight: 1.5 }}>{p.cancelado ? 'pedido cancelado — não despache' : p.devolucao ? 'devolução aberta — responda em 48h' : (p.compras || 0) > 1 ? 'comprador recorrente · histórico limpo' : 'comprador novo'}</div></div>
            </div>
          </div>
          {modalEtq && (
        <div className="modal-bg" style={{ display: 'flex' }} onClick={() => setModalEtq(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <b className="serif" style={{ fontSize: 15 }}>Modelo da etiqueta</b><div style={{ flex: 1 }} />
              <div className="btn" style={{ padding: '5px 9px' }} onClick={() => setModalEtq(false)}><X size={13} /></div>
            </div>
            <div className="paper" style={{ background: '#fff', color: '#111', borderRadius: 10, padding: 14, fontFamily: 'Arial' }}>
              <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
                <div style={{ flex: 1, border: '2.5px solid #111', borderRadius: 4, textAlign: 'center', padding: '7px 4px' }}><div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '.1em' }}>ESTAÇÃO</div><div style={{ fontSize: 26, fontWeight: 900, minHeight: 30 }}>{'\u00A0'}</div></div>
                <div style={{ flex: 1, border: '2.5px solid #111', borderRadius: 4, textAlign: 'center', padding: '7px 4px', background: '#111', color: '#fff' }}><div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '.1em' }}>ROTA</div><div style={{ fontSize: 26, fontWeight: 900, minHeight: 30 }}>{'\u00A0'}</div></div>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700 }}>#{p.id}</div>
              <div style={{ fontSize: 9 }}>{p.titulo.slice(0, 46)} · {p.qtd} un</div>
              <div style={{ borderTop: '1px dashed #999', margin: '7px 0' }} />
              <div style={{ fontSize: 8.5, color: '#444' }}>{canal === 'shopee' ? 'Nome e endereço completos: waybill oficial SPX' : (destNome || p.comprador)}</div>
              <div style={{ marginTop: 7, height: 34, background: 'repeating-linear-gradient(90deg,#111 0 2px,transparent 2px 5px)' }} />
              <div className="num" style={{ fontSize: 8, textAlign: 'center', marginTop: 3 }}>{p.rastreio || p.id}</div>
            </div>
            <div style={{ fontSize: 8.5, color: 'var(--faint)', marginTop: 9, lineHeight: 1.5 }}>O box ESTAÇÃO/ROTA imprime sempre — preenchido quando o dado existir, ou reservado para o CD marcar à mão.</div>
            <div className="btn primary" style={{ marginTop: 10, justifyContent: 'center' }} onClick={() => { setModalEtq(false); baixarEtiqueta() }}><Tag size={12} color={d.txt} />Baixar etiqueta oficial</div>
          </div>
        </div>
      )}
      {canal === 'ml' && (
            <div className="blk">
              <h4 style={{ color: d.cor }}><Send size={12} style={{ color: d.cor }} />Mensagens com o comprador</h4>
              {msgs === undefined && <div style={{ fontSize: 9, color: 'var(--faint)', display: 'flex', gap: 6, alignItems: 'center' }}><Loader2 size={10} className="animate-spin" />carregando…</div>}
              {Array.isArray(msgs?.mensagens) && msgs.mensagens.slice(-2).map((m, i) => (
                <div key={i} style={{ fontSize: 9, color: 'var(--dim)', padding: '5px 8px', borderRadius: 8, background: 'rgba(0,0,0,.2)', marginBottom: 4 }}>{(m.texto || m.text || '').slice(0, 140)}</div>
              ))}
              {!msgTexto && (
                <div onClick={() => setMsgTexto('Olá! Seu pedido já está em preparação e sai na próxima coleta. Assim que despachar, o código de rastreio aparece aqui. Obrigado pela compra!')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 9px', borderRadius: 8, background: 'rgba(160,107,232,.08)', border: '1px dashed rgba(160,107,232,.4)', cursor: 'pointer', marginBottom: 5 }}>
                  <span className="chip" style={{ fontSize: 6.5, color: '#e9dbfb', background: 'rgba(160,107,232,.35)' }}><Sparkles size={8} />RASCUNHO IA</span>
                  <span style={{ fontSize: 8.5, color: 'var(--dim)', flex: 1 }}>"Olá! Seu pedido já está em preparação…"</span>
                  <b style={{ fontSize: 8, color: 'var(--purple)' }}>usar</b>
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={msgTexto} onChange={(e) => setMsgTexto(e.target.value.slice(0, 350))} placeholder="Escreva para o comprador…" style={{ flex: 1, background: 'rgba(0,0,0,.25)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: '6px 9px', fontSize: 10, color: 'var(--fg)', outline: 'none' }} />
                <div className="btn" style={{ fontSize: 9 }} onClick={enviarMsg}>{enviando ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}Enviar</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ModalSimples({ titulo, onFechar, d, children }) {
  return (
    <div className="modal-bg" style={{ display: 'flex' }} onClick={onFechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <b className="serif" style={{ fontSize: 15 }}>{titulo}</b><div style={{ flex: 1 }} />
          <div className="btn" style={{ padding: '5px 9px' }} onClick={onFechar}><X size={13} /></div>
        </div>
        {children}
      </div>
    </div>
  )
}

// ————— MESA (modal do mockup) —————
function UltraMesa({ fila, idx, setIdx, conf, setConf, onFechar, d }) {
  const p = fila[Math.min(idx, fila.length - 1)]
  if (!p) return <ModalSimples titulo="Mesa de Despacho" onFechar={onFechar} d={d}><div style={{ fontSize: 11, color: 'var(--faint)' }}>Sem pedidos na fila desta aba.</div></ModalSimples>
  const c = conf[p.id] || new Set()
  const tot = p.itens.reduce((s, it) => s + it.qtd, 0)
  const feitos = p.itens.reduce((s, it, i) => s + (c.has(i) ? it.qtd : 0), 0)
  const completo = p.itens.length > 0 && p.itens.every((_, i) => c.has(i))
  const marcar = (i) => setConf((m) => { const s = new Set(m[p.id] || []); s.has(i) ? s.delete(i) : s.add(i); return { ...m, [p.id]: s } })
  const done = (id) => { const cc = conf[id]; const it = (fila.find((x) => x.id === id)?.itens) || []; return it.length > 0 && it.every((_, i) => cc && cc.has(i)) }
  return (
    <div className="modal-bg" style={{ display: 'flex' }} onClick={onFechar}>
      <div className="modal" style={{ maxWidth: 840 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: d.cor, display: 'grid', placeItems: 'center' }}><ScanLine size={15} color={d.txt} /></div>
          <div style={{ flex: 1 }}><b className="serif" style={{ fontSize: 15 }}>Mesa de Despacho</b><div style={{ fontSize: 8.5, color: 'var(--faint)' }}>bipou, conferiu, imprimiu — a fila anda sozinha</div></div>
          <span className="chip num" style={{ color: d.txt, background: d.cor }}>{Math.min(idx + 1, fila.length)} DE {fila.length}</span>
          <div className="btn" style={{ padding: '5px 9px' }} onClick={onFechar}><X size={13} /></div>
        </div>
        <div className="scanbox"><Barcode size={19} style={{ color: d.cor }} /><div style={{ flex: 1 }}><div className="up" style={{ fontSize: 7, color: 'var(--faint)' }}>bipe — ou toque no item para conferir</div><b style={{ fontSize: 12.5, color: 'var(--dim)' }}>aguardando leitura…</b></div><span className="chip" style={{ color: 'var(--ok)', background: 'rgba(47,217,141,.12)' }}>SCANNER PRONTO</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 12, marginTop: 12 }}>
          <div style={{ borderRadius: 12, padding: 13, background: completo ? 'rgba(47,217,141,.06)' : 'rgba(255,255,255,.03)', border: `1px solid ${completo ? 'rgba(47,217,141,.4)' : 'var(--glass-border)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
              <span className="up" style={{ fontSize: 8, fontWeight: 800, color: completo ? 'var(--ok)' : 'var(--faint)' }}>na mesa · #{p.id.slice(-12)}</span>
              <b className="num" style={{ fontSize: 11, color: completo ? 'var(--ok)' : d.cor }}>{feitos}/{tot}</b>
            </div>
            {p.itens.map((it, i) => (
              <div key={i} onClick={() => marcar(i)} style={{ display: 'flex', alignItems: 'center', gap: 9, borderRadius: 9, padding: '8px 10px', marginBottom: 5, cursor: 'pointer', background: c.has(i) ? 'rgba(47,217,141,.1)' : 'rgba(0,0,0,.2)', border: `1px solid ${c.has(i) ? 'rgba(47,217,141,.35)' : 'var(--glass-border)'}` }}>
                <span style={{ width: 17, height: 17, borderRadius: 5, display: 'grid', placeItems: 'center', background: c.has(i) ? 'var(--ok)' : 'transparent', border: c.has(i) ? 'none' : '1.5px solid var(--glass-border)', flex: 'none' }}>{c.has(i) && <Check size={11} color="#0a1a0f" />}</span>
                <span style={{ flex: 1, fontSize: 10.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.nome}</span>
                {it.bin && <span className="num" style={{ fontSize: 8, color: d.cor }}>bin {it.bin}</span>}
                <b className="num" style={{ fontSize: 11, color: c.has(i) ? 'var(--ok)' : 'var(--dim)' }}>{it.qtd}un</b>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
              <div className={`btn ${completo ? 'primary' : ''}`} style={{ flex: 1, justifyContent: 'center', fontSize: 10, opacity: completo ? 1 : .5, pointerEvents: completo ? 'auto' : 'none' }} onClick={() => idx < fila.length - 1 ? setIdx(idx + 1) : onFechar()}><Check size={12} color={completo ? '#1a1008' : undefined} />{completo ? 'Conferido — próximo' : `faltam ${tot - feitos} un`}</div>
              <div className="btn" style={{ fontSize: 10 }} onClick={() => idx < fila.length - 1 ? setIdx(idx + 1) : onFechar()}>pular</div>
            </div>
          </div>
          <div>
            <div className="up" style={{ fontSize: 8, fontWeight: 800, color: 'var(--faint)', marginBottom: 7 }}>fila da coleta</div>
            <div style={{ maxHeight: 250, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {fila.map((f, i) => (
                <div key={f.id} onClick={() => setIdx(i)} style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 9, padding: '7px 10px', cursor: 'pointer', background: i === idx ? `${d.cor}14` : 'rgba(0,0,0,.18)', border: `1px solid ${i === idx ? d.cor + '55' : 'var(--glass-border)'}` }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', flex: 'none', background: done(f.id) ? 'var(--ok)' : !f.nf && f.canal === 'shopee' ? 'var(--danger)' : i === idx ? d.cor : 'var(--faint)' }} />
                  <b className="num" style={{ fontSize: 10, flex: 1 }}>#{f.id.slice(-8)}</b>
                  <span style={{ fontSize: 8, color: done(f.id) ? 'var(--ok)' : 'var(--faint)' }}>{done(f.id) ? 'conferido' : !f.nf && f.canal === 'shopee' ? 'sem NF-e' : i === idx ? 'na mesa' : 'aguardando'}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '7px 10px', borderRadius: 9, background: 'rgba(255,122,122,.07)', border: '1px solid rgba(255,122,122,.3)' }}><AlertTriangle size={11} style={{ color: 'var(--danger)' }} /><span style={{ fontSize: 8, color: 'var(--dim)' }}>item errado bipado trava a mesa até corrigir</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ————— MODAL SEPARAÇÃO — paper com tabela real (BIN/SKU/PRODUTO/QTD/PEDIDOS/✓) —————
function ModalSep({ filtrados, d, canal, onFechar, abrirMesa }) {
  const [porPedido, setPorPedido] = useState(false)
  const linhas = useMemo(() => {
    if (porPedido) return filtrados.slice(0, 60).map((p) => ({ bin: p.itens[0]?.bin || '—', sku: `#${p.id.slice(-8)}`, nome: p.titulo, qtd: p.qtd, pedidos: 1 }))
    const m = {}
    for (const p of filtrados) for (const it of p.itens) {
      const k = it.sku || it.nome
      if (!m[k]) m[k] = { bin: it.bin || '—', sku: it.sku || '—', nome: it.nome, qtd: 0, ped: new Set() }
      m[k].qtd += it.qtd; m[k].ped.add(p.id)
    }
    return Object.values(m).map((x) => ({ ...x, pedidos: x.ped.size })).sort((a, b) => String(a.bin).localeCompare(String(b.bin)))
  }, [filtrados, porPedido])
  const totUn = linhas.reduce((s, l) => s + l.qtd, 0)
  const imprimir = () => {
    const rows = linhas.map((l) => `<tr style="border-bottom:1px solid #ddd"><td class="num" style="padding:5px 2px">${l.bin}</td><td class="num">${l.sku}</td><td>${l.nome}</td><td style="text-align:center" class="num"><b>${l.qtd}</b></td><td style="text-align:center" class="num">${l.pedidos}</td><td style="text-align:center">☐</td></tr>`).join('')
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>Lista de separação</title><style>body{font-family:Arial;color:#111;padding:20px}table{width:100%;border-collapse:collapse;font-size:11px}.num{font-variant-numeric:tabular-nums}</style></head><body><h2 style="margin:0 0 4px">Lista de separação · ${d.nome}</h2><div style="font-size:10px;color:#555;margin-bottom:10px">${linhas.length} linha(s) · ${totUn} unidades · ${filtrados.length} pedidos · ${new Date().toLocaleString('pt-BR')}</div><table><tr style="border-bottom:1.5px solid #231c20;text-align:left"><th style="padding:4px 2px">BIN</th><th>SKU</th><th>PRODUTO</th><th style="text-align:center">QTD</th><th style="text-align:center">PEDIDOS</th><th style="text-align:center">✓</th></tr>${rows}</table><div style="display:flex;justify-content:space-between;margin-top:10px;padding-top:8px;border-top:2px solid #231c20;font-size:11px"><b>TOTAL: ${totUn} unidades · ${filtrados.length} pedidos</b><span>conferido por: __________</span></div><script>window.print()</scr` + `ipt></body></html>`)
    w.document.close()
  }
  return (
    <div className="modal-bg" style={{ display: 'flex' }} onClick={onFechar}>
      <div className="modal" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Layers size={17} style={{ color: d.cor }} />
          <div style={{ flex: 1 }}><b className="serif" style={{ fontSize: 16 }}>Lista de separação</b><div style={{ fontSize: 9, color: 'var(--faint)' }}>agrupada por bin — o caminho único do estoque, sem zigue-zague</div></div>
          <div className="btn" style={{ padding: '5px 9px' }} onClick={onFechar}><X size={13} /></div>
        </div>
        <div className="paper" style={{ background: '#fff', color: '#111', borderRadius: 10, padding: 14, maxHeight: '46vh', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
            <thead><tr style={{ borderBottom: '1.5px solid #231c20', textAlign: 'left' }}><th style={{ padding: '4px 2px' }}>BIN</th><th>SKU</th><th>PRODUTO</th><th style={{ textAlign: 'center' }}>QTD</th><th style={{ textAlign: 'center' }}>PEDIDOS</th><th style={{ textAlign: 'center' }}>✓</th></tr></thead>
            <tbody>{linhas.map((l, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #ddd' }}><td className="num" style={{ padding: '5px 2px' }}>{l.bin}</td><td className="num">{l.sku}</td><td>{l.nome}</td><td className="num" style={{ textAlign: 'center' }}><b>{l.qtd}</b></td><td className="num" style={{ textAlign: 'center' }}>{l.pedidos}</td><td style={{ textAlign: 'center' }}>☐</td></tr>
            ))}</tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '2px solid #231c20', fontSize: 10 }}><b>TOTAL: {totUn} unidades · {filtrados.length} pedidos</b><span>conferido por: __________</span></div>
        </div>
        <div style={{ display: 'flex', gap: 7, marginTop: 13 }}>
          <div className="btn primary" onClick={imprimir}><Printer size={13} color={d.txt} />Imprimir lista</div>
          <div className="btn" onClick={abrirMesa}><ScanLine size={13} />Modo bipagem (scanner)</div>
          <div className={`btn ${porPedido ? 'primary' : ''}`} onClick={() => setPorPedido((v) => !v)}>{porPedido ? 'Agrupar por produto' : 'Agrupar por pedido'}</div>
        </div>
      </div>
    </div>
  )
}

// ————— MODAL CENTRAL DE IMPRESSÃO — fila completa do mockup —————
function ModalImp({ filtrados, d, canal, semNf, onFechar, imprimirTudo }) {
  const etq = filtrados.filter((p) => p.rastreio).length
  const nf = filtrados.filter((p) => p.nf).length
  const un = filtrados.reduce((s, p) => s + p.qtd, 0)
  const linhas = [
    ['Etiquetas de envio', `${etq} prontas`, Tag, 'var(--ok)', `PDF · ${canal === 'ml' ? 'ZPL' : 'A6'}`],
    ['Notas fiscais (DANFE)', `${nf} emitidas`, FileText, 'var(--ok)', 'via Bling · mesma folha da etiqueta'],
    ['Lista de separação', `1 lista · ${un} un`, Layers, 'var(--ok)', 'agrupada por bin'],
    ['Declaração de conteúdo', `${semNf} pedido(s)`, Box, 'var(--warn)', 'só p/ envios sem NF-e'],
  ]
  return (
    <div className="modal-bg" style={{ display: 'flex' }} onClick={onFechar}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Printer size={17} style={{ color: d.cor }} />
          <div style={{ flex: 1 }}><b className="serif" style={{ fontSize: 16 }}>Central de Impressão</b><div style={{ fontSize: 9, color: 'var(--faint)' }}>tudo o que a coleta de hoje precisa, em uma fila só — na ordem certa</div></div>
          <div className="btn" style={{ padding: '5px 9px' }} onClick={onFechar}><X size={13} /></div>
        </div>
        {linhas.map(([t, v, Icon, c, s], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '1px solid var(--glass-border)', marginBottom: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={15} style={{ color: c }} /></div>
            <div style={{ flex: 1 }}><b style={{ fontSize: 11.5 }}>{t}</b><div style={{ fontSize: 8.5, color: 'var(--faint)' }}>{s}</div></div>
            <span className="num" style={{ fontSize: 10, color: c }}>{v}</span>
            <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${d.cor}`, background: d.cor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={11} color={d.txt} /></div>
          </div>
        ))}
        <div className="btn primary" style={{ justifyContent: 'center', marginTop: 12 }} onClick={() => { onFechar(); imprimirTudo() }}><Printer size={13} color={d.txt} />Imprimir fila completa (ordem: separação → etiquetas → DANFE)</div>
        <div style={{ fontSize: 8, color: 'var(--faint)', marginTop: 8, textAlign: 'center' }}>{canal === 'ml' ? 'no Brasil a NF-e imprime nas mesmas dimensões da etiqueta — saem juntas, par a par' : 'a waybill SPX sai em A6 térmica; a DANFE acompanha em folha própria'}</div>
      </div>
    </div>
  )
}

// ————— MODAL PERSONALIZAR ETIQUETA — preview paper + toggles + formato (mockup) —————
function ModalEtq({ d, canal, exemplo, n, onFechar, gerar }) {
  const [opts, setOpts] = useState(() => { try { return JSON.parse(localStorage.getItem('pcu_etq') || '{"rota":true,"sku":true,"logo":true,"fragil":false,"obrigado":true,"qr":true}') } catch (_) { return { rota: true, sku: true, logo: true, fragil: false, obrigado: true, qr: true } } })
  const [fmt, setFmt] = useState('t10')
  useEffect(() => { localStorage.setItem('pcu_etq', JSON.stringify(opts)) }, [opts])
  const TOGS = [['rota', 'Estação / Rota de triagem'], ['sku', 'SKU + bin de separação'], ['logo', 'Logo da loja'], ['fragil', 'Aviso "FRÁGIL"'], ['obrigado', 'Mensagem de agradecimento'], ['qr', 'QR do pedido p/ conferência']]
  const p = exemplo
  return (
    <div className="modal-bg" style={{ display: 'flex' }} onClick={onFechar}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Settings size={16} style={{ color: d.cor }} />
          <div style={{ flex: 1 }}><b className="serif" style={{ fontSize: 16 }}>Personalizar etiqueta</b><div style={{ fontSize: 9, color: 'var(--faint)' }}>o modelo abaixo replica a etiqueta com sua estação/rota em destaque</div></div>
          <div className="btn" style={{ padding: '5px 9px' }} onClick={onFechar}><X size={13} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="paper" style={{ background: '#fff', color: '#231c20', borderRadius: 10, padding: 13, fontFamily: 'Menlo,monospace' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #231c20', paddingBottom: 6, marginBottom: 8 }}>
              <b style={{ fontSize: 13 }}>{canal === 'ml' ? 'MERCADO ENVIOS' : 'SPX EXPRESS'}</b>
              <b style={{ fontSize: 16, border: '2px solid #231c20', padding: '2px 10px' }}>{'\u00A0\u00A0'}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 8 }}><span>{canal === 'ml' ? 'Coleta · ME2' : 'Pickup SPX'}</span><b className="num">{new Date().toLocaleDateString('pt-BR')}</b></div>
            <div style={{ textAlign: 'center', margin: '8px 0' }}>
              <div style={{ height: 40, background: 'repeating-linear-gradient(90deg,#231c20 0 2px,transparent 2px 5px)' }} />
              <div className="num" style={{ fontSize: 10, letterSpacing: 2 }}>{p?.rastreio || p?.id || '—'}</div>
            </div>
            <div style={{ borderTop: '1.5px dashed #231c20', paddingTop: 7, fontSize: 9.5, lineHeight: 1.6 }}>
              <b>DESTINATÁRIO</b><br />
              {canal === 'ml' ? (p?.comprador || '—') : `${(p?.clienteReal || p?.comprador || '—')} (dados completos: só na waybill oficial)`}<br />
              {p?.cidade || ''}{p?.uf ? `/${p.uf}` : ''}{p?.cep ? ` · ${p.cep}` : ''}
              {opts.rota && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}><span><b>ESTAÇÃO</b></span><b style={{ fontSize: 15, minWidth: 34, borderBottom: '1.5px solid #231c20' }}>{'\u00A0'}</b><span><b>ROTA</b></span><b style={{ fontSize: 15, minWidth: 34, borderBottom: '1.5px solid #231c20' }}>{'\u00A0'}</b></div>}
            </div>
            <div style={{ borderTop: '1.5px dashed #231c20', marginTop: 7, paddingTop: 6, fontSize: 8.5 }}>
              REMETENTE: SÓSTRASS ARMARINHO · LIMEIRA/SP<br />Pedido <b className="num">#{p?.id || '—'}</b>{opts.sku && p?.itens?.[0]?.sku ? <> · <span className="num">{p.itens[0].sku}</span></> : null} · {p?.qtd || 1} vol
              {opts.fragil && <b> · FRÁGIL</b>}
              {opts.obrigado && <div style={{ marginTop: 3 }}>Obrigado pela compra! ♥</div>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div className="blk"><h4 style={{ color: d.cor }}><Settings size={12} style={{ color: d.cor }} />Personalizar etiqueta</h4>
              {TOGS.map(([k, t]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer' }} onClick={() => setOpts((o) => ({ ...o, [k]: !o[k] }))}>
                  <div className={`toggle ${opts[k] ? 'on' : ''}`} style={{ border: 'none', background: 'transparent', padding: 0 }}><span className="sw" /></div>
                  <span style={{ fontSize: 10, color: 'var(--dim)' }}>{t}</span>
                </div>
              ))}
            </div>
            <div className="blk"><h4 style={{ color: d.cor }}><Printer size={12} style={{ color: d.cor }} />Formato</h4>
              <div className="seg" style={{ width: '100%' }}>
                {[['t10', 'Térmica 10×15'], ['a4', 'A4 · 2/folha'], ['raw', canal === 'ml' ? 'ZPL' : 'PDF']].map(([id, l]) => <span key={id} className={fmt === id ? 'on' : ''} style={{ flex: 1, textAlign: 'center' }} onClick={() => setFmt(id)}>{l}</span>)}
              </div>
              <div style={{ fontSize: 8, color: 'var(--faint)', marginTop: 8 }}>{canal === 'ml' ? 'a ordem de impressão segue a rota da coleta, reduzindo o tempo de triagem do motorista' : 'a SPX exige a waybill oficial — o modelo replica o layout com sua estação/rota em destaque'}</div>
            </div>
            <div className="btn primary" style={{ justifyContent: 'center' }} onClick={gerar}><Tag size={13} color={d.txt} />Aplicar e gerar {n} etiqueta(s)</div>
          </div>
        </div>
      </div>
    </div>
  )
}
