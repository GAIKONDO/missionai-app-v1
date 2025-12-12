use crate::database::{get_db, get_timestamp, get_current_user};
use rusqlite::Result as SqlResult;
use serde_json::{Value, json};
use std::collections::HashMap;
use uuid::Uuid;
use std::fs;

/// 事業計画の種類
#[derive(Debug, Clone)]
pub enum PlanType {
    BusinessProject,
    ServicePlan,
    Concept,
}

impl PlanType {
    pub fn as_str(&self) -> &'static str {
        match self {
            PlanType::BusinessProject => "businessProject",
            PlanType::ServicePlan => "servicePlan",
            PlanType::Concept => "concept",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "businessProject" => Some(PlanType::BusinessProject),
            "servicePlan" => Some(PlanType::ServicePlan),
            "concept" => Some(PlanType::Concept),
            _ => None,
        }
    }
}

/// ファイルタイプ
#[derive(Debug, Clone)]
pub enum FileType {
    Image,
    Document,
    Spreadsheet,
    Presentation,
    Other,
}

impl FileType {
    pub fn as_str(&self) -> &'static str {
        match self {
            FileType::Image => "image",
            FileType::Document => "document",
            FileType::Spreadsheet => "spreadsheet",
            FileType::Presentation => "presentation",
            FileType::Other => "other",
        }
    }

    pub fn from_mime_type(mime_type: &str) -> Self {
        if mime_type.starts_with("image/") {
            FileType::Image
        } else if mime_type.contains("pdf") || mime_type.contains("word") || mime_type.contains("text") {
            FileType::Document
        } else if mime_type.contains("spreadsheet") || mime_type.contains("excel") || mime_type.contains("csv") {
            FileType::Spreadsheet
        } else if mime_type.contains("presentation") || mime_type.contains("powerpoint") {
            FileType::Presentation
        } else {
            FileType::Other
        }
    }
}

/// 事業計画ファイルを追加
pub fn add_business_plan_file(
    plan_id: &str,
    plan_type: &str,
    file_name: &str,
    original_file_name: &str,
    file_path: &str,
    file_size: i64,
    mime_type: Option<&str>,
    description: Option<&str>,
    category: Option<&str>,
) -> SqlResult<String> {
    let db = get_db().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
        Some("データベースが初期化されていません".to_string())
    ))?;

    let user = get_current_user().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CONSTRAINT),
        Some("ユーザーがログインしていません".to_string())
    ))?;

    let conn = db.get_connection()?;
    let file_id = Uuid::new_v4().to_string();
    let now = get_timestamp();

    // ファイルタイプを決定
    let file_type = if let Some(mime) = mime_type {
        FileType::from_mime_type(mime).as_str()
    } else {
        FileType::Other.as_str()
    };

    // ファイルハッシュを計算（オプション）
    let file_hash = calculate_file_hash(file_path).ok();

    conn.execute(
        "INSERT INTO businessPlanFiles (
            id, planId, planType, fileName, originalFileName, filePath,
            fileSize, fileType, mimeType, fileHash, description, category,
            userId, createdAt, updatedAt
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
        rusqlite::params![
            file_id,
            plan_id,
            plan_type,
            file_name,
            original_file_name,
            file_path,
            file_size,
            file_type,
            mime_type.unwrap_or(""),
            file_hash.unwrap_or_default(),
            description.unwrap_or(""),
            category.unwrap_or(""),
            user.uid,
            now,
            now
        ],
    )?;

    Ok(file_id)
}

