//! Native shell. Kept deliberately thin: all product logic (integrations,
//! OAuth token handling, storage schema, what goes in the tray) lives in
//! TypeScript under `src/`. Rust only provides what a webview can't do itself.

mod desktop;
mod oauth_loopback;
mod secrets;

use tauri_plugin_autostart::MacosLauncher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        // Must be first: a second launch focuses the running app instead.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            desktop::show_main_window(app);
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .manage(oauth_loopback::LoopbackState::default())
        .setup(|app| {
            desktop::setup_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(desktop::on_window_event)
        .invoke_handler(tauri::generate_handler![
            secrets::encryption_key,
            oauth_loopback::oauth_authorize,
            oauth_loopback::oauth_cancel,
            desktop::show_window,
            desktop::quit_app,
        ])
        .build(tauri::generate_context!())
        .expect("error while building the application");

    app.run(|_app, _event| {
        // Clicking the Dock icon while the window is hidden brings it back.
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Reopen {
            has_visible_windows: false,
            ..
        } = _event
        {
            desktop::show_main_window(_app);
        }
    });
}
