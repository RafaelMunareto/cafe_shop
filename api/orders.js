import { createOrder } from '../server/database.js';
import { normalizeOrderPayload, sendError } from '../server/http.js';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const payload = normalizeOrderPayload(req.body);
      const order = await createOrder(payload);
      return res.status(201).json(order);
    } catch (error) {
      return sendError(res, error);
    }
  }

  return res.status(405).json({ error: 'Método não permitido.' });
}
