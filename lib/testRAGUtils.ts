/**
 * RAG検索機能のテスト用ユーティリティ
 * テストページから呼び出すためのラッパー関数
 */

import type { Entity } from '@/types/entity';
import { callTauriCommand } from './localFirebase';
import { waitForEntityEmbedding, checkEntityEmbeddingStatus } from './entityEmbeddings';
import { waitForRelationEmbedding, checkRelationEmbeddingStatus } from './relationEmbeddings';
import {
  createEntity,
  getEntityById,
} from './entityApi';
import {
  createRelation,
  getRelationById,
} from './relationApi';
import {
  saveEntityEmbedding,
  getEntityEmbedding,
  findSimilarEntities,
  findSimilarEntitiesHybrid,
} from './entityEmbeddings';
import {
  saveRelationEmbedding,
  getRelationEmbedding,
  findSimilarRelations,
  findSimilarRelationsHybrid,
} from './relationEmbeddings';
import {
  searchKnowledgeGraph,
  findRelatedEntities,
  findRelatedRelations,
  getKnowledgeGraphContext,
} from '@/lib/knowledgeGraphRAG';

/**
 * テスト用の組織を取得または作成
 */
async function getOrCreateTestOrganization(): Promise<string | null> {
  try {
    const orgs = await callTauriCommand('collection_get', {
      collectionName: 'organizations',
    });
    
    if (Array.isArray(orgs) && orgs.length > 0) {
      const firstOrg = orgs[0];
      const orgId = firstOrg.id || firstOrg.data?.id;
      if (orgId) {
        return orgId;
      }
    }
    
    return null;
  } catch (error) {
    console.warn('組織の取得に失敗しました。', error);
    return null;
  }
}

/**
 * エンティティ埋め込みのテスト（テストページ用）
 */
