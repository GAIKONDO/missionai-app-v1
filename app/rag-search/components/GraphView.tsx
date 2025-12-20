'use client';

import KnowledgeGraph2D from '@/components/KnowledgeGraph2D';
import type { KnowledgeGraphSearchResult } from '@/lib/knowledgeGraphRAG';
import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';

interface GraphViewProps {
  graphEntities: Entity[];
  graphRelations: Relation[];
  isLoadingGraphData: boolean;
  searchResults: KnowledgeGraphSearchResult[];
  onEntityClick: (result: KnowledgeGraphSearchResult) => void;
}

export default function GraphView({
  graphEntities,
  graphRelations,
  isLoadingGraphData,
  searchResults,
  onEntityClick,
}: GraphViewProps) {
  return (
    <div style={{ 
      height: '600px', 
      border: '1px solid #E5E7EB', 
      borderRadius: '8px', 
      overflow: 'hidden',
      backgroundColor: '#FFFFFF',
    }}>
      {isLoadingGraphData ? (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: '#6B7280',
        }}>
          グラフデータを準備中...
        </div>
      ) : graphEntities.length === 0 ? (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: '#9CA3AF',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <div style={{ fontSize: '48px' }}>📊</div>
          <div style={{ fontSize: '14px' }}>グラフ表示するデータがありません</div>
          <div style={{ fontSize: '12px', color: '#D1D5DB' }}>
            エンティティまたはリレーションを含む検索結果が必要です
          </div>
        </div>
      ) : (
        <KnowledgeGraph2D
          entities={graphEntities}
          relations={graphRelations}
          isLoading={false}
          maxNodes={200}
          onEntityClick={(entity) => {
            const result = searchResults.find(r => r.entity?.id === entity.id);
            if (result) {
              onEntityClick(result);
            }
          }}
        />
      )}
    </div>
  );
}

