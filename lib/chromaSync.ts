/**
 * ChromaDBとSQLiteのデータ同期管理
 * エンティティ、リレーション、トピックの更新・削除時にChromaDBも同期
 */

import { shouldUseChroma } from './chromaConfig';
import { chromaSyncConfig } from './chromaSyncConfig';
import { callTauriCommand } from './localFirebase';
import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import { saveEntityEmbedding } from './entityEmbeddings';
import { saveRelationEmbedding } from './relationEmbeddings';
import { saveTopicEmbedding } from './topicEmbeddings';
import { syncWithRetry } from './chromaSyncRetry';
import { showSyncError, showSyncSuccess, showSyncWarning } from './chromaSyncNotification';

/**
 * エンティティの変更を検知（埋め込みに影響するフィールドかどうか）
 */
function hasEmbeddingRelevantChanges(
  existing: Entity,
  updates: Partial<Entity>
): boolean {
  // 埋め込みに影響するフィールド
  const relevantFields: (keyof Entity)[] = ['name', 'aliases', 'metadata', 'type'];
  
  return relevantFields.some(field => {
    if (field in updates) {
      const existingValue = existing[field];
      const newValue = updates[field];
      
      // 配列の場合は内容を比較
      if (Array.isArray(existingValue) && Array.isArray(newValue)) {
        return JSON.stringify(existingValue) !== JSON.stringify(newValue);
      }
      
      // オブジェクトの場合は内容を比較
      if (typeof existingValue === 'object' && typeof newValue === 'object') {
        return JSON.stringify(existingValue) !== JSON.stringify(newValue);
      }
      
      return existingValue !== newValue;
    }
    return false;
  });
}

/**
 * エンティティ更新時にChromaDBも更新
 */
export async function syncEntityToChroma(
  entityId: string,
  organizationId: string,
  entity: Entity,
  existingEntity?: Entity,
  updates?: Partial<Entity>
): Promise<void> {
  if (!shouldUseChroma() || !organizationId) {
    return;
  }
  
  if (!chromaSyncConfig.isEnabled()) {
    return;
  }
  
  // 変更検知: 埋め込みに影響しない変更の場合はスキップ
  if (existingEntity && updates) {
    if (!hasEmbeddingRelevantChanges(existingEntity, updates)) {
      console.debug(`エンティティ ${entityId} の変更は埋め込みに影響しないため、同期をスキップします`);
      return;
    }
  }
  
  const syncFn = async () => {
    // 埋め込みを再生成してChromaDBに保存
    await saveEntityEmbedding(entityId, organizationId, entity);
  };
  
  if (chromaSyncConfig.isAsync()) {
    // 非同期で実行
    (async () => {
      try {
        if (chromaSyncConfig.shouldRetry()) {
          await syncWithRetry(syncFn, entityId, 'entity');
        } else {
          await syncFn();
        }
        showSyncSuccess(`エンティティ「${entity.name}」のChromaDB同期が完了しました`);
      } catch (error) {
        showSyncError(
          `エンティティ「${entity.name}」のChromaDB同期に失敗しました`,
          {
            label: '再試行',
            onClick: () => syncEntityToChroma(entityId, organizationId, entity, existingEntity, updates),
          }
        );
      }
    })();
  } else {
    // 同期で実行
    try {
      if (chromaSyncConfig.shouldRetry()) {
        await syncWithRetry(syncFn, entityId, 'entity');
      } else {
        await syncFn();
      }
      console.log(`✅ ChromaDBのエンティティを同期しました: ${entityId}`);
    } catch (error) {
      console.warn(`⚠️ ChromaDBのエンティティ同期エラー: ${entityId}`, error);
      showSyncError(
        `エンティティ「${entity.name}」のChromaDB同期に失敗しました`,
        {
          label: '再試行',
          onClick: () => syncEntityToChroma(entityId, organizationId, entity, existingEntity, updates),
        }
      );
      throw error;
    }
  }
}

/**
 * エンティティ削除時にChromaDBからも削除
 */
