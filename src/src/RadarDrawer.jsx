import { useState } from 'react'
import { X, SearchCheck, Sparkles } from 'lucide-react'
import { api, DEFAULT_CUSTOS } from './api.js'

const corMargem = (m) => (m >= 30 ? 'var(--ok)' : m >= 15 ? 'var(--warn)' : 'var(--danger)')
const dominio = (u) => {
  try {
    return new URL(u).hostname.replace('www.', '')
  } catch {
    return u
  }
}

export default function RadarDrawer({ produto, onClose }) {
  const [urls, setUrls] = useState('')
  const [radar, setRadar] = useState(null)
  const [varrendo, setVarrendo] = useState(false)
  const [desc, setDesc] = useState('')
  const [gerando, setGerando] = useState(false)

  const varrer = async () => {
    const lista = urls.split('\n').map((u) => u.trim()).filter(Boolean)
    if (lista.length === 0) return
    setVarrendo(true)
    setRadar(null)
    try {
      const r = await api.concorrenciaPrecos({
        urls: lista,
        custo_base: (produto.custo || 0) + (DEFAULT_CUSTOS.embalagem || 0),
        canal: 'mercadolivre',
        imposto: DEFAULT_CUSTOS.imposto,
        cartao: DEFAULT_CUSTOS.cartao,
      })
      setRadar(r.resultados || [])
    } catch (e) {
      setRadar([{ erro: e.message }])
    }
    setVarrendo(false)
  }

  const gerar = async () => {
    setGerando(true)
    try {
      const r = await api.iaDescricao({ nome_produto: produto.nome, caracteristicas: '' })
      setDesc(r.descricao_gerada)
    } catch (e) {
      setDesc('Erro: ' + e.message)
    }
    setGerando(false)
  }

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
      <div className="fixed inset-y-0 right-0 w-full max-w-md glass z-50 flex flex-col p-5 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">Central do produto</h3>
          <button onClick={onClose} className="text-dim hover:text-fg">
            <X size={20} />
          </button>
        </div>

        <div className="mb-1 font-medium">{produto.nome}</div>
        <div className="text-xs text-faint num mb-5">
          Custo base: R$ {Number(produto.custo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>

        <div className="glass rounded-xl p-4 mb-5">
          <div className="text-xs text-dim uppercase tracking-wide mb-2">Radar de concorrência</div>
          <textarea
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            rows={3}
            placeholder="Cole os links (um por linha)…"
            className="w-full bg-glass border border-glassb rounded-lg p-2 text-xs font-mono outline-none text-fg resize-none mb-2 focus:border-accent"
          />
          <button
            disabled={varrendo}
            onClick={varrer}
            className="w-full rounded-lg py-2 text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: 'var(--accent)' }}
          >
            <SearchCheck size={15} /> {varrendo ? 'Varrendo…' : 'Varrer concorrentes'}
          </button>

          <div className="mt-3 space-y-2">
            {radar?.map((r, i) =>
              r.preco_concorrente != null ? (
                <div key={i} className="glass rounded-lg p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-[10px] text-faint truncate max-w-[180px]">{dominio(r.url)}</div>
                    <div className="text-lg font-bold num">R$ {Number(r.preco_concorrente).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-faint">se igualar</div>
                    <div className="font-semibold num" style={{ color: corMargem(r.simulacao?.margem_liquida || 0) }}>
                      {(r.simulacao?.margem_liquida || 0).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  key={i}
                  className="rounded-lg p-2 text-xs"
                  style={{ background: 'color-mix(in srgb, var(--danger) 12%, transparent)', color: 'var(--danger)' }}
                >
                  {r.erro || 'Preço não encontrado'} {r.url ? `(${dominio(r.url)})` : ''}
                </div>
              )
            )}
          </div>
        </div>

        <button
          disabled={gerando}
          onClick={gerar}
          className="w-full glass rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2 text-accent disabled:opacity-60"
        >
          <Sparkles size={15} /> {gerando ? 'Gerando…' : 'Gerar descrição blindada (IA)'}
        </button>
        {desc && (
          <div className="glass rounded-xl p-3 mt-3 text-sm whitespace-pre-wrap leading-relaxed">{desc}</div>
        )}
      </div>
    </>
  )
}
