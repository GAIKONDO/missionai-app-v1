'use client';

import { useRouter } from 'next/navigation';
import type { KnowledgeGraphSearchResult } from '@/lib/knowledgeGraphRAG';
import { clearSearchCache, getCacheStats } from '@/lib/ragSearchCache';
import { clearRAGSearchCache } from '../hooks/useRAGSearch';
import { checkAllEmbeddings } from '@/lib/checkEmbeddings';

interface SearchResultsHeaderProps {
  totalCount: number;
  groupedResults: {
    entities: KnowledgeGraphSearchResult[];
    relations: KnowledgeGraphSearchResult[];
    topics: KnowledgeGraphSearchResult[];
  };
  viewMode: 'list' | 'graph';
  onViewModeChange: (mode: 'list' | 'graph') => void;
  cacheStats: { memoryCacheSize: number; localStorageCacheSize: number; totalSize: number };
  onCacheStatsUpdate: (stats: { memoryCacheSize: number; localStorageCacheSize: number; totalSize: number }) => void;
  useCache: boolean;
  onUseCacheChange: (use: boolean) => void;
  selectedOrganizationId: string;
  onShowEmbeddingStats: () => void;
  onShowDataQualityReport: () => void;
  onShowEvaluationPanel: () => void;
  searchResults: KnowledgeGraphSearchResult[];
}

export default function SearchResultsHeader({
  totalCount,
  groupedResults,
  viewMode,
  onViewModeChange,
  cacheStats,
  onCacheStatsUpdate,
  useCache,
  onUseCacheChange,
  selectedOrganizationId,
  onShowEmbeddingStats,
  onShowDataQualityReport,
  onShowEvaluationPanel,
  searchResults,
}: SearchResultsHeaderProps) {
  const router = useRouter();

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(searchResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rag-search-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const csvRows = [
      ['タイプ', 'ID', '名前/説明', 'スコア', '類似度'],
      ...searchResults.map(result => {
        const safeScore = typeof result.score === 'number' && !isNaN(result.score) ? result.score : 0;
        const safeSimilarity = typeof result.similarity === 'number' && !isNaN(result.similarity) ? result.similarity : 0;
        
        if (result.entity) {
          return [
            'エンティティ',
            result.entity.id,
            result.entity.name,
            safeScore.toFixed(3),
            safeSimilarity.toFixed(3),
          ];
        } else if (result.relation) {
          return [
            'リレーション',
            result.relation.id,
            result.relation.description || result.relation.relationType,
            safeScore.toFixed(3),
            safeSimilarity.toFixed(3),
          ];
        } else {
          return [
            'トピック',
            result.topicId || '',
            '',
            safeScore.toFixed(3),
            safeSimilarity.toFixed(3),
          ];
        }
      }),
    ];
    const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const dataBlob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rag-search-results-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClearCache = () => {
    if (confirm('キャッシュをクリアしますか？')) {
      clearSearchCache(); // lib/ragSearchCache.tsのキャッシュ
      clearRAGSearchCache(); // useRAGSearchフック内のキャッシュ
      onCacheStatsUpdate({ memoryCacheSize: 0, localStorageCacheSize: 0, totalSize: 0 });
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937' }}>
        検索結果 ({totalCount}件)
      </h2>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px', fontSize: '14px', color: '#6B7280' }}>
          <span>エンティティ: {groupedResults.entities.length}</span>
          <span>リレーション: {groupedResults.relations.length}</span>
          <span>トピック: {groupedResults.topics.length}</span>
        </div>
        
        {/* ビューモード切り替え */}
        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#F3F4F6', borderRadius: '6px', padding: '2px' }}>
          <button
            onClick={() => onViewModeChange('list')}
            style={{
              padding: '6px 12px',
              backgroundColor: viewMode === 'list' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'list' ? '#1F2937' : '#6B7280',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: viewMode === 'list' ? 500 : 400,
              cursor: 'pointer',
              boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            リスト
          </button>
          <button
            onClick={() => onViewModeChange('graph')}
            style={{
              padding: '6px 12px',
              backgroundColor: viewMode === 'graph' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'graph' ? '#1F2937' : '#6B7280',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: viewMode === 'graph' ? 500 : 400,
              cursor: 'pointer',
              boxShadow: viewMode === 'graph' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            グラフ
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* キャッシュ統計 */}
          {cacheStats.totalSize > 0 && (
            <div style={{ 
              fontSize: '12px', 
              color: '#6B7280',
              padding: '4px 8px',
              backgroundColor: '#F3F4F6',
              borderRadius: '4px',
            }}>
              キャッシュ: {cacheStats.totalSize}件
            </div>
          )}
          
          {/* キャッシュ設定 */}
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            fontSize: '12px',
            color: '#6B7280',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={useCache}
              onChange={(e) => onUseCacheChange(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            キャッシュ使用
          </label>
          
          {cacheStats.totalSize > 0 && (
            <button
              onClick={handleClearCache}
              style={{
                padding: '4px 8px',
                backgroundColor: '#FEF2F2',
                color: '#991B1B',
                border: '1px solid #FECACA',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
              title="キャッシュをクリア"
            >
              キャッシュクリア
            </button>
          )}
          
          {/* 埋め込みベクトル統計 */}
          <button
            onClick={onShowEmbeddingStats}
            style={{
              padding: '4px 8px',
              backgroundColor: '#EFF6FF',
              color: '#1E40AF',
              border: '1px solid #BFDBFE',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
            title="埋め込みベクトルの次元数と存在を確認"
          >
            埋め込み統計
          </button>
          
          {/* データ品質レポート */}
          <button
            onClick={onShowDataQualityReport}
            style={{
              padding: '4px 8px',
              backgroundColor: '#F0FDF4',
              color: '#166534',
              border: '1px solid #BBF7D0',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
            title="データ品質レポートを生成"
          >
            データ品質
          </button>
          
          {/* 評価・テストシステム */}
          <button
            onClick={onShowEvaluationPanel}
            style={{
              padding: '4px 8px',
              backgroundColor: '#FEF3C7',
              color: '#92400E',
              border: '1px solid #FDE68A',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
            title="評価・テストシステム"
          >
            評価・テスト
          </button>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleExportJSON}
              style={{
                padding: '6px 12px',
                backgroundColor: '#F3F4F6',
                color: '#6B7280',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
              title="JSON形式でエクスポート"
            >
              JSON
            </button>
            <button
              onClick={handleExportCSV}
              style={{
                padding: '6px 12px',
                backgroundColor: '#F3F4F6',
                color: '#6B7280',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
              title="CSV形式でエクスポート"
            >
              CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

