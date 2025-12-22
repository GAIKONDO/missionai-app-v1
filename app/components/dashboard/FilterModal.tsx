'use client';

import type { Theme } from '@/lib/orgApi';
import type { OrgNodeData } from '@/lib/orgApi';
import type { HierarchyLevel } from '../../utils/organizationUtils';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewMode: 'all' | 'organization' | 'company' | 'person';
  selectedTypeFilter: 'all' | 'organization' | 'company' | 'person';
  hierarchyLevels: HierarchyLevel[];
  orgTree: OrgNodeData | null;
  themes: Theme[];
  filteredOrgIds: Set<string>;
  filteredThemeIds: Set<string>;
  onOrgFilterChange: (orgIds: Set<string>) => void;
  onThemeFilterChange: (themeIds: Set<string>) => void;
}

export function FilterModal({
  isOpen,
  onClose,
  viewMode,
  selectedTypeFilter,
  hierarchyLevels,
  orgTree,
  themes,
  filteredOrgIds,
  filteredThemeIds,
  onOrgFilterChange,
  onThemeFilterChange,
}: FilterModalProps) {
  if (!isOpen) return null;

  // 組織を検索するヘルパー関数
  const findOrg = (node: OrgNodeData, targetId: string): OrgNodeData | null => {
    if (node.id === targetId) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findOrg(child, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  const handleOrgToggle = (orgId: string) => {
    const newFilteredOrgIds = new Set(filteredOrgIds);
    if (newFilteredOrgIds.has(orgId)) {
      newFilteredOrgIds.delete(orgId);
    } else {
      newFilteredOrgIds.add(orgId);
    }
    onOrgFilterChange(newFilteredOrgIds);
  };

  const handleThemeToggle = (themeId: string) => {
    const newFilteredThemeIds = new Set(filteredThemeIds);
    if (newFilteredThemeIds.has(themeId)) {
      newFilteredThemeIds.delete(themeId);
    } else {
      newFilteredThemeIds.add(themeId);
    }
    onThemeFilterChange(newFilteredThemeIds);
  };

  const handleReset = () => {
    onOrgFilterChange(new Set());
    onThemeFilterChange(new Set());
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
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '32px',
          width: '95%',
          maxWidth: '1200px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#1A1A1A',
            margin: 0,
          }}>
            フィルター設定
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M15 5L5 15M5 5l10 10"
                stroke="#6B7280"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* 組織フィルター（階層ごと、ボタン形式） */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{
            display: 'block',
            fontSize: '16px',
            fontWeight: '600',
            color: '#1A1A1A',
            marginBottom: '20px',
          }}>
            {viewMode === 'company' ? '組織でフィルター（事業会社に紐づけられている組織）' : '組織でフィルター'}
          </label>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}>
            {hierarchyLevels.map(levelData => (
              <div key={levelData.level}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#4262FF',
                  marginBottom: '12px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #F3F4F6',
                }}>
                  レベル{levelData.level} ({levelData.orgs.length}組織)
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  padding: '16px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  backgroundColor: '#FAFAFA',
                }}>
                  {levelData.orgs.map(org => {
                    // 事業会社モードの場合、type='company'の組織のみ表示
                    if (selectedTypeFilter === 'company') {
                      const actualOrg = orgTree ? findOrg(orgTree, org.id) : null;
                      if (!actualOrg || (actualOrg as any).type !== 'company') return null;
                    }

                    const isSelected = filteredOrgIds.has(org.id);
                    return (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => handleOrgToggle(org.id)}
                        style={{
                          padding: '12px 20px',
                          fontSize: '14px',
                          fontWeight: isSelected ? '600' : '400',
                          color: isSelected ? '#4262FF' : '#1A1A1A',
                          backgroundColor: isSelected ? '#F0F4FF' : '#FFFFFF',
                          border: isSelected ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 150ms',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = '#C4C4C4';
                            e.currentTarget.style.backgroundColor = '#FAFAFA';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = '#E0E0E0';
                            e.currentTarget.style.backgroundColor = '#FFFFFF';
                          }
                        }}
                      >
                        {org.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* テーマフィルター（ボタン形式） */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{
            display: 'block',
            fontSize: '16px',
            fontWeight: '600',
            color: '#1A1A1A',
            marginBottom: '20px',
          }}>
            テーマでフィルター
          </label>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            maxHeight: '400px',
            overflowY: 'auto',
            padding: '16px',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            backgroundColor: '#FAFAFA',
          }}>
            {themes.length === 0 ? (
              <p style={{
                fontSize: '13px',
                color: '#6B7280',
                width: '100%',
                textAlign: 'center',
                padding: '20px',
              }}>
                テーマが登録されていません
              </p>
            ) : (
              themes.map(theme => {
                const isSelected = filteredThemeIds.has(theme.id);
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleThemeToggle(theme.id)}
                    style={{
                      padding: '12px 20px',
                      fontSize: '14px',
                      fontWeight: isSelected ? '600' : '400',
                      color: isSelected ? '#4262FF' : '#1A1A1A',
                      backgroundColor: isSelected ? '#F0F4FF' : '#FFFFFF',
                      border: isSelected ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#C4C4C4';
                        e.currentTarget.style.backgroundColor = '#FAFAFA';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#E0E0E0';
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                      }
                    }}
                  >
                    {theme.title}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* アクションボタン */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          paddingTop: '16px',
          borderTop: '1px solid #E5E7EB',
        }}>
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#6B7280',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #E0E0E0',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#C4C4C4';
              e.currentTarget.style.backgroundColor = '#FAFAFA';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E0E0E0';
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            リセット
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#FFFFFF',
              backgroundColor: '#4262FF',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#3151CC';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4262FF';
            }}
          >
            適用
          </button>
        </div>
      </div>
    </div>
  );
}

