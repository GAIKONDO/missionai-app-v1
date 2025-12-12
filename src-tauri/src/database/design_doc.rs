/**
 * システム設計ドキュメントセクション管理モジュール
 * SQLiteにセクション情報を保存・管理
 */

use rusqlite::{params, Result as SqlResult};
use serde::{Deserialize, Serialize};
use crate::database::{get_db, get_timestamp};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DesignDocSection {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub content: String,
    #[serde(rename = "tags")]
    pub tags: Option<String>, // JSON配列文字列
    #[serde(rename = "order")]
    pub order_index: i32,
    #[serde(rename = "pageUrl")]
    pub page_url: String,
    pub hierarchy: Option<String>, // JSON配列文字列
    #[serde(rename = "relatedSections")]
    pub related_sections: Option<String>, // JSON配列文字列
    #[serde(rename = "semanticCategory")]
    pub semantic_category: Option<String>,
    pub keywords: Option<String>, // JSON配列文字列
    pub summary: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

/// セクションを作成
pub fn create_design_doc_section(
    title: String,
    description: Option<String>,
    content: String,
    tags: Option<Vec<String>>,
    order_index: Option<i32>,
    page_url: Option<String>,
    hierarchy: Option<Vec<String>>,
    related_sections: Option<Vec<String>>,
    semantic_category: Option<String>,
    keywords: Option<Vec<String>>,
    summary: Option<String>,
) -> SqlResult<DesignDocSection> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let id = format!("section_{}", Uuid::new_v4().to_string().replace("-", ""));
    let now = get_timestamp();
    let now_clone = now.clone();

    let tags_json = tags.as_ref().map(|t| serde_json::to_string(t).unwrap_or_default());
    let hierarchy_json = hierarchy.as_ref().map(|h| serde_json::to_string(h).unwrap_or_default());
    let related_sections_json = related_sections.as_ref().map(|r| serde_json::to_string(r).unwrap_or_default());
    let keywords_json = keywords.as_ref().map(|k| serde_json::to_string(k).unwrap_or_default());
    let page_url_value = page_url.unwrap_or_else(|| "/design".to_string());

    conn.execute(
        "INSERT INTO designDocSections (
            id, title, description, content, tags, order_index, pageUrl,
            hierarchy, relatedSections, semanticCategory, keywords, summary,
            createdAt, updatedAt
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![
            id.clone(),
            title.clone(),
            description.clone(),
            content.clone(),
            tags_json.clone(),
            order_index.unwrap_or(0),
            page_url_value.clone(),
            hierarchy_json.clone(),
            related_sections_json.clone(),
            semantic_category.clone(),
            keywords_json.clone(),
            summary.clone(),
            now,
            now_clone
        ],
    )?;

    Ok(DesignDocSection {
        id,
        title,
        description,
        content,
        tags: tags_json,
        order_index: order_index.unwrap_or(0),
        page_url: page_url_value,
        hierarchy: hierarchy_json,
        related_sections: related_sections_json,
        semantic_category,
        keywords: keywords_json,
        summary,
        created_at: get_timestamp(),
        updated_at: get_timestamp(),
    })
}

