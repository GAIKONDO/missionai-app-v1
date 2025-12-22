import { useCallback } from 'react';
import type { TopicInfo } from '@/lib/orgApi';
import type { Entity, EntityType } from '@/types/entity';
import type { Relation, RelationType } from '@/types/relation';

interface UseEntityRelationManagementProps {
  selectedTopic: TopicInfo | null;
  pendingEntities: Entity[] | null;
  setPendingEntities: (entities: Entity[] | null) => void;
  pendingRelations: Relation[] | null;
  setPendingRelations: (relations: Relation[] | null) => void;
  topicEntities: Entity[];
  setTopicEntities: (entities: Entity[]) => void;
  topicRelations: Relation[];
  setTopicRelations: (relations: Relation[]) => void;
  editingEntity: Entity | null;
  setEditingEntity: (entity: Entity | null) => void;
  editingRelation: Relation | null;
  setEditingRelation: (relation: Relation | null) => void;
  showAddEntityModal: boolean;
  setShowAddEntityModal: (value: boolean) => void;
  showAddRelationModal: boolean;
  setShowAddRelationModal: (value: boolean) => void;
  isExporting: boolean;
  setIsExporting: (value: boolean) => void;
  exportSuccess: boolean;
  setExportSuccess: (value: boolean) => void;
}

