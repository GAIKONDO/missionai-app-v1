use crate::database::{
    save_task, get_task, get_all_tasks, delete_task,
    save_task_execution, get_task_execution, get_task_executions, get_all_task_executions,
    Task, TaskExecution,
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

