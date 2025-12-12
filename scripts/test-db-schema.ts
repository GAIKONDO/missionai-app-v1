/**
 * データベーススキーマの動作確認スクリプト
 * テーブルが正しく作成されているか確認
 */

import { callTauriCommand } from '@/lib/localFirebase';

/**
 * Tauri環境かどうかを確認
 */
function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && (
    '__TAURI__' in window || 
    '__TAURI_INTERNALS__' in window ||
    '__TAURI_METADATA__' in window ||
    (window as any).__TAURI__ !== undefined
  );
}

/**
 * データベーススキーマの確認
 */
async function checkDatabaseSchema() {
  console.log('🔍 データベーススキーマの確認を開始...\n');

  if (!isTauriEnvironment()) {
    console.log('⚠️  Tauri環境ではありません。このテストはTauriアプリ内で実行してください。');
    console.log('   実際のアプリを起動して、/test-knowledge-graph ページでテストを実行してください。');
    return;
  }

  try {
    // entitiesテーブルの確認
    console.log('1. entitiesテーブルの確認');
    try {
      const testEntity = {
        id: 'test-entity-001',
        name: 'テストエンティティ',
        type: 'company',
        aliases: JSON.stringify(['テスト', 'Test']),
        metadata: JSON.stringify({ industry: 'IT' }),
        organizationId: 'test-org',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await callTauriCommand('set_doc', {
        collection: 'entities',
        docId: testEntity.id,
        data: testEntity,
      });

      const retrieved = await callTauriCommand('get_doc', {
        collection: 'entities',
        docId: testEntity.id,
      });

      if (retrieved && retrieved.name === testEntity.name) {
        console.log('✅ entitiesテーブル: 正常に動作しています');
        
        // テストデータを削除
        await callTauriCommand('delete_doc', {
          collection: 'entities',
          docId: testEntity.id,
        });
      } else {
        console.log('❌ entitiesテーブル: データの取得に失敗しました');
      }
    } catch (error: any) {
      console.log(`❌ entitiesテーブル: エラー - ${error.message}`);
    }

    // topicRelationsテーブルの確認
    console.log('\n2. topicRelationsテーブルの確認');
    try {
      const testRelation = {
        id: 'test-relation-001',
        topicId: 'test-topic-001',
        sourceEntityId: 'test-entity-001',
        targetEntityId: 'test-entity-002',
        relationType: 'partners',
        description: 'テストリレーション',
        confidence: 0.9,
        metadata: JSON.stringify({}),
        organizationId: 'test-org',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await callTauriCommand('set_doc', {
        collection: 'topicRelations',
        docId: testRelation.id,
        data: testRelation,
      });

      const retrieved = await callTauriCommand('get_doc', {
        collection: 'topicRelations',
        docId: testRelation.id,
      });

      if (retrieved && retrieved.relationType === testRelation.relationType) {
        console.log('✅ topicRelationsテーブル: 正常に動作しています');
        
        // テストデータを削除
        await callTauriCommand('delete_doc', {
          collection: 'topicRelations',
          docId: testRelation.id,
        });
      } else {
        console.log('❌ topicRelationsテーブル: データの取得に失敗しました');
      }
    } catch (error: any) {
      console.log(`❌ topicRelationsテーブル: エラー - ${error.message}`);
    }

    console.log('\n✅ データベーススキーマの確認が完了しました');
  } catch (error) {
    console.error('❌ データベーススキーマ確認エラー:', error);
    throw error;
  }
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('🚀 データベーススキーマの動作確認を開始します\n');
  console.log('='.repeat(60));

  try {
    await checkDatabaseSchema();
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
  main().catch(console.error);
}

export { checkDatabaseSchema };
