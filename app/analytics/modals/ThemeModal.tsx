import { useState } from 'react';
import { saveTheme, getThemes, type Theme } from '@/lib/orgApi';

interface ThemeModalProps {
  isOpen: boolean;
  editingTheme: Theme | null;
  themeFormTitle: string;
  themeFormDescription: string;
  showEditThemesModal: boolean;
  onClose: () => void;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onThemeSaved: (themes: Theme[]) => void;
  onEditThemesModalReopen?: () => void;
}

export default function ThemeModal({
  isOpen,
  editingTheme,
  themeFormTitle,
  themeFormDescription,
  showEditThemesModal,
  onClose,
  onTitleChange,
  onDescriptionChange,
  onThemeSaved,
  onEditThemesModalReopen,
}: ThemeModalProps) {
  if (!isOpen) return null;

  const handleSave = async () => {
    if (!themeFormTitle.trim()) {
      alert('タイトルを入力してください');
      return;
    }
    
    try {
      if (editingTheme) {
        await saveTheme({
          id: editingTheme.id,
          title: themeFormTitle.trim(),
          description: themeFormDescription.trim() || undefined,
          initiativeIds: editingTheme.initiativeIds,
        });
      } else {
        await saveTheme({
          title: themeFormTitle.trim(),
          description: themeFormDescription.trim() || undefined,
        });
      }
      
      const refreshedThemes = await getThemes();
      onThemeSaved(refreshedThemes);
      onClose();
      
      if (showEditThemesModal && onEditThemesModalReopen) {
        onEditThemesModalReopen();
      }
    } catch (error: any) {
      console.error('テーマの保存に失敗しました:', error);
      alert('テーマの保存に失敗しました');
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
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          width: '90%',
          maxWidth: '500px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{
          marginBottom: '20px',
          fontSize: '20px',
          fontWeight: '600',
          color: '#1A1A1A',
          fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
          {editingTheme ? 'テーマを編集' : 'テーマを追加'}
        </h3>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#1A1A1A',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            タイトル <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <input
            type="text"
            value={themeFormTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1.5px solid #E0E0E0',
              borderRadius: '6px',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
            placeholder="テーマのタイトルを入力"
          />
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#1A1A1A',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            説明
          </label>
          <textarea
            value={themeFormDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1.5px solid #E0E0E0',
              borderRadius: '6px',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              resize: 'vertical',
            }}
            placeholder="テーマの説明を入力（任意）"
          />
        </div>
        
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#1A1A1A',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #E0E0E0',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#FFFFFF',
              backgroundColor: '#4262FF',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            {editingTheme ? '更新' : '作成'}
          </button>
        </div>
      </div>
    </div>
  );
}

