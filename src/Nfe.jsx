import { useState, useEffect, useRef } from 'react'
import {
  FileText, Settings2, Plug, RefreshCw, Plus, Trash2, Send, Percent, DollarSign,
  Truck, Lock, ChevronRight, Zap, Info, X, Download, ExternalLink, User, Receipt, MapPin,
  CheckCircle2, AlertTriangle, Clock, HelpCircle, PauseCircle, Activity, Hash, CreditCard,
  Eye, Landmark, ShieldCheck, Bell, Sparkles,
} from 'lucide-react'
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
  const [notifAberto, setNotifAberto] = useState(false)
  const [novoEvento, setNovoEvento] = useState(null)
  const [ultimoVistoId, setUltimoVistoId] = useState(0)
  const maxIdRef = useRef(0)
  const primeiraRef = useRef(true)

  // Detecta eventos novos (push) ao atualizar a lista
  useEffect(() => {
    if (!Array.isArray(eventos) || eventos.length === 0) return
    const maxId = Math.max(...eventos.map((e) => e.id))
    if (primeiraRef.current) {
      primeiraRef.current = false
      maxIdRef.current = maxId
      setUltimoVistoId(maxId)
      return
    }
    if (maxId > maxIdRef.current) {
      const novos = eventos.filter((e) => e.id > maxIdRef.current)
      maxIdRef.current = maxId
      if (novos[0]) setNovoEvento(novos[0])
    }
  }, [eventos])

  // Polling leve: busca eventos novos a cada 30s
  useEffect(() => {
    const t = setInterval(() => { carregarEventos() }, 30000)
    return () => clearInterval(t)
  }, [])

  const naoVistos = Array.isArray(eventos) ? eventos.filter((e) => e.id > ultimoVistoId).length : 0
  const abrirNotificacoes = () => { setNotifAberto(true); setUltimoVistoId(maxIdRef.current) }
  const [loteRodando, setLoteRodando] = useState(false)
  const [loteReport, setLoteReport] = useState(null)

  const aplicarTodas = async () => {
    const n = Array.isArray(pendentes) ? pendentes.length : 0
    if (!n) { notify('Não há notas pendentes para aplicar.', 'danger'); return }
    const tipo = cfg?.desconto_tipo === 'valor' ? `R$ ${cfg?.desconto_valor}` : `${cfg?.desconto_valor}%`
    if (!window.confirm(`Aplicar o desconto padrão (${tipo}${cfg?.remover_frete ? ' + zerar frete' : ''}) em TODAS as ${n} notas pendentes e salvar no Bling?\n\nA autorização na Sefaz continua manual, no Bling.`)) return
    setLoteRodando(true); setLoteReport(null)
    try {
      const r = await api.nfeAplicarTodas()
      setLoteReport(r)
      carregarPendentes(); carregarEventos()
    } catch (e) {
      setLoteReport({ erro: e.message })
    } finally {
      setLoteRodando(false)
    }
  }

  useEffect(() => {
    api.nfeConfig().then(setCfg).catch(() => {})
    carregarPendentes()
    carregarEventos()
  }, [])

  const carregarEventos = async () => {
    try { setEventos(await api.nfeEventos()) } catch { setEventos([]) }
  }

  const carregarPendentes = async () => {
    setBlingErro(false)
    setPendentes(null)
    try {
      const r = await api.nfePendentes()
      const lista = Array.isArray(r) ? r : r?.data || r?.notas || []
      setPendentes(lista)
    } catch (e) {
      setBlingErro(true)
      setPendentes([])
    }
  }

  const abrirNota = async (id) => {
    try {
      const n = await api.nfeObter(id)
      setNota({ ...n, _manual: false })
    } catch (e) {
      notify(e.message, 'danger')
    }
  }

  const verCompleta = async (id) => {
    if (!String(id || '').trim()) return
    try {
      setCompleta(await api.nfeCompleta(String(id).trim()))
    } catch (e) { notify(e.message, 'danger') }
  }

  const simularManual = () => {
    setNota({
      _manual: true, id: null, numero: 'Simulação', serie: '—',
      contato: 'Simulação manual (não envia ao Bling)', situacao: null, frete: 0,
      itens: [{ indice: 0, descricao: 'Item exemplo', codigo: '', quantidade: 1, valor_unitario: 50 }],
    })
  }

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Cabeçalho + config */}
      <div className="glass rounded-2xl px-5 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FileText size={18} className="text-accent" /> Notas fiscais (NF-e)
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="glass rounded-xl flex items-center gap-2 px-2 py-1.5">
            <input value={consultaId} onChange={(e) => setConsultaId(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && verCompleta(consultaId)}
                   placeholder="ID da nota…"
                   className="bg-transparent outline-none text-sm w-28 text-fg num" />
            <button onClick={() => verCompleta(consultaId)} className="text-xs text-accent hover:underline shrink-0">Ver nota</button>
          </div>
          <button onClick={abrirNotificacoes}
                  className="glass rounded-xl px-3 py-2 text-sm text-dim hover:text-fg flex items-center gap-2 relative" title="Notificações">
            <Bell size={15} />
            {naoVistos > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold grid place-items-center text-white"
                    style={{ background: 'var(--accent)' }}>{naoVistos > 9 ? '9+' : naoVistos}</span>
            )}
          </button>
          <button
            onClick={() => setShowCfg((v) => !v)}
            className="glass rounded-xl px-3 py-2 text-sm text-dim hover:text-fg flex items-center gap-2"
          >
            <Settings2 size={15} /> Regras
          </button>
          <button
            onClick={() => { carregarPendentes(); carregarEventos() }}
            className="glass rounded-xl px-3 py-2 text-sm text-dim hover:text-fg flex items-center gap-2"
          >
            <RefreshCw size={15} /> Atualizar
          </button>
        </div>
      </div>

      {showCfg && cfg && <ConfigCard cfg={cfg} setCfg={setCfg} />}

      {/* Card intuitivo quando chega um push novo */}
      {novoEvento && <PushCard e={novoEvento} onVer={(id) => { verCompleta(id); setNovoEvento(null) }} onFechar={() => setNovoEvento(null)} />}

      {/* Automação por webhook — status + atalho pro centro de notificações */}
      <AutomacaoPanel cfg={cfg} eventos={eventos} onAbrir={abrirNotificacoes} />

      {/* Aviso da regra fiscal */}
      <div className="rounded-2xl px-4 py-3 text-xs flex items-start gap-2 border border-glassb"
           style={{ background: 'var(--glass-hover)' }}>
        <Info size={14} className="text-accent2 mt-0.5 shrink-0" />
        <span className="text-dim">
          O Bling só permite editar notas em situação <b className="text-fg">Pendente</b> ou
          <b className="text-fg"> Rejeitada</b>. Notas já autorizadas, com DANFE emitida ou canceladas não podem ser alteradas.
          A transmissão à Sefaz acontece dentro do Bling.
        </span>
      </div>

      {/* Aplicar em lote — resolve o "editar nota por nota no Bling" */}
      <LoteBar
        qtd={Array.isArray(pendentes) ? pendentes.length : 0}
        cfg={cfg} rodando={loteRodando} onAplicar={aplicarTodas}
        report={loteReport} onFechar={() => setLoteReport(null)} onVerNota={verCompleta}
      />

      <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0, 0.9fr) minmax(0, 1.4fr)' }}>
        <PendentesPanel
          pendentes={pendentes} blingErro={blingErro}
          notaId={nota?.id} onAbrir={abrirNota} onSimular={simularManual} onVerCompleta={verCompleta}
        />
        {nota
          ? <Editor key={nota.id || 'manual'} nota={nota} cfg={cfg} onAplicado={() => { carregarPendentes(); carregarEventos() }} onVerCompleta={verCompleta} />
          : <VazioEditor />}
      </div>

      {completa && <NfeDetalhe nota={completa} onClose={() => setCompleta(null)} />}
      {notifAberto && <NotificacoesModal eventos={eventos} cfg={cfg} onClose={() => setNotifAberto(false)} onVerNota={(id) => { setNotifAberto(false); verCompleta(id) }} onAtualizar={carregarEventos} />}
    </div>
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
const STATUS_NFE = {
  aplicado:       { icon: CheckCircle2, cor: 'var(--ok)',     label: 'Desconto aplicado' },
  nao_editavel:   { icon: Lock,         cor: 'var(--faint)',  label: 'Não editável' },
  nao_encontrada: { icon: HelpCircle,   cor: 'var(--warn)',   label: 'Nota não encontrada (404)' },
  auto_desligado: { icon: PauseCircle,  cor: 'var(--faint)',  label: 'Automático desligado' },
  erro_aplicar:   { icon: AlertTriangle, cor: 'var(--danger)', label: 'Erro ao aplicar' },
  erro_busca:     { icon: AlertTriangle, cor: 'var(--danger)', label: 'Erro ao buscar' },
  erro_inesperado:{ icon: AlertTriangle, cor: 'var(--danger)', label: 'Erro inesperado' },
}

