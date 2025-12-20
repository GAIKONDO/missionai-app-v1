'use client';

import { useRef } from 'react';
import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import type { TopicInfo } from '@/lib/orgApi';
import { batchUpdateEntityEmbeddings } from '@/lib/entityEmbeddings';
import { batchUpdateRelationEmbeddings } from '@/lib/relationEmbeddings';
import { batchUpdateTopicEmbeddings } from '@/lib/topicEmbeddings';
import { cleanupMissingTopicIds } from '@/lib/dataIntegrityCleanup';
import { repairEntitySyncStatus, repairRelationSyncStatus, repairTopicSyncStatus } from '@/lib/chromaSyncRepair';

// 開発用ログ関数（本番環境では無効化）
const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};

const devWarn = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(...args);
  }
};

const devDebug = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.debug(...args);
  }
};

interface EmbeddingRegenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  regenerationProgress: {
    current: number;
    total: number;
    status: 'idle' | 'processing' | 'completed' | 'cancelled';
    logs: Array<{ type: 'info' | 'success' | 'error' | 'skip'; message: string; timestamp: Date }>;
    stats: { success: number; skipped: number; errors: number };
  };
  setRegenerationProgress: React.Dispatch<React.SetStateAction<{
    current: number;
    total: number;
    status: 'idle' | 'processing' | 'completed' | 'cancelled';
    logs: Array<{ type: 'info' | 'success' | 'error' | 'skip'; message: string; timestamp: Date }>;
    stats: { success: number; skipped: number; errors: number };
  }>>;
  regenerationType: 'missing' | 'all';
  setRegenerationType: (type: 'missing' | 'all') => void;
  missingCounts: { entities: number; relations: number; topics: number; total: number };
  setMissingCounts: React.Dispatch<React.SetStateAction<{ entities: number; relations: number; topics: number; total: number }>>;
  isCountingMissing: boolean;
  setIsCountingMissing: (value: boolean) => void;
  showCleanupConfirm: boolean;
  setShowCleanupConfirm: (value: boolean) => void;
  showRepairEntityConfirm: boolean;
  setShowRepairEntityConfirm: (value: boolean) => void;
  showRepairRelationConfirm: boolean;
  setShowRepairRelationConfirm: (value: boolean) => void;
  showRepairTopicConfirm: boolean;
  setShowRepairTopicConfirm: (value: boolean) => void;
  isRegeneratingEmbeddings: boolean;
  setIsRegeneratingEmbeddings: (value: boolean) => void;
  isCancelledRef: React.MutableRefObject<boolean>;
  organizations: Array<{ id: string; name: string; title?: string; type?: string }>;
  entities: Entity[];
  relations: Relation[];
  topics: TopicInfo[];
  updateMissingCountsOrganization: (selectedOrgId: string, selectedType: string) => Promise<void>;
  startRegeneration: () => void;
  completeRegeneration: () => void;
  cancelRegeneration: () => void;
}

