/**
 * ChromaDB統合モジュール
 * ChromaDB Serverを起動・管理し、Rust側から接続する機能を提供
 */

use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::{Arc, OnceLock};
use tokio::sync::Mutex;
use tokio::process::Command as TokioCommand;
use tokio::time::{sleep, Duration};
use tokio::io::AsyncReadExt;
use chromadb::client::{ChromaAuthMethod, ChromaClient, ChromaClientOptions};
use chromadb::collection::{ChromaCollection, CollectionEntries, QueryOptions, GetOptions};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;

// ChromaDB Serverの管理
pub struct ChromaDBServer {
    process: Option<tokio::process::Child>,
    port: u16,
    data_dir: PathBuf,
    python_path: String,
}

// グローバルなChromaDB Serverインスタンス（安全な実装）
// ChromaDBServerはstd::sync::Mutexを使用（同期処理）
static CHROMADB_SERVER: OnceLock<Arc<std::sync::Mutex<Option<ChromaDBServer>>>> = OnceLock::new();
// ChromaClientはArcで包んで、MutexGuardをdropしてから.awaitできるようにする
static CHROMADB_CLIENT: OnceLock<Arc<Mutex<Option<Arc<ChromaClient>>>>> = OnceLock::new();

impl ChromaDBServer {
    /// ChromaDB Serverを起動
    pub async fn start(data_dir: PathBuf, port: u16) -> Result<Self, String> {
        eprintln!("🚀 ChromaDB Serverの起動を開始します...");
        eprintln!("   データディレクトリ: {}", data_dir.display());
        eprintln!("   ポート: {}", port);

        // Python環境の確認
        let python_path = Self::find_python()?;
        eprintln!("   Pythonパス: {}", python_path);

        // ChromaDBがインストールされているか確認
        Self::check_chromadb_installed(&python_path)?;

        // データディレクトリの作成
        if let Err(e) = std::fs::create_dir_all(&data_dir) {
            return Err(format!("ChromaDBデータディレクトリの作成に失敗しました: {}", e));
        }

        // chromaコマンドを探す（優先順位: chroma > chromadb）
        let chroma_cmd = Self::find_chroma_command()?;
        eprintln!("   ChromaDBコマンド: {}", chroma_cmd);

        // ChromaDBサーバーを起動
        let mut child = TokioCommand::new(&chroma_cmd)
            .arg("run")
            .arg("--host")
            .arg("localhost")
            .arg("--port")
            .arg(port.to_string())
            .arg("--path")
            .arg(data_dir.to_string_lossy().as_ref())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| {
                let error_msg = format!("ChromaDBサーバーの起動に失敗しました: {}\nコマンド: {} run --host localhost --port {} --path {}", 
                    e, chroma_cmd, port, data_dir.display());
                eprintln!("❌ {}", error_msg);
                error_msg
            })?;

        eprintln!("   ChromaDB Serverプロセスを起動しました (PID: {})", child.id().unwrap_or(0));
        
        // stderrを読み取るためのタスクを開始（エラーメッセージを取得するため）
        let stderr_arc = Arc::new(Mutex::new(Vec::<u8>::new()));
        if let Some(mut stderr_reader) = child.stderr.take() {
            let stderr_arc_clone = stderr_arc.clone();
            tokio::spawn(async move {
                let mut buf = vec![0u8; 1024];
                loop {
                    match stderr_reader.read(&mut buf).await {
                        Ok(0) => break, // EOF
                        Ok(n) => {
                            let mut guard = stderr_arc_clone.lock().await;
                            guard.extend_from_slice(&buf[..n]);
                        }
                        Err(_) => break,
                    }
                }
            });
        }

        // サーバーが起動するまで待機（最大10秒）
        eprintln!("   ChromaDB Serverの起動を待機中...");
        for i in 0..20 {
            sleep(Duration::from_millis(500)).await;
            
            // ヘルスチェック
            let health_check = reqwest::Client::new()
                .get(&format!("http://localhost:{}/api/v1/heartbeat", port))
                .timeout(Duration::from_secs(1))
                .send()
                .await;
            
            if health_check.is_ok() {
                eprintln!("✅ ChromaDB Serverが正常に起動しました ({}秒後)", i * 500 / 1000);
                return Ok(Self {
                    process: Some(child),
                    port,
                    data_dir,
                    python_path,
                });
            }
            
            if i % 2 == 0 {
                eprintln!("   起動待機中... ({}秒経過)", i * 500 / 1000);
            }
        }

        // 起動に失敗した場合、プロセスを終了してstderrを読み取る
        let _ = child.kill().await;
        let _ = child.wait().await;
        
        // 少し待ってからstderrの内容を取得
        sleep(Duration::from_millis(200)).await;
        
        // stderrの内容を取得
        let stderr_output = {
            use tokio::time::timeout;
            match timeout(Duration::from_millis(300), async {
                let guard = stderr_arc.lock().await;
                String::from_utf8_lossy(&guard).to_string()
            }).await {
                Ok(output) => output,
                Err(_) => String::new(),
            }
        };
        
        let error_msg = if !stderr_output.trim().is_empty() {
            format!("ChromaDB Serverの起動確認に失敗しました（10秒以内に起動しませんでした）\nエラー出力:\n{}", stderr_output)
        } else {
            "ChromaDB Serverの起動確認に失敗しました（10秒以内に起動しませんでした）\n考えられる原因:\n- Python環境が見つからない\n- ChromaDBがインストールされていない（pip3 install chromadb）\n- ポート8000が既に使用されている\n- ChromaDB Serverの起動に時間がかかりすぎている".to_string()
        };
        
        Err(error_msg)
    }

    /// Python環境を検出
    fn find_python() -> Result<String, String> {
        // Python 3.8以上を探す（3.12も許可）
        let candidates = vec!["python3.12", "python3.11", "python3.10", "python3.9", "python3.8", "python3", "python"];
        
        for cmd in candidates {
            let output = Command::new(cmd)
                .arg("--version")
                .output();
            
            if let Ok(output) = output {
                if output.status.success() {
                    let version = String::from_utf8_lossy(&output.stdout);
                    eprintln!("   Python環境を検出: {} ({})", cmd, version.trim());
                    return Ok(cmd.to_string());
                }
            }
        }
        
        Err("Python環境が見つかりません。Python 3.8以上が必要です。".to_string())
    }

    /// chromaコマンドを探す
    fn find_chroma_command() -> Result<String, String> {
        // chromaコマンドを探す（優先順位: chroma > chromadb）
        let candidates = vec!["chroma", "chromadb"];
        
        for cmd in candidates {
            let output = Command::new(cmd)
                .arg("--version")
                .output();
            
            if let Ok(output) = output {
                if output.status.success() {
                    eprintln!("   chromaコマンドを検出: {}", cmd);
                    return Ok(cmd.to_string());
                }
            }
        }
        
        // chromaコマンドが見つからない場合、python -m chromadb.cli を試す
        let python_path = Self::find_python()?;
        let output = Command::new(&python_path)
            .arg("-c")
            .arg("import chromadb.cli; print('ok')")
            .output();
        
        if let Ok(output) = output {
            if output.status.success() {
                eprintln!("   chromaコマンドが見つかりません。python -m chromadb.cli を使用します");
                // python -m chromadb.cli は使えないので、エラーを返す
                return Err("chromaコマンドが見つかりません。`pip3 install chromadb`でインストールしてください。".to_string());
            }
        }
        
        Err("chromaコマンドが見つかりません。`pip3 install chromadb`でインストールしてください。".to_string())
    }

    /// ChromaDBがインストールされているか確認
    fn check_chromadb_installed(python_path: &str) -> Result<(), String> {
        let output = Command::new(python_path)
            .arg("-c")
            .arg("import chromadb; print(chromadb.__version__)")
            .output()
            .map_err(|e| format!("Pythonの実行に失敗しました: {}", e))?;
        
        if !output.status.success() {
            return Err("ChromaDBがインストールされていません。`pip3 install chromadb`でインストールしてください。".to_string());
        }
        
        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        eprintln!("   ChromaDBバージョン: {}", version);
        Ok(())
    }

    /// ChromaDB Serverを停止
    pub async fn stop(&mut self) -> Result<(), String> {
        eprintln!("🛑 ChromaDB Serverの停止を開始します...");
        
        if let Some(mut process) = self.process.take() {
            if let Err(e) = process.kill().await {
                return Err(format!("ChromaDBサーバーの停止に失敗しました: {}", e));
            }
            
            // プロセスが終了するまで待機
            let _ = process.wait().await;
            eprintln!("✅ ChromaDB Serverを停止しました");
        }
        
        Ok(())
    }

    /// ポート番号を取得
    pub fn port(&self) -> u16 {
        self.port
    }

    /// データディレクトリを取得
    pub fn data_dir(&self) -> &PathBuf {
        &self.data_dir
    }
}

