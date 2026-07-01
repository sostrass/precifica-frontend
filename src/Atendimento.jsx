import { useCallback, useEffect, useState } from 'react'
import {
  Inbox, Sparkles, Send, EyeOff, RefreshCw, Search, Settings, Plug,
  Clock, Loader2, ExternalLink, HelpCircle, CheckCircle2, Package, AlertCircle,
} from 'lucide-react'
import { api } from './api.js'
import { useToast } from './toast.jsx'

const ML = '#F2C200'
const FILTROS = [
  { id: 'UNANSWERED', label: 'Sem resposta' },
  { id: 'ANSWERED', label: 'Respondidas' },
  { id: 'ALL', label: 'Todas' },
]

function tempoRel(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 90) return 'agora'
  const min = Math.floor(s / 60)
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const dias = Math.floor(h / 24)
  if (dias < 30) return `há ${dias}d`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function Atendimento() {
  const notify = useToast()
  const [conn, setConn] = useState(null) // {conta:bool,...} | null=carregando
  const [stats, setStats] = useState(null)
  const [filtro, setFiltro] = useState('UNANSWERED')
  const [busca, setBusca] = useState('')
  const [lista, setLista] = useState(null) // null=carregando
  const [rascunhos, setRascunhos] = useState({})
  const [sugerindo, setSugerindo] = useState({})
  const [enviando, setEnviando] = useState({})
  const [todas, setTodas] = useState(false)

  const checarConexao = useCallback(() => {
    api.atendimentoStatus().then(setConn).catch(() => setConn({ conta: false }))
  }, [])
  useEffect(() => { checarConexao() }, [checarConexao])
  useEffect(() => {
    const onFoco = () => checarConexao()
    window.addEventListener('focus', onFoco)
    return () => window.removeEventListener('focus', onFoco)
  }, [checarConexao])

  const carregar = useCallback(async () => {
    setLista(null)
    try {
      const [p, s] = await Promise.all([
        api.atendimentoPerguntas(filtro),
        api.atendimentoStats().catch(() => null),
      ])
      if (p.nao_conectado) { setConn({ conta: false }); setLista([]); return }
      setLista(p.perguntas || [])
      if (s) setStats(s)
    } catch (e) {
      notify(e.message, 'danger'); setLista([])
    }
  }, [filtro, notify])

  useEffect(() => { if (conn?.conta) carregar() }, [conn?.conta, carregar])

  const setRascunho = (qid, txt) => setRascunhos((r) => ({ ...r, [qid]: txt }))

  const sugerir = async (q) => {
    setSugerindo((s) => ({ ...s, [q.question_id]: true }))
    try {
      const r = await api.atendimentoSugerir({ pergunta: q.texto, produto: q.produto?.titulo || '' })
      setRascunho(q.question_id, r.texto || '')
    } catch (e) { notify(e.message, 'danger') }
    finally { setSugerindo((s) => ({ ...s, [q.question_id]: false })) }
  }

  const sugerirTodas = async () => {
    const pend = (lista || []).filter((q) => !(rascunhos[q.question_id] || '').trim())
    if (!pend.length) { notify('Todas já têm um rascunho.', 'info'); return }
    setTodas(true)
    for (const q of pend) {
      try {
        const r = await api.atendimentoSugerir({ pergunta: q.texto, produto: q.produto?.titulo || '' })
        setRascunho(q.question_id, r.texto || '')
      } catch (e) { notify(e.message, 'warn'); break }
    }
    setTodas(false)
  }

  const enviar = async (q) => {
    const texto = (rascunhos[q.question_id] || '').trim()
    if (!texto) { notify('Escreva ou gere uma resposta primeiro.', 'warn'); return }
    setEnviando((e) => ({ ...e, [q.question_id]: true }))
    try {
      await api.atendimentoResponder({ question_id: q.question_id, texto })
      notify('Resposta enviada ao Mercado Livre.', 'success')
      setLista((l) => (l || []).filter((x) => x.question_id !== q.question_id))
      setStats((s) => (s ? { ...s, sem_resposta: Math.max(0, (s.sem_resposta || 1) - 1), respondidas: (s.respondidas || 0) + 1 } : s))
    } catch (e) { notify(e.message, 'danger') }
    finally { setEnviando((e) => ({ ...e, [q.question_id]: false })) }
  }

  const ocultar = async (q) => {
    setEnviando((e) => ({ ...e, [q.question_id]: true }))
    try {
      await api.atendimentoOcultar({ question_id: q.question_id })
      setLista((l) => (l || []).filter((x) => x.question_id !== q.question_id))
    } catch (e) { notify(e.message, 'danger') }
    finally { setEnviando((e) => ({ ...e, [q.question_id]: false })) }
  }

  const conectar = async () => {
    try {
      const { url } = await api.mlAuthLogin()
      window.open(url, 'ml_oauth', 'width=520,height=720')
    } catch (e) { notify(e.message, 'danger') }
  }

  const filtrada = (lista || []).filter((q) => {
    if (!busca.trim()) return true
    const t = busca.toLowerCase()
    return (q.produto?.titulo || '').toLowerCase().includes(t)
      || (q.texto || '').toLowerCase().includes(t)
      || (q.produto?.sku || '').toLowerCase().includes(t)
  })

  // ---------- estados de borda ----------
  if (conn && !conn.conta) {
    return (
      <Shell>
        <div className="glass rounded-2xl p-8 text-center max-w-lg mx-auto mt-6">
          <div className="h-12 w-12 rounded-2xl grid place-items-center mx-auto mb-4" style={{ background: 'rgba(242,194,0,.16)', color: ML }}>
            <Plug size={22} />
          </div>
          <div className="font-display font-semibold text-lg">Conecte o Mercado Livre</div>
          <p className="text-sm text-dim mt-2">
            A central reúne as perguntas de todos os seus anúncios num lugar só, com resposta sugerida pela IA. Para isso, conecte sua conta do Mercado Livre.
          </p>
          <div className="flex items-center justify-center gap-2 mt-5">
            <button onClick={conectar} className="rounded-xl px-4 py-2 text-sm font-medium text-black flex items-center gap-2" style={{ background: ML }}>
              <Plug size={16} /> Conectar Mercado Livre
            </button>
            <button onClick={checarConexao} className="glass rounded-xl px-4 py-2 text-sm text-dim hover:text-fg flex items-center gap-2">
              <RefreshCw size={15} /> Já conectei
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell stats={stats}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {FILTROS.map((f) => (
          <button key={f.id} onClick={() => setFiltro(f.id)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
            style={filtro === f.id
              ? { background: 'var(--tint-accent, rgba(214,0,127,.14))', color: 'var(--accent)' }
              : { border: '1px solid var(--glass-border)', color: 'var(--dim)' }}>
            {f.label}{f.id === 'UNANSWERED' && stats?.sem_resposta ? ` · ${stats.sem_resposta}` : ''}
          </button>
        ))}
        <div className="glass rounded-lg px-3 py-1.5 flex items-center gap-2 flex-1 min-w-[160px]">
          <Search size={14} className="text-faint" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por produto, SKU…"
            className="bg-transparent outline-none text-sm flex-1 text-fg placeholder:text-faint" />
        </div>
        {filtro === 'UNANSWERED' && (
          <button onClick={sugerirTodas} disabled={todas}
            className="text-sm px-3 py-1.5 rounded-lg font-medium text-white flex items-center gap-2 disabled:opacity-60"
            style={{ background: 'var(--accent)' }}>
            {todas ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Sugerir todas
          </button>
        )}
        <button onClick={carregar} className="glass rounded-lg px-2.5 py-1.5 text-dim hover:text-fg" title="Atualizar">
          <RefreshCw size={15} />
        </button>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-faint mb-3">
        <Settings size={12} /> IA · tom caloroso · assina "Equipe Sóstrass" · você revisa antes de enviar
      </div>

      {/* Lista */}
      {lista === null ? (
        <div className="text-dim text-sm flex items-center gap-2 p-4"><Loader2 size={16} className="animate-spin" /> Carregando perguntas…</div>
      ) : filtrada.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <CheckCircle2 size={28} className="mx-auto mb-3" style={{ color: 'var(--ok)' }} />
          <div className="font-medium">{filtro === 'UNANSWERED' ? 'Tudo respondido por aqui' : 'Nada para mostrar'}</div>
          <div className="text-sm text-dim mt-1">{filtro === 'UNANSWERED' ? 'Nenhuma pergunta pendente no Mercado Livre.' : 'Ajuste o filtro ou a busca.'}</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrada.map((q) => (
            <Card key={q.question_id} q={q}
              rascunho={rascunhos[q.question_id] || ''}
              setRascunho={(t) => setRascunho(q.question_id, t)}
              sugerindo={!!sugerindo[q.question_id]} enviando={!!enviando[q.question_id]}
              onSugerir={() => sugerir(q)} onEnviar={() => enviar(q)} onOcultar={() => ocultar(q)} />
          ))}
        </div>
      )}
    </Shell>
  )
}

function Shell({ children, stats }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Inbox size={20} className="text-accent" />
            <span className="font-display font-semibold text-lg">Atendimento</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(242,194,0,.18)', color: ML }}>Mercado Livre</span>
          </div>
          <div className="text-sm text-dim mt-1">Todas as perguntas, de todos os anúncios, num lugar só — com resposta sugerida pela IA.</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-faint">modo IA</span>
          <div className="inline-flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
            <span className="text-[11px] font-semibold px-2.5 py-1 text-white" style={{ background: 'var(--accent)' }}>Sugerir</span>
            <span className="text-[11px] font-semibold px-2.5 py-1 text-faint" title="Em breve">Automático</span>
          </div>
        </div>
      </div>
      {stats && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Kpi label="Sem resposta" valor={stats.sem_resposta ?? 0} cor="var(--warn)" />
          <Kpi label="Respondidas" valor={stats.respondidas ?? 0} cor="var(--ok)" />
          <Kpi label="Tempo médio" valor={stats.tempo_medio_min != null ? `${stats.tempo_medio_min} min` : '—'} icon={<Clock size={13} />} />
        </div>
      )}
      {children}
    </div>
  )
}

