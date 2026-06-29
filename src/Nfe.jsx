import { useState, useEffect, useRef } from 'react'
import {
  FileText, Settings2, Plug, RefreshCw, Plus, Trash2, Send, Percent, DollarSign,
  Truck, Lock, ChevronRight, Zap, Info, X, Download, ExternalLink, User, Receipt, MapPin,
  CheckCircle2, AlertTriangle, Clock, HelpCircle, PauseCircle, Activity, Hash, CreditCard,
  Eye, Landmark, ShieldCheck, Bell, Sparkles, TrendingDown, Search, ToggleRight, Users, Inbox, ShoppingBag,
  CheckSquare, Square, BarChart3, Copy, Package, Loader2,
  Store, ArrowRight, FileDown, Calendar, TrendingUp, ChevronDown, FileCheck2, CircleAlert,
} from 'lucide-react'

const PLATAFORMA_COR = {
  'Shopee': '#EE4D2D', 'Mercado Livre': '#2D8CFF', 'Amazon': '#FF9900',
  'Magalu': '#0086FF', 'Americanas': '#E60014', 'TikTok Shop': '#FE2C55',
  'NuvemShop': '#2D3277', 'Shein': '#000000', 'Olist': '#7B2D8E', 'Tray': '#00B2A9',
  'WooCommerce': '#7F54B3', 'Loja Integrada': '#00A859', 'VTEX': '#F71963', 'Shopify': '#95BF47',
  'Site próprio': '#7b2a8c',
}
const PLATAFORMA_DOMINIO = {
  'Shopee': 'shopee.com.br', 'Mercado Livre': 'mercadolivre.com.br', 'Amazon': 'amazon.com.br',
  'Magalu': 'magazineluiza.com.br', 'Americanas': 'americanas.com.br', 'TikTok Shop': 'tiktok.com',
  'NuvemShop': 'nuvemshop.com.br', 'Shein': 'shein.com', 'Olist': 'olist.com', 'Tray': 'tray.com.br',
  'WooCommerce': 'woocommerce.com', 'Loja Integrada': 'lojaintegrada.com.br', 'VTEX': 'vtex.com',
  'Shopify': 'shopify.com',
}