/// セクションを更新
pub fn update_design_doc_section(
    id: &str,
    title: Option<String>,
    description: Option<String>,
    content: Option<String>,
    tags: Option<Vec<String>>,
    order_index: Option<i32>,
    page_url: Option<String>,
    hierarchy: Option<Vec<String>>,
    related_sections: Option<Vec<String>>,
    semantic_category: Option<String>,
    keywords: Option<Vec<String>>,
    summary: Option<String>,
) -> SqlResult<DesignDocSection> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let now = get_timestamp();

    // 現在の値を取得（デッドロックを防ぐため、直接クエリを実行）
    let mut section = conn.query_row(
        "SELECT id, title, description, content, tags, order_index, pageUrl,
                hierarchy, relatedSections, semanticCategory, keywords, summary,
                createdAt, updatedAt
         FROM designDocSections
         WHERE id = ?1",
        params![id],
        |row| {
            Ok(DesignDocSection {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                content: row.get(3)?,
                tags: row.get(4)?,
                order_index: row.get(5)?,
                page_url: row.get(6)?,
                hierarchy: row.get(7)?,
                related_sections: row.get(8)?,
                semantic_category: row.get(9)?,
                keywords: row.get(10)?,
                summary: row.get(11)?,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
            })
        },
    )?;

    // 更新
    if let Some(title) = title {
        section.title = title;
    }
    if let Some(description) = description {
        section.description = Some(description);
    }
    if let Some(content) = content {
        section.content = content;
    }
    if let Some(tags) = tags {
        section.tags = Some(serde_json::to_string(&tags).unwrap_or_default());
    }
    if let Some(order_index) = order_index {
        section.order_index = order_index;
    }
    if let Some(page_url) = page_url {
        section.page_url = page_url;
    }
    if let Some(hierarchy) = hierarchy {
        section.hierarchy = Some(serde_json::to_string(&hierarchy).unwrap_or_default());
    }
    if let Some(related_sections) = related_sections {
        section.related_sections = Some(serde_json::to_string(&related_sections).unwrap_or_default());
    }
    if let Some(semantic_category) = semantic_category {
        section.semantic_category = Some(semantic_category);
    }
    if let Some(keywords) = keywords {
        section.keywords = Some(serde_json::to_string(&keywords).unwrap_or_default());
    }
    if let Some(summary) = summary {
        section.summary = Some(summary);
    }
    section.updated_at = now.clone();

    // データベースを更新
    let tags_json = section.tags.clone();
    let hierarchy_json = section.hierarchy.clone();
    let related_sections_json = section.related_sections.clone();
    let keywords_json = section.keywords.clone();

    conn.execute(
        "UPDATE designDocSections SET
            title = ?2,
            description = ?3,
            content = ?4,
            tags = ?5,
            order_index = ?6,
            pageUrl = ?7,
            hierarchy = ?8,
            relatedSections = ?9,
            semanticCategory = ?10,
            keywords = ?11,
            summary = ?12,
            updatedAt = ?13
        WHERE id = ?1",
        params![
            id,
            section.title.clone(),
            section.description.clone(),
            section.content.clone(),
            tags_json.clone(),
            section.order_index,
            section.page_url.clone(),
            hierarchy_json.clone(),
            related_sections_json.clone(),
            section.semantic_category.clone(),
            keywords_json.clone(),
            section.summary.clone(),
            now
        ],
    )?;

    Ok(section)
}

/// IDでセクションを取得
pub fn get_design_doc_section_by_id(id: &str) -> SqlResult<DesignDocSection> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    conn.query_row(
        "SELECT id, title, description, content, tags, order_index, pageUrl,
                hierarchy, relatedSections, semanticCategory, keywords, summary,
                createdAt, updatedAt
         FROM designDocSections
         WHERE id = ?1",
        params![id],
        |row| {
            Ok(DesignDocSection {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                content: row.get(3)?,
                tags: row.get(4)?,
                order_index: row.get(5)?,
                page_url: row.get(6)?,
                hierarchy: row.get(7)?,
                related_sections: row.get(8)?,
                semantic_category: row.get(9)?,
                keywords: row.get(10)?,
                summary: row.get(11)?,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
            })
        },
    )
}

/// すべてのセクションを取得（order_indexでソート）
pub fn get_all_design_doc_sections() -> SqlResult<Vec<DesignDocSection>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let mut stmt = conn.prepare(
        "SELECT id, title, description, content, tags, order_index, pageUrl,
                hierarchy, relatedSections, semanticCategory, keywords, summary,
                createdAt, updatedAt
         FROM designDocSections
         ORDER BY order_index ASC, createdAt ASC"
    )?;

    let sections = stmt.query_map([], |row| {
        Ok(DesignDocSection {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            content: row.get(3)?,
            tags: row.get(4)?,
            order_index: row.get(5)?,
            page_url: row.get(6)?,
            hierarchy: row.get(7)?,
            related_sections: row.get(8)?,
            semantic_category: row.get(9)?,
            keywords: row.get(10)?,
            summary: row.get(11)?,
            created_at: row.get(12)?,
            updated_at: row.get(13)?,
        })
    })?;

    let mut result = Vec::new();
    for section in sections {
        result.push(section?);
    }
    Ok(result)
}

/// すべてのセクションを取得（contentを除外した軽量版、order_indexでソート）
pub fn get_all_design_doc_sections_lightweight() -> SqlResult<Vec<DesignDocSection>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let mut stmt = conn.prepare(
        "SELECT id, title, description, tags, order_index, pageUrl,
                hierarchy, relatedSections, semanticCategory, keywords, summary,
                createdAt, updatedAt
         FROM designDocSections
         ORDER BY order_index ASC, createdAt ASC"
    )?;

    let sections = stmt.query_map([], |row| {
        Ok(DesignDocSection {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            content: String::new(), // contentは空文字列（一覧表示では不要）
            tags: row.get(3)?,
            order_index: row.get(4)?,
            page_url: row.get(5)?,
            hierarchy: row.get(6)?,
            related_sections: row.get(7)?,
            semantic_category: row.get(8)?,
            keywords: row.get(9)?,
            summary: row.get(10)?,
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
        })
    })?;

    let mut result = Vec::new();
    for section in sections {
        result.push(section?);
    }
    Ok(result)
}

