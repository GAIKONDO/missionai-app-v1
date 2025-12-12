// バックアップ機能
use crate::database::{get_db, get_timestamp};
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct BackupInfo {
    pub id: String,
    pub path: PathBuf,
    pub size: u64,
    pub created_at: String,
}

/// データベースのバックアップを作成
pub fn create_backup(backup_dir: &Path) -> Result<BackupInfo, Box<dyn std::error::Error>> {
    let db = get_db().ok_or("データベースが初期化されていません")?;
    let conn = db.get_connection()?;
    
    // バックアップディレクトリを作成
    fs::create_dir_all(backup_dir)?;
    
    // バックアップファイル名を生成（タイムスタンプ付き）
    let timestamp = get_timestamp();
    let backup_filename = format!("app_backup_{}.db", timestamp);
    let backup_path = backup_dir.join(&backup_filename);
    
    // SQLiteのバックアップAPIを使用（ファイルコピー方式）
    // 注意: データベースがロックされている可能性があるため、VACUUM INTOを使用
    conn.execute("VACUUM INTO ?1", [backup_path.to_string_lossy().as_ref()])
        .map_err(|e| format!("バックアップ作成エラー: {}", e))?;
    
    // バックアップファイルのサイズを取得
    let metadata = fs::metadata(&backup_path)?;
    let backup_size = metadata.len();
    
    // バックアップ履歴に記録
    let backup_id = Uuid::new_v4().to_string();
    let now = get_timestamp();
    
    conn.execute(
        "INSERT INTO backupHistory (id, backupPath, backupSize, createdAt)
         VALUES (?1, ?2, ?3, ?4)",
        [
            &backup_id,
            backup_path.to_string_lossy().as_ref(),
            &backup_size.to_string(),
            &now,
        ],
    )
    .map_err(|e| format!("バックアップ履歴記録エラー: {}", e))?;
    
    Ok(BackupInfo {
        id: backup_id,
        path: backup_path,
        size: backup_size,
        created_at: now,
    })
}

/// バックアップからデータベースを復元
pub fn restore_backup(backup_path: &Path, target_db_path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    // バックアップファイルの存在確認
    if !backup_path.exists() {
        return Err("バックアップファイルが存在しません".into());
    }
    
    // 既存のデータベースをバックアップ（安全のため）
    if target_db_path.exists() {
        let backup_before_restore = target_db_path.with_extension("db.before_restore");
        fs::copy(target_db_path, &backup_before_restore)?;
    }
    
    // バックアップファイルをコピー
    fs::copy(backup_path, target_db_path)?;
    
    Ok(())
}

/// バックアップ履歴を取得
pub fn list_backups() -> Result<Vec<BackupInfo>, Box<dyn std::error::Error>> {
    let db = get_db().ok_or("データベースが初期化されていません")?;
    let conn = db.get_connection()?;
    
    let mut stmt = conn.prepare("SELECT id, backupPath, backupSize, createdAt FROM backupHistory ORDER BY createdAt DESC")
        .map_err(|e| format!("バックアップ一覧取得エラー: {}", e))?;
    let rows = stmt.query_map([], |row| {
        Ok(BackupInfo {
            id: row.get(0)?,
            path: PathBuf::from(row.get::<_, String>(1)?),
            size: row.get::<_, i64>(2)? as u64,
            created_at: row.get(3)?,
        })
    })
    .map_err(|e| format!("バックアップ一覧クエリエラー: {}", e))?;
    
    let mut backups = Vec::new();
    for row in rows {
        backups.push(row.map_err(|e| format!("バックアップ情報取得エラー: {}", e))?);
    }
    
    Ok(backups)
}

/// 古いバックアップを削除（指定された数より多い場合）
pub fn cleanup_old_backups(max_backups: usize) -> Result<usize, Box<dyn std::error::Error>> {
    let backups = list_backups()?;
    
    if backups.len() <= max_backups {
        return Ok(0);
    }
    
    let db = get_db().ok_or("データベースが初期化されていません")?;
    let conn = db.get_connection()?;
    
    let mut deleted_count = 0;
    for backup in backups.iter().skip(max_backups) {
        // ファイルを削除
        if backup.path.exists() {
            if let Err(e) = fs::remove_file(&backup.path) {
                eprintln!("バックアップファイル削除エラー: {}", e);
            } else {
                deleted_count += 1;
            }
        }
        
        // データベースから履歴を削除
        conn.execute("DELETE FROM backupHistory WHERE id = ?1", [&backup.id])
            .map_err(|e| format!("バックアップ履歴削除エラー: {}", e))?;
    }
    
    Ok(deleted_count)
}

/// バックアップファイルを削除
pub fn delete_backup(backup_id: &str) -> Result<(), Box<dyn std::error::Error>> {
    let db = get_db().ok_or("データベースが初期化されていません")?;
    let conn = db.get_connection()?;
    
    // バックアップ情報を取得
    let backup_path: String = conn.query_row(
        "SELECT backupPath FROM backupHistory WHERE id = ?1",
        [backup_id],
        |row| row.get(0),
    )
    .map_err(|e| format!("バックアップ情報取得エラー: {}", e))?;
    
    // ファイルを削除
    let path = PathBuf::from(&backup_path);
    if path.exists() {
        fs::remove_file(&path)
            .map_err(|e| format!("バックアップファイル削除エラー: {}", e))?;
    }
    
    // データベースから履歴を削除
    conn.execute("DELETE FROM backupHistory WHERE id = ?1", [backup_id])
        .map_err(|e| format!("バックアップ履歴削除エラー: {}", e))?;
    
    Ok(())
}

