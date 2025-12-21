/**
 * 評価・テストシステム
 * AI回答の品質を定量的に評価
 */

import { searchKnowledgeGraph } from '@/lib/knowledgeGraphRAG';

// テストケース
export interface TestCase {
  id: string;
  query: string;
  expectedTopics: string[];
  expectedEntities?: string[];
  expectedRelations?: string[];
  category: string;
  description?: string;
}

// 評価結果
export interface EvaluationResult {
  testCaseId: string;
  query: string;
  response?: string;
  searchResults?: any[];
  relevanceScore: number; // 0-1
  accuracyScore: number; // 0-1
  coverageScore: number; // 0-1 (期待される結果がどれだけ含まれているか)
  overallScore: number; // 0-1
  passed: boolean;
  details: {
    foundEntities: string[];
    foundRelations: string[];
    foundTopics: string[];
    missingEntities: string[];
    missingRelations: string[];
    missingTopics: string[];
  };
  timestamp: Date;
}

// 評価レポート
export interface EvaluationReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageRelevanceScore: number;
  averageAccuracyScore: number;
  averageCoverageScore: number;
  averageOverallScore: number;
  results: EvaluationResult[];
  timestamp: Date;
}

// テストケースのストレージキー
const TEST_CASES_KEY = 'evaluation_test_cases';
const EVALUATION_RESULTS_KEY = 'evaluation_results';
const MAX_RESULTS_COUNT = 1000;

/**
 * テストケースを保存
 */
export function saveTestCase(testCase: TestCase): void {
  if (typeof window === 'undefined') return;

  try {
    const testCases = getTestCases();
    const existingIndex = testCases.findIndex(tc => tc.id === testCase.id);
    
    if (existingIndex >= 0) {
      testCases[existingIndex] = testCase;
    } else {
      testCases.push(testCase);
    }

    localStorage.setItem(TEST_CASES_KEY, JSON.stringify(testCases));
    console.log('[Evaluation] テストケースを保存:', testCase.id);
  } catch (error) {
    console.error('[Evaluation] テストケースの保存エラー:', error);
  }
}

/**
 * テストケースを取得
 */
export function getTestCases(): TestCase[] {
  if (typeof window === 'undefined') return [];

  try {
    return JSON.parse(localStorage.getItem(TEST_CASES_KEY) || '[]') as TestCase[];
  } catch (error) {
    console.error('[Evaluation] テストケースの取得エラー:', error);
    return [];
  }
}

/**
 * テストケースを削除
 */
export function deleteTestCase(testCaseId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const testCases = getTestCases();
    const filtered = testCases.filter(tc => tc.id !== testCaseId);
    localStorage.setItem(TEST_CASES_KEY, JSON.stringify(filtered));
    console.log('[Evaluation] テストケースを削除:', testCaseId);
  } catch (error) {
    console.error('[Evaluation] テストケースの削除エラー:', error);
  }
}

/**
 * 文字列の類似度を計算（簡易版）
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * レーベンシュタイン距離を計算
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * 検索結果を評価
 */
