'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import { testTypeDefinitions, checkDatabaseSchema, testAPIFunctions, testAIGeneration } from '@/lib/testUtils';
import {
  testEntityEmbeddingsForPage,
  testRelationEmbeddingsForPage,
  testIntegratedRAGForPage,
  testAutoEmbeddingGenerationForPage,
} from '@/lib/testRAGUtils';
import { testChromaDBForPage } from '@/lib/testChromaUtils';

/**
 * ナレッジグラフ機能の動作確認ページ
 */
export default function TestKnowledgeGraphPage() {
  const [testResults, setTestResults] = useState<{
    typeDefinitions?: string;
    dbSchema?: string;
    apiFunctions?: string;
    aiGeneration?: string;
    entityEmbeddings?: string;
    relationEmbeddings?: string;
    integratedRAG?: string;
    autoEmbedding?: string;
    chromaDB?: string;
  }>({});
  const [isRunning, setIsRunning] = useState(false);

  const runTypeDefinitionTest = async () => {
    setIsRunning(true);
    try {
      const result = testTypeDefinitions();
      setTestResults(prev => ({
        ...prev,
        typeDefinitions: result,
      }));
      setIsRunning(false);
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        typeDefinitions: `エラー: ${error.message}\n\nスタックトレース:\n${error.stack}`,
      }));
      setIsRunning(false);
    }
  };

  const runDatabaseSchemaTest = async () => {
    setIsRunning(true);
    try {
      const result = await checkDatabaseSchema();
      setTestResults(prev => ({
        ...prev,
        dbSchema: result,
      }));
      setIsRunning(false);
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        dbSchema: `エラー: ${error.message}\n\nスタックトレース:\n${error.stack}`,
      }));
      setIsRunning(false);
    }
  };

  const runAPIFunctionsTest = async () => {
    setIsRunning(true);
    try {
      const result = await testAPIFunctions();
      setTestResults(prev => ({
        ...prev,
        apiFunctions: result,
      }));
      setIsRunning(false);
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        apiFunctions: `エラー: ${error.message}\n\nスタックトレース:\n${error.stack}`,
      }));
      setIsRunning(false);
    }
  };

  const runAIGenerationTest = async () => {
    setIsRunning(true);
    try {
      const result = await testAIGeneration();
      setTestResults(prev => ({
        ...prev,
        aiGeneration: result,
      }));
      setIsRunning(false);
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        aiGeneration: `エラー: ${error.message}\n\nスタックトレース:\n${error.stack}`,
      }));
      setIsRunning(false);
    }
  };

  const runEntityEmbeddingsTest = async () => {
    setIsRunning(true);
    try {
      const result = await testEntityEmbeddingsForPage();
      setTestResults(prev => ({
        ...prev,
        entityEmbeddings: result,
      }));
      setIsRunning(false);
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        entityEmbeddings: `エラー: ${error.message}\n\nスタックトレース:\n${error.stack}`,
      }));
      setIsRunning(false);
    }
  };

  const runRelationEmbeddingsTest = async () => {
    setIsRunning(true);
    try {
      const result = await testRelationEmbeddingsForPage();
      setTestResults(prev => ({
        ...prev,
        relationEmbeddings: result,
      }));
      setIsRunning(false);
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        relationEmbeddings: `エラー: ${error.message}\n\nスタックトレース:\n${error.stack}`,
      }));
      setIsRunning(false);
    }
  };

  const runIntegratedRAGTest = async () => {
    setIsRunning(true);
    try {
      const result = await testIntegratedRAGForPage();
      setTestResults(prev => ({
        ...prev,
        integratedRAG: result,
      }));
      setIsRunning(false);
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        integratedRAG: `エラー: ${error.message}\n\nスタックトレース:\n${error.stack}`,
      }));
      setIsRunning(false);
    }
  };

  const runAutoEmbeddingTest = async () => {
    setIsRunning(true);
    try {
      const result = await testAutoEmbeddingGenerationForPage();
      setTestResults(prev => ({
        ...prev,
        autoEmbedding: result,
      }));
      setIsRunning(false);
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        autoEmbedding: `エラー: ${error.message}\n\nスタックトレース:\n${error.stack}`,
      }));
      setIsRunning(false);
    }
  };

  const runChromaDBTest = async () => {
    setIsRunning(true);
    try {
      const result = await testChromaDBForPage();
      setTestResults(prev => ({
        ...prev,
        chromaDB: result,
      }));
      setIsRunning(false);
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        chromaDB: `エラー: ${error.message}\n\nスタックトレース:\n${error.stack}`,
      }));
      setIsRunning(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">ナレッジグラフ機能の動作確認</h1>

        <div className="space-y-6">
          {/* 型定義テスト */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">1. 型定義の動作確認</h2>
            <p className="text-gray-600 mb-4">
              TypeScriptの型定義が正しく動作しているか確認します。
            </p>
            <button
              onClick={runTypeDefinitionTest}
              disabled={isRunning}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isRunning ? '実行中...' : '型定義テストを実行'}
            </button>
            {testResults.typeDefinitions && (
              <div className="mt-4 p-4 bg-gray-100 rounded font-mono text-sm whitespace-pre-wrap">
                {testResults.typeDefinitions}
              </div>
            )}
          </div>

          {/* データベーススキーマテスト */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">2. データベーススキーマの動作確認</h2>
            <p className="text-gray-600 mb-4">
              データベースのテーブル（entities, topicRelations）が正しく作成されているか確認します。
            </p>
            <button
              onClick={runDatabaseSchemaTest}
              disabled={isRunning}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {isRunning ? '実行中...' : 'データベーススキーマテストを実行'}
            </button>
            {testResults.dbSchema && (
              <div className="mt-4 p-4 bg-gray-100 rounded font-mono text-sm whitespace-pre-wrap">
                {testResults.dbSchema}
              </div>
            )}
          </div>

          {/* API関数テスト */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">3. API関数の動作確認</h2>
            <p className="text-gray-600 mb-4">
              エンティティAPIとリレーションAPIの動作を確認します。
            </p>
            <button
              onClick={runAPIFunctionsTest}
              disabled={isRunning}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              {isRunning ? '実行中...' : 'API関数テストを実行'}
            </button>
            {testResults.apiFunctions && (
              <div className="mt-4 p-4 bg-gray-100 rounded font-mono text-sm whitespace-pre-wrap">
                {testResults.apiFunctions}
              </div>
            )}
          </div>

          {/* AI生成テスト */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">4. AI生成機能の動作確認</h2>
            <p className="text-gray-600 mb-4">
              実際のトピックデータを使用して、エンティティ・リレーション抽出をテストします。
              <br />
              <span className="text-sm text-gray-500">
                注意: OpenAI APIキーまたはOllamaが設定されている必要があります。
              </span>
            </p>
            <button
              onClick={runAIGenerationTest}
              disabled={isRunning}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
            >
              {isRunning ? '実行中...' : 'AI生成テストを実行'}
            </button>
            {testResults.aiGeneration && (
              <div className="mt-4 p-4 bg-gray-100 rounded font-mono text-sm whitespace-pre-wrap">
                {testResults.aiGeneration}
              </div>
            )}
          </div>

          {/* RAG検索テスト */}
          <div className="bg-white rounded-lg shadow p-6 border-2 border-indigo-200">
            <h2 className="text-xl font-semibold mb-4 text-indigo-600">5. RAG検索機能の動作確認</h2>
            <p className="text-gray-600 mb-4">
              Embedding生成とRAG検索機能をテストします。
              <br />
              <span className="text-sm text-red-500 font-semibold">
                ⚠️ 注意: OpenAI APIキーが必要です。埋め込み生成には時間がかかります。
              </span>
            </p>

            <div className="space-y-4">
              {/* エンティティ埋め込みテスト */}
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold mb-2">5-1. エンティティ埋め込みテスト</h3>
                <p className="text-sm text-gray-600 mb-2">
                  エンティティの埋め込み生成とRAG検索をテストします。
                </p>
                <button
                  onClick={runEntityEmbeddingsTest}
                  disabled={isRunning}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
                >
                  {isRunning ? '実行中...' : 'エンティティ埋め込みテストを実行'}
                </button>
                {testResults.entityEmbeddings && (
                  <div className="mt-4 p-4 bg-gray-100 rounded font-mono text-xs whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {testResults.entityEmbeddings}
                  </div>
                )}
              </div>

              {/* リレーション埋め込みテスト */}
              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-semibold mb-2">5-2. リレーション埋め込みテスト</h3>
                <p className="text-sm text-gray-600 mb-2">
                  リレーションの埋め込み生成とRAG検索をテストします。
                </p>
                <button
                  onClick={runRelationEmbeddingsTest}
                  disabled={isRunning}
                  className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 text-sm"
                >
                  {isRunning ? '実行中...' : 'リレーション埋め込みテストを実行'}
                </button>
                {testResults.relationEmbeddings && (
                  <div className="mt-4 p-4 bg-gray-100 rounded font-mono text-xs whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {testResults.relationEmbeddings}
                  </div>
                )}
              </div>

              {/* 統合RAG検索テスト */}
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold mb-2">5-3. 統合RAG検索テスト</h3>
                <p className="text-sm text-gray-600 mb-2">
                  エンティティ、リレーション、トピックを統合したRAG検索をテストします。
                </p>
                <button
                  onClick={runIntegratedRAGTest}
                  disabled={isRunning}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 text-sm"
                >
                  {isRunning ? '実行中...' : '統合RAG検索テストを実行'}
                </button>
                {testResults.integratedRAG && (
                  <div className="mt-4 p-4 bg-gray-100 rounded font-mono text-xs whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {testResults.integratedRAG}
                  </div>
                )}
              </div>

              {/* 自動埋め込み生成テスト */}
              <div className="border-l-4 border-yellow-500 pl-4">
                <h3 className="font-semibold mb-2">5-4. 自動埋め込み生成テスト</h3>
                <p className="text-sm text-gray-600 mb-2">
                  エンティティ・リレーション作成時の自動埋め込み生成をテストします。
                </p>
                <button
                  onClick={runAutoEmbeddingTest}
                  disabled={isRunning}
                  className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 text-sm"
                >
                  {isRunning ? '実行中...' : '自動埋め込み生成テストを実行'}
                </button>
                {testResults.autoEmbedding && (
                  <div className="mt-4 p-4 bg-gray-100 rounded font-mono text-xs whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {testResults.autoEmbedding}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ChromaDBテスト */}
          <div className="bg-white rounded-lg shadow p-6 border-2 border-purple-200">
            <h2 className="text-xl font-semibold mb-4 text-purple-600">6. ChromaDBベクトルデータベースの動作確認</h2>
            <p className="text-gray-600 mb-4">
              ChromaDBの初期化、保存、検索機能をテストします。
              <br />
              <span className="text-sm text-gray-500">
                注意: ChromaDBのJavaScriptクライアントはブラウザ環境で動作しない可能性があります。
                エラーが発生した場合は、SQLiteフォールバックが自動的に使用されます。
              </span>
            </p>
            <button
              onClick={runChromaDBTest}
              disabled={isRunning}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 text-sm"
            >
              {isRunning ? '実行中...' : 'ChromaDBテストを実行'}
            </button>
            {testResults.chromaDB && (
              <div className="mt-4 p-4 bg-gray-100 rounded font-mono text-xs whitespace-pre-wrap max-h-96 overflow-y-auto">
                {testResults.chromaDB}
              </div>
            )}
          </div>

          {/* 実装状況の確認 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">7. 実装状況の確認</h2>
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                <span>型定義（Entity, Relation, TopicMetadata拡張）</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                <span>データベーススキーマ（entities, topicRelationsテーブル）</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                <span>API関数（entityApi.ts, relationApi.ts）</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                <span>AI生成機能（extractEntities, extractRelations）</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                <span>セマンティックカテゴリの自由入力対応</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                <span>エンティティ・リレーション埋め込み生成</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                <span>RAG検索機能（エンティティ・リレーション・統合検索）</span>
              </div>
              <div className="flex items-center">
                <span className="text-yellow-500 mr-2">⏳</span>
                <span>UI実装（エンティティ・リレーションの表示・編集）</span>
              </div>
            </div>
          </div>

          {/* 次のステップ */}
          <div className="bg-blue-50 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">8. 次のステップ</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>実際のアプリでエンティティとリレーションの作成・表示をテスト</li>
              <li>AI生成機能の動作確認（実際のトピックでエンティティ・リレーション抽出）</li>
              <li>RAG検索機能の動作確認（埋め込み生成と検索精度の確認）</li>
              <li>UI実装（モーダルにエンティティ・リレーション表示を追加）</li>
              <li>RAG検索UIの実装（検索バーと結果表示）</li>
            </ul>
          </div>
        </div>
        </div>
      </div>
    </Layout>
  );
}
