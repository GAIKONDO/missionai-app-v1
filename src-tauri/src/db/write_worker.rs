/**
 * 書き込み専用ワーカー
 * すべてのデータベース書き込み操作を1本の通路に集約
 */

use async_channel::Receiver;
use crate::database::pool::DatabasePool;
use crate::db::write_job::WriteJob;
use anyhow::{Context, Result};
use rusqlite::params;
use std::collections::HashMap;
use serde_json::Value;

pub struct WriteWorker {
    pool: DatabasePool,
}

impl WriteWorker {
    pub fn new(pool: DatabasePool) -> Self {
        Self { pool }
    }

    pub async fn run(&self, rx: Receiver<WriteJob>) {
        eprintln!("[DB-WRITER] 書き込みワーカーを起動しました");
        
        while let Ok(job) = rx.recv().await {
            if let Err(e) = self.handle_job(&job).await {
                eprintln!("[DB-WRITER] ジョブ処理エラー: {e:#}");
                eprintln!("[DB-WRITER] 失敗したジョブ: {:?}", job);
                // TODO: エラーログ・監視への通知
            }
        }
        
        eprintln!("[DB-WRITER] 書き込みワーカーを停止しました");
    }

    async fn handle_job(&self, job: &WriteJob) -> Result<()> {
        let conn = self.pool.get_connection()
            .context("Failed to get database connection")?;

        match job {
            WriteJob::UpsertEntity { entity_id, organization_id, payload } => {
                self.upsert_entity(&conn, entity_id, organization_id, payload)?;
            }
            
            WriteJob::DeleteEntities { entity_ids, organization_id } => {
                self.delete_entities(&conn, entity_ids, organization_id)?;
            }
            
            WriteJob::UpsertRelation { relation_id, organization_id, payload } => {
                self.upsert_relation(&conn, relation_id, organization_id, payload)?;
            }
            
            WriteJob::DeleteRelations { relation_ids, organization_id } => {
                self.delete_relations(&conn, relation_ids, organization_id)?;
            }
            
            WriteJob::UpsertTopic { topic_id, meeting_note_id, organization_id, payload } => {
                self.upsert_topic(&conn, topic_id, meeting_note_id, organization_id, payload)?;
            }
            
            WriteJob::DeleteTopics { topic_ids, organization_id } => {
                self.delete_topics(&conn, topic_ids, organization_id)?;
            }
            
            WriteJob::UpsertOrganization { organization_id, payload } => {
                self.upsert_organization(&conn, organization_id, payload)?;
            }
            
            WriteJob::DeleteOrganization { organization_id } => {
                self.delete_organization(&conn, organization_id)?;
            }
            
            WriteJob::DeleteMeetingNote { meeting_note_id, organization_id } => {
                self.delete_meeting_note(&conn, meeting_note_id, organization_id)?;
            }
            
            WriteJob::UpdateChromaSyncStatus { entity_type, entity_id, synced, error } => {
                self.update_chroma_sync_status(&conn, &entity_type, &entity_id, *synced, error.as_deref())?;
            }
        }
        
        Ok(())
    }

    fn upsert_entity(
        &self,
        conn: &rusqlite::Connection,
        entity_id: &str,
        organization_id: &str,
        payload: &HashMap<String, Value>,
    ) -> Result<()> {
        let tx = conn.unchecked_transaction()?;
        
        let name = payload.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let entity_type = payload.get("type").and_then(|v| v.as_str()).unwrap_or("");
        let aliases_json = payload.get("aliases")
            .and_then(|v| serde_json::to_string(v).ok())
            .unwrap_or_else(|| "[]".to_string());
        let metadata_json = payload.get("metadata")
            .and_then(|v| serde_json::to_string(v).ok())
            .unwrap_or_else(|| "{}".to_string());
        
        // companyIdを取得（事業会社の議事録の場合）
        let company_id = payload.get("companyId").and_then(|v| v.as_str());
        
        // organizationIdとcompanyIdのどちらか一方が設定されていることを確認
        let org_id = if company_id.is_some() { None } else { Some(organization_id) };
        
        // entitiesテーブルに挿入/更新（ChromaDB同期状態を0に設定）
        tx.execute(
            r#"INSERT INTO entities (id, name, type, aliases, metadata, organizationId, companyId, chromaSynced, createdAt, updatedAt)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, datetime('now'), datetime('now'))
               ON CONFLICT(id) DO UPDATE SET
                   name = excluded.name,
                   type = excluded.type,
                   aliases = excluded.aliases,
                   metadata = excluded.metadata,
                   organizationId = excluded.organizationId,
                   companyId = excluded.companyId,
                   chromaSynced = 0,
                   updatedAt = datetime('now')"#,
            params![entity_id, name, entity_type, aliases_json, metadata_json, org_id, company_id],
        )?;

        tx.commit()?;
        Ok(())
    }

