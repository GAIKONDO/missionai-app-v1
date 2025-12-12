/**
 * リレーションAPI
 * ナレッジグラフで使用するリレーションの操作を行う
 */

import type {
  Relation,
  CreateRelationInput,
  UpdateRelationInput,
  RelationType,
  RelationValidationResult,
} from '@/types/relation';
import { callTauriCommand } from './localFirebase';
import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import { getEntityById } from './entityApi';
import { saveRelationEmbeddingAsync } from './relationEmbeddings';

/**
 * リレーションを作成
 */
export async function createRelation(relation: CreateRelationInput): Promise<Relation> {
  try {
    const id = `relation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const relationData: Relation = {
      ...relation,
      id,
      createdAt: now,
      updatedAt: now,
    };

    // バリデーション
    const validation = await validateRelation(relationData);
    if (!validation.isValid) {
      throw new Error(`リレーションのバリデーションエラー: ${validation.errors.join(', ')}`);
    }

    try {
      // Rust API経由で作成（未実装の場合はフォールバック）
      const createdRelation = await apiPost<Relation>('/api/relations', relationData);
      console.log('✅ [createRelation] Rust API経由でリレーションを作成:', {
        relationId: createdRelation.id,
        topicId: createdRelation.topicId,
        sourceEntityId: createdRelation.sourceEntityId,
        targetEntityId: createdRelation.targetEntityId,
      });
      return createdRelation;
    } catch (error) {
      // フォールバック: Tauriコマンド経由
      console.warn('⚠️ [createRelation] Rust API経由の作成に失敗、Tauriコマンドにフォールバック:', error);
      console.log('📊 [createRelation] Tauriコマンド経由でリレーションを作成:', {
        relationId: id,
        topicId: relationData.topicId,
        sourceEntityId: relationData.sourceEntityId,
        targetEntityId: relationData.targetEntityId,
      });
      await callTauriCommand('doc_set', {
        collectionName: 'relations',
        docId: id,
        data: relationData,
      });
      
      // 埋め込みを非同期で生成（エラーは無視）
      if (relation.organizationId) {
        saveRelationEmbeddingAsync(id, relation.topicId, relation.organizationId).catch(error => {
          console.error('❌ [createRelation] リレーション埋め込みの生成に失敗しました（続行します）:', {
            relationId: id,
            relationType: relation.relationType,
            topicId: relation.topicId,
            organizationId: relation.organizationId,
            error: error?.message || String(error),
            stack: error?.stack,
            timestamp: new Date().toISOString(),
          });
        });
      } else {
        console.warn(`⚠️ [createRelation] organizationIdが設定されていないため、埋め込み生成をスキップ: ${relation.relationType} (${id})`);
      }
      
      return relationData;
    }
  } catch (error: any) {
    console.error('❌ [createRelation] エラー:', error);
    throw error;
  }
}

/**
 * リレーションIDで取得
 */
export async function getRelationById(relationId: string): Promise<Relation | null> {
  try {
    try {
      // Rust API経由で取得（未実装の場合はフォールバック）
      return await apiGet<Relation>(`/api/relations/${relationId}`);
    } catch (error) {
      // フォールバック: Tauriコマンド経由
      console.warn('Rust API経由の取得に失敗、Tauriコマンドにフォールバック:', error);
      const result = await callTauriCommand('doc_get', {
        collectionName: 'relations',
        docId: relationId,
      });

      // doc_getの結果は{id: ..., data: ...}の形式または直接データ
      const relationData = (result as any)?.data || result;
      if (!relationData || Object.keys(relationData).length === 0) {
        return null;
      }
      
      // idフィールドを追加
      const relationIdFromResult = (result as any)?.id || relationId;
      return { ...relationData, id: relationIdFromResult } as Relation;
    }
  } catch (error: any) {
    // 「no rows」エラーは正常な状態（リレーションが存在しない）として扱う
    const errorMessage = error?.message || error?.error || error?.errorString || String(error || '');
    const isNoRowsError = errorMessage.includes('no rows') || 
                          errorMessage.includes('Query returned no rows') ||
                          errorMessage.includes('ドキュメント取得エラー');
    
    if (isNoRowsError) {
      // リレーションが存在しない場合は正常な状態として扱い、エラーログを出力しない
      return null;
    }
    
    // その他のエラーのみログに出力
    console.error('❌ [getRelationById] エラー:', error);
    return null;
  }
}

/**
 * すべてのリレーションを取得（全トピック横断）
 */
export async function getAllRelations(): Promise<Relation[]> {
  try {
    console.log('📖 [getAllRelations] 開始');
    
    try {
      // Rust API経由で取得（未実装の場合はフォールバック）
      return await apiGet<Relation[]>('/api/relations');
    } catch (error) {
      // フォールバック: Tauriコマンド経由
      console.warn('Rust API経由の取得に失敗、Tauriコマンドにフォールバック:', error);
      const result = await callTauriCommand('collection_get', {
        collectionName: 'relations',
      });
      
      if (!result || !Array.isArray(result)) {
        console.warn('⚠️ [getAllRelations] 結果が配列ではありません:', result);
        return [];
      }
    
      const relations: Relation[] = result.map((item: any) => {
        // collection_getの結果は[{id: ..., data: ...}, ...]の形式または直接データ
        const relationData = item.data || item;
        const relationId = item.id || relationData.id;
        
        const relation: Relation = {
          id: relationId,
          topicId: relationData.topicId || '',
          organizationId: relationData.organizationId || null,
          sourceEntityId: relationData.sourceEntityId || '',
          targetEntityId: relationData.targetEntityId || '',
          relationType: relationData.relationType || 'related-to',
          description: relationData.description || '',
          confidence: relationData.confidence,
          metadata: relationData.metadata || {},
          createdAt: relationData.createdAt || new Date().toISOString(),
          updatedAt: relationData.updatedAt || new Date().toISOString(),
        };
        
        // metadataをパース
        if (relation.metadata && typeof relation.metadata === 'string') {
          try {
            relation.metadata = JSON.parse(relation.metadata);
          } catch (e) {
            console.warn('⚠️ [getAllRelations] metadataのパースエラー:', e);
          }
        }
        
        return relation;
      });
      
      console.log('✅ [getAllRelations] 取得成功:', relations.length, '件');
      if (relations.length > 0) {
        console.log('🔍 [getAllRelations] サンプルリレーション:', relations[0]);
      }
      return relations;
    }
  } catch (error: any) {
    console.error('❌ [getAllRelations] エラー:', error);
    return [];
  }
}

/**
 * トピックIDでリレーション一覧を取得
 */
export async function getRelationsByTopicId(topicId: string): Promise<Relation[]> {
  try {
    console.log('📊 [getRelationsByTopicId] リレーション取得開始:', { topicId });
    const result = await callTauriCommand('query_get', {
      collectionName: 'relations',
      conditions: { topicId },
    });

    // query_getの結果は[{id: ..., data: ...}, ...]の形式
    const items = (result || []) as Array<{id: string; data: any}>;
    const relations = items.map(item => ({ ...item.data, id: item.id })) as Relation[];
    
    // デバッグ: 取得したリレーションのtopicIdを確認
    relations.forEach(relation => {
      if (relation.topicId !== topicId) {
        console.warn('⚠️ [getRelationsByTopicId] リレーションのtopicIdが一致しません:', {
          relationId: relation.id,
          relationTopicId: relation.topicId,
          expectedTopicId: topicId,
        });
      }
    });
    
    // topicIdで再度フィルタリング（念のため）
    const filteredRelations = relations.filter(r => r.topicId === topicId);
    
    if (filteredRelations.length !== relations.length) {
      console.warn('⚠️ [getRelationsByTopicId] 一部のリレーションがフィルタリングされました:', {
        originalCount: relations.length,
        filteredCount: filteredRelations.length,
        topicId,
      });
    }
    
    console.log('✅ [getRelationsByTopicId] リレーション取得完了:', {
      topicId,
      count: filteredRelations.length,
      relationIds: filteredRelations.map(r => r.id),
    });
    
    return filteredRelations;
  } catch (error: any) {
    console.error('❌ [getRelationsByTopicId] エラー:', error);
    return [];
  }
}

/**
 * エンティティIDでリレーション一覧を取得（起点または終点）
 */
export async function getRelationsByEntityId(entityId: string): Promise<Relation[]> {
  try {
    // 起点としてのリレーション
    const sourceResult = await callTauriCommand('query_get', {
      collectionName: 'relations',
      conditions: { sourceEntityId: entityId },
    });

    // 終点としてのリレーション
    const targetResult = await callTauriCommand('query_get', {
      collectionName: 'relations',
      conditions: { targetEntityId: entityId },
    });

    // query_getの結果は[{id: ..., data: ...}, ...]の形式
    const sourceItems = (sourceResult || []) as Array<{id: string; data: any}>;
    const targetItems = (targetResult || []) as Array<{id: string; data: any}>;
    const sourceRelations = sourceItems.map(item => ({ ...item.data, id: item.id })) as Relation[];
    const targetRelations = targetItems.map(item => ({ ...item.data, id: item.id })) as Relation[];

    // 重複を除去して結合
    const allRelations = [...sourceRelations, ...targetRelations];
    const uniqueRelations = allRelations.filter(
      (relation, index, self) =>
        index === self.findIndex(r => r.id === relation.id)
    );

    return uniqueRelations;
  } catch (error: any) {
    console.error('❌ [getRelationsByEntityId] エラー:', error);
    return [];
  }
}

/**
 * リレーションタイプでフィルタリングして取得
 */
export async function getRelationsByType(
  relationType: RelationType,
  organizationId?: string
): Promise<Relation[]> {
  try {
    const filters: any = { relationType };
    if (organizationId) {
      filters.organizationId = organizationId;
    }

    const result = await callTauriCommand('query_get', {
      collectionName: 'relations',
      conditions: filters,
    });

    // query_getの結果は[{id: ..., data: ...}, ...]の形式
    const items = (result || []) as Array<{id: string; data: any}>;
    return items.map(item => ({ ...item.data, id: item.id })) as Relation[];
  } catch (error: any) {
    console.error('❌ [getRelationsByType] エラー:', error);
    return [];
  }
}

/**
 * リレーションを更新
 */
export async function updateRelation(
  relationId: string,
  updates: UpdateRelationInput
): Promise<Relation | null> {
  try {
    const existing = await getRelationById(relationId);
    if (!existing) {
      throw new Error(`リレーションが見つかりません: ${relationId}`);
    }

    const updated: Relation = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // バリデーション
    const validation = await validateRelation(updated);
    if (!validation.isValid) {
      throw new Error(`リレーションのバリデーションエラー: ${validation.errors.join(', ')}`);
    }

    try {
      // Rust API経由で更新（未実装の場合はフォールバック）
      return await apiPut<Relation>(`/api/relations/${relationId}`, updates);
    } catch (error) {
      // フォールバック: Tauriコマンド経由
      console.warn('Rust API経由の更新に失敗、Tauriコマンドにフォールバック:', error);
      await callTauriCommand('doc_update', {
        collectionName: 'relations',
        docId: relationId,
        data: updated,
      });
      
      // ChromaDB同期（改善版: 変更検知、リトライ、エラー通知付き）
      if (updated.organizationId) {
        try {
          const { syncRelationToChroma } = await import('./chromaSync');
          await syncRelationToChroma(
            relationId,
            updated.topicId || '',
            updated.organizationId,
            updated,
            existing,
            updates
          );
        } catch (error) {
          // エラーは既にsyncRelationToChroma内で処理されているため、ここではログのみ
          console.debug(`[updateRelation] ChromaDB同期エラー（処理は続行）: ${relationId}`, error);
        }
      } else {
        console.warn(`⚠️ [updateRelation] organizationIdが設定されていないため、ChromaDB同期をスキップ: ${relationId}`);
      }
      
      return updated;
    }
  } catch (error: any) {
    console.error('❌ [updateRelation] エラー:', error);
    throw error;
  }
}

/**
 * データベース操作のリトライ関数
 */
async function retryDbOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  delayMs: number = 200
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message || String(error || '');
      const errorString = String(error || '');
      const isLocked = errorMessage.includes('database is locked') || errorString.includes('database is locked');
      
      if (isLocked && i < maxRetries - 1) {
        // 指数バックオフ: 200ms, 400ms, 800ms, 1600ms
        const waitTime = delayMs * Math.pow(2, i);
        console.log(`⚠️ [retryDbOperation] データベースロック検出、${waitTime}ms後にリトライ... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/**
 * リレーションを削除
 */
export async function deleteRelation(relationId: string): Promise<void> {
  try {
    // 削除前にリレーション情報を取得（ChromaDB削除用）
    const existing = await retryDbOperation(() => getRelationById(relationId));
    const organizationId = existing?.organizationId;
    
    try {
      // Rust API経由で削除（未実装の場合はフォールバック）
      await retryDbOperation(() => apiDelete(`/api/relations/${relationId}`), 5, 200);
    } catch (error) {
      // フォールバック: Tauriコマンド経由（リトライ付き）
      console.warn('Rust API経由の削除に失敗、Tauriコマンドにフォールバック:', error);
      await retryDbOperation(() => callTauriCommand('doc_delete', {
        collectionName: 'relations',
        docId: relationId,
      }), 5, 200);
    }
    
    // ChromaDBからも削除（改善版: リトライ、エラー通知付き）
    if (organizationId) {
      try {
        const { deleteRelationFromChroma } = await import('./chromaSync');
        await deleteRelationFromChroma(relationId, organizationId);
      } catch (error) {
        // エラーは既にdeleteRelationFromChroma内で処理されているため、ここではログのみ
        console.debug(`[deleteRelation] ChromaDB削除エラー（処理は続行）: ${relationId}`, error);
      }
    }
    
    // キャッシュを無効化
    try {
      const { invalidateCacheForRelation } = await import('./ragSearchCache');
      invalidateCacheForRelation(relationId);
    } catch (error) {
      // キャッシュ無効化エラーは無視
      console.debug(`[deleteRelation] キャッシュ無効化エラー（無視）: ${relationId}`, error);
    }
  } catch (error: any) {
    console.error('❌ [deleteRelation] エラー:', error);
    throw error;
  }
}

/**
 * リレーションのバリデーション
 */
export async function validateRelation(relation: Relation): Promise<RelationValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 必須フィールドのチェック
  if (!relation.topicId) {
    errors.push('topicIdは必須です');
  }

  if (!relation.relationType) {
    errors.push('relationTypeは必須です');
  }

  // エンティティIDのチェック（エンティティが見つからない場合は警告のみ）
  // エンティティがまだ作成されていない場合や、タイミングの問題で見つからない場合でも
  // リレーションを保存できるようにするため、エラーではなく警告として扱う
  if (relation.sourceEntityId) {
    try {
      const sourceEntity = await getEntityById(relation.sourceEntityId);
      if (!sourceEntity) {
        warnings.push(`起点エンティティが見つかりません: ${relation.sourceEntityId}（リレーションは保存されます）`);
      }
    } catch (error) {
      // エンティティ取得に失敗した場合も警告として扱う
      warnings.push(`起点エンティティの取得に失敗しました: ${relation.sourceEntityId}（リレーションは保存されます）`);
    }
  }

  if (relation.targetEntityId) {
    try {
      const targetEntity = await getEntityById(relation.targetEntityId);
      if (!targetEntity) {
        warnings.push(`終点エンティティが見つかりません: ${relation.targetEntityId}（リレーションは保存されます）`);
      }
    } catch (error) {
      // エンティティ取得に失敗した場合も警告として扱う
      warnings.push(`終点エンティティの取得に失敗しました: ${relation.targetEntityId}（リレーションは保存されます）`);
    }
  }

  // エンティティ間リレーションの場合、両方のエンティティIDが必要
  if (relation.relationType !== 'related-to' && !relation.sourceEntityId && !relation.targetEntityId) {
    warnings.push('エンティティ間リレーションの場合、sourceEntityIdとtargetEntityIdの両方が推奨されます');
  }

  // 信頼度のチェック
  if (relation.confidence !== undefined) {
    if (relation.confidence < 0 || relation.confidence > 1) {
      errors.push('confidenceは0から1の間である必要があります');
    }
    if (relation.confidence < 0.5) {
      warnings.push('信頼度が低いリレーションです（0.5未満）');
    }
  }

  // 双方向リレーションの矛盾チェック（簡易版）
  if (relation.sourceEntityId && relation.targetEntityId) {
    // 同じエンティティ間の特定のリレーションタイプの矛盾をチェック
    if (relation.sourceEntityId === relation.targetEntityId) {
      if (['subsidiary', 'invests', 'employs'].includes(relation.relationType)) {
        warnings.push('同じエンティティ間でこのリレーションタイプは通常使用されません');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * リレーションパスを探索（A→B→Cの関係チェーン）
 */
export async function findRelationPath(
  startEntityId: string,
  endEntityId: string,
  maxDepth: number = 3
): Promise<Relation[][]> {
  try {
    const paths: Relation[][] = [];

    async function dfs(
      currentEntityId: string,
      targetEntityId: string,
      visited: Set<string>,
      path: Relation[],
      depth: number
    ) {
      if (depth > maxDepth) {
        return;
      }

      if (currentEntityId === targetEntityId && path.length > 0) {
        paths.push([...path]);
        return;
      }

      if (visited.has(currentEntityId)) {
        return;
      }

      visited.add(currentEntityId);

      // 現在のエンティティから出るリレーションを取得
      const relations = await getRelationsByEntityId(currentEntityId);

      for (const relation of relations) {
        const nextEntityId =
          relation.sourceEntityId === currentEntityId
            ? relation.targetEntityId
            : relation.sourceEntityId;

        if (nextEntityId && !visited.has(nextEntityId)) {
          path.push(relation);
          await dfs(nextEntityId, targetEntityId, new Set(visited), path, depth + 1);
          path.pop();
        }
      }
    }

    await dfs(startEntityId, endEntityId, new Set(), [], 0);

    // パスを長さでソート（短いパスを優先）
    return paths.sort((a, b) => a.length - b.length);
  } catch (error: any) {
    console.error('❌ [findRelationPath] エラー:', error);
    return [];
  }
}
