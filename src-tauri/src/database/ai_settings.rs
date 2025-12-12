use crate::database::{get_db, get_timestamp};
use rusqlite::Result as SqlResult;
use std::env;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AIProvider {
    OpenAI,
    Anthropic,
    Ollama,
    LMStudio,
}

impl AIProvider {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "openai" => Some(AIProvider::OpenAI),
            "anthropic" => Some(AIProvider::Anthropic),
            "ollama" => Some(AIProvider::Ollama),
            "lmstudio" => Some(AIProvider::LMStudio),
            _ => None,
        }
    }
    
    pub fn as_str(&self) -> &str {
        match self {
            AIProvider::OpenAI => "openai",
            AIProvider::Anthropic => "anthropic",
            AIProvider::Ollama => "ollama",
            AIProvider::LMStudio => "lmstudio",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub provider: AIProvider,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub model: String,
}

/// 環境変数からAPIキーを取得する
fn get_env_api_key(provider: &str) -> Option<String> {
    let env_key = match provider {
        "openai" => "OPENAI_API_KEY",
        "anthropic" => "ANTHROPIC_API_KEY",
        "ollama" => "OLLAMA_API_KEY",
        "lmstudio" => "LMSTUDIO_API_KEY",
        _ => return None,
    };
    
    env::var(env_key).ok().filter(|s| !s.is_empty())
}

/// 環境変数からベースURLを取得する
fn get_env_base_url(provider: &str) -> Option<String> {
    let env_key = match provider {
        "openai" => "OPENAI_BASE_URL",
        "anthropic" => "ANTHROPIC_BASE_URL",
        "ollama" => "OLLAMA_BASE_URL",
        "lmstudio" => "LMSTUDIO_BASE_URL",
        _ => return None,
    };
    
    env::var(env_key).ok().filter(|s| !s.is_empty())
}

/// 環境変数からモデル名を取得する
fn get_env_model(provider: &str) -> Option<String> {
    let env_key = match provider {
        "openai" => "OPENAI_MODEL",
        "anthropic" => "ANTHROPIC_MODEL",
        "ollama" => "OLLAMA_MODEL",
        "lmstudio" => "LMSTUDIO_MODEL",
        _ => return None,
    };
    
    env::var(env_key).ok().filter(|s| !s.is_empty())
}

pub fn get_ai_setting(provider: &str) -> SqlResult<Option<ProviderConfig>> {
    // まず環境変数から読み込む（優先）
    let env_api_key = get_env_api_key(provider);
    let env_base_url = get_env_base_url(provider);
    let env_model = get_env_model(provider);
    
    // 環境変数に設定があれば、それを返す
    if env_api_key.is_some() || env_base_url.is_some() || env_model.is_some() {
        return Ok(Some(ProviderConfig {
            provider: AIProvider::from_str(provider).unwrap_or(AIProvider::OpenAI),
            api_key: env_api_key,
            base_url: env_base_url,
            model: env_model.unwrap_or_else(|| get_default_model(provider)),
        }));
    }
    
    // 環境変数に設定がない場合は、データベースから読み込む
    let db = get_db().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
        Some("データベースが初期化されていません".to_string())
    ))?;
    let conn = db.get_connection()?;
    
    let mut stmt = conn.prepare("SELECT * FROM aiSettings WHERE provider = ?1")?;
    let result = stmt.query_row([provider], |row| {
        // 空文字列をNoneとして扱う
        let api_key_raw: Option<String> = row.get(2)?;
        let api_key = api_key_raw.filter(|s| !s.is_empty());
        
        let base_url_raw: Option<String> = row.get(3)?;
        let base_url = base_url_raw.filter(|s| !s.is_empty());
        
        Ok(ProviderConfig {
            provider: AIProvider::from_str(provider).unwrap_or(AIProvider::OpenAI),
            api_key,
            base_url,
            model: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
        })
    });
    
    match result {
        Ok(config) => Ok(Some(config)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

pub fn set_ai_setting(config: &ProviderConfig) -> SqlResult<()> {
    let db = get_db().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
        Some("データベースが初期化されていません".to_string())
    ))?;
    let conn = db.get_connection()?;
    
    let now = get_timestamp();
    let provider_str = config.provider.as_str();
    
    // 既存の設定をチェック
    let exists: bool = conn.query_row(
        "SELECT COUNT(*) FROM aiSettings WHERE provider = ?1",
        [provider_str],
        |row| row.get(0),
    )?;
    
    // トランザクションを開始（データベースロックを最小化）
    let tx = conn.unchecked_transaction()?;
    
    // APIキーとベースURLを適切に処理（Noneの場合はNULLとして保存）
    let api_key_value: Option<&str> = config.api_key.as_deref();
    let base_url_value: Option<&str> = config.base_url.as_deref();
    
    if exists {
        // 更新
        tx.execute(
            "UPDATE aiSettings SET apiKey = ?1, baseUrl = ?2, defaultModel = ?3, updatedAt = ?4 WHERE provider = ?5",
            rusqlite::params![
                api_key_value,
                base_url_value,
                config.model.as_str(),
                &now,
                provider_str,
            ],
        )?;
    } else {
        // 挿入
        let id = uuid::Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO aiSettings (id, provider, apiKey, baseUrl, defaultModel, createdAt, updatedAt)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![
                &id,
                provider_str,
                api_key_value,
                base_url_value,
                config.model.as_str(),
                &now,
                &now,
            ],
        )?;
    }
    
    tx.commit()?;
    Ok(())
}

pub fn get_default_model(provider: &str) -> String {
    match provider {
        "openai" => "gpt-4o-mini".to_string(),
        "anthropic" => "claude-3-5-sonnet-20241022".to_string(),
        "ollama" => "llama3.2".to_string(),
        "lmstudio" => "local-model".to_string(),
        _ => "gpt-4o-mini".to_string(),
    }
}

