'use client';

import { useState } from 'react';

interface EvaluationPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  testCases: any[];
  evaluationReport: any;
  isRunningEvaluation: boolean;
  selectedOrganizationId: string;
  onTestCasesUpdate: (testCases: any[]) => void;
  onEvaluationReportUpdate: (report: any) => void;
  onRunningEvaluationUpdate: (isRunning: boolean) => void;
}

export default function EvaluationPanelModal({
  isOpen,
  onClose,
  testCases,
  evaluationReport,
  isRunningEvaluation,
  selectedOrganizationId,
  onTestCasesUpdate,
  onEvaluationReportUpdate,
  onRunningEvaluationUpdate,
}: EvaluationPanelModalProps) {
  if (!isOpen) return null;

  const handleLoadTestCases = () => {
    const { getTestCases } = require('@/lib/evaluation');
    onTestCasesUpdate(getTestCases());
  };

  const handleAddTestCase = async () => {
    const testCaseId = `test-${Date.now()}`;
    const newTestCase = {
      id: testCaseId,
      query: 'サンプルクエリ',
      expectedTopics: [],
      expectedEntities: [],
      expectedRelations: [],
      category: 'general',
      description: '',
    };
    const { saveTestCase, getTestCases } = await import('@/lib/evaluation');
    saveTestCase(newTestCase);
    onTestCasesUpdate(getTestCases());
  };

  const handleRunAll = async () => {
    const validTestCases = testCases.filter(tc => tc.query && tc.query.trim().length > 0);
    if (validTestCases.length === 0) {
      alert('実行可能なテストケースがありません。クエリが設定されているテストケースが必要です。');
      return;
    }
    
    if (confirm(`すべてのテストケース（${validTestCases.length}件）を実行しますか？`)) {
      onRunningEvaluationUpdate(true);
      try {
        const { runTestSuite } = await import('@/lib/evaluation');
        const report = await runTestSuite(validTestCases, selectedOrganizationId || undefined);
        onEvaluationReportUpdate(report);
        alert(`評価完了: ${report.passedTests}/${report.totalTests}件合格（平均スコア: ${(report.averageOverallScore * 100).toFixed(1)}%）`);
      } catch (error) {
        console.error('評価実行エラー:', error);
        alert('評価の実行に失敗しました。コンソールを確認してください。');
      } finally {
        onRunningEvaluationUpdate(false);
      }
    }
  };

  const handleRunTestCase = async (testCase: any) => {
    if (!testCase.query || testCase.query.trim().length === 0) {
      alert('テストケースのクエリが空です。クエリを設定してから実行してください。');
      return;
    }
    
    const { runTestCase, getTestCases } = await import('@/lib/evaluation');
    onRunningEvaluationUpdate(true);
    try {
      const result = await runTestCase(testCase, selectedOrganizationId || undefined);
      if (result.passed) {
        alert(`テストケースを実行しました: 合格（スコア: ${(result.overallScore * 100).toFixed(1)}%）`);
      } else {
        alert(`テストケースを実行しました: 不合格（スコア: ${(result.overallScore * 100).toFixed(1)}%）`);
      }
    } catch (error) {
      console.error('テストケース実行エラー:', error);
      alert('テストケースの実行に失敗しました');
    } finally {
      onRunningEvaluationUpdate(false);
    }
  };

  const handleDeleteTestCase = async (testCaseId: string) => {
    if (confirm('このテストケースを削除しますか？')) {
      const { deleteTestCase, getTestCases } = await import('@/lib/evaluation');
      deleteTestCase(testCaseId);
      onTestCasesUpdate(getTestCases());
    }
  };

  const handleLoadEvaluationReport = async () => {
    const { getEvaluationReports } = await import('@/lib/evaluation');
    const reports = getEvaluationReports(10);
    if (reports.length > 0) {
      onEvaluationReportUpdate(reports[0]);
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
          maxWidth: '1200px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600 }}>
            評価・テストシステム
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '4px 8px',
              backgroundColor: '#F3F4F6',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* タブ */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #E5E7EB' }}>
          <button
            onClick={handleLoadTestCases}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: '2px solid #3B82F6',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            テストケース管理
          </button>
          <button
            onClick={handleLoadEvaluationReport}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            評価レポート
          </button>
        </div>

        {/* テストケース管理 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>テストケース一覧</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleAddTestCase}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                + 新規追加
              </button>
              <button
                onClick={handleRunAll}
                disabled={isRunningEvaluation || testCases.length === 0 || testCases.every(tc => !tc.query || tc.query.trim().length === 0)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: isRunningEvaluation || testCases.length === 0 ? '#D1D5DB' : '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: isRunningEvaluation || testCases.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {isRunningEvaluation ? '実行中...' : 'すべて実行'}
              </button>
            </div>
          </div>

          {testCases.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
              テストケースがありません。「+ 新規追加」ボタンで追加してください。
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {testCases.map((testCase) => (
                <div
                  key={testCase.id}
                  style={{
                    padding: '16px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                        {testCase.query || '(クエリ未設定)'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>
                        カテゴリ: {testCase.category} | ID: {testCase.id}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleRunTestCase(testCase)}
                        disabled={isRunningEvaluation || !testCase.query || testCase.query.trim().length === 0}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#3B82F6',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: isRunningEvaluation ? 'not-allowed' : 'pointer',
                        }}
                      >
                        実行
                      </button>
                      <button
                        onClick={() => handleDeleteTestCase(testCase.id)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#EF4444',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>
                    <div>期待されるトピック: {testCase.expectedTopics?.length || 0}件</div>
                    <div>期待されるエンティティ: {testCase.expectedEntities?.length || 0}件</div>
                    <div>期待されるリレーション: {testCase.expectedRelations?.length || 0}件</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 評価レポート表示 */}
        {evaluationReport && (
          <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>最新の評価レポート</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>合格率</div>
                <div style={{ fontSize: '20px', fontWeight: 600 }}>
                  {evaluationReport.passedTests}/{evaluationReport.totalTests}
                </div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>関連性スコア</div>
                <div style={{ fontSize: '20px', fontWeight: 600 }}>
                  {(evaluationReport.averageRelevanceScore * 100).toFixed(1)}%
                </div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>精度スコア</div>
                <div style={{ fontSize: '20px', fontWeight: 600 }}>
                  {(evaluationReport.averageAccuracyScore * 100).toFixed(1)}%
                </div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>全体スコア</div>
                <div style={{ fontSize: '20px', fontWeight: 600 }}>
                  {(evaluationReport.averageOverallScore * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#F3F4F6',
              color: '#6B7280',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

