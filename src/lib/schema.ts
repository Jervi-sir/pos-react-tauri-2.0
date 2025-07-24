const users = `
  CREATE TABLE IF NOT EXISTS users (
    id                  INTEGER PRIMARY KEY,
    name                TEXT,
    email               TEXT,
    password            TEXT,
    password_plain_text TEXT,
    role                TEXT CHECK(role IN ('owner', 'cashier', 'admin', 'jervi')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`

const insert_users = `
  INSERT INTO users (name, email, password, password_plain_text, role, created_at, updated_at)
  SELECT 'Admin', 'gacembekhira@gmail.com', 'password', 'password', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM users WHERE email = 'gacembekhira@gmail.com'
    );`

const invoices = `
  CREATE TABLE IF NOT EXISTS invoices (
    id           INTEGER PRIMARY KEY,
    invoice_type TEXT CHECK(invoice_type IN ('sale', 'stock_purchase')),
    amount       TEXT,
    created_by   INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    FOREIGN KEY(created_by) REFERENCES users(id)
  );`;

const categories = `
  CREATE TABLE IF NOT EXISTS categories (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`

const products = `
  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY,
    category_id INTEGER NOT NULL,
    name        TEXT NOT NULL,
    barcode     TEXT NOT NULL,
    image_base64   TEXT,
    price_unit  REAL NOT NULL DEFAULT 0,
    quantity       INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    FOREIGN KEY(category_id) REFERENCES categories(id)
  );`

const sales = `
  CREATE TABLE IF NOT EXISTS sales (
    id          INTEGER PRIMARY KEY,
    sold_by     INTEGER NOT NULL,
    total_price REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    FOREIGN KEY(sold_by) REFERENCES users(id)
  );`

const sale_items = `
  CREATE TABLE IF NOT EXISTS sale_items (
    id         INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL,
    sale_id    INTEGER NOT NULL,
    quantity   INTEGER NOT NULL,
    price_unit REAL NOT NULL,
    subtotal   REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(sale_id) REFERENCES sales(id)
  );`

const store_info = `
  CREATE TABLE IF NOT EXISTS store_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    tax_id TEXT,
    currency TEXT DEFAULT 'DZD',
    logo_base64 TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`

const insert_store_info = `
  INSERT OR IGNORE INTO store_info (id, name, address, phone, email, tax_id, currency, logo_base64)
  VALUES (1, '', '', '', '', '', 'DZD', '');`

export const schemaStatements = [
  users,
  insert_users,
  invoices,
  categories,
  products,
  sales,
  sale_items,
  store_info,
  insert_store_info,
];