/// デフォルトのChromaDBデータディレクトリを取得
fn get_default_chromadb_data_dir() -> Result<PathBuf, String> {
    // ユーザーのホームディレクトリから取得を試みる
    if let Some(home_dir) = dirs::home_dir() {
        let db_dir_name = if cfg!(debug_assertions) {
            "mission-ai-local-dev"
        } else {
            "mission-ai-local"
        };
        #[cfg(target_os = "macos")]
        {
            Ok(home_dir.join("Library/Application Support").join(db_dir_name).join("chromadb"))
        }
        #[cfg(target_os = "windows")]
        {
            Ok(home_dir.join("AppData/Roaming").join(db_dir_name).join("chromadb"))
        }
        #[cfg(target_os = "linux")]
        {
            Ok(home_dir.join(".local/share").join(db_dir_name).join("chromadb"))
        }
        #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
        {
            Ok(home_dir.join(".mission-ai").join(db_dir_name).join("chromadb"))
        }
    } else {
        Err("ホームディレクトリを取得できませんでした。アプリケーションを再起動してください。".to_string())
    }
}

/// ChromaDBのデータディレクトリをクリア（破損したデータベースを修復するため）
/// 注意: この関数を呼び出す前に、ChromaDBサーバーを停止しておく必要があります
pub async fn clear_chromadb_data_dir() -> Result<(), String> {
    let data_dir = get_default_chromadb_data_dir()?;
    
    eprintln!("🗑️ ChromaDBのデータディレクトリをクリアします: {}", data_dir.display());
    
    // ディレクトリが存在する場合、削除
    if data_dir.exists() {
        // ディレクトリを削除
        if let Err(e) = fs::remove_dir_all(&data_dir) {
            return Err(format!("ChromaDBデータディレクトリの削除に失敗しました: {}", e));
        }
        
        eprintln!("✅ ChromaDBのデータディレクトリをクリアしました");
    } else {
        eprintln!("ℹ️ ChromaDBのデータディレクトリは存在しませんでした");
    }
    
    Ok(())
}

/// ChromaDB Serverを初期化（グローバルに保持）
pub async fn init_chromadb_server(data_dir: PathBuf, port: u16) -> Result<(), String> {
    let server_lock = CHROMADB_SERVER.get_or_init(|| Arc::new(std::sync::Mutex::new(None)));
    
    // MutexGuardをdropしてから.awaitする必要がある
    let should_init = {
        let mut server_guard = server_lock.lock().unwrap();
        if server_guard.is_some() {
            eprintln!("⚠️ ChromaDB Serverは既に初期化されています");
            return Ok(());
        }
        true
    };
    
    if should_init {
        let server = ChromaDBServer::start(data_dir, port).await?;
        
        // サーバーを保存
        {
            let mut server_guard = server_lock.lock().unwrap();
            *server_guard = Some(server);
        }
        
        // クライアントも初期化
        init_chromadb_client(port).await?;
    }
    
    Ok(())
}

/// ChromaDB Serverを停止
pub async fn stop_chromadb_server() -> Result<(), String> {
    // MutexGuardをスコープ内でドロップしてから.awaitする必要がある
    let server_to_stop = if let Some(server_lock) = CHROMADB_SERVER.get() {
        let mut server_guard = server_lock.lock().unwrap();
        server_guard.take()
    } else {
        None
    };
    
    // MutexGuardをドロップした後、.awaitを呼び出す
    if let Some(mut server) = server_to_stop {
        server.stop().await?;
    }
    
    if let Some(client_lock) = CHROMADB_CLIENT.get() {
        let mut client_guard = client_lock.lock().await;
        *client_guard = None;
    }
    
    Ok(())
}

/// ChromaDBクライアントを初期化
pub async fn init_chromadb_client(port: u16) -> Result<(), String> {
    let client_lock = CHROMADB_CLIENT.get_or_init(|| Arc::new(Mutex::new(None)));
    
    let mut client_guard = client_lock.lock().await;
    if client_guard.is_some() {
        eprintln!("⚠️ ChromaDBクライアントは既に初期化されています");
        return Ok(());
    }

    // ChromaDB 2.xでは、v2 APIを使用してデータベースを作成する必要がある
    let base_url = format!("http://localhost:{}", port);
    let database_name = "default_database";
    
    // v2 APIを使用してデータベースを作成（既に存在する場合はエラーを無視）
    let create_db_url = format!("{}/api/v2/databases", base_url);
    let http_client = reqwest::Client::new();
    match http_client
        .post(&create_db_url)
        .json(&serde_json::json!({"name": database_name}))
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                eprintln!("   ✅ データベース '{}' を作成しました", database_name);
            } else if response.status() == reqwest::StatusCode::CONFLICT {
                eprintln!("   ℹ️  データベース '{}' は既に存在します", database_name);
            } else {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                eprintln!("   ⚠️  データベース '{}' の作成に失敗しました（続行します）: {} {}", database_name, status.as_u16(), body);
            }
        }
        Err(e) => {
            eprintln!("   ⚠️  データベース '{}' の作成に失敗しました（続行します）: {}", database_name, e);
        }
    }
    
    // データベース名を指定してクライアントを作成
    let options = ChromaClientOptions {
        url: Some(base_url),
        database: database_name.to_string(),
        auth: ChromaAuthMethod::None,
    };
    
    let client = ChromaClient::new(options)
        .await
        .map_err(|e| format!("ChromaDBクライアントの初期化に失敗しました: {}", e))?;
    
    *client_guard = Some(Arc::new(client));
    eprintln!("✅ ChromaDBクライアントを初期化しました");
    Ok(())
}

/// ChromaDBクライアントを取得
fn get_chromadb_client() -> Result<Arc<Mutex<Option<Arc<ChromaClient>>>>, String> {
    CHROMADB_CLIENT.get()
        .cloned()
        .ok_or("ChromaDBクライアントが初期化されていません".to_string())
}

/// コレクションを取得または作成（エラーハンドリング付き）
async fn get_or_create_collection_with_error_handling(
    client: Arc<ChromaClient>,
    collection_name: &str,
) -> Result<ChromaCollection, String> {
    // 最初の試行
    match client.get_or_create_collection(collection_name, None).await {
        Ok(collection) => Ok(collection),
        Err(e) => {
            let error_msg = format!("{}", e);
            // acquire_writeテーブルが見つからないエラーの場合、自動修復を試みる
            if error_msg.contains("acquire_write") || error_msg.contains("no such table") {
                eprintln!("⚠️ ChromaDBの内部データベースエラーを検出しました。自動修復を試みます...");
                
                // ChromaDBサーバーを再起動
                let port = std::env::var("CHROMADB_PORT")
                    .ok()
                    .and_then(|s| s.parse::<u16>().ok())
                    .unwrap_or(8000);
                
                let data_dir = match get_default_chromadb_data_dir() {
                    Ok(dir) => dir,
                    Err(e) => {
                        return Err(format!(
                            "コレクションの取得/作成に失敗しました: {}\nデータディレクトリの取得に失敗: {}",
                            error_msg, e
                        ));
                    }
                };
                
                // サーバーを停止
                if let Err(e) = stop_chromadb_server().await {
                    eprintln!("⚠️ ChromaDBサーバーの停止中にエラーが発生しました: {}", e);
                }
                
                // 少し待機
                tokio::time::sleep(Duration::from_secs(1)).await;
                
                // データディレクトリをクリア（破損したデータベースを修復）
                eprintln!("🗑️ 破損したデータベースを修復するため、データディレクトリをクリアします...");
                if let Err(e) = clear_chromadb_data_dir().await {
                    eprintln!("⚠️ データディレクトリのクリアに失敗しました: {}", e);
                    // クリアに失敗しても続行
                }
                
                // 少し待機してから再起動
                tokio::time::sleep(Duration::from_secs(2)).await;
                
                // サーバーを再起動
                match init_chromadb_server(data_dir.clone(), port).await {
                    Ok(_) => {
                        eprintln!("✅ ChromaDBサーバーの再起動に成功しました。再度試行します...");
                        
                        // クライアントを再取得
                        let client_lock = CHROMADB_CLIENT.get()
                            .ok_or("ChromaDBクライアントが初期化されていません")?;
                        let new_client = {
                            let client_guard = client_lock.lock().await;
                            client_guard.as_ref()
                                .ok_or("ChromaDBクライアントが初期化されていません")?
                                .clone()
                        };
                        
                        // 再試行（最大3回まで）
                        let mut retry_count = 0;
                        loop {
                            match new_client.get_or_create_collection(collection_name, None).await {
                                Ok(collection) => {
                                    eprintln!("✅ コレクションの取得/作成に成功しました（再試行後）");
                                    return Ok(collection);
                                }
                                Err(e2) => {
                                    retry_count += 1;
                                    if retry_count >= 3 {
                                        let data_dir_str = data_dir.display().to_string();
                                        return Err(format!(
                                            "コレクションの取得/作成に失敗しました（再試行後も失敗）: {}\n\n\
                                            ChromaDBの内部データベースが破損している可能性があります。\n\
                                            対処法:\n\
                                            1. アプリケーションを再起動してください\n\
                                            2. それでも解決しない場合、ChromaDBのデータディレクトリをクリアしてください\n\
                                            3. データディレクトリの場所: {}",
                                            e2, data_dir_str
                                        ));
                                    }
                                    eprintln!("⚠️ 再試行 {}回目に失敗しました。待機してから再試行します...", retry_count);
                                    tokio::time::sleep(Duration::from_secs(1)).await;
                                }
                            }
                        }
                    }
                    Err(e2) => {
                        let data_dir_str = data_dir.display().to_string();
                        return Err(format!(
                            "コレクションの取得/作成に失敗しました: {}\n\
                            ChromaDBサーバーの再起動にも失敗しました: {}\n\n\
                            ChromaDBの内部データベースが破損している可能性があります。\n\
                            対処法:\n\
                            1. アプリケーションを再起動してください\n\
                            2. それでも解決しない場合、ChromaDBのデータディレクトリをクリアしてください\n\
                            3. データディレクトリの場所: {}",
                            error_msg, e2, data_dir_str
                        ));
                    }
                }
            } else {
                Err(format!("コレクションの取得/作成に失敗しました: {}", error_msg))
            }
        }
    }
}

