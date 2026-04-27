import { Pool } from 'pg';

import { seedProducts } from '../catalog.js';
import { createOrderNumber, httpError, roundMoney } from './shared.js';

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

const pool = connectionString ? new Pool({ connectionString }) : null;
let initPromise = null;

function getPool() {
  if (!pool) {
    throw httpError(500, 'Banco de produção não configurado.');
  }

  return pool;
}

async function initialize() {
  const client = await getPool().connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        image TEXT NOT NULL,
        origin TEXT NOT NULL,
        roast TEXT NOT NULL,
        rating NUMERIC(3, 1) NOT NULL,
        weight TEXT NOT NULL,
        notes JSONB NOT NULL,
        featured BOOLEAN NOT NULL DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number TEXT NOT NULL UNIQUE,
        customer_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        zip TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        delivery_notes TEXT NOT NULL DEFAULT '',
        subtotal NUMERIC(10, 2) NOT NULL,
        shipping NUMERIC(10, 2) NOT NULL,
        total NUMERIC(10, 2) NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        unit_price NUMERIC(10, 2) NOT NULL,
        quantity INTEGER NOT NULL,
        line_total NUMERIC(10, 2) NOT NULL
      );
    `);

    const { rows } = await client.query('SELECT COUNT(*)::int AS total FROM products');

    if (rows[0].total === 0) {
      for (const product of seedProducts) {
        await client.query(
          `
            INSERT INTO products (
              id,
              name,
              description,
              price,
              image,
              origin,
              roast,
              rating,
              weight,
              notes,
              featured
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)
            ON CONFLICT (id) DO NOTHING
          `,
          [
            product.id,
            product.name,
            product.description,
            product.price,
            product.image,
            product.origin,
            product.roast,
            product.rating,
            product.weight,
            JSON.stringify(product.notes),
            product.featured,
          ],
        );
      }
    }
  } finally {
    client.release();
  }
}

async function ensureInitialized() {
  if (!initPromise) {
    initPromise = initialize();
  }

  return initPromise;
}

function mapProduct(row) {
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description,
    price: Number(row.price),
    image: row.image,
    origin: row.origin,
    roast: row.roast,
    rating: Number(row.rating),
    weight: row.weight,
    notes: Array.isArray(row.notes) ? row.notes : JSON.parse(row.notes),
    featured: Boolean(row.featured),
  };
}

export async function listRoasts() {
  await ensureInitialized();

  const { rows } = await getPool().query(`
    SELECT DISTINCT roast
    FROM products
    ORDER BY
      CASE roast
        WHEN 'Claro' THEN 1
        WHEN 'Médio' THEN 2
        WHEN 'Escuro' THEN 3
        ELSE 4
      END,
      roast
  `);

  return rows.map((row) => row.roast);
}

export async function listProducts({ search = '', roast = 'all' } = {}) {
  await ensureInitialized();

  const filters = [];
  const values = [];

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    const base = values.length;

    filters.push(
      `(name ILIKE $${base + 1} OR origin ILIKE $${base + 1} OR description ILIKE $${base + 1})`,
    );
    values.push(term);
  }

  if (roast && roast !== 'all') {
    filters.push(`roast = $${values.length + 1}`);
    values.push(roast);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const { rows } = await getPool().query(
    `
      SELECT *
      FROM products
      ${whereClause}
      ORDER BY featured DESC, rating DESC, name ASC
    `,
    values,
  );

  return rows.map(mapProduct);
}

export async function getHealth() {
  await ensureInitialized();

  const { rows } = await getPool().query(`
    SELECT
      (SELECT COUNT(*)::int FROM products) AS products,
      (SELECT COUNT(*)::int FROM orders) AS orders
  `);

  return {
    status: 'ok',
    database: 'postgres',
    databaseMode: 'persistent',
    productCount: Number(rows[0].products),
    orderCount: Number(rows[0].orders),
  };
}

export async function createOrder({ customer, items }) {
  await ensureInitialized();

  if (!Array.isArray(items) || items.length === 0) {
    throw httpError(400, 'Adicione ao menos um item ao pedido.');
  }

  const ids = [...new Set(items.map((item) => item.productId))];
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    const { rows: productRows } = await client.query('SELECT * FROM products WHERE id = ANY($1::int[])', [
      ids,
    ]);
    const products = productRows.map(mapProduct);
    const productMap = new Map(products.map((product) => [product.id, product]));

    if (products.length !== ids.length) {
      throw httpError(400, 'Um ou mais produtos do carrinho não existem mais.');
    }

    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId);
      const quantity = Number(item.quantity);

      if (!product || !Number.isInteger(quantity) || quantity < 1) {
        throw httpError(400, 'Carrinho inválido.');
      }

      const lineTotal = roundMoney(product.price * quantity);

      return {
        productId: product.id,
        name: product.name,
        quantity,
        unitPrice: product.price,
        lineTotal,
      };
    });

    const subtotal = roundMoney(orderItems.reduce((sum, item) => sum + item.lineTotal, 0));
    const shipping = subtotal >= 100 ? 0 : 15.9;
    const total = roundMoney(subtotal + shipping);
    const orderNumber = createOrderNumber();
    const createdAt = new Date().toISOString();

    const { rows: insertedOrders } = await client.query(
      `
        INSERT INTO orders (
          order_number,
          customer_name,
          email,
          phone,
          address,
          city,
          state,
          zip,
          payment_method,
          delivery_notes,
          subtotal,
          shipping,
          total,
          status,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id
      `,
      [
        orderNumber,
        customer.name,
        customer.email,
        customer.phone,
        customer.address,
        customer.city,
        customer.state,
        customer.zip,
        customer.paymentMethod,
        customer.deliveryNotes,
        subtotal,
        shipping,
        total,
        'confirmed',
        createdAt,
      ],
    );

    const orderId = Number(insertedOrders[0].id);

    for (const item of orderItems) {
      await client.query(
        `
          INSERT INTO order_items (
            order_id,
            product_id,
            product_name,
            unit_price,
            quantity,
            line_total
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [orderId, item.productId, item.name, item.unitPrice, item.quantity, item.lineTotal],
      );
    }

    await client.query('COMMIT');

    return {
      orderNumber,
      createdAt,
      status: 'confirmed',
      subtotal,
      shipping,
      total,
      customer,
      items: orderItems,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getOrderByNumber(orderNumber) {
  await ensureInitialized();

  const { rows: orders } = await getPool().query(
    `
      SELECT
        id,
        order_number,
        customer_name,
        email,
        phone,
        address,
        city,
        state,
        zip,
        payment_method,
        delivery_notes,
        subtotal,
        shipping,
        total,
        status,
        created_at
      FROM orders
      WHERE order_number = $1
    `,
    [orderNumber],
  );

  const order = orders[0];

  if (!order) {
    return null;
  }

  const { rows: items } = await getPool().query(
    `
      SELECT
        product_id AS "productId",
        product_name AS name,
        unit_price AS "unitPrice",
        quantity,
        line_total AS "lineTotal"
      FROM order_items
      WHERE order_id = $1
      ORDER BY id ASC
    `,
    [order.id],
  );

  return {
    orderNumber: order.order_number,
    createdAt: order.created_at.toISOString(),
    status: order.status,
    subtotal: Number(order.subtotal),
    shipping: Number(order.shipping),
    total: Number(order.total),
    customer: {
      name: order.customer_name,
      email: order.email,
      phone: order.phone,
      address: order.address,
      city: order.city,
      state: order.state,
      zip: order.zip,
      paymentMethod: order.payment_method,
      deliveryNotes: order.delivery_notes,
    },
    items: items.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
    })),
  };
}
