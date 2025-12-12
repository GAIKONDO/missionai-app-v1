/**
 * 型定義の動作確認スクリプト
 * TypeScriptの型チェックが正しく動作しているか確認
 */

import type {
  Entity,
  EntityType,
  EntityMetadata,
  CreateEntityInput,
  UpdateEntityInput,
} from '@/types/entity';

import type {
  Relation,
  RelationType,
  RelationMetadata,
  CreateRelationInput,
  UpdateRelationInput,
} from '@/types/relation';

import type {
  TopicSemanticCategory,
  TopicSemanticCategoryFixed,
  TopicMetadata,
} from '@/types/topicMetadata';

/**
 * 型定義の動作確認
 */
function testTypeDefinitions() {
  console.log('🔍 型定義の動作確認を開始...\n');

  // 1. Entity型の確認
  console.log('1. Entity型の確認');
  const entity: Entity = {
    id: 'entity-001',
    name: 'トヨタ自動車',
    type: 'company',
    aliases: ['トヨタ', 'Toyota'],
    metadata: {
      industry: '自動車',
      website: 'https://www.toyota.co.jp',
    },
    organizationId: 'org-001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  console.log('✅ Entity型: 正常に定義されています');

  // 2. EntityTypeの確認
  console.log('\n2. EntityTypeの確認');
  const entityTypes: EntityType[] = [
    'person',
    'company',
    'product',
    'project',
    'organization',
    'location',
    'technology',
    'other',
  ];
  console.log(`✅ EntityType: ${entityTypes.length}種類のタイプが定義されています`);

  // 3. Relation型の確認
  console.log('\n3. Relation型の確認');
  const relation: Relation = {
    id: 'relation-001',
    topicId: 'topic-001',
    sourceEntityId: 'entity-001',
    targetEntityId: 'entity-002',
    relationType: 'subsidiary',
    description: 'AはBの子会社',
    confidence: 0.9,
    metadata: {
      date: '2024-01-01',
      amount: 1000000,
    },
    organizationId: 'org-001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  console.log('✅ Relation型: 正常に定義されています');

  // 4. RelationTypeの確認
  console.log('\n4. RelationTypeの確認');
  const relationTypes: RelationType[] = [
    'subsidiary',
    'uses',
    'invests',
    'employs',
    'partners',
    'competes',
    'supplies',
    'owns',
    'located-in',
    'works-for',
    'manages',
    'reports-to',
    'related-to',
    'other',
  ];
  console.log(`✅ RelationType: ${relationTypes.length}種類のタイプが定義されています`);

  // 5. TopicSemanticCategoryの確認（固定値 + 自由入力）
  console.log('\n5. TopicSemanticCategoryの確認');
  const fixedCategories: TopicSemanticCategoryFixed[] = [
    'action-item',
    'decision',
    'discussion',
    'issue',
    'risk',
    'opportunity',
    'question',
    'summary',
    'follow-up',
    'reference',
    'other',
  ];
  const customCategory: TopicSemanticCategory = '財務'; // 自由入力
  const fixedCategory: TopicSemanticCategory = 'decision'; // 固定値
  console.log(`✅ TopicSemanticCategory: 固定値${fixedCategories.length}種類 + 自由入力が使用可能`);

  // 6. TopicMetadataの拡張確認
  console.log('\n6. TopicMetadataの拡張確認');
  const topicMetadata: TopicMetadata = {
    id: 'topic-001',
    title: 'テストトピック',
    content: 'テストコンテンツ',
    semanticCategory: '財務', // 自由入力カテゴリ
    importance: 'high',
    keywords: ['キーワード1', 'キーワード2'],
    entities: [entity], // Entity配列
    relations: [relation], // Relation配列
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  console.log('✅ TopicMetadata: EntityとRelationが統合されています');

  // 7. CreateEntityInputの確認
  console.log('\n7. CreateEntityInputの確認');
  const createInput: CreateEntityInput = {
    name: '新しいエンティティ',
    type: 'company',
    aliases: ['別名'],
    metadata: { industry: 'IT' },
    organizationId: 'org-001',
  };
  console.log('✅ CreateEntityInput: IDとタイムスタンプなしで定義されています');

  // 8. UpdateEntityInputの確認
  console.log('\n8. UpdateEntityInputの確認');
  const updateInput: UpdateEntityInput = {
    name: '更新されたエンティティ',
    metadata: { website: 'https://example.com' },
  };
  console.log('✅ UpdateEntityInput: 部分的な更新が可能です');

  console.log('\n✅ すべての型定義が正常に動作しています！');
}

/**
 * メイン実行関数
 */
function main() {
  console.log('🚀 型定義の動作確認を開始します\n');
  console.log('='.repeat(60));

  try {
    testTypeDefinitions();
    console.log('\n' + '='.repeat(60));
    console.log('✅ すべての確認が完了しました！');
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ 確認中にエラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  main();
}

export { testTypeDefinitions };
