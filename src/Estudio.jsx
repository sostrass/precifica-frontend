import { useState } from 'react'
import { ImagePlus, Wand2, Download, Sparkles, Aperture } from 'lucide-react'
import { api } from './api.js'
import { useToast } from './toast.jsx'

const ESTILOS = [
  { label: 'Fundo branco', hint: 'foto de produto em fundo branco, luz de estúdio, alta nitidez' },
  { label: 'Lifestyle', hint: 'foto lifestyle, ambiente real, luz natural suave' },
  { label: 'Minimalista', hint: 'composição minimalista, fundo neutro, sombras suaves' },
  { label: 'Close macro', hint: 'close-up macro, detalhe do material e textura' },
]

export default function Estudio() {
  const notify = useToast()
  const [prompt, setPrompt] = useState('')
  const [negativo, setNegativo] = useState('')
  const [img, setImg] = useState(null)
  const [busy, setBusy] = useState(false)

  const addEstilo = (h) => setPrompt((p) => (p.trim() ? p.trim() + ', ' + h : h))

  const gerar = async () => {
    if (!prompt.trim()) { notify('Descreva a imagem que você quer', 'danger'); return }
    setBusy(true); setImg(null)
    try {
      const r = await api.estudioImagem({ prompt, negativo })
      setImg(`data:${r.mime_type};base64,${r.imagem_base64}`)
    } catch (e) { notify(e.message, 'danger') }
    setBusy(false)
  }

  return (
    <div className="grid gap-4 max-w-5xl" style={{ gridTemplateColumns: 'minmax(0, 0.85fr) minmax(0, 1fr)' }}>
      {/* Controles */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Aperture size={18} className="text-accent" /> Estúdio criativo
        </div>
        <label className="block">
          <span className="text-xs text-dim block mb-1">O que gerar</span>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4}
                    placeholder="Ex.: kit de caixas organizadoras transparentes empilhadas, etiqueta minimalista"
                    className="w-full bg-glass border border-glassb rounded-xl px-3 py-2 text-sm outline-none focus:border-accent resize-none" />
        </label>

        <div className="flex flex-wrap gap-2">
          {ESTILOS.map((e) => (
            <button key={e.label} onClick={() => addEstilo(e.hint)}
                    className="text-xs rounded-lg px-2.5 py-1.5 border border-glassb text-dim hover:text-accent hover:border-accent flex items-center gap-1">
              <Sparkles size={12} /> {e.label}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="text-xs text-dim block mb-1">Evitar (opcional)</span>
          <input value={negativo} onChange={(e) => setNegativo(e.target.value)}
                 placeholder="Ex.: texto, marca d'água, reflexos"
                 className="w-full bg-glass border border-glassb rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
        </label>

        <button onClick={gerar} disabled={busy}
                className="w-full rounded-xl py-2.5 text-sm font-medium text-white disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: 'var(--accent)' }}>
          <Wand2 size={16} /> {busy ? 'Gerando imagem…' : 'Gerar imagem'}
        </button>
        <p className="text-xs text-faint">A geração leva alguns segundos. Cada imagem consome cota diária de IA.</p>
      </div>

      {/* Resultado */}
      <div className="glass rounded-2xl p-5 grid place-items-center min-h-[360px]">
        {busy ? (
          <div className="text-center">
            <div className="h-12 w-12 rounded-2xl grid place-items-center mx-auto mb-3 animate-pulse"
                 style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>
              <Aperture size={22} className="text-white" />
            </div>
            <div className="text-sm text-dim">Compondo a cena…</div>
          </div>
        ) : img ? (
          <div className="w-full">
            <img src={img} alt="Imagem gerada" className="w-full rounded-xl border border-glassb" />
            <a href={img} download="estudio-precifica.png"
               className="mt-3 glass rounded-xl py-2 text-sm text-dim hover:text-accent flex items-center justify-center gap-2">
              <Download size={15} /> Baixar imagem
            </a>
          </div>
        ) : (
          <div className="text-center text-dim">
            <div className="h-12 w-12 rounded-2xl grid place-items-center mx-auto mb-3" style={{ background: 'var(--glass-hover)' }}>
              <ImagePlus size={22} className="text-accent" />
            </div>
            <div className="text-sm">Sua imagem aparece aqui</div>
            <div className="text-xs text-faint mt-1">Descreva o produto e clique em gerar.</div>
          </div>
        )}
      </div>
    </div>
  )
}