export default function EmbeddingRegenerationModal({
  isOpen,
  onClose,
  regenerationProgress,
  setRegenerationProgress,
  regenerationType,
  setRegenerationType,
  missingCounts,
  setMissingCounts,
  isCountingMissing,
  setIsCountingMissing,
  showCleanupConfirm,
  setShowCleanupConfirm,
  showRepairEntityConfirm,
  setShowRepairEntityConfirm,
  showRepairRelationConfirm,
  setShowRepairRelationConfirm,
  showRepairTopicConfirm,
  setShowRepairTopicConfirm,
  isRegeneratingEmbeddings,
  setIsRegeneratingEmbeddings,
  isCancelledRef,
  organizations,
  entities,
  relations,
  topics,
  updateMissingCountsOrganization,
  startRegeneration,
  completeRegeneration,
  cancelRegeneration,
}: EmbeddingRegenerationModalProps) {
  if (!isOpen) return null;

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
      onClick={(e) => {
        // 処理中は背景クリックで閉じない
        if (isRegeneratingEmbeddings) {
          return;
        }
        onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>
            埋め込み再生成
          </h2>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClose();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6B7280',
              padding: '4px 8px',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ×
          </button>
        </div>
        
        {regenerationProgress.status === 'idle' && (
          <div>
            <p style={{ marginBottom: '16px', color: '#6B7280' }}>
              エンティティ、リレーション、トピックの埋め込みを再生成します（typeで組織と事業会社を区別）。
            </p>
            
            {/* 現在の設定表示 */}
            <div style={{
              padding: '12px',
              backgroundColor: '#F9FAFB',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '12px',
              color: '#6B7280',
            }}>
              <div style={{ fontWeight: 500, marginBottom: '4px' }}>現在の設定:</div>
              <div>
                プロバイダー: {typeof window !== 'undefined' && localStorage.getItem('embeddingProvider') === 'ollama' ? 'Ollama（無料）' : 'OpenAI（有料）'}
              </div>
              {typeof window !== 'undefined' && localStorage.getItem('embeddingProvider') === 'ollama' && (
                <div style={{ marginTop: '4px', fontSize: '11px', color: '#10B981' }}>
                  💡 設定ページでプロバイダーを変更できます
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                  再生成モード
                </label>
                <select
                  id="regeneration-type-select-mode"
                  value={regenerationType}
                  onChange={async (e) => {
                    const newType = e.target.value as 'missing' | 'all';
                    setRegenerationType(newType);
                    // モードが変更されたときに未生成件数を再計算
                    if (newType === 'missing') {
                      const orgSelect = document.getElementById('regeneration-org-select') as HTMLSelectElement;
                      const typeSelect = document.getElementById('regeneration-type-select') as HTMLSelectElement;
                      if (orgSelect && typeSelect) {
                        await updateMissingCountsOrganization(orgSelect.value || 'all', typeSelect.value || 'all');
                      }
                    } else {
                      // すべて再生成モードの場合は件数をリセット
                      setMissingCounts({ entities: 0, relations: 0, topics: 0, total: 0 });
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  <option value="missing">未生成のみ再生成（埋め込みが生成されていない対象のみ）</option>
                  <option value="all">すべて再生成（既存の埋め込みも強制的に再生成）</option>
                </select>
                <p style={{ fontSize: '12px', color: regenerationType === 'missing' ? '#10B981' : '#EF4444', marginTop: '4px', marginBottom: 0 }}>
                  {regenerationType === 'missing' 
                    ? '💡 埋め込みが生成されていないエンティティ・リレーションのみを再生成します。' 
                    : '⚠️ 既存の埋め込みも強制的に再生成します。APIコストがかかる場合があります。'}
                </p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                  対象組織（typeで組織と事業会社を区別）
                </label>
                <select
                  id="regeneration-org-select"
                  onChange={async () => {
                    // 組織が変更されたときに未生成件数を再計算
                    const orgSelect = document.getElementById('regeneration-org-select') as HTMLSelectElement;
                    const typeSelect = document.getElementById('regeneration-type-select') as HTMLSelectElement;
                    if (orgSelect && typeSelect) {
                      await updateMissingCountsOrganization(orgSelect.value, typeSelect.value);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  <option value="all">すべての組織</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name} {org.type === 'company' ? '(事業会社)' : org.type === 'person' ? '(個人)' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                  対象タイプ
                </label>
                <select
                  id="regeneration-type-select"
                  onChange={async () => {
                    // タイプが変更されたときに未生成件数を再計算
                    const orgSelect = document.getElementById('regeneration-org-select') as HTMLSelectElement;
                    const typeSelect = document.getElementById('regeneration-type-select') as HTMLSelectElement;
                    if (orgSelect && typeSelect) {
                      await updateMissingCountsOrganization(orgSelect.value, typeSelect.value);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  <option value="all">すべて（エンティティ + リレーション + トピック）</option>
                  <option value="entities">エンティティのみ</option>
                  <option value="relations">リレーションのみ</option>
                  <option value="topics">トピックのみ</option>
                </select>
              </div>
              
              {/* 未生成件数の表示 */}
              {regenerationType === 'missing' && (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#EFF6FF',
                  borderRadius: '6px',
                  border: '1px solid #3B82F6',
                }}>
                  {isCountingMissing ? (
                    <div style={{ fontSize: '12px', color: '#1E40AF' }}>
                      🔄 未生成件数を計算中...
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#1E40AF' }}>
                      <div style={{ fontWeight: 500, marginBottom: '4px' }}>📊 未生成の埋め込み件数:</div>
                      <div style={{ marginLeft: '8px' }}>
                        {(() => {
                          const typeSelect = document.getElementById('regeneration-type-select') as HTMLSelectElement;
                          const selectedType = typeSelect?.value || 'all';
                          
                          const counts: string[] = [];
                          if (selectedType === 'all' || selectedType === 'entities') {
                            counts.push(`エンティティ: ${missingCounts.entities}件`);
                          }
                          if (selectedType === 'all' || selectedType === 'relations') {
                            counts.push(`リレーション: ${missingCounts.relations}件`);
                          }
                          if (selectedType === 'all' || selectedType === 'topics') {
                            counts.push(`トピック: ${missingCounts.topics}件`);
                          }
                          
                          return (
                            <>
                              {counts.map((count, idx) => (
                                <div key={idx}>{count}</div>
                              ))}
                              {selectedType === 'all' && (
                                <div style={{ marginTop: '4px', fontWeight: 600, borderTop: '1px solid #93C5FD', paddingTop: '4px' }}>
                                  合計: {missingCounts.total}件
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
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
            </div>
            
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
            
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
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
                キャンセル
              </button>
              <button
                onClick={async () => {
                  const typeSelect = document.getElementById('regeneration-type-select') as HTMLSelectElement;
                  const selectedType = typeSelect?.value || 'all';
                  const forceRegenerate = regenerationType === 'all'; // 'all'の場合は強制再生成
                  
                  const orgSelect = document.getElementById('regeneration-org-select') as HTMLSelectElement;
                  const selectedId = orgSelect?.value || 'all';
                  
                  devLog(`🚀 [埋め込み再生成] 開始: regenerationType=${regenerationType}, forceRegenerate=${forceRegenerate}, selectedId=${selectedId}, selectedType=${selectedType}`);
                  devLog(`📊 [埋め込み再生成] 現在のentities.length=${entities.length}, relations.length=${relations.length}, topics.length=${topics.length}`);

                  // 停止フラグをリセット
                  isCancelledRef.current = false;
                  setIsRegeneratingEmbeddings(true);
                  // モーダルを閉じる（処理はバックグラウンドで続行）
                  onClose();
                  const initialProgress = {
                    current: 0,
                    total: 0,
                    status: 'processing' as const,
                    logs: [],
                    stats: { success: 0, skipped: 0, errors: 0 },
                  };
                  setRegenerationProgress(initialProgress);
                  // グローバル状態を開始
                  startRegeneration();

                  try {
                    let totalEntities = 0;
                    let totalRelations = 0;
                    let totalTopics = 0;

                    // 対象を決定（organizationIdでフィルタリング、typeで組織と事業会社を区別）
                    let targetEntities = selectedId === 'all'
                      ? entities.filter(e => e.organizationId)
                      : entities.filter(e => e.organizationId === selectedId);
                    let targetRelations = selectedId === 'all'
                      ? relations.filter(r => {
                          const orgId = r.organizationId || entities.find(e => e.id === r.sourceEntityId || e.id === r.targetEntityId)?.organizationId;
                          return orgId && r.topicId;
                        })
                      : relations.filter(r => {
                          const orgId = r.organizationId || entities.find(e => e.id === r.sourceEntityId || e.id === r.targetEntityId)?.organizationId;
                          return orgId === selectedId && r.topicId;
                        });
                    // topicsプロップが空の場合、query_getで直接取得
                    let targetTopics: TopicInfo[] = [];
                    if (topics.length === 0) {
                      try {
                        devLog(`📊 [埋め込み再生成] topicsプロップが空のため、query_getで直接取得します`);
                        const allTopicDocs = await callTauriCommand('query_get', {
                          collectionName: 'topics',
                          conditions: selectedId !== 'all' ? { organizationId: selectedId } : {},
                        }) as Array<{ id: string; data: any }>;
                        
                        // TopicInfo形式に変換
                        for (const doc of allTopicDocs) {
                          const topicData = doc.data || doc;
                          const topicId = doc.id || topicData.id;
                          
                          // ID形式が`${meetingNoteId}-topic-${topicId}`の場合、topicIdを抽出
                          const idMatch = topicId.match(/^(.+)-topic-(.+)$/);
                          const extractedTopicId = idMatch ? idMatch[2] : topicId;
                          const meetingNoteId = idMatch ? idMatch[1] : topicData.meetingNoteId;
                          
                          targetTopics.push({
                            id: extractedTopicId,
                            title: topicData.title || '',
                            content: topicData.content || '',
                            meetingNoteId: meetingNoteId || topicData.meetingNoteId || '',
                            meetingNoteTitle: topicData.meetingNoteTitle || '',
                            organizationId: topicData.organizationId || '',
                            semanticCategory: topicData.semanticCategory,
                            importance: topicData.importance,
                            keywords: topicData.keywords ? (Array.isArray(topicData.keywords) ? topicData.keywords : JSON.parse(topicData.keywords)) : undefined,
                            summary: topicData.summary,
                          });
                        }
                        devLog(`📊 [埋め込み再生成] query_getで取得したトピック数: ${targetTopics.length}件`);
                      } catch (error) {
                        devWarn(`⚠️ [埋め込み再生成] query_getでのトピック取得エラー:`, error);
                        // フォールバック: topicsプロップを使用
                        targetTopics = selectedId === 'all'
                          ? topics.filter(t => t.organizationId)
                          : topics.filter(t => t.organizationId === selectedId);
                      }
                    } else {
                      targetTopics = selectedId === 'all'
                        ? topics.filter(t => t.organizationId)
                        : topics.filter(t => t.organizationId === selectedId);
                    }

                    // 未生成のみの場合は、SQLiteのchromaSyncedフラグでフィルタリング
                    if (!forceRegenerate && regenerationType === 'missing') {
                      devLog(`🔍 [埋め込み再生成] 未生成のみモード: フィルタリング開始`);
                      devLog(`📊 [埋め込み再生成] フィルタリング前: エンティティ=${targetEntities.length}, リレーション=${targetRelations.length}, トピック=${targetTopics.length}`);
                      const { callTauriCommand } = await import('@/lib/localFirebase');
                      
                      // エンティティのフィルタリング（query_getで一括取得）
                      if (selectedType === 'all' || selectedType === 'entities') {
                        try {
                          // すべてのエンティティを取得してから、chromaSyncedが0またはnullのものをフィルタリング
                          const allEntityDocs = await callTauriCommand('query_get', {
                            collectionName: 'entities',
                            conditions: {},
                          }) as Array<{ id: string; data: any }>;
                          
                          // chromaSyncedが0またはnullのエンティティをフィルタリング
                          const missingEntityDocs = allEntityDocs.filter(doc => {
                            const entityData = doc.data || doc;
                            const chromaSyncedValue = entityData.chromaSynced;
                            return chromaSyncedValue === 0 || chromaSyncedValue === null || chromaSyncedValue === undefined;
                          });
                          
                          // query_getの結果は[{id: string, data: any}]の形式
                          const missingEntityIds = new Set(missingEntityDocs.map(doc => doc.id || doc.data?.id));
                          // targetEntitiesは既にcompanyIdを持つものを含むため、そのままフィルタリング
                          const missingEntities = targetEntities.filter(entity => missingEntityIds.has(entity.id));
                          
                          // ループ内のログを簡略化（パフォーマンス最適化）
                          devLog(`📊 [埋め込み再生成] エンティティフィルタリング後: ${missingEntities.length}件`);
                          targetEntities = missingEntities;
                        } catch (error) {
                          devWarn(`⚠️ [埋め込み再生成] エンティティの一括取得エラー（個別チェックにフォールバック）:`, error);
                          // フォールバック: 個別チェック
                          const missingEntities: Entity[] = [];
                          for (const entity of targetEntities) {
                            try {
                              const entityDoc = await callTauriCommand('doc_get', {
                                collectionName: 'entities',
                                docId: entity.id,
                              }) as any;
                              
                              let chromaSynced = false;
                              if (entityDoc?.exists && entityDoc?.data) {
                                chromaSynced = entityDoc.data.chromaSynced === 1 || entityDoc.data.chromaSynced === true;
                              }
                              
                              if (!chromaSynced) {
                                missingEntities.push(entity);
                              }
                            } catch (err) {
                              devDebug(`エンティティ ${entity.id} のフラグ確認エラー:`, err);
                              missingEntities.push(entity);
                            }
                          }
                          targetEntities = missingEntities;
                        }
                      }
                      
                      // リレーションのフィルタリング（query_getで一括取得）
                      if (selectedType === 'all' || selectedType === 'relations') {
                        try {
                          // すべてのリレーションを取得してから、chromaSyncedが0またはnullのものをフィルタリング
                          const allRelationDocs = await callTauriCommand('query_get', {
                            collectionName: 'relations',
                            conditions: {},
                          }) as Array<{ id: string; data: any }>;
                          
                          // chromaSyncedが0またはnullのリレーションをフィルタリング
                          const missingRelationDocs = allRelationDocs.filter(doc => {
                            const relationData = doc.data || doc;
                            const chromaSyncedValue = relationData.chromaSynced;
                            return chromaSyncedValue === 0 || chromaSyncedValue === null || chromaSyncedValue === undefined;
                          });
                          
                          // query_getの結果は[{id: string, data: any}]の形式
                          const missingRelationIds = new Set(missingRelationDocs.map(doc => doc.id || doc.data?.id));
                          // targetRelationsは既にcompanyIdを持つものを含むため、そのままフィルタリング
                          const missingRelations = targetRelations.filter(relation => missingRelationIds.has(relation.id));
                          
                          // ループ内のログを簡略化（パフォーマンス最適化）
                          devLog(`📊 [埋め込み再生成] リレーションフィルタリング後: ${missingRelations.length}件`);
                          targetRelations = missingRelations;
                        } catch (error) {
                          devWarn(`⚠️ [埋め込み再生成] リレーションの一括取得エラー（個別チェックにフォールバック）:`, error);
                          // フォールバック: 個別チェック
                          const missingRelations: Relation[] = [];
                          for (const relation of targetRelations) {
                            try {
                              const relationDoc = await callTauriCommand('doc_get', {
                                collectionName: 'relations',
                                docId: relation.id,
                              }) as any;
                              
                              let chromaSynced = false;
                              if (relationDoc?.exists && relationDoc?.data) {
                                chromaSynced = relationDoc.data.chromaSynced === 1 || relationDoc.data.chromaSynced === true;
                              }
                              
                              if (!chromaSynced) {
                                missingRelations.push(relation);
                              }
                            } catch (err) {
                              devDebug(`リレーション ${relation.id} のフラグ確認エラー:`, err);
                              missingRelations.push(relation);
                            }
                          }
                          targetRelations = missingRelations;
                        }
                      }
                      
                      // トピックのフィルタリング（query_getで一括取得）
                      if (selectedType === 'all' || selectedType === 'topics') {
                        try {
                          // すべてのトピックを取得してから、chromaSyncedが0またはnullのものをフィルタリング
                          const allTopicDocs = await callTauriCommand('query_get', {
                            collectionName: 'topics',
                            conditions: selectedId !== 'all' ? { organizationId: selectedId } : {},
                          }) as Array<{ id: string; data: any }>;
                          
                          // chromaSyncedが0またはnullのトピックをフィルタリング
                          const missingTopicDocs = allTopicDocs.filter(doc => {
                            const topicData = doc.data || doc;
                            const chromaSyncedValue = topicData.chromaSynced;
                            return chromaSyncedValue === 0 || chromaSyncedValue === null || chromaSyncedValue === undefined;
                          });
                          
                          // SQLiteのtopicsテーブルのIDは`${meetingNoteId}-topic-${topicId}`形式
                          // TopicInfoのIDは`topicId`のみなので、missingTopicDocsのIDからtopicIdを抽出して比較
                          const missingTopicIdSet = new Set<string>();
                          for (const doc of missingTopicDocs) {
                            const topicId = doc.id || doc.data?.id;
                            if (topicId) {
                              // ID形式が`${meetingNoteId}-topic-${topicId}`の場合、topicIdを抽出
                              const idMatch = topicId.match(/^(.+)-topic-(.+)$/);
                              if (idMatch) {
                                const extractedTopicId = idMatch[2];
                                missingTopicIdSet.add(extractedTopicId);
                                missingTopicIdSet.add(topicId); // 完全なIDも追加（念のため）
                              } else {
                                // 既にtopicIdのみの形式の場合
                                missingTopicIdSet.add(topicId);
                              }
                            }
                          }
                          
                          // targetTopicsのIDと比較
                          const missingTopics = targetTopics.filter(topic => missingTopicIdSet.has(topic.id));
                          
                          // ループ内のログを簡略化（パフォーマンス最適化）
                          devLog(`📊 [埋め込み再生成] トピックフィルタリング後: ${missingTopics.length}件`);
                          targetTopics = missingTopics;
                        } catch (error) {
                          devWarn(`⚠️ [埋め込み再生成] トピックの一括取得エラー（個別チェックにフォールバック）:`, error);
                          // フォールバック: 個別チェック
                          const missingTopics: TopicInfo[] = [];
                          for (const topic of targetTopics) {
                            if (!topic.meetingNoteId || !topic.organizationId) continue;
                            try {
                              // SQLiteのtopicsテーブルのIDは`${meetingNoteId}-topic-${topicId}`形式
                              const topicEmbeddingId = `${topic.meetingNoteId}-topic-${topic.id}`;
                              const topicDoc = await callTauriCommand('doc_get', {
                                collectionName: 'topics',
                                docId: topicEmbeddingId,
                              }) as any;
                              
                              let chromaSynced = false;
                              if (topicDoc?.exists && topicDoc?.data) {
                                const chromaSyncedValue = topicDoc.data.chromaSynced;
                                chromaSynced = chromaSyncedValue === 1 || chromaSyncedValue === true || chromaSyncedValue === '1';
                              }
                              
                              if (!chromaSynced) {
                                missingTopics.push(topic);
                              }
                            } catch (err) {
                              devDebug(`トピック ${topic.id} のフラグ確認エラー:`, err);
                              missingTopics.push(topic);
                            }
                          }
                          targetTopics = missingTopics;
                        }
                      }
                      
                      devLog(`✅ [埋め込み再生成] フィルタリング完了: エンティティ=${targetEntities.length}, リレーション=${targetRelations.length}, トピック=${targetTopics.length}`);
                    }

                    if (selectedType === 'all' || selectedType === 'entities') {
                      totalEntities = targetEntities.length;
                    }
                    if (selectedType === 'all' || selectedType === 'relations') {
                      totalRelations = targetRelations.length;
                    }
                    if (selectedType === 'all' || selectedType === 'topics') {
                      totalTopics = targetTopics.length;
                    }

                    const total = totalEntities + totalRelations + totalTopics;
                    devLog(`📊 [埋め込み再生成] 最終的な件数: エンティティ=${totalEntities}, リレーション=${totalRelations}, トピック=${totalTopics}, 合計=${total}`);
                    setRegenerationProgress(prev => ({ ...prev, total }));
                    
                    if (total === 0) {
                      devWarn(`⚠️ [埋め込み再生成] 処理対象が0件です。フィルタリング処理を確認してください。`);
                      setRegenerationProgress(prev => ({
                        ...prev,
                        status: 'completed',
                        logs: [
                          ...prev.logs,
                          {
                            type: 'info',
                            message: '処理対象が0件でした。すべてのアイテムが既に埋め込み済みの可能性があります。',
                            timestamp: new Date(),
                          },
                        ],
                      }));
                      setIsRegeneratingEmbeddings(false);
                      completeRegeneration();
                      return;
                    }

                    // エンティティの再生成
                    if (selectedType === 'all' || selectedType === 'entities') {
                      for (const entity of targetEntities) {
                        // 停止チェック
                        if (isCancelledRef.current) {
                          setRegenerationProgress(prev => ({
                            ...prev,
                            status: 'cancelled',
                            logs: [
                              ...prev.logs,
                              {
                                type: 'info',
                                message: '処理が中止されました',
                                timestamp: new Date(),
                              },
                            ],
                          }));
                          break;
                        }
                        
                        // organizationIdが必要
                        if (!entity.organizationId) {
                          devWarn(`⚠️ エンティティ ${entity.id} (${entity.name}) にorganizationIdがありません。スキップします。`);
                          continue;
                        }
                        
                        // 未生成のみの場合は、既にフィルタリング済みなのでチェック不要
                        // batchUpdateEntityEmbeddings内でもSQLiteのchromaSyncedフラグをチェックするため、ここではスキップ
                        
                        const entityIds = [entity.id];
                        // organizationIdを使用（typeで組織と事業会社を区別）
                        const orgOrCompanyId = entity.organizationId || '';
                        await batchUpdateEntityEmbeddings(
                          entityIds,
                          orgOrCompanyId,
                          forceRegenerate, // 選択されたモードに応じて設定
                          (current, total, entityId, status) => {
                            setRegenerationProgress(prev => ({
                              ...prev,
                              // success, skipped, errorのすべての場合にcurrentを増やす（処理が完了したことを示す）
                              current: prev.current + (status === 'success' || status === 'skipped' || status === 'error' ? 1 : 0),
                              logs: [
                                ...prev.logs,
                                {
                                  type: status === 'success' ? 'success' : status === 'error' ? 'error' : 'skip',
                                  message: `エンティティ: ${entity.name} (${status === 'success' ? '成功' : status === 'error' ? 'エラー' : 'スキップ'})`,
                                  timestamp: new Date(),
                                },
                              ],
                              stats: {
                                ...prev.stats,
                                success: prev.stats.success + (status === 'success' ? 1 : 0),
                                skipped: prev.stats.skipped + (status === 'skipped' ? 1 : 0),
                                errors: prev.stats.errors + (status === 'error' ? 1 : 0),
                              },
                            }));
                          },
                          () => isCancelledRef.current // shouldCancelコールバック
                        );
                        
                        // 停止チェック（バッチ処理後）
                        if (isCancelledRef.current) {
                          break;
                        }
                      }
                    }

                    // リレーションの再生成
                    if (selectedType === 'all' || selectedType === 'relations') {
                      for (const relation of targetRelations) {
                        // 停止チェック
                        if (isCancelledRef.current) {
                          setRegenerationProgress(prev => ({
                            ...prev,
                            status: 'cancelled',
                            logs: [
                              ...prev.logs,
                              {
                                type: 'info',
                                message: '処理が中止されました',
                                timestamp: new Date(),
                              },
                            ],
                          }));
                          break;
                        }
                        
                        // organizationIdを取得（リレーション自体のorganizationIdを優先、なければ関連エンティティから取得）
                        let organizationId = relation.organizationId;
                        if (!organizationId) {
                          const relatedEntity = entities.find(e => e.id === relation.sourceEntityId || e.id === relation.targetEntityId);
                          organizationId = relatedEntity?.organizationId;
                        }
                        
                        // organizationIdが必要
                        if (!organizationId) {
                          devWarn(`⚠️ リレーション ${relation.id} (${relation.relationType}) にorganizationIdがありません。スキップします。`);
                          continue;
                        }
                        
                        // organizationIdを使用（typeで組織と事業会社を区別）
                        const orgOrCompanyId = organizationId || '';

                        // topicIdがない場合はスキップ
                        if (!relation.topicId) {
                          devWarn(`⚠️ リレーション ${relation.id} (${relation.relationType}) にtopicIdがありません。スキップします。`);
                          continue;
                        }

                        // 未生成のみの場合は、既にフィルタリング済みなのでチェック不要
                        // batchUpdateRelationEmbeddings内でもチェックが行われるため、ここではスキップ

                        const relationIds = [relation.id];
                        await batchUpdateRelationEmbeddings(
                          relationIds,
                          orgOrCompanyId,
                          forceRegenerate, // 選択されたモードに応じて設定
                          (current, total, relationId, status) => {
                            setRegenerationProgress(prev => ({
                              ...prev,
                              // success, skipped, errorのすべての場合にcurrentを増やす（処理が完了したことを示す）
                              current: prev.current + (status === 'success' || status === 'skipped' || status === 'error' ? 1 : 0),
                              logs: [
                                ...prev.logs,
                                {
                                  type: status === 'success' ? 'success' : status === 'error' ? 'error' : 'skip',
                                  message: `リレーション: ${relation.relationType} (${status === 'success' ? '成功' : status === 'error' ? 'エラー' : 'スキップ'})`,
                                  timestamp: new Date(),
                                },
                              ],
                              stats: {
                                ...prev.stats,
                                success: prev.stats.success + (status === 'success' ? 1 : 0),
                                skipped: prev.stats.skipped + (status === 'skipped' ? 1 : 0),
                                errors: prev.stats.errors + (status === 'error' ? 1 : 0),
                              },
                            }));
                          },
                          () => isCancelledRef.current // shouldCancelコールバック
                        );
                        
                        // 停止チェック（バッチ処理後）
                        if (isCancelledRef.current) {
                          break;
                        }
                      }
                    }

                    // トピックの再生成
                    if (selectedType === 'all' || selectedType === 'topics') {
                      // トピックをmeetingNoteIdごとにグループ化
                      const topicsByMeetingNote = new Map<string, Array<{ id: string; title: string; content: string; metadata?: any }>>();
                      
                      for (const topic of targetTopics) {
                        if (!topic.organizationId || !topic.meetingNoteId) {
                          devWarn(`⚠️ トピック ${topic.id} (${topic.title}) にorganizationIdまたはmeetingNoteIdがありません。スキップします。`);
                          continue;
                        }

                        // 未生成のみの場合は、既にフィルタリング済みなのでチェック不要
                        // batchUpdateTopicEmbeddings内でもチェックが行われるため、ここではスキップ

                        if (!topicsByMeetingNote.has(topic.meetingNoteId)) {
                          topicsByMeetingNote.set(topic.meetingNoteId, []);
                        }

                        const topicData = {
                          id: topic.id,
                          title: topic.title,
                          content: topic.content || '',
                          metadata: {
                            keywords: topic.keywords,
                            semanticCategory: topic.semanticCategory,
                            summary: topic.summary,
                            importance: topic.importance,
                          },
                        };

                        topicsByMeetingNote.get(topic.meetingNoteId)!.push(topicData);
                      }

                      // 各議事録ごとにトピック埋め込みを再生成
                      for (const [meetingNoteId, topicList] of topicsByMeetingNote.entries()) {
                        // 停止チェック
                        if (isCancelledRef.current) {
                          setRegenerationProgress(prev => ({
                            ...prev,
                            status: 'cancelled',
                            logs: [
                              ...prev.logs,
                              {
                                type: 'info',
                                message: '処理が中止されました',
                                timestamp: new Date(),
                              },
                            ],
                          }));
                          break;
                        }
                        
                        const firstTopic = topicList[0];
                        if (!firstTopic) continue;

                        // 組織IDを取得（最初のトピックから）
                        const orgTopic = targetTopics.find(t => t.meetingNoteId === meetingNoteId);
                        if (!orgTopic?.organizationId) {
                          devWarn(`⚠️ 議事録 ${meetingNoteId} のトピックにorganizationIdがありません。スキップします。`);
                          continue;
                        }

                        await batchUpdateTopicEmbeddings(
                          topicList,
                          meetingNoteId,
                          orgTopic.organizationId,
                          forceRegenerate, // 選択されたモードに応じて設定
                          (current, total, topicId, status) => {
                            const topic = topicList.find(t => t.id === topicId);
                            setRegenerationProgress(prev => ({
                              ...prev,
                              // success, skipped, errorのすべての場合にcurrentを増やす（処理が完了したことを示す）
                              current: prev.current + (status === 'success' || status === 'skipped' || status === 'error' ? 1 : 0),
                              logs: [
                                ...prev.logs,
                                {
                                  type: status === 'success' ? 'success' : status === 'error' ? 'error' : 'skip',
                                  message: `トピック: ${topic?.title || topicId} (${status === 'success' ? '成功' : status === 'error' ? 'エラー' : 'スキップ'})`,
                                  timestamp: new Date(),
                                },
                              ],
                              stats: {
                                ...prev.stats,
                                success: prev.stats.success + (status === 'success' ? 1 : 0),
                                skipped: prev.stats.skipped + (status === 'skipped' ? 1 : 0),
                                errors: prev.stats.errors + (status === 'error' ? 1 : 0),
                              },
                            }));
                          },
                          () => isCancelledRef.current // shouldCancelコールバック
                        );
                        
                        // 停止チェック（バッチ処理後）
                        if (isCancelledRef.current) {
                          break;
                        }
                      }
                    }

                    // 停止されていない場合のみ完了ステータスを設定
                    if (!isCancelledRef.current) {
                      setRegenerationProgress(prev => ({ ...prev, status: 'completed' }));
                    }
                  } catch (error: any) {
                    console.error('埋め込み再生成エラー:', error);
                    setRegenerationProgress(prev => ({
                      ...prev,
                      status: isCancelledRef.current ? 'cancelled' : 'completed',
                      logs: [
                        ...prev.logs,
                        {
                          type: 'error',
                          message: `エラー: ${error.message || '不明なエラー'}`,
                          timestamp: new Date(),
                        },
                      ],
                    }));
                  } finally {
                    setIsRegeneratingEmbeddings(false);
                  }
                }}
                disabled={isRegeneratingEmbeddings}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isRegeneratingEmbeddings ? '#9CA3AF' : '#3B82F6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: isRegeneratingEmbeddings ? 'not-allowed' : 'pointer',
                  opacity: isRegeneratingEmbeddings ? 0.6 : 1,
                }}
              >
                開始
              </button>
              {isRegeneratingEmbeddings && (
                <button
                  onClick={() => {
                    isCancelledRef.current = true;
                    setRegenerationProgress(prev => ({
                      ...prev,
                      status: 'cancelled',
                      logs: [
                        ...prev.logs,
                        {
                          type: 'info',
                          message: '停止がリクエストされました。処理を完了して停止します...',
                          timestamp: new Date(),
                        },
                      ],
                    }));
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#EF4444',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    marginLeft: '8px',
                  }}
                >
                  停止
                </button>
              )}
            </div>
          </div>
        )}

        {(regenerationProgress.status === 'processing' || regenerationProgress.status === 'completed') && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>
                  進捗: {regenerationProgress.current} / {regenerationProgress.total}
                </span>
                <span style={{ fontSize: '14px', color: '#6B7280' }}>
                  {regenerationProgress.total > 0
                    ? `${Math.round((regenerationProgress.current / regenerationProgress.total) * 100)}%`
                    : '0%'}
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#E5E7EB',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${regenerationProgress.total > 0 ? (regenerationProgress.current / regenerationProgress.total) * 100 : 0}%`,
                    height: '100%',
                    backgroundColor: regenerationProgress.status === 'completed' ? '#10B981' : '#3B82F6',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>

            {regenerationProgress.status === 'processing' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    devLog('🛑 生成を中止ボタンがクリックされました');
                    isCancelledRef.current = true;
                    setRegenerationProgress(prev => ({
                      ...prev,
                      status: 'cancelled',
                    }));
                    setIsRegeneratingEmbeddings(false);
                    cancelRegeneration();
                    // ログに追加
                    setRegenerationProgress(prev => ({
                      ...prev,
                      logs: [
                        ...prev.logs,
                        {
                          type: 'info',
                          message: '処理が中止されました',
                          timestamp: new Date(),
                        },
                      ],
                    }));
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#EF4444',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#DC2626';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#EF4444';
                  }}
                >
                  生成を中止
                </button>
              </div>
            )}

            {regenerationProgress.status === 'completed' && (
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#F0FDF4', borderRadius: '6px' }}>
                <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>完了</div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  成功: {regenerationProgress.stats.success}件 | 
                  スキップ: {regenerationProgress.stats.skipped}件 | 
                  エラー: {regenerationProgress.stats.errors}件
                </div>
              </div>
            )}
          </div>
        )}

        {regenerationProgress.status === 'cancelled' && (
          <div>
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '6px' }}>
              <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#991B1B' }}>中止されました</div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>
                処理が中止されました。一部のデータは既に処理されている可能性があります。
              </div>
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
              {regenerationProgress.logs.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
                  ログがありません
                </div>
              ) : (
                regenerationProgress.logs.map((log, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '8px 12px',
                      marginBottom: '4px',
                      backgroundColor: log.type === 'success' ? '#F0FDF4' : log.type === 'error' ? '#FEF2F2' : '#F9FAFB',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: log.type === 'success' ? '#065F46' : log.type === 'error' ? '#991B1B' : '#6B7280',
                    }}
                  >
                    {log.message}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
