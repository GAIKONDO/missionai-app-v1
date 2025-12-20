'use client';

import { useState } from 'react';

interface Organization {
  id: string;
  name: string;
  title?: string;
  type?: string | undefined;
}

interface Member {
  id: string;
  name: string;
  position?: string;
  organizationId: string;
}

interface KnowledgeGraphFiltersProps {
  organizations: Organization[];
  members: Member[];
  selectedOrganizationIds: Set<string>;
  setSelectedOrganizationIds: (ids: Set<string>) => void;
  selectedMemberIds: Set<string>;
  setSelectedMemberIds: (ids: Set<string>) => void;
  dateRangeStart: string;
  setDateRangeStart: (date: string) => void;
  dateRangeEnd: string;
  setDateRangeEnd: (date: string) => void;
  selectedImportance: Set<'high' | 'medium' | 'low'>;
  setSelectedImportance: (importance: Set<'high' | 'medium' | 'low'>) => void;
  isLoadingFilters: boolean;
  showOrganizationFilter: boolean;
  setShowOrganizationFilter: (show: boolean) => void;
  showMemberFilter: boolean;
  setShowMemberFilter: (show: boolean) => void;
  showImportanceFilter: boolean;
  setShowImportanceFilter: (show: boolean) => void;
}

export default function KnowledgeGraphFilters({
  organizations,
  members,
  selectedOrganizationIds,
  setSelectedOrganizationIds,
  selectedMemberIds,
  setSelectedMemberIds,
  dateRangeStart,
  setDateRangeStart,
  dateRangeEnd,
  setDateRangeEnd,
  selectedImportance,
  setSelectedImportance,
  isLoadingFilters,
  showOrganizationFilter,
  setShowOrganizationFilter,
  showMemberFilter,
  setShowMemberFilter,
  showImportanceFilter,
  setShowImportanceFilter,
}: KnowledgeGraphFiltersProps) {
  const hasActiveFilters = selectedOrganizationIds.size > 0 || 
    selectedMemberIds.size > 0 || 
    dateRangeStart || 
    dateRangeEnd || 
    selectedImportance.size > 0;

  const handleResetFilters = () => {
    setSelectedOrganizationIds(new Set());
    setSelectedMemberIds(new Set());
    setDateRangeStart('');
    setDateRangeEnd('');
    setSelectedImportance(new Set());
  };

  return (
    <>
      {/* フィルターセクション */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: '#F9FAFB',
        borderRadius: '8px',
        border: '1px solid #E5E7EB',
        alignItems: 'flex-start',
      }}>
        {/* 組織フィルター */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '14px', color: '#6B7280', whiteSpace: 'nowrap' }}>
              組織:
            </label>
            <button
              onClick={() => setShowOrganizationFilter(!showOrganizationFilter)}
              disabled={isLoadingFilters}
              style={{
                padding: '6px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#FFFFFF',
                color: '#1F2937',
                cursor: isLoadingFilters ? 'not-allowed' : 'pointer',
                minWidth: '200px',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                {selectedOrganizationIds.size === 0
                  ? 'すべての組織'
                  : `${selectedOrganizationIds.size}件選択中`}
              </span>
              <span style={{ fontSize: '12px' }}>{showOrganizationFilter ? '▲' : '▼'}</span>
            </button>
          </div>
          
          {showOrganizationFilter && (
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              padding: '8px',
              marginTop: '4px',
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedOrganizationIds.size === 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedOrganizationIds(new Set());
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px' }}>すべての組織</span>
              </label>
              {organizations.map(org => (
                <label
                  key={org.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={selectedOrganizationIds.has(org.id)}
                    onChange={(e) => {
                      const newSet = new Set(selectedOrganizationIds);
                      if (e.target.checked) {
                        newSet.add(org.id);
                      } else {
                        newSet.delete(org.id);
                      }
                      setSelectedOrganizationIds(newSet);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px' }}>{org.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        
        {/* 担当者フィルター */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '14px', color: '#6B7280', whiteSpace: 'nowrap' }}>
              担当者:
            </label>
            <button
              onClick={() => setShowMemberFilter(!showMemberFilter)}
              disabled={isLoadingFilters}
              style={{
                padding: '6px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#FFFFFF',
                color: '#1F2937',
                cursor: isLoadingFilters ? 'not-allowed' : 'pointer',
                minWidth: '200px',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                {selectedMemberIds.size === 0
                  ? 'すべての担当者'
                  : `${selectedMemberIds.size}件選択中`}
              </span>
              <span style={{ fontSize: '12px' }}>{showMemberFilter ? '▲' : '▼'}</span>
            </button>
          </div>
          
          {showMemberFilter && (
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              padding: '8px',
              marginTop: '4px',
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedMemberIds.size === 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedMemberIds(new Set());
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px' }}>すべての担当者</span>
              </label>
              {(selectedOrganizationIds.size > 0
                ? members.filter(m => selectedOrganizationIds.has(m.organizationId))
                : members
              ).map(member => (
                <label
                  key={member.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.has(member.id)}
                    onChange={(e) => {
                      const newSet = new Set(selectedMemberIds);
                      if (e.target.checked) {
                        newSet.add(member.id);
                      } else {
                        newSet.delete(member.id);
                      }
                      setSelectedMemberIds(newSet);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px' }}>
                    {member.name} {member.position ? `(${member.position})` : ''}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
        
        {/* 期間フィルター */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '14px', color: '#6B7280', whiteSpace: 'nowrap' }}>
            期間:
          </label>
          <input
            type="date"
            value={dateRangeStart}
            onChange={(e) => setDateRangeStart(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: '#FFFFFF',
              color: '#1F2937',
            }}
            placeholder="開始日"
          />
          <span style={{ fontSize: '14px', color: '#6B7280' }}>〜</span>
          <input
            type="date"
            value={dateRangeEnd}
            onChange={(e) => setDateRangeEnd(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: '#FFFFFF',
              color: '#1F2937',
            }}
            placeholder="終了日"
          />
        </div>
        
        {/* 重要度フィルター */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button
            onClick={() => setShowImportanceFilter(!showImportanceFilter)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#374151',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minWidth: '150px',
            }}
          >
            <span>
              {selectedImportance.size === 0
                ? 'すべての重要度'
                : `${selectedImportance.size}件選択中`}
            </span>
            <span style={{ fontSize: '12px' }}>{showImportanceFilter ? '▲' : '▼'}</span>
          </button>
          
          {showImportanceFilter && (
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              padding: '8px',
              marginTop: '4px',
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedImportance.size === 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedImportance(new Set());
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px' }}>すべての重要度</span>
              </label>
              {[
                { value: 'high' as const, label: '🔴 高' },
                { value: 'medium' as const, label: '🟡 中' },
                { value: 'low' as const, label: '🟢 低' },
              ].map(importance => (
                <label
                  key={importance.value}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={selectedImportance.has(importance.value)}
                    onChange={(e) => {
                      const newSet = new Set(selectedImportance);
                      if (e.target.checked) {
                        newSet.add(importance.value);
                      } else {
                        newSet.delete(importance.value);
                      }
                      setSelectedImportance(newSet);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px' }}>{importance.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        
        {/* フィルターリセットボタン */}
        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            style={{
              padding: '6px 12px',
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: 500,
              alignSelf: 'flex-start',
              marginTop: '4px',
            }}
          >
            フィルターをリセット
          </button>
        )}
        
        {isLoadingFilters && (
          <div style={{ fontSize: '12px', color: '#6B7280', alignSelf: 'flex-start', marginTop: '4px' }}>
            読み込み中...
          </div>
        )}
      </div>
      
      {/* 選択中のフィルターをバッジで表示 */}
      {hasActiveFilters && (
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          padding: '12px',
          backgroundColor: '#F9FAFB',
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
            選択中:
          </div>
          
          {/* 選択された組織のバッジ */}
          {Array.from(selectedOrganizationIds).map(orgId => {
            const org = organizations.find(o => o.id === orgId);
            if (!org) return null;
            return (
              <div
                key={`org-${orgId}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                <span>🏛️ {org.name}</span>
                <button
                  onClick={() => {
                    const newSet = new Set(selectedOrganizationIds);
                    newSet.delete(orgId);
                    setSelectedOrganizationIds(newSet);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    padding: '0',
                    marginLeft: '4px',
                    lineHeight: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '16px',
                    height: '16px',
                  }}
                  title="削除"
                >
                  ×
                </button>
              </div>
            );
          })}
          
          {/* 選択された担当者のバッジ */}
          {Array.from(selectedMemberIds).map(memberId => {
            const member = members.find(m => m.id === memberId);
            if (!member) return null;
            return (
              <div
                key={`member-${memberId}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                <span>👤 {member.name}</span>
                <button
                  onClick={() => {
                    const newSet = new Set(selectedMemberIds);
                    newSet.delete(memberId);
                    setSelectedMemberIds(newSet);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    padding: '0',
                    marginLeft: '4px',
                    lineHeight: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '16px',
                    height: '16px',
                  }}
                  title="削除"
                >
                  ×
                </button>
              </div>
            );
          })}
          
          {/* 期間フィルターのバッジ */}
          {(dateRangeStart || dateRangeEnd) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                backgroundColor: '#8B5CF6',
                color: '#FFFFFF',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              <span>
                📅 {dateRangeStart || '開始日なし'} 〜 {dateRangeEnd || '終了日なし'}
              </span>
              <button
                onClick={() => {
                  setDateRangeStart('');
                  setDateRangeEnd('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  padding: '0',
                  marginLeft: '4px',
                  lineHeight: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '16px',
                  height: '16px',
                }}
                title="削除"
              >
                ×
              </button>
            </div>
          )}
          
          {/* 重要度フィルターのバッジ */}
          {Array.from(selectedImportance).map(importance => {
            const importanceLabels: Record<'high' | 'medium' | 'low', string> = {
              high: '🔴 高',
              medium: '🟡 中',
              low: '🟢 低',
            };
            const importanceColors: Record<'high' | 'medium' | 'low', { bg: string; text: string }> = {
              high: { bg: '#FEF2F2', text: '#DC2626' },
              medium: { bg: '#FEF3C7', text: '#D97706' },
              low: { bg: '#F0FDF4', text: '#16A34A' },
            };
            return (
              <div
                key={`importance-${importance}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  backgroundColor: importanceColors[importance].bg,
                  color: importanceColors[importance].text,
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                <span>{importanceLabels[importance]}</span>
                <button
                  onClick={() => {
                    const newSet = new Set(selectedImportance);
                    newSet.delete(importance);
                    setSelectedImportance(newSet);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: importanceColors[importance].text,
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    padding: '0',
                    marginLeft: '4px',
                    lineHeight: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '16px',
                    height: '16px',
                  }}
                  title="削除"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
