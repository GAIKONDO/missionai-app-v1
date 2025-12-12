use crate::database::{sign_in as db_sign_in, sign_up as db_sign_up, sign_out as db_sign_out, 
                      get_current_user as db_get_current_user, get_doc, set_doc, update_doc, delete_doc, add_doc, get_collection,
                      export_to_file, import_from_file, export_organizations_and_members_to_file,
                      delete_meeting_note_with_relations as db_delete_meeting_note_with_relations};
use serde_json::Value;
use std::collections::HashMap;

#[tauri::command]
pub async fn sign_in(email: String, password: String) -> Result<HashMap<String, Value>, String> {
    match db_sign_in(email.clone(), password) {
        Ok(result) => {
            let mut map = HashMap::new();
            map.insert("user".to_string(), serde_json::to_value(result.user).unwrap());
            Ok(map)
        }
        Err(e) => {
            let error_msg = format!("{}", e);
            let detailed_error = if error_msg.contains("データベースが初期化されていません") {
                format!(
                    "データベースが初期化されていません。\n\n\
                    対処法:\n\
                    1. アプリケーションを再起動してください\n\
                    2. それでも解決しない場合は、reinitialize_databaseコマンドを実行してください\n\
                    3. エラーが続く場合は、データベースファイルを削除して再起動してください"
                )
            } else if error_msg.contains("Query returned no rows") {
                format!(
                    "メールアドレスまたはパスワードが正しくありません。\n\n\
                    入力されたメールアドレス: {}\n\n\
                    対処法:\n\
                    1. メールアドレスとパスワードを確認してください\n\
                    2. 新規登録が必要な場合は「新規登録はこちら」をクリックしてください\n\
                    3. デフォルトユーザーでログインする場合:\n\
                       - メールアドレス: admin@example.com\n\
                       - パスワード: admin123",
                    email
                )
            } else if error_msg.contains("InvalidQuery") {
                format!(
                    "ログインに失敗しました。\n\n\
                    入力されたメールアドレス: {}\n\n\
                    考えられる原因:\n\
                    1. パスワードが間違っている\n\
                    2. ユーザーが承認されていない\n\n\
                    対処法:\n\
                    1. パスワードを確認してください\n\
                    2. 新規登録の場合は、開発環境では自動承認されます\n\
                    3. デフォルトユーザーでログインする場合:\n\
                       - メールアドレス: admin@example.com\n\
                       - パスワード: admin123",
                    email
                )
            } else {
                format!(
                    "ログインエラーが発生しました。\n\n\
                    エラー詳細: {}\n\
                    入力されたメールアドレス: {}\n\n\
                    対処法:\n\
                    1. アプリケーションを再起動してください\n\
                    2. データベースを再初期化してください（reinitialize_databaseコマンド）\n\
                    3. エラーが続く場合は、ログを確認してください",
                    error_msg, email
                )
            };
            Err(detailed_error)
        }
    }
}

#[tauri::command]
pub async fn sign_up(email: String, password: String) -> Result<HashMap<String, Value>, String> {
    match db_sign_up(email, password) {
        Ok(result) => {
            let mut map = HashMap::new();
            map.insert("user".to_string(), serde_json::to_value(result.user).unwrap());
            Ok(map)
        }
        Err(e) => Err(format!("登録エラー: {}", e)),
    }
}

#[tauri::command]
pub async fn sign_out() -> Result<HashMap<String, Value>, String> {
    db_sign_out();
    Ok(HashMap::new())
}

