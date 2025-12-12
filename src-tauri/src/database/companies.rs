use rusqlite::{params, Result as SqlResult};
use serde::{Deserialize, Serialize};
use crate::database::{get_db, get_timestamp};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Company {
    pub id: String,
    pub code: String,
    pub name: String,
    #[serde(rename = "nameShort")]
    pub name_short: Option<String>,
    pub category: String,
    #[serde(rename = "organizationId")]
    pub organization_id: String,
    pub company: Option<String>, // 主管カンパニー
    pub division: Option<String>, // 主管部門
    pub department: Option<String>, // 主管部
    pub region: String, // 国内/海外
    pub position: i32,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

/// 事業会社を作成
pub fn create_company(
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
) -> SqlResult<Company> {
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
        "INSERT INTO companies (id, code, name, nameShort, category, organizationId, company, division, department, region, position, createdAt, updatedAt)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            id.clone(),
            code.clone(),
            name.clone(),
            name_short.clone(),
            category.clone(),
            organization_id.clone(),
            company.clone(),
            division.clone(),
            department.clone(),
            region.clone(),
            position,
            now,
            now_clone
        ],
    )?;
    
    tx.commit()?;

    Ok(Company {
        id,
        code,
        name,
        name_short,
        category,
        organization_id,
        company,
        division,
        department,
        region,
        position,
        created_at: get_timestamp(),
        updated_at: get_timestamp(),
    })
}

/// 事業会社を更新
pub fn update_company(
    id: &str,
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
) -> SqlResult<Company> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let now = get_timestamp();

    // 現在の値を取得
    let mut comp = get_company_by_id(id)?;

    if let Some(code) = code {
        comp.code = code;
    }
    if let Some(name) = name {
        comp.name = name;
    }
    if name_short.is_some() {
        comp.name_short = name_short;
    }
    if let Some(category) = category {
        comp.category = category;
    }
    if let Some(organization_id) = organization_id {
        comp.organization_id = organization_id;
    }
    if company.is_some() {
        comp.company = company;
    }
    if division.is_some() {
        comp.division = division;
    }
    if department.is_some() {
        comp.department = department;
    }
    if let Some(region) = region {
        comp.region = region;
    }
    if let Some(position) = position {
        comp.position = position;
    }
    comp.updated_at = now.clone();

    // トランザクションを開始（データベースロックを最小化）
    let tx = conn.unchecked_transaction()?;
    
    tx.execute(
        "UPDATE companies SET code = ?1, name = ?2, nameShort = ?3, category = ?4, organizationId = ?5, company = ?6, division = ?7, department = ?8, region = ?9, position = ?10, updatedAt = ?11 WHERE id = ?12",
        params![comp.code, comp.name, comp.name_short, comp.category, comp.organization_id, comp.company, comp.division, comp.department, comp.region, comp.position, now, id],
    )?;
    
    tx.commit()?;

    Ok(comp)
}

/// IDで事業会社を取得
pub fn get_company_by_id(id: &str) -> SqlResult<Company> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    conn.query_row(
        "SELECT id, code, name, nameShort, category, organizationId, company, division, department, region, position, createdAt, updatedAt
         FROM companies WHERE id = ?1",
        params![id],
        |row| {
            Ok(Company {
                id: row.get(0)?,
                code: row.get(1)?,
                name: row.get(2)?,
                name_short: row.get(3)?,
                category: row.get(4)?,
                organization_id: row.get(5)?,
                company: row.get(6)?,
                division: row.get(7)?,
                department: row.get(8)?,
                region: row.get(9)?,
                position: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            })
        },
    )
}

/// コードで事業会社を取得
pub fn get_company_by_code(code: &str) -> SqlResult<Company> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    conn.query_row(
        "SELECT id, code, name, nameShort, category, organizationId, company, division, department, region, position, createdAt, updatedAt
         FROM companies WHERE code = ?1",
        params![code],
        |row| {
            Ok(Company {
                id: row.get(0)?,
                code: row.get(1)?,
                name: row.get(2)?,
                name_short: row.get(3)?,
                category: row.get(4)?,
                organization_id: row.get(5)?,
                company: row.get(6)?,
                division: row.get(7)?,
                department: row.get(8)?,
                region: row.get(9)?,
                position: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            })
        },
    )
}