/// 事業計画ファイルを取得
pub fn get_business_plan_file(file_id: &str) -> SqlResult<HashMap<String, Value>> {
    let db = get_db().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
        Some("データベースが初期化されていません".to_string())
    ))?;

    let conn = db.get_connection()?;
    let mut stmt = conn.prepare("SELECT * FROM businessPlanFiles WHERE id = ?1 AND isDeleted = 0")?;
    
    let mut row = stmt.query_row([file_id], |row| {
        let mut map = HashMap::new();
        for i in 0..row.as_ref().column_count() {
            let col_name = row.as_ref().column_name(i).unwrap();
            let value: Value = match row.get::<_, String>(i) {
                Ok(s) => json!(s),
                Err(_) => {
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

    // タイムスタンプを変換
    if let Some(created_at) = row.get("createdAt").and_then(|v| v.as_str()) {
        row.insert("createdAt".to_string(), json!(crate::database::to_firestore_timestamp(created_at)));
    }
    if let Some(updated_at) = row.get("updatedAt").and_then(|v| v.as_str()) {
        row.insert("updatedAt".to_string(), json!(crate::database::to_firestore_timestamp(updated_at)));
    }

    Ok(row)
}

/// 事業計画に関連するすべてのファイルを取得
pub fn get_business_plan_files(plan_id: &str, include_deleted: bool) -> SqlResult<Vec<HashMap<String, Value>>> {
    let db = get_db().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
        Some("データベースが初期化されていません".to_string())
    ))?;

    let conn = db.get_connection()?;
    let query = if include_deleted {
        "SELECT * FROM businessPlanFiles WHERE planId = ?1 ORDER BY createdAt DESC"
    } else {
        "SELECT * FROM businessPlanFiles WHERE planId = ?1 AND isDeleted = 0 ORDER BY createdAt DESC"
    };

    let mut stmt = conn.prepare(query)?;
    let rows = stmt.query_map([plan_id], |row| {
        let mut map = HashMap::new();
        for i in 0..row.as_ref().column_count() {
            let col_name = row.as_ref().column_name(i).unwrap();
            let value: Value = match row.get::<_, String>(i) {
                Ok(s) => json!(s),
                Err(_) => {
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

    let mut results = Vec::new();
    for row in rows {
        let mut row = row?;
        
        // タイムスタンプを変換
        if let Some(created_at) = row.get("createdAt").and_then(|v| v.as_str()) {
            row.insert("createdAt".to_string(), json!(crate::database::to_firestore_timestamp(created_at)));
        }
        if let Some(updated_at) = row.get("updatedAt").and_then(|v| v.as_str()) {
            row.insert("updatedAt".to_string(), json!(crate::database::to_firestore_timestamp(updated_at)));
        }

        results.push(row);
    }

    Ok(results)
}

/// 事業計画ファイルを削除（論理削除）
pub fn delete_business_plan_file(file_id: &str) -> SqlResult<()> {
    let db = get_db().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
        Some("データベースが初期化されていません".to_string())
    ))?;

    let conn = db.get_connection()?;
    let now = get_timestamp();

    conn.execute(
        "UPDATE businessPlanFiles SET isDeleted = 1, deletedAt = ?1 WHERE id = ?2",
        [&now, file_id],
    )?;

    Ok(())
}

/// 事業計画ファイルを完全削除
pub fn permanently_delete_business_plan_file(file_id: &str) -> SqlResult<()> {
    let db = get_db().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
        Some("データベースが初期化されていません".to_string())
    ))?;

    // ファイル情報を取得してから削除
    let file_info = get_business_plan_file(file_id)?;
    
    let conn = db.get_connection()?;
    conn.execute("DELETE FROM businessPlanFiles WHERE id = ?1", [file_id])?;

    // ファイルシステムからも削除
    if let Some(file_path) = file_info.get("filePath").and_then(|v| v.as_str()) {
        if let Err(e) = fs::remove_file(file_path) {
            eprintln!("警告: ファイルの削除に失敗しました: {} - {}", file_path, e);
        }
    }

    Ok(())
}

/// 事業計画IDを登録
pub fn register_business_plan_id(
    plan_id: &str,
    plan_type: &str,
    display_id: Option<&str>,
    custom_prefix: Option<&str>,
    metadata: Option<&str>,
) -> SqlResult<String> {
    let db = get_db().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
        Some("データベースが初期化されていません".to_string())
    ))?;

    let user = get_current_user().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CONSTRAINT),
        Some("ユーザーがログインしていません".to_string())
    ))?;

    let conn = db.get_connection()?;
    let registry_id = Uuid::new_v4().to_string();
    let now = get_timestamp();

    // シーケンス番号を取得
    let sequence_number: i64 = conn.query_row(
        "SELECT COALESCE(MAX(sequenceNumber), 0) + 1 FROM businessPlanIdRegistry WHERE planType = ?1",
        [plan_type],
        |row| row.get(0),
    ).unwrap_or(1);

    conn.execute(
        "INSERT INTO businessPlanIdRegistry (
            id, planId, planType, userId, displayId, customPrefix,
            sequenceNumber, metadata, createdAt, updatedAt
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            registry_id,
            plan_id,
            plan_type,
            user.uid,
            display_id.unwrap_or(""),
            custom_prefix.unwrap_or(""),
            sequence_number,
            metadata.unwrap_or(""),
            now,
            now
        ],
    )?;

    Ok(registry_id)
}

