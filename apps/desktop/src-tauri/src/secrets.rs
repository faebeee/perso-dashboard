//! The key that encrypts OAuth tokens and client secrets in SQLite. It lives
//! in the OS credential store (macOS Keychain, Windows Credential Manager,
//! Secret Service on Linux), never next to the database.

use base64::{engine::general_purpose::STANDARD, Engine};
use tauri::AppHandle;

const KEY_NAME: &str = "token-encryption-key";

/// Returns the base64 key, creating and storing a random one on first use.
#[tauri::command]
pub async fn encryption_key(app: AppHandle) -> Result<String, String> {
    let service = app.config().identifier.clone();
    tauri::async_runtime::spawn_blocking(move || load_or_create(&service))
        .await
        .map_err(|e| e.to_string())?
}

fn load_or_create(service: &str) -> Result<String, String> {
    let entry = keyring::Entry::new(service, KEY_NAME).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(key) => Ok(key),
        Err(keyring::Error::NoEntry) => {
            let mut bytes = [0u8; 32];
            getrandom::fill(&mut bytes).map_err(|e| e.to_string())?;
            let key = STANDARD.encode(bytes);
            entry.set_password(&key).map_err(|e| e.to_string())?;
            Ok(key)
        }
        Err(e) => Err(format!("Could not read the encryption key from the OS keychain: {e}")),
    }
}
