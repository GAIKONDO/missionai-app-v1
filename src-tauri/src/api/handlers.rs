use axum::{
    extract::{Path, Query, Json as AxumJson},
    response::Json,
    http::StatusCode,
};
use serde_json::{Value, json};
use std::collections::HashMap;

use crate::database::{
    get_organization_by_id, create_organization as db_create_organization, 
    update_organization as db_update_organization, delete_organization as db_delete_organization,
    get_organizations_by_parent_id, get_organization_tree as db_get_organization_tree, 
    search_organizations_by_name,
    get_members_by_organization_id, add_member, update_member, delete_member,
    get_all_themes, get_theme_by_id, save_theme as db_save_theme, create_theme as db_create_theme, delete_theme as db_delete_theme,
    Theme as DbTheme,
    get_doc, set_doc, update_doc, delete_doc, get_collection,
};

// ヘルスチェック
pub async fn health_check() -> Json<Value> {
    Json(json!({
        "status": "ok",
        "message": "API server is running"
    }))
}

// 組織関連ハンドラー
pub async fn get_organizations(
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let parent_id = params.get("parent_id").map(|s| s.as_str());
    
    match get_organizations_by_parent_id(parent_id) {
        Ok(orgs) => {
            let orgs_json: Vec<Value> = orgs.into_iter()
                .map(|o| serde_json::to_value(o).unwrap())
                .collect();
            Ok(Json(json!(orgs_json)))
        }
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("組織の取得に失敗しました: {}", e) }))
        ))
    }
}

pub async fn get_organization(
    Path(id): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    match get_organization_by_id(&id) {
        Ok(org) => Ok(Json(serde_json::to_value(org).unwrap())),
        Err(e) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": format!("組織の取得に失敗しました: {}", e) }))
        ))
    }
}

pub async fn create_organization(
    AxumJson(payload): AxumJson<HashMap<String, Value>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let parent_id = payload.get("parent_id").and_then(|v| v.as_str().map(|s| s.to_string()));
    let name = payload.get("name")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .ok_or_else(|| (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "name is required" }))
        ))?;
    let title = payload.get("title").and_then(|v| v.as_str().map(|s| s.to_string()));
    let description = payload.get("description").and_then(|v| v.as_str().map(|s| s.to_string()));
    let level = payload.get("level")
        .and_then(|v| v.as_i64().map(|i| i as i32))
        .unwrap_or(0);
    let level_name = payload.get("level_name")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .unwrap_or_else(|| "".to_string());
    let position = payload.get("position")
        .and_then(|v| v.as_i64().map(|i| i as i32))
        .unwrap_or(0);
    let org_type = payload.get("type").and_then(|v| v.as_str().map(|s| s.to_string()));
    
    match db_create_organization(parent_id, name, title, description, level, level_name, position, org_type) {
        Ok(org) => Ok(Json(serde_json::to_value(org).unwrap())),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("組織の作成に失敗しました: {}", e) }))
        ))
    }
}

pub async fn update_organization(
    Path(id): Path<String>,
    AxumJson(payload): AxumJson<HashMap<String, Value>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let name = payload.get("name").and_then(|v| v.as_str().map(|s| s.to_string()));
    let title = payload.get("title").and_then(|v| v.as_str().map(|s| s.to_string()));
    let description = payload.get("description").and_then(|v| v.as_str().map(|s| s.to_string()));
    let position = payload.get("position").and_then(|v| v.as_i64().map(|i| i as i32));
    
    match db_update_organization(&id, name, title, description, position) {
        Ok(org) => Ok(Json(serde_json::to_value(org).unwrap())),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("組織の更新に失敗しました: {}", e) }))
        ))
    }
}

pub async fn delete_organization(
    Path(id): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    match db_delete_organization(&id) {
        Ok(_) => Ok(Json(json!({ "message": "組織を削除しました" }))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("組織の削除に失敗しました: {}", e) }))
        ))
    }
}

pub async fn get_organization_tree(
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let root_id = params.get("root_id").map(|s| s.as_str());
    
    match db_get_organization_tree(root_id) {
        Ok(tree) => {
            let tree_json: Vec<Value> = tree.into_iter()
                .map(|t| serde_json::to_value(t).unwrap())
                .collect();
            Ok(Json(json!(tree_json)))
        }
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("組織ツリーの取得に失敗しました: {}", e) }))
        ))
    }
}

