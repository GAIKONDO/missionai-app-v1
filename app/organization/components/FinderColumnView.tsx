'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { OrgNodeData } from '@/components/OrgChart';

interface FinderColumnViewProps {
  orgTree: OrgNodeData;
  selectedPath: OrgNodeData[];
  onPathChange: (path: OrgNodeData[]) => void;
  editingOrgId: string | null;
  editingOrgName: string;
  onEditStart: (orgId: string, orgName: string) => void;
  onEditCancel: () => void;
  onEditSave: (orgId: string, newName: string) => Promise<void>;
  onCreateOrg: (parentId: string | null, type?: string) => Promise<void>;
  onEditNameChange: (name: string) => void;
  onDeleteOrg: (orgId: string, orgName: string) => Promise<void>;
  onReorderOrg: (orgId: string, newPosition: number, parentId: string | null) => Promise<void>;
  onMoveOrg: (orgId: string, newParentId: string | null) => Promise<void>;
}

// ドラッグ可能な組織アイテムコンポーネント
function SortableOrgItem({
  org,
  isSelected,
  editingOrgId,
  editingOrgName,
  onEditStart,
  onEditCancel,
  onEditSave,
  onEditNameChange,
  onDeleteOrg,
  onSelect,
  onDoubleClick,
  handleKeyDown,
  siblings,
  currentIndex,
  onMoveUp,
  onMoveDown,
}: {
  org: OrgNodeData;
  isSelected: boolean;
  editingOrgId: string | null;
  editingOrgName: string;
  onEditStart: (orgId: string, orgName: string) => void;
  onEditCancel: () => void;
  onEditSave: (orgId: string, newName: string) => Promise<void>;
  onEditNameChange: (name: string) => void;
  onDeleteOrg: (orgId: string, orgName: string) => Promise<void>;
  onSelect: () => void;
  onDoubleClick: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  siblings: OrgNodeData[];
  currentIndex: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: org.id || `org-${org.name}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // typeに応じた色を取得
  const orgType = (org as any).type || 'organization';
  const getTypeColor = () => {
    if (orgType === 'company') return '#10B981'; // 緑
    if (orgType === 'person') return '#A855F7'; // 紫
    return '#3B82F6'; // 青（デフォルト）
  };
  const typeColor = getTypeColor();
  const getTypeBackgroundColor = () => {
    if (orgType === 'company') return 'rgba(16, 185, 129, 0.1)'; // 薄い緑
    if (orgType === 'person') return 'rgba(168, 85, 247, 0.1)'; // 薄い紫
    return 'rgba(59, 130, 246, 0.1)'; // 薄い青
  };
  const typeBackgroundColor = getTypeBackgroundColor();

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        padding: '8px 12px',
        cursor: editingOrgId === org.id ? 'text' : 'pointer',
        backgroundColor: isSelected ? typeBackgroundColor : 'transparent',
        borderLeft: isSelected ? `3px solid ${typeColor}` : '3px solid transparent',
        fontSize: '13px',
        transition: 'background-color 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        color: typeColor,
      }}
      onMouseEnter={(e) => {
        if (!isSelected && editingOrgId !== org.id) {
          e.currentTarget.style.backgroundColor = typeBackgroundColor;
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected && editingOrgId !== org.id) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      <div
        onClick={(e) => {
          // ドラッグ中でない場合のみクリックを処理
          if (!isDragging) {
            onSelect();
          }
        }}
        onDoubleClick={onDoubleClick}
        style={{
          flex: 1,
          minWidth: 0,
          cursor: editingOrgId === org.id ? 'text' : 'pointer',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          {...attributes}
          {...listeners}
          style={{
            flex: 1,
            minWidth: 0,
            cursor: editingOrgId === org.id ? 'text' : 'grab',
            pointerEvents: editingOrgId === org.id ? 'none' : 'auto',
          }}
        >
          {editingOrgId === org.id ? (
            <input
              type="text"
              value={editingOrgName}
              onChange={(e) => onEditNameChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => onEditSave(org.id!, editingOrgName.trim())}
              autoFocus
              style={{
                width: '100%',
                padding: '4px 8px',
                border: '2px solid #3B82F6',
                borderRadius: '4px',
                fontSize: '13px',
                backgroundColor: 'var(--color-surface)',
              }}
            />
          ) : (
            org.name
          )}
        </div>
      </div>
      {editingOrgId !== org.id && org.id && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* ↑ボタン（上に移動） */}
          {currentIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp();
              }}
              style={{
                padding: '2px 4px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.5,
                transition: 'opacity 0.2s',
                color: typeColor,
                fontSize: '12px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.backgroundColor = typeBackgroundColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.5';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="上に移動"
            >
              ↑
            </button>
          )}
          {/* ↓ボタン（下に移動） */}
          {currentIndex < siblings.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown();
              }}
              style={{
                padding: '2px 4px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.5,
                transition: 'opacity 0.2s',
                color: typeColor,
                fontSize: '12px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.backgroundColor = typeBackgroundColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.5';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="下に移動"
            >
              ↓
            </button>
          )}
          {/* 削除ボタン */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteOrg(org.id!, org.name);
            }}
            style={{
              padding: '4px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.3,
              transition: 'opacity 0.2s',
              color: 'var(--color-text-light)',
              fontSize: '14px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.3';
            }}
            title="削除"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
}

export default function FinderColumnView({
  orgTree,
  selectedPath,
  onPathChange,
  editingOrgId,
  editingOrgName,
  onEditStart,
  onEditCancel,
  onEditSave,
  onCreateOrg,
  onEditNameChange,
  onDeleteOrg,
  onReorderOrg,
  onMoveOrg,
}: FinderColumnViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedOrg, setDraggedOrg] = useState<OrgNodeData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10, // 10px以上移動した場合のみドラッグとして認識（クリックと区別するため）
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  // 組織ツリーからルート組織を取得
  const getRootOrganizations = (): OrgNodeData[] => {
    if (!orgTree) return [];
    
    if (orgTree.id === 'virtual-root' && orgTree.children) {
      return orgTree.children;
    }
    
    return [orgTree];
  };

  // ドラッグ開始時の処理
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    // ドラッグ中の組織を取得
    const findOrg = (orgs: OrgNodeData[], id: string): OrgNodeData | null => {
      for (const org of orgs) {
        if (org.id === id || `org-${org.name}` === id) {
          return org;
        }
        if (org.children) {
          const found = findOrg(org.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    
    const rootOrgs = getRootOrganizations();
    const org = findOrg(rootOrgs, active.id as string) || 
                selectedPath.flatMap(p => p.children || []).find(o => o.id === active.id || `org-${o.name}` === active.id) ||
                null;
    setDraggedOrg(org);
  };

  // ドラッグ終了時の処理
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !active.id || !draggedOrg || !draggedOrg.id) {
      setActiveId(null);
      setDraggedOrg(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // 親組織を取得する関数
    const findParent = (targetId: string | null): OrgNodeData | null => {
      if (targetId === null) {
        return orgTree.id === 'virtual-root' ? orgTree : null;
      }
      const find = (node: OrgNodeData): OrgNodeData | null => {
        if (node.id === targetId) return node;
        if (node.children) {
          for (const child of node.children) {
            const found = find(child);
            if (found) return found;
          }
        }
        return null;
      };
      return find(orgTree);
    };

    // 組織を取得する関数
    const findOrg = (id: string): OrgNodeData | null => {
      const rootOrgs = getRootOrganizations();
      for (const org of rootOrgs) {
        if (org.id === id || `org-${org.name}` === id) {
          return org;
        }
        if (org.children) {
          const findInChildren = (children: OrgNodeData[]): OrgNodeData | null => {
            for (const child of children) {
              if (child.id === id || `org-${child.name}` === id) {
                return child;
              }
              if (child.children) {
                const found = findInChildren(child.children);
                if (found) return found;
              }
            }
            return null;
          };
          const found = findInChildren(org.children);
          if (found) return found;
        }
      }
      // selectedPathからも検索
      for (const pathOrg of selectedPath) {
        if (pathOrg.children) {
          for (const child of pathOrg.children) {
            if (child.id === id || `org-${child.name}` === id) {
              return child;
            }
          }
        }
      }
      return null;
    };

    // 現在の親を取得する関数（共通化）
    const findCurrentParent = (): OrgNodeData | null => {
      const rootOrgs = getRootOrganizations();
      for (const org of rootOrgs) {
        if (org.id === draggedOrg.id) {
          return orgTree.id === 'virtual-root' ? orgTree : null;
        }
        if (org.children?.some(c => c.id === draggedOrg.id)) {
          return org;
        }
        if (org.children) {
          const findInChildren = (children: OrgNodeData[]): OrgNodeData | null => {
            for (const child of children) {
              if (child.id === draggedOrg.id) {
                return org;
              }
              if (child.children?.some(c => c.id === draggedOrg.id)) {
                return child;
              }
              if (child.children) {
                const found = findInChildren(child.children);
                if (found) return found;
              }
            }
            return null;
          };
          const found = findInChildren(org.children);
          if (found) return found;
        }
      }
      for (const pathOrg of selectedPath) {
        if (pathOrg.children?.some(c => c.id === draggedOrg.id)) {
          return pathOrg;
        }
      }
      return null;
    };

    // カラムの下部へのドロップ（同じ階層レベルに移動）
    if (overId.startsWith('column-bottom-')) {
      const parentId = overId === 'column-bottom-null' ? null : overId.replace('column-bottom-', '');
      const parent = findParent(parentId);
      const siblings = parent?.children || getRootOrganizations();
      
      const currentParent = findCurrentParent();
      const currentParentId = currentParent?.id || null;
      
      // 同じ親の場合は順番を更新、異なる親の場合は移動
      if (currentParentId === parentId) {
        // 同じ親内での順番入れ替え（最後に移動）
        const newPosition = siblings.length - 1;
        await onReorderOrg(draggedOrg.id, newPosition, parentId);
      } else {
        // 異なる親への移動（親子関係を変更）
        await onMoveOrg(draggedOrg.id, parentId);
      }
    }
    // カラム（親）へのドロップ（同じ親内での順番入れ替え）
    else if (overId.startsWith('column-')) {
      const parentId = overId === 'column-null' ? null : overId.replace('column-', '');
      const parent = findParent(parentId);
      const siblings = parent?.children || getRootOrganizations();
      
      // 現在の位置を取得
      const oldIndex = siblings.findIndex(o => o.id === draggedOrg.id);
      
      if (oldIndex !== -1) {
        // 同じ親内での順番入れ替えの場合は、positionを更新
        // 新しい位置は、siblingsの最後に追加するか、特定の位置に挿入する
        // ここでは、最後の位置に移動するものとする（必要に応じて改善可能）
        const newPosition = siblings.length - 1;
        await onReorderOrg(draggedOrg.id, newPosition, parentId);
      }
    } else {
      // 組織へのドロップ
      const targetOrgId = overId.replace('org-', '');
      const targetOrg = findOrg(targetOrgId);
      
      if (!targetOrg || !targetOrg.id || targetOrg.id === draggedOrg.id) {
        setActiveId(null);
        setDraggedOrg(null);
        return;
      }

      const currentParent = findCurrentParent();
      const currentParentId = currentParent?.id || null;
      const currentSiblings = currentParent?.children || getRootOrganizations();
      
      // ドラッグされた組織とドロップ先の組織が同じ親を持つかどうかを確認
      const isSameParent = targetOrg.id === currentParentId || 
                          (currentParentId === null && targetOrg.id === null) ||
                          (currentSiblings.some(s => s.id === targetOrg.id));
      
      if (isSameParent) {
        // 同じ親内での順番入れ替え
        const oldIndex = currentSiblings.findIndex(o => o.id === draggedOrg.id);
        const newIndex = currentSiblings.findIndex(o => o.id === targetOrg.id || `org-${o.name}` === targetOrg.id);
        
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          // 順番を更新（親子関係は変更しない）
          await onReorderOrg(draggedOrg.id, newIndex, currentParentId);
        }
      } else {
        // 異なる親への移動（親子関係を変更）
        await onMoveOrg(draggedOrg.id, targetOrg.id);
      }
    }

    setActiveId(null);
    setDraggedOrg(null);
  };

  // ドラッグオーバー時の処理（視覚的フィードバック用）
  const handleDragOver = (event: DragOverEvent) => {
    // 必要に応じて実装
  };

  // カラム下部のドロップゾーンコンポーネント
  function ColumnBottomDropZone({ parentId }: { parentId: string | null }) {
    const { setNodeRef, isOver } = useDroppable({
      id: `column-bottom-${parentId || 'null'}`,
    });

    return (
      <div
        ref={setNodeRef}
        style={{
          minHeight: '60px',
          backgroundColor: isOver ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
          borderTop: isOver ? '2px dashed #3B82F6' : 'none',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isOver ? '#3B82F6' : 'transparent',
          fontSize: '12px',
          fontWeight: '500',
        }}
      >
        {isOver && 'ここにドロップして階層を上げる'}
      </div>
    );
  }

  // 組織を選択したときの処理
  const handleOrgSelect = (org: OrgNodeData, columnIndex: number) => {
    if (editingOrgId) return; // 編集中は選択不可
    const newPath = selectedPath.slice(0, columnIndex);
    newPath.push(org);
    onPathChange(newPath);
  };

  // 組織名をダブルクリックで編集開始
  const handleOrgDoubleClick = (org: OrgNodeData) => {
    if (org.id) {
      onEditStart(org.id, org.name);
    }
  };

  // 編集保存
  const handleEditSave = async () => {
    if (editingOrgId && editingOrgName.trim()) {
      await onEditSave(editingOrgId, editingOrgName.trim());
    }
  };

  // 編集キャンセル
  const handleEditCancel = () => {
    onEditCancel();
  };

  // Enterキーで保存、Escキーでキャンセル
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleEditCancel();
    }
  };

  const rootOrgs = getRootOrganizations();
  const rootOrgIds = rootOrgs.map(o => o.id || `org-${o.name}`);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div style={{
        display: 'flex',
        gap: '1px',
        border: '1px solid var(--color-border-color)',
        borderRadius: '6px',
        overflow: 'hidden',
        backgroundColor: 'var(--color-border-color)',
        height: '100%',
        minHeight: '400px',
      }}>
        {/* 最初のカラム（ルート組織） */}
        <div
          id="column-null"
          style={{
            flex: '0 0 250px',
            backgroundColor: 'var(--color-surface)',
            overflowY: 'auto',
            borderRight: '1px solid var(--color-border-color)',
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
            ルート組織
          </div>
          {/* +ボタン（ルート組織を作成） */}
          <div
            onClick={() => onCreateOrg(null)}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: '#3B82F6',
              fontWeight: '500',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-background)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span style={{ fontSize: '18px', lineHeight: '1' }}>+</span>
            <span>新しい組織</span>
          </div>
          {/* +ボタン（ルート事業会社を作成） */}
          <div
            onClick={() => onCreateOrg(null, 'company')}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: '#10B981',
              fontWeight: '500',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-background)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span style={{ fontSize: '18px', lineHeight: '1' }}>+</span>
            <span>新しい事業会社</span>
          </div>
          {/* +ボタン（ルート個人を作成） */}
          <div
            onClick={() => onCreateOrg(null, 'person')}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: '#A855F7',
              fontWeight: '500',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-background)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span style={{ fontSize: '18px', lineHeight: '1' }}>+</span>
            <span>新しい個人</span>
          </div>
          <SortableContext items={rootOrgIds} strategy={verticalListSortingStrategy}>
            {rootOrgs.map((org, index) => {
              const parentId = null; // ルート組織の親はnull
              return (
                <SortableOrgItem
                  key={org.id || `org-${org.name}`}
                  org={org}
                  isSelected={selectedPath[0]?.id === org.id}
                  editingOrgId={editingOrgId}
                  editingOrgName={editingOrgName}
                  onEditStart={onEditStart}
                  onEditCancel={onEditCancel}
                  onEditSave={onEditSave}
                  onEditNameChange={onEditNameChange}
                  onDeleteOrg={onDeleteOrg}
                  onSelect={() => handleOrgSelect(org, 0)}
                  onDoubleClick={() => handleOrgDoubleClick(org)}
                  handleKeyDown={handleKeyDown}
                  siblings={rootOrgs}
                  currentIndex={index}
                  onMoveUp={async () => {
                    if (index > 0) {
                      await onReorderOrg(org.id!, index - 1, parentId);
                    }
                  }}
                  onMoveDown={async () => {
                    if (index < rootOrgs.length - 1) {
                      await onReorderOrg(org.id!, index + 1, parentId);
                    }
                  }}
                />
              );
            })}
          </SortableContext>
          <ColumnBottomDropZone parentId={null} />
        </div>

        {/* 選択されたパスに基づいて追加のカラムを表示 */}
        {selectedPath.map((selectedOrg, columnIndex) => {
          const childOrgs = selectedOrg.children || [];
          const columnNumber = columnIndex + 1;
          const childOrgIds = childOrgs.map(o => o.id || `org-${o.name}`);
          
          // カラムのtypeに応じた色を取得
          const columnType = (selectedOrg as any).type || 'organization';
          const getColumnTypeColor = () => {
            if (columnType === 'company') return '#10B981'; // 緑
            if (columnType === 'person') return '#A855F7'; // 紫
            return '#3B82F6'; // 青（デフォルト）
          };
          const columnTypeColor = getColumnTypeColor();
          const getColumnTypeBackgroundColor = () => {
            if (columnType === 'company') return 'rgba(16, 185, 129, 0.05)'; // 非常に薄い緑
            if (columnType === 'person') return 'rgba(168, 85, 247, 0.05)'; // 非常に薄い紫
            return 'var(--color-surface)'; // デフォルト
          };
          const columnTypeBackgroundColor = getColumnTypeBackgroundColor();

          return (
            <div
              key={selectedOrg.id || columnIndex}
              id={`column-${selectedOrg.id || ''}`}
              style={{
                flex: '0 0 250px',
                backgroundColor: columnTypeBackgroundColor,
                overflowY: 'auto',
                borderRight: columnIndex < selectedPath.length - 1 ? '1px solid var(--color-border-color)' : 'none',
              }}
            >
              <div style={{
                padding: '8px 12px',
                backgroundColor: 'var(--color-background)',
                borderBottom: `1px solid ${columnTypeColor}`,
                fontSize: '12px',
                fontWeight: '600',
                color: columnTypeColor,
                position: 'sticky',
                top: 0,
                zIndex: 1,
              }}>
                {selectedOrg.name}
              </div>
              {/* +ボタン（この組織の子組織を作成） */}
              <div
                onClick={() => onCreateOrg(selectedOrg.id || null)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: '#3B82F6',
                  fontWeight: '500',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-background)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span style={{ fontSize: '18px', lineHeight: '1' }}>+</span>
                <span>新しい組織</span>
              </div>
              {/* +ボタン（この組織の子事業会社を作成） */}
              <div
                onClick={() => onCreateOrg(selectedOrg.id || null, 'company')}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: '#10B981',
                  fontWeight: '500',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-background)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span style={{ fontSize: '18px', lineHeight: '1' }}>+</span>
                <span>新しい事業会社</span>
              </div>
              {/* +ボタン（この組織の子個人を作成） */}
              <div
                onClick={() => onCreateOrg(selectedOrg.id || null, 'person')}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: '#A855F7',
                  fontWeight: '500',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-background)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span style={{ fontSize: '18px', lineHeight: '1' }}>+</span>
                <span>新しい個人</span>
              </div>
              <SortableContext items={childOrgIds} strategy={verticalListSortingStrategy}>
                {childOrgs.map((childOrg, index) => {
                  const parentId = selectedOrg.id || null;
                  return (
                    <SortableOrgItem
                      key={childOrg.id || `org-${childOrg.name}`}
                      org={childOrg}
                      isSelected={selectedPath[columnNumber]?.id === childOrg.id}
                      editingOrgId={editingOrgId}
                      editingOrgName={editingOrgName}
                      onEditStart={onEditStart}
                      onEditCancel={onEditCancel}
                      onEditSave={onEditSave}
                      onEditNameChange={onEditNameChange}
                      onDeleteOrg={onDeleteOrg}
                      onSelect={() => handleOrgSelect(childOrg, columnNumber)}
                      onDoubleClick={() => handleOrgDoubleClick(childOrg)}
                      handleKeyDown={handleKeyDown}
                      siblings={childOrgs}
                      currentIndex={index}
                      onMoveUp={async () => {
                        if (index > 0) {
                          await onReorderOrg(childOrg.id!, index - 1, parentId);
                        }
                      }}
                      onMoveDown={async () => {
                        if (index < childOrgs.length - 1) {
                          await onReorderOrg(childOrg.id!, index + 1, parentId);
                        }
                      }}
                    />
                  );
                })}
              </SortableContext>
              <ColumnBottomDropZone parentId={selectedOrg.id || null} />
            </div>
          );
        })}
      </div>
      <DragOverlay>
        {activeId && draggedOrg ? (
          <div style={{
            padding: '8px 12px',
            backgroundColor: 'var(--color-surface)',
            border: '2px solid #3B82F6',
            borderRadius: '4px',
            fontSize: '13px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}>
            {draggedOrg.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
