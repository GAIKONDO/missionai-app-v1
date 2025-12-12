use crate::database::{
    create_company, update_company, get_company_by_id, get_company_by_code,
    get_companies_by_organization_id, get_all_companies, delete_company,
    export_companies_to_csv,
};

#[tauri::command]
pub fn create_company_cmd(
    code: String,
    name: String,
    name_short: Option<String>,
    category: String,
    organization_id: String,
    company: Option<String>,
    division: Option<String>,
    department: Option<String>,
    region: String,
    position: i32,
) -> Result<serde_json::Value, String> {
    match create_company(code, name, name_short, category, organization_id, company, division, department, region, position) {
        Ok(comp) => Ok(serde_json::to_value(comp).unwrap()),
        Err(e) => Err(format!("事業会社の作成に失敗しました: {}", e)),
    }
}

#[tauri::command]
pub fn update_company_cmd(
    id: String,
    code: Option<String>,
    name: Option<String>,
    name_short: Option<String>,
    category: Option<String>,
    organization_id: Option<String>,
    company: Option<String>,
    division: Option<String>,
    department: Option<String>,
    region: Option<String>,
    position: Option<i32>,
) -> Result<serde_json::Value, String> {
    match update_company(&id, code, name, name_short, category, organization_id, company, division, department, region, position) {
        Ok(comp) => Ok(serde_json::to_value(comp).unwrap()),
        Err(e) => Err(format!("事業会社の更新に失敗しました: {}", e)),
    }
}

#[tauri::command]
pub fn get_company(id: String) -> Result<serde_json::Value, String> {
    match get_company_by_id(&id) {
        Ok(comp) => Ok(serde_json::to_value(comp).unwrap()),
        Err(e) => Err(format!("事業会社の取得に失敗しました: {}", e)),
    }
}

#[tauri::command]
pub fn get_company_by_code_cmd(code: String) -> Result<serde_json::Value, String> {
    match get_company_by_code(&code) {
        Ok(comp) => Ok(serde_json::to_value(comp).unwrap()),
        Err(e) => Err(format!("事業会社の取得に失敗しました: {}", e)),
    }
}

#[tauri::command]
pub fn get_companies_by_org(organization_id: String) -> Result<Vec<serde_json::Value>, String> {
    match get_companies_by_organization_id(&organization_id) {
        Ok(companies) => Ok(companies.into_iter().map(|c| serde_json::to_value(c).unwrap()).collect()),
        Err(e) => Err(format!("事業会社の取得に失敗しました: {}", e)),
    }
}

#[tauri::command]
pub fn get_all_companies_cmd() -> Result<Vec<serde_json::Value>, String> {
    match get_all_companies() {
        Ok(companies) => Ok(companies.into_iter().map(|c| serde_json::to_value(c).unwrap()).collect()),
        Err(e) => Err(format!("事業会社の取得に失敗しました: {}", e)),
    }
}

#[tauri::command]
pub fn delete_company_cmd(id: String) -> Result<(), String> {
    match delete_company(&id) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("事業会社の削除に失敗しました: {}", e)),
    }
}

#[tauri::command]
pub fn export_companies_csv(export_path: Option<String>) -> Result<String, String> {
    match export_companies_to_csv() {
        Ok(csv_content) => {
            // export_pathが指定されている場合はファイルに保存
            if let Some(path) = export_path {
                use std::fs;
                match fs::write(&path, &csv_content) {
                    Ok(_) => Ok(path),
                    Err(e) => Err(format!("CSVファイルの書き込みに失敗しました: {}", e)),
                }
            } else {
                // export_pathが指定されていない場合はCSVコンテンツを直接返す
                Ok(csv_content)
            }
        },
        Err(e) => Err(format!("CSVエクスポートに失敗しました: {}", e)),
    }
}
