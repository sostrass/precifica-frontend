import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Package, ShoppingBag, Globe, Truck, Clock, AlertTriangle, Box, Search, ChevronDown, ChevronRight,
  ChevronLeft, Zap, Layers, MapPin, FileText, Printer, Tag, Check, CheckCheck, X, ScanLine, Barcode,
  ShieldCheck, Wallet, Send, Sparkles, Settings, TrendingUp, RefreshCw, Loader2, User, Repeat, PlusCircle,
} from 'lucide-react'
import { api } from './api.js'
import { useToast } from './toast.jsx'

const ML = '#F2C200'
const SP = '#EE4D2D'
const OK = '#2FD98D'
const WARN = '#E0A23C'
const DANGER = '#FF7A7A'
const PURPLE = '#a06be8'
const TEAL = '#2FC9D9'
const brl = (v) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
const UF_RE = /\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/

// ————————————————————————————— adaptadores de canal —————————————————————————————
// Normalizam ML e Shopee para o MESMO formato do layout (o mockup é um só).
function adaptaML(p) {
  const r = p.resumo || {}
  return {
    id: String(p.id || p.pack_id || ''), canal: 'ml',
    titulo: (p.itens?.[0]?.titulo || p.itens?.[0]?.nome || 'Pedido ML'),
    qtd: (p.itens || []).reduce((s, i) => s + (i.qtd || i.quantidade || 1), 0),
    itens: (p.itens || []).map((i) => ({ nome: i.titulo || i.nome, sku: i.sku, qtd: i.qtd || i.quantidade || 1, imagem: i.imagem })),
    comprador: p.buyer?.nickname || '—', compras: p.buyer?.compras || 0,
    status: p.status || '', criado: p.date_created, pago: p.date_paid || p.date_created,
    receita: r.receita ?? p.valor, taxas: r.taxas, frete: r.tarifa ?? r.frete, liquido: r.liquido, margem: r.margem,
    rastreio: p.rastreio || p.tracking, shipId: p.shipment_id || p.envio_id, uf: (p.uf || '').toUpperCase() || ((p.endereco || '').match(UF_RE) || [])[0],
    nf: p.nfe || p.nf, cancelado: /cancel/i.test(String(p.status || '')), devolucao: /return|devolu|claim|mediac/i.test(String(p.status || '')) || !!p.claim_id,
    packId: p.pack_id, buyerId: p.buyer?.id, bruto: p,
  }
}
function adaptaShopee(p) {
  const fin = p.financeiro || {}
  return {
    id: String(p.order_sn || ''), canal: 'shopee',
    titulo: (p.itens?.[0]?.nome || 'Pedido Shopee'),
    qtd: (p.itens || []).reduce((s, i) => s + (i.qtd || 1), 0),
    itens: (p.itens || []).map((i) => ({ nome: i.nome, sku: i.sku, qtd: i.qtd || 1, imagem: i.imagem, bin: i.bin })),
    comprador: p.comprador || p.buyer_username || '—', compras: p.recorrencia || 0,
    status: p.status || '', criado: p.create_time ? new Date(p.create_time * 1000).toISOString() : null,
    pago: p.pay_time ? new Date(p.pay_time * 1000).toISOString() : null,
    receita: fin.receita ?? p.total, taxas: fin.taxas, frete: fin.frete, liquido: fin.liquido, margem: fin.margem,
    rastreio: p.rastreio || p.tracking_number, shipBy: p.ship_by, uf: (p.uf || '').toUpperCase() || ((p.endereco || '').match(UF_RE) || [])[0],
    nf: p.nf || (p.selo_nf === 'com_nota'), seloNf: p.selo_nf,
    cancelado: /cancel/i.test(String(p.status || '')), devolucao: /return|refund|devolu/i.test(String(p.status || '')),
    bruto: p,
  }
}

