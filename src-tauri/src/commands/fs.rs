use std::fs;
use std::path::Path;
use std::collections::HashMap;
use serde_json::Value;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn read_file(file_path: String) -> Result<HashMap<String, Value>, String> {
    match fs::read_to_string(&file_path) {
        Ok(data) => {
            let mut result = HashMap::new();
            result.insert("success".to_string(), Value::Bool(true));
            result.insert("data".to_string(), Value::String(data));
            Ok(result)
        }
        Err(e) => {
            let mut result = HashMap::new();
            result.insert("success".to_string(), Value::Bool(false));
            result.insert("error".to_string(), Value::String(e.to_string()));
            Ok(result)
        }
    }
}

#[tauri::command]
pub async fn write_file(file_path: String, data: String) -> Result<HashMap<String, Value>, String> {
    // 親ディレクトリが存在しない場合は作成
    if let Some(parent) = Path::new(&file_path).parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            let mut result = HashMap::new();
            result.insert("success".to_string(), Value::Bool(false));
            result.insert("error".to_string(), Value::String(format!("ディレクトリ作成エラー: {}", e)));
            return Ok(result);
        }
    }
    
    match fs::write(&file_path, data) {
        Ok(_) => {
            let mut result = HashMap::new();
            result.insert("success".to_string(), Value::Bool(true));
            Ok(result)
        }
        Err(e) => {
            let mut result = HashMap::new();
            result.insert("success".to_string(), Value::Bool(false));
            result.insert("error".to_string(), Value::String(e.to_string()));
            Ok(result)
        }
    }
}

#[tauri::command]
pub async fn file_exists(file_path: String) -> Result<HashMap<String, Value>, String> {
    let exists = Path::new(&file_path).exists();
    let mut result = HashMap::new();
    result.insert("exists".to_string(), Value::Bool(exists));
    Ok(result)
}

/// 画像ファイルをローカルに保存
#[tauri::command]
pub async fn save_image_file(
    app: AppHandle,
    plan_id: String,
    plan_type: String,
    file_name: String,
    image_data: Vec<u8>,
) -> Result<HashMap<String, Value>, String> {
    // アプリデータディレクトリを取得
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("アプリデータディレクトリ取得エラー: {}", e))?;
    
    // 画像保存ディレクトリを作成（開発環境と本番環境で異なるディレクトリ）
    let db_dir_name = if cfg!(debug_assertions) {
        "mission-ai-local-dev"
    } else {
        "mission-ai-local"
    };
    let images_dir = app_data_dir.join(db_dir_name).join("images").join(&plan_type).join(&plan_id);
    
    // ディレクトリが存在しない場合は作成
    fs::create_dir_all(&images_dir)
        .map_err(|e| format!("ディレクトリ作成エラー: {}", e))?;
    
    // ファイルパス
    let file_path = images_dir.join(&file_name);
    
    // 画像データを保存
    fs::write(&file_path, image_data)
        .map_err(|e| format!("ファイル保存エラー: {}", e))?;
    
    // ファイルパスを返す（file://プロトコルで返す）
    // Windowsでは file:///C:/path/to/file 形式、Unix系では file:///path/to/file 形式
    let file_url = if cfg!(target_os = "windows") {
        // Windows: パスをスラッシュ区切りに変換し、3つのスラッシュで開始
        let path_str = file_path.to_string_lossy().replace('\\', "/");
        format!("file:///{}", path_str)
    } else {
        // Unix系: 2つのスラッシュで開始（絶対パスの場合）
        format!("file://{}", file_path.to_string_lossy())
    };
    
    let mut result = HashMap::new();
    result.insert("success".to_string(), Value::Bool(true));
    result.insert("filePath".to_string(), Value::String(file_path.to_string_lossy().to_string()));
    result.insert("fileUrl".to_string(), Value::String(file_url));
    Ok(result)
}

