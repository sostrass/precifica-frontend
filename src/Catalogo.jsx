import { useEffect, useMemo, useState } from 'react'
import { Search, RefreshCw } from 'lucide-react'
import { api, DEFAULT_CUSTOS } from './api.js'
import { useToast } from './toast.jsx'
import RadarDrawer from './RadarDrawer.jsx'

const STATUS = {
  lucro_ideal: { txt: 'Lucro ideal', cor: 'var(--ok)' },
  atencao: { txt: 'Atenção', cor: 'var(--warn)' },
  critico: { txt: 'Crítico', cor: 'var(--danger)' },
}
const fmt = (n) => Number(n || 0).toFixed(2).replace('.', ',')

export default function Catalogo() {
  const notify = useToast()
  const [itens, setItens] = useState(null)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [sel, setSel] = useState(() => new Set())
  const [drawer, setDrawer] = useState(null)
  const [aplicando, setAplicando] = useState(false)

  const carregar = () => {
    setItens(null)
    setErro('')
    api
      .monitoramento({ custos_globais: DEFAULT_CUSTOS, canal: 'mercadolivre' })
      .then((d) => setItens(d.itens || []))
      .catch((e) => setErro(e.message))
  }
  useEffect(carregar, [])

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase()
    return (itens || []).filter(
      (i) => !q || (i.nome || '').toLowerCase().includes(q) || (i.sku || '').toLowerCase().includes(q)
    )
  }, [itens, busca])

  const toggle = (id) =>
    setSel((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const aplicarLote = async () => {
    const escolhidos = (itens || []).filter((i) => sel.has(i.id))
    if (escolhidos.length === 0) return
    setAplicando(true)
    try {
      const r = await api.precificarLote({
        custos_globais: DEFAULT_CUSTOS,
        canal: 'mercadolivre',
        aplicar: true,
        itens: escolhidos.map((i) => ({ produto_id: i.id, custo: i.custo })),
      })
      const ok = r.itens.filter((x) => x.aplicado).length
      notify(`${ok} de ${escolhidos.length} preços atualizados no Bling`, ok ? 'ok' : 'warn')
      setSel(new Set())
      carregar()
    } catch (e) {
      notify(e.message, 'danger')
    }
    setAplicando(false)
  }

  if (erro) return <div className="glass rounded-2xl p-10 text-center text-dim">{erro}</div>
  if (!itens) return <div className="glass rounded-2xl p-10 text-center text-dim">Carregando…</div>

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="glass rounded-xl flex items-center gap-2 px-3 py-2 flex-1">
          <Search size={16} className="text-faint" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou SKU…"
            className="bg-transparent outline-none text-sm flex-1 text-fg"
          />
        </div>
        <button onClick={carregar} className="glass rounded-xl px-3 py-2 text-sm flex items-center gap-2 text-dim">
          <RefreshCw size={15} /> Atualizar
        </button>
      </div>

      {sel.size > 0 && (
        <div className="glass rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm text-dim">{sel.size} selecionado(s)</span>
          <button
            disabled={aplicando}
            onClick={aplicarLote}
            className="rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: 'var(--accent)' }}
          >
            {aplicando ? 'Aplicando…' : 'Aplicar preço sugerido (lote)'}
          </button>
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-dim text-xs uppercase tracking-wide border-b" style={{ borderColor: 'var(--glass-border)' }}>
              <th className="px-4 py-3 w-8"></th>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Custo</th>
              <th className="px-4 py-3">Preço atual</th>
              <th className="px-4 py-3">Sugerido</th>
              <th className="px-4 py-3">Margem</th>
              <th className="px-4 py-3">Sinal</th>
              <th className="px-4 py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((i) => {
              const s = STATUS[i.status] || STATUS.atencao
              return (
                <tr key={i.id} className="border-b transition hover:bg-[var(--glass-hover)]" style={{ borderColor: 'var(--glass-border)' }}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={sel.has(i.id)} onChange={() => toggle(i.id)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{i.nome}</div>
                    <div className="text-xs text-faint num">{i.sku}</div>
                  </td>
                  <td className="px-4 py-3 num text-dim">R$ {fmt(i.custo)}</td>
                  <td className="px-4 py-3 num">R$ {fmt(i.preco_atual)}</td>
                  <td className="px-4 py-3 num text-accent">R$ {fmt(i.preco_sugerido)}</td>
                  <td className="px-4 py-3 num font-semibold" style={{ color: s.cor }}>
                    {fmt(i.margem_liquida)}%
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{ background: `color-mix(in srgb, ${s.cor} 15%, transparent)`, color: s.cor }}
                    >
                      {s.txt}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setDrawer(i)} className="text-sm text-accent hover:underline">
                      Radar / IA
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {drawer && <RadarDrawer produto={drawer} onClose={() => setDrawer(null)} />}
    </div>
  )
}