function statusEvento(res) {
  if (!res) return { icon: Clock, cor: 'var(--faint)', label: 'Processando…', detalhe: null }
  if (res.ok && res.aplicado) {
    return { icon: CheckCircle2, cor: 'var(--ok)',
             label: 'Desconto aplicado', detalhe: res.total_nota != null ? `total ${brl(res.total_nota)}` : null }
  }
  const m = STATUS_NFE[res.motivo] || { icon: Info, cor: 'var(--faint)', label: res.motivo || 'registrado' }
  let detalhe = res.situacao_label || res.detalhe || null
  if (detalhe && detalhe.length > 90) detalhe = detalhe.slice(0, 90) + '…'
  return { ...m, detalhe }
}

function AutomacaoPanel({ cfg, eventos, onAbrir }) {
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
              ? <>Cada NF-e <b className="text-fg">pendente</b> que o Bling empurrar recebe o desconto padrão automaticamente.</>
              : <>Ligue o <b className="text-fg">Modo automático</b> nas Regras para aplicar o desconto sozinho ao chegar cada nota.</>}
          </div>
        </div>
        <button onClick={onAbrir}
                className="glass rounded-xl px-3 py-2 text-xs text-dim hover:text-fg flex items-center gap-2 shrink-0">
          <Bell size={14} /> Notificações
        </button>
      </div>

      {lista.length > 0 && (
        <div className="mt-3 flex items-center gap-3 flex-wrap text-[11px] text-dim">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={13} style={{ color: 'var(--ok)' }} /> {aplicados} aplicada(s)</span>
          <span className="flex items-center gap-1.5"><Activity size={13} className="text-faint" /> {lista.length} evento(s) recebido(s)</span>
          {temNaoEncontrada && <span className="flex items-center gap-1.5" style={{ color: 'var(--warn)' }}><HelpCircle size={13} /> algumas notas não encontradas (id de pedido, não da nota)</span>}
          <button onClick={onAbrir} className="text-accent hover:underline ml-auto">ver detalhes →</button>
        </div>
      )}
    </div>
  )
}

