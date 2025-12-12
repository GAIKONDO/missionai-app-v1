use crate::database::{
    search_organizations_by_name, get_organizations_by_parent_id, get_organization_tree,
    add_member, add_member_simple, update_member, get_member_by_id, get_members_by_organization_id, delete_member,
    export_organizations_and_members_to_csv,
    check_duplicate_organizations, delete_duplicate_organizations,
    get_organization_by_id,
    OrganizationWithMembers,
    import_organization_master_from_csv,
    get_organization_masters_by_parent_code,
    OrganizationMaster,
    build_organization_tree_from_master,
    import_members_from_csv,
};
use crate::db::{WriteJob, WriteQueueState};
use serde_json::json;
use std::collections::HashMap;
use std::fs;
use tauri::State;

#[tauri::command]
pub async fn create_org(
    state: State<'_, WriteQueueState>,
    parent_id: Option<String>,
    name: String,
    title: Option<String>,
    description: Option<String>,
    level: i32,
    level_name: String,
    position: i32,
) -> Result<serde_json::Value, String> {
    // UUIDを生成（組織ID）
    let organization_id = uuid::Uuid::new_v4().to_string();
    
    // ペイロードを作成（値をクローンして使用）
    let mut payload = HashMap::new();
    let name_clone = name.clone();
    payload.insert("name".to_string(), json!(name_clone));
    
    let title_clone = title.clone();
    if let Some(ref t) = title_clone {
        payload.insert("title".to_string(), json!(t));
    }
    
    let description_clone = description.clone();
    if let Some(ref d) = description_clone {
        payload.insert("description".to_string(), json!(d));
    }
    
    let parent_id_clone = parent_id.clone();
    if let Some(ref p) = parent_id_clone {
        payload.insert("parentId".to_string(), json!(p));
    }
    
    payload.insert("level".to_string(), json!(level));
    payload.insert("levelName".to_string(), json!(level_name.clone()));
    payload.insert("position".to_string(), json!(position));
    
    // 書き込みキューに送信
    state.tx.send(WriteJob::UpsertOrganization {
        organization_id: organization_id.clone(),
        payload,
    }).await
    .map_err(|e| format!("書き込みキューへの送信に失敗しました: {}", e))?;
    
    // 作成された組織の情報を返す（IDと基本情報のみ）
    Ok(json!({
        "id": organization_id,
        "name": name,
        "title": title,
        "description": description,
        "level": level,
        "levelName": level_name,
        "position": position,
        "parentId": parent_id,
    }))
}

#[tauri::command]
pub async fn update_org(
    state: State<'_, WriteQueueState>,
    id: String,
    name: Option<String>,
    title: Option<String>,
    description: Option<String>,
    position: Option<i32>,
) -> Result<serde_json::Value, String> {
    // 現在の組織情報を取得
    let current_org = get_organization_by_id(&id)
        .map_err(|e| format!("組織の取得に失敗しました: {}", e))?;
    
    // ペイロードを作成（更新された値のみを含む）
    let mut payload = HashMap::new();
    let updated_name = name.as_ref().unwrap_or(&current_org.name).clone();
    payload.insert("name".to_string(), json!(updated_name.clone()));
    
    let updated_title = title.or_else(|| current_org.title.clone());
    if let Some(ref t) = updated_title {
        payload.insert("title".to_string(), json!(t));
    }
    
    let updated_description = description.or_else(|| current_org.description.clone());
    if let Some(ref d) = updated_description {
        payload.insert("description".to_string(), json!(d));
    }
    
    payload.insert("level".to_string(), json!(current_org.level));
    payload.insert("levelName".to_string(), json!(current_org.level_name.clone()));
    payload.insert("position".to_string(), json!(position.unwrap_or(current_org.position)));
    
    let updated_parent_id = current_org.parent_id.clone();
    if let Some(ref p) = updated_parent_id {
        payload.insert("parentId".to_string(), json!(p));
    }
    
    // 書き込みキューに送信
    state.tx.send(WriteJob::UpsertOrganization {
        organization_id: id.clone(),
        payload,
    }).await
    .map_err(|e| format!("書き込みキューへの送信に失敗しました: {}", e))?;
    
    // 更新後の組織情報を返す
    Ok(json!({
        "id": id,
        "name": updated_name,
        "title": updated_title,
        "description": updated_description,
        "level": current_org.level,
        "levelName": current_org.level_name,
        "position": position.unwrap_or(current_org.position),
        "parentId": updated_parent_id,
    }))
}

