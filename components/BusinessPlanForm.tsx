'use client';

import { useState, useEffect } from 'react';
import { callTauriCommand } from '@/lib/localFirebase';
import { PageMetadata } from '@/types/pageMetadata';
import { SUB_MENU_ITEMS } from './ConceptSubMenu';

export interface KeyVisualPDFMetadata {
  title: string;
  signature: string;
  date: string;
  position: {
    x: number; // mm
    y: number; // mm
    align: 'left' | 'center' | 'right';
  };
  titleFontSize?: number; // pt
  signatureFontSize?: number; // pt
  dateFontSize?: number; // pt
}

export interface FixedPageContainer {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface BusinessPlanData {
  title: string;
  description: string;
  objectives: string;
  targetMarket: string;
  competitiveAdvantage: string;
  financialPlan: string;
  timeline: string;
  keyVisualUrl?: string; // キービジュアル画像のURL
  keyVisualHeight?: number; // キービジュアルの高さ（%）
  keyVisualScale?: number; // キービジュアルのスケール（%）
  keyVisualLogoUrl?: string; // PDFロゴのURL
  keyVisualLogoSize?: number; // PDFロゴのサイズ（mm）- 高さ
  keyVisualMetadata?: KeyVisualPDFMetadata; // PDFメタデータ（タイトル、署名、作成日）
  titlePositionX?: number; // PDFタイトルのX位置（mm）
  titlePositionY?: number; // PDFタイトルのY位置（mm）
  titleFontSize?: number; // PDFタイトルのフォントサイズ（px）
  titleBorderEnabled?: boolean; // PDFタイトルのボーダー（縦棒）の有無
  footerText?: string; // PDFフッターテキスト
  pagesBySubMenu?: { [subMenuId: string]: Array<PageMetadata> }; // サブメニューごとのページ（メタデータ付き）
  pageOrderBySubMenu?: { [subMenuId: string]: string[] }; // サブメニューごとのページ順序
  isFavorite?: boolean; // お気に入り
  visibleSubMenuIds?: string[]; // 表示するサブメニューのIDリスト（未設定の場合は全表示）
  customSubMenuLabels?: { [subMenuId: string]: string }; // カスタムサブメニューラベル（サブメニューIDをキーとしてカスタムラベルを保存）
  fixedPageContainersBySubMenu?: { [subMenuId: string]: FixedPageContainer[] }; // 固定ページ形式のコンテナ（サブメニューごと）
}

interface BusinessPlanFormProps {
  plan?: BusinessPlanData & { id?: string };
  onSave: () => void;
  onCancel: () => void;
  type: 'company' | 'project';
  serviceId?: string; // サービスID（事業企画内の具体的なサービス用）
  conceptId?: string; // 構想ID（自社サービス事業内の構想用）
}

export default function BusinessPlanForm({ plan, onSave, onCancel, type, serviceId, conceptId }: BusinessPlanFormProps) {
  const [formData, setFormData] = useState<BusinessPlanData>({
    title: '',
    description: '',
    objectives: '',
    targetMarket: '',
    competitiveAdvantage: '',
    financialPlan: '',
    timeline: '',
  });
  const [loading, setLoading] = useState(false);
  // 表示するサブメニューのIDセット（デフォルトは全選択）- type === 'company'の場合のみ使用
  const [visibleSubMenuIds, setVisibleSubMenuIds] = useState<Set<string>>(
    new Set(SUB_MENU_ITEMS.map(item => item.id))
  );
  // カスタムサブメニューラベル（サブメニューIDをキーとしてカスタムラベルを保存）- type === 'company'の場合のみ使用
  const [customSubMenuLabels, setCustomSubMenuLabels] = useState<{ [subMenuId: string]: string }>({});

  useEffect(() => {
    if (plan) {
      setFormData({
        title: plan.title || '',
        description: plan.description || '',
        objectives: plan.objectives || '',
        targetMarket: plan.targetMarket || '',
        competitiveAdvantage: plan.competitiveAdvantage || '',
        financialPlan: plan.financialPlan || '',
        timeline: plan.timeline || '',
      });
      // type === 'company'の場合のみ、サブメニュー設定を読み込む
      if (type === 'company') {
        if (plan.visibleSubMenuIds && plan.visibleSubMenuIds.length > 0) {
          setVisibleSubMenuIds(new Set(plan.visibleSubMenuIds));
        } else {
          setVisibleSubMenuIds(new Set(SUB_MENU_ITEMS.map(item => item.id)));
        }
        if (plan.customSubMenuLabels) {
          setCustomSubMenuLabels(plan.customSubMenuLabels);
        } else {
          setCustomSubMenuLabels({});
        }
      }
    } else {
      // 新規作成時
      if (type === 'company') {
        setVisibleSubMenuIds(new Set(SUB_MENU_ITEMS.map(item => item.id)));
        setCustomSubMenuLabels({});
      }
    }
  }, [plan, type]);

  const handleSubMenuToggle = (subMenuId: string) => {
    setVisibleSubMenuIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subMenuId)) {
        newSet.delete(subMenuId);
      } else {
        newSet.add(subMenuId);
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
    e.stopPropagation();
    
    console.log('handleSubmitが呼ばれました');
    console.log('formData:', formData);
    console.log('type:', type);
    
    // 現在のユーザーを取得
    const currentUser = await callTauriCommand('get_current_user', {});
    const userId = currentUser?.uid || 'default-user';
    console.log('使用するuserId:', userId);

    console.log('保存処理を開始します');
    setLoading(true);
    try {
      // タイトルと概要のみを保存（他のフィールドは既存データがあれば保持、なければ空文字列）
      const data: any = {
        title: formData.title,
        description: formData.description,
        objectives: plan?.objectives || '',
        targetMarket: plan?.targetMarket || '',
        competitiveAdvantage: plan?.competitiveAdvantage || '',
        financialPlan: plan?.financialPlan || '',
        timeline: plan?.timeline || '',
        userId: userId,
      };

      // type === 'company'の場合のみ、サブメニュー設定を保存
      if (type === 'company') {
        const visibleSubMenuIdsArray = Array.from(visibleSubMenuIds);
        const isAllSelected = visibleSubMenuIdsArray.length === SUB_MENU_ITEMS.length;
        
        // 全選択でない場合のみvisibleSubMenuIdsを保存
        if (!isAllSelected) {
          data.visibleSubMenuIds = visibleSubMenuIdsArray;
        }
        // 全選択の場合は、visibleSubMenuIdsフィールドを削除（Tauriではnullを設定）

        // カスタムラベルがある場合のみ保存（空のオブジェクトは保存しない）
        const customLabelsKeys = Object.keys(customSubMenuLabels);
        if (customLabelsKeys.length > 0) {
          data.customSubMenuLabels = customSubMenuLabels;
        }
        // カスタムラベルがない場合は、customSubMenuLabelsフィールドを削除（Tauriではnullを設定）
      }

      if (type === 'company') {
        // 会社本体の事業計画（複数作成可能）
        console.log('会社本体の事業計画を保存します');
        console.log('plan?.id:', plan?.id);
        console.log('保存するデータ:', data);
        
        if (plan?.id) {
          console.log('既存の事業計画を更新します:', plan.id);
          const result = await callTauriCommand('update_business_plan', {
            planId: plan.id,
            data: data
          });
          if (!result || !result.success) {
            throw new Error(result?.error || '更新に失敗しました');
          }
          console.log('更新が完了しました');
        } else {
          console.log('[BusinessPlanForm] 新しい事業計画を作成します');
          console.log('[BusinessPlanForm] 保存するデータ:', JSON.stringify(data, null, 2));
          try {
            const result = await callTauriCommand('create_business_plan', {
              data: {
                ...data,
                name: formData.title, // nameフィールドも必要
              }
            });
            if (!result || !result.success) {
              throw new Error(result?.error || '作成に失敗しました');
            }
            console.log('[BusinessPlanForm] ✅ 作成が完了しました。ID:', result.id);
          } catch (addError: any) {
            console.error('[BusinessPlanForm] ❌ create_business_plan実行エラー:', addError);
            console.error('[BusinessPlanForm] エラー詳細:', {
              message: addError?.message,
              name: addError?.name,
              stack: addError?.stack,
              error: addError
            });
            throw addError;
          }
        }
      } else if (serviceId) {
        // サービス事業計画（事業企画内の具体的なサービス内容）
        const serviceData = {
          ...data,
          serviceId: serviceId,
          ...(conceptId && { conceptId: conceptId }), // 構想IDがある場合のみ追加
        };
        if (plan?.id) {
          const result = await callTauriCommand('doc_update', {
            collectionName: 'servicePlans',
            docId: plan.id,
            data: serviceData
          });
          if (!result) {
            throw new Error('更新に失敗しました');
          }
        } else {
          const result = await callTauriCommand('collection_add', {
            collectionName: 'servicePlans',
            data: serviceData
          });
          if (!result) {
            throw new Error('作成に失敗しました');
          }
        }
      } else {
        // 事業企画
        if (plan?.id) {
          const result = await callTauriCommand('doc_update', {
            collectionName: 'businessProjects',
            docId: plan.id,
            data
          });
          if (!result) {
            throw new Error('更新に失敗しました');
          }
        } else {
          const result = await callTauriCommand('collection_add', {
            collectionName: 'businessProjects',
            data
          });
          if (!result) {
            throw new Error('作成に失敗しました');
          }
        }
      }
      console.log('保存が成功しました。onSave()を呼び出します');
      onSave();
    } catch (error: any) {
      // 詳細なエラーログを出力
      console.error('='.repeat(80));
      console.error('[BusinessPlanForm] ❌ 保存エラー発生');
      console.error('[BusinessPlanForm] エラーオブジェクト:', error);
      console.error('[BusinessPlanForm] エラーの詳細:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        code: error?.code,
        error: error,
        errorString: String(error),
        errorJSON: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        type: type,
        planId: plan?.id,
        formData: formData,
        hasDiagnostics: !!(error as any)?.diagnostics
      });
      
      // 診断情報がある場合は表示
      if ((error as any)?.diagnostics) {
        console.error('[BusinessPlanForm] 診断情報:', (error as any).diagnostics);
      }
      
      console.error('='.repeat(80));
      
      // エラーメッセージを構築
      let errorMessage = '保存に失敗しました。\n\n';
      
      if (error?.message) {
        // エラーメッセージが複数行の場合はそのまま使用
        if (error.message.includes('\n')) {
          errorMessage += error.message;
        } else {
          errorMessage += `エラー: ${error.message}`;
        }
      } else {
        errorMessage += `不明なエラーが発生しました。\n`;
        errorMessage += `エラー詳細: ${String(error)}`;
      }
      
      // 追加情報を追加
      errorMessage += `\n\n詳細情報:\n`;
      errorMessage += `- タイプ: ${type}\n`;
      errorMessage += `- コレクション名: ${type === 'company' ? 'companyBusinessPlan' : type === 'project' ? 'businessProjects' : 'servicePlans'}\n`;
      if (error?.code) {
        errorMessage += `- エラーコード: ${error.code}\n`;
      }
      if (error?.name) {
        errorMessage += `- エラータイプ: ${error.name}\n`;
      }
      
      // 診断情報がある場合は追加
      if ((error as any)?.diagnostics) {
        errorMessage += `\n\n[診断情報]\n`;
        const diag = (error as any).diagnostics;
        Object.entries(diag).forEach(([key, value]) => {
          errorMessage += `${key}: ${value}\n`;
        });
      }
      
      // データベース関連のエラーの場合、診断コマンドを実行するよう提案
      if (error?.message?.includes('データベース') || error?.message?.includes('データベースが利用できません')) {
        errorMessage += `\n\n対処法:\n`;
        errorMessage += `1. アプリケーションを再起動してください\n`;
        errorMessage += `2. ブラウザのコンソールで以下のコマンドを実行して診断情報を確認してください:\n`;
        errorMessage += `   await window.__TAURI__.core.invoke('diagnose_database')\n`;
        errorMessage += `3. それでも解決しない場合は、reinitialize_databaseコマンドを実行してください`;
      }
      
      console.error('[BusinessPlanForm] 表示するエラーメッセージ:', errorMessage);
      
      // エラーメッセージを表示（alertとconsole.errorの両方）
      alert(errorMessage);
      
      // コンソールにもエラーメッセージを表示（コピーしやすいように）
      console.error('[BusinessPlanForm] エラーメッセージ（コピー用）:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h3 style={{ marginBottom: '24px' }}>
        {plan ? '編集' : '作成'}: {type === 'company' ? '会社本体の事業計画' : '事業企画'}
      </h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="label">タイトル *</label>
          <input
            type="text"
            className="input"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            placeholder="事業計画のタイトルを入力"
          />
        </div>

        <div className="form-group">
          <label className="label">概要</label>
          <textarea
            className="textarea"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="事業の概要を説明してください"
            rows={4}
          />
        </div>

        {/* 会社本体の事業計画の場合のみ、サブメニュー設定を表示 */}
        {type === 'company' && (
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
        )}

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
          <button 
            type="submit" 
            className="button" 
            disabled={loading}
            onClick={(e) => {
              console.log('作成/更新ボタンがクリックされました');
              console.log('loading:', loading);
              console.log('formData.title:', formData.title);
              // フォームのsubmitイベントを発火させる
            }}
          >
            {loading ? '保存中...' : plan ? '更新' : '作成'}
          </button>
        </div>
      </form>
    </div>
  );
}

