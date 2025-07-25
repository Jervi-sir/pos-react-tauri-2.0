import { faker } from '@faker-js/faker';
import { schemaStatements } from './schema'; // Adjust path to your schema file
import { runSql } from '@/runSql';

// Helper function to execute SQL queries with error handling
async function executeQuery(query: string) {
  try {
    await runSql(query);
    console.log('Query executed successfully');
  } catch (error) {
    console.error('Error executing query:', query, error);
    throw error;
  }
}

// Helper to generate random number within range
const randomInt = (min: number, max: number) => 
  Math.floor(Math.random() * (max - min + 1)) + min;

// Main function to generate fake data
export async function generateFakeData() {
  try {
    // First, ensure schema is applied
    for (const statement of schemaStatements) {
      await executeQuery(statement);
    }

    // Generate Users (10 users: 1 admin (already inserted), 2 owners, 3 cashiers, 4 jervis)
    const userRoles = ['owner', 'owner', 'cashier', 'cashier', 'cashier', 'jervi', 'jervi', 'jervi', 'jervi'];
    for (const role of userRoles) {
      const email = faker.internet.email();
      const query = `
        INSERT INTO users (name, email, password, role)
        VALUES ('${faker.person.fullName()}', '${email}', 'hashed_${faker.internet.password()}', '${role}');
      `;
      await executeQuery(query);
    }

    // Generate Suppliers (20 suppliers)
    for (let i = 0; i < 20; i++) {
      const query = `
        INSERT INTO suppliers (name, contact_info)
        VALUES ('${faker.company.name()}', '${faker.phone.number()} | ${faker.internet.email()}');
      `;
      await executeQuery(query);
    }

    // Generate Categories (15 categories)
    const categories = [
      'Electronics', 'Clothing', 'Food & Beverages', 'Home & Garden', 'Sports',
      'Beauty', 'Toys', 'Books', 'Automotive', 'Jewelry',
      'Furniture', 'Appliances', 'Tools', 'Pet Supplies', 'Office Supplies'
    ];
    for (const category of categories) {
      const query = `
        INSERT INTO categories (name)
        VALUES ('${category}');
      `;
      await executeQuery(query);
    }

    // Generate Products (300 products)
    for (let i = 0; i < 300; i++) {
      const categoryId = randomInt(1, 15);
      const query = `
        INSERT INTO products (category_id, name, barcode, image_base64, price_unit, current_stock)
        VALUES (
          ${categoryId},
          '${faker.commerce.productName()}',
          '${faker.string.uuid()}',
          '${faker.image.dataUri({ width: 200, height: 200 })}',
          ${faker.commerce.price({ min: 1, max: 1000, dec: 2 })},
          ${randomInt(0, 100)}
        );
      `;
      await executeQuery(query);
    }

    // Generate Purchases (50 purchases)
    for (let i = 0; i < 50; i++) {
      const supplierId = randomInt(1, 20);
      const userId = randomInt(1, 10);
      const totalPrice = faker.commerce.price({ min: 100, max: 5000, dec: 2 });
      const query = `
        INSERT INTO purchases (supplier_id, user_id, total_price)
        VALUES (${supplierId}, ${userId}, ${totalPrice});
      `;
      await executeQuery(query);
    }

    // Generate Sales (100 sales)
    for (let i = 0; i < 100; i++) {
      const userId = randomInt(1, 10);
      const totalPrice = faker.commerce.price({ min: 10, max: 1000, dec: 2 });
      const query = `
        INSERT INTO sales (user_id, total_price)
        VALUES (${userId}, ${totalPrice});
      `;
      await executeQuery(query);
    }

    // Generate Invoices (50 purchase invoices + 100 sale invoices)
    // Purchase invoices
    for (let i = 1; i <= 50; i++) {
      const userId = randomInt(1, 10);
      const amount = faker.commerce.price({ min: 100, max: 5000, dec: 2 });
      const query = `
        INSERT INTO invoices (user_id, purchase_id, invoice_type, amount)
        VALUES (${userId}, ${i}, 'bought', ${amount});
      `;
      await executeQuery(query);
    }

    // Sale invoices
    for (let i = 1; i <= 100; i++) {
      const userId = randomInt(1, 10);
      const amount = faker.commerce.price({ min: 10, max: 1000, dec: 2 });
      const query = `
        INSERT INTO invoices (user_id, sale_id, invoice_type, amount)
        VALUES (${userId}, ${i}, 'sold', ${amount});
      `;
      await executeQuery(query);
    }

    // Generate Stock Entries (200 entries)
    for (let i = 0; i < 200; i++) {
      const productId = randomInt(1, 300);
      const invoiceId = randomInt(1, 150);
      const entryTypes = ['purchase', 'manual', 'correction', 'return'];
      const entryType = entryTypes[randomInt(0, 3)];
      const query = `
        INSERT INTO stock_entries (product_id, invoice_id, quantity, purchase_price, entry_type)
        VALUES (
          ${productId},
          ${invoiceId},
          ${randomInt(1, 50)},
          ${faker.commerce.price({ min: 1, max: 500, dec: 2 })},
          '${entryType}'
        );
      `;
      await executeQuery(query);
    }

    // Generate Sale Products (300 sale products)
    for (let i = 0; i < 300; i++) {
      const saleId = randomInt(1, 100);
      const productId = randomInt(1, 300);
      const query = `
        INSERT INTO sale_products (sale_id, product_id, quantity, price_unit)
        VALUES (
          ${saleId},
          ${productId},
          ${randomInt(1, 10)},
          ${faker.commerce.price({ min: 1, max: 1000, dec: 2 })}
        );
      `;
      await executeQuery(query);
    }

    // Update store_info with more realistic data
    const updateStoreQuery = `
      UPDATE store_info
      SET 
        name = '${faker.company.name()} Store',
        address = '${faker.location.streetAddress()}',
        phone = '${faker.phone.number()}',
        email = '${faker.internet.email()}',
        tax_id = '${faker.finance.bic()}'
      WHERE id = 1;
    `;
    await executeQuery(updateStoreQuery);

    console.log('Fake data generation completed successfully!');
  } catch (error) {
    console.error('Error generating fake data:', error);
    throw error;
  }
}