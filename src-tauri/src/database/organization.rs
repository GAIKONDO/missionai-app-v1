use rusqlite::{params, Result as SqlResult};
use serde::{Deserialize, Serialize};
use crate::database::{get_db, get_timestamp};
use uuid::Uuid;
use std::collections::HashMap;

/// 組織マスターデータ構造体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizationMaster {
    pub id: String,
    pub code: String,
    pub parent_code: Option<String>,
    pub hierarchy_level: i32,
    pub hierarchy_type: String, // "company", "division", "department", "section"
    pub name_kanji: String,
    pub name_kanji_short: Option<String>,
    pub name_english: Option<String>,
    pub company_code: Option<String>,
    pub company_name: Option<String>,
    pub division_code: Option<String>,
    pub division_name: Option<String>,
    pub department_code: Option<String>,
    pub department_name: Option<String>,
    pub section_code: Option<String>,
    pub section_name: Option<String>,
    pub department_indicator: Option<String>,
    pub section_indicator: Option<String>,
    pub section_indicator_short: Option<String>,
    pub phone: Option<String>,
    pub fax: Option<String>,
    pub accounting_team_code: Option<String>,
    pub accounting_team_name: Option<String>,
    pub accounting_team_phone: Option<String>,
    pub accounting_team_fax: Option<String>,
    pub sales_section_type: Option<String>,
    pub domestic_overseas_type: Option<String>,
    pub consolidated_sales_section_type: Option<String>,
    pub weighted_average_domestic: Option<String>,
    pub weighted_average_import: Option<String>,
    pub weighted_average_export: Option<String>,
    pub weighted_average_three_countries: Option<String>,
    pub store_code: Option<String>,
    pub store_name: Option<String>,
    pub overseas_office_code: Option<String>,
    pub common_log_section_code: Option<String>,
    pub report_distribution_destination_1: Option<String>,
    pub report_distribution_destination_2: Option<String>,
    pub billing_not_required: Option<String>,
    pub purchase_billing_not_required: Option<String>,
    pub account_total_display: Option<String>,
    pub is_active: i32,
    pub valid_from_date: Option<String>,
    pub valid_to_date: Option<String>,
    pub is_abolished: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Organization {
    pub id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub level: i32,
    pub level_name: String, // "部門", "部", "課", "チーム" など
    pub position: i32,
    #[serde(default = "default_org_type")]
    pub org_type: String, // "organization" または "company"
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

fn default_org_type() -> String {
    "organization".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizationMember {
    pub id: String,
    #[serde(rename = "organizationId")]
    pub organization_id: String,
    pub name: String,
    pub position: Option<String>, // 役職
    #[serde(rename = "nameRomaji")]
    pub name_romaji: Option<String>,
    pub department: Option<String>,
    pub extension: Option<String>,
    #[serde(rename = "companyPhone")]
    pub company_phone: Option<String>,
    #[serde(rename = "mobilePhone")]
    pub mobile_phone: Option<String>,
    pub email: Option<String>,
    #[serde(rename = "itochuEmail")]
    pub itochu_email: Option<String>,
    pub teams: Option<String>,
    #[serde(rename = "employeeType")]
    pub employee_type: Option<String>,
    #[serde(rename = "roleName")]
    pub role_name: Option<String>,
    pub indicator: Option<String>,
    pub location: Option<String>,
    #[serde(rename = "floorDoorNo")]
    pub floor_door_no: Option<String>,
    #[serde(rename = "previousName")]
    pub previous_name: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizationWithMembers {
    #[serde(flatten)]
    pub organization: Organization,
    pub members: Vec<OrganizationMember>,
    pub children: Vec<OrganizationWithMembers>,
}

/// 組織を作成
pub fn create_organization(
    parent_id: Option<String>,
    name: String,
    title: Option<String>,
    description: Option<String>,
    level: i32,
    level_name: String,
    position: i32,
    org_type: Option<String>,
) -> SqlResult<Organization> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let id = Uuid::new_v4().to_string();
    let now = get_timestamp();
    let now_clone = now.clone();
    let org_type = org_type.unwrap_or_else(|| "organization".to_string());

    // トランザクションを開始（データベースロックを最小化）
    let tx = conn.unchecked_transaction()?;
    
    tx.execute(
        "INSERT INTO organizations (id, parentId, name, title, description, level, levelName, position, type, createdAt, updatedAt)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            id.clone(),
            parent_id.clone(),
            name.clone(),
            title.clone(),
            description.clone(),
            level,
            level_name.clone(),
            position,
            org_type.clone(),
            now,
            now_clone
        ],
    )?;
    
    tx.commit()?;

    Ok(Organization {
        id,
        parent_id,
        name,
        title,
        description,
        level,
        level_name,
        position,
        org_type,
        created_at: get_timestamp(),
        updated_at: get_timestamp(),
    })
}

/// 組織を更新
pub fn update_organization(
    id: &str,
    name: Option<String>,
    title: Option<String>,
    description: Option<String>,
    position: Option<i32>,
) -> SqlResult<Organization> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let now = get_timestamp();

    // 現在の値を取得
    let mut org = get_organization_by_id(id)?;

    // 更新
    if let Some(name) = name {
        org.name = name;
    }
    if let Some(title) = title {
        org.title = Some(title);
    }
    if let Some(description) = description {
        org.description = Some(description);
    }
    if let Some(position) = position {
        org.position = position;
    }
    org.updated_at = now.clone();

    // トランザクションを開始（データベースロックを最小化）
    let tx = conn.unchecked_transaction()?;
    
    tx.execute(
        "UPDATE organizations SET name = ?1, title = ?2, description = ?3, position = ?4, updatedAt = ?5 WHERE id = ?6",
        params![org.name, org.title, org.description, org.position, now, id],
    )?;
    
    tx.commit()?;

    Ok(org)
}

/// 組織の親IDを更新
pub fn update_organization_parent_id(
    id: &str,
    parent_id: Option<String>,
) -> SqlResult<Organization> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let now = get_timestamp();

    // 現在の値を取得
    let mut org = get_organization_by_id(id)?;

    // 親IDを更新
    org.parent_id = parent_id.clone();
    org.updated_at = now.clone();

    // トランザクションを開始（データベースロックを最小化）
    let tx = conn.unchecked_transaction()?;
    
    tx.execute(
        "UPDATE organizations SET parentId = ?1, updatedAt = ?2 WHERE id = ?3",
        params![parent_id, now, id],
    )?;
    
    tx.commit()?;

    Ok(org)
}

