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
  produtoSimular: (id, canal, preco) => req(`/api/produtos/${id}/simular?canal=${encodeURIComponent(canal)}&preco=${encodeURIComponent(preco)}`),
  produtoQualidade: (id) => req(`/api/produtos/${id}/qualidade`),
  kpiSnapshot: (b) => req('/api/catalogo/kpi-snapshot', { method: 'POST', body: b }),
  kpiHistorico: (dias = 30) => req('/api/catalogo/kpi-historico?dias=' + dias),
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
  shopeeCatalogoSincronizar: () => req('/api/shopee/catalogo/sincronizar', { method: 'POST' }),
  shopeeCatalogoStatus: () => req('/api/shopee/catalogo/status'),
  shopeeItem: (sku) => req('/api/shopee/item?sku=' + encodeURIComponent(sku)),
  catalogoVendas: () => req('/api/catalogo/vendas'),
  vinculosEnriquecer: () => req('/api/catalogo/vinculos/enriquecer', { method: 'POST' }),
  vinculosStatus: () => req('/api/catalogo/vinculos/status'),
  precoHistorico: (id, dias) => req('/api/produtos/' + id + '/preco_historico?dias=' + (dias || 30)),
  catalogoAjustarPrecos: (b) => req('/api/catalogo/ajustar_precos', { method: 'POST', body: b }),
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
  shopeeBoostReordenar: (ordem) => req('/api/shopee/boost/reordenar', { method: 'POST', body: { ordem } }),
  shopeeBoostRemove: (id) => req(`/api/shopee/boost/itens/${id}`, { method: 'DELETE' }),
  shopeeBoostFixar: (id, fixo) => req(`/api/shopee/boost/itens/${id}/fixar`, { method: 'POST', body: { fixo } }),
  shopeeBoostRodar: () => req('/api/shopee/boost/rodar', { method: 'POST' }),
  shopeeBoostSincronizarNomes: () => req('/api/shopee/boost/sincronizar_nomes', { method: 'POST' }),
  shopeeBoostDesempenho: () => req('/api/shopee/boost/desempenho'),
  shopeeBoostPainel: () => req('/api/shopee/boost/painel'),
  shopeeBoostPico: () => req('/api/shopee/boost/pico'),
  shopeeBoostHistorico: () => req('/api/shopee/boost/historico'),
  shopeeBoostAutoSelecionar: (estrategia) => req('/api/shopee/boost/auto_selecionar', { method: 'POST', body: { estrategia } }),
  shopeeBoostCondGet: () => req('/api/shopee/boost/condicional'),
  shopeeBoostCondSalvar: (b) => req('/api/shopee/boost/condicional', { method: 'PUT', body: b }),
  shopeeBoostCondAplicar: () => req('/api/shopee/boost/condicional/aplicar', { method: 'POST' }),
  shopeeAvaliacoes: (status = 'UNANSWERED') => req(`/api/shopee/avaliacoes?status=${status}`),
  shopeeReputacaoPainel: (forcar = 0) => req(`/api/shopee/reputacao/painel?forcar=${forcar}`),
  shopeeReputacaoTemas: (forcar = 0) => req(`/api/shopee/reputacao/temas?forcar=${forcar}`),
  shopeeReputacaoComprador: (usuario) => req(`/api/shopee/reputacao/comprador/${encodeURIComponent(usuario)}`),
  shopeeReputacaoTemas: (forcar = 0) => req(`/api/shopee/reputacao/temas?forcar=${forcar}`),
  shopeeReputacaoResponderMassa: (itens) => req('/api/shopee/reputacao/responder_massa', { method: 'POST', body: { itens } }),
  shopeeAvaliacoesPag: (status = 'UNANSWERED', cursor = '') => req(`/api/shopee/avaliacoes?status=${status}&cursor=${encodeURIComponent(cursor)}`),
  shopeeItemAvaliacoes: (item_id) => req(`/api/shopee/avaliacoes?status=ALL&item_id=${encodeURIComponent(item_id)}`),
  shopeeResponder: (b) => req('/api/shopee/avaliacoes/responder', { method: 'POST', body: b }),
  shopeeReviewConfig: () => req('/api/shopee/avaliacoes/config'),
  shopeeReviewConfigSalvar: (cfg) => req('/api/shopee/avaliacoes/config', { method: 'PUT', body: cfg }),
  shopeeImpressaoConfig: () => req('/api/shopee/impressao/config'),
  shopeeImpressaoConfigSalvar: (cfg) => req('/api/shopee/impressao/config', { method: 'PUT', body: cfg }),
  shopeeReviewSugerir: (d) => req('/api/shopee/avaliacoes/sugerir', { method: 'POST', body: d }),
  shopeeReviewAuto: () => req('/api/shopee/avaliacoes/auto_responder', { method: 'POST' }),
  shopeeReviewAtividade: () => req('/api/shopee/avaliacoes/atividade'),
  shopeeReviewContar: (forcar = true) => req(`/api/shopee/avaliacoes/contar?forcar=${forcar ? 1 : 0}`, { method: 'POST' }),
  shopeeReviewMutirao: (completo = false) => req('/api/shopee/avaliacoes/mutirao', { method: 'POST', body: { completo } }),
  shopeeReviewParar: () => req('/api/shopee/avaliacoes/parar', { method: 'POST' }),
  // Mercado Livre (conexão + sync de catálogo)
  mlConta: () => req('/api/mercadolivre/conta'),
  mlAuthLogin: () => req('/api/mercadolivre/auth/login'),
  mlSincronizar: () => req('/api/mercadolivre/sincronizar', { method: 'POST' }),
  mlSyncStatus: () => req('/api/mercadolivre/sync'),
  mlItemPreco: (item_id, preco) => req('/api/mercadolivre/preco', { method: 'POST', body: { item_id, preco } }),
  produtoMercadolivre: (id) => req(`/api/produtos/${id}/mercadolivre`),
  mlDescricao: (item_id, texto) => req('/api/mercadolivre/descricao', { method: 'POST', body: { item_id, texto } }),
  mlAddFoto: (item_id, url) => req('/api/mercadolivre/anuncio-foto', { method: 'POST', body: { item_id, url } }),
  mlFicha: (item_id, ean, peso) => req('/api/mercadolivre/anuncio-ficha', { method: 'POST', body: { item_id, ean, peso } }),
  mlRadar: (item_id) => req(`/api/mercadolivre/radar/${item_id}`),
  mlAvaliacoes: (item_id) => req(`/api/mercadolivre/avaliacoes/${item_id}`),
  mlPromocoesPainel: () => req('/api/mercadolivre/promocoes/painel'),
  mlPromocaoDetalhe: (id, tipo) => req(`/api/mercadolivre/promocoes/promocao/${encodeURIComponent(id)}?promotion_type=${encodeURIComponent(tipo || '')}`),
  mlPromoSimular: (b) => req('/api/mercadolivre/promocoes/simular', { method: 'POST', body: b }),
  mlPromoCriarCampanha: (b) => req('/api/mercadolivre/promocoes/campanha', { method: 'POST', body: b }),
  mlPromoCriarCupom: (b) => req('/api/mercadolivre/promocoes/cupom', { method: 'POST', body: b }),
  mlPromoCriarVolume: (b) => req('/api/mercadolivre/promocoes/volume', { method: 'POST', body: b }),
  mlPromoEditarCampanha: (id, b) => req(`/api/mercadolivre/promocoes/campanha/${encodeURIComponent(id)}`, { method: 'PUT', body: b }),
  mlPromoExcluirCampanha: (id, tipo) => req(`/api/mercadolivre/promocoes/campanha/${encodeURIComponent(id)}?promotion_type=${encodeURIComponent(tipo)}`, { method: 'DELETE' }),
  mlPromoDesconto: (itemId, b) => req(`/api/mercadolivre/promocoes/item/${encodeURIComponent(itemId)}/desconto`, { method: 'POST', body: b }),
  mlPromoDescontoRemover: (itemId) => req(`/api/mercadolivre/promocoes/item/${encodeURIComponent(itemId)}/desconto`, { method: 'DELETE' }),
  mlPromoAderir: (itemId, b) => req(`/api/mercadolivre/promocoes/item/${encodeURIComponent(itemId)}/aderir`, { method: 'POST', body: b }),
  mlPromoRemoverItem: (itemId, tipo, pid, offerId) => req(`/api/mercadolivre/promocoes/item/${encodeURIComponent(itemId)}?promotion_type=${encodeURIComponent(tipo)}${pid ? `&promotion_id=${encodeURIComponent(pid)}` : ''}${offerId ? `&offer_id=${encodeURIComponent(offerId)}` : ''}`, { method: 'DELETE' }),
  mlPromoSair: (id, tipo) => req(`/api/mercadolivre/promocoes/promocao/${encodeURIComponent(id)}/sair?promotion_type=${encodeURIComponent(tipo)}`, { method: 'POST' }),
  mlPromoExclusaoSeller: (ativo) => req('/api/mercadolivre/promocoes/exclusao/seller', { method: 'POST', body: { ativo } }),
  mlPromoExclusaoItem: (itemId, ativo) => req('/api/mercadolivre/promocoes/exclusao/item', { method: 'POST', body: { item_id: itemId, ativo } }),
  mlPromoItens: ({ q, limit, offset, apenas_ativos } = {}) => req(`/api/mercadolivre/promocoes/itens?${new URLSearchParams(Object.entries({ q: q || '', limit: limit ?? 30, offset: offset ?? 0, apenas_ativos: apenas_ativos === false ? 'false' : 'true' }).filter(([, v]) => v !== '')).toString()}`),
  mlPromoPromocaoItens: (id, tipo) => req(`/api/mercadolivre/promocoes/promocao/${encodeURIComponent(id)}/itens?promotion_type=${encodeURIComponent(tipo)}`),
  mlPromoContagem: (id, tipo) => req(`/api/mercadolivre/promocoes/promocao/${encodeURIComponent(id)}/contagem?promotion_type=${encodeURIComponent(tipo)}`),
  mlItemPromocoes: (itemId) => req(`/api/mercadolivre/promocoes/item/${encodeURIComponent(itemId)}/promocoes`),
  mlItemOffer: (itemId, pid, tipo) => req(`/api/mercadolivre/promocoes/item/${encodeURIComponent(itemId)}/offer?promotion_id=${encodeURIComponent(pid)}&promotion_type=${encodeURIComponent(tipo)}`),
  mlPromoParticipantes: (forcar, dias, mes) => req(`/api/mercadolivre/promocoes/participantes?forcar=${forcar ? 'true' : 'false'}${mes ? `&mes=${mes}` : dias ? `&dias=${dias}` : ''}`),
  mlAdsPainel: (dias = 30) => req(`/api/mercadolivre/ads/painel?dias=${dias}`),
  mlAdsCampanhaItens: (id, dias = 30) => req(`/api/mercadolivre/ads/campanha/${id}/itens?dias=${dias}`),
  mlAdsCampanhaEditar: (id, body) => req(`/api/mercadolivre/ads/campanha/${id}`, { method: 'POST', body }),
  mlPromoAderirAuto: (id, tipo, desconto = 15) => req(`/api/mercadolivre/promocoes/promocao/${encodeURIComponent(id)}/aderir-auto?promotion_type=${encodeURIComponent(tipo)}&desconto_pct=${desconto}`, { method: 'POST' }),
  mlPromoMetricas: (id, tipo, inicio, fim) => req(`/api/mercadolivre/promocoes/promocao/${encodeURIComponent(id)}/metricas?${new URLSearchParams(Object.entries({ promotion_type: tipo, inicio: inicio || '', fim: fim || '' }).filter(([, v]) => v !== '')).toString()}`),
  mlPedidosBackfill: (dias = 90) => req(`/api/mercadolivre/pedidos/cache/backfill?dias=${dias}`, { method: 'POST' }),
  mlPedidosCacheStatus: () => req('/api/mercadolivre/pedidos/cache/status'),
  mlPedidosParados: (dias = 30, limit = 20) => req(`/api/mercadolivre/pedidos/parados?dias=${dias}&limit=${limit}`),
  mlBuybox: (limit = 20, offset = 0, somentePerdendo = true) => req(`/api/mercadolivre/buybox?limit=${limit}&offset=${offset}&somente_perdendo=${somentePerdendo ? 'true' : 'false'}`),
  mlBuyboxAjustar: (itemId, preco) => req('/api/mercadolivre/buybox/ajustar-preco', { method: 'POST', body: { item_id: itemId, preco } }),
  mlAgentesSugestoes: (limit = 40) => req(`/api/mercadolivre/agentes/sugestoes?limit=${limit}`),
  mlAgentesRodar: () => req('/api/mercadolivre/agentes/rodar', { method: 'POST' }),
  mlAgentesConfig: () => req('/api/mercadolivre/agentes/config'),
  mlAgentesConfigSalvar: (b) => req('/api/mercadolivre/agentes/config', { method: 'PUT', body: b }),
  mlAgentesExecucoes: (limit = 10) => req(`/api/mercadolivre/agentes/execucoes?limit=${limit}`),
  mlAgentesResumo: (dias = 7) => req(`/api/mercadolivre/agentes/resumo-semana?dias=${dias}`),
  mlReputacaoPainel: () => req('/api/mercadolivre/reputacao/painel'),
  mlSaudePainel: (q = {}) => {
    const p = new URLSearchParams()
    Object.entries(q).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '' && v !== false) p.set(k, v) })
    return req(`/api/mercadolivre/saude/painel?${p.toString()}`)
  },
  mlSaudeItem: (itemId) => req(`/api/mercadolivre/saude/item/${itemId}`),
  mlProdutosPainel: (q = {}) => {
    const p = new URLSearchParams()
    Object.entries(q).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '' && v !== false) p.set(k, v) })
    return req(`/api/mercadolivre/produtos/painel?${p.toString()}`)
  },
  mlProdutoUm: (itemId) => req(`/api/mercadolivre/produtos/${itemId}`),
  mlSetAtributos: (itemId, atributos) => req(`/api/mercadolivre/produtos/${itemId}/atributos`, { method: 'POST', body: { atributos } }),
  mlProdutoEditar: (itemId, body) => req(`/api/mercadolivre/produtos/${itemId}/editar`, { method: 'POST', body }),
  mlProdutoIaTitulo: (body) => req('/api/mercadolivre/produtos/ia/titulo', { method: 'POST', body }),
  mlProdutoIaDescricao: (body) => req('/api/mercadolivre/produtos/ia/descricao', { method: 'POST', body }),
  mlSetDescricao: (itemId, texto) => req('/api/mercadolivre/descricao', { method: 'POST', body: { item_id: itemId, texto } }),
  mlPublicarBling: (q = {}) => {
    const p = new URLSearchParams()
    Object.entries(q).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '' && v !== false) p.set(k, v) })
    return req(`/api/mercadolivre/publicar/bling?${p.toString()}`)
  },
  mlCategoriaPrever: (titulo) => req(`/api/mercadolivre/categorias/prever?titulo=${encodeURIComponent(titulo)}`),
  mlCategoriaAtributos: (catId) => req(`/api/mercadolivre/categorias/${catId}/atributos`),
  mlCategoriaAtributosIa: (catId, body) => req(`/api/mercadolivre/categorias/${catId}/atributos/ia`, { method: 'POST', body }),
  mlProdutoValidar: (body) => req('/api/mercadolivre/produtos/validar', { method: 'POST', body }),
  mlProdutoPublicar: (body) => req('/api/mercadolivre/produtos/publicar', { method: 'POST', body }),
  mlSyncDivergencias: (q = {}) => {
    const p = new URLSearchParams()
    Object.entries(q).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '' && v !== false) p.set(k, v) })
    return req(`/api/mercadolivre/sync/divergencias?${p.toString()}`)
  },
  mlFiscalPainel: (q = {}) => {
    const p = new URLSearchParams()
    Object.entries(q).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '' && v !== false) p.set(k, v) })
    return req(`/api/mercadolivre/fiscal/painel?${p.toString()}`)
  },
  mlFiscalItem: (itemId) => req(`/api/mercadolivre/fiscal/item/${itemId}`),
  mlFiscalSalvar: (itemId, body) => req(`/api/mercadolivre/fiscal/item/${itemId}`, { method: 'POST', body }),
  mlFiscalRegras: () => req('/api/mercadolivre/fiscal/regras'),
  mlWebhooksPainel: (horas = 24) => req(`/api/mercadolivre/webhooks/painel?horas=${horas}`),
  mlWebhooksRecuperar: () => req('/api/mercadolivre/webhooks/recuperar', { method: 'POST' }),
  mlPromocoesItem: (item_id) => req(`/api/mercadolivre/promocoes/${item_id}`),
  mlPromoAplicar: (b) => req('/api/mercadolivre/promocoes/aplicar', { method: 'POST', body: b }),
  mlPromoRemover: (item_id) => req('/api/mercadolivre/promocoes/remover', { method: 'POST', body: { item_id } }),
  // Pedidos & Etiqueta (Mercado Livre)
  mlPedidos: (status = 'paid', offset = 0) => req(`/api/mercadolivre/pedidos?status=${status}&offset=${offset}`),
  mlPedidosEnriquecido: (status = 'paid', offset = 0, limit = 30, desde = '', ate = '') => req(`/api/mercadolivre/pedidos-enriquecido?status=${status}&offset=${offset}&limit=${limit}${desde ? `&desde=${encodeURIComponent(desde)}` : ''}${ate ? `&ate=${encodeURIComponent(ate)}` : ''}`),
  mlPedido: (id) => req(`/api/mercadolivre/pedido/${id}`),
  mlEnvio: (shipmentId) => req(`/api/mercadolivre/envio/${shipmentId}`),
  mlEnviosSincronizar: (shipmentIds = [], cap = 60) => req('/api/mercadolivre/envios/sincronizar', { method: 'POST', body: { shipment_ids: shipmentIds, cap } }),
  mlPosvenda: (status = 'opened') => req(`/api/mercadolivre/posvenda?status=${status}`),
  mlPosvendaDetalhe: (claimId) => req(`/api/mercadolivre/posvenda/${claimId}`),
  mlTarifaDetalhe: (orderId) => req(`/api/mercadolivre/tarifa/${orderId}`),
  mlMensagens: (packId) => req(`/api/mercadolivre/mensagens/${packId}`),
  mlEnviarMensagem: (packId, buyerId, texto) => req(`/api/mercadolivre/mensagens/${packId}`, { method: 'POST', body: { buyer_id: buyerId, texto } }),
  mlNaoLidas: () => req('/api/mercadolivre/mensagens-nao-lidas'),
  mlNfeStatus: (orderIds = []) => req('/api/mercadolivre/nfe-status', { method: 'POST', body: { order_ids: orderIds } }),
  mlDadosFiscais: (orderId) => req(`/api/mercadolivre/dados-fiscais/${orderId}`),
  mlColeta: () => req('/api/mercadolivre/coleta'),
  mlEnvioExtra: (sid, orderId, logisticType, shipStatus) => req(`/api/mercadolivre/envio-extra/${sid}?order_id=${encodeURIComponent(orderId || '')}&logistic_type=${encodeURIComponent(logisticType || '')}&ship_status=${encodeURIComponent(shipStatus || '')}`),
  mlMensagemAnexo: async (filename) => {
    const res = await fetch(`${BASE}/api/mercadolivre/mensagem-anexo?filename=${encodeURIComponent(filename)}`, {
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    })
    if (!res.ok) throw new Error('anexo')
    return URL.createObjectURL(await res.blob())
  },
  mlEtiqueta: async (shipmentIds, formato = 'pdf') => {
    const headers = {}
    if (getToken()) headers.Authorization = `Bearer ${getToken()}`
    const res = await fetch(`${BASE}/api/mercadolivre/etiqueta?shipment_ids=${shipmentIds}&formato=${formato}`, { headers })
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || `Erro ${res.status}`) }
    return URL.createObjectURL(await res.blob())
  },
  // Central de Atendimento (perguntas multicanal + IA)
  atendimentoStatus: () => req('/api/atendimento/status'),
  atendimentoStats: () => req('/api/atendimento/stats'),
  atendimentoPerguntas: (status = 'UNANSWERED', limite = 50) => req(`/api/atendimento/perguntas?status=${status}&limite=${limite}`),
  atendimentoSugerir: (b) => req('/api/atendimento/sugerir', { method: 'POST', body: b }),
  atendimentoResponder: (b) => req('/api/atendimento/responder', { method: 'POST', body: b }),
  atendimentoOcultar: (b) => req('/api/atendimento/ocultar', { method: 'POST', body: b }),
  shopeePromoPainel: (forcar = false) => req(`/api/shopee/promo/painel${forcar ? '?forcar=true' : ''}`),
  shopeePromoConfig: () => req('/api/shopee/promo/config'),
  shopeePromoConfigSalvar: (cfg) => req('/api/shopee/promo/config', { method: 'PUT', body: cfg }),
  shopeePromoPropor: () => req('/api/shopee/promo/propor', { method: 'POST' }),
  shopeePromoDiagnosticar: () => req('/api/shopee/promo/diagnosticar', { method: 'POST' }),
  shopeePromoDiagnosticarFlash: () => req('/api/shopee/promo/diagnosticar-flash', { method: 'POST' }),
  shopeePromoTrava: () => req('/api/shopee/promo/trava'),
  shopeePromoAplicar: (b) => req('/api/shopee/promo/aplicar', { method: 'POST', body: b }),
  shopeePromoRodar: () => req('/api/shopee/promo/rodar', { method: 'POST' }),
  shopeePromoQueda: () => req('/api/shopee/promo/queda'),
  shopeePromoHistorico: () => req('/api/shopee/promo/historico'),
  shopeePromoDiag: (b) => req('/api/shopee/promo/diag', { method: 'POST', body: b }),
  shopeePedidos: (dias = 7) => req(`/api/shopee/pedidos?dias=${dias}`),
  shopeePedidosPainel: (status = 'A_ENVIAR', dias = 15, opts = {}) => {
    const q = new URLSearchParams({ status, dias: String(dias) })
    if (opts.page) q.set('page', String(opts.page))
    if (opts.page_size) q.set('page_size', String(opts.page_size))
    if (opts.busca) q.set('busca', opts.busca)
    if (opts.busca_tipo) q.set('busca_tipo', opts.busca_tipo)
    if (opts.grupo) q.set('grupo', opts.grupo)
    if (opts.nf) q.set('nf', opts.nf)
    return req(`/api/shopee/pedidos/painel?${q.toString()}`)
  },
  shopeePedidosContagens: (dias = 15) => req(`/api/shopee/pedidos/contagens?dias=${dias}`),
  shopeePedidosContagensNf: (status = 'TODOS', dias = 15) => req(`/api/shopee/pedidos/contagens-nf?status=${status}&dias=${dias}`),
  shopeePedidoDetalhe: (orderSn) => req(`/api/shopee/pedidos/${orderSn}/detalhe`),
  shopeePedidosSeparacao: (status = 'A_ENVIAR', dias = 15) => req(`/api/shopee/pedidos/separacao?status=${status}&dias=${dias}`),
  shopeeEnriquecerImpressao: (order_sns, skus) => req('/api/shopee/pedidos/enriquecer-impressao', { method: 'POST', body: { order_sns, skus } }),
  // Etiqueta OFICIAL da Shopee (PDF binário) — não usa req() porque a resposta é um blob, não JSON
  shopeeEtiquetaOficial: async (order_sns, tipo = 'auto') => {
    const headers = { 'Content-Type': 'application/json' }
    const t = getToken(); if (t) headers.Authorization = `Bearer ${t}`
    let res
    try {
      res = await fetch(`${BASE}/api/shopee/pedidos/etiqueta-oficial`, { method: 'POST', headers, body: JSON.stringify({ order_sns, tipo }) })
    } catch (e) { throw new Error('Sem resposta do servidor (rede ou timeout). Tente de novo em instantes.') }
    if (!res.ok) {
      if (res.status === 401) { setToken(null); try { window.dispatchEvent(new CustomEvent('sessao-expirada')) } catch (_) {} }
      let msg = `Erro ${res.status}`; try { msg = (await res.json()).detail || msg } catch (_) {}
      throw new Error(msg)
    }
    return await res.blob()
  },
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
  shopeeItemPreco: (item_id, preco) => req('/api/shopee/item/preco', { method: 'POST', body: { item_id, preco } }),
  shopeeReprecificar: (b) => req('/api/shopee/reprecificar', { method: 'POST', body: b }),
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
  radarManual: (b) => req('/api/radar/manual', { method: 'POST', body: b }),
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
  nfePendentesTodas: (situacao) => req('/api/nfe/pendentes/todas' + (situacao != null ? `?situacao=${situacao}` : '')),
  nfeObter: (id) => req(`/api/nfe/${id}`),
  nfeCompleta: (id) => req(`/api/nfe/${id}/completa`),
  nfeDiagEdicao: (id) => req(`/api/nfe/${id}/diagnostico-edicao`),
  nfeValores: (ids) => req('/api/nfe/valores', { method: 'POST', body: JSON.stringify({ ids }) }),
  nfeAplicarSelecionadas: (ids) => req('/api/nfe/aplicar-selecionadas', { method: 'POST', body: JSON.stringify({ ids }) }),
  nfeConciliacaoShopee: (id) => req(`/api/nfe/${id}/conciliacao-shopee`),
  nfeConciliacaoShopeeLote: (ids) => req('/api/nfe/conciliacao-shopee-lote', { method: 'POST', body: JSON.stringify({ ids }) }),
  nfeFaturamento: () => req('/api/nfe/faturamento'),
  nfeFaturamentoRecalcular: () => req('/api/nfe/faturamento/recalcular', { method: 'POST' }),
  nfeContagens: () => req('/api/nfe/contagens'),
  nfePedidosSemNfe: (dias = 30) => req(`/api/nfe/pedidos-sem-nfe?dias=${dias}`),
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
