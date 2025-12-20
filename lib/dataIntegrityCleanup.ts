/**
 * データ整合性クリーンアップユーティリティ
 * 存在しないトピックIDを注力施策のtopicIds配列から削除
 */

import { callTauriCommand } from './localFirebase';
import { getAllTopicsBatch } from './orgApi';
import type { FocusInitiative } from './orgApi';

/**
 * 存在しないトピックIDを注力施策のtopicIds配列から削除
 * 
 * @param organizationId 組織ID（オプション、指定しない場合は全組織）
 * @returns クリーンアップ結果
 */
export async function cleanupMissingTopicIds(
  organizationId?: string
): Promise<{
  cleanedInitiatives: number;
  removedTopicIds: number;
  errors: Array<{ initiativeId: string; error: string }>;
}> {
  console.log('🧹 [データ整合性クリーンアップ] 開始...');
  
  let cleanedInitiatives = 0;
  let removedTopicIds = 0;
  const errors: Array<{ initiativeId: string; error: string }> = [];

  try {
    // 1. すべてのトピックを取得（存在するトピックIDのセットを作成）
    console.log('📊 [データ整合性クリーンアップ] トピック一覧を取得中...');
    const allTopics = await getAllTopicsBatch();
    // organizationIdでフィルタリング（指定されている場合）
    const filteredTopics = organizationId 
      ? allTopics.filter(t => t.organizationId === organizationId)
      : allTopics;
    const validTopicIds = new Set<string>(filteredTopics.map(t => t.id));
    console.log(`✅ [データ整合性クリーンアップ] 有効なトピックID数: ${validTopicIds.size}件`);

    // 2. すべての注力施策を取得
    console.log('📊 [データ整合性クリーンアップ] 注力施策一覧を取得中...');
    const initiativesResult = await callTauriCommand('query_get', {
      collectionName: 'focusInitiatives',
      conditions: organizationId ? { organizationId } : {},
    }) as Array<{ id: string; data: any }>;

    const initiatives = initiativesResult || [];
    console.log(`✅ [データ整合性クリーンアップ] 注力施策数: ${initiatives.length}件`);

    // 3. 各注力施策のtopicIdsをチェック
    for (const initiativeDoc of initiatives) {
      const initiativeId = initiativeDoc.id || initiativeDoc.data?.id;
      const initiativeData = initiativeDoc.data || initiativeDoc;
      
      if (!initiativeId) {
        console.warn('⚠️ [データ整合性クリーンアップ] 注力施策IDが取得できません:', initiativeDoc);
        continue;
      }

      const topicIds = initiativeData.topicIds;
      
      // topicIdsが存在しない、または空の場合はスキップ
      if (!topicIds || !Array.isArray(topicIds) || topicIds.length === 0) {
        continue;
      }

      // 4. 存在しないトピックIDをフィルタリング
      const validTopicIdsArray = topicIds.filter((topicId: string) => {
        if (!topicId || typeof topicId !== 'string') {
          return false;
        }
        return validTopicIds.has(topicId);
      });

      const removedCount = topicIds.length - validTopicIdsArray.length;

      // 5. 削除されたトピックIDがある場合のみ更新
      if (removedCount > 0) {
        try {
          console.log(`🧹 [データ整合性クリーンアップ] 注力施策「${initiativeData.title || initiativeId}」から${removedCount}件の無効なトピックIDを削除:`, {
            initiativeId,
            beforeCount: topicIds.length,
            afterCount: validTopicIdsArray.length,
            removedTopicIds: topicIds.filter((id: string) => !validTopicIds.has(id)),
          });

          // 注力施策のtopicIdsを更新（既存データを取得してマージ）
          const existingDoc = await callTauriCommand('doc_get', {
            collectionName: 'focusInitiatives',
            docId: initiativeId,
          }) as { exists: boolean; data?: any };
          
          if (existingDoc?.exists && existingDoc?.data) {
            await callTauriCommand('doc_set', {
              collectionName: 'focusInitiatives',
              docId: initiativeId,
              data: {
                ...existingDoc.data,
                topicIds: validTopicIdsArray,
                updatedAt: new Date().toISOString(),
              },
            });
          } else {
            console.warn(`⚠️ [データ整合性クリーンアップ] 注力施策「${initiativeId}」が見つかりません`);
          }

          cleanedInitiatives++;
          removedTopicIds += removedCount;
        } catch (error: any) {
          const errorMessage = error?.message || String(error);
          console.error(`❌ [データ整合性クリーンアップ] 注力施策「${initiativeData.title || initiativeId}」の更新に失敗:`, errorMessage);
          errors.push({
            initiativeId,
            error: errorMessage,
          });
        }
      }
    }

    console.log(`✅ [データ整合性クリーンアップ] 完了: ${cleanedInitiatives}件の注力施策をクリーンアップ、${removedTopicIds}件の無効なトピックIDを削除`);
    
    return {
      cleanedInitiatives,
      removedTopicIds,
      errors,
    };
  } catch (error: any) {
    console.error('❌ [データ整合性クリーンアップ] エラー:', error);
    throw error;
  }
}

