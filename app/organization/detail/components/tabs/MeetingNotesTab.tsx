'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { MeetingNote } from '@/lib/orgApi';

interface MeetingNotesTabProps {
  organizationId: string;
  meetingNotes: MeetingNote[];
  editingMeetingNoteId: string | null;
  editingMeetingNoteTitle: string;
  setEditingMeetingNoteTitle: (title: string) => void;
  savingMeetingNote: boolean;
  tabRef: React.RefObject<HTMLDivElement>;
  onDownloadImage: (tabType: 'introduction' | 'focusAreas' | 'focusInitiatives' | 'meetingNotes') => void;
  onOpenAddModal: () => void;
  onStartEdit: (note: MeetingNote) => void;
  onCancelEdit: () => void;
  onSaveEdit: (noteId: string) => void;
  onDelete: (noteId: string) => void;
}

export default function MeetingNotesTab({
  organizationId,
  meetingNotes,
  editingMeetingNoteId,
  editingMeetingNoteTitle,
  setEditingMeetingNoteTitle,
  savingMeetingNote,
  tabRef,
  onDownloadImage,
  onOpenAddModal,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: MeetingNotesTabProps) {
  const router = useRouter();

  return (
    <div ref={tabRef}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button
          type="button"
          onClick={() => onDownloadImage('meetingNotes')}
          title="議事録を画像としてダウンロード"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            padding: 0,
            fontSize: '14px',
            color: '#6B7280',
            backgroundColor: 'transparent',
            border: '1px solid #E5E7EB',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F3F4F6';
            e.currentTarget.style.borderColor = '#D1D5DB';
            e.currentTarget.style.color = '#374151';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = '#E5E7EB';
            e.currentTarget.style.color = '#6B7280';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 2.5V12.5M10 12.5L6.25 8.75M10 12.5L13.75 8.75M2.5 15V16.25C2.5 16.913 3.037 17.5 3.75 17.5H16.25C16.963 17.5 17.5 16.913 17.5 16.25V15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
          議事録 ({meetingNotes.length}件)
        </h3>
        <button
          onClick={onOpenAddModal}
          style={{
            padding: '8px 16px',
            backgroundColor: '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#059669';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#10B981';
          }}
        >
          + 追加
        </button>
      </div>
      {meetingNotes.length === 0 ? (
        <p style={{ color: 'var(--color-text-light)', padding: '20px', textAlign: 'center' }}>
          議事録が登録されていません
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
          }}
        >
          {meetingNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => {
                if (editingMeetingNoteId !== note.id && organizationId && note.id) {
                  router.push(`/organization/detail/meeting?meetingId=${note.id}&id=${organizationId}`);
                }
              }}
              style={{
                padding: '16px',
                backgroundColor: '#ffffff',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                cursor: editingMeetingNoteId !== note.id ? 'pointer' : 'default',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
              onMouseEnter={(e) => {
                if (editingMeetingNoteId !== note.id) {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                  e.currentTarget.style.borderColor = '#3B82F6';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (editingMeetingNoteId !== note.id) {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {editingMeetingNoteId === note.id ? (
                <div>
                  <input
                    type="text"
                    value={editingMeetingNoteTitle}
                    onChange={(e) => setEditingMeetingNoteTitle(e.target.value)}
                    autoFocus
                    disabled={savingMeetingNote}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #3B82F6',
                      borderRadius: '6px',
                      fontSize: '16px',
                      fontWeight: 600,
                      marginBottom: '8px',
                      backgroundColor: savingMeetingNote ? '#F3F4F6' : '#FFFFFF',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onSaveEdit(note.id);
                      } else if (e.key === 'Escape') {
                        onCancelEdit();
                      }
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={onCancelEdit}
                      disabled={savingMeetingNote}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#6B7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: savingMeetingNote ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => onSaveEdit(note.id)}
                      disabled={savingMeetingNote || !editingMeetingNoteTitle.trim()}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: savingMeetingNote || !editingMeetingNoteTitle.trim() ? '#9CA3AF' : '#10B981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: savingMeetingNote || !editingMeetingNoteTitle.trim() ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      {savingMeetingNote ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h4 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (organizationId && note.id) {
                          router.push(`/organization/detail/meeting?meetingId=${note.id}&id=${organizationId}`);
                        }
                      }}
                      style={{ 
                        fontSize: '16px', 
                        fontWeight: 600, 
                        color: 'var(--color-text)',
                        cursor: 'pointer',
                        flex: 1,
                      }}
                    >
                      {note.title}
                    </h4>
                    <div style={{ display: 'flex', gap: '2px', marginLeft: '8px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartEdit(note);
                        }}
                        disabled={savingMeetingNote}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          padding: 0,
                          backgroundColor: 'transparent',
                          color: '#9CA3AF',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: savingMeetingNote ? 'not-allowed' : 'pointer',
                          opacity: 0.3,
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!savingMeetingNote) {
                            e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.08)';
                            e.currentTarget.style.opacity = '0.6';
                            e.currentTarget.style.color = '#6B7280';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!savingMeetingNote) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.opacity = '0.3';
                            e.currentTarget.style.color = '#9CA3AF';
                          }
                        }}
                        title="編集"
                      >
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style={{ display: 'block' }}>
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(note.id);
                        }}
                        disabled={savingMeetingNote}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          padding: 0,
                          backgroundColor: 'transparent',
                          color: '#9CA3AF',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: savingMeetingNote ? 'not-allowed' : 'pointer',
                          opacity: 0.3,
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!savingMeetingNote) {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                            e.currentTarget.style.opacity = '0.6';
                            e.currentTarget.style.color = '#9CA3AF';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!savingMeetingNote) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.opacity = '0.3';
                            e.currentTarget.style.color = '#9CA3AF';
                          }
                        }}
                        title="削除"
                      >
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style={{ display: 'block' }}>
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {note.description && (
                    <p style={{ fontSize: '14px', color: 'var(--color-text-light)', marginBottom: '8px', lineHeight: '1.5' }}>
                      {note.description}
                    </p>
                  )}
                  {note.createdAt && (
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>
                      作成日: {new Date(note.createdAt).toLocaleDateString('ja-JP')}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

