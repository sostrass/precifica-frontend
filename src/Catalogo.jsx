import { useEffect, useMemo, useState, useRef } from 'react'
import { Search, RefreshCw, Plug, X, Check, Zap, Radar, Wand2, Database, Loader2, ImageOff, BadgePercent, PanelRight, Plus, Star, CheckCircle2, Boxes, BarChart3, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, LayoutGrid, Percent, Layers, Flame, History, ShieldCheck, TrendingUp, Target, ArrowDown, ArrowUp, MessageSquare, AlertTriangle, Camera, Barcode, AlignLeft, Sparkles, ExternalLink } from 'lucide-react'
import { api, DEFAULT_CUSTOS } from './api.js'
import { useToast } from './toast.jsx'
import RadarDrawer from './RadarDrawer.jsx'
import ProdutoModal from './ProdutoModal.jsx'

const STATUS = {
  lucro_ideal: { txt: 'Saudável', cor: 'var(--ok)' },
  atencao: { txt: 'Atenção', cor: 'var(--warn)' },
  critico: { txt: 'Prejuízo', cor: 'var(--danger)' },
  sem_custo: { txt: 'Sem custo', cor: 'var(--text-faint)' },
  sem_base: { txt: 'Sem preço', cor: 'var(--text-faint)' },
}
const CANAIS = [
  { id: 'bling', nome: 'Bling' },
  { id: 'shopee', nome: 'Shopee' },
  { id: 'mercadolivre', nome: 'Mercado Livre' },
]
const MK = {
  shopee: { nome: 'Shopee', cor: '#EE4D2D', bg: 'rgba(238,77,45,.16)' },
  mercadolivre: { nome: 'M. Livre', cor: '#F2C200', bg: 'rgba(242,194,0,.18)' },
  amazon: { nome: 'Amazon', cor: '#FF9900', bg: 'rgba(255,153,0,.16)' },
  magalu: { nome: 'Magalu', cor: '#3B9EFF', bg: 'rgba(59,158,255,.16)' },
  americanas: { nome: 'Americanas', cor: '#FF5A5F', bg: 'rgba(255,90,95,.16)' },
  shein: { nome: 'Shein', cor: '#C9A0FF', bg: 'rgba(201,160,255,.16)' },
  tiktok: { nome: 'TikTok', cor: '#69C9D0', bg: 'rgba(105,201,208,.16)' },
  nuvemshop: { nome: 'Nuvemshop', cor: '#7AA5FF', bg: 'rgba(122,165,255,.16)' },
}
// status do preço praticado num canal vs Preço Bling (alvo)
const FLAG_CANAL = {
  ok: { cor: 'var(--ok)', Icon: Check, txt: 'No alvo — bate o Preço Bling' },
  abaixo: { cor: 'var(--warn)', Icon: ArrowDown, txt: 'Abaixo do alvo — neta menos que o Preço Bling' },
  prejuizo: { cor: 'var(--danger)', Icon: ArrowDown, txt: 'Prejuízo — neta abaixo do custo' },
  acima: { cor: '#6cc8ff', Icon: ArrowUp, txt: 'Acima do alvo — folga de margem' },
}
const desde = (iso) => {
  if (!iso) return null
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (Number.isNaN(dias)) return null
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 7) return `há ${dias}d`
  if (dias < 30) return `há ${Math.floor(dias / 7)}sem`
  return `há ${Math.floor(dias / 30)}m`
}
const brl = (n) => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const ABAS_COCKPIT = [
  { id: 'visao', icon: LayoutGrid, label: 'Visão geral' },
  { id: 'preco', icon: Percent, label: 'Preço & Margem' },
  { id: 'canais', icon: Layers, label: 'Canais' },
  { id: 'promo', icon: Flame, label: 'Promoção' },
  { id: 'radar', icon: Target, label: 'Radar' },
  { id: 'hist', icon: History, label: 'Histórico' },
  { id: 'aval', icon: Star, label: 'Avaliações' },
  { id: 'qual', icon: ShieldCheck, label: 'Qualidade' },
  { id: 'funil', icon: TrendingUp, label: 'Funil' },
]

