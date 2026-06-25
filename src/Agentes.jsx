import { useState, useEffect, useRef } from 'react'
import {
  PenLine, MessageCircleHeart, LineChart, Briefcase, Send, Wrench, Bot, ShieldCheck,
} from 'lucide-react'
import { api } from './api.js'
import { useToast } from './toast.jsx'

// metadados visuais por agente (ícone + cor + exemplos)
const META = {
  conteudo: {
    icon: PenLine, cor: '#7b2a8c',
    exemplos: ['Escreva a descrição de um kit de 30 caixas organizadoras transparentes',
      'Avalie a qualidade deste cadastro: nome "Caixa", sem EAN, sem NCM, peso 0'],
  },
  atendimento: {
    icon: MessageCircleHeart, cor: '#14b8a6',
    exemplos: ['Cliente diz que a pérola chegou com o furo torto e quer troca',
      'Responder cliente que perguntou se a miçanga 6mm serve para colar em unha'],
  },
  comercial: {
    icon: LineChart, cor: '#f59e0b',
    exemplos: ['Meu custo é R$23, concorrentes a R$48 e R$60 no Mercado Livre. O que faço?',
      'Precifique um produto de custo R$30 para 25% de margem nos canais ativos'],
  },
  gerente: {
    icon: Briefcase, cor: '#a855f7',
    exemplos: ['Vou lançar um produto novo de custo R$18: me dê descrição, preço por canal e o que falta no cadastro',
      'Resuma como devo posicionar preço e conteúdo de um kit de strass'],
  },
}

