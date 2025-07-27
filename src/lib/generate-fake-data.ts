import { faker } from '@faker-js/faker';
import { runSql } from '@/runSql';

async function seedDatabase() {
  try {
    // Enable foreign keys
    await runSql('PRAGMA foreign_keys = ON;');
    console.log('Foreign keys enabled');

    // Insert additional users (beyond the default ones in schema)
    const roles = ['owner', 'cashier', 'admin', 'jervi'];
    for (let i = 0; i < 10; i++) {
      const name = faker.person.fullName().replace(/'/g, "''"); // Escape single quotes
      const email = faker.internet.email().replace(/'/g, "''");
      const password = faker.internet.password().replace(/'/g, "''");
      const role = roles[Math.floor(Math.random() * roles.length)];
      const timestamp = new Date().toISOString();
      const query = `
        INSERT INTO users (name, email, password, role, created_at, updated_at)
        VALUES ('${name}', '${email}', '${password}', '${role}', '${timestamp}', '${timestamp}');
      `;
      await runSql(query);
      console.log(`Inserted user: ${email}`);
    }

    // Insert product categories
    const categories = Array.from({ length: 20 }, () => faker.commerce.department());
    for (const category of categories) {
      const name = category.replace(/'/g, "''");
      const timestamp = new Date().toISOString();
      const query = `
        INSERT INTO product_categories (name, created_at, updated_at)
        VALUES ('${name}', '${timestamp}', '${timestamp}');
      `;
      await runSql(query);
      console.log(`Inserted category: ${name}`);
    }

    // Get category IDs (run a SELECT query and assume we store results)
    // Note: Since runSql doesn't return results, we'll insert products assuming categories exist
    // In a real app, you might need a separate query to fetch IDs if required

    // Insert products (400)
    for (let i = 0; i < 400; i++) {
      const name = faker.commerce.productName().replace(/'/g, "''");
      const barcode = faker.string.uuid();
      const currentPriceUnit = parseFloat(faker.commerce.price({ min: 1, max: 100, dec: 2 }));
      const originalBoughtPrice = parseFloat(faker.commerce.price({ min: 0.5, max: 80, dec: 2 }));
      const quantity = faker.number.int({ min: 10, max: 1000 });
      const imagePath = faker.image.urlPlaceholder({ width: 200, height: 200 }).replace(/'/g, "''");
      const categoryId = Math.floor(Math.random() * 20) + 1; // Assuming 20 categories (IDs 1-20)
      const timestamp = new Date().toISOString();
      const query = `
        INSERT INTO products (name, barcode, current_price_unit, original_bought_price, quantity, image_path, category_id, created_at, updated_at)
        VALUES ('${name}', '${barcode}', ${currentPriceUnit}, ${originalBoughtPrice}, ${quantity}, '${imagePath}', ${categoryId}, '${timestamp}', '${timestamp}');
      `;
      await runSql(query);
      console.log(`Inserted product: ${name}`);
    }

    // Get user IDs and product IDs
    // Since runSql doesn't return results, we'll assume user IDs 1-12 (2 from schema + 10 new) and product IDs 1-400
    // In a real app, you might need to fetch these IDs separately if your backend supports it

    // Insert invoices (50)
    for (let i = 0; i < 50; i++) {
      const invoiceType = faker.helpers.arrayElement(['sold', 'bought']);
      const totalQuantity = faker.number.int({ min: 1, max: 50 });
      const totalPrice = parseFloat(faker.commerce.price({ min: 10, max: 1000, dec: 2 }));
      const totalOriginalBoughtPrice = parseFloat(faker.commerce.price({ min: 5, max: 800, dec: 2 }));
      const userId = Math.floor(Math.random() * 12) + 1; // Assuming 12 users
      const timestamp = new Date().toISOString();
      const query = `
        INSERT INTO invoices (invoice_type, total_quantity, total_price, total_original_bought_price, user_id, created_at, updated_at)
        VALUES ('${invoiceType}', ${totalQuantity}, ${totalPrice}, ${totalOriginalBoughtPrice}, ${userId}, '${timestamp}', '${timestamp}');
      `;
      await runSql(query);
      console.log(`Inserted invoice: ${invoiceType}`);
    }

    // Insert sold products (200)
    for (let i = 0; i < 200; i++) {
      const productId = Math.floor(Math.random() * 400) + 1; // Assuming 400 products
      const invoiceId = Math.floor(Math.random() * 50) + 1; // Assuming 50 invoices
      const quantity = faker.number.int({ min: 1, max: 20 });
      const priceUnit = parseFloat(faker.commerce.price({ min: 1, max: 100, dec: 2 }));
      const originalBoughtPrice = parseFloat(faker.commerce.price({ min: 0.5, max: 80, dec: 2 }));
      const totalPrice = quantity * priceUnit;
      const totalOriginalBoughtPrice = quantity * originalBoughtPrice;
      const timestamp = new Date().toISOString();
      const query = `
        INSERT INTO sold_products (product_id, invoice_id, quantity, total_price, price_unit, original_bought_price, total_original_bought_price, created_at, updated_at)
        VALUES (${productId}, ${invoiceId}, ${quantity}, ${totalPrice}, ${priceUnit}, ${originalBoughtPrice}, ${totalOriginalBoughtPrice}, '${timestamp}', '${timestamp}');
      `;
      await runSql(query);
      console.log(`Inserted sold product: product_id ${productId}`);
    }

    // Insert history product entries (300)
    const entryTypes = ['purchase', 'manual', 'correction', 'return'];
    for (let i = 0; i < 300; i++) {
      const productId = Math.floor(Math.random() * 400) + 1;
      const invoiceId = Math.random() > 0.5 ? Math.floor(Math.random() * 50) + 1 : null;
      const quantity = faker.number.int({ min: 1, max: 100 });
      const purchasePrice = parseFloat(faker.commerce.price({ min: 1, max: 100, dec: 2 }));
      const originalBoughtPrice = parseFloat(faker.commerce.price({ min: 0.5, max: 80, dec: 2 }));
      const entryType = entryTypes[Math.floor(Math.random() * entryTypes.length)];
      const timestamp = new Date().toISOString();
      const invoiceIdValue = invoiceId ? invoiceId : 'NULL';
      const query = `
        INSERT INTO history_product_entries (product_id, invoice_id, quantity, purchase_price, original_bought_price, entry_type, created_at, updated_at)
        VALUES (${productId}, ${invoiceIdValue}, ${quantity}, ${purchasePrice}, ${originalBoughtPrice}, '${entryType}', '${timestamp}', '${timestamp}');
      `;
      await runSql(query);
      console.log(`Inserted history entry: product_id ${productId}`);
    }

    // Insert store info (1 entry)
    const storeName = faker.company.name().replace(/'/g, "''");
    const address = faker.location.streetAddress().replace(/'/g, "''");
    const phone = faker.phone.number().replace(/'/g, "''");
    const email = faker.internet.email().replace(/'/g, "''");
    const taxId = faker.string.alphanumeric(10);
    const logoPath = faker.image.urlPlaceholder({ width: 300, height: 100 }).replace(/'/g, "''");
    const timestamp = new Date().toISOString();
    const storeQuery = `
      INSERT INTO store_info (name, address, phone, email, tax_id, logo_path, created_at, updated_at)
      VALUES ('${storeName}', '${address}', '${phone}', '${email}', '${taxId}', '${logoPath}', '${timestamp}', '${timestamp}');
    `;
    await runSql(storeQuery);
    console.log('Inserted store info');

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

// Export the function to use in your React components
export default seedDatabase;