import { invoke } from "@tauri-apps/api/core";

export async function runSql(query: string) {
  return await invoke("run_sql", { query });
}