pub async fn search_organizations(
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let name_pattern = params.get("name")
        .ok_or_else(|| (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "name parameter is required" }))
        ))?;
    
    match search_organizations_by_name(name_pattern) {
        Ok(orgs) => {
            let orgs_json: Vec<Value> = orgs.into_iter()
                .map(|o| serde_json::to_value(o).unwrap())
                .collect();
            Ok(Json(json!(orgs_json)))
        }
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("組織の検索に失敗しました: {}", e) }))
        ))
    }
}

pub async fn get_organization_members(
    Path(id): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    println!("🔍 [get_organization_members API] 開始: organization_id={}", id);
    match get_members_by_organization_id(&id) {
        Ok(members) => {
            println!("✅ [get_organization_members API] 成功: {}件のメンバーを取得", members.len());
            let members_json: Vec<Value> = members.into_iter()
                .map(|m| serde_json::to_value(m).unwrap())
                .collect();
            Ok(Json(json!(members_json)))
        }
        Err(e) => {
            println!("❌ [get_organization_members API] エラー: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": format!("組織メンバーの取得に失敗しました: {}", e) }))
            ))
        }
    }
}

pub async fn add_organization_member(
    Path(id): Path<String>,
    AxumJson(payload): AxumJson<HashMap<String, Value>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let name = payload.get("name")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .ok_or_else(|| (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "name is required" }))
        ))?;
    let position = payload.get("position").and_then(|v| v.as_str().map(|s| s.to_string()));
    let name_romaji = payload.get("name_romaji").and_then(|v| v.as_str().map(|s| s.to_string()));
    let department = payload.get("department").and_then(|v| v.as_str().map(|s| s.to_string()));
    let extension = payload.get("extension").and_then(|v| v.as_str().map(|s| s.to_string()));
    let company_phone = payload.get("company_phone").and_then(|v| v.as_str().map(|s| s.to_string()));
    let mobile_phone = payload.get("mobile_phone").and_then(|v| v.as_str().map(|s| s.to_string()));
    let email = payload.get("email").and_then(|v| v.as_str().map(|s| s.to_string()));
    let itochu_email = payload.get("itochu_email").and_then(|v| v.as_str().map(|s| s.to_string()));
    let teams = payload.get("teams").and_then(|v| v.as_str().map(|s| s.to_string()));
    let employee_type = payload.get("employee_type").and_then(|v| v.as_str().map(|s| s.to_string()));
    let role_name = payload.get("role_name").and_then(|v| v.as_str().map(|s| s.to_string()));
    let indicator = payload.get("indicator").and_then(|v| v.as_str().map(|s| s.to_string()));
    let location = payload.get("location").and_then(|v| v.as_str().map(|s| s.to_string()));
    let floor_door_no = payload.get("floor_door_no").and_then(|v| v.as_str().map(|s| s.to_string()));
    let previous_name = payload.get("previous_name").and_then(|v| v.as_str().map(|s| s.to_string()));
    
    match add_member(
        id.clone(), name, position, name_romaji, department, extension,
        company_phone, mobile_phone, email, itochu_email, teams,
        employee_type, role_name, indicator, location, floor_door_no, previous_name,
    ) {
        Ok(member) => Ok(Json(serde_json::to_value(member).unwrap())),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("組織メンバーの追加に失敗しました: {}", e) }))
        ))
    }
}

