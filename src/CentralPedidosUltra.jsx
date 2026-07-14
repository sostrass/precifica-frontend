import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Package, ShoppingBag, Globe, Truck, Clock, AlertTriangle, Box, Search, ChevronRight, ChevronLeft,
  Zap, Layers, MapPin, FileText, Printer, Tag, Check, CheckCheck, X, ScanLine, Barcode, ShieldCheck,
  DollarSign, Send, Sparkles, Settings, RefreshCw, Loader2, User, Repeat, Star, CreditCard, Eye, Lock, CalendarDays,
} from 'lucide-react'
import { api } from './api.js'
import { imprimirFolhasPedido, imprimirEtiquetas, PainelImpressao } from './Shopee.jsx'
import { imprimirFolhasML, imprimirEtiquetasML } from './impressaoML.js'
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
    status: (Array.isArray(p.tags) && p.tags.includes('delivered') ? 'delivered' : '') || p.envio_status || p.status || '',
    pedidoStatus: p.status || '',
    envioStatus: (Array.isArray(p.tags) && p.tags.includes('delivered') ? 'delivered' : '') || p.envio_status || '',
    envioSubstatus: p.envio_substatus || null,
    isFull: !!p.is_full, logistic: p.logistic_type || null,
    shipBy: p.ship_by || null, clienteReal: p.cliente || null, cidade: p.cidade || null, cep: p.cep || null, enderecoLinha: p.endereco || null,
    criado: p.date_created, pago: p.pago_em || p.aprovado_em || p.date_created,
    receita: r.receita ?? p.valor, taxas: r.taxas ?? r.taxas_mkt, liquido: r.liquido, margem: r.margem, alvo: p.preco_bling,
    rastreio: p.rastreio || p.tracking || null, shipId: p.shipping_id || p.shipment_id || p.envio_id || p.envio?.id,
    frete: (p.resumo?.tarifa ?? p.frete_vendedor ?? null),
    uf: (p.uf || p.envio?.uf || '').toUpperCase() || ((p.endereco || '').match(UF_RE) || [])[0],
    nf: !!(p.nfe || p.nf),
    nfDesconhecida: !(p.nfe || p.nf) && !/invoice_pending|waiting_for_invoice/i.test(String(p.envio_substatus || '')),
    cancelado: /cancel/i.test(String(p.status || '')),
    devolucao: /return|devolu|claim|mediac/i.test(String(p.status || '')) || !!p.claim_id || !!p.devolucao_envio, bruto: p,
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

// ML: compras multi-produto chegam como várias orders do mesmo pack — agrupamos num card único
function agrupaPacksML(arr) {
  const m = new Map()
  const somaN = (a, b) => (a == null && b == null ? null : (a || 0) + (b || 0))
  for (const p of arr) {
    // pack_id é a chave oficial; shipping_id cobre quando o pack vem nulo (mesmo envio = mesma compra)
    const k = p.packId ? `pk${p.packId}` : (p.shipId ? `sh${p.shipId}` : p.id)
    const g = m.get(k)
    if (!g) { m.set(k, { ...p, orderIds: [p.id] }); continue }
    g.orderIds.push(p.id)
    g.itens = g.itens.concat(p.itens)
    g.qtd += p.qtd
    g.receita = somaN(g.receita, p.receita)
    g.taxas = somaN(g.taxas, p.taxas)
    g.frete = somaN(g.frete, p.frete)
    g.liquido = somaN(g.liquido, p.liquido)
    g.margem = (g.liquido != null && g.receita > 0) ? (g.liquido / g.receita * 100) : g.margem
    g.nf = g.nf || p.nf
    g.nfDesconhecida = g.nfDesconhecida && p.nfDesconhecida
    g.shipBy = g.shipBy || p.shipBy
    g.uf = g.uf || p.uf; g.cidade = g.cidade || p.cidade
    g.rastreio = g.rastreio || p.rastreio
    g.shipId = g.shipId || p.shipId
    g.devolucao = g.devolucao || p.devolucao
    g.cancelado = g.cancelado && p.cancelado
  }
  return [...m.values()]
}

const comTimeout = (promessa, ms) => Promise.race([
  promessa,
  new Promise((_, rej) => setTimeout(() => rej(new Error('tempo esgotado')), ms)),
])

const ABAS_DEF = [
  ['todos', 'Todos', Layers], ['hoje', 'A despachar hoje', Zap], ['proximos', 'Próximos dias', CalendarDays],
  ['nf', 'Aguardando NF-e', FileText], ['transito', 'Em trânsito', Truck], ['fim', 'Finalizados', Check], ['cancel', 'Cancelados', X],
]
function classifica(p) {
  if (p.cancelado) return 'cancel'
  const ref = p.canal === 'ml' ? (p.envioStatus || p.status) : p.status
  if (/deliver|entreg|complet|finaliz/i.test(ref)) return 'fim'
  if (/shipped|enviado|transit|transito/i.test(ref)) return 'transito'
  if (!p.nf && !p.nfDesconhecida) return 'nf'
  if (p.canal === 'ml' && p.isFull) return 'proximos' // Full: o ML expede, não entra na sua coleta de hoje
  const sb = p.shipBy ? p.shipBy * 1000 : null
  if (sb && sb - Date.now() > 36 * 3600000) return 'proximos'
  return 'hoje'
}

