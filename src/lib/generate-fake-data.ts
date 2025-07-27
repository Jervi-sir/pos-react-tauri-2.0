import { invoke } from "@tauri-apps/api/core";
import { faker } from '@faker-js/faker';

// Function to execute SQL query using Tauri's runSql
async function runSql(query: string): Promise<any> {
  try {
    return await invoke("run_sql", { query });
  } catch (error) {
    console.error(`Error executing query: ${query}`, error);
    throw error;
  }
}

// Function to generate random barcode
function generateBarcode(): string {
  return faker.string.numeric(12); // Generates a 12-digit barcode
}

// Helper function to escape single quotes in SQL values
function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

// Seeder function
export async function seedDatabase() {
  try {
    // Enable foreign keys
    await runSql('PRAGMA foreign_keys = ON;');
    console.log('Enabled foreign keys');

    // Seed users (10 users)
    const userRoles = ['owner', 'cashier', 'admin', 'jervi'];
    const userIds: number[] = [];
    for (let i = 0; i < 10; i++) {
      const email = i === 0 ? 'gacembekhira@gmail.com' : faker.internet.email();
      const role = i === 0 ? 'admin' : faker.helpers.arrayElement(userRoles);
      const name = escapeSqlString(faker.person.fullName());
      const password = escapeSqlString(faker.internet.password());
      const query = `
        INSERT OR IGNORE INTO users (name, email, password, role, created_at, updated_at)
        VALUES ('${name}', '${email}', '${password}', '${role}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      `;
      await runSql(query);
      // Fetch the user ID
      const userResult = await runSql(`SELECT id FROM users WHERE email = '${email}';`);
      if (userResult && userResult.length > 0) {
        userIds.push(userResult[0].id);
      }
    }
    console.log('Seeded 10 users');

    // Seed store_info (1 record)
    const storeName = escapeSqlString('Default Store');
    const address = escapeSqlString(faker.location.streetAddress());
    const phone = escapeSqlString(faker.phone.number());
    const email = escapeSqlString(faker.internet.email());
    const taxId = escapeSqlString(faker.finance.bic());
    const logoPath = escapeSqlString('/path/to/logo.png');
    await runSql(`
      INSERT OR IGNORE INTO store_info (id, name, address, phone, email, tax_id, logo_path, created_at, updated_at)
      VALUES (1, '${storeName}', '${address}', '${phone}', '${email}', '${taxId}', '${logoPath}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    `);
    console.log('Seeded store_info');

    // Seed product_categories (20 categories)
    const categoryIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const name = escapeSqlString(faker.commerce.department());
      await runSql(`
        INSERT INTO product_categories (name, created_at, updated_at)
        VALUES ('${name}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      `);
      // Fetch the category ID
      const categoryResult = await runSql(`SELECT id FROM product_categories WHERE name = '${name}';`);
      if (categoryResult && categoryResult.length > 0) {
        categoryIds.push(categoryResult[0].id);
      }
    }
    console.log('Seeded 20 product categories');

    // Seed products (300 products)
    const productIds: { id: number; price: number }[] = [];
    for (let i = 0; i < 300; i++) {
      const name = escapeSqlString(faker.commerce.productName());
      const barcode = generateBarcode();
          // @ts-ignore
      const price = faker.number.float({ min: 1, max: 100, precision: 2 });
      const quantity = faker.number.int({ min: 0, max: 1000 });
      const imagePath = escapeSqlString(`/images/products/${faker.string.uuid()}.jpg`);
      const categoryId = faker.helpers.arrayElement(categoryIds);
      await runSql(`
        INSERT INTO products (name, barcode, current_price_unit, quantity, image_path, category_id, created_at, updated_at)
        VALUES ('${name}', '${barcode}', ${price}, ${quantity}, '${imagePath}', ${categoryId}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      `);
      // Fetch the product ID and price
      const productResult = await runSql(`SELECT id, current_price_unit FROM products WHERE barcode = '${barcode}';`);
      if (productResult && productResult.length > 0) {
        productIds.push({ id: productResult[0].id, price: productResult[0].current_price_unit });
      }
    }
    console.log('Seeded 300 products');

    // Seed invoices (500 invoices, mix of 'sold' and 'bought')
    for (let i = 0; i < 500; i++) {
      const invoiceType = faker.helpers.arrayElement(['sold', 'bought']);
      const userId = faker.helpers.arrayElement(userIds);
      const totalQuantity = faker.number.int({ min: 1, max: 50 });
          // @ts-ignore
      const totalPrice = faker.number.float({ min: 10, max: 1000, precision: 2 });

      // Insert invoice
      const invoiceQuery = `
        INSERT INTO invoices (invoice_type, total_quantity, total_price, user_id, created_at, updated_at)
        VALUES ('${invoiceType}', ${totalQuantity}, ${totalPrice}, ${userId}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      `;
      await runSql(invoiceQuery);
      // Fetch the invoice ID (SQLite's last_insert_rowid())
      const invoiceResult = await runSql('SELECT last_insert_rowid() AS id;');
      const invoiceId = invoiceResult[0].id;

      if (invoiceType === 'sold') {
        // Seed sold_products (1-5 products per sold invoice)
        const numSoldProducts = faker.number.int({ min: 1, max: 5 });
        for (let j = 0; j < numSoldProducts; j++) {
          const product = faker.helpers.arrayElement(productIds);
          const quantity = faker.number.int({ min: 1, max: 10 });
          const priceUnit = product.price;
          const totalPriceProduct = quantity * priceUnit;

          await runSql(`
            INSERT INTO sold_products (product_id, invoice_id, quantity, total_price, price_unit, created_at, updated_at)
            VALUES (${product.id}, ${invoiceId}, ${quantity}, ${totalPriceProduct}, ${priceUnit}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
          `);
        }
      } else {
        // Seed history_product_entries (1-5 entries per bought invoice)
        const numEntries = faker.number.int({ min: 1, max: 5 });
        for (let j = 0; j < numEntries; j++) {
          const product = faker.helpers.arrayElement(productIds);
          const quantity = faker.number.int({ min: 1, max: 20 });
          // @ts-ignore
          const purchasePrice = faker.number.float({ min: 0.5, max: product.price, precision: 2 });
          const entryType = faker.helpers.arrayElement(['purchase', 'manual', 'correction', 'return']);

          await runSql(`
            INSERT INTO history_product_entries (product_id, invoice_id, quantity, purchase_price, entry_type, created_at, updated_at)
            VALUES (${product.id}, ${invoiceId}, ${quantity}, ${purchasePrice}, '${entryType}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
          `);
        }
      }
    }
    console.log('Seeded 500 invoices with sold_products and history_product_entries');

    console.log('Database seeding completed!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}