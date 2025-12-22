'use client';

import { useState, useCallback } from 'react';
import { getAllEntities, deleteEntity } from '@/lib/entityApi';
import { getRelationsByEntityId, deleteRelation, getAllRelations } from '@/lib/relationApi';
import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';

// 開発環境でのみログを有効化するヘルパー関数
const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args: any[]) => {
  if (isDev) {
    console.log(...args);
  }
};
const devWarn = (...args: any[]) => {
  if (isDev) {
    console.warn(...args);
  }
};

interface UseEntityDeletionProps {
  entities: Entity[];
  setEntities: React.Dispatch<React.SetStateAction<Entity[]>>;
  setRelations: React.Dispatch<React.SetStateAction<Relation[]>>;
  selectedEntityIds: Set<string>;
  setSelectedEntityIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

interface UseEntityDeletionReturn {
  deleteTargetEntityId: string | null;
  setDeleteTargetEntityId: (id: string | null) => void;
  showDeleteEntityModal: boolean;
  setShowDeleteEntityModal: (show: boolean) => void;
  isDeletingEntity: boolean;
  showBulkDeleteModal: boolean;
  setShowBulkDeleteModal: (show: boolean) => void;
  isBulkDeleting: boolean;
  handleDeleteEntity: () => Promise<void>;
  handleBulkDeleteEntities: () => Promise<void>;
}

export function useEntityDeletion({
  entities,
  setEntities,
  setRelations,
  selectedEntityIds,
  setSelectedEntityIds,
}: UseEntityDeletionProps): UseEntityDeletionReturn {
  const [deleteTargetEntityId, setDeleteTargetEntityId] = useState<string | null>(null);
  const [showDeleteEntityModal, setShowDeleteEntityModal] = useState(false);
  const [isDeletingEntity, setIsDeletingEntity] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // エンティティ削除処理
  const handleDeleteEntity = useCallback(async () => {
    if (!deleteTargetEntityId) {
      devWarn('⚠️ [handleDeleteEntity] 削除対象が設定されていません');
      return;
    }
    
    const entityId = deleteTargetEntityId;
    const entity = entities.find(e => e.id === entityId);
    
    if (!entity) {
      devWarn('⚠️ [handleDeleteEntity] エンティティが見つかりません:', entityId);
      setShowDeleteEntityModal(false);
      setDeleteTargetEntityId(null);
      return;
    }
    
    setIsDeletingEntity(true);
    
    try {
      const { callTauriCommand } = await import('@/lib/localFirebase');
      
      // 1. このエンティティに関連するリレーションを取得
      devLog('📊 [handleDeleteEntity] リレーション取得開始:', entityId);
      const relatedRelations = await getRelationsByEntityId(entityId);
      devLog(`📊 [handleDeleteEntity] 削除対象リレーション: ${relatedRelations.length}件`);
      
      // 2. 関連するリレーションを削除
      for (const relation of relatedRelations) {
        try {
          await deleteRelation(relation.id);
        } catch (error: any) {
          devWarn(`⚠️ [handleDeleteEntity] リレーション削除エラー（続行します）:`, error);
        }
      }
      
      // 3. ChromaDBの埋め込みデータを削除（非同期、エラーは無視）
      if (entity.organizationId) {
        (async () => {
          try {
            const { callTauriCommand: chromaCallTauriCommand } = await import('@/lib/localFirebase');
            await chromaCallTauriCommand('chromadb_delete_entity_embedding', {
              entityId: entity.id,
              organizationId: entity.organizationId,
            });
          } catch (error: any) {
            devWarn(`⚠️ [handleDeleteEntity] ChromaDBエンティティ埋め込み削除エラー（続行します）:`, error);
          }
        })();
      }
      
      // 4. エンティティを削除（SQLite）
      await deleteEntity(entity.id);
      devLog(`✅ [handleDeleteEntity] エンティティ削除: ${entity.id} (${entity.name})`);
      
      // 5. データを再読み込み
      const [allEntities, allRelations] = await Promise.all([
        getAllEntities(),
        getAllRelations(),
      ]);
      
      setEntities(allEntities);
      setRelations(allRelations);
      
      // モーダルを閉じる
      setShowDeleteEntityModal(false);
      setDeleteTargetEntityId(null);
      
      alert(`エンティティ「${entity.name}」を削除しました。`);
    } catch (error: any) {
      console.error('❌ [handleDeleteEntity] エンティティ削除エラー:', error);
      alert(`エンティティの削除に失敗しました: ${error?.message || String(error)}`);
    } finally {
      setIsDeletingEntity(false);
    }
  }, [deleteTargetEntityId, entities, setEntities, setRelations]);

  // 一括削除処理
  const handleBulkDeleteEntities = useCallback(async () => {
    if (selectedEntityIds.size === 0) {
      devWarn('⚠️ [handleBulkDeleteEntities] 削除対象が選択されていません');
      return;
    }
    
    setIsBulkDeleting(true);
    
    try {
      const { callTauriCommand } = await import('@/lib/localFirebase');
      const entityIdsArray = Array.from(selectedEntityIds);
      let successCount = 0;
      let errorCount = 0;
      const errors: Array<{ entityId: string; error: string }> = [];
      
      devLog(`📊 [handleBulkDeleteEntities] 一括削除開始: ${entityIdsArray.length}件`);
      
      // 各エンティティを順次削除
      for (let i = 0; i < entityIdsArray.length; i++) {
        const entityId = entityIdsArray[i];
        const entity = entities.find(e => e.id === entityId);
        
        if (!entity) {
          devWarn(`⚠️ [handleBulkDeleteEntities] エンティティが見つかりません: ${entityId}`);
          errorCount++;
          errors.push({ entityId, error: 'エンティティが見つかりません' });
          continue;
        }
        
        try {
          // 1. このエンティティに関連するリレーションを取得
          const relatedRelations = await getRelationsByEntityId(entityId);
          
          // 2. 関連するリレーションを削除
          for (const relation of relatedRelations) {
            try {
              await deleteRelation(relation.id);
            } catch (error: any) {
              devWarn(`⚠️ [handleBulkDeleteEntities] リレーション削除エラー（続行します）:`, error);
            }
          }
          
          // 3. ChromaDBの埋め込みデータを削除（非同期、エラーは無視）
          if (entity.organizationId) {
            (async () => {
              try {
                const { callTauriCommand: chromaCallTauriCommand } = await import('@/lib/localFirebase');
                await chromaCallTauriCommand('chromadb_delete_entity_embedding', {
                  entity_id: entity.id,
                  organization_id: entity.organizationId,
                });
              } catch (error: any) {
                // エラーは無視
              }
            })();
          }
          
          // 4. エンティティを削除（SQLite）
          await deleteEntity(entity.id);
          successCount++;
        } catch (error: any) {
          errorCount++;
          const errorMessage = error?.message || String(error);
          errors.push({ entityId, error: errorMessage });
          console.error(`❌ [handleBulkDeleteEntities] エンティティ削除エラー (${i + 1}/${entityIdsArray.length}): ${entity.id}`, error);
        }
      }
      
      // 5. データを再読み込み
      const [allEntities, allRelations] = await Promise.all([
        getAllEntities(),
        getAllRelations(),
      ]);
      
      setEntities(allEntities);
      setRelations(allRelations);
      
      // 選択をクリア
      setSelectedEntityIds(new Set());
      setShowBulkDeleteModal(false);
      
      // 結果を表示
      if (errorCount === 0) {
        alert(`${successCount}件のエンティティを削除しました。`);
      } else {
        alert(`${successCount}件のエンティティを削除しました。\n${errorCount}件の削除に失敗しました。\n\nエラー詳細:\n${errors.map(e => `- ${e.entityId}: ${e.error}`).join('\n')}`);
      }
    } catch (error: any) {
      console.error('❌ [handleBulkDeleteEntities] 一括削除エラー:', error);
      alert(`一括削除に失敗しました: ${error?.message || String(error)}`);
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedEntityIds, entities, setEntities, setRelations, setSelectedEntityIds]);

  return {
    deleteTargetEntityId,
    setDeleteTargetEntityId,
    showDeleteEntityModal,
    setShowDeleteEntityModal,
    isDeletingEntity,
    selectedEntityIds,
    setSelectedEntityIds,
    showBulkDeleteModal,
    setShowBulkDeleteModal,
    isBulkDeleting,
    handleDeleteEntity,
    handleBulkDeleteEntities,
  };
}
