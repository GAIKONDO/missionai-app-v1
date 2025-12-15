use crate::database::{get_db, get_timestamp, to_firestore_timestamp, get_current_user};
use rusqlite::Result as SqlResult;
use serde_json::{Value, json};
use std::collections::HashMap;
use uuid::Uuid;

// 許可されたテーブル名のホワイトリスト（SQLインジェクション対策）
const ALLOWED_TABLES: &[&str] = &[
    "users",
    "pageContainers",
    "admins",
    "approvalRequests",
    "aiSettings",
    "backupHistory",
    "organizations",
    "organizationMembers",
    "organizationContents",
    "focusInitiatives",
    "meetingNotes",
    "themes",
    "topics", // topicEmbeddingsから統合
    "entities",
    "relations", // topicRelationsからリネーム
    "companies",
    "themeHierarchyConfigs", // A2C100用のテーマ階層設定テーブル
];

// テーブル名の検証関数
fn validate_table_name(table_name: &str) -> SqlResult<()> {
    if ALLOWED_TABLES.contains(&table_name) {
        Ok(())
    } else {
        Err(rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CONSTRAINT),
            Some(format!("無効なテーブル名: {}", table_name))
        ))
    }
}

pub fn get_doc(collection_name: &str, doc_id: &str) -> SqlResult<HashMap<String, Value>> {
    // テーブル名の検証（SQLインジェクション対策）
    validate_table_name(collection_name)?;
    let db = get_db().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
        Some("データベースが初期化されていません".to_string())
    ))?;
    let conn = db.get_connection()?;
    
    let mut stmt = conn.prepare(&format!("SELECT * FROM {} WHERE id = ?1", collection_name))?;
    let mut row = stmt.query_row([doc_id], |row| {
        let mut map = HashMap::new();
        for i in 0..row.as_ref().column_count() {
            let col_name = row.as_ref().column_name(i)
                .map_err(|_| rusqlite::Error::SqliteFailure(
                    rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
                    Some(format!("カラム名の取得に失敗しました: インデックス {}", i))
                ))?;
            let value: Value = match row.get::<_, Option<String>>(i) {
                Ok(Some(s)) => {
                    // 空文字列の場合はNullとして扱う
                    if s.is_empty() {
                        Value::Null
                    } else {
                        // JSONフィールドをパース
                        if col_name.contains("Embedding") || 
                           col_name == "pagesBySubMenu" || 
                           col_name == "pageOrderBySubMenu" ||
                           col_name == "visibleSubMenuIds" ||
                           col_name == "customSubMenuLabels" ||
                           col_name == "contentStructure" ||
                           col_name == "formatPattern" ||
                           col_name == "pageRelations" ||
                           col_name == "linkedPlanIds" ||
                           col_name == "initiativeIds" {
                            // JSON文字列をパース、失敗した場合は空のオブジェクト/配列を返す
                            match serde_json::from_str::<Value>(&s) {
                                Ok(v) => v,
                                Err(_) => {
                                    eprintln!("⚠️ [get_doc] JSONパースエラー: field={}, value={}", col_name, s.chars().take(100).collect::<String>());
                                    json!([])
                                }
                            }
                        } else {
                            json!(s)
                        }
                    }
                }
                Ok(None) => Value::Null,
                Err(_) => {
                    // 数値やNULLの処理
                    match row.get::<_, Option<i64>>(i) {
                        Ok(Some(v)) => json!(v),
                        Ok(None) => Value::Null,
                        Err(_) => Value::Null,
                    }
                }
            };
            map.insert(col_name.to_string(), value);
        }
        Ok(map)
    })?;
    
    // タイムスタンプを変換（文字列または数値の両方に対応）
    if let Some(created_at_value) = row.get("createdAt") {
        if let Some(timestamp_str) = created_at_value.as_str().map(|s| s.to_string())
            .or_else(|| created_at_value.as_i64().map(|n| n.to_string())) {
            row.insert("createdAt".to_string(), json!(to_firestore_timestamp(&timestamp_str)));
        }
    }
    if let Some(updated_at_value) = row.get("updatedAt") {
        if let Some(timestamp_str) = updated_at_value.as_str().map(|s| s.to_string())
            .or_else(|| updated_at_value.as_i64().map(|n| n.to_string())) {
            row.insert("updatedAt".to_string(), json!(to_firestore_timestamp(&timestamp_str)));
        }
    }
    
    Ok(row)
}

