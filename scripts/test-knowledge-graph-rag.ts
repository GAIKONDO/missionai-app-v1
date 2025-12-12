/**
 * ナレッジグラフRAG検索機能のテストスクリプト
 * Embedding生成とRAG検索の動作確認用
 */

import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import {
  createEntity,
  getEntityById,
  updateEntity,
} from '@/lib/entityApi';
import {
  createRelation,
  getRelationById,
  updateRelation,
} from '@/lib/relationApi';
import {
  saveEntityEmbedding,
  getEntityEmbedding,
  findSimilarEntities,
  findSimilarEntitiesHybrid,
} from '@/lib/entityEmbeddings';
import {
  saveRelationEmbedding,
  getRelationEmbedding,
  findSimilarRelations,
  findSimilarRelationsHybrid,
} from '@/lib/relationEmbeddings';
import {
  searchKnowledgeGraph,
  findRelatedEntities,
  findRelatedRelations,
  getKnowledgeGraphContext,
} from '@/lib/knowledgeGraphRAG';
import { isTauriEnvironment } from '@/lib/testUtils';
import { callTauriCommand } from '@/lib/localFirebase';

/**
 * テスト用のサンプルデータ
 */
let SAMPLE_ORGANIZATION_ID: string | null = null;

/**
 * テスト用の組織を取得または作成
 */
async function getOrCreateTestOrganization(): Promise<string | null> {
  try {
    // 既存の組織を取得してみる
    const orgs = await callTauriCommand('collection_get', {
      collectionName: 'organizations',
    });
    
    if (Array.isArray(orgs) && orgs.length > 0) {
      // 最初の組織を使用
      const firstOrg = orgs[0];
      const orgId = firstOrg.id || firstOrg.data?.id;
      if (orgId) {
        console.log(`✅ 既存の組織を使用: ${orgId}`);
        return orgId;
      }
    }
    
    // 組織が見つからない場合はnullを返す（organizationIdをnullに設定）
    console.log('⚠️  組織が見つかりません。organizationIdをnullに設定します。');
    return null;
  } catch (error) {
    console.warn('組織の取得に失敗しました。organizationIdをnullに設定します。', error);
    return null;
  }
}

/**
 * エンティティ埋め込みのテスト
 */