pub async fn update_organization_member(
    Path((_org_id, member_id)): Path<(String, String)>,
    AxumJson(payload): AxumJson<HashMap<String, Value>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let name = payload.get("name").and_then(|v| v.as_str().map(|s| s.to_string()));
    let position = payload.get("position").and_then(|v| v.as_str().map(|s| s.to_string()));
    let name_romaji = payload.get("name_romaji").and_then(|v| v.as_str().map(|s| s.to_string()));
    let department = payload.get("department").and_then(|v| v.as_str().map(|s| s.to_string()));
    let extension = payload.get("extension").and_then(|v| v.as_str().map(|s| s.to_string()));
    let company_phone = payload.get("company_phone").and_then(|v| v.as_str().map(|s| s.to_string()));
    let mobile_phone = payload.get("mobile_phone").and_then(|v| v.as_str().map(|s| s.to_string()));
    let email = payload.get("email").and_then(|v| v.as_str().map(|s| s.to_string()));
    let itochu_email = payload.get("itochu_email").and_then(|v| v.as_str().map(|s| s.to_string()));
    let teams = payload.get("teams").and_then(|v| v.as_str().map(|s| s.to_string()));
    let employee_type = payload.get("employee_type").and_then(|v| v.as_str().map(|s| s.to_string()));
    let role_name = payload.get("role_name").and_then(|v| v.as_str().map(|s| s.to_string()));
    let indicator = payload.get("indicator").and_then(|v| v.as_str().map(|s| s.to_string()));
    let location = payload.get("location").and_then(|v| v.as_str().map(|s| s.to_string()));
    let floor_door_no = payload.get("floor_door_no").and_then(|v| v.as_str().map(|s| s.to_string()));
    let previous_name = payload.get("previous_name").and_then(|v| v.as_str().map(|s| s.to_string()));
    
    match update_member(
        &member_id, name, position, name_romaji, department, extension,
        company_phone, mobile_phone, email, itochu_email, teams,
        employee_type, role_name, indicator, location, floor_door_no, previous_name,
    ) {
        Ok(member) => Ok(Json(serde_json::to_value(member).unwrap())),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("組織メンバーの更新に失敗しました: {}", e) }))
        ))
    }
}

pub async fn delete_organization_member(
    Path((_org_id, member_id)): Path<(String, String)>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    match delete_member(&member_id) {
        Ok(_) => Ok(Json(json!({ "message": "組織メンバーを削除しました" }))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("組織メンバーの削除に失敗しました: {}", e) }))
        ))
    }
}

// 事業会社関連ハンドラー（Companiesテーブル削除のため無効化）
pub async fn get_companies(
    Query(_params): Query<HashMap<String, String>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    // Companiesテーブル削除のため、エラーを返す
    Err((
        StatusCode::GONE,
        Json(json!({ "error": "Companiesテーブルは削除されました。このAPIは使用できません。" }))
    ))
    /* 以下は無効化されたコード
    match get_all_companies() {
        Ok(companies) => {
            let companies_json: Vec<Value> = companies.into_iter()
                .map(|c| serde_json::to_value(c).unwrap())
                .collect();
            Ok(Json(json!(companies_json)))
        }
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("事業会社の取得に失敗しました: {}", e) }))
        ))
    }
    */
}

pub async fn get_company(
    Path(_id): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    // Companiesテーブル削除のため、エラーを返す
    Err((
        StatusCode::GONE,
        Json(json!({ "error": "Companiesテーブルは削除されました。このAPIは使用できません。" }))
    ))
}

pub async fn get_company_by_code(
    Path(_code): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    // Companiesテーブル削除のため、エラーを返す
    Err((
        StatusCode::GONE,
        Json(json!({ "error": "Companiesテーブルは削除されました。このAPIは使用できません。" }))
    ))
}

pub async fn get_companies_by_organization(
    Path(_org_id): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    // Companiesテーブル削除のため、エラーを返す
    Err((
        StatusCode::GONE,
        Json(json!({ "error": "Companiesテーブルは削除されました。このAPIは使用できません。" }))
    ))
}

pub async fn create_company(
    AxumJson(_payload): AxumJson<HashMap<String, Value>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    // Companiesテーブル削除のため、エラーを返す
    Err((
        StatusCode::GONE,
        Json(json!({ "error": "Companiesテーブルは削除されました。このAPIは使用できません。" }))
    ))
    /* 以下は無効化されたコード
    let code = payload.get("code")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .ok_or_else(|| (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "code is required" }))
        ))?;
    let name = payload.get("name")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .ok_or_else(|| (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "name is required" }))
        ))?;
    let name_short = payload.get("name_short").and_then(|v| v.as_str().map(|s| s.to_string()));
    let category = payload.get("category")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .ok_or_else(|| (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "category is required" }))
        ))?;
    let organization_id = payload.get("organization_id")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .ok_or_else(|| (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "organization_id is required" }))
        ))?;
    let company = payload.get("company").and_then(|v| v.as_str().map(|s| s.to_string()));
    let division = payload.get("division").and_then(|v| v.as_str().map(|s| s.to_string()));
    let department = payload.get("department").and_then(|v| v.as_str().map(|s| s.to_string()));
    let region = payload.get("region")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .unwrap_or_else(|| "JP".to_string());
    let position = payload.get("position")
        .and_then(|v| v.as_i64().map(|i| i as i32))
        .unwrap_or(0);
    
    match db_create_company(code, name, name_short, category, organization_id, company, division, department, region, position) {
        Ok(company) => Ok(Json(serde_json::to_value(company).unwrap())),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("事業会社の作成に失敗しました: {}", e) }))
        ))
    }
    */
}