// 値をSQLite用の文字列に変換するヘルパー関数
// Value::Nullの場合はNoneを返し、それ以外の場合はSome(String)を返す
fn value_to_sql_string(value: &Value, is_json_field: bool) -> Option<String> {
    if is_json_field {
        // JSONフィールドの場合は、既に文字列の場合はそのまま、そうでなければJSON文字列化
        if let Some(s) = value.as_str() {
            // 既に文字列の場合は、それがJSON文字列かどうかをチェック
            // 有効なJSON文字列の場合はそのまま使用
            if serde_json::from_str::<Value>(s).is_ok() {
                return Some(s.to_string());
            }
        }
        // JSONオブジェクトや配列の場合は文字列化
        Some(serde_json::to_string(value).unwrap_or_default())
    } else {
        match value {
            Value::String(s) => Some(s.clone()),
            Value::Number(n) => Some(n.to_string()),
            Value::Bool(b) => Some(b.to_string()),
            Value::Null => None, // NULL値の場合はNoneを返す
            Value::Array(_) | Value::Object(_) => Some(serde_json::to_string(value).unwrap_or_default()),
        }
    }
}

// テーブルのカラム情報を取得するヘルパー関数
fn get_table_columns(conn: &rusqlite::Connection, table_name: &str) -> SqlResult<Vec<String>> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({})", table_name))?;
    let rows = stmt.query_map([], |row| {
        Ok(row.get::<_, String>(1)?) // カラム名は2番目のカラム（インデックス1）
    })?;
    
    let mut columns = Vec::new();
    for row in rows {
        columns.push(row?);
    }
    Ok(columns)
}

