use crate::database::{
    create_organization_company_display,
    get_companies_by_organization_display,
    get_organizations_by_company_display,
    get_all_organization_company_displays,
    update_organization_company_display_order,
    delete_organization_company_display,
    delete_organization_company_display_by_ids,
    delete_all_organization_company_displays_by_organization,
    delete_all_organization_company_displays_by_company,
};

/// 組織と事業会社の表示関係を作成
#[tauri::command]
pub fn create_org_company_display(
    organization_id: String,
    company_id: String,
    display_order: Option<i32>,
) -> Result<serde_json::Value, String> {
    match create_organization_company_display(&organization_id, &company_id, display_order) {
        Ok(display) => Ok(serde_json::to_value(display).unwrap()),
        Err(e) => Err(format!("表示関係の作成に失敗しました: {}", e)),
    }
}

/// 組織IDで表示される事業会社のリストを取得
#[tauri::command]
pub fn get_companies_by_org_display(organization_id: String) -> Result<Vec<serde_json::Value>, String> {
    match get_companies_by_organization_display(&organization_id) {
        Ok(displays) => Ok(displays.into_iter().map(|d| serde_json::to_value(d).unwrap()).collect()),
        Err(e) => Err(format!("事業会社の取得に失敗しました: {}", e)),
    }
}

/// 事業会社IDで表示される組織のリストを取得
#[tauri::command]
pub fn get_organizations_by_company_display_cmd(company_id: String) -> Result<Vec<serde_json::Value>, String> {
    match get_organizations_by_company_display(&company_id) {
        Ok(displays) => Ok(displays.into_iter().map(|d| serde_json::to_value(d).unwrap()).collect()),
        Err(e) => Err(format!("組織の取得に失敗しました: {}", e)),
    }
}

/// すべての表示関係を取得
#[tauri::command]
pub fn get_all_org_company_displays() -> Result<Vec<serde_json::Value>, String> {
    match get_all_organization_company_displays() {
        Ok(displays) => Ok(displays.into_iter().map(|d| serde_json::to_value(d).unwrap()).collect()),
        Err(e) => Err(format!("表示関係の取得に失敗しました: {}", e)),
    }
}

/// 表示順序を更新
#[tauri::command]
pub fn update_org_company_display_order(
    id: String,
    display_order: i32,
) -> Result<(), String> {
    match update_organization_company_display_order(&id, display_order) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("表示順序の更新に失敗しました: {}", e)),
    }
}

/// 組織と事業会社の表示関係を削除
#[tauri::command]
pub fn delete_org_company_display(id: String) -> Result<(), String> {
    match delete_organization_company_display(&id) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("表示関係の削除に失敗しました: {}", e)),
    }
}

/// 組織IDと事業会社IDで表示関係を削除
#[tauri::command]
pub fn delete_org_company_display_by_ids(
    organization_id: String,
    company_id: String,
) -> Result<(), String> {
    match delete_organization_company_display_by_ids(&organization_id, &company_id) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("表示関係の削除に失敗しました: {}", e)),
    }
}

/// 組織IDで全ての表示関係を削除
#[tauri::command]
pub fn delete_all_org_company_displays_by_org(organization_id: String) -> Result<(), String> {
    match delete_all_organization_company_displays_by_organization(&organization_id) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("表示関係の削除に失敗しました: {}", e)),
    }
}

/// 事業会社IDで全ての表示関係を削除
#[tauri::command]
pub fn delete_all_org_company_displays_by_company(company_id: String) -> Result<(), String> {
    match delete_all_organization_company_displays_by_company(&company_id) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("表示関係の削除に失敗しました: {}", e)),
    }
}
