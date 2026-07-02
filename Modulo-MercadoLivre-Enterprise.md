# Módulo Mercado Livre — Nível Enterprise
### Leitura da API + lista completa de funções (espelhando o módulo da Shopee)

Documento de arquitetura. Tudo aqui está fundamentado na documentação atual do Mercado Livre (developers.mercadolibre.com / global-selling). Site do Brasil = **MLB**. API base = `https://api.mercadolibre.com`.

---

## 1. Como isto espelha a Shopee — e o que o ML desbloqueia a mais

No módulo da Shopee fazemos: OAuth por conta, listar anúncios por SKU, ler preço/status, atualizar preço, ler avaliações, puxar pedidos. O módulo do ML faz tudo isso **e ainda resolve três coisas que a Shopee não entregava**:

1. **Endereço e etiqueta reais do comprador.** A Shopee mascara nome/endereço; só o waybill oficial trazia. O ML entrega no `/shipments` o `destination.shipping_address` (nome, rua, número, CEP) e gera a **etiqueta real em PDF ou ZPL** pelo `/shipment_labels` — com a NF junto no Brasil. Isso mata de vez o problema do mascaramento.
2. **Radar de concorrência nativo.** O ML tem uma API de **referência de preço** (`/marketplace/benchmarks`) que devolve preço sugerido, menor preço, preço de concorrentes (com gráfico) e os custos (comissão + frete). Não precisamos raspar nada — vem pronto.
3. **Funil real (visitas).** O ML expõe **visitas por anúncio** (`/visits/time_window`) com série temporal. A Shopee não dá isso. Dá pra montar conversão = vendas ÷ visitas de verdade.

Além disso, o líquido do ML é calculável com precisão pela API de **tarifas** (`/sites/MLB/listing_prices`), que devolve `sale_fee` (% por categoria) + custo fixo por faixa de preço e logística — exatamente o papel que as faixas cumprem na Shopee.

---

## 2. Arquitetura Enterprise

Decisões que fazem o módulo escalar e não quebrar em produção (milhares de anúncios):

**2.1. Token por usuário no banco (sair do ambiente).**
Hoje o ML lê credenciais do ambiente (`ML_CLIENT_ID/SECRET/REFRESH_TOKEN/SELLER_ID`) — bom pra ligar 1 conta. Enterprise = tabela **`MLConta`** (espelha `ShopeeConta`): `user_id, seller_id, nickname, site_id, access_token, refresh_token, expira_em`. Renovação sob demanda (refresh grant). Permite multi-conta/multi-tenant.

**2.2. Cache de itens (`MLItemCache`, espelha `ShopeeItemCache`).**
`item_id, sku, preco, status, available_quantity, saude (health), dados_json, atualizado_em`. É o que o cockpit consulta — não batemos na API a cada render.

**2.3. Respeitar o limite: 1500 req/min por seller.**
Acima disso o ML devolve resposta vazia com **429**. O app tem limite de `max_requests_per_hour` (~18.000). Estratégia: **multiget** (`/items?ids=` até 20 por chamada) + cache + throttle. Igual ao batch de 50 da Shopee, só que de 20.

**2.4. Webhooks (tempo real).**
Receiver dos tópicos `items`, `items_prices`, `orders_v2`/`marketplace_orders`, `questions`, `shipments`, `public_offers`, `item_competition`, `stock_locations`, `claims`. Cada notificação atualiza o `MLItemCache` ou dispara um processamento (pedido novo, pergunta nova, preço mudou). É o que deixa Pedidos e Perguntas "ao vivo".

**2.5. Motor de líquido cacheado.**
`/sites/MLB/listing_prices` consultado por (categoria + faixa de preço + logística) e cacheado — vira a "anatomia do líquido" do ML, do mesmo jeito que já fazemos pro canal Shopee.

**2.6. O Bling continua sendo o hub.**
Toda alteração de preço grava **no Bling primeiro** (fonte da verdade) e **depois** empurra pro ML pela API (imediatismo) — idêntico à regra que já vale pra Shopee. Senão o próximo sync do Bling reverte o preço.

**2.7. Sync.**
Carga inicial via `scan`/`scroll` (passa dos 1.000 itens), incremental via webhooks. Honestidade sempre: quando a API não devolver um dado, o app avisa em vez de inventar.

---

## 3. Lista de funções por domínio

Cada função traz: **endpoint do ML** → **o que faz** → **onde entra no app**. As funções marcadas com ✓ já existem no módulo atual.

