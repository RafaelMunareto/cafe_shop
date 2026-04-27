import { listProducts, listRoasts } from '../server/database.js';
import { sendError } from '../server/http.js';

export default async function handler(req, res) {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const roast = typeof req.query.roast === 'string' ? req.query.roast : 'all';

    res.status(200).json({
      products: await listProducts({ search, roast }),
      filters: {
        roasts: await listRoasts(),
      },
    });
  } catch (error) {
    sendError(res, error);
  }
}