// rgba a partir de hex — Safari 13.1 (High Sierra) não suporta color-mix()
const hexA = (hex, a) => {
  const m = String(hex || '').replace('#', '')
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  const r = parseInt(n.slice(0, 2), 16) || 0
  const g = parseInt(n.slice(2, 4), 16) || 0
  const b = parseInt(n.slice(4, 6), 16) || 0
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
const ACCENT = '#d6007f', ACCENT2 = '#7b2a8c'
const C_OK = '#1d9e75', C_WARN = '#C77F1A', C_DANGER = '#a32d2d'

// fundo translúcido a partir de uma cor (CSS var conhecida ou hex) — sem color-mix (Safari 13.1)
const TINT_VAR = {
  'var(--accent)': 'var(--tint-accent)', 'var(--accent2)': 'rgba(123, 42, 140, 0.16)',
  'var(--ok)': 'var(--tint-ok)', 'var(--warn)': 'var(--tint-warn)', 'var(--danger)': 'var(--tint-danger)',
}
const tintOf = (cor) => TINT_VAR[cor] || (String(cor).startsWith('#') ? hexA(cor, 0.14) : 'var(--glass-hover)')

// Logo real do marketplace (favicon) com fallback para monograma colorido se a imagem falhar
function MarketplaceLogo({ nome, size = 16 }) {
  const [erro, setErro] = useState(false)
  const cor = PLATAFORMA_COR[nome] || 'var(--accent2)'
  const dom = PLATAFORMA_DOMINIO[nome]
  const radius = Math.round(size * 0.22)
  if (dom && !erro) {
    return (
      <img src={`https://www.google.com/s2/favicons?domain=${dom}&sz=64`} alt={nome}
           width={size} height={size} loading="lazy" onError={() => setErro(true)}
           style={{ width: size, height: size, borderRadius: radius, objectFit: 'contain', display: 'block', background: '#fff' }} />
    )
  }
  return (
    <span style={{ width: size, height: size, borderRadius: radius, background: hexA(cor.startsWith('#') ? cor : '#7b2a8c', 0.22),
                   color: cor, fontSize: Math.round(size * 0.56), fontWeight: 700, display: 'grid', placeItems: 'center', lineHeight: 1 }}>
      {(nome || '?').charAt(0)}
    </span>
  )
}

function PlataformaBadge({ nome }) {
  if (!nome) return null
  const cor = PLATAFORMA_COR[nome] || 'var(--accent2)'
  return (
    <span className="text-[10px] pl-1 pr-1.5 py-0.5 rounded-md font-semibold inline-flex items-center gap-1"
          style={{ background: hexA(cor.startsWith('#') ? cor : '#7b2a8c', 0.14), color: cor }}>
      <MarketplaceLogo nome={nome} size={13} /> {nome}
    </span>
  )
}
import { api } from './api.js'
import { useToast } from './toast.jsx'

const brl = (v) => 'R$ ' + Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtQuando = (iso) => {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

export default function Nfe() {
  const notify = useToast()
  const [cfg, setCfg] = useState(null)
  const [pendentes, setPendentes] = useState(null) // null = carregando, [] = vazio
  const [blingErro, setBlingErro] = useState(false)
  const [nota, setNota] = useState(null)
  const [showCfg, setShowCfg] = useState(false)
  const [completa, setCompleta] = useState(null)
  const [consultaId, setConsultaId] = useState('')
  const [eventos, setEventos] = useState(null)
  const [loteRodando, setLoteRodando] = useState(false)
  const [loteReport, setLoteReport] = useState(null)
  // filtros / toggles
  const [situacao, setSituacao] = useState(1)        // 1 = pendentes (editáveis)
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState('valor_desc')
  const [soEditaveis, setSoEditaveis] = useState(false)
  const [aplicadas, setAplicadas] = useState({})     // { id: novoTotal } — marca local, sem recarregar
  const [carregandoValores, setCarregandoValores] = useState(false)
  const [progValores, setProgValores] = useState(null)   // {feito, total} do enriquecimento
  const [selecao, setSelecao] = useState(() => new Set())   // ids selecionados (massa)
  const situacaoAtualRef = useRef(situacao)
  const pendentesRef = useRef([])
  useEffect(() => { pendentesRef.current = pendentes || [] }, [pendentes])

  const toggleSel = (id) => setSelecao((s) => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n
  })
  const limparSel = () => setSelecao(new Set())
  const selTodasEditaveis = (lista) => setSelecao(new Set(lista.filter((n) => n.editavel).map((n) => n.id)))
  const [concilLote, setConcilLote] = useState(null)
  const [concilLoteLoad, setConcilLoteLoad] = useState(false)

  const conciliarSelecionadas = async () => {
    const ids = [...selecao]
    if (!ids.length) { notify('Selecione ao menos uma nota Shopee.', 'danger'); return }
    setConcilLoteLoad(true); setConcilLote(null)
    try {
      const r = await api.nfeConciliacaoShopeeLote(ids)
      setConcilLote(r)
      if (r.conferidas === 0) notify('Nenhuma nota Shopee conciliável na seleção.', 'danger')
      else notify(`${r.conferidas} conferida(s) · ${r.divergentes} divergente(s)`, r.divergentes ? 'danger' : 'ok')
    } catch (e) { notify(e.message, 'danger') }
    setConcilLoteLoad(false)
  }

  useEffect(() => {
    api.nfeConfig().then(setCfg).catch(() => {})
    carregarEventos()
    api.nfeFaturamento().then(setFaturamento).catch(() => {})
    api.nfeContagens().then(setContagens).catch(() => {})
    api.nfePedidosSemNfe(30).then(setSemNfe).catch(() => setSemNfe({ total: 0, pedidos: [] }))
  }, [])
  useEffect(() => { situacaoAtualRef.current = situacao; carregarNotas() /* eslint-disable-next-line */ }, [situacao])

  // Auto-atualiza a lista enquanto o modo automático está ligado (notas geradas no Bling
  // chegam sozinhas, sem precisar clicar em Atualizar). Silencioso: não pisca o loading.
  useEffect(() => {
    if (!cfg?.auto) return
    const t = setInterval(() => { if (!loteRodando) carregarNotas({ silencioso: true }) }, 45000)
    return () => clearInterval(t)
    /* eslint-disable-next-line */
  }, [cfg?.auto, situacao, loteRodando])

  const [faturamento, setFaturamento] = useState(null)
  const [fatRecalc, setFatRecalc] = useState(false)
  const [contagens, setContagens] = useState(null)
  const [semNfe, setSemNfe] = useState(null)
  const recalcularFaturamento = async () => {
    setFatRecalc(true)
    try {
      await api.nfeFaturamentoRecalcular()
      notify('Recálculo iniciado. Pode levar alguns minutos — vou atualizar sozinho.', 'ok')
      // tenta atualizar algumas vezes enquanto o job roda em background
      let tentativas = 0
      const t = setInterval(async () => {
        tentativas += 1
        try { const r = await api.nfeFaturamento(); if (r?.tem_dados) setFaturamento(r) } catch {}
        if (tentativas >= 10) { clearInterval(t); setFatRecalc(false) }
      }, 20000)
    } catch (e) { notify(e.message, 'danger'); setFatRecalc(false) }
  }

  const carregarEventos = async () => {
    try { setEventos(await api.nfeEventos()) } catch { setEventos([]) }
  }

  const carregarNotas = async ({ silencioso = false } = {}) => {
    setBlingErro(false)
    if (!silencioso) { setPendentes(null); setAplicadas({}) }
    try {
      const r = await api.nfePendentesTodas(situacao)
      const lista = Array.isArray(r) ? r : (r?.notas || r?.data || [])
      // No refresh silencioso, preserva os valores já enriquecidos (evita piscar pra 0 e
      // re-buscar tudo de novo). Só as notas novas (sem valor) serão enriquecidas.
      const ant = {}
      ;(pendentesRef.current || []).forEach((n) => { ant[String(n.id)] = n })
      const mesclada = silencioso
        ? lista.map((n) => {
            const a = ant[String(n.id)]
            return a && a.valor ? { ...a, situacao: n.situacao, situacao_label: n.situacao_label, editavel: n.editavel } : n
          })
        : lista
      setPendentes(mesclada)
      // valor + UF + tributos vêm do GET individual (a lista do Bling não traz).
      const precisam = mesclada.filter((n) => n.id && !(n.valor > 0))
      const ids = precisam.map((n) => n.id)
      if (ids.length) {
        setCarregandoValores(true)
        setProgValores({ feito: 0, total: ids.length })
        const LOTE = 100
        let feito = 0
        for (let i = 0; i < ids.length; i += LOTE) {
          const bloco = ids.slice(i, i + LOTE)
          try {
            const mapa = await api.nfeValores(bloco)
            setPendentes((atual) => (atual || []).map((n) => {
              const e = mapa?.[String(n.id)]
              return e ? { ...n, ...e } : n
            }))
          } catch { /* um lote falho não derruba o resto */ }
          feito += bloco.length
          setProgValores({ feito, total: ids.length })
          if (situacao !== situacaoAtualRef.current) break  // trocou de filtro: aborta
        }
        setCarregandoValores(false)
        setProgValores(null)
      }
    } catch (e) {
      if (!silencioso) { setBlingErro(true); setPendentes([]) }
    }
  }

  const abrirNota = async (id) => {
    try { setNota({ ...(await api.nfeObter(id)), _manual: false }) }
    catch (e) { notify(e.message, 'danger') }
  }

  const verCompleta = async (id) => {
    if (!String(id || '').trim()) return
    try { setCompleta(await api.nfeCompleta(String(id).trim())) }
    catch (e) { notify(e.message, 'danger') }
  }

  const simularManual = () => {
    setNota({
      _manual: true, id: null, numero: 'Simulação', serie: '—',
      contato: 'Simulação manual (não envia ao Bling)', situacao: null, frete: 0,
      itens: [{ indice: 0, descricao: 'Item exemplo', codigo: '', quantidade: 1, valor_unitario: 50 }],
    })
  }

  // marca uma nota como aplicada localmente (sem recarregar a lista toda)
  const marcarAplicada = (id, novoTotal) => {
    if (id == null) return
    setAplicadas((a) => ({ ...a, [id]: novoTotal }))
  }

  const aplicarTodas = async () => {
    const editaveis = (pendentes || []).filter((n) => n.editavel)
    if (!editaveis.length) { notify('Não há notas pendentes (editáveis) para aplicar.', 'danger'); return }
    const tipo = cfg?.desconto_tipo === 'valor' ? `R$ ${cfg?.desconto_valor}` : `${cfg?.desconto_valor}%`
    if (!window.confirm(`Aplicar o desconto padrão (${tipo}${cfg?.remover_frete ? ' + zerar frete' : ''}) em TODAS as ${editaveis.length} notas pendentes e salvar no Bling?\n\nA autorização na Sefaz continua manual, no Bling.`)) return
    setLoteRodando(true); setLoteReport(null)
    try {
      const r = await api.nfeAplicarTodas()
      setLoteReport(r)
      // marca as aplicadas localmente (sem recarregar)
      ;(r?.relatorio || []).forEach((it) => { if (it.ok && it.id != null) marcarAplicada(it.id, it.total_nota) })
      setNota(null)  // fecha o editor (a nota aberta pode ter sido aplicada)
      carregarEventos()
    } catch (e) {
      setLoteReport({ erro: e.message })
    } finally {
      setLoteRodando(false)
    }
  }

  const filtradas = filtrarNotas(pendentes, { busca, ordem, soEditaveis })

  const aplicarSelecionadas = async () => {
    const ids = [...selecao]
    if (!ids.length) { notify('Selecione ao menos uma nota.', 'danger'); return }
    const tipo = cfg?.desconto_tipo === 'valor' ? `R$ ${cfg?.desconto_valor}` : `${cfg?.desconto_valor}%`
    if (!window.confirm(`Aplicar o desconto padrão (${tipo}) nas ${ids.length} notas selecionadas e salvar no Bling?`)) return
    setLoteRodando(true); setLoteReport(null)
    try {
      const r = await api.nfeAplicarSelecionadas(ids)
      setLoteReport(r)
      ;(r?.relatorio || []).forEach((it) => { if (it.ok && it.id != null) marcarAplicada(it.id, it.total_nota) })
      setNota(null)  // fecha o editor após aplicar
      limparSel(); carregarEventos()
    } catch (e) {
      setLoteReport({ erro: e.message })
    } finally {
      setLoteRodando(false)
    }
  }

  const exportarCSV = () => {
    const linhas = filtradas
    if (!linhas.length) { notify('Nada para exportar neste filtro.', 'danger'); return }
    const cols = ['numero', 'serie', 'situacao_label', 'cliente', 'documento', 'plataforma', 'uf', 'municipio', 'valor', 'tributos', 'pedido', 'chave', 'link_xml', 'link_danfe', 'link_pdf']
    const cab = ['Número', 'Série', 'Situação', 'Cliente', 'Documento', 'Plataforma', 'UF', 'Município', 'Valor', 'Tributos aprox', 'Pedido', 'Chave de acesso', 'XML', 'DANFE', 'PDF']
    const esc = (v) => {
      const s = v == null ? '' : String(v)
      return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
    }
    const csv = [cab.join(';'), ...linhas.map((n) => cols.map((c) => esc(n[c])).join(';'))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `notas-fiscais-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    notify(`${linhas.length} nota(s) exportada(s)`, 'ok')
  }

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Título */}
      <div>
        <h1 className="font-display text-2xl font-bold">Notas fiscais</h1>
        <div className="text-sm text-dim">Emissão, gestão e inteligência fiscal das suas NF-e</div>
      </div>

      {/* Top bar */}
      <div className="glass rounded-2xl px-5 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FileText size={18} className="text-accent" /> Notas fiscais (NF-e)
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="glass rounded-xl flex items-center gap-2 px-2 py-1.5">
            <input value={consultaId} onChange={(e) => setConsultaId(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && verCompleta(consultaId)}
                   placeholder="abrir por ID…"
                   className="bg-transparent outline-none text-sm w-24 text-fg num" />
            <button onClick={() => verCompleta(consultaId)} className="text-xs text-accent hover:underline shrink-0">ver</button>
          </div>
          <button onClick={() => setShowCfg((v) => !v)}
                  className="glass rounded-xl px-3 py-2 text-sm text-dim hover:text-fg flex items-center gap-2">
            <Settings2 size={15} /> Configuração
          </button>
          <button onClick={() => { carregarNotas(); carregarEventos(); api.nfeContagens().then(setContagens).catch(() => {}) }}
                  className="glass rounded-xl px-3 py-2 text-sm text-dim hover:text-fg flex items-center gap-2">
            <RefreshCw size={15} /> Atualizar
          </button>
        </div>
      </div>

      {progValores && progValores.total > 0 && (
        <div className="glass rounded-xl px-4 py-2.5 text-sm flex items-center gap-3" style={{ border: '1px solid var(--accent2)' }}>
          <Loader2 size={15} className="animate-spin" style={{ color: 'var(--accent2)' }} />
          <span className="flex-1">
            Carregando valores, UF e tributos das notas… <b className="num">{progValores.feito}</b> de <b className="num">{progValores.total}</b>. Os totais e o mapa por estado vão se completando.
          </span>
          <span className="num text-xs text-dim">{Math.round((progValores.feito / progValores.total) * 100)}%</span>
        </div>
      )}

      {/* KPIs */}
      <KpisRow notas={pendentes} faturamento={faturamento} />

      {/* Abas de situação */}
      <SituacaoTabs situacao={situacao} setSituacao={setSituacao} contagens={contagens} carregadas={(pendentes || []).length} />

      {/* Cartões de risco: Pedidos sem NF-e + Simples real */}
      <div className="grid gap-4 md:grid-cols-2">
        <PedidosSemNfeCard dados={semNfe} />
        <SimplesCard dados={faturamento} recalc={fatRecalc} onRecalcular={recalcularFaturamento} />
      </div>

      {/* Notas — área de trabalho (lista + ajuste em massa) */}
      <div className="glass rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="h-9 w-9 rounded-xl grid place-items-center shrink-0" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>
            <Receipt size={17} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Notas · {SIT_LABEL[situacao] || 'Filtro'}</div>
            <div className="text-[11px] text-dim">{(pendentes || []).length} no filtro · clique numa nota para abrir e editar</div>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <div className="glass rounded-xl flex items-center gap-2 px-3 py-1.5">
              <Search size={14} className="text-faint" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="buscar número, cliente, pedido…"
                     className="bg-transparent outline-none text-sm w-44 text-fg" />
            </div>
            <select value={ordem} onChange={(e) => setOrdem(e.target.value)} className="glass rounded-xl px-2.5 py-2 text-xs text-dim outline-none">
              <option value="valor_desc">Maior valor</option>
              <option value="valor_asc">Menor valor</option>
              <option value="numero_desc">Número ↓</option>
              <option value="numero_asc">Número ↑</option>
            </select>
            <label className="glass rounded-xl px-2.5 py-2 text-xs text-dim flex items-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox" checked={soEditaveis} onChange={(e) => setSoEditaveis(e.target.checked)} /> só editáveis
            </label>
            <button onClick={exportarCSV} className="glass rounded-xl px-3 py-2 text-xs text-dim hover:text-fg flex items-center gap-1.5"><Download size={13} /> CSV</button>
          </div>
        </div>

        {situacao === 1 && (
          <LoteBar
            qtd={(pendentes || []).filter((n) => n.editavel).length}
            cfg={cfg} rodando={loteRodando} onAplicar={aplicarTodas}
            report={loteReport} onFechar={() => setLoteReport(null)} onVerNota={verCompleta}
          />
        )}

        <NotasList
          notas={filtradas} blingErro={blingErro} carregando={pendentes === null}
          carregandoValores={carregandoValores} aplicadas={aplicadas}
          selecao={selecao} onToggleSel={toggleSel} onSelTodas={selTodasEditaveis}
          onLimparSel={limparSel} onAplicarSel={aplicarSelecionadas} loteRodando={loteRodando}
          onConciliarSel={conciliarSelecionadas} concilLoteLoad={concilLoteLoad}
          notaId={nota?.id} onAbrir={abrirNota} onVerCompleta={verCompleta} onSimular={simularManual}
        />
        {concilLote && <ConciliacaoLoteReport r={concilLote} onFechar={() => setConcilLote(null)} onVerNota={verCompleta} />}
      </div>

      {/* Indicadores e inteligência fiscal */}
      <div className="flex items-baseline gap-2 pt-1">
        <h2 className="font-display text-lg font-bold">Indicadores e inteligência fiscal</h2>
        <span className="text-xs text-dim">— visão gerencial; não interfere na emissão</span>
      </div>

      <FaturamentoSimples dados={faturamento} recalc={fatRecalc} onRecalcular={recalcularFaturamento} />

      <div className="grid gap-4 md:grid-cols-2">
        <AgingCard notas={pendentes} situacao={situacao} onVer={verCompleta} />
        <RejeitadasCard notas={pendentes} situacao={situacao} setSituacao={setSituacao} onVer={verCompleta} />
      </div>

      <InteligenciaFiscal notas={pendentes} carregando={carregandoValores} />

      {/* Configuração de edição & descontos (recolhível) */}
      {showCfg && cfg && <ConfigCard cfg={cfg} setCfg={setCfg} />}
      <RevenueSim notas={pendentes} cfg={cfg} situacao={situacao} />
      <AutomacaoPanel cfg={cfg} eventos={eventos} />

      {/* Aviso fiscal compacto */}
      <div className="rounded-xl px-4 py-2.5 text-[11px] flex items-start gap-2 border border-glassb"
           style={{ background: 'var(--glass-hover)' }}>
        <Info size={13} className="text-accent2 mt-0.5 shrink-0" />
        <span className="text-dim">
          O Bling só permite editar notas <b className="text-fg">Pendentes</b> ou <b className="text-fg">Rejeitadas</b>.
          Autorizadas, com DANFE ou canceladas são imutáveis. A transmissão à Sefaz acontece no Bling.
        </span>
      </div>

      {/* Editor de nota — agora em modal (lista ocupa a largura toda) */}
      {nota && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
             style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(3px)' }} onClick={() => setNota(null)}>
          <div className="w-full max-w-2xl my-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button onClick={() => setNota(null)} className="glass rounded-full p-1.5 text-dim hover:text-fg" title="Fechar"><X size={18} /></button>
            </div>
            <Editor key={nota.id || 'manual'} nota={nota} cfg={cfg} aplicada={aplicadas[nota.id]}
                    onAplicado={(id, novoTotal) => { marcarAplicada(id, novoTotal); carregarEventos() }} onVerCompleta={verCompleta} />
          </div>
        </div>
      )}

      {completa && <NfeDetalhe nota={completa} cfg={cfg} onClose={() => setCompleta(null)} onEditar={(id) => { setCompleta(null); abrirNota(id) }} />}
    </div>
  )
}

/* ============== Painel reformulado: KPIs, abas, risco, aging ============== */

const fmtBig = (v) => {
  const n = Number(v || 0)
  if (n >= 1_000_000) return 'R$ ' + (n / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M'
  if (n >= 10_000) return 'R$ ' + Math.round(n / 1000) + 'k'
  return brl(n)
}
const diasDesde = (s) => {
  if (!s) return null
  let d = new Date(s)
  if (isNaN(d)) { const m = String(s).match(/(\d{2})\/(\d{2})\/(\d{4})/); if (m) d = new Date(`${m[3]}-${m[2]}-${m[1]}`) }
  if (isNaN(d)) return null
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000))
}
const fmtDataBR = (s) => {
  if (!s) return '—'
  let d = new Date(s)
  if (isNaN(d)) { const m = String(s).match(/(\d{2})\/(\d{2})\/(\d{4})/); if (m) d = new Date(`${m[3]}-${m[2]}-${m[1]}`) }
  return isNaN(d) ? String(s) : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function KpiBox({ icon, label, valor, cor = 'var(--text)', sub }) {
  return (
    <div className="glass rounded-2xl px-4 py-3">
      <div className="flex items-center gap-1.5 text-[11px] text-dim font-medium">{icon}{label}</div>
      <div className="num font-bold mt-1 truncate" style={{ color: cor, fontSize: 19 }}>{valor}</div>
      {sub ? <div className="text-[10px] text-faint mt-0.5">{sub}</div> : null}
    </div>
  )
}

function KpisRow({ notas, faturamento }) {
  const lista = notas || []
  const comValor = lista.filter((n) => n.valor > 0)
  const receita = comValor.reduce((s, n) => s + (n.valor || 0), 0)
  const tributos = lista.reduce((s, n) => s + (n.tributos || 0), 0)
  const pctEf = receita > 0 ? (tributos / receita) * 100 : 0
  const ticket = comValor.length ? receita / comValor.length : 0
  const carregando = notas === null
  const dash = carregando ? '—' : null
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <KpiBox icon={<Receipt size={13} className="text-accent" />} label="Notas no filtro" valor={dash ?? lista.length} cor="var(--accent)" />
      <KpiBox icon={<DollarSign size={13} style={{ color: 'var(--ok)' }} />} label="Receita listada" valor={dash ?? brl(receita)} cor="var(--ok)"
              sub={!carregando && comValor.length < lista.length ? `${comValor.length}/${lista.length} com valor` : undefined} />
      <KpiBox icon={<Landmark size={13} style={{ color: 'var(--warn)' }} />} label="Tributos aprox." valor={dash ?? brl(tributos)} cor="var(--warn)" />
      <KpiBox icon={<Percent size={13} style={{ color: 'var(--accent2)' }} />} label="% efetivo" valor={dash ?? `${pctEf.toFixed(1)}%`} cor="var(--accent2)" />
      <KpiBox icon={<TrendingUp size={13} className="text-dim" />} label="Ticket médio" valor={dash ?? brl(ticket)} />
    </div>
  )
}

const SIT_TABS = [
  { cod: 1, label: 'Pendentes', key: 'pendentes', Icon: Clock, cor: 'var(--warn)' },
  { cod: 6, label: 'Autorizadas', key: 'autorizadas', Icon: CheckCircle2, cor: 'var(--ok)' },
  { cod: 4, label: 'Rejeitadas', key: 'rejeitadas', Icon: CircleAlert, cor: 'var(--danger)' },
  { cod: 2, label: 'Canceladas', key: 'canceladas', Icon: X, cor: 'var(--faint)' },
  { cod: 0, label: 'Todas', key: 'todas', Icon: Inbox, cor: 'var(--accent2)' },
]
function SituacaoTabs({ situacao, setSituacao, contagens, carregadas }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {SIT_TABS.map(({ cod, label, key, Icon, cor }) => {
        const ativo = situacao === cod
        const cnt = ativo && carregadas != null ? carregadas : contagens?.[key]
        const aprox = !ativo && contagens?.aproximado && (key === 'autorizadas' || key === 'canceladas' || key === 'todas')
        return (
          <button key={cod} onClick={() => setSituacao(cod)}
            className="rounded-xl px-3.5 py-2 text-sm font-semibold flex items-center gap-2 shrink-0 transition"
            style={ativo
              ? { background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: '#fff', boxShadow: '0 6px 16px var(--tint-accent-strong)' }
              : { background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-dim)' }}>
            <Icon size={15} style={{ color: ativo ? '#fff' : cor }} />
            {label}
            {cnt != null && (
              <span className="num text-[11px] px-1.5 py-0.5 rounded-md"
                style={{ background: ativo ? 'rgba(255,255,255,.22)' : 'var(--glass-hover)', color: ativo ? '#fff' : 'var(--text-dim)' }}>
                {aprox ? '~' : ''}{cnt}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function PedidosSemNfeCard({ dados }) {
  const carregando = dados == null
  const total = dados?.total || 0
  const pedidos = dados?.pedidos || []
  const dias = dados?.dias || 30
  const valor = dados?.valor_total || 0
  const risco = total > 0
  const mostrados = pedidos.slice(0, 6)
  return (
    <div className="glass rounded-2xl p-5" style={risco ? { borderColor: 'var(--danger)', background: 'var(--tint-danger)' } : undefined}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="h-9 w-9 rounded-xl grid place-items-center shrink-0" style={{ background: risco ? 'var(--tint-danger)' : 'var(--tint-ok)' }}>
          {risco ? <AlertTriangle size={17} style={{ color: 'var(--danger)' }} /> : <FileCheck2 size={17} style={{ color: 'var(--ok)' }} />}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">Pedidos sem NF-e</div>
          <div className="text-[11px] text-dim">Faturados nos últimos {dias} dias sem nota emitida</div>
        </div>
        {!carregando && (
          <div className="ml-auto text-right shrink-0">
            <div className="num font-bold" style={{ fontSize: 22, color: risco ? 'var(--danger)' : 'var(--ok)' }}>{total}</div>
            {risco ? <div className="num text-[10px] text-dim">{brl(valor)}</div> : null}
          </div>
        )}
      </div>
      {carregando ? (
        <div className="space-y-1.5 py-1">{[0, 1, 2].map((i) => <div key={i} className="h-7 rounded-lg" style={{ background: 'var(--glass-hover)', opacity: 0.6 - i * 0.15 }} />)}</div>
      ) : total === 0 ? (
        <div className="text-xs text-dim flex items-center gap-2 py-2"><CheckCircle2 size={15} style={{ color: 'var(--ok)' }} /> Tudo certo — todo pedido faturado tem nota nos últimos {dias} dias.</div>
      ) : (
        <>
          <div className="space-y-1 max-h-[180px] overflow-y-auto pr-1">
            {mostrados.map((p) => (
              <div key={p.id || p.numero} className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: 'var(--surface)' }}>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium truncate">{p.cliente || p.numero_loja || ('Pedido ' + (p.numero || ''))}</div>
                  <div className="num text-[10px] text-faint">#{p.numero_loja || p.numero} · {fmtDataBR(p.data)}</div>
                </div>
                {p.plataforma ? <Badge cor={PLATAFORMA_COR[p.plataforma] || 'var(--accent2)'}>{p.plataforma}</Badge> : null}
                <span className="num text-[12px] font-semibold w-20 text-right shrink-0">{brl(p.valor)}</span>
              </div>
            ))}
          </div>
          {total > mostrados.length ? <div className="text-[10px] text-faint mt-1.5">+{total - mostrados.length} outros pedidos</div> : null}
          <div className="text-[10px] text-faint mt-2 flex items-start gap-1"><Info size={10} className="mt-0.5 shrink-0" /> Cruza pedidos do Bling (todos os canais) com as NF-e recentes. A emissão é feita no Bling; pode haver atraso de sincronização.</div>
        </>
      )}
    </div>
  )
}

function SimplesCard({ dados, recalc, onRecalcular }) {
  const tem = dados?.tem_dados
  const rbt12 = dados?.rbt12 || 0
  const sub = dados?.sublimite || 3600000
  const efetiva = dados?.aliquota_efetiva
  const nominal = dados?.aliquota_nominal
  const faixa = dados?.faixa
  const anexo = dados?.anexo || 'I'
  const pctSub = dados?.pct_sublimite != null ? Math.min(100, dados.pct_sublimite) : Math.min(100, (rbt12 / sub) * 100)
  const meses = dados?.meses_ate_sublimite
  const al = ALERTA_FAT[dados?.alerta] || ALERTA_FAT.ok
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="h-9 w-9 rounded-xl grid place-items-center shrink-0" style={{ background: 'var(--tint-accent)' }}>
          <Percent size={16} style={{ color: 'var(--accent2)' }} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">Simples Nacional · faixa &amp; projeção</div>
          <div className="text-[11px] text-dim">Anexo {anexo} (Comércio) · estimado pelo RBT12</div>
        </div>
      </div>
      {!tem ? (
        <div className="text-center py-3">
          <div className="text-xs text-dim mb-3">Sem dados ainda. O cálculo lê suas notas autorizadas dos últimos 12 meses.</div>
          <button onClick={onRecalcular} disabled={recalc} className="rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-60 inline-flex items-center gap-2" style={{ background: 'var(--accent)' }}>
            <RefreshCw size={14} className={recalc ? 'animate-spin' : ''} /> {recalc ? 'Calculando…' : 'Calcular agora'}
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-4 mb-3">
            <div className="shrink-0">
              <div className="text-[10px] uppercase tracking-wide text-faint font-bold">Alíquota efetiva</div>
              <div className="num font-bold" style={{ fontSize: 30, color: 'var(--accent2)', lineHeight: 1 }}>{efetiva != null ? `${efetiva}%` : '—'}</div>
              {nominal != null ? <div className="num text-[10px] text-faint mt-0.5">nominal {nominal}%</div> : null}
            </div>
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div className="rounded-xl px-3 py-2" style={{ background: 'var(--glass-hover)' }}>
                <div className="text-[10px] text-faint">Faixa</div>
                <div className="num font-bold text-sm">{faixa ? `${faixa}ª` : '—'}<span className="text-[10px] text-faint font-normal"> de 6</span></div>
              </div>
              <div className="rounded-xl px-3 py-2" style={{ background: 'var(--glass-hover)' }}>
                <div className="text-[10px] text-faint">RBT12</div>
                <div className="num font-bold text-sm">{fmtBig(rbt12)}</div>
              </div>
            </div>
          </div>
          <div className="mb-1 flex items-center justify-between text-[10px] text-dim">
            <span>{pctSub.toFixed(1)}% do sublimite</span>
            <span className="num">sublimite {fmtBig(sub)}</span>
          </div>
          <div className="h-3 rounded-lg overflow-hidden" style={{ background: 'var(--glass-hover)' }}>
            <div className="h-full rounded-lg" style={{ width: `${pctSub}%`, background: al.cor, minWidth: 3 }} />
          </div>
          <div className="mt-2.5 rounded-xl px-3 py-2 text-[11px] flex items-center gap-2" style={{ background: al.tint, color: al.cor }}>
            <al.Icone size={13} className="shrink-0" />
            {meses === 0 ? 'Sublimite já atingido — ICMS/ISS recolhidos por fora.'
              : meses == null ? 'Faturamento estável — sem projeção de atingir o sublimite.'
                : `No ritmo atual, atinge o sublimite em ~${meses} ${meses === 1 ? 'mês' : 'meses'}.`}
          </div>
          <div className="text-[10px] text-faint mt-2 flex items-start gap-1"><Info size={10} className="mt-0.5 shrink-0" /> Estimativa pelo RBT12 (12 meses). O DAS oficial é apurado pelo seu contador.</div>
        </>
      )}
    </div>
  )
}

function AgingCard({ notas, situacao, onVer }) {
  if (situacao !== 1) {
    return (
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1"><Clock size={15} style={{ color: 'var(--warn)' }} /><div className="text-sm font-semibold">Pendentes paradas</div></div>
        <div className="text-xs text-dim">O tempo de espera das pendentes aparece quando você está na aba <b className="text-fg">Pendentes</b>.</div>
      </div>
    )
  }
  const lista = (notas || []).map((n) => ({ ...n, dias: diasDesde(n.data) })).filter((n) => n.dias != null && n.dias >= 2).sort((a, b) => b.dias - a.dias)
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-xl grid place-items-center" style={{ background: 'var(--tint-warn)' }}><Clock size={15} style={{ color: 'var(--warn)' }} /></div>
        <div><div className="text-sm font-semibold">Pendentes paradas</div><div className="text-[11px] text-dim">Aguardando há 2+ dias · transmita no Bling</div></div>
        {lista.length > 0 ? <span className="ml-auto num font-bold" style={{ fontSize: 18, color: 'var(--warn)' }}>{lista.length}</span> : null}
      </div>
      {lista.length === 0 ? (
        <div className="text-xs text-dim flex items-center gap-2 py-1"><CheckCircle2 size={15} style={{ color: 'var(--ok)' }} /> Nenhuma pendente parada — tudo recente.</div>
      ) : (
        <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
          {lista.slice(0, 8).map((n) => {
            const cor = n.dias >= 7 ? 'var(--danger)' : n.dias >= 4 ? 'var(--warn)' : 'var(--text-dim)'
            return (
              <button key={n.id} onClick={() => onVer(n.id)} className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:opacity-80" style={{ background: 'var(--surface)' }}>
                <span className="num text-[12px] font-semibold shrink-0">NF {n.numero}</span>
                <span className="text-[11px] text-dim truncate flex-1">{n.cliente || '—'}</span>
                <span className="text-[11px] font-semibold num shrink-0" style={{ color: cor }}>há {n.dias}d</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RejeitadasCard({ notas, situacao, setSituacao, onVer }) {
  if (situacao !== 4) {
    return (
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1"><CircleAlert size={15} style={{ color: 'var(--danger)' }} /><div className="text-sm font-semibold">Rejeitadas · fila de correção</div></div>
        <div className="text-xs text-dim mb-2.5">As notas rejeitadas pela Sefaz, com o motivo, aparecem na aba Rejeitadas.</div>
        <button onClick={() => setSituacao(4)} className="text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5" style={{ background: 'var(--tint-danger)', color: 'var(--danger)' }}>
          <ArrowRight size={13} /> Ver rejeitadas
        </button>
      </div>
    )
  }
  const lista = notas || []
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-xl grid place-items-center" style={{ background: 'var(--tint-danger)' }}><CircleAlert size={15} style={{ color: 'var(--danger)' }} /></div>
        <div><div className="text-sm font-semibold">Rejeitadas · fila de correção</div><div className="text-[11px] text-dim">Corrija no Bling e retransmita</div></div>
        {lista.length > 0 ? <span className="ml-auto num font-bold" style={{ fontSize: 18, color: 'var(--danger)' }}>{lista.length}</span> : null}
      </div>
      {lista.length === 0 ? (
        <div className="text-xs text-dim flex items-center gap-2 py-1"><CheckCircle2 size={15} style={{ color: 'var(--ok)' }} /> Nenhuma nota rejeitada.</div>
      ) : (
        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
          {lista.slice(0, 8).map((n) => (
            <button key={n.id} onClick={() => onVer(n.id)} className="w-full text-left rounded-lg px-2.5 py-2 hover:opacity-80" style={{ background: 'var(--surface)' }}>
              <div className="flex items-center gap-2">
                <span className="num text-[12px] font-semibold">NF {n.numero}</span>
                <span className="text-[11px] text-dim truncate flex-1">{n.cliente || '—'}</span>
                <ChevronRight size={13} className="text-faint shrink-0" />
              </div>
              {n.motivo ? <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--danger)' }}>{n.motivo}</div> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ----------------------- Filtros / helpers de nota --------------------- */
function filtrarNotas(notas, { busca, ordem, soEditaveis }) {
  let arr = Array.isArray(notas) ? [...notas] : []
  if (soEditaveis) arr = arr.filter((n) => n.editavel)
  const q = (busca || '').trim().toLowerCase()
  if (q) {
    arr = arr.filter((n) =>
      String(n.numero ?? '').toLowerCase().includes(q) ||
      String(n.id ?? '').includes(q) ||
      (n.cliente || '').toLowerCase().includes(q) ||
      (n.documento || '').toLowerCase().includes(q) ||
      (n.pedido || '').toLowerCase().includes(q) ||
      (n.chave || '').toLowerCase().includes(q))
  }
  const [campo, dir] = (ordem || 'valor_desc').split('_')
  arr.sort((a, b) => {
    const va = campo === 'numero' ? Number(a.numero || 0) : (a.valor || 0)
    const vb = campo === 'numero' ? Number(b.numero || 0) : (b.valor || 0)
    return dir === 'asc' ? va - vb : vb - va
  })
  return arr
}

function corSituacao(cod) {
  const c = Number(cod)
  if (c === 1) return 'var(--warn)'                 // pendente
  if (c === 4) return 'var(--danger)'               // rejeitada
  if (c === 2 || c === 9 || c === 11) return 'var(--faint)' // cancelada/denegada/bloqueada
  return 'var(--ok)'                                // autorizada/danfe/registrada
}

const SIT_CHIPS = [
  { cod: 1, label: 'Pendentes' },
  { cod: 4, label: 'Rejeitadas' },
  { cod: 6, label: 'Autorizadas' },
  { cod: 2, label: 'Canceladas' },
]
const SIT_LABEL = { 1: 'Pendentes', 4: 'Rejeitadas', 6: 'Autorizadas', 2: 'Canceladas', 0: 'Todas' }

/* --------------------------- Simulação de receita ----------------------- */
function RevenueSim({ notas, cfg, situacao }) {
  const editaveis = (notas || []).filter((n) => n.editavel)
  const bruto = editaveis.reduce((s, n) => s + (n.valor || 0), 0)
  const pct = cfg?.desconto_tipo !== 'valor'
  const descPct = Number(cfg?.desconto_valor || 0)
  const desconto = pct ? bruto * descPct / 100 : null
  const liquido = desconto != null ? bruto - desconto : null
  const pLiq = bruto > 0 && liquido != null ? Math.max(2, Math.min(100, (liquido / bruto) * 100)) : 100

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-9 w-9 rounded-xl grid place-items-center shrink-0" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>
          <TrendingDown size={17} className="text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">Simulação de receita</div>
          <div className="text-[11px] text-dim">Impacto do desconto padrão nas {editaveis.length} nota(s) editável(is) do filtro atual</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SimMini label="Notas editáveis" valor={String(editaveis.length)} />
        <SimMini label="Receita bruta" valor={brl(bruto)} />
        <SimMini label={pct ? `Desconto (${descPct}%)` : 'Desconto (R$/item)'} valor={desconto != null ? '− ' + brl(desconto) : 'por item'} cor="var(--accent)" />
        <SimMini label="Receita líquida" valor={liquido != null ? brl(liquido) : '—'} cor="var(--ok)" forte />
      </div>

      {desconto != null && bruto > 0 && (
        <div className="mt-4">
          <div className="h-2.5 rounded-full overflow-hidden flex" style={{ background: 'var(--glass-hover)' }}>
            <div style={{ width: pLiq + '%', background: 'var(--ok)' }} />
            <div style={{ width: (100 - pLiq) + '%', background: 'var(--accent)' }} />
          </div>
          <div className="flex justify-between text-[10px] text-faint mt-1 num">
            <span>líquido {brl(liquido)}</span>
            <span>desconto {brl(desconto)}</span>
          </div>
        </div>
      )}

      {!pct && (
        <div className="mt-3 text-[11px] text-dim flex items-start gap-1.5">
          <Info size={12} className="mt-0.5 shrink-0" /> Desconto em R$ é aplicado por item — a simulação exata depende da quantidade de itens de cada nota.
        </div>
      )}
      {situacao !== 1 && (
        <div className="mt-3 text-[11px] text-faint flex items-center gap-1.5">
          <Lock size={11} /> Você está vendo notas não pendentes; a simulação considera apenas as editáveis.
        </div>
      )}
    </div>
  )
}

function SimMini({ label, valor, cor = 'var(--fg)', forte = false }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: 'var(--glass-hover)' }}>
      <div className="text-[10px] text-dim uppercase tracking-wide">{label}</div>
      <div className={`num ${forte ? 'text-lg font-bold' : 'text-base font-semibold'} mt-0.5 truncate`} style={{ color: cor }}>{valor}</div>
    </div>
  )
}

function ResumoChip({ label, valor, forte }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: 'var(--glass-hover)' }}>
      <div className="text-[9px] text-faint uppercase tracking-wide">{label}</div>
      <div className={`num mt-0.5 truncate ${forte ? 'text-sm font-bold' : 'text-xs font-medium'}`} style={forte ? { color: 'var(--accent)' } : undefined}>{valor}</div>
    </div>
  )
}

/* --------------------- Inteligência fiscal (IBPT + UF) ------------------- */
function InteligenciaFiscal({ notas, carregando }) {
  const lista = notas || []
  const comValor = lista.filter((n) => n.valor)
  const totalValor = comValor.reduce((s, n) => s + (n.valor || 0), 0)
  const totalTrib = lista.reduce((s, n) => s + (n.tributos || 0), 0)
  const pctEfetivo = totalValor > 0 ? (totalTrib / totalValor) * 100 : 0

  // agrupa por UF
  const porUF = {}
  for (const n of comValor) {
    const uf = n.uf || '—'
    if (!porUF[uf]) porUF[uf] = { uf, qtd: 0, valor: 0 }
    porUF[uf].qtd += 1
    porUF[uf].valor += n.valor || 0
  }
  const ufs = Object.values(porUF).sort((a, b) => b.valor - a.valor)
  const maxUF = Math.max(1, ...ufs.map((u) => u.valor))

  if (!lista.length) return null

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Carga tributária aproximada */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(123, 42, 140, 0.16)' }}>
            <Landmark size={16} style={{ color: 'var(--accent2)' }} />
          </div>
          <div>
            <div className="text-sm font-semibold">Carga tributária aproximada</div>
            <div className="text-[11px] text-dim">Estimativa IBPT das notas listadas</div>
          </div>
          {carregando && <RefreshCw size={13} className="text-faint animate-spin ml-auto" />}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <SimMini label="Faturamento" valor={brl(totalValor)} />
          <SimMini label="Tributos aprox" valor={brl(totalTrib)} cor="var(--warn)" />
          <SimMini label="% efetivo" valor={`${pctEfetivo.toFixed(1)}%`} cor="var(--accent2)" forte />
        </div>
        <div className="text-[10px] text-faint mt-2 flex items-start gap-1">
          <Info size={10} className="mt-0.5 shrink-0" />
          Valores aproximados informados pela fonte IBPT em cada item (Lei 12.741). Não substitui a apuração do DAS.
        </div>
      </div>

      {/* Vendas por UF */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--tint-accent)' }}>
            <MapPin size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <div className="text-sm font-semibold">Vendas por estado</div>
            <div className="text-[11px] text-dim">{ufs.length} UF(s) · por valor</div>
          </div>
          {carregando && <RefreshCw size={13} className="text-faint animate-spin ml-auto" />}
        </div>
        {ufs.length === 0 ? (
          carregando ? (
            <div className="space-y-1.5 py-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="num-skel h-3 w-7 rounded" style={{ background: 'var(--glass-hover)' }} />
                  <div className="flex-1 h-4 rounded-md" style={{ background: 'var(--glass-hover)', opacity: 0.6 - i * 0.15 }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-dim py-4 text-center flex flex-col items-center gap-1.5">
              <MapPin size={18} className="text-faint" />
              <span>Nenhuma nota com UF nas notas listadas</span>
              <span className="text-[10px] text-faint">O estado vem do endereço do destinatário.</span>
            </div>
          )
        ) : (
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
            {ufs.slice(0, 12).map((u) => (
              <div key={u.uf} className="flex items-center gap-2">
                <span className="num text-[11px] font-semibold w-7 shrink-0">{u.uf}</span>
                <div className="flex-1 h-4 rounded-md overflow-hidden" style={{ background: 'var(--glass-hover)' }}>
                  <div className="h-full rounded-md" style={{ width: `${(u.valor / maxUF) * 100}%`, background: 'var(--accent)', minWidth: '4px' }} />
                </div>
                <span className="num text-[11px] text-dim w-20 text-right shrink-0">{brl(u.valor)}</span>
                <span className="num text-[10px] text-faint w-8 text-right shrink-0">{u.qtd}x</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------ Monitor do teto do Simples Nacional ----------------- */
const ALERTA_FAT = {
  ok: { cor: 'var(--ok)', tint: 'var(--tint-ok)', label: 'Dentro do limite', Icone: ShieldCheck },
  atencao: { cor: 'var(--warn)', tint: 'var(--tint-warn)', label: 'Atenção — aproximando do sublimite', Icone: AlertTriangle },
  sublimite: { cor: 'var(--warn)', tint: 'var(--tint-warn)', label: 'Acima do sublimite — ICMS/ISS fora do Simples', Icone: AlertTriangle },
  critico: { cor: 'var(--danger)', tint: 'var(--tint-danger)', label: 'Crítico — perto do teto do Simples', Icone: AlertTriangle },
  estourou: { cor: 'var(--danger)', tint: 'var(--tint-danger)', label: 'Teto do Simples ultrapassado', Icone: AlertTriangle },
}

function FaturamentoSimples({ dados, recalc, onRecalcular }) {
  const [aberto, setAberto] = useState(false)
  const tem = dados?.tem_dados
  const al = ALERTA_FAT[dados?.alerta] || ALERTA_FAT.ok
  const teto = dados?.teto || 4800000
  const sub = dados?.sublimite || 3600000
  const rbt12 = dados?.rbt12 || 0
  const pctTeto = Math.min(100, dados?.pct_teto || 0)
  const pctSub = (sub / teto) * 100
  const maxMes = Math.max(1, ...((dados?.meses || []).map((m) => m.total_estimado || 0)))

  return (
    <div className="glass rounded-2xl p-5">
      <button onClick={() => setAberto((v) => !v)} className="flex items-center gap-2 w-full text-left">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(123, 42, 140, 0.16)' }}>
          <Landmark size={16} style={{ color: 'var(--accent2)' }} />
        </div>
        <div>
          <div className="text-sm font-semibold">Teto do Simples Nacional</div>
          <div className="text-[11px] text-dim">
            {tem ? <>RBT12 {brl(rbt12)} · <span style={{ color: al.cor }}>{al.label}</span></> : 'Faturamento acumulado (12 meses) vs teto'}
          </div>
        </div>
        <ChevronRight size={16} className={`ml-auto text-faint transition ${aberto ? 'rotate-90' : ''}`} />
      </button>

      {aberto && (
        <div className="mt-4">
          {!tem ? (
            <div className="text-center py-4">
              <div className="text-xs text-dim mb-3">Ainda não há dados. O cálculo lê suas notas autorizadas dos últimos 12 meses (pode levar alguns minutos).</div>
              <button onClick={onRecalcular} disabled={recalc}
                      className="rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-60 inline-flex items-center gap-2"
                      style={{ background: 'var(--accent)' }}>
                <RefreshCw size={14} className={recalc ? 'animate-spin' : ''} /> {recalc ? 'Calculando…' : 'Calcular faturamento'}
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-xl px-3 py-2 text-xs flex items-center gap-2 mb-3"
                   style={{ background: al.tint, color: al.cor }}>
                <al.Icone size={14} /> {al.label}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <SimMini label="RBT12 (12 meses)" valor={brl(rbt12)} forte cor={al.cor} />
                <SimMini label={`Acumulado ${dados.ano}`} valor={brl(dados.total_ano)} />
                <SimMini label="Projeção do ano" valor={brl(dados.projecao_ano)} cor="var(--accent2)" />
              </div>

              <div className="mb-1 flex items-center justify-between text-[10px] text-dim">
                <span>{pctTeto.toFixed(1)}% do teto</span>
                <span className="num">teto {brl(teto)}</span>
              </div>
              <div className="relative h-4 rounded-lg overflow-hidden" style={{ background: 'var(--glass-hover)' }}>
                <div className="h-full rounded-lg transition-all" style={{ width: `${pctTeto}%`, background: al.cor }} />
                <div className="absolute top-0 bottom-0" style={{ left: `${pctSub}%`, width: '2px', background: 'var(--fg)', opacity: 0.5 }} title="Sublimite ICMS/ISS" />
              </div>
              <div className="text-[10px] text-faint mt-1">Marcador = sublimite {brl(sub)} (acima dele, ICMS/ISS sai do Simples)</div>

              {dados.meses?.length > 0 && (
                <div className="mt-4">
                  <div className="text-[11px] text-dim mb-2">Faturamento estimado por mês</div>
                  <div className="flex items-end gap-1 h-20">
                    {dados.meses.map((m) => (
                      <div key={`${m.ano}-${m.mes}`} className="flex-1 flex flex-col items-center gap-1" title={`${String(m.mes).padStart(2, '0')}/${m.ano} · ${m.qtd} notas · ${brl(m.total_estimado)}`}>
                        <div className="w-full rounded-t" style={{ height: `${Math.max(4, (m.total_estimado / maxMes) * 64)}px`, background: 'var(--accent)', opacity: 0.85 }} />
                        <span className="text-[9px] text-faint num">{String(m.mes).padStart(2, '0')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-glassb">
                <span className="text-[10px] text-faint flex items-start gap-1 flex-1">
                  <Info size={10} className="mt-0.5 shrink-0" />
                  Estimativa: contagem de notas exata, valor por amostragem{dados.parcial ? ' (algum mês com muitas notas ficou parcial)' : ''}. Para o número oficial do DAS, use seu contador.
                </span>
                <button onClick={onRecalcular} disabled={recalc}
                        className="ml-2 text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0 disabled:opacity-60"
                        style={{ background: 'var(--glass-hover)', color: 'var(--text-dim)' }}>
                  <RefreshCw size={12} className={recalc ? 'animate-spin' : ''} /> {recalc ? 'Calculando…' : 'Atualizar'}
                </button>
              </div>
              {dados.atualizado_em && <div className="text-[10px] text-faint mt-1.5">Atualizado em {fmtQuando(dados.atualizado_em)}</div>}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------- Filtros bar ---------------------------- */
function FiltrosBar({ situacao, setSituacao, busca, setBusca, ordem, setOrdem, soEditaveis, setSoEditaveis, total, mostrando, onExportar }) {
  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        {SIT_CHIPS.map((c) => (
          <button key={c.cod} onClick={() => setSituacao(c.cod)}
                  className="text-xs px-3 py-1.5 rounded-full font-medium transition"
                  style={situacao === c.cod
                    ? { background: 'var(--accent)', color: '#fff' }
                    : { background: 'var(--glass-hover)', color: 'var(--text-dim)' }}>
            {c.label}
          </button>
        ))}
        <button onClick={onExportar} title="Exportar a lista filtrada (CSV/Excel, com links de XML e DANFE)"
                className="ml-auto text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5"
                style={{ background: 'var(--glass-hover)', color: 'var(--text-dim)' }}>
          <Download size={13} /> Exportar
        </button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="glass rounded-xl flex items-center gap-2 px-3 py-2 flex-1 min-w-[150px]">
          <Search size={14} className="text-faint shrink-0" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="nº, cliente, pedido ou chave…"
                 className="bg-transparent outline-none text-sm w-full text-fg" />
        </div>
        <select value={ordem} onChange={(e) => setOrdem(e.target.value)}
                className="glass rounded-xl px-3 py-2 text-sm text-dim bg-transparent outline-none cursor-pointer">
          <option value="valor_desc">Maior valor</option>
          <option value="valor_asc">Menor valor</option>
          <option value="numero_desc">Nº ↓</option>
          <option value="numero_asc">Nº ↑</option>
        </select>
        <button onClick={() => setSoEditaveis((v) => !v)}
                className="text-xs px-3 py-2 rounded-xl font-medium flex items-center gap-1.5 shrink-0"
                style={soEditaveis
                  ? { background: 'var(--tint-ok)', color: 'var(--ok)' }
                  : { background: 'var(--glass-hover)', color: 'var(--text-dim)' }}>
          <ToggleRight size={14} /> só editáveis
        </button>
      </div>
      <div className="text-[11px] text-faint num">{mostrando} de {total} nota(s)</div>
    </div>
  )
}

/* -------------------------------- Lista --------------------------------- */
function NotasList({ notas, blingErro, carregando, carregandoValores, aplicadas, notaId,
                    selecao, onToggleSel, onSelTodas, onLimparSel, onAplicarSel, loteRodando,
                    onConciliarSel, concilLoteLoad, onAbrir, onVerCompleta, onSimular }) {
  const selCount = selecao?.size || 0
  const editaveisVis = notas.filter((n) => n.editavel).length
  return (
    <div className="glass rounded-2xl p-4">
      {/* Barra de seleção em massa */}
      {!blingErro && !carregando && editaveisVis > 0 && (
        <div className="flex items-center gap-2 pb-3 mb-2 border-b border-glassb flex-wrap">
          <button onClick={() => (selCount === editaveisVis ? onLimparSel() : onSelTodas(notas))}
                  className="text-[11px] px-2 py-1 rounded-lg flex items-center gap-1.5"
                  style={{ background: 'var(--glass-hover)', color: 'var(--text-dim)' }}>
            {selCount === editaveisVis && editaveisVis > 0
              ? <><CheckSquare size={13} /> limpar</>
              : <><Square size={13} /> selecionar editáveis</>}
          </button>
          {selCount > 0 && (
            <>
              <span className="text-[11px] text-dim num">{selCount} selecionada(s)</span>
              <div className="ml-auto flex items-center gap-2">
                {onConciliarSel && (
                  <button onClick={onConciliarSel} disabled={concilLoteLoad}
                          className="text-[11px] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 disabled:opacity-60 border"
                          style={{ borderColor: '#EE4D2D55', color: '#EE4D2D' }}>
                    <ShoppingBag size={12} /> {concilLoteLoad ? 'Conciliando…' : 'Conciliar'}
                  </button>
                )}
                <button onClick={onAplicarSel} disabled={loteRodando}
                        className="text-[11px] px-3 py-1.5 rounded-lg font-medium text-white flex items-center gap-1.5 disabled:opacity-60"
                        style={{ background: 'var(--accent)' }}>
                  <Send size={12} /> {loteRodando ? 'Aplicando…' : `Aplicar nas ${selCount}`}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {blingErro ? (
        <div className="text-center py-8">
          <Plug size={22} className="text-faint mx-auto mb-2" />
          <div className="text-sm font-medium">Não foi possível listar as notas</div>
          <div className="text-xs text-dim mt-1">Conecte o Bling no topo e tente Atualizar.</div>
        </div>
      ) : carregando ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="rounded-xl border border-glassb h-[60px] animate-pulse" style={{ background: 'var(--glass-hover)' }} />)}
        </div>
      ) : notas.length === 0 ? (
        <div className="text-center py-8">
          <Inbox size={22} className="text-faint mx-auto mb-2" />
          <div className="text-sm font-medium">Nenhuma nota neste filtro</div>
          <div className="text-xs text-dim mt-1">Ajuste a situação ou a busca acima.</div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[58vh] overflow-y-auto pr-1">
          {notas.map((n) => (
            <NotaCard key={n.id || n.numero} n={n} ativo={n.id === notaId}
                      aplicadaTotal={aplicadas?.[n.id]} carregandoValor={carregandoValores}
                      selecionada={selecao?.has(n.id)} onToggleSel={onToggleSel}
                      onAbrir={onAbrir} onVer={onVerCompleta} />
          ))}
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-glassb">
        <button onClick={onSimular} className="w-full glass rounded-xl py-2 text-sm text-dim hover:text-accent flex items-center justify-center gap-2">
          <Zap size={15} /> Simular manualmente
        </button>
      </div>
    </div>
  )
}

function NotaCard({ n, ativo, aplicadaTotal, carregandoValor, selecionada, onToggleSel, onAbrir, onVer }) {
  const cor = corSituacao(n.situacao)
  const acao = () => (n.editavel ? onAbrir(n.id) : onVer(n.id))
  const aplicada = aplicadaTotal != null
  const semValor = !n.valor && carregandoValor
  return (
    <div className={`rounded-xl border px-3 py-2.5 flex items-center gap-2.5 transition ${ativo ? 'border-accent' : aplicada ? '' : selecionada ? '' : 'border-glassb hover:bg-[var(--glass-hover)]'}`}
         style={selecionada && !ativo ? { borderColor: 'var(--accent)', background: 'var(--tint-accent)' }
              : aplicada && !ativo ? { borderColor: 'var(--ok)', background: 'var(--tint-ok)' } : undefined}>
      {n.editavel && onToggleSel && (
        <button onClick={() => onToggleSel(n.id)} className="shrink-0 text-faint hover:text-accent" title="Selecionar">
          {selecionada ? <CheckSquare size={16} style={{ color: 'var(--accent)' }} /> : <Square size={16} />}
        </button>
      )}
      <button onClick={acao} className="min-w-0 flex-1 text-left">
        <div className="text-sm font-medium truncate">{n.cliente || `Nota ${n.numero ?? ''}`}</div>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <Badge>{`nº ${n.numero ?? '—'}`}</Badge>
          {aplicada
            ? <Badge cor="var(--ok)"><span className="inline-flex items-center gap-0.5"><CheckCircle2 size={9} /> aplicada</span></Badge>
            : <Badge cor={cor}>{n.situacao_label}</Badge>}
          {!aplicada && n.editavel && <Badge cor="var(--ok)">editável</Badge>}
          {n.uf && <Badge>{n.uf}</Badge>}
          <PlataformaBadge nome={n.plataforma} />
        </div>
        {n.situacao === 4 && n.motivo && (
          <div className="text-[10px] mt-1 flex items-start gap-1" style={{ color: 'var(--danger)' }}>
            <AlertTriangle size={10} className="mt-0.5 shrink-0" /> <span className="line-clamp-2">{n.motivo}</span>
          </div>
        )}
      </button>
      <div className="text-right shrink-0">
        {aplicada
          ? <div className="num text-sm font-semibold" style={{ color: 'var(--ok)' }}>{brl(aplicadaTotal)}</div>
          : semValor
            ? <div className="h-4 w-14 rounded animate-pulse ml-auto" style={{ background: 'var(--glass-hover)' }} />
            : <div className="num text-sm font-semibold">{brl(n.valor)}</div>}
        <div className="flex items-center gap-1 justify-end mt-1">
          <button onClick={() => onVer(n.id)} title="Ver nota completa" className="text-faint hover:text-accent p-0.5"><Eye size={14} /></button>
          <button onClick={acao} title={n.editavel ? 'Editar desconto' : 'Ver nota'} className="text-faint hover:text-fg p-0.5"><ChevronRight size={15} /></button>
        </div>
      </div>
    </div>
  )
}

function Badge({ children, cor }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded num font-medium"
          style={cor
            ? { background: tintOf(cor), color: cor }
            : { background: 'var(--glass-hover)', color: 'var(--text-dim)' }}>
      {children}
    </span>
  )
}

/* --------------------------- Aplicar em lote ---------------------------- */
function LoteBar({ qtd, cfg, rodando, onAplicar, report, onFechar, onVerNota }) {
  const tipo = cfg?.desconto_tipo === 'valor' ? `R$ ${cfg?.desconto_valor}` : `${cfg?.desconto_valor ?? 0}%`
  const semDesconto = !cfg || !Number(cfg?.desconto_valor)
  return (
    <div className="rounded-2xl p-5 border" style={{ borderColor: 'var(--accent)', background: 'var(--tint-accent)' }}>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>
          <Send size={18} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Aplicar o desconto em todas as pendentes de uma vez</div>
          <div className="text-[11px] text-dim mt-0.5">
            Aplica <b className="text-fg">{tipo}{cfg?.remover_frete ? ' + zerar frete' : ''}</b> em <b className="text-fg">{qtd}</b> nota(s)
            e salva no Bling — você não precisa editar nota por nota lá. A autorização na Sefaz segue manual, no Bling.
          </div>
        </div>
        <button onClick={onAplicar} disabled={rodando || !qtd || semDesconto}
                className="rounded-xl px-4 py-2.5 font-semibold text-white flex items-center gap-2 disabled:opacity-50 shrink-0"
                style={{ background: 'var(--accent)' }}>
          {rodando ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
          {rodando ? 'Aplicando…' : `Aplicar nas ${qtd} pendentes`}
        </button>
      </div>

      {semDesconto && (
        <div className="mt-3 text-[11px] flex items-center gap-1.5" style={{ color: 'var(--warn)' }}>
          <Info size={12} /> Defina o desconto padrão em <b>Regras</b> antes de aplicar em lote.
        </div>
      )}

      {report && <LoteReport report={report} onFechar={onFechar} onVerNota={onVerNota} />}
    </div>
  )
}

function LoteReport({ report, onFechar, onVerNota }) {
  if (report.erro) {
    return (
      <div className="mt-4 rounded-xl px-3 py-3 border flex items-start gap-2" style={{ borderColor: 'var(--danger)', background: 'var(--tint-danger)' }}>
        <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--danger)' }} />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium" style={{ color: 'var(--danger)' }}>Não foi possível processar o lote</div>
          <div className="text-[11px] text-dim mt-0.5 break-words">{report.erro}</div>
        </div>
        <button onClick={onFechar} className="text-faint hover:text-fg p-0.5"><X size={14} /></button>
      </div>
    )
  }
  const rel = report.relatorio || []
  const ok = report.aplicadas ?? rel.filter((r) => r.ok).length
  const falhas = rel.filter((r) => !r.ok)
  return (
    <div className="mt-4 rounded-xl border border-glassb overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div className="px-3 py-2.5 flex items-center gap-2 border-b border-glassb">
        <CheckCircle2 size={15} style={{ color: ok ? 'var(--ok)' : 'var(--faint)' }} />
        <div className="text-xs font-medium">
          {ok} de {report.processadas} nota(s) com desconto aplicado e salvo no Bling
          {falhas.length > 0 && <span className="text-faint font-normal"> · {falhas.length} com erro</span>}
        </div>
        <button onClick={onFechar} className="ml-auto text-faint hover:text-fg p-0.5"><X size={14} /></button>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y" style={{ borderColor: 'var(--glass-border)' }}>
        {rel.map((r, i) => (
          <div key={i} className="px-3 py-2 flex items-center gap-2.5 text-xs" style={{ borderColor: 'var(--glass-border)' }}>
            {r.ok
              ? <CheckCircle2 size={14} className="shrink-0" style={{ color: 'var(--ok)' }} />
              : <AlertTriangle size={14} className="shrink-0" style={{ color: 'var(--danger)' }} />}
            <div className="min-w-0 flex-1">
              <div className="font-medium">Nota nº {r.numero || r.id}</div>
              {r.ok
                ? <div className="text-[10px] text-faint num">total {brl(r.total_nota)}{r.total_desconto ? ` · desconto ${brl(r.total_desconto)}` : ''}</div>
                : <div className="text-[10px] num" style={{ color: 'var(--danger)' }}>{r.erro}</div>}
            </div>
            {r.id && <button onClick={() => onVerNota(r.id)} className="text-[11px] text-accent hover:underline shrink-0 flex items-center gap-1"><Eye size={12} /> ver</button>}
          </div>
        ))}
      </div>
      {falhas.length > 0 && (
        <div className="px-3 py-2 text-[11px] text-dim border-t border-glassb" style={{ background: 'var(--glass-hover)' }}>
          As notas com erro mostram a mensagem exata do Bling. Se for sobre campo do schema (ex.: contato/CFOP), me mande o texto que eu ajusto o envio.
        </div>
      )}
    </div>
  )
}

/* --------------------------- Automação (webhook) ------------------------ */
function AutomacaoPanel({ cfg, eventos }) {
  const autoOn = !!cfg?.auto
  const lista = Array.isArray(eventos) ? eventos : []
  const aplicados = lista.filter((e) => e.resultado?.ok && e.resultado?.aplicado).length
  const temNaoEncontrada = lista.some((e) => e.resultado?.motivo === 'nao_encontrada')

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl grid place-items-center shrink-0"
             style={{ background: autoOn ? 'var(--tint-ok)' : 'var(--glass-hover)' }}>
          <Activity size={17} style={{ color: autoOn ? 'var(--ok)' : 'var(--faint)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold flex items-center gap-2">
            Automação por webhook
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: autoOn ? 'var(--tint-ok)' : 'var(--glass-hover)',
                           color: autoOn ? 'var(--ok)' : 'var(--faint)' }}>
              {autoOn ? 'LIGADO' : 'DESLIGADO'}
            </span>
          </div>
          <div className="text-[11px] text-dim mt-0.5">
            {autoOn
              ? <>Cada NF-e <b className="text-fg">pendente</b> que o Bling empurrar recebe o desconto padrão automaticamente. Acompanhe pelo <b className="text-fg">sino</b> no topo.</>
              : <>Ligue o <b className="text-fg">Modo automático</b> nas Regras para aplicar o desconto sozinho ao chegar cada nota.</>}
          </div>
        </div>
      </div>

      {lista.length > 0 && (
        <div className="mt-3 flex items-center gap-3 flex-wrap text-[11px] text-dim">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={13} style={{ color: 'var(--ok)' }} /> {aplicados} aplicada(s)</span>
          <span className="flex items-center gap-1.5"><Activity size={13} className="text-faint" /> {lista.length} evento(s) recebido(s)</span>
          {temNaoEncontrada && <span className="flex items-center gap-1.5" style={{ color: 'var(--warn)' }}><HelpCircle size={13} /> algumas notas não encontradas (id de pedido, não da nota)</span>}
        </div>
      )}
    </div>
  )
}

/* ------------------------------ Config ---------------------------------- */
function ConfigCard({ cfg, setCfg }) {
  const notify = useToast()
  const salvar = async (patch) => {
    const novo = { ...cfg, ...patch }
    setCfg(novo)
    try { await api.salvarNfeConfig(novo) } catch (e) { notify(e.message, 'danger') }
  }
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-sm font-semibold mb-4 flex items-center gap-2">
        <Settings2 size={16} className="text-accent" /> Regras de edição
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <Toggle label="Modo automático" desc="Aplica o desconto sozinho a cada NF-e que o Bling empurrar (webhook) e em lote" on={cfg.auto} onChange={(v) => salvar({ auto: v })} />
        <Toggle label="Remover frete" desc="Zera o frete ao editar" on={cfg.remover_frete} onChange={(v) => salvar({ remover_frete: v })} />
        <label className="block">
          <span className="text-xs text-dim block mb-1">Desconto padrão</span>
          <div className="flex gap-2">
            <select value={cfg.desconto_tipo} onChange={(e) => salvar({ desconto_tipo: e.target.value })}
                    className="bg-glass border border-glassb rounded-xl px-2 py-2 text-sm outline-none focus:border-accent">
              <option value="percentual">%</option>
              <option value="valor">R$</option>
            </select>
            <input type="number" value={cfg.desconto_valor} onChange={(e) => salvar({ desconto_valor: Number(e.target.value) })}
                   className="w-20 bg-glass border border-glassb rounded-xl px-3 py-2 text-sm outline-none focus:border-accent num" />
          </div>
        </label>
        <label className="block">
          <span className="text-xs text-dim block mb-1">Código situação "Pendente"</span>
          <input type="number" value={cfg.situacao_pendente} onChange={(e) => salvar({ situacao_pendente: Number(e.target.value) })}
                 className="w-24 bg-glass border border-glassb rounded-xl px-3 py-2 text-sm outline-none focus:border-accent num" />
        </label>
      </div>

      <PlataformaDescontos cfg={cfg} salvar={salvar} />
    </div>
  )
}

const PLATAFORMAS_DESC = ['Shopee', 'Mercado Livre', 'Amazon', 'Shein', 'Magalu', 'TikTok Shop', 'Americanas', 'NuvemShop']

function PlataformaDescontos({ cfg, salvar }) {
  const [aberto, setAberto] = useState(false)
  const regras = cfg.desconto_plataformas || {}
  const ativas = Object.keys(regras).length

  const setRegra = (plat, patch) => {
    const atual = regras[plat] || { tipo: 'percentual', valor: 0 }
    const nova = { ...atual, ...patch }
    const todas = { ...regras }
    if (!nova.valor || Number(nova.valor) <= 0) delete todas[plat]
    else todas[plat] = { tipo: nova.tipo, valor: Number(nova.valor) }
    salvar({ desconto_plataformas: todas })
  }

  return (
    <div className="mt-4 pt-4 border-t border-glassb">
      <button onClick={() => setAberto((v) => !v)} className="flex items-center gap-2 w-full text-left">
        <ShoppingBag size={14} className="text-accent2" />
        <span className="text-sm font-medium">Desconto por plataforma</span>
        {ativas > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded num" style={{ background: 'rgba(123, 42, 140, 0.16)', color: 'var(--accent2)' }}>{ativas} ativa(s)</span>}
        <ChevronRight size={15} className={`ml-auto text-faint transition ${aberto ? 'rotate-90' : ''}`} />
      </button>
      <div className="text-[11px] text-dim mt-1">
        Regra própria por marketplace no lote/automático. Em branco, usa o desconto padrão acima.
      </div>
      {aberto && (
        <div className="mt-3 space-y-2">
          {PLATAFORMAS_DESC.map((plat) => {
            const r = regras[plat]
            return (
              <div key={plat} className="flex items-center gap-2">
                <span className="text-[11px] font-medium w-32 shrink-0 flex items-center gap-2">
                  <MarketplaceLogo nome={plat} size={16} />
                  {plat}
                </span>
                <select value={r?.tipo || 'percentual'} onChange={(e) => setRegra(plat, { tipo: e.target.value })}
                        className="bg-glass border border-glassb rounded-lg px-2 py-1.5 text-xs outline-none focus:border-accent">
                  <option value="percentual">%</option>
                  <option value="valor">R$</option>
                </select>
                <input type="number" placeholder="padrão" value={r?.valor ?? ''} onChange={(e) => setRegra(plat, { valor: e.target.value })}
                       className="w-20 bg-glass border border-glassb rounded-lg px-2 py-1.5 text-xs outline-none focus:border-accent num" />
                {r && <Badge cor="var(--ok)">ativo</Badge>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ------------------------------ Editor ---------------------------------- */
function Editor({ nota, cfg, aplicada, onAplicado, onVerCompleta }) {
  const notify = useToast()
  const [itens, setItens] = useState(nota.itens || [])
  const [tipo, setTipo] = useState(cfg?.desconto_tipo || 'percentual')
  const [global, setGlobal] = useState(cfg?.desconto_valor ?? 0)
  const [removerFrete, setRemoverFrete] = useState(cfg?.remover_frete ?? true)
  const [porItem, setPorItem] = useState({})
  const [resumo, setResumo] = useState(null)
  const [aplicando, setAplicando] = useState(false)
  const [diag, setDiag] = useState(null)
  const [diagLoad, setDiagLoad] = useState(false)
  const [concil, setConcil] = useState(null)
  const [concilLoad, setConcilLoad] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const retransmitir = async () => {
    if (!window.confirm('Retransmitir esta nota ao Sefaz?\n\nUse só depois de corrigir o motivo da rejeição. A transmissão é feita pelo Bling com seu certificado.')) return
    setEnviando(true)
    try {
      await api.nfeEnviar(nota.id)
      notify('Nota enviada ao Sefaz. Acompanhe a situação no Bling/lista.', 'ok')
    } catch (e) { notify(e.message, 'danger') }
    setEnviando(false)
  }

  const conferirShopee = async () => {
    setConcilLoad(true); setConcil(null)
    try { setConcil(await api.nfeConciliacaoShopee(nota.id)) }
    catch (e) { notify(e.message, 'danger') }
    setConcilLoad(false)
  }

  const diagnosticar = async () => {
    if (nota._manual) return
    setDiagLoad(true); setDiag(null)
    try { setDiag(await api.nfeDiagEdicao(nota.id)) }
    catch (e) { notify(e.message, 'danger') }
    setDiagLoad(false)
  }

  // Simulação ao vivo (com debounce)
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const r = await api.nfeSimular({
          itens, desconto_tipo: tipo, desconto_valor: Number(global) || 0,
          descontos_por_item: porItem, remover_frete: removerFrete, frete: nota.frete || 0,
        })
        setResumo(r.resumo)
      } catch { /* silencioso na prévia */ }
    }, 280)
    return () => clearTimeout(t)
  }, [itens, tipo, global, porItem, removerFrete])

  const setItem = (i, campo, valor) =>
    setItens(itens.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it)))
  const addItem = () =>
    setItens([...itens, { indice: itens.length, descricao: 'Novo item', codigo: '', quantidade: 1, valor_unitario: 0 }])
  const delItem = (i) => setItens(itens.filter((_, idx) => idx !== i).map((it, k) => ({ ...it, indice: k })))

  const aplicar = async () => {
    if (nota._manual) return
    setAplicando(true)
    try {
      const resp = await api.nfeAplicar(nota.id, {
        desconto_tipo: tipo, desconto_valor: Number(global) || 0,
        descontos_por_item: porItem, remover_frete: removerFrete, enviar: true,
      })
      notify('Nota atualizada no Bling', 'ok')
      onAplicado?.(nota.id, resp?.resumo?.total_nota)
    } catch (e) { notify(e.message, 'danger') }
    setAplicando(false)
  }

  return (
    <div className="glass rounded-2xl p-5 flex flex-col">
      {/* Cabeçalho da nota */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-glassb">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{nota.contato || 'Nota'}</div>
          <div className="text-[11px] text-faint mt-0.5 flex items-center gap-1.5 flex-wrap">
            {nota._manual ? 'Simulação manual' : `Nota nº ${nota.numero || '—'} · série ${nota.serie || '—'}`}
            {nota.documento && <span className="num">· doc {nota.documento}</span>}
            {!nota._manual && <PlataformaBadge nome={nota.plataforma} />}
          </div>
        </div>
        {nota._manual
          ? <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-md" style={{ background: 'var(--glass-hover)', color: 'var(--warn)' }}>Simulação</span>
          : (
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => onVerCompleta?.(nota.id)}
                      className="text-[11px] rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 border border-glassb text-dim hover:text-accent hover:border-accent transition">
                <Eye size={13} /> Ver nota completa
              </button>
              <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-md flex items-center gap-1" style={{ background: 'var(--glass-hover)', color: 'var(--ok)' }}>editável</span>
            </div>
          )}
      </div>

      {/* Resumo compacto da nota (não-manual) */}
      {!nota._manual && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <ResumoChip label="Total da nota" valor={brl(nota.valor_nota || 0)} forte />
          <ResumoChip label="Produtos" valor={brl(nota.valor_produtos || 0)} />
          <ResumoChip label="Frete" valor={brl(nota.frete || 0)} />
          <ResumoChip label="Destino" valor={nota.municipio ? `${nota.municipio}${nota.uf ? '/' + nota.uf : ''}` : (nota.uf || '—')} />
          {nota.pedido_loja && <ResumoChip label="Pedido da loja" valor={`#${nota.pedido_loja}`} />}
          {nota.documento && <ResumoChip label="Documento" valor={nota.documento} />}
        </div>
      )}
      {aplicada != null && (
        <div className="mt-3 rounded-xl px-3 py-2 text-xs flex items-center gap-2" style={{ background: 'var(--tint-ok)', color: 'var(--ok)' }}>
          <CheckCircle2 size={14} /> Desconto aplicado e salvo no Bling · novo total {brl(aplicada)}
        </div>
      )}

      {/* Controles globais */}
      <div className="flex flex-wrap items-end gap-3 py-3">
        <label className="block">
          <span className="text-[10px] text-dim block mb-1">Desconto geral</span>
          <div className="flex">
            <button onClick={() => setTipo('percentual')} className={`px-2.5 py-2 rounded-l-xl border border-glassb ${tipo === 'percentual' ? 'text-white' : 'text-dim'}`} style={tipo === 'percentual' ? { background: 'var(--accent)' } : undefined}><Percent size={13} /></button>
            <button onClick={() => setTipo('valor')} className={`px-2.5 py-2 border-y border-glassb ${tipo === 'valor' ? 'text-white' : 'text-dim'}`} style={tipo === 'valor' ? { background: 'var(--accent)' } : undefined}><DollarSign size={13} /></button>
            <input type="number" value={global} onChange={(e) => setGlobal(e.target.value)}
                   className="w-20 bg-glass border border-glassb rounded-r-xl px-3 py-2 text-sm outline-none focus:border-accent num" />
          </div>
        </label>
        <button
          onClick={() => setRemoverFrete((v) => !v)}
          className="rounded-xl px-3 py-2 text-sm flex items-center gap-2 border border-glassb"
          style={removerFrete ? { background: 'var(--glass-hover)', color: 'var(--accent2)' } : { color: 'var(--dim)' }}
        >
          <Truck size={15} /> {removerFrete ? 'Frete zerado' : 'Manter frete'}
        </button>
        {nota._manual && (
          <button onClick={addItem} className="ml-auto text-sm text-accent flex items-center gap-1 hover:underline">
            <Plus size={14} /> item
          </button>
        )}
      </div>

      {/* Itens */}
      <div className="space-y-1.5">
        <div className="grid items-center gap-2 text-[10px] uppercase tracking-wide text-faint px-1"
             style={{ gridTemplateColumns: '1fr 56px 80px 84px 28px' }}>
          <span>Item</span><span className="text-center">Qtd</span><span className="text-right">Unit.</span><span className="text-right">Desc.</span><span />
        </div>
        {itens.map((it, i) => (
          <div key={i} className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr 56px 80px 84px 28px' }}>
            <input
              value={it.descricao} onChange={(e) => setItem(i, 'descricao', e.target.value)} disabled={!nota._manual}
              className="bg-glass border border-glassb rounded-lg px-2 py-1.5 text-sm outline-none focus:border-accent disabled:opacity-80 truncate"
            />
            <input type="number" value={it.quantidade} onChange={(e) => setItem(i, 'quantidade', Number(e.target.value))} disabled={!nota._manual}
                   className="bg-glass border border-glassb rounded-lg px-2 py-1.5 text-sm text-center outline-none focus:border-accent num disabled:opacity-80" />
            <input type="number" value={it.valor_unitario} onChange={(e) => setItem(i, 'valor_unitario', Number(e.target.value))} disabled={!nota._manual}
                   className="bg-glass border border-glassb rounded-lg px-2 py-1.5 text-sm text-right outline-none focus:border-accent num disabled:opacity-80" />
            <input type="number" placeholder="—" value={porItem[it.indice] ?? ''}
                   onChange={(e) => setPorItem({ ...porItem, [it.indice]: e.target.value === '' ? undefined : Number(e.target.value) })}
                   className="bg-glass border border-glassb rounded-lg px-2 py-1.5 text-sm text-right outline-none focus:border-accent num" />
            {nota._manual
              ? <button onClick={() => delItem(i)} className="grid place-items-center h-8 text-faint hover:text-danger"><Trash2 size={14} /></button>
              : <span />}
          </div>
        ))}
        {itens.length === 0 && <div className="text-xs text-dim py-2">Sem itens. Adicione um item para simular.</div>}
      </div>

      {/* Resumo + aplicar */}
      <Resumo resumo={resumo} />

      {!nota._manual && Array.isArray(nota.parcelas) && nota.parcelas.length > 0 && (
        <div className="mt-3 pt-3 border-t border-glassb">
          <div className="text-[11px] text-dim mb-2 flex items-center gap-1.5"><CreditCard size={12} /> Parcelas (atualizadas ao aplicar)</div>
          <div className="space-y-1">
            {nota.parcelas.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-[12px]">
                <span className="text-faint num">{p.data || `Parcela ${i + 1}`}</span>
                <span className="num text-dim">{brl(p.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!nota._manual && (
        <>
          <button
            onClick={aplicar} disabled={aplicando}
            className="mt-4 rounded-xl py-2.5 text-sm font-medium text-white disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: 'var(--accent)' }}
          >
            <Send size={15} /> {aplicando ? 'Aplicando…' : 'Aplicar no Bling'}
          </button>
          <button
            onClick={diagnosticar} disabled={diagLoad}
            className="mt-2 rounded-xl py-2 text-xs text-dim hover:text-fg disabled:opacity-60 flex items-center justify-center gap-2 border border-glassb"
          >
            <Activity size={13} /> {diagLoad ? 'Analisando…' : 'Diagnosticar envio (não envia)'}
          </button>
          {diag && <DiagEdicao diag={diag} onFechar={() => setDiag(null)} />}

          {nota.situacao === 4 && (
            <button
              onClick={retransmitir} disabled={enviando}
              className="mt-2 rounded-xl py-2 text-xs font-medium disabled:opacity-60 flex items-center justify-center gap-2 border"
              style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}
            >
              <Send size={13} /> {enviando ? 'Enviando…' : 'Retransmitir ao Sefaz'}
            </button>
          )}

          {nota.plataforma === 'Shopee' && nota.pedido_loja && (
            <button
              onClick={conferirShopee} disabled={concilLoad}
              className="mt-2 rounded-xl py-2 text-xs disabled:opacity-60 flex items-center justify-center gap-2 border"
              style={{ borderColor: '#EE4D2D55', color: '#EE4D2D' }}
            >
              <ShoppingBag size={13} /> {concilLoad ? 'Conferindo…' : 'Conferir repasse Shopee'}
            </button>
          )}
          {concil && <ConciliacaoShopee c={concil} onFechar={() => setConcil(null)} />}
        </>
      )}
    </div>
  )
}

function ConciliacaoShopee({ c, onFechar }) {
  if (!c.ok) {
    return (
      <div className="mt-2 rounded-xl p-3 text-xs border border-glassb" style={{ background: 'var(--glass-hover)' }}>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-warn"><AlertTriangle size={13} /> Não foi possível conciliar</span>
          <button onClick={onFechar} className="text-faint hover:text-fg"><X size={13} /></button>
        </div>
        <div className="text-dim mt-1">{c.erro}</div>
      </div>
    )
  }
  const div = c.divergente
  return (
    <div className="mt-2 rounded-xl p-3.5 text-xs border" style={{ borderColor: div ? 'var(--warn)' : 'var(--ok)', background: div ? 'var(--tint-warn)' : 'var(--tint-ok)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 font-semibold" style={{ color: div ? 'var(--warn)' : 'var(--ok)' }}>
          {div ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
          {div ? 'Divergência com a Shopee' : 'Bate com a Shopee'}
        </span>
        <button onClick={onFechar} className="text-faint hover:text-fg"><X size={13} /></button>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        <ConcilLinha rotulo="Valor da nota (fiscal)" valor={brl(c.valor_nota)} />
        <ConcilLinha rotulo="Pago pelo produto (Shopee)" valor={brl(c.pago_produto)} forte />
        {c.recebido_liquido != null && <ConcilLinha rotulo="Repasse líquido recebido" valor={brl(c.recebido_liquido)} cor="var(--ok)" />}
        {c.taxas != null && <ConcilLinha rotulo="Taxas Shopee" valor={brl(c.taxas)} cor="var(--danger)" />}
      </div>
      <div className="mt-2.5 pt-2.5 border-t border-glassb flex items-center justify-between">
        <span className="text-dim">Diferença nota × pago</span>
        <span className="num font-bold" style={{ color: div ? 'var(--warn)' : 'var(--ok)' }}>
          {c.diferenca > 0 ? '+' : ''}{brl(c.diferenca)}
        </span>
      </div>
      {div && (
        <div className="text-[10px] text-dim mt-2 flex items-start gap-1">
          <Info size={10} className="mt-0.5 shrink-0" />
          O valor da nota está {c.diferenca > 0 ? 'acima' : 'abaixo'} do que o comprador pagou na Shopee. Ajuste o desconto para alinhar o fiscal à venda real.
        </div>
      )}
      {!c.tem_escrow && (
        <div className="text-[10px] text-faint mt-1.5">Pedido sem dados de repasse (escrow) ainda disponíveis na Shopee.</div>
      )}
      <div className="text-[10px] text-faint mt-1.5 num">Pedido {c.order_sn} · {c.comprador || '—'}{c.status ? ` · ${c.status}` : ''}</div>
    </div>
  )
}

function ConcilLinha({ rotulo, valor, cor = 'var(--fg)', forte = false }) {
  return (
    <div>
      <div className="text-[10px] text-dim">{rotulo}</div>
      <div className={`num ${forte ? 'text-sm font-bold' : 'text-[13px] font-semibold'}`} style={{ color: cor }}>{valor}</div>
    </div>
  )
}

function ConciliacaoLoteReport({ r, onFechar, onVerNota }) {
  const divergentes = (r.linhas || []).filter((l) => l.ok && l.divergente)
  const erros = (r.linhas || []).filter((l) => !l.ok)
  return (
    <div className="glass rounded-2xl p-4 mt-1">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold flex items-center gap-2">
          <ShoppingBag size={15} style={{ color: '#EE4D2D' }} /> Conciliação Shopee
        </span>
        <button onClick={onFechar} className="text-faint hover:text-fg"><X size={15} /></button>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <SimMini label="Conferidas" valor={String(r.conferidas)} />
        <SimMini label="Divergentes" valor={String(r.divergentes)} cor={r.divergentes ? 'var(--warn)' : 'var(--ok)'} forte />
        <SimMini label="Recebido (escrow)" valor={brl(r.soma_recebido)} cor="var(--ok)" />
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <SimMini label="Soma das notas" valor={brl(r.soma_nota)} />
        <SimMini label="Pago na Shopee" valor={brl(r.soma_pago)} />
      </div>
      {divergentes.length > 0 ? (
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
          <div className="text-[11px] text-dim mb-1">Notas com divergência:</div>
          {divergentes.map((l) => (
            <button key={l.id} onClick={() => onVerNota(l.id)}
                    className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left border border-glassb hover:bg-[var(--glass-hover)]">
              <AlertTriangle size={13} style={{ color: 'var(--warn)' }} className="shrink-0" />
              <span className="text-xs num">pedido {l.order_sn}</span>
              <span className="ml-auto num text-xs text-dim">nota {brl(l.valor_nota)} · pago {brl(l.pago_produto)}</span>
              <span className="num text-xs font-semibold" style={{ color: 'var(--warn)' }}>
                {l.diferenca > 0 ? '+' : ''}{brl(l.diferenca)}
              </span>
            </button>
          ))}
        </div>
      ) : r.conferidas > 0 ? (
        <div className="text-xs flex items-center gap-2 py-2" style={{ color: 'var(--ok)' }}>
          <CheckCircle2 size={14} /> Todas as notas Shopee conferidas batem com o repasse.
        </div>
      ) : null}
      {erros.length > 0 && (
        <div className="text-[10px] text-faint mt-2">{erros.length} nota(s) não Shopee/sem pedido foram ignoradas.</div>
      )}
    </div>
  )
}

function DiagEdicao({ diag, onFechar }) {
  const ok = diag.bate
  const [copiado, setCopiado] = useState(false)
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(diag, null, 2))
      setCopiado(true); setTimeout(() => setCopiado(false), 2000)
    } catch { /* clipboard pode falhar */ }
  }
  const comp = diag.comparacao || {}
  const orig = comp.original || {}
  const env = comp.enviado || {}
  const itOrig = (orig.itens || [])[0] || {}
  const itEnv = (env.itens || [])[0] || {}
  const Dado = ({ label, de, para, destaque }) => (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-faint">{label}</span>
      <span className="num">
        <span className="text-dim">{de ?? '—'}</span>
        <span className="text-faint mx-1">→</span>
        <b className="text-fg" style={destaque ? { color: 'var(--accent)' } : undefined}>{para ?? '—'}</b>
      </span>
    </div>
  )
  return (
    <div className="mt-3 rounded-xl border p-3 text-[11px]"
         style={{ borderColor: ok ? 'var(--ok)' : 'var(--danger)', background: 'var(--glass-hover)' }}>
      <div className="flex items-center gap-2 mb-2">
        {ok ? <CheckCircle2 size={14} style={{ color: 'var(--ok)' }} /> : <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />}
        <span className="font-semibold" style={{ color: ok ? 'var(--ok)' : 'var(--danger)' }}>
          {ok ? 'Parcelas batem com o total — envio deve passar' : 'Parcelas NÃO batem — Bling recusaria'}
        </span>
        <button onClick={onFechar} className="ml-auto text-faint hover:text-fg"><X size={14} /></button>
      </div>

      {/* comparação: como está HOJE → como SERIA enviado */}
      <div className="rounded-lg p-2 mb-2" style={{ background: 'var(--bg)' }}>
        <div className="text-[10px] text-faint uppercase tracking-wide mb-1">Nota hoje → Envio (desconto na nota)</div>
        <Dado label="valorNota" de={orig.valorNota} para={env.valorNota} destaque />
        <Dado label="NOTA · desconto" de={orig.desconto_nota} para={env.desconto_nota} destaque />
        <Dado label="valorFrete" de={orig.valorFrete} para={env.valorFrete} />
        <Dado label="item · valor (preço cheio)" de={itOrig.valor} para={itEnv.valor} />
        <Dado label="item · valorTotal (bruto)" de={itOrig.valorTotal} para={itEnv.valorTotal} />
        <Dado label="item · tributo aprox." de={itOrig.valorAproximadoTotalTributos} para={itEnv.valorAproximadoTotalTributos} />
        <Dado label="parcela · valor" de={(orig.parcelas || [])[0]?.valor} para={(env.parcelas || [])[0]?.valor} destaque />
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 num">
        <div>soma parcelas: <b className="text-fg">{diag.soma_parcelas_payload}</b></div>
        <div>valorNota envio: <b className="text-fg">{diag.total_calculado}</b></div>
        <div>desconto da nota: <b className="text-fg">{brl(env.desconto_nota)}</b></div>
        <div>parcelas batem: <b style={{ color: diag.bate ? 'var(--ok)' : 'var(--danger)' }}>{diag.bate ? 'sim' : 'não'}</b></div>
      </div>
      <div className="mt-1 text-[10px] text-faint">
        O desconto ({brl(env.desconto_nota)}) vai no <b>campo desconto da NOTA</b> (preço do item fica cheio), igual a tela do Bling faz. valorNota = itens − desconto + frete = parcelas. Se a API recusar por total, o envio reaplica embutindo no preço automaticamente.
      </div>

      <button onClick={copiar}
              className="mt-2.5 w-full rounded-lg py-1.5 text-[11px] font-medium flex items-center justify-center gap-1.5"
              style={{ background: 'var(--accent)', color: '#fff' }}>
        <Copy size={12} /> {copiado ? 'Copiado! Cole aqui no chat' : 'Copiar diagnóstico completo'}
      </button>
      <div className="mt-1.5 text-[10px] text-faint">
        O diagnóstico completo inclui o <b>payload inteiro que seria enviado</b> e a <b>nota original</b> — toque em copiar e cole pra mim com os dados corretos.
      </div>
    </div>
  )
}

function Resumo({ resumo }) {
  const r = resumo || {}
  return (
    <div className="mt-4 pt-3 border-t border-glassb space-y-1 text-[13px]">
      <Linha label="Total bruto" valor={brl(r.total_bruto)} />
      <Linha label="Descontos" valor={`– ${brl(r.total_desconto)}`} cor="var(--accent2)" />
      <Linha label="Produtos" valor={brl(r.total_produtos)} dim />
      {r.frete_removido > 0 && <Linha label="Frete removido" valor={`– ${brl(r.frete_removido)}`} cor="var(--accent2)" />}
      <div className="flex justify-between pt-2 mt-1 border-t border-glassb font-bold text-base">
        <span>Total da nota</span>
        <span className="num text-accent">{brl(r.total_nota)}</span>
      </div>
    </div>
  )
}

function Linha({ label, valor, dim, cor }) {
  return (
    <div className="flex justify-between">
      <span className={dim ? 'text-dim' : 'text-fg'}>{label}</span>
      <span className="num" style={{ color: cor || (dim ? 'var(--dim)' : 'var(--fg)') }}>{valor}</span>
    </div>
  )
}

function VazioEditor() {
  return (
    <div className="glass rounded-2xl p-8 grid place-items-center text-center">
      <div className="h-14 w-14 rounded-2xl grid place-items-center mb-3" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>
        <FileText size={26} className="text-white" />
      </div>
      <div className="font-display font-semibold text-lg">Selecione uma nota</div>
      <div className="text-sm text-dim mt-1 max-w-sm">
        Escolha uma nota pendente à esquerda para editar descontos e frete — ou clique em "Simular
        manualmente" para testar o cálculo sem o Bling.
      </div>
    </div>
  )
}

/* ------------------------------- UI base -------------------------------- */
function Toggle({ label, desc, on, onChange }) {
  return (
    <div>
      <div className="text-xs text-dim mb-1">{label}</div>
      <button
        onClick={() => onChange(!on)}
        className="flex items-center gap-2 rounded-xl px-3 py-2 w-full border border-glassb"
        style={{ background: on ? 'var(--glass-hover)' : 'transparent' }}
      >
        <span className="h-4 w-7 rounded-full relative transition" style={{ background: on ? 'var(--accent)' : 'var(--glass-border)' }}>
          <span className="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all" style={{ left: on ? '14px' : '2px' }} />
        </span>
        <span className="text-sm" style={{ color: on ? 'var(--fg)' : 'var(--dim)' }}>{on ? 'Ligado' : 'Desligado'}</span>
      </button>
      {desc && <div className="text-[10px] text-faint mt-1">{desc}</div>}
    </div>
  )
}

/* ------------- Nota completa (modal) — documento reformulado ------------ */
// Código de barras Code 128-C real (mesmo padrão do DANFE) a partir da chave de 44 dígitos.
// Sem dependência externa: encoder + tabela de padrões + checksum, renderizado em SVG.
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
]

function Barcode128({ value, height = 40 }) {
  const code = String(value || '').replace(/\D/g, '')
  // Code 128-C exige quantidade par de dígitos (codifica pares). A chave de NF-e tem 44.
  if (!code || code.length % 2 !== 0) {
    return <div className="h-9 rounded-md" style={{ background: 'repeating-linear-gradient(90deg,#111 0 2px,transparent 2px 4px,#111 4px 5px,transparent 5px 9px,#111 9px 12px,transparent 12px 14px)', opacity: 0.85 }} />
  }
  const codes = [105] // Start C
  for (let i = 0; i < code.length; i += 2) codes.push(parseInt(code.slice(i, i + 2), 10))
  let sum = 105
  codes.slice(1).forEach((c, i) => { sum += c * (i + 1) })
  codes.push(sum % 103) // dígito verificador
  codes.push(106)       // Stop
  const modules = codes.map((c) => CODE128_PATTERNS[c]).join('').split('').map(Number)
  const QZ = 10 // quiet zone (módulos) de cada lado
  const total = modules.reduce((s, w) => s + w, 0) + QZ * 2
  let x = QZ
  const rects = []
  modules.forEach((w, i) => {
    if (i % 2 === 0) rects.push(<rect key={i} x={x} y="0" width={w} height={height} fill="#111" />)
    x += w
  })
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${total} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }} shapeRendering="crispEdges">
      {rects}
    </svg>
  )
}

