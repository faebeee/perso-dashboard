//! Native app behaviour: the menu-bar (tray) icon, keeping the app alive in
//! the background when its window is closed, and bringing it back.
//!
//! The tray's content (urgent count + items) is set from TypeScript via the
//! tray/menu APIs (`src/platform/tauri/desktop.ts`); Rust only creates the
//! icon with a minimal fallback menu.

use tauri::image::Image;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Manager, Runtime, Window, WindowEvent};

/// Looked up from TypeScript with `TrayIcon.getById`.
pub const TRAY_ID: &str = "main";
const MAIN_WINDOW: &str = "main";

pub fn setup_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Open Dashboard", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &PredefinedMenuItem::separator(app)?, &quit])?;

    TrayIconBuilder::with_id(TRAY_ID)
        .icon(Image::from_bytes(include_bytes!("../icons/tray-icon.png"))?)
        .icon_as_template(true)
        .tooltip("Productivity Dashboard")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open" => show_main_window(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;
    Ok(())
}

/// Closing the window hides it; the app keeps running in the menu bar so
/// badges and notifications stay live. Quit with ⌘Q or from the tray.
pub fn on_window_event<R: Runtime>(window: &Window<R>, event: &WindowEvent) {
    if let WindowEvent::CloseRequested { api, .. } = event {
        if window.label() == MAIN_WINDOW {
            api.prevent_close();
            let _ = window.hide();
        }
    }
}

pub fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// Shows and focuses the main window (tray menu items built in TypeScript).
#[tauri::command]
pub fn show_window(app: AppHandle) {
    show_main_window(&app);
}

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}