### Domínio A — Autenticação & Conta
| Função | Endpoint ML | Entra em |
|---|---|---|
| `url_autorizacao(redirect_uri)` ✓ (ajustar p/ pedir scopes `read write offline_access`) | `GET auth.mercadolivre.com.br/authorization` | Botão Conectar ML |
| `trocar_code_por_token(code, redirect_uri)` ✓ | `POST /oauth/token` (authorization_code) | Callback OAuth |
| `_access_token()` / `renovar_token()` ✓ | `POST /oauth/token` (refresh_token) | Infra (renovação) |
| `conta()` / `conta_do_token()` ✓ | `GET /users/me`, `/users/{id}` | Status do canal |
| `salvar_conta` / `ler_conta` (DB) | tabela `MLConta` | Multi-conta |
| `grants(app_id)` | `GET /applications/{app_id}/grants` | Quem autorizou |
| `consumo_api(app_id)` | `GET /applications/v1/{app_id}/consumed-applications` | Telemetria/limites |
| `limites_publicacao()` | `GET /marketplace/users/cap` | Quota de anúncios |
| `reputacao()` | `GET /users/{id}` (`seller_reputation`) | Saúde da conta |

### Domínio B — Catálogo / Anúncios
| Função | Endpoint ML | Entra em |
|---|---|---|
| `listar_skus(filtros)` | `GET /users/{id}/items/search?seller_sku=&sku=&status=&listing_type_id=&category_id=&q=` (limit≤100; scan/scroll) | Sincronização do catálogo |
| `buscar_item_por_sku(sku)` ✓ | `items/search?seller_sku=` | Painel de canais |
| `obter_item(item_id)` ✓ | `GET /items/{id}` | Detalhe do anúncio |
| `obter_itens(ids[])` | **multiget** `GET /items?ids=` (até 20) `&attributes=` | Carga em lote (rate-limit) |
| `descricao_item(item_id)` | `GET /items/{id}/description` | Qualidade |
| `itens_publicos(seller_id)` | `GET /sites/MLB/search?seller_id=` (público, ativos) | Conferência externa |
| `atualizar_status(item_id, status)` | `PUT /items/{id}` `{status: active\|paused\|closed}` | Pausar/ativar anúncio |
| `atualizar_estoque(item_id, qtd)` | `PUT /items/{id}` `{available_quantity}` | Estoque por canal |
| `atualizar_atributos(item_id, attrs)` | `PUT /items/{id}` `{attributes}` | Correção de ficha |
| `atualizar_fotos(item_id, pictures)` | `PUT /items/{id}` `{pictures}` | Qualidade |
| `obter/atualizar_variacoes(item_id)` | `PUT /items/{id}` (enviar **todos** os ids de variação) | Grade/variações |

> Regras do PUT: anúncio precisa estar ativo; com vendas não dá pra mudar título/condição/modo de compra; `listing_type` muda uma vez só; em variações, qualquer id não enviado é apagado.

### Domínio C — Preço & Líquido
| Função | Endpoint ML | Entra em |
|---|---|---|
| `atualizar_preco(item_id, preco)` ✓ | `PUT /items/{id}` `{price}` | Aplicar preço (canal ML) |
| `preco_de_venda(item_id, context)` | `GET /items/{id}/prices` e `/prices` (preço vencedor + contexto de canal/comprador) | Preço real exibido |
| `precos_por_quantidade(item_id)` | `/prices` (`conditions.min_purchase_unit`) | Atacado/PxQ |
| `tarifas_de_venda(category_id, price, listing_type_id, logistic_type, shipping_modes)` | `GET /sites/MLB/listing_prices` → **sale_fee (%) + custo fixo** | **Motor do líquido ML** |
| `frete_do_item(item_id, zip_code)` | `GET /items/{id}/shipping_options?zip_code=` | Componente de frete no líquido |

App: aba **Preço & Margem** com a cascata do ML real — `preço − sale_fee − custo fixo − frete − imposto = líquido` — e edição por canal, igual já fazemos com a Shopee.

### Domínio D — Radar de concorrência (nativo)
| Função | Endpoint ML | Entra em |
|---|---|---|
| `referencia_de_preco(item_id)` | `GET /marketplace/benchmarks/items/{id}/details` → `suggested_price`, `lowest_price`, `internal/external_price`, `percent_difference`, `costs{selling_fees, shipping_fees}`, `graph[]` de concorrentes | **Aba Radar com dado real** |
| `itens_com_referencia(seller_id)` | `GET /marketplace/benchmarks/user/{id}/items` | Lista o que tem referência |
| `concorrentes_por_busca(termo/categoria)` | `GET /sites/MLB/search?q=&category_id=` | Descoberta de concorrentes |

Isto eleva a aba Radar muito além da entrada manual: preço sugerido, menor preço do mercado, concorrentes com preço e os custos já calculados.

