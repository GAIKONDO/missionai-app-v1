use tauri::{AppHandle, Manager, State};
use std::collections::HashMap;
use std::fs;
use crate::db::{WriteJob, WriteQueueState};

#[tauri::command]
pub async fn get_version() -> Result<String, String> {
    Ok("1.0.0-local".to_string())
}

#[tauri::command]
pub async fn get_path(app: AppHandle) -> Result<String, String> {
    match app.path().app_data_dir() {
        Ok(path) => Ok(path.to_string_lossy().to_string()),
        Err(e) => Err(format!("パス取得エラー: {}", e)),
    }
}

#[tauri::command]
pub async fn get_project_root() -> Result<String, String> {
    // 開発環境では、現在の作業ディレクトリがプロジェクトルートになる可能性が高い
    // 環境変数から取得を試みる
    if let Ok(project_root) = std::env::var("PROJECT_ROOT") {
        return Ok(project_root);
    }
    
    // 環境変数が設定されていない場合、現在の作業ディレクトリを使用
    match std::env::current_dir() {
        Ok(path) => Ok(path.to_string_lossy().to_string()),
        Err(e) => Err(format!("プロジェクトルートの取得に失敗しました: {}", e)),
    }
}

#[tauri::command]
pub async fn get_database_path(app: AppHandle) -> Result<String, String> {
    match app.path().app_data_dir() {
        Ok(app_data_dir) => {
            // 開発環境と本番環境で異なるディレクトリを使用
            let db_dir_name = if cfg!(debug_assertions) {
                "mission-ai-local-dev"
            } else {
                "mission-ai-local"
            };
            let db_dir = app_data_dir.join(db_dir_name);
            let db_path = db_dir.join("app.db");
            Ok(db_path.to_string_lossy().to_string())
        },
        Err(e) => Err(format!("データベースパス取得エラー: {}", e)),
    }
}

#[tauri::command]
pub async fn check_database_status() -> Result<HashMap<String, String>, String> {
    use crate::database::get_db;
    
    let mut status = HashMap::new();
    
    eprintln!("🔍 [check_database_status] データベース状態を確認中...");
    
    // データベースが初期化されているか確認
    if let Some(_db) = get_db() {
        eprintln!("✅ [check_database_status] データベースは初期化されています");
        status.insert("initialized".to_string(), "true".to_string());
        status.insert("status".to_string(), "接続済み".to_string());
        status.insert("message".to_string(), "データベースは正常に動作しています".to_string());
    } else {
        eprintln!("❌ [check_database_status] データベースは初期化されていません");
        status.insert("initialized".to_string(), "false".to_string());
        status.insert("status".to_string(), "未初期化".to_string());
        status.insert("error".to_string(), "データベースが初期化されていません。アプリケーションを再起動するか、データベースを再初期化してください。".to_string());
        status.insert("message".to_string(), "データベースが利用できません。diagnose_databaseコマンドで詳細な診断情報を確認してください。".to_string());
    }
    
    Ok(status)
}

#[tauri::command]
pub async fn reinitialize_database(app: AppHandle) -> Result<HashMap<String, String>, String> {
    use crate::database::{init_database, get_db};
    
    let mut result = HashMap::new();
    
    eprintln!("🔄 データベースの再初期化を開始します...");
    
    // 既存のデータベース接続をクリア（安全のため）
    // 注意: これはunsafe操作なので、慎重に行う
    
    match init_database(&app) {
        Ok(_) => {
            // データベースが正しく初期化されたか確認
            if get_db().is_some() {
                result.insert("success".to_string(), "true".to_string());
                result.insert("message".to_string(), "データベースの再初期化が完了しました".to_string());
                eprintln!("✅ データベースの再初期化が完了しました");
                Ok(result)
            } else {
                result.insert("success".to_string(), "false".to_string());
                result.insert("error".to_string(), "データベースの初期化は成功しましたが、接続の取得に失敗しました".to_string());
                eprintln!("❌ データベースの接続取得に失敗しました");
                Err("データベースの接続取得に失敗しました".to_string())
            }
        }
        Err(e) => {
            let error_msg = format!("{}", e);
            result.insert("success".to_string(), "false".to_string());
            result.insert("error".to_string(), error_msg.clone());
            eprintln!("❌ データベースの再初期化に失敗しました: {}", error_msg);
            Err(format!("データベースの再初期化に失敗しました: {}", error_msg))
        }
    }
}

