use rusqlite::{params, Result as SqlResult};
use serde::{Deserialize, Serialize};
use crate::database::{get_db, get_timestamp};

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
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "modelType")]
    pub model_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "selectedModel")]
    pub selected_model: Option<String>,
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
            "INSERT INTO tasks (id, name, description, type, agentId, requiredAgents, dependencies, parameters, priority, timeout, retryCount, modelType, selectedModel, createdAt, updatedAt)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
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
                task.model_type,
                task.selected_model,
                now,
                now,
            ],
        )?;
    } else {
        // 更新
        conn.execute(
            "UPDATE tasks SET name = ?1, description = ?2, type = ?3, agentId = ?4, requiredAgents = ?5, dependencies = ?6, parameters = ?7, priority = ?8, timeout = ?9, retryCount = ?10, modelType = ?11, selectedModel = ?12, updatedAt = ?13
             WHERE id = ?14",
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
                task.model_type,
                task.selected_model,
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
        "SELECT id, name, description, type, agentId, requiredAgents, dependencies, parameters, priority, timeout, retryCount, modelType, selectedModel, createdAt, updatedAt
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
            model_type: row.get(11)?,
            selected_model: row.get(12)?,
            created_at: row.get(13)?,
            updated_at: row.get(14)?,
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
        "SELECT id, name, description, type, agentId, requiredAgents, dependencies, parameters, priority, timeout, retryCount, modelType, selectedModel, createdAt, updatedAt
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
            model_type: row.get(11)?,
            selected_model: row.get(12)?,
            created_at: row.get(13)?,
            updated_at: row.get(14)?,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskChain {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(rename = "startNodeId")]
    pub start_node_id: String,
    pub nodes: String, // JSON文字列（Map<string, ChainNode>）
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

/// タスクチェーンを保存
pub fn save_task_chain(chain: &TaskChain) -> SqlResult<TaskChain> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    // 既存のチェーンを確認
    let existing_chain = get_task_chain(&chain.id).ok().flatten();
    let is_new = existing_chain.is_none();

    if is_new {
        // 新規作成
        conn.execute(
            "INSERT INTO taskChains (id, name, description, startNodeId, nodes, createdAt, updatedAt)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                chain.id,
                chain.name,
                chain.description,
                chain.start_node_id,
                chain.nodes,
                chain.created_at,
                chain.updated_at,
            ],
        )?;
    } else {
        // 更新
        conn.execute(
            "UPDATE taskChains SET name = ?1, description = ?2, startNodeId = ?3, nodes = ?4, updatedAt = ?5
             WHERE id = ?6",
            params![
                chain.name,
                chain.description,
                chain.start_node_id,
                chain.nodes,
                chain.updated_at,
                chain.id,
            ],
        )?;
    }

    // 更新後のチェーンを取得
    get_task_chain(&chain.id)
        .and_then(|opt| opt.ok_or_else(|| {
            rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
                Some("タスクチェーンの保存後に取得に失敗しました".to_string()),
            )
        }))
}

