import { useState } from 'react'
import {
  Sparkles, MessageCircleHeart, GaugeCircle, ShieldCheck, Copy, Check, Wand2,
  CircleCheck, CircleAlert,
} from 'lucide-react'
import { api } from './api.js'
import { useToast } from './toast.jsx'

const ABAS = [
  { id: 'descricao', label: 'Descrição', icon: Sparkles },
  { id: 'sac', label: 'Atendimento', icon: MessageCircleHeart },
  { id: 'qualidade', label: 'Qualidade do cadastro', icon: GaugeCircle },
]

export default function CentralIa() {
  const [aba, setAba] = useState('descricao')
  return (
    <div className="space-y-4 max-w-4xl">
      <div className="glass rounded-2xl p-1.5 flex gap-1 w-fit">
        {ABAS.map((a) => {
          const Icon = a.icon
          const on = aba === a.id
          return (
            <button key={a.id} onClick={() => setAba(a.id)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${on ? 'text-white' : 'text-dim hover:text-fg'}`}
                    style={on ? { background: 'var(--accent)' } : undefined}>
              <Icon size={16} /> {a.label}
            </button>
          )
        })}
      </div>

      {aba === 'descricao' && <Descricao />}
      {aba === 'sac' && <Sac />}
      {aba === 'qualidade' && <Qualidade />}
    </div>
  )
}

/* ---------------------------- Copy helper ------------------------------- */
function CopyBtn({ texto }) {
  const [ok, setOk] = useState(false)
  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 1500) } catch { /* */ }
  }
  return (
    <button onClick={copiar} className="text-xs text-dim hover:text-accent flex items-center gap-1">
      {ok ? <><Check size={13} /> copiado</> : <><Copy size={13} /> copiar</>}
    </button>
  )
}

function Saida({ titulo, texto }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wide text-faint">{titulo}</div>
        <CopyBtn texto={texto} />
      </div>
      <div className="text-sm leading-relaxed whitespace-pre-wrap text-fg">{texto}</div>
    </div>
  )
}

/* ----------------------------- Descrição -------------------------------- */
function Descricao() {
  const notify = useToast()
  const [nome, setNome] = useState('')
  const [carac, setCarac] = useState('')
  const [blindar, setBlindar] = useState(false)
  const [out, setOut] = useState('')
  const [busy, setBusy] = useState(false)

  const gerar = async () => {
    if (!nome.trim()) { notify('Informe o nome do produto', 'danger'); return }
    setBusy(true); setOut('')
    try {
      const r = await api.iaDescricao({ nome_produto: nome, caracteristicas: carac, blindar })
      setOut(r.descricao_gerada)
    } catch (e) { notify(e.message, 'danger') }
    setBusy(false)
  }

  return (
    <>
      <div className="glass rounded-2xl p-5 space-y-3">
        <label className="block">
          <span className="text-xs text-dim block mb-1">Nome do produto</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)}
                 placeholder="Ex.: Kit 30 caixas organizadoras transparentes"
                 className="w-full bg-glass border border-glassb rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
        </label>
        <label className="block">
          <span className="text-xs text-dim block mb-1">Características (opcional)</span>
          <textarea value={carac} onChange={(e) => setCarac(e.target.value)} rows={3}
                    placeholder="Material, medidas, cor, diferenciais…"
                    className="w-full bg-glass border border-glassb rounded-xl px-3 py-2 text-sm outline-none focus:border-accent resize-none" />
        </label>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button onClick={() => setBlindar((v) => !v)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm border border-glassb"
                  style={blindar ? { background: 'var(--glass-hover)', color: 'var(--accent2)' } : { color: 'var(--dim)' }}>
            <ShieldCheck size={15} /> Blindagem jurídica {blindar ? 'ativada' : 'desativada'}
          </button>
          <button onClick={gerar} disabled={busy}
                  className="rounded-xl px-5 py-2 text-sm font-medium text-white disabled:opacity-60 flex items-center gap-2"
                  style={{ background: 'var(--accent)' }}>
            <Wand2 size={15} /> {busy ? 'Gerando…' : 'Gerar descrição'}
          </button>
        </div>
        <p className="text-xs text-faint">A blindagem adiciona um rodapé jurídico padrão à descrição, reduzindo risco de reclamação.</p>
      </div>
      {out && <Saida titulo="Descrição gerada" texto={out} />}
    </>
  )
}

/* -------------------------------- SAC ----------------------------------- */
function Sac() {
  const notify = useToast()
  const [relato, setRelato] = useState('')
  const [out, setOut] = useState('')
  const [busy, setBusy] = useState(false)

  const gerar = async () => {
    if (!relato.trim()) { notify('Cole a mensagem ou a situação do cliente', 'danger'); return }
    setBusy(true); setOut('')
    try {
      const r = await api.iaSac({ relato })
      setOut(r.resposta)
    } catch (e) { notify(e.message, 'danger') }
    setBusy(false)
  }

  return (
    <>
      <div className="glass rounded-2xl p-5 space-y-3">
        <label className="block">
          <span className="text-xs text-dim block mb-1">Mensagem ou situação do cliente</span>
          <textarea value={relato} onChange={(e) => setRelato(e.target.value)} rows={4}
                    placeholder="Ex.: cliente reclama que a caixa chegou com a tampa trincada e quer reembolso"
                    className="w-full bg-glass border border-glassb rounded-xl px-3 py-2 text-sm outline-none focus:border-accent resize-none" />
        </label>
        <div className="flex justify-end">
          <button onClick={gerar} disabled={busy}
                  className="rounded-xl px-5 py-2 text-sm font-medium text-white disabled:opacity-60 flex items-center gap-2"
                  style={{ background: 'var(--accent)' }}>
            <MessageCircleHeart size={15} /> {busy ? 'Escrevendo…' : 'Gerar resposta'}
          </button>
        </div>
        <p className="text-xs text-faint">A resposta sai no tom da Sóstrass — acolhedor e resolutivo, pronto pra copiar e enviar.</p>
      </div>
      {out && <Saida titulo="Resposta sugerida" texto={out} />}
    </>
  )
}

/* ----------------------------- Qualidade -------------------------------- */
function Qualidade() {
  const notify = useToast()
  const [f, setF] = useState({ nome: '', ean: '', ncm: '', peso: '', descricao: '' })
  const [res, setRes] = useState(null)
  const [busy, setBusy] = useState(false)

  const avaliar = async () => {
    setBusy(true)
    try {
      const r = await api.qualidadeCadastro({ nome: f.nome, ean: f.ean, ncm: f.ncm, peso: f.peso, descricao: f.descricao })
      setRes(r)
    } catch (e) { notify(e.message, 'danger') }
    setBusy(false)
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
      <div className="glass rounded-2xl p-5 space-y-3">
        <Campo label="Nome" value={f.nome} onChange={(v) => setF({ ...f, nome: v })} placeholder="≥ 30 caracteres" />
        <div className="grid grid-cols-2 gap-3">
          <Campo label="EAN / GTIN" value={f.ean} onChange={(v) => setF({ ...f, ean: v })} />
          <Campo label="NCM" value={f.ncm} onChange={(v) => setF({ ...f, ncm: v })} />
        </div>
        <Campo label="Peso (kg)" value={f.peso} onChange={(v) => setF({ ...f, peso: v })} type="number" />
        <label className="block">
          <span className="text-xs text-dim block mb-1">Descrição</span>
          <textarea value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} rows={4}
                    placeholder="≥ 200 caracteres"
                    className="w-full bg-glass border border-glassb rounded-xl px-3 py-2 text-sm outline-none focus:border-accent resize-none" />
        </label>
        <button onClick={avaliar} disabled={busy}
                className="w-full rounded-xl py-2 text-sm font-medium text-white disabled:opacity-60"
                style={{ background: 'var(--accent)' }}>{busy ? 'Avaliando…' : 'Avaliar cadastro'}</button>
      </div>

      <div className="glass rounded-2xl p-5">
        {res ? <Score res={res} /> : (
          <div className="h-full grid place-items-center text-center text-dim text-sm">
            Preencha os campos e avalie para ver o score de completude.
          </div>
        )}
      </div>
    </div>
  )
}

function Score({ res }) {
  const cor = res.score >= 80 ? 'var(--ok)' : res.score >= 50 ? 'var(--warn)' : 'var(--danger)'
  const R = 46, C = 2 * Math.PI * R
  return (
    <div>
      <div className="flex items-center gap-4">
        <svg width="110" height="110" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r={R} fill="none" stroke="var(--glass-border)" strokeWidth="9" />
          <circle cx="55" cy="55" r={R} fill="none" stroke={cor} strokeWidth="9" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C * (1 - res.score / 100)}
                  transform="rotate(-90 55 55)" style={{ transition: 'stroke-dashoffset .6s ease' }} />
          <text x="55" y="52" textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--text)">{res.score}</text>
          <text x="55" y="70" textAnchor="middle" fontSize="11" fill="var(--dim)">de 100</text>
        </svg>
        <div>
          <div className="font-semibold" style={{ color: cor }}>
            {res.completo ? 'Cadastro completo' : res.score >= 50 ? 'Quase lá' : 'Precisa de atenção'}
          </div>
          <div className="text-xs text-dim mt-1">Cada item vale 20 pontos. Complete os pendentes para subir o score.</div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {res.itens.map((it) => (
          <div key={it.chave} className="flex items-start gap-2 text-sm">
            {it.ok
              ? <CircleCheck size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--ok)' }} />
              : <CircleAlert size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--warn)' }} />}
            <div>
              <span className={it.ok ? 'text-fg' : 'text-dim'}>{it.label}</span>
              {!it.ok && it.dica && <div className="text-xs text-faint">{it.dica}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Campo({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="block">
      <span className="text-xs text-dim block mb-1">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
             className="w-full bg-glass border border-glassb rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
    </label>
  )
}