#[tauri::command]
pub async fn list_tables() -> Result<Vec<String>, String> {
    use crate::database::get_db;
    
    let db = get_db().ok_or("データベースが初期化されていません")?;
    let conn = db.get_connection().map_err(|e| format!("コネクション取得エラー: {}", e))?;
    
    let mut stmt = conn.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).map_err(|e| format!("テーブル一覧取得エラー: {}", e))?;
    
    let tables: Result<Vec<String>, _> = stmt.query_map([], |row| {
        Ok(row.get::<_, String>(0)?)
    }).map_err(|e| format!("クエリエラー: {}", e))?
    .collect();
    
    tables.map_err(|e| format!("テーブル一覧取得エラー: {}", e))
}

#[tauri::command]
pub async fn diagnose_database(app: AppHandle) -> Result<HashMap<String, String>, String> {
    
    let mut diagnostics = HashMap::new();
    
    // アプリケーションデータディレクトリの確認
    match app.path().app_data_dir() {
        Ok(app_data_dir) => {
            let app_data_dir_str = app_data_dir.display().to_string();
            diagnostics.insert("app_data_dir".to_string(), app_data_dir_str.clone());
            diagnostics.insert("app_data_dir_exists".to_string(), app_data_dir.exists().to_string());
            
            // データベースディレクトリの確認（開発環境と本番環境で異なるディレクトリ）
            let db_dir_name = if cfg!(debug_assertions) {
                "mission-ai-local-dev"
            } else {
                "mission-ai-local"
            };
            let db_dir = app_data_dir.join(db_dir_name);
            let db_dir_str = db_dir.display().to_string();
            diagnostics.insert("db_dir".to_string(), db_dir_str.clone());
            diagnostics.insert("db_dir_exists".to_string(), db_dir.exists().to_string());
            diagnostics.insert("environment".to_string(), if cfg!(debug_assertions) { "開発環境" } else { "本番環境" }.to_string());
            
            // データベースファイルの確認
            let db_path = db_dir.join("app.db");
            let db_path_str = db_path.display().to_string();
            diagnostics.insert("db_path".to_string(), db_path_str.clone());
            diagnostics.insert("db_file_exists".to_string(), db_path.exists().to_string());
            
            // ファイルの詳細情報
            if db_path.exists() {
                match fs::metadata(&db_path) {
                    Ok(metadata) => {
                        diagnostics.insert("db_file_size".to_string(), metadata.len().to_string());
                        diagnostics.insert("db_file_readonly".to_string(), metadata.permissions().readonly().to_string());
                        
                        // ディレクトリの書き込み権限を確認
                        match fs::metadata(&db_dir) {
                            Ok(dir_metadata) => {
                                diagnostics.insert("db_dir_writable".to_string(), (!dir_metadata.permissions().readonly()).to_string());
                            },
                            Err(e) => {
                                diagnostics.insert("db_dir_writable".to_string(), format!("確認失敗: {}", e));
                            }
                        }
                    },
                    Err(e) => {
                        diagnostics.insert("db_file_metadata_error".to_string(), format!("{}", e));
                    }
                }
            } else {
                // データベースファイルが存在しない場合、ディレクトリの書き込み権限を確認
                match fs::metadata(&db_dir) {
                    Ok(dir_metadata) => {
                        diagnostics.insert("db_dir_writable".to_string(), (!dir_metadata.permissions().readonly()).to_string());
                    },
                    Err(e) => {
                        diagnostics.insert("db_dir_writable".to_string(), format!("確認失敗: {}", e));
                    }
                }
            }
        },
        Err(e) => {
            diagnostics.insert("app_data_dir_error".to_string(), format!("{}", e));
        }
    }
    
    // データベースの初期化状態を確認
    use crate::database::get_db;
    if get_db().is_some() {
        diagnostics.insert("db_initialized".to_string(), "true".to_string());
        diagnostics.insert("db_status".to_string(), "接続済み".to_string());
    } else {
        diagnostics.insert("db_initialized".to_string(), "false".to_string());
        diagnostics.insert("db_status".to_string(), "未初期化".to_string());
        diagnostics.insert("db_error".to_string(), "データベースが初期化されていません。アプリケーション起動時にエラーが発生した可能性があります。".to_string());
    }
    
    // 診断結果のサマリーを作成
    let mut summary = Vec::new();
    if diagnostics.get("db_initialized") == Some(&"false".to_string()) {
        summary.push("⚠️ データベースが初期化されていません");
    }
    if diagnostics.get("db_file_exists") == Some(&"false".to_string()) {
        summary.push("⚠️ データベースファイルが存在しません");
    }
    if let Some(writable) = diagnostics.get("db_dir_writable") {
        if writable == "false" {
            summary.push("⚠️ データベースディレクトリに書き込み権限がありません");
        }
    }
    if summary.is_empty() {
        summary.push("✅ すべてのチェックが正常です");
    }
    diagnostics.insert("summary".to_string(), summary.join("\n"));
    
    eprintln!("🔍 [diagnose_database] 診断完了: {}項目をチェック", diagnostics.len());
    
    Ok(diagnostics)
}