pub async fn update_company(
    Path(_id): Path<String>,
    AxumJson(_payload): AxumJson<HashMap<String, Value>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    // Companiesテーブル削除のため、エラーを返す
    Err((
        StatusCode::GONE,
        Json(json!({ "error": "Companiesテーブルは削除されました。このAPIは使用できません。" }))
    ))
    /* 以下は無効化されたコード
    let code = payload.get("code").and_then(|v| v.as_str().map(|s| s.to_string()));
    let name = payload.get("name").and_then(|v| v.as_str().map(|s| s.to_string()));
    let name_short = payload.get("name_short").and_then(|v| v.as_str().map(|s| s.to_string()));
    let category = payload.get("category").and_then(|v| v.as_str().map(|s| s.to_string()));
    let organization_id = payload.get("organization_id").and_then(|v| v.as_str().map(|s| s.to_string()));
    let company = payload.get("company").and_then(|v| v.as_str().map(|s| s.to_string()));
    let division = payload.get("division").and_then(|v| v.as_str().map(|s| s.to_string()));
    let department = payload.get("department").and_then(|v| v.as_str().map(|s| s.to_string()));
    let region = payload.get("region").and_then(|v| v.as_str().map(|s| s.to_string()));
    let position = payload.get("position").and_then(|v| v.as_i64().map(|i| i as i32));
    
    match db_update_company(&id, code, name, name_short, category, organization_id, company, division, department, region, position) {
        Ok(company) => Ok(Json(serde_json::to_value(company).unwrap())),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("事業会社の更新に失敗しました: {}", e) }))
        ))
    }
    */
}

pub async fn delete_company(
    Path(_id): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    // Companiesテーブル削除のため、エラーを返す
    Err((
        StatusCode::GONE,
        Json(json!({ "error": "Companiesテーブルは削除されました。このAPIは使用できません。" }))
    ))
}

// リレーション関連ハンドラー
pub async fn get_relations() -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    match get_collection("relations", None) {
        Ok(relations) => {
            // 各リレーションのデータを整形
            let formatted: Vec<Value> = relations.into_iter().map(|mut item| {
                // idフィールドを追加
                if let Some(id) = item.remove("id") {
                    item.insert("id".to_string(), id);
                }
                json!(item)
            }).collect();
            Ok(Json(json!(formatted)))
        },
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("リレーションの取得に失敗しました: {}", e) }))
        ))
    }
}

pub async fn get_relation(
    Path(id): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    match get_doc("relations", &id) {
        Ok(mut relation) => {
            relation.insert("id".to_string(), json!(id));
            Ok(Json(json!(relation)))
        },
        Err(e) => {
            let error_msg = format!("{}", e);
            if error_msg.contains("no rows") || error_msg.contains("Query returned no rows") {
                Err((
                    StatusCode::NOT_FOUND,
                    Json(json!({ "error": "リレーションが見つかりません" }))
                ))
            } else {
                Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "error": format!("リレーションの取得に失敗しました: {}", e) }))
                ))
            }
        }
    }
}

pub async fn create_relation(
    AxumJson(payload): AxumJson<HashMap<String, Value>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    // IDを生成（payloadにidがない場合）
    let id = payload.get("id")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .unwrap_or_else(|| format!("relation_{}_{}", 
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            uuid::Uuid::new_v4().to_string().chars().take(8).collect::<String>()
        ));
    
    match set_doc("relations", &id, payload) {
        Ok(_) => {
            // 作成したリレーションを取得して返す
            match get_doc("relations", &id) {
                Ok(mut relation) => {
                    relation.insert("id".to_string(), json!(id));
                    Ok(Json(json!(relation)))
                },
                Err(e) => Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "error": format!("作成後のリレーション取得に失敗しました: {}", e) }))
                ))
            }
        },
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("リレーションの作成に失敗しました: {}", e) }))
        ))
    }
}

