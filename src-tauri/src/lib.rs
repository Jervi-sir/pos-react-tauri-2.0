mod sqlite;
use std::fs::{create_dir_all, File};
use std::io::Write;
use std::path::Path;
use dirs_next::document_dir;
use tauri::command;

#[tauri::command]
async fn run_sql(query: String) -> Result<serde_json::Value, String> {
    use serde_json::json;
    let conn = sqlite::get_connection().map_err(|e| format!("Connection error: {}", e))?;

    // Handle SELECT and PRAGMA queries
    if query.trim().to_lowercase().starts_with("select") || query.trim().to_lowercase().starts_with("pragma") {
        let mut stmt = conn.prepare(&query).map_err(|e| format!("Prepare error: {}", e))?;
        let column_count = stmt.column_count();

        // Collect column names
        let col_names: Vec<String> = (0..column_count)
            .map(|i| stmt.column_name(i).unwrap_or("").to_string())
            .collect();

        // Collect rows
        let rows = stmt
            .query_map([], |row| {
                let mut obj = serde_json::Map::new();
                for (i, key) in col_names.iter().enumerate() {
                    let val: rusqlite::types::Value = row.get(i)?;
                    obj.insert(key.clone(), rusqlite_value_to_json(val));
                }
                Ok(serde_json::Value::Object(obj))
            })
            .map_err(|e| format!("Query error: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Collect error: {}", e))?;

        // Ok(json!({"rows": rows}))
        Ok(json!(rows))
    } else {
        // Non-SELECT, non-PRAGMA: execute and return affected rows
        let affected = conn.execute(&query, []).map_err(|e| format!("Execute error: {}", e))?;
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
        Blob(_) => serde_json::Value::Null, // Blobs not supported in this context
    }
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[command]
fn save_image(file_name: String, data: Vec<u8>) -> Result<String, String> {
    // Get the Documents directory
    let documents_dir = document_dir().ok_or_else(|| "Failed to get Documents directory".to_string())?;
    let target_dir = documents_dir.join("pos").join("images");

    // Create the directory if it doesn't exist
    create_dir_all(&target_dir).map_err(|e| format!("Failed to create directory: {}", e))?;

    // Construct the full file path
    let file_path = target_dir.join(&file_name);
    let file_path_str = file_path.to_str().ok_or_else(|| "Invalid file path".to_string())?.to_string();

    // Write the file
    let mut file = File::create(&file_path).map_err(|e| format!("Failed to create file: {}", e))?;
    file.write_all(&data).map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(file_path_str)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, run_sql, save_image])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}