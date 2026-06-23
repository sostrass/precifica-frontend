import { useEffect, useMemo, useState } from 'react'
import { Search, RefreshCw, Plug, X, Check, Zap, Radar, Wand2, Database, Loader2 } from 'lucide-react'
import { api, DEFAULT_CUSTOS } from './api.js'
import { useToast } from './toast.jsx'
import RadarDrawer from './RadarDrawer.jsx'
import ProdutoModal from './ProdutoModal.jsx'

const STATUS = {
  lucro_ideal: { txt: 'Saudável', cor: 'var(--ok)' },
  atencao: { txt: 'Atenção', cor: 'var(--warn)' },
  critico: { txt: 'Crítico', cor: 'var(--danger)' },
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

  const carregar = () => {
    setItens(null); setErro('')
    api.monitoramento({ custos_globais: DEFAULT_CUSTOS, canal: 'mercadolivre' })
      .then((d) => setItens(d.itens || []))
      .catch((e) => setErro(e.message))
  }
  useEffect(carregar, [])

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
    { id: 'critico', label: 'Crítico', cor: 'var(--danger)' },
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
        <button onClick={carregar} className="glass rounded-xl px-3 py-2 text-sm flex items-center gap-2 text-dim hover:text-fg">
          <RefreshCw size={15} /> Atualizar
        </button>
        <button onClick={sincronizarTudo} disabled={syncStatus?.status === 'rodando'}
                className="rounded-xl px-3 py-2 text-sm flex items-center gap-2 disabled:opacity-70"
                style={{ background: 'rgba(230,180,80,.12)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
          <Database size={15} /> {syncStatus?.status === 'rodando' ? 'Sincronizando…' : 'Sincronizar catálogo completo'}
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
            <button disabled={aplicando || loteIa} onClick={aplicarLote}
                    className="rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60 flex items-center gap-2"
                    style={{ background: 'var(--accent)' }}>
              <Check size={14} /> {aplicando ? 'Aplicando…' : 'Aplicar preço'}
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
              <th className="px-4 py-3 text-right">Preço atual</th>
              <th className="px-4 py-3 text-right">Sugerido</th>
              <th className="px-4 py-3 text-right">Margem</th>
              <th className="px-4 py-3">Sinal</th>
              <th className="px-4 py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((i) => {
              const s = STATUS[i.status] || STATUS.atencao
              const delta = (i.preco_sugerido || 0) - (i.preco_atual || 0)
              return (
                <tr key={i.id} className="border-b transition hover:bg-[var(--glass-hover)]" style={{ borderColor: 'var(--glass-border)' }}>
                  <td className="px-4 py-3"><input type="checkbox" checked={sel.has(i.id)} onChange={() => toggle(i.id)} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => setAbrir(i.id)} className="font-medium truncate max-w-[260px] text-left hover:text-accent transition block">
                      {i.nome}
                    </button>
                    <div className="text-[11px] text-faint num">{i.sku}</div>
                  </td>
                  <td className="px-4 py-3 num text-dim text-right">{brl(i.custo)}</td>
                  <td className="px-4 py-3 num text-right">{brl(i.preco_atual)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="num text-accent font-medium">{brl(i.preco_sugerido)}</span>
                    {Math.abs(delta) >= 0.01 && (
                      <span className="num text-[11px] text-faint ml-1">({delta > 0 ? '+' : '−'}{brl(Math.abs(delta)).replace('R$ ', '')})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 num font-semibold text-right" style={{ color: s.cor }}>
                    {Number(i.margem_liquida || 0).toFixed(1)}%
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
              <tr><td colSpan={8} className="px-4 py-10 text-center text-dim text-sm">Nenhum produto neste filtro.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {drawer && <RadarDrawer produto={drawer} onClose={() => setDrawer(null)} />}
      {abrir && <ProdutoModal produtoId={abrir} onClose={() => setAbrir(null)} onSaved={carregar} />}
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