/// エンティティ埋め込みを保存
pub async fn save_entity_embedding(
    entity_id: String,
    organization_id: String,
    combined_embedding: Vec<f32>,
    metadata: HashMap<String, Value>,
) -> Result<(), String> {
    // クライアントが初期化されていない場合、自動的に初期化を試みる
    if CHROMADB_CLIENT.get().is_none() {
        eprintln!("⚠️ ChromaDBクライアントが初期化されていません。自動初期化を試みます...");
        
        // サーバーが起動しているか確認
        let server_lock = CHROMADB_SERVER.get();
        let port = if let Some(server_lock) = server_lock {
            // MutexGuardをスコープ内でドロップしてから.awaitを呼び出す
            let port_opt = {
                let server_guard = server_lock.lock().unwrap();
                server_guard.as_ref().map(|server| server.port())
            };
            
            if let Some(port) = port_opt {
                // サーバーが起動している場合、ポート番号を取得
                port
            } else {
                // サーバーが起動していない場合、自動的に起動を試みる
                eprintln!("⚠️ ChromaDBサーバーが起動していません。自動起動を試みます...");
                
                // ポート番号を環境変数から取得（デフォルトは8000）
                let port = std::env::var("CHROMADB_PORT")
                    .ok()
                    .and_then(|s| s.parse::<u16>().ok())
                    .unwrap_or(8000);
                
                // データディレクトリを取得（デフォルトのパスを使用）
                // 注意: これは一時的な解決策です。本来はAppHandleから取得すべきです
                let data_dir = get_default_chromadb_data_dir()?;
                
                // サーバーを起動
                match init_chromadb_server(data_dir, port).await {
                    Ok(_) => {
                        eprintln!("✅ ChromaDBサーバーの自動起動に成功しました");
                        port
                    }
                    Err(e) => {
                        eprintln!("❌ ChromaDBサーバーの自動起動に失敗しました: {}", e);
                        return Err(format!("ChromaDBサーバーの起動に失敗しました: {}。アプリケーションを再起動してください。", e));
                    }
                }
            }
        } else {
            // CHROMADB_SERVERが初期化されていない場合、自動的に起動を試みる
            eprintln!("⚠️ ChromaDBサーバーが初期化されていません。自動起動を試みます...");
            
            // ポート番号を環境変数から取得（デフォルトは8000）
            let port = std::env::var("CHROMADB_PORT")
                .ok()
                .and_then(|s| s.parse::<u16>().ok())
                .unwrap_or(8000);
            
            // データディレクトリを取得
            let data_dir = get_default_chromadb_data_dir()?;
            
            // サーバーを起動
            match init_chromadb_server(data_dir, port).await {
                Ok(_) => {
                    eprintln!("✅ ChromaDBサーバーの自動起動に成功しました");
                    port
                }
                Err(e) => {
                    eprintln!("❌ ChromaDBサーバーの自動起動に失敗しました: {}", e);
                    return Err(format!("ChromaDBサーバーの起動に失敗しました: {}。アプリケーションを再起動してください。", e));
                }
            }
        };
        
        // クライアントの初期化を確認（サーバー起動時に既に初期化されている可能性がある）
        if CHROMADB_CLIENT.get().is_none() {
            // クライアントの初期化を試みる
            if let Err(e) = init_chromadb_client(port).await {
                eprintln!("❌ ChromaDBクライアントの自動初期化に失敗しました: {}", e);
                return Err(format!("ChromaDBクライアントが初期化されていません。初期化に失敗しました: {}。アプリケーションを再起動してください。", e));
            }
            eprintln!("✅ ChromaDBクライアントの自動初期化に成功しました");
        }
    }
    
    let client_lock = get_chromadb_client()?;
    // organizationIdが空文字列の場合は"entities_all"を使用（ChromaDBの命名規則に準拠）
    let collection_name = if organization_id.is_empty() {
        "entities_all".to_string()
    } else {
        format!("entities_{}", organization_id)
    };
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    // コレクションを取得または作成
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    // メタデータにエンティティIDと組織IDを追加
    let mut embedding_metadata = metadata;
    embedding_metadata.insert("entityId".to_string(), Value::String(entity_id.clone()));
    embedding_metadata.insert("organizationId".to_string(), Value::String(organization_id.clone()));
    
    // メタデータをChromaDBの形式に変換（serde_json::Mapを使用）
    let mut chroma_metadata = serde_json::Map::new();
    for (k, v) in embedding_metadata {
        chroma_metadata.insert(k, v);
    }
    
    // 埋め込みを追加
    let entries = CollectionEntries {
        ids: vec![entity_id.as_str()],
        embeddings: Some(vec![combined_embedding]),
        metadatas: Some(vec![chroma_metadata]),
        documents: None,
    };
    
    collection.upsert(entries, None).await
        .map_err(|e| format!("エンティティ埋め込みの保存に失敗しました: {}", e))?;
    
    Ok(())
}

