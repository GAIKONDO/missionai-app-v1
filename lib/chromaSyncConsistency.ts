/**
 * ChromaDBとSQLiteのデータ整合性チェック
 * 不整合を検出して自動修復
 */

import { shouldUseChroma } from './chromaConfig';
import { chromaSyncConfig } from './chromaSyncConfig';
import { callTauriCommand } from './localFirebase';
import { getAllEntities } from './entityApi';
import { getAllRelations } from './relationApi';
import { syncEntityToChroma, syncRelationToChroma, deleteEntityFromChroma, deleteRelationFromChroma } from './chromaSync';
import { showSyncInfo, showSyncWarning } from './chromaSyncNotification';

export interface Inconsistency {
  type: 'missing_in_chroma' | 'orphan_in_chroma' | 'mismatch';
  entityType: 'entity' | 'relation' | 'topic';
  id: string;
  organizationId?: string;
  details?: Record<string, any>;
}

/**
 * エンティティの整合性をチェック
 */
export async function checkEntityConsistency(
  organizationId?: string
): Promise<Inconsistency[]> {
  if (!shouldUseChroma()) {
    return [];
  }
  
  const inconsistencies: Inconsistency[] = [];
  
  try {
    // SQLiteから全エンティティを取得
    const sqliteEntities = await getAllEntities();
    const filteredEntities = organizationId
      ? sqliteEntities.filter(e => e.organizationId === organizationId)
      : sqliteEntities;
    
    // ChromaDBからエンティティIDのリストを取得（実装が必要）
    // 現在はRust側の実装が必要なため、簡易的なチェックのみ
    for (const entity of filteredEntities) {
      if (!entity.organizationId) {
        continue;
      }
      
      // ChromaDBに存在するかチェック（簡易版）
      // 実際の実装では、Rust側でChromaDBからIDリストを取得する必要がある
      try {
        // 検索で存在確認を試みる（簡易的な方法）
        const { findSimilarEntitiesChroma } = await import('./entityEmbeddingsChroma');
        const results = await findSimilarEntitiesChroma(
          entity.name,
          1,
          entity.organizationId
        );
        
        const existsInChroma = results.some(r => r.entityId === entity.id);
        
        if (!existsInChroma) {
          inconsistencies.push({
            type: 'missing_in_chroma',
            entityType: 'entity',
            id: entity.id,
            organizationId: entity.organizationId,
            details: { name: entity.name },
          });
        }
      } catch (error) {
        // チェックエラーは無視（ChromaDBが使用できない場合など）
        console.debug(`エンティティ ${entity.id} の整合性チェックエラー:`, error);
      }
    }
  } catch (error) {
    console.error('エンティティ整合性チェックエラー:', error);
  }
  
  return inconsistencies;
}

/**
 * リレーションの整合性をチェック
 */
export async function checkRelationConsistency(
  organizationId?: string
): Promise<Inconsistency[]> {
  if (!shouldUseChroma()) {
    return [];
  }
  
  const inconsistencies: Inconsistency[] = [];
  
  try {
    // SQLiteから全リレーションを取得
    const sqliteRelations = await getAllRelations();
    const filteredRelations = organizationId
      ? sqliteRelations.filter(r => r.organizationId === organizationId)
      : sqliteRelations;
    
    // 簡易的なチェック（実際の実装ではRust側の実装が必要）
    for (const relation of filteredRelations) {
      if (!relation.organizationId) {
        continue;
      }
      
      // ChromaDBに存在するかチェック（簡易版）
      try {
        const { findSimilarRelationsChroma } = await import('./relationEmbeddingsChroma');
        const results = await findSimilarRelationsChroma(
          relation.description || relation.relationType,
          1,
          relation.organizationId
        );
        
        const existsInChroma = results.some(r => r.relationId === relation.id);
        
        if (!existsInChroma) {
          inconsistencies.push({
            type: 'missing_in_chroma',
            entityType: 'relation',
            id: relation.id,
            organizationId: relation.organizationId,
            details: { relationType: relation.relationType },
          });
        }
      } catch (error) {
        console.debug(`リレーション ${relation.id} の整合性チェックエラー:`, error);
      }
    }
  } catch (error) {
    console.error('リレーション整合性チェックエラー:', error);
  }
  
  return inconsistencies;
}