function Kpi({ label, valor, cor, icon }) {
  return (
    <div className="glass rounded-xl px-3 py-2">
      <div className="text-[9px] uppercase tracking-wide text-faint flex items-center gap-1">{icon}{label}</div>
      <div className="num font-bold text-lg mt-0.5" style={cor ? { color: cor } : undefined}>{valor}</div>
    </div>
  )
}

function Card({ q, rascunho, setRascunho, sugerindo, enviando, onSugerir, onEnviar, onOcultar }) {
  const prod = q.produto || {}
  const respondida = !!q.resposta
  return (
    <div className="glass rounded-2xl p-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg grid place-items-center shrink-0 overflow-hidden" style={{ background: 'var(--soft, #231630)', color: 'var(--faint)' }}>
          {prod.imagem ? <img src={prod.imagem} alt="" className="h-full w-full object-cover" /> : <Package size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate flex items-center gap-2">
            {prod.titulo || (prod.item_id ? `Anúncio ${prod.item_id}` : 'Anúncio')}
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: 'rgba(242,194,0,.18)', color: ML }}>M. Livre</span>
          </div>
          <div className="text-[11px] text-faint num">{prod.sku ? `SKU ${prod.sku}` : (prod.item_id || '')}{prod.permalink ? '' : ''}</div>
        </div>
        <div className="text-right text-[11px] text-faint shrink-0">
          <div>{q.comprador} · {tempoRel(q.data)}</div>
          <div style={{ color: respondida ? 'var(--ok)' : 'var(--warn)' }}>{respondida ? 'respondida' : 'sem resposta'}</div>
        </div>
      </div>

      <div className="text-sm mt-2.5 flex gap-1.5">
        <HelpCircle size={14} className="text-faint shrink-0 mt-0.5" />
        <span className="text-fg">{q.texto}</span>
      </div>

      {respondida ? (
        <div className="text-[13px] mt-2 px-3 py-2 rounded-lg text-dim" style={{ background: 'rgba(47,217,141,.08)', borderLeft: '2px solid var(--ok)' }}>
          {q.resposta}
        </div>
      ) : (
        <div className="rounded-xl mt-2.5 p-2.5" style={{ background: 'var(--tint-accent, rgba(214,0,127,.08))', border: '1px solid var(--glass-border)' }}>
          <div className="text-[9px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 mb-1.5" style={{ color: '#ff64bb' }}>
            <Sparkles size={11} /> Sugestão da IA
          </div>
          <textarea value={rascunho} onChange={(e) => setRascunho(e.target.value)} rows={2}
            placeholder={sugerindo ? 'Gerando…' : 'Clique em "Sugerir com IA" ou escreva a resposta…'}
            className="w-full bg-black/20 rounded-lg text-[13px] p-2 outline-none text-fg placeholder:text-faint resize-none leading-relaxed"
            style={{ border: '1px solid var(--glass-border)' }} />
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <button onClick={onEnviar} disabled={enviando || !rascunho.trim()}
              className="text-[11px] px-3 py-1.5 rounded-lg font-medium text-white flex items-center gap-1.5 disabled:opacity-50" style={{ background: 'var(--accent)' }}>
              {enviando ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Enviar
            </button>
            <button onClick={onSugerir} disabled={sugerindo}
              className="glass text-[11px] px-3 py-1.5 rounded-lg text-dim hover:text-fg flex items-center gap-1.5 disabled:opacity-50">
              {sugerindo ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} {rascunho.trim() ? 'Regenerar' : 'Sugerir com IA'}
            </button>
            {prod.permalink && (
              <a href={prod.permalink} target="_blank" rel="noreferrer" className="text-[11px] px-2 py-1.5 rounded-lg text-faint hover:text-dim flex items-center gap-1">
                <ExternalLink size={12} /> anúncio
              </a>
            )}
            <button onClick={onOcultar} disabled={enviando} className="text-[11px] px-2 py-1.5 rounded-lg text-faint hover:text-danger flex items-center gap-1 ml-auto">
              <EyeOff size={12} /> Ocultar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
