/**
 * データベースコネクションプール
 * r2d2を使用してSQLiteコネクションをプール管理
 */

use anyhow::Result;
use r2d2::{Pool, PooledConnection};
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::Result as SqlResult;
use std::path::PathBuf;
use std::sync::Arc;

#[derive(Clone)]
pub struct DatabasePool {
    pool: Arc<Pool<SqliteConnectionManager>>,
}

impl DatabasePool {
    /// 新しいデータベースプールを作成
    pub fn new(path: PathBuf) -> Result<Self> {
        let manager = SqliteConnectionManager::file(path).with_init(|conn| -> SqlResult<()> {
            // PRAGMAをまとめて設定
            conn.execute_batch(
                r#"
                PRAGMA journal_mode = WAL;
                PRAGMA synchronous = NORMAL;
                PRAGMA foreign_keys = ON;
                PRAGMA busy_timeout = 5000;
                PRAGMA cache_size = -64000;
                "#,
            )?;
            Ok(())
        });

        let pool = Pool::builder()
            .max_size(10) // 最大10コネクション
            .min_idle(Some(2)) // 最低2つは保持
            .build(manager)?;

        Ok(Self { pool: Arc::new(pool) })
    }

    /// プールからコネクションを取得
    pub fn get_connection(&self) -> Result<PooledConnection<SqliteConnectionManager>> {
        Ok(self.pool.get()?)
    }

    /// プールの状態を取得（デバッグ用）
    pub fn pool_size(&self) -> usize {
        self.pool.state().connections as usize
    }

    /// アクティブなコネクション数を取得
    pub fn active_connections(&self) -> usize {
        (self.pool.state().idle_connections + self.pool.state().connections) as usize
    }
}