/// エンティティ埋め込みを取得
pub async fn get_entity_embedding(
    entity_id: String,
    organization_id: String,
) -> Result<Option<HashMap<String, Value>>, String> {
    // クライアントが初期化されていない場合、自動的に初期化を試みる
    if CHROMADB_CLIENT.get().is_none() {
        eprintln!("⚠️ ChromaDBクライアントが初期化されていません。自動初期化を試みます...");
        
        // サーバーが起動しているか確認
        let server_lock = CHROMADB_SERVER.get();
        let port = if let Some(server_lock) = server_lock {
            // MutexGuardをスコープ内でドロップしてから.awaitを呼び出す
            let port_opt = {
                let server_guard = server_lock.lock().unwrap();
                server_guard.as_ref().map(|server| server.port())
            };
            
            if let Some(port) = port_opt {
                // サーバーが起動している場合、ポート番号を取得
                port
            } else {
                // サーバーが起動していない場合、自動的に起動を試みる
                eprintln!("⚠️ ChromaDBサーバーが起動していません。自動起動を試みます...");
                
                // ポート番号を環境変数から取得（デフォルトは8000）
                let port = std::env::var("CHROMADB_PORT")
                    .ok()
                    .and_then(|s| s.parse::<u16>().ok())
                    .unwrap_or(8000);
                
                // データディレクトリを取得
                let data_dir = get_default_chromadb_data_dir()?;
                
                // サーバーを起動
                match init_chromadb_server(data_dir, port).await {
                    Ok(_) => {
                        eprintln!("✅ ChromaDBサーバーの自動起動に成功しました");
                        port
                    }
                    Err(e) => {
                        eprintln!("❌ ChromaDBサーバーの自動起動に失敗しました: {}", e);
                        return Err(format!("ChromaDBサーバーの起動に失敗しました: {}。アプリケーションを再起動してください。", e));
                    }
                }
            }
        } else {
            // CHROMADB_SERVERが初期化されていない場合、自動的に起動を試みる
            eprintln!("⚠️ ChromaDBサーバーが初期化されていません。自動起動を試みます...");
            
            // ポート番号を環境変数から取得（デフォルトは8000）
            let port = std::env::var("CHROMADB_PORT")
                .ok()
                .and_then(|s| s.parse::<u16>().ok())
                .unwrap_or(8000);
            
            // データディレクトリを取得
            let data_dir = get_default_chromadb_data_dir()?;
            
            // サーバーを起動
            match init_chromadb_server(data_dir, port).await {
                Ok(_) => {
                    eprintln!("✅ ChromaDBサーバーの自動起動に成功しました");
                    port
                }
                Err(e) => {
                    eprintln!("❌ ChromaDBサーバーの自動起動に失敗しました: {}", e);
                    return Err(format!("ChromaDBサーバーの起動に失敗しました: {}。アプリケーションを再起動してください。", e));
                }
            }
        };
        
        // クライアントの初期化を確認（サーバー起動時に既に初期化されている可能性がある）
        if CHROMADB_CLIENT.get().is_none() {
            // クライアントの初期化を試みる
            if let Err(e) = init_chromadb_client(port).await {
                eprintln!("❌ ChromaDBクライアントの自動初期化に失敗しました: {}", e);
                return Err(format!("ChromaDBクライアントが初期化されていません。初期化に失敗しました: {}。アプリケーションを再起動してください。", e));
            }
            eprintln!("✅ ChromaDBクライアントの自動初期化に成功しました");
        }
    }
    
    let client_lock = get_chromadb_client()?;
    // organizationIdが空文字列の場合は"entities_all"を使用（ChromaDBの命名規則に準拠）
    let collection_name = if organization_id.is_empty() {
        "entities_all".to_string()
    } else {
        format!("entities_{}", organization_id)
    };
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    // コレクションを取得
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    // IDから直接取得
    let get_options = GetOptions {
        ids: vec![entity_id.clone()],
        where_metadata: None,
        where_document: None,
        limit: Some(1),
        offset: None,
        include: Some(vec!["embeddings".to_string(), "metadatas".to_string()]),
    };
    
    let results = collection.get(get_options).await
        .map_err(|e| format!("エンティティ埋め込みの取得に失敗しました: {}", e))?;
    
    // 結果を確認
    if results.ids.is_empty() {
        return Ok(None);
    }
    
    // メタデータと埋め込みを取得
    let mut result_data = HashMap::new();
    
    // 埋め込みを取得
    if let Some(embeddings) = &results.embeddings {
        if !embeddings.is_empty() {
            if let Some(embedding_opt) = embeddings.get(0) {
                if let Some(embedding_vec) = embedding_opt {
                    result_data.insert("combinedEmbedding".to_string(), Value::Array(
                        embedding_vec.iter().map(|&v| Value::Number(serde_json::Number::from_f64(v as f64).unwrap())).collect()
                    ));
                }
            }
        }
    }
    
    // メタデータを取得
    if let Some(metadatas) = &results.metadatas {
        if !metadatas.is_empty() {
            if let Some(metadata_opt) = metadatas.get(0) {
                if let Some(metadata_map) = metadata_opt {
                    for (k, v) in metadata_map {
                        result_data.insert(k.clone(), v.clone());
                    }
                }
            }
        }
    }
    
    if result_data.is_empty() {
        Ok(None)
    } else {
        Ok(Some(result_data))
    }
}

/// ChromaDBのクエリレスポンス構造体（nullを適切に処理）
#[derive(Debug, Deserialize)]
struct ChromaQueryResponse {
    #[serde(default)]
    ids: Vec<Vec<String>>,
    #[serde(default)]
    distances: Option<Vec<Vec<f32>>>,
    #[serde(default)]
    documents: Option<Vec<Vec<Option<String>>>>,
    #[serde(default)]
    metadatas: Option<Vec<Vec<Option<HashMap<String, Value>>>>>,
    #[serde(default)]
    embeddings: Option<Vec<Vec<Vec<f32>>>>,
}

/// 単一のコレクションから類似エンティティを検索（ヘルパー関数）
async fn search_entities_in_collection(
    client: Arc<ChromaClient>,
    collection_name: &str,
    query_embedding: Vec<f32>,
    limit: usize,
) -> Result<Vec<(String, f32)>, String> {
    // コレクションを取得
    let collection = get_or_create_collection_with_error_handling(client, collection_name).await?;
    
    // コレクションの件数を取得（デバッグ用）
    match collection.count().await {
        Ok(count) => {
            eprintln!("[search_entities_in_collection] コレクション '{}' の件数: {}件", collection_name, count);
            if count == 0 {
                eprintln!("[search_entities_in_collection] ⚠️ コレクションが空です。");
                return Ok(Vec::new());
            }
        },
        Err(e) => {
            eprintln!("[search_entities_in_collection] ⚠️ コレクションの件数取得に失敗しました: {}", e);
        },
    }
    
    // 検索オプションを構築
    let query_options = QueryOptions {
        query_texts: None,
        query_embeddings: Some(vec![query_embedding]),
        where_metadata: None,
        where_document: None,
        n_results: Some(limit),
        include: Some(vec!["distances"]),
    };
    
    // 検索
    let results = collection.query(query_options, None).await
        .map_err(|e| {
            let error_msg = format!("類似エンティティの検索に失敗しました: {}", e);
            eprintln!("[search_entities_in_collection] ❌ ChromaDB検索エラー: {}", e);
            error_msg
        })?;
    
    // 結果を変換
    let mut similar_entities = Vec::new();
    if !results.ids.is_empty() {
        if let Some(distances) = &results.distances {
            if !distances.is_empty() {
                if let Some(id_vec) = results.ids.get(0) {
                    if let Some(distance_vec) = distances.get(0) {
                        for (i, id) in id_vec.iter().enumerate() {
                            if let Some(distance) = distance_vec.get(i) {
                                let distance_f32: f32 = *distance;
                                let similarity = (1.0_f32 - distance_f32).max(0.0_f32);
                                similar_entities.push((id.clone(), similarity));
                            }
                        }
                    }
                }
            }
        }
    }
    
    Ok(similar_entities)
}

/// 類似エンティティを検索（組織横断検索対応）
pub async fn find_similar_entities(
    query_embedding: Vec<f32>,
    limit: usize,
    organization_id: Option<String>,
) -> Result<Vec<(String, f32)>, String> {
    eprintln!("[find_similar_entities] 検索開始: organizationId={:?}, limit={}, embedding_dim={}", 
        organization_id, limit, query_embedding.len());
    
    let client_lock = get_chromadb_client()?;
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    // 検索対象の組織IDリストを決定
    let org_ids: Vec<String> = match organization_id {
        Some(id) if !id.is_empty() => {
            vec![id]
        },
        _ => {
            // 組織横断検索: すべての組織を検索
            eprintln!("[find_similar_entities] organizationIdが未指定のため、すべての組織を検索します");
            use crate::database::get_all_organizations;
            match get_all_organizations() {
                Ok(orgs) => {
                    let ids: Vec<String> = orgs.into_iter().map(|o| o.id).collect();
                    eprintln!("[find_similar_entities] 検索対象組織数: {}件", ids.len());
                    ids
                },
                Err(e) => {
                    eprintln!("[find_similar_entities] ⚠️ 組織一覧の取得に失敗しました: {}", e);
                    return Ok(Vec::new());
                },
            }
        },
    };
    
    // 各組織のコレクションに対して検索を実行（並列実行）
    let mut all_results = Vec::new();
    let mut search_tasks = Vec::new();
    
    for org_id in org_ids {
        // org_idは組織IDのリストから来ているので、空文字列になることはないが、念のためチェック
        let collection_name = if org_id.is_empty() {
            "entities_all".to_string()
        } else {
            format!("entities_{}", org_id)
        };
        let client_clone = client.clone();
        let embedding_clone = query_embedding.clone();
        
        let task = tokio::spawn(async move {
            search_entities_in_collection(client_clone, &collection_name, embedding_clone, limit).await
        });
        search_tasks.push((org_id, task));
    }
    
    // すべての検索タスクの完了を待つ
    for (org_id, task) in search_tasks {
        match task.await {
            Ok(Ok(results)) => {
                eprintln!("[find_similar_entities] 組織 '{}' から {}件の結果を取得", org_id, results.len());
                all_results.extend(results);
            },
            Ok(Err(e)) => {
                eprintln!("[find_similar_entities] ⚠️ 組織 '{}' の検索エラー: {}", org_id, e);
            },
            Err(e) => {
                eprintln!("[find_similar_entities] ⚠️ 組織 '{}' の検索タスクエラー: {}", org_id, e);
            },
        }
    }
    
    // 結果を類似度でソートして上位limit件を返す
    all_results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    let final_results: Vec<(String, f32)> = all_results.into_iter().take(limit).collect();
    
    eprintln!("[find_similar_entities] 最終結果: {}件のエンティティを返します", final_results.len());
    Ok(final_results)
}

