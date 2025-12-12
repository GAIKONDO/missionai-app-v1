/**
 * システム設計ドキュメントセクション関連のTauriコマンド
 * JavaScript側からセクションを管理するためのAPI
 */

use crate::database::{
    create_design_doc_section, update_design_doc_section, get_design_doc_section_by_id,
    get_all_design_doc_sections, get_all_design_doc_sections_lightweight, delete_design_doc_section,
    create_design_doc_section_relation, update_design_doc_section_relation,
    get_design_doc_section_relation_by_id, get_design_doc_section_relations_by_section_id,
    get_all_design_doc_section_relations, delete_design_doc_section_relation,
};

/// セクションを作成
#[tauri::command]
pub fn create_design_doc_section_cmd(
    title: String,
    description: Option<String>,
    content: String,
    tags: Option<Vec<String>>,
    order: Option<i32>,
    page_url: Option<String>,
    hierarchy: Option<Vec<String>>,
    related_sections: Option<Vec<String>>,
    semantic_category: Option<String>,
    keywords: Option<Vec<String>>,
    summary: Option<String>,
) -> Result<serde_json::Value, String> {
    match create_design_doc_section(
        title,
        description,
        content,
        tags,
        order,
        page_url,
        hierarchy,
        related_sections,
        semantic_category,
        keywords,
        summary,
    ) {
        Ok(section) => Ok(serde_json::to_value(section).unwrap()),
        Err(e) => Err(format!("セクションの作成に失敗しました: {}", e)),
    }
}

/// セクションを更新
#[tauri::command]
pub fn update_design_doc_section_cmd(
    id: String,
    title: Option<String>,
    description: Option<String>,
    content: Option<String>,
    tags: Option<Vec<String>>,
    order: Option<i32>,
    page_url: Option<String>,
    hierarchy: Option<Vec<String>>,
    related_sections: Option<Vec<String>>,
    semantic_category: Option<String>,
    keywords: Option<Vec<String>>,
    summary: Option<String>,
) -> Result<serde_json::Value, String> {
    match update_design_doc_section(
        &id,
        title,
        description,
        content,
        tags,
        order,
        page_url,
        hierarchy,
        related_sections,
        semantic_category,
        keywords,
        summary,
    ) {
        Ok(section) => Ok(serde_json::to_value(section).unwrap()),
        Err(e) => Err(format!("セクションの更新に失敗しました: {}", e)),
    }
}

/// IDでセクションを取得
#[tauri::command]
pub fn get_design_doc_section_cmd(id: String) -> Result<serde_json::Value, String> {
    match get_design_doc_section_by_id(&id) {
        Ok(section) => Ok(serde_json::to_value(section).unwrap()),
        Err(e) => Err(format!("セクションの取得に失敗しました: {}", e)),
    }
}

/// すべてのセクションを取得
#[tauri::command]
pub fn get_all_design_doc_sections_cmd() -> Result<Vec<serde_json::Value>, String> {
    match get_all_design_doc_sections() {
        Ok(sections) => Ok(sections.into_iter().map(|s| serde_json::to_value(s).unwrap()).collect()),
        Err(e) => Err(format!("セクション一覧の取得に失敗しました: {}", e)),
    }
}

/// すべてのセクションを取得（contentを除外した軽量版）
#[tauri::command]
pub fn get_all_design_doc_sections_lightweight_cmd() -> Result<Vec<serde_json::Value>, String> {
    match get_all_design_doc_sections_lightweight() {
        Ok(sections) => Ok(sections.into_iter().map(|s| serde_json::to_value(s).unwrap()).collect()),
        Err(e) => Err(format!("セクション一覧の取得に失敗しました: {}", e)),
    }
}

/// セクションを削除
#[tauri::command]
pub fn delete_design_doc_section_cmd(id: String) -> Result<(), String> {
    match delete_design_doc_section(&id) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("セクションの削除に失敗しました: {}", e)),
    }
}

/// セクション関係を作成
#[tauri::command]
pub fn create_design_doc_section_relation_cmd(
    source_section_id: String,
    target_section_id: String,
    relation_type: String,
    description: Option<String>,
) -> Result<serde_json::Value, String> {
    match create_design_doc_section_relation(
        source_section_id,
        target_section_id,
        relation_type,
        description,
    ) {
        Ok(relation) => Ok(serde_json::to_value(relation).unwrap()),
        Err(e) => Err(format!("セクション関係の作成に失敗しました: {}", e)),
    }
}

/// セクション関係を更新
#[tauri::command]
pub fn update_design_doc_section_relation_cmd(
    id: String,
    relation_type: Option<String>,
    description: Option<String>,
) -> Result<serde_json::Value, String> {
    match update_design_doc_section_relation(&id, relation_type, description) {
        Ok(relation) => Ok(serde_json::to_value(relation).unwrap()),
        Err(e) => Err(format!("セクション関係の更新に失敗しました: {}", e)),
    }
}

/// IDでセクション関係を取得
#[tauri::command]
pub fn get_design_doc_section_relation_cmd(id: String) -> Result<serde_json::Value, String> {
    match get_design_doc_section_relation_by_id(&id) {
        Ok(relation) => Ok(serde_json::to_value(relation).unwrap()),
        Err(e) => Err(format!("セクション関係の取得に失敗しました: {}", e)),
    }
}

/// セクションIDでセクション関係を取得
#[tauri::command]
pub fn get_design_doc_section_relations_by_section_cmd(section_id: String) -> Result<Vec<serde_json::Value>, String> {
    match get_design_doc_section_relations_by_section_id(&section_id) {
        Ok(relations) => Ok(relations.into_iter().map(|r| serde_json::to_value(r).unwrap()).collect()),
        Err(e) => Err(format!("セクション関係一覧の取得に失敗しました: {}", e)),
    }
}

/// すべてのセクション関係を取得
#[tauri::command]
pub fn get_all_design_doc_section_relations_cmd() -> Result<Vec<serde_json::Value>, String> {
    match get_all_design_doc_section_relations() {
        Ok(relations) => Ok(relations.into_iter().map(|r| serde_json::to_value(r).unwrap()).collect()),
        Err(e) => Err(format!("セクション関係一覧の取得に失敗しました: {}", e)),
    }
}

/// セクション関係を削除
#[tauri::command]
pub fn delete_design_doc_section_relation_cmd(id: String) -> Result<(), String> {
    match delete_design_doc_section_relation(&id) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("セクション関係の削除に失敗しました: {}", e)),
    }
}
