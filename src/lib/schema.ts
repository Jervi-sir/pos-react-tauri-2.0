// schema.ts
const enableForeignKeys = `
  PRAGMA foreign_keys = ON;
`;

const users = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255) NOT NULL, -- Store hashed password
    role TEXT NOT NULL DEFAULT 'cashier' CHECK (role IN ('owner', 'cashier', 'admin', 'jervi')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

const suppliers = `
  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    contact_info TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

const categories = `
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

const products = `
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    barcode VARCHAR(255) NOT NULL,
    price_unit DECIMAL(10,2) NOT NULL,
    image_base64 TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );
`;

const purchases = `
  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER,
    user_id INTEGER,
    total_price DECIMAL(10,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`;

const sales = `
  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`;

const invoices = `
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    sale_id INTEGER,
    purchase_id INTEGER,
    invoice_type TEXT NOT NULL CHECK (invoice_type IN ('sold', 'bought')),
    amount DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (purchase_id) REFERENCES purchases(id),
    CHECK ((invoice_type = 'sold' AND sale_id IS NOT NULL AND purchase_id IS NULL) OR 
           (invoice_type = 'bought' AND purchase_id IS NOT NULL AND sale_id IS NULL))
  );
`;

const stock_entries = `
  CREATE TABLE IF NOT EXISTS stock_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    invoice_id INTEGER,
    quantity INTEGER NOT NULL,
    purchase_price DECIMAL(10,2),
    entry_type TEXT NOT NULL CHECK (entry_type IN ('purchase', 'manual', 'correction', 'return')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
  );
`;

const sale_products = `
  CREATE TABLE IF NOT EXISTS sale_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price_unit DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`;

const store_info = `
  CREATE TABLE IF NOT EXISTS store_info (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    tax_id TEXT,
    currency TEXT DEFAULT 'DZD',
    logo_base64 TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

const index_users_email = `
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`;

const index_products_barcode = `
  CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
`;

const index_sales_created_at = `
  CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
`;

const index_stock_entries_product_id = `
  CREATE INDEX IF NOT EXISTS idx_stock_entries_product_id ON stock_entries(product_id);
`;

const index_sale_products_product_id = `
  CREATE INDEX IF NOT EXISTS idx_sale_products_product_id ON sale_products(product_id);
`;

const index_products_category_id = `
  CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
`;
const index_products_name = `
  CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
`;
const index_stock_entries_product_id_quantity = `
  CREATE INDEX IF NOT EXISTS idx_stock_entries_product_id_quantity ON stock_entries(product_id, quantity);
`;
const index_sale_products_product_id_quantity = `
  CREATE INDEX IF NOT EXISTS idx_sale_products_product_id_quantity ON sale_products(product_id, quantity);
`;
const index_products_sort_fields = `
  CREATE INDEX IF NOT EXISTS idx_products_sort_fields ON products(name, barcode, price_unit);
`;



const insert_users = `
  INSERT INTO users (name, email, password, role, created_at, updated_at)
  SELECT 'Admin', 'gacembekhira@gmail.com', 'password', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'gacembekhira@gmail.com'
  );
`;

const insert_store_info = `
  INSERT OR IGNORE INTO store_info (id, name, address, phone, email, tax_id, currency, logo_base64)
  VALUES (1, 'Default Store', '', '', '', '', 'DZD', '');
`;

export const schemaStatements = [
  enableForeignKeys,
  users,
  suppliers,
  categories,
  products,
  purchases,
  sales,
  invoices,
  stock_entries,
  sale_products,
  store_info,
  index_users_email,
  index_products_barcode,
  index_sales_created_at,
  index_stock_entries_product_id,
  index_sale_products_product_id,
  index_products_category_id,
  index_products_name,
  index_stock_entries_product_id_quantity,
  index_sale_products_product_id_quantity,
  index_products_sort_fields,
  insert_users,
  insert_store_info,
];