pub async fn update_relation(
    Path(id): Path<String>,
    AxumJson(payload): AxumJson<HashMap<String, Value>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    match update_doc("relations", &id, payload) {
        Ok(_) => {
            // 更新したリレーションを取得して返す
            match get_doc("relations", &id) {
                Ok(mut relation) => {
                    relation.insert("id".to_string(), json!(id));
                    Ok(Json(json!(relation)))
                },
                Err(e) => Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "error": format!("更新後のリレーション取得に失敗しました: {}", e) }))
                ))
            }
        },
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("リレーションの更新に失敗しました: {}", e) }))
        ))
    }
}

pub async fn delete_relation(
    Path(id): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    match delete_doc("relations", &id) {
        Ok(_) => Ok(Json(json!({ "message": "リレーションを削除しました" }))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("リレーションの削除に失敗しました: {}", e) }))
        ))
    }
}

// エンティティ関連ハンドラー
pub async fn get_entities() -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    match get_collection("entities", None) {
        Ok(entities) => {
            // 各エンティティのデータを整形
            let formatted: Vec<Value> = entities.into_iter().map(|mut item| {
                // idフィールドを追加
                if let Some(id) = item.remove("id") {
                    item.insert("id".to_string(), id);
                }
                // aliasesとmetadataをJSON文字列からオブジェクトに変換
                if let Some(aliases) = item.get("aliases") {
                    if let Some(aliases_str) = aliases.as_str() {
                        if let Ok(parsed) = serde_json::from_str::<Value>(aliases_str) {
                            item.insert("aliases".to_string(), parsed);
                        }
                    }
                }
                if let Some(metadata) = item.get("metadata") {
                    if let Some(metadata_str) = metadata.as_str() {
                        if let Ok(parsed) = serde_json::from_str::<Value>(metadata_str) {
                            item.insert("metadata".to_string(), parsed);
                        }
                    }
                }
                json!(item)
            }).collect();
            Ok(Json(json!(formatted)))
        },
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("エンティティの取得に失敗しました: {}", e) }))
        ))
    }
}

pub async fn get_entity(
    Path(id): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    match get_doc("entities", &id) {
        Ok(mut entity) => {
            entity.insert("id".to_string(), json!(id));
            // aliasesとmetadataをJSON文字列からオブジェクトに変換
            if let Some(aliases) = entity.get("aliases") {
                if let Some(aliases_str) = aliases.as_str() {
                    if let Ok(parsed) = serde_json::from_str::<Value>(aliases_str) {
                        entity.insert("aliases".to_string(), parsed);
                    }
                }
            }
            if let Some(metadata) = entity.get("metadata") {
                if let Some(metadata_str) = metadata.as_str() {
                    if let Ok(parsed) = serde_json::from_str::<Value>(metadata_str) {
                        entity.insert("metadata".to_string(), parsed);
                    }
                }
            }
            Ok(Json(json!(entity)))
        },
        Err(e) => {
            let error_msg = format!("{}", e);
            if error_msg.contains("no rows") || error_msg.contains("Query returned no rows") {
                Err((
                    StatusCode::NOT_FOUND,
                    Json(json!({ "error": "エンティティが見つかりません" }))
                ))
            } else {
                Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "error": format!("エンティティの取得に失敗しました: {}", e) }))
                ))
            }
        }
    }
}

