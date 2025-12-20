use crate::database::{
    search_organizations_by_name, get_organizations_by_parent_id, get_organization_tree,
    add_member, update_member, get_member_by_id, get_members_by_organization_id, delete_member,
    get_organization_by_id,
    update_theme_positions,
    get_all_themes,
    delete_organization,
    get_deletion_targets,
};
use crate::db::{WriteJob, WriteQueueState};
use serde_json::json;
use std::collections::HashMap;
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
    org_type: Option<String>,
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
    
    let org_type_clone = org_type.clone();
    if let Some(ref t) = org_type_clone {
        payload.insert("type".to_string(), json!(t));
    }
    
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
        "type": org_type.unwrap_or_else(|| "organization".to_string()),
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
    match get_organization_tree(root_id.as_deref()) {
        Ok(tree) => Ok(tree.into_iter().map(|t| serde_json::to_value(t).unwrap()).collect()),
        Err(e) => Err(format!("組織ツリーの取得に失敗しました: {}", e)),
    }
}

#[tauri::command]
pub fn delete_org(
    id: String,
) -> Result<(), String> {
    println!("🗑️ [delete_org] Tauriコマンド呼び出し: id={}", id);
    
    // 削除処理を同期的に実行（書き込みキューを使わない）
    // 削除処理は重要な操作なので、完了を確認する必要がある
    match delete_organization(&id) {
        Ok(_) => {
            println!("✅ [delete_org] 削除成功: id={}", id);
            Ok(())
        }
        Err(e) => {
            println!("❌ [delete_org] 削除失敗: id={}, error={}", id, e);
            Err(format!("組織の削除に失敗しました: {}", e))
        }
    }
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

// 注意: import_organization_master_csvコマンドは削除されました（organization_masterテーブルが削除されたため）

/// 複数のテーマのpositionを一括更新
#[tauri::command]
pub async fn update_theme_positions_cmd(
    updates: Vec<(String, i32)>,
) -> Result<(), String> {
    update_theme_positions(&updates)
        .map_err(|e| format!("テーマ順序の更新に失敗しました: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn get_themes_cmd() -> Result<Vec<serde_json::Value>, String> {
    match get_all_themes() {
        Ok(themes) => {
            let themes_json: Vec<serde_json::Value> = themes
                .into_iter()
                .map(|theme| {
                    serde_json::json!({
                        "id": theme.id,
                        "title": theme.title,
                        "description": theme.description,
                        "initiativeIds": theme.initiative_ids,
                        "position": theme.position,
                        "createdAt": theme.created_at,
                        "updatedAt": theme.updated_at,
                    })
                })
                .collect();
            Ok(themes_json)
        }
        Err(e) => Err(format!("テーマ取得に失敗しました: {}", e)),
    }
}

/// 削除対象の子組織とメンバーを取得
#[tauri::command]
pub fn get_deletion_targets_cmd(organization_id: String) -> Result<serde_json::Value, String> {
    match get_deletion_targets(&organization_id) {
        Ok((child_orgs, members)) => {
            let child_orgs_json: Vec<serde_json::Value> = child_orgs
                .iter()
                .map(|org| {
                    json!({
                        "id": org.id,
                        "name": org.name,
                        "title": org.title,
                        "description": org.description,
                        "level": org.level,
                        "levelName": org.level_name,
                        "position": org.position,
                        "type": org.org_type,
                        "parentId": org.parent_id,
                    })
                })
                .collect();
            
            let members_json: Vec<serde_json::Value> = members
                .iter()
                .map(|member| {
                    json!({
                        "id": member.id,
                        "organizationId": member.organization_id,
                        "name": member.name,
                        "position": member.position,
                    })
                })
                .collect();
            
            Ok(json!({
                "childOrganizations": child_orgs_json,
                "members": members_json,
            }))
        }
        Err(e) => Err(format!("削除対象の取得に失敗しました: {}", e)),
    }
}