export default function Agentes() {
  const notify = useToast()
  const [lista, setLista] = useState([])
  const [ativo, setAtivo] = useState(null)
  const [conversas, setConversas] = useState({}) // {id: [{autor,texto,ferramentas}]}
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const fimRef = useRef(null)

  useEffect(() => {
    api.listarAgentes().then((r) => {
      setLista(r.agentes || [])
      if (r.agentes?.length) setAtivo(r.agentes[0].id)
    }).catch((e) => notify(e.message, 'danger'))
  }, [])

  const msgs = conversas[ativo] || []

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy])

  const enviar = async (textoForcado) => {
    const texto = (textoForcado ?? input).trim()
    if (!texto || busy || !ativo) return
    const historico = (conversas[ativo] || []).map((m) => ({ autor: m.autor, texto: m.texto }))
    setConversas((c) => ({ ...c, [ativo]: [...(c[ativo] || []), { autor: 'user', texto }] }))
    setInput('')
    setBusy(true)
    try {
      const r = await api.agenteMensagem(ativo, { mensagem: texto, historico })
      setConversas((c) => ({
        ...c, [ativo]: [...(c[ativo] || []), { autor: 'agente', texto: r.resposta, ferramentas: r.ferramentas_usadas }],
      }))
    } catch (e) {
      setConversas((c) => ({
        ...c, [ativo]: [...(c[ativo] || []), { autor: 'agente', texto: `⚠︎ ${e.message}`, erro: true }],
      }))
    }
    setBusy(false)
  }

  const agente = lista.find((a) => a.id === ativo)
  const meta = META[ativo] || { icon: Bot, cor: 'var(--accent)', exemplos: [] }

  return (
    <div className="grid gap-4 max-w-6xl" style={{ gridTemplateColumns: '230px minmax(0, 1fr)', height: 'calc(100vh - 130px)' }}>
      {/* Lista de agentes */}
      <div className="glass rounded-2xl p-3 flex flex-col gap-1.5 overflow-auto">
        <div className="text-[10px] uppercase tracking-wide text-faint px-2 py-1">Agentes</div>
        {lista.map((a) => {
          const M = META[a.id] || { icon: Bot, cor: 'var(--accent)' }
          const Icon = M.icon
          const on = a.id === ativo
          return (
            <button key={a.id} onClick={() => setAtivo(a.id)}
                    className={`text-left rounded-xl px-3 py-2.5 transition ${on ? '' : 'hover:bg-[var(--glass-hover)]'}`}
                    style={on ? { background: 'var(--glass-hover)', boxShadow: `inset 3px 0 0 ${M.cor}` } : undefined}>
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-lg grid place-items-center shrink-0" style={{ background: M.cor + '22', color: M.cor }}>
                  <Icon size={15} />
                </span>
                <span className="text-sm font-medium">{a.nome}</span>
              </div>
              <div className="text-[11px] text-faint mt-1 leading-snug">{a.descricao}</div>
            </button>
          )
        })}
        <div className="mt-auto text-[10px] text-faint px-2 pt-2 flex items-start gap-1.5">
          <ShieldCheck size={12} className="mt-0.5 shrink-0 text-accent2" />
          Os agentes propõem e calculam pelas ferramentas — não alteram preço nem nota sozinhos.
        </div>
      </div>

      {/* Conversa */}
      <div className="glass rounded-2xl flex flex-col min-h-0">
        <div className="px-5 py-3 border-b border-glassb flex items-center gap-2">
          <span className="h-8 w-8 rounded-lg grid place-items-center" style={{ background: meta.cor + '22', color: meta.cor }}>
            <meta.icon size={16} />
          </span>
          <div>
            <div className="text-sm font-semibold">{agente?.nome || 'Agente'}</div>
            <div className="text-[11px] text-faint">{(agente?.ferramentas || []).join(' · ')}</div>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4 space-y-4 min-h-0">
          {msgs.length === 0 && (
            <div className="h-full grid place-items-center text-center">
              <div className="max-w-md">
                <span className="h-12 w-12 rounded-2xl grid place-items-center mx-auto mb-3" style={{ background: meta.cor + '22', color: meta.cor }}>
                  <meta.icon size={24} />
                </span>
                <div className="font-display font-semibold">{agente?.nome}</div>
                <div className="text-sm text-dim mt-1">{agente?.descricao}</div>
                <div className="mt-4 space-y-2">
                  {meta.exemplos.map((ex, i) => (
                    <button key={i} onClick={() => enviar(ex)}
                            className="w-full text-left text-xs rounded-xl border border-glassb px-3 py-2 text-dim hover:text-fg hover:border-accent transition">
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {msgs.map((m, i) => <Bolha key={i} m={m} cor={meta.cor} Icon={meta.icon} />)}

          {busy && (
            <div className="flex items-center gap-2 text-dim text-sm">
              <span className="h-7 w-7 rounded-lg grid place-items-center" style={{ background: meta.cor + '22', color: meta.cor }}>
                <meta.icon size={14} />
              </span>
              <span className="flex gap-1">
                <Ponto /> <Ponto d={0.15} /> <Ponto d={0.3} />
              </span>
            </div>
          )}
          <div ref={fimRef} />
        </div>

        <div className="p-3 border-t border-glassb flex gap-2">
          <input
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enviar()}
            placeholder={`Fale com o agente ${agente?.nome || ''}…`}
            className="flex-1 bg-glass border border-glassb rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
          <button onClick={() => enviar()} disabled={busy || !input.trim()}
                  className="rounded-xl px-4 text-white disabled:opacity-50 flex items-center gap-2"
                  style={{ background: 'var(--accent)' }}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

function Bolha({ m, cor, Icon }) {
  const eu = m.autor === 'user'
  return (
    <div className={`flex gap-2.5 ${eu ? 'flex-row-reverse' : ''}`}>
      <span className="h-7 w-7 rounded-lg grid place-items-center shrink-0 mt-0.5"
            style={eu ? { background: 'var(--glass-hover)', color: 'var(--dim)' } : { background: cor + '22', color: cor }}>
        {eu ? <Bot size={14} style={{ opacity: 0 }} /> : <Icon size={14} />}
      </span>
      <div className={`max-w-[80%] ${eu ? 'text-right' : ''}`}>
        <div className={`inline-block text-left rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${eu ? 'text-white' : 'text-fg'}`}
             style={eu ? { background: 'var(--accent)' } : { background: 'var(--glass-hover)', color: m.erro ? 'var(--danger)' : 'var(--fg)' }}>
          {m.texto}
        </div>
        {m.ferramentas?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {m.ferramentas.map((f) => (
              <span key={f} className="text-[10px] flex items-center gap-1 rounded-md px-1.5 py-0.5"
                    style={{ background: 'var(--glass-hover)', color: 'var(--accent2)' }}>
                <Wrench size={9} /> {f}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Ponto({ d = 0 }) {
  return <span className="h-1.5 w-1.5 rounded-full inline-block animate-bounce" style={{ background: 'var(--dim)', animationDelay: `${d}s` }} />
}
