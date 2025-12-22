'use client';

import React from 'react';
import type { TopicInfo, OrgNodeData } from '@/lib/orgApi';
import { findOrganizationById } from '@/lib/orgApi';

interface TopicSelectionSectionProps {
  localTopicIds: string[];
  setLocalTopicIds: (ids: string[]) => void;
  topics: TopicInfo[];
  organizationId: string;
  orgData: OrgNodeData | null;
  isTopicsExpanded: boolean;
  setIsTopicsExpanded: (expanded: boolean) => void;
  onOpenModal: () => void;
}

export default function TopicSelectionSection({
  localTopicIds,
  setLocalTopicIds,
  topics,
  organizationId,
  orgData,
  isTopicsExpanded,
  setIsTopicsExpanded,
  onOpenModal,
}: TopicSelectionSectionProps) {
  return (
    <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #E5E7EB' }}>
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '12px',
          cursor: 'pointer',
        }}
        onClick={() => setIsTopicsExpanded(!isTopicsExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', transition: 'transform 0.2s', transform: isTopicsExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            ▶
          </span>
          <label style={{ display: 'block', fontWeight: '600', color: '#374151', fontSize: '16px', cursor: 'pointer' }}>
            個別トピック（複数選択可能）
            {localTopicIds.length > 0 && (
              <span style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280', marginLeft: '8px' }}>
                ({localTopicIds.length}件)
              </span>
            )}
          </label>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenModal();
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3B82F6',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2563EB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3B82F6';
          }}
        >
          <span>📝</span>
          <span>個別トピックを選択</span>
        </button>
      </div>
      
      {/* 開閉式の内容 */}
      {isTopicsExpanded && (
        <>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '12px' }}>
            この注力施策が関連する議事録アーカイブの個別トピックを選択してください
          </div>
          
          {/* 選択したトピックの表示 */}
          {localTopicIds.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              {localTopicIds.map((topicId) => {
                const topic = topics.find(t => t.id === topicId);
                if (!topic) {
                  // トピックが見つからない場合（他の組織のトピックが削除された可能性）
                  return (
                    <div
                      key={topicId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 12px',
                        border: '1px solid #EF4444',
                        borderRadius: '6px',
                        backgroundColor: '#FEE2E2',
                        fontSize: '14px',
                      }}
                    >
                      <span style={{ fontWeight: '500', marginRight: '8px', color: '#DC2626' }}>
                        トピックが見つかりません (ID: {topicId.substring(0, 20)}...)
                      </span>
                      <button
                        onClick={() => {
                          setLocalTopicIds(localTopicIds.filter(id => id !== topicId));
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          fontSize: '16px',
                          padding: '0',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#FEE2E2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        title="削除"
                      >
                        ×
                      </button>
                    </div>
                  );
                }
                
                // 組織名を取得
                const topicOrg = topic.organizationId ? findOrganizationById(orgData, topic.organizationId) : null;
                const topicOrgName = topicOrg ? (topicOrg.name || topicOrg.title || topic.organizationId) : topic.organizationId;
                const isOtherOrg = topic.organizationId !== organizationId;
                
                return (
                  <div
                    key={topicId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 12px',
                      border: `1px solid ${isOtherOrg ? '#F59E0B' : 'var(--color-primary)'}`,
                      borderRadius: '6px',
                      backgroundColor: isOtherOrg ? '#FEF3C7' : '#EFF6FF',
                      fontSize: '14px',
                    }}
                  >
                    {isOtherOrg && (
                      <span style={{ fontSize: '11px', color: '#F59E0B', fontWeight: '600', marginRight: '6px', padding: '2px 6px', backgroundColor: '#FDE68A', borderRadius: '4px' }}>
                        他組織
                      </span>
                    )}
                    <span style={{ fontWeight: '500', marginRight: '8px' }}>
                      {topic.title}
                    </span>
                    <span style={{ fontSize: '12px', color: '#9CA3AF', marginRight: '8px' }}>
                      ({topic.meetingNoteTitle})
                    </span>
                    {isOtherOrg && (
                      <span style={{ fontSize: '11px', color: '#6B7280', marginRight: '8px' }}>
                        [{topicOrgName}]
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setLocalTopicIds(localTopicIds.filter(id => id !== topicId));
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '0',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#FEE2E2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="削除"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: '14px', color: '#9CA3AF', fontStyle: 'italic', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '6px', border: '1px dashed #D1D5DB' }}>
              選択された個別トピックはありません。「個別トピックを選択」ボタンから選択してください。
            </div>
          )}
        </>
      )}
    </div>
  );
}

