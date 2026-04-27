import { databaseMode, databaseName, getHealth } from '../server/database.js';
import { sendError } from '../server/http.js';

export default async function handler(_req, res) {
  try {
    const health = await getHealth();

    res.status(200).json({
      ...health,
      storage: databaseName,
      storageMode: databaseMode,
    });
  } catch (error) {
    sendError(res, error);
  }
}