export async function deleteEntityFromChroma(
  entityId: string,
  organizationId: string
): Promise<void> {
  if (!shouldUseChroma() || !organizationId) {
    return;
  }
  
  if (!chromaSyncConfig.isEnabled()) {
    return;
  }
  
  const deleteFn = async () => {
    // Rust側のコマンド名は chromadb_delete_entity_embedding
    // パラメータ名はcamelCase（entityId, organizationId）
    try {
      await callTauriCommand('chromadb_delete_entity_embedding', {
        entityId,
        organizationId,
      });
    } catch (error: any) {
      // コマンドが存在しない場合のエラーハンドリング
      const errorMessage = error?.error || error?.message || String(error);
      if (errorMessage.includes('not found') || errorMessage.includes('Command')) {
        console.warn(`⚠️ ChromaDB削除コマンドが利用できません（Rust側の実装が必要）: ${entityId}`);
        // コマンドが存在しない場合はスキップ（後方互換性のため）
        return;
      }
      throw error;
    }
  };
  
  try {
    if (chromaSyncConfig.shouldRetry()) {
      await syncWithRetry(deleteFn, entityId, 'entity');
    } else {
      await deleteFn();
    }
    console.log(`✅ ChromaDBからエンティティを削除しました: ${entityId}`);
  } catch (error: any) {
    const errorMessage = error?.error || error?.message || String(error);
    // コマンドが存在しない場合は警告のみ（エラーを投げない）
    if (errorMessage.includes('not found') || errorMessage.includes('Command')) {
      console.warn(`⚠️ ChromaDB削除コマンドが利用できません: ${entityId}`);
      return; // エラーを投げずに終了
    }
    
    console.warn(`⚠️ ChromaDBからのエンティティ削除エラー: ${entityId}`, error);
    showSyncWarning(
      `エンティティ「${entityId}」のChromaDBからの削除に失敗しました`,
      {
        label: '再試行',
        onClick: () => deleteEntityFromChroma(entityId, organizationId),
      }
    );
    // エラーが発生しても処理を続行（SQLiteの削除は成功しているため）
  }
}

/**
 * リレーションの変更を検知（埋め込みに影響するフィールドかどうか）
 */
function hasRelationEmbeddingRelevantChanges(
  existing: Relation,
  updates: Partial<Relation>
): boolean {
  // 埋め込みに影響するフィールド
  const relevantFields: (keyof Relation)[] = ['description', 'relationType', 'metadata'];
  
  return relevantFields.some(field => {
    if (field in updates) {
      const existingValue = existing[field];
      const newValue = updates[field];
      
      if (typeof existingValue === 'object' && typeof newValue === 'object') {
        return JSON.stringify(existingValue) !== JSON.stringify(newValue);
      }
      
      return existingValue !== newValue;
    }
    return false;
  });
}

/**
 * リレーション更新時にChromaDBも更新
 */
export async function syncRelationToChroma(
  relationId: string,
  topicId: string,
  organizationId: string,
  relation: Relation,
  existingRelation?: Relation,
  updates?: Partial<Relation>
): Promise<void> {
  if (!shouldUseChroma() || !organizationId) {
    return;
  }
  
  if (!chromaSyncConfig.isEnabled()) {
    return;
  }
  
  // 変更検知: 埋め込みに影響しない変更の場合はスキップ
  if (existingRelation && updates) {
    if (!hasRelationEmbeddingRelevantChanges(existingRelation, updates)) {
      console.debug(`リレーション ${relationId} の変更は埋め込みに影響しないため、同期をスキップします`);
      return;
    }
  }
  
  const syncFn = async () => {
    // 埋め込みを再生成してChromaDBに保存
    await saveRelationEmbedding(relationId, topicId, organizationId, relation);
  };
  
  if (chromaSyncConfig.isAsync()) {
    // 非同期で実行
    (async () => {
      try {
        if (chromaSyncConfig.shouldRetry()) {
          await syncWithRetry(syncFn, relationId, 'relation');
        } else {
          await syncFn();
        }
        console.log(`✅ ChromaDBのリレーションを同期しました: ${relationId}`);
      } catch (error) {
        showSyncError(
          `リレーション「${relationId}」のChromaDB同期に失敗しました`,
          {
            label: '再試行',
            onClick: () => syncRelationToChroma(relationId, topicId, organizationId, relation, existingRelation, updates),
          }
        );
      }
    })();
  } else {
    // 同期で実行
    try {
      if (chromaSyncConfig.shouldRetry()) {
        await syncWithRetry(syncFn, relationId, 'relation');
      } else {
        await syncFn();
      }
      console.log(`✅ ChromaDBのリレーションを同期しました: ${relationId}`);
    } catch (error) {
      console.warn(`⚠️ ChromaDBのリレーション同期エラー: ${relationId}`, error);
      showSyncError(
        `リレーション「${relationId}」のChromaDB同期に失敗しました`,
        {
          label: '再試行',
          onClick: () => syncRelationToChroma(relationId, topicId, organizationId, relation, existingRelation, updates),
        }
      );
      throw error;
    }
  }
}

