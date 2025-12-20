'use client';

import { useState, useEffect } from 'react';
import type { OrgNodeData } from '@/components/OrgChart';
import { getDeletionTargets } from '@/lib/orgApi';

interface DeleteOrganizationModalProps {
  organization: OrgNodeData;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteOrganizationModal({
  organization,
  onClose,
  onConfirm,
}: DeleteOrganizationModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [childOrganizations, setChildOrganizations] = useState<Array<{ id: string; name: string; title?: string; level: number; levelName: string; type?: string }>>([]);
  const [members, setMembers] = useState<Array<{ id: string; name: string; position?: string; organizationId: string }>>([]);

  useEffect(() => {
    const loadDeletionTargets = async () => {
      if (!organization.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const targets = await getDeletionTargets(organization.id);
        setChildOrganizations(targets.childOrganizations);
        setMembers(targets.members);
      } catch (error: any) {
        console.error('❌ [DeleteOrganizationModal] 削除対象の取得に失敗しました:', error);
        // エラーが発生してもモーダルは表示を続ける
      } finally {
        setLoading(false);
      }
    };

    loadDeletionTargets();
  }, [organization.id]);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } catch (error: any) {
      console.error('❌ [DeleteOrganizationModal] 削除処理でエラーが発生しました:', error);
      // エラーが発生してもモーダルを閉じる
      onClose();
    } finally {
      setDeleting(false);
    }
  };

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
        zIndex: 3000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '8px',
          padding: '32px',
          maxWidth: '600px',
          maxHeight: '80vh',
          width: '90%',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '24px', flexShrink: 0 }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '12px', color: '#991B1B' }}>
            組織を削除
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--color-text-light)', lineHeight: '1.6', marginBottom: '12px' }}>
            組織「<strong style={{ color: 'var(--color-text)' }}>{organization.name}</strong>」を削除しますか？
          </p>
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#FEF2F2', 
            borderRadius: '6px', 
            border: '1px solid #FECACA',
            marginTop: '16px'
          }}>
            <p style={{ fontSize: '14px', color: '#7F1D1D', lineHeight: '1.6', margin: 0 }}>
              <strong>⚠️ 警告:</strong> この操作は取り消せません。
            </p>
            <p style={{ fontSize: '14px', color: '#7F1D1D', lineHeight: '1.6', marginTop: '8px', marginBottom: 0 }}>
              以下のデータがすべて削除されます：
            </p>
          </div>
        </div>

        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          marginBottom: '24px',
          padding: '12px',
          backgroundColor: '#F9FAFB',
          borderRadius: '6px',
          border: '1px solid #E5E7EB',
        }}>
          {loading ? (
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', textAlign: 'center', padding: '20px' }}>
              削除対象を読み込み中...
            </p>
          ) : (
            <>
              {/* 組織一覧（type='organization'） */}
              {(() => {
                const organizations = childOrganizations.filter(org => !org.type || org.type === 'organization');
                return (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#7F1D1D' }}>
                      削除される組織（{organizations.length}件）
                    </h3>
                    {organizations.length === 0 ? (
                      <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic', padding: '8px' }}>
                        組織はありません
                      </p>
                    ) : (
                      <div style={{ 
                        maxHeight: '150px', 
                        overflowY: 'auto',
                        backgroundColor: '#fff',
                        borderRadius: '4px',
                        padding: '8px',
                        border: '1px solid #E5E7EB',
                      }}>
                        {organizations.map((org) => (
                          <div 
                            key={org.id}
                            style={{
                              padding: '6px 8px',
                              fontSize: '14px',
                              color: 'var(--color-text)',
                              borderBottom: '1px solid #F3F4F6',
                            }}
                          >
                            <span style={{ fontWeight: 500 }}>{org.name}</span>
                            {org.title && (
                              <span style={{ color: 'var(--color-text-light)', marginLeft: '8px' }}>
                                ({org.title})
                              </span>
                            )}
                            <span style={{ color: 'var(--color-text-light)', marginLeft: '8px', fontSize: '12px' }}>
                              [{org.levelName}]
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 事業会社一覧（type='company'） */}
              {(() => {
                const companies = childOrganizations.filter(org => org.type === 'company');
                return (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#7F1D1D' }}>
                      削除される事業会社（{companies.length}件）
                    </h3>
                    {companies.length === 0 ? (
                      <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic', padding: '8px' }}>
                        事業会社はありません
                      </p>
                    ) : (
                      <div style={{ 
                        maxHeight: '150px', 
                        overflowY: 'auto',
                        backgroundColor: '#fff',
                        borderRadius: '4px',
                        padding: '8px',
                        border: '1px solid #E5E7EB',
                      }}>
                        {companies.map((org) => (
                          <div 
                            key={org.id}
                            style={{
                              padding: '6px 8px',
                              fontSize: '14px',
                              color: 'var(--color-text)',
                              borderBottom: '1px solid #F3F4F6',
                            }}
                          >
                            <span style={{ fontWeight: 500 }}>{org.name}</span>
                            {org.title && (
                              <span style={{ color: 'var(--color-text-light)', marginLeft: '8px' }}>
                                ({org.title})
                              </span>
                            )}
                            <span style={{ color: 'var(--color-text-light)', marginLeft: '8px', fontSize: '12px' }}>
                              [{org.levelName}]
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 個人（メンバー）一覧 */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#7F1D1D' }}>
                  削除される個人（{members.length}件）
                </h3>
                {members.length === 0 ? (
                  <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic', padding: '8px' }}>
                    個人はありません
                  </p>
                ) : (
                  <div style={{ 
                    maxHeight: '150px', 
                    overflowY: 'auto',
                    backgroundColor: '#fff',
                    borderRadius: '4px',
                    padding: '8px',
                    border: '1px solid #E5E7EB',
                  }}>
                    {members.map((member) => (
                      <div 
                        key={member.id}
                        style={{
                          padding: '6px 8px',
                          fontSize: '14px',
                          color: 'var(--color-text)',
                          borderBottom: '1px solid #F3F4F6',
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{member.name}</span>
                        {member.position && (
                          <span style={{ color: 'var(--color-text-light)', marginLeft: '8px' }}>
                            ({member.position})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexShrink: 0 }}>
          <button
            onClick={onClose}
            disabled={deleting || loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6B7280',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: (deleting || loading) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: (deleting || loading) ? 0.5 : 1,
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting || loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#EF4444',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: (deleting || loading) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: (deleting || loading) ? 0.5 : 1,
            }}
          >
            {deleting ? '削除中...' : '削除する'}
          </button>
        </div>
      </div>
    </div>
  );
}
