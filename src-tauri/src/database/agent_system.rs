use rusqlite::{params, Result as SqlResult};
use serde::{Deserialize, Serialize};
use crate::database::{get_db, get_timestamp};
use serde_json;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(rename = "type")]
    pub task_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "agentId")]
    pub agent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "requiredAgents")]
    pub required_agents: Option<String>, // JSON文字列
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dependencies: Option<String>, // JSON文字列
    pub parameters: String, // JSON文字列
    pub priority: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "retryCount")]
    pub retry_count: Option<i32>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskExecution {
    pub id: String,
    #[serde(rename = "taskId")]
    pub task_id: String,
    #[serde(rename = "agentId")]
    pub agent_id: String,
    pub status: String,
    #[serde(rename = "startedAt")]
    pub started_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "completedAt")]
    pub completed_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<String>, // JSON文字列
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    pub logs: String, // JSON文字列
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

/// タスクを保存
pub fn save_task(task: &Task) -> SqlResult<Task> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let now = get_timestamp();

    // 既存のタスクを確認
    let existing_task = get_task(&task.id).ok().flatten();
    let is_new = existing_task.is_none();

    if is_new {
        // 新規作成
        conn.execute(
            "INSERT INTO tasks (id, name, description, type, agentId, requiredAgents, dependencies, parameters, priority, timeout, retryCount, createdAt, updatedAt)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                task.id,
                task.name,
                task.description,
                task.task_type,
                task.agent_id,
                task.required_agents,
                task.dependencies,
                task.parameters,
                task.priority,
                task.timeout,
                task.retry_count,
                now,
                now,
            ],
        )?;
    } else {
        // 更新
        conn.execute(
            "UPDATE tasks SET name = ?1, description = ?2, type = ?3, agentId = ?4, requiredAgents = ?5, dependencies = ?6, parameters = ?7, priority = ?8, timeout = ?9, retryCount = ?10, updatedAt = ?11
             WHERE id = ?12",
            params![
                task.name,
                task.description,
                task.task_type,
                task.agent_id,
                task.required_agents,
                task.dependencies,
                task.parameters,
                task.priority,
                task.timeout,
                task.retry_count,
                now,
                task.id,
            ],
        )?;
    }

    // 更新後のタスクを取得
    get_task(&task.id)
        .and_then(|opt| opt.ok_or_else(|| {
            rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
                Some("タスクの保存後に取得に失敗しました".to_string()),
            )
        }))
}

/// タスクを取得
pub fn get_task(id: &str) -> SqlResult<Option<Task>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    let mut stmt = conn.prepare(
        "SELECT id, name, description, type, agentId, requiredAgents, dependencies, parameters, priority, timeout, retryCount, createdAt, updatedAt
         FROM tasks WHERE id = ?1"
    )?;

    let task_result = stmt.query_row(params![id], |row| {
        Ok(Task {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            task_type: row.get(3)?,
            agent_id: row.get(4)?,
            required_agents: row.get(5)?,
            dependencies: row.get(6)?,
            parameters: row.get(7)?,
            priority: row.get(8)?,
            timeout: row.get(9)?,
            retry_count: row.get(10)?,
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
        })
    });

    match task_result {
        Ok(task) => Ok(Some(task)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

/// すべてのタスクを取得
pub fn get_all_tasks() -> SqlResult<Vec<Task>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    let mut stmt = conn.prepare(
        "SELECT id, name, description, type, agentId, requiredAgents, dependencies, parameters, priority, timeout, retryCount, createdAt, updatedAt
         FROM tasks ORDER BY createdAt DESC"
    )?;

    let task_iter = stmt.query_map([], |row| {
        Ok(Task {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            task_type: row.get(3)?,
            agent_id: row.get(4)?,
            required_agents: row.get(5)?,
            dependencies: row.get(6)?,
            parameters: row.get(7)?,
            priority: row.get(8)?,
            timeout: row.get(9)?,
            retry_count: row.get(10)?,
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
        })
    })?;

    let mut tasks = Vec::new();
    for task_result in task_iter {
        tasks.push(task_result?);
    }

    Ok(tasks)
}

/// タスクを削除
pub fn delete_task(id: &str) -> SqlResult<()> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    conn.execute(
        "DELETE FROM tasks WHERE id = ?1",
        params![id],
    )?;

    Ok(())
}

