interface DataIntegritySectionProps {
  setShowCleanupConfirm: (value: boolean) => void;
  setShowRepairEntityConfirm: (value: boolean) => void;
  setShowRepairRelationConfirm: (value: boolean) => void;
  setShowRepairTopicConfirm: (value: boolean) => void;
}

export default function DataIntegritySection({
  setShowCleanupConfirm,
  setShowRepairEntityConfirm,
  setShowRepairRelationConfirm,
  setShowRepairTopicConfirm,
}: DataIntegritySectionProps) {
  return (
    <>
      {/* データ整合性クリーンアップ */}
      <div style={{
        padding: '12px',
        backgroundColor: '#FEF3C7',
        borderRadius: '6px',
        border: '1px solid #FCD34D',
        marginTop: '12px',
        pointerEvents: 'auto',
      }}>
        <div style={{ fontSize: '12px', color: '#92400E', marginBottom: '8px', fontWeight: 500 }}>
          🧹 データ整合性クリーンアップ
        </div>
        <div style={{ fontSize: '11px', color: '#78350F', marginBottom: '8px' }}>
          注力施策のtopicIds配列から、存在しないトピックIDを自動的に削除します。
          <br />
          （コンソールに「トピックが見つかりませんでした」という警告が表示される場合に実行してください）
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔘 [データ整合性クリーンアップ] ボタンがクリックされました');
            setShowCleanupConfirm(true);
          }}
          style={{
            padding: '6px 12px',
            backgroundColor: '#F59E0B',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 500,
            marginRight: '8px',
            position: 'relative',
            zIndex: 10,
            pointerEvents: 'auto',
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔘 [データ整合性クリーンアップ] ボタンがmousedownされました');
          }}
        >
          クリーンアップを実行
        </button>
      </div>
      
      {/* 同期状態修復 */}
      <div style={{
        padding: '12px',
        backgroundColor: '#DBEAFE',
        borderRadius: '6px',
        border: '1px solid #60A5FA',
        marginTop: '12px',
        pointerEvents: 'auto',
      }}>
        <div style={{ fontSize: '12px', color: '#1E40AF', marginBottom: '8px', fontWeight: 500 }}>
          🔧 同期状態修復
        </div>
        <div style={{ fontSize: '11px', color: '#1E3A8A', marginBottom: '12px' }}>
          SQLiteのchromaSyncedフラグとChromaDBの実際のデータを比較して、不整合を自動修復します。
          <br />
          （「スキップ: 24件」と表示される場合に実行してください）
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔘 [同期状態修復] エンティティ修復ボタンがクリックされました');
              setShowRepairEntityConfirm(true);
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: '#3B82F6',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 500,
              position: 'relative',
              zIndex: 10,
              pointerEvents: 'auto',
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔘 [同期状態修復] エンティティ修復ボタンがmousedownされました');
            }}
          >
            エンティティ修復
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔘 [同期状態修復] リレーション修復ボタンがクリックされました');
              setShowRepairRelationConfirm(true);
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: '#3B82F6',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 500,
              position: 'relative',
              zIndex: 10,
              pointerEvents: 'auto',
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔘 [同期状態修復] リレーション修復ボタンがmousedownされました');
            }}
          >
            リレーション修復
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔘 [同期状態修復] トピック修復ボタンがクリックされました');
              setShowRepairTopicConfirm(true);
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: '#3B82F6',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 500,
              position: 'relative',
              zIndex: 10,
              pointerEvents: 'auto',
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔘 [同期状態修復] トピック修復ボタンがmousedownされました');
            }}
          >
            トピック修復
          </button>
        </div>
      </div>
    </>
  );
}