/// 組織IDで事業会社を取得
pub fn get_companies_by_organization_id(organization_id: &str) -> SqlResult<Vec<Company>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    let mut stmt = conn.prepare(
        "SELECT id, code, name, nameShort, category, organizationId, company, division, department, region, position, createdAt, updatedAt
         FROM companies WHERE organizationId = ?1 ORDER BY position ASC, code ASC",
    )?;

    let companies = stmt.query_map(params![organization_id], |row| {
        Ok(Company {
            id: row.get(0)?,
            code: row.get(1)?,
            name: row.get(2)?,
            name_short: row.get(3)?,
            category: row.get(4)?,
            organization_id: row.get(5)?,
            company: row.get(6)?,
            division: row.get(7)?,
            department: row.get(8)?,
            region: row.get(9)?,
            position: row.get(10)?,
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
        })
    })?;

    companies.collect::<Result<Vec<_>, _>>()
}

/// すべての事業会社を取得
pub fn get_all_companies() -> SqlResult<Vec<Company>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    let mut stmt = conn.prepare(
        "SELECT id, code, name, nameShort, category, organizationId, company, division, department, region, position, createdAt, updatedAt
         FROM companies ORDER BY organizationId ASC, position ASC, code ASC",
    )?;

    let companies = stmt.query_map([], |row| {
        Ok(Company {
            id: row.get(0)?,
            code: row.get(1)?,
            name: row.get(2)?,
            name_short: row.get(3)?,
            category: row.get(4)?,
            organization_id: row.get(5)?,
            company: row.get(6)?,
            division: row.get(7)?,
            department: row.get(8)?,
            region: row.get(9)?,
            position: row.get(10)?,
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
        })
    })?;

    companies.collect::<Result<Vec<_>, _>>()
}

/// 事業会社を削除
pub fn delete_company(id: &str) -> SqlResult<()> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    
    // トランザクションを開始（データベースロックを最小化）
    let tx = conn.unchecked_transaction()?;
    
    tx.execute("DELETE FROM companies WHERE id = ?1", params![id])?;
    
    tx.commit()?;

    Ok(())
}

/// CSVフィールドをエスケープ
fn escape_csv_field(field: &str) -> String {
    if field.contains(',') || field.contains('"') || field.contains('\n') {
        format!("\"{}\"", field.replace("\"", "\"\""))
    } else {
        field.to_string()
    }
}

/// 事業会社をCSV形式でエクスポート
pub fn export_companies_to_csv() -> SqlResult<String> {
    let companies = get_all_companies()?;
    
    // 組織名のマップを作成（事業会社のCSVに組織名を含めるため）
    use crate::database::get_all_organizations;
    let organizations = get_all_organizations()?;
    let org_map: std::collections::HashMap<String, String> = organizations
        .iter()
        .map(|org| (org.id.clone(), org.name.clone()))
        .collect();
    
    let mut csv_lines = Vec::new();
    
    // BOMを追加（Excelで正しく表示されるように）
    csv_lines.push("\u{FEFF}".to_string());
    
    // === 事業会社データ ===
    csv_lines.push("=== 事業会社データ ===".to_string());
    csv_lines.push("ID,コード,会社名,略称,カテゴリ,組織ID,組織名,主管カンパニー,主管部門,主管部,地域,表示順序,作成日時,更新日時".to_string());
    
    for company in &companies {
        let org_name = org_map.get(&company.organization_id).cloned().unwrap_or_default();
        let line = format!(
            "{},{},{},{},{},{},{},{},{},{},{},{},{},{}",
            escape_csv_field(&company.id),
            escape_csv_field(&company.code),
            escape_csv_field(&company.name),
            company.name_short.as_ref().map(|s| escape_csv_field(s)).unwrap_or_default(),
            escape_csv_field(&company.category),
            escape_csv_field(&company.organization_id),
            escape_csv_field(&org_name),
            company.company.as_ref().map(|s| escape_csv_field(s)).unwrap_or_default(),
            company.division.as_ref().map(|s| escape_csv_field(s)).unwrap_or_default(),
            company.department.as_ref().map(|s| escape_csv_field(s)).unwrap_or_default(),
            escape_csv_field(&company.region),
            company.position,
            escape_csv_field(&company.created_at),
            escape_csv_field(&company.updated_at)
        );
        csv_lines.push(line);
    }
    
    Ok(csv_lines.join("\n"))
}
