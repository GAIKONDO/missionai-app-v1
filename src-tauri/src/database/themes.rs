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

    let mut stmt = conn.prepare(
        "SELECT id, title, description, initiativeIds, createdAt, updatedAt
         FROM themes
         ORDER BY createdAt DESC, title ASC"
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
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    })?;

    let mut result = Vec::new();
    for theme in themes {
        result.push(theme?);
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
        "SELECT id, title, description, initiativeIds, createdAt, updatedAt
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
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
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
        conn.execute(
            "INSERT INTO themes (id, title, description, initiativeIds, createdAt, updatedAt)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                theme.id,
                theme.title,
                theme.description,
                initiative_ids_json,
                now,
                now,
            ],
        )?;
    } else {
        // 更新
        conn.execute(
            "UPDATE themes SET title = ?1, description = ?2, initiativeIds = ?3, updatedAt = ?4
             WHERE id = ?5",
            params![
                theme.title,
                theme.description,
                initiative_ids_json,
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