/// IDで組織を取得
pub fn get_organization_by_id(id: &str) -> SqlResult<Organization> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    conn.query_row(
        "SELECT id, parentId, name, title, description, level, levelName, position, type, createdAt, updatedAt
         FROM organizations WHERE id = ?1",
        params![id],
        |row| {
            Ok(Organization {
                id: row.get(0)?,
                parent_id: row.get(1)?,
                name: row.get(2)?,
                title: row.get(3)?,
                description: row.get(4)?,
                level: row.get(5)?,
                level_name: row.get(6)?,
                position: row.get(7)?,
                org_type: row.get(8).unwrap_or_else(|_| "organization".to_string()),
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        },
    )
}

/// 名前で組織を検索（部分一致）
pub fn search_organizations_by_name(name_pattern: &str) -> SqlResult<Vec<Organization>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let pattern = format!("%{}%", name_pattern);

    let mut stmt = conn.prepare(
        "SELECT id, parentId, name, title, description, level, levelName, position, type, createdAt, updatedAt
         FROM organizations WHERE name LIKE ?1 ORDER BY name ASC",
    )?;
    let rows = stmt.query_map(params![pattern], |row| {
        Ok(Organization {
            id: row.get(0)?,
            parent_id: row.get(1)?,
            name: row.get(2)?,
            title: row.get(3)?,
            description: row.get(4)?,
            level: row.get(5)?,
            level_name: row.get(6)?,
            position: row.get(7)?,
            org_type: row.get(8).unwrap_or_else(|_| "organization".to_string()),
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    })?;
    let orgs: Vec<Organization> = rows.collect::<Result<Vec<_>, _>>()?;

    Ok(orgs)
}

/// 親IDで子組織を取得
pub fn get_organizations_by_parent_id(parent_id: Option<&str>) -> SqlResult<Vec<Organization>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    let orgs: Vec<Organization> = if let Some(parent_id) = parent_id {
        println!("🔍 [get_organizations_by_parent_id] 親IDで検索: parentId={}", parent_id);
        let mut stmt = conn.prepare(
            "SELECT id, parentId, name, title, description, level, levelName, position, type, createdAt, updatedAt
             FROM organizations WHERE parentId = ?1 ORDER BY position ASC, name ASC",
        )?;
        let rows = stmt.query_map(params![parent_id], |row| {
            Ok(Organization {
                id: row.get(0)?,
                parent_id: row.get(1)?,
                name: row.get(2)?,
                title: row.get(3)?,
                description: row.get(4)?,
                level: row.get(5)?,
                level_name: row.get(6)?,
                position: row.get(7)?,
                org_type: row.get(8).unwrap_or_else(|_| "organization".to_string()),
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })?;
        let result: Vec<Organization> = rows.collect::<Result<Vec<_>, _>>()?;
        println!("✅ [get_organizations_by_parent_id] 子組織を取得: {}件 (parentId={})", result.len(), parent_id);
        result
    } else {
        println!("🔍 [get_organizations_by_parent_id] parentId IS NULLで検索");
        let mut stmt = conn.prepare(
            "SELECT id, parentId, name, title, description, level, levelName, position, type, createdAt, updatedAt
             FROM organizations WHERE parentId IS NULL ORDER BY position ASC, name ASC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(Organization {
                id: row.get(0)?,
                parent_id: row.get(1)?,
                name: row.get(2)?,
                title: row.get(3)?,
                description: row.get(4)?,
                level: row.get(5)?,
                level_name: row.get(6)?,
                position: row.get(7)?,
                org_type: row.get(8).unwrap_or_else(|_| "organization".to_string()),
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })?;
        let result: Vec<Organization> = rows.collect::<Result<Vec<_>, _>>()?;
        println!("✅ [get_organizations_by_parent_id] ルート組織を取得: {}件", result.len());
        for org in &result {
            println!("  - ID: {}, 名前: {}, parentId: {:?}", org.id, org.name, org.parent_id);
        }
        result
    };

    Ok(orgs)
}

/// 階層構造で組織を取得（再帰的）
pub fn get_organization_tree(root_id: Option<&str>) -> SqlResult<Vec<OrganizationWithMembers>> {
    let root_orgs = if let Some(root_id) = root_id {
        vec![get_organization_by_id(root_id)?]
    } else {
        let orgs = get_organizations_by_parent_id(None)?;
        println!("🔍 [get_organization_tree] parentId IS NULLの組織を取得: {}件", orgs.len());
        for org in &orgs {
            println!("  - ID: {}, 名前: {}, parentId: {:?}", org.id, org.name, org.parent_id);
        }
        orgs
    };

    let mut result = Vec::new();
    for org in root_orgs {
        println!("🔍 [get_organization_tree] 組織ツリーを構築開始: ID={}, 名前={}", org.id, org.name);
        result.push(build_organization_tree(&org)?);
    }

    println!("✅ [get_organization_tree] 組織ツリー構築完了: {}件のルート組織", result.len());
    Ok(result)
}

/// 組織ツリーを構築（再帰的）
fn build_organization_tree(org: &Organization) -> SqlResult<OrganizationWithMembers> {
    let members = get_members_by_organization_id(&org.id)?;
    let children_orgs = get_organizations_by_parent_id(Some(&org.id))?;
    let mut children = Vec::new();

    for child_org in children_orgs {
        children.push(build_organization_tree(&child_org)?);
    }

    Ok(OrganizationWithMembers {
        organization: org.clone(),
        members,
        children,
    })
}

/// 組織を削除
pub fn delete_organization(id: &str) -> SqlResult<()> {
    println!("🗑️ [delete_organization] 削除開始: id={}", id);
    
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    
    // 削除前に組織が存在するか確認
    let org_exists: bool = {
        let mut stmt = conn.prepare("SELECT COUNT(*) FROM organizations WHERE id = ?1")?;
        let count: i64 = stmt.query_row(params![id], |row| Ok(row.get(0)?))?;
        count > 0
    };
    
    if !org_exists {
        println!("⚠️ [delete_organization] 組織が存在しません: id={}", id);
        return Ok(()); // 既に削除されている場合は成功として扱う
    }
    
    println!("✅ [delete_organization] 組織が存在することを確認: id={}", id);
    
    // ロックを解放
    drop(conn);

    // 子組織のIDを取得（ロックを取得する前に）
    let child_ids: Vec<String> = {
        let conn = db.get_connection()?;
        let mut stmt = conn.prepare(
            "SELECT id FROM organizations WHERE parentId = ?1",
        )?;
        let rows = stmt.query_map(params![id], |row| {
            Ok(row.get::<_, String>(0)?)
        })?;
        rows.collect::<Result<Vec<_>, _>>()?
    };

    println!("🔍 [delete_organization] 子組織数: {}件", child_ids.len());

    // 子組織を再帰的に削除（ロックを解放した後）
    for child_id in child_ids {
        println!("🗑️ [delete_organization] 子組織を削除: id={}", child_id);
        delete_organization(&child_id)?;
    }

    // メンバーと組織を削除
    let conn = db.get_connection()?;
    
    // トランザクションを開始（すべての削除操作を1つのトランザクションにまとめる）
    let tx = conn.unchecked_transaction()?;
    
    // 関連データを削除（外部キー制約があるため）
    println!("🗑️ [delete_organization] 関連データを削除開始: id={}", id);
    
    // メンバーを削除
    let deleted_members = tx.execute("DELETE FROM organizationMembers WHERE organizationId = ?1", params![id])?;
    println!("✅ [delete_organization] メンバー削除: {}件", deleted_members);
    
    // 組織コンテンツを削除
    let deleted_contents = tx.execute("DELETE FROM organizationContents WHERE organizationId = ?1", params![id])?;
    println!("✅ [delete_organization] 組織コンテンツ削除: {}件", deleted_contents);
    
    // 注力施策を削除
    let deleted_initiatives = tx.execute("DELETE FROM focusInitiatives WHERE organizationId = ?1", params![id])?;
    println!("✅ [delete_organization] 注力施策削除: {}件", deleted_initiatives);
    
    // 議事録を削除
    let deleted_notes = tx.execute("DELETE FROM meetingNotes WHERE organizationId = ?1", params![id])?;
    println!("✅ [delete_organization] 議事録削除: {}件", deleted_notes);
    
    // エンティティを削除（organizationIdが設定されている場合）
    let deleted_entities = tx.execute("DELETE FROM entities WHERE organizationId = ?1", params![id])?;
    println!("✅ [delete_organization] エンティティ削除: {}件", deleted_entities);
    
    // リレーションを削除（organizationIdが設定されている場合）
    let deleted_relations = tx.execute("DELETE FROM relations WHERE organizationId = ?1", params![id])?;
    println!("✅ [delete_organization] リレーション削除: {}件", deleted_relations);
    
    // 事業会社を削除
    let deleted_companies = tx.execute("DELETE FROM companies WHERE organizationId = ?1", params![id])?;
    println!("✅ [delete_organization] 事業会社削除: {}件", deleted_companies);
    
    // エンティティ埋め込みを削除
    // entityEmbeddingsテーブルは廃止済み（entitiesテーブルに統合）
    // 削除は不要（entitiesテーブルから削除される）
    
    // リレーション埋め込みを削除
    // relationEmbeddingsテーブルは廃止済み（relationsテーブルに統合）
    // 削除は不要（relationsテーブルから削除される）
    
    // トピック埋め込みを削除（organizationIdが設定されている場合）
    // topicEmbeddingsテーブルは廃止済み（topicsテーブルに統合）
    let deleted_topics = tx.execute("DELETE FROM topics WHERE organizationId = ?1", params![id])?;
    println!("✅ [delete_organization] トピック削除: {}件", deleted_topics);

    // 組織を削除
    let deleted_orgs = tx.execute("DELETE FROM organizations WHERE id = ?1", params![id])?;
    println!("✅ [delete_organization] 組織削除: {}件 (id={})", deleted_orgs, id);
    
    // トランザクションをコミット
    tx.commit()?;
    
    if deleted_orgs == 0 {
        println!("⚠️ [delete_organization] 組織が削除されませんでした: id={}", id);
        return Err(rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CONSTRAINT),
            Some(format!("組織の削除に失敗しました。組織ID {} は存在しないか、既に削除されています。", id)),
        ));
    }
    
    println!("✅ [delete_organization] 削除完了: id={}", id);
    Ok(())
}

/// メンバーを追加（詳細情報対応）
pub fn add_member(
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
) -> SqlResult<OrganizationMember> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let id = Uuid::new_v4().to_string();
    let now = get_timestamp();
    let now_clone = now.clone();

    // トランザクションを開始（データベースロックを最小化）
    let tx = conn.unchecked_transaction()?;
    
    tx.execute(
        "INSERT INTO organizationMembers (
            id, organizationId, name, position, nameRomaji, department, extension,
            companyPhone, mobilePhone, email, itochuEmail, teams, employeeType,
            roleName, indicator, location, floorDoorNo, previousName, createdAt, updatedAt
        )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)",
        params![
            id.clone(), organization_id.clone(), name.clone(), position.clone(),
            name_romaji.clone(), department.clone(), extension.clone(),
            company_phone.clone(), mobile_phone.clone(), email.clone(),
            itochu_email.clone(), teams.clone(), employee_type.clone(),
            role_name.clone(), indicator.clone(), location.clone(),
            floor_door_no.clone(), previous_name.clone(), now, now_clone
        ],
    )?;
    
    tx.commit()?;

    Ok(OrganizationMember {
        id,
        organization_id,
        name,
        position,
        name_romaji,
        department,
        extension,
        company_phone,
        mobile_phone,
        email,
        itochu_email,
        teams,
        employee_type,
        role_name,
        indicator,
        location,
        floor_door_no,
        previous_name,
        created_at: get_timestamp(),
        updated_at: get_timestamp(),
    })
}

