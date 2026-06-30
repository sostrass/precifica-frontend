import { useEffect, useMemo, useState } from 'react'
import { Search, RefreshCw, Plug, X, Check, Zap, Radar, Wand2, Database, Loader2, ImageOff, BadgePercent, PanelRight, Plus, Star, CheckCircle2, Boxes, BarChart3, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
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

  const kpis = useMemo(() => {
    const its = itens || []
    let saud = 0, aten = 0, prej = 0, semCusto = 0, valEstoque = 0, margSum = 0, margN = 0
    const canalCount = {}
    for (const i of its) {
      if (i.status === 'lucro_ideal') saud++
      else if (i.status === 'atencao') aten++
      else if (i.status === 'critico') prej++
      if (!(i.custo > 0) || i.status === 'sem_custo') semCusto++
      if (i.custo > 0 && i.estoque > 0) valEstoque += i.custo * i.estoque
      if (i.margem_real != null) { margSum += Number(i.margem_real); margN++ }
      for (const m of (i.marketplaces || [])) if (m.publicado && m.canal) canalCount[m.canal] = (canalCount[m.canal] || 0) + 1
    }
    const semAnuncio = its.filter((i) => !((i.marketplaces || []).some((m) => m.publicado))).length
    const total = its.length || 1
    const cobertura = Object.entries(canalCount).map(([c, n]) => ({ canal: c, n, pct: (n / total) * 100 }))
      .sort((a, b) => b.n - a.n).slice(0, 4)
    return {
      total: its.length, saud, aten, prej, semCusto, valEstoque,
      margMedia: margN ? margSum / margN : null, cobertura, semAnuncio,
    }
  }, [itens])

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
    <div className="space-y-3 max-w-6xl">
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
      <PainelKpis kpis={kpis} brl={brl} onSemCusto={() => setFiltro('sem_custo')} />

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
      <div className={cockpit ? 'grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] gap-4 items-start' : ''}>
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
                        <div className="flex items-center gap-1 flex-wrap" style={{ maxWidth: 150 }}>
                          {pubs.map((m) => {
                            const mk = MK[m.canal] || { nome: m.nome || m.canal, cor: 'var(--dim)', bg: 'var(--glass-hover)' }
                            return <span key={m.canal} className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: mk.bg, color: mk.cor }}>{mk.nome}</span>
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
  const [sinc, setSinc] = useState(null)
  const [carregandoSinc, setCarregandoSinc] = useState(true)
  const [aplicandoCanal, setAplicandoCanal] = useState(null)
  const [confirmarCanal, setConfirmarCanal] = useState(null)
  const [radarData, setRadarData] = useState(null)
  const [carregandoRadar, setCarregandoRadar] = useState(true)

  useEffect(() => {
    let vivo = true
    setCarregandoRadar(true)
    api.radarHistorico(produto.sku, 14)
      .then((d) => { if (vivo) setRadarData(d) })
      .catch(() => { if (vivo) setRadarData(null) })
      .finally(() => { if (vivo) setCarregandoRadar(false) })
    return () => { vivo = false }
  }, [produto.sku])

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
  const aplicarCanal = async (v) => {
    if (!v.id_loja || v.preco_alvo == null) return
    setConfirmarCanal(null)
    setAplicandoCanal(v.id_loja)
    try {
      // 1) Bling (crítico — garante que o ajuste não some na próxima sincronização)
      await api.precoCanal(produto.id, { id_loja: v.id_loja, preco: v.preco_alvo })
      // 2) Shopee: empurra direto no anúncio (imediato), se temos o item_id no cache
      let avisoShopee = ''
      let empurrouShopee = false
      if (v.canal === 'shopee' && shopeeItem && shopeeItem.item_id) {
        try { await api.shopeeItemPreco(shopeeItem.item_id, v.preco_alvo); empurrouShopee = true }
        catch (e2) { avisoShopee = ` — Bling ok, mas o empurrão direto na Shopee falhou (${e2.message || ''}); o Bling vai propagar.` }
      }
      const onde = empurrouShopee ? 'no Bling e na Shopee' : 'no Bling'
      notify(`${mkNome(v)} ajustado pra ${brl(v.preco_alvo)} ${onde}.${avisoShopee}`, avisoShopee ? 'warn' : 'ok')
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
    falta_anunciar: { txt: 'Falta anunciar', cor: 'var(--dim)' },
  }
  const anunciarCanal = (c) => notify(`Para vender na ${mkNome(c)}, crie o anúncio e vincule o produto no Bling. Depois ele aparece aqui pronto pra precificar.`, 'warn')

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

        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: 0 }}>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2">Resumo</div>
            <div className="grid grid-cols-3 gap-2">
              <Tile label="Estoque" val={Math.round(estoque)} />
              <Tile label="Vendas 30d" val={vendas} cor={vendas > 0 ? 'var(--ok)' : undefined} />
              <Tile label="Faturam. 30d" val={brl(faturamento)} small />
              <Tile label="Cobertura" val={cobertura != null ? `${cobertura.toFixed(1)} mês` : '—'} small />
              <Tile label="Margem real" val={produto.margem_real != null ? `${Number(produto.margem_real).toFixed(1)}%` : 'sem custo'} cor={produto.margem_real != null ? s.cor : undefined} small />
              <Tile label="Giro/mês" val={`${vendas} un`} small />
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2">Preço Bling — líquido a receber (fonte da verdade)</div>
            <div className="flex items-center gap-2 rounded-lg p-2.5" style={{ background: 'rgba(0,0,0,.2)', border: '1px solid var(--accent2)' }}>
              <span className="text-faint text-sm">R$</span>
              <input value={precoBling} onChange={(e) => setPrecoBling(e.target.value)} className="bg-transparent outline-none num font-bold text-base flex-1 text-fg" style={{ minWidth: 0 }} />
              <button onClick={salvarPreco} disabled={salvando} className="text-xs font-medium px-3 py-1.5 rounded-lg text-white disabled:opacity-60 flex items-center gap-1.5 shrink-0" style={{ background: 'var(--accent)' }}><Database size={13} /> {salvando ? 'Salvando…' : 'Atualizar no Bling'}</button>
            </div>
            <div className="text-[10px] text-faint mt-1.5">É a base de todos os canais. Custo, NCM, GTIN, peso, título e descrição você ajusta na <button onClick={onEditarCompleto} className="text-accent hover:underline">Edição completa</button>.</div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2">Valor por marketplace — cada loja neta o Preço Bling</div>
            {carregandoSinc
              ? <div className="text-faint text-xs flex items-center gap-2 py-3"><Loader2 size={14} className="animate-spin" /> lendo os vínculos do Bling…</div>
              : canaisPainel.length === 0
                ? <div className="text-faint text-xs rounded-lg px-3 py-3" style={{ background: 'var(--glass-hover)' }}>Nenhum canal de marketplace ativo na configuração de precificação.</div>
                : <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
                    <table className="w-full text-xs">
                      <thead><tr className="text-faint text-[9px] uppercase" style={{ background: 'var(--glass-hover)' }}>
                        <th className="text-left px-2 py-2">Canal</th><th className="px-1 py-2">Anunc.</th><th className="text-right px-1.5 py-2">Atual</th><th className="text-right px-1.5 py-2">Pra netar</th><th className="text-right px-1.5 py-2">Líquido</th><th className="text-right px-2 py-2">Ação</th>
                      </tr></thead>
                      <tbody>
                        {canaisPainel.map((c, idx) => {
                          const mk = MK[c.canal] || { nome: c.nome || c.canal, cor: 'var(--dim)', bg: 'var(--glass-hover)' }
                          const sc = STATUS_CANAL[c.status] || STATUS_CANAL.sem_preco
                          return (
                            <tr key={idx} style={idx < canaisPainel.length - 1 ? { borderBottom: '1px solid var(--glass-border)' } : undefined}>
                              <td className="px-2 py-2">
                                {c.publicado
                                  ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: mk.bg, color: mk.cor }}>{mk.nome}</span>
                                  : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: 'var(--faint)', border: '1px dashed var(--glass-border)' }}>{mk.nome}</span>}
                              </td>
                              <td className="px-1 py-2 text-center">{c.publicado ? <span style={{ color: 'var(--ok)' }}>✓</span> : <span className="text-faint">✗</span>}</td>
                              <td className="px-1.5 py-2 text-right num">{c.preco_registrado != null ? brl(c.preco_registrado) : '—'}</td>
                              <td className="px-1.5 py-2 text-right num font-medium" style={{ color: 'var(--accent)' }}>{c.preco_alvo != null ? brl(c.preco_alvo) : '—'}</td>
                              <td className="px-1.5 py-2 text-right num" style={{ color: c.liquido != null ? sc.cor : 'var(--faint)' }} title={sc.txt}>{c.liquido != null ? brl(c.liquido) : '—'}</td>
                              <td className="px-2 py-2 text-right">
                                {c.publicado && c.id_loja && c.preco_alvo != null
                                  ? (aplicandoCanal === c.id_loja
                                      ? <span className="text-faint text-[10px] inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" />…</span>
                                      : confirmarCanal === c.id_loja
                                        ? <button onClick={() => aplicarCanal(c)} className="text-[10px] font-bold px-2 py-1 rounded" style={{ background: 'rgba(245,166,35,.18)', color: '#F5A623' }}>Confirmar</button>
                                        : <button onClick={() => setConfirmarCanal(c.id_loja)} className="text-[10px] font-medium px-2 py-1 rounded" style={{ background: 'rgba(214,0,127,.14)', color: 'var(--accent)' }}>Aplicar</button>)
                                  : <button onClick={() => anunciarCanal(c)} className="text-[10px] font-medium px-2 py-1 rounded inline-flex items-center gap-1" style={{ background: 'var(--glass-hover)', color: 'var(--dim)' }}><Plus size={10} /> Anunciar</button>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>}
            <div className="text-[10px] text-faint mt-1.5">"Pra netar" = preço de lista que devolve o Preço Bling após as taxas do canal. "Líquido" = o que sobra hoje no preço atual (vermelho = abaixo do Preço Bling). "Aplicar" grava no vínculo do Bling e, na Shopee, empurra direto no anúncio.</div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2">Promoção / Desconto</div>
            {carregandoShopee
              ? <div className="text-faint text-xs flex items-center gap-2 py-3"><Loader2 size={14} className="animate-spin" /> lendo a Shopee…</div>
              : !shopeeItem
                ? <div className="text-faint text-xs rounded-lg px-3 py-3" style={{ background: 'var(--glass-hover)' }}>Sem dados da Shopee para este SKU. Rode "Sincronizar Shopee" no topo do Catálogo.</div>
                : shopeeItem.em_promocao
                  ? <div className="rounded-lg p-3" style={{ background: 'rgba(245,166,35,.10)', border: '1px solid rgba(245,166,35,.4)' }}>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1" style={{ background: 'rgba(245,166,35,.2)', color: '#F5A623' }}><BadgePercent size={11} /> Em campanha</span>
                        {shopeeItem.promo_nome && <span className="text-[11px] text-dim truncate">{shopeeItem.promo_nome}</span>}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Tile label="Preço promo" val={brl(shopeeItem.preco)} cor="#F5A623" small />
                        <Tile label="Preço cheio" val={shopeeItem.preco_original > 0 ? brl(shopeeItem.preco_original) : '—'} small />
                        <Tile label="Desconto" val={shopeeItem.preco_original > shopeeItem.preco ? `-${Math.round((1 - shopeeItem.preco / shopeeItem.preco_original) * 100)}%` : '—'} cor="#F5A623" small />
                      </div>
                      <div className="text-[11px] text-dim mt-2">Líquido-alvo (Preço Bling) <b className="num" style={{ color: 'var(--ok)' }}>{brl(liquidoAlvo)}</b> — é o que você quer receber fora de campanha.</div>
                      <div className="text-[10px] text-faint mt-1.5">Campanhas são criadas e retiradas no Seller Center da Shopee. Aqui a promo aparece pra você não confundir o desconto com erro de preço.</div>
                    </div>
                  : <div className="rounded-lg px-3 py-2.5 text-xs flex items-center justify-between" style={{ background: 'var(--glass-hover)' }}>
                      <span className="text-dim">Sem campanha ativa na Shopee.</span>
                      <span className="num">{shopeeItem.preco > 0 ? brl(shopeeItem.preco) : '—'}</span>
                    </div>}
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2">Concorrência (Radar)</div>
            {carregandoRadar
              ? <div className="text-faint text-xs flex items-center gap-2 py-3"><Loader2 size={14} className="animate-spin" /> lendo o radar…</div>
              : !temRadar
                ? <div className="rounded-lg px-3 py-3 text-xs flex items-center justify-between gap-2" style={{ background: 'var(--glass-hover)' }}>
                    <span className="text-faint">Sem alvos de concorrência para este SKU.</span>
                    <button onClick={onRadar} className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg shrink-0" style={{ background: 'rgba(214,0,127,.14)', color: 'var(--accent)' }}>Configurar radar</button>
                  </div>
                : <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm min-w-0">
                        <div>Menor concorrente <b className="num">{brl(est.menor)}</b></div>
                        {gap != null && <div className="text-[11px] mt-0.5" style={{ color: gap > 0 ? '#FF6F6F' : 'var(--ok)' }}>{gap > 0 ? `você está ${brl(Math.abs(gap))} acima` : gap < 0 ? `você está ${brl(Math.abs(gap))} abaixo` : 'empatado com o menor'}</div>}
                        {est.n ? <div className="text-[10px] text-faint mt-0.5">{est.n} anúncio(s) monitorado(s)</div> : null}
                      </div>
                      <Sparkline pontos={sparkPontos} cor="#4DA3FF" />
                    </div>
                    <button onClick={onRadar} className="text-[11px] mt-2 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)', color: 'var(--dim)' }}><Radar size={12} /> Abrir radar completo</button>
                  </div>}
          </div>

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

          <div>
            <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2">+ Mais neste painel</div>
            <div className="flex flex-wrap gap-2">
              {shopeeItem && shopeeItem.item_id && (
                <button onClick={verReviews} className="text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)', color: 'var(--dim)' }}><Star size={12} /> Avaliações {mostrarReviews ? '▲' : '▼'}</button>
              )}
              <button onClick={onEditarCompleto} className="text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)', color: 'var(--dim)' }}><CheckCircle2 size={12} /> Qualidade do anúncio</button>
              <button onClick={onEditarCompleto} className="text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)', color: 'var(--dim)' }}><Wand2 size={12} /> Conteúdo & IA</button>
              <button onClick={() => notify('Impulsionamento e ADS ficam no módulo de Impulsionamento da Shopee.', 'warn')} className="text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)', color: 'var(--dim)' }}><Zap size={12} /> Impulsionamento / ADS</button>
              <button onClick={() => notify(cobertura != null ? `Cobertura: ${cobertura.toFixed(1)} mês(es) de estoque no ritmo atual de venda.` : 'Sem histórico de vendas pra estimar reposição.', 'ok')} className="text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)', color: 'var(--dim)' }}><Boxes size={12} /> Reposição</button>
              <button onClick={verHist} className="text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)', color: 'var(--dim)' }}><BarChart3 size={12} /> Histórico de preço {mostrarHist ? '▲' : '▼'}</button>
            </div>
            {mostrarHist && (
              <div className="mt-2">
                {carregandoHist
                  ? <div className="text-faint text-xs flex items-center gap-2 py-2"><Loader2 size={14} className="animate-spin" /> lendo o histórico…</div>
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
            {mostrarReviews && (
              <div className="mt-2">
                {carregandoReviews
                  ? <div className="text-faint text-xs flex items-center gap-2 py-2"><Loader2 size={14} className="animate-spin" /> buscando avaliações…</div>
                  : !reviews || reviews.length === 0
                    ? <div className="text-faint text-xs rounded-lg px-3 py-2.5" style={{ background: 'var(--glass-hover)' }}>Sem avaliações recentes para este anúncio.</div>
                    : <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-bold num" style={{ color: '#F5A623' }}>{(reviews.reduce((a, c) => a + (c.rating_star || 0), 0) / reviews.length).toFixed(1)} ★</span>
                          <span className="text-[11px] text-faint">{reviews.length} avaliação(ões) recente(s)</span>
                        </div>
                        <div className="space-y-1.5">
                          {reviews.slice(0, 3).map((c, i) => (
                            <div key={i} className="rounded-lg px-2.5 py-2 text-xs" style={{ background: 'var(--glass-hover)' }}>
                              <div className="num text-[11px]"><span style={{ color: '#F5A623' }}>{'★'.repeat(Math.round(c.rating_star || 0))}</span><span className="text-faint">{'★'.repeat(Math.max(0, 5 - Math.round(c.rating_star || 0)))}</span></div>
                              {c.comment && <div className="text-dim mt-0.5">{c.comment.length > 120 ? c.comment.slice(0, 120) + '…' : c.comment}</div>}
                            </div>
                          ))}
                        </div>
                      </div>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button onClick={onEditarCompleto} className="text-xs px-3 py-2 rounded-lg flex items-center gap-1.5" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)', color: 'var(--dim)' }}><Zap size={13} /> Edição completa / Fotos / IA</button>
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

function PainelKpis({ kpis, brl, onSemCusto }) {
  const lbl = 'text-[9.5px] uppercase tracking-wide text-faint font-bold'
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
        <div className={lbl}>Produtos</div>
        <div className="num text-2xl font-bold mt-1.5">{kpis.total.toLocaleString('pt-BR')}</div>
        <div className="text-[10px] text-faint mt-1">no catálogo</div>
      </div>
      <button onClick={onSemCusto} className="glass rounded-2xl p-4 text-left" style={{ border: '1px solid rgba(224,162,60,.3)' }}>
        <div className={lbl}>Sem custo</div>
        <div className="num text-2xl font-bold mt-1.5" style={{ color: 'var(--warn)' }}>{kpis.semCusto.toLocaleString('pt-BR')}</div>
        <div className="text-[10px] mt-1.5 font-semibold" style={{ color: 'var(--accent)' }}>filtrar e resolver →</div>
      </button>
      <div className="glass rounded-2xl p-4">
        <div className={lbl}>Valor em estoque</div>
        <div className="num text-2xl font-bold mt-1.5">{brl(kpis.valEstoque)}</div>
        <div className="text-[10px] text-faint mt-1">custo × saldo</div>
      </div>
      <div className="glass rounded-2xl p-4">
        <div className={lbl}>Margem média</div>
        <div className="num text-2xl font-bold mt-1.5" style={{ color: kpis.margMedia != null ? 'var(--ok)' : 'var(--text-faint)' }}>
          {kpis.margMedia != null ? kpis.margMedia.toFixed(1) + '%' : '—'}
        </div>
        <div className="text-[10px] text-faint mt-1">média dos com custo</div>
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
    <div className="space-y-3 max-w-6xl animate-pulse">
      <div className="glass rounded-xl h-11" />
      <div className="glass rounded-2xl h-80" />
    </div>
  )
}

function SemDados() {
  return (
    <div className="glass rounded-2xl p-10 grid place-items-center text-center max-w-6xl">
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
