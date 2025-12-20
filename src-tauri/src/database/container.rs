use crate::database::{get_db, get_timestamp, get_current_user};
use rusqlite::Result as SqlResult;
use serde_json::{Value, json};
use std::collections::HashMap;

/// コンテナデータ構造
#[derive(Debug, Clone)]
pub struct Container {
    pub id: String,
    pub page_id: String,
    pub plan_id: String,
    pub plan_type: String,
    pub container_type: String,
    pub container_data: Value,
    pub position: i64,
    pub user_id: String,
    pub created_at: String,
    pub updated_at: String,
}

/// コンテナを追加（store.rsのadd_docを使用）
pub fn add_container(
    page_id: &str,
    plan_id: &str,
    plan_type: &str,
    container_type: &str,
    container_data: Value,
    position: Option<i64>,
) -> SqlResult<String> {
    use crate::database::add_doc;
    
    println!("📦 [add_container] コンテナ追加開始（store.rsのadd_docを使用）");
    eprintln!("📦 [add_container] コンテナ追加開始（store.rsのadd_docを使用）");
    println!("   pageId: {}, planId: {}, planType: {}, containerType: {}", 
        page_id, plan_id, plan_type, container_type);
    eprintln!("   pageId: {}, planId: {}, planType: {}, containerType: {}", 
        page_id, plan_id, plan_type, container_type);
    
    // ユーザーの確認とuserIdの設定（事業計画の保存処理と同様）
    let user = get_current_user().ok_or_else(|| {
        println!("❌ [add_container] ユーザーがログインしていません");
        eprintln!("❌ [add_container] ユーザーがログインしていません");
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CONSTRAINT),
            Some("ユーザーがログインしていません".to_string())
        )
    })?;
    
    println!("✅ [add_container] ユーザーはログインしています: {}", user.email);
    eprintln!("✅ [add_container] ユーザーはログインしています: {}", user.email);
    
    // コンテナデータのサイズを確認（デバッグ用）
    let container_data_preview = serde_json::to_string(&container_data)
        .unwrap_or_default();
    println!("📝 [add_container] コンテナデータサイズ: {} bytes", container_data_preview.len());
    eprintln!("📝 [add_container] コンテナデータサイズ: {} bytes", container_data_preview.len());
    
    // store.rsのadd_docを使用してコンテナを追加
    // containerDataはValueのまま渡し、store.rsでシリアライズさせる
    let mut container_map = HashMap::new();
    container_map.insert("pageId".to_string(), json!(page_id));
    container_map.insert("planId".to_string(), json!(plan_id));
    container_map.insert("planType".to_string(), json!(plan_type));
    container_map.insert("containerType".to_string(), json!(container_type));
    container_map.insert("containerData".to_string(), container_data); // Valueのまま渡す
    container_map.insert("position".to_string(), json!(position.unwrap_or(0)));
    container_map.insert("userId".to_string(), json!(user.uid)); // userIdを明示的に設定
    
    println!("✅ [add_container] userIdを設定: {}", user.uid);
    eprintln!("✅ [add_container] userIdを設定: {}", user.uid);
    println!("📝 [add_container] add_docを呼び出します: collection_name=pageContainers");
    eprintln!("📝 [add_container] add_docを呼び出します: collection_name=pageContainers");
    
    match add_doc("pageContainers", container_map) {
        Ok(container_id) => {
            println!("✅ [add_container] コンテナを追加しました: id={}, pageId={}, planId={}", 
                container_id, page_id, plan_id);
            eprintln!("✅ [add_container] コンテナを追加しました: id={}, pageId={}, planId={}", 
                container_id, page_id, plan_id);
            Ok(container_id)
        },
        Err(e) => {
            println!("❌ [add_container] コンテナ追加エラー: {}", e);
            eprintln!("❌ [add_container] コンテナ追加エラー: {}", e);
            println!("❌ [add_container] エラー詳細: {:?}", e);
            eprintln!("❌ [add_container] エラー詳細: {:?}", e);
            Err(e)
        }
    }
}