async function testEntityEmbeddings() {
  console.log('🧪 エンティティ埋め込みのテストを開始...\n');

  try {
    // 1. テスト用エンティティを作成
    console.log('1. テスト用エンティティを作成');
    const entity1: Entity = await createEntity({
      name: 'トヨタ自動車',
      type: 'company',
      aliases: ['トヨタ', 'Toyota', 'トヨタ自動車株式会社'],
      metadata: {
        industry: '自動車製造',
        website: 'https://www.toyota.co.jp',
      },
      organizationId: SAMPLE_ORGANIZATION_ID || undefined,
    });
    console.log(`✅ エンティティ作成: ${entity1.name} (${entity1.id})`);

    // 少し待機して埋め込み生成を待つ
    console.log('\n   埋め込み生成を待機中...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 2. 埋め込みの取得確認
    console.log('\n2. エンティティ埋め込みの取得');
    const embedding1 = await getEntityEmbedding(entity1.id);
    if (embedding1 && embedding1.combinedEmbedding) {
      console.log(`✅ 埋め込み取得成功: ${embedding1.combinedEmbedding.length}次元`);
      console.log(`   モデル: ${embedding1.embeddingModel}, バージョン: ${embedding1.embeddingVersion}`);
    } else {
      console.log('⚠️  埋め込みが見つかりません（自動生成がまだ完了していない可能性があります）');
      // 手動で埋め込みを生成
      console.log('   手動で埋め込みを生成します...');
      if (SAMPLE_ORGANIZATION_ID) {
        await saveEntityEmbedding(entity1.id, SAMPLE_ORGANIZATION_ID, entity1);
      } else {
        console.log('   ⚠️  organizationIdがnullのため、埋め込み生成をスキップします');
      }
      const embedding1Retry = await getEntityEmbedding(entity1.id);
      if (embedding1Retry && embedding1Retry.combinedEmbedding) {
        console.log(`✅ 手動生成成功: ${embedding1Retry.combinedEmbedding.length}次元`);
      }
    }

    // 3. エンティティRAG検索テスト
    console.log('\n3. エンティティRAG検索テスト');
    const searchResults = await findSimilarEntities('自動車メーカー', 5, SAMPLE_ORGANIZATION_ID || undefined);
    console.log(`✅ 検索結果: ${searchResults.length}件`);
    searchResults.forEach((result, index) => {
      console.log(`   ${index + 1}. エンティティID: ${result.entityId}, 類似度: ${result.similarity.toFixed(3)}`);
    });

    // 4. ハイブリッド検索テスト
    console.log('\n4. エンティティハイブリッド検索テスト');
    const hybridResults = await findSimilarEntitiesHybrid(
      '日本の自動車会社',
      5,
      {
        organizationId: SAMPLE_ORGANIZATION_ID || undefined,
        entityType: 'company',
      }
    );
    console.log(`✅ ハイブリッド検索結果: ${hybridResults.length}件`);
    hybridResults.forEach((result, index) => {
      console.log(`   ${index + 1}. エンティティID: ${result.entityId}, スコア: ${result.score.toFixed(3)}, 類似度: ${result.similarity.toFixed(3)}`);
    });

    return entity1;
  } catch (error) {
    console.error('❌ エンティティ埋め込みテストエラー:', error);
    throw error;
  }
}

/**
 * リレーション埋め込みのテスト
 */
async function testRelationEmbeddings(entity1: Entity) {
  console.log('\n🧪 リレーション埋め込みのテストを開始...\n');

  try {
    // 1. テスト用リレーションを作成
    console.log('1. テスト用リレーションを作成');
    const relation1: Relation = await createRelation({
      topicId: 'test-topic-rag-001',
      sourceEntityId: entity1.id,
      targetEntityId: entity1.id, // テスト用
      relationType: 'partners',
      description: 'トヨタ自動車との戦略的提携関係。次世代AIシステム開発において協力関係を構築。',
      confidence: 0.9,
      metadata: {
        date: '2024-01-15',
        description: '長期パートナーシップ',
      },
      organizationId: SAMPLE_ORGANIZATION_ID || undefined,
    });
    console.log(`✅ リレーション作成: ${relation1.relationType} (${relation1.id})`);

    // 少し待機して埋め込み生成を待つ
    console.log('\n   埋め込み生成を待機中...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 2. 埋め込みの取得確認
    console.log('\n2. リレーション埋め込みの取得');
    const embedding1 = await getRelationEmbedding(relation1.id);
    if (embedding1 && embedding1.combinedEmbedding) {
      console.log(`✅ 埋め込み取得成功: ${embedding1.combinedEmbedding.length}次元`);
      console.log(`   モデル: ${embedding1.embeddingModel}, バージョン: ${embedding1.embeddingVersion}`);
    } else {
      console.log('⚠️  埋め込みが見つかりません（自動生成がまだ完了していない可能性があります）');
      // 手動で埋め込みを生成
      console.log('   手動で埋め込みを生成します...');
      if (SAMPLE_ORGANIZATION_ID) {
        await saveRelationEmbedding(relation1.id, relation1.topicId, SAMPLE_ORGANIZATION_ID, relation1);
      } else {
        console.log('   ⚠️  organizationIdがnullのため、埋め込み生成をスキップします');
      }
      const embedding1Retry = await getRelationEmbedding(relation1.id);
      if (embedding1Retry && embedding1Retry.combinedEmbedding) {
        console.log(`✅ 手動生成成功: ${embedding1Retry.combinedEmbedding.length}次元`);
      }
    }

    // 3. リレーションRAG検索テスト
    console.log('\n3. リレーションRAG検索テスト');
    const searchResults = await findSimilarRelations('提携関係', 5, SAMPLE_ORGANIZATION_ID || undefined);
    console.log(`✅ 検索結果: ${searchResults.length}件`);
    searchResults.forEach((result, index) => {
      console.log(`   ${index + 1}. リレーションID: ${result.relationId}, 類似度: ${result.similarity.toFixed(3)}`);
    });

    // 4. ハイブリッド検索テスト
    console.log('\n4. リレーションハイブリッド検索テスト');
    const hybridResults = await findSimilarRelationsHybrid(
      'パートナーシップ',
      5,
      {
        organizationId: SAMPLE_ORGANIZATION_ID || undefined,
        relationType: 'partners',
      }
    );
    console.log(`✅ ハイブリッド検索結果: ${hybridResults.length}件`);
    hybridResults.forEach((result, index) => {
      console.log(`   ${index + 1}. リレーションID: ${result.relationId}, スコア: ${result.score.toFixed(3)}, 類似度: ${result.similarity.toFixed(3)}`);
    });

    return relation1;
  } catch (error) {
    console.error('❌ リレーション埋め込みテストエラー:', error);
    throw error;
  }
}

/**
 * 統合RAG検索のテスト
 */
async function testIntegratedRAG() {
  console.log('\n🧪 統合RAG検索のテストを開始...\n');

  try {
    // 1. 統合検索
    console.log('1. ナレッジグラフ統合検索');
    const searchResults = await searchKnowledgeGraph(
      '自動車メーカーとの提携',
      5,
      {
        organizationId: SAMPLE_ORGANIZATION_ID || undefined,
      }
    );
    console.log(`✅ 統合検索結果: ${searchResults.length}件`);
    searchResults.forEach((result, index) => {
      console.log(`   ${index + 1}. [${result.type}] ID: ${result.id}, スコア: ${result.score.toFixed(3)}`);
      if (result.entity) {
        console.log(`      エンティティ: ${result.entity.name} (${result.entity.type})`);
      }
      if (result.relation) {
        console.log(`      リレーション: ${result.relation.relationType}`);
      }
    });

    // 2. 関連エンティティ検索
    console.log('\n2. 関連エンティティ検索');
    const relatedEntities = await findRelatedEntities(
      '日本の大企業',
      5,
      {
        organizationId: SAMPLE_ORGANIZATION_ID || undefined,
        entityType: 'company',
      }
    );
    console.log(`✅ 関連エンティティ: ${relatedEntities.length}件`);
    relatedEntities.forEach((entity, index) => {
      console.log(`   ${index + 1}. ${entity.name} (${entity.type})`);
    });

    // 3. 関連リレーション検索
    console.log('\n3. 関連リレーション検索');
    const relatedRelations = await findRelatedRelations(
      'ビジネスパートナー',
      5,
      {
        organizationId: SAMPLE_ORGANIZATION_ID || undefined,
      }
    );
    console.log(`✅ 関連リレーション: ${relatedRelations.length}件`);
    relatedRelations.forEach((relation, index) => {
      console.log(`   ${index + 1}. ${relation.relationType}: ${relation.description || '説明なし'}`);
    });

    // 4. RAG用コンテキスト生成
    console.log('\n4. RAG用コンテキスト生成');
    const context = await getKnowledgeGraphContext(
      '自動車業界のパートナーシップ',
      3,
      {
        organizationId: SAMPLE_ORGANIZATION_ID || undefined,
      }
    );
    console.log('✅ コンテキスト生成成功:');
    console.log(context || '(コンテキストが空です)');

    return { searchResults, relatedEntities, relatedRelations, context };
  } catch (error) {
    console.error('❌ 統合RAG検索テストエラー:', error);
    throw error;
  }
}

/**
 * 自動埋め込み生成のテスト
 */
async function testAutoEmbeddingGeneration() {
  console.log('\n🧪 自動埋め込み生成のテストを開始...\n');

  try {
    // 1. エンティティ作成時の自動埋め込み生成確認
    console.log('1. エンティティ作成時の自動埋め込み生成');
    const entity2: Entity = await createEntity({
      name: 'CTC株式会社',
      type: 'company',
      aliases: ['CTC', 'シー・ティー・シー'],
      metadata: {
        industry: 'ITサービス',
        website: 'https://www.ctc-g.co.jp',
      },
      organizationId: SAMPLE_ORGANIZATION_ID || undefined,
    });
    console.log(`✅ エンティティ作成: ${entity2.name} (${entity2.id})`);

    // 埋め込み生成を待機
    console.log('   自動埋め込み生成を待機中（5秒）...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const embedding2 = await getEntityEmbedding(entity2.id);
    if (embedding2 && embedding2.combinedEmbedding) {
      console.log(`✅ 自動埋め込み生成確認: ${embedding2.combinedEmbedding.length}次元`);
    } else {
      console.log('⚠️  自動埋め込みがまだ生成されていません（時間をおいて再確認してください）');
    }

    // 2. エンティティ更新時の自動埋め込み再生成確認
    console.log('\n2. エンティティ更新時の自動埋め込み再生成');
    const updatedEntity2 = await updateEntity(entity2.id, {
      metadata: {
        ...entity2.metadata,
        industry: 'ITコンサルティング・サービス',
      },
    });
    console.log(`✅ エンティティ更新: ${updatedEntity2?.name}`);

      // 埋め込み再生成を待機
    console.log('   自動埋め込み再生成を待機中（5秒）...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const embedding2Updated = await getEntityEmbedding(entity2.id);
    if (embedding2Updated && embedding2Updated.combinedEmbedding) {
      console.log(`✅ 自動埋め込み再生成確認: ${embedding2Updated.combinedEmbedding.length}次元`);
      console.log(`   更新日時: ${embedding2Updated.updatedAt}`);
    } else {
      console.log('⚠️  自動埋め込み再生成がまだ完了していません（時間をおいて再確認してください）');
      if (!SAMPLE_ORGANIZATION_ID) {
        console.log('   ⚠️  organizationIdがnullのため、自動埋め込み生成がスキップされた可能性があります');
      }
    }

    // 3. リレーション作成時の自動埋め込み生成確認
    console.log('\n3. リレーション作成時の自動埋め込み生成');
    const relation2: Relation = await createRelation({
      topicId: 'test-topic-rag-002',
      sourceEntityId: entity2.id,
      targetEntityId: entity2.id, // テスト用
      relationType: 'uses',
      description: 'CTCがChatGPTを業務効率化に活用',
      confidence: 0.85,
      organizationId: SAMPLE_ORGANIZATION_ID || undefined,
    });
    console.log(`✅ リレーション作成: ${relation2.relationType} (${relation2.id})`);

    // 埋め込み生成を待機
    console.log('   自動埋め込み生成を待機中（5秒）...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const embeddingRelation2 = await getRelationEmbedding(relation2.id);
    if (embeddingRelation2 && embeddingRelation2.combinedEmbedding) {
      console.log(`✅ 自動埋め込み生成確認: ${embeddingRelation2.combinedEmbedding.length}次元`);
    } else {
      console.log('⚠️  自動埋め込みがまだ生成されていません（時間をおいて再確認してください）');
    }

    return { entity2, relation2 };
  } catch (error) {
    console.error('❌ 自動埋め込み生成テストエラー:', error);
    throw error;
  }
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('🚀 ナレッジグラフRAG検索機能のテストを開始します\n');
  console.log('='.repeat(60));
  console.log('⚠️  注意: このテストはOpenAI APIキーが必要です');
  console.log('⚠️  注意: 埋め込み生成には時間がかかる場合があります');
  console.log('⚠️  注意: このテストはTauriアプリ内で実行する必要があります');
  console.log('='.repeat(60) + '\n');

  // Tauri環境のチェック
  if (!isTauriEnvironment()) {
    console.error('❌ エラー: Tauri環境ではありません');
    console.error('   このテストはTauriアプリ内で実行する必要があります。');
    console.error('   以下の手順でテストを実行してください:');
    console.error('   1. npm run tauri:dev でアプリを起動');
    console.error('   2. アプリ内のブラウザコンソールでテストを実行');
    console.error('   または、/test-knowledge-graph ページでテストを実行');
    process.exit(1);
  }

  try {
    // テスト用の組織を取得または作成
    console.log('📋 テスト用の組織を確認中...\n');
    SAMPLE_ORGANIZATION_ID = await getOrCreateTestOrganization();
    if (!SAMPLE_ORGANIZATION_ID) {
      console.log('⚠️  組織が見つかりませんでした。organizationIdをnullに設定してテストを続行します。\n');
    }
    // 1. エンティティ埋め込みテスト
    const entity1 = await testEntityEmbeddings();

    // 2. リレーション埋め込みテスト
    if (entity1) {
      await testRelationEmbeddings(entity1);
    }

    // 3. 統合RAG検索テスト
    await testIntegratedRAG();

    // 4. 自動埋め込み生成テスト
    await testAutoEmbeddingGeneration();

    console.log('\n' + '='.repeat(60));
    console.log('✅ すべてのテストが完了しました！');
    console.log('\n📝 テスト結果の確認ポイント:');
    console.log('   - エンティティ・リレーション作成時に自動で埋め込みが生成されるか');
    console.log('   - RAG検索が正しく動作するか');
    console.log('   - 統合検索でエンティティ・リレーション・トピックが統合されるか');
    console.log('   - ハイブリッド検索でスコアが適切に計算されるか');
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ テスト中にエラーが発生しました:', error);
    if (error instanceof Error) {
      console.error('   エラーメッセージ:', error.message);
      if (error.message.includes('APIキー')) {
        console.error('\n💡 解決方法: .env.localファイルにNEXT_PUBLIC_OPENAI_API_KEYを設定してください');
      }
    }
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  main().catch(console.error);
}

export { 
  testEntityEmbeddings, 
  testRelationEmbeddings, 
  testIntegratedRAG,
  testAutoEmbeddingGeneration 
};
