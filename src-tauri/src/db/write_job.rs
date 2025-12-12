/**
 * 書き込みジョブの定義
 * データベースへの書き込み操作を表すenum
 */

use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub enum WriteJob {
    // エンティティ操作
    UpsertEntity {
        entity_id: String,
        organization_id: String,
        payload: HashMap<String, Value>,
    },
    DeleteEntities {
        entity_ids: Vec<String>,
        organization_id: String,
    },
    
    // リレーション操作
    UpsertRelation {
        relation_id: String,
        organization_id: String,
        payload: HashMap<String, Value>,
    },
    DeleteRelations {
        relation_ids: Vec<String>,
        organization_id: String,
    },
    
    // トピック操作
    UpsertTopic {
        topic_id: String,
        meeting_note_id: String,
        organization_id: String,
        payload: HashMap<String, Value>,
    },
    DeleteTopics {
        topic_ids: Vec<String>,
        organization_id: String,
    },
    
    // 組織操作
    UpsertOrganization {
        organization_id: String,
        payload: HashMap<String, Value>,
    },
    DeleteOrganization {
        organization_id: String,
    },
    
    // 議事録操作
    DeleteMeetingNote {
        meeting_note_id: String,
        organization_id: String,
    },
    
    // ChromaDB同期状態の更新
    UpdateChromaSyncStatus {
        entity_type: String, // "entity", "relation", "topic", "meetingNote"
        entity_id: String,
        synced: bool, // true: 同期成功, false: 同期失敗
        error: Option<String>, // エラーメッセージ（失敗時）
    },
}
