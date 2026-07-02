import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Package, MapPin, RefreshCw, Search, Plug, Loader2, Truck, Filter, Boxes,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, User, ExternalLink,
  CheckCircle2, Zap, Check, CheckCheck, AlertTriangle, TrendingUp, Printer,
  Wallet, DollarSign, Tag, Clock, X, SlidersHorizontal, ClipboardList, FileText,
  Send, RotateCcw, PackageCheck, CalendarClock, MapPinned, Undo2,
} from 'lucide-react'
import { api } from './api.js'
import { useToast } from './toast.jsx'

const ML = '#F2C200'
const brl = (v) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
const brl0 = (v) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }))
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const PAGE_SIZE = 15
const PERIODOS = [{ id: 7, label: '7d' }, { id: 15, label: '15d' }, { id: 30, label: '30d' }]
const ESCOPOS = [{ id: 'tudo', label: 'Tudo' }, { id: 'pedido', label: '# Pedido' }, { id: 'comprador', label: 'Comprador' }, { id: 'produto', label: 'Produto / SKU' }]

// Baldes vindos do backend (estado REAL do envio) — mesmo eixo da tela Vendas do ML
const ENVIO_TABS = [
  { id: 'todos', label: 'Todos', icon: Boxes },
  { id: 'hoje', label: 'A despachar hoje', icon: CalendarClock },
  { id: 'proximos', label: 'Próximos dias', icon: Clock },
  { id: 'transito', label: 'Em trânsito', icon: Truck },
  { id: 'finalizado', label: 'Finalizados', icon: PackageCheck },
  { id: 'cancelado', label: 'Cancelados', icon: X },
]
const PGTO_CHIPS = [
  { id: 'todos', label: 'Todos' },
  { id: 'paid', label: 'Pago' },
  { id: 'payment_required', label: 'A pagar' },
  { id: 'confirmed', label: 'Confirmado' },
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
  ready_to_ship: { t: 'A despachar', c: 'var(--accent)' },
  shipped: { t: 'Despachado', c: 'var(--ok)' },
  delivered: { t: 'Entregue', c: 'var(--ok)' },
  not_delivered: { t: 'Não entregue', c: 'var(--danger)' },
  returned: { t: 'Devolvido', c: 'var(--danger)' },
  cancelled: { t: 'Cancelado', c: 'var(--danger)' },
}
const SUBSTATUS_LABEL = {
  ready_to_print: 'Etiqueta a imprimir',
  printed: 'Etiqueta impressa',
  ready_to_ship: 'Pronto p/ despachar',
  in_packing_list: 'Em separação',
  invoice_pending: 'Nota fiscal pendente',
  picked_up: 'Coletado',
  dropped_off: 'Postado',
  in_hub: 'No centro de distribuição',
  in_transit: 'Em trânsito',
  out_for_delivery: 'Saiu para entrega',
  delivery_failed: 'Tentativa de entrega falhou',
  receiver_absent: 'Destinatário ausente',
  waiting_for_withdrawal: 'Aguardando retirada',
  delivered: 'Entregue',
  not_delivered: 'Não entregue',
  returning_to_sender: 'Retornando ao remetente',
  shipped: 'Despachado',
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
// Prazo de despacho → texto curto + tom (atrasado / hoje / data)
function prazoInfo(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d)) return null
  const agora = new Date()
  const fimHoje = new Date(); fimHoje.setHours(23, 59, 59, 999)
  if (d < agora) return { texto: 'atrasado', tom: 'var(--danger)', forte: true }
  if (d <= fimHoje) return { texto: `hoje ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, tom: 'var(--warn)', forte: true }
  return { texto: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), tom: 'var(--dim)' }
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
function modoEnvio(env) {
  const lt = (env && env.logistic_type) || ''
  return lt === 'fulfillment' ? 'Full · o ML expede'
    : lt === 'cross_docking' ? 'Mercado Envios · Coleta'
      : lt === 'self_service' ? 'Flex · você entrega'
        : (lt === 'xd_drop_off' || lt === 'drop_off') ? 'Mercado Envios · Agência'
          : (env && env.mode ? 'Mercado Envios' : '')
}

/* ------------------------- Impressão própria do ML ------------------------- */
const LS_REM = 'ml_pedidos_remetente'
function lerRemetente() {
  try { return JSON.parse(localStorage.getItem(LS_REM) || '{}') || {} } catch { return {} }
}
function salvarRemetente(r) {
  try { localStorage.setItem(LS_REM, JSON.stringify(r || {})) } catch (_) { /* ignore */ }
}
const PRINT_CSS = `
* { box-sizing: border-box; }
body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111; margin: 0; padding: 18px; font-size: 12px; }
.folha { max-width: 760px; margin: 0 auto 22px; page-break-after: always; }
.folha:last-child { page-break-after: auto; }
.fh { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 12px; }
.tt { font-size: 17px; font-weight: 800; }
.mut { color: #666; font-size: 11px; }
.rem { text-align: right; font-size: 11px; line-height: 1.35; }
table { width: 100%; border-collapse: collapse; }
.it { margin-bottom: 14px; }
.it th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #555; border-bottom: 1px solid #bbb; padding: 5px 6px; }
.it td { padding: 6px; border-bottom: 1px solid #eee; vertical-align: top; }
.c { text-align: center; width: 48px; }
.r { text-align: right; white-space: nowrap; }
.m { font-family: ui-monospace, Menlo, Consolas, monospace; color: #444; font-size: 11px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.box { border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; }
.bt { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #666; font-weight: 700; margin-bottom: 6px; }
.b { font-size: 13px; }
.fin td { padding: 3px 0; }
.fin .tot td { border-top: 1px solid #bbb; font-weight: 800; padding-top: 6px; }
.sep .chk { width: 44px; }
.chk { text-align: center; }
td.chk:after { content: ''; display: inline-block; width: 16px; height: 16px; border: 1.5px solid #999; border-radius: 4px; }
.qbox { display: inline-grid; place-items: center; min-width: 26px; height: 24px; padding: 0 6px; background: #111; color: #fff; border-radius: 6px; font-weight: 800; }
@media print { body { padding: 0; } .box { break-inside: avoid; } }
`
function abrirImpressao(titulo, corpo) {
  const win = window.open('', '_blank')
  if (!win) { alert('Habilite os pop-ups deste site para imprimir.'); return }
  win.document.open()
  win.document.write(
    '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>' + esc(titulo) + '</title><style>' + PRINT_CSS + '</style></head><body>' +
    corpo + '<scr' + 'ipt>window.onload=function(){setTimeout(function(){window.print()},250)}</scr' + 'ipt></body></html>'
  )
  win.document.close()
}
function htmlFolhaML(p, dest, rem) {
  const r = p.resumo || {}
  const itens = (p.itens || []).map((it) =>
    `<tr><td class="c">${it.quantidade}</td><td>${esc(it.titulo)}</td><td class="m">${esc(it.sku || '—')}</td><td class="r">${brl(it.unit_price)}</td></tr>`
  ).join('')
  const entrega = dest
    ? `<div class="b"><b>${esc(dest.nome || '—')}</b></div>` +
      (dest.linha ? `<div>${esc(dest.linha)}${dest.compl ? ' — ' + esc(dest.compl) : ''}</div>` : '') +
      (dest.bairro ? `<div>${esc(dest.bairro)}</div>` : '') +
      `<div>${esc([dest.cidade, dest.estado].filter(Boolean).join(' · '))}${dest.cep ? ' · CEP ' + esc(dest.cep) : ''}</div>`
    : `<div class="mut">O endereço completo do comprador sai na etiqueta oficial do Mercado Livre.</div>`
  return (
    `<section class="folha"><header class="fh">` +
      `<div><div class="tt">Pedido #${esc(p.id)}</div><div class="mut">${esc(dataHora(p.date_created))}</div></div>` +
      `<div class="rem"><div><b>${esc(rem.nome || 'Remetente')}</b></div>` +
        (rem.cnpj ? `<div class="mut">${esc(rem.cnpj)}</div>` : '') +
        (rem.endereco ? `<div class="mut">${esc(rem.endereco)}</div>` : '') +
        (rem.telefone ? `<div class="mut">${esc(rem.telefone)}</div>` : '') +
      `</div></header>` +
      `<table class="it"><thead><tr><th class="c">Qtd</th><th>Produto</th><th class="m">SKU</th><th class="r">Unit.</th></tr></thead><tbody>${itens}</tbody></table>` +
      `<div class="grid2"><div class="box"><div class="bt">Entrega</div>${entrega}</div>` +
        `<div class="box"><div class="bt">Financeiro</div><table class="fin">` +
          `<tr><td>Vendido</td><td class="r">${brl(r.receita)}</td></tr>` +
          `<tr><td>Tarifa ML</td><td class="r">−${brl(r.tarifa)}</td></tr>` +
          `<tr><td>Custo</td><td class="r">${r.custo ? '−' + brl(r.custo) : '—'}</td></tr>` +
          `<tr class="tot"><td>Líquido</td><td class="r">${brl(r.liquido)}${r.margem != null ? ' (' + r.margem.toFixed(0) + '%)' : ''}</td></tr>` +
        `</table></div></div></section>`
  )
}
function htmlSeparacaoML(pedidos, rem) {
  const mapa = new Map()
  ;(pedidos || []).forEach((p) => (p.itens || []).forEach((it) => {
    const chave = (it.titulo || 'Item') + '||' + (it.sku || '')
    const cur = mapa.get(chave) || { titulo: it.titulo || 'Item', sku: it.sku || '', qtd: 0 }
    cur.qtd += it.quantidade || 0
    mapa.set(chave, cur)
  }))
  const linhas = [...mapa.values()].sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
  const totalUn = linhas.reduce((s, l) => s + l.qtd, 0)
  const corpo = linhas.map((l) =>
    `<tr><td class="c"><span class="qbox">${l.qtd}</span></td><td>${esc(l.titulo)}</td><td class="m">${esc(l.sku || '—')}</td><td class="chk"></td></tr>`
  ).join('')
  return (
    `<section class="folha"><header class="fh">` +
      `<div><div class="tt">Lista de separação</div><div class="mut">${(pedidos || []).length} pedido(s) · ${totalUn} unidade(s)</div></div>` +
      `<div class="rem"><div><b>${esc(rem.nome || 'Sóstrass')}</b></div><div class="mut">${esc(new Date().toLocaleString('pt-BR'))}</div></div>` +
      `</header><table class="it sep"><thead><tr><th class="c">Qtd</th><th>Produto</th><th class="m">SKU</th><th class="chk">✓</th></tr></thead><tbody>${corpo}</tbody></table></section>`
  )
}

function janelaPaginas(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out = [1]
  let ini = Math.max(2, page - 1), fim = Math.min(total - 1, page + 1)
  if (page <= 3) { ini = 2; fim = 4 }
  if (page >= total - 2) { ini = total - 3; fim = total - 1 }
  if (ini > 2) out.push('…')
  for (let i = ini; i <= fim; i++) out.push(i)
  if (fim < total - 1) out.push('…')
  out.push(total)
  return out
}
function Paginacao({ page, total, onIr }) {
  if (!total || total <= 1) return null
  const cls = 'min-w-[34px] h-[34px] px-2 rounded-lg text-xs font-medium num grid place-items-center transition-colors disabled:opacity-35 disabled:cursor-default'
  const off = { background: 'var(--glass-bg)', color: 'var(--dim)', border: '1px solid var(--glass-border)' }
  const on = { background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' }
  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap">
      <button onClick={() => onIr(page - 1)} disabled={page <= 1} className={cls} style={off} aria-label="Anterior"><ChevronLeft size={15} /></button>
      {janelaPaginas(page, total).map((p, i) => p === '…'
        ? <span key={'e' + i} className="px-1 text-faint text-xs select-none">…</span>
        : <button key={p} onClick={() => onIr(p)} aria-current={p === page ? 'page' : undefined} className={cls} style={p === page ? on : off}>{p}</button>)}
      <button onClick={() => onIr(page + 1)} disabled={page >= total} className={cls} style={off} aria-label="Próxima"><ChevronRight size={15} /></button>
    </div>
  )
}

/* =========================================================================== */
export default function Pedidos() {
  const notify = useToast()
  const [conn, setConn] = useState(null)
  const [periodo, setPeriodo] = useState(15)
  const [envioTab, setEnvioTab] = useState('hoje')
  const [pgto, setPgto] = useState('todos')
  const [flagFiscal, setFlagFiscal] = useState(false)
  const [flagDevol, setFlagDevol] = useState(false)
  const [escopo, setEscopo] = useState('tudo')
  const [busca, setBusca] = useState('')
  const [pedidos, setPedidos] = useState(null)
  const [sstats, setSstats] = useState(null)
  const [paging, setPaging] = useState({ total: 0, carregados: 0 })
  const [page, setPage] = useState(1)
  const [ativo, setAtivo] = useState(null)
  const [sel, setSel] = useState(() => new Set())
  const [envios, setEnvios] = useState({})
  const [baixando, setBaixando] = useState('')
  const [imprimindo, setImprimindo] = useState('')
  const [personalizar, setPersonalizar] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const rodadasRef = useRef(0)

  const checar = useCallback(() => {
    api.mlConta().then((d) => setConn(d?.conta ? d : { conta: false })).catch(() => setConn({ conta: false }))
  }, [])
  useEffect(() => { checar() }, [checar])

  const desdeISO = useCallback(() => { const d = new Date(); d.setDate(d.getDate() - periodo); return d.toISOString() }, [periodo])

  // Busca TODOS os pedidos do período (status=''); baldes/estado do envio vêm
  // prontos do backend (cache alimentado por webhooks + backfill).
  const carregar = useCallback(async () => {
    setPedidos(null); setSel(new Set()); setAtivo(null); setPage(1)
    try {
      const d = await api.mlPedidosEnriquecido('', 0, 500, desdeISO())
      const arr = d.pedidos || []
      setPedidos(arr)
      setSstats(d.stats || null)
      setPaging(d.paging || { total: arr.length, carregados: arr.length })
    } catch (e) {
      notify(e.message, 'danger'); setPedidos([]); setSstats(null)
    }
  }, [desdeISO, notify])

  useEffect(() => { if (conn?.conta) carregar() }, [conn?.conta, carregar])
  useEffect(() => { rodadasRef.current = 0 }, [periodo])
  useEffect(() => { setPage(1) }, [busca, escopo, envioTab, pgto, flagFiscal, flagDevol])

  // Aquece o cache de envios progressivamente (sem travar a lista); webhooks fazem o resto.
  const backfill = useCallback(async (auto) => {
    const ids = (pedidos || []).filter((p) => !p.envio && p.shipping_id).map((p) => String(p.shipping_id))
    if (!ids.length) return
    setSincronizando(true)
    try { await api.mlEnviosSincronizar(ids.slice(0, 60), 60); if (auto) rodadasRef.current += 1; await carregar() }
    catch (_) { /* silencioso */ }
    setSincronizando(false)
  }, [pedidos, carregar])

  useEffect(() => {
    if (!pedidos || !sstats) return
    if ((sstats.sincronizando || 0) <= 0) return
    if (rodadasRef.current >= 6 || sincronizando) return
    const t = setTimeout(() => backfill(true), 150)
    return () => clearTimeout(t)
  }, [pedidos, sstats, sincronizando, backfill])

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
  const baixarEtiqueta = async (sid) => {
    if (!sid) return
    setBaixando(String(sid))
    try {
      const url = await api.mlEtiqueta(sid, 'pdf'); window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (e) { notify('Etiqueta indisponível: ' + (e.message || '') + ' — envios Full são etiquetados pelo próprio ML.', 'danger') }
    setBaixando('')
  }

  const contagens = useMemo(() => {
    const b = (sstats && sstats.baldes) || {}
    return { todos: (pedidos || []).length, hoje: b.hoje || 0, proximos: b.proximos || 0, transito: b.transito || 0, finalizado: b.finalizado || 0, cancelado: b.cancelado || 0 }
  }, [sstats, pedidos])
  const nSync = (sstats && sstats.sincronizando) || 0
  const nFiscal = (sstats && sstats.fiscal_pendentes) || 0
  const nDevol = (sstats && sstats.devolucoes) || 0

  const naAba = useMemo(() => (pedidos || []).filter((p) => envioTab === 'todos' || p.balde === envioTab), [pedidos, envioTab])
  const contPgto = useMemo(() => {
    const c = { todos: naAba.length, paid: 0, payment_required: 0, confirmed: 0 }
    naAba.forEach((p) => { if (c[p.status] != null) c[p.status] += 1 })
    return c
  }, [naAba])

  const filtrada = useMemo(() => naAba.filter((p) => {
    if (pgto !== 'todos' && p.status !== pgto) return false
    if (flagFiscal && !(p.envio && p.envio.fiscal_pendente)) return false
    if (flagDevol && !(p.envio && p.envio.devolucao)) return false
    if (!busca.trim()) return true
    const t = busca.toLowerCase()
    const id = String(p.id).toLowerCase()
    const comp = (p.buyer?.nickname || '').toLowerCase()
    const prod = (p.itens || []).map((it) => (it.titulo || '') + ' ' + (it.sku || '')).join(' ').toLowerCase()
    const trk = (p.envio && p.envio.tracking_number ? String(p.envio.tracking_number) : '').toLowerCase()
    if (escopo === 'pedido') return id.includes(t) || trk.includes(t)
    if (escopo === 'comprador') return comp.includes(t)
    if (escopo === 'produto') return prod.includes(t)
    return id.includes(t) || comp.includes(t) || prod.includes(t) || trk.includes(t)
  }), [naAba, pgto, flagFiscal, flagDevol, busca, escopo])

  const paginas = Math.max(1, Math.ceil(filtrada.length / PAGE_SIZE))
  const pageSafe = Math.min(page, paginas)
  const paginaItens = useMemo(() => filtrada.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE), [filtrada, pageSafe])

  const selecionaveis = useMemo(() => filtrada.filter((p) => p.shipping_id), [filtrada])
  const todosSel = selecionaveis.length > 0 && selecionaveis.every((p) => sel.has(p.id))
  const toggleTodos = () => setSel(() => (todosSel ? new Set() : new Set(selecionaveis.map((p) => p.id))))
  const toggleSel = (id) => setSel((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const pedidosSel = useMemo(() => (pedidos || []).filter((p) => sel.has(p.id)), [pedidos, sel])
  const alvoImpressao = useCallback(() => (sel.size ? pedidosSel : paginaItens), [sel.size, pedidosSel, paginaItens])
  const alvoEtiqueta = useMemo(() => (sel.size ? pedidosSel : paginaItens).filter((p) => p.shipping_id), [sel.size, pedidosSel, paginaItens])

  const kpi = useMemo(() => {
    let receita = 0, tarifas = 0, frete = 0, custo = 0, liquido = 0, unidades = 0, full = 0
    const porDia = {}
    filtrada.forEach((p) => {
      const r = p.resumo || {}
      receita += r.receita || 0; tarifas += r.tarifa || 0; frete += r.frete_vendedor || 0
      custo += r.custo || 0; liquido += r.liquido || 0; unidades += r.unidades || 0
      if (p.is_full) full += 1
      const dia = (p.date_created || '').slice(0, 10)
      if (dia) porDia[dia] = (porDia[dia] || 0) + (r.receita || 0)
    })
    const n = filtrada.length
    const dias = Object.entries(porDia).sort((a, b) => a[0].localeCompare(b[0])).slice(-14)
    return { n, receita, tarifas, frete, custosML: tarifas + frete, custo, liquido, unidades, full, ticket: n ? receita / n : 0, margem: receita > 0 ? liquido / receita * 100 : null, dias }
  }, [filtrada])

  const ativoPedido = useMemo(() => (pedidos || []).find((p) => p.id === ativo) || null, [pedidos, ativo])

  const imprimirSeparacao = () => {
    const alvo = alvoImpressao()
    if (!alvo.length) { notify('Nenhum pedido para separar.', 'warn'); return }
    abrirImpressao('Lista de separação', htmlSeparacaoML(alvo, lerRemetente()))
  }
  const montarFolhas = async (alvo) => {
    const rem = lerRemetente()
    const partes = await Promise.all(alvo.map(async (p) => {
      let env = p.shipping_id ? envios[p.shipping_id] : null
      if (p.shipping_id && (!env || env === 'loading' || env === 'erro')) {
        try { env = await api.mlEnvio(p.shipping_id) } catch { env = null }
      }
      const dest = env && env !== 'loading' && env !== 'erro' ? extrairDestino(env)
        : (p.envio && p.envio.receiver_nome ? { nome: p.envio.receiver_nome, linha: p.envio.receiver_endereco, cidade: p.envio.receiver_cidade, estado: p.envio.receiver_estado, cep: p.envio.receiver_cep } : null)
      return htmlFolhaML(p, dest, rem)
    }))
    return partes.join('')
  }
  const imprimirPedidos = async () => {
    const alvo = alvoImpressao()
    if (!alvo.length) { notify('Nenhum pedido para imprimir.', 'warn'); return }
    setImprimindo('folha')
    try { abrirImpressao('Pedidos', await montarFolhas(alvo)) } catch (e) { notify('Não consegui montar as folhas: ' + (e.message || ''), 'danger') }
    setImprimindo('')
  }
  const imprimirUm = async (p) => {
    setImprimindo('um')
    try { abrirImpressao('Pedido #' + p.id, await montarFolhas([p])) } catch (e) { notify('Não consegui montar a folha: ' + (e.message || ''), 'danger') }
    setImprimindo('')
  }
  const imprimirEtiquetas = async () => {
    const ids = alvoEtiqueta.map((p) => p.shipping_id)
    if (!ids.length) { notify('Nenhum pedido com envio para etiquetar.', 'warn'); return }
    setImprimindo('etiq')
    try {
      const url = await api.mlEtiqueta(ids.join(','), 'pdf'); window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (e) { notify('Etiquetas indisponíveis: ' + (e.message || '') + ' — pedidos Full são etiquetados pelo ML.', 'danger') }
    setImprimindo('')
  }

  const btnTxt = 'text-xs px-2.5 py-1.5 rounded-lg glass text-dim hover:text-fg flex items-center gap-1.5 disabled:opacity-40'
  const semPedidos = !pedidos || !pedidos.length
  const abaAtual = ENVIO_TABS.find((t) => t.id === envioTab)?.label || 'Todos'

  if (conn && !conn.conta) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <div className="max-w-lg mx-auto">
          <div className="h-12 w-12 rounded-2xl grid place-items-center mx-auto mb-4" style={{ background: 'rgba(242,194,0,.16)', color: ML }}><Plug size={22} /></div>
          <div className="font-display font-semibold text-lg">Conecte o Mercado Livre</div>
          <p className="text-sm text-dim mt-2">Os pedidos, com resultado por venda, endereço real, status de envio e etiqueta oficial, aparecem aqui assim que você conectar a conta.</p>
          <button onClick={checar} className="glass rounded-xl px-4 py-2 text-sm text-dim hover:text-fg inline-flex items-center gap-2 mt-4"><RefreshCw size={15} /> Já conectei</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="glass rounded-2xl p-4">
        <div className={!ativoPedido ? 'sticky top-0 z-20 -mx-4 px-4 pt-1 pb-3' : 'pb-3'} style={!ativoPedido ? { background: 'var(--surface)' } : undefined}>
          <div className="flex items-start gap-2.5 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-accent" />
                <span className="font-display font-semibold text-base">Central de pedidos</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(242,194,0,.18)', color: ML }}>Mercado Livre</span>
              </div>
              <div className="text-[11.5px] text-dim mt-0.5">Cockpit em tempo real — envio, prazo de coleta, rastreio, tarifa, custo e margem, com endereço real e etiqueta oficial.</div>
            </div>
            <div className="ml-auto flex items-center gap-1.5 flex-wrap">
              <button onClick={() => setPersonalizar(true)} className={btnTxt} title="Dados do remetente que saem na impressão"><SlidersHorizontal size={13} /> Personalizar</button>
              <button onClick={imprimirSeparacao} disabled={!!imprimindo || semPedidos} className={btnTxt} title="Lista de separação (produtos A→Z somando quantidades)"><ClipboardList size={13} /> Separação</button>
              <button onClick={imprimirPedidos} disabled={!!imprimindo || semPedidos} className={btnTxt} title="Folha por pedido">
                {imprimindo === 'folha' ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />} Imprimir
              </button>
              <button onClick={imprimirEtiquetas} disabled={!!imprimindo || !alvoEtiqueta.length}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-40"
                style={{ background: ML, color: '#3a2c00' }} title="Etiqueta oficial do ML (PDF, até 50 por vez)">
                {imprimindo === 'etiq' ? <Loader2 size={13} className="animate-spin" /> : <Tag size={13} />} Etiquetas em lote{alvoEtiqueta.length ? ` (${alvoEtiqueta.length})` : ''}
              </button>
              <a href="https://www.mercadolivre.com.br/vendas" target="_blank" rel="noreferrer" className={btnTxt} title="Abrir Vendas/Full no ML"><Truck size={13} /> Envios / Full</a>
              <button disabled className={btnTxt + ' cursor-default'} title="Em breve: NF-e via Bling"><FileText size={13} /> NF-e <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ background: 'var(--glass-hover)', color: 'var(--faint)' }}>em breve</span></button>
            </div>
          </div>

          {/* Baldes reais do envio + período */}
          <div className="flex items-center gap-2 flex-wrap mt-3">
            <span className="text-[10px] uppercase tracking-wide text-faint font-bold">Meus pedidos</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {ENVIO_TABS.map((f) => {
                const on = envioTab === f.id
                const Icon = f.icon
                return (
                  <button key={f.id} onClick={() => setEnvioTab(f.id)} className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all inline-flex items-center gap-1.5"
                    style={on ? { background: 'var(--accent)', color: '#fff' } : { border: '1px solid var(--glass-border)', color: 'var(--dim)' }}>
                    <Icon size={12} /> {f.label}
                    <span className="text-[10px] font-bold px-1.5 rounded-full num" style={{ background: on ? 'rgba(255,255,255,.22)' : 'var(--glass-hover)', color: on ? '#fff' : 'var(--faint)' }}>{contagens[f.id] ?? 0}</span>
                  </button>
                )
              })}
            </div>
            <div className="ml-auto inline-flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
              {PERIODOS.map((p) => (
                <button key={p.id} onClick={() => setPeriodo(p.id)} className="text-[11px] font-bold px-3 py-1.5"
                  style={periodo === p.id ? { background: 'var(--accent)', color: '#fff' } : { background: 'transparent', color: 'var(--faint)' }}>{p.label}</button>
              ))}
            </div>
          </div>

          {/* Pagamento + alertas (fiscal / devolução) */}
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <span className="text-[10px] uppercase tracking-wide text-faint font-bold">Pagamento</span>
            {PGTO_CHIPS.map((c) => {
              const on = pgto === c.id
              return (
                <button key={c.id} onClick={() => setPgto(c.id)} className="text-[11px] font-medium px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5"
                  style={on ? { background: 'rgba(214,0,127,.14)', color: 'var(--accent)' } : { background: 'rgba(255,255,255,.04)', color: 'var(--dim)' }}>
                  {c.label}<span className="num text-faint">{c.id === 'todos' ? contPgto.todos : (contPgto[c.id] ?? 0)}</span>
                </button>
              )
            })}
            <button onClick={() => setFlagFiscal((v) => !v)} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 ml-1"
              style={flagFiscal ? { background: 'rgba(255,122,122,.16)', color: 'var(--danger)', border: '1px solid var(--danger)' } : { border: '1px solid var(--glass-border)', color: nFiscal ? 'var(--danger)' : 'var(--faint)' }} title="Pedidos sem dados fiscais (bloqueiam NF-e/despacho)">
              <AlertTriangle size={12} /> Sem dados fiscais <span className="num">{nFiscal}</span>
            </button>
            <button onClick={() => setFlagDevol((v) => !v)} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5"
              style={flagDevol ? { background: 'rgba(224,162,60,.16)', color: 'var(--warn)', border: '1px solid var(--warn)' } : { border: '1px solid var(--glass-border)', color: nDevol ? 'var(--warn)' : 'var(--faint)' }} title="Devoluções / pós-venda">
              <Undo2 size={12} /> Devoluções <span className="num">{nDevol}</span>
            </button>
          </div>
        </div>

        {pedidos === null ? (
          <div className="text-dim text-sm flex items-center gap-2 p-4"><Loader2 size={16} className="animate-spin" /> Carregando o período…</div>
        ) : (
          <>
            {nSync > 0 && (
              <div className="rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap mt-3 mb-1" style={{ background: 'rgba(242,194,0,.08)', border: '1px solid rgba(242,194,0,.3)' }}>
                {sincronizando ? <Loader2 size={14} className="animate-spin" style={{ color: ML }} /> : <RotateCcw size={14} style={{ color: ML }} />}
                <span className="text-[12px] text-dim flex-1">Sincronizando o estado de envio de <b className="num">{nSync}</b> pedido(s) com o Mercado Livre. Os baldes se ajustam conforme carrega — em tempo real depois disso.</span>
                {rodadasRef.current >= 6 && !sincronizando && (
                  <button onClick={() => { rodadasRef.current = 0; backfill(false) }} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg" style={{ background: ML, color: '#3a2c00' }}>Sincronizar mais</button>
                )}
              </div>
            )}

            {flagDevol ? (
              <PosVenda onFechar={() => setFlagDevol(false)} />
            ) : (
            <>
            <Estatisticas s={kpi} aba={abaAtual} />

            <div className="glass rounded-xl px-3 py-2 flex items-center gap-2 flex-wrap mt-3 mb-2.5">
              <Search size={14} className="text-faint" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por pedido, comprador, produto, rastreio…" className="bg-transparent outline-none text-sm flex-1 min-w-[140px] text-fg placeholder:text-faint" />
              <Filter size={13} className="text-faint" />
              {ESCOPOS.map((e) => (
                <button key={e.id} onClick={() => setEscopo(e.id)} className="text-[11px] font-medium px-2.5 py-1 rounded-lg"
                  style={escopo === e.id ? { background: 'rgba(214,0,127,.14)', color: 'var(--accent)' } : { background: 'rgba(255,255,255,.04)', color: 'var(--dim)' }}>{e.label}</button>
              ))}
              <button onClick={carregar} className="text-dim hover:text-fg ml-1" title="Atualizar"><RefreshCw size={15} /></button>
            </div>

            {selecionaveis.length > 0 && (
              <div className="rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap mb-3" style={{ border: '1px solid var(--glass-border)' }}>
                <button onClick={toggleTodos} className="text-[11px] px-2.5 py-1.5 rounded-lg glass text-dim hover:text-fg inline-flex items-center gap-1.5">
                  {todosSel ? <><X size={12} /> Limpar seleção</> : <><CheckCheck size={12} /> Selecionar todos ({selecionaveis.length})</>}
                </button>
                {sel.size > 0
                  ? <span className="text-[12px] text-dim">{sel.size} selecionado(s) · Separação, Imprimir e Etiquetas agem sobre a seleção.</span>
                  : <span className="text-[12px] text-faint">Sem seleção, as ações valem para os {paginaItens.length} pedidos desta página.</span>}
              </div>
            )}

            {filtrada.length === 0 ? (
              <div className="glass rounded-2xl p-10 text-center mt-1">
                <CheckCircle2 size={28} className="mx-auto mb-3" style={{ color: 'var(--ok)' }} />
                <div className="font-medium">Nada em «{abaAtual}»{flagFiscal ? ' sem dados fiscais' : ''}{flagDevol ? ' com devolução' : ''}</div>
                <div className="text-sm text-dim mt-1">{nSync > 0 ? 'Alguns envios ainda estão sincronizando.' : 'Ajuste o balde, o pagamento, o período ou a busca.'}</div>
              </div>
            ) : (
              <div className={ativoPedido ? 'grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(380px,470px)] gap-4 items-start' : ''}>
                <div>
                  {paginas > 1 && <div className="mb-3"><Paginacao page={pageSafe} total={paginas} onIr={setPage} /></div>}
                  <div className="space-y-2.5">
                    {paginaItens.map((p) => (
                      <Card key={p.id} p={p} ativo={ativo === p.id} sel={sel.has(p.id)}
                        onOpen={() => abrir(p)} onToggleSel={() => toggleSel(p.id)} />
                    ))}
                  </div>
                  {paginas > 1 && <div className="mt-4"><Paginacao page={pageSafe} total={paginas} onIr={setPage} /></div>}
                  <div className="text-[11px] text-faint text-center mt-3">
                    {(pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(pageSafe * PAGE_SIZE, filtrada.length)} de {filtrada.length} em «{abaAtual}» · período de {periodo}d, {paging.carregados ?? (pedidos || []).length} pedidos carregados
                    {(paging.total ?? 0) > (paging.carregados ?? 0) ? ` (de ${paging.total} — mais recentes)` : ''}
                  </div>
                </div>

                {ativoPedido && (
                  <div className="xl:sticky xl:top-2">
                    <Drawer p={ativoPedido} envio={ativoPedido.shipping_id ? envios[ativoPedido.shipping_id] : null}
                      baixando={baixando === String(ativoPedido.shipping_id)} imprimindo={imprimindo === 'um'}
                      onEtiqueta={() => baixarEtiqueta(ativoPedido.shipping_id)} onImprimir={() => imprimirUm(ativoPedido)}
                      onClose={() => setAtivo(null)} />
                  </div>
                )}
              </div>
            )}

            <div className="text-[10.5px] text-faint mt-4 leading-relaxed border-t pt-3" style={{ borderColor: 'var(--glass-border)' }}>
              Os baldes seguem o <b>estado real do envio</b> (substatus e prazo de coleta), como na tela Vendas do ML — mantidos vivos pelos webhooks. "A despachar hoje" = coleta hoje/atrasada; "Próximos dias" = coleta agendada à frente. Tarifa, custo e margem por venda; endereço real e etiqueta oficial do ML. NF-e via Bling entra em seguida. Etiqueta de pedido <b>Full</b> é emitida pelo próprio Mercado Livre.
            </div>
            </>
            )}
          </>
        )}
      </div>

      {personalizar && createPortal(<PersonalizarModal onClose={() => setPersonalizar(false)} />, document.body)}
    </>
  )
}

/* =========================================================================== */
function Kpi({ label, valor, sub, cor, icon, destaque }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: destaque ? 'rgba(47,217,141,.07)' : 'var(--surface)', border: `1px solid ${destaque ? 'rgba(47,217,141,.3)' : 'var(--glass-border)'}` }}>
      <div className="text-[9px] uppercase tracking-wide text-faint font-bold flex items-center gap-1.5">{icon}{label}</div>
      <div className="num font-bold text-lg leading-tight mt-0.5" style={cor ? { color: cor } : undefined}>{valor}</div>
      {sub && <div className="text-[10px]" style={cor ? { color: cor } : { color: 'var(--faint)' }}>{sub}</div>}
    </div>
  )
}
function Estatisticas({ s, aba }) {
  const maxDia = Math.max(1, ...s.dias.map((d) => d[1]))
  const diaLabel = (iso) => { const d = new Date(iso + 'T12:00:00'); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <Kpi label={`Pedidos · ${aba}`} icon={<Package size={11} />} valor={s.n.toLocaleString('pt-BR')} sub={`${s.unidades} un.`} />
        <Kpi label="Receita" icon={<Wallet size={11} />} valor={brl0(s.receita)} sub="na aba" />
        <Kpi label="Ticket médio" icon={<DollarSign size={11} />} valor={brl(s.ticket)} sub="por pedido" />
        <Kpi label="Custos ML" icon={<Tag size={11} />} valor={'−' + brl0(s.custosML)} cor="var(--warn)" sub={s.frete > 0 ? `comissão ${brl0(s.tarifas)} + frete ${brl0(s.frete)}` : (s.receita > 0 ? `${Math.round(s.tarifas / s.receita * 100)}% da receita` : null)} />
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
          <div className="text-[9px] uppercase tracking-wide text-faint font-bold mb-2">Resumo · «{aba}»</div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2"><Package size={11} className="text-faint" /><span className="flex-1 text-dim">Pedidos</span><span className="num font-bold">{s.n}</span></div>
            <div className="flex items-center gap-2"><Boxes size={11} className="text-faint" /><span className="flex-1 text-dim">Unidades</span><span className="num font-bold">{s.unidades}</span></div>
            <div className="flex items-center gap-2"><Truck size={11} style={{ color: ML }} /><span className="flex-1 text-dim">Full (ML expede)</span><span className="num font-bold">{s.full}</span></div>
            <div className="flex items-center gap-2"><TrendingUp size={11} className="text-faint" /><span className="flex-1 text-dim">Margem média</span><span className="num font-bold" style={{ color: 'var(--ok)' }}>{s.margem != null ? `${s.margem.toFixed(0)}%` : '—'}</span></div>
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
  const env = p.envio || null
  const stEnv = env && env.status ? (ST_ENVIO[env.status] || { t: env.status, c: 'var(--dim)' }) : null
  const subLabel = env && env.substatus ? (SUBSTATUS_LABEL[env.substatus] || null) : null
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
  const prazo = env && (p.balde === 'hoje' || p.balde === 'proximos') ? prazoInfo(env.handling_limit) : null

  return (
    <div className="glass rounded-2xl p-3" style={(sel || ativo) ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 1px rgba(214,0,127,.3)' } : (env && env.fiscal_pendente ? { borderColor: 'var(--danger)' } : undefined)}>
      <div className="flex items-start gap-3">
        <button onClick={onToggleSel} disabled={!podeSelecionar} title={podeSelecionar ? 'Selecionar' : 'Sem envio'}
          className="shrink-0 mt-0.5 grid place-items-center" style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--faint)'}`, background: sel ? 'var(--accent)' : 'transparent', color: sel ? '#fff' : 'transparent', opacity: podeSelecionar ? 1 : 0.3, cursor: podeSelecionar ? 'pointer' : 'not-allowed' }}>
          <Check size={12} />
        </button>
        <button onClick={onOpen} className="rounded-lg overflow-hidden shrink-0 grid place-items-center" style={{ width: 52, height: 52, background: 'var(--glass-hover)', color: 'var(--faint)' }}>
          {principal.imagem && !imgErro ? <img src={principal.imagem} alt="" className="h-full w-full object-cover" onError={() => setImgErro(true)} /> : <Package size={20} />}
        </button>
        <button onClick={onOpen} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate max-w-full">{principal.titulo || 'Pedido'}{extras > 0 ? <span className="text-faint font-normal"> +{extras} item(s)</span> : ''}</span>
            {principal.quantidade > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(214,0,127,.14)', color: 'var(--accent)' }}>{principal.quantidade} un.</span>}
            {p.is_full && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1" style={{ background: 'rgba(242,194,0,.18)', color: ML }}><Truck size={9} /> Full</span>}
            {novo && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1" style={{ background: 'rgba(47,217,141,.14)', color: 'var(--ok)' }}><Zap size={9} /> novo</span>}
          </div>
          <div className="text-[11px] text-faint num mt-0.5">#{p.id} · {dataBR(p.date_created)}{principal.sku ? ` · ${principal.sku}` : ''}</div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: 'rgba(0,0,0,.2)', color: 'var(--dim)' }}><User size={10} /> {p.buyer?.nickname || 'comprador'}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--glass-hover)', color: st.c }}>{st.t}</span>
            {stEnv && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: 'var(--glass-hover)', color: stEnv.c }}><Truck size={10} /> {stEnv.t}</span>}
            {subLabel && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,.2)', color: 'var(--faint)' }}>{subLabel}</span>}
            {prazo && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: 'var(--glass-hover)', color: prazo.tom }}><CalendarClock size={10} /> Despachar: {prazo.texto}</span>}
            {env && env.tracking_number && p.balde === 'transito' && <span className="text-[10px] num px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: 'rgba(0,0,0,.2)', color: 'var(--dim)' }}><MapPinned size={10} /> {env.tracking_number}</span>}
            {env && env.fiscal_pendente && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: 'rgba(255,122,122,.16)', color: 'var(--danger)' }}><AlertTriangle size={10} /> Sem dados fiscais</span>}
            {env && env.devolucao && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: 'rgba(224,162,60,.16)', color: 'var(--warn)' }}><Undo2 size={10} /> Devolução</span>}
            {!env && p.balde === 'sincronizando' && <span className="text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: 'var(--glass-hover)', color: 'var(--faint)' }}><Loader2 size={10} className="animate-spin" /> sincronizando</span>}
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
        <Cell label="Tarifa ML" valor={(r.tarifa_total != null ? r.tarifa_total : r.tarifa) != null ? '−' + brl(r.tarifa_total != null ? r.tarifa_total : r.tarifa) : '—'} sub={r.frete_vendedor ? 'inc. frete' : null} cor="var(--warn)" />
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
  const passos = ['Pedido criado', 'Pagamento aprovado', 'Pronto p/ despachar', 'Despachado', 'Entregue']
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

function Drawer({ p, envio, baixando, imprimindo, onEtiqueta, onImprimir, onClose }) {
  const r = p.resumo || {}
  const st = ST_PEDIDO[p.status] || { t: p.status, c: 'var(--dim)' }
  const itens = p.itens || []
  const inicial = (p.buyer?.nickname || '?').slice(0, 1).toUpperCase()
  const recebe = (r.receita != null && r.tarifa != null) ? r.receita - r.tarifa : null
  const tarifaPct = (r.receita > 0 && r.tarifa != null) ? Math.round(r.tarifa / r.receita * 100) : null
  const cor = moneyCor(r.liquido, r.margem)
  const frete = r.frete_vendedor || 0
  const totalML = r.tarifa_total != null ? r.tarifa_total : ((r.tarifa || 0) + frete)
  const recebeML = (r.receita != null) ? r.receita - totalML : null
  const comPct = r.comissao_pct != null ? r.comissao_pct : tarifaPct
  const [tarifaDet, setTarifaDet] = useState(null)
  const verTarifa = async () => {
    if (tarifaDet) { setTarifaDet(null); return }
    setTarifaDet('loading')
    try { const d = await api.mlTarifaDetalhe(p.id); setTarifaDet(d) } catch { setTarifaDet('erro') }
  }
  const sid = p.shipping_id
  const ec = p.envio || {}
  const full = envio && envio !== 'loading' && envio !== 'erro' ? envio : null
  const dest = full ? extrairDestino(full)
    : (ec.receiver_nome ? { nome: ec.receiver_nome, linha: ec.receiver_endereco, cidade: ec.receiver_cidade, estado: ec.receiver_estado, cep: ec.receiver_cep } : null)
  const shipStatus = ec.status || (full ? full.status : null)
  const stEnv = shipStatus ? (ST_ENVIO[shipStatus] || { t: shipStatus, c: 'var(--dim)' }) : null
  const subLabel = ec.substatus ? (SUBSTATUS_LABEL[ec.substatus] || ec.substatus) : null
  const prazo = prazoInfo(ec.handling_limit)
  const modo = modoEnvio(ec.logistic_type ? ec : full)

  return (
    <div className="glass rounded-2xl overflow-hidden" style={{ borderColor: 'var(--accent)' }}>
      <div className="px-4 py-3 flex items-center gap-2.5" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <span className="grid place-items-center shrink-0" style={{ width: 34, height: 34, borderRadius: 99, background: 'var(--accent2)', color: '#fff', fontWeight: 800, fontSize: 13 }}>{inicial}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{p.buyer?.nickname || 'Comprador'}</div>
          <div className="text-[10px] text-faint num">#{p.id} · <span style={{ color: (stEnv || st).c }}>{stEnv ? stEnv.t : st.t}</span>{p.is_full ? <span style={{ color: ML }}> · Full</span> : ''}</div>
        </div>
        <button onClick={onClose} className="text-faint hover:text-fg"><X size={18} /></button>
      </div>

      <div className="px-4 py-3">
        {ec.fiscal_pendente && (
          <div className="rounded-xl px-3 py-2 mb-3 flex items-start gap-2 text-[11.5px]" style={{ background: 'rgba(255,122,122,.12)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> <span>Este pedido está <b>sem dados fiscais</b>. O ML exige a nota antes de despachar. A emissão via Bling entra em seguida no painel.</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button onClick={onEtiqueta} disabled={!sid || baixando} className="text-[11.5px] font-medium px-2 py-2 rounded-lg text-white inline-flex items-center justify-center gap-1.5 disabled:opacity-50" style={{ background: 'var(--accent)' }}>
            {baixando ? <Loader2 size={13} className="animate-spin" /> : <Tag size={13} />} Baixar etiqueta
          </button>
          <button onClick={onImprimir} disabled={imprimindo} className="text-[11.5px] font-medium px-2 py-2 rounded-lg inline-flex items-center justify-center gap-1.5 disabled:opacity-50" style={{ border: '1px solid var(--glass-border)', color: 'var(--dim)' }}>
            {imprimindo ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />} Imprimir pedido
          </button>
          <button disabled className="text-[11.5px] font-medium px-2 py-2 rounded-lg inline-flex items-center justify-center gap-1.5 opacity-50 cursor-default" style={{ border: '1px solid var(--glass-border)', color: 'var(--faint)' }} title="Em breve: NF-e via Bling">
            <FileText size={13} /> NF-e (Bling)
          </button>
          <a href={`https://www.mercadolivre.com.br/vendas/${p.id}/detalhe`} target="_blank" rel="noreferrer" className="text-[11.5px] font-medium px-2 py-2 rounded-lg inline-flex items-center justify-center gap-1.5" style={{ border: '1px solid var(--glass-border)', color: 'var(--dim)' }}>
            <ExternalLink size={13} /> Abrir no ML
          </a>
        </div>

        <div className="text-[11.5px] space-y-0.5">
          <div className="flex justify-between py-0.5"><span className="text-dim flex items-center gap-1.5"><Clock size={12} /> Criado</span><span className="num font-medium">{dataHora(p.date_created)}</span></div>
          {p.pago_em && <div className="flex justify-between py-0.5"><span className="text-dim flex items-center gap-1.5"><CheckCircle2 size={12} /> Pago</span><span className="num font-medium">{dataHora(p.pago_em)}</span></div>}
          {prazo && <div className="flex justify-between py-0.5"><span className="text-dim flex items-center gap-1.5"><CalendarClock size={12} /> Despachar até</span><span className="num font-medium" style={{ color: prazo.tom }}>{prazo.texto === 'atrasado' ? 'atrasado' : dataHora(ec.handling_limit)}</span></div>}
          {modo && <div className="flex justify-between py-0.5"><span className="text-dim flex items-center gap-1.5"><Boxes size={12} /> Envio</span><span className="font-medium">{modo}</span></div>}
          {subLabel && <div className="flex justify-between py-0.5"><span className="text-dim flex items-center gap-1.5"><Truck size={12} /> Situação</span><span className="font-medium">{subLabel}</span></div>}
          {ec.tracking_number && <div className="flex justify-between py-0.5"><span className="text-dim flex items-center gap-1.5"><MapPinned size={12} /> Rastreio</span><span className="num font-medium">{ec.tracking_number}{ec.tracking_method ? ` · ${ec.tracking_method}` : ''}</span></div>}
          {ec.custo_comprador != null && <div className="flex justify-between py-0.5"><span className="text-dim flex items-center gap-1.5"><Truck size={12} /> Frete (comprador)</span><span className="num font-medium">{brl(ec.custo_comprador)}</span></div>}
        </div>

        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <div className="text-[9.5px] uppercase tracking-wide text-faint font-bold mb-2 flex items-center gap-1.5"><Package size={12} /> Produtos ({itens.length})</div>
          <div className="space-y-1.5">
            {itens.map((it, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="rounded-md overflow-hidden shrink-0 grid place-items-center" style={{ width: 34, height: 34, background: 'var(--glass-hover)', color: 'var(--faint)', border: '1px solid var(--glass-border)' }}>
                  {it.imagem ? <img src={it.imagem} alt="" className="h-full w-full object-cover" /> : <Package size={15} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11.5px] text-dim truncate">{it.quantidade}× {it.titulo}</div>
                  {it.sku && <div className="text-[10px] text-faint num truncate">SKU {it.sku}{it.unit_price != null ? ` · ${brl(it.unit_price)} un` : ''}</div>}
                </div>
                <span className="text-[11px] num text-faint shrink-0">{brl((it.unit_price || 0) * (it.quantidade || 1))}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <div className="text-[9.5px] uppercase tracking-wide text-faint font-bold mb-2 flex items-center gap-1.5"><Wallet size={12} /> Repasse do Mercado Livre</div>
          <div className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,.2)' }}>
            <div className="flex justify-between text-[12px] py-0.5"><span className="text-dim">Receita (comprador pagou)</span><span className="num">{brl(r.receita)}</span></div>
            <div className="flex justify-between text-[12px] py-0.5"><span className="text-dim">Comissão do ML{comPct != null ? ` (${typeof comPct === 'number' ? comPct.toFixed(1) : comPct}%)` : ''}</span><span className="num" style={{ color: 'var(--danger)' }}>−{brl(r.tarifa)}</span></div>
            {frete > 0 && <div className="flex justify-between text-[12px] py-0.5"><span className="text-dim">Frete do vendedor</span><span className="num" style={{ color: 'var(--danger)' }}>−{brl(frete)}</span></div>}
            <div className="flex justify-between text-[12px] py-1" style={{ borderTop: '1px dashed var(--glass-border)' }}><span className="text-dim">Total de custos ML</span><span className="num" style={{ color: 'var(--danger)' }}>−{brl(totalML)}</span></div>
            <div className="flex justify-between text-[12px] py-2 mt-1 font-bold" style={{ borderTop: '1px solid var(--glass-border)' }}><span>Você recebe do ML</span><span className="num" style={{ color: 'var(--ok)' }}>{brl(recebeML)}</span></div>
            <div className="flex justify-between text-[12px] py-0.5"><span className="text-dim">Custo dos produtos (Bling)</span><span className="num" style={{ color: r.custo ? 'var(--fg)' : 'var(--faint)' }}>{r.custo ? '−' + brl(r.custo) : 'R$ 0,00 — cadastre'}</span></div>
          </div>
          <button onClick={verTarifa} className="text-[10.5px] mt-1.5 inline-flex items-center gap-1 text-dim hover:text-fg">
            <DollarSign size={11} /> {tarifaDet ? 'Ocultar' : 'Ver'} detalhamento de faturamento
          </button>
          {tarifaDet === 'loading' && <div className="text-[10.5px] text-faint mt-1 flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" /> lendo faturamento…</div>}
          {tarifaDet === 'erro' && <div className="text-[10.5px] text-faint mt-1">Faturamento ainda não disponível para este pedido (a fatura fecha após a venda).</div>}
          {tarifaDet && tarifaDet !== 'loading' && tarifaDet !== 'erro' && (
            <div className="rounded-lg p-2 mt-1 text-[10.5px]" style={{ background: 'rgba(0,0,0,.2)' }}>
              {(!tarifaDet.itens || !tarifaDet.itens.length) ? <span className="text-faint">Sem detalhamento de fatura para este pedido ainda.</span>
                : tarifaDet.itens.map((t, i) => (
                  <div key={i} className="space-y-0.5">
                    {t.tarifa_bruta != null && <div className="flex justify-between"><span className="text-faint">Tarifa bruta</span><span className="num">{brl(t.tarifa_bruta)}</span></div>}
                    {t.rebate != null && t.rebate !== 0 && <div className="flex justify-between"><span className="text-faint">Bonificação</span><span className="num" style={{ color: 'var(--ok)' }}>+{brl(t.rebate)}</span></div>}
                    {t.tarifa_liquida != null && <div className="flex justify-between font-bold"><span>Tarifa líquida cobrada</span><span className="num">{brl(t.tarifa_liquida)}</span></div>}
                    {t.financing_fee != null && t.financing_fee !== 0 && <div className="flex justify-between"><span className="text-faint">Parcelamento</span><span className="num">{brl(t.financing_fee)}</span></div>}
                  </div>
                ))}
              <div className="text-[9.5px] text-faint mt-1">Fonte: relatório de faturamento do Mercado Livre.</div>
            </div>
          )}
          <div className="flex justify-between items-center rounded-xl px-3 py-2.5 mt-2" style={{ background: 'rgba(47,217,141,.08)', border: '1px solid rgba(47,217,141,.3)' }}>
            <span className="text-[12px] font-bold flex items-center gap-1.5" style={{ color: cor }}><TrendingUp size={13} /> Margem após taxas</span>
            <span className="num font-bold" style={{ fontSize: 16, color: cor }}>{brl(r.liquido)}{r.margem != null ? <span style={{ fontSize: 11 }}> ({r.margem.toFixed(0)}%)</span> : ''}</span>
          </div>
          {!r.custo && <div className="text-[10px] mt-1.5 flex items-start gap-1.5" style={{ color: 'var(--warn)' }}><AlertTriangle size={11} className="mt-0.5" /> Custo R$ 0,00 no Bling — cadastre o custo pra ver o lucro real.</div>}
        </div>

        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <div className="text-[9.5px] uppercase tracking-wide text-faint font-bold mb-2 flex items-center gap-1.5"><MapPin size={12} /> Entrega <span className="text-[8px] px-1 py-0.5 rounded" style={{ background: 'rgba(242,194,0,.18)', color: ML }}>endereço real · ML</span></div>
          {!sid ? <div className="text-[11px] text-faint">Este pedido não tem envio associado.</div>
            : !dest && envio === 'loading' ? <div className="text-[11px] text-faint flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> lendo endereço…</div>
              : !dest ? <div className="text-[11px] text-faint">Endereço ainda não sincronizado.</div>
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

function PersonalizarModal({ onClose }) {
  const [rem, setRem] = useState(() => lerRemetente())
  const set = (campo) => (e) => setRem((r) => ({ ...r, [campo]: e.target.value }))
  const salvar = () => { salvarRemetente(rem); onClose() }
  const campo = (label, chave, ph) => (
    <label className="block">
      <span className="text-[11px] text-faint font-medium">{label}</span>
      <input value={rem[chave] || ''} onChange={set(chave)} placeholder={ph}
        className="w-full mt-1 bg-transparent rounded-lg px-3 py-2 text-sm text-fg outline-none" style={{ border: '1px solid var(--glass-border)' }} />
    </label>
  )
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4" style={{ background: 'rgba(0,0,0,.6)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-md" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)', boxShadow: '0 20px 60px rgba(0,0,0,.5)' }} onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--glass-border)' }}>
          <SlidersHorizontal size={16} className="text-accent" />
          <span className="font-semibold">Remetente da impressão</span>
          <button onClick={onClose} className="ml-auto text-faint hover:text-fg"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-[11.5px] text-dim">Estes dados aparecem no topo da folha por pedido e na separação. Ficam salvos só neste navegador.</p>
          {campo('Nome / Loja', 'nome', 'Sóstrass Armarinhos')}
          {campo('CNPJ', 'cnpj', '00.000.000/0001-00')}
          {campo('Endereço', 'endereco', 'Rua, nº, bairro — Limeira/SP')}
          {campo('Telefone', 'telefone', '(19) 90000-0000')}
        </div>
        <div className="px-4 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-lg glass text-dim hover:text-fg">Cancelar</button>
          <button onClick={salvar} className="text-sm px-4 py-1.5 rounded-lg text-white inline-flex items-center gap-1.5" style={{ background: 'var(--accent)' }}><Check size={14} /> Salvar</button>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================== */
const CLAIM_STAGE = { claim: 'Reclamação', dispute: 'Disputa', recontact: 'Recontato', none: '—' }
const CLAIM_STATUS = { opened: { t: 'Aberta', c: 'var(--warn)' }, closed: { t: 'Fechada', c: 'var(--dim)' } }

function PosVenda({ onFechar }) {
  const [itens, setItens] = useState(null)
  const [status, setStatus] = useState('opened')
  const [aberto, setAberto] = useState(null)
  const [detalhe, setDetalhe] = useState({})

  useEffect(() => {
    let vivo = true
    setItens(null); setAberto(null)
    api.mlPosvenda(status).then((d) => { if (vivo) setItens(d.itens || []) }).catch(() => { if (vivo) setItens([]) })
    return () => { vivo = false }
  }, [status])

  const abrir = async (c) => {
    if (aberto === c.claim_id) { setAberto(null); return }
    setAberto(c.claim_id)
    if (!detalhe[c.claim_id]) {
      setDetalhe((d) => ({ ...d, [c.claim_id]: 'loading' }))
      try { const x = await api.mlPosvendaDetalhe(c.claim_id); setDetalhe((d) => ({ ...d, [c.claim_id]: x })) }
      catch { setDetalhe((d) => ({ ...d, [c.claim_id]: 'erro' })) }
    }
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="font-display font-semibold text-sm inline-flex items-center gap-1.5"><Undo2 size={15} style={{ color: 'var(--warn)' }} /> Pós-venda / Devoluções</span>
        <div className="inline-flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
          {[{ id: 'opened', l: 'Abertas' }, { id: 'closed', l: 'Fechadas' }].map((s) => (
            <button key={s.id} onClick={() => setStatus(s.id)} className="text-[11px] font-bold px-3 py-1.5"
              style={status === s.id ? { background: 'var(--accent)', color: '#fff' } : { background: 'transparent', color: 'var(--faint)' }}>{s.l}</button>
          ))}
        </div>
        <button onClick={onFechar} className="ml-auto text-[11px] px-2.5 py-1.5 rounded-lg glass text-dim hover:text-fg inline-flex items-center gap-1.5"><ChevronLeft size={13} /> Voltar aos pedidos</button>
      </div>

      {itens === null ? (
        <div className="text-dim text-sm flex items-center gap-2 p-4"><Loader2 size={16} className="animate-spin" /> Buscando reclamações no Mercado Livre…</div>
      ) : itens.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <CheckCircle2 size={28} className="mx-auto mb-3" style={{ color: 'var(--ok)' }} />
          <div className="font-medium">Nenhuma reclamação {status === 'opened' ? 'aberta' : 'fechada'}</div>
          <div className="text-sm text-dim mt-1">Reclamações e devoluções aparecem aqui com o que precisa ser feito e o prazo.</div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {itens.map((c) => {
            const stt = CLAIM_STATUS[c.status] || { t: c.status, c: 'var(--dim)' }
            const det = detalhe[c.claim_id]
            const detOk = det && det !== 'loading' && det !== 'erro'
            const on = aberto === c.claim_id
            return (
              <div key={c.claim_id} className="glass rounded-2xl p-3" style={on ? { borderColor: 'var(--warn)' } : undefined}>
                <button onClick={() => abrir(c)} className="w-full text-left flex items-start gap-3">
                  <span className="grid place-items-center shrink-0 mt-0.5" style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(224,162,60,.14)', color: 'var(--warn)' }}><Undo2 size={16} /></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{c.reason_grupo || 'Reclamação'}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--glass-hover)', color: stt.c }}>{stt.t}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,.2)', color: 'var(--faint)' }}>{CLAIM_STAGE[c.stage] || c.stage}</span>
                    </div>
                    <div className="text-[11px] text-faint num mt-0.5">
                      {c.order_id ? `Pedido #${c.order_id}` : `Claim #${c.claim_id}`}{c.reason_id ? ` · motivo ${c.reason_id}` : ''}{c.last_updated ? ` · ${dataHora(c.last_updated)}` : ''}
                    </div>
                  </div>
                  <span className="text-faint shrink-0 mt-1">{on ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                </button>

                {on && (
                  <div className="mt-3 pt-3 text-[12px]" style={{ borderTop: '1px solid var(--glass-border)' }}>
                    {det === 'loading' ? <div className="text-faint flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> lendo detalhe…</div>
                      : det === 'erro' || !detOk ? <div className="text-faint">Não consegui ler o detalhe desta reclamação.</div>
                        : (
                          <div className="space-y-2">
                            {det.tem_incentivo && (
                              <div className="rounded-lg px-3 py-2 flex items-start gap-2" style={{ background: 'rgba(255,122,122,.12)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
                                <AlertTriangle size={13} className="mt-0.5 shrink-0" /> <span><b>Responda em até 48h</b> para não afetar sua reputação.</span>
                              </div>
                            )}
                            {det.afeta_reputacao && !det.tem_incentivo && (
                              <div className="text-[11px]" style={{ color: 'var(--warn)' }}><AlertTriangle size={11} className="inline mr-1" /> Esta reclamação afeta a reputação.</div>
                            )}
                            {(det.titulo || det.reason_nome) && <div><span className="text-faint">Motivo:</span> <b>{det.titulo || det.reason_nome}</b></div>}
                            {det.problema && <div><span className="text-faint">Problema:</span> {det.problema}</div>}
                            {det.descricao && <div className="text-dim">{det.descricao}</div>}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-dim">
                              {det.due_date && <span className="inline-flex items-center gap-1"><Clock size={11} /> Prazo: <span className="num">{dataHora(det.due_date)}</span></span>}
                              {det.responsavel && <span className="inline-flex items-center gap-1"><User size={11} /> Ação de: {det.responsavel === 'seller' ? 'você' : det.responsavel === 'buyer' ? 'comprador' : 'mediador'}</span>}
                            </div>
                            {det.acoes_vendedor && det.acoes_vendedor.length > 0 && (
                              <div className="text-[11px] text-dim">Ações disponíveis: {det.acoes_vendedor.map((a) => a.action).filter(Boolean).join(', ')}</div>
                            )}
                            <div className="flex gap-2 pt-1">
                              <a href={c.order_id ? `https://www.mercadolivre.com.br/vendas/${c.order_id}/detalhe` : 'https://www.mercadolivre.com.br/vendas'} target="_blank" rel="noreferrer"
                                className="text-[11.5px] font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5" style={{ background: ML, color: '#3a2c00' }}>
                                <ExternalLink size={13} /> Abrir no Mercado Livre
                              </a>
                            </div>
                            <div className="text-[10px] text-faint pt-1">Responder e resolver a reclamação por aqui (mensagens e devolução) entra na próxima onda; por ora, a ação é feita no ML.</div>
                          </div>
                        )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