/// エンティティコレクションの件数を取得
pub async fn count_entities(organization_id: Option<String>) -> Result<usize, String> {
    let org_id = match organization_id {
        Some(id) if !id.is_empty() => id,
        _ => return Err("organizationIdが指定されていません".to_string()),
    };
    
    let client_lock = get_chromadb_client()?;
    let collection_name = format!("entities_{}", org_id);
    
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    let count = collection.count().await
        .map_err(|e| format!("コレクションの件数取得に失敗しました: {}", e))?;
    
    Ok(count)
}

/// リレーション埋め込みを保存
pub async fn save_relation_embedding(
    relation_id: String,
    organization_id: String,
    combined_embedding: Vec<f32>,
    metadata: HashMap<String, Value>,
) -> Result<(), String> {
    let client_lock = get_chromadb_client()?;
    // organizationIdが空文字列の場合は"relations_all"を使用（ChromaDBの命名規則に準拠）
    let collection_name = if organization_id.is_empty() {
        "relations_all".to_string()
    } else {
        format!("relations_{}", organization_id)
    };
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    let mut embedding_metadata = metadata;
    embedding_metadata.insert("relationId".to_string(), Value::String(relation_id.clone()));
    embedding_metadata.insert("organizationId".to_string(), Value::String(organization_id.clone()));
    
    // メタデータをChromaDBの形式に変換（serde_json::Mapを使用）
    let mut chroma_metadata = serde_json::Map::new();
    for (k, v) in embedding_metadata {
        chroma_metadata.insert(k, v);
    }
    
    let entries = CollectionEntries {
        ids: vec![relation_id.as_str()],
        embeddings: Some(vec![combined_embedding]),
        metadatas: Some(vec![chroma_metadata]),
        documents: None,
    };
    
    collection.upsert(entries, None).await
        .map_err(|e| format!("リレーション埋め込みの保存に失敗しました: {}", e))?;
    
    Ok(())
}

/// リレーション埋め込みを取得
pub async fn get_relation_embedding(
    relation_id: String,
    organization_id: String,
) -> Result<Option<HashMap<String, Value>>, String> {
    // クライアントが初期化されていない場合、自動的に初期化を試みる
    if CHROMADB_CLIENT.get().is_none() {
        eprintln!("⚠️ ChromaDBクライアントが初期化されていません。自動初期化を試みます...");
        
        // サーバーが起動しているか確認
        let server_lock = CHROMADB_SERVER.get();
        let port = if let Some(server_lock) = server_lock {
            // MutexGuardをスコープ内でドロップしてから.awaitを呼び出す
            let port_opt = {
                let server_guard = server_lock.lock().unwrap();
                server_guard.as_ref().map(|server| server.port())
            };
            
            if let Some(port) = port_opt {
                // サーバーが起動している場合、ポート番号を取得
                port
            } else {
                // サーバーが起動していない場合、自動的に起動を試みる
                eprintln!("⚠️ ChromaDBサーバーが起動していません。自動起動を試みます...");
                
                // ポート番号を環境変数から取得（デフォルトは8000）
                let port = std::env::var("CHROMADB_PORT")
                    .ok()
                    .and_then(|s| s.parse::<u16>().ok())
                    .unwrap_or(8000);
                
                // データディレクトリを取得
                let data_dir = get_default_chromadb_data_dir()?;
                
                // サーバーを起動
                match init_chromadb_server(data_dir, port).await {
                    Ok(_) => {
                        eprintln!("✅ ChromaDBサーバーの自動起動に成功しました");
                        port
                    }
                    Err(e) => {
                        eprintln!("❌ ChromaDBサーバーの自動起動に失敗しました: {}", e);
                        return Err(format!("ChromaDBサーバーの起動に失敗しました: {}。アプリケーションを再起動してください。", e));
                    }
                }
            }
        } else {
            // CHROMADB_SERVERが初期化されていない場合、自動的に起動を試みる
            eprintln!("⚠️ ChromaDBサーバーが初期化されていません。自動起動を試みます...");
            
            // ポート番号を環境変数から取得（デフォルトは8000）
            let port = std::env::var("CHROMADB_PORT")
                .ok()
                .and_then(|s| s.parse::<u16>().ok())
                .unwrap_or(8000);
            
            // データディレクトリを取得
            let data_dir = get_default_chromadb_data_dir()?;
            
            // サーバーを起動
            match init_chromadb_server(data_dir, port).await {
                Ok(_) => {
                    eprintln!("✅ ChromaDBサーバーの自動起動に成功しました");
                    port
                }
                Err(e) => {
                    eprintln!("❌ ChromaDBサーバーの自動起動に失敗しました: {}", e);
                    return Err(format!("ChromaDBサーバーの起動に失敗しました: {}。アプリケーションを再起動してください。", e));
                }
            }
        };
        
        // クライアントの初期化を確認（サーバー起動時に既に初期化されている可能性がある）
        if CHROMADB_CLIENT.get().is_none() {
            // クライアントの初期化を試みる
            if let Err(e) = init_chromadb_client(port).await {
                eprintln!("❌ ChromaDBクライアントの自動初期化に失敗しました: {}", e);
                return Err(format!("ChromaDBクライアントが初期化されていません。初期化に失敗しました: {}。アプリケーションを再起動してください。", e));
            }
            eprintln!("✅ ChromaDBクライアントの自動初期化に成功しました");
        }
    }
    
    let client_lock = get_chromadb_client()?;
    // organizationIdが空文字列の場合は"relations_all"を使用（ChromaDBの命名規則に準拠）
    let collection_name = if organization_id.is_empty() {
        "relations_all".to_string()
    } else {
        format!("relations_{}", organization_id)
    };
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    // コレクションを取得
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    // IDから直接取得
    let get_options = GetOptions {
        ids: vec![relation_id.clone()],
        where_metadata: None,
        where_document: None,
        limit: Some(1),
        offset: None,
        include: Some(vec!["embeddings".to_string(), "metadatas".to_string()]),
    };
    
    let results = collection.get(get_options).await
        .map_err(|e| format!("リレーション埋め込みの取得に失敗しました: {}", e))?;
    
    // 結果を確認
    if results.ids.is_empty() {
        return Ok(None);
    }
    
    // メタデータと埋め込みを取得
    let mut result_data = HashMap::new();
    
    // 埋め込みを取得
    if let Some(embeddings) = &results.embeddings {
        if !embeddings.is_empty() {
            if let Some(embedding_opt) = embeddings.get(0) {
                if let Some(embedding_vec) = embedding_opt {
                    result_data.insert("combinedEmbedding".to_string(), Value::Array(
                        embedding_vec.iter().map(|&v| Value::Number(serde_json::Number::from_f64(v as f64).unwrap())).collect()
                    ));
                }
            }
        }
    }
    
    // メタデータを取得
    if let Some(metadatas) = &results.metadatas {
        if !metadatas.is_empty() {
            if let Some(metadata_opt) = metadatas.get(0) {
                if let Some(metadata_map) = metadata_opt {
                    for (k, v) in metadata_map {
                        result_data.insert(k.clone(), v.clone());
                    }
                }
            }
        }
    }
    
    if result_data.is_empty() {
        Ok(None)
    } else {
        Ok(Some(result_data))
    }
}