/// メンバーを追加（簡易版 - 後方互換性のため）
pub fn add_member_simple(organization_id: String, name: String, position: Option<String>) -> SqlResult<OrganizationMember> {
    add_member(
        organization_id, name, position,
        None, None, None, None, None, None, None, None, None, None, None, None, None, None
    )
}

/// メンバーを更新（詳細情報対応）
pub fn update_member(
    id: &str,
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
) -> SqlResult<OrganizationMember> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let now = get_timestamp();

    // 現在の値を取得
    let mut member = get_member_by_id(id)?;

    if let Some(name) = name {
        member.name = name;
    }
    if let Some(position) = position {
        member.position = Some(position);
    }
    if name_romaji.is_some() {
        member.name_romaji = name_romaji;
    }
    if department.is_some() {
        member.department = department;
    }
    if extension.is_some() {
        member.extension = extension;
    }
    if company_phone.is_some() {
        member.company_phone = company_phone;
    }
    if mobile_phone.is_some() {
        member.mobile_phone = mobile_phone;
    }
    if email.is_some() {
        member.email = email;
    }
    if itochu_email.is_some() {
        member.itochu_email = itochu_email;
    }
    if teams.is_some() {
        member.teams = teams;
    }
    if employee_type.is_some() {
        member.employee_type = employee_type;
    }
    if role_name.is_some() {
        member.role_name = role_name;
    }
    if indicator.is_some() {
        member.indicator = indicator;
    }
    if location.is_some() {
        member.location = location;
    }
    if floor_door_no.is_some() {
        member.floor_door_no = floor_door_no;
    }
    if previous_name.is_some() {
        member.previous_name = previous_name;
    }
    member.updated_at = now.clone();

    // トランザクションを開始（データベースロックを最小化）
    let tx = conn.unchecked_transaction()?;
    
    tx.execute(
        "UPDATE organizationMembers SET 
            name = ?1, position = ?2, nameRomaji = ?3, department = ?4, extension = ?5,
            companyPhone = ?6, mobilePhone = ?7, email = ?8, itochuEmail = ?9, teams = ?10,
            employeeType = ?11, roleName = ?12, indicator = ?13, location = ?14,
            floorDoorNo = ?15, previousName = ?16, updatedAt = ?17
         WHERE id = ?18",
        params![
            member.name, member.position, member.name_romaji, member.department, member.extension,
            member.company_phone, member.mobile_phone, member.email, member.itochu_email, member.teams,
            member.employee_type, member.role_name, member.indicator, member.location,
            member.floor_door_no, member.previous_name, now, id
        ],
    )?;
    
    tx.commit()?;

    Ok(member)
}

/// IDでメンバーを取得
pub fn get_member_by_id(id: &str) -> SqlResult<OrganizationMember> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    conn.query_row(
        "SELECT id, organizationId, name, position, nameRomaji, department, extension,
                companyPhone, mobilePhone, email, itochuEmail, teams, employeeType,
                roleName, indicator, location, floorDoorNo, previousName, createdAt, updatedAt
         FROM organizationMembers WHERE id = ?1",
        params![id],
        |row| {
            Ok(OrganizationMember {
                id: row.get(0)?,
                organization_id: row.get(1)?,
                name: row.get(2)?,
                position: row.get(3)?,
                name_romaji: row.get(4)?,
                department: row.get(5)?,
                extension: row.get(6)?,
                company_phone: row.get(7)?,
                mobile_phone: row.get(8)?,
                email: row.get(9)?,
                itochu_email: row.get(10)?,
                teams: row.get(11)?,
                employee_type: row.get(12)?,
                role_name: row.get(13)?,
                indicator: row.get(14)?,
                location: row.get(15)?,
                floor_door_no: row.get(16)?,
                previous_name: row.get(17)?,
                created_at: row.get(18)?,
                updated_at: row.get(19)?,
            })
        },
    )
}

/// 組織IDでメンバーを取得
pub fn get_members_by_organization_id(organization_id: &str) -> SqlResult<Vec<OrganizationMember>> {
    println!("🔍 [get_members_by_organization_id] 開始: organization_id={}", organization_id);
    
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    // デバッグ: 該当するorganizationIdのメンバー数を確認
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM organizationMembers WHERE organizationId = ?1",
        params![organization_id],
        |row| Ok(row.get(0)?)
    ).unwrap_or(0);
    println!("📊 [get_members_by_organization_id] データベース内のメンバー数: {}", count);
    
    // デバッグ: 該当するorganizationIdのメンバーIDを確認
    let mut debug_stmt = conn.prepare("SELECT id, name FROM organizationMembers WHERE organizationId = ?1 LIMIT 5").unwrap();
    let debug_members: Vec<(String, String)> = debug_stmt.query_map(params![organization_id], |row| {
        Ok((row.get(0)?, row.get(1)?))
    }).unwrap().collect::<Result<Vec<_>, _>>().unwrap_or_default();
    println!("📋 [get_members_by_organization_id] 最初の5件のメンバー: {:?}", debug_members);

    let mut stmt = conn.prepare(
        "SELECT id, organizationId, name, position, nameRomaji, department, extension,
                companyPhone, mobilePhone, email, itochuEmail, teams, employeeType,
                roleName, indicator, location, floorDoorNo, previousName, createdAt, updatedAt
         FROM organizationMembers WHERE organizationId = ?1 ORDER BY position ASC, name ASC",
    )?;

    let members = stmt.query_map(params![organization_id], |row| {
        Ok(OrganizationMember {
            id: row.get(0)?,
            organization_id: row.get(1)?,
            name: row.get(2)?,
            position: row.get(3)?,
            name_romaji: row.get(4)?,
            department: row.get(5)?,
            extension: row.get(6)?,
            company_phone: row.get(7)?,
            mobile_phone: row.get(8)?,
            email: row.get(9)?,
            itochu_email: row.get(10)?,
            teams: row.get(11)?,
            employee_type: row.get(12)?,
            role_name: row.get(13)?,
            indicator: row.get(14)?,
            location: row.get(15)?,
            floor_door_no: row.get(16)?,
            previous_name: row.get(17)?,
            created_at: row.get(18)?,
            updated_at: row.get(19)?,
        })
    })?;

    let result = members.collect::<Result<Vec<_>, _>>();
    match &result {
        Ok(members_vec) => {
            println!("✅ [get_members_by_organization_id] 成功: {}件のメンバーを取得", members_vec.len());
        }
        Err(e) => {
            println!("❌ [get_members_by_organization_id] エラー: {}", e);
        }
    }
    result
}