export async function testEntityEmbeddingsForPage(): Promise<string> {
  const logs: string[] = [];
  const originalLog = console.log;
  
  console.log = (...args: any[]) => {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
    logs.push(message);
    originalLog(...args);
  };

  try {
    logs.push('🧪 エンティティ埋め込みのテストを開始...\n');

    const orgId = await getOrCreateTestOrganization();
    logs.push(`📋 組織ID: ${orgId || 'null（組織が見つかりませんでした）'}\n`);

    // テスト用エンティティを作成
    logs.push('1. テスト用エンティティを作成');
    const entity1: Entity = await createEntity({
      name: 'トヨタ自動車',
      type: 'company',
      aliases: ['トヨタ', 'Toyota', 'トヨタ自動車株式会社'],
      metadata: {
        industry: '自動車製造',
        website: 'https://www.toyota.co.jp',
      },
      organizationId: orgId || undefined,
    });
    logs.push(`✅ エンティティ作成: ${entity1.name} (${entity1.id})`);

    // 埋め込み生成を待機
    logs.push('\n   埋め込み生成を待機中（3秒）...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 埋め込みの取得確認
    logs.push('\n2. エンティティ埋め込みの取得');
    let embedding1 = await getEntityEmbedding(entity1.id);
    if (embedding1 && embedding1.combinedEmbedding) {
      logs.push(`✅ 埋め込み取得成功: ${embedding1.combinedEmbedding.length}次元`);
      logs.push(`   モデル: ${embedding1.embeddingModel}, バージョン: ${embedding1.embeddingVersion}`);
    } else {
      logs.push('⚠️  埋め込みが見つかりません。手動で埋め込みを生成します...');
      if (orgId) {
        await saveEntityEmbedding(entity1.id, orgId, entity1);
        embedding1 = await getEntityEmbedding(entity1.id);
        if (embedding1 && embedding1.combinedEmbedding) {
          logs.push(`✅ 手動生成成功: ${embedding1.combinedEmbedding.length}次元`);
        }
      } else {
        logs.push('⚠️  organizationIdがnullのため、埋め込み生成をスキップします');
      }
    }

    // RAG検索テスト
    if (embedding1 && embedding1.combinedEmbedding) {
      logs.push('\n3. エンティティRAG検索テスト');
      const searchResults = await findSimilarEntities('自動車メーカー', 5, orgId || undefined);
      logs.push(`✅ 検索結果: ${searchResults.length}件`);
      searchResults.forEach((result, index) => {
        logs.push(`   ${index + 1}. エンティティID: ${result.entityId}, 類似度: ${result.similarity.toFixed(3)}`);
      });
    }

    logs.push('\n✅ エンティティ埋め込みテスト完了');
    return logs.join('\n');
  } catch (error: any) {
    logs.push(`\n❌ エラー: ${error.message}`);
    if (error.stack) {
      logs.push(`スタックトレース:\n${error.stack}`);
    }
    return logs.join('\n');
  } finally {
    console.log = originalLog;
  }
}

/**
 * リレーション埋め込みのテスト（テストページ用）
 */
export async function testRelationEmbeddingsForPage(): Promise<string> {
  const logs: string[] = [];
  const originalLog = console.log;
  
  console.log = (...args: any[]) => {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
    logs.push(message);
    originalLog(...args);
  };

  try {
    logs.push('🧪 リレーション埋め込みのテストを開始...\n');

    const orgId = await getOrCreateTestOrganization();
    logs.push(`📋 組織ID: ${orgId || 'null（組織が見つかりませんでした）'}\n`);

    // テスト用エンティティを作成
    logs.push('1. テスト用エンティティを作成');
    const entity1: Entity = await createEntity({
      name: 'テストエンティティ',
      type: 'company',
      organizationId: orgId || undefined,
    });
    logs.push(`✅ エンティティ作成: ${entity1.name} (${entity1.id})`);

    // テスト用リレーションを作成
    logs.push('\n2. テスト用リレーションを作成');
    const relation1 = await createRelation({
      topicId: 'test-topic-rag-page-001',
      sourceEntityId: entity1.id,
      targetEntityId: entity1.id,
      relationType: 'partners',
      description: 'テスト用の提携関係',
      confidence: 0.9,
      organizationId: orgId || undefined,
    });
    logs.push(`✅ リレーション作成: ${relation1.relationType} (${relation1.id})`);

    // 埋め込み生成を待機
    logs.push('\n   埋め込み生成を待機中（3秒）...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 埋め込みの取得確認
    logs.push('\n3. リレーション埋め込みの取得');
    let embedding1 = await getRelationEmbedding(relation1.id);
    if (embedding1 && embedding1.combinedEmbedding) {
      logs.push(`✅ 埋め込み取得成功: ${embedding1.combinedEmbedding.length}次元`);
    } else {
      logs.push('⚠️  埋め込みが見つかりません。手動で埋め込みを生成します...');
      if (orgId) {
        await saveRelationEmbedding(relation1.id, relation1.topicId, orgId, relation1);
        embedding1 = await getRelationEmbedding(relation1.id);
        if (embedding1 && embedding1.combinedEmbedding) {
          logs.push(`✅ 手動生成成功: ${embedding1.combinedEmbedding.length}次元`);
        }
      }
    }

    logs.push('\n✅ リレーション埋め込みテスト完了');
    return logs.join('\n');
  } catch (error: any) {
    logs.push(`\n❌ エラー: ${error.message}`);
    if (error.stack) {
      logs.push(`スタックトレース:\n${error.stack}`);
    }
    return logs.join('\n');
  } finally {
    console.log = originalLog;
  }
}

/**
 * 統合RAG検索のテスト（テストページ用）
 */
export async function testIntegratedRAGForPage(): Promise<string> {
  const logs: string[] = [];
  const originalLog = console.log;
  
  console.log = (...args: any[]) => {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
    logs.push(message);
    originalLog(...args);
  };

  try {
    logs.push('🧪 統合RAG検索のテストを開始...\n');

    const orgId = await getOrCreateTestOrganization();
    logs.push(`📋 組織ID: ${orgId || 'null（組織が見つかりませんでした）'}\n`);

    logs.push('1. ナレッジグラフ統合検索');
    const searchResults = await searchKnowledgeGraph(
      '自動車メーカーとの提携',
      5,
      {
        organizationId: orgId || undefined,
      }
    );
    logs.push(`✅ 統合検索結果: ${searchResults.length}件`);
    searchResults.forEach((result, index) => {
      logs.push(`   ${index + 1}. [${result.type}] ID: ${result.id}, スコア: ${result.score.toFixed(3)}`);
    });

    logs.push('\n2. RAG用コンテキスト生成');
    const context = await getKnowledgeGraphContext(
      '自動車業界のパートナーシップ',
      3,
      {
        organizationId: orgId || undefined,
      }
    );
    logs.push('✅ コンテキスト生成成功:');
    logs.push(context || '(コンテキストが空です)');

    logs.push('\n✅ 統合RAG検索テスト完了');
    return logs.join('\n');
  } catch (error: any) {
    logs.push(`\n❌ エラー: ${error.message}`);
    if (error.stack) {
      logs.push(`スタックトレース:\n${error.stack}`);
    }
    return logs.join('\n');
  } finally {
    console.log = originalLog;
  }
}

/**
 * 自動埋め込み生成のテスト（テストページ用）
 */
export async function testAutoEmbeddingGenerationForPage(): Promise<string> {
  const logs: string[] = [];
  const originalLog = console.log;
  
  console.log = (...args: any[]) => {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
    logs.push(message);
    originalLog(...args);
  };

  try {
    logs.push('🧪 自動埋め込み生成のテストを開始...\n');

    const orgId = await getOrCreateTestOrganization();
    logs.push(`📋 組織ID: ${orgId || 'null（組織が見つかりませんでした）'}\n`);

    logs.push('1. エンティティ作成時の自動埋め込み生成');
    const entity2 = await createEntity({
      name: 'CTC株式会社',
      type: 'company',
      aliases: ['CTC', 'シー・ティー・シー'],
      metadata: {
        industry: 'ITサービス',
      },
      organizationId: orgId || undefined,
    });
    logs.push(`✅ エンティティ作成: ${entity2.name} (${entity2.id})`);

    // 埋め込み生成を待機（リトライ付き）
    logs.push('   自動埋め込み生成を待機中（最大30秒）...');
    
    if (!orgId) {
      logs.push('   ⚠️  organizationIdがnullのため、自動埋め込み生成がスキップされます');
    } else {
      // 埋め込み生成状態を確認
      const initialStatus = await checkEntityEmbeddingStatus(entity2.id);
      if (initialStatus.isGenerating) {
        logs.push('   🔄 埋め込み生成が進行中です...');
      } else if (!initialStatus.exists) {
        logs.push('   ⏳ 埋め込み生成を開始します...');
      }

      // 最大30秒待機（1秒ごとにチェック）
      const embeddingGenerated = await waitForEntityEmbedding(entity2.id, 30000, 1000);
      
      if (embeddingGenerated) {
        const embedding2 = await getEntityEmbedding(entity2.id);
        if (embedding2 && embedding2.combinedEmbedding) {
          logs.push(`✅ 自動埋め込み生成確認: ${embedding2.combinedEmbedding.length}次元`);
        } else {
          logs.push('⚠️  埋め込み生成は完了しましたが、データの取得に失敗しました');
        }
      } else {
        const finalStatus = await checkEntityEmbeddingStatus(entity2.id);
        if (finalStatus.isGenerating) {
          logs.push('⚠️  埋め込み生成がタイムアウトしました（まだ生成中です）');
        } else {
          logs.push('⚠️  自動埋め込みが生成されませんでした');
          logs.push('   💡 考えられる原因:');
          logs.push('      - OpenAI APIキーが設定されていない');
          logs.push('      - APIレート制限に達している');
          logs.push('      - ネットワークエラー');
          logs.push('      - エンティティデータが不正');
        }
      }
    }

    logs.push('\n✅ 自動埋め込み生成テスト完了');
    return logs.join('\n');
  } catch (error: any) {
    logs.push(`\n❌ エラー: ${error.message}`);
    if (error.stack) {
      logs.push(`スタックトレース:\n${error.stack}`);
    }
    return logs.join('\n');
  } finally {
    console.log = originalLog;
  }
}