/// 単一のコレクションから類似リレーションを検索（ヘルパー関数）
async fn search_relations_in_collection(
    client: Arc<ChromaClient>,
    collection_name: &str,
    query_embedding: Vec<f32>,
    limit: usize,
) -> Result<Vec<(String, f32)>, String> {
    let collection = get_or_create_collection_with_error_handling(client, collection_name).await?;
    
    let query_options = QueryOptions {
        query_texts: None,
        query_embeddings: Some(vec![query_embedding]),
        where_metadata: None,
        where_document: None,
        n_results: Some(limit),
        include: Some(vec!["distances"]),
    };
    
    let results = collection.query(query_options, None).await
        .map_err(|e| {
            let error_msg = format!("類似リレーションの検索に失敗しました: {}", e);
            eprintln!("[search_relations_in_collection] ❌ ChromaDB検索エラー: {}", e);
            error_msg
        })?;
    
    let mut similar_relations = Vec::new();
    if !results.ids.is_empty() {
        if let Some(distances) = &results.distances {
            if !distances.is_empty() {
                if let Some(id_vec) = results.ids.get(0) {
                    if let Some(distance_vec) = distances.get(0) {
                        for (i, id) in id_vec.iter().enumerate() {
                            if let Some(distance) = distance_vec.get(i) {
                                let distance_f32: f32 = *distance;
                                let similarity = (1.0_f32 - distance_f32).max(0.0_f32);
                                similar_relations.push((id.clone(), similarity));
                            }
                        }
                    }
                }
            }
        }
    }
    
    Ok(similar_relations)
}

/// 類似リレーションを検索（組織横断検索対応）
pub async fn find_similar_relations(
    query_embedding: Vec<f32>,
    limit: usize,
    organization_id: Option<String>,
) -> Result<Vec<(String, f32)>, String> {
    eprintln!("[find_similar_relations] 検索開始: organizationId={:?}, limit={}, embedding_dim={}", 
        organization_id, limit, query_embedding.len());
    
    let client_lock = get_chromadb_client()?;
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    // 検索対象の組織IDリストを決定
    let org_ids: Vec<String> = match organization_id {
        Some(id) if !id.is_empty() => {
            vec![id]
        },
        _ => {
            // 組織横断検索: すべての組織を検索
            eprintln!("[find_similar_relations] organizationIdが未指定のため、すべての組織を検索します");
            use crate::database::get_all_organizations;
            match get_all_organizations() {
                Ok(orgs) => {
                    let ids: Vec<String> = orgs.into_iter().map(|o| o.id).collect();
                    eprintln!("[find_similar_relations] 検索対象組織数: {}件", ids.len());
                    ids
                },
                Err(e) => {
                    eprintln!("[find_similar_relations] ⚠️ 組織一覧の取得に失敗しました: {}", e);
                    return Ok(Vec::new());
                },
            }
        },
    };
    
    // 各組織のコレクションに対して検索を実行（並列実行）
    let mut all_results = Vec::new();
    let mut search_tasks = Vec::new();
    
    for org_id in org_ids {
        // org_idは組織IDのリストから来ているので、空文字列になることはないが、念のためチェック
        let collection_name = if org_id.is_empty() {
            "relations_all".to_string()
        } else {
            format!("relations_{}", org_id)
        };
        let client_clone = client.clone();
        let embedding_clone = query_embedding.clone();
        
        let task = tokio::spawn(async move {
            search_relations_in_collection(client_clone, &collection_name, embedding_clone, limit).await
        });
        search_tasks.push((org_id, task));
    }
    
    // すべての検索タスクの完了を待つ
    for (org_id, task) in search_tasks {
        match task.await {
            Ok(Ok(results)) => {
                eprintln!("[find_similar_relations] 組織 '{}' から {}件の結果を取得", org_id, results.len());
                all_results.extend(results);
            },
            Ok(Err(e)) => {
                eprintln!("[find_similar_relations] ⚠️ 組織 '{}' の検索エラー: {}", org_id, e);
            },
            Err(e) => {
                eprintln!("[find_similar_relations] ⚠️ 組織 '{}' の検索タスクエラー: {}", org_id, e);
            },
        }
    }
    
    // 結果を類似度でソートして上位limit件を返す
    all_results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    let final_results: Vec<(String, f32)> = all_results.into_iter().take(limit).collect();
    
    eprintln!("[find_similar_relations] 最終結果: {}件のリレーションを返します", final_results.len());
    Ok(final_results)
}

/// トピック埋め込みを保存
pub async fn save_topic_embedding(
    topic_id: String,
    meeting_note_id: String,
    organization_id: String,
    combined_embedding: Vec<f32>,
    metadata: HashMap<String, Value>,
) -> Result<(), String> {
    let client_lock = get_chromadb_client()?;
    let collection_name = format!("topics_{}", organization_id);
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    let mut embedding_metadata = metadata;
    embedding_metadata.insert("topicId".to_string(), Value::String(topic_id.clone()));
    embedding_metadata.insert("meetingNoteId".to_string(), Value::String(meeting_note_id.clone()));
    embedding_metadata.insert("organizationId".to_string(), Value::String(organization_id.clone()));
    
    // メタデータをChromaDBの形式に変換（serde_json::Mapを使用）
    let mut chroma_metadata = serde_json::Map::new();
    for (k, v) in embedding_metadata {
        chroma_metadata.insert(k, v);
    }
    
    let entries = CollectionEntries {
        ids: vec![topic_id.as_str()],
        embeddings: Some(vec![combined_embedding]),
        metadatas: Some(vec![chroma_metadata]),
        documents: None,
    };
    
    collection.upsert(entries, None).await
        .map_err(|e| format!("トピック埋め込みの保存に失敗しました: {}", e))?;
    
    Ok(())
}

/// 単一のコレクションから類似トピックを検索（ヘルパー関数）
/// トピック検索結果（メタデータを含む）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopicSearchResult {
    pub topic_id: String,
    pub meeting_note_id: String,
    pub similarity: f32,
    pub title: String,
    pub content_summary: String,
}

