import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cors from 'cors';
import express from 'express';

import { createOrder, dbPath, getHealth, getOrderByNumber, listProducts, listRoasts } from './database.js';

const app = express();
const port = Number(process.env.PORT || 3001);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const distIndex = path.join(distDir, 'index.html');
const allowedPaymentMethods = new Set(['pix', 'card-delivery', 'cash']);

app.use(cors());
app.use(express.json());

function sendError(res, error) {
  const statusCode = Number(error.statusCode) || 500;
  const message = statusCode >= 500 ? 'Erro interno no servidor.' : error.message;

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({ error: message });
}

function normalizeOrderPayload(body) {
  const customer = {
    name: String(body?.customer?.name ?? '').trim(),
    email: String(body?.customer?.email ?? '').trim().toLowerCase(),
    phone: String(body?.customer?.phone ?? '').trim(),
    address: String(body?.customer?.address ?? '').trim(),
    city: String(body?.customer?.city ?? '').trim(),
    state: String(body?.customer?.state ?? '').trim().toUpperCase(),
    zip: String(body?.customer?.zip ?? '').trim(),
    paymentMethod: String(body?.customer?.paymentMethod ?? '').trim(),
    deliveryNotes: String(body?.customer?.deliveryNotes ?? '').trim(),
  };
  const items = Array.isArray(body?.items) ? body.items : [];

  const requiredFields = [
    ['nome', customer.name],
    ['email', customer.email],
    ['telefone', customer.phone],
    ['endereço', customer.address],
    ['cidade', customer.city],
    ['estado', customer.state],
    ['CEP', customer.zip],
  ];

  const missingField = requiredFields.find(([, value]) => !value);

  if (missingField) {
    const error = new Error(`Preencha o campo ${missingField[0]}.`);
    error.statusCode = 400;
    throw error;
  }

  if (!customer.email.includes('@')) {
    const error = new Error('Informe um email válido.');
    error.statusCode = 400;
    throw error;
  }

  if (!allowedPaymentMethods.has(customer.paymentMethod)) {
    const error = new Error('Escolha uma forma de pagamento válida.');
    error.statusCode = 400;
    throw error;
  }

  return {
    customer,
    items: items.map((item) => ({
      productId: Number(item.productId),
      quantity: Number(item.quantity),
    })),
  };
}

app.get('/api/health', (_req, res) => {
  res.json({
    ...getHealth(),
    storage: path.basename(dbPath),
  });
});

app.get('/api/products', (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search : '';
  const roast = typeof req.query.roast === 'string' ? req.query.roast : 'all';

  res.json({
    products: listProducts({ search, roast }),
    filters: {
      roasts: listRoasts(),
    },
  });
});

app.get('/api/orders/:orderNumber', (req, res) => {
  const order = getOrderByNumber(req.params.orderNumber);

  if (!order) {
    return res.status(404).json({ error: 'Pedido não encontrado.' });
  }

  return res.json(order);
});

app.post('/api/orders', (req, res) => {
  try {
    const payload = normalizeOrderPayload(req.body);
    const order = createOrder(payload);
    return res.status(201).json(order);
  } catch (error) {
    return sendError(res, error);
  }
});

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }

  if (fs.existsSync(distIndex)) {
    return res.sendFile(distIndex);
  }

  return res.status(404).json({
    error: 'Frontend não encontrado. Execute "npm run build" para publicar o cliente junto com a API.',
  });
});

app.use((error, _req, res, _next) => {
  sendError(res, error);
});

app.listen(port, () => {
  console.log(`Cafe Shop API rodando em http://localhost:${port}`);
});