/// メンバーを削除
pub fn delete_member(id: &str) -> SqlResult<()> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    
    // トランザクションを開始（データベースロックを最小化）
    let tx = conn.unchecked_transaction()?;
    
    tx.execute("DELETE FROM organizationMembers WHERE id = ?1", params![id])?;
    
    tx.commit()?;

    Ok(())
}

/// すべての組織を取得
pub fn get_all_organizations() -> SqlResult<Vec<Organization>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    let mut stmt = conn.prepare(
        "SELECT id, parentId, name, title, description, level, levelName, position, type, createdAt, updatedAt
         FROM organizations ORDER BY level ASC, position ASC, name ASC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(Organization {
            id: row.get(0)?,
            parent_id: row.get(1)?,
            name: row.get(2)?,
            title: row.get(3)?,
            description: row.get(4)?,
            level: row.get(5)?,
            level_name: row.get(6)?,
            position: row.get(7)?,
            org_type: row.get(8).unwrap_or_else(|_| "organization".to_string()),
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    })?;
    let orgs: Vec<Organization> = rows.collect::<Result<Vec<_>, _>>()?;

    Ok(orgs)
}

/// すべてのメンバーを取得
pub fn get_all_members() -> SqlResult<Vec<OrganizationMember>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    let mut stmt = conn.prepare(
        "SELECT id, organizationId, name, position, nameRomaji, department, extension,
                companyPhone, mobilePhone, email, itochuEmail, teams, employeeType,
                roleName, indicator, location, floorDoorNo, previousName, createdAt, updatedAt
         FROM organizationMembers ORDER BY organizationId ASC, position ASC, name ASC",
    )?;

    let members = stmt.query_map([], |row| {
        Ok(OrganizationMember {
            id: row.get(0)?,
            organization_id: row.get(1)?,
            name: row.get(2)?,
            position: row.get(3)?,
            name_romaji: row.get(4)?,
            department: row.get(5)?,
            extension: row.get(6)?,
            company_phone: row.get(7)?,
            mobile_phone: row.get(8)?,
            email: row.get(9)?,
            itochu_email: row.get(10)?,
            teams: row.get(11)?,
            employee_type: row.get(12)?,
            role_name: row.get(13)?,
            indicator: row.get(14)?,
            location: row.get(15)?,
            floor_door_no: row.get(16)?,
            previous_name: row.get(17)?,
            created_at: row.get(18)?,
            updated_at: row.get(19)?,
        })
    })?;

    members.collect::<Result<Vec<_>, _>>()
}

/// CSVフィールドをエスケープ
fn escape_csv_field(field: &str) -> String {
    if field.contains(',') || field.contains('"') || field.contains('\n') {
        format!("\"{}\"", field.replace("\"", "\"\""))
    } else {
        field.to_string()
    }
}

/// 組織とメンバーをCSV形式でエクスポート
pub fn export_organizations_and_members_to_csv() -> SqlResult<String> {
    let organizations = get_all_organizations()?;
    let members = get_all_members()?;
    
    // 組織名のマップを作成（メンバーのCSVに組織名を含めるため）
    let org_map: HashMap<String, String> = organizations
        .iter()
        .map(|org| (org.id.clone(), org.name.clone()))
        .collect();
    
    let mut csv_lines = Vec::new();
    
    // BOMを追加（Excelで正しく表示されるように）
    csv_lines.push("\u{FEFF}".to_string());
    
    // === 組織データ ===
    csv_lines.push("=== 組織データ ===".to_string());
    csv_lines.push("ID,親組織ID,組織名,タイトル,説明,階層レベル,階層名称,表示順序,作成日時,更新日時".to_string());
    
    for org in &organizations {
        let line = format!(
            "{},{},{},{},{},{},{},{},{},{}",
            escape_csv_field(&org.id),
            org.parent_id.as_ref().map(|s| escape_csv_field(s)).unwrap_or_default(),
            escape_csv_field(&org.name),
            org.title.as_ref().map(|s| escape_csv_field(s)).unwrap_or_default(),
            org.description.as_ref().map(|s| escape_csv_field(s)).unwrap_or_default(),
            org.level,
            escape_csv_field(&org.level_name),
            org.position,
            escape_csv_field(&org.created_at),
            escape_csv_field(&org.updated_at)
        );
        csv_lines.push(line);
    }
    
    csv_lines.push("".to_string());
    
    // === メンバーデータ ===
    csv_lines.push("=== メンバーデータ ===".to_string());
    csv_lines.push("ID,組織ID,組織名,メンバー名,役職,名前（ローマ字）,部署,内線番号,会社電話番号,携帯電話番号,メールアドレス,伊藤忠メールアドレス,Teams,雇用形態,ロール名,インジケーター,所在地,フロア・ドア番号,以前の名前,作成日時,更新日時".to_string());
    
    for member in &members {
        let org_name = org_map.get(&member.organization_id).cloned().unwrap_or_default();
        let line = format!(
            "{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{}",
            escape_csv_field(&member.id),
            escape_csv_field(&member.organization_id),
            escape_csv_field(&org_name),
            escape_csv_field(&member.name),
            member.position.as_ref().map(|s| escape_csv_field(s)).unwrap_or_default(),
            member.name_romaji.as_ref().map(|s| escape_csv_field(s)).unwrap_or_default(),
            member.department.as_ref().map(|s| escape_csv_field(s)).unwrap_or_default(),
            member.extension.as_ref().map(|s| escape_csv_field(s)).unwrap_or_default(),
            member.company_phone.as_ref().map(|s| escape_csv_field(s)).unwrap_or_default(),
            member.mobile_phone.as_ref().map(|s| escape_csv_field(s)).unwrap_or_default(),
            member.email.as_ref().map(|s| escape_csv_field(s)).unwrap_or_default(),
            member.itochu_email.as_ref().map(|s| escape_csv_field(s)).unwrap_or_default(),
            member.teams.as_ref().map(|s| escape_csv_field(s)).unwrap_or_default(),
            member.employee_type.as_ref().map(|s| escape_csv_field(s)).unwrap_or_default(),
            member.role_name.as_ref().map(|s| escape_csv_field(s)).unwrap_or_default(),
            member.indicator.as_ref().map(|s| escape_csv_field(s)).unwrap_or_default(),
            member.location.as_ref().map(|s| escape_csv_field(s)).unwrap_or_default(),
            member.floor_door_no.as_ref().map(|s| escape_csv_field(s)).unwrap_or_default(),
            member.previous_name.as_ref().map(|s| escape_csv_field(s)).unwrap_or_default(),
            escape_csv_field(&member.created_at),
            escape_csv_field(&member.updated_at)
        );
        csv_lines.push(line);
    }
    
    Ok(csv_lines.join("\n"))
}

/// 重複組織の情報を取得（削除前の確認用）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateOrgInfo {
    pub name: String,
    pub count: i64,
    pub organizations: Vec<OrgDetailInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrgDetailInfo {
    pub id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub title: Option<String>,
    pub created_at: String,
    pub member_count: i64,
    pub child_count: i64,
}