    fn delete_entities(
        &self,
        conn: &rusqlite::Connection,
        entity_ids: &[String],
        organization_id: &str,
    ) -> Result<()> {
        let tx = conn.unchecked_transaction()?;
        
        {
            let mut stmt = tx.prepare(
                r#"DELETE FROM entities WHERE id = ?1 AND organizationId = ?2"#
            )?;
            
            for id in entity_ids {
                stmt.execute(params![id, organization_id])?;
            }
        } // stmtのスコープを終了
        
        tx.commit()?;
        Ok(())
    }

    fn upsert_relation(
        &self,
        conn: &rusqlite::Connection,
        relation_id: &str,
        organization_id: &str,
        payload: &HashMap<String, Value>,
    ) -> Result<()> {
        let tx = conn.unchecked_transaction()?;
        
        let topic_id = payload.get("topicId").and_then(|v| v.as_str()).unwrap_or("");
        let source_entity_id = payload.get("sourceEntityId").and_then(|v| v.as_str());
        let target_entity_id = payload.get("targetEntityId").and_then(|v| v.as_str());
        let relation_type = payload.get("relationType").and_then(|v| v.as_str()).unwrap_or("");
        let description = payload.get("description").and_then(|v| v.as_str());
        let confidence = payload.get("confidence").and_then(|v| v.as_f64());
        let metadata_json = payload.get("metadata")
            .and_then(|v| serde_json::to_string(v).ok())
            .unwrap_or_else(|| "{}".to_string());
        
        // companyIdを取得（事業会社の議事録の場合）
        let company_id = payload.get("companyId").and_then(|v| v.as_str());
        
        // organizationIdとcompanyIdのどちらか一方が設定されていることを確認
        let org_id = if company_id.is_some() { None } else { Some(organization_id) };
        
        // relationsテーブルに挿入/更新（topicRelationsからリネーム済み、ChromaDB同期状態を0に設定）
        tx.execute(
            r#"INSERT INTO relations (id, topicId, sourceEntityId, targetEntityId, relationType, description, confidence, metadata, organizationId, companyId, chromaSynced, createdAt, updatedAt)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0, datetime('now'), datetime('now'))
               ON CONFLICT(id) DO UPDATE SET
                   topicId = excluded.topicId,
                   sourceEntityId = excluded.sourceEntityId,
                   targetEntityId = excluded.targetEntityId,
                   relationType = excluded.relationType,
                   description = excluded.description,
                   confidence = excluded.confidence,
                   metadata = excluded.metadata,
                   organizationId = excluded.organizationId,
                   companyId = excluded.companyId,
                   chromaSynced = 0,
                   updatedAt = datetime('now')"#,
            params![relation_id, topic_id, source_entity_id, target_entity_id, relation_type, description, confidence, metadata_json, org_id, company_id],
        )?;

        tx.commit()?;
        Ok(())
    }

    fn delete_relations(
        &self,
        conn: &rusqlite::Connection,
        relation_ids: &[String],
        organization_id: &str,
    ) -> Result<()> {
        let tx = conn.unchecked_transaction()?;
        
        {
            let mut stmt = tx.prepare(
                r#"DELETE FROM relations WHERE id = ?1 AND organizationId = ?2"#
            )?;
            
            for id in relation_ids {
                stmt.execute(params![id, organization_id])?;
            }
        } // stmtのスコープを終了
        
        tx.commit()?;
        Ok(())
    }

    fn upsert_topic(
        &self,
        conn: &rusqlite::Connection,
        topic_id: &str,
        meeting_note_id: &str,
        organization_id: &str,
        payload: &HashMap<String, Value>,
    ) -> Result<()> {
        let tx = conn.unchecked_transaction()?;
        
        // topicsテーブルに挿入/更新（topicEmbeddingsから統合済み、ChromaDB同期状態を0に設定）
        let title = payload.get("title").and_then(|v| v.as_str()).unwrap_or("");
        let description = payload.get("description").and_then(|v| v.as_str());
        let content = payload.get("content").and_then(|v| v.as_str());
        let semantic_category = payload.get("semanticCategory").and_then(|v| v.as_str());
        let keywords_json = payload.get("keywords")
            .and_then(|v| serde_json::to_string(v).ok())
            .unwrap_or_else(|| "[]".to_string());
        let tags_json = payload.get("tags")
            .and_then(|v| serde_json::to_string(v).ok())
            .unwrap_or_else(|| "[]".to_string());
        
        // companyIdを取得（事業会社の議事録の場合）
        let company_id = payload.get("companyId").and_then(|v| v.as_str());
        
        // organizationIdとcompanyIdのどちらか一方が設定されていることを確認
        let org_id = if company_id.is_some() { None } else { Some(organization_id) };
        
        tx.execute(
            r#"INSERT INTO topics (id, topicId, meetingNoteId, organizationId, companyId, title, description, content, semanticCategory, keywords, tags, chromaSynced, createdAt, updatedAt)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 0, datetime('now'), datetime('now'))
               ON CONFLICT(id) DO UPDATE SET
                   title = excluded.title,
                   description = excluded.description,
                   content = excluded.content,
                   semanticCategory = excluded.semanticCategory,
                   keywords = excluded.keywords,
                   tags = excluded.tags,
                   organizationId = excluded.organizationId,
                   companyId = excluded.companyId,
                   chromaSynced = 0,
                   updatedAt = datetime('now')"#,
            params![topic_id, topic_id, meeting_note_id, org_id, company_id, title, description, content, semantic_category, keywords_json, tags_json],
        )?;
        
        tx.commit()?;
        Ok(())
    }

