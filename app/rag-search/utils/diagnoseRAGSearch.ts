import { checkAllEmbeddings, printEmbeddingStats } from '@/lib/checkEmbeddings';

const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args: any[]) => {
  if (isDev) {
    console.log(...args);
  }
};

export async function diagnoseRAGSearch() {
  devLog('🔍 RAG検索の診断を開始します...\n');
  
  // 1. ChromaDB設定の確認
  const { shouldUseChroma } = await import('@/lib/chromaConfig');
  const useChroma = shouldUseChroma();
  const localStorageValue = localStorage.getItem('useChromaDB');
  devLog('1️⃣ ChromaDB設定:');
  devLog(`   - shouldUseChroma(): ${useChroma}`);
  devLog(`   - localStorage['useChromaDB']: "${localStorageValue}"`);
  devLog(`   - 推奨: ${useChroma ? '✅ ChromaDBが有効です' : '⚠️ ChromaDBが無効です。有効化するには: localStorage.setItem("useChromaDB", "true")'}\n`);
  
  // 2. エンティティの存在確認
  const { getAllEntities } = await import('@/lib/entityApi');
  const allEntities = await getAllEntities();
  devLog('2️⃣ エンティティの存在確認:');
  devLog(`   - 総エンティティ数: ${allEntities.length}件`);
  if (allEntities.length > 0) {
    devLog(`   - サンプルエンティティ数: ${Math.min(3, allEntities.length)}件`);
  } else {
    devLog('   ⚠️ エンティティが存在しません。エンティティを作成してください。\n');
  }
  
  // 3. 埋め込みの状態確認
  const stats = await checkAllEmbeddings();
  devLog('3️⃣ 埋め込みベクトルの状態:');
  devLog(`   - エンティティ: 総数=${stats.entities.total}, 埋め込みあり=${stats.entities.withEmbeddings}, 埋め込みなし=${stats.entities.withoutEmbeddings}`);
  devLog(`   - リレーション: 総数=${stats.relations.total}, 埋め込みあり=${stats.relations.withEmbeddings}, 埋め込みなし=${stats.relations.withoutEmbeddings}`);
  devLog(`   - トピック: 総数=${stats.topics.total}, 埋め込みあり=${stats.topics.withEmbeddings}, 埋め込みなし=${stats.topics.withoutEmbeddings}`);
  if (stats.entities.actualTotal !== undefined) {
    devLog(`   - 実際のエンティティ総数: ${stats.entities.actualTotal}件`);
  }
  devLog('');
  
  // 4. ChromaDBコレクションの確認（ChromaDBが有効な場合）
  if (useChroma && allEntities.length > 0) {
    const orgIds = [...new Set(allEntities.map(e => e.organizationId).filter(Boolean))];
    devLog('4️⃣ ChromaDBコレクションの確認:');
    if (orgIds.length === 0) {
      devLog('   ⚠️ organizationIdが設定されているエンティティがありません。');
    } else {
      let totalCount = 0;
      for (const orgId of orgIds.slice(0, 5)) {
        if (!orgId) continue;
        try {
          const { countEntitiesInChroma } = await import('@/lib/entityEmbeddingsChroma');
          const count = await countEntitiesInChroma(orgId);
          totalCount += count;
        } catch (error: any) {
          devLog(`   - entities_${orgId}: エラー - ${error?.message || error}`);
        }
      }
      devLog(`   - 確認したコレクション数: ${Math.min(5, orgIds.length)}件, 総エンティティ数: ${totalCount}件`);
    }
    devLog('');
  }
  
  // 5. 検索テスト（エンティティ名で検索）
  if (allEntities.length > 0 && useChroma) {
    const testEntity = allEntities[0];
    const testOrgId = testEntity.organizationId;
    if (testOrgId) {
      devLog('5️⃣ 検索テスト:');
      devLog(`   - テストクエリ: "${testEntity.name}"`);
      devLog(`   - organizationId: "${testOrgId}"`);
      try {
        const { findSimilarEntities } = await import('@/lib/entityEmbeddings');
        const searchResults = await findSimilarEntities(testEntity.name, 5, testOrgId);
        devLog(`   - 検索結果: ${searchResults.length}件`);
      } catch (error: any) {
        devLog(`   - 検索エラー: ${error?.message || error}`);
      }
      devLog('');
    }
  }
  
  // 6. 推奨事項
  devLog('6️⃣ 推奨事項:');
  if (!useChroma) {
    devLog('   ⚠️ ChromaDBが無効です。RAG検索を有効にするには:');
    devLog('      localStorage.setItem("useChromaDB", "true"); location.reload();');
  } else if (allEntities.length === 0) {
    devLog('   ⚠️ エンティティが存在しません。エンティティを作成してください。');
  } else if (stats.entities.withEmbeddings === 0) {
    devLog('   ⚠️ 埋め込みベクトルが生成されていません。ナレッジグラフページで「埋め込み再生成」を実行してください。');
    devLog('   💡 ナレッジグラフページのURL: /knowledge-graph');
  } else {
    const orgIds = [...new Set(allEntities.map(e => e.organizationId).filter(Boolean))];
    if (orgIds.length > 0) {
      devLog(`   ✅ 設定は正常です。検索時にorganizationIdを指定してください。`);
      devLog(`   💡 利用可能なorganizationId数: ${orgIds.length}件`);
    } else {
      devLog('   ⚠️ エンティティにorganizationIdが設定されていません。');
    }
  }
  
  return { useChroma, allEntities, stats };
}

export function setupDiagnosticTools() {
  if (typeof window === 'undefined') return;
  
  const isDev = process.env.NODE_ENV === 'development';
  const devLog = (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  };

  (window as any).checkEmbeddings = async (organizationId?: string) => {
    const stats = await checkAllEmbeddings(organizationId);
    devLog('📊 埋め込みベクトルの統計情報:', stats);
    return stats;
  };
  
  (window as any).printEmbeddingStats = async (organizationId?: string) => {
    await printEmbeddingStats(organizationId);
  };
  
  (window as any).diagnoseRAGSearch = diagnoseRAGSearch;
  
  devLog('✅ 埋め込みベクトル確認関数が利用可能になりました:');
  devLog('  - window.checkEmbeddings(organizationId?) - 統計情報を取得');
  devLog('  - window.printEmbeddingStats(organizationId?) - 統計情報をコンソールに表示');
  devLog('  - window.diagnoseRAGSearch() - RAG検索の診断を実行');
}

