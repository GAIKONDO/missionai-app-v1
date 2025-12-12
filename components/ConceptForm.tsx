'use client';

import { useState, useEffect } from 'react';
import { callTauriCommand } from '@/lib/localFirebase';
import { PageMetadata } from '@/types/pageMetadata';
import { SUB_MENU_ITEMS } from './ConceptSubMenu';

export interface ConceptData {
  name: string;
  description: string;
  conceptId: string; // 自動生成されるID
  serviceId?: string; // サービスID
  pagesBySubMenu?: { [subMenuId: string]: Array<PageMetadata> }; // メタデータ付きページ
  pageOrderBySubMenu?: { [subMenuId: string]: string[] };
  visibleSubMenuIds?: string[]; // 表示するサブメニューのIDリスト
  customSubMenuLabels?: { [subMenuId: string]: string }; // カスタムサブメニューラベル（サブメニューIDをキーとしてカスタムラベルを保存）
  fixedPageContainersBySubMenu?: { [subMenuId: string]: Array<{ id: string; title: string; content: string; order: number }> }; // 固定ページ形式のコンテナ
}

interface ConceptFormProps {
  concept?: ConceptData & { id?: string };
  serviceId: string;
  onSave: () => void;
  onCancel: () => void;
}

export default function ConceptForm({ concept, serviceId, onSave, onCancel }: ConceptFormProps) {
  const [formData, setFormData] = useState<ConceptData>({
    name: '',
    description: '',
    conceptId: '',
  });
  const [loading, setLoading] = useState(false);
  // 表示するサブメニューのIDセット（デフォルトは全選択）
  const [visibleSubMenuIds, setVisibleSubMenuIds] = useState<Set<string>>(
    new Set(SUB_MENU_ITEMS.map(item => item.id))
  );
  // カスタムサブメニューラベル（サブメニューIDをキーとしてカスタムラベルを保存）
  const [customSubMenuLabels, setCustomSubMenuLabels] = useState<{ [subMenuId: string]: string }>({});

  useEffect(() => {
    if (concept) {
      console.log('ConceptForm: concept data received', concept);
      setFormData({
        name: concept.name || '',
        description: concept.description || '',
        conceptId: concept.conceptId || '',
      });
      // 既存の構想の場合は、設定されているvisibleSubMenuIdsを使用
      // 未設定の場合は全サブメニューを選択状態にする
      console.log('ConceptForm: visibleSubMenuIds from concept', concept.visibleSubMenuIds);
      if (concept.visibleSubMenuIds && concept.visibleSubMenuIds.length > 0) {
        setVisibleSubMenuIds(new Set(concept.visibleSubMenuIds));
        console.log('ConceptForm: Set visibleSubMenuIds from concept data');
      } else {
        const allIds = SUB_MENU_ITEMS.map(item => item.id);
        setVisibleSubMenuIds(new Set(allIds));
        console.log('ConceptForm: Set all submenu items as visible (default)');
      }
      // カスタムラベルを読み込む
      if (concept.customSubMenuLabels) {
        setCustomSubMenuLabels(concept.customSubMenuLabels);
        console.log('ConceptForm: Set customSubMenuLabels from concept data', concept.customSubMenuLabels);
      } else {
        setCustomSubMenuLabels({});
        console.log('ConceptForm: No custom labels, using defaults');
      }
    } else {
      // 新規作成時はconceptIdを自動生成（構想名が入力されるまで空文字列）
      // 構想名が入力された時点で自動生成される
      setFormData({
        name: '',
        description: '',
        conceptId: '',
      });
      // 新規作成時は全サブメニューを選択状態
      const allIds = SUB_MENU_ITEMS.map(item => item.id);
      setVisibleSubMenuIds(new Set(allIds));
      console.log('ConceptForm: New concept - set all submenu items as visible');
      // 新規作成時はカスタムラベルなし
      setCustomSubMenuLabels({});
    }
  }, [concept]);

  const generateConceptId = (name: string): string => {
    // タイムスタンプベースの一意なIDを生成
    // 形式: concept-{timestamp}
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `concept-${timestamp}${randomSuffix}`;
  };

  const handleNameChange = (name: string) => {
    // 新規作成時のみ構想IDを自動生成（編集時は既存のIDを維持）
    const conceptId = concept?.conceptId || generateConceptId(name);
    setFormData({ ...formData, name, conceptId });
  };

  const handleSubMenuToggle = (subMenuId: string) => {
    console.log('handleSubMenuToggle called with:', subMenuId);
    setVisibleSubMenuIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subMenuId)) {
        newSet.delete(subMenuId);
        console.log('Removed subMenuId:', subMenuId, 'New set:', Array.from(newSet));
      } else {
        newSet.add(subMenuId);
        console.log('Added subMenuId:', subMenuId, 'New set:', Array.from(newSet));
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setVisibleSubMenuIds(new Set(SUB_MENU_ITEMS.map(item => item.id)));
  };

  const handleDeselectAll = () => {
    setVisibleSubMenuIds(new Set());
  };

  const handleLabelChange = (subMenuId: string, label: string) => {
    setCustomSubMenuLabels(prev => {
      const newLabels = { ...prev };
      if (label.trim() === '' || label === SUB_MENU_ITEMS.find(item => item.id === subMenuId)?.label) {
        // 空文字列またはデフォルトラベルの場合は削除
        delete newLabels[subMenuId];
      } else {
        // カスタムラベルを設定
        newLabels[subMenuId] = label.trim();
      }
      return newLabels;
    });
  };

  const handleResetLabel = (subMenuId: string) => {
    setCustomSubMenuLabels(prev => {
      const newLabels = { ...prev };
      delete newLabels[subMenuId];
      return newLabels;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Tauri環境では認証チェックは不要（callTauriCommand内で処理される）

    setLoading(true);
    try {
      // 全サブメニューが選択されている場合は、visibleSubMenuIdsを保存しない（デフォルト動作）
      // 一部のみ選択されている場合のみ保存
      const visibleSubMenuIdsArray = Array.from(visibleSubMenuIds);
      const isAllSelected = visibleSubMenuIdsArray.length === SUB_MENU_ITEMS.length;
      
      // 現在のユーザーを取得
      let currentUser;
      try {
        currentUser = await callTauriCommand('get_current_user', {});
      } catch (userError: any) {
        console.error('ユーザー取得エラー:', userError);
        throw new Error('ユーザー情報の取得に失敗しました。ログイン状態を確認してください。');
      }
      
      const userId = currentUser?.uid || 'default-user';
      
      const data: any = {
        name: formData.name,
        description: formData.description,
        conceptId: formData.conceptId,
        serviceId: serviceId,
        userId: userId,
      };

      // 全選択でない場合のみvisibleSubMenuIdsを保存
      if (!isAllSelected) {
        data.visibleSubMenuIds = visibleSubMenuIdsArray;
      }

      // カスタムラベルがある場合のみ保存（空のオブジェクトは保存しない）
      const customLabelsKeys = Object.keys(customSubMenuLabels);
      if (customLabelsKeys.length > 0) {
        data.customSubMenuLabels = customSubMenuLabels;
      }

      if (concept?.id) {
        // 編集時: 既存のpagesBySubMenuとpageOrderBySubMenuを維持
        // （これらのフィールドは編集フォームでは変更できないため、既存の値を維持）
        try {
          const result = await callTauriCommand('doc_update', {
            collectionName: 'concepts',
            docId: concept.id,
            data
          });
          if (!result || !result.id) {
            throw new Error('更新に失敗しました。結果が返されませんでした。');
          }
        } catch (updateError: any) {
          console.error('更新エラー:', updateError);
          const errorMessage = updateError?.message || '構想の更新に失敗しました';
          alert(errorMessage);
          return; // エラー時は処理を中断
        }
      } else {
        // 新規作成時: 固定ページ形式で作成（pagesBySubMenuを設定しない）
        // pagesBySubMenuが存在しない構想は固定ページ形式として扱われる
        try {
          const result = await callTauriCommand('collection_add', {
            collectionName: 'concepts',
            data
          });
          if (!result || !result.id) {
            throw new Error('作成に失敗しました。結果が返されませんでした。');
          }
          console.log('構想作成成功:', result.id);
        } catch (createError: any) {
          console.error('作成エラー:', createError);
          const errorMessage = createError?.message || '構想の作成に失敗しました';
          alert(errorMessage);
          return; // エラー時は処理を中断
        }
      }
      onSave();
    } catch (error: any) {
      console.error('保存エラー:', error);
      const errorMessage = error?.message || '保存に失敗しました';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h3 style={{ marginBottom: '24px' }}>
        {concept ? '構想を編集' : '新しい構想を作成'}
      </h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="label">構想名 *</label>
          <input
            type="text"
            className="input"
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            placeholder="例: 出産支援パーソナルApp"
          />
        </div>

        <div className="form-group">
          <label className="label">説明</label>
          <textarea
            className="textarea"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="構想の説明を入力してください（任意）"
            rows={4}
          />
        </div>

        <div className="form-group">
          <label className="label">構想ID（自動生成）</label>
          <input
            type="text"
            className="input"
            value={formData.conceptId}
            readOnly
            disabled={!!concept?.id}
            placeholder="構想IDは自動生成されます"
            style={{ 
              fontFamily: 'monospace', 
              fontSize: '13px',
              backgroundColor: concept?.id ? 'var(--color-bg-secondary)' : 'var(--color-bg)',
              cursor: concept?.id ? 'not-allowed' : 'default',
              opacity: concept?.id ? 0.7 : 1,
            }}
          />
          <p style={{ fontSize: '12px', color: 'var(--color-text-light)', marginTop: '4px' }}>
            {concept?.id 
              ? 'このIDは変更できません。URLに使用されます。'
              : '構想IDは自動生成され、変更できません。URLに使用されます。'}
          </p>
        </div>

        <div className="form-group">
          <label className="label">表示するサブメニュー</label>
          <div style={{ 
            border: '1px solid var(--color-border-color)', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: 'var(--color-bg)',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--color-border-color)' }}>
              <button
                type="button"
                onClick={handleSelectAll}
                style={{
                  padding: '4px 12px',
                  fontSize: '12px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                すべて選択
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                style={{
                  padding: '4px 12px',
                  fontSize: '12px',
                  backgroundColor: 'var(--color-text-light)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                すべて解除
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {SUB_MENU_ITEMS.map((item) => {
                const isChecked = visibleSubMenuIds.has(item.id);
                const customLabel = customSubMenuLabels[item.id];
                const displayLabel = customLabel || item.label;
                const hasCustomLabel = !!customLabel;
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '6px',
                      backgroundColor: isChecked ? 'rgba(31, 41, 51, 0.03)' : 'rgba(31, 41, 51, 0.01)',
                      border: '1px solid var(--color-border-color)',
                    }}
                  >
                    <input
                      id={`submenu-${item.id}`}
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        handleSubMenuToggle(item.id);
                      }}
                      style={{
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-light)', minWidth: '80px' }}>
                          デフォルト:
                        </span>
                        <span style={{ fontSize: '13px', color: 'var(--color-text-light)' }}>
                          {item.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--color-text)', minWidth: '80px', fontWeight: 500 }}>
                          表示名:
                        </span>
                        <input
                          type="text"
                          value={displayLabel}
                          onChange={(e) => handleLabelChange(item.id, e.target.value)}
                          placeholder={item.label}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            fontSize: '13px',
                            border: '1px solid var(--color-border-color)',
                            borderRadius: '4px',
                            backgroundColor: hasCustomLabel ? '#FFF9E6' : 'var(--color-bg)',
                            color: 'var(--color-text)',
                          }}
                        />
                        {hasCustomLabel && (
                          <button
                            type="button"
                            onClick={() => handleResetLabel(item.id)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '11px',
                              backgroundColor: 'var(--color-text-light)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                            title="デフォルトに戻す"
                          >
                            リセット
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-light)', marginTop: '8px' }}>
            表示したいサブメニューを選択してください。未選択のサブメニューは非表示になります。
            <br />
            各サブメニューの「表示名」を編集することで、メニューに表示される名前をカスタマイズできます。デフォルトに戻す場合は「リセット」ボタンをクリックしてください。
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            className="button"
            style={{ background: 'var(--color-text-light)' }}
            disabled={loading}
          >
            キャンセル
          </button>
          <button type="submit" className="button" disabled={loading}>
            {loading ? '保存中...' : concept ? '更新' : '作成'}
          </button>
        </div>
      </form>
    </div>
  );
}

