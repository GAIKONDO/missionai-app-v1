'use client';

import { useCallback } from 'react';
import { saveFocusInitiative, getFocusInitiativeById, type FocusInitiative } from '@/lib/orgApi';

// 開発環境でのみログを有効化するヘルパー関数
const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args: any[]) => {
  if (isDev) {
    console.log(...args);
  }
};

interface UseInitiativeSaveProps {
  initiative: FocusInitiative | null;
  initiativeId: string;
  editingContent: string;
  localAssignee: string[];
  localDescription: string;
  localMethod: string[];
  localMethodOther: string;
  localMeans: string[];
  localMeansOther: string;
  localObjective: string;
  localConsiderationPeriod: string;
  localExecutionPeriod: string;
  localMonetizationPeriod: string;
  localRelatedOrganizations: string[];
  localRelatedGroupCompanies: string[];
  localMonetizationDiagram: string;
  localRelationDiagram: string;
  localCauseEffectCode: string;
  localThemeIds: string[];
  localTopicIds: string[];
  setInitiative: (initiative: FocusInitiative) => void;
  setEditingContent: (content: string) => void;
  setLocalAssignee: (assignee: string[]) => void;
  setLocalDescription: (description: string) => void;
  setLocalMethod: (method: string[]) => void;
  setLocalMethodOther: (methodOther: string) => void;
  setLocalMeans: (means: string[]) => void;
  setLocalMeansOther: (meansOther: string) => void;
  setLocalObjective: (objective: string) => void;
  setLocalConsiderationPeriod: (period: string) => void;
  setLocalExecutionPeriod: (period: string) => void;
  setLocalMonetizationPeriod: (period: string) => void;
  setLocalRelatedOrganizations: (orgs: string[]) => void;
  setLocalRelatedGroupCompanies: (companies: string[]) => void;
  setLocalMonetizationDiagram: (diagram: string) => void;
  setLocalRelationDiagram: (diagram: string) => void;
  setLocalThemeIds: (ids: string[]) => void;
  setLocalTopicIds: (ids: string[]) => void;
  setSavingStatus: (status: 'idle' | 'saving' | 'saved') => void;
}

