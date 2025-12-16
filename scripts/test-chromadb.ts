/**
 * ChromaDBの動作確認スクリプト
 * ChromaDBの初期化、保存、検索が正しく動作するか確認
 */

// ChromaDB関連は動的インポート（ビルドエラーを回避）
import { generateEmbedding } from '../lib/embeddings';
import type { Entity } from '../types/entity';

// Tauri環境チェック
const isTauriEnvironment = typeof window !== 'undefined' && (
  '__TAURI__' in window || 
  '__TAURI_INTERNALS__' in window ||
  '__TAURI_METADATA__' in window
);

async function testChromaDB() {
  console.log('🧪 ChromaDBの動作確認を開始します...\n');

  // Tauri環境チェック
  if (!isTauriEnvironment && typeof window === 'undefined') {
    console.log('⚠️  Tauri環境ではありません');
    console.log('   このスクリプトはTauriアプリ内で実行してください');
    console.log('   または、npm run tauri:dev でアプリを起動してから実行してください\n');
    return;
  }

  try {
    // 1. ChromaDBクライアントの初期化（動的インポート）
    console.log('📦 ステップ1: ChromaDBクライアントの初期化');
    const chromaClientModule = await import('../lib/chromaClient');
    const client = await chromaClientModule.initChromaClient();
    console.log('✅ ChromaDBクライアントの初期化に成功しました\n');

    // 2. ChromaDBの状態確認（動的インポート）
    console.log('📊 ステップ2: ChromaDBの状態確認');
    const chromaClientModule2 = await import('../lib/chromaClient');
    const status = await chromaClientModule2.checkChromaStatus();
    console.log('ChromaDB状態:', {
      initialized: status.initialized,
      dbPath: status.dbPath,
      collections: status.collections,
    });
    console.log('');

    // 3. コレクションの作成確認（動的インポート）
    console.log('📚 ステップ3: コレクションの作成確認');
    const chromaClientModule3 = await import('../lib/chromaClient');
    const collection = await chromaClientModule3.ensureCollection(chromaClientModule3.CHROMA_COLLECTIONS.ENTITIES, 1536);
    console.log('✅ コレクションの作成/取得に成功しました:', chromaClientModule3.CHROMA_COLLECTIONS.ENTITIES);
    console.log('');

    // 4. テストエンティティの作成
    console.log('🔧 ステップ4: テストエンティティの作成');
    const testEntityId = 'test-entity-' + Date.now();
    const testEntity: Entity = {
      id: testEntityId,
      name: 'テストエンティティ',
      type: 'person',
      aliases: ['テスト', 'サンプル'],
      metadata: {
        role: '開発者',
        department: 'エンジニアリング',
      },
      organizationId: 'test-org-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 5. エンティティ埋め込みの保存（動的インポート）
    console.log('💾 ステップ5: エンティティ埋め込みの保存');
    try {
      if (!testEntity.organizationId) {
        throw new Error('organizationIdが設定されていません');
      }
      const entityEmbeddingsChromaModule = await import('../lib/entityEmbeddingsChroma');
      await entityEmbeddingsChromaModule.saveEntityEmbeddingToChroma(testEntityId, testEntity.organizationId, testEntity);
      console.log('✅ エンティティ埋め込みの保存に成功しました');
    } catch (error: any) {
      console.error('❌ エンティティ埋め込みの保存に失敗しました:', error.message);
      console.error('   エラー詳細:', error);
      throw error;
    }
    console.log('');

    // 6. エンティティ埋め込みの取得（動的インポート）
    console.log('📖 ステップ6: エンティティ埋め込みの取得');
    try {
      const entityEmbeddingsChromaModule2 = await import('../lib/entityEmbeddingsChroma');
      const embedding = await entityEmbeddingsChromaModule2.getEntityEmbeddingFromChroma(testEntityId, '');
      if (embedding) {
        console.log('✅ エンティティ埋め込みの取得に成功しました');
        console.log('   埋め込み次元:', embedding.combinedEmbedding?.length || 0);
        console.log('   モデル:', embedding.embeddingModel);
        console.log('   バージョン:', embedding.embeddingVersion);
      } else {
        console.error('❌ エンティティ埋め込みが見つかりませんでした');
      }
    } catch (error: any) {
      console.error('❌ エンティティ埋め込みの取得に失敗しました:', error.message);
      throw error;
    }
    console.log('');

    // 7. 類似エンティティの検索（動的インポート）
    console.log('🔍 ステップ7: 類似エンティティの検索');
    try {
      const entityEmbeddingsChromaModule3 = await import('../lib/entityEmbeddingsChroma');
      const results = await entityEmbeddingsChromaModule3.findSimilarEntitiesChroma('テスト', 5);
      console.log('✅ 類似エンティティの検索に成功しました');
      console.log('   検索結果数:', results.length);
      results.forEach((result, index) => {
        console.log(`   ${index + 1}. ID: ${result.entityId}, 類似度: ${(result.similarity * 100).toFixed(2)}%`);
      });
    } catch (error: any) {
      console.error('❌ 類似エンティティの検索に失敗しました:', error.message);
      console.error('   エラー詳細:', error);
      throw error;
    }
    console.log('');

    // 8. クエリ埋め込みの生成テスト
    console.log('🧬 ステップ8: クエリ埋め込みの生成テスト');
    try {
      const queryEmbedding = await generateEmbedding('テストクエリ');
      console.log('✅ クエリ埋め込みの生成に成功しました');
      console.log('   埋め込み次元:', queryEmbedding.length);
    } catch (error: any) {
      console.error('❌ クエリ埋め込みの生成に失敗しました:', error.message);
      throw error;
    }
    console.log('');

    console.log('🎉 すべてのテストが成功しました！');
    console.log('');
    console.log('📝 次のステップ:');
    console.log('   1. 設定ページでChromaDBを有効化してください');
    console.log('   2. エンティティを作成して、自動的にChromaDBに保存されるか確認してください');
    console.log('   3. RAG検索ページで検索して、ChromaDBが使用されているか確認してください');

  } catch (error: any) {
    console.error('\n❌ テスト中にエラーが発生しました:');
    console.error('   エラーメッセージ:', error.message);
    console.error('   エラー詳細:', error);
    console.error('   スタックトレース:', error.stack);
    console.log('');
    console.log('💡 考えられる原因:');
    console.log('   1. ChromaDBのJavaScriptクライアントがブラウザ環境で動作しない可能性');
    console.log('   2. データディレクトリへのアクセス権限の問題');
    console.log('   3. ChromaDBの依存関係の問題');
    console.log('');
    console.log('🔧 対処方法:');
    console.log('   1. エラーが発生した場合は、SQLiteフォールバックが自動的に使用されます');
    console.log('   2. 設定ページでChromaDBを無効化して、SQLiteを使用してください');
    console.log('   3. 将来的にRust側でChromaDBを統合することを検討してください');
    process.exit(1);
  }
}

// メイン実行
if (typeof window === 'undefined') {
  // Node.js環境
  testChromaDB().catch(error => {
    console.error('予期しないエラー:', error);
    process.exit(1);
  });
} else {
  // ブラウザ環境（Tauriアプリ内）
  testChromaDB().catch(error => {
    console.error('予期しないエラー:', error);
  });
}
