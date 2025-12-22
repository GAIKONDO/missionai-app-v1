'use client';

import React from 'react';
import { isSimilarMatch } from '../../utils/similarMatch';

interface AssigneeSelectionSectionProps {
  localAssignee: string[];
  setLocalAssignee: (assignees: string[]) => void;
  assigneeInputRef: React.RefObject<HTMLInputElement>;
  assigneeDropdownRef: React.RefObject<HTMLDivElement>;
  assigneeSearchQuery: string;
  setAssigneeSearchQuery: (query: string) => void;
  isAssigneeDropdownOpen: boolean;
  setIsAssigneeDropdownOpen: (open: boolean) => void;
  orgMembers: Array<{ id: string; name: string; position?: string }>;
  allOrgMembers: Array<{ id: string; name: string; position?: string; organizationId?: string }>;
  manualAssigneeInput: string;
  setManualAssigneeInput: (input: string) => void;
  organizationId: string;
}

export default function AssigneeSelectionSection({
  localAssignee,
  setLocalAssignee,
  assigneeInputRef,
  assigneeDropdownRef,
  assigneeSearchQuery,
  setAssigneeSearchQuery,
  isAssigneeDropdownOpen,
  setIsAssigneeDropdownOpen,
  orgMembers,
  allOrgMembers,
  manualAssigneeInput,
  setManualAssigneeInput,
  organizationId,
}: AssigneeSelectionSectionProps) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
        担当者 {localAssignee.length > 0 && `(${localAssignee.length}人)`}
      </label>
      
      {/* 選択済みメンバーの表示 */}
      {localAssignee.length > 0 && (
        <div style={{ marginBottom: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {localAssignee.map((assignee, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            >
              <span style={{ color: '#1E40AF' }}>{assignee}</span>
              <button
                onClick={() => {
                  setLocalAssignee(localAssignee.filter((_, i) => i !== index));
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1E40AF',
                  cursor: 'pointer',
                  padding: '0',
                  fontSize: '16px',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="削除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* データベースから取得したメンバー選択フォームと自由入力フォームを横並び */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        {/* データベースから取得したメンバー選択フォーム */}
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#6B7280' }}>
            メンバーを選択（データベースから取得）
          </label>
          <div style={{ position: 'relative' }}>
            <input
              ref={assigneeInputRef}
              type="text"
              value={assigneeSearchQuery}
              onChange={(e) => {
                setAssigneeSearchQuery(e.target.value);
                setIsAssigneeDropdownOpen(true);
              }}
              onKeyDown={(e) => {
                // Escapeキーでドロップダウンを閉じる
                if (e.key === 'Escape') {
                  setIsAssigneeDropdownOpen(false);
                  setAssigneeSearchQuery('');
                }
                // Enterキーは無効化（ドロップダウンから選択のみ）
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
              onFocus={() => setIsAssigneeDropdownOpen(true)}
              placeholder="メンバーを検索して選択（ドロップダウンから選択のみ）"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
            {isAssigneeDropdownOpen && (
              <div
                ref={assigneeDropdownRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  zIndex: 1000,
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}
              >
                {/* 現在の組織のメンバー（検索クエリがない場合、または検索クエリがある場合は全組織メンバーも表示） */}
                {(() => {
                  const query = assigneeSearchQuery.toLowerCase();
                  const hasQuery = query.length > 0;
                  
                  // 検索クエリがある場合は全組織メンバーを、ない場合は現在の組織メンバーのみを表示
                  const membersToShow = hasQuery ? allOrgMembers : orgMembers;
                  
                  const filteredMembers = membersToShow
                    .filter((member) => {
                      if (!hasQuery) return true;
                      // 類似検索: 名前または役職で類似するものを検索
                      return (
                        isSimilarMatch(query, member.name) ||
                        (member.position && isSimilarMatch(query, member.position))
                      );
                    })
                    .filter((member) => !localAssignee.includes(member.name))
                    // 類似度でソート（完全一致 > 部分一致 > 類似）
                    .sort((a, b) => {
                      const aNameLower = a.name.toLowerCase();
                      const bNameLower = b.name.toLowerCase();
                      
                      // 完全一致を最優先
                      if (aNameLower === query) return -1;
                      if (bNameLower === query) return 1;
                      
                      // 部分一致を次に優先
                      const aStartsWith = aNameLower.startsWith(query);
                      const bStartsWith = bNameLower.startsWith(query);
                      if (aStartsWith && !bStartsWith) return -1;
                      if (!aStartsWith && bStartsWith) return 1;
                      
                      // 部分一致の場合は位置でソート
                      const aIndex = aNameLower.indexOf(query);
                      const bIndex = bNameLower.indexOf(query);
                      if (aIndex !== -1 && bIndex !== -1) {
                        return aIndex - bIndex;
                      }
                      if (aIndex !== -1) return -1;
                      if (bIndex !== -1) return 1;
                      
                      // それ以外は名前順
                      return aNameLower.localeCompare(bNameLower);
                    });
                  
                  if (filteredMembers.length === 0 && hasQuery) {
                    // 検索クエリがあるが結果がない場合でも、類似するメンバーを表示
                    // より緩い条件で再検索
                    const looseMatches = membersToShow
                      .filter((member) => {
                        // 入力文字列の各文字が名前に含まれているかチェック
                        const queryChars = query.split('');
                        const nameLower = member.name.toLowerCase();
                        const matchedChars = queryChars.filter(char => nameLower.includes(char)).length;
                        return matchedChars >= Math.max(1, Math.floor(queryChars.length * 0.3));
                      })
                      .filter((member) => !localAssignee.includes(member.name))
                      .slice(0, 10); // 最大10件まで表示
                    
                    if (looseMatches.length > 0) {
                      return looseMatches.map((member) => (
                        <div
                          key={member.id}
                          onClick={() => {
                            if (!localAssignee.includes(member.name)) {
                              setLocalAssignee([...localAssignee, member.name]);
                            }
                            setAssigneeSearchQuery('');
                            setIsAssigneeDropdownOpen(false);
                          }}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            borderBottom: '1px solid #F3F4F6',
                            transition: 'background-color 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            backgroundColor: '#FFFBF0',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#FEF3C7';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#FFFBF0';
                          }}
                        >
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              border: '2px solid #D1D5DB',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500, color: '#111827' }}>
                              {member.name}
                              <span style={{ fontSize: '11px', color: '#9CA3AF', marginLeft: '6px' }}>
                                (類似)
                              </span>
                              {query.length > 0 && (member as any).organizationId && (member as any).organizationId !== organizationId && (
                                <span style={{ fontSize: '11px', color: '#9CA3AF', marginLeft: '6px' }}>
                                  (他組織)
                                </span>
                              )}
                            </div>
                            {member.position && (
                              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                                {member.position}
                              </div>
                            )}
                          </div>
                        </div>
                      ));
                    }
                  }
                  
                  if (filteredMembers.length === 0) {
                    return (
                      <div style={{ padding: '10px 12px', fontSize: '14px', color: '#6B7280', textAlign: 'center' }}>
                        {hasQuery ? '類似するメンバーが見つかりません' : 'すべてのメンバーが選択済みです'}
                      </div>
                    );
                  }
                  
                  return filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      onClick={() => {
                        if (!localAssignee.includes(member.name)) {
                          setLocalAssignee([...localAssignee, member.name]);
                        }
                        setAssigneeSearchQuery('');
                        setIsAssigneeDropdownOpen(false);
                      }}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        borderBottom: '1px solid #F3F4F6',
                        transition: 'background-color 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                      }}
                    >
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          border: '2px solid #D1D5DB',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {localAssignee.includes(member.name) && (
                          <span style={{ color: '#3B82F6', fontSize: '12px' }}>✓</span>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: '#111827' }}>
                          {member.name}
                          {query.length > 0 && (member as any).organizationId && (member as any).organizationId !== organizationId && (
                            <span style={{ fontSize: '11px', color: '#9CA3AF', marginLeft: '6px' }}>
                              (他組織)
                            </span>
                          )}
                        </div>
                        {member.position && (
                          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                            {member.position}
                          </div>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
            {orgMembers.length > 0 && (
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#6B7280' }}>
                💡 ドロップダウンからメンバーをクリックして選択してください
              </div>
            )}
          </div>
        </div>
        
        {/* 自由入力フォーム */}
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#6B7280' }}>
            担当者を直接入力
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={manualAssigneeInput}
              onChange={(e) => setManualAssigneeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualAssigneeInput.trim()) {
                  e.preventDefault();
                  if (!localAssignee.includes(manualAssigneeInput.trim())) {
                    setLocalAssignee([...localAssignee, manualAssigneeInput.trim()]);
                  }
                  setManualAssigneeInput('');
                }
              }}
              placeholder="担当者名を直接入力"
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
            <button
              onClick={() => {
                if (manualAssigneeInput.trim() && !localAssignee.includes(manualAssigneeInput.trim())) {
                  setLocalAssignee([...localAssignee, manualAssigneeInput.trim()]);
                  setManualAssigneeInput('');
                }
              }}
              disabled={!manualAssigneeInput.trim()}
              style={{
                padding: '8px 16px',
                backgroundColor: manualAssigneeInput.trim() ? '#3B82F6' : '#9CA3AF',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: manualAssigneeInput.trim() ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (manualAssigneeInput.trim()) {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                }
              }}
              onMouseLeave={(e) => {
                if (manualAssigneeInput.trim()) {
                  e.currentTarget.style.backgroundColor = '#3B82F6';
                }
              }}
            >
              追加
            </button>
          </div>
          <div style={{ marginTop: '6px', fontSize: '12px', color: '#6B7280' }}>
            💡 担当者名を入力して「追加」ボタンをクリック、またはEnterキーで追加
          </div>
        </div>
      </div>
    </div>
  );
}

