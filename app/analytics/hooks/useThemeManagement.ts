import { useState, useCallback } from 'react';
import { getThemes, updateThemePositions, type Theme } from '@/lib/orgApi';
import { arrayMove } from '@dnd-kit/sortable';
import { DragEndEvent } from '@dnd-kit/core';
import { devLog } from '../utils/devLog';

export function useThemeManagement(
  themes: Theme[],
  setThemes: React.Dispatch<React.SetStateAction<Theme[]>>
) {
  const [orderedThemes, setOrderedThemes] = useState<Theme[]>([]);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [themeFormTitle, setThemeFormTitle] = useState('');
  const [themeFormDescription, setThemeFormDescription] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState<Theme | null>(null);
  const [showEditThemesModal, setShowEditThemesModal] = useState(false);

  const refreshThemes = useCallback(async () => {
    try {
      const refreshedThemes = await getThemes();
      setThemes(refreshedThemes);
      
      const sorted = [...refreshedThemes].sort((a, b) => {
        const posA = a.position ?? 999999;
        const posB = b.position ?? 999999;
        return posA - posB;
      });
      setOrderedThemes(sorted);
    } catch (error: any) {
      console.error('テーマリストの再読み込みに失敗しました:', error);
    }
  }, [setThemes]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const currentThemes = await getThemes();
      const currentThemeIds = currentThemes.map(t => t.id);
      const originalThemeIds = orderedThemes.map(t => t.id);
      
      if (currentThemeIds.length !== originalThemeIds.length ||
          !currentThemeIds.every((id, index) => id === originalThemeIds[index])) {
        alert('テーマリストが更新されました。ページをリロードしてください。');
        const refreshedThemes = await getThemes();
        setThemes(refreshedThemes);
        const sorted = [...refreshedThemes].sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
        setOrderedThemes(sorted);
        return;
      }
      
      const oldIndex = orderedThemes.findIndex(t => t.id === active.id);
      const newIndex = orderedThemes.findIndex(t => t.id === over.id);
      
      if (oldIndex === -1 || newIndex === -1) {
        return;
      }
      
      const newOrderedThemes = arrayMove(orderedThemes, oldIndex, newIndex);
      setOrderedThemes(newOrderedThemes);
      
      const updates = newOrderedThemes.map((theme, index) => ({
        themeId: theme.id,
        position: index + 1,
      }));
      
      devLog('🔄 [handleDragEnd] 送信するupdates:', updates.length, '件');
      
      try {
        await updateThemePositions(updates);
        const refreshedThemes = await getThemes();
        devLog('📖 [handleDragEnd] 再取得したテーマ数:', refreshedThemes.length, '件');
        setThemes(refreshedThemes);
        const sorted = [...refreshedThemes].sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
        devLog('📊 [handleDragEnd] ソート完了');
        setOrderedThemes(sorted);
      } catch (error) {
        console.error('テーマ順序の更新に失敗しました:', error);
        setOrderedThemes(orderedThemes);
        alert('テーマ順序の更新に失敗しました。ページをリロードしてください。');
        const refreshedThemes = await getThemes();
        setThemes(refreshedThemes);
        const sorted = [...refreshedThemes].sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
        setOrderedThemes(sorted);
      }
    }
  }, [orderedThemes, setThemes]);

  const initializeOrderedThemes = useCallback((themesList: Theme[]) => {
    const sorted = [...themesList].sort((a, b) => {
      const posA = a.position ?? 999999;
      const posB = b.position ?? 999999;
      return posA - posB;
    });
    setOrderedThemes(sorted);
  }, []);

  return {
    orderedThemes,
    setOrderedThemes,
    showThemeModal,
    setShowThemeModal,
    editingTheme,
    setEditingTheme,
    themeFormTitle,
    setThemeFormTitle,
    themeFormDescription,
    setThemeFormDescription,
    showDeleteModal,
    setShowDeleteModal,
    themeToDelete,
    setThemeToDelete,
    showEditThemesModal,
    setShowEditThemesModal,
    refreshThemes,
    handleDragEnd,
    initializeOrderedThemes,
  };
}