/// タスク実行を保存
pub fn save_task_execution(execution: &TaskExecution) -> SqlResult<TaskExecution> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let now = get_timestamp();

    // 既存の実行を確認
    let existing_execution = get_task_execution(&execution.id).ok().flatten();
    let is_new = existing_execution.is_none();

    if is_new {
        // 新規作成
        conn.execute(
            "INSERT INTO taskExecutions (id, taskId, agentId, status, startedAt, completedAt, result, error, logs, createdAt, updatedAt)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                execution.id,
                execution.task_id,
                execution.agent_id,
                execution.status,
                execution.started_at,
                execution.completed_at,
                execution.result,
                execution.error,
                execution.logs,
                now,
                now,
            ],
        )?;
    } else {
        // 更新
        conn.execute(
            "UPDATE taskExecutions SET taskId = ?1, agentId = ?2, status = ?3, startedAt = ?4, completedAt = ?5, result = ?6, error = ?7, logs = ?8, updatedAt = ?9
             WHERE id = ?10",
            params![
                execution.task_id,
                execution.agent_id,
                execution.status,
                execution.started_at,
                execution.completed_at,
                execution.result,
                execution.error,
                execution.logs,
                now,
                execution.id,
            ],
        )?;
    }

    // 更新後の実行を取得
    get_task_execution(&execution.id)
        .and_then(|opt| opt.ok_or_else(|| {
            rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
                Some("タスク実行の保存後に取得に失敗しました".to_string()),
            )
        }))
}

/// タスク実行を取得
pub fn get_task_execution(id: &str) -> SqlResult<Option<TaskExecution>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    let mut stmt = conn.prepare(
        "SELECT id, taskId, agentId, status, startedAt, completedAt, result, error, logs, createdAt, updatedAt
         FROM taskExecutions WHERE id = ?1"
    )?;

    let execution_result = stmt.query_row(params![id], |row| {
        Ok(TaskExecution {
            id: row.get(0)?,
            task_id: row.get(1)?,
            agent_id: row.get(2)?,
            status: row.get(3)?,
            started_at: row.get(4)?,
            completed_at: row.get(5)?,
            result: row.get(6)?,
            error: row.get(7)?,
            logs: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    });

    match execution_result {
        Ok(execution) => Ok(Some(execution)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

/// タスクIDに関連する実行履歴を取得
pub fn get_task_executions(task_id: &str) -> SqlResult<Vec<TaskExecution>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    let mut stmt = conn.prepare(
        "SELECT id, taskId, agentId, status, startedAt, completedAt, result, error, logs, createdAt, updatedAt
         FROM taskExecutions WHERE taskId = ?1 ORDER BY createdAt DESC"
    )?;

    let execution_iter = stmt.query_map(params![task_id], |row| {
        Ok(TaskExecution {
            id: row.get(0)?,
            task_id: row.get(1)?,
            agent_id: row.get(2)?,
            status: row.get(3)?,
            started_at: row.get(4)?,
            completed_at: row.get(5)?,
            result: row.get(6)?,
            error: row.get(7)?,
            logs: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    })?;

    let mut executions = Vec::new();
    for execution_result in execution_iter {
        executions.push(execution_result?);
    }

    Ok(executions)
}

/// すべての実行履歴を取得
pub fn get_all_task_executions() -> SqlResult<Vec<TaskExecution>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    let mut stmt = conn.prepare(
        "SELECT id, taskId, agentId, status, startedAt, completedAt, result, error, logs, createdAt, updatedAt
         FROM taskExecutions ORDER BY createdAt DESC"
    )?;

    let execution_iter = stmt.query_map([], |row| {
        Ok(TaskExecution {
            id: row.get(0)?,
            task_id: row.get(1)?,
            agent_id: row.get(2)?,
            status: row.get(3)?,
            started_at: row.get(4)?,
            completed_at: row.get(5)?,
            result: row.get(6)?,
            error: row.get(7)?,
            logs: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    })?;

    let mut executions = Vec::new();
    for execution_result in execution_iter {
        executions.push(execution_result?);
    }

    Ok(executions)
}

