/**
 * ナレッジグラフ機能のテストスクリプト
 * 動作確認用
 */

import type { Entity, EntityType } from '@/types/entity';
import type { Relation, RelationType } from '@/types/relation';
import type { TopicSemanticCategory } from '@/types/topicMetadata';
import {
  createEntity,
  getEntityById,
  getEntitiesByOrganizationId,
  searchEntitiesByName,
  updateEntity,
  deleteEntity,
  mergeEntities,
  findSimilarEntities,
} from '@/lib/entityApi';
import {
  createRelation,
  getRelationById,
  getRelationsByTopicId,
  getRelationsByEntityId,
  updateRelation,
  deleteRelation,
  validateRelation,
} from '@/lib/relationApi';
import {
  extractEntities,
  extractRelations,
  generateSemanticCategory,
} from '@/lib/topicMetadataGeneration';

/**
 * テスト用のサンプルデータ
 */
const SAMPLE_TOPIC = {
  title: 'トヨタ自動車との新規プロジェクトについて',
  content: `本日、トヨタ自動車の担当者である山田太郎さんと打ち合わせを行いました。
新規プロジェクト「次世代AIシステム開発」について協議し、ChatGPTを活用した業務効率化を検討しています。
CTCが開発を担当し、トヨタ自動車がプロジェクトに投資する予定です。
プロジェクトマネージャーは佐藤花子さんが担当します。`,
};

const SAMPLE_ORGANIZATION_ID = 'test-org-001';

/**
 * エンティティAPIのテスト
 */
async function testEntityAPI() {
  console.log('🧪 エンティティAPIのテストを開始...\n');

  try {
    // 1. エンティティ作成
    console.log('1. エンティティ作成テスト');
    const entity1: Entity = await createEntity({
      name: 'トヨタ自動車',
      type: 'company',
      aliases: ['トヨタ', 'Toyota'],
      metadata: {
        industry: '自動車',
      },
      organizationId: SAMPLE_ORGANIZATION_ID,
    });
    console.log('✅ エンティティ作成成功:', entity1.id, entity1.name);

    const entity2: Entity = await createEntity({
      name: '山田太郎',
      type: 'person',
      metadata: {
        role: '担当者',
        department: '営業部',
      },
      organizationId: SAMPLE_ORGANIZATION_ID,
    });
    console.log('✅ エンティティ作成成功:', entity2.id, entity2.name);

    // 2. エンティティ取得
    console.log('\n2. エンティティ取得テスト');
    const retrievedEntity = await getEntityById(entity1.id);
    if (retrievedEntity && retrievedEntity.name === entity1.name) {
      console.log('✅ エンティティ取得成功:', retrievedEntity.name);
    } else {
      console.log('❌ エンティティ取得失敗');
    }

    // 3. 組織IDで取得
    console.log('\n3. 組織IDでエンティティ取得テスト');
    const orgEntities = await getEntitiesByOrganizationId(SAMPLE_ORGANIZATION_ID);
    console.log(`✅ 組織のエンティティ取得成功: ${orgEntities.length}件`);

    // 4. 名前検索
    console.log('\n4. エンティティ名前検索テスト');
    const searchResults = await searchEntitiesByName('トヨタ', SAMPLE_ORGANIZATION_ID);
    console.log(`✅ 検索結果: ${searchResults.length}件`);

    // 5. 類似エンティティ検出
    console.log('\n5. 類似エンティティ検出テスト');
    const similarEntities = await findSimilarEntities('トヨタ自動車株式会社', SAMPLE_ORGANIZATION_ID);
    console.log(`✅ 類似エンティティ: ${similarEntities.length}件`);

    // 6. エンティティ更新
    console.log('\n6. エンティティ更新テスト');
    const updatedEntity = await updateEntity(entity1.id, {
      metadata: {
        ...entity1.metadata,
        website: 'https://www.toyota.co.jp',
      },
    });
    if (updatedEntity && updatedEntity.metadata?.website) {
      console.log('✅ エンティティ更新成功:', updatedEntity.metadata.website);
    } else {
      console.log('❌ エンティティ更新失敗');
    }

    // 7. エンティティ削除
    console.log('\n7. エンティティ削除テスト');
    await deleteEntity(entity2.id);
    const deletedEntity = await getEntityById(entity2.id);
    if (!deletedEntity) {
      console.log('✅ エンティティ削除成功');
    } else {
      console.log('❌ エンティティ削除失敗');
    }

    return { entity1, entity2: null };
  } catch (error) {
    console.error('❌ エンティティAPIテストエラー:', error);
    throw error;
  }
}

