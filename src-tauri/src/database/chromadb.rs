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
use chromadb::client::{ChromaAuthMethod, ChromaClient, ChromaClientOptions};
use chromadb::collection::{ChromaCollection, CollectionEntries, QueryOptions, GetOptions};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

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
            .map_err(|e| format!("ChromaDBサーバーの起動に失敗しました: {}", e))?;

        eprintln!("   ChromaDB Serverプロセスを起動しました (PID: {})", child.id().unwrap_or(0));

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

        // 起動に失敗した場合、プロセスを終了
        let _ = child.kill().await;
        
        Err("ChromaDB Serverの起動確認に失敗しました（10秒以内に起動しませんでした）".to_string())
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
    if let Some(server_lock) = CHROMADB_SERVER.get() {
        let mut server_guard = server_lock.lock().unwrap();
        if let Some(mut server) = server_guard.take() {
            server.stop().await?;
        }
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

/// エンティティ埋め込みを保存
pub async fn save_entity_embedding(
    entity_id: String,
    organization_id: String,
    combined_embedding: Vec<f32>,
    metadata: HashMap<String, Value>,
) -> Result<(), String> {
    let client_lock = get_chromadb_client()?;
    let collection_name = format!("entities_{}", organization_id);
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    // コレクションを取得または作成
    let collection = client.get_or_create_collection(&collection_name, None).await
        .map_err(|e| format!("コレクションの取得/作成に失敗しました: {}", e))?;
    
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
    let collection = client.get_or_create_collection(collection_name, None).await
        .map_err(|e| format!("コレクションの取得に失敗しました: {}", e))?;
    
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
        let collection_name = format!("entities_{}", org_id);
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
    
    let collection = client.get_or_create_collection(&collection_name, None).await
        .map_err(|e| format!("コレクションの取得に失敗しました: {}", e))?;
    
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
    let collection_name = format!("relations_{}", organization_id);
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    let collection = client.get_or_create_collection(&collection_name, None).await
        .map_err(|e| format!("コレクションの取得/作成に失敗しました: {}", e))?;
    
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

/// 単一のコレクションから類似リレーションを検索（ヘルパー関数）
async fn search_relations_in_collection(
    client: Arc<ChromaClient>,
    collection_name: &str,
    query_embedding: Vec<f32>,
    limit: usize,
) -> Result<Vec<(String, f32)>, String> {
    let collection = client.get_or_create_collection(collection_name, None).await
        .map_err(|e| format!("コレクションの取得に失敗しました: {}", e))?;
    
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
        let collection_name = format!("relations_{}", org_id);
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
    
    let collection = client.get_or_create_collection(&collection_name, None).await
        .map_err(|e| format!("コレクションの取得/作成に失敗しました: {}", e))?;
    
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
async fn search_topics_in_collection(
    client: Arc<ChromaClient>,
    collection_name: &str,
    query_embedding: Vec<f32>,
    limit: usize,
) -> Result<Vec<(String, String, f32)>, String> {
    let collection = client.get_or_create_collection(collection_name, None).await
        .map_err(|e| format!("コレクションの取得に失敗しました: {}", e))?;
    
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
                                        
                                        let meeting_note_id = metadatas
                                            .get(i)
                                            .and_then(|m_opt| m_opt.as_ref())
                                            .and_then(|m| {
                                                m.get("meetingNoteId")
                                                    .and_then(|v| v.as_str())
                                            })
                                            .unwrap_or("")
                                            .to_string();
                                        
                                        similar_topics.push((topic_id.clone(), meeting_note_id, similarity));
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

/// 類似トピックを検索（組織横断検索対応）
pub async fn find_similar_topics(
    query_embedding: Vec<f32>,
    limit: usize,
    organization_id: Option<String>,
) -> Result<Vec<(String, String, f32)>, String> {
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
        let collection_name = format!("topics_{}", org_id);
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
    all_results.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap_or(std::cmp::Ordering::Equal));
    let final_results: Vec<(String, String, f32)> = all_results.into_iter().take(limit).collect();
    
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
    let collection = client.get_or_create_collection(&collection_name, None).await
        .map_err(|e| format!("コレクションの取得/作成に失敗しました: {}", e))?;
    
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
    
    let collection = client.get_or_create_collection(&collection_name, None).await
        .map_err(|e| format!("コレクションの取得に失敗しました: {}", e))?;
    
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
    
    let collection = client.get_or_create_collection(&collection_name, None).await
        .map_err(|e| format!("コレクションの取得に失敗しました: {}", e))?;
    
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
    
    let collection = client.get_or_create_collection(&collection_name, None).await
        .map_err(|e| format!("コレクションの取得に失敗しました: {}", e))?;
    
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
    let collection_name = format!("topics_{}", organization_id);
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    let collection = client.get_or_create_collection(&collection_name, None).await
        .map_err(|e| format!("コレクションの取得に失敗しました: {}", e))?;
    
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
    let collection_name = format!("entities_{}", organization_id);
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    let collection = client.get_or_create_collection(&collection_name, None).await
        .map_err(|e| format!("コレクションの取得に失敗しました: {}", e))?;
    
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
    let collection_name = format!("relations_{}", organization_id);
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    let collection = client.get_or_create_collection(&collection_name, None).await
        .map_err(|e| format!("コレクションの取得に失敗しました: {}", e))?;
    
    // リレーションIDで削除
    collection.delete(
        Some(vec![relation_id.as_str()]),
        None,
        None,
    ).await
        .map_err(|e| format!("リレーション埋め込みの削除に失敗しました: {}", e))?;
    
    Ok(())
}