/**
 * すべての整合性をチェック
 */
export async function checkAllConsistency(
  organizationId?: string
): Promise<Inconsistency[]> {
  const [entityInconsistencies, relationInconsistencies] = await Promise.all([
    checkEntityConsistency(organizationId),
    checkRelationConsistency(organizationId),
  ]);
  
  return [...entityInconsistencies, ...relationInconsistencies];
}

/**
 * 不整合を自動修復
 */
export async function repairInconsistencies(
  inconsistencies: Inconsistency[]
): Promise<{
  repaired: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}> {
  const result = {
    repaired: 0,
    failed: 0,
    errors: [] as Array<{ id: string; error: string }>,
  };
  
  for (const inconsistency of inconsistencies) {
    try {
      if (inconsistency.type === 'missing_in_chroma') {
        // ChromaDBに存在しない場合は同期
        if (inconsistency.entityType === 'entity' && inconsistency.organizationId) {
          const { getEntityById } = await import('./entityApi');
          const entity = await getEntityById(inconsistency.id);
          if (entity) {
            await syncEntityToChroma(
              inconsistency.id,
              inconsistency.organizationId,
              entity
            );
            result.repaired++;
          }
        } else if (inconsistency.entityType === 'relation' && inconsistency.organizationId) {
          const { getRelationById } = await import('./relationApi');
          const relation = await getRelationById(inconsistency.id);
          if (relation) {
            await syncRelationToChroma(
              inconsistency.id,
              relation.topicId || '',
              inconsistency.organizationId,
              relation
            );
            result.repaired++;
          }
        }
      } else if (inconsistency.type === 'orphan_in_chroma') {
        // ChromaDBに孤立したデータがある場合は削除
        if (inconsistency.entityType === 'entity' && inconsistency.organizationId) {
          await deleteEntityFromChroma(inconsistency.id, inconsistency.organizationId);
          result.repaired++;
        } else if (inconsistency.entityType === 'relation' && inconsistency.organizationId) {
          await deleteRelationFromChroma(inconsistency.id, inconsistency.organizationId);
          result.repaired++;
        }
      }
    } catch (error) {
      result.failed++;
      result.errors.push({
        id: inconsistency.id,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`不整合修復エラー: ${inconsistency.id}`, error);
    }
  }
  
  return result;
}

/**
 * 定期整合性チェックを開始
 */
let consistencyCheckInterval: NodeJS.Timeout | null = null;

export function startConsistencyCheck(organizationId?: string): void {
  const config = chromaSyncConfig.getConfig();
  
  if (!config.checkConsistency) {
    return;
  }
  
  // 既存のインターバルをクリア
  stopConsistencyCheck();
  
  // 新しいインターバルを開始
  consistencyCheckInterval = setInterval(async () => {
    try {
      showSyncInfo('データ整合性チェックを実行中...');
      
      const inconsistencies = await checkAllConsistency(organizationId);
      
      if (inconsistencies.length > 0) {
        showSyncWarning(
          `${inconsistencies.length}件のデータ不整合を検出しました。自動修復を開始します...`
        );
        
        const repairResult = await repairInconsistencies(inconsistencies);
        
        if (repairResult.repaired > 0) {
          showSyncInfo(`${repairResult.repaired}件の不整合を修復しました`);
        }
        
        if (repairResult.failed > 0) {
          showSyncWarning(
            `${repairResult.failed}件の不整合の修復に失敗しました。詳細はコンソールを確認してください。`
          );
        }
      } else {
        console.log('✅ データ整合性チェック: 不整合は検出されませんでした');
      }
    } catch (error) {
      console.error('整合性チェックエラー:', error);
      showSyncWarning('データ整合性チェック中にエラーが発生しました');
    }
  }, config.consistencyCheckInterval);
  
  console.log(`✅ データ整合性チェックを開始しました（間隔: ${config.consistencyCheckInterval / 1000}秒）`);
}

/**
 * 定期整合性チェックを停止
 */
export function stopConsistencyCheck(): void {
  if (consistencyCheckInterval) {
    clearInterval(consistencyCheckInterval);
    consistencyCheckInterval = null;
    console.log('データ整合性チェックを停止しました');
  }
}
