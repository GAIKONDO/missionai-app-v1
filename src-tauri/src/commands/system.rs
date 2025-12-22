use serde::{Deserialize, Serialize};
use sysinfo::{System, Pid};

/// リソース使用状況
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceUsage {
    pub cpu_usage: f64,        // CPU使用率（0-100）
    pub memory_usage: f64,     // メモリ使用率（0-100）
    pub memory_used: u64,      // 使用メモリ（バイト）
    pub memory_total: u64,     // 総メモリ（バイト）
    pub timestamp: i64,        // 測定時刻（Unix timestamp in milliseconds）
}

/// システムリソース使用状況を取得
#[tauri::command]
pub async fn get_system_resources() -> Result<ResourceUsage, String> {
    let mut system = System::new_all();
    system.refresh_all();

    // CPU使用率を取得（全CPUの平均）
    let cpu_usage = system.global_cpu_info().cpu_usage() as f64;

    // メモリ使用状況を取得
    let memory_total = system.total_memory();
    let memory_used = system.used_memory();
    let memory_usage = if memory_total > 0 {
        (memory_used as f64 / memory_total as f64) * 100.0
    } else {
        0.0
    };

    Ok(ResourceUsage {
        cpu_usage,
        memory_usage,
        memory_used,
        memory_total,
        timestamp: chrono::Utc::now().timestamp_millis(),
    })
}

/// プロセス（アプリケーション）のリソース使用状況を取得
#[tauri::command]
pub async fn get_process_resources() -> Result<ResourceUsage, String> {
    let mut system = System::new_all();
    system.refresh_all();

    // 現在のプロセスIDを取得
    let pid = Pid::from(std::process::id() as usize);
    
    // プロセス情報を取得
    let process = system.process(pid).ok_or("プロセス情報の取得に失敗しました")?;

    // CPU使用率（プロセス全体）
    let cpu_usage = process.cpu_usage() as f64;

    // メモリ使用量
    let memory_used = process.memory();
    
    // システム全体のメモリ情報
    let memory_total = system.total_memory();
    let memory_usage = if memory_total > 0 {
        (memory_used as f64 / memory_total as f64) * 100.0
    } else {
        0.0
    };

    Ok(ResourceUsage {
        cpu_usage,
        memory_usage,
        memory_used,
        memory_total,
        timestamp: chrono::Utc::now().timestamp_millis(),
    })
}

