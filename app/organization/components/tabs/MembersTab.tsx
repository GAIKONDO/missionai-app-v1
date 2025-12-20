'use client';

import { useState } from 'react';
import type { MemberInfo } from '@/components/OrgChart';
import { tauriAlert } from '@/lib/orgApi';
import MemberEditForm from './MemberEditForm';

interface MembersTabProps {
  editingMembers: (MemberInfo & { id?: string })[];
  setEditingMembers: (members: (MemberInfo & { id?: string })[]) => void;
  editingMemberIndex: number | null;
  setEditingMemberIndex: (index: number | null) => void;
  onDeleteMember: (index: number) => Promise<void>;
}

export default function MembersTab({
  editingMembers,
  setEditingMembers,
  editingMemberIndex,
  setEditingMemberIndex,
  onDeleteMember,
}: MembersTabProps) {
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [newMember, setNewMember] = useState<MemberInfo>({
    name: '',
    title: '',
  });

  const handleAddMember = async () => {
    if (!newMember.name.trim()) {
      await tauriAlert('名前は必須です');
      return;
    }
    setEditingMembers([...editingMembers, { ...newMember }]);
    setNewMember({ name: '', title: '' });
    setShowAddMemberForm(false);
  };

  const handleUpdateMember = (index: number, updatedMember: MemberInfo & { id?: string }) => {
    const updated = [...editingMembers];
    // IDを保持
    updated[index] = { ...updatedMember, id: editingMembers[index]?.id };
    setEditingMembers(updated);
    setEditingMemberIndex(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>メンバー一覧</h3>
        <button
          onClick={() => setShowAddMemberForm(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#10B981',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          + メンバーを追加
        </button>
      </div>

      {/* メンバー追加フォーム */}
      {showAddMemberForm && (
        <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>新しいメンバーを追加</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                名前 <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                placeholder="名前を入力"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                役職
              </label>
              <input
                type="text"
                value={newMember.title || ''}
                onChange={(e) => setNewMember({ ...newMember, title: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                placeholder="役職を入力"
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowAddMemberForm(false);
                  setNewMember({ name: '', title: '' });
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6B7280',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleAddMember}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10B981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* メンバー一覧 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
        {editingMembers.map((member, index) => (
          <div
            key={index}
            style={{
              padding: '16px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-border-color)',
              borderRadius: '8px',
            }}
          >
            {editingMemberIndex === index ? (
              <MemberEditForm
                member={member}
                onSave={(updated) => handleUpdateMember(index, updated)}
                onCancel={() => setEditingMemberIndex(null)}
                onDelete={() => onDeleteMember(index)}
              />
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                    {member.name}
                  </div>
                  {member.title && (
                    <div style={{ fontSize: '14px', color: 'var(--color-text-light)' }}>
                      {member.title}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setEditingMemberIndex(index)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#3B82F6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    編集
                  </button>
                  <button
                    onClick={() => onDeleteMember(index)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#EF4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    削除
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {editingMembers.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-light)' }}>
            メンバーが登録されていません
          </div>
        )}
      </div>
    </div>
  );
}
