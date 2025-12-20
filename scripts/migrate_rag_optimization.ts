/**
 * RAG検索最適化のための既存データ移行スクリプト
 * searchableText, contentSummary, displayNameを生成
 */

import { callTauriCommand } from '../lib/localFirebase';

/**
 * 既存データの移行を実行
 */
export async function migrateRAGOptimization(): Promise<void> {
  console.log('🔄 RAG検索最適化のための既存データ移行を開始します...');

  try {
    // 1. topicsテーブルの移行
    console.log('📝 topicsテーブルの移行を開始...');
    await migrateTopics();
    console.log('✅ topicsテーブルの移行が完了しました');

    // 2. entitiesテーブルの移行
    console.log('📝 entitiesテーブルの移行を開始...');
    await migrateEntities();
    console.log('✅ entitiesテーブルの移行が完了しました');

    // 3. relationsテーブルの移行
    console.log('📝 relationsテーブルの移行を開始...');
    await migrateRelations();
    console.log('✅ relationsテーブルの移行が完了しました');

    console.log('✅ すべての移行が完了しました');
  } catch (error) {
    console.error('❌ 移行エラー:', error);
    throw error;
  }
}

/**
 * topicsテーブルの移行
 */
async function migrateTopics(): Promise<void> {
  try {
    // すべてのトピックを取得
    const result = await callTauriCommand('query_get', {
      collectionName: 'topics',
      conditions: {},
    });

    const items = (result || []) as Array<{id: string; data: any}>;
    console.log(`📊 ${items.length}件のトピックを移行します`);

    for (const item of items) {
      const topic = item.data;
      const topicId = item.id;

      // contentSummaryを生成（contentの最初の200文字）
      const contentSummary = topic.content 
        ? topic.content.substring(0, 200)
        : null;

      // searchableTextを生成（title + description + contentSummary）
      const searchableText = [
        topic.title || '',
        topic.description || '',
        contentSummary || '',
      ]
        .filter(s => s.length > 0)
        .join(' ')
        .trim();

      // 更新
      try {
        await callTauriCommand('doc_update', {
          collectionName: 'topics',
          docId: topicId,
          data: {
            contentSummary,
            searchableText,
          },
        });
      } catch (error) {
        console.warn(`⚠️ トピック ${topicId} の更新エラー:`, error);
      }
    }
  } catch (error) {
    console.error('❌ topicsテーブルの移行エラー:', error);
    throw error;
  }
}

/**
 * entitiesテーブルの移行
 */
async function migrateEntities(): Promise<void> {
  try {
    // すべてのエンティティを取得
    const result = await callTauriCommand('query_get', {
      collectionName: 'entities',
      conditions: {},
    });

    const items = (result || []) as Array<{id: string; data: any}>;
    console.log(`📊 ${items.length}件のエンティティを移行します`);

    for (const item of items) {
      const entity = item.data;
      const entityId = item.id;

      // メタデータから重要なフィールドを抽出
      let role = '';
      let department = '';
      if (entity.metadata) {
        try {
          const metadata = typeof entity.metadata === 'string' 
            ? JSON.parse(entity.metadata)
            : entity.metadata;
          role = metadata.role || '';
          department = metadata.department || '';
        } catch (error) {
          // メタデータのパースエラーは無視
        }
      }

      // searchableTextを生成（name + aliases + metadataの重要フィールド）
      const searchableText = [
        entity.name || '',
        entity.aliases || '',
        role,
        department,
      ]
        .filter(s => s.length > 0)
        .join(' ')
        .trim();

      // displayNameを生成（name + 重要なメタデータ）
      const displayName = entity.name + (role ? ` (${role})` : '');

      // 更新
      try {
        await callTauriCommand('doc_update', {
          collectionName: 'entities',
          docId: entityId,
          data: {
            searchableText,
            displayName,
          },
        });
      } catch (error) {
        console.warn(`⚠️ エンティティ ${entityId} の更新エラー:`, error);
      }
    }
  } catch (error) {
    console.error('❌ entitiesテーブルの移行エラー:', error);
    throw error;
  }
}

/**
 * relationsテーブルの移行
 */
async function migrateRelations(): Promise<void> {
  try {
    // すべてのリレーションを取得
    const result = await callTauriCommand('query_get', {
      collectionName: 'relations',
      conditions: {},
    });

    const items = (result || []) as Array<{id: string; data: any}>;
    console.log(`📊 ${items.length}件のリレーションを移行します`);

    for (const item of items) {
      const relation = item.data;
      const relationId = item.id;

      // searchableTextを生成（relationType + description）
      const searchableText = [
        relation.relationType || '',
        relation.description || '',
      ]
        .filter(s => s.length > 0)
        .join(' ')
        .trim();

      // 更新
      try {
        await callTauriCommand('doc_update', {
          collectionName: 'relations',
          docId: relationId,
          data: {
            searchableText,
          },
        });
      } catch (error) {
        console.warn(`⚠️ リレーション ${relationId} の更新エラー:`, error);
      }
    }
  } catch (error) {
    console.error('❌ relationsテーブルの移行エラー:', error);
    throw error;
  }
}

// スクリプトとして実行する場合
if (typeof window !== 'undefined') {
  // ブラウザ環境では、手動で呼び出す必要がある
  console.log('💡 このスクリプトを実行するには、migrateRAGOptimization()を呼び出してください');
} else {
  // Node.js環境では直接実行
  migrateRAGOptimization().catch(console.error);
}