function NfeDetalhe({ nota, cfg, onClose, onEditar }) {
  const n = nota
  const dest = n.destinatario || {}
  const itens = n.itens || []
  const parcelas = n.parcelas || []
  const totalTributos = itens.reduce((s, it) => s + (Number(it.tributos_aprox) || 0), 0)
  const totalProdutos = n.valor_produtos ?? itens.reduce((s, it) => s + (Number(it.valor_total) || 0), 0)
  const qtdUnid = itens.reduce((s, it) => s + (Number(it.quantidade) || 0), 0)
  const sit = Number(n.situacao)
  const isRej = sit === 4
  const isCanc = sit === 2 || sit === 9 || sit === 11
  const isPend = sit === 1
  const isAut = !n.editavel && !isCanc && !isRej && !isPend
  const temDocs = !!(n.link_danfe || n.link_xml || n.link_pdf)
  const [copiado, setCopiado] = useState(false)
  const copiarChave = () => {
    try { navigator.clipboard?.writeText(n.chave_acesso || ''); setCopiado(true); setTimeout(() => setCopiado(false), 1600) } catch {}
  }
  const sitCor = isRej ? 'var(--danger)' : isCanc ? 'var(--faint)' : isPend ? 'var(--warn)' : 'var(--ok)'
  const sitTint = isRej ? 'var(--tint-danger)' : isCanc ? 'var(--glass-hover)' : isPend ? 'var(--tint-warn)' : 'var(--tint-ok)'
  const destCidade = [dest.municipio, dest.uf].filter(Boolean).join('/')

  // jornada da nota
  const passo3 = isRej ? { label: 'Rejeitada', st: 'err' } : isCanc ? { label: 'Cancelada', st: 'err' } : { label: 'Autorizada', st: isAut ? 'done' : 'off' }
  const steps = [
    { label: 'Emitida', st: 'done', sub: n.data_emissao || '' },
    { label: 'Transmitida', st: isPend ? 'now' : 'done', sub: '' },
    { ...passo3, sub: '' },
    { label: 'Documentos', st: temDocs ? 'done' : 'off', sub: temDocs ? 'DANFE · XML' : '' },
  ]
  const stCor = { done: 'var(--ok)', now: 'var(--warn)', err: 'var(--danger)', off: 'var(--faint)' }
  const stIco = { done: '✓', now: '•', err: '✕', off: '' }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 overflow-y-auto"
         style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="rounded-2xl w-full my-auto overflow-hidden" onClick={(e) => e.stopPropagation()}
           style={{ maxWidth: 'min(940px, 96vw)', background: 'var(--surface)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow)' }}>

        {/* HERO */}
        <div className="px-5 sm:px-6 pt-5 pb-4" style={{ background: 'linear-gradient(180deg, var(--soft), var(--surface))', borderBottom: '1px solid var(--glass-border)' }}>
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl grid place-items-center shrink-0" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>
              <FileText size={20} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-display font-bold" style={{ fontSize: 20 }}>NF-e {n.numero || '—'}</span>
                <span className="text-faint text-xs">série {n.serie || '—'}{n.modelo_label ? ` · ${n.modelo_label}` : ''}</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5" style={{ background: sitTint, color: sitCor }}>● {n.situacao_label}</span>
                {n.simples_nacional && <span className="text-[11px] px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: 'var(--glass-hover)', color: 'var(--accent2)' }}><ShieldCheck size={11} /> Simples Nacional</span>}
              </div>
              <div className="num text-xs text-dim mt-1.5">
                {destCidade ? <>Destino {destCidade} · </> : ''}{n.data_emissao ? <>emitida {n.data_emissao} · </> : ''}<b className="text-fg">{brl(n.valor_nota)}</b>
              </div>
            </div>
            <button onClick={onClose} className="text-dim hover:text-fg p-1 self-start"><X size={20} /></button>
          </div>

          {/* Jornada da nota */}
          <div className="flex items-center mt-4 overflow-x-auto pb-1">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center" style={{ flex: i < steps.length - 1 ? '1 1 0' : '0 0 auto', minWidth: i < steps.length - 1 ? 120 : 92 }}>
                <div className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: 92 }}>
                  <div className="h-6 w-6 rounded-full grid place-items-center text-[11px] shrink-0"
                       style={{ background: s.st === 'off' ? 'var(--surface)' : stCor[s.st], border: s.st === 'off' ? '2px solid var(--glass-border)' : 'none', color: s.st === 'off' ? 'var(--faint)' : '#fff' }}>{stIco[s.st]}</div>
                  <span className="text-[11px] font-medium" style={{ color: s.st === 'off' ? 'var(--faint)' : 'var(--text-dim)' }}>{s.label}</span>
                  {s.sub && <span className="text-[9px] text-faint num leading-none">{s.sub}</span>}
                </div>
                {i < steps.length - 1 && <div className="h-[3px] rounded flex-1" style={{ background: (steps[i + 1].st === 'off' || s.st === 'off') ? 'var(--glass-border)' : stCor[s.st], marginTop: -18 }} />}
              </div>
            ))}
          </div>
        </div>

        {/* BODY */}
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_292px]">
          {/* MAIN */}
          <div className="p-4 sm:p-5 space-y-3.5">
            {isRej && n.motivo && (
              <div className="rounded-xl px-3 py-2 text-xs flex items-start gap-2" style={{ border: '1px solid var(--danger)', background: 'var(--tint-danger)' }}>
                <CircleAlert size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--danger)' }} />
                <span className="text-dim"><b style={{ color: 'var(--danger)' }}>Rejeitada pela Sefaz:</b> {n.motivo}</span>
              </div>
            )}

            {/* De -> Para: Emitente e Destinatário */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              {/* Emitente (sua empresa) */}
              <div className="flex-1 rounded-2xl p-3.5" style={{ border: '1px solid var(--glass-border)' }}>
                <div className="text-[10px] uppercase tracking-wide text-faint font-bold flex items-center gap-1.5 mb-2"><Store size={13} /> Emitente</div>
                {n.emitente && (n.emitente.nome || n.emitente.cnpj) ? (
                  <>
                    <div className="text-sm font-bold">{n.emitente.nome || 'Sua empresa'}</div>
                    {n.emitente.cnpj ? <div className="num text-[11.5px] text-dim mt-0.5">{n.emitente.cnpj}</div> : null}
                    {(n.emitente.endereco || n.emitente.cidade) ? (
                      <div className="text-[11.5px] text-dim flex items-start gap-1.5 mt-1.5">
                        <MapPin size={12} className="mt-0.5 shrink-0" style={{ color: 'var(--accent2)' }} />
                        <span>{n.emitente.endereco}{n.emitente.endereco && n.emitente.cidade ? <br /> : null}{n.emitente.cidade}</span>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="text-[11.5px] text-dim flex items-start gap-1.5 mt-1">
                    <Info size={12} className="mt-0.5 shrink-0" style={{ color: 'var(--accent2)' }} />
                    <span>Preencha os dados da sua empresa na <b className="text-fg">Configuração de impressão</b> (etiqueta/folha) para aparecerem aqui.</span>
                  </div>
                )}
              </div>
              <div className="hidden sm:flex items-center justify-center shrink-0" style={{ color: 'var(--accent)' }}><ArrowRight size={18} /></div>
              {/* Destinatário */}
              <div className="flex-1 rounded-2xl p-3.5" style={{ border: '1px solid var(--glass-border)' }}>
                <div className="text-[10px] uppercase tracking-wide text-faint font-bold flex items-center gap-1.5 mb-2"><User size={13} /> Destinatário</div>
                <div className="text-sm font-bold">{dest.nome || '—'}</div>
                <div className="num text-[11.5px] text-dim mt-0.5 flex flex-wrap gap-x-2">
                  {dest.documento && <span>{dest.documento}</span>}
                  {dest.ie && <span>· IE {dest.ie}</span>}
                  {dest.telefone && <span>· {dest.telefone}</span>}
                </div>
                {(dest.logradouro || dest.endereco) && (
                  <div className="text-[11.5px] text-dim flex items-start gap-1.5 mt-1.5">
                    <MapPin size={12} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
                    <span>{dest.logradouro
                      ? <>{dest.logradouro}{dest.numero ? `, ${dest.numero}` : ''}{dest.complemento ? ` — ${dest.complemento}` : ''}{dest.bairro ? `, ${dest.bairro}` : ''}{destCidade ? <><br />{destCidade}{dest.cep ? ` · CEP ${dest.cep}` : ''}</> : ''}</>
                      : dest.endereco}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Itens */}
            <div className="rounded-2xl p-3.5" style={{ border: '1px solid var(--glass-border)' }}>
              <div className="text-[10px] uppercase tracking-wide text-faint font-bold flex items-center gap-1.5 mb-2.5"><Receipt size={13} /> Itens · {itens.length} produto(s) · {qtdUnid} un</div>
              <div className="flex items-center text-[9.5px] uppercase tracking-wide text-faint font-bold pb-1.5">
                <span className="flex-1">Produto</span><span className="w-10 text-center">Qtd</span><span className="w-16 text-right">Unit.</span><span className="w-20 text-right">Total</span>
              </div>
              {itens.map((it, i) => (
                <div key={i} className="flex items-start py-2" style={{ borderTop: '1px solid var(--glass-border)' }}>
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="text-[13px] leading-snug">{it.descricao}</div>
                    <div className="num text-[9.5px] text-faint mt-0.5 flex flex-wrap gap-x-1.5">
                      {it.codigo && <span>cód {it.codigo}</span>}
                      <span>· NCM {it.ncm || '—'}</span>
                      <span>· CFOP {it.cfop || '—'}</span>
                      {it.cest && <span>· CEST {it.cest}</span>}
                      {Number(it.tributos_aprox) > 0 && <span>· trib. {brl(it.tributos_aprox)}</span>}
                    </div>
                  </div>
                  <span className="num text-[12px] text-dim w-10 text-center shrink-0">{it.quantidade}</span>
                  <span className="num text-[12px] text-dim w-16 text-right shrink-0">{brl(it.valor)}</span>
                  <span className="num text-[13px] font-semibold w-20 text-right shrink-0">{brl(it.valor_total)}</span>
                </div>
              ))}
            </div>

            {/* Valores + Transporte/Pagamento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl p-3.5" style={{ border: '1px solid var(--glass-border)' }}>
                <div className="text-[10px] uppercase tracking-wide text-faint font-bold flex items-center gap-1.5 mb-1.5"><DollarSign size={13} /> Valores</div>
                <div className="flex justify-between text-[13px] py-1"><span className="text-dim">Produtos</span><span className="num font-medium">{brl(totalProdutos)}</span></div>
                <div className="flex justify-between text-[13px] py-1"><span className="text-dim">Frete</span><span className="num font-medium">{brl(n.valor_frete)}</span></div>
                {Number(n.desconto_nota) > 0 && <div className="flex justify-between text-[13px] py-1"><span className="text-dim">Desconto</span><span className="num font-medium" style={{ color: 'var(--ok)' }}>− {brl(n.desconto_nota)}</span></div>}
                <div className="flex justify-between items-center pt-2 mt-1" style={{ borderTop: '1px dashed var(--glass-border)' }}>
                  <span className="text-[13px] font-bold">Total da nota</span><span className="num font-extrabold" style={{ color: 'var(--accent)', fontSize: 17 }}>{brl(n.valor_nota)}</span>
                </div>
                <div className="text-[10px] text-faint mt-2 flex items-center gap-1.5"><Landmark size={11} style={{ color: 'var(--warn)' }} /> Tributos aprox. (IBPT): {brl(totalTributos)}{totalProdutos > 0 ? ` · ~${((totalTributos / (n.valor_nota || totalProdutos)) * 100).toFixed(1)}%` : ''}</div>
              </div>
              <div className="rounded-2xl p-3.5" style={{ border: '1px solid var(--glass-border)' }}>
                <div className="text-[10px] uppercase tracking-wide text-faint font-bold flex items-center gap-1.5 mb-1.5"><Truck size={13} /> Transporte &amp; pagamento</div>
                <div className="flex justify-between text-[12px] py-1" style={{ borderBottom: '1px solid var(--glass-border)' }}><span className="text-faint">Frete por conta</span><span className="text-right">{n.transporte?.frete_por_conta_label || '—'}</span></div>
                <div className="flex justify-between text-[12px] py-1" style={{ borderBottom: '1px solid var(--glass-border)' }}><span className="text-faint">Transportadora</span><span className="text-right truncate ml-2">{n.transporte?.transportador || '—'}</span></div>
                {Array.isArray(n.transporte?.volumes) && n.transporte.volumes.length > 0 && (
                  <div className="flex justify-between text-[12px] py-1" style={{ borderBottom: '1px solid var(--glass-border)' }}><span className="text-faint">Volumes</span><span className="num text-right">{n.transporte.volumes.reduce((s, v) => s + (Number(v.quantidade) || 0), 0)}{n.transporte.volumes[0]?.peso_bruto ? ` · ${n.transporte.volumes[0].peso_bruto} kg` : ''}</span></div>
                )}
                <div className="flex justify-between text-[12px] py-1"><span className="text-faint">Pagamento</span><span className="text-right">{parcelas[0]?.forma || (parcelas.length ? `${parcelas.length}x` : 'À vista / —')}</span></div>
              </div>
            </div>
          </div>

          {/* RAIL */}
          <div className="p-4 sm:p-5 space-y-3.5" style={{ background: 'var(--soft)', borderLeft: '1px solid var(--glass-border)' }}>
            {/* Documentos */}
            <div>
              <div className="text-[10px] uppercase tracking-wide text-faint font-bold flex items-center gap-1.5 mb-2.5"><FileDown size={13} /> Documentos fiscais</div>
              {temDocs ? (
                <div className="space-y-2.5">
                  {n.link_danfe && <a href={n.link_danfe} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13.5px] font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', boxShadow: '0 8px 20px var(--tint-accent-strong)' }}><Download size={15} /> Baixar DANFE</a>}
                  <div className="flex gap-2.5">
                    {n.link_pdf && <a href={n.link_pdf} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold" style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}><Download size={14} /> PDF</a>}
                    {n.link_xml && <a href={n.link_xml} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold" style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}><Download size={14} /> XML</a>}
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {n.editavel && onEditar && (
                    <button onClick={() => onEditar(n.id)} className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13.5px] font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', boxShadow: '0 8px 20px var(--tint-accent-strong)' }}>
                      <Percent size={15} /> Editar desconto
                    </button>
                  )}
                  <div className="rounded-xl px-3 py-3 text-[11.5px] text-dim flex items-start gap-2" style={{ border: '1px solid var(--glass-border)', background: 'var(--surface)' }}>
                    <Clock size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--warn)' }} />
                    <span>DANFE, PDF e XML ficam disponíveis <b className="text-fg">após a autorização</b> na Sefaz. {isPend ? 'Ajuste o desconto aqui e transmita no Bling.' : ''}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chave de acesso */}
            {n.chave_acesso && (
              <div className="rounded-2xl p-3.5" style={{ border: '1px solid var(--glass-border)', background: 'var(--surface)' }}>
                <div className="text-[10px] uppercase tracking-wide text-faint font-bold flex items-center gap-1.5"><Hash size={12} /> Chave de acesso</div>
                <div className="num text-[10px] text-dim mt-1.5 break-all leading-relaxed">{n.chave_acesso}</div>
                <div className="mt-2 rounded-md px-2 py-1.5" style={{ background: '#fff' }}>
                  <Barcode128 value={n.chave_acesso} height={40} />
                </div>
                <button onClick={copiarChave} className="w-full mt-2 text-[11px] font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1.5" style={{ background: 'var(--tint-accent)', color: 'var(--accent)' }}>
                  {copiado ? <><CheckCircle2 size={12} /> copiada</> : <><Copy size={12} /> copiar chave</>}
                </button>
              </div>
            )}

            {/* Resumo fiscal */}
            <div className="rounded-2xl p-3.5" style={{ border: '1px solid var(--glass-border)', background: 'var(--surface)' }}>
              <div className="text-[10px] uppercase tracking-wide text-faint font-bold flex items-center gap-1.5 mb-1.5"><Receipt size={12} /> Resumo fiscal</div>
              {n.natureza_operacao && <RF k="Natureza" v={n.natureza_operacao} />}
              {n.finalidade_label && <RF k="Finalidade" v={n.finalidade_label} />}
              {n.tipo_label && <RF k="Tipo" v={n.tipo_label} />}
              <RF k="Regime" v={n.simples_nacional ? 'Simples Nacional' : 'Normal'} cor="var(--accent2)" />
              {n.plataforma && <RF k="Plataforma" v={n.plataforma} />}
              {n.pedido_loja && <RF k="Pedido" v={n.pedido_loja} mono />}
              {n.vendedor && <RF k="Vendedor" v={n.vendedor} />}
            </div>

            {n.observacoes && (
              <div className="rounded-2xl p-3.5" style={{ border: '1px solid var(--glass-border)', background: 'var(--surface)' }}>
                <div className="text-[10px] uppercase tracking-wide text-faint font-bold flex items-center gap-1.5 mb-1.5"><FileText size={12} /> Observações</div>
                <div className="text-[11px] text-dim whitespace-pre-wrap break-words">{n.observacoes}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function RF({ k, v, cor, mono }) {
  return (
    <div className="flex justify-between gap-2 text-[12px] py-1" style={{ borderBottom: '1px solid var(--glass-border)' }}>
      <span className="text-faint shrink-0">{k}</span>
      <span className={'text-right font-medium ' + (mono ? 'num' : '')} style={cor ? { color: cor, fontWeight: 700 } : undefined}>{v}</span>
    </div>
  )
}

function Bloco({ titulo, icon, children }) {
  return (
    <div className="rounded-xl border border-glassb p-3">
      <div className="text-[11px] uppercase tracking-wide text-faint flex items-center gap-1.5 mb-2">{icon} {titulo}</div>
      {children}
    </div>
  )
}
function Mini({ label, valor, forte }) {
  return (
    <div className="rounded-xl border border-glassb px-3 py-2">
      <div className="text-[10px] text-faint uppercase tracking-wide">{label}</div>
      <div className={'num ' + (forte ? 'font-bold text-accent' : 'font-medium')}>{valor}</div>
    </div>
  )
}
function InfoLinha({ rotulo, valor }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-faint shrink-0">{rotulo}:</span>
      <span className="text-fg break-words">{valor}</span>
    </div>
  )
}
function Doc({ href, label }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
       className="text-xs rounded-lg px-3 py-1.5 flex items-center gap-1.5 border border-glassb text-dim hover:text-accent hover:border-accent transition">
      <Download size={13} /> {label} <ExternalLink size={11} />
    </a>
  )
}