/* ------------------------- Notificações (push) -------------------------- */
function PushCard({ e, onVer, onFechar }) {
  const s = statusEvento(e.resultado)
  const Icon = s.icon
  return (
    <div className="rounded-2xl p-4 border flex items-center gap-3"
         style={{ borderColor: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 10%, var(--bg))',
                  boxShadow: '0 8px 28px color-mix(in srgb, var(--accent) 22%, transparent)' }}>
      <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ background: 'color-mix(in srgb, ' + s.cor + ' 20%, transparent)' }}>
        <Icon size={18} style={{ color: s.cor }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold flex items-center gap-1.5"><Sparkles size={13} style={{ color: 'var(--accent)' }} /> Nova notificação do Bling</div>
        <div className="text-xs text-dim mt-0.5">
          {e.resultado?.numero ? <>NF-e nº {e.resultado.numero} — </> : <>Evento {e.entidade_id} — </>}
          <span style={{ color: s.cor }}>{s.label}</span>{s.detalhe ? ` · ${s.detalhe}` : ''}
        </div>
      </div>
      {e.entidade_id && <button onClick={() => onVer(e.entidade_id)} className="text-xs rounded-lg px-3 py-1.5 font-medium text-white shrink-0" style={{ background: 'var(--accent)' }}>Ver nota</button>}
      <button onClick={onFechar} className="text-faint hover:text-fg p-1 shrink-0"><X size={16} /></button>
    </div>
  )
}