/**
 * リレーションAPIのテスト
 */
async function testRelationAPI(entity1: Entity) {
  console.log('\n🧪 リレーションAPIのテストを開始...\n');

  try {
    // 1. リレーション作成
    console.log('1. リレーション作成テスト');
    const relation1: Relation = await createRelation({
      topicId: 'test-topic-001',
      sourceEntityId: entity1.id,
      targetEntityId: entity1.id, // テスト用（実際は別のエンティティ）
      relationType: 'partners',
      description: 'トヨタ自動車との提携関係',
      confidence: 0.9,
      organizationId: SAMPLE_ORGANIZATION_ID,
    });
    console.log('✅ リレーション作成成功:', relation1.id, relation1.relationType);

    // 2. リレーション取得
    console.log('\n2. リレーション取得テスト');
    const retrievedRelation = await getRelationById(relation1.id);
    if (retrievedRelation && retrievedRelation.relationType === relation1.relationType) {
      console.log('✅ リレーション取得成功:', retrievedRelation.relationType);
    } else {
      console.log('❌ リレーション取得失敗');
    }

    // 3. トピックIDで取得
    console.log('\n3. トピックIDでリレーション取得テスト');
    const topicRelations = await getRelationsByTopicId('test-topic-001');
    console.log(`✅ トピックのリレーション取得成功: ${topicRelations.length}件`);

    // 4. エンティティIDで取得
    console.log('\n4. エンティティIDでリレーション取得テスト');
    const entityRelations = await getRelationsByEntityId(entity1.id);
    console.log(`✅ エンティティのリレーション取得成功: ${entityRelations.length}件`);

    // 5. リレーション更新
    console.log('\n5. リレーション更新テスト');
    const updatedRelation = await updateRelation(relation1.id, {
      description: 'トヨタ自動車との戦略的提携関係',
      confidence: 0.95,
    });
    if (updatedRelation && updatedRelation.confidence === 0.95) {
      console.log('✅ リレーション更新成功');
    } else {
      console.log('❌ リレーション更新失敗');
    }

    // 6. バリデーションテスト
    console.log('\n6. リレーションバリデーションテスト');
    const validation = await validateRelation(updatedRelation!);
    console.log(`✅ バリデーション結果: ${validation.isValid ? '有効' : '無効'}`);
    if (validation.warnings.length > 0) {
      console.log(`  警告: ${validation.warnings.join(', ')}`);
    }

    // 7. リレーション削除
    console.log('\n7. リレーション削除テスト');
    await deleteRelation(relation1.id);
    const deletedRelation = await getRelationById(relation1.id);
    if (!deletedRelation) {
      console.log('✅ リレーション削除成功');
    } else {
      console.log('❌ リレーション削除失敗');
    }

    return relation1;
  } catch (error) {
    console.error('❌ リレーションAPIテストエラー:', error);
    throw error;
  }
}

/**
 * AI生成機能のテスト
 */