#[tauri::command]
pub async fn update_org_parent(
    state: State<'_, WriteQueueState>,
    id: String,
    parent_id: Option<String>,
) -> Result<serde_json::Value, String> {
    // 現在の組織情報を取得
    let current_org = get_organization_by_id(&id)
        .map_err(|e| format!("組織の取得に失敗しました: {}", e))?;
    
    // ペイロードを作成
    let mut payload = HashMap::new();
    let org_name = current_org.name.clone();
    payload.insert("name".to_string(), json!(org_name));
    
    let org_title = current_org.title.clone();
    if let Some(ref t) = org_title {
        payload.insert("title".to_string(), json!(t));
    }
    
    let org_description = current_org.description.clone();
    if let Some(ref d) = org_description {
        payload.insert("description".to_string(), json!(d));
    }
    
    payload.insert("level".to_string(), json!(current_org.level));
    payload.insert("levelName".to_string(), json!(current_org.level_name.clone()));
    payload.insert("position".to_string(), json!(current_org.position));
    
    let updated_parent_id = parent_id;
    if let Some(ref p) = updated_parent_id {
        payload.insert("parentId".to_string(), json!(p));
    }
    
    // 書き込みキューに送信
    state.tx.send(WriteJob::UpsertOrganization {
        organization_id: id.clone(),
        payload,
    }).await
    .map_err(|e| format!("書き込みキューへの送信に失敗しました: {}", e))?;
    
    // 更新後の組織情報を返す
    Ok(json!({
        "id": id,
        "name": org_name,
        "title": org_title,
        "description": org_description,
        "level": current_org.level,
        "levelName": current_org.level_name,
        "position": current_org.position,
        "parentId": updated_parent_id,
    }))
}

#[tauri::command]
pub fn get_org(id: String) -> Result<serde_json::Value, String> {
    match get_organization_by_id(&id) {
        Ok(org) => Ok(serde_json::to_value(org).unwrap()),
        Err(e) => Err(format!("組織の取得に失敗しました: {}", e)),
    }
}

#[tauri::command]
pub fn search_orgs_by_name(name_pattern: String) -> Result<Vec<serde_json::Value>, String> {
    match search_organizations_by_name(&name_pattern) {
        Ok(orgs) => Ok(orgs.into_iter().map(|o| serde_json::to_value(o).unwrap()).collect()),
        Err(e) => Err(format!("組織の検索に失敗しました: {}", e)),
    }
}

#[tauri::command]
pub fn get_orgs_by_parent(parent_id: Option<String>) -> Result<Vec<serde_json::Value>, String> {
    match get_organizations_by_parent_id(parent_id.as_deref()) {
        Ok(orgs) => Ok(orgs.into_iter().map(|o| serde_json::to_value(o).unwrap()).collect()),
        Err(e) => Err(format!("組織の取得に失敗しました: {}", e)),
    }
}

#[tauri::command]
pub fn get_org_tree(root_id: Option<String>) -> Result<Vec<serde_json::Value>, String> {
    // まずorganization_masterテーブルから取得を試みる
    match build_organization_tree_from_master() {
        Ok(tree) if !tree.is_empty() => {
            // organization_masterにデータがある場合はそれを使用
            Ok(tree.into_iter().map(|t| serde_json::to_value(t).unwrap()).collect())
        },
        _ => {
            // organization_masterにデータがない場合は既存のorganizationsテーブルから取得
    match get_organization_tree(root_id.as_deref()) {
        Ok(tree) => Ok(tree.into_iter().map(|t| serde_json::to_value(t).unwrap()).collect()),
        Err(e) => Err(format!("組織ツリーの取得に失敗しました: {}", e)),
            }
        }
    }
}

#[tauri::command]
pub async fn delete_org(
    state: State<'_, WriteQueueState>,
    id: String,
) -> Result<(), String> {
    println!("🗑️ [delete_org] Tauriコマンド呼び出し: id={}", id);
    
    // 書き込みキューに送信
    state.tx.send(WriteJob::DeleteOrganization {
        organization_id: id.clone(),
    }).await
    .map_err(|e| format!("書き込みキューへの送信に失敗しました: {}", e))?;
    
    println!("✅ [delete_org] 削除ジョブをキューに追加: id={}", id);
            Ok(())
}

#[tauri::command]
pub fn add_org_member(
    organization_id: String,
    name: String,
    position: Option<String>,
    name_romaji: Option<String>,
    department: Option<String>,
    extension: Option<String>,
    company_phone: Option<String>,
    mobile_phone: Option<String>,
    email: Option<String>,
    itochu_email: Option<String>,
    teams: Option<String>,
    employee_type: Option<String>,
    role_name: Option<String>,
    indicator: Option<String>,
    location: Option<String>,
    floor_door_no: Option<String>,
    previous_name: Option<String>,
) -> Result<serde_json::Value, String> {
    match add_member(
        organization_id, name, position, name_romaji, department, extension,
        company_phone, mobile_phone, email, itochu_email, teams, employee_type,
        role_name, indicator, location, floor_door_no, previous_name
    ) {
        Ok(member) => Ok(serde_json::to_value(member).unwrap()),
        Err(e) => Err(format!("メンバーの追加に失敗しました: {}", e)),
    }
}