// ————— v3: grupo de coleta, manchete de ação, "enviar em" e rateio por item —————
function grupoDe(p) {
  const c = classifica(p)
  if (c === 'cancel' || c === 'transito' || c === 'fim' || p.devolucao) return 'tra'
  if (c === 'proximos' || /buffered|dropped/i.test(String(p.envioSubstatus || ''))) return 'fut'
  return 'hoje' // inclui NF-e pendente — bloqueia a coleta de hoje
}
function mancheteDe(p, canal) {
  if (p.cancelado) return { cls: 'a-fis', tit: 'Pedido cancelado · não despache', sub: 'o canal cancelou/estornou — retire o volume da fila de separação', acao: null }
  if (p.devolucao) return { cls: 'a-fis', tit: 'Devolução aberta · responda em 48h', sub: 'sem resposta, a disputa fecha automaticamente contra a loja', acao: 'painel', label: 'Ver detalhes' }
  const subCedo = String(p.envioSubstatus || '')
  if (/invoice_pending|waiting_for_invoice/i.test(subCedo)) {
    if (p.nf) return { cls: 'a-nf', tit: 'NF-e emitida · aguardando o ML receber a nota', sub: `o Bling transmite a NF-e${p.nfInfo?.numero ? ` nº ${p.nfInfo.numero}` : ''} ao ML — a etiqueta libera em seguida, sem ação sua`, acao: null }
    return { cls: 'a-nf', tit: 'Pronta para emitir NF-e de venda', sub: 'o ML segura a etiqueta até receber a nota — emitindo no Bling, ela libera em seguida', acao: 'bling', label: 'Emitir NF-e no Bling' }
  }
  if (!p.nf && !p.nfDesconhecida) return { cls: 'a-nf', tit: 'Pronta para emitir NF-e de venda', sub: 'dados fiscais liberados — emitindo no Bling, a etiqueta libera em seguida', acao: 'bling', label: 'Emitir NF-e no Bling' }
  const ref = String(canal === 'ml' ? (p.envioStatus || p.status) : p.status)
  const sub = String(p.envioSubstatus || '')
  if (/deliver|entreg|complet|finaliz/i.test(ref)) return { cls: 'a-etq', tit: 'Entregue ao comprador', sub: p.rastreio ? `rastreio ${p.rastreio}` : 'pedido concluído', acao: null }
  if (/shipped|enviado|transit/i.test(ref)) return { cls: 'a-tra', tit: 'A caminho do comprador', sub: p.rastreio ? `rastreio ${p.rastreio}` : 'rastreio ativo no canal', acao: 'canal', label: 'Rastrear no canal' }
  if (/buffered|dropped/i.test(sub)) return { cls: 'a-buf', tit: 'Etiqueta libera depois · aguardando a coleta abrir', sub: 'o canal segura a etiqueta (buffered) — libera sozinha e o painel te avisa', acao: 'painel', label: 'Detalhes' }
  if (/printed/i.test(sub)) return { cls: 'a-etq', tit: 'Etiqueta impressa · levar para a coleta', sub: 'volume pronto — confira na Mesa de Despacho', acao: 'etiqueta', label: 'Reimprimir etiqueta' }
  if (canal === 'shopee' && /PROCESSED/i.test(ref)) return { cls: 'a-etq', tit: 'Etiqueta emitida · levar para a coleta', sub: 'waybill SPX gerada — volume pronto para a coleta ou drop-off', acao: 'etiqueta', label: 'Reimprimir etiqueta' }
  if (canal === 'shopee' && /RETRY_SHIP/i.test(ref)) return { cls: 'a-fis', tit: 'Reenviar · o despacho anterior falhou', sub: 'a SPX pediu novo agendamento — gere a etiqueta de novo', acao: 'etiqueta', label: 'Gerar etiqueta de novo' }
  if (canal === 'ml' && p.isFull) return { cls: 'a-buf', tit: 'Full · o ML expede por você', sub: 'estoque no fulfillment — nenhuma ação na sua coleta', acao: null }
  if (p.nfDesconhecida) return { cls: 'a-etq', tit: 'Etiqueta pronta para imprimir', sub: 'consultando a NF-e no Bling — despacho autorizado pelo canal', acao: 'etiqueta', label: 'Baixar etiqueta' }
  return { cls: 'a-etq', tit: 'Etiqueta pronta para imprimir', sub: p.nfInfo?.numero ? `NF-e nº ${p.nfInfo.numero} emitida e vinculada · despacho autorizado` : 'NF-e emitida · despacho autorizado pelo canal', acao: 'etiqueta', label: 'Baixar etiqueta' }
}
function enviarEmDe(p, agoraTs) {
  const c = classifica(p)
  if (p.cancelado) return ['—', 'var(--faint)']
  if (c === 'fim') return ['entregue', 'var(--ok)']
  if (c === 'transito') return ['já enviado', 'var(--dim)']
  if (!p.nf && !p.nfDesconhecida) return ['bloqueado pela NF-e', 'var(--danger)']
  if (!p.shipBy) return ['a definir pelo canal', 'var(--faint)']
  const sb = p.shipBy * 1000
  const hh = new Date(sb).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (sb < agoraTs) return [`ATRASADO · era ${new Date(sb).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`, 'var(--danger)']
  const d0 = new Date(agoraTs); d0.setHours(0, 0, 0, 0)
  const dias = Math.floor((sb - d0.getTime()) / 86400000)
  if (dias === 0) return [`HOJE · até ${hh}`, 'var(--warn)']
  if (dias === 1) return [`AMANHÃ · até ${hh}`, '#9cc8ff']
  return [`${new Date(sb).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · até ${hh}`, '#9cc8ff']
}
function rateiaItens(p) {
  const its = p.itens || []
  const totais = its.map((i) => (i.preco != null ? i.preco * (i.qtd || 1) : null))
  const soma = totais.reduce((s, v) => s + (v || 0), 0)
  return its.map((i, ix) => {
    const val = totais[ix] != null ? totais[ix] : (its.length ? (p.receita || 0) / its.length : p.receita)
    const share = soma > 0 && totais[ix] != null ? totais[ix] / soma : (its.length ? 1 / its.length : 1)
    return { ...i, val, tx: p.taxas != null ? p.taxas * share : null, liq: p.liquido != null ? p.liquido * share : null }
  })
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

function imprimirFolhasCanal(canal, pedidos) {
  if (!pedidos.length) return
  if (canal === 'ml') imprimirFolhasML(pedidos)
  else imprimirFolhasPedido(pedidos)
}
function imprimirEtiquetasCanal(canal, pedidos) {
  if (!pedidos.length) return
  if (canal === 'ml') imprimirEtiquetasML(pedidos)
  else imprimirEtiquetas(pedidos, '')
}

export default function CentralPedidosUltra() {
  const notify = useToast()
  const [canal, setCanal] = useState('ml')
  const [dias, setDias] = useState(15)
  const [pedidos, setPedidos] = useState(null)
  const [erro, setErro] = useState(null)
  const [fundo, setFundo] = useState(null)
  const [ultimaSync, setUltimaSync] = useState(null)
  const [aba, setAba] = useState('todos')
  const [pgto, setPgto] = useState('todos')
  const [densidade, setDensidade] = useState('conf')
  const [soDevolucao, setSoDevolucao] = useState(false)
  const [soSemNf, setSoSemNf] = useState(false)
  const [agrupo, setAgrupo] = useState('dia')
  const [intel, setIntel] = useState(null)
  const [intelCarregando, setIntelCarregando] = useState(false)
  const [criandoIntel, setCriandoIntel] = useState(null)
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
  const cargaEmCurso = useRef(null)
  const fundoRef = useRef(null)
  const idsRef = useRef(new Set())
  const PCU_BUILD = 'v3.9 · 14/07'
const POR_PAG = 10
  const d = CH[canal]

  useEffect(() => { const t = setInterval(() => setAgoraTs(Date.now()), 30000); return () => clearInterval(t) }, [])
  useEffect(() => { localStorage.setItem('pcu_regras', JSON.stringify(regras)) }, [regras])

  const carregar = async (silencioso) => {
    const g = `${canal}|${dias}`          // guard estável: NÃO muda na remontagem do StrictMode
    geracao.current = g
    // se já há uma carga real (não-silenciosa) em curso para esta mesma chave, não duplica
    if (!silencioso) {
      if (cargaEmCurso.current === g) return
      cargaEmCurso.current = g
      setPedidos(null); setErro(null); setSel(new Set()); setAberto(null); setPagina(1); setFundo(null); setNovos(0)
    }
    try {
      if (canal === 'ml') {
        const dd = new Date(); dd.setDate(dd.getDate() - dias); dd.setHours(0, 0, 0, 0)
        const desdeIso = dd.toISOString(), ateIso = ''
        // 1ª leva instantânea para a tela não esperar (com timeout — nunca pendura o loading)
        let d1
        try { d1 = await comTimeout(api.mlPedidosEnriquecido('', 0, 25, desdeIso, ateIso), 30000) }
        catch (e) { if (g !== geracao.current) return; setErro('Não consegui falar com o servidor agora. Recarregue a página.'); setPedidos([]); return }
        if (g !== geracao.current) return
        if (d1 && (d1.pedidos || []).length) { setPedidos(agrupaPacksML((d1.pedidos || []).map(adaptaML))) }
        try { console.log('[PCU] 1a leva:', (d1?.pedidos || []).length, 'pedidos · sync:', d1?.paging?.sync) } catch (_) {}
        let d1v = d1 || { pedidos: [], paging: {} }
        let acumulado = (d1v.pedidos || []).map(adaptaML)
        let esperas = 0
        while (!silencioso && g === geracao.current && acumulado.length === 0 && d1v.paging?.sync?.rodando && esperas < 24) {
          setFundo({ carregados: d1v.paging?.sync?.progresso || 0, total: Math.max(d1v.paging?.sync?.alvo || 0, d1v.paging?.sync?.progresso || 0), fase: 'primeira sincronização · gravando pedidos no banco' })
          await new Promise((r) => setTimeout(r, 5000))
          try { d1v = await comTimeout(api.mlPedidosEnriquecido('', 0, 25, desdeIso, ateIso), 30000) } catch (_) { /* tenta de novo */ }
          if (g !== geracao.current) return
          acumulado = (d1v.pedidos || []).map(adaptaML)
          esperas++
        }
        let d1s = d1v
        const publicar = (arr) => {
          const agrupados = agrupaPacksML(arr)
          if (silencioso) {
            const chegaram = arr.filter((p) => !idsRef.current.has(p.id)).length
            if (chegaram > 0) setNovos((n) => n + chegaram)
            setPedidos((prev) => {
              if (!prev) return agrupados
              const antigos = new Map(prev.map((p) => [p.id, p]))
              const atualizados = agrupados.map((n) => {
                const a = antigos.get(n.id)
                return a ? { ...n, uf: n.uf || a.uf, cidade: n.cidade || a.cidade, shipBy: n.shipBy || a.shipBy, rastreio: n.rastreio || a.rastreio, nf: n.nf || a.nf, nfDesconhecida: n.nfDesconhecida && a.nfDesconhecida, nfInfo: n.nfInfo || a.nfInfo } : n
              })
              const ids = new Set(atualizados.map((p) => p.id))
              return atualizados.concat(prev.filter((p) => !ids.has(p.id)))
            })
          } else setPedidos(agrupados)
          arr.forEach((p) => idsRef.current.add(p.id))
        }
        // ARQUITETURA DE BANCO: uma leitura ampla do banco (instantânea) + acompanhamento
        // incremental enquanto a varredura de fundo grava. Fim da paginação client-side (Plano A/B),
        // que multiplicava chamadas de 60s e causava cargas de 1h.
        const totalInformado = d1s.paging?.total ?? acumulado.length
        const teto = Math.min(Math.max(totalInformado, 100), 400)
        if (!silencioso) {
          setFundo({ carregados: acumulado.length, total: teto, fase: "carregando pedidos" })
          let amplo = null
          try { amplo = await comTimeout(api.mlPedidosEnriquecido("", 0, teto, desdeIso, ateIso), 90000) } catch (_) { amplo = null }
          if (g !== geracao.current) return
          if (amplo && (amplo.pedidos || []).length) {
            acumulado = agrupaPacksML((amplo.pedidos || []).map(adaptaML))
            publicar(acumulado)
            d1s = amplo
          }
          setFundo({ carregados: acumulado.length, total: Math.max(teto, acumulado.length), fase: "consultando NF-e no Bling" })
          await nfeStatusML(acumulado, g)
          if (g !== geracao.current) return
          setFundo({ carregados: acumulado.length, total: acumulado.length, fase: "sincronizando envios" })
          await sincronizarEnviosML(acumulado, g, desdeIso, ateIso)
          if (g !== geracao.current) return
          setFundo(null); setUltimaSync(Date.now())
          backfillML(g)
          if (d1s.paging?.sync?.rodando) acompanharSyncServidor(g, desdeIso, ateIso, teto)
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
        if (!silencioso) setUltimaSync(Date.now())
      }
    } catch (e) {
      if (!silencioso && g === geracao.current) {
        setErro(e.message || 'falha ao carregar')
        setPedidos((prev) => (prev && prev.length ? prev : []))
        setFundo(null)
      }
    } finally {
      if (!silencioso && cargaEmCurso.current === g) cargaEmCurso.current = null
    }
  }
  useEffect(() => {
    idsRef.current = new Set()
    carregar()   // o guard por chave dentro de carregar() já neutraliza a dupla montagem do StrictMode
  }, [canal, dias])

  // Backfill ML (roda SÓ depois da sincronização, nunca competindo com ela):
  // busca envios em série controlada e preenche UF + prazo de despacho (shipBy) + cidade + rastreio
  const ufBuscadas = useRef(new Set())
  const backfillAtivo = useRef(false)
  const acompanharSyncServidor = async (g, desdeIso, ateIso, tetoIni) => {
    for (let i = 0; i < 30 && g === geracao.current; i++) {
      await new Promise((r) => setTimeout(r, 8000))
      let r = null
      try { r = await comTimeout(api.mlPedidosEnriquecido('', 0, Math.min(Math.max(tetoIni || 100, 100), 400), desdeIso, ateIso), 30000) } catch (_) { r = null }
      if (g !== geracao.current) return
      if (r && (r.pedidos || []).length) {
        const arr2 = agrupaPacksML((r.pedidos || []).map(adaptaML))
        setPedidos((prev) => {
          if (!prev) return arr2
          const antigos = new Map(prev.map((p) => [p.id, p]))
          const novos = arr2.map((n) => { const a = antigos.get(n.id); return a ? { ...n, nf: n.nf || a.nf, nfDesconhecida: n.nfDesconhecida && a.nfDesconhecida, nfInfo: n.nfInfo || a.nfInfo, uf: n.uf || a.uf, cidade: n.cidade || a.cidade, shipBy: n.shipBy || a.shipBy, rastreio: n.rastreio || a.rastreio, envioStatus: n.envioStatus || a.envioStatus, envioSubstatus: n.envioSubstatus || a.envioSubstatus } : n })
          const ids = new Set(novos.map((p) => p.id))
          return novos.concat(prev.filter((p) => !ids.has(p.id)))
        })
        arr2.forEach((p) => idsRef.current.add(p.id))
      }
      const rodando = !!(r && r.paging?.sync?.rodando)
      setFundo(rodando ? { carregados: r?.paging?.sync?.progresso || 0, total: Math.max(r?.paging?.sync?.alvo || 0, r?.paging?.sync?.progresso || 0), fase: 'gravando pedidos no banco' } : null)
      if (!rodando) { setUltimaSync(Date.now()); backfillML(g); return }
    }
    setFundo(null)
  }

  const backfillML = async (g) => {
    if (backfillAtivo.current) return
    backfillAtivo.current = true
    try {
      const umEnvio = async (p) => {
        try {
          const env = await comTimeout(api.mlEnvio(p.shipId), 15000)
          const dest = env?.destination?.shipping_address || env?.receiver_address || null
          const uf = (dest?.state?.id || dest?.state?.name || '').toString().replace('BR-', '').slice(0, 2).toUpperCase() || null
          const cidade = dest?.city?.name || null
          const limite = env?.lead_time?.estimated_handling_limit?.date || env?.estimated_handling_limit?.date || null
          const shipBy = limite ? Math.floor(new Date(limite).getTime() / 1000) : null
          const rastreio = env?.tracking_number || null
          const stEnv = String(env?.status || ''), subEnv = String(env?.substatus || '')
          setPedidos((prev) => prev ? prev.map((x) => x.id === p.id ? { ...x, uf: uf || x.uf, cidade: x.cidade || cidade, shipBy: x.shipBy || shipBy, rastreio: x.rastreio || rastreio, envioStatus: stEnv || x.envioStatus, envioSubstatus: subEnv || x.envioSubstatus, nfDesconhecida: /invoice_pending|waiting_for_invoice/i.test(subEnv) ? false : x.nfDesconhecida } : x) : prev)
        } catch (_) { /* segue para o próximo */ }
      }
      while (g === geracao.current) {
        const atual = pedidosRef.current || []
        const preDespacho = (p) => !p.cancelado && !/deliver|shipped|entreg|transit/i.test(String(p.envioStatus || p.status || ''))
        const pend = atual.filter((p) => p.canal === 'ml' && p.shipId && (!p.uf || !p.shipBy || (!p.envioSubstatus && preDespacho(p))) && !ufBuscadas.current.has(p.shipId))
        if (!pend.length) break
        // o que está na tela destrava primeiro (Enviar em / Destino da página atual)
        const vis = visiveisRef.current || new Set()
        pend.sort((a, b) => (vis.has(b.shipId) ? 1 : 0) - (vis.has(a.shipId) ? 1 : 0))
        const alvos = pend.slice(0, 24)
        alvos.forEach((p) => ufBuscadas.current.add(p.shipId))
        let i = 0
        const worker = async () => {
          while (i < alvos.length && g === geracao.current) {
            const p = alvos[i++]
            await umEnvio(p)
            await new Promise((r) => setTimeout(r, 120)) // respiro curto — 4 vias em paralelo
          }
        }
        await Promise.all([worker(), worker(), worker(), worker()])
      }
    } finally { backfillAtivo.current = false }
  }
  const visiveisRef = useRef(new Set())
  const pedidosRef = useRef(null)
  useEffect(() => { pedidosRef.current = pedidos }, [pedidos])
  useEffect(() => { fundoRef.current = fundo }, [fundo])
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible' && !fundoRef.current) carregar(true) }
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
  const heat = useMemo(() => {
    const h = Array(24).fill(0)
    for (const p of lista) {
      if (!p.criado) continue
      const dt = new Date(p.criado)
      const hora = dt.getHours()
      if (Number.isFinite(hora)) h[hora]++
    }
    return h
  }, [pedidos])
  const heatTotal = heat.reduce((a, b) => a + b, 0)
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
  useEffect(() => { visiveisRef.current = new Set(pageItems.map((p) => p.shipId).filter(Boolean)) }, [pageItems])
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
      const ids = ['hoje', 'fut', 'tra'].flatMap((g) => pageItems.filter((p) => grupoDe(p) === g)).map((p) => p.id); const idx = ids.indexOf(aberto)
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

  // Envios pré-despacho/sem cache → sincroniza (bounded) e refaz UMA leitura: os baldes se corrigem
  const sincronizarEnviosML = async (arr, g, desdeIso, ateIso) => {
    try {
      const sids = arr.filter((p) => p.canal === 'ml' && p.shipId && (!p.envioStatus || /ready_to_ship|handling|pending/.test(p.envioStatus))).map((p) => String(p.shipId))
      if (!sids.length) return
      // 1 onda rápida de 60 — desde a v3.3 o backfill grava cada envio no cache e cura o resto sozinho
      if (g === geracao.current) await comTimeout(api.mlEnviosSincronizar(sids.slice(0, 60), 60), 90000)
      if (g !== geracao.current) return
      const fresco = await comTimeout(api.mlPedidosEnriquecido('', 0, Math.min(arr.length + 20, 400), desdeIso, ateIso), 150000)
      if (g !== geracao.current) return
      const arr2 = (fresco?.pedidos || []).map(adaptaML)
      if (arr2.length) {
        const agrupados = agrupaPacksML(arr2)
        setPedidos((prev) => {
          if (!prev) return agrupados
          const antigos = new Map(prev.map((p) => [p.id, p]))
          return agrupados.map((n) => { const a = antigos.get(n.id); return a ? { ...n, nf: n.nf || a.nf, nfDesconhecida: n.nfDesconhecida && a.nfDesconhecida, nfInfo: n.nfInfo || a.nfInfo, uf: n.uf || a.uf, cidade: n.cidade || a.cidade, shipBy: n.shipBy || a.shipBy, rastreio: n.rastreio || a.rastreio } : n })
        })
        arr2.forEach((p) => idsRef.current.add(p.id))
      }
    } catch (_) { /* o backfill individual cobre o resto */ }
  }

  const nfeStatusML = async (arr, g) => {
    try {
      const grupos = agrupaPacksML(arr.filter((p) => p.canal === 'ml'))
      const ids = grupos.flatMap((p) => p.orderIds || [p.id])
      const donoDe = new Map()
      for (const gpo of grupos) for (const oid of (gpo.orderIds || [gpo.id])) donoDe.set(oid, gpo.id)
      for (let i = 0; i < ids.length; i += 150) {
        if (g !== geracao.current) return
        const slice = ids.slice(i, i + 150)
        const r = await comTimeout(api.mlNfeStatus(slice), 30000)
        const mapa = r?.mapa || {}
        const consultados = new Set(slice)
        const notaDoCard = new Map()
        const cardsConsultados = new Set()
        for (const oid of slice) {
          const card = donoDe.get(oid) || oid
          cardsConsultados.add(card)
          if (mapa[oid] && !notaDoCard.has(card)) notaDoCard.set(card, mapa[oid])
        }
        setPedidos((prev) => prev ? prev.map((p) => {
          if (!cardsConsultados.has(p.id)) return p
          const m = notaDoCard.get(p.id)
          return m ? { ...p, nf: true, nfDesconhecida: false, nfInfo: m } : { ...p, nf: false, nfDesconhecida: false }
        }) : prev)
      }
    } catch (_) { /* NF-e chega na próxima rodada */ }
  }

  const buscarIntel = async () => {
    setIntelCarregando(true)
    try { setIntel(await api.shopeePedidosInteligencia(dias)) } catch (e) { notify(e.message || 'Falha na análise', 'danger') }
    setIntelCarregando(false)
  }
  const criarIntel = async (tipo, s) => {
    setCriandoIntel(tipo)
    try {
      if (tipo === 'bundle') await api.shopeeCriarBundle(s.payload || s)
      else if (tipo === 'addon') await api.shopeeCriarAddon(s.payload || s)
      else await api.shopeeCriarCupom(s.payload || s)
      notify('Campanha criada na Shopee.', 'ok')
    } catch (e) { notify(e.message || 'Falha ao criar', 'danger') }
    setCriandoIntel(null)
  }

  const baixarEtiquetas = async (soUm) => {
    try {
      const alvo = Array.isArray(soUm) ? soUm : (soUm ? [soUm] : [...sel])
      if (canal === 'ml') {
        const peds = alvo.map((id) => lista.find((p) => p.id === id) || {})
        const bloqueados = peds.filter((p) => /invoice_pending|waiting_for_invoice/i.test(String(p.envioSubstatus || '')))
        const ids = peds.filter((p) => p.shipId && !bloqueados.includes(p)).map((p) => p.shipId)
        if (bloqueados.length && !ids.length) return notify(`O ML ainda segura ${bloqueados.length > 1 ? 'estas etiquetas' : 'esta etiqueta'}: emita a NF-e no Bling primeiro — ela libera em seguida.`, 'warn')
        if (!ids.length) return notify('Nenhum envio com etiqueta disponível.', 'warn')
        await api.mlEtiqueta(ids.join(','))
        if (bloqueados.length) notify(`${ids.length} etiqueta(s) geradas · ${bloqueados.length} aguardando NF-e (o ML libera após a nota).`, 'warn')
        else notify('Etiqueta(s) geradas.', 'ok')
      } else { await api.shopeeEtiquetaOficial(alvo, 'auto'); notify('Etiqueta(s) geradas.', 'ok') }
    } catch (e) {
      const msg = String(e.message || '')
      if (/invoice_pending|SHPLAB0200/i.test(msg)) notify('O ML bloqueou a etiqueta: falta a NF-e deste pedido. Emita no Bling que ela libera em seguida.', 'warn')
      else notify(msg || 'Falha na etiqueta', 'danger')
    }
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
              {chip(PCU_BUILD, 'var(--faint)', 'rgba(255,255,255,.06)')}
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
          <span style={{ fontSize: 8.5, color: 'var(--faint)', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            {fundo ? <>
              <Loader2 size={10} className="animate-spin" />
              <span className="num">{fundo.fase || 'sincronizando'} · {fundo.carregados}{fundo.total > fundo.carregados ? ` de ${fundo.total}` : ''}</span>
              <span style={{ width: 90, height: 5, borderRadius: 3, background: 'rgba(255,255,255,.08)', overflow: 'hidden', display: 'inline-block' }}>
                <span style={{ display: 'block', height: '100%', width: `${Math.round(fundo.carregados / Math.max(1, fundo.total) * 100)}%`, background: `linear-gradient(90deg,${d.cor},var(--ok))`, transition: 'width .3s' }} />
              </span>
              <span>pode trabalhar</span>
            </> : <><RefreshCw size={10} />{(() => { if (!ultimaSync) return 'sincronizando…'; const m = Math.round((agoraTs - ultimaSync) / 60000); return m <= 0 ? 'sincronizado agora' : `sincronizado há ${m} min` })()}</>}
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
          <div className="up" style={{ fontSize: 8.5, color: 'var(--faint)', fontWeight: 800, marginBottom: 11, display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={12} style={{ color: d.cor }} />Comportamento · horário de compra<div style={{ flex: 1 }} /><span className="num" style={{ fontSize: 7.5 }}>{heatTotal} pedido(s) no mapa</span></div>
          {heatTotal === 0 ? (
            <div style={{ fontSize: 9, color: 'var(--faint)', padding: '14px 0', textAlign: 'center' }}>os horários pintam conforme os pedidos do período chegam</div>
          ) : (
            <>
              <div className="heat">
                {heat.map((v, h) => <i key={h} title={`${String(h).padStart(2, '0')}h — ${v} pedido(s)`} style={{ height: 26, background: v ? `rgba(214,0,127,${(0.2 + v / maxH * 0.65).toFixed(2)})` : 'rgba(255,255,255,.05)' }} />)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                {['0h', '6h', '12h', '18h', '23h'].map((t) => <span key={t} className="num" style={{ fontSize: 6.5, color: 'var(--faint)' }}>{t}</span>)}
              </div>
              <div style={{ fontSize: 7.5, color: 'var(--faint)', marginTop: 6 }}>pico às <b className="num" style={{ color: 'var(--accent)' }}>{String(heat.indexOf(maxH)).padStart(2, '0')}h</b> · {maxH} pedido(s) — programe estoque e anúncios para esse horário</div>
            </>
          )}
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
          {ufs.top.length === 0 && <div style={{ fontSize: 8.5, color: 'var(--faint)', display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={10} className="animate-spin" />buscando os destinos nos envios…</div>}
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

      {/* INTELIGÊNCIA DE VENDAS · pedidos → campanhas */}
      <div className="glass" style={{ padding: '12px 15px', marginBottom: 11, border: '1px solid rgba(160,107,232,.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Sparkles size={14} style={{ color: 'var(--purple, #a06be8)' }} />
          <b className="serif" style={{ fontSize: 13 }}>Inteligência de vendas · transforme pedidos em campanhas</b>
          <span className="chip" style={{ color: '#e9dbfb', background: 'rgba(160,107,232,.2)' }}>O QUE SEUS CLIENTES COMPRAM JUNTOS</span>
          <div style={{ flex: 1 }} />
          {canal === 'shopee'
            ? <div className="btn" onClick={buscarIntel}>{intelCarregando ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}{intel ? 'Reanalisar' : 'Analisar os pedidos'}</div>
            : <span style={{ fontSize: 8.5, color: 'var(--faint)' }}>análise em tempo real dos {lista.length} pedidos carregados · criação nativa chega com o backlog de campanhas ML</span>}
        </div>
        {canal === 'ml' && (() => {
          // análise local: pares comprados juntos (packs), recompra e ticket — dados reais da janela
          const pares = new Map()
          lista.forEach((p) => {
            const nomes = [...new Set((p.itens || []).map((i) => i.nome))].slice(0, 4)
            for (let a = 0; a < nomes.length; a++) for (let b = a + 1; b < nomes.length; b++) {
              const k = [nomes[a], nomes[b]].sort().join('|')
              pares.set(k, (pares.get(k) || 0) + 1)
            }
          })
          const topPares = [...pares.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 2)
          const recompra = lista.filter((p) => (p.compras || 0) > 1).length
          const clientes = new Set(lista.map((p) => p.comprador)).size || 1
          const tickets = lista.map((p) => p.receita || 0).filter(Boolean).sort((a, b) => a - b)
          const tMed = tickets.length ? tickets.reduce((s, v) => s + v, 0) / tickets.length : 0
          const minimoCupom = tMed ? Math.ceil((tMed * 1.35) / 5) * 5 : 0
          const copiar = (txt) => { try { navigator.clipboard.writeText(txt); notify('Briefing copiado — cole em Campanhas para criar.', 'ok') } catch (_) { notify(txt, 'ok') } }
          if (!lista.length) return <div style={{ fontSize: 9, color: 'var(--faint)', marginTop: 8 }}>aguardando os pedidos carregarem…</div>
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9, marginTop: 10 }}>
              <div className="blk">
                <h4 style={{ color: 'var(--purple, #a06be8)' }}><Layers size={12} style={{ color: 'var(--purple, #a06be8)' }} />Comprados juntos · bundle</h4>
                {topPares.length ? topPares.map(([k, n], i) => (
                  <div key={i} style={{ fontSize: 9.5, color: 'var(--dim)', marginBottom: 6, lineHeight: 1.5 }}>
                    <b style={{ color: 'var(--fg)' }}>{k.split('|')[0].slice(0, 34)}</b> + <b style={{ color: 'var(--fg)' }}>{k.split('|')[1].slice(0, 34)}</b>
                    <span className="num" style={{ color: 'var(--ok)' }}> · juntos {n}x na janela</span>
                  </div>
                )) : <div style={{ fontSize: 9, color: 'var(--faint)' }}>sem pares fortes ainda — a análise refina conforme a carga completa</div>}
                {topPares.length > 0 && <div className="btn primary" style={{ fontSize: 9, marginTop: 4 }} onClick={() => copiar(`Bundle ML: ${topPares[0][0].replace('|', ' + ')} (comprados juntos ${topPares[0][1]}x nos últimos ${dias} dias)`)}><Check size={11} color={d.txt} />Copiar briefing do bundle</div>}
              </div>
              <div className="blk">
                <h4 style={{ color: 'var(--purple, #a06be8)' }}><Box size={12} style={{ color: 'var(--purple, #a06be8)' }} />Recompra · fidelidade</h4>
                <div style={{ fontSize: 9.5, color: 'var(--dim)', lineHeight: 1.5 }}>
                  <b className="num" style={{ color: 'var(--fg)', fontSize: 13 }}>{Math.round((recompra / Math.max(1, lista.length)) * 100)}%</b> dos pedidos são de quem já comprou antes ({recompra} de {lista.length})
                  <br /><span style={{ color: 'var(--faint)', fontSize: 8.5 }}>{clientes} compradores únicos na janela</span>
                </div>
                <div className="btn primary" style={{ fontSize: 9, marginTop: 6 }} onClick={() => copiar(`Campanha de recompra ML: ${recompra} pedidos de clientes recorrentes em ${dias} dias — cupom pós-venda para a 2ª compra`)}><Check size={11} color={d.txt} />Copiar briefing de recompra</div>
              </div>
              <div className="blk">
                <h4 style={{ color: 'var(--purple, #a06be8)' }}><Tag size={12} style={{ color: 'var(--purple, #a06be8)' }} />Cupom que aumenta o ticket</h4>
                <div style={{ fontSize: 9.5, color: 'var(--dim)', lineHeight: 1.5 }}>
                  ticket médio <b className="num" style={{ color: 'var(--fg)' }}>{brl(tMed)}</b> → mínimo sugerido <b className="num" style={{ color: 'var(--ok)' }}>{brl(minimoCupom)}</b>
                  <br /><span style={{ color: 'var(--faint)', fontSize: 8.5 }}>puxa o carrinho ~35% acima do padrão atual</span>
                </div>
                <div className="btn primary" style={{ fontSize: 9, marginTop: 6 }} onClick={() => copiar(`Cupom ML: mínimo ${brl(minimoCupom)} (ticket médio atual ${brl(tMed)} em ${dias} dias)`)}><Check size={11} color={d.txt} />Copiar briefing do cupom</div>
              </div>
            </div>
          )
        })()}
        {canal === 'shopee' && intel && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9, marginTop: 10 }}>
            <div className="blk">
              <h4 style={{ color: 'var(--purple, #a06be8)' }}><Layers size={12} style={{ color: 'var(--purple, #a06be8)' }} />Leve mais, pague menos</h4>
              {(intel.leve_mais || []).slice(0, 2).map((s, i) => (
                <div key={i} style={{ fontSize: 9.5, color: 'var(--dim)', marginBottom: 6, lineHeight: 1.5 }}>
                  <b style={{ color: 'var(--fg)' }}>{s.titulo || s.nome || 'Par frequente'}</b><br />{s.descricao || s.motivo || `${s.par?.[0] || ''} + ${s.par?.[1] || ''}`}
                </div>
              ))}
              {(intel.leve_mais || []).length === 0 && <div style={{ fontSize: 9, color: 'var(--faint)' }}>sem pares fortes no período</div>}
              {(intel.leve_mais || []).length > 0 && <div className="btn primary" style={{ fontSize: 9, marginTop: 4 }} onClick={() => criarIntel('bundle', intel.leve_mais[0])}>{criandoIntel === 'bundle' ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} color={d.txt} />}CRIAR bundle</div>}
            </div>
            <div className="blk">
              <h4 style={{ color: 'var(--purple, #a06be8)' }}><Box size={12} style={{ color: 'var(--purple, #a06be8)' }} />Add-on no carrinho</h4>
              {intel.add_on ? (
                <div style={{ fontSize: 9.5, color: 'var(--dim)', lineHeight: 1.5 }}>
                  <b style={{ color: 'var(--fg)' }}>{intel.add_on.principal || intel.add_on.titulo}</b><br />
                  {intel.add_on.descricao || `companheiros: ${(intel.add_on.companheiros || []).slice(0, 2).join(', ')}`}
                  {intel.add_on.pct_casada != null && <span className="num" style={{ color: 'var(--ok)' }}> · {intel.add_on.pct_casada}% compra casada</span>}
                  <div className="btn primary" style={{ fontSize: 9, marginTop: 6 }} onClick={() => criarIntel('addon', intel.add_on)}>{criandoIntel === 'addon' ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} color={d.txt} />}CRIAR add-on</div>
                </div>
              ) : <div style={{ fontSize: 9, color: 'var(--faint)' }}>sem sugestão de add-on no período</div>}
            </div>
            <div className="blk">
              <h4 style={{ color: 'var(--purple, #a06be8)' }}><Tag size={12} style={{ color: 'var(--purple, #a06be8)' }} />Cupom que aumenta o ticket</h4>
              {intel.cupom ? (
                <div style={{ fontSize: 9.5, color: 'var(--dim)', lineHeight: 1.5 }}>
                  <b style={{ color: 'var(--fg)' }}>{intel.cupom.titulo || 'Cupom sugerido'}</b><br />
                  {intel.cupom.descricao || `ticket médio ${brl(intel.cupom.ticket)} → mínimo sugerido ${brl(intel.cupom.minimo)}`}
                  <div className="btn primary" style={{ fontSize: 9, marginTop: 6 }} onClick={() => criarIntel('cupom', intel.cupom)}>{criandoIntel === 'cupom' ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} color={d.txt} />}CRIAR cupom</div>
                </div>
              ) : <div style={{ fontSize: 9, color: 'var(--faint)' }}>sem sugestão de cupom no período</div>}
            </div>
          </div>
        )}
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
          : (() => {
            const pAberto = aberto && filtrados.find((x) => x.id === aberto)
            const GRUPOS = [
              ['hoje', Truck, 'Despachar hoje · coleta 14:00 – 17:00 · corte 15:00', `${d.nome} · a fila de agora — NF-e pendente bloqueia a coleta`, corteTxt, corteCor === 'var(--faint)' ? 'var(--warn)' : corteCor],
              ['fut', CalendarDays, 'Coleta programada · etiqueta libera depois', 'sem urgência agora — o painel promove para "hoje" quando a janela abrir', 'SEM AÇÃO AGORA', '#9cc8ff'],
              ['tra', Truck, 'Em trânsito e pós-venda', 'rastreio, entregas, devoluções e cancelados aparecem aqui primeiro', 'ACOMPANHAMENTO', 'var(--purple, #a06be8)'],
            ]
            const renderCard = (p) => <UltraCard key={p.id} p={p} d={d} canal={canal} exp={aberto === p.id} densidade={densidade}
              onToggle={() => setAberto(aberto === p.id ? null : p.id)} sel={sel.has(p.id)} onSel={() => toggleSel(p.id)}
              baixarEtiqueta={() => baixarEtiquetas(p.id)} agoraTs={agoraTs} notify={notify} />
            return (
              <div className={`split ${pAberto ? 'aberto' : ''}`}>
                <div style={{ minWidth: 0 }}>
                  {GRUPOS.map(([g, Icone, tit, sub, ctx, cor]) => {
                    const its = pageItems.filter((p) => grupoDe(p) === g)
                    if (!its.length) return null
                    return (
                      <div key={g}>
                        <div className={`grp-col ${g === 'fut' ? 'fut' : g === 'tra' ? 'tra' : ''}`}>
                          <Icone size={15} style={{ color: 'var(--ch, ' + d.cor + ')', flex: 'none' }} />
                          <div style={{ minWidth: 0 }}>
                            <div className="t">{tit}</div>
                            <div className="s">{sub}</div>
                          </div>
                          <div style={{ flex: 1 }} />
                          <span className="chip" style={{ color: 'var(--dim)', background: 'rgba(255,255,255,.06)' }}>{its.length} PEDIDO{its.length > 1 ? 'S' : ''}</span>
                          <span className="chip" style={{ color: g === 'hoje' ? '#1a1008' : cor, background: g === 'hoje' ? cor : 'rgba(255,255,255,.07)' }}>{ctx}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 6 }}>{its.map(renderCard)}</div>
                      </div>
                    )
                  })}
                </div>
                {pAberto && (() => {
                  const m = mancheteDe(pAberto, canal)
                  return (
                    <div className="painel" key={pAberto.id} style={{ '--ch': d.cor, '--chd': d.cord }}>
                      <div className="p-hd">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span className="canal-bdg" style={{ background: d.cor, color: canal === 'ml' ? '#1a1008' : '#fff' }}>{canal === 'ml' ? 'ML' : 'SP'}</span>
                            <b className="serif" style={{ fontSize: 14 }}>Pedido <span className="num">#{pAberto.id}</span></b>
                            <b className="num serif" style={{ fontSize: 13 }}>{brl(pAberto.receita)}</b>
                          </div>
                          <div style={{ fontSize: 8.5, color: 'var(--faint)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {pAberto.comprador} · {pAberto.criado ? new Date(pAberto.criado).toLocaleDateString('pt-BR') : '—'} · <span style={{ color: m.cls === 'a-etq' ? 'var(--ok)' : m.cls === 'a-nf' ? '#ffcf7d' : m.cls === 'a-buf' || m.cls === 'a-tra' ? '#9cc8ff' : '#ffb8c5' }}>{m.tit}</span>
                          </div>
                        </div>
                        <div className="btn" style={{ padding: '6px 8px', flex: 'none' }} onClick={() => setAberto(null)}><X size={13} /></div>
                      </div>
                      <div style={{ padding: '2px 4px 10px' }}>
                        <UltraExpand p={pAberto} d={d} canal={canal} baixarEtiqueta={() => baixarEtiquetas(pAberto.id)} notify={notify} agoraTs={agoraTs} />
                      </div>
                    </div>
                  )
                })()}
              </div>
            )
          })()}

      {/* MASSBAR */}
      {sel.size > 0 && (
        <div className="massbar">
          <span className="chip" style={{ color: '#fff', background: 'var(--accent)' }}>{sel.size} SELECIONADO{sel.size > 1 ? 'S' : ''}</span>
          <div className="btn primary" style={{ fontSize: 10 }} onClick={() => baixarEtiquetas()}><Tag size={12} color="#1a1008" />Etiquetas</div>
          <div className="btn" style={{ fontSize: 10 }} onClick={() => setAba('nf')}><FileText size={12} />NF-e</div>
          <div className="btn" style={{ fontSize: 10 }} onClick={() => setModal('sep')}><Layers size={12} />Separação</div>
          <div className="btn" style={{ fontSize: 10 }} onClick={() => imprimirFolhasCanal(canal, filtrados.filter((x) => sel.has(x.id)).map(paraImpressao))}><Printer size={12} />Imprimir pedidos</div>
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

      {modal === 'mesa' && <UltraMesa fila={filtrados.filter((p) => !p.cancelado).slice(0, 60)} idx={mesaIdx} setIdx={setMesaIdx} conf={mesaConf} setConf={setMesaConf} onFechar={() => setModal(null)} d={d} canal={canal} baixarOficial={(id) => baixarEtiquetas(id)} agoraTs={agoraTs} />}
      {modal === 'sep' && <ModalSep filtrados={filtrados} d={d} canal={canal} onFechar={() => setModal(null)} abrirMesa={() => { setMesaIdx(0); setModal('mesa') }} />}
      {modal === 'imp' && <ModalImp filtrados={filtrados} d={d} canal={canal} semNf={semNf} onFechar={() => setModal(null)} selIniciais={sel} baixarOficiais={(ids) => baixarEtiquetas(ids)} />}
      {modal === 'etq' && <ModalEtq d={d} canal={canal} exemplo={filtrados[0]} n={sel.size || aDespachar || filtrados.length} onFechar={() => setModal(null)} gerar={() => { setModal(null); baixarEtiquetas() }} />}
    </div>
  )
}

// ————— CARD v3 pedido-cêntrico (contrato: pedidos_central_ultra_v3.html) —————
// O card decide (manchete de ação + enviar em + NF-e); o painel inline detalha. Sem duplicação.
function UltraCard({ p, d, canal, exp, densidade, onToggle, sel, onSel, baixarEtiqueta, agoraTs, notify }) {
  const m = mancheteDe(p, canal)
  const env = enviarEmDe(p, agoraTs)
  const rail = p.cancelado ? 'var(--danger)' : p.devolucao ? 'var(--warn)' : m.cls === 'a-nf' ? 'var(--warn)' : m.cls === 'a-fis' ? 'var(--danger)' : m.cls === 'a-buf' || m.cls === 'a-tra' ? '#5b8def' : classifica(p) === 'fim' ? 'var(--ok)' : d.cor
  const chip = (txt, c, bg) => <span className="chip" style={{ color: c, background: bg }}>{txt}</span>
  const abrirCanal = () => window.open(canal === 'ml' ? `https://www.mercadolivre.com.br/vendas/${p.id}/detalhe` : `https://seller.shopee.com.br/portal/sale/order/${p.id}`, '_blank')
  const agir = (e) => {
    e.stopPropagation()
    if (m.acao === 'etiqueta') baixarEtiqueta()
    else if (m.acao === 'bling') window.open('https://www.bling.com.br/vendas.php', '_blank')
    else if (m.acao === 'canal') abrirCanal()
    else onToggle()
  }
  const nfTxt = p.nf ? `EMITIDA${p.nfInfo?.numero ? ` · nº ${p.nfInfo.numero}` : ''}` : p.nfDesconhecida ? 'CONSULTANDO' : 'PENDENTE'
  const nfCor = p.nf ? 'var(--ok)' : p.nfDesconhecida ? 'var(--faint)' : 'var(--danger)'
  const dataTxt = p.criado ? new Date(p.criado).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
  const titCor = m.cls === 'a-etq' ? 'var(--ok)' : m.cls === 'a-nf' ? '#ffcf7d' : m.cls === 'a-fis' ? '#ffb8c5' : '#9cc8ff'

  if (densidade === 'comp' && !exp) {
    return (
      <div className="card glass" style={{ padding: 0 }}>
        <div className="rail" style={{ background: rail }} />
        <div style={{ padding: '9px 14px 9px 18px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={onToggle}>
          <div onClick={(e) => { e.stopPropagation(); onSel() }} style={{ width: 14, height: 14, borderRadius: 4, border: sel ? 'none' : '2px solid var(--glass-border)', background: sel ? 'var(--accent)' : 'transparent', flex: 'none', display: 'grid', placeItems: 'center' }}>{sel && <Check size={10} color="#fff" />}</div>
          <span className="canal-bdg" style={{ background: d.cor, color: canal === 'ml' ? '#1a1008' : '#fff' }}>{canal === 'ml' ? 'ML' : 'SP'}</span>
          <b className="num" style={{ fontSize: 10, flex: 'none' }}>#{String(p.id).slice(-8)}</b>
          <span style={{ fontSize: 9.5, color: 'var(--dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>{p.comprador}</span>
          <span className="chip" style={{ color: titCor, background: 'rgba(255,255,255,.06)' }}>{m.tit.split('·')[0].trim().toUpperCase().slice(0, 26)}</span>
          <span className="num" style={{ fontSize: 8.5, color: env[1] }}>{env[0]}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 9, color: 'var(--faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.titulo}</span>
          {p.liquido != null && <span className="num" style={{ fontSize: 8.5, color: 'var(--ok)' }}>sobra {brl(p.liquido)}{p.margem != null ? ` · ${Math.round(p.margem)}%` : ''}</span>}
          <b className="num" style={{ fontSize: 12, flex: 'none' }}>{brl(p.receita)}</b>
        </div>
      </div>
    )
  }

  return (
    <div className={`card glass ${exp ? 'ativo' : ''}`} style={{ padding: 0 }}>
      <div className="rail" style={{ background: rail }} />
      <div style={{ cursor: 'pointer' }} onClick={onToggle}>
        {/* cabeçalho do PEDIDO */}
        <div style={{ padding: '10px 15px 8px 19px', display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
          <div onClick={(e) => { e.stopPropagation(); onSel() }} style={{ width: 15, height: 15, borderRadius: 4, border: sel ? 'none' : '2px solid var(--glass-border)', background: sel ? 'var(--accent)' : 'transparent', flex: 'none', display: 'grid', placeItems: 'center' }}>{sel && <Check size={10} color="#fff" />}</div>
          <span className="canal-bdg" style={{ background: d.cor, color: canal === 'ml' ? '#1a1008' : '#fff' }}>{canal === 'ml' ? 'ML' : 'SP'}</span>
          <b className="num" style={{ fontSize: 11 }}>#{p.id}</b>
          {p.packId && chip('PACK · COMPRA ÚNICA', '#e9dbfb', 'rgba(160,107,232,.28)')}
          <span className="num" style={{ fontSize: 9, color: 'var(--faint)' }}>{dataTxt}</span>
          <span style={{ fontSize: 10, color: 'var(--dim)' }}>para <b style={{ color: 'var(--fg)' }}>{p.clienteReal || p.comprador}</b></span>
          {(p.compras || 0) > 1 && chip(`${p.compras}ª COMPRA`, '#1a1008', 'var(--gold, #F2C200)')}
          {p.isFull && chip('FULL · ML EXPEDE', '#1a1008', 'var(--teal, #2dd4bf)')}
          {p.itens.length > 1 && chip(`${p.itens.length} PRODUTOS`, '#e9dbfb', 'rgba(160,107,232,.3)')}
          {p.prejuizo && chip('PREJUÍZO', '#fff', 'var(--danger)')}
          {!p.prejuizo && p.abaixoMeta && chip('ABAIXO DA META', '#1a1008', 'var(--warn)')}
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: 'right', flex: 'none' }}>
            <div className="up" style={{ fontSize: 7, color: 'var(--faint)' }}>Vendido</div>
            <b className="num serif" style={{ fontSize: 15 }}>{brl(p.receita)}</b>
          </div>
          <div style={{ flex: 'none', color: 'var(--faint)', transform: exp ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}><ChevronRight size={16} /></div>
        </div>
        {/* MANCHETE DE AÇÃO — o que fazer agora, direto do substatus real */}
        <div className={`acao ${m.cls}`}>
          <div style={{ flex: 1, minWidth: 170 }}>
            <div className="tit">{m.tit}</div>
            <div className="sub">{m.sub}</div>
          </div>
          {m.acao && (
            <div className={`btn ${m.acao === 'bling' ? 'primary' : m.acao === 'etiqueta' ? 'okb' : ''}`} style={{ fontSize: 10 }} onClick={agir}>
              {m.acao === 'bling' ? <FileText size={12} color="#1a1008" /> : m.acao === 'etiqueta' ? <Tag size={12} /> : m.acao === 'canal' ? <Truck size={12} /> : <Eye size={12} />}
              {m.label}
            </div>
          )}
        </div>
        {/* STRIP operacional: quando enviar · destino · NF-e · sobra */}
        <div className="strip2">
          <div className="cell"><div className="l up">Enviar em</div><b style={{ color: env[1] }}>{env[0]}</b></div>
          <div className="cell"><div className="l up">Destino</div><b className="num">{p.cidade ? `${p.cidade}${p.uf ? `/${p.uf}` : ''}` : (p.uf || 'buscando…')}</b></div>
          <div className="cell"><div className="l up">NF-e</div><b className="num" style={{ color: nfCor }}>{nfTxt}</b></div>
          {p.rastreio && <div className="cell"><div className="l up">Rastreio</div><b className="num">{p.rastreio}</b></div>}
          <div className="cell"><div className="l up">Sobra</div><b className="num" style={{ color: 'var(--ok)' }}>{p.liquido != null ? `${brl(p.liquido)}${p.margem != null ? ` · ${Math.round(p.margem)}%` : ''}` : '—'}</b></div>
        </div>
        {/* produtos em uma linha — preço e tarifa por item ficam no painel */}
        <div style={{ padding: '6px 15px 10px 19px', display: 'flex', alignItems: 'center', gap: 9 }}>
          {p.itens.slice(0, 3).map((it, i) => (
            <div key={i} style={{ width: 30, height: 30, borderRadius: 7, overflow: 'hidden', background: 'linear-gradient(135deg,#4a2a3a,#3a2530)', flex: 'none' }}>{it.imagem && <img src={it.imagem} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
          ))}
          <span style={{ fontSize: 9.5, color: 'var(--dim)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {p.itens.length > 1 ? `${p.itens.length} produtos · ` : ''}{p.titulo} <span style={{ color: 'var(--faint)' }}>· {p.qtd} un</span>
          </span>
          <span style={{ fontSize: 8, color: 'var(--faint)', flex: 'none' }}>{exp ? 'preço e tarifa por item ao lado →' : 'preço e tarifa por item no painel →'}</span>
        </div>
      </div>
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
        <div className="btn" style={{ fontSize: 10 }} onClick={() => imprimirEtiquetasCanal(canal, [paraImpressao(p)])}><Eye size={12} />Etiqueta da transportadora</div>
        <div className="btn" style={{ fontSize: 10 }} onClick={() => imprimirFolhasCanal(canal, [paraImpressao(p)])}><Printer size={12} />Imprimir pedido</div>
        <div className="btn" style={{ fontSize: 10 }} onClick={() => window.open(canal === 'ml' ? `https://www.mercadolivre.com.br/vendas/${p.id}/detalhe` : `https://seller.shopee.com.br/portal/sale/order/${p.id}`, '_blank')}><Box size={12} />Abrir no canal</div>
        <div style={{ flex: 1 }} />
        {!p.cancelado && !p.devolucao && <span className="chip" style={{ color: 'var(--ok)', background: 'rgba(47,217,141,.12)' }}><ShieldCheck size={9} style={{ color: 'var(--ok)' }} />SLA NO PRAZO</span>}
      </div>
      <div className="exp-grid" style={{ gridTemplateColumns: '1fr' }}>
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
            <h4 style={{ color: d.cor }}><Box size={12} style={{ color: d.cor }} />Produtos · preço e tarifa por item</h4>
            {rateiaItens(p).map((it, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: i ? '1px dashed rgba(255,255,255,.07)' : 'none' }}>
                <div style={{ width: 38, height: 38, borderRadius: 8, overflow: 'hidden', background: 'linear-gradient(135deg,#4a2a3a,#3a2530)', flex: 'none' }}>{it.imagem && <img src={it.imagem} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.nome}</div>
                  <div className="num" style={{ fontSize: 7.5, color: 'var(--faint)' }}>{[it.sku, `${it.qtd} un`, it.bin ? `bin ${it.bin}` : ''].filter(Boolean).join(' · ')}</div>
                  {(it.tx != null || it.liq != null) && <span className="fee-bdg">{it.tx != null ? `tarifa − ${brl(it.tx)}` : ''}{it.tx != null && it.liq != null ? ' · ' : ''}{it.liq != null ? <span style={{ color: 'var(--ok)' }}>líquido {brl(it.liq)}</span> : null}</span>}
                </div>
                <div style={{ textAlign: 'right', flex: 'none' }}>
                  <b className="num" style={{ fontSize: 10.5 }}>{brl(it.val)}</b>
                  {it.qtd > 1 && it.val != null && <div className="num" style={{ fontSize: 7, color: 'var(--faint)' }}>{brl(it.val / it.qtd)} / un</div>}
                </div>
              </div>
            ))}
            {p.itens.length > 1 && p.taxas != null && <div style={{ fontSize: 6.5, color: 'var(--faint)', marginTop: 5 }}>tarifa rateada por item proporcional ao valor (estimativa) · o total do pedido é o billing real</div>}
          </div>
          <div className="blk">
            <h4 style={{ color: p.nf ? d.cor : 'var(--danger)' }}><FileText size={12} style={{ color: p.nf ? d.cor : 'var(--danger)' }} />Nota fiscal</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="chip" style={{ color: p.nf ? 'var(--ok)' : '#fff', background: p.nf ? 'rgba(47,217,141,.12)' : 'var(--danger)' }}>{p.nf ? 'NF-E EMITIDA' : p.nfDesconhecida ? 'NF-E: CONSULTANDO' : 'NF-E PENDENTE'}</span>
              <span className="num" style={{ fontSize: 8.5, color: 'var(--faint)' }}>{p.nfInfo?.numero ? `nº ${p.nfInfo.numero}${p.nfInfo.serie ? ` · série ${p.nfInfo.serie}` : ''}${p.nfInfo.situacao_label ? ` · ${p.nfInfo.situacao_label}` : ''}` : (p.nf ? 'vinculada ao pedido via Bling' : 'emitir no Bling para liberar o envio')}</span>
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

// ————— MODAL CENTRAL DE IMPRESSÃO — com SELEÇÃO de pedidos e impressão por marketplace —————
function ModalImp({ filtrados, d, canal, semNf, onFechar, selIniciais, baixarOficiais }) {
  const [marcados, setMarcados] = useState(() => new Set(selIniciais && selIniciais.size ? [...selIniciais] : filtrados.slice(0, 40).map((p) => p.id)))
  const [mostrarPersonalizar, setMostrarPersonalizar] = useState(false)
  const alvos = filtrados.filter((p) => marcados.has(p.id))
  const un = alvos.reduce((s, p) => s + p.qtd, 0)
  const etq = alvos.filter((p) => p.rastreio).length
  const nf = alvos.filter((p) => p.nf).length
  const toggle = (id) => setMarcados((m) => { const n = new Set(m); n.has(id) ? n.delete(id) : n.add(id); return n })
  const todos = () => setMarcados(new Set(filtrados.map((p) => p.id)))
  const nenhum = () => setMarcados(new Set())
  const linhas = [
    ['Folhas do pedido', `${alvos.length} folha(s)`, Printer, d.cor, canal === 'ml' ? 'modelo Mercado Livre · logo oficial' : 'Folha V8 · modelo Shopee', () => imprimirFolhasCanal(canal, alvos.map(paraImpressao))],
    ['Etiquetas da transportadora', `${alvos.length} etiqueta(s)`, Tag, 'var(--ok)', canal === 'ml' ? 'MERCADO ENVIOS · ESTAÇÃO/ROTA' : 'SPX EXPRESS · ESTAÇÃO/ROTA', () => imprimirEtiquetasCanal(canal, alvos.map(paraImpressao))],
    ['Etiquetas oficiais (PDF)', `${etq} com rastreio`, FileText, 'var(--blue)', canal === 'ml' ? 'PDF/ZPL direto do Mercado Envios' : 'waybill oficial SPX (A6)', () => baixarOficiais([...marcados])],
    ['Notas fiscais (DANFE)', `${nf} emitidas`, CheckCheck, nf ? 'var(--ok)' : 'var(--warn)', 'via Bling · imprime junto da etiqueta', null],
  ]
  return (
    <div className="modal-bg" style={{ display: 'flex' }} onClick={onFechar}>
      <div className="modal" style={{ maxWidth: 760 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Printer size={17} style={{ color: d.cor }} />
          <div style={{ flex: 1 }}><b className="serif" style={{ fontSize: 16 }}>Central de Impressão</b><div style={{ fontSize: 9, color: 'var(--faint)' }}>selecione os pedidos e imprima tudo o que a coleta precisa — na identidade de cada marketplace</div></div>
          <div className="btn" onClick={() => setMostrarPersonalizar(true)}><Settings size={12} />Personalizar modelos</div>
          <div className="btn" style={{ padding: '5px 9px' }} onClick={onFechar}><X size={13} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 13 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
              <span className="up" style={{ fontSize: 7.5, color: 'var(--faint)', fontWeight: 800 }}>seleção de impressão</span>
              <span className="chip num" style={{ color: d.txt, background: d.cor }}>{alvos.length} DE {filtrados.length}</span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 8.5, color: 'var(--accent)', cursor: 'pointer' }} onClick={todos}>todos</span>
              <span style={{ fontSize: 8.5, color: 'var(--faint)', cursor: 'pointer' }} onClick={nenhum}>nenhum</span>
            </div>
            <div style={{ maxHeight: '44vh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filtrados.slice(0, 80).map((p) => (
                <div key={p.id} onClick={() => toggle(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 9px', borderRadius: 9, cursor: 'pointer', background: marcados.has(p.id) ? `${d.cor}10` : 'rgba(0,0,0,.18)', border: `1px solid ${marcados.has(p.id) ? d.cor + '55' : 'var(--glass-border)'}` }}>
                  <span style={{ width: 15, height: 15, borderRadius: 4, display: 'grid', placeItems: 'center', flex: 'none', background: marcados.has(p.id) ? d.cor : 'transparent', border: marcados.has(p.id) ? 'none' : '1.5px solid var(--glass-border)' }}>{marcados.has(p.id) && <Check size={10} color={d.txt} />}</span>
                  <span className="num" style={{ fontSize: 9, color: 'var(--faint)', flex: 'none' }}>#{p.id.slice(-8)}</span>
                  <span style={{ flex: 1, fontSize: 9.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.titulo}</span>
                  {!p.nf && !p.nfDesconhecida && <span className="chip" style={{ fontSize: 6.5, color: '#fff', background: 'var(--danger)' }}>SEM NF</span>}
                  <b className="num" style={{ fontSize: 9.5 }}>{p.qtd}un</b>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {linhas.map(([t, v, Icon, c, s, acao], i) => (
              <div key={i} onClick={acao || undefined} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '1px solid var(--glass-border)', cursor: acao ? 'pointer' : 'default', opacity: acao ? 1 : .75 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon size={15} style={{ color: c }} /></div>
                <div style={{ flex: 1 }}><b style={{ fontSize: 11.5 }}>{t}</b><div style={{ fontSize: 8.5, color: 'var(--faint)' }}>{s}</div></div>
                <span className="num" style={{ fontSize: 10, color: c }}>{v}</span>
                {acao && <ChevronRight size={13} style={{ color: 'var(--faint)' }} />}
              </div>
            ))}
            <div className="btn primary" style={{ justifyContent: 'center', marginTop: 4 }} onClick={() => { imprimirFolhasCanal(canal, alvos.map(paraImpressao)); imprimirEtiquetasCanal(canal, alvos.map(paraImpressao)) }}>
              <Printer size={13} color={d.txt} />Imprimir fila completa ({alvos.length} · {un} un)
            </div>
            <div style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center' }}>{canal === 'ml' ? 'folhas e etiquetas no padrão Mercado Livre — a NF-e imprime nas mesmas dimensões, par a par' : 'a waybill SPX sai em A6 térmica; a DANFE acompanha em folha própria'}</div>
          </div>
        </div>
        {mostrarPersonalizar && <PainelImpressao onClose={() => setMostrarPersonalizar(false)} onSalvo={() => setMostrarPersonalizar(false)} />}
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

// ═══════════ MESA DE DESPACHO ULTRA — módulo dedicado em tela cheia ═══════════
// Checkout de conferência: fila viva, cronômetros, dados do cliente, impressão por marketplace.
function UltraMesa({ fila, idx, setIdx, conf, setConf, onFechar, d, canal, baixarOficial, agoraTs }) {
  const [inicioSessao] = useState(() => Date.now())
  const inicioPedido = useRef({})
  const duracoes = useRef({})
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t) }, [])
  useEffect(() => {
    const p = fila[idx]
    if (p && !inicioPedido.current[p.id]) inicioPedido.current[p.id] = Date.now()
  }, [idx, fila])

  const fmtT = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` }
  const p = fila[Math.min(idx, Math.max(0, fila.length - 1))]
  const c = p ? (conf[p.id] || new Set()) : new Set()
  const tot = p ? p.itens.reduce((s, it) => s + it.qtd, 0) : 0
  const feitos = p ? p.itens.reduce((s, it, i) => s + (c.has(i) ? it.qtd : 0), 0) : 0
  const completo = p && p.itens.length > 0 && p.itens.every((_, i) => c.has(i))
  const done = (id) => { const cc = conf[id]; const its = (fila.find((x) => x.id === id)?.itens) || []; return its.length > 0 && its.every((_, i) => cc && cc.has(i)) }
  const concluidos = fila.filter((f) => done(f.id)).length
  const medio = (() => { const ds = Object.values(duracoes.current); return ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : 0 })()
  const marcar = (i) => p && setConf((m) => { const s = new Set(m[p.id] || []); s.has(i) ? s.delete(i) : s.add(i); return { ...m, [p.id]: s } })
  const concluir = () => {
    if (!p) return
    duracoes.current[p.id] = Date.now() - (inicioPedido.current[p.id] || Date.now())
    if (idx < fila.length - 1) setIdx(idx + 1); else onFechar()
  }
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === ' ') { e.preventDefault(); const prox = p ? p.itens.findIndex((_, i) => !c.has(i)) : -1; if (prox >= 0) marcar(prox) }
      else if (e.key === 'Enter' && completo) { e.preventDefault(); concluir() }
      else if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [p, c, completo, idx])

  const corteMs = (() => { const alvo = new Date(); alvo.setHours(15, 0, 0, 0); return alvo - Date.now() })()

  return (
    <div className="pcuv2" style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'var(--bg, #16090f)', overflow: 'auto', padding: '14px 18px', '--ch': d.cor, '--chd': d.cord }}>
      {/* header do módulo */}
      <div className="glass" style={{ padding: '13px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap', border: '1px solid transparent', background: `linear-gradient(var(--surface),var(--surface)) padding-box, linear-gradient(110deg, ${d.cor}88, rgba(214,0,127,.4), ${d.cor}44) border-box` }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: d.brand, display: 'grid', placeItems: 'center', flex: 'none' }}><ScanLine size={19} color="#1a1008" /></div>
        <div>
          <b className="serif" style={{ fontSize: 17 }}>Mesa de Despacho</b>
          <div style={{ fontSize: 9, color: 'var(--faint)' }}>bipou, conferiu, imprimiu — a fila anda sozinha · {d.nome}</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: 'center' }}><div className="up" style={{ fontSize: 6.5, color: 'var(--faint)' }}>sessão</div><b className="num" style={{ fontSize: 14 }}>{fmtT(Date.now() - inicioSessao)}</b></div>
        <div style={{ textAlign: 'center' }}><div className="up" style={{ fontSize: 6.5, color: 'var(--faint)' }}>conferidos</div><b className="num" style={{ fontSize: 14, color: 'var(--ok)' }}>{concluidos}/{fila.length}</b></div>
        <div style={{ textAlign: 'center' }}><div className="up" style={{ fontSize: 6.5, color: 'var(--faint)' }}>tempo médio</div><b className="num" style={{ fontSize: 14 }}>{medio ? fmtT(medio) : '—'}</b></div>
        <div style={{ textAlign: 'center' }}><div className="up" style={{ fontSize: 6.5, color: 'var(--faint)' }}>corte da coleta</div><b className="num" style={{ fontSize: 14, color: corteMs < 3600000 ? 'var(--danger)' : 'var(--warn)' }}>{corteMs > 0 ? fmtT(corteMs) : 'encerrado'}</b></div>
        <div className="btn" onClick={onFechar}><X size={13} />Sair (esc)</div>
      </div>

      {!p ? <div className="glass" style={{ padding: 26, textAlign: 'center', color: 'var(--faint)', fontSize: 12 }}>Fila vazia — nada para conferir nesta aba.</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: '270px 1.5fr 300px', gap: 12, alignItems: 'start' }}>
          {/* FILA */}
          <div className="glass" style={{ padding: '12px 13px' }}>
            <div className="up" style={{ fontSize: 7.5, fontWeight: 800, color: 'var(--faint)', marginBottom: 8 }}>fila da coleta · {fila.length} pedido(s)</div>
            <div style={{ maxHeight: '62vh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {fila.map((f, i) => (
                <div key={f.id} onClick={() => setIdx(i)} style={{ borderRadius: 10, padding: '8px 10px', cursor: 'pointer', background: i === idx ? `${d.cor}14` : 'rgba(0,0,0,.18)', border: `1px solid ${i === idx ? d.cor + '66' : 'var(--glass-border)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', background: done(f.id) ? 'var(--ok)' : !f.nf && !f.nfDesconhecida ? 'var(--danger)' : i === idx ? d.cor : 'var(--faint)' }} />
                    <b className="num" style={{ fontSize: 10, flex: 1 }}>#{f.id.slice(-10)}</b>
                    <span className="num" style={{ fontSize: 8, color: 'var(--faint)' }}>{f.qtd}un</span>
                  </div>
                  <div style={{ fontSize: 8, color: 'var(--dim)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.titulo}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                    <span style={{ fontSize: 7, color: done(f.id) ? 'var(--ok)' : i === idx ? d.cor : 'var(--faint)' }}>{done(f.id) ? '✓ conferido' : i === idx ? 'na mesa' : 'aguardando'}</span>
                    {!f.nf && !f.nfDesconhecida && <span style={{ fontSize: 7, color: 'var(--danger)' }}>sem NF-e</span>}
                    {f.shipBy && f.shipBy * 1000 < agoraTs && <span style={{ fontSize: 7, color: 'var(--danger)' }}>atrasado</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PEDIDO ATUAL */}
          <div className="glass" style={{ padding: '14px 16px', border: `1px solid ${completo ? 'rgba(47,217,141,.45)' : 'var(--glass-border)'}`, background: completo ? 'linear-gradient(180deg,rgba(47,217,141,.05),transparent)' : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <span className="chip num" style={{ color: d.txt, background: d.cor }}>NA MESA · {Math.min(idx + 1, fila.length)} DE {fila.length}</span>
              <b className="num" style={{ fontSize: 13 }}>#{p.id}</b>
              <div style={{ flex: 1 }} />
              <div style={{ textAlign: 'right' }}><div className="up" style={{ fontSize: 6.5, color: 'var(--faint)' }}>tempo de separação</div><b className="num" style={{ fontSize: 15, color: d.cor }}>{fmtT(Date.now() - (inicioPedido.current[p.id] || Date.now()))}</b></div>
            </div>
            {/* cliente */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 11, background: 'rgba(0,0,0,.2)', border: '1px solid var(--glass-border)', marginBottom: 10, flexWrap: 'wrap' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(145deg,var(--accent),#7b2a8c)', display: 'grid', placeItems: 'center', flex: 'none' }}><User size={15} color="#fff" /></div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <b style={{ fontSize: 12 }}>{p.clienteReal || p.comprador}</b>
                <div style={{ fontSize: 8.5, color: 'var(--faint)' }}>{[p.cidade, p.uf].filter(Boolean).join('/') || 'destino no envio'}{p.cep ? ` · ${p.cep}` : ''}</div>
              </div>
              {(p.compras || 0) > 1 && <span className="chip" style={{ color: '#1a1008', background: 'var(--gold, #F2C200)' }}>{p.compras}ª COMPRA</span>}
              <span className="chip" style={{ color: p.nf ? 'var(--ok)' : '#fff', background: p.nf ? 'rgba(47,217,141,.12)' : 'var(--danger)' }}>{p.nf ? 'NF-E OK' : p.nfDesconhecida ? 'NF-E: VERIFICAR' : 'SEM NF-E'}</span>
              {p.shipBy && <span className="chip" style={{ color: p.shipBy * 1000 < agoraTs ? '#fff' : '#1a1008', background: p.shipBy * 1000 < agoraTs ? 'var(--danger)' : 'var(--warn)' }}><Clock size={9} />DESPACHAR {new Date(p.shipBy * 1000).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>}
            </div>
            {/* scanbox */}
            <div className="scanbox" style={{ marginBottom: 10 }}><Barcode size={19} style={{ color: d.cor }} /><div style={{ flex: 1 }}><div className="up" style={{ fontSize: 7, color: 'var(--faint)' }}>bipe o código do produto — ou toque no item · espaço marca o próximo</div><b style={{ fontSize: 12.5, color: 'var(--dim)' }}>aguardando leitura…</b></div><span className="chip" style={{ color: 'var(--ok)', background: 'rgba(47,217,141,.12)' }}>SCANNER PRONTO</span></div>
            {/* progresso */}
            <div style={{ height: 8, borderRadius: 5, background: 'rgba(255,255,255,.07)', overflow: 'hidden', marginBottom: 10 }}><div style={{ height: '100%', width: `${tot ? Math.round(feitos / tot * 100) : 0}%`, background: completo ? 'var(--ok)' : `linear-gradient(90deg,${d.cor},${d.cord})`, transition: 'width .2s' }} /></div>
            {/* itens com foto grande */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {p.itens.map((it, i) => (
                <div key={i} onClick={() => marcar(i)} style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 12, padding: '10px 12px', cursor: 'pointer', background: c.has(i) ? 'rgba(47,217,141,.1)' : 'rgba(0,0,0,.2)', border: `1px solid ${c.has(i) ? 'rgba(47,217,141,.4)' : 'var(--glass-border)'}` }}>
                  <span style={{ width: 20, height: 20, borderRadius: 6, display: 'grid', placeItems: 'center', flex: 'none', background: c.has(i) ? 'var(--ok)' : 'transparent', border: c.has(i) ? 'none' : '2px solid var(--glass-border)' }}>{c.has(i) && <Check size={13} color="#0a1a0f" />}</span>
                  <div style={{ width: 58, height: 58, borderRadius: 10, overflow: 'hidden', background: 'linear-gradient(135deg,#4a2a3a,#3a2530)', flex: 'none', display: 'grid', placeItems: 'center' }}>{it.imagem ? <img src={it.imagem} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Box size={22} style={{ color: 'rgba(255,255,255,.5)' }} />}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: 12.5 }}>{it.nome}</b>
                    <div className="num" style={{ fontSize: 8.5, color: 'var(--faint)', marginTop: 2 }}>{[it.sku, it.variacao].filter(Boolean).join(' · ')}</div>
                  </div>
                  {it.bin && <div style={{ textAlign: 'center', flex: 'none' }}><div className="up" style={{ fontSize: 6, color: 'var(--faint)' }}>bin</div><b className="num" style={{ fontSize: 13, color: d.cor }}>{it.bin}</b></div>}
                  <div style={{ textAlign: 'center', flex: 'none', minWidth: 44 }}><div className="up" style={{ fontSize: 6, color: 'var(--faint)' }}>qtd</div><b className="num" style={{ fontSize: 17, color: c.has(i) ? 'var(--ok)' : 'var(--fg)' }}>{it.qtd}</b></div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <div className={`btn ${completo ? 'primary' : ''}`} style={{ flex: 1, justifyContent: 'center', fontSize: 11, opacity: completo ? 1 : .5, pointerEvents: completo ? 'auto' : 'none' }} onClick={concluir}>
                <Check size={13} color={completo ? '#1a1008' : undefined} />{completo ? 'Conferido — próximo pedido (enter)' : `faltam ${tot - feitos} unidade(s)`}
              </div>
              <div className="btn" onClick={() => idx < fila.length - 1 ? setIdx(idx + 1) : onFechar()}>pular</div>
            </div>
          </div>

          {/* AÇÕES + LOGÍSTICA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="glass" style={{ padding: '12px 14px' }}>
              <div className="up" style={{ fontSize: 7.5, fontWeight: 800, color: 'var(--faint)', marginBottom: 8 }}>imprimir agora</div>
              <div className="btn primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 6 }} onClick={() => { imprimirEtiquetasCanal(canal, [paraImpressao(p)]); if (completo) concluir() }}><Tag size={13} color={d.txt} />Conferido — etiqueta + DANFE</div>
              <div className="btn" style={{ width: '100%', justifyContent: 'center', marginBottom: 6 }} onClick={() => imprimirFolhasCanal(canal, [paraImpressao(p)])}><Printer size={12} />Folha do pedido ({canal === 'ml' ? 'ML' : 'Shopee'})</div>
              <div className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => baixarOficial(p.id)}><FileText size={12} />Etiqueta oficial (PDF)</div>
            </div>
            <div className="glass" style={{ padding: '12px 14px' }}>
              <div className="up" style={{ fontSize: 7.5, fontWeight: 800, color: 'var(--faint)', marginBottom: 8 }}>logística da coleta</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--dim)' }}>Transportadora</span><b>{canal === 'ml' ? 'Mercado Envios' : 'SPX Express'}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--dim)' }}>Janela de hoje</span><b className="num">{canal === 'ml' ? '14:00 – 17:00' : '13:30 – 16:30'}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--dim)' }}>Corte</span><b className="num" style={{ color: 'var(--warn)' }}>15:00</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--dim)' }}>Volumes restantes</span><b className="num">{fila.length - concluidos}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--dim)' }}>Rastreio</span><b className="num" style={{ fontSize: 9 }}>{p.rastreio || '—'}</b></div>
              </div>
            </div>
            <div className="glass" style={{ padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
              <AlertTriangle size={13} style={{ color: 'var(--danger)', flex: 'none' }} />
              <span style={{ fontSize: 8.5, color: 'var(--dim)' }}>item errado bipado trava a mesa até corrigir — confira o SKU antes de embalar</span>
            </div>
            <div className="kbdbar" style={{ position: 'static', justifyContent: 'center' }}>
              <span><span className="kbd">espaço</span> marca item</span><span><span className="kbd">enter</span> conclui</span><span><span className="kbd">esc</span> sai</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
