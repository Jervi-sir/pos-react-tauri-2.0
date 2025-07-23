import { runSql } from "../runSql"; // adjust if file is elsewhere
import { schemaStatements } from "./schema";

export async function initDatabase() {
  for (const sql of schemaStatements) {
    await runSql(sql);
  }
}
