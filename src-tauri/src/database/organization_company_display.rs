use crate::database::{get_db, SqlResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizationCompanyDisplay {
    pub id: String,
    #[serde(rename = "organizationId")]
    pub organization_id: String,
    #[serde(rename = "companyId")]
    pub company_id: String,
    #[serde(rename = "displayOrder")]
    pub display_order: i32,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

/// 組織と事業会社の表示関係を作成
pub fn create_organization_company_display(
    organization_id: &str,
    company_id: &str,
    display_order: Option<i32>,
) -> SqlResult<OrganizationCompanyDisplay> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    
    let id = uuid::Uuid::new_v4().to_string();
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
        .to_string();
    let display_order = display_order.unwrap_or(0);

    conn.execute(
        "INSERT INTO organizationCompanyDisplay (id, organizationId, companyId, displayOrder, createdAt, updatedAt)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, organization_id, company_id, display_order, now, now],
    )?;

    Ok(OrganizationCompanyDisplay {
        id,
        organization_id: organization_id.to_string(),
        company_id: company_id.to_string(),
        display_order,
        created_at: now.clone(),
        updated_at: now,
    })
}

/// 組織IDで表示される事業会社のリストを取得
pub fn get_companies_by_organization_display(organization_id: &str) -> SqlResult<Vec<OrganizationCompanyDisplay>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    let mut stmt = conn.prepare(
        "SELECT id, organizationId, companyId, displayOrder, createdAt, updatedAt
         FROM organizationCompanyDisplay
         WHERE organizationId = ?1
         ORDER BY displayOrder ASC, createdAt ASC",
    )?;

    let displays = stmt.query_map(params![organization_id], |row| {
        Ok(OrganizationCompanyDisplay {
            id: row.get(0)?,
            organization_id: row.get(1)?,
            company_id: row.get(2)?,
            display_order: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    })?;

    displays.collect::<Result<Vec<_>, _>>()
}

/// 事業会社IDで表示される組織のリストを取得
pub fn get_organizations_by_company_display(company_id: &str) -> SqlResult<Vec<OrganizationCompanyDisplay>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    let mut stmt = conn.prepare(
        "SELECT id, organizationId, companyId, displayOrder, createdAt, updatedAt
         FROM organizationCompanyDisplay
         WHERE companyId = ?1
         ORDER BY displayOrder ASC, createdAt ASC",
    )?;

    let displays = stmt.query_map(params![company_id], |row| {
        Ok(OrganizationCompanyDisplay {
            id: row.get(0)?,
            organization_id: row.get(1)?,
            company_id: row.get(2)?,
            display_order: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    })?;

    displays.collect::<Result<Vec<_>, _>>()
}

/// すべての表示関係を取得
pub fn get_all_organization_company_displays() -> SqlResult<Vec<OrganizationCompanyDisplay>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    let mut stmt = conn.prepare(
        "SELECT id, organizationId, companyId, displayOrder, createdAt, updatedAt
         FROM organizationCompanyDisplay
         ORDER BY organizationId ASC, displayOrder ASC, createdAt ASC",
    )?;

    let displays = stmt.query_map([], |row| {
        Ok(OrganizationCompanyDisplay {
            id: row.get(0)?,
            organization_id: row.get(1)?,
            company_id: row.get(2)?,
            display_order: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    })?;

    displays.collect::<Result<Vec<_>, _>>()
}

/// 表示順序を更新
pub fn update_organization_company_display_order(
    id: &str,
    display_order: i32,
) -> SqlResult<()> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
        .to_string();

    conn.execute(
        "UPDATE organizationCompanyDisplay SET displayOrder = ?1, updatedAt = ?2 WHERE id = ?3",
        params![display_order, now, id],
    )?;

    Ok(())
}

/// 組織と事業会社の表示関係を削除
pub fn delete_organization_company_display(id: &str) -> SqlResult<()> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    conn.execute(
        "DELETE FROM organizationCompanyDisplay WHERE id = ?1",
        params![id],
    )?;

    Ok(())
}

/// 組織IDと事業会社IDで表示関係を削除
pub fn delete_organization_company_display_by_ids(
    organization_id: &str,
    company_id: &str,
) -> SqlResult<()> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    conn.execute(
        "DELETE FROM organizationCompanyDisplay WHERE organizationId = ?1 AND companyId = ?2",
        params![organization_id, company_id],
    )?;

    Ok(())
}

/// 組織IDで全ての表示関係を削除
pub fn delete_all_organization_company_displays_by_organization(organization_id: &str) -> SqlResult<()> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    conn.execute(
        "DELETE FROM organizationCompanyDisplay WHERE organizationId = ?1",
        params![organization_id],
    )?;

    Ok(())
}

/// 事業会社IDで全ての表示関係を削除
pub fn delete_all_organization_company_displays_by_company(company_id: &str) -> SqlResult<()> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    conn.execute(
        "DELETE FROM organizationCompanyDisplay WHERE companyId = ?1",
        params![company_id],
    )?;

    Ok(())
}