async function testAIGeneration() {
  console.log('\n🧪 AI生成機能のテストを開始...\n');

  try {
    // 1. セマンティックカテゴリ生成（自由入力対応）
    console.log('1. セマンティックカテゴリ生成テスト（自由入力対応）');
    const category = await generateSemanticCategory(
      SAMPLE_TOPIC.title,
      SAMPLE_TOPIC.content,
      'gpt-4o-mini',
      true // allowCustom = true
    );
    console.log(`✅ セマンティックカテゴリ: ${category}`);

    // 2. エンティティ抽出
    console.log('\n2. エンティティ抽出テスト');
    const entities = await extractEntities(
      SAMPLE_TOPIC.title,
      SAMPLE_TOPIC.content,
      'gpt-4o-mini'
    );
    console.log(`✅ 抽出されたエンティティ: ${entities.length}件`);
    entities.forEach((entity, index) => {
      console.log(`   ${index + 1}. ${entity.name} (${entity.type})`);
    });

    // 3. リレーション抽出
    console.log('\n3. リレーション抽出テスト');
    if (entities.length > 0) {
      const relations = await extractRelations(
        SAMPLE_TOPIC.title,
        SAMPLE_TOPIC.content,
        entities,
        'gpt-4o-mini'
      );
      console.log(`✅ 抽出されたリレーション: ${relations.length}件`);
      relations.forEach((relation, index) => {
        const sourceEntity = entities.find(e => e.id === relation.sourceEntityId);
        const targetEntity = entities.find(e => e.id === relation.targetEntityId);
        console.log(
          `   ${index + 1}. ${sourceEntity?.name} --[${relation.relationType}]--> ${targetEntity?.name}`
        );
      });
    } else {
      console.log('⚠️  エンティティが抽出されなかったため、リレーション抽出をスキップ');
    }

    return { entities, category };
  } catch (error) {
    console.error('❌ AI生成機能テストエラー:', error);
    throw error;
  }
}

/**
 * 統合テスト
 */
async function testIntegration() {
  console.log('\n🧪 統合テストを開始...\n');

  try {
    // 1. AIでエンティティとリレーションを抽出
    console.log('1. AI抽出 → データベース保存の統合テスト');
    const aiResult = await testAIGeneration();

    if (aiResult.entities.length > 0) {
      // 2. 抽出したエンティティをデータベースに保存
      console.log('\n2. 抽出エンティティのデータベース保存');
      const savedEntities: Entity[] = [];
      for (const entity of aiResult.entities) {
        const saved = await createEntity({
          ...entity,
          organizationId: SAMPLE_ORGANIZATION_ID,
        });
        savedEntities.push(saved);
        console.log(`   ✅ 保存: ${saved.name} (${saved.id})`);
      }

      // 3. 抽出したリレーションをデータベースに保存
      if (savedEntities.length >= 2) {
        console.log('\n3. 抽出リレーションのデータベース保存');
        const relations = await extractRelations(
          SAMPLE_TOPIC.title,
          SAMPLE_TOPIC.content,
          savedEntities,
          'gpt-4o-mini'
        );

        for (const relation of relations) {
          const saved = await createRelation({
            ...relation,
            topicId: 'test-topic-001',
            organizationId: SAMPLE_ORGANIZATION_ID,
          });
          console.log(`   ✅ 保存: ${saved.relationType} (${saved.id})`);
        }
      }

      // 4. データの取得確認
      console.log('\n4. 保存データの取得確認');
      const allEntities = await getEntitiesByOrganizationId(SAMPLE_ORGANIZATION_ID);
      const allRelations = await getRelationsByTopicId('test-topic-001');
      console.log(`   ✅ エンティティ: ${allEntities.length}件`);
      console.log(`   ✅ リレーション: ${allRelations.length}件`);
    }

    console.log('\n✅ 統合テスト完了');
  } catch (error) {
    console.error('❌ 統合テストエラー:', error);
    throw error;
  }
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('🚀 ナレッジグラフ機能のテストを開始します\n');
  console.log('=' .repeat(60));

  try {
    // 1. エンティティAPIテスト
    const { entity1 } = await testEntityAPI();

    // 2. リレーションAPIテスト
    if (entity1) {
      await testRelationAPI(entity1);
    }

    // 3. AI生成機能テスト
    await testAIGeneration();

    // 4. 統合テスト
    await testIntegration();

    console.log('\n' + '='.repeat(60));
    console.log('✅ すべてのテストが完了しました！');
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ テスト中にエラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  main().catch(console.error);
}

export { testEntityAPI, testRelationAPI, testAIGeneration, testIntegration };
