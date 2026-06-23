import { useState, useEffect } from 'react'
import {
  Search, ArrowLeft, Loader2, RefreshCw, Crown, ShieldCheck, FileText, Target, Boxes,
  DollarSign, ImageIcon, CheckCircle2, Info, AlertTriangle, AlertCircle, Wand2, Sparkles,
  TrendingUp, ExternalLink, Package, ListChecks,
} from 'lucide-react'
import { api } from './api.js'
import { useToast } from './toast.jsx'

const ICON_DIRETOR = { dollar: DollarSign, shield: ShieldCheck, image: ImageIcon, file: FileText, target: Target, boxes: Boxes, crown: Crown }
const STATUS = {
  ok: { cor: 'var(--ok, #14B8A6)', Icon: CheckCircle2 },
  info: { cor: 'var(--faint, #8A8A8A)', Icon: Info },
  alerta: { cor: 'var(--warn, #E6B450)', Icon: AlertTriangle },
  acao: { cor: 'var(--danger, #FF6F6F)', Icon: AlertCircle },
}
const corSaude = (s) => (s >= 80 ? 'var(--ok, #14B8A6)' : s >= 50 ? 'var(--warn, #E6B450)' : 'var(--danger, #FF6F6F)')
const money = (x) => 'R$ ' + Number(x || 0).toFixed(2).replace('.', ',')

function AnelSaude({ score }) {
  const r = 26, c = 2 * Math.PI * r
  const off = c * (1 - (score || 0) / 100)
  const cor = corSaude(score || 0)
  return (
    <div className="relative shrink-0" style={{ width: 68, height: 68 }}>
      <svg width="68" height="68" className="-rotate-90">
        <circle cx="34" cy="34" r={r} fill="none" stroke="var(--glass-border)" strokeWidth="5" />
        <circle cx="34" cy="34" r={r} fill="none" stroke={cor} strokeWidth="5" strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center leading-none">
          <div className="text-lg font-display font-bold" style={{ color: cor }}>{score ?? '—'}</div>
          <div className="text-[8px] text-faint uppercase tracking-wide">saúde</div>
        </div>
      </div>
    </div>
  )
}

