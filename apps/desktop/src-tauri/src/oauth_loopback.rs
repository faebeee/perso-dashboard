//! Browser half of the OAuth flow for a desktop app (RFC 8252 §7.3).
//!
//! Opens the provider's authorization URL in the system browser and waits on
//! a short-lived listener at `127.0.0.1:<port>` for the redirect. It returns
//! the redirect URL as is: validating `state` and exchanging the code happen
//! in TypeScript (`src/platform/oauth/oauth-flow.ts`).

use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_opener::OpenerExt;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{oneshot, Mutex};

const MAX_REQUEST_BYTES: usize = 16 * 1024;
const REQUEST_READ_TIMEOUT: Duration = Duration::from_secs(5);
const MAX_TIMEOUT_SECS: u64 = 15 * 60;

const DONE_PAGE: &str = "<!doctype html><meta charset=utf-8><title>Signed in</title>\
<style>body{font:16px system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0}</style>\
<p>You can close this tab and return to the dashboard.</p>";

/// One authorization at a time. Starting a new one cancels the previous one.
#[derive(Default)]
pub struct LoopbackState {
    pending: Mutex<Option<(u64, oneshot::Sender<()>)>>,
    next_id: Mutex<u64>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "kind", content = "message", rename_all = "snake_case")]
pub enum AuthorizeError {
    Cancelled,
    Timeout,
    PortUnavailable(String),
    Browser(String),
    Io(String),
}

#[tauri::command]
pub async fn oauth_authorize(
    app: AppHandle,
    state: State<'_, LoopbackState>,
    url: String,
    port: u16,
    path: String,
    timeout_secs: u64,
) -> Result<String, AuthorizeError> {
    if !url.starts_with("https://") {
        return Err(AuthorizeError::Io("Authorization URL must use https".into()));
    }
    if !path.starts_with('/') || path.contains('?') {
        return Err(AuthorizeError::Io(format!("Invalid callback path {path:?}")));
    }

    let (id, cancelled) = register(&state).await;
    let result = async {
        let listener = bind(port).await?;
        app.opener()
            .open_url(&url, None::<&str>)
            .map_err(|e| AuthorizeError::Browser(e.to_string()))?;

        let timeout = Duration::from_secs(timeout_secs.clamp(1, MAX_TIMEOUT_SECS));
        tokio::select! {
            target = wait_for_callback(&listener, &path) => target,
            _ = cancelled => Err(AuthorizeError::Cancelled),
            _ = tokio::time::sleep(timeout) => Err(AuthorizeError::Timeout),
        }
    }
    .await;
    unregister(&state, id).await;

    let target = result?;
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_focus();
    }
    Ok(format!("http://127.0.0.1:{port}{target}"))
}

#[tauri::command]
pub async fn oauth_cancel(state: State<'_, LoopbackState>) -> Result<(), ()> {
    if let Some((_, cancel)) = state.pending.lock().await.take() {
        let _ = cancel.send(());
    }
    Ok(())
}

async fn register(state: &LoopbackState) -> (u64, oneshot::Receiver<()>) {
    let id = {
        let mut next = state.next_id.lock().await;
        *next += 1;
        *next
    };
    let (tx, rx) = oneshot::channel();
    if let Some((_, previous)) = state.pending.lock().await.replace((id, tx)) {
        let _ = previous.send(());
    }
    (id, rx)
}

async fn unregister(state: &LoopbackState, id: u64) {
    let mut pending = state.pending.lock().await;
    if pending.as_ref().is_some_and(|(current, _)| *current == id) {
        pending.take();
    }
}

/// Retries briefly: a just-cancelled previous flow may still hold the port.
async fn bind(port: u16) -> Result<TcpListener, AuthorizeError> {
    let mut last_error = None;
    for _ in 0..10 {
        match TcpListener::bind(("127.0.0.1", port)).await {
            Ok(listener) => return Ok(listener),
            Err(e) => last_error = Some(e),
        }
        tokio::time::sleep(Duration::from_millis(50)).await;
    }
    Err(AuthorizeError::PortUnavailable(format!(
        "127.0.0.1:{port}: {}",
        last_error.map(|e| e.to_string()).unwrap_or_default()
    )))
}

/// Answers requests until one hits `path`; returns its request target
/// (path + query). Anything else (favicon, probes) gets a 404.
async fn wait_for_callback(listener: &TcpListener, path: &str) -> Result<String, AuthorizeError> {
    loop {
        let (mut stream, _) = listener
            .accept()
            .await
            .map_err(|e| AuthorizeError::Io(e.to_string()))?;

        let target = tokio::time::timeout(REQUEST_READ_TIMEOUT, read_request_target(&mut stream))
            .await
            .ok()
            .flatten();

        match target {
            Some(target) if target_path(&target) == path => {
                respond(&mut stream, "200 OK", DONE_PAGE).await;
                return Ok(target);
            }
            _ => respond(&mut stream, "404 Not Found", "Not found").await,
        }
    }
}

/// Reads the request head and returns the target of a `GET <target> HTTP/1.x`.
async fn read_request_target(stream: &mut TcpStream) -> Option<String> {
    let mut buffer = Vec::with_capacity(1024);
    let mut chunk = [0u8; 1024];
    while !buffer.windows(4).any(|w| w == b"\r\n\r\n") {
        let read = stream.read(&mut chunk).await.ok()?;
        if read == 0 || buffer.len() + read > MAX_REQUEST_BYTES {
            return None;
        }
        buffer.extend_from_slice(&chunk[..read]);
    }
    let head = std::str::from_utf8(&buffer).ok()?;
    let mut parts = head.lines().next()?.split(' ');
    match (parts.next(), parts.next(), parts.next()) {
        (Some("GET"), Some(target), Some(version)) if version.starts_with("HTTP/1.") => {
            Some(target.to_string())
        }
        _ => None,
    }
}

fn target_path(target: &str) -> &str {
    target.split('?').next().unwrap_or(target)
}

async fn respond(stream: &mut TcpStream, status: &str, body: &str) {
    let response = format!(
        "HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\n\
         Content-Length: {}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    let _ = stream.write_all(response.as_bytes()).await;
    let _ = stream.shutdown().await;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_the_query_from_targets() {
        assert_eq!(target_path("/oauth/github/callback?code=1&state=2"), "/oauth/github/callback");
        assert_eq!(target_path("/favicon.ico"), "/favicon.ico");
    }

    #[tokio::test]
    async fn returns_the_matching_request_and_ignores_others() {
        let listener = TcpListener::bind(("127.0.0.1", 0)).await.unwrap();
        let port = listener.local_addr().unwrap().port();

        let client = tokio::spawn(async move {
            for target in ["/favicon.ico", "/oauth/x/callback?code=c&state=s"] {
                let mut stream = TcpStream::connect(("127.0.0.1", port)).await.unwrap();
                let request = format!("GET {target} HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n");
                stream.write_all(request.as_bytes()).await.unwrap();
                let mut response = String::new();
                stream.read_to_string(&mut response).await.unwrap();
                assert!(response.starts_with("HTTP/1.1"));
            }
        });

        let target = wait_for_callback(&listener, "/oauth/x/callback").await.unwrap();
        assert_eq!(target, "/oauth/x/callback?code=c&state=s");
        client.await.unwrap();
    }
}