pub fn set_doc(collection_name: &str, doc_id: &str, data: HashMap<String, Value>) -> SqlResult<()> {
    eprintln!("🔍 [set_doc] 開始: collection_name={}, doc_id={}", collection_name, doc_id);
    
    // テーブル名の検証（SQLインジェクション対策）
    validate_table_name(collection_name)?;
    
    let db = get_db().ok_or_else(|| {
        eprintln!("❌ [set_doc] データベースが初期化されていません");
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string())
        )
    })?;
    
    let conn = db.get_connection()?;
    
    // テーブルが存在するか確認
    let table_exists: bool = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
        [collection_name],
        |row| row.get(0),
    ).unwrap_or(false);
    
    if !table_exists {
        eprintln!("❌ [set_doc] テーブル '{}' が存在しません", collection_name);
        return Err(rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some(format!("テーブル '{}' が存在しません", collection_name))
        ));
    }
    
    // テーブルのカラム一覧を取得
    let table_columns = match get_table_columns(&conn, collection_name) {
        Ok(cols) => {
            eprintln!("✅ [set_doc] テーブル '{}' のカラム数: {}", collection_name, cols.len());
            cols
        },
        Err(e) => {
            eprintln!("❌ [set_doc] カラム情報の取得に失敗: {}", e);
            return Err(e);
        }
    };
    
    let now = get_timestamp();
    let mut row_data = data.clone();
    
    // userIdが必須のテーブルで、userIdが提供されていない場合は現在のユーザーIDを設定
    let user_id_required_tables = vec![
        "pageContainers"
    ];
    if user_id_required_tables.contains(&collection_name) && !row_data.contains_key("userId") {
        if let Some(user) = get_current_user() {
            eprintln!("✅ [set_doc] ユーザーIDを自動設定: {}", user.uid);
            row_data.insert("userId".to_string(), json!(user.uid));
        } else {
            eprintln!("❌ [set_doc] ユーザーがログインしていません");
            return Err(rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CONSTRAINT),
                Some("ユーザーがログインしていません".to_string())
            ));
        }
    }
    
    // IDを設定（まだ設定されていない場合）
    if !row_data.contains_key("id") {
        row_data.insert("id".to_string(), json!(doc_id));
    }
    
    // タイムスタンプを処理
    if !row_data.contains_key("createdAt") {
        row_data.insert("createdAt".to_string(), json!(now));
    }
    if !row_data.contains_key("updatedAt") {
        row_data.insert("updatedAt".to_string(), json!(now));
    }
    
    // JSONフィールドのリスト
    let json_fields = vec![
        "pagesBySubMenu", "pageOrderBySubMenu", "visibleSubMenuIds",
        "customSubMenuLabels",
        "contentStructure", "formatPattern", "pageRelations",
        "combinedEmbedding", "titleEmbedding", "contentEmbedding",
        "linkedPlanIds",
        "initiativeIds", // テーマの注力施策IDリスト
        "themeIds", // 注力施策のテーマIDリスト
        "topicIds", // 注力施策のトピックIDリスト
        "containerData", // ページコンテナのデータ
        "levels", // テーマ階層設定のレベル配列
    ];
    
    // INTEGER型のフィールドのリスト
    let integer_fields = vec![
        "isFavorite", "approved", "isDeleted", "isFixed",
        "titleBorderEnabled", "keyVisualHeight", "keyVisualScale",
        "keyVisualLogoSize", "titlePositionX", "titlePositionY",
        "titleFontSize", "fileSize", "sequenceNumber",
        "position", // ページコンテナの位置
    ];
    
    // JSONフィールドを文字列化（既に文字列の場合はそのまま）
    for field in &json_fields {
        if let Some(value) = row_data.get(*field) {
            if let Some(json_str) = value_to_sql_string(value, true) {
                row_data.insert(field.to_string(), json!(json_str));
                eprintln!("📝 [set_doc] JSONフィールド '{}' を処理: {} bytes", field, json_str.len());
            } else {
                // Value::Nullの場合はnullを設定
                row_data.insert(field.to_string(), json!(null));
                eprintln!("📝 [set_doc] JSONフィールド '{}' をNULLに設定", field);
            }
        }
    }
    
    // テーブルに存在するカラムのみをフィルタリング
    let mut valid_fields: Vec<String> = Vec::new();
    for field in row_data.keys() {
        if table_columns.contains(field) {
            valid_fields.push(field.clone());
        } else {
            eprintln!("⚠️ [set_doc] カラム '{}' はテーブル '{}' に存在しないためスキップします", field, collection_name);
        }
    }
    
    eprintln!("✅ [set_doc] 有効なフィールド数: {} / {}", valid_fields.len(), row_data.len());
    
    // トランザクションを開始（データベースロックを最小化）
    let tx = conn.unchecked_transaction()?;
    
    // 既存レコードをチェック
    let exists: bool = tx.query_row(
        &format!("SELECT COUNT(*) FROM {} WHERE id = ?1", collection_name),
        [doc_id],
        |row| row.get(0),
    )?;
    
    if exists {
        // 更新
        eprintln!("🔄 [set_doc] 既存レコードを更新します");
        let update_fields: Vec<String> = valid_fields.iter()
            .filter(|k| **k != "id" && **k != "createdAt")
            .cloned()
            .collect();
        
        if update_fields.is_empty() {
            eprintln!("⚠️ [set_doc] 更新するフィールドがありません");
            tx.commit()?;
            return Ok(());
        }
        
        let set_clause = update_fields.iter()
            .map(|f| format!("{} = ?", f))
            .collect::<Vec<_>>()
            .join(", ");
        
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        for field in &update_fields {
            if let Some(v) = row_data.get(field) {
                let is_json = json_fields.contains(&field.as_str());
                let is_integer = integer_fields.contains(&field.as_str());
                
                if is_integer {
                    // INTEGER型のフィールドは数値として直接使用
                    if let Some(n) = v.as_i64() {
                        params.push(Box::new(n));
                    } else if let Some(n) = v.as_u64() {
                        params.push(Box::new(n as i64));
                    } else if let Some(b) = v.as_bool() {
                        params.push(Box::new(if b { 1i64 } else { 0i64 }));
                    } else {
                        if let Some(sql_value) = value_to_sql_string(v, false) {
                            params.push(Box::new(sql_value));
                        } else {
                            // NULL値の場合はOption<String>としてNoneを追加
                            params.push(Box::new(None::<String>));
                        }
                    }
                } else {
                    if let Some(sql_value) = value_to_sql_string(v, is_json) {
                        params.push(Box::new(sql_value));
                    } else {
                        // NULL値の場合はOption<String>としてNoneを追加
                        params.push(Box::new(None::<String>));
                    }
                }
            }
        }
        let doc_id_param = doc_id.to_string();
        params.push(Box::new(doc_id_param));
        
        let query = format!("UPDATE {} SET {} WHERE id = ?", collection_name, set_clause);
        eprintln!("📝 [set_doc] UPDATEクエリ: {}", query);
        eprintln!("📝 [set_doc] パラメータ数: {}", params.len());
        
        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        match tx.execute(&query, params_refs.as_slice()) {
            Ok(rows_affected) => {
                eprintln!("✅ [set_doc] 更新成功: {}行更新", rows_affected);
                tx.commit()?;
                Ok(())
            },
            Err(e) => {
                eprintln!("❌ [set_doc] UPDATEエラー: {}", e);
                eprintln!("❌ [set_doc] クエリ: {}", query);
                Err(e)
            }
        }
    } else {
        // 挿入
        eprintln!("➕ [set_doc] 新規レコードを挿入します");
        let insert_fields: Vec<String> = valid_fields.iter()
            .filter(|k| table_columns.contains(*k))
            .cloned()
            .collect();
        
        if insert_fields.is_empty() {
            eprintln!("❌ [set_doc] 挿入するフィールドがありません");
            return Err(rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
                Some("挿入するフィールドがありません".to_string())
            ));
        }
        
        let placeholders = insert_fields.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
        
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        for field in &insert_fields {
            if field == "id" {
                params.push(Box::new(doc_id.to_string()));
            } else if let Some(v) = row_data.get(field) {
                let is_json = json_fields.contains(&field.as_str());
                let is_integer = integer_fields.contains(&field.as_str());
                
                if is_integer {
                    // INTEGER型のフィールドは数値として直接使用
                    if let Some(n) = v.as_i64() {
                        params.push(Box::new(n));
                    } else if let Some(n) = v.as_u64() {
                        params.push(Box::new(n as i64));
                    } else if let Some(b) = v.as_bool() {
                        params.push(Box::new(if b { 1i64 } else { 0i64 }));
                    } else {
                        if let Some(sql_value) = value_to_sql_string(v, false) {
                            params.push(Box::new(sql_value));
                        } else {
                            // NULL値の場合はOption<String>としてNoneを追加
                            params.push(Box::new(None::<String>));
                        }
                    }
                } else {
                    if let Some(sql_value) = value_to_sql_string(v, is_json) {
                        params.push(Box::new(sql_value));
                    } else {
                        // NULL値の場合はOption<String>としてNoneを追加
                        if field == "organizationId" || field == "companyId" {
                            eprintln!("📝 [set_doc] INSERT: {} フィールドをNULLとして設定します", field);
                        }
                        params.push(Box::new(None::<String>));
                    }
                }
            }
        }
        
        let query = format!("INSERT INTO {} ({}) VALUES ({})", 
            collection_name, 
            insert_fields.join(", "), 
            placeholders
        );
        eprintln!("📝 [set_doc] INSERTクエリ: {}", query);
        eprintln!("📝 [set_doc] パラメータ数: {}", params.len());
        
        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        match tx.execute(&query, params_refs.as_slice()) {
            Ok(rows_affected) => {
                eprintln!("✅ [set_doc] 挿入成功: {}行挿入", rows_affected);
                tx.commit()?;
                Ok(())
            },
            Err(e) => {
                eprintln!("❌ [set_doc] INSERTエラー: {}", e);
                eprintln!("❌ [set_doc] クエリ: {}", query);
                Err(e)
            }
        }
    }
}