export default function Conselho() {
  const notify = useToast()
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [produto, setProduto] = useState(null)
  const [conselho, setConselho] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [acaoLoad, setAcaoLoad] = useState(null)
  const [pos, setPos] = useState(null)
  const [posLoad, setPosLoad] = useState(false)
  const [canal, setCanal] = useState('mercado_livre')

  useEffect(() => {
    if (!busca.trim()) { setResultados([]); setBuscando(false); return }
    setBuscando(true)
    const t = setTimeout(async () => {
      try { const r = await api.catalogoListar(busca, 1); setResultados(r.itens || []) }
      catch { setResultados([]) }
      setBuscando(false)
    }, 350)
    return () => clearTimeout(t)
  }, [busca])

  const abrir = async (p) => {
    setProduto(p); setConselho(null); setCarregando(true); setPos(null); setResultados([]); setBusca('')
    try { const r = await api.produtoConselho(p.id); setConselho(r) }
    catch (e) { notify(e.message, 'danger') }
    setCarregando(false)
  }
  const recarregar = async () => {
    if (!produto) return
    setCarregando(true)
    try { const r = await api.produtoConselho(produto.id); setConselho(r) } catch (e) { notify(e.message, 'danger') }
    setCarregando(false)
  }
  const acaoIA = async (campo) => {
    setAcaoLoad(campo)
    try {
      const r = await api.loteIa({ produto_ids: [produto.id], campo, aplicar: true })
      const ok = (r.ok || 0) > 0
      notify(ok ? `${campo === 'titulo' ? 'Título' : 'Descrição'} reescrito e aplicado no Bling` : 'IA gerou o texto — confira no Bling', ok ? 'ok' : 'warn')
      recarregar()
    } catch (e) { notify(e.message, 'danger') }
    setAcaoLoad(null)
  }
  const verPosicionamento = async (c) => {
    const alvo = c || canal
    setPosLoad(true); setPos(null)
    try { const r = await api.produtoPosicionamento(produto.id, alvo); setPos(r) }
    catch (e) { notify(e.message, 'danger') }
    setPosLoad(false)
  }

  // ---- Seleção de produto ----
  if (!produto) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center pt-4">
          <div className="h-14 w-14 rounded-2xl grid place-items-center mx-auto mb-3" style={{ background: 'color-mix(in srgb, var(--accent) 14%, transparent)' }}>
            <Crown size={26} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="font-display font-semibold text-xl">Conselho de IA</div>
          <div className="text-sm text-dim max-w-md mx-auto mt-1">Um conselho de diretores virtuais analisa um produto seu — preço, cadastro, mídia, conteúdo, canais e operação — e entrega um plano de ação priorizado.</div>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} autoFocus
                 placeholder="Buscar um produto por nome ou SKU…"
                 className="w-full glass rounded-xl pl-10 pr-3 py-3 text-sm bg-transparent outline-none" />
          {buscando && <Loader2 size={15} className="animate-spin absolute right-3.5 top-1/2 -translate-y-1/2 text-faint" />}
        </div>
        {resultados.length > 0 && (
          <div className="glass rounded-2xl divide-y overflow-hidden" style={{ borderColor: 'var(--glass-border)' }}>
            {resultados.slice(0, 12).map((p) => (
              <button key={p.id} onClick={() => abrir(p)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--glass-hover)]">
                <Package size={15} className="text-faint shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="text-sm truncate block">{p.nome}</span>
                  <span className="text-[10px] text-faint num">SKU {p.sku} · {money(p.preco)}</span>
                </span>
                <ArrowLeft size={14} className="text-faint rotate-180" />
              </button>
            ))}
          </div>
        )}
        {busca && !buscando && resultados.length === 0 && (
          <div className="text-sm text-faint text-center py-6">Nenhum produto encontrado. {`(o catálogo precisa estar sincronizado)`}</div>
        )}
      </div>
    )
  }

  // ---- Conselho aberto ----
  const dirs = conselho?.diretores || []
  const gerente = dirs.find((d) => d.icone === 'crown')
  const outros = dirs.filter((d) => d.icone !== 'crown')
  const plano = conselho?.plano || []
  const sintese = gerente?.subagentes?.[0]

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="glass rounded-2xl p-4 flex items-center gap-4">
        <button onClick={() => { setProduto(null); setConselho(null) }} className="h-9 w-9 grid place-items-center rounded-lg glass text-dim hover:text-fg shrink-0"><ArrowLeft size={17} /></button>
        {conselho ? <AnelSaude score={conselho.saude} /> : <Loader2 size={20} className="animate-spin text-faint" />}
        <div className="min-w-0 flex-1">
          <div className="font-display font-semibold truncate">{produto.nome}</div>
          <div className="text-xs text-faint num">SKU {produto.sku} · {money(produto.preco)}</div>
        </div>
        <button onClick={recarregar} disabled={carregando} className="h-9 w-9 grid place-items-center rounded-lg glass text-dim hover:text-fg shrink-0">
          <RefreshCw size={15} className={carregando ? 'animate-spin' : ''} />
        </button>
      </div>

      {carregando && !conselho && (
        <div className="py-12 text-center text-faint flex items-center justify-center gap-2"><Loader2 size={18} className="animate-spin" /> o conselho está analisando o produto…</div>
      )}

      {conselho && (
        <>
          {/* Síntese do Gerente Geral */}
          {sintese && (
            <div className="glass rounded-2xl p-4" style={{ border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Crown size={16} style={{ color: 'var(--accent)' }} />
                <span className="text-sm font-semibold">Gerente Geral</span>
              </div>
              <div className="text-sm text-dim">{sintese.texto}</div>
            </div>
          )}

          {/* Plano de ações */}
          {plano.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <div className="text-sm font-medium flex items-center gap-2 mb-3"><ListChecks size={15} style={{ color: 'var(--accent)' }} /> Plano de ação <span className="text-faint">({plano.length})</span></div>
              <div className="space-y-2">
                {plano.map((a, i) => {
                  const ia = a.acao?.ia_campo
                  const campo = ia ? (String(ia).toLowerCase().includes('títul') ? 'titulo' : 'descricao') : null
                  return (
                    <div key={i} className="flex items-start gap-3 rounded-xl px-3 py-2.5" style={{ background: 'var(--glass-hover)' }}>
                      <span className="text-[10px] font-bold mt-0.5 px-1.5 py-0.5 rounded shrink-0" style={{ background: 'color-mix(in srgb, var(--accent) 16%, transparent)', color: 'var(--accent)' }}>{a.agente}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{a.titulo}</div>
                        <div className="text-xs text-faint">{a.detalhe}</div>
                      </div>
                      {campo
                        ? <button onClick={() => acaoIA(campo)} disabled={acaoLoad === campo}
                                  className="text-xs px-2.5 py-1.5 rounded-lg font-medium text-white flex items-center gap-1.5 shrink-0 disabled:opacity-60" style={{ background: 'var(--accent)' }}>
                            {acaoLoad === campo ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} Gerar
                          </button>
                        : a.acao?.campos?.preco != null
                          ? <span className="text-xs num font-semibold shrink-0" style={{ color: 'var(--accent)' }}>{money(a.acao.campos.preco)}</span>
                          : null}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Diretores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {outros.map((d, i) => {
              const Ic = ICON_DIRETOR[d.icone] || Boxes
              const crit = d.subagentes.filter((s) => s.status === 'acao').length
              return (
                <div key={i} className="glass rounded-2xl p-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="h-8 w-8 rounded-lg grid place-items-center shrink-0" style={{ background: 'var(--glass-hover)' }}>
                      <Ic size={16} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold leading-tight">{d.nome}</div>
                      <div className="text-[11px] text-faint">{d.papel}</div>
                    </div>
                    {crit > 0 && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0" style={{ background: 'color-mix(in srgb, var(--danger) 16%, transparent)', color: 'var(--danger)' }}>{crit} ação</span>}
                  </div>
                  <div className="space-y-2">
                    {d.subagentes.map((s, j) => {
                      const st = STATUS[s.status] || STATUS.info
                      return (
                        <div key={j} className="flex items-start gap-2">
                          <st.Icon size={14} style={{ color: st.cor }} className="mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-medium">{s.nome}</span>
                            <span className="text-xs text-dim"> — {s.texto}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Posicionamento ao vivo — multi-marketplace */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3"><Target size={15} style={{ color: 'var(--accent)' }} /> <span className="text-sm font-medium">Posicionamento ao vivo</span></div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1.5 flex-wrap">
                {[['mercado_livre', 'Mercado Livre'], ['shopee', 'Shopee'], ['tiktok', 'TikTok'], ['shein', 'Shein']].map(([id, t]) => (
                  <button key={id} onClick={() => { setCanal(id); setPos(null) }} className="text-xs px-3 py-1.5 rounded-lg font-medium transition"
                          style={canal === id ? { background: 'var(--accent)', color: '#1a1a1a' } : { background: 'var(--glass-hover)', color: 'var(--text-dim)' }}>{t}</button>
                ))}
              </div>
              <button onClick={() => verPosicionamento()} disabled={posLoad}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium glass text-dim hover:text-fg flex items-center gap-1.5 disabled:opacity-60 ml-auto">
                {posLoad ? <Loader2 size={13} className="animate-spin" /> : <TrendingUp size={13} />} Comparar
              </button>
            </div>
            {posLoad && <div className="text-xs text-faint mt-3 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> buscando concorrentes… (scraping pode levar alguns segundos)</div>}
            {pos && !posLoad && (
              ['sem_navegador', 'vazio', 'sem_descoberta'].includes(pos.modo)
                ? <div className="mt-3 rounded-xl p-3" style={{ background: 'var(--glass-hover)' }}>
                    <div className="text-xs text-dim flex items-start gap-2">
                      <Info size={14} className="mt-0.5 shrink-0" style={{ color: pos.modo === 'vazio' ? 'var(--warn, #E6B450)' : 'var(--warn, #E6B450)' }} />
                      <div>
                        <div className="font-medium mb-1">{pos.nome_canal}: {pos.modo === 'vazio' ? 'sem resultados agora' : 'descoberta por termo ainda não está pronta no deploy'}</div>
                        <div className="text-faint">{pos.motivo}</div>
                        <div className="mt-2 flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ok, #14B8A6)' }}><CheckCircle2 size={12} /> Rastrear a URL de um concorrente já funciona — cadastre no Radar pra acompanhar o preço dele ao longo do tempo.</div>
                        {pos.como_ativar && <div className="text-[11px] text-faint mt-1">{pos.como_ativar}</div>}
                      </div>
                    </div>
                  </div>
                : pos.indisponivel
                  ? <div className="text-xs text-faint mt-3">{pos.motivo || 'Comparação indisponível neste canal.'}</div>
                  : pos.posicionamento?.posicao === 'sem_dados'
                    ? <div className="text-xs text-faint mt-3">Não achei concorrentes para “{pos.termo}”.</div>
                    : <div className="mt-3 space-y-3">
                        <div className="flex items-center gap-3 flex-wrap text-xs">
                          <span className="px-2 py-1 rounded-lg font-medium" style={{ background: 'var(--glass-hover)' }}>
                            Seu preço: <b className="num">{money(pos.posicionamento.meu_preco)}</b>
                          </span>
                          <span className="text-faint">menor <b className="num text-fg">{money(pos.posicionamento.min)}</b></span>
                          <span className="text-faint">mediana <b className="num text-fg">{money(pos.posicionamento.mediana)}</b></span>
                          <span className="text-faint">maior <b className="num text-fg">{money(pos.posicionamento.max)}</b></span>
                          <span className="px-2 py-1 rounded-lg font-medium" style={{ background: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent)' }}>
                            {pos.posicionamento.percentil_mais_barato_que_voce}% mais baratos que você
                          </span>
                        </div>
                        <div className="space-y-1">
                          {(pos.concorrentes || []).slice(0, 6).map((c, i) => (
                            <a key={i} href={c.link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs rounded-lg px-3 py-1.5 hover:bg-[var(--glass-hover)]">
                              <span className="flex-1 truncate text-dim">{c.nome}</span>
                              {c.vendas != null && <span className="text-[10px] text-faint">{c.vendas} vend.</span>}
                              <span className="num font-medium">{money(c.preco)}</span>
                              <ExternalLink size={11} className="text-faint" />
                            </a>
                          ))}
                        </div>
                      </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
