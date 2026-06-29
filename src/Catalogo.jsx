import { useEffect, useMemo, useState } from 'react'
import { Search, RefreshCw, Plug, X, Check, Zap, Radar, Wand2, Database, Loader2, ImageOff, BadgePercent } from 'lucide-react'
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
  const [canal, setCanal] = useState('bling')
  const [cockpit, setCockpit] = useState(null)

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
      .then((d) => setItens(d.itens || []))
      .catch((e) => setErro(e.message))
  }
  useEffect(carregar, [canal])

  const contagem = useMemo(() => {
    const c = { todos: (itens || []).length, lucro_ideal: 0, atencao: 0, critico: 0 }
    ;(itens || []).forEach((i) => { c[i.status] = (c[i.status] || 0) + 1 })
    return c
  }, [itens])

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase()
    return (itens || []).filter((i) =>
      (filtro === 'todos' || i.status === filtro) &&
      (!q || (i.nome || '').toLowerCase().includes(q) || (i.sku || '').toLowerCase().includes(q)))
  }, [itens, busca, filtro])

  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const todosMarcados = filtrados.length > 0 && filtrados.every((i) => sel.has(i.id))
  const toggleTodos = () => setSel((s) => {
    const n = new Set(s)
    if (filtrados.every((i) => n.has(i.id))) filtrados.forEach((i) => n.delete(i.id))
    else filtrados.forEach((i) => n.add(i.id))
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
        <div className="glass rounded-xl flex items-center gap-1 p-1">
          {CANAIS.map((c) => (
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
        <div className="rounded-xl px-4 py-2.5 flex items-center justify-between flex-wrap gap-2" style={{ background: 'var(--glass-hover)', border: '1px solid var(--accent)' }}>
          <span className="text-sm flex items-center gap-2">
            <Zap size={15} className="text-accent" /> <b className="num">{sel.size}</b> selecionado(s)
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
      )}

      {/* Tabela */}
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-faint text-[10px] uppercase tracking-wide border-b" style={{ borderColor: 'var(--glass-border)' }}>
              <th className="px-4 py-3 w-8">
                <input type="checkbox" checked={todosMarcados} onChange={toggleTodos} />
              </th>
              <th className="px-4 py-3">Produto</th>
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
            {filtrados.map((i) => {
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
                        <button onClick={() => setCockpit(i)} className="font-medium truncate max-w-[240px] text-left hover:text-accent transition block">
                          {i.nome}
                        </button>
                        <div className="text-[11px] text-faint num">{i.sku}</div>
                        {(((i.marketplaces || []).some((m) => m.publicado)) || desde(i.atualizado)) && (
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {(i.marketplaces || []).filter((m) => m.publicado).map((m) => {
                              const mk = MK[m.canal] || { nome: m.nome || m.canal, cor: 'var(--dim)', bg: 'var(--glass-hover)' }
                              return <span key={m.canal} className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: mk.bg, color: mk.cor }}>{mk.nome}</span>
                            })}
                            {desde(i.atualizado) && <span className="text-[10px] text-faint">· alterado {desde(i.atualizado)}</span>}
                          </div>
                        )}
                      </div>
                    </div>
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
                  <td className="px-4 py-3 num font-semibold text-right" style={{ color: i.margem_real != null ? s.cor : 'var(--text-faint)' }}>
                    {i.margem_real != null ? `${Number(i.margem_real).toFixed(1)}%` : 'sem custo'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: s.cor + '26', color: s.cor }}>{s.txt}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setDrawer(i)} className="text-sm text-accent hover:underline inline-flex items-center gap-1">
                      <Radar size={14} /> Radar / IA
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtrados.length === 0 && (
              <tr><td colSpan={canal !== 'bling' ? 10 : 9} className="px-4 py-10 text-center text-dim text-sm">Nenhum produto neste filtro.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {cockpit && <CockpitProduto produto={cockpit} canalSel={canal} notify={notify}
        onClose={() => setCockpit(null)}
        onEditarCompleto={() => { const id = cockpit.id; setCockpit(null); setAbrir(id) }}
        onRadar={() => { const p = cockpit; setCockpit(null); setDrawer(p) }}
        onSaved={() => { setCockpit(null); carregar() }} />}
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
  const vinculos = sinc?.vinculos || []
  const est = radarData?.estatisticas || {}
  const temRadar = (est.n || 0) > 0 && est.menor != null
  const meuShopee = vinculos.find((v) => v.canal === 'shopee')
  const meuPreco = meuShopee && meuShopee.preco_registrado > 0 ? meuShopee.preco_registrado : null
  const gap = (temRadar && meuPreco != null) ? meuPreco - est.menor : null

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,.5)' }} onClick={onClose} />
      <div className="fixed top-0 right-0 z-50 flex flex-col" style={{ width: 'min(520px, 96vw)', height: '100vh', background: 'var(--bg)', borderLeft: '1px solid var(--glass-border)' }}>
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
              {(produto.marketplaces || []).filter((m) => m.publicado).map((m) => {
                const mk = MK[m.canal] || { nome: m.nome || m.canal, cor: 'var(--dim)', bg: 'var(--glass-hover)' }
                return <span key={m.canal} className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: mk.bg, color: mk.cor }}>{mk.nome}</span>
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
              <Tile label="Receita líq. 30d" val={brl(faturamento)} small />
              <Tile label="Cobertura" val={cobertura != null ? `${cobertura.toFixed(1)} m` : '—'} small />
              <Tile label="Margem real" val={produto.margem_real != null ? `${Number(produto.margem_real).toFixed(1)}%` : 'sem custo'} cor={produto.margem_real != null ? s.cor : undefined} small />
              <Tile label="Custo" val={produto.custo > 0 ? brl(produto.custo) : '—'} small />
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2">Preço Bling — líquido a receber (fonte da verdade)</div>
            <div className="flex items-center gap-2 rounded-lg p-2.5" style={{ background: 'rgba(0,0,0,.2)', border: '1px solid var(--accent2)' }}>
              <span className="text-faint text-sm">R$</span>
              <input value={precoBling} onChange={(e) => setPrecoBling(e.target.value)} className="bg-transparent outline-none num font-bold text-base flex-1 text-fg" style={{ minWidth: 0 }} />
              <button onClick={salvarPreco} disabled={salvando} className="text-xs font-medium px-3 py-1.5 rounded-lg text-white disabled:opacity-60 flex items-center gap-1.5 shrink-0" style={{ background: 'var(--accent)' }}><Database size={13} /> {salvando ? 'Salvando…' : 'Atualizar no Bling'}</button>
            </div>
            <div className="text-[10px] text-faint mt-1.5">Reajusta o preço-base no Bling. É a base de todos os canais.</div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2">Valor por marketplace</div>
            {carregandoSinc
              ? <div className="text-faint text-xs flex items-center gap-2 py-3"><Loader2 size={14} className="animate-spin" /> lendo os vínculos do Bling…</div>
              : vinculos.length === 0
                ? <div className="text-faint text-xs rounded-lg px-3 py-3" style={{ background: 'var(--glass-hover)' }}>Nenhum vínculo de marketplace encontrado para este produto no Bling.</div>
                : <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
                    <table className="w-full text-xs">
                      <thead><tr className="text-faint text-[9px] uppercase" style={{ background: 'var(--glass-hover)' }}>
                        <th className="text-left px-2.5 py-2">Canal</th><th className="px-2 py-2">Anunc.</th><th className="text-right px-2 py-2">Atual</th><th className="text-right px-2.5 py-2">Pra netar</th><th className="text-right px-2.5 py-2">Ação</th>
                      </tr></thead>
                      <tbody>
                        {vinculos.map((v, idx) => {
                          const mk = MK[v.canal] || { nome: v.nome || v.canal, cor: 'var(--dim)', bg: 'var(--glass-hover)' }
                          return (
                            <tr key={idx} style={idx < vinculos.length - 1 ? { borderBottom: '1px solid var(--glass-border)' } : undefined}>
                              <td className="px-2.5 py-2"><span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: mk.bg, color: mk.cor }}>{mk.nome}</span></td>
                              <td className="px-2 py-2 text-center">{v.publicado ? <span style={{ color: 'var(--ok)' }}>✓</span> : <span className="text-faint">—</span>}</td>
                              <td className="px-2 py-2 text-right num" style={v.prejuizo ? { color: '#FF6F6F' } : undefined}>{v.preco_registrado > 0 ? brl(v.preco_registrado) : '—'}</td>
                              <td className="px-2.5 py-2 text-right num font-medium" style={{ color: 'var(--accent)' }}>{v.preco_alvo != null ? brl(v.preco_alvo) : '—'}</td>
                              <td className="px-2.5 py-2 text-right">
                                {v.id_loja && v.preco_alvo != null
                                  ? (aplicandoCanal === v.id_loja
                                      ? <span className="text-faint text-[10px] inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" />…</span>
                                      : confirmarCanal === v.id_loja
                                        ? <button onClick={() => aplicarCanal(v)} className="text-[10px] font-bold px-2 py-1 rounded" style={{ background: 'rgba(245,166,35,.18)', color: '#F5A623' }}>Confirmar</button>
                                        : <button onClick={() => setConfirmarCanal(v.id_loja)} className="text-[10px] font-medium px-2 py-1 rounded" style={{ background: 'rgba(214,0,127,.14)', color: 'var(--accent)' }}>Aplicar</button>)
                                  : <span className="text-faint text-[10px]">—</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>}
            <div className="text-[10px] text-faint mt-1.5">"Pra netar" = preço de lista que devolve o Preço Bling após as taxas do canal. "Aplicar" grava no vínculo do Bling (fonte da verdade) e, na Shopee, ainda empurra direto no anúncio se o cache estiver sincronizado — assim o ajuste não some na próxima sincronização.</div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2">Promoção na Shopee</div>
            {carregandoShopee
              ? <div className="text-faint text-xs flex items-center gap-2 py-3"><Loader2 size={14} className="animate-spin" /> lendo a Shopee…</div>
              : !shopeeItem
                ? <div className="text-faint text-xs rounded-lg px-3 py-3" style={{ background: 'var(--glass-hover)' }}>Sem dados da Shopee para este SKU. Rode "Sincronizar Shopee" no topo do Catálogo.</div>
                : shopeeItem.em_promocao
                  ? <div className="rounded-lg p-3" style={{ background: 'rgba(245,166,35,.10)', border: '1px solid rgba(245,166,35,.4)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1" style={{ background: 'rgba(245,166,35,.2)', color: '#F5A623' }}><BadgePercent size={11} /> Em campanha</span>
                        {shopeeItem.promo_nome && <span className="text-[11px] text-dim truncate">{shopeeItem.promo_nome}</span>}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Tile label="Preço promo" val={brl(shopeeItem.preco)} cor="#F5A623" small />
                        <Tile label="Preço cheio" val={shopeeItem.preco_original > 0 ? brl(shopeeItem.preco_original) : '—'} small />
                        <Tile label="Desconto" val={shopeeItem.preco_original > shopeeItem.preco ? `-${Math.round((1 - shopeeItem.preco / shopeeItem.preco_original) * 100)}%` : '—'} cor="#F5A623" small />
                      </div>
                    </div>
                  : <div className="rounded-lg px-3 py-2.5 text-xs flex items-center justify-between" style={{ background: 'var(--glass-hover)' }}>
                      <span className="text-dim">Sem campanha ativa na Shopee.</span>
                      <span className="num">{shopeeItem.preco > 0 ? brl(shopeeItem.preco) : '—'}</span>
                    </div>}
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wide text-faint font-bold mb-2">Radar de concorrência</div>
            {carregandoRadar
              ? <div className="text-faint text-xs flex items-center gap-2 py-3"><Loader2 size={14} className="animate-spin" /> lendo o radar…</div>
              : !temRadar
                ? <div className="rounded-lg px-3 py-3 text-xs flex items-center justify-between gap-2" style={{ background: 'var(--glass-hover)' }}>
                    <span className="text-faint">Sem alvos de concorrência para este SKU.</span>
                    <button onClick={onRadar} className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg shrink-0" style={{ background: 'rgba(214,0,127,.14)', color: 'var(--accent)' }}>Configurar radar</button>
                  </div>
                : <div>
                    <div className="grid grid-cols-3 gap-2">
                      <Tile label="Menor concorrente" val={brl(est.menor)} small />
                      <Tile label="Meu preço (Shopee)" val={meuPreco != null ? brl(meuPreco) : '—'} small />
                      <Tile label="Gap" val={gap != null ? `${gap >= 0 ? '+' : '−'}${brl(Math.abs(gap)).replace('R$ ', 'R$ ')}` : '—'} cor={gap != null ? (gap > 0 ? '#FF6F6F' : 'var(--ok)') : undefined} small />
                    </div>
                    {gap != null && (
                      <div className="text-[10px] mt-1.5" style={{ color: gap > 0 ? '#FF6F6F' : 'var(--ok)' }}>
                        {gap > 0 ? `Você está ${brl(Math.abs(gap))} acima do menor concorrente.` : gap < 0 ? `Você está ${brl(Math.abs(gap))} abaixo do menor concorrente.` : 'Empatado com o menor concorrente.'}
                      </div>
                    )}
                    <div className="mt-2 rounded-lg overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
                      {(radarData.series || []).slice(0, 5).map((sr, idx, arr) => {
                        const last = sr.pontos && sr.pontos.length ? sr.pontos[sr.pontos.length - 1] : null
                        const eMenor = last && est.menor != null && Math.abs(last.preco - est.menor) < 0.01
                        return (
                          <div key={idx} className="flex items-center justify-between px-2.5 py-1.5 text-xs" style={idx < arr.length - 1 ? { borderBottom: '1px solid var(--glass-border)' } : undefined}>
                            <span className="text-dim truncate" style={{ maxWidth: '62%' }}>{sr.nome || '—'}</span>
                            <span className="num" style={eMenor ? { color: 'var(--ok)', fontWeight: 600 } : undefined}>{last ? brl(last.preco) : '—'}</span>
                          </div>
                        )
                      })}
                    </div>
                    <button onClick={onRadar} className="text-[11px] mt-2 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)', color: 'var(--dim)' }}><Radar size={12} /> Abrir radar completo</button>
                  </div>}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button onClick={onEditarCompleto} className="text-xs px-3 py-2 rounded-lg flex items-center gap-1.5" style={{ background: 'var(--glass-hover)', border: '1px solid var(--glass-border)', color: 'var(--dim)' }}><Zap size={13} /> Edição completa / Fotos / IA</button>
          </div>
        </div>
      </div>
    </>
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