/// 重複している組織を確認
pub fn check_duplicate_organizations() -> SqlResult<Vec<DuplicateOrgInfo>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    
    // 重複している組織名を取得
    let mut stmt = conn.prepare(
        "SELECT name FROM organizations 
         GROUP BY name HAVING COUNT(*) > 1
         ORDER BY COUNT(*) DESC, name ASC"
    )?;
    
    let duplicate_names: Vec<String> = stmt.query_map([], |row| {
        Ok(row.get::<_, String>(0)?)
    })?.collect::<Result<Vec<_>, _>>()?;
    
    let mut result = Vec::new();
    
    for name in duplicate_names {
        // 同じ名前の組織の詳細情報を取得
        let mut stmt = conn.prepare(
            "SELECT 
                o.id,
                o.parentId,
                o.name,
                o.title,
                o.createdAt,
                COUNT(DISTINCT m.id) as member_count,
                COUNT(DISTINCT c.id) as child_count
             FROM organizations o
             LEFT JOIN organizationMembers m ON o.id = m.organizationId
             LEFT JOIN organizations c ON c.parentId = o.id
             WHERE o.name = ?1
             GROUP BY o.id, o.parentId, o.name, o.title, o.createdAt
             ORDER BY member_count DESC, child_count DESC, o.createdAt ASC"
        )?;
        
        let orgs: Vec<OrgDetailInfo> = stmt.query_map(params![name], |row| {
            Ok(OrgDetailInfo {
                id: row.get(0)?,
                parent_id: row.get(1)?,
                name: row.get(2)?,
                title: row.get(3)?,
                created_at: row.get(4)?,
                member_count: row.get(5)?,
                child_count: row.get(6)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        
        result.push(DuplicateOrgInfo {
            name: name.clone(),
            count: orgs.len() as i64,
            organizations: orgs,
        });
    }
    
    Ok(result)
}

/// 重複組織を削除（メンバー数・子組織数が多い方を残す）
pub fn delete_duplicate_organizations() -> SqlResult<Vec<String>> {
    let duplicates = check_duplicate_organizations()?;
    let mut deleted_ids = Vec::new();
    
    for dup_info in duplicates {
        if dup_info.organizations.len() <= 1 {
            continue;
        }
        
        // 最初の1つ（メンバー数・子組織数が多い、または作成日時が古い）を残して、残りを削除
        for org in dup_info.organizations.iter().skip(1) {
            println!("🗑️ 重複組織を削除: {} (ID: {})", org.name, org.id);
            delete_organization(&org.id)?;
            deleted_ids.push(org.id.clone());
        }
    }
    
    Ok(deleted_ids)
}

// ============================================================================
// 組織マスターテーブル関連の関数
// ============================================================================

/// 組織マスターデータを作成
pub fn create_organization_master(
    code: String,
    parent_code: Option<String>,
    hierarchy_level: i32,
    hierarchy_type: String,
    name_kanji: String,
    name_kanji_short: Option<String>,
    name_english: Option<String>,
    company_code: Option<String>,
    company_name: Option<String>,
    division_code: Option<String>,
    division_name: Option<String>,
    department_code: Option<String>,
    department_name: Option<String>,
    section_code: Option<String>,
    section_name: Option<String>,
) -> SqlResult<OrganizationMaster> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let id = Uuid::new_v4().to_string();
    let now = get_timestamp();

    conn.execute(
        "INSERT INTO organization_master (
            id, code, parent_code, hierarchy_level, hierarchy_type,
            name_kanji, name_kanji_short, name_english,
            company_code, company_name, division_code, division_name,
            department_code, department_name, section_code, section_name,
            is_active, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, 1, ?17, ?18)",
        params![
            id.clone(),
            code.clone(),
            parent_code.clone(),
            hierarchy_level,
            hierarchy_type.clone(),
            name_kanji.clone(),
            name_kanji_short.clone(),
            name_english.clone(),
            company_code.clone(),
            company_name.clone(),
            division_code.clone(),
            division_name.clone(),
            department_code.clone(),
            department_name.clone(),
            section_code.clone(),
            section_name.clone(),
            now.clone(),
            now.clone(),
        ],
    )?;

    Ok(OrganizationMaster {
        id,
        code,
        parent_code,
        hierarchy_level,
        hierarchy_type,
        name_kanji,
        name_kanji_short,
        name_english,
        company_code,
        company_name,
        division_code,
        division_name,
        department_code,
        department_name,
        section_code,
        section_name,
        department_indicator: None,
        section_indicator: None,
        section_indicator_short: None,
        phone: None,
        fax: None,
        accounting_team_code: None,
        accounting_team_name: None,
        accounting_team_phone: None,
        accounting_team_fax: None,
        sales_section_type: None,
        domestic_overseas_type: None,
        consolidated_sales_section_type: None,
        weighted_average_domestic: None,
        weighted_average_import: None,
        weighted_average_export: None,
        weighted_average_three_countries: None,
        store_code: None,
        store_name: None,
        overseas_office_code: None,
        common_log_section_code: None,
        report_distribution_destination_1: None,
        report_distribution_destination_2: None,
        billing_not_required: None,
        purchase_billing_not_required: None,
        account_total_display: None,
        is_active: 1,
        valid_from_date: None,
        valid_to_date: None,
        is_abolished: 0,
        created_at: now.clone(),
        updated_at: now,
    })
}

/// コードで組織マスターデータを取得
pub fn get_organization_master_by_code(code: &str) -> SqlResult<OrganizationMaster> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    conn.query_row(
        "SELECT id, code, parent_code, hierarchy_level, hierarchy_type,
                name_kanji, name_kanji_short, name_english,
                company_code, company_name, division_code, division_name,
                department_code, department_name, section_code, section_name,
                department_indicator, section_indicator, section_indicator_short,
                phone, fax, accounting_team_code, accounting_team_name,
                accounting_team_phone, accounting_team_fax, sales_section_type,
                domestic_overseas_type, consolidated_sales_section_type,
                weighted_average_domestic, weighted_average_import,
                weighted_average_export, weighted_average_three_countries,
                store_code, store_name, overseas_office_code,
                common_log_section_code, report_distribution_destination_1,
                report_distribution_destination_2, billing_not_required,
                purchase_billing_not_required, account_total_display,
                is_active, valid_from_date, valid_to_date, is_abolished,
                created_at, updated_at
         FROM organization_master WHERE code = ?1",
        params![code],
        |row| {
            Ok(OrganizationMaster {
                id: row.get(0)?,
                code: row.get(1)?,
                parent_code: row.get(2)?,
                hierarchy_level: row.get(3)?,
                hierarchy_type: row.get(4)?,
                name_kanji: row.get(5)?,
                name_kanji_short: row.get(6)?,
                name_english: row.get(7)?,
                company_code: row.get(8)?,
                company_name: row.get(9)?,
                division_code: row.get(10)?,
                division_name: row.get(11)?,
                department_code: row.get(12)?,
                department_name: row.get(13)?,
                section_code: row.get(14)?,
                section_name: row.get(15)?,
                department_indicator: row.get(16)?,
                section_indicator: row.get(17)?,
                section_indicator_short: row.get(18)?,
                phone: row.get(19)?,
                fax: row.get(20)?,
                accounting_team_code: row.get(21)?,
                accounting_team_name: row.get(22)?,
                accounting_team_phone: row.get(23)?,
                accounting_team_fax: row.get(24)?,
                sales_section_type: row.get(25)?,
                domestic_overseas_type: row.get(26)?,
                consolidated_sales_section_type: row.get(27)?,
                weighted_average_domestic: row.get(28)?,
                weighted_average_import: row.get(29)?,
                weighted_average_export: row.get(30)?,
                weighted_average_three_countries: row.get(31)?,
                store_code: row.get(32)?,
                store_name: row.get(33)?,
                overseas_office_code: row.get(34)?,
                common_log_section_code: row.get(35)?,
                report_distribution_destination_1: row.get(36)?,
                report_distribution_destination_2: row.get(37)?,
                billing_not_required: row.get(38)?,
                purchase_billing_not_required: row.get(39)?,
                account_total_display: row.get(40)?,
                is_active: row.get(41)?,
                valid_from_date: row.get(42)?,
                valid_to_date: row.get(43)?,
                is_abolished: row.get(44)?,
                created_at: row.get(45)?,
                updated_at: row.get(46)?,
            })
        },
    )
}

/// 組織名（漢字）から組織コードを取得
pub fn get_organization_code_by_name(name: &str) -> SqlResult<Option<String>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    // name_kanjiまたはname_kanji_shortで検索
    let result: Option<String> = conn.query_row(
        "SELECT code FROM organization_master 
         WHERE (name_kanji = ?1 OR name_kanji_short = ?1) 
         AND is_active = 1 
         LIMIT 1",
        params![name],
        |row| row.get(0),
    ).ok();

    Ok(result)
}