export default function Catalogo() {
  const notify = useToast()
  const [itens, setItens] = useState(null)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [sel, setSel] = useState(() => new Set())
  const [drawer, setDrawer] = useState(null)
  const [abrir, setAbrir] = useState(null)
  const [aplicando, setAplicando] = useState(false)
  const [loteIa, setLoteIa] = useState(null)
  const [syncStatus, setSyncStatus] = useState(null)
  const [shopeeSync, setShopeeSync] = useState(null)
  const [vincSync, setVincSync] = useState(null)
  const [canal, setCanal] = useState('bling')
  const [cockpit, setCockpit] = useState(null)
  const [canaisDisp, setCanaisDisp] = useState(CANAIS)
  const [ajModo, setAjModo] = useState('pct')
  const [ajDir, setAjDir] = useState('mais')
  const [ajValor, setAjValor] = useState('')
  const [ajLoading, setAjLoading] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(50)

  useEffect(() => {
    api.precificacaoConfig()
      .then((cfg) => {
        const ativos = (cfg.canais || []).filter((c) => c && c.canal && c.ativo !== false)
          .map((c) => ({ id: c.canal, nome: c.nome || c.canal }))
        if (ativos.length) setCanaisDisp([{ id: 'bling', nome: 'Bling' }, ...ativos])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let timer
    const poll = async () => {
      try {
        const s = await api.catalogoSyncStatus()
        setSyncStatus(s)
        if (s.status === 'rodando') timer = setTimeout(poll, 2500)
      } catch { /* silencioso */ }
    }
    poll()
    return () => clearTimeout(timer)
  }, [])

  const sincronizarTudo = async () => {
    try {
      await api.catalogoSincronizar()
      notify('Sincronização do catálogo iniciada', 'ok')
      setSyncStatus({ status: 'rodando', total: 0, paginas: 0 })
      const poll = async () => {
        const s = await api.catalogoSyncStatus()
        setSyncStatus(s)
        if (s.status === 'rodando') setTimeout(poll, 2500)
        else if (s.status === 'concluido') notify(`Catálogo sincronizado: ${s.total} produtos`, 'ok')
      }
      setTimeout(poll, 2000)
    } catch (e) { notify(e.message, 'danger') }
  }

  useEffect(() => {
    let timer
    const poll = async () => {
      try {
        const s = await api.shopeeCatalogoStatus()
        setShopeeSync(s)
        if (s.status === 'rodando') timer = setTimeout(poll, 3000)
      } catch { /* silencioso */ }
    }
    poll()
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    let timer
    const poll = async () => {
      try {
        const s = await api.vinculosStatus()
        setVincSync(s)
        if (s.status === 'rodando') timer = setTimeout(poll, 4000)
      } catch { /* silencioso */ }
    }
    poll()
    return () => clearTimeout(timer)
  }, [])

  const mapearCanais = async () => {
    if (!window.confirm('Isso lê o Bling produto a produto pra trazer imagem, custo e os canais de marketplace (o que a lista não traz) — pode levar ~30 min rodando em segundo plano. Pode continuar usando o sistema. Iniciar agora?')) return
    try {
      await api.vinculosEnriquecer()
      notify('Mapeamento de canais iniciado. Roda em segundo plano; os badges vão aparecendo conforme avança.', 'ok')
      setVincSync({ status: 'rodando', total: 0, processados: 0 })
      const poll = async () => {
        const s = await api.vinculosStatus()
        setVincSync(s)
        if (s.status === 'rodando') setTimeout(poll, 4000)
        else if (s.status === 'concluido') { notify(`Canais mapeados em ${s.total} produto(s).`, 'ok'); carregar() }
        else if (s.status === 'erro') notify('Erro no mapeamento de canais: ' + (s.erro || ''), 'danger')
      }
      setTimeout(poll, 3000)
    } catch (e) { notify(e.message, 'danger') }
  }

  const sincronizarShopee = async () => {
    try {
      await api.shopeeCatalogoSincronizar()
      notify('Sincronização da Shopee iniciada (pode levar alguns minutos)', 'ok')
      setShopeeSync({ status: 'rodando', total: 0 })
      const poll = async () => {
        const s = await api.shopeeCatalogoStatus()
        setShopeeSync(s)
        if (s.status === 'rodando') setTimeout(poll, 3000)
        else if (s.status === 'concluido') notify(`Shopee sincronizada: ${s.total} anúncios`, 'ok')
        else if (s.status === 'erro') notify('Erro ao sincronizar Shopee: ' + (s.erro || ''), 'danger')
      }
      setTimeout(poll, 2500)
    } catch (e) { notify(e.message, 'danger') }
  }

  const carregar = () => {
    setItens(null); setErro('')
    api.monitoramento({ canal })
      .then((d) => {
        const its = d.itens || []
        setItens(its)
        api.catalogoVendas().then((v) => {
          const mapa = v.vendas || {}
          setItens((cur) => (cur || its).map((i) => ({ ...i, vendas: mapa[i.sku] || 0 })))
        }).catch(() => {})
      })
      .catch((e) => setErro(e.message))
  }
  useEffect(carregar, [canal])

  const ajustarMassa = async () => {
    const v = Number(String(ajValor).replace(',', '.'))
    if (Number.isNaN(v) || v <= 0) { notify('Informe um valor de ajuste válido.', 'danger'); return }
    const ids = [...sel]
    if (!ids.length) return
    const resumo = `${ajDir === 'mais' ? 'Aumentar' : 'Diminuir'} o Preço Bling de ${ids.length} produto(s) em ${ajModo === 'pct' ? v + '%' : 'R$ ' + v.toFixed(2)}? Isso grava no Bling.`
    if (!window.confirm(resumo)) return
    setAjLoading(true)
    try {
      const r = await api.catalogoAjustarPrecos({ ids, modo: ajModo, direcao: ajDir, valor: v })
      notify(`${r.aplicados} de ${r.total} preço(s) ajustado(s) no Bling.`, r.aplicados ? 'ok' : 'warn')
      setAjValor(''); setSel(new Set()); carregar()
    } catch (e) { notify('Falha no ajuste: ' + (e.message || ''), 'danger') }
    setAjLoading(false)
  }

  const contagem = useMemo(() => {
    const c = { todos: (itens || []).length, lucro_ideal: 0, atencao: 0, critico: 0 }
    ;(itens || []).forEach((i) => { c[i.status] = (c[i.status] || 0) + 1 })
    return c
  }, [itens])

  const [kpiHist, setKpiHist] = useState([])
  const kpiSnapEnviado = useRef(false)

  const kpis = useMemo(() => {
    const its = itens || []
    let saud = 0, aten = 0, prej = 0, semCusto = 0, valEstoque = 0
    const margens = []
    const canalCount = {}
    for (const i of its) {
      if (i.status === 'lucro_ideal') saud++
      else if (i.status === 'atencao') aten++
      else if (i.status === 'critico') prej++
      if (!(i.custo > 0) || i.status === 'sem_custo') semCusto++
      if (i.custo > 0 && i.estoque > 0) valEstoque += i.custo * i.estoque
      if (i.margem_real != null && Number.isFinite(Number(i.margem_real))) margens.push(Number(i.margem_real))
      for (const m of (i.marketplaces || [])) if (m.publicado && m.canal) canalCount[m.canal] = (canalCount[m.canal] || 0) + 1
    }
    // mediana: robusta a outliers (um produto com custo absurdo não detona a métrica)
    let margMedia = null
    if (margens.length) {
      const ord = margens.slice().sort((a, b) => a - b)
      const mid = Math.floor(ord.length / 2)
      margMedia = ord.length % 2 ? ord[mid] : (ord[mid - 1] + ord[mid]) / 2
    }
    const semAnuncio = its.filter((i) => !((i.marketplaces || []).some((m) => m.publicado))).length
    const total = its.length || 1
    const cobertura = Object.entries(canalCount).map(([c, n]) => ({ canal: c, n, pct: (n / total) * 100 }))
      .sort((a, b) => b.n - a.n).slice(0, 4)
    return { total: its.length, saud, aten, prej, semCusto, valEstoque, margMedia, cobertura, semAnuncio }
  }, [itens])

  // histórico de KPIs (alimenta a tendência e os sparklines do topo)
  useEffect(() => {
    let vivo = true
    api.kpiHistorico(30).then((d) => { if (vivo) setKpiHist(d.pontos || []) }).catch(() => {})
    return () => { vivo = false }
  }, [])

  // foto de hoje dos KPIs — uma vez por carga, quando o catálogo já tem números
  useEffect(() => {
    if (kpiSnapEnviado.current || !kpis || kpis.total <= 0) return
    kpiSnapEnviado.current = true
    api.kpiSnapshot({ total: kpis.total, saud: kpis.saud, aten: kpis.aten, prej: kpis.prej, semCusto: kpis.semCusto, valEstoque: kpis.valEstoque, margMedia: kpis.margMedia, cobertura: kpis.cobertura })
      .then(() => api.kpiHistorico(30)).then((d) => { if (d) setKpiHist(d.pontos || []) })
      .catch(() => {})
  }, [kpis])

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase()
    return (itens || []).filter((i) =>
      (filtro === 'todos' || i.status === filtro) &&
      (!q || (i.nome || '').toLowerCase().includes(q) || (i.sku || '').toLowerCase().includes(q)))
  }, [itens, busca, filtro])

  // volta pra página 1 quando muda filtro/busca/canal ou o tamanho da página
  useEffect(() => { setPagina(1) }, [busca, filtro, canal, porPagina])
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina))
  const pageSafe = Math.min(pagina, totalPaginas)
  const paginados = useMemo(
    () => filtrados.slice((pageSafe - 1) * porPagina, pageSafe * porPagina),
    [filtrados, pageSafe, porPagina])
  const ini = filtrados.length ? (pageSafe - 1) * porPagina + 1 : 0
  const fim = Math.min(pageSafe * porPagina, filtrados.length)

  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const todosMarcados = paginados.length > 0 && paginados.every((i) => sel.has(i.id))
  const toggleTodos = () => setSel((s) => {
    const n = new Set(s)
    if (paginados.every((i) => n.has(i.id))) paginados.forEach((i) => n.delete(i.id))
    else paginados.forEach((i) => n.add(i.id))
    return n
  })

  const aplicarLote = async () => {
    const escolhidos = (itens || []).filter((i) => sel.has(i.id))
    if (escolhidos.length === 0) return
    setAplicando(true)
    try {
      const r = await api.precificarLote({
        custos_globais: DEFAULT_CUSTOS, canal: 'mercadolivre', aplicar: true,
        itens: escolhidos.map((i) => ({ produto_id: i.id, custo: i.custo })),
      })
      const ok = r.itens.filter((x) => x.aplicado).length
      notify(`${ok} de ${escolhidos.length} preços atualizados no Bling`, ok ? 'ok' : 'warn')
      setSel(new Set()); carregar()
    } catch (e) { notify(e.message, 'danger') }
    setAplicando(false)
  }

  const aplicarLoteIa = async (campo) => {
    const ids = (itens || []).filter((i) => sel.has(i.id)).map((i) => i.id)
    if (ids.length === 0) return
    setLoteIa(campo)
    try {
      const r = await api.loteIa({ produto_ids: ids, campo, aplicar: true })
      notify(`IA: ${r.ok} de ${r.total} ${campo === 'titulo' ? 'títulos' : 'descrições'} gravados no Bling`, r.ok ? 'ok' : 'warn')
      setSel(new Set())
    } catch (e) { notify(e.message, 'danger') }
    setLoteIa(null)
  }

  if (!itens && !erro) return <Skeleton />
  if (erro || (itens && itens.length === 0)) return <SemDados />

  const chips = [
    { id: 'todos', label: 'Todos', cor: 'var(--accent)' },
    { id: 'lucro_ideal', label: 'Saudável', cor: 'var(--ok)' },
    { id: 'atencao', label: 'Atenção', cor: 'var(--warn)' },
    { id: 'critico', label: 'Prejuízo', cor: 'var(--danger)' },
    { id: 'sem_custo', label: 'Sem custo', cor: 'var(--text-faint)' },
  ]

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="glass rounded-xl flex items-center gap-2 px-3 py-2 flex-1 min-w-[200px]">
          <Search size={16} className="text-faint" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou SKU…"
                 className="bg-transparent outline-none text-sm flex-1 text-fg" />
        </div>
        <div className="glass rounded-xl flex items-center gap-1 p-1 flex-wrap">
          {canaisDisp.map((c) => (
            <button key={c.id} onClick={() => setCanal(c.id)}
                    className="text-xs px-3 py-1.5 rounded-lg transition font-medium"
                    style={canal === c.id ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--dim)' }}>
              {c.nome}
            </button>
          ))}
        </div>
        <button onClick={carregar} className="glass rounded-xl px-3 py-2 text-sm flex items-center gap-2 text-dim hover:text-fg">
          <RefreshCw size={15} /> Atualizar
        </button>
        <button onClick={sincronizarTudo} disabled={syncStatus?.status === 'rodando'}
                className="rounded-xl px-3 py-2 text-sm flex items-center gap-2 disabled:opacity-70"
                style={{ background: 'rgba(230,180,80,.12)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
          <Database size={15} /> {syncStatus?.status === 'rodando' ? 'Sincronizando…' : 'Sincronizar catálogo completo'}
        </button>
        <button onClick={sincronizarShopee} disabled={shopeeSync?.status === 'rodando'}
                className="rounded-xl px-3 py-2 text-sm flex items-center gap-2 disabled:opacity-70"
                style={{ background: 'rgba(238,77,45,.12)', color: '#EE4D2D', border: '1px solid #EE4D2D' }}>
          <Database size={15} /> {shopeeSync?.status === 'rodando' ? 'Sincronizando Shopee…' : 'Sincronizar Shopee'}
        </button>
        <button onClick={mapearCanais} disabled={vincSync?.status === 'rodando'}
                className="rounded-xl px-3 py-2 text-sm flex items-center gap-2 disabled:opacity-70"
                style={{ background: 'rgba(123,42,140,.14)', color: 'var(--accent2)', border: '1px solid var(--accent2)' }}
                title="Lê o Bling produto a produto pra trazer imagem, custo e em quais marketplaces cada um está anunciado — o que a lista não traz (~30 min, em segundo plano)">
          <Plug size={15} /> {vincSync?.status === 'rodando' ? `Carregando… ${vincSync.processados}/${vincSync.total}` : 'Carregar imagens, custos e canais'}
        </button>
      </div>

      {syncStatus && syncStatus.status !== 'ocioso' && (
        <div className="glass rounded-xl px-4 py-2.5 text-sm flex items-center gap-3"
             style={{ border: `1px solid ${syncStatus.status === 'erro' ? 'var(--danger)' : 'var(--accent2)'}` }}>
          {syncStatus.status === 'rodando' && <Loader2 size={15} className="animate-spin" style={{ color: 'var(--accent2)' }} />}
          <span className="flex-1">
            {syncStatus.status === 'rodando' && <>Puxando o catálogo do Bling… <b className="num">{syncStatus.total}</b> produtos no servidor (página {syncStatus.paginas}).</>}
            {syncStatus.status === 'concluido' && <>Catálogo sincronizado: <b className="num">{syncStatus.total}</b> produtos no servidor. As alterações agora chegam por webhook.</>}
            {syncStatus.status === 'erro' && <span style={{ color: 'var(--danger)' }}>Erro na sincronização: {syncStatus.erro}</span>}
          </span>
        </div>
      )}

      {shopeeSync && shopeeSync.status !== 'ocioso' && (
        <div className="glass rounded-xl px-4 py-2.5 text-sm flex items-center gap-3"
             style={{ border: `1px solid ${shopeeSync.status === 'erro' ? 'var(--danger)' : '#EE4D2D'}` }}>
          {shopeeSync.status === 'rodando' && <Loader2 size={15} className="animate-spin" style={{ color: '#EE4D2D' }} />}
          <span className="flex-1">
            {shopeeSync.status === 'rodando' && <>Lendo o catálogo da Shopee… <b className="num">{shopeeSync.total}</b> anúncios no cache.</>}
            {shopeeSync.status === 'concluido' && <>Shopee sincronizada: <b className="num">{shopeeSync.total}</b> anúncios (preços e promoções). Isso alimenta a Promoção no cockpit.</>}
            {shopeeSync.status === 'erro' && <span style={{ color: 'var(--danger)' }}>Erro ao sincronizar Shopee: {shopeeSync.erro}</span>}
          </span>
        </div>
      )}

      {vincSync && vincSync.status !== 'ocioso' && (
        <div className="glass rounded-xl px-4 py-2.5 text-sm flex items-center gap-3"
             style={{ border: `1px solid ${vincSync.status === 'erro' ? 'var(--danger)' : 'var(--accent2)'}` }}>
          {vincSync.status === 'rodando' && <Loader2 size={15} className="animate-spin" style={{ color: 'var(--accent2)' }} />}
          <span className="flex-1">
            {vincSync.status === 'rodando' && <>Lendo o Bling produto a produto… <b className="num">{vincSync.processados}</b> de <b className="num">{vincSync.total}</b>. Imagens, custos e badges de marketplace vão aparecendo. Pode continuar usando o sistema.</>}
            {vincSync.status === 'concluido' && <>Concluído em <b className="num">{vincSync.total}</b> produtos: imagens, custos e badges de marketplace agora aparecem na lista.</>}
            {vincSync.status === 'erro' && <span style={{ color: 'var(--danger)' }}>Erro no mapeamento: {vincSync.erro} — pode rodar de novo, ele recomeça do zero.</span>}
          </span>
        </div>
      )}

      {/* Dashboard de catálogo (KPIs agregados) */}
      <PainelKpis kpis={kpis} hist={kpiHist} brl={brl} onSemCusto={() => setFiltro('sem_custo')} />

      {/* Faixa de oportunidades */}
      {(kpis.prej > 0 || kpis.semAnuncio > 0 || kpis.semCusto > 0) && (
        <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-3 flex-wrap" style={{ border: '1px solid var(--accent2)', background: 'linear-gradient(90deg, rgba(123,42,140,.08), transparent)' }}>
          <Wand2 size={16} className="shrink-0" style={{ color: 'var(--accent2)' }} />
          <span className="text-[13px] text-dim">
            <b className="text-fg">Oportunidades:</b>{' '}
            {kpis.prej > 0 && <button onClick={() => setFiltro('critico')} className="hover:underline" style={{ color: 'var(--danger)' }}>{kpis.prej} no prejuízo</button>}
            {kpis.prej > 0 && (kpis.semAnuncio > 0 || kpis.semCusto > 0) && <span className="text-faint"> · </span>}
            {kpis.semAnuncio > 0 && <span style={{ color: 'var(--warn)' }}>{kpis.semAnuncio} sem anúncio</span>}
            {kpis.semAnuncio > 0 && kpis.semCusto > 0 && <span className="text-faint"> · </span>}
            {kpis.semCusto > 0 && <button onClick={() => setFiltro('sem_custo')} className="hover:underline" style={{ color: 'var(--dim)' }}>{kpis.semCusto} sem custo</button>}
          </span>
        </div>
      )}

      {/* Filtros por status */}
      <div className="flex flex-wrap gap-2">
        {chips.map((ch) => {
          const on = filtro === ch.id
          return (
            <button key={ch.id} onClick={() => setFiltro(ch.id)}
                    className="text-xs rounded-lg px-3 py-1.5 border flex items-center gap-2 transition"
                    style={on ? { borderColor: ch.cor, background: ch.cor + '1a', color: ch.cor }
                              : { borderColor: 'var(--glass-border)', color: 'var(--dim)' }}>
              <span className="h-2 w-2 rounded-full" style={{ background: ch.cor }} />
              {ch.label} <span className="num opacity-70">{contagem[ch.id] || 0}</span>
            </button>
          )
        })}
      </div>

      {/* Barra de ação em massa */}
      {sel.size > 0 && (
        <div className="rounded-xl px-4 py-3 flex flex-col gap-3" style={{ background: 'var(--glass-hover)', border: '1px solid var(--accent)' }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm flex items-center gap-2 flex-wrap">
              <Zap size={15} className="text-accent" /> <b className="num">{sel.size}</b> selecionado(s)
              {todosMarcados && filtrados.length > sel.size && (
                <button onClick={() => setSel(new Set(filtrados.map((i) => i.id)))}
                        className="text-xs text-accent hover:underline">
                  selecionar todos os {filtrados.length}
                </button>
              )}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setSel(new Set())} className="text-xs text-dim hover:text-fg flex items-center gap-1"><X size={13} /> limpar</button>
              <button disabled={loteIa || aplicando} onClick={() => aplicarLoteIa('titulo')}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 disabled:opacity-60"
                      style={{ background: 'rgba(79,227,201,.12)', color: 'var(--accent2)', border: '1px solid var(--accent2)' }}>
                <Wand2 size={14} /> {loteIa === 'titulo' ? 'Gerando…' : 'Títulos IA'}
              </button>
              <button disabled={loteIa || aplicando} onClick={() => aplicarLoteIa('descricao')}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 disabled:opacity-60"
                      style={{ background: 'rgba(201,160,255,.12)', color: '#C9A0FF', border: '1px solid #C9A0FF' }}>
                <Wand2 size={14} /> {loteIa === 'descricao' ? 'Gerando…' : 'Descrições IA'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <span className="text-xs text-faint">Ajustar Preço Bling:</span>
            <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
              <button onClick={() => setAjDir('mais')} className="px-2.5 py-1 text-xs font-medium" style={ajDir === 'mais' ? { background: 'var(--ok)', color: '#06281f' } : { color: 'var(--dim)' }}>+ aumentar</button>
              <button onClick={() => setAjDir('menos')} className="px-2.5 py-1 text-xs font-medium" style={ajDir === 'menos' ? { background: 'var(--danger)', color: '#2a0d0d' } : { color: 'var(--dim)' }}>− diminuir</button>
            </div>
            <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
              <button onClick={() => setAjModo('pct')} className="px-2.5 py-1 text-xs font-medium" style={ajModo === 'pct' ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--dim)' }}>%</button>
              <button onClick={() => setAjModo('fixo')} className="px-2.5 py-1 text-xs font-medium" style={ajModo === 'fixo' ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--dim)' }}>R$</button>
            </div>
            <input value={ajValor} onChange={(e) => setAjValor(e.target.value)} placeholder={ajModo === 'pct' ? 'ex: 10' : 'ex: 5,00'}
                   className="w-24 bg-transparent outline-none text-sm num px-2 py-1 rounded-lg text-fg" style={{ border: '1px solid var(--glass-border)' }} />
            <button onClick={ajustarMassa} disabled={ajLoading}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60 flex items-center gap-1.5" style={{ background: 'var(--accent)' }}>
              {ajLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Aplicar a {sel.size}
            </button>
          </div>
        </div>
      )}

      {/* Aviso: imagens/custos não vêm da lista do Bling — precisam de um job */}
      {itens && itens.length > 0 && itens.filter((i) => !i.imagem).length > itens.length * 0.4 && (
        <div className="glass rounded-xl px-4 py-2.5 text-sm flex items-start gap-2" style={{ border: '1px solid var(--accent2)' }}>
          <ImageOff size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--accent2)' }} />
          <span className="text-dim">
            Muitos produtos ainda <b className="text-fg">sem imagem/custo</b>. A lista do Bling não traz isso — só vem lendo produto a produto. Clique em <b className="text-fg">Sincronizar Shopee</b> (imagens e badges Shopee na hora, pelos anúncios da loja) ou em <b className="text-fg">Carregar imagens, custos e canais</b> (catálogo inteiro, ~30 min em segundo plano).
          </span>
        </div>
      )}

      {/* Lista + cockpit lado a lado (split não-bloqueante, igual ao Pedidos & Financeiro) */}
      <div className={cockpit ? 'grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(440px,520px)] gap-4 items-start' : ''}>
        <div className="min-w-0">
          {/* Tabela */}
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-faint text-[10px] uppercase tracking-wide border-b" style={{ borderColor: 'var(--glass-border)' }}>
              <th className="px-4 py-3 w-8">
                <input type="checkbox" checked={todosMarcados} onChange={toggleTodos} />
              </th>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Canais</th>
              <th className="px-4 py-3 text-right">Custo</th>
              <th className="px-4 py-3 text-right">Estoque</th>
              <th className="px-4 py-3 text-right">Vendas 30d</th>
              <th className="px-4 py-3 text-right">Preço Bling</th>
              {canal !== 'bling' && <th className="px-4 py-3 text-right">Pra netar</th>}
              <th className="px-4 py-3 text-right">Margem real</th>
              <th className="px-4 py-3">Sinal</th>
              <th className="px-4 py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {paginados.map((i) => {
              const s = STATUS[i.status] || STATUS.atencao
              const delta = (i.pra_netar || 0) - (i.preco_bling || 0)
              return (
                <tr key={i.id} className="border-b transition hover:bg-[var(--glass-hover)]" style={{ borderColor: 'var(--glass-border)' }}>
                  <td className="px-4 py-3"><input type="checkbox" checked={sel.has(i.id)} onChange={() => toggle(i.id)} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {i.imagem
                        ? <img src={i.imagem} alt="" className="w-10 h-10 rounded-lg object-cover flex-none" style={{ border: '1px solid var(--glass-border)' }} onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
                        : <div className="w-10 h-10 rounded-lg flex-none grid place-items-center text-faint" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)' }}><ImageOff size={15} /></div>}
                      <div className="min-w-0">
                        <button onClick={() => setCockpit(i)} className="font-medium text-left hover:text-accent transition block leading-snug">
                          {i.nome}
                        </button>
                        <div className="text-[11px] text-faint num">{i.sku}{desde(i.atualizado) ? <span className="ml-1.5">· alterado {desde(i.atualizado)}</span> : null}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const pubs = (i.marketplaces || []).filter((m) => m.publicado)
                      if (!pubs.length) return <span className="text-[9px] font-semibold px-2 py-0.5 rounded" style={{ border: '1px dashed var(--glass-border)', color: 'var(--text-faint)' }}>sem anúncio</span>
                      return (
                        <div className="flex flex-col gap-1" style={{ minWidth: 138 }}>
                          {pubs.map((m) => {
                            const mk = MK[m.canal] || { nome: m.nome || m.canal, cor: 'var(--dim)', bg: 'var(--glass-hover)' }
                            const f = m.preco > 0 ? FLAG_CANAL[m.flag] : null
                            return (
                              <div key={m.canal} className="flex items-center gap-1.5">
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-none" style={{ background: mk.bg, color: mk.cor }}>{mk.nome}</span>
                                {m.preco > 0
                                  ? <span className="num text-[11px] font-semibold" style={{ color: f ? f.cor : 'var(--text)' }}>{brl(m.preco)}</span>
                                  : <span className="text-[10px] text-faint" title="Preço deste canal ainda não disponível (vem com a API direta do canal)">—</span>}
                                {f && <span title={f.txt} className="flex-none inline-flex"><f.Icon size={11} style={{ color: f.cor }} /></span>}
                                {m.promo && <span className="text-[8px] font-bold px-1 rounded flex-none" style={{ background: 'rgba(238,77,45,.16)', color: '#EE4D2D' }}>promo</span>}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3 num text-dim text-right">{i.custo > 0 ? brl(i.custo) : '—'}</td>
                  <td className="px-4 py-3 num text-right">{i.estoque != null ? Math.round(i.estoque) : '—'}</td>
                  <td className="px-4 py-3 num text-right" style={{ color: i.vendas > 0 ? 'var(--ok)' : 'var(--text-faint)' }}>{i.vendas || 0}</td>
                  <td className="px-4 py-3 num font-medium text-right" style={{ color: '#c98bd8' }}>{brl(i.preco_bling)}</td>
                  {canal !== 'bling' && (
                    <td className="px-4 py-3 text-right">
                      <span className="num text-accent font-medium">{i.pra_netar != null ? brl(i.pra_netar) : '—'}</span>
                      {i.pra_netar != null && Math.abs(delta) >= 0.01 && (
                        <span className="num text-[11px] text-faint ml-1">({delta > 0 ? '+' : '−'}{brl(Math.abs(delta)).replace('R$ ', '')})</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <div className="num font-semibold" style={{ color: i.margem_real != null ? s.cor : 'var(--text-faint)' }}>
                      {i.margem_real != null ? `${Number(i.margem_real).toFixed(1)}%` : 'sem custo'}
                    </div>
                    {i.margem_real != null && (
                      <div className="rounded-full overflow-hidden ml-auto mt-1" style={{ height: 4, width: 54, background: 'rgba(255,255,255,.07)' }}>
                        <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, Number(i.margem_real)))}%`, background: s.cor, borderRadius: 99 }} />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: s.cor + '26', color: s.cor }}>{s.txt}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setCockpit(i)} className="text-sm text-accent hover:underline inline-flex items-center gap-1">
                      <PanelRight size={14} /> Abrir
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtrados.length === 0 && (
              <tr><td colSpan={canal !== 'bling' ? 11 : 10} className="px-4 py-10 text-center text-dim text-sm">Nenhum produto neste filtro.</td></tr>
            )}
          </tbody>
        </table>
      </div>

          {/* Paginação (igual ao Pedidos & Financeiro) */}
          {filtrados.length > 0 && (
            <div className="mt-1">
              <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-faint num px-1">
                <span>{ini}–{fim} de {filtrados.length} produto(s)</span>
                <label className="flex items-center gap-1.5">
                  <span>por página</span>
                  <select value={porPagina} onChange={(e) => setPorPagina(Number(e.target.value))}
                          className="glass rounded-lg px-2 py-1 text-xs num outline-none">
                    {[25, 50, 100, 200, 500].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
              </div>
              <Paginacao page={pageSafe} total={totalPaginas} onIr={setPagina} />
              <div className="text-center text-[11px] text-faint num mt-2">{filtrados.length} produto(s) · página {pageSafe} de {totalPaginas}</div>
            </div>
          )}
        </div>

        {cockpit && (
          <div className="xl:sticky xl:top-4">
            <CockpitProduto produto={cockpit} canalSel={canal} notify={notify}
              onClose={() => setCockpit(null)}
              onEditarCompleto={() => { const id = cockpit.id; setCockpit(null); setAbrir(id) }}
              onRadar={() => { const p = cockpit; setCockpit(null); setDrawer(p) }}
              onSaved={() => { setCockpit(null); carregar() }} />
          </div>
        )}
      </div>
      {drawer && <RadarDrawer produto={drawer} onClose={() => setDrawer(null)} />}
      {abrir && <ProdutoModal produtoId={abrir} onClose={() => setAbrir(null)} onSaved={carregar} />}
    </div>
  )
}

function Tile({ label, val, cor, small }) {
  return (
    <div className="rounded-lg px-2.5 py-2" style={{ background: 'rgba(0,0,0,.18)', border: '1px solid var(--glass-border)' }}>
      <div className="text-[8.5px] uppercase tracking-wide text-faint">{label}</div>
      <div className={`num font-bold mt-0.5 ${small ? 'text-[13px]' : 'text-base'}`} style={cor ? { color: cor } : undefined}>{val}</div>
    </div>
  )
}

function Linha({ k, v, cor, bold }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-dim">{k}</span>
      <span className={`num ${bold ? 'font-bold' : ''}`} style={cor ? { color: cor } : undefined}>{v}</span>
    </div>
  )
}

function MiniSpark({ pontos, cor = 'var(--accent)', w = 64, h = 20 }) {
  const ys = (pontos || []).map((p) => Number(p.preco)).filter(Number.isFinite)
  if (ys.length < 2) return null
  const min = Math.min(...ys), max = Math.max(...ys), rng = max - min || 1
  const sx = (i) => (i / (ys.length - 1)) * w
  const sy = (v) => h - 2 - ((v - min) / rng) * (h - 4)
  const d = ys.map((v, i) => `${i ? 'L' : 'M'} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <path d={d} fill="none" stroke={cor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Sparkline({ pontos, cor = 'var(--accent)', w = 132, h = 36 }) {
  const pts = (pontos || []).filter((p) => p && p.preco != null)
  if (pts.length < 2) return null
  const ys = pts.map((p) => Number(p.preco))
  const minY = Math.min(...ys), maxY = Math.max(...ys), rng = (maxY - minY) || 1, pad = 3
  const sx = (i) => pad + (i / (pts.length - 1)) * (w - 2 * pad)
  const sy = (v) => h - pad - ((v - minY) / rng) * (h - 2 * pad)
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(1)} ${sy(ys[i]).toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-none">
      <path d={d} fill="none" stroke={cor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PrecoChart({ pontos, w = 540, h = 84 }) {
  const pts = (pontos || []).filter((p) => p && p.preco != null)
  if (pts.length < 2) return null
  const ys = pts.map((p) => Number(p.preco))
  const minY = Math.min(...ys), maxY = Math.max(...ys), rng = (maxY - minY) || (maxY * 0.08) || 1, pad = 6, base = h - 14
  const sx = (i) => pad + (i / (pts.length - 1)) * (w - 2 * pad)
  const sy = (v) => base - ((v - minY) / rng) * (base - 10)
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(1)} ${sy(ys[i]).toFixed(1)}`).join(' ')
  const area = `${line} L ${sx(pts.length - 1).toFixed(1)} ${base} L ${sx(0).toFixed(1)} ${base} Z`
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={area} fill="rgba(214,0,127,.12)" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={sx(pts.length - 1).toFixed(1)} cy={sy(ys[ys.length - 1]).toFixed(1)} r="3" fill="var(--accent)" />
    </svg>
  )
}

function CockpitProduto({ produto, onClose, onEditarCompleto, onRadar, onSaved, notify }) {
  const [precoBling, setPrecoBling] = useState(String(produto.preco_bling ?? '').replace('.', ','))
  const [salvando, setSalvando] = useState(false)
  const [aba, setAba] = useState('visao')
  const [precoCanalEdit, setPrecoCanalEdit] = useState({})
  const [simCanal, setSimCanal] = useState({})
  const simTimers = useRef({})
  const [promoPreco, setPromoPreco] = useState('')
  const [promoModo, setPromoModo] = useState('preco')
  const [promoDesc, setPromoDesc] = useState('')
  const [promoSim, setPromoSim] = useState(null)
  const [simulandoPromo, setSimulandoPromo] = useState(false)
  const [radarPreco, setRadarPreco] = useState('')
  const [radarSim, setRadarSim] = useState(null)

  // edição manual por canal com simulação de líquido/margem ao vivo (debounced)
  const editarCanalPreco = (rowKey, canal, val) => {
    setPrecoCanalEdit((m) => ({ ...m, [rowKey]: val }))
    clearTimeout(simTimers.current[rowKey])
    const v = Number(String(val).replace(',', '.'))
    if (!v || v <= 0) { setSimCanal((m) => ({ ...m, [rowKey]: undefined })); return }
    simTimers.current[rowKey] = setTimeout(async () => {
      try { const d = await api.produtoSimular(produto.id, canal, v); setSimCanal((m) => ({ ...m, [rowKey]: d })) }
      catch { setSimCanal((m) => ({ ...m, [rowKey]: undefined })) }
    }, 350)
  }
  const [sinc, setSinc] = useState(null)
  const [carregandoSinc, setCarregandoSinc] = useState(true)
  const [aplicandoCanal, setAplicandoCanal] = useState(null)
  const [confirmarCanal, setConfirmarCanal] = useState(null)
  const [radarData, setRadarData] = useState(null)
  const [carregandoRadar, setCarregandoRadar] = useState(true)
  const [qual, setQual] = useState(null)
  const [carregandoQual, setCarregandoQual] = useState(false)
  const [anatomia, setAnatomia] = useState(null)
  const [anatCanal, setAnatCanal] = useState('shopee')
  const [mlSnap, setMlSnap] = useState(null)
  const [mlFotoUrl, setMlFotoUrl] = useState('')
  const [mlEan, setMlEan] = useState('')
  const [mlPeso, setMlPeso] = useState('')
  const [mlDesc, setMlDesc] = useState('')
  const [mlQualBusy, setMlQualBusy] = useState('')
  const [mlRadarFull, setMlRadarFull] = useState(null)
  const [carregandoMlRadar, setCarregandoMlRadar] = useState(false)
  const [mNome, setMNome] = useState('')
  const [mPreco, setMPreco] = useState('')
  const [salvandoManual, setSalvandoManual] = useState(false)

  const recarregarRadar = () => {
    setCarregandoRadar(true)
    api.radarHistorico(produto.sku, 14)
      .then((d) => setRadarData(d))
      .catch(() => setRadarData(null))
      .finally(() => setCarregandoRadar(false))
  }
  useEffect(() => {
    let vivo = true
    setCarregandoRadar(true)
    api.radarHistorico(produto.sku, 14)
      .then((d) => { if (vivo) setRadarData(d) })
      .catch(() => { if (vivo) setRadarData(null) })
      .finally(() => { if (vivo) setCarregandoRadar(false) })
    return () => { vivo = false }
  }, [produto.sku])

  const adicionarConcorrenteManual = async () => {
    const nome = mNome.trim()
    const preco = Number(String(mPreco).replace(',', '.'))
    if (!nome) { notify('Dê um nome ao concorrente (ex.: "Loja Aviamentos X").', 'danger'); return }
    if (!preco || preco <= 0) { notify('Informe o preço do concorrente.', 'danger'); return }
    setSalvandoManual(true)
    try {
      await api.radarManual({ sku: produto.sku, nome, preco, marketplace: 'shopee' })
      notify(`Concorrente "${nome}" adicionado ao radar a ${brl(preco)}.`, 'ok')
      setMNome(''); setMPreco('')
      recarregarRadar()
    } catch (e) { notify('Não consegui adicionar: ' + (e.message || ''), 'danger') }
    setSalvandoManual(false)
  }

  const [shopeeItem, setShopeeItem] = useState(null)
  const [carregandoShopee, setCarregandoShopee] = useState(true)

  useEffect(() => {
    let vivo = true
    setCarregandoShopee(true)
    api.shopeeItem(produto.sku)
      .then((d) => { if (vivo) setShopeeItem(d && d.item_id ? d : null) })
      .catch(() => { if (vivo) setShopeeItem(null) })
      .finally(() => { if (vivo) setCarregandoShopee(false) })
    return () => { vivo = false }
  }, [produto.sku])

  // snapshot direto do Mercado Livre (Funil, Radar e tarifa real) — best-effort, some se não conectado
  useEffect(() => {
    let vivo = true
    api.produtoMercadolivre(produto.id)
      .then((d) => { if (vivo) setMlSnap(d) })
      .catch(() => { if (vivo) setMlSnap(null) })
    return () => { vivo = false }
  }, [produto.id])

  // ações rápidas de qualidade no anúncio do Mercado Livre (gravam direto pela API)
  const mlItemId = () => mlSnap?.item?.item_id
  const salvarMlFoto = async () => {
    const url = mlFotoUrl.trim(); const id = mlItemId()
    if (!url || !id) { notify('Cole a URL da imagem.', 'danger'); return }
    setMlQualBusy('foto')
    try { const r = await api.mlAddFoto(id, url); notify(`Foto adicionada ao anúncio${r.n_fotos ? ` (${r.n_fotos} no total)` : ''}.`, 'ok'); setMlFotoUrl('') }
    catch (e) { notify('Mercado Livre recusou a foto: ' + (e.message || ''), 'danger') }
    setMlQualBusy('')
  }
  const salvarMlFicha = async () => {
    const id = mlItemId()
    if (!id || (!mlEan.trim() && !mlPeso.trim())) { notify('Informe o EAN ou o peso.', 'danger'); return }
    setMlQualBusy('ficha')
    try { await api.mlFicha(id, mlEan.trim(), mlPeso.trim()); notify('Ficha atualizada no anúncio.', 'ok') }
    catch (e) { notify('Mercado Livre recusou a ficha: ' + (e.message || ''), 'danger') }
    setMlQualBusy('')
  }
  const sugerirMlDesc = async () => {
    setMlQualBusy('ia')
    try { const r = await api.iaDescricao({ nome_produto: produto.nome || produto.descricao || produto.sku }); setMlDesc(r.descricao_gerada || '') }
    catch (e) { notify('Não consegui gerar: ' + (e.message || ''), 'danger') }
    setMlQualBusy('')
  }
  const salvarMlDesc = async () => {
    const txt = mlDesc.trim(); const id = mlItemId()
    if (!txt || !id) { notify('Escreva ou gere a descrição.', 'danger'); return }
    setMlQualBusy('desc')
    try { await api.mlDescricao(id, txt); notify('Descrição salva no Mercado Livre.', 'ok') }
    catch (e) { notify('Mercado Livre recusou a descrição: ' + (e.message || ''), 'danger') }
    setMlQualBusy('')
  }

  const [reviews, setReviews] = useState(null)
  const [carregandoReviews, setCarregandoReviews] = useState(false)
  const [mostrarReviews, setMostrarReviews] = useState(false)
  const [precoHist, setPrecoHist] = useState(null)
  const [carregandoHist, setCarregandoHist] = useState(false)
  const [mostrarHist, setMostrarHist] = useState(false)
  const verHist = async () => {
    if (mostrarHist) { setMostrarHist(false); return }
    setMostrarHist(true)
    if (precoHist !== null) return
    setCarregandoHist(true)
    try { const d = await api.precoHistorico(produto.id, 60); setPrecoHist(d.pontos || []) }
    catch { setPrecoHist([]) }
    setCarregandoHist(false)
  }
  const verReviews = async () => {
    if (mostrarReviews) { setMostrarReviews(false); return }
    setMostrarReviews(true)
    if (reviews !== null || !(shopeeItem && shopeeItem.item_id)) return
    setCarregandoReviews(true)
    try {
      const d = await api.shopeeItemAvaliacoes(shopeeItem.item_id)
      const lista = (d && d.response && d.response.item_comment_list) || (d && d.item_comment_list) || []
      setReviews(lista)
    } catch { setReviews([]) }
    setCarregandoReviews(false)
  }

  useEffect(() => {
    let vivo = true
    setCarregandoSinc(true)
    api.produtoSincronizacao(produto.id)
      .then((d) => { if (vivo) setSinc(d) })
      .catch(() => { if (vivo) setSinc({ vinculos: [] }) })
      .finally(() => { if (vivo) setCarregandoSinc(false) })
    return () => { vivo = false }
  }, [produto.id])

  // auto-carrega o histórico de Preço Bling (alimenta o gráfico da Visão geral)
  useEffect(() => {
    let vivo = true
    setCarregandoHist(true)
    api.precoHistorico(produto.id, 60)
      .then((d) => { if (vivo) setPrecoHist(d.pontos || []) })
      .catch(() => { if (vivo) setPrecoHist([]) })
      .finally(() => { if (vivo) setCarregandoHist(false) })
    return () => { vivo = false }
  }, [produto.id])

  // auto-carrega avaliações quando a aba é aberta
  useEffect(() => {
    if (aba !== 'aval') return
    if (reviews !== null) return
    if (!(shopeeItem && shopeeItem.item_id)) return
    let vivo = true
    setCarregandoReviews(true)
    api.shopeeItemAvaliacoes(shopeeItem.item_id)
      .then((d) => { const lista = (d && d.response && d.response.item_comment_list) || (d && d.item_comment_list) || []; if (vivo) setReviews(lista) })
      .catch(() => { if (vivo) setReviews([]) })
      .finally(() => { if (vivo) setCarregandoReviews(false) })
    return () => { vivo = false }
  }, [aba, shopeeItem, reviews])

  // carrega o diagnóstico de Qualidade quando a aba é aberta
  useEffect(() => {
    if (aba !== 'qual' || qual !== null) return
    let vivo = true
    setCarregandoQual(true)
    api.produtoQualidade(produto.id)
      .then((d) => { if (vivo) setQual(d) })
      .catch(() => { if (vivo) setQual({ erro: true }) })
      .finally(() => { if (vivo) setCarregandoQual(false) })
    return () => { vivo = false }
  }, [aba, qual, produto.id])

  // radar nativo do Mercado Livre — carrega ao abrir a aba Radar
  useEffect(() => {
    if (aba !== 'radar' || !mlSnap?.item?.item_id || mlRadarFull !== null) return
    let vivo = true
    setCarregandoMlRadar(true)
    api.mlRadar(mlSnap.item.item_id)
      .then((d) => { if (vivo) setMlRadarFull(d) })
      .catch(() => { if (vivo) setMlRadarFull({ erro: true }) })
      .finally(() => { if (vivo) setCarregandoMlRadar(false) })
    return () => { vivo = false }
  }, [aba, mlSnap, mlRadarFull])

  // anatomia do líquido (cascata) na aba Preço & Margem — simula o canal selecionado no preço de lista atual
  useEffect(() => {
    if (aba !== 'preco') return
    let lista = 0
    if (anatCanal === 'shopee') {
      if (!shopeeItem) { setAnatomia(null); return }
      lista = Number(shopeeItem.preco_original || shopeeItem.preco || 0)
    } else {
      const mlRow = (sinc?.canais_painel || []).find((c) => c.canal === 'mercadolivre')
      lista = Number(mlRow?.preco_registrado || mlSnap?.item?.preco || 0)
    }
    if (!lista || lista <= 0) { setAnatomia(null); return }
    let vivo = true
    api.produtoSimular(produto.id, anatCanal, lista)
      .then((d) => { if (vivo) setAnatomia({ ...d, lista }) })
      .catch(() => { if (vivo) setAnatomia(null) })
    return () => { vivo = false }
  }, [aba, anatCanal, shopeeItem, sinc, mlSnap, produto.id])

  // inicializa o preço de simulação da promoção com o preço atual da Shopee (ou Preço Bling)
  useEffect(() => {
    if (shopeeItem && promoPreco === '') {
      const p = shopeeItem.preco || produto.preco_bling || ''
      if (p) setPromoPreco(String(p).replace('.', ','))
    }
  }, [shopeeItem]) // eslint-disable-line

  // simula líquido/margem da promoção ao vivo (debounced)
  useEffect(() => {
    const v = Number(String(promoPreco).replace(',', '.'))
    if (!v || v <= 0) { setPromoSim(null); return }
    setSimulandoPromo(true)
    const t = setTimeout(async () => {
      try { const d = await api.produtoSimular(produto.id, 'shopee', v); setPromoSim(d) }
      catch { setPromoSim(null) }
      setSimulandoPromo(false)
    }, 350)
    return () => clearTimeout(t)
  }, [promoPreco, produto.id])

  // inicializa o preço do radar com o meu preço Shopee (ou o menor concorrente)
  useEffect(() => {
    if (radarData && radarPreco === '') {
      const est0 = radarData.estatisticas || {}
      const p = meuPreco || est0.menor || produto.preco_bling || ''
      if (p) setRadarPreco(String(p).replace('.', ','))
    }
  }, [radarData]) // eslint-disable-line

  // simula líquido/margem do preço do radar ao vivo (debounced)
  useEffect(() => {
    const v = Number(String(radarPreco).replace(',', '.'))
    if (!v || v <= 0) { setRadarSim(null); return }
    const t = setTimeout(async () => {
      try { const d = await api.produtoSimular(produto.id, 'shopee', v); setRadarSim(d) }
      catch { setRadarSim(null) }
    }, 350)
    return () => clearTimeout(t)
  }, [radarPreco, produto.id])

  const salvarPreco = async () => {
    const v = Number(String(precoBling).replace(',', '.'))
    if (Number.isNaN(v) || v < 0) { notify('Informe um Preço Bling válido.', 'danger'); return }
    setSalvando(true)
    try {
      await api.produtoAtualizar(produto.id, { preco: v, sku: produto.sku })
      notify(`Preço Bling de "${produto.nome}" salvo: ${brl(v)}`, 'ok')
      onSaved?.()
    } catch (e) { notify('Não consegui salvar: ' + (e.message || ''), 'danger') }
    setSalvando(false)
  }

  const mkNome = (v) => (MK[v.canal] && MK[v.canal].nome) || v.nome || v.canal
  const aplicarCanal = async (v, precoOverride) => {
    const itemId = v.item_id || (v.canal === 'shopee' && shopeeItem && shopeeItem.item_id) || null
    const rowKey = v.id_loja || v.item_id || v.canal
    if (!v.id_loja && !itemId) return
    const editado = precoCanalEdit[rowKey]
    const preco = precoOverride != null
      ? Number(precoOverride)
      : ((editado != null && editado !== '') ? Number(String(editado).replace(',', '.')) : v.preco_alvo)
    if (preco == null || Number.isNaN(preco) || preco <= 0) { notify('Informe um preço de lista válido.', 'danger'); return }
    setConfirmarCanal(null)
    setAplicandoCanal(rowKey)
    try {
      // 1) Bling é o hub (fonte da verdade) — grava primeiro pra não ser sobrescrito na sync
      let ondeBling = false, avisoBling = ''
      if (v.id_loja) {
        try { await api.precoCanal(produto.id, { id_loja: v.id_loja, preco }); ondeBling = true }
        catch (eB) { avisoBling = ` — gravação no Bling falhou (${eB.message || ''})` }
      }
      // 2) Shopee / Mercado Livre: empurra direto no anúncio (imediato), via item_id
      let empurrouShopee = false, avisoShopee = ''
      if (v.canal === 'shopee' && itemId) {
        try { await api.shopeeItemPreco(itemId, preco); empurrouShopee = true }
        catch (e2) { avisoShopee = ` — empurrão direto na Shopee falhou (${e2.message || ''})` }
      }
      let empurrouMl = false, avisoMl = ''
      if (v.canal === 'mercadolivre' && itemId) {
        try { await api.mlItemPreco(itemId, preco); empurrouMl = true }
        catch (e3) { avisoMl = ` — empurrão direto no Mercado Livre falhou (${e3.message || ''})` }
      }
      const empurrou = empurrouShopee || empurrouMl
      if (!ondeBling && !empurrou) throw new Error('não consegui aplicar em nenhum destino')
      const canalNome = empurrouMl ? 'no Mercado Livre' : 'na Shopee'
      const onde = ondeBling && empurrou ? `no Bling e ${canalNome}`
        : ondeBling ? 'no Bling' : `só ${canalNome} (Bling pendente)`
      notify(`${mkNome(v)} → ${brl(preco)} ${onde}.${avisoBling}${avisoShopee}${avisoMl}`, (avisoBling || avisoShopee || avisoMl) ? 'warn' : 'ok')
      setPrecoCanalEdit((m) => { const n = { ...m }; delete n[rowKey]; return n })
      try { const d = await api.produtoSincronizacao(produto.id); setSinc(d) } catch { /* mantém a tabela atual */ }
    } catch (e) { notify('Falha ao aplicar no canal: ' + (e.message || ''), 'danger') }
    setAplicandoCanal(null)
  }

  const vendas = produto.vendas || 0
  const estoque = produto.estoque || 0
  const faturamento = vendas * (produto.preco_bling || 0)
  const cobertura = vendas > 0 ? estoque / vendas : null
  const s = STATUS[produto.status] || STATUS.atencao
  const canaisPainel = sinc?.canais_painel || []
  const vinculos = sinc?.vinculos || []
  const est = radarData?.estatisticas || {}
  const temRadar = (est.n || 0) > 0 && est.menor != null
  const meuShopee = vinculos.find((v) => v.canal === 'shopee')
  const meuPreco = meuShopee && meuShopee.preco_registrado > 0 ? meuShopee.preco_registrado : null
  const gap = (temRadar && meuPreco != null) ? meuPreco - est.menor : null
  const liquidoAlvo = produto.preco_bling || 0
  const histTrend = (() => {
    if (!precoHist || precoHist.length < 2) return null
    const a = Number(precoHist[0].preco), b = Number(precoHist[precoHist.length - 1].preco)
    if (!a) return null
    const pct = ((b - a) / a) * 100
    return { pct, dir: b > a + 0.001 ? 'up' : b < a - 0.001 ? 'down' : 'flat' }
  })()
  const sparkPontos = (() => {
    const byDate = {}
    ;(radarData?.series || []).forEach((sr) => (sr.pontos || []).forEach((p) => {
      if (p && p.data && p.preco != null)
        byDate[p.data] = byDate[p.data] == null ? Number(p.preco) : Math.min(byDate[p.data], Number(p.preco))
    }))
    return Object.keys(byDate).sort().map((k) => ({ data: k, preco: byDate[k] }))
  })()
  const STATUS_CANAL = {
    no_padrao: { txt: 'No padrão', cor: 'var(--ok)' },
    abaixo: { txt: 'Abaixo', cor: '#F5A623' },
    prejuizo: { txt: 'Prejuízo', cor: '#FF6F6F' },
    sem_preco: { txt: 'Sem preço', cor: 'var(--dim)' },
    sem_taxas: { txt: 'Configurar taxas', cor: '#F5A623' },
    falta_anunciar: { txt: 'Falta anunciar', cor: 'var(--dim)' },
  }
  const anunciarCanal = (c) => notify(`Para vender na ${mkNome(c)}, crie o anúncio e vincule o produto no Bling. Depois ele aparece aqui pronto pra precificar.`, 'warn')

  const aplicarRadar = async () => {
    const v = Number(String(radarPreco).replace(',', '.'))
    if (!v || v <= 0) { notify('Informe um preço válido.', 'danger'); return }
    const shopeeRow = canaisPainel.find((c) => c.canal === 'shopee' && c.id_loja)
    if (!shopeeRow) { notify('Sem vínculo Shopee pra aplicar esse preço.', 'warn'); return }
    await aplicarCanal(shopeeRow, v)
  }

  const aplicarPrecoMl = async (preco) => {
    if (!preco || preco <= 0) return
    const row = canaisPainel.find((c) => c.canal === 'mercadolivre')
    if (row) { await aplicarCanal(row, preco); return }
    try {
      await api.mlItemPreco(mlSnap?.item?.item_id, preco)
      notify(`Mercado Livre → ${brl(preco)}.`, 'ok')
      try { const d = await api.produtoMercadolivre(produto.id); setMlSnap(d) } catch { /* mantém */ }
    } catch (e) { notify('Falha ao aplicar no Mercado Livre: ' + (e.message || ''), 'danger') }
  }

  return (
    <div className="glass rounded-2xl flex flex-col overflow-hidden drawer-in" style={{ maxHeight: 'calc(100vh - 88px)', background: 'var(--bg)', border: '1px solid rgba(214,0,127,.24)' }}>
        <div className="flex items-start gap-3 p-4" style={{ borderBottom: '1px solid var(--glass-border)' }}>
          {produto.imagem
            ? <img src={produto.imagem} alt="" className="w-14 h-14 rounded-lg object-cover flex-none" style={{ border: '1px solid var(--glass-border)' }} onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
            : <div className="w-14 h-14 rounded-lg flex-none grid place-items-center text-faint" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)' }}><ImageOff size={18} /></div>}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm leading-snug">{produto.nome}</div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[11px] text-faint num">SKU {produto.sku}</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: s.cor + '26', color: s.cor }}>{s.txt}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {canaisPainel.map((c) => {
                const mk = MK[c.canal] || { nome: c.nome || c.canal, cor: 'var(--dim)', bg: 'var(--glass-hover)' }
                return c.publicado
                  ? <span key={c.canal} className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: mk.bg, color: mk.cor }}>{mk.nome}</span>
                  : <span key={c.canal} className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: 'var(--faint)', border: '1px dashed var(--glass-border)' }}>{mk.nome}</span>
              })}
              {desde(produto.atualizado) && <span className="text-[10px] text-faint">· alterado {desde(produto.atualizado)}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-faint hover:text-fg"><X size={18} /></button>
        </div>

        <div className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>
          {/* Rail de ícones */}
          <div className="flex flex-col gap-1 p-2 shrink-0" style={{ borderRight: '1px solid var(--glass-border)', width: 54 }}>
            {ABAS_COCKPIT.map((a) => {
              const on = aba === a.id
              const Ico = a.icon
              return (
                <button key={a.id} title={a.label} onClick={() => setAba(a.id)} className="grid place-items-center rounded-lg transition relative" style={{ height: 40, ...(on ? { background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: '#fff' } : { color: 'var(--text-faint)' }) }}>
                  {on && <span style={{ position: 'absolute', left: -2, top: 8, bottom: 8, width: 3, borderRadius: 99, background: 'var(--accent)' }} />}
                  <Ico size={17} />
                </button>
              )
            })}
          </div>

          {/* Conteúdo da aba */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: 0 }}>
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm">{(ABAS_COCKPIT.find((a) => a.id === aba) || {}).label}</div>
              {desde(produto.atualizado) && <div className="text-[10px] text-faint">atualizado {desde(produto.atualizado)}</div>}
            </div>

            {aba === 'visao' && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg px-2.5 py-2" style={{ background: 'rgba(0,0,0,.18)', border: '1px solid var(--glass-border)' }}>
                    <div className="flex items-center justify-between gap-1">
                      <div className="text-[8.5px] uppercase tracking-wide text-faint">Preço Bling</div>
                      {histTrend && histTrend.dir !== 'flat' && (
                        <span className="text-[9px] num font-bold" style={{ color: histTrend.dir === 'up' ? 'var(--ok)' : 'var(--danger)' }}>{histTrend.dir === 'up' ? '▲' : '▼'}{Math.abs(histTrend.pct).toFixed(0)}%</span>
                      )}
                    </div>
                    <div className="num font-bold text-base mt-0.5" style={{ color: '#c98bd8' }}>{brl(produto.preco_bling)}</div>
                    {precoHist && precoHist.length >= 2 && <div className="mt-1"><MiniSpark pontos={precoHist} cor="#c98bd8" /></div>}
                  </div>
                  <Tile label="Margem real" val={produto.margem_real != null ? `${Number(produto.margem_real).toFixed(1)}%` : 'sem custo'} cor={produto.margem_real != null ? s.cor : undefined} small />
                  <Tile label="Lucro/un." val={produto.custo > 0 ? brl((produto.preco_bling || 0) - produto.custo) : '—'} cor={produto.custo > 0 ? 'var(--ok)' : undefined} small />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2">Preço Bling × vendas — histórico</div>
                  {carregandoHist
                    ? <div className="text-faint text-xs flex items-center gap-2 py-3"><Loader2 size={14} className="animate-spin" /> lendo o histórico…</div>
                    : !precoHist || precoHist.length < 2
                      ? <div className="text-faint text-xs rounded-lg px-3 py-3" style={{ background: 'var(--glass-hover)' }}>Começamos a registrar o Preço Bling a cada sincronização — o gráfico aparece com alguns dias de histórico.{precoHist && precoHist.length === 1 ? ` (1 ponto: ${brl(precoHist[0].preco)})` : ''}</div>
                      : <div className="rounded-lg px-3 py-2.5" style={{ background: 'var(--glass-hover)' }}>
                          <PrecoChart pontos={precoHist} />
                          <div className="flex items-center justify-between text-[10px] text-faint mt-1">
                            <span>de <b className="num text-dim">{brl(precoHist[0].preco)}</b> ({precoHist[0].dia?.slice(5)})</span>
                            <span>hoje <b className="num" style={{ color: 'var(--accent)' }}>{brl(precoHist[precoHist.length - 1].preco)}</b></span>
                          </div>
                        </div>}
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2">Resumo</div>
                  <div className="grid grid-cols-3 gap-2">
                    <Tile label="Estoque" val={Math.round(estoque)} />
                    <Tile label="Vendas 30d" val={vendas} cor={vendas > 0 ? 'var(--ok)' : undefined} />
                    <Tile label="Faturam. 30d" val={brl(faturamento)} small />
                    <Tile label="Cobertura" val={cobertura != null ? `${cobertura.toFixed(1)} mês` : '—'} small />
                    <Tile label="Giro/mês" val={`${vendas} un`} small />
                    <Tile label="Status" val={s.txt} cor={s.cor} small />
                  </div>
                </div>
                {canaisPainel.some((c) => c.publicado) && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] uppercase tracking-wide text-faint font-bold">Matriz de canais</div>
                      <div className="text-[9px] text-faint">n/d = o canal não expõe esse dado</div>
                    </div>
                    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
                      <table className="w-full text-xs">
                        <thead><tr className="text-faint text-[9px] uppercase" style={{ background: 'var(--glass-hover)' }}>
                          <th className="text-left px-2 py-1.5">Canal</th><th className="text-right px-1.5 py-1.5">Preço</th><th className="text-right px-1.5 py-1.5">Líquido</th><th className="text-right px-1.5 py-1.5">Estoque</th><th className="text-right px-1.5 py-1.5">Visitas</th><th className="text-right px-2 py-1.5">Saúde</th>
                        </tr></thead>
                        <tbody>
                          {canaisPainel.filter((c) => c.publicado).map((c, i, arr) => {
                            const mk = MK[c.canal] || { nome: c.nome || c.canal, cor: 'var(--dim)', bg: 'var(--glass-hover)' }
                            const alvo = produto.preco_bling || 0
                            const pct = (c.liquido != null && alvo > 0) ? (c.liquido / alvo) * 100 : null
                            const corLiq = c.liquido == null ? 'var(--faint)' : c.liquido >= alvo - 0.005 ? 'var(--ok)' : c.liquido >= alvo * 0.95 ? 'var(--warn)' : 'var(--danger)'
                            const isMl = c.canal === 'mercadolivre'
                            const estoque = isMl && mlSnap?.item?.estoque != null ? mlSnap.item.estoque : (produto.estoque ?? null)
                            const visitas = isMl && mlSnap?.visitas?.total != null ? mlSnap.visitas.total : null
                            const conv = (isMl && visitas > 0 && vendas > 0) ? (vendas / visitas * 100) : null
                            const saude = isMl && mlSnap?.item?.saude != null ? Math.round(mlSnap.item.saude * 100) : null
                            const corSaude = saude == null ? 'var(--faint)' : saude >= 80 ? 'var(--ok)' : saude >= 60 ? 'var(--warn)' : 'var(--danger)'
                            return (
                              <tr key={i} style={i < arr.length - 1 ? { borderBottom: '1px solid var(--glass-border)' } : undefined}>
                                <td className="px-2 py-2"><span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: mk.bg, color: mk.cor }}>{mk.nome}</span></td>
                                <td className="px-1.5 py-2 text-right num">{c.preco_registrado != null ? brl(c.preco_registrado) : '—'}</td>
                                <td className="px-1.5 py-2 text-right num" style={{ color: corLiq }}>{c.liquido != null ? brl(c.liquido) : '—'}{pct != null && <span className="text-[9px] text-faint ml-0.5">{Math.round(pct)}%</span>}</td>
                                <td className="px-1.5 py-2 text-right num">{estoque != null ? estoque : '—'}</td>
                                <td className="px-1.5 py-2 text-right num">{visitas != null ? <>{Number(visitas).toLocaleString('pt-BR')}{conv != null && <span className="text-[9px] text-faint ml-0.5">{conv.toFixed(1)}%</span>}</> : <span className="text-faint">n/d</span>}</td>
                                <td className="px-2 py-2 text-right num" style={{ color: corSaude }}>{saude != null ? saude : <span className="text-faint">n/d</span>}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="text-[10px] text-faint mt-1.5">Preço e líquido de cada canal frente ao Preço Bling. Visitas e saúde vêm do Mercado Livre (a Shopee não expõe pela API).</div>
                  </div>
                )}
                {(() => {
                  const sinais = []
                  if (mlSnap?.perguntas_sem_resposta > 0)
                    sinais.push({ Icon: MessageSquare, cor: 'var(--warn)', texto: `${mlSnap.perguntas_sem_resposta} pergunta${mlSnap.perguntas_sem_resposta > 1 ? 's' : ''} sem resposta no Mercado Livre`, rotulo: 'Ver anúncio', acao: () => mlSnap.item?.permalink && window.open(mlSnap.item.permalink, '_blank', 'noreferrer') })
                  if (mlSnap?.radar?.diff_pct != null && mlSnap.radar.diff_pct > 3)
                    sinais.push({ Icon: Target, cor: 'var(--danger)', texto: `Concorrente ${Math.round(mlSnap.radar.diff_pct)}% abaixo no ML · menor ${brl(mlSnap.radar.menor)}`, rotulo: 'Radar', acao: () => setAba('radar') })
                  const saudeMl = mlSnap?.item?.saude != null ? mlSnap.item.saude * 100 : null
                  if (saudeMl != null && saudeMl < 75)
                    sinais.push({ Icon: ShieldCheck, cor: 'var(--warn)', texto: `Saúde do anúncio ML em ${Math.round(saudeMl)} — dá pra melhorar`, rotulo: 'Corrigir', acao: () => setAba('qual') })
                  const ruim = canaisPainel.find((c) => c.publicado && (c.status === 'prejuizo' || c.status === 'abaixo'))
                  if (ruim)
                    sinais.push({ Icon: AlertTriangle, cor: ruim.status === 'prejuizo' ? 'var(--danger)' : 'var(--warn)', texto: `${mkNome(ruim)} ${ruim.status === 'prejuizo' ? 'no prejuízo' : 'abaixo do alvo'}${ruim.liquido != null ? ` · líquido ${brl(ruim.liquido)}` : ''}`, rotulo: 'Ajustar', acao: () => setAba('preco') })
                  if ((produto.estoque || 0) <= 0)
                    sinais.push({ Icon: Boxes, cor: 'var(--danger)', texto: 'Sem estoque — anúncios podem pausar', rotulo: '', acao: null })
                  if (!sinais.length) return null
                  return (
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2">Precisa de você</div>
                      <div className="space-y-1.5">
                        {sinais.map((s, i) => (
                          <div key={i} className="flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)' }}>
                            <s.Icon size={14} style={{ color: s.cor, flexShrink: 0 }} />
                            <span className="flex-1 text-[11px] text-dim">{s.texto}</span>
                            {s.rotulo && s.acao && <button onClick={s.acao} className="text-[10px] font-medium px-2 py-1 rounded shrink-0" style={{ background: 'rgba(214,0,127,.14)', color: 'var(--accent)' }}>{s.rotulo}</button>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={() => setAba('preco')} className="text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 text-white" style={{ background: 'var(--accent)' }}><Percent size={13} /> Ajustar preço</button>
                  <button onClick={onEditarCompleto} className="text-xs px-3 py-2 rounded-lg flex items-center gap-1.5" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)', color: 'var(--dim)' }}><Wand2 size={13} /> IA / Edição completa</button>
                </div>
              </>
            )}

            {aba === 'preco' && (
              <>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2">Preço Bling — líquido a receber (fonte da verdade)</div>
                  <div className="flex items-center gap-2 rounded-lg p-2.5" style={{ background: 'rgba(0,0,0,.2)', border: '1px solid var(--accent2)' }}>
                    <span className="text-faint text-sm">R$</span>
                    <input value={precoBling} onChange={(e) => setPrecoBling(e.target.value)} className="bg-transparent outline-none num font-bold text-base flex-1 text-fg" style={{ minWidth: 0 }} />
                    <button onClick={salvarPreco} disabled={salvando} className="text-xs font-medium px-3 py-1.5 rounded-lg text-white disabled:opacity-60 flex items-center gap-1.5 shrink-0" style={{ background: 'var(--accent)' }}><Database size={13} /> {salvando ? 'Salvando…' : 'Atualizar no Bling'}</button>
                  </div>
                  <div className="text-[10px] text-faint mt-1.5">Mude aqui e todos os canais são recalculados (back-cálculo). Custo, NCM, GTIN, peso, título e descrição você ajusta na <button onClick={onEditarCompleto} className="text-accent hover:underline">Edição completa</button>.</div>
                </div>
                <div>
                  {mlSnap && mlSnap.item && mlSnap.item.item_id && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] text-faint">Anatomia por canal:</span>
                      <div className="inline-flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
                        {['shopee', 'mercadolivre'].map((cn) => (
                          <button key={cn} onClick={() => setAnatCanal(cn)} className="text-[10px] font-bold px-2.5 py-1"
                            style={anatCanal === cn ? { background: (MK[cn] || {}).cor || 'var(--accent)', color: cn === 'mercadolivre' ? '#000' : '#fff' } : { color: 'var(--dim)' }}>
                            {(MK[cn] || {}).nome || cn}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {anatCanal === 'mercadolivre' && mlSnap?.item?.item_id && (!anatomia || !anatomia.quebra || !anatomia.quebra.length) && (
                    <div className="text-[10px] text-faint rounded-lg px-3 py-2 mb-3" style={{ background: 'var(--glass-hover)' }}>
                      Sem cascata do Mercado Livre ainda — cadastre as taxas do canal na Precificação (ou o anúncio está sem preço lido).
                    </div>
                  )}
                  {anatomia && anatomia.quebra && anatomia.quebra.length > 0 && (
                    <div className="rounded-lg p-3 mb-3" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] uppercase tracking-wide text-faint font-bold">Anatomia do líquido · {anatCanal === 'mercadolivre' ? 'Mercado Livre' : 'Shopee'}</div>
                        <div className="text-[11px]"><span className="num text-dim">{brl(anatomia.lista)}</span><span className="text-faint mx-1">→</span><span className="num font-bold" style={{ color: 'var(--ok)' }}>{brl(anatomia.liquido)}</span></div>
                      </div>
                      <div className="space-y-1">
                        {(() => {
                          const base = anatomia.lista || 1
                          const rows = [{ rotulo: 'Preço de lista', valor: anatomia.lista, tipo: 'lista' },
                            ...anatomia.quebra.map((q) => ({ ...q, tipo: 'ded' })),
                            { rotulo: 'Líquido (Preço Bling)', valor: anatomia.liquido, tipo: 'liq' }]
                          return rows.map((r, i) => {
                            const pct = Math.min(100, Math.abs(r.valor) / base * 100)
                            const cor = r.tipo === 'ded' ? 'var(--danger)' : 'var(--ok)'
                            return (
                              <div key={i} className="flex items-center gap-2 text-[11px]">
                                <span className="text-dim truncate" style={{ width: 134 }}>{r.rotulo}</span>
                                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.05)' }}>
                                  <div style={{ width: pct + '%', height: '100%', background: cor, opacity: r.tipo === 'ded' ? 0.5 : 1, borderRadius: 99 }} />
                                </div>
                                <span className="num text-right" style={{ width: 66, color: r.tipo === 'ded' ? 'var(--danger)' : (r.tipo === 'liq' ? 'var(--ok)' : 'var(--text-dim)') }}>{brl(r.valor)}</span>
                              </div>
                            )
                          })
                        })()}
                      </div>
                      {anatomia.margem != null
                        ? <div className="text-[10px] text-faint mt-2">Margem real neste preço: <b style={{ color: anatomia.margem < 0 ? 'var(--danger)' : 'var(--ok)' }}>{anatomia.margem}%</b>{anatomia.lucro != null ? ` · lucro ${brl(anatomia.lucro)}/un.` : ''}</div>
                        : <div className="text-[10px] text-faint mt-2">Cadastre o custo do produto pra ver a margem real desta venda.</div>}
                      {anatCanal === 'mercadolivre' && mlSnap?.tarifa_real?.comissao_pct != null && (
                        <div className="text-[10px] text-faint mt-1">Comissão real do Mercado Livre nesta categoria: <b style={{ color: 'var(--dim)' }}>{mlSnap.tarifa_real.comissao_pct.toFixed(1)}%</b>{mlSnap.tarifa_real.custo_fixo ? ` + custo fixo ${brl(mlSnap.tarifa_real.custo_fixo)}` : ''}. Fonte: API de tarifas do ML.</div>
                      )}
                    </div>
                  )}
                  <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2">Valor por marketplace — edite a lista e aplique</div>
                  {carregandoSinc
                    ? <div className="text-faint text-xs flex items-center gap-2 py-3"><Loader2 size={14} className="animate-spin" /> lendo os vínculos do Bling…</div>
                    : canaisPainel.length === 0
                      ? <div className="text-faint text-xs rounded-lg px-3 py-3" style={{ background: 'var(--glass-hover)' }}>Nenhum canal de marketplace ativo na configuração de precificação.</div>
                      : <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
                          <table className="w-full text-xs">
                            <thead><tr className="text-faint text-[9px] uppercase" style={{ background: 'var(--glass-hover)' }}>
                              <th className="text-left px-2 py-2">Canal</th><th className="text-right px-1.5 py-2">Atual</th><th className="text-right px-1.5 py-2">Lista (edite)</th><th className="text-right px-1.5 py-2">Líquido</th><th className="text-right px-2 py-2">Ação</th>
                            </tr></thead>
                            <tbody>
                              {canaisPainel.map((c, idx) => {
                                const mk = MK[c.canal] || { nome: c.nome || c.canal, cor: 'var(--dim)', bg: 'var(--glass-hover)' }
                                const sc = STATUS_CANAL[c.status] || STATUS_CANAL.sem_preco
                                const rowKey = c.id_loja || c.item_id || c.canal
                                const editVal = precoCanalEdit[rowKey]
                                const editavel = c.publicado && (c.id_loja || c.item_id || (c.canal === 'shopee' && shopeeItem && shopeeItem.item_id))
                                return (
                                  <tr key={idx} style={idx < canaisPainel.length - 1 ? { borderBottom: '1px solid var(--glass-border)' } : undefined}>
                                    <td className="px-2 py-2">
                                      {c.publicado
                                        ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: mk.bg, color: mk.cor }}>{mk.nome}</span>
                                        : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: 'var(--faint)', border: '1px dashed var(--glass-border)' }}>{mk.nome}</span>}
                                    </td>
                                    <td className="px-1.5 py-2 text-right num">{c.preco_registrado != null ? brl(c.preco_registrado) : '—'}</td>
                                    <td className="px-1.5 py-2 text-right">
                                      {editavel
                                        ? <input value={editVal != null ? editVal : (c.preco_alvo != null ? String(c.preco_alvo).replace('.', ',') : '')} onChange={(e) => editarCanalPreco(rowKey, c.canal, e.target.value)} className="bg-transparent outline-none num text-right rounded px-1.5 py-1" style={{ width: 70, border: '1px solid ' + (editVal != null ? 'var(--accent)' : 'var(--glass-border)'), color: editVal != null ? 'var(--accent)' : 'var(--text-dim)' }} />
                                        : <span className="num" style={{ color: 'var(--accent)' }}>{c.preco_alvo != null ? brl(c.preco_alvo) : '—'}</span>}
                                    </td>
                                    <td className="px-1.5 py-2 text-right">
                                      {(() => {
                                        const sim = simCanal[rowKey]
                                        if (editavel && editVal != null && editVal !== '' && sim) {
                                          const cor = sim.abaixo_alvo ? 'var(--danger)' : 'var(--ok)'
                                          return <div><span className="num" style={{ color: cor }}>{sim.liquido != null ? brl(sim.liquido) : '—'}</span>{sim.margem != null && <span className="num text-[9px] ml-1" style={{ color: cor }}>{sim.margem}%</span>}</div>
                                        }
                                        return <span className="num" style={{ color: c.liquido != null ? sc.cor : 'var(--faint)' }} title={sc.txt}>{c.liquido != null ? brl(c.liquido) : '—'}</span>
                                      })()}
                                    </td>
                                    <td className="px-2 py-2 text-right">
                                      {editavel
                                        ? (aplicandoCanal === rowKey
                                            ? <span className="text-faint text-[10px] inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" />…</span>
                                            : confirmarCanal === rowKey
                                              ? <button onClick={() => aplicarCanal(c)} className="text-[10px] font-bold px-2 py-1 rounded" style={{ background: 'rgba(245,166,35,.18)', color: '#F5A623' }}>Confirmar</button>
                                              : <button onClick={() => setConfirmarCanal(rowKey)} className="text-[10px] font-medium px-2 py-1 rounded" style={{ background: 'rgba(214,0,127,.14)', color: 'var(--accent)' }}>Aplicar</button>)
                                        : <button onClick={() => anunciarCanal(c)} className="text-[10px] font-medium px-2 py-1 rounded inline-flex items-center gap-1" style={{ background: 'var(--glass-hover)', color: 'var(--dim)' }}><Plus size={10} /> Anunciar</button>}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>}
                  <div className="text-[10px] text-faint mt-1.5">"Lista" vem pré-preenchida com o preço que neta o Preço Bling — você pode digitar outro valor e <b className="text-fg">Aplicar</b>. Grava no vínculo do Bling e, na Shopee e no Mercado Livre, empurra direto no anúncio. O "Líquido" recalcula após aplicar.</div>
                </div>
              </>
            )}

            {aba === 'canais' && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2">Presença por canal</div>
                {carregandoSinc
                  ? <div className="text-faint text-xs flex items-center gap-2 py-3"><Loader2 size={14} className="animate-spin" /> lendo os vínculos…</div>
                  : canaisPainel.length === 0
                    ? <div className="text-faint text-xs rounded-lg px-3 py-3" style={{ background: 'var(--glass-hover)' }}>Nenhum canal configurado.</div>
                    : <div className="flex flex-col gap-2">
                        {canaisPainel.map((c, i) => {
                          const mk = MK[c.canal] || { nome: c.nome || c.canal, cor: 'var(--dim)', bg: 'var(--glass-hover)' }
                          return (
                            <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)' }}>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: mk.bg, color: mk.cor }}>{mk.nome}</span>
                              {c.publicado
                                ? <span className="text-xs flex items-center gap-2"><span style={{ color: 'var(--ok)' }}>● publicado</span>{c.preco_registrado != null && <span className="num text-dim">{brl(c.preco_registrado)}</span>}</span>
                                : <button onClick={() => anunciarCanal(c)} className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1" style={{ background: 'rgba(214,0,127,.14)', color: 'var(--accent)' }}><Plus size={11} /> Anunciar</button>}
                            </div>
                          )
                        })}
                      </div>}
                <div className="text-[10px] text-faint mt-1.5">Para vender num canal novo, crie o anúncio e vincule o produto no Bling — ele aparece aqui pronto pra precificar.</div>
              </div>
            )}

            {aba === 'promo' && (
              <div className="space-y-3">
                <div className="text-[10px] uppercase tracking-wide text-faint font-bold">Promoção / Desconto</div>
                {carregandoShopee
                  ? <div className="text-faint text-xs flex items-center gap-2 py-3"><Loader2 size={14} className="animate-spin" /> lendo a Shopee…</div>
                  : !shopeeItem
                    ? <div className="text-faint text-xs rounded-lg px-3 py-3" style={{ background: 'var(--glass-hover)' }}>Sem dados da Shopee para este SKU. Rode "Sincronizar Shopee" no topo do Catálogo.</div>
                    : <>
                        {shopeeItem.em_promocao && (
                          <div className="rounded-lg p-3" style={{ background: 'rgba(245,166,35,.10)', border: '1px solid rgba(245,166,35,.4)' }}>
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1" style={{ background: 'rgba(245,166,35,.2)', color: '#F5A623' }}><BadgePercent size={11} /> Em campanha agora</span>
                              {shopeeItem.promo_nome && <span className="text-[11px] text-dim truncate">{shopeeItem.promo_nome}</span>}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <Tile label="Preço promo" val={brl(shopeeItem.preco)} cor="#F5A623" small />
                              <Tile label="Preço cheio" val={shopeeItem.preco_original > 0 ? brl(shopeeItem.preco_original) : '—'} small />
                              <Tile label="Desconto" val={shopeeItem.preco_original > shopeeItem.preco ? `-${Math.round((1 - shopeeItem.preco / shopeeItem.preco_original) * 100)}%` : '—'} cor="#F5A623" small />
                            </div>
                          </div>
                        )}
                        <div className="rounded-lg p-3" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)' }}>
                          <div className="flex items-center gap-1 p-0.5 rounded-lg mb-2.5" style={{ background: 'rgba(0,0,0,.2)', width: 'fit-content' }}>
                            <button onClick={() => setPromoModo('preco')} className="text-[11px] font-medium px-2.5 py-1 rounded-md" style={promoModo === 'preco' ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--dim)' }}>Por preço (R$)</button>
                            <button onClick={() => setPromoModo('desc')} className="text-[11px] font-medium px-2.5 py-1 rounded-md" style={promoModo === 'desc' ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--dim)' }}>Por desconto (%)</button>
                          </div>
                          <div className="flex items-center justify-between gap-3 mb-2.5">
                            <div className="text-[11px] text-dim">{promoModo === 'preco' ? 'Simular preço promocional' : 'Desconto sobre o preço cheio'}</div>
                            {promoModo === 'preco'
                              ? <div className="flex items-center gap-1.5 rounded-lg px-2 py-1" style={{ background: 'rgba(0,0,0,.2)', border: '1px solid var(--accent2)' }}>
                                  <span className="text-faint text-xs">R$</span>
                                  <input value={promoPreco} onChange={(e) => setPromoPreco(e.target.value)} className="bg-transparent outline-none num font-bold text-sm text-fg text-right" style={{ width: 74 }} />
                                </div>
                              : <div className="flex items-center gap-1.5 rounded-lg px-2 py-1" style={{ background: 'rgba(0,0,0,.2)', border: '1px solid var(--accent2)' }}>
                                  <input value={promoDesc} onChange={(e) => { const dv = e.target.value; setPromoDesc(dv); const d = Number(String(dv).replace(',', '.')); const cheio = Number(shopeeItem.preco_original || shopeeItem.preco || 0); if (cheio > 0 && d >= 0 && d < 100) setPromoPreco((cheio * (1 - d / 100)).toFixed(2).replace('.', ',')) }} className="bg-transparent outline-none num font-bold text-sm text-fg text-right" style={{ width: 50 }} />
                                  <span className="text-faint text-xs">%</span>
                                </div>}
                          </div>
                          {promoModo === 'desc' && Number(String(promoPreco).replace(',', '.')) > 0 && <div className="text-[10px] text-faint -mt-1.5 mb-1.5 text-right">vira <b className="num text-dim">{brl(Number(String(promoPreco).replace(',', '.')))}</b> na Shopee</div>}
                          {simulandoPromo && !promoSim
                            ? <div className="text-faint text-xs flex items-center gap-2 py-2"><Loader2 size={14} className="animate-spin" /> calculando…</div>
                            : promoSim
                              ? <div className="space-y-1.5">
                                  <Linha k="Preço cheio (atual)" v={shopeeItem.preco_original > 0 ? brl(shopeeItem.preco_original) : (shopeeItem.preco > 0 ? brl(shopeeItem.preco) : '—')} />
                                  {shopeeItem.preco_original > 0 && Number(String(promoPreco).replace(',', '.')) > 0 && (
                                    <Linha k="Desconto aplicado" v={`-${Math.max(0, Math.round((1 - Number(String(promoPreco).replace(',', '.')) / shopeeItem.preco_original) * 100))}%`} cor="#ff7ac6" />
                                  )}
                                  <Linha k="Líquido após taxas Shopee" v={promoSim.liquido != null ? brl(promoSim.liquido) : '—'} cor={promoSim.abaixo_alvo ? 'var(--danger)' : 'var(--ok)'} bold />
                                  <Linha k="Margem na promo" v={promoSim.margem != null ? `${promoSim.margem}%` : 'sem custo'} cor={promoSim.margem == null ? 'var(--faint)' : promoSim.margem < 0 ? 'var(--danger)' : promoSim.margem < 15 ? 'var(--warn)' : 'var(--ok)'} />
                                  {promoSim.custo > 0 && promoSim.liquido != null && <Linha k="Lucro/un." v={brl(promoSim.liquido - promoSim.custo)} cor={(promoSim.liquido - promoSim.custo) < 0 ? 'var(--danger)' : 'var(--ok)'} />}
                                  <div className="text-[11px] mt-1 pt-1.5" style={{ borderTop: '1px solid var(--glass-border)', color: promoSim.abaixo_alvo ? 'var(--danger)' : 'var(--faint)' }}>
                                    {!promoSim.tem_faixas
                                      ? 'Cadastre as taxas da Shopee na configuração de precificação pra calcular o líquido com exatidão.'
                                      : promoSim.abaixo_alvo
                                        ? `Atenção: neta ${brl(promoSim.liquido)}, abaixo do Preço Bling (${brl(promoSim.alvo)}).`
                                        : `Líquido-alvo fora de campanha (Preço Bling): ${brl(promoSim.alvo)}.`}
                                  </div>
                                </div>
                              : <div className="text-faint text-xs py-2">Digite um preço pra ver o líquido e a margem.</div>}
                          <div className="rounded-lg px-2.5 py-2 mt-2.5 flex gap-2 items-start" style={{ background: 'rgba(224,162,60,.07)', border: '1px solid rgba(224,162,60,.3)' }}>
                            <BadgePercent size={13} className="shrink-0 mt-0.5" style={{ color: '#F5A623' }} />
                            <div className="text-[10px] text-dim">Criar/encerrar campanha é no Seller Center da Shopee (limite da API). Aqui você simula preço, desconto e líquido pra decidir com segurança.</div>
                          </div>
                        </div>
                      </>}
              </div>
            )}

            {aba === 'radar' && (
              <div className="space-y-3">
                <div className="text-[10px] uppercase tracking-wide text-faint font-bold">Concorrência (Radar)</div>
                {mlSnap?.item?.item_id && (
                  <div className="rounded-lg p-3" style={{ background: 'rgba(242,194,0,.06)', border: '1px solid var(--glass-border)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase tracking-wide text-faint font-bold">Radar do Mercado Livre</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: MK.mercadolivre.bg, color: MK.mercadolivre.cor }}>nativo</span>
                    </div>
                    {carregandoMlRadar
                      ? <div className="text-faint text-xs flex items-center gap-2 py-2"><Loader2 size={14} className="animate-spin" /> lendo o radar do ML…</div>
                      : !mlRadarFull || mlRadarFull.erro || (mlRadarFull.menor == null && mlRadarFull.sugerido == null)
                        ? <div className="text-[11px] text-faint">O Mercado Livre ainda não tem referência de preço pra esse anúncio (precisa de concorrência na mesma ficha/categoria).</div>
                        : (() => {
                            const r = mlRadarFull
                            return (
                              <>
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                  <div className="rounded-lg px-2 py-1.5 text-center" style={{ background: 'rgba(0,0,0,.18)' }}>
                                    <div className="text-[9px] text-faint uppercase">Seu preço</div>
                                    <div className="num font-bold text-sm">{r.atual != null ? brl(r.atual) : '—'}</div>
                                  </div>
                                  <div className="rounded-lg px-2 py-1.5 text-center" style={{ background: 'rgba(0,0,0,.18)' }}>
                                    <div className="text-[9px] text-faint uppercase">Menor</div>
                                    <div className="num font-bold text-sm" style={{ color: 'var(--ok)' }}>{r.menor != null ? brl(r.menor) : '—'}</div>
                                  </div>
                                  <div className="rounded-lg px-2 py-1.5 text-center" style={{ background: 'rgba(0,0,0,.18)' }}>
                                    <div className="text-[9px] text-faint uppercase">Sugerido</div>
                                    <div className="num font-bold text-sm" style={{ color: 'var(--accent)' }}>{r.sugerido != null ? brl(r.sugerido) : '—'}</div>
                                  </div>
                                </div>
                                {r.diff_pct != null && (
                                  <div className="text-[11px] mb-2" style={{ color: r.diff_pct > 0 ? 'var(--danger)' : 'var(--ok)' }}>
                                    {r.diff_pct > 0 ? `Você está ${Math.round(r.diff_pct)}% acima do menor do mercado.` : r.diff_pct < 0 ? `Você está ${Math.abs(Math.round(r.diff_pct))}% abaixo do menor — bem posicionado.` : 'Você está no menor preço do mercado.'}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  {r.menor != null && <button onClick={() => aplicarPrecoMl(r.menor)} className="text-[10px] font-medium px-2.5 py-1 rounded" style={{ background: 'rgba(47,217,141,.16)', color: 'var(--ok)' }}>Igualar ao menor</button>}
                                  {r.sugerido != null && r.aplicavel && <button onClick={() => aplicarPrecoMl(r.sugerido)} className="text-[10px] font-medium px-2.5 py-1 rounded" style={{ background: 'rgba(214,0,127,.14)', color: 'var(--accent)' }}>Usar sugerido</button>}
                                </div>
                                {r.concorrentes && r.concorrentes.length > 0 && (
                                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
                                    <table className="w-full text-xs">
                                      <thead><tr className="text-faint text-[9px] uppercase" style={{ background: 'var(--glass-hover)' }}>
                                        <th className="text-left px-2 py-1">Concorrente</th><th className="text-right px-1.5 py-1">Preço</th><th className="text-right px-2 py-1">Vendas</th>
                                      </tr></thead>
                                      <tbody>
                                        {r.concorrentes.slice(0, 6).map((c, i, arr) => (
                                          <tr key={i} style={i < arr.length - 1 ? { borderBottom: '1px solid var(--glass-border)' } : undefined}>
                                            <td className="px-2 py-1.5 text-dim truncate" style={{ maxWidth: 150 }}>{c.titulo || c.item_id}</td>
                                            <td className="px-1.5 py-1.5 text-right num">{c.preco != null ? brl(c.preco) : '—'}</td>
                                            <td className="px-2 py-1.5 text-right num text-faint">{c.vendas != null ? c.vendas : '—'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                                <div className="text-[9px] text-faint mt-1.5">Radar nativo do Mercado Livre (mesma ficha/categoria). "Igualar" e "Usar sugerido" gravam no Bling e empurram no anúncio.</div>
                              </>
                            )
                          })()}
                  </div>
                )}
                {carregandoRadar
                  ? <div className="text-faint text-xs flex items-center gap-2 py-3"><Loader2 size={14} className="animate-spin" /> lendo o radar…</div>
                  : !temRadar
                    ? <div className="space-y-2">
                        <div className="rounded-lg px-3 py-3" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)' }}>
                          <div className="text-[11px] text-dim mb-2">Sem concorrentes ainda. Adicione na mão o nome e o preço que você viu na Shopee — o painel calcula sua posição e margem na hora.</div>
                          <div className="flex items-center gap-2">
                            <input value={mNome} onChange={(e) => setMNome(e.target.value)} placeholder="Nome do concorrente" className="flex-1 bg-transparent outline-none text-xs rounded-lg px-2.5 py-2" style={{ border: '1px solid var(--glass-border)', color: 'var(--text-dim)' }} />
                            <div className="flex items-center gap-1 rounded-lg px-2 py-1.5" style={{ background: 'rgba(0,0,0,.2)', border: '1px solid var(--accent2)' }}>
                              <span className="text-faint text-xs">R$</span>
                              <input value={mPreco} onChange={(e) => setMPreco(e.target.value)} placeholder="0,00" className="bg-transparent outline-none num text-sm text-fg text-right" style={{ width: 56 }} />
                            </div>
                            <button onClick={adicionarConcorrenteManual} disabled={salvandoManual} className="text-xs font-medium px-3 py-2 rounded-lg text-white shrink-0 disabled:opacity-60 inline-flex items-center gap-1" style={{ background: 'var(--accent)' }}>{salvandoManual ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}</button>
                          </div>
                        </div>
                        <button onClick={onRadar} className="text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)', color: 'var(--dim)' }}><Radar size={12} /> Monitorar por URL (radar automático)</button>
                      </div>
                    : (() => {
                        const concorrentes = (radarData?.series || []).map((sr) => {
                          const ult = (sr.pontos || []).slice(-1)[0]
                          return { nome: sr.nome, marketplace: sr.marketplace, preco: ult ? ult.preco : null }
                        }).filter((c) => c.preco != null).sort((a, b) => a.preco - b.preco)
                        const meu = Number(String(radarPreco).replace(',', '.')) || null
                        const posicao = meu != null ? concorrentes.filter((c) => c.preco < meu).length + 1 : null
                        const totalPos = concorrentes.length + 1
                        return (
                          <>
                            <div className="grid grid-cols-3 gap-2">
                              <Tile label="Menor conc." val={est.menor != null ? brl(est.menor) : '—'} small />
                              <Tile label="Média" val={est.media != null ? brl(est.media) : '—'} small />
                              <Tile label="Maior" val={est.maior != null ? brl(est.maior) : '—'} small />
                            </div>
                            <div className="rounded-lg p-3" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)' }}>
                              <div className="flex items-center justify-between gap-3 mb-2">
                                <div className="text-[11px] text-dim">Definir meu preço (Shopee)</div>
                                <div className="flex items-center gap-1.5 rounded-lg px-2 py-1" style={{ background: 'rgba(0,0,0,.2)', border: '1px solid var(--accent2)' }}>
                                  <span className="text-faint text-xs">R$</span>
                                  <input value={radarPreco} onChange={(e) => setRadarPreco(e.target.value)} className="bg-transparent outline-none num font-bold text-sm text-fg text-right" style={{ width: 74 }} />
                                </div>
                              </div>
                              {radarSim && (
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="num" style={{ color: radarSim.abaixo_alvo ? 'var(--danger)' : 'var(--ok)' }}>neta {radarSim.liquido != null ? brl(radarSim.liquido) : '—'}{radarSim.margem != null ? ` · ${radarSim.margem}%` : ''}</span>
                                  {posicao != null && <span className="text-dim">{posicao}º de {totalPos} mais barato</span>}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-1.5 mt-2.5">
                                {est.menor != null && <button onClick={() => setRadarPreco(String(est.menor).replace('.', ','))} className="text-[10px] px-2 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,.18)', border: '1px solid var(--glass-border)', color: 'var(--dim)' }}>Igualar o menor</button>}
                                {est.menor != null && <button onClick={() => setRadarPreco(String(Math.max(0, est.menor - 0.5).toFixed(2)).replace('.', ','))} className="text-[10px] px-2 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,.18)', border: '1px solid var(--glass-border)', color: 'var(--dim)' }}>− R$ 0,50 abaixo</button>}
                                {meuPreco != null && <button onClick={() => setRadarPreco(String(meuPreco).replace('.', ','))} className="text-[10px] px-2 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,.18)', border: '1px solid var(--glass-border)', color: 'var(--dim)' }}>Meu preço atual</button>}
                              </div>
                              <button onClick={aplicarRadar} disabled={aplicandoCanal != null} className="w-full mt-2.5 text-xs font-medium px-3 py-2 rounded-lg text-white disabled:opacity-60 flex items-center justify-center gap-1.5" style={{ background: 'var(--accent)' }}>
                                {aplicandoCanal != null ? <><Loader2 size={13} className="animate-spin" /> aplicando…</> : <><Check size={13} /> Aplicar na Shopee</>}
                              </button>
                            </div>
                            {concorrentes.length > 0 && (
                              <div>
                                <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-1.5">Concorrentes monitorados ({est.n || concorrentes.length})</div>
                                <div className="space-y-1">
                                  {concorrentes.slice(0, 6).map((c, i) => (
                                    <div key={i} className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs" style={{ background: 'var(--glass-hover)' }}>
                                      <span className="text-dim truncate" style={{ maxWidth: 220 }}>{c.nome}</span>
                                      <span className="num" style={{ color: meu != null && c.preco < meu ? 'var(--danger)' : 'var(--dim)' }}>{brl(c.preco)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="rounded-lg px-3 py-2.5" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)' }}>
                              <div className="text-[10px] text-faint mb-1.5">Adicionar outro concorrente (manual)</div>
                              <div className="flex items-center gap-2">
                                <input value={mNome} onChange={(e) => setMNome(e.target.value)} placeholder="Nome" className="flex-1 bg-transparent outline-none text-xs rounded-lg px-2.5 py-1.5" style={{ border: '1px solid var(--glass-border)', color: 'var(--text-dim)' }} />
                                <div className="flex items-center gap-1 rounded-lg px-2 py-1" style={{ background: 'rgba(0,0,0,.2)', border: '1px solid var(--accent2)' }}>
                                  <span className="text-faint text-xs">R$</span>
                                  <input value={mPreco} onChange={(e) => setMPreco(e.target.value)} placeholder="0,00" className="bg-transparent outline-none num text-sm text-fg text-right" style={{ width: 52 }} />
                                </div>
                                <button onClick={adicionarConcorrenteManual} disabled={salvandoManual} className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-white shrink-0 disabled:opacity-60 inline-flex items-center gap-1" style={{ background: 'var(--accent)' }}>{salvandoManual ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}</button>
                              </div>
                            </div>
                            <button onClick={onRadar} className="text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)', color: 'var(--dim)' }}><Radar size={12} /> Abrir radar completo</button>
                          </>
                        )
                      })()}
              </div>
            )}

            {aba === 'hist' && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2">Histórico de Preço Bling</div>
                {carregandoHist
                  ? <div className="text-faint text-xs flex items-center gap-2 py-3"><Loader2 size={14} className="animate-spin" /> lendo o histórico…</div>
                  : !precoHist || precoHist.length < 2
                    ? <div className="text-faint text-xs rounded-lg px-3 py-2.5" style={{ background: 'var(--glass-hover)' }}>Começamos a registrar o Preço Bling a cada sincronização. O gráfico aparece com alguns dias de histórico.{precoHist && precoHist.length === 1 ? ` (1 ponto até agora: ${brl(precoHist[0].preco)})` : ''}</div>
                    : <div className="rounded-lg px-3 py-2.5" style={{ background: 'var(--glass-hover)' }}>
                        <PrecoChart pontos={precoHist} />
                        <div className="flex items-center justify-between text-[10px] text-faint mt-1">
                          <span>de <b className="num text-dim">{brl(precoHist[0].preco)}</b> ({precoHist[0].dia?.slice(5)})</span>
                          <span>hoje <b className="num" style={{ color: 'var(--accent)' }}>{brl(precoHist[precoHist.length - 1].preco)}</b></span>
                        </div>
                      </div>}
              </div>
            )}

            {aba === 'aval' && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2">Avaliações (Shopee)</div>
                {!(shopeeItem && shopeeItem.item_id)
                  ? <div className="text-faint text-xs rounded-lg px-3 py-3" style={{ background: 'var(--glass-hover)' }}>Sem anúncio Shopee vinculado para buscar avaliações. Rode "Sincronizar Shopee".</div>
                  : carregandoReviews
                    ? <div className="text-faint text-xs flex items-center gap-2 py-2"><Loader2 size={14} className="animate-spin" /> buscando avaliações…</div>
                    : !reviews || reviews.length === 0
                      ? <div className="text-faint text-xs rounded-lg px-3 py-2.5" style={{ background: 'var(--glass-hover)' }}>Sem avaliações recentes para este anúncio.</div>
                      : (() => {
                          const n = reviews.length
                          const avg = reviews.reduce((a, c) => a + (c.rating_star || 0), 0) / n
                          const dist = [5, 4, 3, 2, 1].map((s) => reviews.filter((c) => Math.round(c.rating_star || 0) === s).length)
                          const positivas = reviews.filter((c) => (c.rating_star || 0) >= 4).length
                          const comFoto = reviews.filter((c) => (c.images && c.images.length) || (c.media && c.media.length) || (c.comment_image && c.comment_image.length)).length
                          const comentadas = reviews.filter((c) => (c.comment || '').trim()).length
                          const maxd = Math.max(1, ...dist)
                          const dt = (c) => { const t = c.ctime || c.mtime; if (!t) return ''; const d = new Date(t * 1000); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` }
                          const ini = (c) => { const u = (c.buyer_username || c.author_username || '').trim(); return u ? u[0].toUpperCase() : '·' }
                          return (
                            <div>
                              <div className="flex items-stretch gap-3 mb-2.5">
                                <div className="flex flex-col items-center justify-center rounded-lg px-3 py-2" style={{ background: 'var(--glass-hover)', minWidth: 86 }}>
                                  <span className="text-2xl font-bold num" style={{ color: '#F5A623' }}>{avg.toFixed(1)}</span>
                                  <span className="num text-[11px]" style={{ color: '#F5A623' }}>{'★'.repeat(Math.round(avg))}<span className="text-faint">{'★'.repeat(Math.max(0, 5 - Math.round(avg)))}</span></span>
                                  <span className="text-[10px] text-faint mt-0.5">{n} recente(s)</span>
                                </div>
                                <div className="flex-1 flex flex-col justify-center gap-1">
                                  {[5, 4, 3, 2, 1].map((s, i) => (
                                    <div key={s} className="flex items-center gap-1.5 text-[10px]">
                                      <span className="text-faint num" style={{ width: 18 }}>{s}★</span>
                                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.05)' }}>
                                        <div style={{ width: (dist[i] / maxd * 100) + '%', height: '100%', background: '#F5A623', borderRadius: 99 }} />
                                      </div>
                                      <span className="text-faint num" style={{ width: 18, textAlign: 'right' }}>{dist[i]}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(34,197,128,.14)', color: 'var(--ok)' }}>{Math.round(positivas / n * 100)}% positivas</span>
                                {comFoto > 0 && <span className="text-[10px] px-2 py-0.5 rounded text-dim" style={{ background: 'var(--glass-hover)' }}>com foto {comFoto}</span>}
                                {comentadas > 0 && <span className="text-[10px] px-2 py-0.5 rounded text-dim" style={{ background: 'var(--glass-hover)' }}>comentadas {comentadas}</span>}
                              </div>
                              <div className="space-y-1.5">
                                {reviews.slice(0, 6).map((c, i) => (
                                  <div key={i} className="rounded-lg px-2.5 py-2 text-xs" style={{ background: 'var(--glass-hover)' }}>
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="flex items-center justify-center rounded-full text-[10px] font-bold" style={{ width: 20, height: 20, background: 'var(--accent2)', color: 'var(--accent)' }}>{ini(c)}</span>
                                      <span className="num text-[11px]"><span style={{ color: '#F5A623' }}>{'★'.repeat(Math.round(c.rating_star || 0))}</span><span className="text-faint">{'★'.repeat(Math.max(0, 5 - Math.round(c.rating_star || 0)))}</span></span>
                                      {dt(c) && <span className="text-[10px] text-faint ml-auto num">{dt(c)}</span>}
                                    </div>
                                    {c.comment && <div className="text-dim">{c.comment.length > 160 ? c.comment.slice(0, 160) + '…' : c.comment}</div>}
                                  </div>
                                ))}
                              </div>
                              <div className="text-[10px] text-faint mt-2">Com base nas {n} avaliações mais recentes do anúncio (API da Shopee).</div>
                            </div>
                          )
                        })()}
              </div>
            )}

            {aba === 'qual' && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2">Qualidade do anúncio</div>
                {mlSnap?.conectado && mlSnap.item?.item_id && (
                  <div className="rounded-lg p-3 mb-3" style={{ background: 'rgba(242,194,0,.06)', border: '1px solid var(--glass-border)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase tracking-wide text-faint font-bold">Ações rápidas no anúncio</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: MK.mercadolivre.bg, color: MK.mercadolivre.cor }}>Mercado Livre</span>
                    </div>
                    <div className="mb-2">
                      <div className="text-[9px] uppercase tracking-wide text-faint font-bold mb-1 flex items-center gap-1.5"><Camera size={11} /> Adicionar foto</div>
                      <div className="flex gap-1.5">
                        <input value={mlFotoUrl} onChange={(e) => setMlFotoUrl(e.target.value)} placeholder="Cole a URL da imagem" className="flex-1 bg-black/20 rounded px-2 py-1.5 text-[11px] outline-none text-fg placeholder:text-faint" style={{ border: '1px solid var(--glass-border)' }} />
                        <button onClick={salvarMlFoto} disabled={mlQualBusy === 'foto'} className="text-[10px] font-medium px-2.5 py-1 rounded shrink-0 inline-flex items-center gap-1" style={{ background: 'rgba(214,0,127,.14)', color: 'var(--accent)' }}>{mlQualBusy === 'foto' ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Adicionar</button>
                      </div>
                    </div>
                    <div className="mb-2">
                      <div className="text-[9px] uppercase tracking-wide text-faint font-bold mb-1 flex items-center gap-1.5"><Barcode size={11} /> Ficha técnica</div>
                      <div className="flex gap-1.5">
                        <input value={mlEan} onChange={(e) => setMlEan(e.target.value)} placeholder="Código de barras (EAN)" className="flex-1 bg-black/20 rounded px-2 py-1.5 text-[11px] outline-none text-fg placeholder:text-faint" style={{ border: '1px solid var(--glass-border)' }} />
                        <input value={mlPeso} onChange={(e) => setMlPeso(e.target.value)} placeholder="Peso (g)" className="w-20 bg-black/20 rounded px-2 py-1.5 text-[11px] outline-none text-fg placeholder:text-faint" style={{ border: '1px solid var(--glass-border)' }} />
                        <button onClick={salvarMlFicha} disabled={mlQualBusy === 'ficha'} className="text-[10px] font-medium px-2.5 py-1 rounded shrink-0 inline-flex items-center gap-1" style={{ background: 'rgba(214,0,127,.14)', color: 'var(--accent)' }}>{mlQualBusy === 'ficha' ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Salvar</button>
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wide text-faint font-bold mb-1 flex items-center gap-1.5"><AlignLeft size={11} /> Descrição</div>
                      <textarea value={mlDesc} onChange={(e) => setMlDesc(e.target.value)} rows={3} placeholder="Escreva ou gere com IA a descrição do anúncio…" className="w-full bg-black/20 rounded px-2 py-1.5 text-[11px] outline-none text-fg placeholder:text-faint resize-none leading-relaxed" style={{ border: '1px solid var(--glass-border)' }} />
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <button onClick={salvarMlDesc} disabled={mlQualBusy === 'desc' || !mlDesc.trim()} className="text-[10px] font-medium px-2.5 py-1 rounded inline-flex items-center gap-1 text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>{mlQualBusy === 'desc' ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Salvar no ML</button>
                        <button onClick={sugerirMlDesc} disabled={mlQualBusy === 'ia'} className="text-[10px] font-medium px-2.5 py-1 rounded inline-flex items-center gap-1" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)', color: 'var(--dim)' }}>{mlQualBusy === 'ia' ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />} Sugerir com IA</button>
                      </div>
                    </div>
                    <div className="text-[9px] text-faint mt-2">Grava direto no anúncio (API do ML). O ML exige atributos obrigatórios por categoria e trava alguns campos quando o anúncio já vendeu — nesses casos ele recusa e o erro aparece aqui.</div>
                  </div>
                )}
                {carregandoQual
                  ? <div className="text-faint text-xs flex items-center gap-2 py-3"><Loader2 size={14} className="animate-spin" /> diagnosticando o anúncio…</div>
                  : !qual || qual.erro
                    ? <div className="rounded-lg px-3 py-4 text-center" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)' }}>
                        <ShieldCheck size={22} className="mx-auto mb-2" style={{ color: 'var(--accent)' }} />
                        <div className="text-sm font-medium">Não consegui ler o diagnóstico</div>
                        <div className="text-[11px] text-faint mt-1 mb-3">Verifique a sincronização da Shopee e do Bling, ou ajuste a ficha na edição completa.</div>
                        <button onClick={onEditarCompleto} className="text-xs font-medium px-3 py-2 rounded-lg text-white inline-flex items-center gap-1.5" style={{ background: 'var(--accent)' }}><Wand2 size={13} /> Abrir Qualidade & IA</button>
                      </div>
                    : (() => {
                        const cor = (st) => st === 'ok' ? 'var(--ok)' : st === 'atencao' ? 'var(--warn)' : st === 'falta' ? 'var(--danger)' : 'var(--faint)'
                        const ring = qual.score >= 85 ? 'var(--ok)' : qual.score >= 70 ? '#5fd0a8' : qual.score >= 50 ? 'var(--warn)' : 'var(--danger)'
                        const C = 2 * Math.PI * 15.5
                        return (
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-3 rounded-lg px-3 py-3" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)' }}>
                              <svg width="58" height="58" viewBox="0 0 36 36" style={{ color: 'var(--fg)', flexShrink: 0 }}>
                                <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="3" />
                                <circle cx="18" cy="18" r="15.5" fill="none" stroke={ring} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${qual.score / 100 * C} ${C}`} transform="rotate(-90 18 18)" />
                                <text x="18" y="19" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor">{qual.score}</text>
                                <text x="18" y="25" textAnchor="middle" fontSize="4" fill="var(--faint)">/100</text>
                              </svg>
                              <div className="min-w-0">
                                <div className="text-sm font-bold" style={{ color: ring }}>{qual.label}</div>
                                {qual.potencial > qual.score && <div className="text-[11px] text-dim mt-0.5">Potencial: subir pra <b style={{ color: 'var(--ok)' }}>{qual.potencial}/100</b> e ganhar ranqueamento.</div>}
                                {!qual.tem_shopee && <div className="text-[10px] text-faint mt-0.5">Sem anúncio Shopee vinculado — fotos e vídeo não puderam ser lidos.</div>}
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              {qual.componentes.map((c, i) => (
                                <div key={i} className="flex items-start gap-2 rounded-lg px-2.5 py-2" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)' }}>
                                  <span style={{ width: 8, height: 8, borderRadius: 99, background: cor(c.status), marginTop: 5, flexShrink: 0 }} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-medium">{c.label}</span>
                                      <span className="num text-[10px]" style={{ color: cor(c.status) }}>{c.valor}/{c.max}</span>
                                    </div>
                                    <div className="text-[10px] text-faint">{c.detalhe}</div>
                                    {c.acao && <div className="text-[10px] mt-0.5" style={{ color: 'var(--accent)' }}>{c.acao}</div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {qual.plano && qual.plano.length > 0 && (
                              <div className="rounded-lg p-3" style={{ background: 'rgba(214,0,127,.06)', border: '1px solid var(--accent2)' }}>
                                <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-1.5">Plano priorizado</div>
                                <div className="space-y-1">
                                  {qual.plano.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between gap-2 text-[11px]">
                                      <span className="text-dim truncate"><b className="text-fg">{p.label}:</b> {p.acao}</span>
                                      <span className="num text-[10px] shrink-0" style={{ color: 'var(--ok)' }}>+{p.ganho}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            <button onClick={onEditarCompleto} className="w-full text-xs font-medium px-3 py-2 rounded-lg text-white inline-flex items-center justify-center gap-1.5" style={{ background: 'var(--accent)' }}><Wand2 size={13} /> Melhorar com IA · edição completa</button>
                          </div>
                        )
                      })()}
              </div>
            )}

            {aba === 'funil' && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2">Performance & Funil (Shopee)</div>
                <div className="rounded-lg px-3 py-3" style={{ background: 'var(--glass-hover)' }}>
                  <div className="grid grid-cols-3 gap-2 mb-2" style={{ opacity: 0.55 }}>
                    <Tile label="Impressões 30d" val="—" small />
                    <Tile label="Cliques" val="—" small />
                    <Tile label="Conversão" val="—" small />
                  </div>
                  <div className="text-[10px] text-faint">A API da Shopee não expõe impressões/cliques/conversão por produto — só agregado por loja/campanha. O funil da loja fica no módulo Desempenho.</div>
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
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
  const off = { background: 'var(--glass-bg)', color: 'var(--text-dim)', border: '1px solid var(--glass-border)' }
  const on = { background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' }
  return (
    <div className="flex items-center justify-center gap-1.5 mt-4 flex-wrap">
      <button onClick={() => onIr(page - 1)} disabled={page <= 1} className={cls} style={off} aria-label="Página anterior"><ChevronLeft size={15} /></button>
      {janelaPaginas(page, total).map((p, i) => p === '…'
        ? <span key={'e' + i} className="px-1 text-faint text-xs select-none">…</span>
        : <button key={p} onClick={() => onIr(p)} aria-current={p === page ? 'page' : undefined} className={cls} style={p === page ? on : off}>{p}</button>)}
      <button onClick={() => onIr(page + 1)} disabled={page >= total} className={cls} style={off} aria-label="Próxima página"><ChevronRight size={15} /></button>
    </div>
  )
}

function Donut({ saud, aten, prej, size = 64 }) {
  const denom = saud + aten + prej
  const r = 15.5, C = 2 * Math.PI * r
  const aOff = denom ? (saud / denom) * C : 0
  const pOff = denom ? aOff + (aten / denom) * C : 0
  const seg = (v, color, offset) => denom > 0
    ? <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="5"
              strokeDasharray={`${(v / denom) * C} ${C}`} strokeDashoffset={-offset} />
    : null
  return (
    <svg viewBox="0 0 36 36" style={{ width: size, height: size, transform: 'rotate(-90deg)', flex: 'none' }}>
      <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="5" />
      {seg(saud, 'var(--ok)', 0)}
      {seg(aten, 'var(--warn)', aOff)}
      {seg(prej, 'var(--danger)', pOff)}
    </svg>
  )
}

function PainelKpis({ kpis, hist = [], brl, onSemCusto }) {
  const lbl = 'text-[9.5px] uppercase tracking-wide text-faint font-bold'
  const serie = (campo) => (hist || []).map((p) => ({ preco: p[campo] })).filter((x) => Number.isFinite(Number(x.preco)))
  const trend = (campo, { pp = false, lowerBetter = false, neutral = false } = {}) => {
    const s = serie(campo)
    if (s.length < 2) return null
    const a = Number(s[0].preco), b = Number(s[s.length - 1].preco)
    const d = b - a
    if (Math.abs(d) < 1e-9) return { txt: '0', cor: 'var(--faint)' }
    const up = d > 0
    const cor = neutral ? 'var(--dim)' : ((lowerBetter ? !up : up) ? 'var(--ok)' : 'var(--danger)')
    const arr = up ? '▲' : '▼'
    const txt = pp ? `${arr} ${Math.abs(d).toFixed(1)}pp` : `${arr} ${Math.abs(a ? d / a * 100 : 0).toFixed(1)}%`
    return { txt, cor }
  }
  const Cab = ({ children, t }) => (
    <div className="flex items-start justify-between gap-1">
      <div className={lbl}>{children}</div>
      {t && <span className="num text-[10px] font-bold shrink-0" style={{ color: t.cor }}>{t.txt}</span>}
    </div>
  )
  const tTotal = trend('total', { neutral: true })
  const tSem = trend('sem_custo', { lowerBetter: true })
  const tVal = trend('val_estoque', { neutral: true })
  const tMarg = trend('marg_media', { pp: true })
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))' }}>
      <div className="glass rounded-2xl p-4 flex items-center gap-3">
        <Donut saud={kpis.saud} aten={kpis.aten} prej={kpis.prej} />
        <div className="min-w-0">
          <div className={lbl}>Saúde da margem</div>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="num text-xl font-bold" style={{ color: 'var(--ok)' }}>{kpis.saud}</span>
            <span className="num text-xs" style={{ color: 'var(--warn)' }}>{kpis.aten}</span>
            <span className="num text-xs" style={{ color: 'var(--danger)' }}>{kpis.prej}</span>
          </div>
          <div className="text-[10px] text-faint mt-1">saudável · atenção · prejuízo</div>
        </div>
      </div>
      <div className="glass rounded-2xl p-4">
        <Cab t={tTotal}>Produtos</Cab>
        <div className="num text-2xl font-bold mt-1.5">{kpis.total.toLocaleString('pt-BR')}</div>
        {serie('total').length >= 2 ? <div className="mt-1"><MiniSpark pontos={serie('total')} cor="#c98bd8" /></div> : <div className="text-[10px] text-faint mt-1">no catálogo</div>}
      </div>
      <button onClick={onSemCusto} className="glass rounded-2xl p-4 text-left" style={{ border: '1px solid rgba(224,162,60,.3)' }}>
        <Cab t={tSem}>Sem custo</Cab>
        <div className="num text-2xl font-bold mt-1.5" style={{ color: 'var(--warn)' }}>{kpis.semCusto.toLocaleString('pt-BR')}</div>
        <div className="text-[10px] mt-1.5 font-semibold" style={{ color: 'var(--accent)' }}>filtrar e resolver →</div>
      </button>
      <div className="glass rounded-2xl p-4">
        <Cab t={tVal}>Valor em estoque</Cab>
        <div className="num text-2xl font-bold mt-1.5">{brl(kpis.valEstoque)}</div>
        {serie('val_estoque').length >= 2 ? <div className="mt-1"><MiniSpark pontos={serie('val_estoque')} cor="#5fd0a8" /></div> : <div className="text-[10px] text-faint mt-1">custo × saldo</div>}
      </div>
      <div className="glass rounded-2xl p-4">
        <Cab t={tMarg}>Margem mediana</Cab>
        <div className="num text-2xl font-bold mt-1.5" style={{ color: kpis.margMedia != null ? 'var(--ok)' : 'var(--text-faint)' }}>
          {kpis.margMedia != null ? kpis.margMedia.toFixed(1) + '%' : '—'}
        </div>
        {serie('marg_media').length >= 2 ? <div className="mt-1"><MiniSpark pontos={serie('marg_media')} cor="#5fd0a8" /></div> : <div className="text-[10px] text-faint mt-1">típica dos com custo</div>}
      </div>
      {kpis.cobertura.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <div className={lbl}>Cobertura por canal</div>
          <div className="flex flex-col gap-1.5 mt-2.5">
            {kpis.cobertura.map((c) => {
              const mk = MK[c.canal] || { nome: c.canal, cor: 'var(--dim)', bg: 'var(--glass-hover)' }
              return (
                <div key={c.canal} className="flex items-center gap-2">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-center" style={{ background: mk.bg, color: mk.cor, width: 58, flex: 'none' }}>{mk.nome}</span>
                  <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: 'rgba(255,255,255,.07)' }}>
                    <div style={{ height: '100%', width: `${c.pct}%`, background: mk.cor, borderRadius: 99 }} />
                  </div>
                  <span className="num text-[10px] text-dim" style={{ width: 30, textAlign: 'right' }}>{Math.round(c.pct)}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="glass rounded-xl h-11" />
      <div className="glass rounded-2xl h-80" />
    </div>
  )
}

function SemDados() {
  return (
    <div className="glass rounded-2xl p-10 grid place-items-center text-center">
      <div className="h-14 w-14 rounded-2xl grid place-items-center mb-3" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>
        <Plug size={26} className="text-white" />
      </div>
      <div className="font-display font-semibold text-lg">Catálogo vazio</div>
      <div className="text-sm text-dim mt-1 max-w-md">
        Conecte sua conta Bling e sincronize para ver seus produtos aqui, com custo, preço sugerido e sinal de margem — prontos para precificar em massa.
      </div>
    </div>
  )
}
