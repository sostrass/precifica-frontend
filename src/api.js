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
  // Precificação por canal (faixas)
  precificacaoConfig: () => req('/api/precificacao/config'),
  salvarPrecificacaoConfig: (b) => req('/api/precificacao/config', { method: 'PUT', body: b }),
  restaurarPrecificacao: () => req('/api/precificacao/restaurar', { method: 'POST' }),
  precificacaoCalcular: (b) => req('/api/precificacao/calcular', { method: 'POST', body: b }),
  // Radar
  radarAlvos: (sku) => req('/api/radar/alvos' + (sku ? `?sku=${encodeURIComponent(sku)}` : '')),
  addRadarAlvo: (b) => req('/api/radar/alvos', { method: 'POST', body: b }),
  removeRadarAlvo: (id) => req(`/api/radar/alvos/${id}`, { method: 'DELETE' }),
  radarSnapshot: (b) => req('/api/radar/snapshot', { method: 'POST', body: b }),
  radarVarrer: (b) => req('/api/radar/varrer', { method: 'POST', body: b }),
  radarHistorico: (sku, dias = 7) => req(`/api/radar/historico?sku=${encodeURIComponent(sku)}&dias=${dias}`),
  radarRecomendacao: (b) => req('/api/radar/recomendacao', { method: 'POST', body: b }),
}
