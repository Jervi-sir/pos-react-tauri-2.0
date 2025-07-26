import { runSql } from "../runSql"; // Adjust path as needed
import { schemaStatements } from "./schema";

export async function initDatabase() {
  try {
    for (const sql of schemaStatements) {
      try {
        await runSql(sql.trim()); // Trim to remove extra whitespace
      } catch (error) {
        console.error(`Error executing SQL: ${sql.substring(0, 50)}...`, error);
        throw new Error(`Failed to execute SQL statement: ${sql.substring(0, 50)}...`);
      }
    }
    console.log("Database initialized successfully");
  } catch (error) {
    throw new Error(`Failed to initialize database: ${error}`);
  }
}