/// コンテナを取得
pub fn get_container(container_id: &str) -> SqlResult<Container> {
    let db = get_db().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
        Some("データベースが初期化されていません".to_string())
    ))?;

    let conn = db.get_connection()?;

    let container = conn.query_row(
        "SELECT id, pageId, planId, planType, containerType, containerData,
                position, userId, createdAt, updatedAt
         FROM pageContainers WHERE id = ?1",
        [container_id],
        |row| {
            let container_data_str: String = row.get(5)?;
            let container_data: Value = serde_json::from_str(&container_data_str)
                .unwrap_or(json!({}));

            Ok(Container {
                id: row.get(0)?,
                page_id: row.get(1)?,
                plan_id: row.get(2)?,
                plan_type: row.get(3)?,
                container_type: row.get(4)?,
                container_data,
                position: row.get(6)?,
                user_id: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        },
    )?;

    Ok(container)
}

/// ページに属するコンテナ一覧を取得
pub fn get_containers_by_page(page_id: &str) -> SqlResult<Vec<Container>> {
    let db = get_db().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
        Some("データベースが初期化されていません".to_string())
    ))?;

    let conn = db.get_connection()?;

    let mut stmt = conn.prepare(
        "SELECT id, pageId, planId, planType, containerType, containerData,
                position, userId, createdAt, updatedAt
         FROM pageContainers WHERE pageId = ?1 ORDER BY position ASC, createdAt ASC"
    )?;

    let containers = stmt.query_map([page_id], |row| {
        let container_data_str: String = row.get(5)?;
        let container_data: Value = serde_json::from_str(&container_data_str)
            .unwrap_or(json!({}));

        Ok(Container {
            id: row.get(0)?,
            page_id: row.get(1)?,
            plan_id: row.get(2)?,
            plan_type: row.get(3)?,
            container_type: row.get(4)?,
            container_data,
            position: row.get(6)?,
            user_id: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    })?;

    let mut result = Vec::new();
    for container in containers {
        result.push(container?);
    }

    Ok(result)
}

/// 事業計画に属するコンテナ一覧を取得
pub fn get_containers_by_plan(plan_id: &str) -> SqlResult<Vec<Container>> {
    let db = get_db().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
        Some("データベースが初期化されていません".to_string())
    ))?;

    let conn = db.get_connection()?;

    let mut stmt = conn.prepare(
        "SELECT id, pageId, planId, planType, containerType, containerData,
                position, userId, createdAt, updatedAt
         FROM pageContainers WHERE planId = ?1 ORDER BY position ASC, createdAt ASC"
    )?;

    let containers = stmt.query_map([plan_id], |row| {
        let container_data_str: String = row.get(5)?;
        let container_data: Value = serde_json::from_str(&container_data_str)
            .unwrap_or(json!({}));

        Ok(Container {
            id: row.get(0)?,
            page_id: row.get(1)?,
            plan_id: row.get(2)?,
            plan_type: row.get(3)?,
            container_type: row.get(4)?,
            container_data,
            position: row.get(6)?,
            user_id: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    })?;

    let mut result = Vec::new();
    for container in containers {
        result.push(container?);
    }

    Ok(result)
}

/// コンテナを更新
pub fn update_container(
    container_id: &str,
    container_data: Option<Value>,
    position: Option<i64>,
) -> SqlResult<()> {
    let db = get_db().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
        Some("データベースが初期化されていません".to_string())
    ))?;

    let user = get_current_user().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CONSTRAINT),
        Some("ユーザーがログインしていません".to_string())
    ))?;

    let conn = db.get_connection()?;
    let now = get_timestamp();

    // 既存のコンテナを取得して所有者を確認
    let existing_container = conn.query_row(
        "SELECT userId FROM pageContainers WHERE id = ?1",
        [container_id],
        |row| row.get::<_, String>(0),
    )?;

    if existing_container != user.uid {
        return Err(rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CONSTRAINT),
            Some("このコンテナを更新する権限がありません".to_string())
        ));
    }

    // 更新するフィールドを構築
    let mut updates = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(data) = container_data {
        let container_data_str = serde_json::to_string(&data)
            .map_err(|e| rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
                Some(format!("コンテナデータのシリアライズに失敗しました: {}", e))
            ))?;
        updates.push("containerData = ?");
        params.push(Box::new(container_data_str));
    }

    if let Some(pos) = position {
        updates.push("position = ?");
        params.push(Box::new(pos));
    }

    if updates.is_empty() {
        return Ok(());
    }

    updates.push("updatedAt = ?");
    params.push(Box::new(now));
    params.push(Box::new(container_id.to_string()));

    let query = format!(
        "UPDATE pageContainers SET {} WHERE id = ?",
        updates.join(", ")
    );

    // トランザクションを開始（データベースロックを最小化）
    let tx = conn.unchecked_transaction()?;
    
    let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    tx.execute(&query, params_refs.as_slice())?;
    
    tx.commit()?;

    eprintln!("✅ [update_container] コンテナを更新しました: id={}", container_id);

    Ok(())
}

/// コンテナを削除
pub fn delete_container(container_id: &str) -> SqlResult<()> {
    let db = get_db().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
        Some("データベースが初期化されていません".to_string())
    ))?;

    let user = get_current_user().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CONSTRAINT),
        Some("ユーザーがログインしていません".to_string())
    ))?;

    let conn = db.get_connection()?;

    // 既存のコンテナを取得して所有者を確認
    let existing_container = conn.query_row(
        "SELECT userId FROM pageContainers WHERE id = ?1",
        [container_id],
        |row| row.get::<_, String>(0),
    )?;

    if existing_container != user.uid {
        return Err(rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CONSTRAINT),
            Some("このコンテナを削除する権限がありません".to_string())
        ));
    }

    // トランザクションを開始（データベースロックを最小化）
    let tx = conn.unchecked_transaction()?;
    
    tx.execute("DELETE FROM pageContainers WHERE id = ?1", [container_id])?;
    
    tx.commit()?;

    eprintln!("✅ [delete_container] コンテナを削除しました: id={}", container_id);

    Ok(())
}

/// コンテナをHashMap形式で取得（API用）
pub fn get_container_as_map(container_id: &str) -> SqlResult<HashMap<String, Value>> {
    let container = get_container(container_id)?;
    
    let mut map = HashMap::new();
    map.insert("id".to_string(), json!(container.id));
    map.insert("pageId".to_string(), json!(container.page_id));
    map.insert("planId".to_string(), json!(container.plan_id));
    map.insert("planType".to_string(), json!(container.plan_type));
    map.insert("containerType".to_string(), json!(container.container_type));
    map.insert("containerData".to_string(), container.container_data);
    map.insert("position".to_string(), json!(container.position));
    map.insert("userId".to_string(), json!(container.user_id));
    map.insert("createdAt".to_string(), json!(container.created_at));
    map.insert("updatedAt".to_string(), json!(container.updated_at));

    Ok(map)
}