### Domínio E — Pedidos
| Função | Endpoint ML | Entra em |
|---|---|---|
| `listar_pedidos(status, datas)` | `GET /orders/search?seller=&order.status=paid&order.date_created.from/to` | Lista de pedidos ML |
| `obter_pedido(order_id)` | `GET /orders/{id}?options` (total c/ frete) | Detalhe do pedido |
| `pedidos_do_pack(pack_id)` | `GET /marketplace/orders/pack/{pack_id}` | Carrinho (várias orders) |
| `faturamento_do_comprador(order_id)` | API de billing do comprador | Dados de NF |
| `feedback_pedido` / `responder_feedback` | `POST /orders/{id}/feedback`, `POST /feedback/{id}/reply` | Reputação pós-venda |

> O JSON de Orders **não traz mais** os dados de envio — só o `shipment_id`. O envio vem do domínio F.

### Domínio F — Envios & Etiquetas (resolve o mascaramento)
| Função | Endpoint ML | Entra em |
|---|---|---|
| `envio_do_pedido(shipment_id)` | `GET /shipments/{id}` (header `x-format-new: true`) → status, `destination.shipping_address` (**nome+endereço reais**), `tracking_number`, `logistic_type` | Card do pedido / expedição |
| `custos_de_envio(order_id)` | `GET /orders/{id}/shipments` → `shipments_options.cost` (comprador) + `list_cost` (vendedor); `/shipments/{id}/costs` | Frete real no líquido |
| `etiqueta(shipment_ids[], formato)` | `GET /shipment_labels?shipment_ids=…&response_type=pdf\|zpl2` (até 50; NF junto no BR) | **Waybill real (A4/ZPL)** |
| `promessa_de_entrega(item/shipment)` | `shipping_options` (handling/delivery) | Prazo na etiqueta/card |

Tipos de logística (`logistic_type`): `me1` (própria), `me2`/`self_service` (Flex), `fulfillment` (Full), `drop_off`, `cross_docking`. A ESTAÇÃO/ROTA do CD pode sair daqui.

### Domínio G — Perguntas (novo card no cockpit)
| Função | Endpoint ML | Entra em |
|---|---|---|
| `listar_perguntas(seller_id\|item, status)` | `GET /questions/search?seller_id=&item=&api_version=4&status=UNANSWERED` | Card Perguntas |
| `responder_pergunta(question_id, texto)` | `POST /answers` `{question_id, text}` | Responder direto |
| `ocultar_pergunta(question_id)` | `POST /my/questions/hidden` | Moderação |
| `tempo_de_resposta(seller_id)` | `GET /users/{id}/questions/response_time` | Métrica de SLA |

Perguntas não respondidas derrubam conversão e reputação; >7 meses são apagadas. Vale um alerta no cockpit.

### Domínio H — Avaliações
| Função | Endpoint ML | Entra em |
|---|---|---|
| `avaliacoes_do_item(item_id)` | `GET /reviews/item/{id}?limit=&offset=&catalog_product_id=` → `rate`, `title`, `content`, `likes/dislikes`, `paging.total` | Aba Avaliações (ML) |

Espelha a aba rica que já temos na Shopee: nota grande, distribuição por estrelas, cards.

### Domínio I — Visitas / Funil (o que a Shopee não dá)
| Função | Endpoint ML | Entra em |
|---|---|---|
| `visitas_do_vendedor(seller_id, datas)` | `GET /users/{id}/items_visits?date_from=&date_to=` → total + por empresa | Funil agregado |
| `visitas_do_item_janela(item_id, last, unit)` | `GET /items/{id}/visits/time_window` (série temporal) | Tendência por anúncio |
| `visitas_multi(ids[])` | `GET /visits/items?ids=` | Funil em lote |

App: aba **Funil** com visitas reais + conversão (vendas ÷ visitas).

### Domínio J — Promoções (Promotions v2)
| Função | Endpoint ML | Entra em |
|---|---|---|
| `promocoes_do_vendedor(seller_id)` | `GET /seller-promotions/users/{id}?app_version=v2` | Painel de promoções |
| `promocoes_do_item(item_id)` | `GET /seller-promotions/items/{id}?app_version=v2` | Promoção por anúncio |
| `detalhe_oferta(offer_id)` | `GET /seller-promotions/offers/{id}?app_version=v2` | Estado da oferta |
| `candidatos(candidate_id)` | `GET /seller-promotions/candidates/{id}?app_version=v2` | Itens convidados |
| `aplicar_desconto(item_id, deal_price, top_deal_price, datas)` | `POST /marketplace/seller-promotions/items/{id}?user_id=` (headers `version:v2`, `X-Client-Id`, `X-Caller-Id`) `{promotion_type: PRICE_DISCOUNT}` | Criar desconto real |
| `remover_desconto(item_id)` | `DELETE …?promotion_type=PRICE_DISCOUNT` | Remover desconto |

Tipos: DEAL, MARKETPLACE_CAMPAIGN, DOD, LIGHTNING, VOLUME, PRICE_DISCOUNT, SMART, PRICE_MATCHING, SELLER_CAMPAIGN, SELLER_COUPON_CAMPAIGN, UNHEALTHY_STOCK. Desconto ao comprador entre 5% e 80%. Eleva a aba **Promoção** de simulação pra promoção de verdade no ML.

