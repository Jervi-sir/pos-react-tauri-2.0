export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id                  INTEGER PRIMARY KEY,
    name                TEXT,
    email               TEXT,
    password            TEXT,
    password_plain_text TEXT,
    role                TEXT CHECK(role IN ('owner', 'cashier', 'admin')),
    created_at          TEXT,
    updated_at          TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS invoices (
    id           INTEGER PRIMARY KEY,
    invoice_type TEXT CHECK(invoice_type IN ('sale', 'stock_purchase')),
    amount       TEXT,
    created_at   TEXT,
    updated_at   TEXT,
    created_by   INTEGER NOT NULL,
    FOREIGN KEY(created_by) REFERENCES users(id)
  );`,
  `CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY,
    category_id INTEGER NOT NULL,
    name        TEXT NOT NULL,
    barcode     TEXT NOT NULL,
    image_base64   TEXT,
    price_unit  REAL NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    FOREIGN KEY(category_id) REFERENCES categories(id)
  );`,
  `CREATE TABLE IF NOT EXISTS stock_entries (
    id             INTEGER PRIMARY KEY,
    product_id     INTEGER,
    quantity       INTEGER,
    purchase_price REAL,
    supplier       TEXT,
    added_by       INTEGER NOT NULL,
    created_at     TEXT,
    updated_at     TEXT,
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(added_by) REFERENCES users(id)
  );`,
  `CREATE TABLE IF NOT EXISTS sales (
    id          INTEGER PRIMARY KEY,
    sold_by     INTEGER NOT NULL,
    total_price REAL,
    created_at  TEXT,
    updated_at  TEXT,
    FOREIGN KEY(sold_by) REFERENCES users(id)
  );`,
  `CREATE TABLE IF NOT EXISTS product_images (
    id         INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL,
    image_base64  TEXT,
    created_at TEXT,
    FOREIGN KEY(product_id) REFERENCES products(id)
  );`,
  `CREATE TABLE IF NOT EXISTS categories (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS sale_items (
    id         INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL,
    sale_id    INTEGER NOT NULL,
    quantity   INTEGER NOT NULL,
    price_unit REAL NOT NULL,
    subtotal   REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(sale_id) REFERENCES sales(id)
  );`,
  `INSERT INTO users (name, email, password, password_plain_text, role, created_at, updated_at)
   SELECT 'Admin', 'gacembekhira@gmail.com', 'password', 'password', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
   WHERE NOT EXISTS (
     SELECT 1 FROM users WHERE email = 'gacembekhira@gmail.com'
   );`,
   `CREATE TABLE IF NOT EXISTS store_info (
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
  );`,
  `INSERT OR IGNORE INTO store_info (id, name, address, phone, email, tax_id, currency, logo_base64)
  VALUES (1, '', '', '', '', '', 'DZD', '');`
];
