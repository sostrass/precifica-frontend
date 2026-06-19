# Sóstrass AI — Front (React + Vite)

Interface glassmorphism (tema claro/escuro) para o sistema de precificação e
inteligência de mercado. Consome o backend FastAPI (`blingai-backend`) via JWT.

## Stack
- React 18 + Vite 5
- Tailwind CSS 3 (tema via CSS variables, `darkMode: 'class'`)
- lucide-react (ícones)
- Gráfico de rosca em SVG próprio (sem dependência pesada)

## Rodar local
Requer Node 18+.

```bash
cd blingai-frontend
cp .env.example .env       # ajuste VITE_API_URL para a URL do backend
npm install
npm run dev                # abre em http://localhost:5173
```

O backend precisa estar rodando (por padrão em `http://localhost:8000`).

### Variável de ambiente
| Variável | Para quê |
|---|---|
| `VITE_API_URL` | URL base do backend FastAPI. Em produção, a URL pública do Railway. |

## Build de produção
```bash
npm run build      # gera a pasta dist/
npm run preview    # serve o dist/ localmente para conferir
```

## Deploy (Vercel / Netlify / Railway estático)
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Env var:** `VITE_API_URL` = URL pública do backend
- No backend, lembre de incluir a origem do front em `FRONTEND_ORIGIN` (CORS).

## Estrutura
```
src/
  main.jsx        # entry; envolve o app no ToastProvider
  App.jsx         # tema claro/escuro, auth, sidebar, topbar, navegação
  index.css       # Tailwind + variáveis de tema + classe .glass
  api.js          # cliente HTTP (JWT) + custos padrão
  toast.jsx       # notificações
  Login.jsx       # login / cadastro
  Dashboard.jsx   # KPIs + rosca de distribuição de margem
  Catalogo.jsx    # grade: margem, status, seleção em massa, radar
  RadarDrawer.jsx # radar multi-concorrentes + descrição por IA
```

## Como conversa com o backend
1. **Login/cadastro** → recebe um token JWT (guardado em `localStorage`).
2. **Conectar Bling** (sidebar) → chama `/auth/bling/login` e redireciona para o OAuth do Bling.
3. **Catálogo** → `/api/monitoramento` traz os produtos já com preço sugerido, margem líquida real e status (lucro_ideal / atencao / critico).
4. **Seleção em massa → "Aplicar preço sugerido (lote)"** → `/api/precificar/lote` com `aplicar: true` (grava o preço no Bling via PATCH).
5. **Radar / IA** (por produto) → cola links de concorrentes → `/api/concorrencia/precos` mostra o preço de cada um e a margem real se você igualar; botão de IA → `/api/ia/descricao`.

## O que esta versão inclui
- Tema claro/escuro persistido.
- Login com JWT + botão Conectar Bling.
- Dashboard: KPIs (produtos, margem média, margem crítica) + rosca de distribuição.
- Catálogo: grade com margem líquida corrigida, status colorido, busca, seleção em massa e precificação em lote.
- Drawer de radar multi-concorrentes (margem real por concorrente) + geração de descrição por IA.

## Próximo incremento (ainda não construído)
- Gráfico de barras de "leituras do robô" no Dashboard.
- Tela de configuração de custos e taxas por canal (hoje em `DEFAULT_CUSTOS` no `api.js`).
- Paginação real para os ~5.240 SKUs (a busca já filtra; falta paginar do backend).

## Observação honesta
O `npm install`/`vite build` **não foi executado no ambiente onde este código foi gerado**
(o proxy de rede estourava o limite de tempo da instalação). O código foi escrito com
cuidado e os imports/exports batem por construção, mas rode `npm run dev` localmente e,
se aparecer qualquer erro, é rápido de corrigir.