#[tauri::command]
pub async fn get_current_user() -> Result<Option<HashMap<String, Value>>, String> {
    // デバッグ用ログ（呼び出し回数が多い場合はコメントアウト）
    // eprintln!("🔍 get_current_user called");
    
    match db_get_current_user() {
        Some(user) => {
            let mut map = HashMap::new();
            map.insert("uid".to_string(), Value::String(user.uid));
            map.insert("email".to_string(), Value::String(user.email));
            map.insert("emailVerified".to_string(), Value::Bool(user.email_verified));
            Ok(Some(map))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn doc_get(collection_name: String, doc_id: String) -> Result<HashMap<String, Value>, String> {
    match get_doc(&collection_name, &doc_id) {
        Ok(data) => {
            if data.is_empty() {
                let mut result = HashMap::new();
                result.insert("exists".to_string(), Value::Bool(false));
                result.insert("data".to_string(), Value::Null);
                Ok(result)
            } else {
                let mut result = HashMap::new();
                result.insert("exists".to_string(), Value::Bool(true));
                result.insert("data".to_string(), serde_json::to_value(data).unwrap());
                Ok(result)
            }
        }
        Err(e) => Err(format!("ドキュメント取得エラー: {}", e)),
    }
}

#[tauri::command]
pub async fn doc_set(collection_name: String, doc_id: String, data: HashMap<String, Value>) -> Result<HashMap<String, Value>, String> {
    eprintln!("📝 [doc_set] コマンドが呼び出されました: collection_name={}, doc_id={}", collection_name, doc_id);
    
    match set_doc(&collection_name, &doc_id, data) {
        Ok(_) => {
            eprintln!("✅ [doc_set] 成功: doc_id={}", doc_id);
            let mut result = HashMap::new();
            result.insert("id".to_string(), Value::String(doc_id));
            Ok(result)
        }
        Err(e) => {
            let error_msg = format!("{}", e);
            eprintln!("❌ [doc_set] エラー発生: {}", error_msg);
            eprintln!("❌ [doc_set] エラー詳細: {:?}", e);
            
            let detailed_error = if error_msg.contains("データベースが初期化されていません") {
                format!(
                    "データベースが利用できません。\n\
                    詳細: {}\n\
                    対処法: アプリケーションを再起動するか、reinitialize_databaseコマンドを実行してください。",
                    error_msg
                )
            } else if error_msg.contains("ユーザーがログインしていません") {
                format!(
                    "ユーザーがログインしていません。\n\
                    詳細: {}\n\
                    対処法: ログインしてから再度お試しください。",
                    error_msg
                )
            } else {
                format!(
                    "ドキュメント設定エラーが発生しました。\n\
                    詳細: {}\n\
                    コレクション名: {}\n\
                    ドキュメントID: {}",
                    error_msg, collection_name, doc_id
                )
            };
            
            Err(detailed_error)
        }
    }
}

#[tauri::command]
pub async fn doc_update(collection_name: String, doc_id: String, data: HashMap<String, Value>) -> Result<HashMap<String, Value>, String> {
    eprintln!("📝 [doc_update] コマンドが呼び出されました: collection_name={}, doc_id={}", collection_name, doc_id);
    eprintln!("📝 [doc_update] データキー: {:?}", data.keys().collect::<Vec<_>>());
    
    match update_doc(&collection_name, &doc_id, data) {
        Ok(_) => {
            eprintln!("✅ [doc_update] 成功: doc_id={}", doc_id);
            let mut result = HashMap::new();
            result.insert("id".to_string(), Value::String(doc_id));
            Ok(result)
        }
        Err(e) => {
            let error_msg = format!("ドキュメント更新エラー: {}", e);
            eprintln!("❌ [doc_update] エラー: {}", error_msg);
            Err(error_msg)
        }
    }
}

#[tauri::command]
pub async fn doc_delete(collection_name: String, doc_id: String) -> Result<HashMap<String, Value>, String> {
    eprintln!("🗑️ [doc_delete] コマンドが呼び出されました: collection_name={}, doc_id={}", collection_name, doc_id);
    
    match delete_doc(&collection_name, &doc_id) {
        Ok(_) => {
            eprintln!("✅ [doc_delete] 削除成功: collection_name={}, doc_id={}", collection_name, doc_id);
            let mut result = HashMap::new();
            result.insert("success".to_string(), Value::Bool(true));
            Ok(result)
        }
        Err(e) => {
            let error_msg = format!("ドキュメント削除エラー: {}", e);
            eprintln!("❌ [doc_delete] エラー: {}", error_msg);
            Err(error_msg)
        }
    }
}

#[tauri::command]
pub async fn delete_meeting_note_with_relations(note_id: String) -> Result<HashMap<String, Value>, String> {
    eprintln!("🗑️ [delete_meeting_note_with_relations] コマンド呼び出し: note_id={}", note_id);
    
    match db_delete_meeting_note_with_relations(&note_id) {
        Ok(_) => {
            eprintln!("✅ [delete_meeting_note_with_relations] 成功: note_id={}", note_id);
            let mut result = HashMap::new();
            result.insert("success".to_string(), Value::Bool(true));
            result.insert("noteId".to_string(), Value::String(note_id));
            Ok(result)
        }
        Err(e) => {
            let error_msg = format!("議事録の一括削除エラー: {}", e);
            let error_string = format!("{:?}", e);
            eprintln!("❌ [delete_meeting_note_with_relations] エラー: note_id={}, error={}", note_id, error_msg);
            eprintln!("❌ [delete_meeting_note_with_relations] エラー詳細: {}", error_string);
            
            // エラーメッセージを詳細に返す
            let detailed_error = if error_string.contains("database is locked") || error_string.contains("locked") {
                format!("データベースロック: {}", error_msg)
            } else {
                error_msg
            };
            
            Err(detailed_error)
        }
    }
}

#[tauri::command]
pub async fn collection_add(collection_name: String, data: HashMap<String, Value>) -> Result<HashMap<String, Value>, String> {
    eprintln!("📝 [collection_add] コマンドが呼び出されました: collection_name={}", collection_name);
    eprintln!("📝 [collection_add] データサイズ: {} bytes", serde_json::to_string(&data).unwrap_or_default().len());
    eprintln!("📝 [collection_add] データキー: {:?}", data.keys().collect::<Vec<_>>());
    
    // データベースが初期化されているか確認
    use crate::database::get_db;
    let db_status = get_db();
    eprintln!("📝 [collection_add] データベース状態チェック: {:?}", if db_status.is_some() { "初期化済み" } else { "未初期化" });
    
    if db_status.is_none() {
        let error_msg = format!(
            "データベースが初期化されていません。\n\
            詳細: アプリケーション起動時にデータベースの初期化に失敗した可能性があります。\n\
            対処法: 1) アプリケーションを再起動してください。\n\
                    2) それでも解決しない場合は、reinitialize_databaseコマンドを実行してください。\n\
                    3) diagnose_databaseコマンドで詳細な診断情報を確認してください。"
        );
        eprintln!("❌ [collection_add] {}", error_msg);
        return Err(error_msg);
    }
    
    eprintln!("📝 [collection_add] add_docを呼び出します...");
    match add_doc(&collection_name, data) {
        Ok(doc_id) => {
            eprintln!("✅ [collection_add] 成功: doc_id={}", doc_id);
            let mut result = HashMap::new();
            result.insert("id".to_string(), Value::String(doc_id));
            Ok(result)
        }
        Err(e) => {
            let error_msg = format!("{}", e);
            eprintln!("❌ [collection_add] エラー発生: {}", error_msg);
            eprintln!("❌ [collection_add] エラー詳細: {:?}", e);
            
            // より詳細なエラーメッセージを構築
            let detailed_error = if error_msg.contains("データベースが初期化されていません") {
                format!(
                    "データベースが利用できません。\n\
                    詳細: {}\n\
                    対処法: アプリケーションを再起動するか、reinitialize_databaseコマンドを実行してください。",
                    error_msg
                )
            } else if error_msg.contains("ユーザーがログインしていません") {
                format!(
                    "❌ ユーザーがログインしていません\n\n\
                    📋 詳細:\n\
                    {}\n\n\
                    🔧 対処法:\n\
                    1. ログインページでログインしてください\n\
                    2. ログイン後、再度事業計画の作成をお試しください\n\
                    3. ログインできない場合は、アプリケーションを再起動してください",
                    error_msg
                )
            } else if error_msg.contains("テーブル") && error_msg.contains("が存在しません") {
                format!(
                    "テーブルが存在しません。\n\
                    詳細: {}\n\
                    コレクション名: {}\n\
                    対処法: データベースを再初期化してください。",
                    error_msg, collection_name
                )
            } else if error_msg.contains("カラム") && error_msg.contains("存在しない") {
                format!(
                    "無効なカラムが指定されました。\n\
                    詳細: {}\n\
                    コレクション名: {}\n\
                    対処法: データベーススキーマを確認してください。",
                    error_msg, collection_name
                )
            } else {
                format!(
                    "コレクション追加エラーが発生しました。\n\
                    詳細: {}\n\
                    コレクション名: {}\n\
                    エラータイプ: {:?}",
                    error_msg, collection_name, e
                )
            };
            
            Err(detailed_error)
        }
    }
}

#[tauri::command]
pub async fn collection_get(collection_name: String) -> Result<Vec<HashMap<String, Value>>, String> {
    match get_collection(&collection_name, None) {
        Ok(results) => {
            Ok(results.into_iter().map(|mut row| {
                let id = row.remove("id").and_then(|v| v.as_str().map(|s| s.to_string())).unwrap_or_default();
                let mut result = HashMap::new();
                result.insert("id".to_string(), Value::String(id));
                result.insert("data".to_string(), serde_json::to_value(row).unwrap());
                result
            }).collect())
        }
        Err(e) => Err(format!("コレクション取得エラー: {}", e)),
    }
}

#[tauri::command]
pub async fn query_get(collection_name: String, conditions: Option<HashMap<String, Value>>) -> Result<Vec<HashMap<String, Value>>, String> {
    match get_collection(&collection_name, conditions) {
        Ok(results) => {
            Ok(results.into_iter().map(|mut row| {
                let id = row.remove("id").and_then(|v| v.as_str().map(|s| s.to_string())).unwrap_or_default();
                let mut result = HashMap::new();
                result.insert("id".to_string(), Value::String(id));
                result.insert("data".to_string(), serde_json::to_value(row).unwrap());
                result
            }).collect())
        }
        Err(e) => Err(format!("クエリ取得エラー: {}", e)),
    }
}

#[tauri::command]
pub async fn export_database_data(export_path: String) -> Result<HashMap<String, Value>, String> {
    eprintln!("📤 [export_database_data] データベースのエクスポートを開始します: {}", export_path);
    
    match export_to_file(&export_path) {
        Ok(_) => {
            eprintln!("✅ [export_database_data] エクスポート成功: {}", export_path);
            let mut result = HashMap::new();
            result.insert("success".to_string(), Value::Bool(true));
            result.insert("path".to_string(), Value::String(export_path));
            Ok(result)
        },
        Err(e) => {
            let error_msg = format!("エクスポートエラー: {}", e);
            eprintln!("❌ [export_database_data] エラー: {}", error_msg);
            Err(error_msg)
        }
    }
}

#[tauri::command]
pub async fn import_database_data(import_path: String) -> Result<HashMap<String, Value>, String> {
    eprintln!("📥 [import_database_data] データベースのインポートを開始します: {}", import_path);
    
    match import_from_file(&import_path) {
        Ok(_) => {
            eprintln!("✅ [import_database_data] インポート成功: {}", import_path);
            let mut result = HashMap::new();
            result.insert("success".to_string(), Value::Bool(true));
            result.insert("path".to_string(), Value::String(import_path));
            Ok(result)
        },
        Err(e) => {
            let error_msg = format!("インポートエラー: {}", e);
            eprintln!("❌ [import_database_data] エラー: {}", error_msg);
            Err(error_msg)
        }
    }
}

#[tauri::command]
pub async fn export_organizations_and_members(export_path: String) -> Result<HashMap<String, Value>, String> {
    eprintln!("📤 [export_organizations_and_members] 組織とメンバーのエクスポートを開始します: {}", export_path);
    
    match export_organizations_and_members_to_file(&export_path) {
        Ok(_) => {
            eprintln!("✅ [export_organizations_and_members] エクスポート成功: {}", export_path);
            let mut result = HashMap::new();
            result.insert("success".to_string(), Value::Bool(true));
            result.insert("path".to_string(), Value::String(export_path));
            result.insert("tables".to_string(), Value::Array(vec![
                Value::String("organizations".to_string()),
                Value::String("organizationMembers".to_string())
            ]));
            Ok(result)
        },
        Err(e) => {
            let error_msg = format!("エクスポートエラー: {}", e);
            eprintln!("❌ [export_organizations_and_members] エラー: {}", error_msg);
            Err(error_msg)
        }
    }
}