/// 親コードで子組織マスターデータを取得
pub fn get_organization_masters_by_parent_code(parent_code: Option<&str>) -> SqlResult<Vec<OrganizationMaster>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    // マッピング関数を定義（クロージャの型を統一するため）
    fn map_row(row: &rusqlite::Row) -> rusqlite::Result<OrganizationMaster> {
        Ok(OrganizationMaster {
            id: row.get(0)?,
            code: row.get(1)?,
            parent_code: row.get(2)?,
            hierarchy_level: row.get(3)?,
            hierarchy_type: row.get(4)?,
            name_kanji: row.get(5)?,
            name_kanji_short: row.get(6)?,
            name_english: row.get(7)?,
            company_code: row.get(8)?,
            company_name: row.get(9)?,
            division_code: row.get(10)?,
            division_name: row.get(11)?,
            department_code: row.get(12)?,
            department_name: row.get(13)?,
            section_code: row.get(14)?,
            section_name: row.get(15)?,
            department_indicator: row.get(16)?,
            section_indicator: row.get(17)?,
            section_indicator_short: row.get(18)?,
            phone: row.get(19)?,
            fax: row.get(20)?,
            accounting_team_code: row.get(21)?,
            accounting_team_name: row.get(22)?,
            accounting_team_phone: row.get(23)?,
            accounting_team_fax: row.get(24)?,
            sales_section_type: row.get(25)?,
            domestic_overseas_type: row.get(26)?,
            consolidated_sales_section_type: row.get(27)?,
            weighted_average_domestic: row.get(28)?,
            weighted_average_import: row.get(29)?,
            weighted_average_export: row.get(30)?,
            weighted_average_three_countries: row.get(31)?,
            store_code: row.get(32)?,
            store_name: row.get(33)?,
            overseas_office_code: row.get(34)?,
            common_log_section_code: row.get(35)?,
            report_distribution_destination_1: row.get(36)?,
            report_distribution_destination_2: row.get(37)?,
            billing_not_required: row.get(38)?,
            purchase_billing_not_required: row.get(39)?,
            account_total_display: row.get(40)?,
            is_active: row.get(41)?,
            valid_from_date: row.get(42)?,
            valid_to_date: row.get(43)?,
            is_abolished: row.get(44)?,
            created_at: row.get(45)?,
            updated_at: row.get(46)?,
        })
    }

    let mut result = Vec::new();
    
    if let Some(parent_code) = parent_code {
        let mut stmt = conn.prepare(
            "SELECT id, code, parent_code, hierarchy_level, hierarchy_type,
                    name_kanji, name_kanji_short, name_english,
                    company_code, company_name, division_code, division_name,
                    department_code, department_name, section_code, section_name,
                    department_indicator, section_indicator, section_indicator_short,
                    phone, fax, accounting_team_code, accounting_team_name,
                    accounting_team_phone, accounting_team_fax, sales_section_type,
                    domestic_overseas_type, consolidated_sales_section_type,
                    weighted_average_domestic, weighted_average_import,
                    weighted_average_export, weighted_average_three_countries,
                    store_code, store_name, overseas_office_code,
                    common_log_section_code, report_distribution_destination_1,
                    report_distribution_destination_2, billing_not_required,
                    purchase_billing_not_required, account_total_display,
                    is_active, valid_from_date, valid_to_date, is_abolished,
                    created_at, updated_at
             FROM organization_master WHERE parent_code = ?1 AND is_active = 1
             ORDER BY hierarchy_level, code"
        )?;
        let rows = stmt.query_map(params![parent_code], map_row)?;
        for row in rows {
            result.push(row?);
        }
    } else {
        let mut stmt = conn.prepare(
            "SELECT id, code, parent_code, hierarchy_level, hierarchy_type,
                    name_kanji, name_kanji_short, name_english,
                    company_code, company_name, division_code, division_name,
                    department_code, department_name, section_code, section_name,
                    department_indicator, section_indicator, section_indicator_short,
                    phone, fax, accounting_team_code, accounting_team_name,
                    accounting_team_phone, accounting_team_fax, sales_section_type,
                    domestic_overseas_type, consolidated_sales_section_type,
                    weighted_average_domestic, weighted_average_import,
                    weighted_average_export, weighted_average_three_countries,
                    store_code, store_name, overseas_office_code,
                    common_log_section_code, report_distribution_destination_1,
                    report_distribution_destination_2, billing_not_required,
                    purchase_billing_not_required, account_total_display,
                    is_active, valid_from_date, valid_to_date, is_abolished,
                    created_at, updated_at
             FROM organization_master WHERE parent_code IS NULL AND is_active = 1
             ORDER BY hierarchy_level, code"
        )?;
        let rows = stmt.query_map([], map_row)?;
        for row in rows {
            result.push(row?);
        }
    }

    Ok(result)
}

