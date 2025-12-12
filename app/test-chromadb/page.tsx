'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import { callTauriCommand } from '@/lib/localFirebase';
import { generateEmbedding } from '@/lib/embeddings';

export default function TestChromaDBPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testChromaDB = async () => {
    setIsRunning(true);
    setLogs([]);
    
    try {
      addLog('🧪 ChromaDBの動作確認を開始します...\n');

      // 1. テスト用のエンティティ埋め込みを保存
      addLog('📦 ステップ1: テスト用のエンティティ埋め込みを保存');
      const testEntityId = `test-entity-${Date.now()}`;
      const testOrganizationId = 'test-org-1';
      const testEmbedding = await generateEmbedding('テストエンティティ: 人工知能と機械学習');
      
      const testMetadata = {
        name: 'テストエンティティ',
        type: 'concept',
        embeddingModel: 'text-embedding-3-small',
        embeddingVersion: '1.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await callTauriCommand('chromadb_save_entity_embedding', {
          entityId: testEntityId,
          organizationId: testOrganizationId,
          combinedEmbedding: testEmbedding,
          metadata: testMetadata,
        });
        addLog('✅ エンティティ埋め込みの保存に成功しました');
      } catch (error: any) {
        addLog(`❌ エンティティ埋め込みの保存に失敗しました: ${error.message}`);
        throw error;
      }

      // 2. 類似エンティティの検索
      addLog('\n📦 ステップ2: 類似エンティティの検索');
      const queryEmbedding = await generateEmbedding('AIと機械学習について');
      
      try {
        const searchResults = await callTauriCommand('chromadb_find_similar_entities', {
          queryEmbedding,
          limit: 5,
          organizationId: testOrganizationId,
        }) as Array<[string, number]>;

        if (searchResults && searchResults.length > 0) {
          addLog(`✅ 検索に成功しました。結果数: ${searchResults.length}`);
          searchResults.forEach(([entityId, similarity], index) => {
            addLog(`   ${index + 1}. ${entityId}: 類似度 ${(similarity * 100).toFixed(2)}%`);
          });
        } else {
          addLog('⚠️ 検索結果が空でした');
        }
      } catch (error: any) {
        addLog(`❌ 検索に失敗しました: ${error.message}`);
        throw error;
      }

      // 3. テスト用のリレーション埋め込みを保存
      addLog('\n📦 ステップ3: テスト用のリレーション埋め込みを保存');
      const testRelationId = `test-relation-${Date.now()}`;
      const relationEmbedding = await generateEmbedding('テストリレーション: 関連性');
      
      const relationMetadata = {
        relationType: 'related_to',
        embeddingModel: 'text-embedding-3-small',
        embeddingVersion: '1.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await callTauriCommand('chromadb_save_relation_embedding', {
          relationId: testRelationId,
          organizationId: testOrganizationId,
          combinedEmbedding: relationEmbedding,
          metadata: relationMetadata,
        });
        addLog('✅ リレーション埋め込みの保存に成功しました');
      } catch (error: any) {
        addLog(`❌ リレーション埋め込みの保存に失敗しました: ${error.message}`);
        throw error;
      }

      // 4. 類似リレーションの検索
      addLog('\n📦 ステップ4: 類似リレーションの検索');
      const relationQueryEmbedding = await generateEmbedding('関連性について');
      
      try {
        const relationResults = await callTauriCommand('chromadb_find_similar_relations', {
          queryEmbedding: relationQueryEmbedding,
          limit: 5,
          organizationId: testOrganizationId,
        }) as Array<[string, number]>;

        if (relationResults && relationResults.length > 0) {
          addLog(`✅ 検索に成功しました。結果数: ${relationResults.length}`);
          relationResults.forEach(([relationId, similarity], index) => {
            addLog(`   ${index + 1}. ${relationId}: 類似度 ${(similarity * 100).toFixed(2)}%`);
          });
        } else {
          addLog('⚠️ 検索結果が空でした');
        }
      } catch (error: any) {
        addLog(`❌ 検索に失敗しました: ${error.message}`);
        throw error;
      }

      // 5. テスト用のトピック埋め込みを保存
      addLog('\n📦 ステップ5: テスト用のトピック埋め込みを保存');
      const testTopicId = `test-topic-${Date.now()}`;
      const testMeetingNoteId = `test-meeting-${Date.now()}`;
      const topicEmbedding = await generateEmbedding('テストトピック: 会議の議題');
      
      const topicMetadata = {
        title: 'テストトピック',
        content: 'これはテスト用のトピックです',
        embeddingModel: 'text-embedding-3-small',
        embeddingVersion: '1.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await callTauriCommand('chromadb_save_topic_embedding', {
          topicId: testTopicId,
          meetingNoteId: testMeetingNoteId,
          organizationId: testOrganizationId,
          combinedEmbedding: topicEmbedding,
          metadata: topicMetadata,
        });
        addLog('✅ トピック埋め込みの保存に成功しました');
      } catch (error: any) {
        addLog(`❌ トピック埋め込みの保存に失敗しました: ${error.message}`);
        throw error;
      }

      // 6. 類似トピックの検索
      addLog('\n📦 ステップ6: 類似トピックの検索');
      const topicQueryEmbedding = await generateEmbedding('会議の議題について');
      
      try {
        const topicResults = await callTauriCommand('chromadb_find_similar_topics', {
          queryEmbedding: topicQueryEmbedding,
          limit: 5,
          organizationId: testOrganizationId,
        }) as Array<[string, string, number]>;

        if (topicResults && topicResults.length > 0) {
          addLog(`✅ 検索に成功しました。結果数: ${topicResults.length}`);
          topicResults.forEach(([topicId, meetingNoteId, similarity], index) => {
            addLog(`   ${index + 1}. ${topicId} (${meetingNoteId}): 類似度 ${(similarity * 100).toFixed(2)}%`);
          });
        } else {
          addLog('⚠️ 検索結果が空でした');
        }
      } catch (error: any) {
        addLog(`❌ 検索に失敗しました: ${error.message}`);
        throw error;
      }

      addLog('\n✅ すべてのテストが完了しました！');
    } catch (error: any) {
      addLog(`\n❌ テスト中にエラーが発生しました: ${error.message}`);
      addLog(`   スタックトレース: ${error.stack || 'N/A'}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '24px' }}>
          🧪 ChromaDB動作確認
        </h1>

        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
            ChromaDBの動作確認を行います。以下のテストを実行します：
          </p>
          <ul style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px', paddingLeft: '20px' }}>
            <li>エンティティ埋め込みの保存</li>
            <li>エンティティ検索</li>
            <li>リレーション埋め込みの保存</li>
            <li>リレーション検索</li>
            <li>トピック埋め込みの保存</li>
            <li>トピック検索</li>
          </ul>

          <button
            onClick={testChromaDB}
            disabled={isRunning}
            style={{
              padding: '12px 24px',
              backgroundColor: isRunning ? '#9CA3AF' : '#3B82F6',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: isRunning ? 'not-allowed' : 'pointer',
            }}
          >
            {isRunning ? 'テスト実行中...' : 'テストを実行'}
          </button>
        </div>

        {logs.length > 0 && (
          <div style={{
            backgroundColor: '#1F2937',
            borderRadius: '12px',
            padding: '24px',
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#F9FAFB',
            maxHeight: '600px',
            overflowY: 'auto',
          }}>
            {logs.map((log, index) => (
              <div key={index} style={{ marginBottom: '4px', whiteSpace: 'pre-wrap' }}>
                {log}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
