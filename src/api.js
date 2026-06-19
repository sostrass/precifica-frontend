const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const TOKEN_KEY = 'blingai_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY))

// Custos globais padrão (a tela de configuração para editar isto é o próximo incremento)
export const DEFAULT_CUSTOS = { ganho: 30, imposto: 12, cartao: 2.5, embalagem: 3, frete: 0 }

async function req(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || data.erro || `Erro ${res.status}`)
  return data
}

export const api = {
  register: (b) => req('/auth/register', { method: 'POST', body: b, auth: false }),
  login: (b) => req('/auth/login', { method: 'POST', body: b, auth: false }),
  me: () => req('/auth/me'),
  blingLogin: () => req('/auth/bling/login'),
  blingStatus: () => req('/auth/bling/status'),
  monitoramento: (b) => req('/api/monitoramento', { method: 'POST', body: b }),
  precificarLote: (b) => req('/api/precificar/lote', { method: 'POST', body: b }),
  concorrenciaPrecos: (b) => req('/api/concorrencia/precos', { method: 'POST', body: b }),
  iaDescricao: (b) => req('/api/ia/descricao', { method: 'POST', body: b }),
}
