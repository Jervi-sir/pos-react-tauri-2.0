import { runSql } from "../runSql"; // Adjust path as needed
import { schemaStatements } from "./schema";

export async function initDatabase() {
  try {
    // Begin a transaction
    await runSql("BEGIN TRANSACTION");
    for (const sql of schemaStatements) {
      try {
        await runSql(sql.trim()); // Trim to remove extra whitespace
      } catch (error) {
        console.error(`Error executing SQL: ${sql.substring(0, 50)}...`, error);
        throw error; // Rethrow to trigger rollback
      }
    }

    // Commit the transaction
    await runSql("COMMIT");
    console.log("Database initialized successfully");
  } catch (error) {
    // Rollback on error
    try {
      await runSql("ROLLBACK");
    } catch (rollbackError) {
      console.error("Error during rollback:", rollbackError);
    }
    throw new Error(`Failed to initialize database: ${error}`);
  }
}