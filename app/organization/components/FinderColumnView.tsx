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
  onCreateOrg: (parentId: string | null) => Promise<void>;
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

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        padding: '8px 12px',
        cursor: editingOrgId === org.id ? 'text' : 'pointer',
        backgroundColor: isSelected ? 'var(--color-background)' : 'transparent',
        borderLeft: isSelected ? '3px solid #3B82F6' : '3px solid transparent',
        fontSize: '13px',
        transition: 'background-color 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
      }}
      onMouseEnter={(e) => {
        if (!isSelected && editingOrgId !== org.id) {
          e.currentTarget.style.backgroundColor = 'var(--color-background)';
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

    // カラム（親）へのドロップ（同じ親内での順番入れ替え）
    if (overId.startsWith('column-')) {
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
      // 組織へのドロップ（異なる親への移動）
      const targetOrgId = overId.replace('org-', '');
      const targetOrg = findOrg(targetOrgId);
      
      if (targetOrg && targetOrg.id && targetOrg.id !== draggedOrg.id) {
        // 親を変更
        await onMoveOrg(draggedOrg.id, targetOrg.id);
      } else if (activeId !== overId) {
        // 同じ親内での順番入れ替え（組織同士のドロップ）
        // 現在の親を取得
        const findCurrentParent = (): OrgNodeData | null => {
          const rootOrgs = getRootOrganizations();
          for (const org of rootOrgs) {
            if (org.children?.some(c => c.id === draggedOrg.id)) {
              return org;
            }
            if (org.children) {
              const findInChildren = (children: OrgNodeData[]): OrgNodeData | null => {
                for (const child of children) {
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
          // selectedPathからも検索
          for (const pathOrg of selectedPath) {
            if (pathOrg.children?.some(c => c.id === draggedOrg.id)) {
              return pathOrg;
            }
          }
          return null;
        };

        const currentParent = findCurrentParent();
        const parentId = currentParent?.id || null;
        const siblings = currentParent?.children || getRootOrganizations();
        
        const oldIndex = siblings.findIndex(o => o.id === draggedOrg.id);
        const newIndex = siblings.findIndex(o => o.id === targetOrgId || `org-${o.name}` === targetOrgId);
        
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          // 順番を更新
          await onReorderOrg(draggedOrg.id, newIndex, parentId);
        }
      }
    }

    setActiveId(null);
    setDraggedOrg(null);
  };

  // ドラッグオーバー時の処理（視覚的フィードバック用）
  const handleDragOver = (event: DragOverEvent) => {
    // 必要に応じて実装
  };

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
          <SortableContext items={rootOrgIds} strategy={verticalListSortingStrategy}>
            {rootOrgs.map((org) => (
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
              />
            ))}
          </SortableContext>
        </div>

        {/* 選択されたパスに基づいて追加のカラムを表示 */}
        {selectedPath.map((selectedOrg, columnIndex) => {
          const childOrgs = selectedOrg.children || [];
          const columnNumber = columnIndex + 1;
          const childOrgIds = childOrgs.map(o => o.id || `org-${o.name}`);

          return (
            <div
              key={selectedOrg.id || columnIndex}
              id={`column-${selectedOrg.id || ''}`}
              style={{
                flex: '0 0 250px',
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
              <SortableContext items={childOrgIds} strategy={verticalListSortingStrategy}>
                {childOrgs.map((childOrg) => (
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
                  />
                ))}
              </SortableContext>
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