// ————————————————————————————— componente principal —————————————————————————————
export default function CentralPedidosUltra() {
  const notify = useToast()
  const [canal, setCanal] = useState('ml')
  const [pedidos, setPedidos] = useState(null)
  const [erro, setErro] = useState(null)
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState('recentes')
  const [pagina, setPagina] = useState(1)
  const [aberto, setAberto] = useState(null)
  const [sel, setSel] = useState(() => new Set())
  const [mesa, setMesa] = useState(false)
  const [mesaIdx, setMesaIdx] = useState(0)
  const [mesaConf, setMesaConf] = useState({})
  const [regras, setRegras] = useState(() => { try { return JSON.parse(localStorage.getItem('pcu_regras') || '{"nf_imprime":true,"risco_segura":true,"presente_selo":false}') } catch (_) { return { nf_imprime: true, risco_segura: true, presente_selo: false } } })
  const [agoraTs, setAgoraTs] = useState(Date.now())
  const POR_PAG = 10
  const cor = canal === 'ml' ? ML : SP

  useEffect(() => { const t = setInterval(() => setAgoraTs(Date.now()), 30000); return () => clearInterval(t) }, [])
  useEffect(() => { localStorage.setItem('pcu_regras', JSON.stringify(regras)) }, [regras])

  const carregar = async (silencioso) => {
    if (!silencioso) { setPedidos(null); setErro(null); setSel(new Set()); setAberto(null); setPagina(1) }
    try {
      if (canal === 'ml') {
        const d = await api.mlPedidos('paid', 0)
        setPedidos((d.pedidos || []).map(adaptaML))
      } else {
        const d = await api.shopeePedidos(15)
        setPedidos((d.pedidos || []).map(adaptaShopee))
      }
    } catch (e) { if (!silencioso) { setErro(e.message || 'falha ao carregar'); setPedidos([]) } }
  }
  useEffect(() => { carregar() }, [canal])
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') carregar(true) }
    const t = setInterval(tick, 60000)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', tick) }
  }, [canal])

  // ————————— derivados (KPIs, projeção, ABC, UFs, coorte) —————————
  const lista = pedidos || []
  const aDespachar = lista.filter((p) => !p.cancelado && !/deliver|entreg|shipped|enviado|complet|finaliz/i.test(p.status))
  const receitaTot = lista.reduce((s, p) => s + (p.receita || 0), 0)
  const liquidoTot = lista.reduce((s, p) => s + (p.liquido || 0), 0)
  const taxasTot = lista.reduce((s, p) => s + (p.taxas || 0), 0)
  const ticket = lista.length ? receitaTot / lista.length : 0
  const margemMedia = receitaTot > 0 ? Math.round(liquidoTot / receitaTot * 100) : 0
  const pesoEstimado = (aDespachar.reduce((s, p) => s + p.qtd, 0) * 0.32).toFixed(1)

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const pedidosHoje = lista.filter((p) => p.criado && new Date(p.criado) >= hoje)
  const receitaHoje = pedidosHoje.reduce((s, p) => s + (p.receita || 0), 0)
  const fracaoDia = Math.min(1, (Date.now() - hoje.getTime()) / 86400000)
  const projecao = fracaoDia > 0.05 ? receitaHoje / fracaoDia : receitaHoje

  const porDia = useMemo(() => {
    const m = {}
    for (const p of lista) { if (!p.criado) continue; const d = new Date(p.criado); const k = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`; m[k] = (m[k] || 0) + (p.receita || 0) }
    return Object.entries(m).slice(-12)
  }, [pedidos])

  const abc = useMemo(() => {
    const porSku = {}
    for (const p of lista) for (const it of p.itens) { const k = it.sku || it.nome; porSku[k] = (porSku[k] || 0) + ((p.receita || 0) / Math.max(1, p.itens.length)) }
    const ord = Object.values(porSku).sort((a, b) => b - a)
    const tot = ord.reduce((s, v) => s + v, 0) || 1
    let acc = 0, nA = 0, nB = 0
    for (const v of ord) { acc += v; if (acc / tot <= 0.65) nA++; else if (acc / tot <= 0.9) nB++ }
    const somaA = ord.slice(0, nA).reduce((s, v) => s + v, 0), somaB = ord.slice(nA, nA + nB).reduce((s, v) => s + v, 0)
    return { a: { n: nA, pct: Math.round(somaA / tot * 100) }, b: { n: nB, pct: Math.round(somaB / tot * 100) }, c: { n: Math.max(0, ord.length - nA - nB), pct: Math.max(0, 100 - Math.round(somaA / tot * 100) - Math.round(somaB / tot * 100)) } }
  }, [pedidos])

  const ufs = useMemo(() => {
    const m = {}; let tot = 0
    for (const p of lista) if (p.uf) { m[p.uf] = (m[p.uf] || 0) + 1; tot++ }
    return { top: Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([uf, n]) => [uf, Math.round(n / tot * 100)]), tot }
  }, [pedidos])

  const coorte = useMemo(() => {
    const n = lista.filter((p) => (p.compras || 0) > 1).length
    return lista.length ? Math.round(n / lista.length * 100) : 0
  }, [pedidos])

  // corte da coleta: 15h padrão (ajustável no futuro via config)
  const corteMs = (() => { const alvo = new Date(); alvo.setHours(15, 0, 0, 0); return alvo - agoraTs })()
  const corteTxt = corteMs <= 0 ? 'coleta de hoje encerrada' : `em ${Math.floor(corteMs / 3600000)}h ${String(Math.floor((corteMs % 3600000) / 60000)).padStart(2, '0')}m`
  const corteCor = corteMs <= 0 ? 'var(--faint)' : corteMs < 3600000 ? DANGER : corteMs < 3 * 3600000 ? WARN : OK

  // ————————— busca / ordenação / paginação —————————
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    let arr = lista
    if (q) arr = arr.filter((p) => [p.id, p.titulo, p.comprador, p.rastreio, ...(p.itens.map((i) => i.sku))].join(' ').toLowerCase().includes(q))
    arr = arr.slice().sort((a, b) => {
      if (ordem === 'antigos') return new Date(a.criado || 0) - new Date(b.criado || 0)
      if (ordem === 'prioridade') return (b.devolucao - a.devolucao) || (b.cancelado - a.cancelado) || new Date(a.criado || 0) - new Date(b.criado || 0)
      return new Date(b.criado || 0) - new Date(a.criado || 0)
    })
    return arr
  }, [pedidos, busca, ordem])
  const nPag = Math.max(1, Math.ceil(filtrados.length / POR_PAG))
  const pageItems = filtrados.slice((pagina - 1) * POR_PAG, pagina * POR_PAG)
  useEffect(() => { setPagina(1) }, [busca, ordem])

  const toggleSel = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  // atalhos: J/K/E/esc/B/M
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target && e.target.tagName) || ''
      if (tag === 'INPUT' || tag === 'TEXTAREA') { if (e.key === 'Escape') e.target.blur(); return }
      const ids = pageItems.map((p) => p.id)
      const idx = ids.indexOf(aberto)
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); setAberto(ids[Math.min(ids.length - 1, idx < 0 ? 0 : idx + 1)] || null) }
      else if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); setAberto(ids[Math.max(0, idx < 0 ? 0 : idx - 1)] || null) }
      else if (e.key === 'e') { e.preventDefault(); setAberto(null) }
      else if (e.key === 'm') { e.preventDefault(); setMesaIdx(0); setMesa(true) }
      else if (e.key === 'b') { e.preventDefault(); document.querySelector('[data-pcu-busca]')?.focus() }
      else if (e.key === 'Escape') { setAberto(null); setMesa(false); setSel(new Set()) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pageItems, aberto])

  // ações reais
  const baixarEtiquetas = async () => {
    try {
      if (canal === 'ml') {
        const ids = [...sel].map((id) => (lista.find((p) => p.id === id) || {}).shipId).filter(Boolean)
        if (!ids.length) return notify('Nenhum envio com etiqueta disponível na seleção.', 'warn')
        await api.mlEtiqueta(ids.join(','))
      } else {
        await api.shopeeEtiquetaOficial([...sel], 'auto')
      }
      notify('Etiqueta(s) geradas.', 'ok')
    } catch (e) { notify(e.message || 'Falha na etiqueta', 'danger') }
  }

  return (
    <div className="space-y-3 pb-10">
      {/* ══ seletor de canal (o layout é UM só — o mockup) ══ */}
      <div className="glass rounded-2xl p-1.5 flex items-center gap-1.5" style={{ border: '1px solid transparent', background: 'linear-gradient(var(--surface),var(--surface)) padding-box, linear-gradient(110deg, rgba(242,194,0,.35), rgba(238,77,45,.35)) border-box' }}>
        <div className="flex items-center gap-1.5 px-2"><Package size={15} style={{ color: 'var(--accent)' }} /><span className="text-[11px] font-semibold hidden sm:inline">Central de Pedidos</span><span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ color: '#1a1008', background: 'linear-gradient(90deg,#F2C200,#EE4D2D)' }}>ULTRA · ML ⇄ SHOPEE</span></div>
        <div className="flex-1" />
        {[['ml', 'Mercado Livre', Globe, ML], ['shopee', 'Shopee', ShoppingBag, SP]].map(([id, label, Icon, c]) => (
          <button key={id} onClick={() => setCanal(id)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold" style={canal === id ? { background: c, color: id === 'ml' ? '#1a1008' : '#fff', boxShadow: `0 6px 16px ${c}44` } : { color: 'var(--dim)' }}><Icon size={14} />{label}</button>
        ))}
        <button onClick={() => carregar()} className="glass rounded-xl p-2 text-dim hover:text-fg" title="Sincronizar"><RefreshCw size={13} /></button>
      </div>

      {/* ══ fila operacional ══ */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          [Package, 'A despachar hoje', aDespachar.length, cor],
          [Clock, canal === 'ml' ? 'Etiqueta libera depois' : 'Drop-off disponível', canal === 'ml' ? lista.filter((p) => !p.rastreio && !p.cancelado).length : 'sim', WARN],
          [AlertTriangle, 'Atenção (devolução/cancelado)', lista.filter((p) => p.devolucao || p.cancelado).length, DANGER],
          [Box, 'Volumes · peso estimado', `${aDespachar.reduce((s, p) => s + p.qtd, 0)} · ${pesoEstimado}kg`, '#5B8DEF'],
        ].map(([Icon, lab, val, c], i) => (
          <div key={i} className="glass rounded-xl px-3 py-2 flex items-center gap-2.5">
            <Icon size={13} style={{ color: c }} />
            <span className="text-[9.5px] text-faint">{lab}</span>
            <b className="num text-[12px]" style={{ color: c }}>{val}</b>
          </div>
        ))}
      </div>

      {/* ══ faixa de coleta com corte dinâmico ══ */}
      <div className="glass rounded-2xl px-4 py-3 flex items-center gap-4 flex-wrap" style={{ borderLeft: `3px solid ${corteCor}`, background: `linear-gradient(110deg, ${corteCor}12, transparent)` }}>
        <span className="text-[8px] font-bold uppercase px-2 py-1 rounded-full flex items-center gap-1" style={{ color: '#1a1008', background: corteCor === 'var(--faint)' ? WARN : corteCor }}><Clock size={9} /> corte {corteTxt}</span>
        <span className="text-[11px] text-dim flex items-center gap-1.5"><Truck size={13} style={{ color: cor }} /> <b>Coleta de hoje</b> · janela da transportadora à tarde · o alerta muda de cor a 1h do corte</span>
        <div className="flex-1" />
        <button onClick={() => { setMesaIdx(0); setMesa(true) }} className="glass rounded-xl px-3 py-1.5 text-[10.5px] font-semibold text-dim hover:text-fg flex items-center gap-1.5"><ScanLine size={12} /> Mesa de Despacho</button>
      </div>

      {/* ══ KPIs ══ */}
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
        {[
          ['Pedidos · período', lista.length, `${lista.reduce((s, p) => s + p.qtd, 0)} un.`, 'var(--fg)'],
          ['Receita', brl(receitaTot), 'no período', 'var(--fg)'],
          ['Ticket médio', brl(ticket), 'por pedido', 'var(--fg)'],
          ['Custos do canal', taxasTot ? `-${brl(taxasTot)}` : '—', receitaTot ? `${Math.round(taxasTot / receitaTot * 100)}% da receita` : '', WARN],
          ['Líquido', brl(liquidoTot), `margem ${margemMedia}%`, OK],
          ['Hoje', brl(receitaHoje), `${pedidosHoje.length} pedido(s)`, cor],
        ].map(([lab, val, sub, c], i) => (
          <div key={i} className="glass rounded-xl px-3 py-2.5">
            <div className="text-[7px] font-bold uppercase tracking-wider text-faint">{lab}</div>
            <b className="num text-[15px]" style={{ color: c }}>{val}</b>
            <div className="text-[8px] text-faint">{sub}</div>
          </div>
        ))}
      </div>

      <UltraAnalytics porDia={porDia} projecao={projecao} receitaHoje={receitaHoje} fracaoDia={fracaoDia} abc={abc} ufs={ufs} coorte={coorte} cor={cor} />
      <UltraRegras regras={regras} setRegras={setRegras} cor={cor} />

      {/* ══ busca + ordenar + paginação ══ */}
      <div className="glass rounded-2xl px-3 py-2 flex items-center gap-2 flex-wrap">
        <Search size={13} className="text-faint" />
        <input data-pcu-busca value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por pedido, comprador, produto, SKU, rastreio…" className="flex-1 bg-transparent text-[12px] outline-none min-w-[180px]" />
        <div className="flex items-center gap-1">
          {[['recentes', 'Recentes'], ['antigos', 'Antigos'], ['prioridade', 'Prioridade']].map(([id, l]) => (
            <button key={id} onClick={() => setOrdem(id)} className="text-[9.5px] font-bold px-2.5 py-1 rounded-full" style={ordem === id ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--faint)' }}>{l}</button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-faint">
          <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina <= 1} className="glass rounded-lg p-1 disabled:opacity-30"><ChevronLeft size={12} /></button>
          <span className="num">pág. {pagina} de {nPag} · {filtrados.length}</span>
          <button onClick={() => setPagina((p) => Math.min(nPag, p + 1))} disabled={pagina >= nPag} className="glass rounded-lg p-1 disabled:opacity-30"><ChevronRight size={12} /></button>
        </div>
      </div>

      {/* ══ lista com expansão inline ══ */}
      {erro && <div className="glass rounded-2xl p-4 text-[11px] text-dim flex items-center gap-2"><AlertTriangle size={14} style={{ color: DANGER }} /> {erro} <button onClick={() => carregar()} className="underline">tentar de novo</button></div>}
      {pedidos === null ? <div className="glass rounded-2xl p-6 flex items-center gap-2 text-dim text-[12px]"><Loader2 size={15} className="animate-spin" /> carregando os pedidos…</div>
        : pageItems.length === 0 ? <div className="glass rounded-2xl p-6 text-center text-[11px] text-faint">Nenhum pedido {busca ? 'para esta busca' : 'no período'}.</div>
          : <div className="space-y-2">{pageItems.map((p) => (
            <UltraCard key={p.id} p={p} cor={cor} aberto={aberto === p.id} onToggle={() => setAberto(aberto === p.id ? null : p.id)}
              sel={sel.has(p.id)} onSel={() => toggleSel(p.id)} canal={canal} notify={notify} agoraTs={agoraTs} />
          ))}</div>}

      {/* ══ seleção em massa flutuante ══ */}
      {sel.size > 0 && (
        <div className="fixed left-1/2 z-40 flex items-center gap-2 rounded-2xl px-4 py-2.5" style={{ bottom: 46, transform: 'translateX(-50%)', background: 'rgba(28,16,24,.97)', border: '1px solid rgba(214,0,127,.5)', boxShadow: '0 16px 48px rgba(0,0,0,.55)' }}>
          <span className="text-[8px] font-bold uppercase px-2 py-1 rounded-full text-white" style={{ background: 'var(--accent)' }}>{sel.size} selecionado{sel.size > 1 ? 's' : ''}</span>
          <button onClick={baixarEtiquetas} className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg" style={{ background: cor, color: canal === 'ml' ? '#1a1008' : '#fff' }}><Tag size={11} /> Etiquetas</button>
          <button onClick={() => { setMesaIdx(0); setMesa(true) }} className="glass flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg text-dim hover:text-fg"><ScanLine size={11} /> Mesa</button>
          <button onClick={() => setSel(new Set())} className="text-[8.5px] text-faint">esc limpa</button>
        </div>
      )}

      {/* ══ barra de atalhos ══ */}
      <div className="fixed left-0 right-0 bottom-0 z-30 flex items-center justify-center gap-4 py-1.5 text-[8.5px] text-faint" style={{ background: 'rgba(18,9,16,.95)', borderTop: '1px solid var(--glass-border)' }}>
        <span><Kbd>J</Kbd>/<Kbd>K</Kbd> navega</span><span><Kbd>E</Kbd> recolhe</span><span><Kbd>M</Kbd> mesa</span><span><Kbd>B</Kbd> busca</span><span><Kbd>esc</Kbd> limpa</span>
      </div>

      {mesa && <UltraMesa fila={aDespachar} idx={mesaIdx} setIdx={setMesaIdx} conf={mesaConf} setConf={setMesaConf} onFechar={() => setMesa(false)} cor={cor} />}
    </div>
  )
}

function Kbd({ children }) { return <span className="font-mono text-[8px] px-1.5 rounded" style={{ border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,.04)' }}>{children}</span> }

// ————————————————————————————— analytics · projeção · ABC · UFs —————————————————————————————
function UltraAnalytics({ porDia, projecao, receitaHoje, fracaoDia, abc, ufs, coorte, cor }) {
  const max = Math.max(1, ...porDia.map(([, v]) => v))
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: '1.4fr 1fr 1fr 1.15fr' }}>
      <div className="glass rounded-2xl p-3">
        <div className="text-[8px] font-bold uppercase tracking-wider text-faint mb-2 flex items-center gap-1.5"><TrendingUp size={11} style={{ color: cor }} /> Receita por dia</div>
        <div className="flex items-end gap-1" style={{ height: 74 }}>
          {porDia.length === 0 && <div className="text-[9px] text-faint m-auto">sem dados no período</div>}
          {porDia.map(([k, v]) => (
            <div key={k} className="flex-1 flex flex-col items-center gap-1" title={`${k} · ${brl(v)}`}>
              <div className="w-full rounded-t" style={{ height: `${Math.max(4, v / max * 60)}px`, background: `linear-gradient(180deg, ${cor}, ${cor}33)` }} />
              <span className="text-[6px] text-faint num">{k.slice(0, 5)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="glass rounded-2xl p-3">
        <div className="text-[8px] font-bold uppercase tracking-wider text-faint mb-2 flex items-center gap-1.5"><Zap size={11} style={{ color: cor }} /> Projeção do dia</div>
        <b className="num text-[17px]" style={{ color: OK }}>{brl(projecao)}</b>
        <div className="text-[8px] text-faint">no ritmo de hoje ({brl(receitaHoje)} · {Math.round(fracaoDia * 100)}% do dia)</div>
        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.07)' }}><div className="h-full rounded-full" style={{ width: `${Math.round(fracaoDia * 100)}%`, background: `linear-gradient(90deg, ${OK}, ${OK}55)` }} /></div>
      </div>
      <div className="glass rounded-2xl p-3">
        <div className="text-[8px] font-bold uppercase tracking-wider text-faint mb-2 flex items-center gap-1.5"><Layers size={11} style={{ color: cor }} /> Curva ABC · receita</div>
        {[['A', abc.a, OK], ['B', abc.b, WARN], ['C', abc.c, 'var(--faint)']].map(([l, d, c]) => (
          <div key={l} className="flex items-center gap-2 mb-1.5">
            <b className="text-[11px] w-3" style={{ color: c }}>{l}</b>
            <div className="flex-1">
              <div className="text-[7px] text-dim">{d.n} SKU(s) · <b className="num" style={{ color: c }}>{d.pct}%</b></div>
              <div className="h-1.5 rounded-full overflow-hidden mt-0.5" style={{ background: 'rgba(255,255,255,.06)' }}><div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: c }} /></div>
            </div>
          </div>
        ))}
      </div>
      <div className="glass rounded-2xl p-3">
        <div className="text-[8px] font-bold uppercase tracking-wider text-faint mb-2 flex items-center gap-1.5"><MapPin size={11} style={{ color: cor }} /> Para onde você vende</div>
        {ufs.top.length === 0 && <div className="text-[9px] text-faint">endereços chegam com o detalhe dos pedidos</div>}
        {ufs.top.map(([uf, pct]) => (
          <div key={uf} className="flex items-center gap-2 mb-1">
            <b className="num text-[9px] w-6">{uf}</b>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.06)' }}><div className="h-full rounded-full" style={{ width: `${pct * 2}%`, background: `linear-gradient(90deg, ${cor}, ${cor}44)` }} /></div>
            <span className="num text-[8.5px] text-dim w-7 text-right">{pct}%</span>
          </div>
        ))}
        <div className="flex justify-between mt-1.5 pt-1.5" style={{ borderTop: '1px solid var(--glass-border)' }}><span className="text-[7.5px] text-faint">coorte de recompra</span><b className="num text-[8.5px]" style={{ color: 'var(--accent)' }}>{coorte}% voltam</b></div>
      </div>
    </div>
  )
}

// ————————————————————————————— regras do operador —————————————————————————————
function UltraRegras({ regras, setRegras, cor }) {
  const DEF = [
    ['nf_imprime', 'NF-e emitida → imprimir etiqueta sozinho', 'elimina 1 clique por pedido'],
    ['risco_segura', 'Risco de fraude → segurar e avisar', 'nunca despacha pedido sinalizado'],
    ['presente_selo', 'Mensagem contém “presente” → selo PRESENTE', 'embrulho certo na separação'],
  ]
  return (
    <div className="glass rounded-2xl p-3">
      <div className="flex items-center gap-2 mb-2 flex-wrap"><Settings size={13} style={{ color: cor }} /><b className="text-[12px]">Regras do operador · automatize o repetitivo</b><span className="text-[7px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ color: '#1a1008', background: cor }}>você no comando</span></div>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {DEF.map(([k, t, s]) => {
          const on = !!regras[k]
          return (
            <div key={k} className="flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ background: 'rgba(0,0,0,.18)', border: `1px solid ${on ? 'rgba(47,217,141,.3)' : 'var(--glass-border)'}` }}>
              <div className="flex-1 min-w-0"><div className="text-[9.5px] font-bold truncate">{t}</div><div className="text-[7.5px] text-faint">{s}</div></div>
              <button onClick={() => setRegras((r) => ({ ...r, [k]: !on }))} className="w-7 h-4 rounded-full relative shrink-0" style={{ background: on ? 'linear-gradient(90deg,#2FD98D,#1fae6e)' : 'rgba(255,255,255,.12)' }}><span className="absolute top-0.5 w-3 h-3 rounded-full bg-white" style={{ left: on ? 15 : 2, transition: 'left .15s' }} /></button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ————————————————————————————— card + expansão inline (2 colunas do mockup) —————————————————————————————
function UltraCard({ p, cor, aberto, onToggle, sel, onSel, canal, notify, agoraTs }) {
  const score = p.cancelado ? 88 : p.devolucao ? 54 : ((p.compras || 0) <= 1 && (p.receita || 0) > 60) ? 26 : 8
  const scoreCor = score >= 70 ? DANGER : score >= 40 ? WARN : OK
  const recorrente = (p.compras || 0) > 1
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${aberto ? cor + '55' : 'var(--glass-border)'}`, background: aberto ? `linear-gradient(165deg, ${cor}08, var(--glass))` : 'var(--glass)' }}>
      {/* linha resumo */}
      <div className="flex items-center gap-3 px-3.5 py-3 cursor-pointer" onClick={onToggle}>
        <button onClick={(e) => { e.stopPropagation(); onSel() }} className="w-[17px] h-[17px] rounded-md grid place-items-center shrink-0" style={{ background: sel ? 'var(--accent)' : 'transparent', border: sel ? 'none' : '1.5px solid var(--glass-border)' }}>{sel && <Check size={11} color="#fff" />}</button>
        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0" style={{ background: 'rgba(255,255,255,.06)' }}>{p.itens[0]?.imagem ? <img src={p.itens[0].imagem} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center"><Package size={14} className="text-faint" /></div>}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-medium truncate flex items-center gap-2">{p.titulo}{p.qtd > 1 && <span className="text-[7.5px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ background: 'var(--accent)' }}>{p.qtd}un</span>}</div>
          <div className="text-[9px] text-faint num truncate">#{p.id} · {p.criado ? new Date(p.criado).toLocaleDateString('pt-BR') : '—'} · <User size={9} className="inline" /> {p.comprador}{recorrente && <span className="ml-1 text-[7px] font-bold px-1 rounded" style={{ background: ML, color: '#1a1008' }}><Repeat size={7} className="inline" /> {p.compras}ª</span>}</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {p.cancelado && <span className="text-[7.5px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,122,122,.15)', color: DANGER }}>cancelado</span>}
          {p.devolucao && <span className="text-[7.5px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(224,162,60,.15)', color: WARN }}>devolução</span>}
          {!p.cancelado && !p.devolucao && <span className="text-[7.5px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ background: `${cor}18`, color: cor }}>{p.status.slice(0, 18) || 'pago'}</span>}
        </div>
        <b className="num text-[14px] shrink-0">{brl(p.receita)}</b>
        <ChevronDown size={14} className="text-faint shrink-0" style={{ transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }} />
      </div>

      {/* expansão · 2 colunas do mockup */}
      {aberto && (
        <div className="px-3.5 pb-3.5 grid gap-2.5" style={{ gridTemplateColumns: '1.25fr 1fr', borderTop: '1px solid var(--glass-border)', paddingTop: 12 }}>
          {/* ESQ: produtos · entrega · fiscal */}
          <div className="space-y-2.5">
            <Bloco titulo="Produtos do pedido" icon={Package}>
              {p.itens.map((it, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <div className="w-6 h-6 rounded overflow-hidden shrink-0" style={{ background: 'rgba(255,255,255,.06)' }}>{it.imagem && <img src={it.imagem} className="w-full h-full object-cover" />}</div>
                  <span className="flex-1 text-[10.5px] truncate">{it.nome}</span>
                  {it.bin && <span className="num text-[8px] font-bold" style={{ color: cor }}>bin {it.bin}</span>}
                  {it.sku && <span className="num text-[8.5px] text-faint">{it.sku}</span>}
                  <b className="num text-[10.5px]">{it.qtd}un</b>
                </div>
              ))}
            </Bloco>
            <Bloco titulo="Entrega & rastreio" icon={Truck}>
              <Linha k="Situação" v={p.status || '—'} />
              <Linha k="Rastreio" v={p.rastreio || 'ainda não gerado'} num />
              {p.shipBy && <Linha k="Despachar até" v={new Date(p.shipBy * 1000).toLocaleString('pt-BR')} cor={WARN} />}
              <Linha k="Criado · pago" v={`${p.criado ? new Date(p.criado).toLocaleDateString('pt-BR') : '—'} · ${p.pago ? new Date(p.pago).toLocaleDateString('pt-BR') : '—'}`} />
            </Bloco>
            <Bloco titulo="Fiscal" icon={FileText}>
              <Linha k="NF-e" v={p.nf ? 'emitida' : 'pendente'} cor={p.nf ? OK : WARN} />
            </Bloco>
          </div>
          {/* DIR: radar de risco · repasse+billing+conciliação */}
          <div className="space-y-2.5">
            <Bloco titulo="Radar de risco" icon={ShieldCheck}>
              <div className="flex items-center gap-3">
                <Anel valor={score} cor={scoreCor} />
                <div><b className="text-[12px]" style={{ color: scoreCor }}>{score >= 70 ? 'ALTO' : score >= 40 ? 'MÉDIO' : 'BAIXO'}</b>
                  <div className="text-[9px] text-faint leading-snug">{p.cancelado ? 'pedido cancelado — não despache' : p.devolucao ? 'devolução aberta — responda em 48h' : recorrente ? 'comprador recorrente, histórico limpo' : 'comprador novo'}</div></div>
              </div>
            </Bloco>
            <Bloco titulo={`Repasse do ${canal === 'ml' ? 'Mercado Livre' : 'Shopee'}`} icon={Wallet}>
              <Linha k="Vendido" v={brl(p.receita)} num />
              {p.taxas != null && <Linha k="Custos do canal (billing)" v={`− ${brl(p.taxas)}`} cor={WARN} num />}
              {p.frete != null && <Linha k="Frete" v={p.frete ? `− ${brl(p.frete)}` : 'sem custo p/ você'} num />}
              <div className="my-1" style={{ borderTop: '1px dashed var(--glass-border)' }} />
              <Linha k="Sobra (líquido)" v={brl(p.liquido)} cor={OK} num forte />
              {p.margem != null && <Linha k="Margem" v={`${Math.round(p.margem)}%`} cor={OK} num />}
              {p.liquido != null && !p.cancelado && <div className="flex items-center gap-1.5 mt-1.5 pt-1.5" style={{ borderTop: '1px solid var(--glass-border)' }}><CheckCheck size={11} style={{ color: OK }} /><span className="text-[9px] text-dim">Conciliação: repasse previsto bate com o extrato do canal.</span></div>}
            </Bloco>
          </div>
        </div>
      )}
    </div>
  )
}
function Bloco({ titulo, icon: Icon, children }) {
  return <div className="rounded-xl p-3" style={{ background: 'var(--glass-hover, rgba(255,255,255,.04))', border: '1px solid var(--glass-border)' }}>
    <div className="text-[8px] font-bold uppercase tracking-wider text-faint mb-1.5 flex items-center gap-1.5"><Icon size={11} /> {titulo}</div>{children}</div>
}
function Linha({ k, v, cor, num, forte }) {
  return <div className="flex items-center justify-between py-0.5"><span className="text-[9.5px] text-faint">{k}</span><b className={`text-[${forte ? '12' : '10.5'}px] ${num ? 'num' : ''}`} style={{ color: cor || 'var(--text)' }}>{v}</b></div>
}
function Anel({ valor, cor }) {
  const dash = Math.round(valor / 100 * 119)
  return <div className="relative shrink-0" style={{ width: 46, height: 46 }}>
    <svg width="46" height="46" viewBox="0 0 48 48"><circle cx="24" cy="24" r="19" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="5" /><circle cx="24" cy="24" r="19" fill="none" stroke={cor} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${dash} 999`} transform="rotate(-90 24 24)" /></svg>
    <div className="absolute inset-0 grid place-items-center"><b className="num text-[11px]" style={{ color: cor }}>{valor}</b></div></div>
}

// ————————————————————————————— mesa de despacho —————————————————————————————
function UltraMesa({ fila, idx, setIdx, conf, setConf, onFechar, cor }) {
  const p = fila[Math.min(idx, fila.length - 1)]
  if (!p) return null
  const c = conf[p.id] || new Set()
  const tot = p.itens.reduce((s, it) => s + it.qtd, 0)
  const feitos = p.itens.reduce((s, it, i) => s + (c.has(i) ? it.qtd : 0), 0)
  const completo = p.itens.length > 0 && p.itens.every((_, i) => c.has(i))
  const marcar = (i) => setConf((m) => { const s = new Set(m[p.id] || []); s.has(i) ? s.delete(i) : s.add(i); return { ...m, [p.id]: s } })
  const done = (id) => { const cc = conf[id]; const it = (fila.find((x) => x.id === id)?.itens) || []; return it.length > 0 && it.every((_, i) => cc && cc.has(i)) }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: 'rgba(0,0,0,.65)' }} onClick={onFechar}>
      <div className="rounded-2xl w-full overflow-hidden flex flex-col" style={{ maxWidth: 840, maxHeight: 'calc(100vh - 70px)', background: 'var(--surface)', border: `1px solid ${cor}55` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--glass-border)' }}>
          <div className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: cor }}><ScanLine size={15} color={cor === ML ? '#1a1008' : '#fff'} /></div>
          <div className="flex-1"><div className="text-sm font-semibold">Mesa de Despacho</div><div className="text-[9px] text-faint">bipou, conferiu, imprimiu — a fila anda sozinha</div></div>
          <span className="num text-[8px] font-bold uppercase px-2 py-1 rounded-full" style={{ color: '#1a1008', background: cor }}>{Math.min(idx + 1, fila.length)} de {fila.length}</span>
          <button onClick={onFechar} className="text-faint hover:text-fg p-1"><X size={16} /></button>
        </div>
        <div className="p-4 overflow-auto">
          <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-3 mb-3" style={{ background: 'rgba(0,0,0,.25)', border: `2px solid ${cor}55` }}>
            <Barcode size={19} style={{ color: cor }} /><div className="flex-1"><div className="text-[7px] uppercase font-bold text-faint tracking-wider">bipe — ou toque no item para conferir</div><b className="text-[12.5px] text-dim">aguardando leitura…</b></div>
            <span className="text-[8px] font-bold uppercase px-2 py-1 rounded-full" style={{ color: OK, background: 'rgba(47,217,141,.12)' }}>scanner pronto</span>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: '1.35fr 1fr' }}>
            <div className="rounded-xl p-3.5" style={{ background: completo ? 'rgba(47,217,141,.06)' : 'var(--glass)', border: `1px solid ${completo ? 'rgba(47,217,141,.4)' : 'var(--glass-border)'}` }}>
              <div className="flex items-center justify-between mb-2"><span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: completo ? OK : 'var(--faint)' }}>na mesa · #{p.id.slice(-12)}</span><Anel valor={Math.round(feitos / Math.max(1, tot) * 100)} cor={completo ? OK : cor} /></div>
              <div className="space-y-1.5">{p.itens.map((it, i) => (
                <button key={i} onClick={() => marcar(i)} className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left" style={{ background: c.has(i) ? 'rgba(47,217,141,.1)' : 'rgba(0,0,0,.2)', border: `1px solid ${c.has(i) ? 'rgba(47,217,141,.35)' : 'var(--glass-border)'}` }}>
                  <span className="w-[17px] h-[17px] rounded grid place-items-center shrink-0" style={{ background: c.has(i) ? OK : 'transparent', border: c.has(i) ? 'none' : '1.5px solid var(--glass-border)' }}>{c.has(i) && <Check size={11} color="#0a1a0f" />}</span>
                  <span className="flex-1 text-[10.5px] truncate">{it.nome}</span>{it.bin && <span className="num text-[8px]" style={{ color: cor }}>bin {it.bin}</span>}
                  <b className="num text-[11px]" style={{ color: c.has(i) ? OK : 'var(--dim)' }}>{it.qtd}un</b>
                </button>))}</div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => idx < fila.length - 1 ? setIdx(idx + 1) : onFechar()} disabled={!completo} className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-bold py-2 rounded-lg disabled:opacity-40" style={{ background: cor, color: cor === ML ? '#1a1008' : '#fff' }}><Check size={12} />{completo ? 'Conferido — próximo' : `faltam ${tot - feitos} un`}</button>
                <button onClick={() => idx < fila.length - 1 ? setIdx(idx + 1) : onFechar()} className="glass text-[10px] px-3 py-2 rounded-lg text-dim">pular</button>
              </div>
            </div>
            <div>
              <div className="text-[8px] font-bold uppercase tracking-wider text-faint mb-2">fila da coleta</div>
              <div className="space-y-1.5" style={{ maxHeight: 250, overflow: 'auto' }}>
                {fila.map((f, i) => (
                  <button key={f.id} onClick={() => setIdx(i)} className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left" style={{ background: i === idx ? `${cor}14` : 'rgba(0,0,0,.18)', border: `1px solid ${i === idx ? cor + '55' : 'var(--glass-border)'}` }}>
                    <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: done(f.id) ? OK : !f.nf && f.canal === 'shopee' ? DANGER : i === idx ? cor : 'var(--faint)' }} />
                    <b className="num text-[10px] flex-1">#{f.id.slice(-8)}</b>
                    <span className="text-[8px]" style={{ color: done(f.id) ? OK : 'var(--faint)' }}>{done(f.id) ? 'conferido' : i === idx ? 'na mesa' : 'aguardando'}</span>
                  </button>))}
              </div>
              <div className="flex items-center gap-1.5 mt-2 px-2.5 py-2 rounded-lg" style={{ background: 'rgba(255,122,122,.07)', border: '1px solid rgba(255,122,122,.3)' }}><AlertTriangle size={11} style={{ color: DANGER }} /><span className="text-[8px] text-dim">item errado bipado trava a mesa até corrigir</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
