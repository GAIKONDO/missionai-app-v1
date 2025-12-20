import { useState } from 'react';
import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import type { KnowledgeGraphSearchResult } from '@/lib/knowledgeGraphRAG';
import { getAllRelations } from '@/lib/relationApi';
import { getEntityById } from '@/lib/entityApi';

const isDev = process.env.NODE_ENV === 'development';
const devWarn = (...args: any[]) => {
  if (isDev) {
    console.warn(...args);
  }
};

export function useGraphData() {
  const [graphEntities, setGraphEntities] = useState<Entity[]>([]);
  const [graphRelations, setGraphRelations] = useState<Relation[]>([]);
  const [isLoadingGraphData, setIsLoadingGraphData] = useState(false);

  // 検索結果からグラフデータを準備
  const prepareGraphData = async (results: KnowledgeGraphSearchResult[]) => {
    setIsLoadingGraphData(true);
    try {
      const entities: Entity[] = [];
      const relations: Relation[] = [];
      const entityIds = new Set<string>();
      const relationIds = new Set<string>();

      // エンティティを収集
      for (const result of results) {
        if (result.type === 'entity' && result.entity && !entityIds.has(result.entity.id)) {
          entities.push(result.entity);
          entityIds.add(result.entity.id);
        }
      }

      // リレーションを収集（検索結果に含まれるリレーション）
      for (const result of results) {
        if (result.type === 'relation' && result.relation && !relationIds.has(result.relation.id)) {
          relations.push(result.relation);
          relationIds.add(result.relation.id);
        }
      }

      // エンティティ間のリレーションを取得（検索結果のエンティティに関連するリレーション）
      // 最適化: getAllRelations()を1回だけ呼び出す
      try {
        const allRelations = await getAllRelations();
        
        // 各エンティティに関連するリレーションをフィルタリング
        for (const entity of entities) {
          const relatedRelations = allRelations.filter(rel => 
            (rel.sourceEntityId === entity.id || rel.targetEntityId === entity.id) &&
            !relationIds.has(rel.id)
          );
          
          for (const rel of relatedRelations) {
            // リレーションの両端のエンティティが検索結果に含まれているか、または関連エンティティを追加
            const sourceInResults = entityIds.has(rel.sourceEntityId || '');
            const targetInResults = entityIds.has(rel.targetEntityId || '');
            
            if (sourceInResults || targetInResults) {
              relations.push(rel);
              relationIds.add(rel.id);
              
              // 関連エンティティも追加（まだ含まれていない場合）
              if (rel.sourceEntityId && !entityIds.has(rel.sourceEntityId)) {
                try {
                  const sourceEntity = await getEntityById(rel.sourceEntityId);
                  if (sourceEntity) {
                    entities.push(sourceEntity);
                    entityIds.add(sourceEntity.id);
                  }
                } catch (error) {
                  // エンティティ取得エラーは無視
                }
              }
              
              if (rel.targetEntityId && !entityIds.has(rel.targetEntityId)) {
                try {
                  const targetEntity = await getEntityById(rel.targetEntityId);
                  if (targetEntity) {
                    entities.push(targetEntity);
                    entityIds.add(targetEntity.id);
                  }
                } catch (error) {
                  // エンティティ取得エラーは無視
                }
              }
            }
          }
        }
      } catch (error) {
        devWarn('関連リレーション取得エラー:', error);
        // エラーが発生しても処理を続行
      }

      setGraphEntities(entities);
      setGraphRelations(relations);
    } catch (error) {
      console.error('グラフデータの準備エラー:', error);
    } finally {
      setIsLoadingGraphData(false);
    }
  };

  // グラフデータをリセット
  const resetGraphData = () => {
    setGraphEntities([]);
    setGraphRelations([]);
  };

  return {
    graphEntities,
    graphRelations,
    isLoadingGraphData,
    prepareGraphData,
    resetGraphData,
  };
}