pub fn update_doc(collection_name: &str, doc_id: &str, data: HashMap<String, Value>) -> SqlResult<()> {
    eprintln!("🔧 [update_doc] 開始: collection_name={}, doc_id={}", collection_name, doc_id);
    
    // テーブル名の検証（SQLインジェクション対策）
    validate_table_name(collection_name)?;
    
    let db = get_db().ok_or_else(|| {
        eprintln!("❌ [update_doc] データベースが初期化されていません");
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string())
        )
    })?;
    let conn = db.get_connection()?;
    
    // テーブルが存在するか確認
    let table_exists: bool = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
        [collection_name],
        |row| row.get(0),
    ).unwrap_or(false);
    
    if !table_exists {
        eprintln!("❌ [update_doc] テーブル '{}' が存在しません", collection_name);
        return Err(rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some(format!("テーブル '{}' が存在しません", collection_name))
        ));
    }
    
    // テーブルのカラム一覧を取得
    let table_columns = match get_table_columns(&conn, collection_name) {
        Ok(cols) => {
            eprintln!("✅ [update_doc] テーブル '{}' のカラム数: {}", collection_name, cols.len());
            cols
        },
        Err(e) => {
            eprintln!("❌ [update_doc] カラム情報の取得に失敗: {}", e);
            return Err(e);
        }
    };
    
    let now = get_timestamp();
    let mut row_data = data.clone();
    
    row_data.insert("updatedAt".to_string(), json!(now));
    
    // JSONフィールドのリスト
    let json_fields = vec![
        "pagesBySubMenu", "pageOrderBySubMenu", "visibleSubMenuIds",
        "customSubMenuLabels",
        "contentStructure", "formatPattern", "pageRelations",
        "combinedEmbedding", "titleEmbedding", "contentEmbedding",
        "linkedPlanIds",
        "initiativeIds", // テーマの注力施策IDリスト
        "themeIds", // 注力施策のテーマIDリスト
        "topicIds", // 注力施策のトピックIDリスト
        "containerData", // ページコンテナのデータ
        "levels", // テーマ階層設定のレベル配列
    ];
    
    // INTEGER型のフィールドのリスト
    let integer_fields = vec![
        "isFavorite", "approved", "isDeleted", "isFixed",
        "titleBorderEnabled", "keyVisualHeight", "keyVisualScale",
        "keyVisualLogoSize", "titlePositionX", "titlePositionY",
        "titleFontSize", "fileSize", "sequenceNumber",
        "position", // ページコンテナの位置
    ];
    
    // JSONフィールドを文字列化（既に文字列の場合はそのまま）
    for field in &json_fields {
        if let Some(value) = row_data.get(*field) {
            if let Some(json_str) = value_to_sql_string(value, true) {
                row_data.insert(field.to_string(), json!(json_str));
                eprintln!("📝 [update_doc] JSONフィールド '{}' を処理: {} bytes", field, json_str.len());
            } else {
                // Value::Nullの場合はnullを設定
                row_data.insert(field.to_string(), json!(null));
                eprintln!("📝 [update_doc] JSONフィールド '{}' をNULLに設定", field);
            }
        }
    }
    
    // テーブルに存在するカラムのみをフィルタリング
    let mut valid_fields: Vec<String> = Vec::new();
    for field in row_data.keys() {
        if table_columns.contains(field) {
            valid_fields.push(field.clone());
        } else {
            eprintln!("⚠️ [update_doc] カラム '{}' はテーブル '{}' に存在しないためスキップします", field, collection_name);
        }
    }
    
    // idとcreatedAtは更新しない
    let update_fields: Vec<String> = valid_fields.iter()
        .filter(|k| **k != "id" && **k != "createdAt")
        .cloned()
        .collect();
    
    if update_fields.is_empty() {
        eprintln!("⚠️ [update_doc] 更新するフィールドがありません");
        return Ok(());
    }
    
    eprintln!("✅ [update_doc] 有効な更新フィールド数: {} / {}", update_fields.len(), row_data.len());
    
    // トランザクションを開始（データベースロックを最小化）
    let tx = conn.unchecked_transaction()?;
    
    let set_clause = update_fields.iter()
        .map(|f| format!("{} = ?", f))
        .collect::<Vec<_>>()
        .join(", ");
    
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    for field in &update_fields {
        if let Some(v) = row_data.get(field) {
            let is_json = json_fields.contains(&field.as_str());
            let is_integer = integer_fields.contains(&field.as_str());
            
            if is_integer {
                // INTEGER型のフィールドは数値として直接使用
                if let Some(n) = v.as_i64() {
                    params.push(Box::new(n));
                } else if let Some(n) = v.as_u64() {
                    params.push(Box::new(n as i64));
                } else if let Some(b) = v.as_bool() {
                    params.push(Box::new(if b { 1i64 } else { 0i64 }));
                } else {
                    if let Some(sql_value) = value_to_sql_string(v, false) {
                        params.push(Box::new(sql_value));
                    } else {
                        // NULL値の場合はOption<String>としてNoneを追加
                        params.push(Box::new(None::<String>));
                    }
                }
            } else {
                if let Some(sql_value) = value_to_sql_string(v, is_json) {
                    params.push(Box::new(sql_value));
                } else {
                    // NULL値の場合はOption<String>としてNoneを追加
                    params.push(Box::new(None::<String>));
                }
            }
        }
    }
    let doc_id_param = doc_id.to_string();
    params.push(Box::new(doc_id_param));
    
    let query = format!("UPDATE {} SET {} WHERE id = ?", collection_name, set_clause);
    eprintln!("📝 [update_doc] SQLクエリ: {}", query);
    eprintln!("📝 [update_doc] パラメータ数: {}", params.len());
    
    let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    match tx.execute(&query, params_refs.as_slice()) {
        Ok(rows_affected) => {
            eprintln!("✅ [update_doc] 成功: {}行更新", rows_affected);
            if rows_affected == 0 {
                eprintln!("⚠️ [update_doc] 警告: 更新された行が0行です。doc_id={} が存在しない可能性があります。", doc_id);
            }
            tx.commit()?;
            Ok(())
        }
        Err(e) => {
            eprintln!("❌ [update_doc] SQL実行エラー: {}", e);
            eprintln!("❌ [update_doc] クエリ: {}", query);
            Err(e)
        }
    }
}

