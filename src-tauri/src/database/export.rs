// データエクスポート/インポート機能
use crate::database::get_db;
use serde_json::{Value, json};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ExportData {
    pub version: String,
    pub exported_at: String,
    pub tables: HashMap<String, Vec<HashMap<String, Value>>>,
}

/// すべてのテーブルからデータをエクスポート
pub fn export_all_data() -> Result<ExportData, Box<dyn std::error::Error>> {
    let db = get_db().ok_or("データベースが初期化されていません")?;
    let conn = db.get_connection()?;
    
    let mut tables_data = HashMap::new();
    
    // エクスポートするテーブル一覧
    let table_names = vec![
        "users",
        "approvalRequests",
        "aiSettings",
        "backupHistory",
        "organizations",
        "organizationMembers",
    ];
    
    for table_name in &table_names {
        let mut stmt = conn.prepare(&format!("SELECT * FROM {}", table_name))?;
        let rows = stmt.query_map([], |row| {
            let mut map = HashMap::new();
            for i in 0..row.as_ref().column_count() {
                let col_name = row.as_ref().column_name(i).unwrap();
                let value: Value = match row.get::<_, String>(i) {
                    Ok(s) => {
                        // JSONフィールドをパース
                        if col_name.contains("Embedding") || 
                           col_name == "pagesBySubMenu" || 
                           col_name == "pageOrderBySubMenu" ||
                           col_name == "visibleSubMenuIds" ||
                           col_name == "customSubMenuLabels" ||
                           col_name == "contentStructure" ||
                           col_name == "formatPattern" ||
                           col_name == "pageRelations" {
                            serde_json::from_str(&s).unwrap_or(json!(s))
                        } else {
                            json!(s)
                        }
                    }
                    Err(_) => {
                        match row.get::<_, Option<i64>>(i) {
                            Ok(Some(v)) => json!(v),
                            Ok(None) => Value::Null,
                            Err(_) => Value::Null,
                        }
                    }
                };
                map.insert(col_name.to_string(), value);
            }
            Ok(map)
        })?;
        
        let mut table_rows = Vec::new();
        for row in rows {
            table_rows.push(row?);
        }
        
        tables_data.insert(table_name.to_string(), table_rows);
    }
    
    Ok(ExportData {
        version: "1.0".to_string(),
        exported_at: crate::database::get_timestamp(),
        tables: tables_data,
    })
}

/// JSONファイルにエクスポート
pub fn export_to_file(export_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    let data = export_all_data()?;
    let json_string = serde_json::to_string_pretty(&data)?;
    fs::write(export_path, json_string)?;
    Ok(())
}

/// JSONファイルからデータをインポート
pub fn import_from_file(import_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    let json_string = fs::read_to_string(import_path)?;
    let data: ExportData = serde_json::from_str(&json_string)?;
    
    // データ検証
    validate_export_data(&data)?;
    
    let db = get_db().ok_or("データベースが初期化されていません")?;
    let conn = db.get_connection()?;
    
    // トランザクション開始
    let tx = conn.unchecked_transaction()?;
    
    // 既存データを削除（オプション - 必要に応じて変更可能）
    // 注意: この実装では既存データを保持し、追加のみ行います
    
    // 各テーブルにデータをインポート
    for (table_name, rows) in &data.tables {
        for row in rows {
            let columns: Vec<String> = row.keys().cloned().collect();
            let placeholders = columns.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
            
            let mut values: Vec<String> = Vec::new();
            for col in &columns {
                if let Some(v) = row.get(col) {
                    values.push(match v {
                        Value::String(s) => s.clone(),
                        Value::Number(n) => n.to_string(),
                        Value::Bool(b) => b.to_string(),
                        Value::Null => "NULL".to_string(),
                        _ => serde_json::to_string(v).unwrap_or_default(),
                    });
                }
            }
            
            // INSERT OR REPLACEを使用して既存データを上書き
            let query = format!(
                "INSERT OR REPLACE INTO {} ({}) VALUES ({})",
                table_name,
                columns.join(", "),
                placeholders
            );
            
            let mut params: Vec<&dyn rusqlite::ToSql> = Vec::new();
            for v in &values {
                params.push(v);
            }
            
            tx.execute(&query, params.as_slice())?;
        }
    }
    
    // トランザクションコミット
    tx.commit()?;
    
    Ok(())
}

/// エクスポートデータの検証
fn validate_export_data(data: &ExportData) -> Result<(), Box<dyn std::error::Error>> {
    // バージョンチェック
    if data.version != "1.0" {
        return Err("サポートされていないエクスポートバージョンです".into());
    }
    
    // 必須テーブルのチェック
    let required_tables = vec!["users"];
    for table in &required_tables {
        if !data.tables.contains_key(*table) {
            return Err(format!("必須テーブル '{}' が見つかりません", table).into());
        }
    }
    
    Ok(())
}