#[tauri::command]
pub async fn update_chroma_sync_status(
    state: State<'_, WriteQueueState>,
    entity_type: String,
    entity_id: String,
    synced: bool,
    error: Option<String>,
) -> Result<(), String> {
    state.tx.send(WriteJob::UpdateChromaSyncStatus {
        entity_type,
        entity_id,
        synced,
        error,
    }).await
    .map_err(|e| format!("書き込みキューへの送信に失敗しました: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn get_table_schema(table_name: String) -> Result<HashMap<String, String>, String> {
    use crate::database::get_db;
    
    let db = get_db().ok_or("データベースが初期化されていません")?;
    let conn = db.get_connection().map_err(|e| format!("コネクション取得エラー: {}", e))?;
    
    let mut schema = HashMap::new();
    
    // テーブルが存在するか確認
    let table_exists: bool = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
        [&table_name],
        |row| row.get(0),
    ).map_err(|e| format!("テーブル存在確認エラー: {}", e))?;
    
    if !table_exists {
        return Err(format!("テーブル '{}' が存在しません", table_name));
    }
    
    schema.insert("table_name".to_string(), table_name.clone());
    schema.insert("exists".to_string(), "true".to_string());
    
    // テーブル構造を取得
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({})", table_name))
        .map_err(|e| format!("PRAGMA table_infoエラー: {}", e))?;
    
    let columns: Result<Vec<(String, String, i32, Option<String>, i32, i32)>, _> = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(1)?, // name
            row.get::<_, String>(2)?, // type
            row.get::<_, i32>(3)?,    // notnull
            row.get::<_, Option<String>>(4)?, // default_value
            row.get::<_, i32>(5)?,    // pk
            row.get::<_, i32>(0)?,    // cid
        ))
    }).map_err(|e| format!("カラム情報取得エラー: {}", e))?
    .collect();
    
    let columns = columns.map_err(|e| format!("カラム情報収集エラー: {}", e))?;
    
    // 各カラムの情報を追加
    for (i, (name, col_type, notnull, default_value, pk, _cid)) in columns.iter().enumerate() {
        let key = format!("column_{}_name", i);
        schema.insert(key, name.clone());
        
        let key = format!("column_{}_type", i);
        schema.insert(key, col_type.clone());
        
        let key = format!("column_{}_notnull", i);
        schema.insert(key, notnull.to_string());
        
        let key = format!("column_{}_default", i);
        schema.insert(key, default_value.clone().unwrap_or_else(|| "NULL".to_string()));
        
        let key = format!("column_{}_pk", i);
        schema.insert(key, pk.to_string());
    }
    
    schema.insert("column_count".to_string(), columns.len().to_string());
    
    // organizationIdカラムの詳細情報を追加（存在する場合）
    if let Some((_, _, notnull, _, _, _)) = columns.iter().find(|(name, _, _, _, _, _)| name == "organizationId") {
        schema.insert("organizationId_notnull".to_string(), notnull.to_string());
        schema.insert("organizationId_nullable".to_string(), if *notnull == 0 { "true" } else { "false" }.to_string());
    } else {
        schema.insert("organizationId_exists".to_string(), "false".to_string());
    }
    
    Ok(schema)
}

