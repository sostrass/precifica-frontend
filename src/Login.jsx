import { useState } from 'react'
import { api, setToken } from './api.js'
import { useToast } from './toast.jsx'

export default function Login({ onAuth }) {
  const notify = useToast()
  const [modo, setModo] = useState('login')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)

  const enviar = async () => {
    setLoading(true)
    try {
      const data =
        modo === 'login'
          ? await api.login({ email, senha })
          : await api.register({ email, senha, nome })
      setToken(data.token)
      onAuth()
    } catch (e) {
      notify(e.message, 'danger')
    }
    setLoading(false)
  }

  return (
    <div className="h-full w-full grid place-items-center relative z-10 p-4">
      <div className="glass rounded-3xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="font-display text-2xl font-bold text-fg">
            Sóstrass<span className="text-accent"> AI</span>
          </div>
          <p className="text-dim text-sm mt-1">Precificação e inteligência de mercado</p>
        </div>

        <div className="space-y-3">
          {modo === 'register' && <Campo label="Nome" value={nome} onChange={setNome} />}
          <Campo label="E-mail" value={email} onChange={setEmail} type="email" />
          <Campo label="Senha" value={senha} onChange={setSenha} type="password"
                 onEnter={enviar} />
          <button
            disabled={loading}
            onClick={enviar}
            className="w-full rounded-xl py-2.5 font-medium text-white disabled:opacity-60"
            style={{ background: 'var(--accent)' }}
          >
            {loading ? '...' : modo === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </div>

        <button
          onClick={() => setModo(modo === 'login' ? 'register' : 'login')}
          className="w-full text-center text-sm text-dim mt-4 hover:text-fg"
        >
          {modo === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
        </button>
      </div>
    </div>
  )
}

function Campo({ label, value, onChange, type = 'text', onEnter }) {
  return (
    <label className="block">
      <span className="text-xs text-dim">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onEnter && onEnter()}
        className="w-full mt-1 rounded-xl px-3 py-2 text-sm outline-none bg-glass border border-glassb text-fg focus:border-accent"
      />
    </label>
  )
}
