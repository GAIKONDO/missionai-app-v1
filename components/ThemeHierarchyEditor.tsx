'use client';

import { useState, useEffect } from 'react';
import type { Theme } from '@/lib/orgApi';
import type { ThemeHierarchyConfig, ThemeHierarchyLevel } from '@/lib/themeHierarchy';
import { loadHierarchyConfig, saveHierarchyConfig, validateHierarchyConfig, getDefaultHierarchyConfig } from '@/lib/themeHierarchy';

// 階層ごとの色設定（ThemeHierarchyChartと同じ）
const LEVEL_COLORS = [
  '#1A1A1A', // 階層1（中心）- 黒
  '#4262FF', // 階層2 - 青
  '#10B981', // 階層3 - 緑
  '#F59E0B', // 階層4 - オレンジ
  '#8B5CF6', // 階層5 - 紫
  '#EC4899', // 階層6 - ピンク
  '#06B6D4', // 階層7 - シアン
  '#84CC16', // 階層8 - ライム
  '#F97316', // 階層9 - オレンジ
  '#6366F1', // 階層10 - インディゴ
];

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
    <div className="card" style={{ 
      minWidth: '320px',
      maxHeight: 'calc(100vh - 200px)',
      overflowY: 'auto',
      position: 'sticky',
      top: '24px',
      padding: '32px',
    }}>
      {/* ヘッダー */}
      <div style={{
        marginBottom: '32px',
      }}>
        <h3 style={{ 
          fontSize: '20px', 
          fontWeight: 600, 
          margin: 0,
          marginBottom: '8px',
          color: '#1A1A1A',
        }}>
          階層設定
        </h3>
        <p style={{
          fontSize: '13px',
          color: '#6B7280',
          margin: 0,
        }}>
          テーマを階層ごとに配置します
        </p>
      </div>

      {/* 階層数選択 */}
      <div style={{
        marginBottom: '32px',
      }}>
        <label style={{ 
          display: 'block',
          fontSize: '13px',
          fontWeight: '500',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          marginBottom: '12px',
          color: '#6B7280',
        }}>
          使用する階層数
        </label>
        <select
          value={localConfig.maxLevels}
          onChange={(e) => handleMaxLevelsChange(Number(e.target.value))}
          style={{
            width: '100%',
            padding: '10px 14px',
            fontSize: '14px',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            color: '#1A1A1A',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#4262FF';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 98, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#E5E7EB';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
            <option key={num} value={num}>
              {num}階層
            </option>
          ))}
        </select>
        <p style={{ 
          marginTop: '8px',
          fontSize: '13px',
          color: '#9CA3AF',
        }}>
          最大10階層まで設定可能です
        </p>
      </div>

      {/* 各階層の設定 */}
      <div style={{ marginBottom: '32px' }}>
        {localConfig.levels.map((level) => {
          const levelThemes = themes.filter(t => level.themeIds.includes(t.id));
          const availableThemes = getAvailableThemes(level.level);
          const levelColor = LEVEL_COLORS[level.level - 1] || '#808080';

          // 階層ごとのグラデーション背景色を生成
          const getGradientColor = (color: string) => {
            const colorMap: Record<string, string> = {
              '#1A1A1A': 'linear-gradient(135deg, #F5F5F5 0%, #E5E5E5 100%)',
              '#4262FF': 'linear-gradient(135deg, #F0F4FF 0%, #E0E8FF 100%)',
              '#10B981': 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
              '#F59E0B': 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
              '#8B5CF6': 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
              '#EC4899': 'linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%)',
              '#06B6D4': 'linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%)',
              '#84CC16': 'linear-gradient(135deg, #F7FEE7 0%, #ECFCCB 100%)',
              '#F97316': 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
              '#6366F1': 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
            };
            return colorMap[color] || 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)';
          };

          return (
            <div
              key={level.level}
              style={{
                marginBottom: '20px',
                padding: '24px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* 右上の装飾要素（統計カード風） */}
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '60px',
                height: '60px',
                background: getGradientColor(levelColor),
                borderRadius: '0 12px 0 60px',
                opacity: 0.5,
              }} />
              
              {/* 階層ヘッダー */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px',
                position: 'relative',
                zIndex: 1,
              }}>
                <div>
                  <div style={{
                    fontSize: '13px',
                    color: '#6B7280',
                    marginBottom: '8px',
                    fontWeight: '500',
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                  }}>
                    階層{level.level}
                    {level.level === 1 && (
                      <span style={{
                        fontSize: '11px',
                        marginLeft: '6px',
                        color: '#9CA3AF',
                      }}>
                        （中心）
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    color: '#1A1A1A',
                    lineHeight: '1',
                    marginBottom: '4px',
                    fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
                  }}>
                    {levelThemes.length}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: '#9CA3AF',
                    fontWeight: '400',
                  }}>
                    件のテーマ
                  </div>
                </div>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: levelColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  flexShrink: 0,
                }}>
                  {level.level}
                </div>
              </div>

              {/* 選択されたテーマ */}
              {levelThemes.length > 0 && (
                <div style={{ marginBottom: '16px', position: 'relative', zIndex: 1 }}>
                  {levelThemes.map((theme, index) => (
                    <div
                      key={theme.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 14px',
                        marginBottom: index < levelThemes.length - 1 ? '8px' : '0',
                        backgroundColor: '#F9FAFB',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.borderColor = levelColor;
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${levelColor}15`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                        e.currentTarget.style.borderColor = '#E5E7EB';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <span style={{
                        fontSize: '14px',
                        color: '#1A1A1A',
                        flex: 1,
                        fontWeight: 500,
                        lineHeight: 1.5,
                      }}>
                        {theme.title}
                      </span>
                      <button
                        onClick={() => handleRemoveThemeFromLevel(level.level, theme.id)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          color: '#DC2626',
                          backgroundColor: 'transparent',
                          border: '1px solid #DC2626',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 500,
                          transition: 'all 0.2s ease',
                          marginLeft: '10px',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#DC2626';
                          e.currentTarget.style.color = '#FFFFFF';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#DC2626';
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
                    padding: '10px 14px',
                    fontSize: '14px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    color: '#1A1A1A',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    zIndex: 1,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = levelColor;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${levelColor}15`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <option value="">+ テーマを追加...</option>
                  {availableThemes.map(theme => (
                    <option key={theme.id} value={theme.id}>
                      {theme.title}
                    </option>
                  ))}
                </select>
              )}

              {availableThemes.length === 0 && levelThemes.length === 0 && (
                <div style={{
                  padding: '16px',
                  fontSize: '13px',
                  color: '#9CA3AF',
                  textAlign: 'center',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '8px',
                  border: '1px dashed #E5E7EB',
                  position: 'relative',
                  zIndex: 1,
                }}>
                  追加可能なテーマがありません
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 保存ボタン */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        paddingTop: '16px',
        borderTop: '1px solid #E5E7EB',
        marginTop: '24px',
      }}>
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '15px',
            fontWeight: 600,
            color: '#FFFFFF',
            backgroundColor: isSaving ? '#9CA3AF' : '#4262FF',
            border: 'none',
            borderRadius: '8px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: isSaving ? 'none' : '0 2px 8px rgba(66, 98, 255, 0.3)',
          }}
          onMouseEnter={(e) => {
            if (!isSaving) {
              e.currentTarget.style.backgroundColor = '#2E4ED8';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(66, 98, 255, 0.4)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSaving) {
              e.currentTarget.style.backgroundColor = '#4262FF';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(66, 98, 255, 0.3)';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          {isSaving ? '保存中...' : '💾 設定を保存'}
        </button>
        {saveMessage && (
          <div style={{
            marginTop: '12px',
            padding: '10px 12px',
            fontSize: '13px',
            color: saveMessage.includes('エラー') || saveMessage.includes('失敗') ? '#DC2626' : '#10B981',
            backgroundColor: saveMessage.includes('エラー') || saveMessage.includes('失敗') 
              ? '#FEE2E2' 
              : '#D1FAE5',
            textAlign: 'center',
            borderRadius: '6px',
            fontWeight: 500,
            border: `1px solid ${saveMessage.includes('エラー') || saveMessage.includes('失敗') ? '#DC2626' : '#10B981'}30`,
          }}>
            {saveMessage}
          </div>
        )}
      </div>
    </div>
  );
}
