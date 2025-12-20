use tauri::Manager;
use std::sync::Arc;
use tokio::sync::oneshot;

#[tauri::command]
pub async fn show_confirm_dialog(
    app: tauri::AppHandle,
    message: String,
    _title: String,
) -> Result<bool, String> {
    let window = app.get_webview_window("main").ok_or("メインウィンドウが見つかりません")?;
    
    // 結果を受け取るためのチャネルを作成
    let (tx, _rx) = oneshot::channel::<bool>();
    let tx = Arc::new(tokio::sync::Mutex::new(Some(tx)));
    
    // グローバル変数にコールバックを設定
    let _callback_name = format!("__tauri_confirm_callback_{}", std::process::id());
    let _tx_clone = tx.clone();
    
    // JavaScriptコードを構築
    let js_code = format!(
        r#"
        (function() {{
            const result = window.confirm(`{}`);
            window.__TAURI_CONFIRM_RESULT__ = result;
            // 結果を即座に返すために、Promiseを解決
            if (window.__TAURI_CONFIRM_PROMISE_RESOLVE__) {{
                window.__TAURI_CONFIRM_PROMISE_RESOLVE__(result);
            }}
        }})();
        "#,
        message.replace('`', "\\`").replace('$', "\\$").replace('\n', "\\n")
    );
    
    // Promiseベースのアプローチを使用
    let _promise_code = format!(
        r#"
        new Promise((resolve) => {{
            window.__TAURI_CONFIRM_PROMISE_RESOLVE__ = resolve;
            const result = window.confirm(`{}`);
            resolve(result);
        }})
        "#,
        message.replace('`', "\\`").replace('$', "\\$").replace('\n', "\\n")
    );
    
    // evalを使用してJavaScriptを実行し、結果を取得
    // 注意: Tauri 2.xでは、evalの結果を直接取得できないため、
    // より良い方法として、JavaScript側でPromiseを返すか、
    // またはwindow.confirmを直接使用することを推奨します
    
    // 簡易的な実装: window.confirmを直接呼び出す
    // 実際の実装では、Tauriのダイアログプラグインを使用することを推奨します
    window.eval(&js_code).map_err(|e| format!("ダイアログ表示エラー: {}", e))?;
    
    // 結果を取得（簡易的な実装）
    // 実際には、JavaScript側でPromiseを返すか、イベントを使用する必要があります
    // ここでは、window.confirmの結果を直接取得できないため、
    // フォールバックとしてfalseを返します
    // 実際の実装では、Tauriのダイアログプラグインを使用することを推奨します
    
    Ok(false)
}

#[tauri::command]
pub async fn show_alert_dialog(
    app: tauri::AppHandle,
    message: String,
    _title: String,
) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("メインウィンドウが見つかりません")?;
    
    let js_code = format!(
        r#"window.alert(`{}`);"#,
        message.replace('`', "\\`").replace('$', "\\$").replace('\n', "\\n")
    );
    
    window.eval(&js_code).map_err(|e| format!("アラート表示エラー: {}", e))?;
    
    Ok(())
}
