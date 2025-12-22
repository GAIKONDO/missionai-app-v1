/**
 * ChromaDB関連のTauriコマンド
 * JavaScript側からChromaDBを使用するためのAPI
 */

use crate::database::chromadb;
use serde_json::Value;
use std::collections::HashMap;

/// エンティティ埋め込みを保存
#[tauri::command]
pub async fn chromadb_save_entity_embedding(
    entityId: String,
    organizationId: String,
    combinedEmbedding: Vec<f32>,
    metadata: HashMap<String, Value>,
) -> Result<(), String> {
    chromadb::save_entity_embedding(
        entityId,
        organizationId,
        combinedEmbedding,
        metadata,
    ).await
}

/// エンティティ埋め込みを取得
#[tauri::command]
pub async fn chromadb_get_entity_embedding(
    entityId: String,
    organizationId: String,
) -> Result<Option<HashMap<String, Value>>, String> {
    chromadb::get_entity_embedding(entityId, organizationId).await
}

/// 類似エンティティを検索
#[tauri::command]
pub async fn chromadb_find_similar_entities(
    queryEmbedding: Vec<f32>,
    limit: usize,
    organizationId: Option<String>,
) -> Result<Vec<(String, f32)>, String> {
    chromadb::find_similar_entities(queryEmbedding, limit, organizationId).await
}

/// エンティティコレクションの件数を取得
#[tauri::command]
pub async fn chromadb_count_entities(
    organizationId: Option<String>,
) -> Result<usize, String> {
    chromadb::count_entities(organizationId).await
}

/// リレーション埋め込みを保存
#[tauri::command]
pub async fn chromadb_save_relation_embedding(
    relationId: String,
    organizationId: String,
    combinedEmbedding: Vec<f32>,
    metadata: HashMap<String, Value>,
) -> Result<(), String> {
    chromadb::save_relation_embedding(
        relationId,
        organizationId,
        combinedEmbedding,
        metadata,
    ).await
}

/// リレーション埋め込みを取得
#[tauri::command]
pub async fn chromadb_get_relation_embedding(
    relationId: String,
    organizationId: String,
) -> Result<Option<HashMap<String, Value>>, String> {
    chromadb::get_relation_embedding(relationId, organizationId).await
}

/// 類似リレーションを検索
#[tauri::command]
pub async fn chromadb_find_similar_relations(
    queryEmbedding: Vec<f32>,
    limit: usize,
    organizationId: Option<String>,
) -> Result<Vec<(String, f32)>, String> {
    chromadb::find_similar_relations(queryEmbedding, limit, organizationId).await
}

/// トピック埋め込みを保存
#[tauri::command]
pub async fn chromadb_save_topic_embedding(
    topicId: String,
    meetingNoteId: String,
    organizationId: String,
    combinedEmbedding: Vec<f32>,
    metadata: HashMap<String, Value>,
) -> Result<(), String> {
    chromadb::save_topic_embedding(
        topicId,
        meetingNoteId,
        organizationId,
        combinedEmbedding,
        metadata,
    ).await
}

/// トピック埋め込みを取得
#[tauri::command]
pub async fn chromadb_get_topic_embedding(
    topicId: String,
    organizationId: String,
) -> Result<Option<HashMap<String, Value>>, String> {
    chromadb::get_topic_embedding(topicId, organizationId).await
}

/// 類似トピックを検索
#[tauri::command]
pub async fn chromadb_find_similar_topics(
    queryEmbedding: Vec<f32>,
    limit: usize,
    organizationId: Option<String>,
) -> Result<Vec<chromadb::TopicSearchResult>, String> {
    chromadb::find_similar_topics(queryEmbedding, limit, organizationId).await
}

/// システム設計ドキュメント埋め込みを保存
#[tauri::command]
pub async fn chromadb_save_design_doc_embedding(
    sectionId: String,
    combinedEmbedding: Vec<f32>,
    metadata: HashMap<String, Value>,
) -> Result<(), String> {
    chromadb::save_design_doc_embedding(sectionId, combinedEmbedding, metadata).await
}

/// 類似システム設計ドキュメントを検索
#[tauri::command]
pub async fn chromadb_find_similar_design_docs(
    queryEmbedding: Vec<f32>,
    limit: usize,
    sectionId: Option<String>,
    tags: Option<Vec<String>>,
) -> Result<Vec<(String, f32)>, String> {
    chromadb::find_similar_design_docs(queryEmbedding, limit, sectionId, tags).await
}

/// システム設計ドキュメントのメタデータを取得
#[tauri::command]
pub async fn chromadb_get_design_doc_metadata(
    sectionId: String,
) -> Result<HashMap<String, Value>, String> {
    chromadb::get_design_doc_metadata(sectionId).await
}

/// システム設計ドキュメントコレクション内の全セクションIDを取得（デバッグ用）
#[tauri::command]
pub async fn chromadb_list_design_doc_section_ids() -> Result<Vec<String>, String> {
    chromadb::list_design_doc_section_ids().await
}

/// トピック埋め込みを削除
#[tauri::command]
pub async fn chromadb_delete_topic_embedding(
    topicId: String,
    organizationId: String,
) -> Result<(), String> {
    chromadb::delete_topic_embedding(topicId, organizationId).await
}

/// エンティティ埋め込みを削除
#[tauri::command]
pub async fn chromadb_delete_entity_embedding(
    entityId: String,
    organizationId: String,
) -> Result<(), String> {
    chromadb::delete_entity_embedding(entityId, organizationId).await
}

/// リレーション埋め込みを削除
#[tauri::command]
pub async fn chromadb_delete_relation_embedding(
    relationId: String,
    organizationId: String,
) -> Result<(), String> {
    chromadb::delete_relation_embedding(relationId, organizationId).await
}

/// ChromaDBのデータディレクトリをクリア（破損したデータベースを修復するため）
#[tauri::command]
pub async fn chromadb_clear_data_dir() -> Result<(), String> {
    chromadb::clear_chromadb_data_dir().await
}

/// 組織に関連するChromaDBコレクションを削除
#[tauri::command]
pub async fn chromadb_delete_organization_collections(
    organizationId: String,
) -> Result<(), String> {
    chromadb::delete_organization_collections(organizationId).await
}
