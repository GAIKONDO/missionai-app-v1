import { useState, useCallback } from 'react';
import { saveMeetingNote } from '@/lib/orgApi';
import type { MeetingNote } from '@/lib/orgApi';
import type { TabType, MonthTab, SummaryTab, MonthContent, MeetingNoteData } from '../types';
import { SUMMARY_TABS, MONTHS } from '../constants';
import { devLog } from '../utils';

interface UseEditModeProps {
  monthContents: MeetingNoteData;
  setMonthContents: (contents: MeetingNoteData) => void;
  meetingNote: MeetingNote | null;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setSavingStatus: (status: 'idle' | 'saving' | 'saved') => void;
}

export function useEditMode({
  monthContents,
  setMonthContents,
  meetingNote,
  setHasUnsavedChanges,
  setSavingStatus,
}: UseEditModeProps) {
  // 編集モード
  const [editingMonth, setEditingMonth] = useState<MonthTab | SummaryTab | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingItemTitle, setEditingItemTitle] = useState('');
  const [editingItemDate, setEditingItemDate] = useState(''); // 日付部分（YYYY-MM-DD形式）
  const [editingItemTime, setEditingItemTime] = useState(''); // 時間部分（任意の文字列）

  // サマリの編集開始（月タブと総括タブの両方に対応）
  const handleStartEditSummary = useCallback((tab: TabType) => {
    setEditingMonth(tab);
    const tabData = monthContents[tab] as MonthContent | undefined;
    const summaryId = tabData?.summaryId;
    if (summaryId) {
      setEditingSection(summaryId);
      setEditingContent(tabData?.summary || '');
    }
  }, [monthContents]);

  // 議事録アイテムの編集開始（月タブと総括タブの両方に対応）
  const handleStartEditItem = useCallback((tab: TabType, itemId: string) => {
    setEditingMonth(tab);
    setEditingSection(itemId);
    const tabData = monthContents[tab] as MonthContent | undefined;
    const item = tabData?.items?.find(i => i.id === itemId);
    setEditingContent(item?.content || '');
    setEditingItemTitle(item?.title || '');
    
    // 日時を日付と時間に分離
    const dateStr = item?.date || '';
    if (dateStr) {
      // YYYY-MM-DD形式の日付を抽出（最初の10文字）
      const dateMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        setEditingItemDate(dateMatch[1]);
        // 残りの部分を時間として設定
        const timePart = dateStr.substring(10).trim();
        setEditingItemTime(timePart);
      } else {
        // 日付形式でない場合は全体を時間として扱う
        setEditingItemDate('');
        setEditingItemTime(dateStr);
      }
    } else {
      setEditingItemDate('');
      setEditingItemTime('');
    }
  }, [monthContents]);
  
  // 議事録アイテムのタイトル編集開始（月タブと総括タブの両方に対応）
  const handleStartEditItemTitle = useCallback((tab: TabType, itemId: string) => {
    setEditingMonth(tab);
    setEditingSection(`${itemId}-title`);
    const tabData = monthContents[tab] as MonthContent | undefined;
    const item = tabData?.items?.find(i => i.id === itemId);
    setEditingItemTitle(item?.title || '');
  }, [monthContents]);

  // 編集キャンセル
  const handleCancelEdit = useCallback(() => {
    setEditingMonth(null);
    setEditingSection(null);
    setEditingContent('');
    setEditingItemTitle('');
    setEditingItemDate('');
    setEditingItemTime('');
  }, []);

  // 編集保存
  const handleSaveEdit = useCallback(async () => {
    if (!editingMonth || !editingSection) return;
    
    // 保存ステータスを開始（即座に表示されるように）
    setSavingStatus('saving');
    
    // 状態を更新
    let updatedContents: typeof monthContents = monthContents;
    setMonthContents(prev => {
      const updated = { ...prev };
      
      // 総括タブの場合（MonthContent型として扱う）
      if (SUMMARY_TABS.some(t => t.id === editingMonth)) {
        const summaryTab = editingMonth as SummaryTab;
        if (!updated[summaryTab] || typeof updated[summaryTab] === 'string') {
          updated[summaryTab] = { summary: '', items: [] };
        }
        const summaryData = updated[summaryTab] as MonthContent;
        const summaryId = summaryData.summaryId;
        if (editingSection === summaryId) {
          updated[summaryTab] = {
            ...summaryData,
            summary: editingContent,
          };
        } else if (editingSection.endsWith('-title')) {
          // タイトルの編集
          const itemId = editingSection.replace('-title', '');
          const itemIndex = summaryData.items.findIndex(i => i.id === itemId);
          if (itemIndex >= 0) {
            summaryData.items[itemIndex] = {
              ...summaryData.items[itemIndex],
              title: editingItemTitle,
            };
          }
          updated[summaryTab] = summaryData;
        } else {
          // コンテンツの編集
          const itemIndex = summaryData.items.findIndex(i => i.id === editingSection);
          if (itemIndex >= 0) {
            // 日付と時間を結合
            const combinedDate = editingItemDate 
              ? (editingItemTime ? `${editingItemDate} ${editingItemTime}`.trim() : editingItemDate)
              : (editingItemTime || undefined);
            
            summaryData.items[itemIndex] = {
              ...summaryData.items[itemIndex],
              content: editingContent,
              date: combinedDate,
            };
          }
          updated[summaryTab] = summaryData;
        }
        updatedContents = updated;
        return updated;
      }
      
      // 月タブの場合
      const month = editingMonth as MonthTab;
      if (!updated[month] || typeof updated[month] === 'string') {
        updated[month] = { summary: '', items: [] };
      }
      
        const monthData = updated[month] as MonthContent;
        const summaryId = monthData.summaryId;
        
        if (editingSection === summaryId) {
          updated[month] = {
            ...monthData,
            summary: editingContent,
          };
        } else if (editingSection.endsWith('-title')) {
        // タイトルの編集
        const itemId = editingSection.replace('-title', '');
        const itemIndex = monthData.items.findIndex(i => i.id === itemId);
        if (itemIndex >= 0) {
          monthData.items[itemIndex] = {
            ...monthData.items[itemIndex],
            title: editingItemTitle,
          };
        }
        updated[month] = monthData;
      } else {
        // コンテンツの編集
        const itemIndex = monthData.items.findIndex(i => i.id === editingSection);
        if (itemIndex >= 0) {
          // 日付と時間を結合
          const combinedDate = editingItemDate 
            ? (editingItemTime ? `${editingItemDate} ${editingItemTime}`.trim() : editingItemDate)
            : (editingItemTime || undefined);
          
          monthData.items[itemIndex] = {
            ...monthData.items[itemIndex],
            content: editingContent,
            date: combinedDate,
          };
        }
        updated[month] = monthData;
      }
      
      updatedContents = updated;
      return updated;
    });
    
    // 編集モードをキャンセル
    handleCancelEdit();
    
    // 少し待ってから保存処理を実行（状態更新を確実にするため）
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // JSONファイルに保存（handleManualSaveと同じロジック）
    if (meetingNote && updatedContents) {
      try {
        const contentJson = JSON.stringify(updatedContents, null, 2);
        // 事業会社の管理はorganizationsテーブルのtypeカラムで行うため、通常のsaveMeetingNoteを使用
        await saveMeetingNote({
          ...meetingNote,
          content: contentJson,
        });
        devLog('✅ [handleSaveEdit] 保存成功');
        setHasUnsavedChanges(false); // 保存完了後、未保存フラグをリセット
        setSavingStatus('saved'); // 保存完了ステータスを設定
        setTimeout(() => {
          setSavingStatus('idle');
        }, 2000);
      } catch (error: any) {
        console.error('❌ [handleSaveEdit] 保存に失敗しました:', error);
        alert(`保存に失敗しました: ${error?.message || '不明なエラー'}`);
        setHasUnsavedChanges(true); // エラー時は未保存フラグをtrueのまま
        setSavingStatus('idle');
      }
    } else {
      // データがない場合は保存ステータスをリセット
      setSavingStatus('idle');
    }
  }, [editingMonth, editingSection, editingContent, editingItemTitle, editingItemDate, editingItemTime, monthContents, setMonthContents, meetingNote, setHasUnsavedChanges, setSavingStatus, handleCancelEdit]);

  return {
    editingMonth,
    editingSection,
    editingContent,
    editingItemTitle,
    editingItemDate,
    editingItemTime,
    setEditingMonth,
    setEditingSection,
    setEditingContent,
    setEditingItemTitle,
    setEditingItemDate,
    setEditingItemTime,
    handleStartEditSummary,
    handleStartEditItem,
    handleStartEditItemTitle,
    handleCancelEdit,
    handleSaveEdit,
  };
}