### Domínio K — Qualidade do anúncio
| Função | Endpoint ML | Entra em |
|---|---|---|
| `qualidade_ml(item_id)` | compõe `GET /items/{id}` (fotos `pictures`, `video_id`, `attributes` EAN/GTIN/peso) + `/description` + flag `reputation_health_gauge` | Aba Qualidade (ML) |
| `anuncios_com_saude_ruim(seller_id)` | `GET /users/{id}/items/search?reputation_health_gauge=unhealthy` | Lista de anúncios a corrigir |

Espelha o `qualidade.py` que já roda na Shopee: nota 0–100 por fotos, atributos, descrição, vídeo — agora com o "health gauge" do próprio ML.

### Domínio L — Faturamento (fase futura)
| Função | Endpoint ML | Entra em |
|---|---|---|
| `faturamento(periodo)` | API de billing (CVFV comissão + CVFF custo fixo + CVFN financiamento) | Líquido **real** pós-venda |

Hoje calculamos o líquido **estimado** (listing_prices). O faturamento traz o que o ML **realmente** cobrou por venda — fecha a conta de margem de verdade.

### Domínio M — Webhooks (infra de tempo real)
| Função | Tópicos | Entra em |
|---|---|---|
| `receber_webhook_ml(payload)` | `items`, `items_prices`, `orders_v2`/`marketplace_orders`, `questions`, `shipments`, `public_offers`, `item_competition`, `stock_locations`, `claims` | Cache fresco; Pedidos/Perguntas ao vivo |

---

## 4. O que cada parte do cockpit ganha com o ML

- **Visão geral / Canais:** publicado, preço, status e estoque do ML (cache) ao lado da Shopee.
- **Preço & Margem:** anatomia do líquido do ML (sale_fee + custo fixo + frete reais).
- **Radar:** preço sugerido + menor preço + concorrentes + custos, nativos (domínio D).
- **Promoção:** aplicar/retirar desconto real no ML (domínio J).
- **Avaliações:** reviews do ML (domínio H).
- **Qualidade:** diagnóstico + health gauge do ML (domínio K).
- **Funil:** visitas reais e conversão (domínio I) — inédito.
- **Perguntas (card novo):** responder pré-venda direto (domínio G).
- **Pedidos (módulo):** pedidos + envio + etiqueta real com nome/endereço (domínios E/F).

---

## 5. Roadmap sugerido (ordem de construção)

**Onda 1 — Catálogo vivo.** `MLConta` (DB) + `listar_skus`/`obter_itens` (multiget) + `atualizar_preco/status/estoque` + motor de líquido (`listing_prices`) + `MLItemCache`. → acende o canal ML no cockpit, com preço e líquido reais.

**Onda 2 — Inteligência do anúncio.** `referencia_de_preco` (Radar) + `avaliacoes_do_item` + `visitas` (Funil) + `qualidade_ml`. → as abas do cockpit passam a mostrar dado real do ML.

**Onda 3 — Pedidos & expedição.** `listar_pedidos`/`obter_pedido` + `envio_do_pedido` + `etiqueta`. → módulo Pedidos com ML e etiqueta real (resolve endereço/mascaramento).

**Onda 4 — Engajamento & tempo real.** `perguntas` + `promoções v2` + `receber_webhook_ml`. → responder perguntas, gerir promoções e manter tudo ao vivo.

---

## 6. Estado atual do módulo (`app/mercadolivre.py`)

Já implementado e validado: `url_autorizacao`, `trocar_code_por_token`, `_access_token` (refresh), `conta_do_token`, `buscar_item_por_sku`, `obter_item`, `atualizar_preco`, `_seller_id`, mais os endpoints `/api/mercadolivre/conectar` e `/api/mercadolivre/callback` (OAuth assistido) e a fiação no `canais_painel`. Ou seja: a base do Domínio A e parte do B/C já está de pé — o que falta é tudo que está listado acima, por onda.

---

### Notas de implementação que carregam risco
- **Escopos:** o OAuth precisa pedir `read write offline_access` — sem `offline_access` não vem refresh_token. (No painel do app: marcar fluxo Refresh Token; **não** marcar PKCE, que quebra nossa troca.)
- **redirect_uri idêntico** entre autorização e troca, e igual ao cadastrado — senão `invalid_grant`.
- **429 = vazio:** sempre tratar resposta vazia como rate-limit, com backoff.
- **`x-format-new: true`** é obrigatório no `/shipments`.
- **Edição de preço** ainda é via `PUT /items` (o endpoint de editar em `/prices` está "em breve" pelo ML); leitura do preço vencedor já é via `/prices`.
