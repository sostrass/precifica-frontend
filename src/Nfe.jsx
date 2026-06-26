import { useState, useEffect, useRef } from 'react'
import {
  FileText, Settings2, Plug, RefreshCw, Plus, Trash2, Send, Percent, DollarSign,
  Truck, Lock, ChevronRight, Zap, Info, X, Download, ExternalLink, User, Receipt, MapPin,
  CheckCircle2, AlertTriangle, Clock, HelpCircle, PauseCircle, Activity, Hash, CreditCard,
  Eye, Landmark, ShieldCheck, Bell, Sparkles, TrendingDown, Search, ToggleRight, Users, Inbox, ShoppingBag,
  CheckSquare, Square, BarChart3, Copy,
} from 'lucide-react'

const PLATAFORMA_COR = {
  'Shopee': '#EE4D2D', 'Mercado Livre': '#2D8CFF', 'Amazon': '#FF9900',
  'Magalu': '#0086FF', 'Americanas': '#E60014', 'TikTok Shop': '#FE2C55',
  'NuvemShop': '#2D3277', 'Shein': '#000000', 'Olist': '#7B2D8E', 'Tray': '#00B2A9',
  'WooCommerce': '#7F54B3', 'Loja Integrada': '#00A859', 'VTEX': '#F71963', 'Shopify': '#95BF47',
  'Site próprio': '#7b2a8c',
}
function PlataformaBadge({ nome }) {
  if (!nome) return null
  const cor = PLATAFORMA_COR[nome] || 'var(--accent2)'
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold inline-flex items-center gap-1"
          style={{ background: 'color-mix(in srgb, ' + cor + ' 18%, transparent)', color: cor }}>
      <ShoppingBag size={10} /> {nome}
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
  const [selecao, setSelecao] = useState(() => new Set())   // ids selecionados (massa)

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
  }, [])
  useEffect(() => { carregarNotas() /* eslint-disable-next-line */ }, [situacao])

  const [faturamento, setFaturamento] = useState(null)
  const [fatRecalc, setFatRecalc] = useState(false)
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

  const carregarNotas = async () => {
    setBlingErro(false); setPendentes(null); setAplicadas({})
    try {
      const r = await api.nfePendentes(situacao)
      const lista = Array.isArray(r) ? r : (r?.notas || r?.data || [])
      setPendentes(lista)
      // valores + plataforma vêm em background (a lista do Bling não traz) — tela aparece rápida
      const ids = lista.map((n) => n.id).filter(Boolean)
      if (ids.length) {
        setCarregandoValores(true)
        api.nfeValores(ids)
          .then((mapa) => {
            setPendentes((atual) => (atual || []).map((n) => {
              const e = mapa?.[String(n.id)]
              return e ? { ...n, ...e } : n
            }))
          })
          .catch(() => {})
          .finally(() => setCarregandoValores(false))
      }
    } catch (e) {
      setBlingErro(true); setPendentes([])
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
            <Settings2 size={15} /> Regras
          </button>
          <button onClick={() => { carregarNotas(); carregarEventos() }}
                  className="glass rounded-xl px-3 py-2 text-sm text-dim hover:text-fg flex items-center gap-2">
            <RefreshCw size={15} /> Atualizar
          </button>
        </div>
      </div>

      {showCfg && cfg && <ConfigCard cfg={cfg} setCfg={setCfg} />}

      {/* Simulação de receita */}
      <RevenueSim notas={pendentes} cfg={cfg} situacao={situacao} />

      {/* Status da automação (notificações ficam no sino global, no topo) */}
      <AutomacaoPanel cfg={cfg} eventos={eventos} />

      {/* Inteligência fiscal: carga tributária (IBPT) + vendas por UF */}
      <InteligenciaFiscal notas={pendentes} carregando={carregandoValores} />

      {/* Monitor do teto do Simples Nacional */}
      <FaturamentoSimples dados={faturamento} recalc={fatRecalc} onRecalcular={recalcularFaturamento} />

      {/* Aviso fiscal compacto */}
      <div className="rounded-xl px-4 py-2.5 text-[11px] flex items-start gap-2 border border-glassb"
           style={{ background: 'var(--glass-hover)' }}>
        <Info size={13} className="text-accent2 mt-0.5 shrink-0" />
        <span className="text-dim">
          O Bling só permite editar notas <b className="text-fg">Pendentes</b> ou <b className="text-fg">Rejeitadas</b>.
          Autorizadas, com DANFE ou canceladas são imutáveis. A transmissão à Sefaz acontece no Bling.
        </span>
      </div>

      {/* Aplicar em lote — só na visão de pendentes */}
      {situacao === 1 && (
        <LoteBar
          qtd={(pendentes || []).filter((n) => n.editavel).length}
          cfg={cfg} rodando={loteRodando} onAplicar={aplicarTodas}
          report={loteReport} onFechar={() => setLoteReport(null)} onVerNota={verCompleta}
        />
      )}

      {/* Filtros + lista + editor */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.3fr)' }}>
        <div className="space-y-3">
          <FiltrosBar
            situacao={situacao} setSituacao={setSituacao}
            busca={busca} setBusca={setBusca}
            ordem={ordem} setOrdem={setOrdem}
            soEditaveis={soEditaveis} setSoEditaveis={setSoEditaveis}
            total={(pendentes || []).length} mostrando={filtradas.length}
            onExportar={exportarCSV}
          />
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
        {nota
          ? <Editor key={nota.id || 'manual'} nota={nota} cfg={cfg} aplicada={aplicadas[nota.id]} onAplicado={(id, novoTotal) => { marcarAplicada(id, novoTotal); carregarEventos() }} onVerCompleta={verCompleta} />
          : <VazioEditor />}
      </div>

      {completa && <NfeDetalhe nota={completa} onClose={() => setCompleta(null)} />}
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
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--accent2) 18%, transparent)' }}>
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
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--accent) 18%, transparent)' }}>
            <MapPin size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <div className="text-sm font-semibold">Vendas por estado</div>
            <div className="text-[11px] text-dim">{ufs.length} UF(s) · por valor</div>
          </div>
          {carregando && <RefreshCw size={13} className="text-faint animate-spin ml-auto" />}
        </div>
        {ufs.length === 0 ? (
          <div className="text-xs text-dim py-3 text-center">Carregando dados das notas…</div>
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
  ok: { cor: 'var(--ok)', label: 'Dentro do limite', Icone: ShieldCheck },
  atencao: { cor: 'var(--warn)', label: 'Atenção — aproximando do sublimite', Icone: AlertTriangle },
  sublimite: { cor: 'var(--warn)', label: 'Acima do sublimite — ICMS/ISS fora do Simples', Icone: AlertTriangle },
  critico: { cor: 'var(--danger)', label: 'Crítico — perto do teto do Simples', Icone: AlertTriangle },
  estourou: { cor: 'var(--danger)', label: 'Teto do Simples ultrapassado', Icone: AlertTriangle },
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
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--accent2) 18%, transparent)' }}>
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
                   style={{ background: `color-mix(in srgb, ${al.cor} 12%, transparent)`, color: al.cor }}>
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
                  ? { background: 'color-mix(in srgb, var(--ok) 18%, transparent)', color: 'var(--ok)' }
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
         style={selecionada && !ativo ? { borderColor: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 8%, transparent)' }
              : aplicada && !ativo ? { borderColor: 'var(--ok)', background: 'color-mix(in srgb, var(--ok) 7%, transparent)' } : undefined}>
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
            ? { background: 'color-mix(in srgb, ' + cor + ' 16%, transparent)', color: cor }
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
    <div className="rounded-2xl p-5 border" style={{ borderColor: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 7%, transparent)' }}>
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
      <div className="mt-4 rounded-xl px-3 py-3 border flex items-start gap-2" style={{ borderColor: 'var(--danger)', background: 'color-mix(in srgb, var(--danger) 8%, transparent)' }}>
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
             style={{ background: autoOn ? 'color-mix(in srgb, var(--ok) 18%, transparent)' : 'var(--glass-hover)' }}>
          <Activity size={17} style={{ color: autoOn ? 'var(--ok)' : 'var(--faint)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold flex items-center gap-2">
            Automação por webhook
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: autoOn ? 'color-mix(in srgb, var(--ok) 18%, transparent)' : 'var(--glass-hover)',
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

const PLATAFORMAS_DESC = ['Shopee', 'Mercado Livre', 'Amazon', 'Magalu', 'Americanas', 'TikTok Shop']

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
        {ativas > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded num" style={{ background: 'color-mix(in srgb, var(--accent2) 18%, transparent)', color: 'var(--accent2)' }}>{ativas} ativa(s)</span>}
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
                <span className="text-[11px] font-medium w-28 shrink-0 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: PLATAFORMA_COR[plat] || 'var(--text-faint)' }} />
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

      {aplicada != null && (
        <div className="mt-3 rounded-xl px-3 py-2 text-xs flex items-center gap-2" style={{ background: 'color-mix(in srgb, var(--ok) 14%, transparent)', color: 'var(--ok)' }}>
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
    <div className="mt-2 rounded-xl p-3.5 text-xs border" style={{ borderColor: div ? 'var(--warn)' : 'var(--ok)', background: div ? 'color-mix(in srgb, var(--warn) 8%, transparent)' : 'color-mix(in srgb, var(--ok) 7%, transparent)' }}>
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
        <div className="text-[10px] text-faint uppercase tracking-wide mb-1">Nota hoje → Envio</div>
        <Dado label="valorNota" de={orig.valorNota} para={env.valorNota} destaque />
        <Dado label="valorFrete" de={orig.valorFrete} para={env.valorFrete} />
        <Dado label="item · valor (preço)" de={itOrig.valor} para={itEnv.valor} />
        <Dado label="item · valorTotal (bruto)" de={itOrig.valorTotal} para={itEnv.valorTotal} />
        <Dado label="item · desconto" de={itOrig.desconto} para={itEnv.desconto} destaque />
        <Dado label="item · tributo aprox." de={itOrig.valorAproximadoTotalTributos} para={itEnv.valorAproximadoTotalTributos} />
        <Dado label="parcela · valor" de={(orig.parcelas || [])[0]?.valor} para={(env.parcelas || [])[0]?.valor} destaque />
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 num">
        <div>soma parcelas: <b className="text-fg">{diag.soma_parcelas_payload}</b></div>
        <div>valorNota envio: <b className="text-fg">{diag.total_calculado}</b></div>
        <div>Σ itens+frete: <b className="text-fg">{diag.soma_itens_payload}</b></div>
        <div>itens consistentes: <b style={{ color: diag.consistente_itens ? 'var(--ok)' : 'var(--danger)' }}>{diag.consistente_itens ? 'sim' : 'não'}</b></div>
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

/* ------------------------- Nota completa (modal) ------------------------- */
function NfeDetalhe({ nota, onClose }) {
  const n = nota
  const dest = n.destinatario || {}
  const itens = n.itens || []
  const totalProdutos = itens.reduce((s, it) => s + (Number(it.valor_total) || 0), 0)
  const totalTributos = itens.reduce((s, it) => s + (Number(it.tributos_aprox) || 0), 0)
  const parcelas = n.parcelas || []
  const FRETE_CONTA = { '0': 'Por conta do emitente', '1': 'Por conta do destinatário', '2': 'Por conta de terceiros', '3': 'Transporte próprio (remetente)', '4': 'Transporte próprio (destinatário)', '9': 'Sem ocorrência de transporte' }
  const fretePorConta = FRETE_CONTA[String(n.transporte?.frete_por_conta)] || '—'
  const corSit = n.editavel ? 'var(--warn)' : (n.situacao === 2 ? 'var(--danger)' : 'var(--ok)')
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
         style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-2xl my-auto" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg)' }}>
        {/* Cabeçalho */}
        <div className="flex items-start gap-3 p-5 border-b" style={{ borderColor: 'var(--glass-border)' }}>
          <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>
            <FileText size={18} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display font-semibold">NF-e nº {n.numero} <span className="text-faint font-normal">· série {n.serie}</span></div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: corSit + '26', color: corSit }}>{n.situacao_label}</span>
              {n.modelo_label && <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'color-mix(in srgb, var(--accent) 16%, transparent)', color: 'var(--accent)' }}>{n.modelo_label}</span>}
              {n.tipo_label && <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--glass-hover)', color: 'var(--text-dim)' }}>{n.tipo_label}</span>}
              {n.finalidade_label && <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--glass-hover)', color: 'var(--text-dim)' }}>{n.finalidade_label}</span>}
              {n.data_emissao && <span className="text-[11px] text-faint num">{n.data_emissao}</span>}
              {n.simples_nacional && <span className="text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'var(--glass-hover)', color: 'var(--accent2)' }}><ShieldCheck size={11} /> Simples Nacional</span>}
              <PlataformaBadge nome={n.plataforma} />
              {n.pedido_loja && <span className="text-[11px] text-faint num flex items-center gap-1"><Hash size={10} /> pedido {n.pedido_loja}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-dim hover:text-fg p-1"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Trava fiscal */}
          {!n.editavel && (
            <div className="rounded-xl px-3 py-2 text-xs flex items-start gap-2 border" style={{ borderColor: 'var(--ok)', background: 'var(--glass-hover)' }}>
              <Lock size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--ok)' }} />
              <span className="text-dim">Nota <b className="text-fg">{(n.situacao_label || '').toLowerCase()}</b> — é um documento fiscal imutável. Para corrigir, use carta de correção ou cancelamento + reemissão (no Bling).</span>
            </div>
          )}

          {/* Destinatário */}
          <Bloco titulo="Destinatário" icon={<User size={14} />}>
            <div className="text-sm font-medium">{dest.nome || '—'}</div>
            <div className="text-xs text-dim num">{dest.documento || ''}{dest.telefone ? ` · ${dest.telefone}` : ''}</div>
            {dest.email && <div className="text-xs text-dim truncate">{dest.email}</div>}
            {dest.endereco && <div className="text-xs text-dim flex items-start gap-1 mt-1"><MapPin size={12} className="mt-0.5 shrink-0" /> {dest.endereco}</div>}
          </Bloco>

          {/* Totais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Mini label="Produtos" valor={brl(n.valor_produtos ?? totalProdutos)} />
            <Mini label="Frete" valor={brl(n.valor_frete)} />
            {Number(n.desconto_nota) > 0
              ? <Mini label="Desconto da nota" valor={`- ${brl(n.desconto_nota)}`} />
              : <Mini label="Tributos aprox." valor={brl(totalTributos)} />}
            <Mini label="Total da nota" valor={brl(n.valor_nota)} forte />
          </div>
          {Number(n.desconto_nota) > 0 && (
            <div className="text-[11px] text-dim flex items-center gap-1.5 -mt-2">
              <Info size={11} className="shrink-0" />
              {brl(n.valor_produtos ?? totalProdutos)} produtos + {brl(n.valor_frete)} frete − {brl(n.desconto_nota)} desconto = <b className="text-fg">{brl(n.valor_nota)}</b>. O desconto de pedido vem da plataforma.
            </div>
          )}

          {/* Itens */}
          <Bloco titulo={`Itens (${itens.length})`} icon={<Receipt size={14} />}>
            <div className="space-y-1.5">
              {itens.map((it, i) => (
                <div key={i} className="flex items-center gap-2 text-sm border-b last:border-0 pb-1.5" style={{ borderColor: 'var(--glass-border)' }}>
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{it.descricao}</div>
                    <div className="text-[10px] text-faint num">
                      {it.codigo} · NCM {it.ncm || '—'} · CFOP {it.cfop || '—'}
                      {Number(it.tributos_aprox) > 0 && <> · trib. aprox. {brl(it.tributos_aprox)}</>}
                    </div>
                  </div>
                  <div className="text-xs text-dim num shrink-0">{it.quantidade}× {brl(it.valor)}</div>
                  <div className="num font-medium shrink-0 w-20 text-right">{brl(it.valor_total)}</div>
                </div>
              ))}
            </div>
          </Bloco>

          {/* Transporte + Parcelas */}
          <div className="grid sm:grid-cols-2 gap-2">
            <Bloco titulo="Transporte" icon={<Truck size={14} />}>
              <div className="text-xs text-dim">Frete: <span className="text-fg">{fretePorConta}</span></div>
              <div className="text-xs text-dim mt-0.5">Transportadora: <span className="text-fg">{n.transporte?.transportador || '—'}</span></div>
            </Bloco>
            <Bloco titulo="Pagamento" icon={<CreditCard size={14} />}>
              {parcelas.length ? (
                <div className="space-y-0.5">
                  {parcelas.map((p, i) => (
                    <div key={i} className="text-xs text-dim flex items-center justify-between">
                      <span className="num">{p.data || `parcela ${i + 1}`}</span>
                      <span className="num text-fg">{brl(p.valor)}</span>
                    </div>
                  ))}
                </div>
              ) : <div className="text-xs text-faint">À vista / não informado</div>}
            </Bloco>
          </div>

          {/* Informações fiscais extras */}
          {(n.natureza_operacao || n.intermediador || n.vendedor || n.data_operacao) && (
            <Bloco titulo="Informações" icon={<Landmark size={14} />}>
              <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {n.natureza_operacao && <InfoLinha rotulo="Natureza" valor={n.natureza_operacao} />}
                {n.intermediador && <InfoLinha rotulo="Intermediador" valor={n.intermediador} />}
                {n.vendedor && <InfoLinha rotulo="Vendedor" valor={n.vendedor} />}
                {n.data_operacao && <InfoLinha rotulo="Operação" valor={n.data_operacao} />}
              </div>
            </Bloco>
          )}

          {/* Observações */}
          {n.observacoes && (
            <Bloco titulo="Observações" icon={<FileText size={14} />}>
              <div className="text-xs text-dim whitespace-pre-wrap break-words">{n.observacoes}</div>
            </Bloco>
          )}

          {/* Chave + documentos */}
          {n.chave_acesso && (
            <div className="rounded-xl border border-glassb px-3 py-2">
              <div className="text-[10px] text-faint uppercase tracking-wide flex items-center gap-1.5 mb-1"><Landmark size={11} /> Chave de acesso</div>
              <div className="text-[10px] text-dim num break-all">{n.chave_acesso}</div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {n.link_danfe && <Doc href={n.link_danfe} label="DANFE" />}
            {n.link_pdf && <Doc href={n.link_pdf} label="PDF" />}
            {n.link_xml && <Doc href={n.link_xml} label="XML" />}
            {!n.link_danfe && !n.link_pdf && !n.link_xml && <span className="text-[11px] text-faint">Documentos (DANFE/XML) ficam disponíveis após a autorização na Sefaz.</span>}
          </div>
        </div>
      </div>
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
