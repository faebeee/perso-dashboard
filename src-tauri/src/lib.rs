//! Native shell. Kept deliberately thin: all product logic (integrations,
//! OAuth token handling, storage schema) lives in TypeScript under `src/`.
//! Rust only provides what a webview can't do itself.

mod oauth_loopback;
mod secrets;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .manage(oauth_loopback::LoopbackState::default())
        .invoke_handler(tauri::generate_handler![
            secrets::encryption_key,
            oauth_loopback::oauth_authorize,
            oauth_loopback::oauth_cancel,
        ])
        .run(tauri::generate_context!())
        .expect("error while running the application");
}
