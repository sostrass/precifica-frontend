import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Bell, FileText, Package, ShoppingBag, Layers, User, CheckCircle2, AlertTriangle,
  X, RefreshCw, Eye, Clock, HelpCircle, PauseCircle, Sparkles, Inbox,
} from 'lucide-react'
import { api } from './api.js'

const fmtQuando = (iso) => {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const hoje = new Date()
    const mesmoDia = d.toDateString() === hoje.toDateString()
    return mesmoDia
      ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

const CAT = {
  nfe:     { icon: FileText,     cor: 'var(--accent)' },
  produto: { icon: Package,      cor: 'var(--accent2)' },
  pedido:  { icon: ShoppingBag,  cor: '#6FA8FF' },
  estoque: { icon: Layers,       cor: '#C792EA' },
  contato: { icon: User,         cor: '#80CBC4' },
  outro:   { icon: Bell,         cor: 'var(--faint)' },
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

export default function NotificacoesGlobais({ ativo, onIrParaNfe }) {
  const [itens, setItens] = useState(null)
  const [aberto, setAberto] = useState(false)
  const [push, setPush] = useState(null)
  const [vistoAte, setVistoAte] = useState(0)
  const maxRef = useRef(0)
  const primeiraRef = useRef(true)

  const carregar = async () => {
    try { setItens(await api.notificacoes()) } catch { /* silencioso */ }
  }

  useEffect(() => {
    if (!ativo) return
    carregar()
    const t = setInterval(carregar, 30000)
    return () => clearInterval(t)
  }, [ativo])

  useEffect(() => {
    if (!Array.isArray(itens) || itens.length === 0) return
    const maxId = Math.max(...itens.map((e) => e.id))
    if (primeiraRef.current) {
      primeiraRef.current = false
      maxRef.current = maxId
      setVistoAte(maxId)
      return
    }
    if (maxId > maxRef.current) {
      const novos = itens.filter((e) => e.id > maxRef.current)
      maxRef.current = maxId
      if (novos[0]) setPush(novos[0])
    }
  }, [itens])

  const naoVistos = Array.isArray(itens) ? itens.filter((e) => e.id > vistoAte).length : 0
  const abrir = () => { setAberto(true); setVistoAte(maxRef.current) }
  const verNota = (n) => {
    setPush(null); setAberto(false)
    if (n.categoria === 'nfe' && onIrParaNfe) onIrParaNfe(n.entidade_id)
  }

  return (
    <>
      <button onClick={abrir} className="glass rounded-full h-9 w-9 grid place-items-center text-dim hover:text-fg relative" title="Notificações">
        <Bell size={16} />
        {naoVistos > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold grid place-items-center text-white"
                style={{ background: 'var(--accent)' }}>{naoVistos > 9 ? '9+' : naoVistos}</span>
        )}
      </button>

      {/* Card de push (portal no body — escapa do stacking context do header) */}
      {push && createPortal(
        <div className="fixed top-4 right-4 z-[100] w-[min(92vw,360px)]">
          <PushCard n={push} onVer={() => verNota(push)} onFechar={() => setPush(null)} />
        </div>,
        document.body,
      )}

      {/* Drawer lateral de notificações (portal no body) */}
      {aberto && createPortal(
        <div className="fixed inset-0 z-[95]" onClick={() => setAberto(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(2px)' }} />
          <div className="absolute top-0 right-0 h-full w-[min(94vw,420px)] flex flex-col animate-[slideIn_.22s_ease]"
               onClick={(e) => e.stopPropagation()}
               style={{ background: 'var(--bg)', borderLeft: '1px solid var(--glass-border)', boxShadow: '-16px 0 48px rgba(0,0,0,.4)' }}>
            <div className="flex items-center gap-3 p-5 border-b shrink-0" style={{ borderColor: 'var(--glass-border)' }}>
              <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>
                <Bell size={18} className="text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-semibold">Notificações</div>
                <div className="text-[11px] text-dim">Tudo o que a plataforma recebeu e fez</div>
              </div>
              <button onClick={carregar} className="text-faint hover:text-fg p-1" title="Atualizar"><RefreshCw size={15} /></button>
              <button onClick={() => setAberto(false)} className="text-dim hover:text-fg p-1"><X size={20} /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {itens === null ? (
                <div className="text-xs text-dim py-6 text-center">Carregando…</div>
              ) : itens.length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-12 w-12 rounded-2xl grid place-items-center mx-auto mb-3" style={{ background: 'var(--glass-hover)' }}><Inbox size={20} className="text-faint" /></div>
                  <div className="text-sm font-medium">Nenhuma notificação ainda</div>
                  <div className="text-xs text-dim mt-1">Quando o Bling enviar eventos (notas, produtos, pedidos…), eles aparecem aqui.</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {itens.map((n) => <NotifCard key={n.id} n={n} onVer={() => verNota(n)} />)}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

function PushCard({ n, onVer, onFechar }) {
  const v = visual(n)
  const { StatusIcon } = v
  return (
    <div className="rounded-2xl p-4 border flex items-start gap-3 animate-[slideIn_.25s_ease]"
         style={{ borderColor: v.cor, background: 'color-mix(in srgb, ' + v.cor + ' 12%, var(--bg))',
                  boxShadow: '0 12px 32px rgba(0,0,0,.35)' }}>
      <div className="h-9 w-9 rounded-xl grid place-items-center shrink-0" style={{ background: 'color-mix(in srgb, ' + v.statusCor + ' 22%, transparent)' }}>
        <StatusIcon size={17} style={{ color: v.statusCor }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold flex items-center gap-1.5"><Sparkles size={12} style={{ color: 'var(--accent)' }} /> Nova notificação</div>
        <div className="text-sm font-medium mt-0.5 truncate">{n.titulo}</div>
        {n.texto && <div className="text-[11px] text-dim mt-0.5 line-clamp-2">{n.texto}</div>}
        <div className="flex items-center gap-2 mt-2">
          {n.categoria === 'nfe' && n.entidade_id && (
            <button onClick={onVer} className="text-[11px] rounded-lg px-2.5 py-1 font-medium text-white" style={{ background: 'var(--accent)' }}>Ver nota</button>
          )}
          <span className="text-[10px] text-faint num">{fmtQuando(n.quando)}</span>
        </div>
      </div>
      <button onClick={onFechar} className="text-faint hover:text-fg p-0.5 shrink-0"><X size={15} /></button>
    </div>
  )
}

function NotifCard({ n, onVer }) {
  const v = visual(n)
  const { icon: Icon, StatusIcon } = v
  return (
    <div className="rounded-xl border border-glassb p-3 flex items-start gap-3" style={{ background: 'var(--glass-hover)' }}>
      <div className="h-9 w-9 rounded-lg grid place-items-center shrink-0 relative" style={{ background: 'color-mix(in srgb, ' + v.cor + ' 16%, transparent)' }}>
        <Icon size={16} style={{ color: v.cor }} />
        {n.ok !== null && (
          <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full grid place-items-center" style={{ background: 'var(--bg)' }}>
            <StatusIcon size={11} style={{ color: v.statusCor }} />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{n.titulo}</div>
        {n.texto && <div className="text-[11px] text-dim mt-0.5 num">{n.texto}</div>}
        <div className="text-[10px] text-faint num mt-1 flex items-center gap-1.5 flex-wrap">
          {n.recurso && <span>{n.recurso}{n.acao ? `.${n.acao}` : ''}</span>}
          {n.quando && <span>· {fmtQuando(n.quando)}</span>}
        </div>
      </div>
      {n.categoria === 'nfe' && n.entidade_id && (
        <button onClick={onVer} className="text-[11px] text-accent hover:underline shrink-0 flex items-center gap-1 mt-0.5"><Eye size={12} /> ver</button>
      )}
    </div>
  )
}