/// タスクチェーンを取得
pub fn get_task_chain(id: &str) -> SqlResult<Option<TaskChain>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    let mut stmt = conn.prepare(
        "SELECT id, name, description, startNodeId, nodes, createdAt, updatedAt
         FROM taskChains WHERE id = ?1"
    )?;

    let chain_result = stmt.query_row(params![id], |row| {
        Ok(TaskChain {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            start_node_id: row.get(3)?,
            nodes: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    });

    match chain_result {
        Ok(chain) => Ok(Some(chain)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

/// すべてのタスクチェーンを取得
pub fn get_all_task_chains() -> SqlResult<Vec<TaskChain>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    let mut stmt = conn.prepare(
        "SELECT id, name, description, startNodeId, nodes, createdAt, updatedAt
         FROM taskChains ORDER BY createdAt DESC"
    )?;

    let chain_iter = stmt.query_map([], |row| {
        Ok(TaskChain {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            start_node_id: row.get(3)?,
            nodes: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    })?;

    let mut chains = Vec::new();
    for chain_result in chain_iter {
        chains.push(chain_result?);
    }

    Ok(chains)
}

/// タスクチェーンを削除
pub fn delete_task_chain(id: &str) -> SqlResult<()> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    conn.execute(
        "DELETE FROM taskChains WHERE id = ?1",
        params![id],
    )?;

    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    pub id: String,
    pub name: String,
    pub description: String,
    pub role: String,
    pub capabilities: String, // JSON文字列
    pub tools: String, // JSON文字列
    #[serde(rename = "modelType")]
    pub model_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "selectedModel")]
    pub selected_model: Option<String>,
    #[serde(rename = "systemPrompt")]
    pub system_prompt: String,
    pub config: String, // JSON文字列
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

/// Agent定義を保存
pub fn save_agent(agent: &Agent) -> SqlResult<Agent> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let now = get_timestamp();

    // 既存のAgentを確認
    let existing_agent = get_agent(&agent.id).ok().flatten();
    let is_new = existing_agent.is_none();

    if is_new {
        // 新規作成
        match conn.execute(
            "INSERT INTO agents (id, name, description, role, capabilities, tools, modelType, selectedModel, systemPrompt, config, createdAt, updatedAt)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                agent.id,
                agent.name,
                agent.description,
                agent.role,
                agent.capabilities,
                agent.tools,
                agent.model_type,
                agent.selected_model,
                agent.system_prompt,
                agent.config,
                now,
                now,
            ],
        ) {
            Ok(_) => {},
            Err(e) => {
                // UNIQUE制約エラーの場合、既に存在する可能性があるので更新を試みる
                if e.to_string().contains("UNIQUE constraint") {
                    // 更新を試みる
                    conn.execute(
                        "UPDATE agents SET name = ?2, description = ?3, role = ?4, capabilities = ?5, tools = ?6, modelType = ?7, selectedModel = ?8, systemPrompt = ?9, config = ?10, updatedAt = ?11
                         WHERE id = ?1",
                        params![
                            agent.id,
                            agent.name,
                            agent.description,
                            agent.role,
                            agent.capabilities,
                            agent.tools,
                            agent.model_type,
                            agent.selected_model,
                            agent.system_prompt,
                            agent.config,
                            now,
                        ],
                    )?;
                } else {
                    return Err(e);
                }
            }
        }
    } else {
        // 更新 - システムプロンプトが変更された場合はバージョン履歴を保存
        if let Some(existing) = existing_agent {
            if existing.system_prompt != agent.system_prompt {
                // 現在の最大バージョン番号を取得
                let max_version: i32 = conn.query_row(
                    "SELECT COALESCE(MAX(version), 0) FROM agent_prompt_versions WHERE agentId = ?1",
                    params![agent.id],
                    |row| row.get(0),
                ).unwrap_or(0);

                // 新しいバージョンとして保存
                let version_id = format!("{}-v{}", agent.id, max_version + 1);
                use std::time::{SystemTime, UNIX_EPOCH};
                let now_timestamp = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as i64;
                conn.execute(
                    "INSERT INTO agent_prompt_versions (id, agentId, version, systemPrompt, createdAt, updatedAt)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    params![
                        version_id,
                        agent.id,
                        max_version + 1,
                        existing.system_prompt, // 変更前のプロンプトを保存
                        now_timestamp,
                        now_timestamp,
                    ],
                )?;
            }
        }

        // Agentを更新
        conn.execute(
            "UPDATE agents SET name = ?2, description = ?3, role = ?4, capabilities = ?5, tools = ?6, modelType = ?7, selectedModel = ?8, systemPrompt = ?9, config = ?10, updatedAt = ?11
             WHERE id = ?1",
            params![
                agent.id,
                agent.name,
                agent.description,
                agent.role,
                agent.capabilities,
                agent.tools,
                agent.model_type,
                agent.selected_model,
                agent.system_prompt,
                agent.config,
                now,
            ],
        )?;
    }

    // 保存したAgentを取得して返す
    get_agent(&agent.id)?.ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_NOTFOUND),
            Some("保存したAgentの取得に失敗しました".to_string()),
        )
    })
}

/// Agent定義を取得
pub fn get_agent(agent_id: &str) -> SqlResult<Option<Agent>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    let mut stmt = conn.prepare(
        "SELECT id, name, description, role, capabilities, tools, modelType, selectedModel, systemPrompt, config, createdAt, updatedAt
         FROM agents WHERE id = ?1"
    )?;

    let agent_result = stmt.query_row(params![agent_id], |row| {
        Ok(Agent {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            role: row.get(3)?,
            capabilities: row.get(4)?,
            tools: row.get(5)?,
            model_type: row.get(6)?,
            selected_model: row.get(7)?,
            system_prompt: row.get(8)?,
            config: row.get(9)?,
            created_at: row.get(10)?,
            updated_at: row.get(11)?,
        })
    });

    match agent_result {
        Ok(agent) => Ok(Some(agent)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

/// すべてのAgent定義を取得
pub fn get_all_agents() -> SqlResult<Vec<Agent>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    let mut stmt = conn.prepare(
        "SELECT id, name, description, role, capabilities, tools, modelType, selectedModel, systemPrompt, config, createdAt, updatedAt
         FROM agents ORDER BY createdAt DESC"
    )?;

    let agent_iter = stmt.query_map([], |row| {
        Ok(Agent {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            role: row.get(3)?,
            capabilities: row.get(4)?,
            tools: row.get(5)?,
            model_type: row.get(6)?,
            selected_model: row.get(7)?,
            system_prompt: row.get(8)?,
            config: row.get(9)?,
            created_at: row.get(10)?,
            updated_at: row.get(11)?,
        })
    })?;

    let mut agents = Vec::new();
    for agent_result in agent_iter {
        agents.push(agent_result?);
    }

    Ok(agents)
}

/// Agent定義を削除
pub fn delete_agent(agent_id: &str) -> SqlResult<()> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    conn.execute("DELETE FROM agents WHERE id = ?1", params![agent_id])?;

    Ok(())
}