pub fn delete_doc(collection_name: &str, doc_id: &str) -> SqlResult<()> {
    eprintln!("🗑️ [delete_doc] 削除開始: collection_name={}, doc_id={}", collection_name, doc_id);
    
    // テーブル名の検証（SQLインジェクション対策）
    validate_table_name(collection_name)?;
    
    let db = get_db().ok_or_else(|| {
        eprintln!("❌ [delete_doc] データベースが初期化されていません");
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string())
        )
    })?;
    let conn = db.get_connection()?;
    
    // テーブルが存在するか確認
    let table_exists: bool = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
        [collection_name],
        |row| row.get(0),
    ).unwrap_or(false);
    
    if !table_exists {
        eprintln!("❌ [delete_doc] テーブル '{}' が存在しません", collection_name);
        return Err(rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some(format!("テーブル '{}' が存在しません", collection_name))
        ));
    }
    
    // トランザクションを開始（データベースロックを最小化）
    let tx = conn.unchecked_transaction()?;
    
    // 削除前にレコードが存在するか確認
    let exists: bool = tx.query_row(
        &format!("SELECT COUNT(*) FROM {} WHERE id = ?1", collection_name),
        [doc_id],
        |row| row.get(0),
    ).unwrap_or(false);
    
    if !exists {
        eprintln!("⚠️ [delete_doc] レコードが存在しません: doc_id={}", doc_id);
        return Err(rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_NOTFOUND),
            Some(format!("レコード '{}' が存在しません", doc_id))
        ));
    }
    
    eprintln!("✅ [delete_doc] レコードが存在することを確認: doc_id={}", doc_id);
    
    let query = format!("DELETE FROM {} WHERE id = ?1", collection_name);
    eprintln!("📝 [delete_doc] 実行するSQL: {}", query);
    
    let rows_affected = tx.execute(&query, [doc_id])?;
    eprintln!("✅ [delete_doc] 削除成功: {} 行が削除されました", rows_affected);
    
    if rows_affected == 0 {
        eprintln!("⚠️ [delete_doc] 警告: 0行が削除されました（レコードが存在しない可能性があります）");
    }
    
    tx.commit()?;
    Ok(())
}

