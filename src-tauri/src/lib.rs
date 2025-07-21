// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod sqlite;

#[tauri::command]
async fn run_sql(query: String) -> Result<serde_json::Value, String> {
    use serde_json::json;
    let conn = sqlite::get_connection().map_err(|e| e.to_string())?;

    // Try as SELECT first: collect rows
    if query.trim().to_lowercase().starts_with("select") {
        let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
        let column_count = stmt.column_count();

        // Collect column names first!
        let col_names: Vec<String> = (0..column_count)
            .map(|i| stmt.column_name(i).unwrap_or("").to_string())
            .collect();

        let rows = stmt
            .query_map([], |row| {
                let mut obj = serde_json::Map::new();
                for (i, key) in col_names.iter().enumerate() {
                    let val: rusqlite::types::Value = row.get(i)?;
                    obj.insert(key.clone(), rusqlite_value_to_json(val));
                }
                Ok(serde_json::Value::Object(obj))
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        Ok(json!({"rows": rows}))
    } else {
        // Non-SELECT: just execute
        let affected = conn.execute(&query, []).map_err(|e| e.to_string())?;
        Ok(json!({"affected": affected}))
    }
}

// Helper to convert rusqlite::types::Value to serde_json::Value
fn rusqlite_value_to_json(val: rusqlite::types::Value) -> serde_json::Value {
    use rusqlite::types::Value::*;
    match val {
        Null => serde_json::Value::Null,
        Integer(i) => serde_json::Value::from(i),
        Real(f) => serde_json::Value::from(f),
        Text(s) => serde_json::Value::String(s),
        Blob(_) => serde_json::Value::Null, // Or handle blobs as you need
    }
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, run_sql])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