/// CSVファイルから組織マスターデータをインポート
pub fn import_organization_master_from_csv(csv_path: &str) -> SqlResult<usize> {
    use std::fs::File;
    use std::io::Read;
    use csv::ReaderBuilder;

    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let mut file = File::open(csv_path).map_err(|e| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_IOERR),
            Some(format!("ファイルオープンエラー: {}", e)),
        )
    })?;
    let mut contents = String::new();
    file.read_to_string(&mut contents).map_err(|e| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_IOERR),
            Some(format!("ファイル読み込みエラー: {}", e)),
        )
    })?;

    // BOMを除去（UTF-8 BOMがある場合）
    let contents = if contents.starts_with("\u{FEFF}") {
        &contents[3..]
    } else {
        &contents
    };

    let mut reader = ReaderBuilder::new()
        .has_headers(true)
        .from_reader(contents.as_bytes());

    // 階層構造を構築するために、まずすべてのレコードを読み込んで階層を抽出
    use std::collections::HashSet;
    let mut companies: HashSet<(String, String)> = HashSet::new(); // (code, name)
    let mut divisions: HashSet<(String, String, String)> = HashSet::new(); // (code, name, parent_code)
    let mut departments: HashSet<(String, String, String)> = HashSet::new(); // (code, name, parent_code)
    let mut sections: Vec<(String, String, String, Vec<String>)> = Vec::new(); // (code, name, parent_code, other_fields)

    // 空文字列をNULLに変換するヘルパー関数
    let to_option = |s: String| if s.is_empty() { None } else { Some(s) };

    // 1回目の読み込み: 階層構造を抽出
    for result in reader.records() {
        let record = result.map_err(|e| {
            rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
                Some(format!("CSVパースエラー: {}", e)),
            )
        })?;
        
        let company_code = record.get(0).unwrap_or("").to_string();
        let company_name = record.get(1).unwrap_or("").to_string();
        let division_code = record.get(2).unwrap_or("").to_string();
        let division_name = record.get(3).unwrap_or("").to_string();
        let department_code = record.get(4).unwrap_or("").to_string();
        let department_name_short = record.get(5).unwrap_or("").to_string();
        let section_code = record.get(7).unwrap_or("").to_string();
        let section_name_short = record.get(8).unwrap_or("").to_string();
        let section_name_english = record.get(9).unwrap_or("").to_string();

        // 課コードが空の場合はスキップ
        if section_code.is_empty() {
            continue;
        }

        // 会社レベルを追加
        if !company_code.is_empty() {
            companies.insert((company_code.clone(), company_name.clone()));
        }

        // 部門レベルを追加
        if !division_code.is_empty() && !company_code.is_empty() {
            divisions.insert((division_code.clone(), division_name.clone(), company_code.clone()));
        }

        // 部レベルを追加
        if !department_code.is_empty() && !division_code.is_empty() {
            departments.insert((department_code.clone(), department_name_short.clone(), division_code.clone()));
        }

        // 課レベルのデータを保存（後で挿入用）
        let parent_code = if !department_code.is_empty() {
            department_code.clone()
        } else if !division_code.is_empty() {
            division_code.clone()
        } else {
            company_code.clone()
        };

        let name_kanji = if !section_name_short.is_empty() {
            section_name_short.clone()
        } else {
            section_name_english.clone()
        };

        // すべてのフィールドを文字列ベクトルとして保存
        let mut fields = Vec::new();
        for i in 0..37 {
            fields.push(record.get(i).unwrap_or("").to_string());
        }
        sections.push((section_code, name_kanji, parent_code, fields));
    }

    let tx = conn.unchecked_transaction()?;
    let now = get_timestamp();
    let mut count = 0;

    // 2回目の処理: 階層順序で組織を作成（会社→部門→部→課）
    
    // 1. 会社レベルを作成
    for (code, name) in &companies {
        let id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT OR REPLACE INTO organization_master (
                id, code, parent_code, hierarchy_level, hierarchy_type,
                name_kanji, company_code, company_name,
                is_active, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                id,
                code,
                None::<String>, // parent_code
                1, // hierarchy_level
                "company", // hierarchy_type
                name, // name_kanji
                to_option(code.clone()), // company_code
                to_option(name.clone()), // company_name
                1, // is_active
                now.clone(),
                now.clone(),
            ],
        )?;
        count += 1;
    }

    // 2. 部門レベルを作成
    for (code, name, parent_code) in &divisions {
        let id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT OR REPLACE INTO organization_master (
                id, code, parent_code, hierarchy_level, hierarchy_type,
                name_kanji, division_code, division_name, company_code,
                is_active, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                id,
                code,
                to_option(parent_code.clone()), // parent_code
                2, // hierarchy_level
                "division", // hierarchy_type
                name, // name_kanji
                to_option(code.clone()), // division_code
                to_option(name.clone()), // division_name
                to_option(parent_code.clone()), // company_code
                1, // is_active
                now.clone(),
                now.clone(),
            ],
        )?;
        count += 1;
    }

    // 3. 部レベルを作成
    for (code, name, parent_code) in &departments {
        let id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT OR REPLACE INTO organization_master (
                id, code, parent_code, hierarchy_level, hierarchy_type,
                name_kanji, department_code, department_name, division_code,
                is_active, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                id,
                code,
                to_option(parent_code.clone()), // parent_code
                3, // hierarchy_level
                "department", // hierarchy_type
                name, // name_kanji
                to_option(code.clone()), // department_code
                to_option(name.clone()), // department_name
                to_option(parent_code.clone()), // division_code
                1, // is_active
                now.clone(),
                now.clone(),
            ],
        )?;
        count += 1;
    }

    // 4. 課レベルを作成
    for (code, name_kanji, parent_code, fields) in &sections {
        let id = Uuid::new_v4().to_string();
        
        // フィールドを取得
        let company_code = fields.get(0).unwrap_or(&String::new()).clone();
        let company_name = fields.get(1).unwrap_or(&String::new()).clone();
        let division_code = fields.get(2).unwrap_or(&String::new()).clone();
        let division_name = fields.get(3).unwrap_or(&String::new()).clone();
        let department_code = fields.get(4).unwrap_or(&String::new()).clone();
        let department_name_short = fields.get(5).unwrap_or(&String::new()).clone();
        let department_indicator = fields.get(6).unwrap_or(&String::new()).clone();
        let section_name_short = fields.get(8).unwrap_or(&String::new()).clone();
        let section_name_english = fields.get(9).unwrap_or(&String::new()).clone();
        let section_indicator = fields.get(10).unwrap_or(&String::new()).clone();
        let section_indicator_short = fields.get(11).unwrap_or(&String::new()).clone();
        let sales_section_type = fields.get(12).unwrap_or(&String::new()).clone();
        let phone = fields.get(13).unwrap_or(&String::new()).clone();
        let fax = fields.get(14).unwrap_or(&String::new()).clone();
        let accounting_team_code = fields.get(15).unwrap_or(&String::new()).clone();
        let accounting_team_name = fields.get(16).unwrap_or(&String::new()).clone();
        let accounting_team_phone = fields.get(17).unwrap_or(&String::new()).clone();
        let accounting_team_fax = fields.get(18).unwrap_or(&String::new()).clone();
        let domestic_overseas_type = fields.get(19).unwrap_or(&String::new()).clone();
        let weighted_average_domestic = fields.get(20).unwrap_or(&String::new()).clone();
        let weighted_average_import = fields.get(21).unwrap_or(&String::new()).clone();
        let weighted_average_export = fields.get(22).unwrap_or(&String::new()).clone();
        let weighted_average_three_countries = fields.get(23).unwrap_or(&String::new()).clone();
        let store_code = fields.get(24).unwrap_or(&String::new()).clone();
        let overseas_office_code = fields.get(25).unwrap_or(&String::new()).clone();
        let billing_not_required = fields.get(26).unwrap_or(&String::new()).clone();
        let purchase_billing_not_required = fields.get(27).unwrap_or(&String::new()).clone();
        let account_total_display = fields.get(28).unwrap_or(&String::new()).clone();
        let consolidated_sales_section_type = fields.get(29).unwrap_or(&String::new()).clone();
        let common_log_section_code = fields.get(30).unwrap_or(&String::new()).clone();
        let report_distribution_destination_1 = fields.get(31).unwrap_or(&String::new()).clone();
        let report_distribution_destination_2 = fields.get(32).unwrap_or(&String::new()).clone();
        let is_abolished = fields.get(33).unwrap_or(&String::new()).clone();
        let valid_from_date = fields.get(34).unwrap_or(&String::new()).clone();
        let valid_to_date = fields.get(35).unwrap_or(&String::new()).clone();
        let store_name = fields.get(36).unwrap_or(&String::new()).clone();

        tx.execute(
            "INSERT OR REPLACE INTO organization_master (
                id, code, parent_code, hierarchy_level, hierarchy_type,
                name_kanji, name_kanji_short, name_english,
                company_code, company_name, division_code, division_name,
                department_code, department_name, section_code, section_name,
                department_indicator, section_indicator, section_indicator_short,
                phone, fax, accounting_team_code, accounting_team_name,
                accounting_team_phone, accounting_team_fax, sales_section_type,
                domestic_overseas_type, consolidated_sales_section_type,
                weighted_average_domestic, weighted_average_import,
                weighted_average_export, weighted_average_three_countries,
                store_code, store_name, overseas_office_code,
                common_log_section_code, report_distribution_destination_1,
                report_distribution_destination_2, billing_not_required,
                purchase_billing_not_required, account_total_display,
                is_active, valid_from_date, valid_to_date, is_abolished,
                created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29, ?30, ?31, ?32, ?33, ?34, ?35, ?36, ?37, ?38, ?39, ?40, ?41, ?42, ?43, ?44, ?45, ?46, ?47)",
            params![
                id,
                code,
                to_option(parent_code.clone()),
                4, // hierarchy_level
                "section", // hierarchy_type
                name_kanji,
                to_option(section_name_short.clone()),
                to_option(section_name_english),
                to_option(company_code),
                to_option(company_name),
                to_option(division_code),
                to_option(division_name),
                to_option(department_code),
                to_option(department_name_short),
                to_option(code.clone()),
                to_option(section_name_short),
                to_option(department_indicator),
                to_option(section_indicator),
                to_option(section_indicator_short),
                to_option(phone),
                to_option(fax),
                to_option(accounting_team_code),
                to_option(accounting_team_name),
                to_option(accounting_team_phone),
                to_option(accounting_team_fax),
                to_option(sales_section_type),
                to_option(domestic_overseas_type),
                to_option(consolidated_sales_section_type),
                to_option(weighted_average_domestic),
                to_option(weighted_average_import),
                to_option(weighted_average_export),
                to_option(weighted_average_three_countries),
                to_option(store_code),
                to_option(store_name),
                to_option(overseas_office_code),
                to_option(common_log_section_code),
                to_option(report_distribution_destination_1),
                to_option(report_distribution_destination_2),
                to_option(billing_not_required),
                to_option(purchase_billing_not_required),
                to_option(account_total_display),
                1, // is_active
                to_option(valid_from_date),
                to_option(valid_to_date),
                if is_abolished.is_empty() { 0 } else { 1 }, // is_abolished
                now.clone(),
                now.clone(),
            ],
        )?;
        count += 1;
    }

    tx.commit()?;
    Ok(count)
}

