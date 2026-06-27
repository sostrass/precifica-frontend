import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Bell, FileText, Package, ShoppingBag, Layers, User, CheckCircle2, AlertTriangle,
  X, RefreshCw, Eye, HelpCircle, Sparkles, Inbox, Archive, CheckCheck, ChevronRight,
  Star, TrendingUp, Tag, Radar as RadarIcon, BellOff,
} from 'lucide-react'
import { api } from './api.js'

const LS_ARQ = 'blingai_notif_arquivadas'
const carregarArq = () => { try { return new Set(JSON.parse(localStorage.getItem(LS_ARQ) || '[]')) } catch { return new Set() } }
const salvarArq = (set) => { try { localStorage.setItem(LS_ARQ, JSON.stringify([...set].slice(-500))) } catch { /* ignore */ } }

const fmtQuando = (iso) => {
  if (!iso) return ''
  try {
    const d = new Date(iso); const hoje = new Date()
    return d.toDateString() === hoje.toDateString()
      ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

const grupoDia = (iso) => {
  if (!iso) return 'Anteriores'
  try {
    const d = new Date(iso); const hoje = new Date(); const ontem = new Date(); ontem.setDate(hoje.getDate() - 1)
    if (d.toDateString() === hoje.toDateString()) return 'Hoje'
    if (d.toDateString() === ontem.toDateString()) return 'Ontem'
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  } catch { return 'Anteriores' }
}

const CAT = {
  nfe:          { icon: FileText,     cor: 'var(--accent)' },
  precificacao: { icon: Tag,          cor: 'var(--accent)' },
  avaliacao:    { icon: Star,         cor: '#E0A23C' },
  radar:        { icon: RadarIcon,    cor: '#6FA8FF' },
  concorrencia: { icon: TrendingUp,   cor: '#6FA8FF' },
  agente:       { icon: Sparkles,     cor: 'var(--accent2)' },
  produto:      { icon: Package,      cor: 'var(--accent2)' },
  pedido:       { icon: ShoppingBag,  cor: '#6FA8FF' },
  estoque:      { icon: Layers,       cor: '#C792EA' },
  contato:      { icon: User,         cor: '#80CBC4' },
  outro:        { icon: Bell,         cor: 'var(--faint)' },
}
const LABEL = {
  nfe: 'Nota fiscal', precificacao: 'Precificação', avaliacao: 'Avaliações', radar: 'Radar',
  concorrencia: 'Concorrência', agente: 'Agentes', produto: 'Produtos', pedido: 'Pedidos',
  estoque: 'Estoque', contato: 'Contato', outro: 'Geral',
}
const VIEW_POR_CAT = {
  nfe: 'nfe', precificacao: 'precificacao', avaliacao: 'shopee', agente: 'shopee',
  radar: 'radar', concorrencia: 'radar', produto: 'catalogo', pedido: 'dashboard', estoque: 'catalogo',
}

function visual(n) {
  const base = CAT[n.categoria] || CAT.outro
  if (n.ok === true) return { ...base, statusCor: 'var(--ok)', StatusIcon: CheckCircle2 }
  if (n.ok === false) {
    const naoEnc = n.resultado?.motivo === 'nao_encontrada'
    return { ...base, statusCor: naoEnc ? 'var(--warn)' : 'var(--danger)', StatusIcon: naoEnc ? HelpCircle : AlertTriangle }
  }
  return { ...base, statusCor: base.cor, StatusIcon: base.icon }
}

export default function NotificacoesGlobais({ ativo, onNavegar }) {
  const [itens, setItens] = useState(null)
  const [aberto, setAberto] = useState(false)
  const [toasts, setToasts] = useState([])
  const [arq, setArq] = useState(carregarArq)
  const [aba, setAba] = useState('naolidas')
  const maxRef = useRef('')
  const primeiraRef = useRef(true)

  const carregar = async () => {
    try { setItens(await api.notificacoes()) }
    catch { setItens((prev) => (prev === null ? [] : prev)) }  // não trava no skeleton se a 1ª carga falhar
  }
  useEffect(() => {
    if (!ativo) return
    carregar()
    const t = setInterval(carregar, 30000)
    return () => clearInterval(t)
  }, [ativo])

  const chave = (e) => e.quando || ''
  const estaArquivada = (n) => n.lido === true || arq.has(n.id)

  // dispara toast só para itens NOVOS (não para o histórico ao carregar)
  useEffect(() => {
    if (!Array.isArray(itens) || itens.length === 0) return
    const maxKey = itens.reduce((m, e) => (chave(e) > m ? chave(e) : m), '')
    if (primeiraRef.current) {
      primeiraRef.current = false; maxRef.current = maxKey; return
    }
    if (maxKey > maxRef.current) {
      const novos = itens.filter((e) => chave(e) > maxRef.current && !estaArquivada(e))
      maxRef.current = maxKey
      if (novos.length) {
        const comKey = novos.slice(0, 3).map((e) => ({ ...e, _k: `${e.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }))
        setToasts((prev) => [...comKey, ...prev].slice(0, 3))
      }
    }
  }, [itens]) // eslint-disable-line react-hooks/exhaustive-deps

  const ativas = Array.isArray(itens) ? itens.filter((n) => !estaArquivada(n)) : []
  const arquivadas = Array.isArray(itens) ? itens.filter((n) => estaArquivada(n)) : []
  const badge = ativas.length

  const arquivarUm = (n) => {
    setArq((prev) => { const s = new Set(prev); s.add(n.id); salvarArq(s); return s })
    setToasts((prev) => prev.filter((t) => t.id !== n.id))
    if (String(n.id).startsWith('n')) { api.notificacoesArquivar([n.id]).catch(() => {}) }
  }
  const arquivarTodas = () => {
    const ids = ativas.map((n) => n.id)
    setArq((prev) => { const s = new Set(prev); ids.forEach((i) => s.add(i)); salvarArq(s); return s })
    setToasts([])
    api.notificacoesMarcarLidas().catch(() => {})
  }

  const navegar = (n) => {
    setToasts((prev) => prev.filter((t) => t.id !== n.id)); setAberto(false)
    const v = VIEW_POR_CAT[n.categoria]
    if (v && onNavegar) onNavegar(v)
  }
  const dropToast = (k) => setToasts((prev) => prev.filter((t) => t._k !== k))

  const lista = aba === 'naolidas' ? ativas : arquivadas
  const grupos = []; const idxG = {}
  for (const n of lista) {
    const g = grupoDia(n.quando)
    if (!(g in idxG)) { idxG[g] = grupos.length; grupos.push({ titulo: g, itens: [] }) }
    grupos[idxG[g]].itens.push(n)
  }

  return (
    <>
      <button onClick={() => setAberto(true)}
              className="glass rounded-full h-9 w-9 grid place-items-center text-dim hover:text-fg relative transition-colors"
              title="Notificações">
        <Bell size={16} />
        {badge > 0 && (
          <span key={badge} className="notif-pop absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold grid place-items-center text-white"
                style={{ background: 'var(--accent)', boxShadow: '0 0 0 2px var(--bg)' }}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>

      {/* Pilha de push (auto-some, pausa no hover) */}
      {toasts.length > 0 && createPortal(
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2.5 w-[min(92vw,380px)] pointer-events-none">
          {toasts.map((t) => (
            <div key={t._k} className="pointer-events-auto">
              <PushToast n={t} onNavegar={() => navegar(t)} onArquivar={() => arquivarUm(t)} onDone={() => dropToast(t._k)} />
            </div>
          ))}
        </div>,
        document.body,
      )}

      {/* Drawer Enterprise */}
      {aberto && createPortal(
        <div className="fixed inset-0 z-[95]" onClick={() => setAberto(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(8,5,12,.55)', backdropFilter: 'blur(3px)' }} />
          <div className="absolute top-0 right-0 h-full w-[min(94vw,440px)] flex flex-col animate-[slideIn_.24s_cubic-bezier(.22,1,.36,1)]"
               onClick={(e) => e.stopPropagation()}
               style={{ background: 'var(--bg)', borderLeft: '1px solid var(--glass-border)', boxShadow: '-24px 0 60px rgba(0,0,0,.5)' }}>

            {/* Header */}
            <div className="shrink-0 px-5 pt-5 pb-3 border-b" style={{ borderColor: 'var(--glass-border)' }}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0 relative"
                     style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', boxShadow: '0 6px 18px color-mix(in srgb, var(--accent) 40%, transparent)' }}>
                  <Bell size={18} className="text-white" />
                  {badge > 0 && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full live-dot" style={{ background: 'var(--ok)', boxShadow: '0 0 0 2px var(--bg)' }} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display font-semibold leading-tight">Notificações</div>
                  <div className="text-[11px] text-dim mt-0.5">
                    {badge > 0 ? `${badge} não ${badge === 1 ? 'lida' : 'lidas'}` : 'Tudo em dia'}
                  </div>
                </div>
                {ativas.length > 0 && (
                  <button onClick={arquivarTodas}
                          className="text-[11px] font-medium rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 transition-colors"
                          style={{ background: 'var(--glass-hover)', color: 'var(--dim)' }}
                          title="Marcar todas como lidas">
                    <CheckCheck size={13} /> Limpar
                  </button>
                )}
                <button onClick={carregar} className="text-faint hover:text-fg p-1.5 rounded-lg transition-colors" title="Atualizar"><RefreshCw size={15} /></button>
                <button onClick={() => setAberto(false)} className="text-dim hover:text-fg p-1.5 rounded-lg transition-colors"><X size={18} /></button>
              </div>

              {/* Segmented tabs */}
              <div className="flex gap-1 mt-3 p-0.5 rounded-xl" style={{ background: 'var(--glass-hover)' }}>
                <Tab ativo={aba === 'naolidas'} onClick={() => setAba('naolidas')} label="Não lidas" n={ativas.length} />
                <Tab ativo={aba === 'arquivadas'} onClick={() => setAba('arquivadas')} label="Arquivadas" n={arquivadas.length} />
              </div>
            </div>

            {/* Lista */}
            <div className="overflow-y-auto flex-1 px-3 py-3">
              {itens === null ? (
                <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} />)}</div>
              ) : lista.length === 0 ? (
                <Vazio aba={aba} />
              ) : (
                grupos.map((g) => (
                  <div key={g.titulo} className="mb-1">
                    <div className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-faint sticky top-0 z-10"
                         style={{ background: 'linear-gradient(var(--bg), var(--bg) 70%, transparent)' }}>{g.titulo}</div>
                    <div className="space-y-1">
                      {g.itens.map((n) => (
                        <NotifRow key={n.id} n={n} arquivada={aba === 'arquivadas'}
                                  onNavegar={() => navegar(n)} onArquivar={() => arquivarUm(n)} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 px-5 py-3 border-t flex items-center justify-between text-[10px] text-faint"
                 style={{ borderColor: 'var(--glass-border)' }}>
              <span className="flex items-center gap-1.5"><Sparkles size={11} style={{ color: 'var(--accent)' }} /> NF-e, avaliações, radar e agentes</span>
              <span className="num">atualiza a cada 30s</span>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

function Tab({ ativo, onClick, label, n }) {
  return (
    <button onClick={onClick}
            className="flex-1 rounded-lg py-1.5 text-[12px] font-medium flex items-center justify-center gap-1.5 transition-all"
            style={ativo
              ? { background: 'var(--bg)', color: 'var(--fg)', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }
              : { color: 'var(--faint)' }}>
      {label}
      {n > 0 && (
        <span className="min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold grid place-items-center"
              style={ativo ? { background: 'var(--accent)', color: '#fff' } : { background: 'var(--glass-hover)', color: 'var(--dim)' }}>
          {n > 99 ? '99+' : n}
        </span>
      )}
    </button>
  )
}

function PushToast({ n, onNavegar, onArquivar, onDone }) {
  const [leaving, setLeaving] = useState(false)
  const fechar = () => { if (leaving) return; setLeaving(true); setTimeout(onDone, 300) }
  const v = visual(n); const { StatusIcon } = v
  const navegavel = !!VIEW_POR_CAT[n.categoria]
  return (
    <div className={`notif-toast ${leaving ? 'is-leaving' : ''} rounded-2xl border overflow-hidden`}
         style={{ borderColor: `color-mix(in srgb, ${v.cor} 45%, var(--glass-border))`,
                  background: 'var(--glass-bg)', backdropFilter: 'blur(14px)', boxShadow: '0 18px 44px rgba(0,0,0,.45)' }}>
      <div className="flex items-start gap-3 p-3.5">
        <div className="h-9 w-9 rounded-xl grid place-items-center shrink-0"
             style={{ background: `color-mix(in srgb, ${v.statusCor} 20%, transparent)` }}>
          <StatusIcon size={17} style={{ color: v.statusCor }} />
        </div>
        <button onClick={navegavel ? () => { onNavegar() } : fechar} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: v.cor }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: v.cor }} />
            {LABEL[n.categoria] || 'Geral'}
          </div>
          <div className="text-sm font-medium mt-1 line-clamp-1">{n.titulo}</div>
          {n.texto && <div className="text-[11px] text-dim mt-0.5 line-clamp-1">{n.texto}</div>}
          <div className="flex items-center gap-2 mt-1.5">
            {navegavel && <span className="text-[11px] font-medium flex items-center gap-0.5" style={{ color: 'var(--accent)' }}>Abrir <ChevronRight size={12} /></span>}
            <span className="text-[10px] text-faint num">{fmtQuando(n.quando)}</span>
          </div>
        </button>
        <div className="flex flex-col gap-1 shrink-0">
          <button onClick={fechar} className="text-faint hover:text-fg p-0.5" title="Dispensar"><X size={15} /></button>
          <button onClick={() => { onArquivar() }} className="text-faint hover:text-fg p-0.5" title="Arquivar"><Archive size={13} /></button>
        </div>
      </div>
      <div className="notif-bar h-[3px]" style={{ background: v.cor, animationDuration: '6.5s' }} onAnimationEnd={fechar} />
    </div>
  )
}

function NotifRow({ n, arquivada, onNavegar, onArquivar }) {
  const v = visual(n); const { icon: Icon, StatusIcon } = v
  const navegavel = !!VIEW_POR_CAT[n.categoria]
  return (
    <div className="notif-row group rounded-xl px-2.5 py-2.5 flex items-start gap-3 relative"
         style={{ opacity: arquivada ? 0.62 : 1 }}>
      {!arquivada && <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full" style={{ background: v.cor }} />}
      <div className="h-9 w-9 rounded-lg grid place-items-center shrink-0 relative ml-1"
           style={{ background: `color-mix(in srgb, ${v.cor} 15%, transparent)` }}>
        <Icon size={16} style={{ color: v.cor }} />
        {n.ok !== null && (
          <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full grid place-items-center" style={{ background: 'var(--bg)' }}>
            <StatusIcon size={11} style={{ color: v.statusCor }} />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium leading-snug line-clamp-1">{n.titulo}</div>
        {n.texto && <div className="text-[11px] text-dim mt-0.5 line-clamp-1 num">{n.texto}</div>}
        <div className="text-[10px] text-faint num mt-1 flex items-center gap-1.5">
          <span style={{ color: v.cor }}>{LABEL[n.categoria] || 'Geral'}</span>
          {n.quando && <span>· {fmtQuando(n.quando)}</span>}
        </div>
      </div>
      <div className="notif-actions flex items-center gap-1 shrink-0">
        {navegavel && (
          <button onClick={onNavegar} className="h-7 w-7 rounded-lg grid place-items-center text-faint hover:text-fg transition-colors"
                  style={{ background: 'var(--glass-hover)' }} title="Abrir"><Eye size={13} /></button>
        )}
        {!arquivada && (
          <button onClick={onArquivar} className="h-7 w-7 rounded-lg grid place-items-center text-faint hover:text-fg transition-colors"
                  style={{ background: 'var(--glass-hover)' }} title="Arquivar"><Archive size={13} /></button>
        )}
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="rounded-xl px-2.5 py-2.5 flex items-start gap-3" style={{ background: 'var(--glass-hover)' }}>
      <div className="h-9 w-9 rounded-lg shrink-0 shimmer-box" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-2.5 rounded shimmer-box" style={{ width: '70%' }} />
        <div className="h-2 rounded shimmer-box" style={{ width: '45%' }} />
      </div>
    </div>
  )
}

function Vazio({ aba }) {
  const Icone = aba === 'arquivadas' ? Archive : BellOff
  return (
    <div className="text-center py-16 px-6">
      <div className="h-14 w-14 rounded-2xl grid place-items-center mx-auto mb-3" style={{ background: 'var(--glass-hover)' }}>
        <Icone size={22} className="text-faint" />
      </div>
      <div className="text-sm font-medium">{aba === 'arquivadas' ? 'Nada arquivado' : 'Você está em dia'}</div>
      <div className="text-[11px] text-dim mt-1 max-w-[240px] mx-auto leading-relaxed">
        {aba === 'arquivadas'
          ? 'As notificações que você arquivar aparecem aqui.'
          : 'Descontos aplicados, avaliações respondidas e mudanças de concorrentes chegam aqui.'}
      </div>
    </div>
  )
}