/**
 * リレーション削除時にChromaDBからも削除
 */
export async function deleteRelationFromChroma(
  relationId: string,
  organizationId: string
): Promise<void> {
  if (!shouldUseChroma() || !organizationId) {
    return;
  }
  
  if (!chromaSyncConfig.isEnabled()) {
    return;
  }
  
  const deleteFn = async () => {
    // Rust側のコマンド名は chromadb_delete_relation_embedding
    // パラメータ名はcamelCase（relationId, organizationId）
    try {
      await callTauriCommand('chromadb_delete_relation_embedding', {
        relationId,
        organizationId,
      });
    } catch (error: any) {
      // コマンドが存在しない場合のエラーハンドリング
      const errorMessage = error?.error || error?.message || String(error);
      if (errorMessage.includes('not found') || errorMessage.includes('Command')) {
        console.warn(`⚠️ ChromaDB削除コマンドが利用できません（Rust側の実装が必要）: ${relationId}`);
        // コマンドが存在しない場合はスキップ（後方互換性のため）
        return;
      }
      throw error;
    }
  };
  
  try {
    if (chromaSyncConfig.shouldRetry()) {
      await syncWithRetry(deleteFn, relationId, 'relation');
    } else {
      await deleteFn();
    }
    console.log(`✅ ChromaDBからリレーションを削除しました: ${relationId}`);
  } catch (error: any) {
    const errorMessage = error?.error || error?.message || String(error);
    // コマンドが存在しない場合は警告のみ（エラーを投げない）
    if (errorMessage.includes('not found') || errorMessage.includes('Command')) {
      console.warn(`⚠️ ChromaDB削除コマンドが利用できません: ${relationId}`);
      return; // エラーを投げずに終了
    }
    
    console.warn(`⚠️ ChromaDBからのリレーション削除エラー: ${relationId}`, error);
    showSyncWarning(
      `リレーション「${relationId}」のChromaDBからの削除に失敗しました`,
      {
        label: '再試行',
        onClick: () => deleteRelationFromChroma(relationId, organizationId),
      }
    );
    // エラーが発生しても処理を続行
  }
}

/**
 * トピック更新時にChromaDBも更新
 */
export async function syncTopicToChroma(
  topicId: string,
  meetingNoteId: string,
  organizationId: string,
  title: string,
  content: string,
  metadata?: {
    keywords?: string[];
    semanticCategory?: string;
    tags?: string[];
    summary?: string;
    importance?: string;
  }
): Promise<void> {
  if (!shouldUseChroma() || !organizationId) {
    return;
  }
  
  try {
    // 埋め込みを再生成してChromaDBに保存
    await saveTopicEmbedding(
      topicId,
      meetingNoteId,
      organizationId,
      title,
      content,
      metadata as any
    );
    console.log(`✅ ChromaDBのトピックを同期しました: ${topicId}`);
  } catch (error) {
    console.warn(`⚠️ ChromaDBのトピック同期エラー: ${topicId}`, error);
    // エラーが発生しても処理を続行
  }
}

/**
 * トピック削除時にChromaDBからも削除
 */
