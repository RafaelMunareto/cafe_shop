import * as postgresStore from './storage/postgres.js';
import * as sqliteStore from './storage/sqlite.js';

const hasPostgresConfig = Boolean(
  process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING,
);

const adapter = hasPostgresConfig ? postgresStore : sqliteStore;

export const databaseName = hasPostgresConfig ? 'postgres' : 'sqlite';
export const databaseMode = hasPostgresConfig
  ? 'persistent'
  : process.env.VERCEL
    ? 'ephemeral'
    : 'local';
export const dbPath = 'dbPath' in adapter ? adapter.dbPath : null;

export const listRoasts = adapter.listRoasts;
export const listProducts = adapter.listProducts;
export const getHealth = adapter.getHealth;
export const createOrder = adapter.createOrder;
export const getOrderByNumber = adapter.getOrderByNumber;
