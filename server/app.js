import cors from 'cors';
import express from 'express';

import {
  createOrder,
  databaseName,
  databaseMode,
  getHealth,
  getOrderByNumber,
  listProducts,
  listRoasts,
} from './database.js';
import { normalizeOrderPayload, sendError } from './http.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    const health = await getHealth();

    res.json({
      ...health,
      storage: databaseName,
      storageMode: databaseMode,
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const roast = typeof req.query.roast === 'string' ? req.query.roast : 'all';

    res.json({
      products: await listProducts({ search, roast }),
      filters: {
        roasts: await listRoasts(),
      },
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.get('/api/orders/:orderNumber', async (req, res) => {
  try {
    const order = await getOrderByNumber(req.params.orderNumber);

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    return res.json(order);
  } catch (error) {
    return sendError(res, error);
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const payload = normalizeOrderPayload(req.body);
    const order = await createOrder(payload);
    return res.status(201).json(order);
  } catch (error) {
    return sendError(res, error);
  }
});

export default app;