    fn delete_topics(
        &self,
        conn: &rusqlite::Connection,
        topic_ids: &[String],
        organization_id: &str,
    ) -> Result<()> {
        let tx = conn.unchecked_transaction()?;
        
        {
            let mut stmt = tx.prepare(
                r#"DELETE FROM topics WHERE id = ?1 AND organizationId = ?2"#
            )?;
            
            for id in topic_ids {
                stmt.execute(params![id, organization_id])?;
            }
        } // stmtのスコープを終了
        
        tx.commit()?;
        Ok(())
    }

    fn upsert_organization(
        &self,
        conn: &rusqlite::Connection,
        organization_id: &str,
        payload: &HashMap<String, Value>,
    ) -> Result<()> {
        let tx = conn.unchecked_transaction()?;
        
        let name = payload.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let parent_id = payload.get("parentId").and_then(|v| v.as_str());
        let title = payload.get("title").and_then(|v| v.as_str());
        let description = payload.get("description").and_then(|v| v.as_str());
        let level = payload.get("level").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
        let level_name = payload.get("levelName").and_then(|v| v.as_str()).unwrap_or("");
        let position = payload.get("position").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
        
        tx.execute(
            r#"INSERT INTO organizations (id, parentId, name, title, description, level, levelName, position, createdAt, updatedAt)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'), datetime('now'))
               ON CONFLICT(id) DO UPDATE SET
                   parentId = excluded.parentId,
                   name = excluded.name,
                   title = excluded.title,
                   description = excluded.description,
                   level = excluded.level,
                   levelName = excluded.levelName,
                   position = excluded.position,
                   updatedAt = datetime('now')"#,
            params![organization_id, parent_id, name, title, description, level, level_name, position],
        )?;

        tx.commit()?;
        Ok(())
    }

    fn delete_organization(
        &self,
        _conn: &rusqlite::Connection,
        organization_id: &str,
    ) -> Result<()> {
        // 専用のdelete_organization関数を使用（関連データも一緒に削除）
        use crate::database::delete_organization;
        delete_organization(organization_id)
            .map_err(|e| anyhow::anyhow!("Failed to delete organization: {}", e))?;
        Ok(())
    }

    fn delete_meeting_note(
        &self,
        _conn: &rusqlite::Connection,
        meeting_note_id: &str,
        _organization_id: &str,
    ) -> Result<()> {
        // 既存のdelete_meeting_note_with_relations関数を呼び出す
        use crate::database::delete_meeting_note_with_relations;
        delete_meeting_note_with_relations(meeting_note_id)
            .map_err(|e| anyhow::anyhow!("Failed to delete meeting note: {}", e))?;
        Ok(())
    }

    fn update_chroma_sync_status(
        &self,
        conn: &rusqlite::Connection,
        entity_type: &str,
        entity_id: &str,
        synced: bool,
        error: Option<&str>,
    ) -> Result<()> {
        let tx = conn.unchecked_transaction()?;
        use crate::database::get_timestamp;
        let now = get_timestamp();
        
        match entity_type {
            "entity" => {
                tx.execute(
                    r#"UPDATE entities 
                       SET chromaSynced = ?1, 
                           chromaSyncError = ?2, 
                           lastChromaSyncAttempt = ?3,
                           updatedAt = ?4
                       WHERE id = ?5"#,
                    params![if synced { 1 } else { 0 }, error, now, now, entity_id],
                )?;
            }
            "relation" => {
                tx.execute(
                    r#"UPDATE relations 
                       SET chromaSynced = ?1, 
                           chromaSyncError = ?2, 
                           lastChromaSyncAttempt = ?3,
                           updatedAt = ?4
                       WHERE id = ?5"#,
                    params![if synced { 1 } else { 0 }, error, now, now, entity_id],
                )?;
            }
            "topic" => {
                tx.execute(
                    r#"UPDATE topics 
                       SET chromaSynced = ?1, 
                           chromaSyncError = ?2, 
                           lastChromaSyncAttempt = ?3,
                           updatedAt = ?4
                       WHERE id = ?5"#,
                    params![if synced { 1 } else { 0 }, error, now, now, entity_id],
                )?;
            }
            "meetingNote" => {
                tx.execute(
                    r#"UPDATE meetingNotes 
                       SET chromaSynced = ?1, 
                           chromaSyncError = ?2, 
                           lastChromaSyncAttempt = ?3,
                           updatedAt = ?4
                       WHERE id = ?5"#,
                    params![if synced { 1 } else { 0 }, error, now, now, entity_id],
                )?;
            }
            _ => {
                return Err(anyhow::anyhow!("Unknown entity type: {}", entity_type));
            }
        }
        
        tx.commit()?;
        Ok(())
    }
}
