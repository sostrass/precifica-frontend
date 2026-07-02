# Shopee Open Platform — Mapa Completo de Funcionalidades

Referência para desenvolver a página de funções da Shopee no Precifica AI.
Baseado na Shopee Open Platform API v2 (25 módulos oficiais).

---

## 0. Como a API funciona (resumo técnico)

- **Autenticação:** OAuth por loja. `partner_id` + `partner_key` (app) → autoriza a loja → recebe `access_token` + `refresh_token`.
- **Token expira em ~4 horas** → precisa de *refresh* automático (renovar com o `refresh_token`). **Isso é obrigatório** pra automação rodar sozinha.
- **Toda requisição é assinada** (HMAC-SHA256). Já implementamos a assinatura no nosso `shopee.py`.
- **Webhooks (Push):** a Shopee também avisa em tempo real (pedido novo, mudança de status, etc.) — igual ao Bling.

---

## 1. ⭐ IMPULSIONAMENTO / BOOST (o que você pediu)

**Como funciona o boost da Shopee (regras oficiais):**
- O boost ("Bump") joga o produto pro **topo da categoria na aba "Mais recentes"**.
- **Até 5 produtos por vez**, cada boost dura **4 horas**.
- Depois das 4h, pode reimpulsionar. **Não dá pra encerrar um boost no meio.**
- Produto precisa estar **ativo e com estoque** pra ser impulsionado.
- Algumas lojas têm privilégio pra impulsionar **mais de 5** por ciclo.

**API:** `product.boost_item(item_id_list)` e `product.get_boosted_list()`.

**O que podemos construir (Central de Boost):**
- **Auto-boost com rotação:** você cadastra, por exemplo, 30 produtos; o sistema impulsiona 5 a cada 4 horas em rodízio, garantindo exposição contínua e igual pra todos. (Isso é o "re-boost automático".)
- **Produtos fixos (pin):** fixar até 5 produtos que SEMPRE são impulsionados (prioridade sobre o rodízio).
- **Fila inteligente:** priorizar por margem, por Curva ABC, por giro, ou por menor estoque parado — usando os dados que já temos.
- **Agenda de boost:** impulsionar só em horários de pico (ex.: 12-14h e 19-22h), quando há mais compradores.
- **Painel ao vivo:** quais estão "impulsionando agora", countdown de 4h, e quais estão na fila com horário estimado.
- **Boost condicional:** impulsionar automaticamente quando o produto cair de posição/perder buybox (cruzando com o scraper).

---

## 2. PROMOÇÕES & MARKETING (tudo agendável)

Estes são os **agendamentos** que você perguntou — todos com início/fim programáveis.

| Módulo | O que é | Agendamento |
|---|---|---|
| **DiscountManager** | Campanha de desconto na loja (% ou valor) | Início e fim com data/hora; pode ter vários produtos |
| **BundleDealManager** | "Compre X, leve com desconto" (kit) | Janela de validade programável |
| **AddOnDealManager** | Produto adicional com desconto na compra do principal | Janela programável |
| **VoucherManager** | Cupons (loja inteira, produto específico ou frete grátis) | Validade início/fim, limite de uso, valor mínimo |
| **ShopFlashSaleManager** | Flash Sale da própria loja (slots de horário) | Slots de horário definidos |
| **FollowPrizeManager** | Prêmio (cupom) pra quem seguir a loja | Período da campanha |

**O que podemos construir (Central de Promoções):**
- Criar/editar/encerrar descontos, bundles, add-ons, cupons e flash sales pela nossa interface.
- **Auto-continuar promoção:** quando uma promoção expira, recriar automaticamente (loja nunca fica sem desconto ativo).
- **Calendário de promoções:** visão de linha do tempo com tudo que está agendado.
- **Promoção em lote:** aplicar um desconto a vários produtos (ex.: toda a Curva C parada) de uma vez.
- **Regras automáticas:** "criar cupom de frete grátis quando o ticket médio cair", "desconto progressivo no estoque parado há mais de 90 dias".

---

## 3. ANÚNCIOS PAGOS — SHOPEE ADS (AdsManager)

- Gerenciar campanhas de **Shopee Ads** (produtos patrocinados, busca, descoberta).
- Métricas: **impressões, cliques, CTR, conversão, GMV, ROAS, ACOS, gasto**.
- Orçamento diário/total e lances por palavra-chave.

**O que podemos construir:**
- Dashboard de performance dos anúncios pagos (junto com o orgânico).
- **Otimização de lance automática** por ROAS-alvo.
- Pausar campanha que estоura o ACOS; aumentar orçamento de campanha lucrativa.
- Relatório de quais palavras-chave convertem.

