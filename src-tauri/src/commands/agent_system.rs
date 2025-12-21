use crate::database::{
    save_task, get_task, get_all_tasks, delete_task,
    save_task_execution, get_task_execution, get_task_executions, get_all_task_executions,
    save_task_chain, get_task_chain, get_all_task_chains, delete_task_chain,
    save_agent, get_agent, get_all_agents, delete_agent,
    save_mcp_tool, get_mcp_tool_by_name, get_all_mcp_tools, get_enabled_mcp_tools, delete_mcp_tool,
    update_mcp_tool_enabled,
    Task, TaskExecution, TaskChain, Agent, MCPTool,
};

/// タスクを保存
#[tauri::command]
pub async fn save_task_command(task: Task) -> Result<Task, String> {
    save_task(&task).map_err(|e| format!("タスクの保存に失敗しました: {}", e))
}

/// タスクを取得
#[tauri::command]
pub async fn get_task_command(task_id: String) -> Result<Option<Task>, String> {
    get_task(&task_id).map_err(|e| format!("タスクの取得に失敗しました: {}", e))
}

/// すべてのタスクを取得
#[tauri::command]
pub async fn get_all_tasks_command() -> Result<Vec<Task>, String> {
    get_all_tasks().map_err(|e| format!("タスク一覧の取得に失敗しました: {}", e))
}

/// タスクを削除
#[tauri::command]
pub async fn delete_task_command(task_id: String) -> Result<(), String> {
    delete_task(&task_id).map_err(|e| format!("タスクの削除に失敗しました: {}", e))
}

/// タスク実行を保存
#[tauri::command]
pub async fn save_task_execution_command(execution: TaskExecution) -> Result<TaskExecution, String> {
    save_task_execution(&execution).map_err(|e| format!("タスク実行の保存に失敗しました: {}", e))
}

/// タスク実行を取得
#[tauri::command]
pub async fn get_task_execution_command(execution_id: String) -> Result<Option<TaskExecution>, String> {
    get_task_execution(&execution_id).map_err(|e| format!("タスク実行の取得に失敗しました: {}", e))
}

/// タスクIDに関連する実行履歴を取得
#[tauri::command]
pub async fn get_task_executions_command(task_id: String) -> Result<Vec<TaskExecution>, String> {
    get_task_executions(&task_id).map_err(|e| format!("実行履歴の取得に失敗しました: {}", e))
}

/// すべての実行履歴を取得
#[tauri::command]
pub async fn get_all_task_executions_command() -> Result<Vec<TaskExecution>, String> {
    get_all_task_executions().map_err(|e| format!("実行履歴一覧の取得に失敗しました: {}", e))
}

/// タスクチェーンを保存
#[tauri::command]
pub async fn save_task_chain_command(chain: TaskChain) -> Result<TaskChain, String> {
    save_task_chain(&chain).map_err(|e| format!("タスクチェーンの保存に失敗しました: {}", e))
}

/// タスクチェーンを取得
#[tauri::command]
pub async fn get_task_chain_command(chain_id: String) -> Result<Option<TaskChain>, String> {
    get_task_chain(&chain_id).map_err(|e| format!("タスクチェーンの取得に失敗しました: {}", e))
}

/// すべてのタスクチェーンを取得
#[tauri::command]
pub async fn get_all_task_chains_command() -> Result<Vec<TaskChain>, String> {
    get_all_task_chains().map_err(|e| format!("タスクチェーン一覧の取得に失敗しました: {}", e))
}

/// タスクチェーンを削除
#[tauri::command]
pub async fn delete_task_chain_command(chain_id: String) -> Result<(), String> {
    delete_task_chain(&chain_id).map_err(|e| format!("タスクチェーンの削除に失敗しました: {}", e))
}

/// Agent定義を保存
#[tauri::command]
pub async fn save_agent_command(agent: Agent) -> Result<Agent, String> {
    save_agent(&agent).map_err(|e| format!("Agent定義の保存に失敗しました: {}", e))
}

/// Agent定義を取得
#[tauri::command]
pub async fn get_agent_command(agent_id: String) -> Result<Option<Agent>, String> {
    get_agent(&agent_id).map_err(|e| format!("Agent定義の取得に失敗しました: {}", e))
}

/// すべてのAgent定義を取得
#[tauri::command]
pub async fn get_all_agents_command() -> Result<Vec<Agent>, String> {
    get_all_agents().map_err(|e| format!("Agent定義一覧の取得に失敗しました: {}", e))
}

/// Agent定義を削除
#[tauri::command]
pub async fn delete_agent_command(agent_id: String) -> Result<(), String> {
    delete_agent(&agent_id).map_err(|e| format!("Agent定義の削除に失敗しました: {}", e))
}

/// MCPツールを保存
#[tauri::command]
pub async fn save_mcp_tool_command(tool: MCPTool) -> Result<MCPTool, String> {
    save_mcp_tool(&tool).map_err(|e| format!("MCPツールの保存に失敗しました: {}", e))
}

/// MCPツールを取得（名前で）
#[tauri::command]
pub async fn get_mcp_tool_command(name: String) -> Result<Option<MCPTool>, String> {
    get_mcp_tool_by_name(&name).map_err(|e| format!("MCPツールの取得に失敗しました: {}", e))
}

/// すべてのMCPツールを取得
#[tauri::command]
pub async fn get_all_mcp_tools_command() -> Result<Vec<MCPTool>, String> {
    get_all_mcp_tools().map_err(|e| format!("MCPツール一覧の取得に失敗しました: {}", e))
}

/// 有効なMCPツールのみを取得
#[tauri::command]
pub async fn get_enabled_mcp_tools_command() -> Result<Vec<MCPTool>, String> {
    get_enabled_mcp_tools().map_err(|e| format!("有効なMCPツール一覧の取得に失敗しました: {}", e))
}

/// MCPツールを削除
#[tauri::command]
pub async fn delete_mcp_tool_command(name: String) -> Result<(), String> {
    delete_mcp_tool(&name).map_err(|e| format!("MCPツールの削除に失敗しました: {}", e))
}

/// MCPツールの有効/無効を切り替え
#[tauri::command]
pub async fn update_mcp_tool_enabled_command(name: String, enabled: bool) -> Result<(), String> {
    update_mcp_tool_enabled(&name, enabled).map_err(|e| format!("MCPツールの有効/無効切り替えに失敗しました: {}", e))
}