async fn search_topics_in_collection(
    client: Arc<ChromaClient>,
    collection_name: &str,
    query_embedding: Vec<f32>,
    limit: usize,
) -> Result<Vec<TopicSearchResult>, String> {
    let collection = get_or_create_collection_with_error_handling(client, collection_name).await?;
    
    let query_options = QueryOptions {
        query_texts: None,
        query_embeddings: Some(vec![query_embedding]),
        where_metadata: None,
        where_document: None,
        n_results: Some(limit),
        include: Some(vec!["distances", "metadatas"]),
    };
    
    let results = collection.query(query_options, None).await
        .map_err(|e| {
            let error_msg = format!("類似トピックの検索に失敗しました: {}", e);
            eprintln!("[search_topics_in_collection] ❌ ChromaDB検索エラー: {}", e);
            error_msg
        })?;
    
    let mut similar_topics = Vec::new();
    if !results.ids.is_empty() {
        if let Some(distances) = &results.distances {
            if !distances.is_empty() {
                if let Some(id_vec) = results.ids.get(0) {
                    if let Some(distance_vec) = distances.get(0) {
                        if let Some(metadatas_vec) = &results.metadatas {
                            if let Some(metadatas) = metadatas_vec.get(0) {
                                for (i, topic_id) in id_vec.iter().enumerate() {
                                    if let Some(distance) = distance_vec.get(i) {
                                        let distance_f32: f32 = *distance;
                                        let similarity = (1.0_f32 - distance_f32).max(0.0_f32);
                                        
                                        let metadata = metadatas
                                            .get(i)
                                            .and_then(|m_opt| m_opt.as_ref());
                                        
                                        let meeting_note_id = metadata
                                            .and_then(|m| {
                                                m.get("meetingNoteId")
                                                    .and_then(|v| v.as_str())
                                            })
                                            .unwrap_or("")
                                            .to_string();
                                        
                                        // メタデータからtitleとcontentSummaryを取得
                                        let title = metadata
                                            .and_then(|m| {
                                                m.get("title")
                                                    .and_then(|v| v.as_str())
                                            })
                                            .unwrap_or("")
                                            .to_string();
                                        
                                        let content_summary = metadata
                                            .and_then(|m| {
                                                m.get("contentSummary")
                                                    .and_then(|v| v.as_str())
                                            })
                                            .unwrap_or("")
                                            .to_string();
                                        
                                        similar_topics.push(TopicSearchResult {
                                            topic_id: topic_id.clone(),
                                            meeting_note_id,
                                            similarity,
                                            title,
                                            content_summary,
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    Ok(similar_topics)
}

/// トピック埋め込みを取得
pub async fn get_topic_embedding(
    topic_id: String,
    organization_id: String,
) -> Result<Option<HashMap<String, Value>>, String> {
    // クライアントが初期化されていない場合、自動的に初期化を試みる
    if CHROMADB_CLIENT.get().is_none() {
        eprintln!("⚠️ ChromaDBクライアントが初期化されていません。自動初期化を試みます...");
        
        // サーバーが起動しているか確認
        let server_lock = CHROMADB_SERVER.get();
        let port = if let Some(server_lock) = server_lock {
            // MutexGuardをスコープ内でドロップしてから.awaitを呼び出す
            let port_opt = {
                let server_guard = server_lock.lock().unwrap();
                server_guard.as_ref().map(|server| server.port())
            };
            
            if let Some(port) = port_opt {
                // サーバーが起動している場合、ポート番号を取得
                port
            } else {
                // サーバーが起動していない場合、自動的に起動を試みる
                eprintln!("⚠️ ChromaDBサーバーが起動していません。自動起動を試みます...");
                
                // ポート番号を環境変数から取得（デフォルトは8000）
                let port = std::env::var("CHROMADB_PORT")
                    .ok()
                    .and_then(|s| s.parse::<u16>().ok())
                    .unwrap_or(8000);
                
                // データディレクトリを取得
                let data_dir = get_default_chromadb_data_dir()?;
                
                // サーバーを起動
                match init_chromadb_server(data_dir, port).await {
                    Ok(_) => {
                        eprintln!("✅ ChromaDBサーバーの自動起動に成功しました");
                        port
                    }
                    Err(e) => {
                        eprintln!("❌ ChromaDBサーバーの自動起動に失敗しました: {}", e);
                        return Err(format!("ChromaDBサーバーの起動に失敗しました: {}。アプリケーションを再起動してください。", e));
                    }
                }
            }
        } else {
            // CHROMADB_SERVERが初期化されていない場合、自動的に起動を試みる
            eprintln!("⚠️ ChromaDBサーバーが初期化されていません。自動起動を試みます...");
            
            // ポート番号を環境変数から取得（デフォルトは8000）
            let port = std::env::var("CHROMADB_PORT")
                .ok()
                .and_then(|s| s.parse::<u16>().ok())
                .unwrap_or(8000);
            
            // データディレクトリを取得
            let data_dir = get_default_chromadb_data_dir()?;
            
            // サーバーを起動
            match init_chromadb_server(data_dir, port).await {
                Ok(_) => {
                    eprintln!("✅ ChromaDBサーバーの自動起動に成功しました");
                    port
                }
                Err(e) => {
                    eprintln!("❌ ChromaDBサーバーの自動起動に失敗しました: {}", e);
                    return Err(format!("ChromaDBサーバーの起動に失敗しました: {}。アプリケーションを再起動してください。", e));
                }
            }
        };
        
        // クライアントを初期化
        init_chromadb_client(port).await?;
    }
    
    let client_lock = get_chromadb_client()?;
    // organizationIdが空文字列の場合は"topics_all"を使用（ChromaDBの命名規則に準拠）
    let collection_name = if organization_id.is_empty() {
        "topics_all".to_string()
    } else {
        format!("topics_{}", organization_id)
    };
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    // コレクションを取得
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    // IDから直接取得
    let get_options = GetOptions {
        ids: vec![topic_id.clone()],
        where_metadata: None,
        where_document: None,
        limit: Some(1),
        offset: None,
        include: Some(vec!["embeddings".to_string(), "metadatas".to_string()]),
    };
    
    let results = collection.get(get_options).await
        .map_err(|e| format!("トピック埋め込みの取得に失敗しました: {}", e))?;
    
    // 結果を確認
    if results.ids.is_empty() {
        return Ok(None);
    }
    
    // メタデータと埋め込みを取得
    let mut result_data = HashMap::new();
    
    // 埋め込みを取得
    if let Some(embeddings) = &results.embeddings {
        if !embeddings.is_empty() {
            if let Some(embedding_opt) = embeddings.get(0) {
                if let Some(embedding_vec) = embedding_opt {
                    result_data.insert("combinedEmbedding".to_string(), Value::Array(
                        embedding_vec.iter().map(|&v| Value::Number(serde_json::Number::from_f64(v as f64).unwrap())).collect()
                    ));
                }
            }
        }
    }
    
    // メタデータを取得
    if let Some(metadatas) = &results.metadatas {
        if !metadatas.is_empty() {
            if let Some(metadata_opt) = metadatas.get(0) {
                if let Some(metadata_map) = metadata_opt {
                    for (k, v) in metadata_map {
                        result_data.insert(k.clone(), v.clone());
                    }
                }
            }
        }
    }
    
    if result_data.is_empty() {
        Ok(None)
    } else {
        Ok(Some(result_data))
    }
}

/// 類似トピックを検索（組織横断検索対応）
pub async fn find_similar_topics(
    query_embedding: Vec<f32>,
    limit: usize,
    organization_id: Option<String>,
) -> Result<Vec<TopicSearchResult>, String> {
    eprintln!("[find_similar_topics] 検索開始: organizationId={:?}, limit={}, embedding_dim={}", 
        organization_id, limit, query_embedding.len());
    
    let client_lock = get_chromadb_client()?;
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    // 検索対象の組織IDリストを決定
    let org_ids: Vec<String> = match organization_id {
        Some(id) if !id.is_empty() => {
            vec![id]
        },
        _ => {
            // 組織横断検索: すべての組織を検索
            eprintln!("[find_similar_topics] organizationIdが未指定のため、すべての組織を検索します");
            use crate::database::get_all_organizations;
            match get_all_organizations() {
                Ok(orgs) => {
                    let ids: Vec<String> = orgs.into_iter().map(|o| o.id).collect();
                    eprintln!("[find_similar_topics] 検索対象組織数: {}件", ids.len());
                    ids
                },
                Err(e) => {
                    eprintln!("[find_similar_topics] ⚠️ 組織一覧の取得に失敗しました: {}", e);
                    return Ok(Vec::new());
                },
            }
        },
    };
    
    // 各組織のコレクションに対して検索を実行（並列実行）
    let mut all_results = Vec::new();
    let mut search_tasks = Vec::new();
    
    for org_id in org_ids {
        // org_idは組織IDのリストから来ているので、空文字列になることはないが、念のためチェック
        let collection_name = if org_id.is_empty() {
            "topics_all".to_string()
        } else {
            format!("topics_{}", org_id)
        };
        let client_clone = client.clone();
        let embedding_clone = query_embedding.clone();
        
        let task = tokio::spawn(async move {
            search_topics_in_collection(client_clone, &collection_name, embedding_clone, limit).await
        });
        search_tasks.push((org_id, task));
    }
    
    // すべての検索タスクの完了を待つ
    for (org_id, task) in search_tasks {
        match task.await {
            Ok(Ok(results)) => {
                eprintln!("[find_similar_topics] 組織 '{}' から {}件の結果を取得", org_id, results.len());
                all_results.extend(results);
            },
            Ok(Err(e)) => {
                eprintln!("[find_similar_topics] ⚠️ 組織 '{}' の検索エラー: {}", org_id, e);
            },
            Err(e) => {
                eprintln!("[find_similar_topics] ⚠️ 組織 '{}' の検索タスクエラー: {}", org_id, e);
            },
        }
    }
    
    // 結果を類似度でソートして上位limit件を返す
    all_results.sort_by(|a, b| b.similarity.partial_cmp(&a.similarity).unwrap_or(std::cmp::Ordering::Equal));
    let final_results: Vec<TopicSearchResult> = all_results.into_iter().take(limit).collect();
    
    eprintln!("[find_similar_topics] 最終結果: {}件のトピックを返します", final_results.len());
    Ok(final_results)
}

/// システム設計ドキュメントの埋め込みを保存
pub async fn save_design_doc_embedding(
    section_id: String,
    combined_embedding: Vec<f32>,
    metadata: HashMap<String, Value>,
) -> Result<(), String> {
    let client_lock = get_chromadb_client()?;
    let collection_name = "design_docs";  // 組織ごとではなく、全体で1つのコレクション
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    // コレクションを取得または作成
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    // メタデータにセクションIDを追加
    let mut embedding_metadata = metadata;
    embedding_metadata.insert("sectionId".to_string(), Value::String(section_id.clone()));
    
    // メタデータをChromaDBの形式に変換（serde_json::Mapを使用）
    // ChromaDBはnull値をサポートしないため、nullを空文字列に変換
    let mut chroma_metadata = serde_json::Map::new();
    for (k, v) in embedding_metadata {
        let value = match v {
            Value::Null => Value::String(String::new()),
            Value::String(s) => Value::String(s),
            Value::Number(n) => Value::Number(n),
            Value::Bool(b) => Value::Bool(b),
            Value::Array(a) => {
                // 配列内のnullも処理
                let cleaned: Vec<Value> = a.into_iter().map(|item| {
                    match item {
                        Value::Null => Value::String(String::new()),
                        _ => item,
                    }
                }).collect();
                Value::Array(cleaned)
            },
            Value::Object(o) => {
                // オブジェクト内のnullも処理
                let mut cleaned = serde_json::Map::new();
                for (key, val) in o {
                    let cleaned_val = match val {
                        Value::Null => Value::String(String::new()),
                        _ => val,
                    };
                    cleaned.insert(key, cleaned_val);
                }
                Value::Object(cleaned)
            },
        };
        chroma_metadata.insert(k, value);
    }
    
    // 埋め込みを追加
    let entries = CollectionEntries {
        ids: vec![section_id.as_str()],
        embeddings: Some(vec![combined_embedding]),
        metadatas: Some(vec![chroma_metadata]),
        documents: None,
    };
    
    collection.upsert(entries, None).await
        .map_err(|e| format!("システム設計ドキュメント埋め込みの保存に失敗しました: {}", e))?;
    
    Ok(())
}

/// 類似システム設計ドキュメントを検索
pub async fn find_similar_design_docs(
    query_embedding: Vec<f32>,
    limit: usize,
    section_id: Option<String>,
    tags: Option<Vec<String>>,
) -> Result<Vec<(String, f32)>, String> {
    let client_lock = get_chromadb_client()?;
    let collection_name = "design_docs";
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    // メタデータフィルターを構築
    let mut where_metadata: Option<serde_json::Map<String, Value>> = None;
    if let Some(sid) = section_id {
        let mut filter = serde_json::Map::new();
        filter.insert("sectionId".to_string(), Value::String(sid));
        where_metadata = Some(filter);
    } else if let Some(tags_vec) = tags {
        // タグフィルター（ChromaDBでは$in演算子を使用）
        // タグはJSON文字列として保存されているため、完全一致で検索
        // 注意: ChromaDBのメタデータフィルターは完全一致のみサポート
        // タグの部分一致は検索後にフィルタリングする必要がある
        if !tags_vec.is_empty() {
            // 最初のタグでフィルタリング（簡易実装）
            // 完全な実装には検索後のフィルタリングが必要
            let mut filter = serde_json::Map::new();
            // タグはJSON文字列として保存されているため、直接フィルタリングは困難
            // 検索後にフィルタリングする方が実用的
        }
    }
    
    // includeオプションでdistancesのみを指定（メタデータを除外してnull値の問題を回避）
    // 注意: ChromaDBでは"ids"は常に返されるため、includeオプションには含めない
    let include_options = vec!["distances"];
    
    let query_options = QueryOptions {
        query_texts: None,
        query_embeddings: Some(vec![query_embedding]),
        where_metadata: where_metadata.as_ref().map(|m| {
            serde_json::Value::Object(m.clone())
        }),
        where_document: None,
        n_results: Some(limit),
        include: Some(include_options), // distancesのみを指定（メタデータを除外）
    };
    
    let results = collection.query(query_options, None).await
        .map_err(|e| format!("類似システム設計ドキュメントの検索に失敗しました: {}", e))?;
    
    let mut similar_docs = Vec::new();
    if !results.ids.is_empty() {
        if let Some(distances) = &results.distances {
            if !distances.is_empty() {
                if let Some(id_vec) = results.ids.get(0) {
                    if let Some(distance_vec) = distances.get(0) {
                        for (i, section_id) in id_vec.iter().enumerate() {
                            if let Some(distance) = distance_vec.get(i) {
                                // 距離を類似度に変換（1 - distance）
                                let distance_f32: f32 = *distance;
                                let similarity = 1.0 - distance_f32;
                                similar_docs.push((section_id.clone(), similarity));
                            }
                        }

                    }
                }
            }
        }
    }
    
    Ok(similar_docs)
}

/// システム設計ドキュメントのメタデータを取得
pub async fn get_design_doc_metadata(
    section_id: String,
) -> Result<HashMap<String, Value>, String> {
    let client_lock = get_chromadb_client()?;
    let collection_name = "design_docs";
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    // getメソッドを使用して特定のIDのメタデータを取得
    // ChromaDBのドキュメントIDはsection_idそのもの
    let get_options = GetOptions {
        ids: vec![section_id.clone()], // 特定のIDを指定
        where_metadata: None,
        limit: None,
        offset: None,
        where_document: None,
        include: Some(vec!["metadatas".to_string()]), // メタデータのみを取得
    };
    
    let results = collection.get(get_options).await
        .map_err(|e| format!("システム設計ドキュメントメタデータの取得に失敗しました: {}", e))?;
    
    // メタデータを取得
    if let Some(metadatas) = &results.metadatas {
        if let Some(metadata_opt) = metadatas.get(0) {
            if let Some(metadata_map) = metadata_opt {
                let mut result_map = HashMap::new();
                for (k, v) in metadata_map {
                    // null値を空文字列に変換（ChromaDBのレスポンスにnullが含まれる場合がある）
                    let cleaned_value = match v {
                        Value::Null => Value::String(String::new()),
                        _ => v.clone(),
                    };
                    result_map.insert(k.clone(), cleaned_value);
                }
                return Ok(result_map);
            }
        }
    }
    
    Err("メタデータが見つかりませんでした".to_string())
}

/// システム設計ドキュメントコレクション内の全セクションIDを取得（デバッグ用）
pub async fn list_design_doc_section_ids() -> Result<Vec<String>, String> {
    let client_lock = get_chromadb_client()?;
    let collection_name = "design_docs";
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    // 全データを取得（getメソッドを使用）
    // idsを空のベクトルにすると全IDを取得できる
    // 注意: ChromaDBでは"ids"は常に返されるため、includeオプションには含めない
    let get_options = GetOptions {
        ids: vec![], // 空のベクトルで全IDを取得
        where_metadata: None,
        limit: None,
        offset: None,
        where_document: None,
        include: None, // idsは常に返されるため、NoneでOK
    };
    
    let results = collection.get(get_options).await
        .map_err(|e| format!("システム設計ドキュメント一覧の取得に失敗しました: {}", e))?;
    
    let mut section_ids = Vec::new();
    // results.idsはVec<String>型
    for section_id in results.ids {
        section_ids.push(section_id);
    }
    
    Ok(section_ids)
}

/// トピック埋め込みを削除
pub async fn delete_topic_embedding(
    topic_id: String,
    organization_id: String,
) -> Result<(), String> {
    let client_lock = get_chromadb_client()?;
    // organizationIdが空文字列の場合は"topics_all"を使用（ChromaDBの命名規則に準拠）
    let collection_name = if organization_id.is_empty() {
        "topics_all".to_string()
    } else {
        format!("topics_{}", organization_id)
    };
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    // トピックIDで削除
    // ChromaDBのIDはtopicIdそのもの（save_topic_embeddingでtopic_idをそのままIDとして使用）
    collection.delete(
        Some(vec![topic_id.as_str()]),
        None,
        None,
    ).await
        .map_err(|e| format!("トピック埋め込みの削除に失敗しました: {}", e))?;
    
    Ok(())
}

/// エンティティ埋め込みを削除
pub async fn delete_entity_embedding(
    entity_id: String,
    organization_id: String,
) -> Result<(), String> {
    let client_lock = get_chromadb_client()?;
    // organizationIdが空文字列の場合は"entities_all"を使用（ChromaDBの命名規則に準拠）
    let collection_name = if organization_id.is_empty() {
        "entities_all".to_string()
    } else {
        format!("entities_{}", organization_id)
    };
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    // エンティティIDで削除
    collection.delete(
        Some(vec![entity_id.as_str()]),
        None,
        None,
    ).await
        .map_err(|e| format!("エンティティ埋め込みの削除に失敗しました: {}", e))?;
    
    Ok(())
}

/// リレーション埋め込みを削除
pub async fn delete_relation_embedding(
    relation_id: String,
    organization_id: String,
) -> Result<(), String> {
    let client_lock = get_chromadb_client()?;
    // organizationIdが空文字列の場合は"relations_all"を使用（ChromaDBの命名規則に準拠）
    let collection_name = if organization_id.is_empty() {
        "relations_all".to_string()
    } else {
        format!("relations_{}", organization_id)
    };
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    // リレーションIDで削除
    collection.delete(
        Some(vec![relation_id.as_str()]),
        None,
        None,
    ).await
        .map_err(|e| format!("リレーション埋め込みの削除に失敗しました: {}", e))?;
    
    Ok(())
}
