import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

import { seedProducts } from './catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');

fs.mkdirSync(dataDir, { recursive: true });

export const dbPath = path.join(dataDir, 'cafe-shop.db');

const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    image TEXT NOT NULL,
    origin TEXT NOT NULL,
    roast TEXT NOT NULL,
    rating REAL NOT NULL,
    weight TEXT NOT NULL,
    notes TEXT NOT NULL,
    featured INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    subtotal REAL NOT NULL,
    shipping REAL NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    unit_price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    line_total REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`);

const countProductsStmt = db.prepare('SELECT COUNT(*) AS total FROM products');
const countHealthStmt = db.prepare(`
  SELECT
    (SELECT COUNT(*) FROM products) AS products,
    (SELECT COUNT(*) FROM orders) AS orders
`);
const insertProductStmt = db.prepare(`
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
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertOrderStmt = db.prepare(`
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
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertOrderItemStmt = db.prepare(`
  INSERT INTO order_items (
    order_id,
    product_id,
    product_name,
    unit_price,
    quantity,
    line_total
  ) VALUES (?, ?, ?, ?, ?, ?)
`);
const findOrderStmt = db.prepare(`
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
  WHERE order_number = ?
`);
const findOrderItemsStmt = db.prepare(`
  SELECT
    product_id AS productId,
    product_name AS name,
    unit_price AS unitPrice,
    quantity,
    line_total AS lineTotal
  FROM order_items
  WHERE order_id = ?
  ORDER BY id ASC
`);

seedCatalog();

function seedCatalog() {
  const row = countProductsStmt.get();

  if (Number(row.total) > 0) {
    return;
  }

  for (const product of seedProducts) {
    insertProductStmt.run(
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
    );
  }
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function parseProduct(row) {
  return {
    ...row,
    price: Number(row.price),
    rating: Number(row.rating),
    featured: Boolean(row.featured),
    notes: JSON.parse(row.notes),
  };
}

function createOrderNumber() {
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(2, 14);
  const suffix = Math.floor(100 + Math.random() * 900);

  return `CAF${stamp}${suffix}`;
}

export function listRoasts() {
  const rows = db
    .prepare(`
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
    `)
    .all();

  return rows.map((row) => row.roast);
}

export function listProducts({ search = '', roast = 'all' } = {}) {
  const filters = [];
  const values = [];

  if (search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    filters.push('(lower(name) LIKE ? OR lower(origin) LIKE ? OR lower(description) LIKE ?)');
    values.push(term, term, term);
  }

  if (roast && roast !== 'all') {
    filters.push('roast = ?');
    values.push(roast);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const rows = db
    .prepare(`
      SELECT *
      FROM products
      ${whereClause}
      ORDER BY featured DESC, rating DESC, name ASC
    `)
    .all(...values);

  return rows.map(parseProduct);
}

export function getHealth() {
  const row = countHealthStmt.get();

  return {
    status: 'ok',
    database: 'sqlite',
    productCount: Number(row.products),
    orderCount: Number(row.orders),
  };
}

export function createOrder({ customer, items }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw httpError(400, 'Adicione ao menos um item ao pedido.');
  }

  const ids = [...new Set(items.map((item) => item.productId))];
  const placeholders = ids.map(() => '?').join(', ');
  const products = db
    .prepare(`SELECT * FROM products WHERE id IN (${placeholders})`)
    .all(...ids)
    .map(parseProduct);
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

  try {
    db.exec('BEGIN');

    insertOrderStmt.run(
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
    );

    const orderId = Number(db.prepare('SELECT last_insert_rowid() AS id').get().id);

    for (const item of orderItems) {
      insertOrderItemStmt.run(
        orderId,
        item.productId,
        item.name,
        item.unitPrice,
        item.quantity,
        item.lineTotal,
      );
    }

    db.exec('COMMIT');
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Ignore rollback failures after a failed transaction.
    }

    throw error;
  }

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
}

export function getOrderByNumber(orderNumber) {
  const order = findOrderStmt.get(orderNumber);

  if (!order) {
    return null;
  }

  const items = findOrderItemsStmt.all(order.id);

  return {
    orderNumber: order.order_number,
    createdAt: order.created_at,
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
