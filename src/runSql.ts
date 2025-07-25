import { invoke } from "@tauri-apps/api/core";

export async function runSql(query: string, params: (string | number)[] = []) {
  return await invoke("run_sql", { query, params: params.map(String) });
}