pub async fn create_entity(
    AxumJson(mut payload): AxumJson<HashMap<String, Value>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    // IDを生成（payloadにidがない場合）
    let id = payload.get("id")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .unwrap_or_else(|| format!("entity_{}_{}", 
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            uuid::Uuid::new_v4().to_string().chars().take(8).collect::<String>()
        ));
    
    // aliasesとmetadataをJSON文字列に変換（データベースではTEXT型として保存）
    if let Some(aliases) = payload.get("aliases") {
        if aliases.is_array() || aliases.is_object() {
            if let Ok(json_str) = serde_json::to_string(aliases) {
                payload.insert("aliases".to_string(), json!(json_str));
            }
        }
    }
    if let Some(metadata) = payload.get("metadata") {
        if metadata.is_object() {
            if let Ok(json_str) = serde_json::to_string(metadata) {
                payload.insert("metadata".to_string(), json!(json_str));
            }
        }
    }
    
    match set_doc("entities", &id, payload) {
        Ok(_) => {
            // 作成したエンティティを取得して返す
            match get_doc("entities", &id) {
                Ok(mut entity) => {
                    entity.insert("id".to_string(), json!(id));
                    // aliasesとmetadataをJSON文字列からオブジェクトに変換
                    if let Some(aliases) = entity.get("aliases") {
                        if let Some(aliases_str) = aliases.as_str() {
                            if let Ok(parsed) = serde_json::from_str::<Value>(aliases_str) {
                                entity.insert("aliases".to_string(), parsed);
                            }
                        }
                    }
                    if let Some(metadata) = entity.get("metadata") {
                        if let Some(metadata_str) = metadata.as_str() {
                            if let Ok(parsed) = serde_json::from_str::<Value>(metadata_str) {
                                entity.insert("metadata".to_string(), parsed);
                            }
                        }
                    }
                    Ok(Json(json!(entity)))
                },
                Err(e) => Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "error": format!("作成後のエンティティ取得に失敗しました: {}", e) }))
                ))
            }
        },
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("エンティティの作成に失敗しました: {}", e) }))
        ))
    }
}

pub async fn update_entity(
    Path(id): Path<String>,
    AxumJson(mut payload): AxumJson<HashMap<String, Value>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    // aliasesとmetadataをJSON文字列に変換（データベースではTEXT型として保存）
    if let Some(aliases) = payload.get("aliases") {
        if aliases.is_array() || aliases.is_object() {
            if let Ok(json_str) = serde_json::to_string(aliases) {
                payload.insert("aliases".to_string(), json!(json_str));
            }
        }
    }
    if let Some(metadata) = payload.get("metadata") {
        if metadata.is_object() {
            if let Ok(json_str) = serde_json::to_string(metadata) {
                payload.insert("metadata".to_string(), json!(json_str));
            }
        }
    }
    
    match update_doc("entities", &id, payload) {
        Ok(_) => {
            // 更新したエンティティを取得して返す
            match get_doc("entities", &id) {
                Ok(mut entity) => {
                    entity.insert("id".to_string(), json!(id));
                    // aliasesとmetadataをJSON文字列からオブジェクトに変換
                    if let Some(aliases) = entity.get("aliases") {
                        if let Some(aliases_str) = aliases.as_str() {
                            if let Ok(parsed) = serde_json::from_str::<Value>(aliases_str) {
                                entity.insert("aliases".to_string(), parsed);
                            }
                        }
                    }
                    if let Some(metadata) = entity.get("metadata") {
                        if let Some(metadata_str) = metadata.as_str() {
                            if let Ok(parsed) = serde_json::from_str::<Value>(metadata_str) {
                                entity.insert("metadata".to_string(), parsed);
                            }
                        }
                    }
                    Ok(Json(json!(entity)))
                },
                Err(e) => Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "error": format!("更新後のエンティティ取得に失敗しました: {}", e) }))
                ))
            }
        },
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("エンティティの更新に失敗しました: {}", e) }))
        ))
    }
}

pub async fn delete_entity(
    Path(id): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    match delete_doc("entities", &id) {
        Ok(_) => Ok(Json(json!({ "message": "エンティティを削除しました" }))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("エンティティの削除に失敗しました: {}", e) }))
        ))
    }
}

// 組織と事業会社の表示関係ハンドラー

pub async fn create_organization_company_display(
    AxumJson(_payload): AxumJson<HashMap<String, Value>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    // organizationCompanyDisplayテーブル削除のため、エラーを返す
    Err((
        StatusCode::GONE,
        Json(json!({ "error": "organizationCompanyDisplayテーブルは削除されました。このAPIは使用できません。" }))
    ))
}

pub async fn get_all_organization_company_displays() -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    // organizationCompanyDisplayテーブル削除のため、エラーを返す
    Err((
        StatusCode::GONE,
        Json(json!({ "error": "organizationCompanyDisplayテーブルは削除されました。このAPIは使用できません。" }))
    ))
}

