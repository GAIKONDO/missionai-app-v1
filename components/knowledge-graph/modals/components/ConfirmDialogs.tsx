import { cleanupMissingTopicIds } from '@/lib/dataIntegrityCleanup';
import { repairEntitySyncStatus, repairRelationSyncStatus, repairTopicSyncStatus } from '@/lib/chromaSyncRepair';

interface ConfirmDialogsProps {
  showCleanupConfirm: boolean;
  setShowCleanupConfirm: (value: boolean) => void;
  showRepairEntityConfirm: boolean;
  setShowRepairEntityConfirm: (value: boolean) => void;
  showRepairRelationConfirm: boolean;
  setShowRepairRelationConfirm: (value: boolean) => void;
  showRepairTopicConfirm: boolean;
  setShowRepairTopicConfirm: (value: boolean) => void;
  regenerationType: 'missing' | 'all';
  updateMissingCountsOrganization: (selectedOrgId: string, selectedType: string) => Promise<void>;
}

export default function ConfirmDialogs({
  showCleanupConfirm,
  setShowCleanupConfirm,
  showRepairEntityConfirm,
  setShowRepairEntityConfirm,
  showRepairRelationConfirm,
  setShowRepairRelationConfirm,
  showRepairTopicConfirm,
  setShowRepairTopicConfirm,
  regenerationType,
  updateMissingCountsOrganization,
}: ConfirmDialogsProps) {
  return (
    <>
      {/* データ整合性クリーンアップ確認ダイアログ */}
      {showCleanupConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
        }}
        onClick={() => setShowCleanupConfirm(false)}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
              データ整合性クリーンアップ
            </h3>
            <p style={{ marginBottom: '20px', color: '#6B7280' }}>
              データ整合性クリーンアップを実行しますか？
              <br /><br />
              注力施策のtopicIds配列から、存在しないトピックIDが削除されます。
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowCleanupConfirm(false)}
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
                キャンセル
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowCleanupConfirm(false);
                  console.log('🔘 [データ整合性クリーンアップ] 確認ダイアログでOKがクリックされました');
                  
                  try {
                    const orgSelect = document.getElementById('regeneration-org-select') as HTMLSelectElement;
                    const selectedOrgId = orgSelect?.value && orgSelect.value !== 'all' ? orgSelect.value : undefined;
                    
                    console.log('🧹 [データ整合性クリーンアップ] 開始...', { organizationId: selectedOrgId });
                    
                    const result = await cleanupMissingTopicIds(selectedOrgId);
                    
                    alert(`✅ データ整合性クリーンアップが完了しました。\n\nクリーンアップした注力施策: ${result.cleanedInitiatives}件\n削除した無効なトピックID: ${result.removedTopicIds}件\nエラー: ${result.errors.length}件`);
                    
                    console.log('✅ [データ整合性クリーンアップ] 完了:', result);
                    
                    // 未生成件数を再計算
                    if (regenerationType === 'missing') {
                      const typeSelect = document.getElementById('regeneration-type-select') as HTMLSelectElement | null;
                      await updateMissingCountsOrganization(selectedOrgId || 'all', typeSelect?.value || 'all');
                    }
                  } catch (error: any) {
                    console.error('❌ [データ整合性クリーンアップ] エラー:', error);
                    console.error('❌ [データ整合性クリーンアップ] エラースタック:', error?.stack);
                    alert(`❌ データ整合性クリーンアップに失敗しました。\n\nエラー: ${error?.message || String(error)}\n\n詳細はコンソールを確認してください。`);
                  }
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F59E0B',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                実行
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* エンティティ同期状態修復確認ダイアログ */}
      {showRepairEntityConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
        }}
        onClick={() => setShowRepairEntityConfirm(false)}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
              エンティティ同期状態修復
            </h3>
            <p style={{ marginBottom: '20px', color: '#6B7280' }}>
              エンティティの同期状態修復を実行しますか？
              <br /><br />
              SQLiteのchromaSynced=1だが、ChromaDBに実際の埋め込みが存在しない場合、フラグをリセットします。
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowRepairEntityConfirm(false)}
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
                キャンセル
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowRepairEntityConfirm(false);
                  console.log('🔘 [同期状態修復] エンティティ修復確認ダイアログでOKがクリックされました');
                  
                  try {
                    const orgSelect = document.getElementById('regeneration-org-select') as HTMLSelectElement;
                    const selectedOrgId = orgSelect?.value && orgSelect.value !== 'all' ? orgSelect.value : undefined;
                    
                    console.log('🔧 [同期状態修復] エンティティ修復開始...', { organizationId: selectedOrgId });
                    
                    const result = await repairEntitySyncStatus(selectedOrgId);
                    
                    alert(`✅ エンティティ同期状態修復が完了しました。\n\n修復したエンティティ: ${result.repaired}件\nエラー: ${result.errors.length}件`);
                    
                    console.log('✅ [同期状態修復] エンティティ修復完了:', result);
                    
                    // 未生成件数を再計算
                    if (regenerationType === 'missing') {
                      const typeSelect = document.getElementById('regeneration-type-select') as HTMLSelectElement | null;
                      await updateMissingCountsOrganization(selectedOrgId || 'all', typeSelect?.value || 'all');
                    }
                  } catch (error: any) {
                    console.error('❌ [同期状態修復] エンティティ修復エラー:', error);
                    console.error('❌ [同期状態修復] エンティティ修復エラースタック:', error?.stack);
                    alert(`❌ エンティティ同期状態修復に失敗しました。\n\nエラー: ${error?.message || String(error)}\n\n詳細はコンソールを確認してください。`);
                  }
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                実行
              </button>
            </div>
          </div>
        </div>
      )}

      {/* リレーション同期状態修復確認ダイアログ */}
      {showRepairRelationConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
        }}
        onClick={() => setShowRepairRelationConfirm(false)}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
              リレーション同期状態修復
            </h3>
            <p style={{ marginBottom: '20px', color: '#6B7280' }}>
              リレーションの同期状態修復を実行しますか？
              <br /><br />
              SQLiteのchromaSynced=1だが、ChromaDBに実際の埋め込みが存在しない場合、フラグをリセットします。
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowRepairRelationConfirm(false)}
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
                キャンセル
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowRepairRelationConfirm(false);
                  console.log('🔘 [同期状態修復] リレーション修復確認ダイアログでOKがクリックされました');
                  
                  try {
                    const orgSelect = document.getElementById('regeneration-org-select') as HTMLSelectElement;
                    const selectedOrgId = orgSelect?.value && orgSelect.value !== 'all' ? orgSelect.value : undefined;
                    
                    console.log('🔧 [同期状態修復] リレーション修復開始...', { organizationId: selectedOrgId });
                    
                    const result = await repairRelationSyncStatus(selectedOrgId);
                    
                    alert(`✅ リレーション同期状態修復が完了しました。\n\n修復したリレーション: ${result.repaired}件\nエラー: ${result.errors.length}件`);
                    
                    console.log('✅ [同期状態修復] リレーション修復完了:', result);
                    
                    // 未生成件数を再計算
                    if (regenerationType === 'missing') {
                      const typeSelect = document.getElementById('regeneration-type-select') as HTMLSelectElement | null;
                      await updateMissingCountsOrganization(selectedOrgId || 'all', typeSelect?.value || 'all');
                    }
                  } catch (error: any) {
                    console.error('❌ [同期状態修復] リレーション修復エラー:', error);
                    console.error('❌ [同期状態修復] リレーション修復エラースタック:', error?.stack);
                    alert(`❌ リレーション同期状態修復に失敗しました。\n\nエラー: ${error?.message || String(error)}\n\n詳細はコンソールを確認してください。`);
                  }
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                実行
              </button>
            </div>
          </div>
        </div>
      )}

      {/* トピック同期状態修復確認ダイアログ */}
      {showRepairTopicConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
        }}
        onClick={() => setShowRepairTopicConfirm(false)}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
              トピック同期状態修復
            </h3>
            <p style={{ marginBottom: '20px', color: '#6B7280' }}>
              トピックの同期状態修復を実行しますか？
              <br /><br />
              SQLiteのchromaSynced=1だが、ChromaDBに実際の埋め込みが存在しない場合、フラグをリセットします。
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowRepairTopicConfirm(false)}
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
                キャンセル
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowRepairTopicConfirm(false);
                  console.log('🔘 [同期状態修復] トピック修復確認ダイアログでOKがクリックされました');
                  
                  try {
                    const orgSelect = document.getElementById('regeneration-org-select') as HTMLSelectElement;
                    const selectedOrgId = orgSelect?.value && orgSelect.value !== 'all' ? orgSelect.value : undefined;
                    
                    console.log('🔧 [同期状態修復] トピック修復開始...', { organizationId: selectedOrgId });
                    
                    const result = await repairTopicSyncStatus(selectedOrgId);
                    
                    alert(`✅ トピック同期状態修復が完了しました。\n\n修復したトピック: ${result.repaired}件\nエラー: ${result.errors.length}件`);
                    
                    console.log('✅ [同期状態修復] トピック修復完了:', result);
                    
                    // 未生成件数を再計算
                    if (regenerationType === 'missing') {
                      const typeSelect = document.getElementById('regeneration-type-select') as HTMLSelectElement | null;
                      await updateMissingCountsOrganization(selectedOrgId || 'all', typeSelect?.value || 'all');
                    }
                  } catch (error: any) {
                    console.error('❌ [同期状態修復] トピック修復エラー:', error);
                    console.error('❌ [同期状態修復] トピック修復エラースタック:', error?.stack);
                    alert(`❌ トピック同期状態修復に失敗しました。\n\nエラー: ${error?.message || String(error)}\n\n詳細はコンソールを確認してください。`);
                  }
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                実行
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