---

## 4. PRODUTOS & CATÁLOGO (ProductManager / GlobalProductManager / MediaSpaceManager)

- Listar / criar / editar / excluir anúncios e variações.
- Preço e estoque por anúncio e por variação (SKU).
- Imagens e vídeos (upload).
- Categorias, atributos obrigatórios, tabela de medidas.
- Status do anúncio (ativo / inativo / banido / em revisão).
- Informações de variação (cor, tamanho).

**O que podemos construir:**
- **Sincronizar o catálogo Shopee** com o nosso (igual ao cache do Bling).
- **Divergência Bling × Shopee** (preço/estoque) — fecha o ciclo que começamos com o ML.
- Edição em massa de preço/título/descrição com IA, gravando direto na Shopee.
- Detectar anúncios banidos/inativos e alertar.

---

## 5. PEDIDOS & LOGÍSTICA (OrderManager / LogisticsManager / FirstMileManager)

- Listar e detalhar pedidos (status, itens, comprador).
- Emitir etiqueta de envio, rastreio, agendar coleta.
- First mile (coleta em volume / cross-border).
- Canais de envio disponíveis.

**O que podemos construir:**
- Painel de pedidos Shopee unificado com os do Bling.
- KPIs de vendas Shopee (GMV, ticket, mais vendidos) no nosso Dashboard.
- Alerta de pedido a enviar / atrasado.

---

## 6. PÓS-VENDA & FINANCEIRO (ReturnsManager / PaymentManager)

- **Devoluções e reembolsos** (listar, aceitar, disputar).
- **Escrow:** repasses, detalhamento de taxas e comissões, valor líquido recebido.

**O que podemos construir:**
- **Margem líquida REAL** por venda Shopee (preço − comissão − taxas − frete), comparando com o que precificamos.
- Painel de devoluções e taxa de retorno.
- Conciliação de repasses.

---

## 7. SAÚDE DA LOJA (AccountHealthManager / ShopManager / MerchantManager)

- Métricas de desempenho: **avaliação da loja, taxa de resposta no chat, taxa de envio no prazo, cancelamentos, penalidades (penalty points)**.
- Dados da loja, horário de funcionamento, perfil.
- Múltiplas lojas / armazéns (merchant).

**O que podemos construir:**
- **Painel de saúde da loja** com semáforo (rating, penalidades, prazos) — direto ligado à elegibilidade pra Flash Sale e campanhas.
- Alerta quando uma penalidade aparece ou o rating cai.

---

## 8. TEMPO REAL (PushManager)

- Webhooks da Shopee: pedido criado/atualizado, mudança de item, status de envio, etc.

**O que podemos construir:**
- Mesma arquitetura do Bling: a Shopee avisa, a gente atualiza o cache na hora (loja trabalha com folga).

---

## RESUMO DOS AGENDAMENTOS POSSÍVEIS

1. **Auto-boost rotativo** (5 produtos / 4h, em rodízio) ← seu pedido principal
2. **Boost agendado por horário de pico**
3. **Descontos com início/fim programados**
4. **Flash Sale em slots de horário**
5. **Vouchers com janela de validade**
6. **Auto-continuar promoção** (recriar ao expirar)
7. **Mudança de preço agendada** (nossa, ex.: subir preço fora de campanha)
8. **Otimização de lance de Ads por ROAS**
9. **Reabastecimento/estoque reservado pra campanha**

---

## SUGESTÃO DE PÁGINA — "Shopee" (organização por abas)

1. **Boost** ⭐ — lista de produtos, fila de rodízio, fixos, painel ao vivo com countdown, regras (margem/ABC/horário). *Maior valor imediato.*
2. **Promoções** — descontos, bundles, add-ons, cupons, flash sale; calendário e auto-continuar.
3. **Shopee Ads** — campanhas, métricas (ROAS/ACOS), otimização de lance.
4. **Catálogo Shopee** — sincronização, divergência Bling × Shopee, edição em massa com IA.
5. **Pedidos & Financeiro** — pedidos, repasses, margem líquida real, devoluções.
6. **Saúde da Loja** — rating, penalidades, prazos, elegibilidade a campanhas.

**Ordem recomendada de desenvolvimento:** Boost → Catálogo/Divergência → Promoções → Ads → Financeiro → Saúde.

---

## PRÉ-REQUISITO TÉCNICO (antes de tudo)

O **refresh automático do token** da Shopee (expira em ~4h). Sem isso, nenhuma automação roda sozinha. É a primeira coisa a implementar no backend — depois, cada aba acima vira um conjunto de chamadas + um agendador.
