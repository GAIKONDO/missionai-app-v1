'use client';

import React, { useState, useEffect } from 'react';
import { findOrganizationById, getMeetingNoteById, getTopicsByMeetingNote, getFocusInitiativeById, type OrgNodeData, type TopicInfo, type MeetingNote, type FocusInitiative } from '@/lib/orgApi';

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

interface TopicSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  localTopicIds: string[];
  setLocalTopicIds: (ids: string[]) => void;
  organizationId: string;
  initiativeId: string;
  allOrganizations: Array<{ id: string; name: string; title?: string }>;
  allMeetingNotes: MeetingNote[];
  orgTreeForModal: OrgNodeData | null;
  onSave: () => Promise<void>;
  savingStatus: 'idle' | 'saving' | 'saved';
  setSavingStatus: (status: 'idle' | 'saving' | 'saved') => void;
  setInitiative: (initiative: FocusInitiative) => void;
}

export default function TopicSelectModal({
  isOpen,
  onClose,
  localTopicIds,
  setLocalTopicIds,
  organizationId,
  initiativeId,
  allOrganizations,
  allMeetingNotes,
  orgTreeForModal,
  onSave,
  savingStatus,
  setSavingStatus,
  setInitiative,
}: TopicSelectModalProps) {
  const [topicSearchQuery, setTopicSearchQuery] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedMeetingNoteId, setSelectedMeetingNoteId] = useState<string>('');
  const [modalTopics, setModalTopics] = useState<TopicInfo[]>([]);
  const [orgIdInput, setOrgIdInput] = useState<string>('');
  const [meetingNoteIdInput, setMeetingNoteIdInput] = useState<string>('');
  const [filteredMeetingNotes, setFilteredMeetingNotes] = useState<MeetingNote[]>([]);

  // モーダルが開かれたときに、デフォルトで現在の組織を選択
  useEffect(() => {
    if (isOpen) {
      if (organizationId && allMeetingNotes.length > 0) {
        setSelectedOrgId(organizationId);
        const notes = allMeetingNotes.filter(note => note.organizationId === organizationId);
        setFilteredMeetingNotes(notes);
      }
    } else {
      // モーダルが閉じられたときに状態をリセット
      setTopicSearchQuery('');
      setSelectedOrgId('');
      setSelectedMeetingNoteId('');
      setModalTopics([]);
      setOrgIdInput('');
      setMeetingNoteIdInput('');
      setFilteredMeetingNotes([]);
    }
  }, [isOpen, organizationId, allMeetingNotes]);

  const handleClose = () => {
    setTopicSearchQuery('');
    setSelectedOrgId('');
    setSelectedMeetingNoteId('');
    setModalTopics([]);
    setOrgIdInput('');
    setMeetingNoteIdInput('');
    setFilteredMeetingNotes([]);
    onClose();
  };

  const handleSave = async () => {
    try {
      setSavingStatus('saving');
      devLog('💾 [モーダル保存] 保存開始:', {
        localTopicIds,
        localTopicIdsLength: localTopicIds.length,
      });
      await onSave();
      devLog('✅ [モーダル保存] 保存完了');
      
      // 保存成功後、データを再読み込み
      try {
        const updatedInitiative = await getFocusInitiativeById(initiativeId);
        if (updatedInitiative) {
          devLog('📖 [モーダル保存] 再読み込み完了:', {
            topicIdsLength: updatedInitiative.topicIds?.length || 0,
          });
          setInitiative(updatedInitiative);
          setLocalTopicIds(Array.isArray(updatedInitiative.topicIds) ? updatedInitiative.topicIds : []);
        }
      } catch (reloadError) {
        devWarn('⚠️ [モーダル保存] 再読み込みに失敗:', reloadError);
      }
      
      handleClose();
    } catch (error) {
      console.error('❌ [モーダル保存] 保存エラー:', error);
      setSavingStatus('idle');
    }
  };

  if (!isOpen) return null;

  // 検索フィルタリング
  const filteredTopics = modalTopics.filter(topic => {
    if (!topicSearchQuery) return true;
    const query = topicSearchQuery.toLowerCase();
    return (
      topic.title.toLowerCase().includes(query) ||
      topic.content.toLowerCase().includes(query)
    );
  });

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
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '1200px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#111827' }}>
              個別トピックを選択
            </h2>
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#6B7280' }}>
              選択済み: {localTopicIds.length}件
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#6B7280',
              cursor: 'pointer',
              padding: '4px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* 組織・事業会社・議事録選択セクション */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
          {/* ユニークID入力セクション */}
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '8px' }}>
              ユニークIDで直接指定（オプション）
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#6B7280' }}>
                  組織ID
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="組織IDを入力"
                    value={orgIdInput}
                    onChange={(e) => setOrgIdInput(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && orgIdInput.trim()) {
                        const foundOrg = findOrganizationById(orgTreeForModal, orgIdInput.trim());
                        if (foundOrg && foundOrg.id) {
                          setSelectedOrgId(foundOrg.id);
                          setSelectedMeetingNoteId('');
                          setModalTopics([]);
                          const notes = allMeetingNotes.filter(note => note.organizationId === foundOrg.id);
                          setFilteredMeetingNotes(notes);
                          setOrgIdInput('');
                        } else {
                          alert('指定された組織IDが見つかりませんでした');
                        }
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '13px',
                    }}
                  />
                  <button
                    onClick={async () => {
                      if (orgIdInput.trim()) {
                        const foundOrg = findOrganizationById(orgTreeForModal, orgIdInput.trim());
                        if (foundOrg && foundOrg.id) {
                          setSelectedOrgId(foundOrg.id);
                          setSelectedMeetingNoteId('');
                          setModalTopics([]);
                          const notes = allMeetingNotes.filter(note => note.organizationId === foundOrg.id);
                          setFilteredMeetingNotes(notes);
                          setOrgIdInput('');
                        } else {
                          alert('指定された組織IDが見つかりませんでした');
                        }
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#3B82F6',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    検索
                  </button>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#6B7280' }}>
                  議事録ID
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="議事録IDを入力"
                    value={meetingNoteIdInput}
                    onChange={(e) => setMeetingNoteIdInput(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && meetingNoteIdInput.trim()) {
                        const orgNote = await getMeetingNoteById(meetingNoteIdInput.trim());
                        if (orgNote) {
                          setSelectedMeetingNoteId(orgNote.id);
                          setSelectedOrgId(orgNote.organizationId);
                          const topics = await getTopicsByMeetingNote(orgNote.id);
                          setModalTopics(topics);
                          const notes = allMeetingNotes.filter(n => n.organizationId === orgNote.organizationId);
                          setFilteredMeetingNotes(notes);
                        } else {
                          alert('指定された議事録IDが見つかりませんでした');
                        }
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '13px',
                    }}
                  />
                  <button
                    onClick={async () => {
                      if (meetingNoteIdInput.trim()) {
                        const orgNote = await getMeetingNoteById(meetingNoteIdInput.trim());
                        if (orgNote) {
                          setSelectedMeetingNoteId(orgNote.id);
                          setSelectedOrgId(orgNote.organizationId);
                          const topics = await getTopicsByMeetingNote(orgNote.id);
                          setModalTopics(topics);
                          const notes = allMeetingNotes.filter(n => n.organizationId === orgNote.organizationId);
                          setFilteredMeetingNotes(notes);
                        } else {
                          alert('指定された議事録IDが見つかりませんでした');
                        }
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#3B82F6',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    検索
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 組織選択 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
              組織を選択
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedOrgId}
                onChange={async (e) => {
                  const orgId = e.target.value;
                  setSelectedOrgId(orgId);
                  setSelectedMeetingNoteId('');
                  setModalTopics([]);
                  if (orgId) {
                    const notes = allMeetingNotes.filter(note => note.organizationId === orgId);
                    setFilteredMeetingNotes(notes);
                  } else {
                    setFilteredMeetingNotes([]);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 14px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#FFFFFF',
                  appearance: 'none',
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%236B7280\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#9CA3AF';
                  e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3B82F6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="" style={{ color: '#9CA3AF' }}>組織を選択してください</option>
                {allOrganizations.map((org) => {
                  const displayName = org.name || org.title || org.id;
                  const englishName = org.title && org.name && org.title !== org.name ? org.title : null;
                  return (
                    <option key={org.id} value={org.id} style={{ color: '#111827' }}>
                      {displayName}{englishName ? ` (${englishName})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            {selectedOrgId && (
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#6B7280' }}>
                {(() => {
                  const selectedOrg = allOrganizations.find(org => org.id === selectedOrgId);
                  if (selectedOrg) {
                    const japaneseName = selectedOrg.name || '';
                    const englishName = selectedOrg.title && selectedOrg.name && selectedOrg.title !== selectedOrg.name ? selectedOrg.title : null;
                    return (
                      <span>
                        選択中: <span style={{ fontWeight: 500, color: '#374151' }}>{japaneseName}</span>
                        {englishName && <span style={{ color: '#9CA3AF' }}> ({englishName})</span>}
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>

          {/* 議事録カード表示 */}
          {selectedOrgId && filteredMeetingNotes.length > 0 && (
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                議事録アーカイブを選択 ({filteredMeetingNotes.length}件)
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '12px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  padding: '8px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                }}
              >
                {filteredMeetingNotes.map((note) => {
                  const isSelected = selectedMeetingNoteId === note.id;
                  return (
                    <div
                      key={note.id}
                      onClick={async () => {
                        setSelectedMeetingNoteId(note.id);
                        const topics = await getTopicsByMeetingNote(note.id);
                        setModalTopics(topics);
                      }}
                      style={{
                        padding: '12px',
                        border: `2px solid ${isSelected ? '#3B82F6' : '#E5E7EB'}`,
                        borderRadius: '8px',
                        backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = '#F9FAFB';
                          e.currentTarget.style.borderColor = '#D1D5DB';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                          e.currentTarget.style.borderColor = '#E5E7EB';
                        }
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                        {note.title}
                      </div>
                      {note.description && (
                        <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px', lineHeight: '1.4', maxHeight: '40px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {note.description.substring(0, 60)}{note.description.length > 60 ? '...' : ''}
                        </div>
                      )}
                      <div style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'monospace', marginTop: '4px' }}>
                        ID: {note.id}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 検索バー */}
        {selectedMeetingNoteId && (
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #E5E7EB' }}>
            <input
              type="text"
              placeholder="トピック名で検索..."
              value={topicSearchQuery}
              onChange={(e) => setTopicSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>
        )}

        {/* トピック一覧 */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px 24px',
          }}
        >
          {!selectedMeetingNoteId ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
              組織と議事録アーカイブを選択すると、その議事録で作成された個別トピックが表示されます。
            </div>
          ) : modalTopics.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
              この議事録アーカイブには個別トピックがありません。
            </div>
          ) : filteredTopics.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
              検索条件に一致するトピックが見つかりませんでした。
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredTopics.map((topic) => {
                const isSelected = localTopicIds.includes(topic.id);
                return (
                  <div
                    key={topic.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      devLog('🖱️ [モーダル] トピックカードがクリックされました:', {
                        topicId: topic.id,
                        topicTitle: topic.title,
                        currentLocalTopicIds: localTopicIds,
                        isSelected,
                      });
                      if (isSelected) {
                        const newTopicIds = localTopicIds.filter(id => id !== topic.id);
                        devLog('🗑️ [モーダル] トピックを削除:', {
                          topicId: topic.id,
                          topicTitle: topic.title,
                        });
                        setLocalTopicIds(newTopicIds);
                      } else {
                        const newTopicIds = [...localTopicIds, topic.id];
                        devLog('➕ [モーダル] トピックを追加:', {
                          topicId: topic.id,
                          topicTitle: topic.title,
                        });
                        setLocalTopicIds(newTopicIds);
                      }
                    }}
                    style={{
                      padding: '16px',
                      border: `1px solid ${isSelected ? 'var(--color-primary)' : '#E5E7EB'}`,
                      borderRadius: '8px',
                      backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                      }
                    }}
                  >
                    <div 
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            border: `2px solid ${isSelected ? 'var(--color-primary)' : '#D1D5DB'}`,
                            borderRadius: '4px',
                            backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            pointerEvents: 'none',
                          }}
                        >
                          {isSelected && (
                            <span style={{ color: '#FFFFFF', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                          )}
                        </div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827', pointerEvents: 'none' }}>
                          {topic.title}
                        </h3>
                      </div>
                    </div>
                    {topic.content && (
                      <div 
                        style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px', lineHeight: '1.5', maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }}
                      >
                        {topic.content.substring(0, 150)}{topic.content.length > 150 ? '...' : ''}
                      </div>
                    )}
                    <div 
                      style={{ marginTop: '8px', fontSize: '12px', color: '#9CA3AF', fontFamily: 'monospace', pointerEvents: 'none' }}
                    >
                      ID: {topic.id}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* フッター */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            onClick={handleClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            閉じる
          </button>
          <button
            onClick={handleSave}
            disabled={savingStatus === 'saving'}
            style={{
              padding: '10px 20px',
              backgroundColor: savingStatus === 'saving' ? '#9CA3AF' : '#10B981',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: savingStatus === 'saving' ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={(e) => {
              if (savingStatus !== 'saving') {
                e.currentTarget.style.backgroundColor = '#059669';
              }
            }}
            onMouseLeave={(e) => {
              if (savingStatus !== 'saving') {
                e.currentTarget.style.backgroundColor = '#10B981';
              }
            }}
          >
            {savingStatus === 'saving' ? (
              <>
                <span>保存中...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>保存</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

