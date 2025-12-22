import { useState } from 'react';
import { getOrgTreeFromDb, saveFocusInitiative, deleteFocusInitiative, generateUniqueInitiativeId, tauriAlert } from '@/lib/orgApi';
import type { OrgNodeData } from '@/components/OrgChart';
import type { FocusInitiative } from '@/lib/orgApi';

// 開発環境でのみログを有効化するヘルパー関数
const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args: any[]) => {
  if (isDev) {
    console.log(...args);
  }
};
const devWarn = (...args: any[]) => {
  if (isDev) {
    console.warn(...args);
  }
};

interface UseInitiativeHandlersProps {
  organizationId: string;
  organization: OrgNodeData | null;
  focusInitiatives: FocusInitiative[];
  reloadInitiatives: (orgId: string, orgTree: OrgNodeData | null) => Promise<void>;
}

export function useInitiativeHandlers({
  organizationId,
  organization,
  focusInitiatives,
  reloadInitiatives,
}: UseInitiativeHandlersProps) {
  // 注力施策追加モーダルの状態
  const [showAddInitiativeModal, setShowAddInitiativeModal] = useState(false);
  const [newInitiativeTitle, setNewInitiativeTitle] = useState('');
  const [newInitiativeDescription, setNewInitiativeDescription] = useState('');
  const [newInitiativeId, setNewInitiativeId] = useState<string>('');
  const [savingInitiative, setSavingInitiative] = useState(false);
  
  // 注力施策編集・削除の状態
  const [editingInitiativeId, setEditingInitiativeId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteTargetInitiativeId, setDeleteTargetInitiativeId] = useState<string | null>(null);

  // 注力施策追加モーダルを開く
  const handleOpenAddInitiativeModal = () => {
    const newId = generateUniqueInitiativeId();
    setNewInitiativeId(newId);
    setNewInitiativeTitle('');
    setNewInitiativeDescription('');
    setShowAddInitiativeModal(true);
  };

  // 注力施策を追加
  const handleAddInitiative = async () => {
    if (!newInitiativeTitle.trim()) {
      await tauriAlert('タイトルを入力してください');
      return;
    }

    // organizationオブジェクトから正しいIDを取得
    let validOrgId = organization?.id || organizationId;
    
    // organizationIdがorganizationsテーブルに存在するか確認
    if (validOrgId) {
      try {
        const { callTauriCommand } = await import('@/lib/localFirebase');
        const orgCheckResult = await callTauriCommand('doc_get', {
          collectionName: 'organizations',
          docId: validOrgId,
        });
        if (!orgCheckResult || !orgCheckResult.exists) {
          devWarn('⚠️ [handleAddInitiative] organizationIdがorganizationsテーブルに存在しません。名前で検索します:', {
            organizationId: validOrgId,
            organizationName: organization?.name,
          });
          // 名前で組織を検索
          if (organization?.name) {
            const { searchOrgsByName } = await import('@/lib/orgApi');
            const searchResults = await searchOrgsByName(organization.name);
            if (searchResults && searchResults.length > 0) {
              const exactMatch = searchResults.find((org: any) => org.name === organization.name);
              if (exactMatch && exactMatch.id) {
                validOrgId = exactMatch.id;
                devLog('✅ [handleAddInitiative] 名前で検索して正しいIDを取得:', validOrgId);
              } else if (searchResults[0] && searchResults[0].id) {
                validOrgId = searchResults[0].id;
                devWarn('⚠️ [handleAddInitiative] 完全一致が見つかりませんでした。最初の結果を使用:', validOrgId);
              }
            }
          }
        } else {
          devLog('✅ [handleAddInitiative] organizationIdがorganizationsテーブルに存在します:', validOrgId);
        }
      } catch (orgCheckError: any) {
        devWarn('⚠️ [handleAddInitiative] 組織IDの確認でエラー（続行します）:', orgCheckError);
      }
    }
    
    if (!validOrgId) {
      await tauriAlert('組織IDが取得できませんでした');
      return;
    }

    try {
      setSavingInitiative(true);
      devLog('📝 注力施策を追加します:', { 
        id: newInitiativeId,
        organizationId, 
        title: newInitiativeTitle.trim(),
      });
      
      const initiativeId = await saveFocusInitiative({
        id: newInitiativeId,
        organizationId: validOrgId,
        title: newInitiativeTitle.trim(),
        description: newInitiativeDescription.trim() || undefined,
      });
      
      devLog('✅ 注力施策を追加しました。ID:', initiativeId);
      
      // 組織ツリーを取得してから再取得
      const orgTree = await getOrgTreeFromDb();
      await reloadInitiatives(validOrgId, orgTree);
      
      // モーダルを閉じてフォームをリセット
      setShowAddInitiativeModal(false);
      setNewInitiativeTitle('');
      setNewInitiativeDescription('');
      setNewInitiativeId('');
      
      await tauriAlert('注力施策を追加しました');
    } catch (error: any) {
      console.error('❌ 注力施策の追加に失敗しました:', error);
      await tauriAlert(`追加に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingInitiative(false);
    }
  };

  // 注力施策の編集を開始
  const handleStartEdit = (initiative: FocusInitiative) => {
    setEditingInitiativeId(initiative.id);
    setEditingTitle(initiative.title);
  };

  // 注力施策の編集をキャンセル
  const handleCancelEdit = () => {
    setEditingInitiativeId(null);
    setEditingTitle('');
  };

  // 注力施策の編集を保存
  const handleSaveEdit = async (initiativeId: string) => {
    if (!editingTitle.trim()) {
      await tauriAlert('タイトルを入力してください');
      return;
    }

    try {
      setSavingInitiative(true);
      const initiative = focusInitiatives.find(i => i.id === initiativeId);
      if (!initiative) {
        throw new Error('注力施策が見つかりません');
      }

      await saveFocusInitiative({
        ...initiative,
        title: editingTitle.trim(),
      });

      const validOrgId = organization?.id || organizationId;
      const orgTree = await getOrgTreeFromDb();
      await reloadInitiatives(validOrgId, orgTree);
      setEditingInitiativeId(null);
      setEditingTitle('');
      
      await tauriAlert('注力施策を更新しました');
    } catch (error: any) {
      console.error('❌ 注力施策の更新に失敗しました:', error);
      await tauriAlert(`更新に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingInitiative(false);
    }
  };

  // 注力施策の削除をリクエスト
  const handleDeleteInitiative = (initiativeId: string) => {
    setDeleteTargetInitiativeId(initiativeId);
    setShowDeleteConfirmModal(true);
  };

  // 注力施策の削除を確認
  const confirmDeleteInitiative = async () => {
    if (!deleteTargetInitiativeId) {
      return;
    }

    const initiativeId = deleteTargetInitiativeId;
    const initiative = focusInitiatives.find(i => i.id === initiativeId);
    const initiativeTitle = initiative?.title || 'この注力施策';
    
    setShowDeleteConfirmModal(false);
    setDeleteTargetInitiativeId(null);
    
    try {
      setSavingInitiative(true);
      await deleteFocusInitiative(initiativeId);
      
      const validOrgId = organization?.id || organizationId;
      const orgTree = await getOrgTreeFromDb();
      await reloadInitiatives(validOrgId, orgTree);
      
      await tauriAlert('注力施策を削除しました');
    } catch (error: any) {
      console.error('❌ 注力施策の削除に失敗しました:', error);
      await tauriAlert(`削除に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingInitiative(false);
    }
  };

  // 注力施策の削除をキャンセル
  const cancelDeleteInitiative = () => {
    setShowDeleteConfirmModal(false);
    setDeleteTargetInitiativeId(null);
  };

  return {
    // 状態
    showAddInitiativeModal,
    newInitiativeId,
    newInitiativeTitle,
    newInitiativeDescription,
    savingInitiative,
    editingInitiativeId,
    editingTitle,
    showDeleteConfirmModal,
    deleteTargetInitiativeId,
    // セッター
    setShowAddInitiativeModal,
    setNewInitiativeTitle,
    setNewInitiativeDescription,
    setNewInitiativeId,
    setEditingTitle,
    // ハンドラー
    handleOpenAddInitiativeModal,
    handleAddInitiative,
    handleStartEdit,
    handleCancelEdit,
    handleSaveEdit,
    handleDeleteInitiative,
    confirmDeleteInitiative,
    cancelDeleteInitiative,
  };
}

