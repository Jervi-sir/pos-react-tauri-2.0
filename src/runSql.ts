import { invoke } from "@tauri-apps/api/core";

export async function runSql(query: string) {
  // The name "run_sql" must match your #[tauri::command] function name in Rust!
  return await invoke("run_sql", { query });
}
