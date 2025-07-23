use rusqlite::{Connection, Result};
use std::path::PathBuf;
use dirs_next::document_dir;

pub fn get_connection() -> Result<Connection> {
    let mut db_path: PathBuf = document_dir()
        .expect("Could not get user's document dir")
        .join("pos");

    // Ensure directory exists
    std::fs::create_dir_all(&db_path).expect("Failed to create pos directory");

    db_path.push("app_data.sqlite3");

    Connection::open(db_path)
}

// use rusqlite::{Connection, Result};

// pub fn get_connection() -> Result<Connection> {
//     Connection::open("../app_data.sqlite3")
// }