export function useInitiativeSave({
  initiative,
  initiativeId,
  editingContent,
  localAssignee,
  localDescription,
  localMethod,
  localMethodOther,
  localMeans,
  localMeansOther,
  localObjective,
  localConsiderationPeriod,
  localExecutionPeriod,
  localMonetizationPeriod,
  localRelatedOrganizations,
  localRelatedGroupCompanies,
  localMonetizationDiagram,
  localRelationDiagram,
  localCauseEffectCode,
  localThemeIds,
  localTopicIds,
  setInitiative,
  setEditingContent,
  setLocalAssignee,
  setLocalDescription,
  setLocalMethod,
  setLocalMethodOther,
  setLocalMeans,
  setLocalMeansOther,
  setLocalObjective,
  setLocalConsiderationPeriod,
  setLocalExecutionPeriod,
  setLocalMonetizationPeriod,
  setLocalRelatedOrganizations,
  setLocalRelatedGroupCompanies,
  setLocalMonetizationDiagram,
  setLocalRelationDiagram,
  setLocalThemeIds,
  setLocalTopicIds,
  setSavingStatus,
}: UseInitiativeSaveProps) {
  const handleManualSave = useCallback(async () => {
    if (!initiative) return;
    
    // 保存するデータを構築
    const dataToSave: Partial<FocusInitiative> = {
      ...initiative,
      content: editingContent,
      assignee: localAssignee.length > 0 ? localAssignee.join(', ') : undefined,
      description: localDescription,
      method: localMethod,
      methodOther: localMethodOther,
      means: localMeans,
      meansOther: localMeansOther,
      objective: localObjective,
      considerationPeriod: localConsiderationPeriod,
      executionPeriod: localExecutionPeriod,
      monetizationPeriod: localMonetizationPeriod,
      relatedOrganizations: localRelatedOrganizations,
      relatedGroupCompanies: localRelatedGroupCompanies,
      monetizationDiagram: localMonetizationDiagram,
      relationDiagram: localRelationDiagram,
      themeIds: Array.isArray(localThemeIds) ? localThemeIds : (localThemeIds ? [localThemeIds] : []),
      topicIds: Array.isArray(localTopicIds) ? localTopicIds : (localTopicIds ? [localTopicIds] : []),
      // 特性要因図のコードからデータを更新
      ...(() => {
        try {
          if (localCauseEffectCode) {
            const parsed = JSON.parse(localCauseEffectCode);
            return {
              method: parsed.method || localMethod,
              means: parsed.means || localMeans,
              objective: parsed.objective || localObjective,
            };
          }
        } catch (e) {
          // パースエラーの場合は既存のデータを使用
        }
        return {};
      })(),
    };
    
    devLog('💾 [handleManualSave] 保存開始:', {
      initiativeId,
      contentLength: dataToSave.content?.length || 0,
      themeIdsCount: Array.isArray(dataToSave.themeIds) ? dataToSave.themeIds.length : 0,
      topicIdsCount: Array.isArray(dataToSave.topicIds) ? dataToSave.topicIds.length : 0,
    });
    
    try {
      setSavingStatus('saving');
      
      // データを保存
      await saveFocusInitiative(dataToSave);
      
      devLog('✅ [handleManualSave] 保存成功');
      
      // 保存したデータでinitiative状態を更新（再取得せずに保存したデータを使用）
      const updatedInitiative: FocusInitiative = {
        ...initiative,
        ...dataToSave,
      } as FocusInitiative;
      
      setInitiative(updatedInitiative);
      
      // ローカル状態も保存したデータで更新
      setEditingContent(dataToSave.content || '');
      setLocalAssignee(Array.isArray(dataToSave.assignee) ? dataToSave.assignee : (dataToSave.assignee ? [dataToSave.assignee] : []));
      setLocalDescription(dataToSave.description || '');
      setLocalMethod(Array.isArray(dataToSave.method) ? dataToSave.method : (dataToSave.method ? [dataToSave.method] : []));
      setLocalMethodOther(dataToSave.methodOther || '');
      setLocalMeans(Array.isArray(dataToSave.means) ? dataToSave.means : (dataToSave.means ? [dataToSave.means] : []));
      setLocalMeansOther(dataToSave.meansOther || '');
      setLocalObjective(dataToSave.objective || '');
      setLocalConsiderationPeriod(dataToSave.considerationPeriod || '');
      setLocalExecutionPeriod(dataToSave.executionPeriod || '');
      setLocalMonetizationPeriod(dataToSave.monetizationPeriod || '');
      setLocalRelatedOrganizations(Array.isArray(dataToSave.relatedOrganizations) ? dataToSave.relatedOrganizations : []);
      setLocalRelatedGroupCompanies(Array.isArray(dataToSave.relatedGroupCompanies) ? dataToSave.relatedGroupCompanies : []);
      setLocalMonetizationDiagram(dataToSave.monetizationDiagram || '');
      setLocalRelationDiagram(dataToSave.relationDiagram || '');
      setLocalThemeIds(Array.isArray(dataToSave.themeIds) ? dataToSave.themeIds : (dataToSave.themeId ? [dataToSave.themeId] : []));
      setLocalTopicIds(Array.isArray(dataToSave.topicIds) ? dataToSave.topicIds : []);
      
      setSavingStatus('saved');
      setTimeout(() => setSavingStatus('idle'), 2000);
    } catch (error: any) {
      console.error('❌ [handleManualSave] 保存に失敗しました:', error);
      alert(`保存に失敗しました: ${error?.message || '不明なエラー'}`);
      setSavingStatus('idle');
    }
  }, [
    initiative,
    initiativeId,
    editingContent,
    localAssignee,
    localDescription,
    localMethod,
    localMethodOther,
    localMeans,
    localMeansOther,
    localObjective,
    localConsiderationPeriod,
    localExecutionPeriod,
    localMonetizationPeriod,
    localRelatedOrganizations,
    localRelatedGroupCompanies,
    localMonetizationDiagram,
    localRelationDiagram,
    localCauseEffectCode,
    localThemeIds,
    localTopicIds,
    setInitiative,
    setEditingContent,
    setLocalAssignee,
    setLocalDescription,
    setLocalMethod,
    setLocalMethodOther,
    setLocalMeans,
    setLocalMeansOther,
    setLocalObjective,
    setLocalConsiderationPeriod,
    setLocalExecutionPeriod,
    setLocalMonetizationPeriod,
    setLocalRelatedOrganizations,
    setLocalRelatedGroupCompanies,
    setLocalMonetizationDiagram,
    setLocalRelationDiagram,
    setLocalThemeIds,
    setLocalTopicIds,
    setSavingStatus,
  ]);

  const handleDownloadJson = useCallback(async () => {
    if (!initiative) return;
    
    try {
      // 現在の編集内容を含む完全なデータを構築
      const dataToDownload: FocusInitiative = {
        ...initiative,
        content: editingContent,
        assignee: localAssignee.length > 0 ? localAssignee.join(', ') : undefined,
        description: localDescription,
        method: localMethod,
        methodOther: localMethodOther,
        means: localMeans,
        meansOther: localMeansOther,
        objective: localObjective,
        considerationPeriod: localConsiderationPeriod,
        executionPeriod: localExecutionPeriod,
        monetizationPeriod: localMonetizationPeriod,
        relatedOrganizations: localRelatedOrganizations,
        relatedGroupCompanies: localRelatedGroupCompanies,
        monetizationDiagram: localMonetizationDiagram,
        relationDiagram: localRelationDiagram,
      } as FocusInitiative;
      
      // JSON文字列に変換
      const jsonString = JSON.stringify(dataToDownload, null, 2);
      
      // Blobオブジェクトを作成
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // ダウンロード用のURLを作成
      const url = URL.createObjectURL(blob);
      
      // ダウンロードリンクを作成してクリック
      const link = document.createElement('a');
      link.href = url;
      link.download = `${initiative.id || 'initiative'}.json`;
      document.body.appendChild(link);
      link.click();
      
      // クリーンアップ
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      devLog('✅ [handleDownloadJson] JSONファイルのダウンロード成功:', initiative.id);
    } catch (error: any) {
      console.error('❌ [handleDownloadJson] JSONファイルのダウンロードに失敗しました:', error);
      alert(`JSONファイルのダウンロードに失敗しました: ${error?.message || '不明なエラー'}`);
    }
  }, [
    initiative,
    editingContent,
    localAssignee,
    localDescription,
    localMethod,
    localMethodOther,
    localMeans,
    localMeansOther,
    localObjective,
    localConsiderationPeriod,
    localExecutionPeriod,
    localMonetizationPeriod,
    localRelatedOrganizations,
    localRelatedGroupCompanies,
    localMonetizationDiagram,
    localRelationDiagram,
  ]);

  return {
    handleManualSave,
    handleDownloadJson,
  };
}