/// 特定のテーブルのみをエクスポート
pub fn export_table(table_name: &str) -> Result<Vec<HashMap<String, Value>>, Box<dyn std::error::Error>> {
    let db = get_db().ok_or("データベースが初期化されていません")?;
    let conn = db.get_connection()?;
    
    let mut stmt = conn.prepare(&format!("SELECT * FROM {}", table_name))?;
    let rows = stmt.query_map([], |row| {
        let mut map = HashMap::new();
        for i in 0..row.as_ref().column_count() {
            let col_name = row.as_ref().column_name(i).unwrap();
            let value: Value = match row.get::<_, String>(i) {
                Ok(s) => {
                    if col_name.contains("Embedding") || 
                       col_name == "pagesBySubMenu" || 
                       col_name == "pageOrderBySubMenu" ||
                       col_name == "visibleSubMenuIds" ||
                       col_name == "customSubMenuLabels" ||
                       col_name == "contentStructure" ||
                       col_name == "formatPattern" ||
                       col_name == "pageRelations" {
                        serde_json::from_str(&s).unwrap_or(json!(s))
                    } else {
                        json!(s)
                    }
                }
                Err(_) => {
                    match row.get::<_, Option<i64>>(i) {
                        Ok(Some(v)) => json!(v),
                        Ok(None) => Value::Null,
                        Err(_) => Value::Null,
                    }
                }
            };
            map.insert(col_name.to_string(), value);
        }
        Ok(map)
    })?;
    
    let mut table_rows = Vec::new();
    for row in rows {
        table_rows.push(row?);
    }
    
    Ok(table_rows)
}

/// 指定したテーブルのみをエクスポート
pub fn export_selected_tables(table_names: &[&str]) -> Result<ExportData, Box<dyn std::error::Error>> {
    let db = get_db().ok_or("データベースが初期化されていません")?;
    let conn = db.get_connection()?;
    
    let mut tables_data = HashMap::new();
    
    for table_name in table_names {
        let mut stmt = conn.prepare(&format!("SELECT * FROM {}", table_name))?;
        let rows = stmt.query_map([], |row| {
            let mut map = HashMap::new();
            for i in 0..row.as_ref().column_count() {
                let col_name = row.as_ref().column_name(i).unwrap();
                let value: Value = match row.get::<_, String>(i) {
                    Ok(s) => {
                        // JSONフィールドをパース
                        if col_name.contains("Embedding") || 
                           col_name == "pagesBySubMenu" || 
                           col_name == "pageOrderBySubMenu" ||
                           col_name == "visibleSubMenuIds" ||
                           col_name == "customSubMenuLabels" ||
                           col_name == "contentStructure" ||
                           col_name == "formatPattern" ||
                           col_name == "pageRelations" {
                            serde_json::from_str(&s).unwrap_or(json!(s))
                        } else {
                            json!(s)
                        }
                    }
                    Err(_) => {
                        match row.get::<_, Option<i64>>(i) {
                            Ok(Some(v)) => json!(v),
                            Ok(None) => Value::Null,
                            Err(_) => Value::Null,
                        }
                    }
                };
                map.insert(col_name.to_string(), value);
            }
            Ok(map)
        })?;
        
        let mut table_rows = Vec::new();
        for row in rows {
            table_rows.push(row?);
        }
        
        tables_data.insert(table_name.to_string(), table_rows);
    }
    
    Ok(ExportData {
        version: "1.0".to_string(),
        exported_at: crate::database::get_timestamp(),
        tables: tables_data,
    })
}

/// 組織とメンバーのみをエクスポート（雛形データ用）
pub fn export_organizations_and_members() -> Result<ExportData, Box<dyn std::error::Error>> {
    export_selected_tables(&["organizations", "organizationMembers"])
}

/// 指定したテーブルをJSONファイルにエクスポート
pub fn export_selected_tables_to_file(export_path: &str, table_names: &[&str]) -> Result<(), Box<dyn std::error::Error>> {
    let data = export_selected_tables(table_names)?;
    let json_string = serde_json::to_string_pretty(&data)?;
    fs::write(export_path, json_string)?;
    Ok(())
}

/// 組織とメンバーをJSONファイルにエクスポート（雛形データ用）
pub fn export_organizations_and_members_to_file(export_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    export_selected_tables_to_file(export_path, &["organizations", "organizationMembers"])
}

/// 雛形データをインポート（初期化時に使用）
/// データベースが空の場合のみインポートする
pub fn import_template_data_if_empty(template_path: &Path) -> Result<bool, Box<dyn std::error::Error>> {
    let db = get_db().ok_or("データベースが初期化されていません")?;
    let conn = db.get_connection()?;
    
    // 既存のデータがあるかチェック（organizationsテーブルを確認）
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM organizations",
        [],
        |row| row.get(0),
    ).unwrap_or(0);
    
    // 既にデータがある場合はインポートしない
    if count > 0 {
        eprintln!("ℹ️  既存のデータが見つかりました。雛形データのインポートをスキップします。");
        return Ok(false);
    }
    
    // 雛形データファイルが存在しない場合はスキップ
    if !template_path.exists() {
        eprintln!("ℹ️  雛形データファイルが見つかりません: {}", template_path.display());
        eprintln!("   雛形データなしで初期化を続行します。");
        return Ok(false);
    }
    
    eprintln!("📥 雛形データをインポートします: {}", template_path.display());
    
    // 雛形データをインポート
    match import_from_file(template_path.to_str().unwrap()) {
        Ok(_) => {
            eprintln!("✅ 雛形データのインポートが完了しました");
            Ok(true)
        },
        Err(e) => {
            eprintln!("⚠️  雛形データのインポートに失敗しました: {}", e);
            eprintln!("   エラーを無視して初期化を続行します。");
            // エラーを無視して続行（致命的ではない）
            Ok(false)
        }
    }
}

