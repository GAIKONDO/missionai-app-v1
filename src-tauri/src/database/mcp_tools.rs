/**
 * MCPツール管理（SQLite版）
 */

use rusqlite::{params, Result as SqlResult};
use serde::{Deserialize, Serialize};
use crate::database::{get_db, get_timestamp};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPTool {
    pub id: String,
    pub name: String,
    pub description: String,
    pub arguments: String, // JSON文字列
    #[serde(skip_serializing_if = "Option::is_none")]
    pub returns: Option<String>, // JSON文字列
    #[serde(rename = "implementationType")]
    pub implementation_type: String, // "standard" | "custom"
    pub enabled: i32, // 0 or 1
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

/// MCPツールを保存
pub fn save_mcp_tool(tool: &MCPTool) -> SqlResult<MCPTool> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let now = get_timestamp();

    // 既存のツールを確認
    let existing_tool = get_mcp_tool_by_name(&tool.name).ok().flatten();
    let is_new = existing_tool.is_none();

    if is_new {
        // 新規作成
        conn.execute(
            "INSERT INTO mcp_tools (id, name, description, arguments, returns, implementationType, enabled, createdAt, updatedAt)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                tool.id,
                tool.name,
                tool.description,
                tool.arguments,
                tool.returns,
                tool.implementation_type,
                tool.enabled,
                now,
                now,
            ],
        )?;
    } else {
        // 更新
        conn.execute(
            "UPDATE mcp_tools SET description = ?2, arguments = ?3, returns = ?4, implementationType = ?5, enabled = ?6, updatedAt = ?7
             WHERE name = ?1",
            params![
                tool.name,
                tool.description,
                tool.arguments,
                tool.returns,
                tool.implementation_type,
                tool.enabled,
                now,
            ],
        )?;
    }

    // 保存したツールを取得して返す
    get_mcp_tool_by_name(&tool.name)?.ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_NOTFOUND),
            Some("保存したMCPツールの取得に失敗しました".to_string()),
        )
    })
}

/// 名前でMCPツールを取得
pub fn get_mcp_tool_by_name(name: &str) -> SqlResult<Option<MCPTool>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    let mut stmt = conn.prepare(
        "SELECT id, name, description, arguments, returns, implementationType, enabled, createdAt, updatedAt
         FROM mcp_tools WHERE name = ?1"
    )?;

    let tool_result = stmt.query_row(params![name], |row| {
        Ok(MCPTool {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            arguments: row.get(3)?,
            returns: row.get(4)?,
            implementation_type: row.get(5)?,
            enabled: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    });

    match tool_result {
        Ok(tool) => Ok(Some(tool)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

/// すべてのMCPツールを取得
pub fn get_all_mcp_tools() -> SqlResult<Vec<MCPTool>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    let mut stmt = conn.prepare(
        "SELECT id, name, description, arguments, returns, implementationType, enabled, createdAt, updatedAt
         FROM mcp_tools ORDER BY createdAt DESC"
    )?;

    let tool_iter = stmt.query_map([], |row| {
        Ok(MCPTool {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            arguments: row.get(3)?,
            returns: row.get(4)?,
            implementation_type: row.get(5)?,
            enabled: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    })?;

    let mut tools = Vec::new();
    for tool_result in tool_iter {
        tools.push(tool_result?);
    }

    Ok(tools)
}

/// 有効なMCPツールのみを取得
pub fn get_enabled_mcp_tools() -> SqlResult<Vec<MCPTool>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    let mut stmt = conn.prepare(
        "SELECT id, name, description, arguments, returns, implementationType, enabled, createdAt, updatedAt
         FROM mcp_tools WHERE enabled = 1 ORDER BY createdAt DESC"
    )?;

    let tool_iter = stmt.query_map([], |row| {
        Ok(MCPTool {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            arguments: row.get(3)?,
            returns: row.get(4)?,
            implementation_type: row.get(5)?,
            enabled: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    })?;

    let mut tools = Vec::new();
    for tool_result in tool_iter {
        tools.push(tool_result?);
    }

    Ok(tools)
}

/// MCPツールを削除
pub fn delete_mcp_tool(name: &str) -> SqlResult<()> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    conn.execute("DELETE FROM mcp_tools WHERE name = ?1", params![name])?;

    Ok(())
}

/// MCPツールの有効/無効を切り替え
pub fn update_mcp_tool_enabled(name: &str, enabled: bool) -> SqlResult<()> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let now = get_timestamp();
    let enabled_int = if enabled { 1 } else { 0 };
    
    conn.execute(
        "UPDATE mcp_tools SET enabled = ?1, updatedAt = ?2 WHERE name = ?3",
        params![enabled_int, now, name],
    )?;

    Ok(())
}

