'use client';

import { useState, useEffect } from 'react';
import type { Theme } from '@/lib/orgApi';
import type { ThemeHierarchyConfig, ThemeHierarchyLevel } from '@/lib/themeHierarchy';
import { loadHierarchyConfig, saveHierarchyConfig, validateHierarchyConfig, getDefaultHierarchyConfig } from '@/lib/themeHierarchy';

interface ThemeHierarchyEditorProps {
  themes: Theme[];
  config: ThemeHierarchyConfig;
  onConfigChange: (config: ThemeHierarchyConfig) => void;
}

export default function ThemeHierarchyEditor({
  themes,
  config,
  onConfigChange,
}: ThemeHierarchyEditorProps) {
  const [localConfig, setLocalConfig] = useState<ThemeHierarchyConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // 階層数の変更
  const handleMaxLevelsChange = (maxLevels: number) => {
    const newLevels: ThemeHierarchyLevel[] = [];
    
    // 既存の階層設定を保持
    for (let i = 1; i <= maxLevels; i++) {
      const existingLevel = localConfig.levels.find(l => l.level === i);
      if (existingLevel) {
        newLevels.push(existingLevel);
      } else {
        newLevels.push({
          level: i,
          themeIds: [],
        });
      }
    }

    const newConfig: ThemeHierarchyConfig = {
      ...localConfig,
      maxLevels,
      levels: newLevels,
    };

    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  // 階層のテーマを追加
  const handleAddThemeToLevel = (level: number, themeId: string) => {
    const newLevels = localConfig.levels.map(l => {
      if (l.level === level) {
        // 階層1は1つのテーマのみ
        if (level === 1) {
          return {
            ...l,
            themeIds: [themeId],
          };
        }
        // 階層2以降は複数のテーマを追加可能
        if (!l.themeIds.includes(themeId)) {
          return {
            ...l,
            themeIds: [...l.themeIds, themeId],
          };
        }
      }
      return l;
    });

    const newConfig: ThemeHierarchyConfig = {
      ...localConfig,
      levels: newLevels,
    };

    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  // 階層のテーマを削除
  const handleRemoveThemeFromLevel = (level: number, themeId: string) => {
    const newLevels = localConfig.levels.map(l => {
      if (l.level === level) {
        return {
          ...l,
          themeIds: l.themeIds.filter(id => id !== themeId),
        };
      }
      return l;
    });

    const newConfig: ThemeHierarchyConfig = {
      ...localConfig,
      levels: newLevels,
    };

    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  // 設定を保存
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const validation = validateHierarchyConfig(localConfig);
      if (!validation.valid) {
        setSaveMessage(`エラー: ${validation.errors.join(', ')}`);
        setIsSaving(false);
        return;
      }

      await saveHierarchyConfig(localConfig);
      setSaveMessage('保存しました');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: any) {
      console.error('階層設定の保存に失敗しました:', error);
      setSaveMessage(`保存に失敗しました: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 選択可能なテーマを取得（既に他の階層で選択されているテーマを除外）
  const getAvailableThemes = (level: number): Theme[] => {
    // 階層1の場合は、階層1で既に選択されているテーマを除外
    if (level === 1) {
      const level1ThemeIds = localConfig.levels.find(l => l.level === 1)?.themeIds || [];
      return themes.filter(t => !level1ThemeIds.includes(t.id));
    }
    
    // 階層2以降の場合は、他の階層で選択されているテーマを除外
    const usedThemeIds = new Set<string>();
    localConfig.levels.forEach(l => {
      if (l.level !== level) {
        l.themeIds.forEach(id => usedThemeIds.add(id));
      }
    });

    return themes.filter(t => !usedThemeIds.has(t.id));
  };

  return (
    <div style={{ 
      padding: '20px',
      backgroundColor: '#FFFFFF',
      borderRadius: '8px',
      border: '1px solid #E0E0E0',
      minWidth: '300px',
      maxHeight: 'calc(100vh - 200px)',
      overflowY: 'auto',
    }}>
      <h3 style={{ 
        fontSize: '18px', 
        fontWeight: 600, 
        marginBottom: '16px',
        color: 'var(--color-text)',
      }}>
        階層設定
      </h3>

      {/* 階層数選択 */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ 
          display: 'block',
          fontSize: '14px',
          fontWeight: 500,
          marginBottom: '8px',
          color: 'var(--color-text)',
        }}>
          階層数
        </label>
        <select
          value={localConfig.maxLevels}
          onChange={(e) => handleMaxLevelsChange(Number(e.target.value))}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #E0E0E0',
            borderRadius: '6px',
            backgroundColor: '#FFFFFF',
            color: 'var(--color-text)',
            cursor: 'pointer',
          }}
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
            <option key={num} value={num}>
              {num}階層
            </option>
          ))}
        </select>
      </div>

      {/* 各階層の設定 */}
      <div style={{ marginBottom: '24px' }}>
        {localConfig.levels.map((level) => {
          const levelThemes = themes.filter(t => level.themeIds.includes(t.id));
          const availableThemes = getAvailableThemes(level.level);

          return (
            <div
              key={level.level}
              style={{
                marginBottom: '20px',
                padding: '16px',
                backgroundColor: '#FAFAFA',
                borderRadius: '6px',
                border: '1px solid #E0E0E0',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--color-text)',
                }}>
                  階層{level.level}
                  {level.level === 1 && (
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 400,
                      color: 'var(--color-text-light)',
                      marginLeft: '8px',
                    }}>
                      （中心）
                    </span>
                  )}
                </h4>
                <span style={{
                  fontSize: '12px',
                  color: 'var(--color-text-light)',
                }}>
                  {levelThemes.length}件
                </span>
              </div>

              {/* 選択されたテーマ */}
              {levelThemes.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  {levelThemes.map(theme => (
                    <div
                      key={theme.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        marginBottom: '4px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '4px',
                        border: '1px solid #E0E0E0',
                      }}
                    >
                      <span style={{
                        fontSize: '14px',
                        color: 'var(--color-text)',
                        flex: 1,
                      }}>
                        {theme.title}
                      </span>
                      <button
                        onClick={() => handleRemoveThemeFromLevel(level.level, theme.id)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          color: '#DC2626',
                          backgroundColor: 'transparent',
                          border: '1px solid #DC2626',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* テーマ追加ドロップダウン */}
              {availableThemes.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddThemeToLevel(level.level, e.target.value);
                      e.target.value = '';
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    border: '1px solid #E0E0E0',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">テーマを追加...</option>
                  {availableThemes.map(theme => (
                    <option key={theme.id} value={theme.id}>
                      {theme.title}
                    </option>
                  ))}
                </select>
              )}

              {availableThemes.length === 0 && levelThemes.length === 0 && (
                <div style={{
                  padding: '8px',
                  fontSize: '12px',
                  color: 'var(--color-text-light)',
                  textAlign: 'center',
                }}>
                  追加可能なテーマがありません
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 保存ボタン */}
      <div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#FFFFFF',
            backgroundColor: isSaving ? '#9CA3AF' : '#4262FF',
            border: 'none',
            borderRadius: '6px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
        {saveMessage && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            fontSize: '12px',
            color: saveMessage.includes('エラー') || saveMessage.includes('失敗') ? '#DC2626' : '#10B981',
            textAlign: 'center',
          }}>
            {saveMessage}
          </div>
        )}
      </div>
    </div>
  );
}
