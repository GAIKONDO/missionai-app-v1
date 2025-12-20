'use client';

interface DataQualityReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataQualityReport: any;
}

export default function DataQualityReportModal({ isOpen, onClose, dataQualityReport }: DataQualityReportModalProps) {
  if (!isOpen || !dataQualityReport) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '900px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600 }}>
            データ品質レポート
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '4px 8px',
              backgroundColor: '#F3F4F6',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* 全体品質スコア */}
        <div style={{ 
          padding: '16px', 
          backgroundColor: dataQualityReport.overallQualityScore >= 80 ? '#F0FDF4' : dataQualityReport.overallQualityScore >= 60 ? '#FEF3C7' : '#FEE2E2',
          borderRadius: '8px',
          marginBottom: '24px',
          border: `2px solid ${dataQualityReport.overallQualityScore >= 80 ? '#10B981' : dataQualityReport.overallQualityScore >= 60 ? '#F59E0B' : '#EF4444'}`,
        }}>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>全体品質スコア</div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: dataQualityReport.overallQualityScore >= 80 ? '#065F46' : dataQualityReport.overallQualityScore >= 60 ? '#92400E' : '#991B1B' }}>
            {dataQualityReport.overallQualityScore.toFixed(1)} / 100
          </div>
        </div>

        {/* エンティティ品質 */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>エンティティ</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>総数</div>
              <div style={{ fontSize: '20px', fontWeight: 600 }}>{dataQualityReport.entities.totalEntities}</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#F0FDF4', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>埋め込みあり</div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#10B981' }}>{dataQualityReport.entities.entitiesWithEmbeddings}</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#FEE2E2', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>埋め込みなし</div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#EF4444' }}>{dataQualityReport.entities.entitiesWithoutEmbeddings}</div>
            </div>
          </div>
          <div style={{ padding: '8px 12px', backgroundColor: '#F9FAFB', borderRadius: '6px', marginBottom: '8px' }}>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>
              ChromaDB同期状況: <strong>
                {dataQualityReport.entities.chromaDbSyncStatus === 'synced' ? '✅ 同期済み' : 
                 dataQualityReport.entities.chromaDbSyncStatus === 'partial' ? '⚠️ 部分的' : 
                 dataQualityReport.entities.chromaDbSyncStatus === 'outdated' ? '❌ 未同期' : 
                 dataQualityReport.entities.chromaDbSyncStatus === 'not_used' ? 'N/A (ChromaDB無効)' : 
                 'N/A'}
              </strong>
            </div>
          </div>
          <div style={{ padding: '8px 12px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>
              品質スコア: <strong>{dataQualityReport.entities.qualityScore.toFixed(1)} / 100</strong>
            </div>
          </div>
        </div>

        {/* リレーション品質 */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>リレーション</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>総数</div>
              <div style={{ fontSize: '20px', fontWeight: 600 }}>{dataQualityReport.relations.totalRelations}</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#F0FDF4', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>埋め込みあり</div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#10B981' }}>{dataQualityReport.relations.relationsWithEmbeddings}</div>
            </div>
          </div>
        </div>

        {/* トピック品質 */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>トピック</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>総数</div>
              <div style={{ fontSize: '20px', fontWeight: 600 }}>{dataQualityReport.topics.totalTopics}</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#F0FDF4', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>埋め込みあり</div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#10B981' }}>{dataQualityReport.topics.topicsWithEmbeddings}</div>
            </div>
          </div>
        </div>

        {/* 不整合リスト */}
        {dataQualityReport.entities.inconsistencies.length > 0 || 
         dataQualityReport.relations.inconsistencies.length > 0 || 
         dataQualityReport.topics.inconsistencies.length > 0 ? (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#EF4444' }}>不整合</h3>
            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
              {[...dataQualityReport.entities.inconsistencies, ...dataQualityReport.relations.inconsistencies, ...dataQualityReport.topics.inconsistencies].map((inc, index) => (
                <div
                  key={index}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#FEE2E2',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    fontSize: '12px',
                    color: '#991B1B',
                  }}
                >
                  <strong>{inc.type}:</strong> {inc.details}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#F0FDF4', 
            borderRadius: '8px',
            textAlign: 'center',
            color: '#065F46',
            fontSize: '14px',
          }}>
            ✅ 不整合は見つかりませんでした
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#F3F4F6',
              color: '#6B7280',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

