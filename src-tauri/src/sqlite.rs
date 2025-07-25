use rusqlite::{Connection, Result};
use std::path::PathBuf;
use dirs_next::document_dir;

pub fn get_connection() -> Result<Connection> {
    let mut db_path: PathBuf = document_dir()
        .expect("Could not get user's document dir")
        .join("pos");

    std::fs::create_dir_all(&db_path).expect("Failed to create pos directory");
    db_path.push("app_data.sqlite3");

    let conn = Connection::open(db_path)?;
    conn.execute("PRAGMA foreign_keys = ON;", [])?; // Enable foreign keys
    Ok(conn)
}