#[tauri::command]
pub fn update_org_member(
    id: String,
    name: Option<String>,
    position: Option<String>,
    name_romaji: Option<String>,
    department: Option<String>,
    extension: Option<String>,
    company_phone: Option<String>,
    mobile_phone: Option<String>,
    email: Option<String>,
    itochu_email: Option<String>,
    teams: Option<String>,
    employee_type: Option<String>,
    role_name: Option<String>,
    indicator: Option<String>,
    location: Option<String>,
    floor_door_no: Option<String>,
    previous_name: Option<String>,
) -> Result<serde_json::Value, String> {
    match update_member(
        &id, name, position, name_romaji, department, extension,
        company_phone, mobile_phone, email, itochu_email, teams, employee_type,
        role_name, indicator, location, floor_door_no, previous_name
    ) {
        Ok(member) => Ok(serde_json::to_value(member).unwrap()),
        Err(e) => Err(format!("メンバーの更新に失敗しました: {}", e)),
    }
}

#[tauri::command]
pub fn get_org_member(id: String) -> Result<serde_json::Value, String> {
    match get_member_by_id(&id) {
        Ok(member) => Ok(serde_json::to_value(member).unwrap()),
        Err(e) => Err(format!("メンバーの取得に失敗しました: {}", e)),
    }
}

#[tauri::command]
pub fn get_org_members(organization_id: String) -> Result<Vec<serde_json::Value>, String> {
    println!("🔍 [get_org_members Tauriコマンド] 開始: organization_id={}", organization_id);
    match get_members_by_organization_id(&organization_id) {
        Ok(members) => {
            println!("✅ [get_org_members Tauriコマンド] 成功: {}件のメンバーを取得", members.len());
            Ok(members.into_iter().map(|m| serde_json::to_value(m).unwrap()).collect())
        },
        Err(e) => {
            println!("❌ [get_org_members Tauriコマンド] エラー: {}", e);
            Err(format!("メンバーの取得に失敗しました: {}", e))
        },
    }
}

#[tauri::command]
pub fn delete_org_member(id: String) -> Result<(), String> {
    match delete_member(&id) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("メンバーの削除に失敗しました: {}", e)),
    }
}

#[tauri::command]
pub fn export_organizations_and_members_csv(export_path: Option<String>) -> Result<String, String> {
    match export_organizations_and_members_to_csv() {
        Ok(csv_content) => {
            // export_pathが指定されている場合はファイルに保存
            if let Some(path) = export_path {
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

/// CSVファイルから組織マスターデータをインポート
#[tauri::command]
pub fn import_organization_master_csv(csv_path: String) -> Result<usize, String> {
    match import_organization_master_from_csv(&csv_path) {
        Ok(count) => {
            println!("✅ 組織マスターデータのインポートが完了しました: {}件", count);
            Ok(count)
        },
        Err(e) => {
            let error_msg = format!("CSVインポートエラー: {}", e);
            eprintln!("❌ {}", error_msg);
            Err(error_msg)
        }
    }
}

#[tauri::command]
pub fn import_members_csv(csv_path: String) -> Result<usize, String> {
    match import_members_from_csv(&csv_path) {
        Ok(count) => {
            println!("✅ メンバーデータのインポートが完了しました: {}件", count);
            Ok(count)
        },
        Err(e) => {
            let error_msg = format!("メンバーCSVインポートエラー: {}", e);
            eprintln!("❌ {}", error_msg);
            Err(error_msg)
        }
    }
}

/// 重複している組織を確認
#[tauri::command]
pub fn check_duplicate_orgs() -> Result<serde_json::Value, String> {
    match check_duplicate_organizations() {
        Ok(duplicates) => Ok(serde_json::to_value(duplicates).unwrap()),
        Err(e) => Err(format!("重複組織の確認に失敗しました: {}", e)),
    }
}

/// 重複している組織を削除
#[tauri::command]
pub fn delete_duplicate_orgs() -> Result<Vec<String>, String> {
    match delete_duplicate_organizations() {
        Ok(deleted_ids) => Ok(deleted_ids),
        Err(e) => Err(format!("重複組織の削除に失敗しました: {}", e)),
    }
}
