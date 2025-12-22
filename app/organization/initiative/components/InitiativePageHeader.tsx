'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { FocusInitiative, OrgNodeData } from '@/lib/orgApi';

// アイコンコンポーネント
const SaveIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
    <polyline points="17 21 17 13 7 13 7 21"></polyline>
    <polyline points="7 3 7 8 15 8"></polyline>
  </svg>
);

const DownloadIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const BackIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5"></path>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

interface InitiativePageHeaderProps {
  orgData: OrgNodeData | null;
  initiative: FocusInitiative | null;
  organizationId: string;
  savingStatus: 'idle' | 'saving' | 'saved';
  onSave: () => void;
  onDownloadJson: () => void;
  activeTab: string;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  editingContent: string;
  setEditingContent: (content: string) => void;
}

export default function InitiativePageHeader({
  orgData,
  initiative,
  organizationId,
  savingStatus,
  onSave,
  onDownloadJson,
  activeTab,
  isEditing,
  setIsEditing,
  editingContent,
  setEditingContent,
}: InitiativePageHeaderProps) {
  const router = useRouter();

  return (
    <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '4px' }}>
          {orgData ? orgData.name : ''} / 注力施策
        </div>
        <h2 style={{ margin: 0 }}>{initiative?.title}</h2>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {activeTab === 'details' && (
          <>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                詳細を編集
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingContent(initiative?.content || '');
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                編集を終了
              </button>
            )}
          </>
        )}
        {savingStatus !== 'idle' && (
          <div style={{
            padding: '8px 12px',
            fontSize: '12px',
            color: savingStatus === 'saving' ? '#6B7280' : '#10B981',
            backgroundColor: savingStatus === 'saving' ? '#F3F4F6' : '#D1FAE5',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            {savingStatus === 'saving' ? '💾 保存中...' : '✅ 保存完了'}
          </div>
        )}
        <button
          onClick={onSave}
          disabled={savingStatus === 'saving'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            backgroundColor: savingStatus === 'saving' ? '#9CA3AF' : '#10B981',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: savingStatus === 'saving' ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s, opacity 0.2s',
            opacity: savingStatus === 'saving' ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (savingStatus !== 'saving') {
              e.currentTarget.style.backgroundColor = '#059669';
              e.currentTarget.style.opacity = '1';
            }
          }}
          onMouseLeave={(e) => {
            if (savingStatus !== 'saving') {
              e.currentTarget.style.backgroundColor = '#10B981';
              e.currentTarget.style.opacity = '1';
            }
          }}
          title="編集内容を保存します"
        >
          <SaveIcon size={18} color="white" />
        </button>
        <button
          onClick={onDownloadJson}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            backgroundColor: '#3B82F6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'background-color 0.2s, opacity 0.2s',
            opacity: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2563EB';
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3B82F6';
            e.currentTarget.style.opacity = '1';
          }}
          title="JSONファイルをダウンロード"
        >
          <DownloadIcon size={18} color="white" />
        </button>
        <button
          onClick={() => {
            router.push(`/organization/detail?id=${organizationId}&tab=focusInitiatives`);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            backgroundColor: '#6B7280',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'background-color 0.2s, opacity 0.2s',
            opacity: 0.9,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#4B5563';
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#6B7280';
            e.currentTarget.style.opacity = '0.9';
          }}
          title="戻る"
        >
          <BackIcon size={18} color="white" />
        </button>
      </div>
    </div>
  );
}

