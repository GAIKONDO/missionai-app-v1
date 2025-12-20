use rusqlite::{params, Result as SqlResult};
use serde::{Deserialize, Serialize};
use crate::database::{get_db, get_timestamp};
use uuid::Uuid;
use std::collections::HashMap;

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

/// 削除対象の子組織（再帰的）とメンバーを取得
pub fn get_deletion_targets(organization_id: &str) -> SqlResult<(Vec<Organization>, Vec<OrganizationMember>)> {
    let mut child_orgs = Vec::new();
    let mut all_members = Vec::new();
    
    // 再帰的に子組織を取得
    fn collect_children_recursive(
        parent_id: &str,
        child_orgs: &mut Vec<Organization>,
        all_members: &mut Vec<OrganizationMember>,
    ) -> SqlResult<()> {
        // 直接の子組織を取得
        let children = get_organizations_by_parent_id(Some(parent_id))?;
        
        for child in children {
            // 子組織をリストに追加
            child_orgs.push(child.clone());
            
            // 子組織のメンバーを取得
            let members = get_members_by_organization_id(&child.id)?;
            all_members.extend(members);
            
            // さらに子組織を再帰的に取得
            collect_children_recursive(&child.id, child_orgs, all_members)?;
        }
        
        Ok(())
    }
    
    // 指定された組織の直接の子組織から開始
    collect_children_recursive(organization_id, &mut child_orgs, &mut all_members)?;
    
    // 指定された組織自体のメンバーも取得
    let org_members = get_members_by_organization_id(organization_id)?;
    all_members.extend(org_members);
    
    Ok((child_orgs, all_members))
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
    
    // 外部キー制約を一時的に無効化（古い外部キー制約が残っている可能性があるため）
    conn.execute("PRAGMA foreign_keys = OFF", [])?;
    
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
    
    // 事業会社コンテンツを削除（companyIdがこの組織のIDと一致する場合）
    // 注意: companyContentsテーブルのcompanyIdは、organizationsテーブルのidを参照します
    let deleted_company_contents = tx.execute("DELETE FROM companyContents WHERE companyId = ?1", params![id])?;
    println!("✅ [delete_organization] 事業会社コンテンツ削除: {}件", deleted_company_contents);
    
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
    
    // 注意: companiesテーブルは削除されました（organizationsテーブルに統合済み）
    // 事業会社はorganizationsテーブルでtype='company'として管理されるため、削除処理は不要
    
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
    
    // 外部キー制約を再度有効化
    conn.execute("PRAGMA foreign_keys = ON", [])?;
    
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
/// CSVファイルからメンバーデータをインポート
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
    let mut org_name_to_uuid: HashMap<String, String> = HashMap::new();
    {
        let mut stmt = conn.prepare(
            "SELECT id, name FROM organizations"
        )?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;
        for row in rows {
            let (id, name) = row?;
            org_name_to_uuid.insert(name, id);
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

        // 組織名からUUIDを取得（organizationsテーブルから）
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