/// セクションを削除
pub fn delete_design_doc_section(id: &str) -> SqlResult<()> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    conn.execute(
        "DELETE FROM designDocSections WHERE id = ?1",
        params![id],
    )?;

    Ok(())
}

/// セクション関係の型定義
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DesignDocSectionRelation {
    pub id: String,
    #[serde(rename = "sourceSectionId")]
    pub source_section_id: String,
    #[serde(rename = "targetSectionId")]
    pub target_section_id: String,
    #[serde(rename = "relationType")]
    pub relation_type: String,
    pub description: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

/// セクション関係を作成
pub fn create_design_doc_section_relation(
    source_section_id: String,
    target_section_id: String,
    relation_type: String,
    description: Option<String>,
) -> SqlResult<DesignDocSectionRelation> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let id = format!("relation_{}", Uuid::new_v4().to_string().replace("-", ""));
    let now = get_timestamp();
    let now_clone = now.clone();

    conn.execute(
        "INSERT INTO designDocSectionRelations (
            id, sourceSectionId, targetSectionId, relationType, description,
            createdAt, updatedAt
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            id.clone(),
            source_section_id.clone(),
            target_section_id.clone(),
            relation_type.clone(),
            description.clone(),
            now,
            now_clone
        ],
    )?;

    Ok(DesignDocSectionRelation {
        id,
        source_section_id,
        target_section_id,
        relation_type,
        description,
        created_at: get_timestamp(),
        updated_at: get_timestamp(),
    })
}

/// セクション関係を更新
pub fn update_design_doc_section_relation(
    id: &str,
    relation_type: Option<String>,
    description: Option<String>,
) -> SqlResult<DesignDocSectionRelation> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let now = get_timestamp();

    // 現在の値を取得
    let mut relation = get_design_doc_section_relation_by_id(id)?;

    // 更新
    if let Some(relation_type) = relation_type {
        relation.relation_type = relation_type;
    }
    if let Some(description) = description {
        relation.description = Some(description);
    }
    relation.updated_at = now.clone();

    // データベースを更新
    conn.execute(
        "UPDATE designDocSectionRelations SET
            relationType = ?2,
            description = ?3,
            updatedAt = ?4
        WHERE id = ?1",
        params![
            id,
            relation.relation_type.clone(),
            relation.description.clone(),
            now
        ],
    )?;

    Ok(relation)
}

/// IDでセクション関係を取得
pub fn get_design_doc_section_relation_by_id(id: &str) -> SqlResult<DesignDocSectionRelation> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    conn.query_row(
        "SELECT id, sourceSectionId, targetSectionId, relationType, description,
                createdAt, updatedAt
         FROM designDocSectionRelations
         WHERE id = ?1",
        params![id],
        |row| {
            Ok(DesignDocSectionRelation {
                id: row.get(0)?,
                source_section_id: row.get(1)?,
                target_section_id: row.get(2)?,
                relation_type: row.get(3)?,
                description: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        },
    )
}

/// セクションIDでセクション関係を取得（ソースまたはターゲット）
pub fn get_design_doc_section_relations_by_section_id(section_id: &str) -> SqlResult<Vec<DesignDocSectionRelation>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let mut stmt = conn.prepare(
        "SELECT id, sourceSectionId, targetSectionId, relationType, description,
                createdAt, updatedAt
         FROM designDocSectionRelations
         WHERE sourceSectionId = ?1 OR targetSectionId = ?1
         ORDER BY createdAt ASC"
    )?;

    let relations = stmt.query_map(params![section_id], |row| {
        Ok(DesignDocSectionRelation {
            id: row.get(0)?,
            source_section_id: row.get(1)?,
            target_section_id: row.get(2)?,
            relation_type: row.get(3)?,
            description: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    })?;

    let mut result = Vec::new();
    for relation in relations {
        result.push(relation?);
    }
    Ok(result)
}

/// すべてのセクション関係を取得
pub fn get_all_design_doc_section_relations() -> SqlResult<Vec<DesignDocSectionRelation>> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let mut stmt = conn.prepare(
        "SELECT id, sourceSectionId, targetSectionId, relationType, description,
                createdAt, updatedAt
         FROM designDocSectionRelations
         ORDER BY createdAt ASC"
    )?;

    let relations = stmt.query_map([], |row| {
        Ok(DesignDocSectionRelation {
            id: row.get(0)?,
            source_section_id: row.get(1)?,
            target_section_id: row.get(2)?,
            relation_type: row.get(3)?,
            description: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    })?;

    let mut result = Vec::new();
    for relation in relations {
        result.push(relation?);
    }
    Ok(result)
}

/// セクション関係を削除
pub fn delete_design_doc_section_relation(id: &str) -> SqlResult<()> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;

    conn.execute(
        "DELETE FROM designDocSectionRelations WHERE id = ?1",
        params![id],
    )?;

    Ok(())
}