pub fn add_doc(collection_name: &str, data: HashMap<String, Value>) -> SqlResult<String> {
    let doc_id = Uuid::new_v4().to_string();
    set_doc(collection_name, &doc_id, data)?;
    Ok(doc_id)
}

pub fn get_collection(collection_name: &str, conditions: Option<HashMap<String, Value>>) -> SqlResult<Vec<HashMap<String, Value>>> {
    // テーブル名の検証（SQLインジェクション対策）
    validate_table_name(collection_name)?;
    
    let db = get_db().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
        Some("データベースが初期化されていません".to_string())
    ))?;
    let conn = db.get_connection()?;
    
    let mut query = format!("SELECT * FROM {}", collection_name);
    let mut param_values: Vec<String> = Vec::new();
    let mut where_clauses: Vec<String> = Vec::new();
    
    if let Some(conds) = conditions {
        // 新しい形式: { field: value } の形式をサポート
        // 例: { topicId: "some-value" } -> WHERE topicId = ?
        for (field, value) in conds.iter() {
            // 特殊キー（orderBy, orderDirection, field, operator, value）はスキップ
            if field == "orderBy" || field == "orderDirection" || field == "field" || field == "operator" || field == "value" {
                continue;
            }
            
            // フィールド名の検証（SQLインジェクション対策）
            if !field.chars().all(|c| c.is_alphanumeric() || c == '_') {
                return Err(rusqlite::Error::SqliteFailure(
                    rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
                    Some(format!("無効なフィールド名: {}", field))
                ));
            }
            
            where_clauses.push(format!("{} = ?", field));
            // valueを文字列に変換（ライフタイムの問題を回避）
            let param_str = match value {
                Value::String(s) => s.clone(),
                Value::Number(n) => n.to_string(),
                Value::Bool(b) => b.to_string(),
                Value::Null => "NULL".to_string(),
                _ => value.to_string(),
            };
            param_values.push(param_str);
        }
        
        // 後方互換性のため、古い形式（field, operator, value）もサポート
        if where_clauses.is_empty() {
            if let Some(field) = conds.get("field").and_then(|v| v.as_str()) {
                if let Some(operator) = conds.get("operator").and_then(|v| v.as_str()) {
                    if let Some(value) = conds.get("value") {
                        let sql_op = match operator {
                            "==" => "=",
                            "!=" => "!=",
                            "<" => "<",
                            "<=" => "<=",
                            ">" => ">",
                            ">=" => ">=",
                            _ => "=",
                        };
                        where_clauses.push(format!("{} {} ?", field, sql_op));
                        // valueを文字列に変換（ライフタイムの問題を回避）
                        let param_str = match value {
                            Value::String(s) => s.clone(),
                            Value::Number(n) => n.to_string(),
                            Value::Bool(b) => b.to_string(),
                            _ => value.to_string(),
                        };
                        param_values.push(param_str);
                    }
                }
            }
        }
        
        // WHERE句を追加
        if !where_clauses.is_empty() {
            query.push_str(" WHERE ");
            query.push_str(&where_clauses.join(" AND "));
        }
        
        // ORDER BY句を追加
        if let Some(order_by) = conds.get("orderBy").and_then(|v| v.as_str()) {
            let direction = if conds.get("orderDirection")
                .and_then(|v| v.as_str())
                .map(|d| d == "desc")
                .unwrap_or(false) {
                "DESC"
            } else {
                "ASC"
            };
            query.push_str(&format!(" ORDER BY {} {}", order_by, direction));
        }
    }
    
    // paramsを構築（param_valuesのライフタイムを保持）
    let params: Vec<&dyn rusqlite::ToSql> = param_values.iter().map(|s| s as &dyn rusqlite::ToSql).collect();
    
    let mut stmt = conn.prepare(&query)?;
    let rows = stmt.query_map(params.as_slice(), |row| {
        let mut map = HashMap::new();
        for i in 0..row.as_ref().column_count() {
            let col_name = row.as_ref().column_name(i)
                .map_err(|_| rusqlite::Error::SqliteFailure(
                    rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
                    Some(format!("カラム名の取得に失敗しました: インデックス {}", i))
                ))?;
            let value: Value = match row.get::<_, Option<String>>(i) {
                Ok(Some(s)) => {
                    // 空文字列の場合はNullとして扱う
                    if s.is_empty() {
                        Value::Null
                    } else {
                        if col_name.contains("Embedding") || 
                           col_name == "pagesBySubMenu" || 
                           col_name == "pageOrderBySubMenu" ||
                           col_name == "visibleSubMenuIds" ||
                           col_name == "customSubMenuLabels" ||
                           col_name == "contentStructure" ||
                           col_name == "formatPattern" ||
                           col_name == "pageRelations" ||
                           col_name == "linkedPlanIds" ||
                           col_name == "initiativeIds" {
                            // JSON文字列をパース、失敗した場合は空のオブジェクト/配列を返す
                            match serde_json::from_str::<Value>(&s) {
                                Ok(v) => v,
                                Err(_) => {
                                    eprintln!("⚠️ [get_collection] JSONパースエラー: field={}, value={}", col_name, s.chars().take(100).collect::<String>());
                                    json!([])
                                }
                            }
                        } else {
                            json!(s)
                        }
                    }
                }
                Ok(None) => Value::Null,
                Err(_) => Value::Null,
            };
            map.insert(col_name.to_string(), value);
        }
        Ok(map)
    })?;
    
    let mut results = Vec::new();
    for row in rows {
        let mut row = row?;
        
        // タイムスタンプを変換
        if let Some(created_at) = row.get("createdAt").and_then(|v| v.as_str()) {
            row.insert("createdAt".to_string(), json!(to_firestore_timestamp(created_at)));
        }
        if let Some(updated_at) = row.get("updatedAt").and_then(|v| v.as_str()) {
            row.insert("updatedAt".to_string(), json!(to_firestore_timestamp(updated_at)));
        }
        
        results.push(row);
    }
    
    Ok(results)
}