export async function evaluateSearchResults(
  testCase: TestCase,
  searchResults: any[]
): Promise<EvaluationResult> {
  const foundEntities: string[] = [];
  const foundRelations: string[] = [];
  const foundTopics: string[] = [];
  
  // 検索結果から見つかったエンティティ、リレーション、トピックを抽出
  for (const result of searchResults) {
    if (result.type === 'entity' && result.entity) {
      foundEntities.push(result.entity.id);
    } else if (result.type === 'relation' && result.relation) {
      foundRelations.push(result.relation.id);
    } else if (result.type === 'topic' && result.topicId) {
      foundTopics.push(result.topicId);
    }
  }

  // 期待される結果と比較
  const expectedEntities = testCase.expectedEntities || [];
  const expectedRelations = testCase.expectedRelations || [];
  const expectedTopics = testCase.expectedTopics || [];

  const missingEntities = expectedEntities.filter(e => !foundEntities.includes(e));
  const missingRelations = expectedRelations.filter(r => !foundRelations.includes(r));
  const missingTopics = expectedTopics.filter(t => !foundTopics.includes(t));

  // カバレッジスコア: 期待される結果がどれだけ含まれているか
  const totalExpected = expectedEntities.length + expectedRelations.length + expectedTopics.length;
  const totalFound = foundEntities.length + foundRelations.length + foundTopics.length;
  const totalMissing = missingEntities.length + missingRelations.length + missingTopics.length;
  
  const coverageScore = totalExpected > 0 
    ? (totalExpected - totalMissing) / totalExpected 
    : totalFound > 0 ? 1.0 : 0.0;

  // 関連性スコア: 検索結果のスコアの平均（正規化）
  const relevanceScore = searchResults.length > 0
    ? Math.min(1.0, searchResults.reduce((sum, r) => sum + (r.score || 0), 0) / searchResults.length)
    : 0.0;

  // 精度スコア: 見つかった結果のうち、期待される結果の割合
  const accuracyScore = totalFound > 0
    ? (totalFound - (totalFound - (totalExpected - totalMissing))) / totalFound
    : 0.0;

  // 全体スコア: 重み付き平均
  const overallScore = (
    coverageScore * 0.5 +
    relevanceScore * 0.3 +
    accuracyScore * 0.2
  );

  // 合格判定: カバレッジが80%以上、かつ関連性が0.5以上
  const passed = coverageScore >= 0.8 && relevanceScore >= 0.5;

  return {
    testCaseId: testCase.id,
    query: testCase.query,
    searchResults,
    relevanceScore,
    accuracyScore,
    coverageScore,
    overallScore,
    passed,
    details: {
      foundEntities,
      foundRelations,
      foundTopics,
      missingEntities,
      missingRelations,
      missingTopics,
    },
    timestamp: new Date(),
  };
}

/**
 * テストケースを実行して評価
 */
export async function runTestCase(
  testCase: TestCase,
  organizationId?: string
): Promise<EvaluationResult> {
  // クエリが空の場合はエラーを返す
  if (!testCase.query || testCase.query.trim().length === 0) {
    const errorResult: EvaluationResult = {
      testCaseId: testCase.id,
      query: testCase.query || '',
      relevanceScore: 0,
      accuracyScore: 0,
      coverageScore: 0,
      overallScore: 0,
      passed: false,
      details: {
        foundEntities: [],
        foundRelations: [],
        foundTopics: [],
        missingEntities: testCase.expectedEntities || [],
        missingRelations: testCase.expectedRelations || [],
        missingTopics: testCase.expectedTopics || [],
      },
      timestamp: new Date(),
    };
    
    console.warn('[Evaluation] テストケースのクエリが空です:', testCase.id);
    return errorResult;
  }

  try {
    // 検索を実行
    const searchResults = await searchKnowledgeGraph(
      testCase.query,
      20, // 多めに取得
      {
        organizationId,
      },
      false // キャッシュを使用しない
    );

    // 評価
    const result = await evaluateSearchResults(testCase, searchResults);

    // 結果を保存
    saveEvaluationResult(result);

    return result;
  } catch (error) {
    console.error('[Evaluation] テストケース実行エラー:', error);
    
    // エラーが発生した場合も結果を返す
    const errorResult: EvaluationResult = {
      testCaseId: testCase.id,
      query: testCase.query,
      relevanceScore: 0,
      accuracyScore: 0,
      coverageScore: 0,
      overallScore: 0,
      passed: false,
      details: {
        foundEntities: [],
        foundRelations: [],
        foundTopics: [],
        missingEntities: testCase.expectedEntities || [],
        missingRelations: testCase.expectedRelations || [],
        missingTopics: testCase.expectedTopics || [],
      },
      timestamp: new Date(),
    };
    
    return errorResult;
  }
}

/**
 * 複数のテストケースを一括実行
 */
