use rusqlite::{Connection, Result};
use std::path::PathBuf;
use dirs_next::document_dir;
use tauri::generate_context;

pub fn get_connection() -> Result<Connection> {
    // Get the identifier from tauri.conf.json and sanitize to "nvl-store"
    let config: tauri::Context<tauri::Wry> = generate_context!();
    // let app_name = config.config().identifier.split('.').last().unwrap_or("nvl-store");
    let app_name = &config.config().identifier; // e.g., "com.nvl-store.app"


    let mut db_path: PathBuf = document_dir()
        .expect("Could not get user's document dir")
        .join(app_name);

    std::fs::create_dir_all(&db_path).expect("Failed to create app directory");
    db_path.push("app_database.sqlite3");

    let conn = Connection::open(&db_path)?;
    conn.execute("PRAGMA foreign_keys = ON;", [])?; // Enable foreign keys
    Ok(conn)
}