/// 組織マスターデータから階層構造を構築
pub fn build_organization_tree_from_master() -> SqlResult<Vec<OrganizationWithMembers>> {
    // ルート組織（親コードがNULL）を取得
    let root_orgs = get_organization_masters_by_parent_code(None)?;
    
    let mut result = Vec::new();
    for root_org in root_orgs {
        result.push(build_org_tree_from_master_recursive(&root_org)?);
    }
    
    Ok(result)
}

/// 組織マスターデータから階層構造を再帰的に構築
fn build_org_tree_from_master_recursive(master: &OrganizationMaster) -> SqlResult<OrganizationWithMembers> {
    // 子組織を取得
    let children_masters = get_organization_masters_by_parent_code(Some(&master.code))?;
    let mut children = Vec::new();
    
    for child_master in children_masters {
        children.push(build_org_tree_from_master_recursive(&child_master)?);
    }
    
    // OrganizationMasterをOrganizationに変換
    let org = Organization {
        id: master.id.clone(),
        parent_id: master.parent_code.clone(),
        name: master.name_kanji.clone(),
        title: master.name_english.clone(),
        description: Some(format!(
            "コード: {}, 部門: {}, 部: {}, 課: {}",
            master.code,
            master.division_name.as_deref().unwrap_or(""),
            master.department_name.as_deref().unwrap_or(""),
            master.section_name.as_deref().unwrap_or("")
        )),
        level: master.hierarchy_level,
        level_name: match master.hierarchy_level {
            1 => "会社",
            2 => "部門",
            3 => "部",
            4 => "課",
            _ => "その他",
        }.to_string(),
        position: 0,
        org_type: "organization".to_string(),
        created_at: master.created_at.clone(),
        updated_at: master.updated_at.clone(),
    };
    
    Ok(OrganizationWithMembers {
        organization: org,
        members: Vec::new(), // メンバーは別途取得
        children,
    })
}

/// CSVファイルからメンバーデータをインポート（組織マスターテーブルに紐づけ）
pub fn import_members_from_csv(csv_path: &str) -> SqlResult<usize> {
    use std::fs::File;
    use std::io::Read;
    use csv::ReaderBuilder;

    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let mut file = File::open(csv_path).map_err(|e| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_IOERR),
            Some(format!("ファイルオープンエラー: {}", e)),
        )
    })?;
    let mut contents = String::new();
    file.read_to_string(&mut contents).map_err(|e| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_IOERR),
            Some(format!("ファイル読み込みエラー: {}", e)),
        )
    })?;

    // BOMを除去（UTF-8 BOMがある場合）
    let contents = if contents.starts_with("\u{FEFF}") {
        &contents[3..]
    } else {
        &contents
    };

    let mut reader = ReaderBuilder::new()
        .has_headers(false)
        .flexible(true) // フィールド数の不一致を許容
        .from_reader(contents.as_bytes());

    let mut count = 0;
    let mut in_member_section = false;
    let tx = conn.unchecked_transaction()?;
    let now = get_timestamp();

    // 組織名からUUIDへのマッピングを事前に作成（パフォーマンス向上）
    // organization_masterテーブルから組織名→UUIDのマッピングを作成
    let mut org_name_to_uuid: HashMap<String, String> = HashMap::new();
    {
        let mut stmt = conn.prepare(
            "SELECT id, name_kanji, name_kanji_short FROM organization_master WHERE is_active = 1"
        )?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, Option<String>>(2)?))
        })?;
        for row in rows {
            let (id, name_kanji, name_kanji_short) = row?;
            org_name_to_uuid.insert(name_kanji.clone(), id.clone());
            if let Some(short) = name_kanji_short {
                org_name_to_uuid.insert(short, id.clone());
            }
        }
    }
    
    // organizationsテーブルからも組織名→UUIDのマッピングを作成（フォールバック用）
    {
        let mut stmt = conn.prepare(
            "SELECT id, name FROM organizations"
        )?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;
        for row in rows {
            let (id, name) = row?;
            // organization_masterにない場合のみ追加
            if !org_name_to_uuid.contains_key(&name) {
                org_name_to_uuid.insert(name, id);
            }
        }
    }

    for result in reader.records() {
        let record = match result {
            Ok(r) => r,
            Err(e) => {
                // CSVパースエラーは警告を出してスキップ（セクション区切り行などで発生する可能性がある）
                eprintln!("⚠️  CSVパースエラー（スキップ）: {}", e);
                continue;
            }
        };

        // セクション判定
        if let Some(first_field) = record.get(0) {
            if first_field.contains("=== メンバーデータ ===") {
                in_member_section = true;
                continue;
            }
            if first_field.contains("===") {
                in_member_section = false;
                continue;
            }
        }

        // メンバーデータセクションでない場合はスキップ
        if !in_member_section {
            continue;
        }

        // ヘッダー行をスキップ
        if let Some(first_field) = record.get(0) {
            if first_field == "ID" || first_field.is_empty() {
                continue;
            }
        }

        // メンバーデータのカラムを取得
        // ID,組織ID,組織名,メンバー名,役職,名前（ローマ字）,部署,内線番号,会社電話番号,携帯電話番号,メールアドレス,伊藤忠メールアドレス,Teams,雇用形態,ロール名,インジケーター,所在地,フロア・ドア番号,以前の名前,作成日時,更新日時
        let member_id = record.get(0).unwrap_or("").to_string();
        let _org_id_uuid = record.get(1).unwrap_or("").to_string(); // UUID（使用しない）
        let org_name = record.get(2).unwrap_or("").to_string();
        let member_name = record.get(3).unwrap_or("").to_string();
        let position = record.get(4).unwrap_or("").to_string();
        let name_romaji = record.get(5).unwrap_or("").to_string();
        let department = record.get(6).unwrap_or("").to_string();
        let extension = record.get(7).unwrap_or("").to_string();
        let company_phone = record.get(8).unwrap_or("").to_string();
        let mobile_phone = record.get(9).unwrap_or("").to_string();
        let email = record.get(10).unwrap_or("").to_string();
        let itochu_email = record.get(11).unwrap_or("").to_string();
        let teams = record.get(12).unwrap_or("").to_string();
        let employee_type = record.get(13).unwrap_or("").to_string();
        let role_name = record.get(14).unwrap_or("").to_string();
        let indicator = record.get(15).unwrap_or("").to_string();
        let location = record.get(16).unwrap_or("").to_string();
        let floor_door_no = record.get(17).unwrap_or("").to_string();
        let previous_name = record.get(18).unwrap_or("").to_string();

        // 必須フィールドのチェック
        if member_id.is_empty() || member_name.is_empty() || org_name.is_empty() {
            continue;
        }

        // 組織名からUUIDを取得（organization_masterまたはorganizationsテーブルから）
        let org_uuid = match org_name_to_uuid.get(&org_name) {
            Some(uuid) => uuid.clone(),
            None => {
                // 組織名が見つからない場合は警告を出してスキップ
                eprintln!("⚠️  組織名が見つかりません: {}", org_name);
                continue;
            }
        };

        // 空文字列をNULLに変換するヘルパー関数
        let to_option = |s: String| if s.is_empty() { None } else { Some(s) };

        // メンバーを挿入（organizationIdにUUIDを格納）
        tx.execute(
            "INSERT OR REPLACE INTO organizationMembers (
                id, organizationId, name, position, nameRomaji, department, extension,
                companyPhone, mobilePhone, email, itochuEmail, teams, employeeType,
                roleName, indicator, location, floorDoorNo, previousName, createdAt, updatedAt
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)",
            params![
                member_id,
                org_uuid, // UUIDを格納
                member_name,
                to_option(position),
                to_option(name_romaji),
                to_option(department),
                to_option(extension),
                to_option(company_phone),
                to_option(mobile_phone),
                to_option(email),
                to_option(itochu_email),
                to_option(teams),
                to_option(employee_type),
                to_option(role_name),
                to_option(indicator),
                to_option(location),
                to_option(floor_door_no),
                to_option(previous_name),
                now.clone(),
                now.clone(),
            ],
        )?;

        count += 1;
    }

    tx.commit()?;
    Ok(count)
}
