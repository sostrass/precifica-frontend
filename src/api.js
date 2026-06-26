const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const TOKEN_KEY = 'blingai_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY))

// Custos globais padrão (a tela de configuração para editar isto é o próximo incremento)
export const DEFAULT_CUSTOS = { ganho: 30, imposto: 12, cartao: 2.5, embalagem: 3, frete: 0 }

async function req(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    throw new Error('Sem resposta do servidor (rede ou timeout). Tente de novo em instantes.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // sessão expirada/Inválida: limpa o token e avisa o app pra voltar ao login (em qualquer tela)
    if (res.status === 401 && auth && getToken()) {
      setToken(null)
      try { window.dispatchEvent(new CustomEvent('sessao-expirada')) } catch (_) {}
    }
    throw new Error(data.detail || data.erro || `Erro ${res.status}`)
  }
  return data
}

export const api = {
  register: (b) => req('/auth/register', { method: 'POST', body: b, auth: false }),
  login: (b) => req('/auth/login', { method: 'POST', body: b, auth: false }),
  me: () => req('/auth/me'),
  blingLogin: () => req('/auth/bling/login'),
  blingStatus: () => req('/auth/bling/status'),
  monitoramento: (b) => req('/api/monitoramento', { method: 'POST', body: b }),
  produtoDetalhe: (id) => req(`/api/produtos/${id}`),
  produtoAtualizar: (id, b) => req(`/api/produtos/${id}`, { method: 'PUT', body: b }),
  iaCampo: (b) => req('/api/ia/campo', { method: 'POST', body: b }),
  dashboardCarteira: (canal='mercadolivre') => req('/api/dashboard/carteira?canal='+canal),
  kpis: (dias) => req('/api/kpis' + (dias ? `?dias=${dias}` : '')),
  produtoConselho: (id) => req(`/api/produtos/${id}/conselho`),
  produtoPosicionamento: (id, canal) => req(`/api/produtos/${id}/posicionamento` + (canal ? `?canal=${canal}` : '')),
  produtoSincronizacao: (id) => req(`/api/produtos/${id}/sincronizacao`),
  diagnosticoPrecos: (id) => req(`/api/diagnostico/precos/${id}`),
  diagnosticoMultiloja: (id) => req(`/api/diagnostico/multiloja/${id}`),
  webhookUrl: () => req('/api/webhooks/url'),
  webhookEventos: (limite = 30) => req(`/api/webhooks/eventos?limite=${limite}`),
  produtoStatus: (id) => req(`/api/produtos/${id}/status`),
  diagProduto: (id) => req(`/api/diagnostico/produto/${id}`),
  diagNfe: (id) => req(`/api/diagnostico/nfe/${id}`),
  diagSistema: () => req('/api/diagnostico/sistema'),
  precificarLote: (b) => req('/api/precificar/lote', { method: 'POST', body: b }),
  loteIa: (b) => req('/api/produtos/lote/ia', { method: 'POST', body: b }),
  precoCanal: (id, b) => req(`/api/produtos/${id}/preco_canal`, { method: 'POST', body: b }),
  catalogoSincronizar: () => req('/api/catalogo/sincronizar', { method: 'POST' }),
  catalogoSyncStatus: () => req('/api/catalogo/sync_status'),
  catalogoListar: (q = '', pagina = 1) => req(`/api/catalogo?busca=${encodeURIComponent(q)}&pagina=${pagina}&limite=50`),
  shopeeStatus: () => req('/api/shopee/status'),
  shopeeDiagnostico: () => req('/api/shopee/diagnostico'),
  shopeeAuthLogin: () => req('/api/shopee/auth/login'),
  shopeeConectar: (b) => req('/api/shopee/conectar', { method: 'POST', body: b }),
  shopeeRenovar: () => req('/api/shopee/renovar', { method: 'POST' }),
  shopeeProdutos: (offset = 0, limite = 100) => req(`/api/shopee/produtos?offset=${offset}&limite=${limite}`),
  shopeeDesempenho: () => req('/api/shopee/desempenho'),
  shopeeBoostStatus: () => req('/api/shopee/boost/status'),
  shopeeBoostConfig: (b) => req('/api/shopee/boost/config', { method: 'PUT', body: b }),
  shopeeBoostAdd: (itens) => req('/api/shopee/boost/itens', { method: 'POST', body: { itens } }),
  shopeeBoostRemove: (id) => req(`/api/shopee/boost/itens/${id}`, { method: 'DELETE' }),
  shopeeBoostFixar: (id, fixo) => req(`/api/shopee/boost/itens/${id}/fixar`, { method: 'POST', body: { fixo } }),
  shopeeBoostRodar: () => req('/api/shopee/boost/rodar', { method: 'POST' }),
  shopeeBoostSincronizarNomes: () => req('/api/shopee/boost/sincronizar_nomes', { method: 'POST' }),
  shopeeBoostAutoSelecionar: (estrategia) => req('/api/shopee/boost/auto_selecionar', { method: 'POST', body: { estrategia } }),
  shopeeBoostCondGet: () => req('/api/shopee/boost/condicional'),
  shopeeBoostCondSalvar: (b) => req('/api/shopee/boost/condicional', { method: 'PUT', body: b }),
  shopeeBoostCondAplicar: () => req('/api/shopee/boost/condicional/aplicar', { method: 'POST' }),
  shopeeAvaliacoes: (status = 'UNANSWERED') => req(`/api/shopee/avaliacoes?status=${status}`),
  shopeeResponder: (b) => req('/api/shopee/avaliacoes/responder', { method: 'POST', body: b }),
  shopeeReviewConfig: () => req('/api/shopee/avaliacoes/config'),
  shopeeReviewConfigSalvar: (cfg) => req('/api/shopee/avaliacoes/config', { method: 'PUT', body: cfg }),
  shopeeReviewSugerir: (d) => req('/api/shopee/avaliacoes/sugerir', { method: 'POST', body: d }),
  shopeeReviewAuto: () => req('/api/shopee/avaliacoes/auto_responder', { method: 'POST' }),
  shopeeReviewAtividade: () => req('/api/shopee/avaliacoes/atividade'),
  shopeeReviewContar: (forcar = true) => req(`/api/shopee/avaliacoes/contar?forcar=${forcar ? 1 : 0}`, { method: 'POST' }),
  shopeeReviewMutirao: (completo = false) => req('/api/shopee/avaliacoes/mutirao', { method: 'POST', body: { completo } }),
  shopeeReviewParar: () => req('/api/shopee/avaliacoes/parar', { method: 'POST' }),
  shopeePromoConfig: () => req('/api/shopee/promo/config'),
  shopeePromoConfigSalvar: (cfg) => req('/api/shopee/promo/config', { method: 'PUT', body: cfg }),
  shopeePromoPropor: () => req('/api/shopee/promo/propor', { method: 'POST' }),
  shopeePromoDiagnosticar: () => req('/api/shopee/promo/diagnosticar', { method: 'POST' }),
  shopeePromoAplicar: (b) => req('/api/shopee/promo/aplicar', { method: 'POST', body: b }),
  shopeePromoRodar: () => req('/api/shopee/promo/rodar', { method: 'POST' }),
  shopeePromoQueda: () => req('/api/shopee/promo/queda'),
  shopeePromoHistorico: () => req('/api/shopee/promo/historico'),
  shopeePedidos: (dias = 7) => req(`/api/shopee/pedidos?dias=${dias}`),
  shopeePedidosPainel: (status = 'A_ENVIAR', dias = 15) => req(`/api/shopee/pedidos/painel?status=${status}&dias=${dias}`),
  shopeePedidoDetalhe: (orderSn) => req(`/api/shopee/pedidos/${orderSn}/detalhe`),
  shopeePedidosSeparacao: (status = 'A_ENVIAR', dias = 15) => req(`/api/shopee/pedidos/separacao?status=${status}&dias=${dias}`),
  shopeeMargemReal: (dias = 7, limite = 40) => req(`/api/shopee/financeiro/margem-real?dias=${dias}&limite=${limite}`),
  shopeeDescontos: (status = 'ongoing') => req(`/api/shopee/descontos?status=${status}`),
  shopeeCampanhaDetalhe: (tipo, id) => req(`/api/shopee/campanha/${tipo}/${id}`),
  shopeeCampanhaRepetir: (tipo, id) => req(`/api/shopee/campanha/${tipo}/${id}/repetir`, { method: 'POST' }),
  shopeeCampanhaDesempenho: (tipo, id) => req(`/api/shopee/campanha/${tipo}/${id}/desempenho`),
  shopeeCampanhasAgenda: () => req('/api/shopee/campanhas/agenda'),
  shopeeCampanhasDashboard: (dias = 30) => req(`/api/shopee/campanhas/dashboard?dias=${dias}`),
  shopeeCriarDesconto: (b) => req('/api/shopee/descontos', { method: 'POST', body: b }),
  shopeeEncerrarDesconto: (id) => req(`/api/shopee/descontos/${id}`, { method: 'DELETE' }),
  shopeeCupons: (status = 'ongoing') => req(`/api/shopee/cupons?status=${status}`),
  shopeeCriarCupom: (b) => req('/api/shopee/cupons', { method: 'POST', body: b }),
  shopeeEncerrarCupom: (id) => req(`/api/shopee/cupons/${id}`, { method: 'DELETE' }),
  shopeeAds: (dias = 7) => req(`/api/shopee/ads?dias=${dias}`),
  shopeePerguntas: (status = 'UNANSWERED') => req(`/api/shopee/perguntas?status=${status}`),
  shopeeResponderPergunta: (b) => req('/api/shopee/perguntas/responder', { method: 'POST', body: b }),
  shopeeDevolucoes: (dias = 30) => req(`/api/shopee/devolucoes?dias=${dias}`),
  shopeeDivergencia: () => req('/api/shopee/divergencia'),
  shopeeBundles: (status = 'ongoing') => req(`/api/shopee/bundles?status=${status}`),
  shopeeCriarBundle: (b) => req('/api/shopee/bundles', { method: 'POST', body: b }),
  shopeeEncerrarBundle: (id) => req(`/api/shopee/bundles/${id}`, { method: 'DELETE' }),
  shopeeAddons: (status = 'ongoing') => req(`/api/shopee/addons?status=${status}`),
  shopeeCriarAddon: (b) => req('/api/shopee/addons', { method: 'POST', body: b }),
  shopeeEncerrarAddon: (id) => req(`/api/shopee/addons/${id}`, { method: 'DELETE' }),
  shopeeFlashSlots: (dias = 3) => req(`/api/shopee/flash/slots?dias=${dias}`),
  shopeeFlash: (tipo = 1) => req(`/api/shopee/flash?tipo=${tipo}`),
  shopeeCriarFlash: (b) => req('/api/shopee/flash', { method: 'POST', body: b }),
  shopeeEncerrarFlash: (id) => req(`/api/shopee/flash/${id}`, { method: 'DELETE' }),
  concorrenciaPrecos: (b) => req('/api/concorrencia/precos', { method: 'POST', body: b }),
  iaDescricao: (b) => req('/api/ia/descricao', { method: 'POST', body: b }),
  iaSac: (b) => req('/api/ia/sac', { method: 'POST', body: b }),
  qualidadeCadastro: (b) => req('/api/qualidade/cadastro', { method: 'POST', body: b }),
  estudioImagem: (b) => req('/api/estudio/imagem', { method: 'POST', body: b }),
  // Agentes
  listarAgentes: () => req('/api/agentes'),
  agenteMensagem: (agente, b) => req(`/api/agentes/${agente}/mensagem`, { method: 'POST', body: b }),
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
  radarAlertas: (dias = 7) => req(`/api/radar/alertas?dias=${dias}`),
  radarVarrerTudo: () => req('/api/radar/varrer-tudo', { method: 'POST' }),
  radarRecomendacao: (b) => req('/api/radar/recomendacao', { method: 'POST', body: b }),
  // NF-e
  nfeConfig: () => req('/api/nfe/config'),
  salvarNfeConfig: (b) => req('/api/nfe/config', { method: 'PUT', body: b }),
  nfePendentes: (situacao) => req('/api/nfe/pendentes' + (situacao != null ? `?situacao=${situacao}` : '')),
  nfeObter: (id) => req(`/api/nfe/${id}`),
  nfeCompleta: (id) => req(`/api/nfe/${id}/completa`),
  nfeDiagEdicao: (id) => req(`/api/nfe/${id}/diagnostico-edicao`),
  nfeValores: (ids) => req('/api/nfe/valores', { method: 'POST', body: JSON.stringify({ ids }) }),
  nfeAplicarSelecionadas: (ids) => req('/api/nfe/aplicar-selecionadas', { method: 'POST', body: JSON.stringify({ ids }) }),
  nfeConciliacaoShopee: (id) => req(`/api/nfe/${id}/conciliacao-shopee`),
  nfeConciliacaoShopeeLote: (ids) => req('/api/nfe/conciliacao-shopee-lote', { method: 'POST', body: JSON.stringify({ ids }) }),
  nfeFaturamento: () => req('/api/nfe/faturamento'),
  nfeFaturamentoRecalcular: () => req('/api/nfe/faturamento/recalcular', { method: 'POST' }),
  nfeEnviar: (id) => req(`/api/nfe/${id}/enviar`, { method: 'POST' }),
  nfeSimular: (b) => req('/api/nfe/simular', { method: 'POST', body: b }),
  nfeAplicar: (id, b) => req(`/api/nfe/${id}/aplicar`, { method: 'POST', body: b }),
  nfeAutoProcessar: () => req('/api/nfe/auto/processar', { method: 'POST' }),
  nfeEventos: (limite = 25) => req(`/api/nfe/eventos?limite=${limite}`),
  notificacoes: (limite = 40) => req(`/api/notificacoes?limite=${limite}`),
  notificacoesMarcarLidas: () => req('/api/notificacoes/marcar-lidas', { method: 'POST', body: {} }),
  notificacoesArquivar: (ids) => req('/api/notificacoes/arquivar', { method: 'POST', body: { ids } }),
  nfeAplicarTodas: () => req('/api/nfe/aplicar-todas', { method: 'POST' }),
}
