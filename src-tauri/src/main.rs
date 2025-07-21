#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod sqlite;
fn main() {
    pos_react_tauri_lib::run()
}
