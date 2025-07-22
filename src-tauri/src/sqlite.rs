use rusqlite::{Connection, Result};

pub fn get_connection() -> Result<Connection> {
    Connection::open("../app_data.sqlite3")
}
