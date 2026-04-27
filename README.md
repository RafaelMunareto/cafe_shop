
# cafe_shop

Aplicação full stack de cafeteria com frontend em React/Vite, API em JavaScript com Express e persistência em SQLite.

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
