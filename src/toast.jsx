import { createContext, useContext, useCallback, useState } from 'react'
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react'

const Ctx = createContext(() => {})
export const useToast = () => useContext(Ctx)

const cor = (t) => (t === 'ok' ? 'var(--ok)' : t === 'warn' ? 'var(--warn)' : 'var(--danger)')
const Icon = { ok: CheckCircle2, warn: AlertCircle, danger: XCircle }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const notify = useCallback((msg, tipo = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, msg, tipo }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])

  return (
    <Ctx.Provider value={notify}>
      {children}
      <div className="fixed top-5 right-5 z-[60] flex flex-col gap-2">
        {toasts.map((t) => {
          const I = Icon[t.tipo] || CheckCircle2
          return (
            <div key={t.id} className="glass rounded-xl px-4 py-3 text-sm flex items-center gap-2 text-fg"
                 style={{ borderColor: cor(t.tipo) }}>
              <I size={16} style={{ color: cor(t.tipo) }} /> {t.msg}
            </div>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}