export function useEntityRelationManagement({
  selectedTopic,
  pendingEntities,
  setPendingEntities,
  pendingRelations,
  setPendingRelations,
  topicEntities,
  setTopicEntities,
  topicRelations,
  setTopicRelations,
  editingEntity,
  setEditingEntity,
  editingRelation,
  setEditingRelation,
  showAddEntityModal,
  setShowAddEntityModal,
  showAddRelationModal,
  setShowAddRelationModal,
  isExporting,
  setIsExporting,
  exportSuccess,
  setExportSuccess,
}: UseEntityRelationManagementProps) {
  // エンティティ保存ハンドラー
  const handleEntitySave = useCallback(async (data: { name: string; type: EntityType; aliases?: string[]; metadata?: any }) => {
    if (!selectedTopic) return;

    try {
      const { createEntity, updateEntity } = await import('@/lib/entityApi');
      
      if (editingEntity) {
        // 更新
        const updated = await updateEntity(editingEntity.id, data);
        if (!updated) {
          throw new Error('エンティティの更新に失敗しました');
        }
        if (pendingEntities) {
          setPendingEntities(pendingEntities.map(e => e.id === editingEntity.id ? updated : e));
        } else {
          setTopicEntities(topicEntities.map(e => e.id === editingEntity.id ? updated : e));
        }
        alert('エンティティを更新しました');
      } else {
        // 新規作成
        const created = await createEntity({
          ...data,
          organizationId: selectedTopic.organizationId,
          companyId: selectedTopic.companyId || undefined,
          metadata: {
            ...data.metadata,
            topicId: selectedTopic.id,
          },
        });
        // pendingEntitiesがnullの場合は初期化してから追加
        if (pendingEntities) {
          setPendingEntities([...pendingEntities, created]);
        } else {
          // pendingEntitiesを初期化して、既存のtopicEntitiesと新しいエンティティを含める
          setPendingEntities([...topicEntities, created]);
        }
        console.log('✅ [手動追加] エンティティを追加しました:', {
          entityId: created.id,
          entityName: created.name,
          pendingEntitiesCount: pendingEntities ? pendingEntities.length + 1 : topicEntities.length + 1,
        });
        alert('エンティティを追加しました');
      }
      
      setShowAddEntityModal(false);
      setEditingEntity(null);
    } catch (error: any) {
      console.error('❌ エンティティ保存エラー:', error);
      alert(`エンティティの保存に失敗しました: ${error.message}`);
    }
  }, [
    selectedTopic,
    editingEntity,
    pendingEntities,
    topicEntities,
    setPendingEntities,
    setTopicEntities,
    setShowAddEntityModal,
    setEditingEntity,
  ]);

  // リレーション保存ハンドラー
  const handleRelationSave = useCallback(async (data: { sourceEntityId: string; targetEntityId: string; relationType: RelationType; description?: string }) => {
    if (!selectedTopic) return;

    try {
      const { createRelation, updateRelation } = await import('@/lib/relationApi');
      
      if (editingRelation) {
        // 更新
        const updated = await updateRelation(editingRelation.id, data);
        if (!updated) {
          throw new Error('リレーションの更新に失敗しました');
        }
        if (pendingRelations) {
          setPendingRelations(pendingRelations.map(r => r.id === editingRelation.id ? updated : r));
        } else {
          setTopicRelations(topicRelations.map(r => r.id === editingRelation.id ? updated : r));
        }
        alert('リレーションを更新しました');
      } else {
        // 新規作成
        const created = await createRelation({
          ...data,
          topicId: `${selectedTopic.meetingNoteId}-topic-${selectedTopic.id}`,
          organizationId: selectedTopic.organizationId,
          companyId: selectedTopic.companyId || undefined, // 事業会社IDも設定
        });
        // pendingRelationsがnullの場合は初期化してから追加
        if (pendingRelations) {
          setPendingRelations([...pendingRelations, created]);
        } else {
          // pendingRelationsを初期化して、既存のtopicRelationsと新しいリレーションを含める
          setPendingRelations([...topicRelations, created]);
        }
        console.log('✅ [手動追加] リレーションを追加しました:', {
          relationId: created.id,
          relationType: created.relationType,
          pendingRelationsCount: pendingRelations ? pendingRelations.length + 1 : topicRelations.length + 1,
        });
        alert('リレーションを追加しました');
      }
      
      setShowAddRelationModal(false);
      setEditingRelation(null);
    } catch (error: any) {
      console.error('❌ リレーション保存エラー:', error);
      alert(`リレーションの保存に失敗しました: ${error.message}`);
    }
  }, [
    selectedTopic,
    editingRelation,
    pendingRelations,
    topicRelations,
    setPendingRelations,
    setTopicRelations,
    setShowAddRelationModal,
    setEditingRelation,
  ]);

  // エクスポートハンドラー
  const handleExport = useCallback(async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    setExportSuccess(false);
    
    try {
      const allEntities = (pendingEntities && pendingEntities.length > 0) ? pendingEntities : (topicEntities || []);
      const allRelations = (pendingRelations && pendingRelations.length > 0) ? pendingRelations : (topicRelations || []);
      
      // CSV形式でエクスポート
      const csvRows: string[] = [];
      
      // エンティティCSV
      csvRows.push('=== エンティティ ===');
      csvRows.push('ID,名前,タイプ,別名');
      allEntities.forEach(e => {
        csvRows.push(`"${e.id}","${e.name}","${e.type}","${(e.aliases || []).join('; ')}"`);
      });
      
      csvRows.push('');
      csvRows.push('=== リレーション ===');
      csvRows.push('ID,起点エンティティID,終点エンティティID,リレーションタイプ,説明');
      allRelations.forEach(r => {
        const sourceName = allEntities.find(e => e.id === r.sourceEntityId)?.name || r.sourceEntityId;
        const targetName = allEntities.find(e => e.id === r.targetEntityId)?.name || r.targetEntityId;
        csvRows.push(`"${r.id}","${sourceName}","${targetName}","${r.relationType}","${r.description || ''}"`);
      });
      
      const csvStr = csvRows.join('\n');
      const blob = new Blob(['\uFEFF' + csvStr], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `knowledge-graph-${selectedTopic?.id || 'export'}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error('❌ CSVエクスポートエラー:', error);
      alert(`CSVエクスポートに失敗しました: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  }, [
    pendingEntities,
    topicEntities,
    pendingRelations,
    topicRelations,
    selectedTopic,
    isExporting,
    setIsExporting,
    setExportSuccess,
  ]);

  return {
    handleEntitySave,
    handleRelationSave,
    handleExport,
  };
}

