import { useState } from 'react';
import { saveMeetingNote, deleteMeetingNote, generateUniqueMeetingNoteId, getMeetingNotes, tauriAlert } from '@/lib/orgApi';
import type { OrgNodeData } from '@/components/OrgChart';
import type { MeetingNote } from '@/lib/orgApi';

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

interface UseMeetingNoteHandlersProps {
  organizationId: string;
  organization: OrgNodeData | null;
  meetingNotes: MeetingNote[];
  setMeetingNotes: React.Dispatch<React.SetStateAction<MeetingNote[]>>;
}

export function useMeetingNoteHandlers({
  organizationId,
  organization,
  meetingNotes,
  setMeetingNotes,
}: UseMeetingNoteHandlersProps) {
  // 議事録追加モーダルの状態
  const [showAddMeetingNoteModal, setShowAddMeetingNoteModal] = useState(false);
  const [newMeetingNoteTitle, setNewMeetingNoteTitle] = useState('');
  const [newMeetingNoteDescription, setNewMeetingNoteDescription] = useState('');
  const [newMeetingNoteId, setNewMeetingNoteId] = useState<string>('');
  const [savingMeetingNote, setSavingMeetingNote] = useState(false);
  
  // 議事録編集・削除の状態
  const [editingMeetingNoteId, setEditingMeetingNoteId] = useState<string | null>(null);
  const [editingMeetingNoteTitle, setEditingMeetingNoteTitle] = useState('');
  const [showDeleteMeetingNoteConfirmModal, setShowDeleteMeetingNoteConfirmModal] = useState(false);
  const [deleteTargetMeetingNoteId, setDeleteTargetMeetingNoteId] = useState<string | null>(null);

  // 議事録追加モーダルを開く
  const handleOpenAddMeetingNoteModal = () => {
    const newId = generateUniqueMeetingNoteId();
    setNewMeetingNoteId(newId);
    setNewMeetingNoteTitle('');
    setNewMeetingNoteDescription('');
    setShowAddMeetingNoteModal(true);
  };

  // 議事録を追加
  const handleAddMeetingNote = async () => {
    if (!newMeetingNoteTitle.trim()) {
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
          devWarn('⚠️ [handleAddMeetingNote] organizationIdがorganizationsテーブルに存在しません。名前で検索します:', {
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
                devLog('✅ [handleAddMeetingNote] 名前で検索して正しいIDを取得:', validOrgId);
              } else if (searchResults[0] && searchResults[0].id) {
                validOrgId = searchResults[0].id;
                devWarn('⚠️ [handleAddMeetingNote] 完全一致が見つかりませんでした。最初の結果を使用:', validOrgId);
              }
            }
          }
        } else {
          devLog('✅ [handleAddMeetingNote] organizationIdがorganizationsテーブルに存在します:', validOrgId);
        }
      } catch (orgCheckError: any) {
        devWarn('⚠️ [handleAddMeetingNote] 組織IDの確認でエラー（続行します）:', orgCheckError);
      }
    }
    
    if (!validOrgId) {
      await tauriAlert('組織IDが取得できませんでした');
      return;
    }

    try {
      setSavingMeetingNote(true);
      devLog('📝 議事録を追加します:', { 
        id: newMeetingNoteId,
        organizationId: validOrgId, 
        title: newMeetingNoteTitle.trim(),
      });
      
      const noteId = await saveMeetingNote({
        id: newMeetingNoteId,
        organizationId: validOrgId,
        title: newMeetingNoteTitle.trim(),
        description: newMeetingNoteDescription.trim() || undefined,
      });
      
      devLog('✅ 議事録を追加しました。ID:', noteId);
      
      // リストを再取得
      const notes = await getMeetingNotes(validOrgId);
      devLog('📋 再取得した議事録リスト数:', notes.length);
      setMeetingNotes(notes);
      
      // モーダルを閉じてフォームをリセット
      setShowAddMeetingNoteModal(false);
      setNewMeetingNoteTitle('');
      setNewMeetingNoteDescription('');
      setNewMeetingNoteId('');
      
      await tauriAlert('議事録を追加しました');
    } catch (error: any) {
      console.error('❌ 議事録の追加に失敗しました:', error);
      await tauriAlert(`追加に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingMeetingNote(false);
    }
  };

  // 議事録の編集を開始
  const handleStartEditMeetingNote = (note: MeetingNote) => {
    setEditingMeetingNoteId(note.id);
    setEditingMeetingNoteTitle(note.title);
  };

  // 議事録の編集をキャンセル
  const handleCancelEditMeetingNote = () => {
    setEditingMeetingNoteId(null);
    setEditingMeetingNoteTitle('');
  };

  // 議事録の編集を保存
  const handleSaveEditMeetingNote = async (noteId: string) => {
    if (!editingMeetingNoteTitle.trim()) {
      await tauriAlert('タイトルを入力してください');
      return;
    }

    try {
      setSavingMeetingNote(true);
      const note = meetingNotes.find(n => n.id === noteId);
      if (!note) {
        throw new Error('議事録が見つかりません');
      }

      await saveMeetingNote({
        ...note,
        title: editingMeetingNoteTitle.trim(),
      });

      const validOrgId = organization?.id || organizationId;
      const notes = await getMeetingNotes(validOrgId);
      setMeetingNotes(notes);
      setEditingMeetingNoteId(null);
      setEditingMeetingNoteTitle('');
      
      await tauriAlert('議事録を更新しました');
    } catch (error: any) {
      console.error('❌ 議事録の更新に失敗しました:', error);
      await tauriAlert(`更新に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingMeetingNote(false);
    }
  };

  // 議事録の削除をリクエスト
  const handleDeleteMeetingNote = (noteId: string) => {
    setDeleteTargetMeetingNoteId(noteId);
    setShowDeleteMeetingNoteConfirmModal(true);
  };

  // 議事録の削除を確認
  const confirmDeleteMeetingNote = async () => {
    if (!deleteTargetMeetingNoteId) {
      return;
    }

    const noteId = deleteTargetMeetingNoteId;
    const note = meetingNotes.find(n => n.id === noteId);
    const noteTitle = note?.title || 'この議事録';
    
    setShowDeleteMeetingNoteConfirmModal(false);
    setDeleteTargetMeetingNoteId(null);
    
    try {
      setSavingMeetingNote(true);
      await deleteMeetingNote(noteId);
      
      const validOrgId = organization?.id || organizationId;
      const notes = await getMeetingNotes(validOrgId);
      setMeetingNotes(notes);
      
      await tauriAlert('議事録を削除しました');
    } catch (error: any) {
      console.error('❌ 議事録の削除に失敗しました:', error);
      await tauriAlert(`削除に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingMeetingNote(false);
    }
  };

  // 議事録の削除をキャンセル
  const cancelDeleteMeetingNote = () => {
    setShowDeleteMeetingNoteConfirmModal(false);
    setDeleteTargetMeetingNoteId(null);
  };

  return {
    // 状態
    showAddMeetingNoteModal,
    newMeetingNoteId,
    newMeetingNoteTitle,
    newMeetingNoteDescription,
    savingMeetingNote,
    editingMeetingNoteId,
    editingMeetingNoteTitle,
    showDeleteMeetingNoteConfirmModal,
    deleteTargetMeetingNoteId,
    // セッター
    setShowAddMeetingNoteModal,
    setNewMeetingNoteTitle,
    setNewMeetingNoteDescription,
    setNewMeetingNoteId,
    setEditingMeetingNoteTitle,
    // ハンドラー
    handleOpenAddMeetingNoteModal,
    handleAddMeetingNote,
    handleStartEditMeetingNote,
    handleCancelEditMeetingNote,
    handleSaveEditMeetingNote,
    handleDeleteMeetingNote,
    confirmDeleteMeetingNote,
    cancelDeleteMeetingNote,
  };
}

