import { useState } from 'react';
import { getAllEntities } from '@/lib/entityApi';
import { getAllRelations } from '@/lib/relationApi';
import { checkAllEmbeddings } from '@/lib/checkEmbeddings';
import { getSearchHistory, analyzeSearchHistory } from '@/lib/searchHistoryAnalytics';

interface UseModalHandlersOptions {
  selectedOrganizationId: string;
  setEmbeddingStats: (stats: any) => void;
  setShowEmbeddingStats: (show: boolean) => void;
  setActualEntityCount: (count: number | null) => void;
  setActualRelationCount: (count: number | null) => void;
  setAnalytics: (analytics: any) => void;
  setShowAnalytics: (show: boolean) => void;
  setDataQualityReport: (report: any) => void;
  setShowDataQualityReport: (show: boolean) => void;
  setTestCases: (cases: any[]) => void;
  setShowEvaluationPanel: (show: boolean) => void;
}

export function useModalHandlers(options: UseModalHandlersOptions) {
  const {
    selectedOrganizationId,
    setEmbeddingStats,
    setShowEmbeddingStats,
    setActualEntityCount,
    setActualRelationCount,
    setAnalytics,
    setShowAnalytics,
    setDataQualityReport,
    setShowDataQualityReport,
    setTestCases,
    setShowEvaluationPanel,
  } = options;

  const handleShowEmbeddingStats = async () => {
    try {
      const [entities, relations] = await Promise.all([
        getAllEntities(),
        getAllRelations(),
      ]);
      setActualEntityCount(entities.length);
      setActualRelationCount(relations.length);
      const stats = await checkAllEmbeddings(selectedOrganizationId || undefined);
      setEmbeddingStats(stats);
      setShowEmbeddingStats(true);
    } catch (error) {
      console.error('埋め込みベクトル統計の取得に失敗しました:', error);
      alert('埋め込みベクトル統計の取得に失敗しました。コンソールを確認してください。');
    }
  };

  const handleShowAnalytics = () => {
    const history = getSearchHistory();
    const analyticsData = analyzeSearchHistory(history);
    setAnalytics(analyticsData);
    setShowAnalytics(true);
  };

  const handleShowDataQualityReport = async () => {
    try {
      const { generateComprehensiveQualityReport } = await import('@/lib/dataQuality');
      const report = await generateComprehensiveQualityReport(selectedOrganizationId || undefined);
      setDataQualityReport(report);
      setShowDataQualityReport(true);
    } catch (error) {
      console.error('データ品質レポートの生成に失敗しました:', error);
      alert('データ品質レポートの生成に失敗しました。コンソールを確認してください。');
    }
  };

  const handleShowEvaluationPanel = async () => {
    try {
      const { getTestCases } = await import('@/lib/evaluation');
      const cases = getTestCases();
      setTestCases(cases);
      setShowEvaluationPanel(true);
    } catch (error) {
      console.error('評価システムの読み込みに失敗しました:', error);
      alert('評価システムの読み込みに失敗しました。コンソールを確認してください。');
    }
  };

  return {
    handleShowEmbeddingStats,
    handleShowAnalytics,
    handleShowDataQualityReport,
    handleShowEvaluationPanel,
  };
}

