'use client';

import { useState } from 'react';
import type { OrgNodeData, MemberInfo } from '@/components/OrgChart';
import { updateOrg, addOrgMember, updateOrgMember, deleteOrgMember, tauriAlert, tauriConfirm } from '@/lib/orgApi';
import OrganizationInfoTab from '../tabs/OrganizationInfoTab';
import MembersTab from '../tabs/MembersTab';
import { tabsConfig, type TabId } from '../tabs/tabsConfig';

interface OrganizationEditModalProps {
  organization: OrgNodeData | null;
  members: (MemberInfo & { id?: string })[];
  onClose: () => void;
  onSave: (updatedOrg: Partial<OrgNodeData> | null, updatedMembers: (MemberInfo & { id?: string })[] | null) => Promise<void>;
  onDeleteClick?: () => void;
}

export default function OrganizationEditModal({
  organization,
  members,
  onClose,
  onSave,
  onDeleteClick,
}: OrganizationEditModalProps) {
  const [editingOrg, setEditingOrg] = useState<Partial<OrgNodeData>>({
    name: organization?.name || '',
    title: organization?.title || '',
    description: organization?.description || '',
    position: organization?.position || 0,
  });
  const [editingMembers, setEditingMembers] = useState<(MemberInfo & { id?: string })[]>(members.map(m => ({ ...m })));
  const [editingMemberIndex, setEditingMemberIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('organization');

  const handleSave = async () => {
    if (saving) return;
    if (!editingOrg.name?.trim()) {
      await tauriAlert('組織名は必須です');
      return;
    }
    setSaving(true);
    try {
      // 組織情報を更新
      if (organization?.id) {
        await updateOrg(
          organization.id,
          editingOrg.name,
          editingOrg.title,
          editingOrg.description,
          editingOrg.position
        );
      }

      // メンバー情報を更新
      const organizationId = organization?.id;
      if (organizationId) {
        // 元のメンバーIDのセット
        const originalMemberIds = new Set(members.filter(m => m.id).map(m => m.id!));
        // 現在のメンバーIDのセット
        const currentMemberIds = new Set(editingMembers.filter(m => m.id).map(m => m.id!));
        
        // 削除されたメンバーを特定
        const deletedMemberIds = Array.from(originalMemberIds).filter(id => !currentMemberIds.has(id));
        
        // 削除されたメンバーをDBから削除
        for (const deletedId of deletedMemberIds) {
          try {
            await deleteOrgMember(deletedId);
          } catch (error: any) {
            console.error('メンバー削除エラー:', error);
            // 削除エラーは続行（他のメンバーの更新は続ける）
          }
        }

        // 既存メンバーを更新、新規メンバーを追加
        for (const member of editingMembers) {
          if (member.id) {
            // 既存メンバーの更新
            try {
              await updateOrgMember(member.id, {
                name: member.name,
                title: member.title,
                nameRomaji: member.nameRomaji,
                department: member.department,
                extension: member.extension,
                companyPhone: member.companyPhone,
                mobilePhone: member.mobilePhone,
                email: member.email,
                itochuEmail: member.itochuEmail,
                teams: member.teams,
                employeeType: member.employeeType,
                roleName: member.roleName,
                indicator: member.indicator,
                location: member.location,
                floorDoorNo: member.floorDoorNo,
                previousName: member.previousName,
              });
            } catch (error: any) {
              console.error('メンバー更新エラー:', error);
              // 更新エラーは続行
            }
          } else {
            // 新規メンバーの追加
            try {
              await addOrgMember(organizationId, {
                name: member.name,
                title: member.title,
                nameRomaji: member.nameRomaji,
                department: member.department,
                extension: member.extension,
                companyPhone: member.companyPhone,
                mobilePhone: member.mobilePhone,
                email: member.email,
                itochuEmail: member.itochuEmail,
                teams: member.teams,
                employeeType: member.employeeType,
                roleName: member.roleName,
                indicator: member.indicator,
                location: member.location,
                floorDoorNo: member.floorDoorNo,
                previousName: member.previousName,
              });
            } catch (error: any) {
              console.error('メンバー追加エラー:', error);
              // 追加エラーは続行
            }
          }
        }
      }

      await onSave(editingOrg, editingMembers);
    } catch (error: any) {
      console.error('保存エラー:', error);
      await tauriAlert(`保存に失敗しました: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async (index: number) => {
    const member = editingMembers[index];
    if (!member) return;

    const confirmed = await tauriConfirm(`メンバー「${member.name}」を削除しますか？`);
    if (!confirmed) return;

    // editingMembersから削除（実際のDB削除は保存時に実行）
    const updated = editingMembers.filter((_, i) => i !== index);
    setEditingMembers(updated);
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
          maxWidth: '1400px',
          width: '95%',
          maxHeight: '95vh',
          overflow: 'auto',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
            組織・メンバーを編集
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

        {/* タブ */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border-color)', marginBottom: '24px' }}>
          {tabsConfig.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-light)',
                borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? '600' : '400',
              }}
            >
              {tab.id === 'members' ? `${tab.label} (${editingMembers.length}名)` : tab.label}
            </button>
          ))}
        </div>

        {/* タブコンテンツ */}
        {activeTab === 'organization' && (
          <OrganizationInfoTab
            organization={organization}
            editingOrg={editingOrg}
            setEditingOrg={setEditingOrg}
            onDeleteClick={onDeleteClick}
          />
        )}
        {activeTab === 'members' && (
          <MembersTab
            editingMembers={editingMembers}
            setEditingMembers={setEditingMembers}
            editingMemberIndex={editingMemberIndex}
            setEditingMemberIndex={setEditingMemberIndex}
            onDeleteMember={handleDeleteMember}
          />
        )}

        {/* フッター */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--color-border-color)' }}>
          <button
            onClick={onClose}
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
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