export async function deleteTopicFromChroma(
  topicId: string,
  meetingNoteId: string,
  organizationId: string
): Promise<void> {
  if (!shouldUseChroma() || !organizationId) {
    return;
  }
  
  const deleteFn = async () => {
    // Rust側のコマンド名は chromadb_delete_topic_embedding
    // パラメータ名はcamelCase（topicId, organizationId）
    try {
      await callTauriCommand('chromadb_delete_topic_embedding', {
        topicId,
        organizationId,
      });
    } catch (error: any) {
      // コマンドが存在しない場合のエラーハンドリング
      const errorMessage = error?.error || error?.message || String(error);
      if (errorMessage.includes('not found') || errorMessage.includes('Command')) {
        console.warn(`⚠️ ChromaDB削除コマンドが利用できません（Rust側の実装が必要）: ${topicId}`);
        // コマンドが存在しない場合はスキップ（後方互換性のため）
        return;
      }
      throw error;
    }
  };
  
  try {
    if (chromaSyncConfig.shouldRetry()) {
      await syncWithRetry(deleteFn, topicId, 'topic');
    } else {
      await deleteFn();
    }
    console.log(`✅ ChromaDBからトピックを削除しました: ${topicId}`);
  } catch (error: any) {
    const errorMessage = error?.error || error?.message || String(error);
    // コマンドが存在しない場合は警告のみ（エラーを投げない）
    if (errorMessage.includes('not found') || errorMessage.includes('Command')) {
      console.warn(`⚠️ ChromaDB削除コマンドが利用できません: ${topicId}`);
      return; // エラーを投げずに終了
    }
    
    console.warn(`⚠️ ChromaDBからのトピック削除エラー: ${topicId}`, error);
    showSyncWarning(
      `トピック「${topicId}」のChromaDBからの削除に失敗しました`,
      {
        label: '再試行',
        onClick: () => deleteTopicFromChroma(topicId, meetingNoteId, organizationId),
      }
    );
    // エラーが発生しても処理を続行
  }
}

/**
 * 組織の全データをChromaDBに同期
 * バッチ処理で効率的に同期
 */
export async function syncOrganizationToChroma(
  organizationId: string,
  options?: {
    onProgress?: (current: number, total: number, type: 'entity' | 'relation' | 'topic') => void;
  }
): Promise<{
  entities: { succeeded: number; failed: number };
  relations: { succeeded: number; failed: number };
  topics: { succeeded: number; failed: number };
}> {
  if (!shouldUseChroma() || !organizationId) {
    return {
      entities: { succeeded: 0, failed: 0 },
      relations: { succeeded: 0, failed: 0 },
      topics: { succeeded: 0, failed: 0 },
    };
  }
  
  const results = {
    entities: { succeeded: 0, failed: 0 },
    relations: { succeeded: 0, failed: 0 },
    topics: { succeeded: 0, failed: 0 },
  };
  
  try {
    // エンティティの同期
    const { getAllEntities } = await import('./entityApi');
    const entities = await getAllEntities();
    const orgEntities = entities.filter(e => e.organizationId === organizationId);
    
    for (let i = 0; i < orgEntities.length; i++) {
      const entity = orgEntities[i];
      try {
        await syncEntityToChroma(entity.id, organizationId, entity);
        results.entities.succeeded++;
      } catch (error) {
        console.warn(`エンティティ同期エラー: ${entity.id}`, error);
        results.entities.failed++;
      }
      
      if (options?.onProgress) {
        options.onProgress(i + 1, orgEntities.length, 'entity');
      }
    }
    
    // リレーションの同期
    const { getAllRelations } = await import('./relationApi');
    const relations = await getAllRelations();
    const orgRelations = relations.filter(r => r.organizationId === organizationId);
    
    for (let i = 0; i < orgRelations.length; i++) {
      const relation = orgRelations[i];
      try {
        // topicIdが必要なため、リレーションから取得
        const topicId = relation.topicId || '';
        await syncRelationToChroma(relation.id, topicId, organizationId, relation);
        results.relations.succeeded++;
      } catch (error) {
        console.warn(`リレーション同期エラー: ${relation.id}`, error);
        results.relations.failed++;
      }
      
      if (options?.onProgress) {
        options.onProgress(i + 1, orgRelations.length, 'relation');
      }
    }
    
    console.log(`✅ 組織 ${organizationId} のChromaDB同期が完了しました`, results);
  } catch (error) {
    console.error(`組織 ${organizationId} のChromaDB同期エラー:`, error);
  }
  
  return results;
}