/// 事業計画ID情報を取得
pub fn get_business_plan_id_info(plan_id: &str) -> SqlResult<HashMap<String, Value>> {
    let db = get_db().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
        Some("データベースが初期化されていません".to_string())
    ))?;

    let conn = db.get_connection()?;
    let mut stmt = conn.prepare("SELECT * FROM businessPlanIdRegistry WHERE planId = ?1")?;
    
    let mut row = stmt.query_row([plan_id], |row| {
        let mut map = HashMap::new();
        for i in 0..row.as_ref().column_count() {
            let col_name = row.as_ref().column_name(i).unwrap();
            let value: Value = match row.get::<_, String>(i) {
                Ok(s) => json!(s),
                Err(_) => {
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

    // タイムスタンプを変換
    if let Some(created_at) = row.get("createdAt").and_then(|v| v.as_str()) {
        row.insert("createdAt".to_string(), json!(crate::database::to_firestore_timestamp(created_at)));
    }
    if let Some(updated_at) = row.get("updatedAt").and_then(|v| v.as_str()) {
        row.insert("updatedAt".to_string(), json!(crate::database::to_firestore_timestamp(updated_at)));
    }

    Ok(row)
}

/// 事業計画作成履歴を記録
pub fn record_creation_history(
    plan_id: &str,
    plan_type: &str,
    action: &str,
    previous_state: Option<&str>,
    new_state: Option<&str>,
    metadata: Option<&str>,
) -> SqlResult<String> {
    let db = get_db().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
        Some("データベースが初期化されていません".to_string())
    ))?;

    let user = get_current_user().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CONSTRAINT),
        Some("ユーザーがログインしていません".to_string())
    ))?;

    let conn = db.get_connection()?;
    let history_id = Uuid::new_v4().to_string();
    let now = get_timestamp();

    conn.execute(
        "INSERT INTO businessPlanCreationHistory (
            id, planId, planType, userId, action, previousState,
            newState, metadata, createdAt
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![
            history_id,
            plan_id,
            plan_type,
            user.uid,
            action,
            previous_state.unwrap_or(""),
            new_state.unwrap_or(""),
            metadata.unwrap_or(""),
            now
        ],
    )?;

    Ok(history_id)
}

/// 事業計画の作成履歴を取得
pub fn get_creation_history(plan_id: &str, limit: Option<i64>) -> SqlResult<Vec<HashMap<String, Value>>> {
    let db = get_db().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
        Some("データベースが初期化されていません".to_string())
    ))?;

    let conn = db.get_connection()?;
    let query = format!(
        "SELECT * FROM businessPlanCreationHistory WHERE planId = ?1 ORDER BY createdAt DESC{}",
        if let Some(l) = limit {
            format!(" LIMIT {}", l)
        } else {
            String::new()
        }
    );

    let mut stmt = conn.prepare(&query)?;
    let rows = stmt.query_map([plan_id], |row| {
        let mut map = HashMap::new();
        for i in 0..row.as_ref().column_count() {
            let col_name = row.as_ref().column_name(i).unwrap();
            let value: Value = match row.get::<_, String>(i) {
                Ok(s) => {
                    if col_name == "previousState" || col_name == "newState" || col_name == "metadata" {
                        serde_json::from_str(&s).unwrap_or(json!(s))
                    } else {
                        json!(s)
                    }
                }
                Err(_) => {
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

    let mut results = Vec::new();
    for row in rows {
        let mut row = row?;
        
        // タイムスタンプを変換
        if let Some(created_at) = row.get("createdAt").and_then(|v| v.as_str()) {
            row.insert("createdAt".to_string(), json!(crate::database::to_firestore_timestamp(created_at)));
        }

        results.push(row);
    }

    Ok(results)
}

/// ファイルハッシュを計算（SHA-256）
fn calculate_file_hash(file_path: &str) -> Result<String, std::io::Error> {
    use sha2::{Sha256, Digest};
    
    let contents = fs::read(file_path)?;
    let mut hasher = Sha256::new();
    hasher.update(&contents);
    let hash = hasher.finalize();
    Ok(format!("{:x}", hash))
}

