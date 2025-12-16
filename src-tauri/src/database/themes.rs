use rusqlite::{params, Result as SqlResult};
use serde::{Deserialize, Serialize};
use crate::database::{get_db, get_timestamp};
use serde_json;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Theme {
    pub id: String,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "initiativeIds")]
    pub initiative_ids: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub position: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "createdAt")]
    pub created_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "updatedAt")]
    pub updated_at: Option<String>,
}

/// 全テーマを取得
pub fn get_all_themes() -> SqlResult<Vec<Theme>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    println!("📖 [get_all_themes] テーマ取得開始");

    let mut stmt = conn.prepare(
        "SELECT id, title, description, initiativeIds, position, createdAt, updatedAt
         FROM themes
         ORDER BY COALESCE(position, 999999) ASC, createdAt DESC, title ASC"
    )?;

    let themes = stmt.query_map([], |row| {
        let initiative_ids_str: Option<String> = row.get(3)?;
        let initiative_ids = if let Some(ids_str) = initiative_ids_str {
            if ids_str.is_empty() {
                None
            } else {
                // JSON配列としてパースを試みる
                match serde_json::from_str::<Vec<String>>(&ids_str) {
                    Ok(ids) => Some(ids),
                    Err(_) => {
                        // JSON配列でない場合、カンマ区切りとして扱う
                        let ids: Vec<String> = ids_str
                            .split(',')
                            .map(|s| s.trim().to_string())
                            .filter(|s| !s.is_empty())
                            .collect();
                        if ids.is_empty() {
                            None
                        } else {
                            Some(ids)
                        }
                    }
                }
            }
        } else {
            None
        };

        Ok(Theme {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            initiative_ids,
            position: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    })?;

    let mut result = Vec::new();
    for theme in themes {
        result.push(theme?);
    }

    println!("📖 [get_all_themes] {}件のテーマを取得", result.len());
    println!("📊 [get_all_themes] 取得したテーマのposition一覧:");
    for theme in &result {
        println!("  - {} ({}): position={:?}", theme.id, theme.title, theme.position);
    }

    Ok(result)
}

/// IDでテーマを取得
pub fn get_theme_by_id(id: &str) -> SqlResult<Option<Theme>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    let result = conn.query_row(
        "SELECT id, title, description, initiativeIds, position, createdAt, updatedAt
         FROM themes
         WHERE id = ?1",
        params![id],
        |row| {
            let initiative_ids_str: Option<String> = row.get(3)?;
            let initiative_ids = if let Some(ids_str) = initiative_ids_str {
                if ids_str.is_empty() {
                    None
                } else {
                    // JSON配列としてパースを試みる
                    match serde_json::from_str::<Vec<String>>(&ids_str) {
                        Ok(ids) => Some(ids),
                        Err(_) => {
                            // JSON配列でない場合、カンマ区切りとして扱う
                            let ids: Vec<String> = ids_str
                                .split(',')
                                .map(|s| s.trim().to_string())
                                .filter(|s| !s.is_empty())
                                .collect();
                            if ids.is_empty() {
                                None
                            } else {
                                Some(ids)
                            }
                        }
                    }
                }
            } else {
                None
            };

            Ok(Theme {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                initiative_ids,
                position: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        },
    );

    match result {
        Ok(theme) => Ok(Some(theme)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

/// テーマを作成または更新
pub fn save_theme(theme: &Theme) -> SqlResult<Theme> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let now = get_timestamp();

    // initiativeIdsをJSON文字列に変換
    let initiative_ids_json = if let Some(ids) = &theme.initiative_ids {
        if ids.is_empty() {
            None
        } else {
            match serde_json::to_string(ids) {
                Ok(json_str) => Some(json_str),
                Err(e) => {
                    eprintln!("⚠️ initiativeIdsのJSON変換エラー: {}", e);
                    None
                }
            }
        }
    } else {
        None
    };

    // 既存のテーマを確認
    let existing_theme = get_theme_by_id(&theme.id).ok().flatten();
    let is_new = existing_theme.is_none();

    if is_new {
        // 新規作成
        // positionが指定されていない場合、最大position+1を設定
        let position = if let Some(pos) = theme.position {
            Some(pos)
        } else {
            // 最大positionを取得して+1
            let max_position: Option<i32> = conn.query_row(
                "SELECT MAX(position) FROM themes",
                [],
                |row| row.get(0),
            ).ok().flatten();
            Some(max_position.unwrap_or(0) + 1)
        };
        
        conn.execute(
            "INSERT INTO themes (id, title, description, initiativeIds, position, createdAt, updatedAt)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                theme.id,
                theme.title,
                theme.description,
                initiative_ids_json,
                position,
                now,
                now,
            ],
        )?;
    } else {
        // 更新
        conn.execute(
            "UPDATE themes SET title = ?1, description = ?2, initiativeIds = ?3, position = ?4, updatedAt = ?5
             WHERE id = ?6",
            params![
                theme.title,
                theme.description,
                initiative_ids_json,
                theme.position,
                now,
                theme.id,
            ],
        )?;
    }

    // 更新後のテーマを取得
    get_theme_by_id(&theme.id)
        .and_then(|opt| opt.ok_or_else(|| {
            rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
                Some("テーマの保存後に取得に失敗しました".to_string()),
            )
        }))
}

/// テーマを作成（IDは自動生成）
pub fn create_theme(title: String, description: Option<String>) -> SqlResult<Theme> {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let theme_id = format!("theme_{}_{}", 
        timestamp,
        Uuid::new_v4().to_string().replace("-", "").chars().take(8).collect::<String>()
    );

    let theme = Theme {
        id: theme_id,
        title,
        description,
        initiative_ids: None,
        position: None, // 新規作成時はpositionを自動設定（save_theme内で処理）
        created_at: None,
        updated_at: None,
    };

    save_theme(&theme)
}

/// テーマを削除
pub fn delete_theme(id: &str) -> SqlResult<()> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    conn.execute(
        "DELETE FROM themes WHERE id = ?1",
        params![id],
    )?;

    Ok(())
}

/// 複数のテーマのpositionを一括更新
pub fn update_theme_positions(updates: &[(String, i32)]) -> SqlResult<()> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let tx = conn.unchecked_transaction()?;
    let now = get_timestamp();

    println!("🔄 [update_theme_positions] 更新開始: {}件", updates.len());
    
    // 各テーマのpositionを更新
    // フロントエンドから送られてきた順序をそのまま使用（既に1から始まる連番）
    for (theme_id, position) in updates {
        println!("  📝 テーマID: {}, position: {} に更新", theme_id, position);
        let rows_affected = tx.execute(
            "UPDATE themes SET position = ?1, updatedAt = ?2 WHERE id = ?3",
            params![position, now, theme_id],
        )?;
        println!("  ✅ {}行が更新されました", rows_affected);
    }

    tx.commit()?;
    println!("✅ [update_theme_positions] コミット完了");
    
    // 更新後の状態を確認
    let mut stmt = conn.prepare("SELECT id, position FROM themes ORDER BY COALESCE(position, 999999) ASC")?;
    let positions: Vec<(String, Option<i32>)> = stmt.query_map([], |row| {
        Ok((row.get(0)?, row.get(1)?))
    })?.collect::<Result<Vec<_>, _>>()?;
    
    println!("📊 [update_theme_positions] 更新後のposition一覧:");
    for (id, pos) in &positions {
        println!("  - {}: {:?}", id, pos);
    }

    Ok(())
}
