
# cafe_shop

Aplicação full stack de cafeteria com frontend em React/Vite, API em JavaScript com Express, SQLite no ambiente local e Postgres recomendado para produção na Vercel.

## Requisitos

- Node.js `24+`
- npm `11+`

## Como rodar

```bash
npm install
npm run dev
```

O comando acima sobe:

- frontend Vite em `http://localhost:5173`
- API em `http://localhost:3001`

O banco é criado automaticamente em `server/data/cafe-shop.db`.

## Build e execução

```bash
npm run build
npm start
```

Depois do build, o `npm start` serve a API e também o frontend compilado.

## Endpoints principais

- `GET /api/health`
- `GET /api/products`
- `POST /api/orders`
- `GET /api/orders/:orderNumber`

## Deploy na Vercel

O frontend Vite é publicado normalmente e a API roda via `Vercel Functions` usando a pasta `api/`.

### Banco em produção

- Localmente o projeto usa SQLite.
- Na Vercel, para persistência real dos pedidos, configure um banco Postgres e adicione uma destas variáveis:
  - `POSTGRES_URL`
  - `DATABASE_URL`
  - `POSTGRES_PRISMA_URL`
  - `POSTGRES_URL_NON_POOLING`

Sem uma URL de Postgres, a Vercel até consegue responder com SQLite efêmero, mas os dados não são persistentes entre execuções.

### Passos recomendados

1. No projeto da Vercel, adicione uma integração de Postgres.
2. Confirme que a variável `POSTGRES_URL` foi criada no ambiente.
3. Faça novo deploy.
4. Teste:
   - `/api/health`
   - `/api/products`
   - checkout da loja