pub async fn get_companies_by_organization_display(
    Path(_org_id): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    // organizationCompanyDisplayテーブル削除のため、エラーを返す
    Err((
        StatusCode::GONE,
        Json(json!({ "error": "organizationCompanyDisplayテーブルは削除されました。このAPIは使用できません。" }))
    ))
}

pub async fn get_organizations_by_company_display(
    Path(_company_id): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    // organizationCompanyDisplayテーブル削除のため、エラーを返す
    Err((
        StatusCode::GONE,
        Json(json!({ "error": "organizationCompanyDisplayテーブルは削除されました。このAPIは使用できません。" }))
    ))
}

pub async fn update_organization_company_display_order(
    Path(_id): Path<String>,
    AxumJson(_payload): AxumJson<HashMap<String, Value>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    // organizationCompanyDisplayテーブル削除のため、エラーを返す
    Err((
        StatusCode::GONE,
        Json(json!({ "error": "organizationCompanyDisplayテーブルは削除されました。このAPIは使用できません。" }))
    ))
}

pub async fn delete_organization_company_display(
    Path(_id): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    // organizationCompanyDisplayテーブル削除のため、エラーを返す
    Err((
        StatusCode::GONE,
        Json(json!({ "error": "organizationCompanyDisplayテーブルは削除されました。このAPIは使用できません。" }))
    ))
}

pub async fn delete_organization_company_display_by_ids(
    Path((_org_id, _company_id)): Path<(String, String)>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    // organizationCompanyDisplayテーブル削除のため、エラーを返す
    Err((
        StatusCode::GONE,
        Json(json!({ "error": "organizationCompanyDisplayテーブルは削除されました。このAPIは使用できません。" }))
    ))
}

// テーマ関連ハンドラー
pub async fn get_themes() -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    match get_all_themes() {
        Ok(themes) => {
            let themes_json: Vec<Value> = themes.into_iter()
                .map(|t| serde_json::to_value(t).unwrap())
                .collect();
            Ok(Json(json!(themes_json)))
        }
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("テーマの取得に失敗しました: {}", e) }))
        ))
    }
}

pub async fn get_theme(
    Path(id): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    match get_theme_by_id(&id) {
        Ok(Some(theme)) => Ok(Json(serde_json::to_value(theme).unwrap())),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "テーマが見つかりませんでした" }))
        )),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("テーマの取得に失敗しました: {}", e) }))
        ))
    }
}

pub async fn create_theme(
    AxumJson(payload): AxumJson<HashMap<String, Value>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let title = payload.get("title")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .ok_or_else(|| (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "title is required" }))
        ))?;
    
    let description = payload.get("description")
        .and_then(|v| v.as_str().map(|s| s.to_string()));

    match db_create_theme(title, description) {
        Ok(theme) => Ok(Json(serde_json::to_value(theme).unwrap())),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("テーマの作成に失敗しました: {}", e) }))
        ))
    }
}

pub async fn update_theme(
    Path(id): Path<String>,
    AxumJson(payload): AxumJson<HashMap<String, Value>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let title = payload.get("title")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .ok_or_else(|| (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "title is required" }))
        ))?;
    
    let description = payload.get("description")
        .and_then(|v| v.as_str().map(|s| s.to_string()));
    
    let initiative_ids = payload.get("initiativeIds")
        .and_then(|v| {
            if let Some(arr) = v.as_array() {
                Some(arr.iter().filter_map(|item| item.as_str().map(|s| s.to_string())).collect())
            } else {
                None
            }
        });

    let theme = DbTheme {
        id: id.clone(),
        title,
        description,
        initiative_ids,
        position: None, // API経由の更新ではpositionは変更しない
        created_at: None,
        updated_at: None,
    };

    match db_save_theme(&theme) {
        Ok(updated_theme) => Ok(Json(serde_json::to_value(updated_theme).unwrap())),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("テーマの更新に失敗しました: {}", e) }))
        ))
    }
}

pub async fn delete_theme_handler(
    Path(id): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    match db_delete_theme(&id) {
        Ok(_) => Ok(Json(json!({ "message": "テーマを削除しました" }))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("テーマの削除に失敗しました: {}", e) }))
        ))
    }
}