function NotificacoesModal({ eventos, cfg, onClose, onVerNota, onAtualizar }) {
  const lista = Array.isArray(eventos) ? eventos : []
  const autoOn = !!cfg?.auto
  const aplicados = lista.filter((e) => e.resultado?.ok && e.resultado?.aplicado).length
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
         style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-lg my-auto" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg)' }}>
        <div className="flex items-center gap-3 p-5 border-b" style={{ borderColor: 'var(--glass-border)' }}>
          <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>
            <Bell size={18} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display font-semibold">Notificações</div>
            <div className="text-[11px] text-dim">O que a aplicação fez com os eventos que o Bling enviou</div>
          </div>
          <button onClick={onAtualizar} className="text-faint hover:text-fg p-1" title="Atualizar"><RefreshCw size={15} /></button>
          <button onClick={onClose} className="text-dim hover:text-fg p-1"><X size={20} /></button>
        </div>
        <div className="p-4">
          {!autoOn && lista.length > 0 && (
            <div className="mb-3 rounded-xl px-3 py-2 text-[11px] flex items-center gap-2" style={{ background: 'var(--glass-hover)', color: 'var(--dim)' }}>
              <PauseCircle size={13} /> Modo automático desligado — os pushes são registrados, mas o desconto não é aplicado sozinho.
            </div>
          )}
          {aplicados > 0 && (
            <div className="mb-3 text-[11px] text-dim flex items-center gap-1.5"><CheckCircle2 size={13} style={{ color: 'var(--ok)' }} /> {aplicados} nota(s) com desconto aplicado automaticamente.</div>
          )}
          {lista.length === 0 ? (
            <div className="text-center py-10">
              <div className="h-12 w-12 rounded-2xl grid place-items-center mx-auto mb-3" style={{ background: 'var(--glass-hover)' }}><Bell size={20} className="text-faint" /></div>
              <div className="text-sm font-medium">Nenhuma notificação ainda</div>
              <div className="text-xs text-dim mt-1">Quando o Bling enviar um evento de NF-e, ele aparece aqui com o que o sistema fez.</div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {lista.map((e) => <NotifCard key={e.id} e={e} onVerNota={onVerNota} />)}
            </div>
          )}
          {lista.some((e) => e.resultado?.motivo === 'nao_encontrada') && (
            <div className="mt-3 rounded-xl px-3 py-2 text-[11px] flex items-start gap-2 border"
                 style={{ borderColor: 'var(--warn)', background: 'color-mix(in srgb, var(--warn) 8%, transparent)' }}>
              <HelpCircle size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--warn)' }} />
              <span className="text-dim">
                <b className="text-fg">Nota não encontrada (404):</b> o evento trouxe o ID do <b className="text-fg">pedido</b> (ou outro recurso),
                não o da NF-e — ou a nota foi removida. Nesses casos não há o que aplicar.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function NotifCard({ e, onVerNota }) {
  const s = statusEvento(e.resultado)
  const Icon = s.icon
  return (
    <div className="rounded-xl border border-glassb p-3 flex items-start gap-3" style={{ background: 'var(--glass-hover)' }}>
      <div className="h-8 w-8 rounded-lg grid place-items-center shrink-0 mt-0.5" style={{ background: 'color-mix(in srgb, ' + s.cor + ' 18%, transparent)' }}>
        <Icon size={15} style={{ color: s.cor }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium" style={{ color: s.cor }}>{s.label}</div>
        <div className="text-[11px] text-dim mt-0.5 num">
          {e.resultado?.numero ? <>NF-e nº {e.resultado.numero}</> : <>id {e.entidade_id}</>}
          {s.detalhe ? ` · ${s.detalhe}` : ''}
        </div>
        <div className="text-[10px] text-faint num mt-1 flex items-center gap-1.5 flex-wrap">
          {e.evento && <span>{e.evento}</span>}
          {e.quando && <span>· {fmtQuando(e.quando)}</span>}
        </div>
      </div>
      {e.entidade_id && <button onClick={() => onVerNota(e.entidade_id)} className="text-[11px] text-accent hover:underline shrink-0 flex items-center gap-1 mt-0.5"><Eye size={12} /> ver</button>}
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
    </div>
  )
}

/* ----------------------------- Pendentes -------------------------------- */
function PendentesPanel({ pendentes, blingErro, notaId, onAbrir, onSimular, onVerCompleta }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-sm font-semibold mb-3 flex items-center gap-2">
        <FileText size={16} className="text-accent" /> Notas pendentes
      </div>

      {blingErro ? (
        <div className="text-center py-6">
          <div className="h-12 w-12 rounded-2xl grid place-items-center mx-auto mb-3" style={{ background: 'var(--glass-hover)' }}>
            <Plug size={20} className="text-accent" />
          </div>
          <div className="text-sm font-medium">Conecte o Bling</div>
          <div className="text-xs text-dim mt-1">Suas notas pendentes aparecem aqui assim que a conta Bling estiver autorizada.</div>
        </div>
      ) : pendentes === null ? (
        <div className="text-xs text-dim py-4">Carregando…</div>
      ) : pendentes.length === 0 ? (
        <div className="text-xs text-dim py-4">Nenhuma nota pendente no momento.</div>
      ) : (
        <div className="space-y-2">
          {pendentes.map((n) => {
            const id = n.id || n.numero
            return (
              <div key={id}
                   className={`w-full rounded-xl border px-3 py-2.5 flex items-center gap-2 transition ${id === notaId ? 'border-accent' : 'border-glassb hover:bg-[var(--glass-hover)]'}`}>
                <button onClick={() => onAbrir(id)} className="min-w-0 flex-1 text-left">
                  <div className="text-sm font-medium truncate">{(n.contato?.nome) || n.contato || `Nota ${n.numero || id}`}</div>
                  <div className="text-[11px] text-faint">Nº {n.numero || '—'} · série {n.serie || '—'}</div>
                </button>
                {id && (
                  <button onClick={() => onVerCompleta(id)} title="Ver nota completa"
                          className="text-faint hover:text-accent p-1 shrink-0"><Eye size={15} /></button>
                )}
                <button onClick={() => onAbrir(id)} className="text-faint hover:text-fg p-1 shrink-0" title="Editar desconto">
                  <ChevronRight size={16} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-glassb">
        <button onClick={onSimular} className="w-full glass rounded-xl py-2 text-sm text-dim hover:text-accent flex items-center justify-center gap-2">
          <Zap size={15} /> Simular manualmente
        </button>
      </div>
    </div>
  )
}

/* ------------------------------ Editor ---------------------------------- */
function Editor({ nota, cfg, onAplicado, onVerCompleta }) {
  const notify = useToast()
  const [itens, setItens] = useState(nota.itens || [])
  const [tipo, setTipo] = useState(cfg?.desconto_tipo || 'percentual')
  const [global, setGlobal] = useState(cfg?.desconto_valor ?? 0)
  const [removerFrete, setRemoverFrete] = useState(cfg?.remover_frete ?? true)
  const [porItem, setPorItem] = useState({})
  const [resumo, setResumo] = useState(null)
  const [aplicando, setAplicando] = useState(false)

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
      await api.nfeAplicar(nota.id, {
        desconto_tipo: tipo, desconto_valor: Number(global) || 0,
        descontos_por_item: porItem, remover_frete: removerFrete, enviar: true,
      })
      notify('Nota atualizada no Bling', 'ok')
      onAplicado?.()
    } catch (e) { notify(e.message, 'danger') }
    setAplicando(false)
  }

  return (
    <div className="glass rounded-2xl p-5 flex flex-col">
      {/* Cabeçalho da nota */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-glassb">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{nota.contato || 'Nota'}</div>
          <div className="text-[11px] text-faint mt-0.5">
            {nota._manual ? 'Simulação manual' : `Nota nº ${nota.numero || '—'} · série ${nota.serie || '—'}`}
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

      {!nota._manual && (
        <button
          onClick={aplicar} disabled={aplicando}
          className="mt-4 rounded-xl py-2.5 text-sm font-medium text-white disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: 'var(--accent)' }}
        >
          <Send size={15} /> {aplicando ? 'Aplicando…' : 'Aplicar no Bling'}
        </button>
      )}
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
              {n.data_emissao && <span className="text-[11px] text-faint num">{n.data_emissao}</span>}
              {n.simples_nacional && <span className="text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'var(--glass-hover)', color: 'var(--accent2)' }}><ShieldCheck size={11} /> Simples Nacional</span>}
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
            <Mini label="Produtos" valor={brl(totalProdutos)} />
            <Mini label="Frete" valor={brl(n.valor_frete)} />
            <Mini label="Tributos aprox." valor={brl(totalTributos)} />
            <Mini label="Total da nota" valor={brl(n.valor_nota)} forte />
          </div>

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
function Doc({ href, label }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
       className="text-xs rounded-lg px-3 py-1.5 flex items-center gap-1.5 border border-glassb text-dim hover:text-accent hover:border-accent transition">
      <Download size={13} /> {label} <ExternalLink size={11} />
    </a>
  )
}
