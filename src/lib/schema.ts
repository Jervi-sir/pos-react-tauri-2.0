// schema.ts
const enableForeignKeys = `
  PRAGMA foreign_keys = ON;
`;
const users = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cashier' CHECK (role IN ('owner', 'cashier', 'admin', 'jervi')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;
const productCategories = `
  CREATE TABLE IF NOT EXISTS product_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;
const products = `
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    barcode TEXT UNIQUE,
    current_price_unit REAL NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 0,
    image_path TEXT,
    category_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE CASCADE
  );
`;
const invoices = `
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_type TEXT NOT NULL CHECK (invoice_type IN ('sold', 'bought')),
    total_quantity INTEGER NOT NULL DEFAULT 0,
    total_price REAL NOT NULL DEFAULT 0,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );
`;
const soldProducts = `
  CREATE TABLE IF NOT EXISTS sold_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    invoice_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    total_price REAL NOT NULL,
    price_unit REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
  );
`;
const historyProductEntries = `
  CREATE TABLE IF NOT EXISTS history_product_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    invoice_id INTEGER,
    quantity INTEGER NOT NULL,
    purchase_price REAL NOT NULL,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('purchase', 'manual', 'correction', 'return')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
  );
`;
const storeInfo = `
  CREATE TABLE IF NOT EXISTS store_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    tax_id TEXT,
    logo_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;
const indexes0 = `
  CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
`;
const index1 = `
  CREATE INDEX IF NOT EXISTS idx_sold_products_product_id ON sold_products(product_id);
`;
const index2 = `
  CREATE INDEX IF NOT EXISTS idx_sold_products_invoice_id ON sold_products(invoice_id);
`;
const index3 = `
  CREATE INDEX IF NOT EXISTS idx_history_entries_product_id ON history_product_entries(product_id);
`;
const index4 = `
  CREATE INDEX IF NOT EXISTS idx_history_entries_invoice_id ON history_product_entries(invoice_id);
`;
const index5 = `
  CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
`;
const index6 = `
  CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
`;

const insert_users = `
  INSERT INTO users (name, email, password, role, created_at, updated_at)
  SELECT 'Admin', 'jervi@gmail.com', 'password', 'jervi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'jervi@gmail.com'
  );
`;
const insert_users2 = `
  INSERT INTO users (name, email, password, role, created_at, updated_at)
  SELECT 'Admin', 'gacembekhira@gmail.com', 'password', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'gacembekhira@gmail.com'
  );
`;

export const schemaStatements = [
  enableForeignKeys,
  users,
  productCategories,
  products,
  invoices,
  soldProducts,
  historyProductEntries,
  storeInfo,
  indexes0,
  index1,
  index2,
  index3,
  index4,
  index5,
  index6,
  insert_users,
  insert_users2,
];