/**
 * データ整合性チェック（クリーンアップは実行しない）
 * 
 * @param organizationId 組織ID（オプション）
 * @returns 不整合の詳細
 */
export async function checkDataIntegrity(
  organizationId?: string
): Promise<{
  initiativesWithMissingTopics: Array<{
    initiativeId: string;
    initiativeTitle: string;
    missingTopicIds: string[];
    totalTopicIds: number;
  }>;
  totalMissingTopicIds: number;
}> {
  console.log('🔍 [データ整合性チェック] 開始...');

  const initiativesWithMissingTopics: Array<{
    initiativeId: string;
    initiativeTitle: string;
    missingTopicIds: string[];
    totalTopicIds: number;
  }> = [];
  let totalMissingTopicIds = 0;

  try {
    // 1. すべてのトピックを取得
    const allTopics = await getAllTopicsBatch();
    // organizationIdでフィルタリング（指定されている場合）
    const filteredTopics = organizationId 
      ? allTopics.filter(t => t.organizationId === organizationId)
      : allTopics;
    const validTopicIds = new Set<string>(filteredTopics.map(t => t.id));

    // 2. すべての注力施策を取得
    const initiativesResult = await callTauriCommand('query_get', {
      collectionName: 'focusInitiatives',
      conditions: organizationId ? { organizationId } : {},
    }) as Array<{ id: string; data: any }>;

    const initiatives = initiativesResult || [];

    // 3. 各注力施策のtopicIdsをチェック
    for (const initiativeDoc of initiatives) {
      const initiativeId = initiativeDoc.id || initiativeDoc.data?.id;
      const initiativeData = initiativeDoc.data || initiativeDoc;
      
      if (!initiativeId) {
        continue;
      }

      const topicIds = initiativeData.topicIds;
      
      if (!topicIds || !Array.isArray(topicIds) || topicIds.length === 0) {
        continue;
      }

      // 存在しないトピックIDを検出
      const missingTopicIds = topicIds.filter((topicId: string) => {
        if (!topicId || typeof topicId !== 'string') {
          return true; // 無効なIDも「見つからない」として扱う
        }
        return !validTopicIds.has(topicId);
      });

      if (missingTopicIds.length > 0) {
        initiativesWithMissingTopics.push({
          initiativeId,
          initiativeTitle: initiativeData.title || initiativeId,
          missingTopicIds,
          totalTopicIds: topicIds.length,
        });
        totalMissingTopicIds += missingTopicIds.length;
      }
    }

    console.log(`✅ [データ整合性チェック] 完了: ${initiativesWithMissingTopics.length}件の注力施策に不整合、合計${totalMissingTopicIds}件の無効なトピックID`);
    
    return {
      initiativesWithMissingTopics,
      totalMissingTopicIds,
    };
  } catch (error: any) {
    console.error('❌ [データ整合性チェック] エラー:', error);
    throw error;
  }
}