export async function runTestSuite(
  testCases: TestCase[],
  organizationId?: string
): Promise<EvaluationReport> {
  const results: EvaluationResult[] = [];

  for (const testCase of testCases) {
    try {
      const result = await runTestCase(testCase, organizationId);
      results.push(result);
    } catch (error) {
      console.error(`[Evaluation] テストケース ${testCase.id} の実行エラー:`, error);
      // エラーが発生した場合も結果に含める
      results.push({
        testCaseId: testCase.id,
        query: testCase.query,
        relevanceScore: 0,
        accuracyScore: 0,
        coverageScore: 0,
        overallScore: 0,
        passed: false,
        details: {
          foundEntities: [],
          foundRelations: [],
          foundTopics: [],
          missingEntities: testCase.expectedEntities || [],
          missingRelations: testCase.expectedRelations || [],
          missingTopics: testCase.expectedTopics || [],
        },
        timestamp: new Date(),
      });
    }
  }

  // 統計を計算
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.length - passedTests;
  
  const averageRelevanceScore = results.length > 0
    ? results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length
    : 0;
  
  const averageAccuracyScore = results.length > 0
    ? results.reduce((sum, r) => sum + r.accuracyScore, 0) / results.length
    : 0;
  
  const averageCoverageScore = results.length > 0
    ? results.reduce((sum, r) => sum + r.coverageScore, 0) / results.length
    : 0;
  
  const averageOverallScore = results.length > 0
    ? results.reduce((sum, r) => sum + r.overallScore, 0) / results.length
    : 0;

  const report: EvaluationReport = {
    totalTests: results.length,
    passedTests,
    failedTests,
    averageRelevanceScore,
    averageAccuracyScore,
    averageCoverageScore,
    averageOverallScore,
    results,
    timestamp: new Date(),
  };

  // レポートを保存
  saveEvaluationReport(report);

  return report;
}

/**
 * 評価結果を保存
 */
function saveEvaluationResult(result: EvaluationResult): void {
  if (typeof window === 'undefined') return;

  try {
    const results = getEvaluationResults();
    results.push(result);

    // 最新MAX_RESULTS_COUNT件のみ保持
    const recentResults = results.slice(-MAX_RESULTS_COUNT);
    localStorage.setItem(EVALUATION_RESULTS_KEY, JSON.stringify(recentResults));
  } catch (error) {
    console.error('[Evaluation] 評価結果の保存エラー:', error);
  }
}

/**
 * 評価結果を取得
 */
export function getEvaluationResults(limit: number = 100): EvaluationResult[] {
  if (typeof window === 'undefined') return [];

  try {
    const results = JSON.parse(
      localStorage.getItem(EVALUATION_RESULTS_KEY) || '[]'
    ) as EvaluationResult[];

    return results.slice(-limit).map(r => ({
      ...r,
      timestamp: new Date(r.timestamp),
    }));
  } catch (error) {
    console.error('[Evaluation] 評価結果の取得エラー:', error);
    return [];
  }
}

/**
 * 評価レポートを保存
 */
function saveEvaluationReport(report: EvaluationReport): void {
  if (typeof window === 'undefined') return;

  try {
    const reports = getEvaluationReports();
    reports.push(report);

    // 最新100件のみ保持
    const recentReports = reports.slice(-100);
    localStorage.setItem('evaluation_reports', JSON.stringify(recentReports));
  } catch (error) {
    console.error('[Evaluation] 評価レポートの保存エラー:', error);
  }
}

/**
 * 評価レポートを取得
 */
export function getEvaluationReports(limit: number = 50): EvaluationReport[] {
  if (typeof window === 'undefined') return [];

  try {
    const reports = JSON.parse(
      localStorage.getItem('evaluation_reports') || '[]'
    ) as EvaluationReport[];

    return reports.slice(-limit).map(r => ({
      ...r,
      timestamp: new Date(r.timestamp),
      results: r.results.map(res => ({
        ...res,
        timestamp: new Date(res.timestamp),
      })),
    }));
  } catch (error) {
    console.error('[Evaluation] 評価レポートの取得エラー:', error);
    return [];
  }
}

/**
 * すべての評価データをクリア
 */
export function clearAllEvaluationData(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(TEST_CASES_KEY);
    localStorage.removeItem(EVALUATION_RESULTS_KEY);
    localStorage.removeItem('evaluation_reports');
    console.log('[Evaluation] すべての評価データをクリアしました');
  } catch (error) {
    console.error('[Evaluation] 評価データのクリアエラー:', error);
  }
}
