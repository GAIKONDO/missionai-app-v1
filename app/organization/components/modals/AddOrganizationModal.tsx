'use client';

import { useState } from 'react';
import type { OrgNodeData } from '@/components/OrgChart';
import { createOrg, tauriAlert } from '@/lib/orgApi';

interface AddOrganizationModalProps {
  orgTree: OrgNodeData | null;
  onClose: () => void;
  onSave: () => Promise<void>;
}

export default function AddOrganizationModal({
  orgTree,
  onClose,
  onSave,
}: AddOrganizationModalProps) {
  const [parentId, setParentId] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<OrgNodeData[]>([]); // Finder風の選択パス
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [position, setPosition] = useState(0);
  const [saving, setSaving] = useState(false);
  const [creatingAtPath, setCreatingAtPath] = useState<number | null>(null); // どのカラムで作成中か

  // 組織ツリーからルート組織を取得
  const getRootOrganizations = (): OrgNodeData[] => {
    if (!orgTree) return [];
    
    // virtual-rootの場合は、その子ノード（実際のルート組織）を返す
    if (orgTree.id === 'virtual-root' && orgTree.children) {
      return orgTree.children;
    }
    
    // 単一のルート組織の場合
    return [orgTree];
  };

  // 選択されたパスに基づいて、現在表示すべきカラムの組織リストを取得
  const getCurrentColumnOrgs = (): OrgNodeData[] => {
    if (selectedPath.length === 0) {
      // 最初のカラム: ルート組織
      return getRootOrganizations();
    }
    
    // 最後に選択された組織の子組織を返す
    const lastSelected = selectedPath[selectedPath.length - 1];
    return lastSelected.children || [];
  };

  // 組織を選択したときの処理
  const handleOrgSelect = (org: OrgNodeData, columnIndex: number) => {
    // 選択されたカラムより後のパスを削除
    const newPath = selectedPath.slice(0, columnIndex);
    newPath.push(org);
    setSelectedPath(newPath);
    setParentId(org.id || null);
    setCreatingAtPath(null); // 選択時は作成モードを解除
  };

  // 「+」ボタンで組織作成を開始
  const handleCreateAtPath = (columnIndex: number) => {
    // 選択パスをcolumnIndexまでに制限
    const newPath = selectedPath.slice(0, columnIndex);
    setSelectedPath(newPath);
    setParentId(columnIndex === 0 ? null : (newPath[newPath.length - 1]?.id || null));
    setCreatingAtPath(columnIndex);
    setName(''); // 名前をリセット
    setTitle('');
    setDescription('');
    setPosition(0);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      await tauriAlert('組織名は必須です');
      return;
    }
    setSaving(true);
    try {
      // 階層レベルを自動計算（親組織の階層レベル+1、親がない場合は1）
      const parentLevel = selectedPath.length > 0 
        ? ((selectedPath[selectedPath.length - 1] as any).level !== undefined ? (selectedPath[selectedPath.length - 1] as any).level : 0)
        : -1;
      const level = parentLevel >= 0 ? parentLevel + 1 : 1;
      const levelName = `階層レベル ${level}`;
      await createOrg(
        parentId,
        name.trim(),
        title.trim() || null,
        description.trim() || null,
        level,
        levelName,
        position
      );
      await onSave();
    } catch (error: any) {
      console.error('組織追加エラー:', error);
      await tauriAlert(`組織の追加に失敗しました: ${error.message}`);
    } finally {
      setSaving(false);
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
        zIndex: 2000,
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '8px',
          padding: '32px',
          maxWidth: '1200px',
          width: '95%',
          maxHeight: '95vh',
          overflow: 'auto',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
            組織を追加
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-light)',
              fontSize: '20px',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Finder風カラム表示セクション */}
          <div style={{ 
            padding: '16px', 
            backgroundColor: 'var(--color-background)', 
            borderRadius: '8px',
            border: '1px solid var(--color-border-color)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text)' }}>
              組織の作成
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
                  親組織の選択
                </label>
                
                {/* 選択パスの表示 */}
                {selectedPath.length > 0 && (
                  <div style={{ 
                    marginBottom: '12px', 
                    padding: '8px 12px', 
                    backgroundColor: 'var(--color-background)', 
                    borderRadius: '6px',
                    border: '1px solid var(--color-border-color)',
                    fontSize: '13px',
                    color: 'var(--color-text-light)'
                  }}>
                    <span style={{ fontWeight: '500', color: 'var(--color-text)' }}>選択パス: </span>
                    {selectedPath.map((org, index) => (
                      <span key={org.id || index}>
                        {index > 0 && <span style={{ margin: '0 4px', color: 'var(--color-text-light)' }}>›</span>}
                        <span style={{ color: index === selectedPath.length - 1 ? 'var(--color-text)' : 'var(--color-text-light)' }}>
                          {org.name}
                        </span>
                      </span>
                    ))}
                    <button
                      onClick={() => {
                        setSelectedPath([]);
                        setParentId(null);
                      }}
                      style={{
                        marginLeft: '12px',
                        padding: '4px 8px',
                        fontSize: '12px',
                        backgroundColor: 'transparent',
                        border: '1px solid var(--color-border-color)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: 'var(--color-text-light)',
                      }}
                    >
                      クリア
                    </button>
                  </div>
                )}

                {/* Finder風カラム表示 */}
                <div style={{ 
                  display: 'flex', 
                  gap: '1px', 
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  backgroundColor: 'var(--color-border-color)',
                  minHeight: '300px',
                  maxHeight: '400px',
                }}>
                  {/* 最初のカラム（ルート組織） */}
                  <div style={{ 
                    flex: '0 0 200px',
                    backgroundColor: 'var(--color-surface)',
                    overflowY: 'auto',
                    borderRight: '1px solid var(--color-border-color)',
                  }}>
                    <div style={{ 
                      padding: '8px 12px', 
                      backgroundColor: 'var(--color-background)',
                      borderBottom: '1px solid var(--color-border-color)',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--color-text-light)',
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                    }}>
                      ルート組織
                    </div>
                    {/* +ボタン（ルート組織を作成） */}
                    <div
                      onClick={() => handleCreateAtPath(0)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: creatingAtPath === 0 ? 'var(--color-background)' : 'transparent',
                        borderLeft: creatingAtPath === 0 ? '3px solid #3B82F6' : '3px solid transparent',
                        fontSize: '13px',
                        transition: 'background-color 0.2s',
                        color: creatingAtPath === 0 ? '#3B82F6' : 'var(--color-text-light)',
                        fontWeight: creatingAtPath === 0 ? '600' : '400',
                      }}
                      onMouseEnter={(e) => {
                        if (creatingAtPath !== 0) {
                          e.currentTarget.style.backgroundColor = 'var(--color-background)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (creatingAtPath !== 0) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <span style={{ fontSize: '16px', lineHeight: '1' }}>+</span>
                      <span>新しい組織を作成</span>
                    </div>
                    {getRootOrganizations().map((org) => (
                      <div
                        key={org.id}
                        onClick={() => handleOrgSelect(org, 0)}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          backgroundColor: selectedPath[0]?.id === org.id ? 'var(--color-background)' : 'transparent',
                          borderLeft: selectedPath[0]?.id === org.id ? '3px solid #3B82F6' : '3px solid transparent',
                          fontSize: '13px',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedPath[0]?.id !== org.id) {
                            e.currentTarget.style.backgroundColor = 'var(--color-background)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedPath[0]?.id !== org.id) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {org.name}
                      </div>
                    ))}
                  </div>

                  {/* 選択されたパスに基づいて追加のカラムを表示 */}
                  {selectedPath.map((selectedOrg, columnIndex) => {
                    const childOrgs = selectedOrg.children || [];
                    const columnNumber = columnIndex + 1;

                    return (
                      <div
                        key={selectedOrg.id || columnIndex}
                        style={{
                          flex: '0 0 200px',
                          backgroundColor: 'var(--color-surface)',
                          overflowY: 'auto',
                          borderRight: columnIndex < selectedPath.length - 1 ? '1px solid var(--color-border-color)' : 'none',
                        }}
                      >
                        <div style={{
                          padding: '8px 12px',
                          backgroundColor: 'var(--color-background)',
                          borderBottom: '1px solid var(--color-border-color)',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: 'var(--color-text-light)',
                          position: 'sticky',
                          top: 0,
                          zIndex: 1,
                        }}>
                          {selectedOrg.name}
                        </div>
                        {/* +ボタン（この組織の子組織を作成） */}
                        <div
                          onClick={() => handleCreateAtPath(columnNumber)}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            backgroundColor: creatingAtPath === columnNumber ? 'var(--color-background)' : 'transparent',
                            borderLeft: creatingAtPath === columnNumber ? '3px solid #3B82F6' : '3px solid transparent',
                            fontSize: '13px',
                            transition: 'background-color 0.2s',
                            color: creatingAtPath === columnNumber ? '#3B82F6' : 'var(--color-text-light)',
                            fontWeight: creatingAtPath === columnNumber ? '600' : '400',
                          }}
                          onMouseEnter={(e) => {
                            if (creatingAtPath !== columnNumber) {
                              e.currentTarget.style.backgroundColor = 'var(--color-background)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (creatingAtPath !== columnNumber) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          <span style={{ fontSize: '16px', lineHeight: '1' }}>+</span>
                          <span>新しい組織を作成</span>
                        </div>
                        {childOrgs.map((childOrg) => (
                          <div
                            key={childOrg.id}
                            onClick={() => handleOrgSelect(childOrg, columnNumber)}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              backgroundColor: selectedPath[columnNumber]?.id === childOrg.id ? 'var(--color-background)' : 'transparent',
                              borderLeft: selectedPath[columnNumber]?.id === childOrg.id ? '3px solid #3B82F6' : '3px solid transparent',
                              fontSize: '13px',
                              transition: 'background-color 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              if (selectedPath[columnNumber]?.id !== childOrg.id) {
                                e.currentTarget.style.backgroundColor = 'var(--color-background)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (selectedPath[columnNumber]?.id !== childOrg.id) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            {childOrg.name}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
                
                <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-light)' }}>
                  各カラムの「+」ボタンをクリックして、その位置に新しい組織を作成できます。
                </p>
              </div>

              {/* 組織名入力（作成モード時のみ表示） */}
              {creatingAtPath !== null && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
                      組織名 <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid var(--color-border-color)',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: 'var(--color-surface)',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--color-border-color)'}
                      placeholder="組織名を入力してください"
                      autoFocus
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 詳細情報セクション（作成モード時のみ表示） */}
          {creatingAtPath !== null && (
            <div style={{ 
              padding: '16px', 
              backgroundColor: 'var(--color-background)', 
              borderRadius: '8px',
              border: '1px solid var(--color-border-color)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text)' }}>
                詳細情報（任意）
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
                    英語名
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid var(--color-border-color)',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: 'var(--color-surface)',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--color-border-color)'}
                    placeholder="英語名を入力してください（任意）"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
                    説明
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid var(--color-border-color)',
                      borderRadius: '6px',
                      fontSize: '14px',
                      minHeight: '100px',
                      resize: 'vertical',
                      backgroundColor: 'var(--color-surface)',
                      transition: 'border-color 0.2s',
                      fontFamily: 'inherit',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--color-border-color)'}
                    placeholder="組織の説明を入力してください（任意）"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
                    表示順序
                  </label>
                  <input
                    type="number"
                    value={position}
                    onChange={(e) => setPosition(parseInt(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid var(--color-border-color)',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: 'var(--color-surface)',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--color-border-color)'}
                    placeholder="0"
                    min="0"
                  />
                  <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--color-text-light)' }}>
                    数値が小さいほど上に表示されます（デフォルト: 0）
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 保存ボタン（作成モード時のみ表示） */}
        {creatingAtPath !== null && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--color-border-color)' }}>
            <button
              onClick={() => {
                setCreatingAtPath(null);
                setSelectedPath([]);
                setParentId(null);
                setName('');
                setTitle('');
                setDescription('');
                setPosition(0);
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6B7280',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '10px 20px',
                backgroundColor: saving ? '#9CA3AF' : '#10B981',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              {saving ? '作成中...' : '組織を作成'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