/// 議事録と関連データを一括削除（バッチ削除）
/// 1つのトランザクション内でtopicRelations、topicEmbeddings、meetingNotesを削除
pub fn delete_meeting_note_with_relations(note_id: &str) -> SqlResult<()> {
    eprintln!("🗑️ [delete_meeting_note_with_relations] 開始: note_id={}", note_id);
    
    let db = get_db().ok_or_else(|| {
        eprintln!("❌ [delete_meeting_note_with_relations] データベースが初期化されていません");
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string())
        )
    })?;
    
    let mut conn = db.get_connection()?;
    
    // 1つのトランザクション内で全ての削除を実行
    let tx = conn.transaction()?;
    
    // 1. 関連するrelationsを取得（削除用、topicRelationsからリネーム済み）
    eprintln!("📊 [delete_meeting_note_with_relations] 関連するrelationsを取得中...");
    let relation_ids: Vec<String> = {
        let query = "SELECT id FROM relations WHERE topicId IN (
            SELECT id FROM topics WHERE meetingNoteId = ?1
        )";
        let mut stmt = tx.prepare(query)?;
        let rows = stmt.query_map([note_id], |row| {
            Ok(row.get::<_, String>(0)?)
        })?;
        rows.collect::<Result<Vec<_>, _>>().unwrap_or_else(|e| {
            eprintln!("⚠️ [delete_meeting_note_with_relations] relations取得エラー: {}", e);
            Vec::new()
        })
    };
    
    eprintln!("📊 [delete_meeting_note_with_relations] 関連するrelations: {}件", relation_ids.len());
    
    // 2. relationsを削除
    if !relation_ids.is_empty() {
        // ループで個別削除（rusqliteのIN句は可変長パラメータを直接サポートしていないため）
        let mut deleted_count = 0;
        for id in &relation_ids {
            deleted_count += tx.execute(
                "DELETE FROM relations WHERE id = ?1",
                [id.as_str()]
            )?;
        }
        eprintln!("✅ [delete_meeting_note_with_relations] relations削除: {}件", deleted_count);
    }
    
    // 3. topicsを削除（topicEmbeddingsから統合済み）
    eprintln!("📊 [delete_meeting_note_with_relations] topicsを削除中...");
    let deleted_topics = tx.execute(
        "DELETE FROM topics WHERE meetingNoteId = ?1",
        [note_id]
    )?;
    eprintln!("✅ [delete_meeting_note_with_relations] topics削除: {}件", deleted_topics);
    
    // 4. meetingNotesを削除
    eprintln!("📊 [delete_meeting_note_with_relations] meetingNotesを削除中...");
    let deleted_notes = tx.execute(
        "DELETE FROM meetingNotes WHERE id = ?1",
        [note_id]
    )?;
    
    if deleted_notes == 0 {
        eprintln!("⚠️ [delete_meeting_note_with_relations] meetingNotesが存在しません: note_id={}", note_id);
        tx.rollback()?;
        return Err(rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_NOTFOUND),
            Some(format!("議事録 '{}' が存在しません", note_id))
        ));
    }
    
    eprintln!("✅ [delete_meeting_note_with_relations] meetingNotes削除: {}件", deleted_notes);
    
    // トランザクションをコミット
    tx.commit()?;
    
    eprintln!("✅ [delete_meeting_note_with_relations] 全ての削除が完了しました (リレーション: {}件, トピック: {}件, 議事録: {}件)", 
        relation_ids.len(), deleted_topics, deleted_notes);
    Ok(())
}



