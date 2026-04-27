import { getOrderByNumber } from '../../server/database.js';
import { sendError } from '../../server/http.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const orderNumber =
      typeof req.query.orderNumber === 'string'
        ? req.query.orderNumber
        : Array.isArray(req.query.orderNumber)
          ? req.query.orderNumber[0]
          : '';
    const order = await getOrderByNumber(orderNumber);

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    return res.status(200).json(order);
  } catch (error) {
    return sendError(res, error);
  }
}
