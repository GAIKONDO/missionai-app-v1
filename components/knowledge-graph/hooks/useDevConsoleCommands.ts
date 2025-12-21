'use client';

import { useEffect } from 'react';
import { getAllEntities } from '@/lib/entityApi';
import { getAllRelations } from '@/lib/relationApi';

// 開発環境でのみコンソールコマンドを登録するカスタムフック
export function useDevConsoleCommands(
  setEntities: React.Dispatch<React.SetStateAction<any[]>>,
  setRelations: React.Dispatch<React.SetStateAction<any[]>>
) {
  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
      return;
    }

    // 埋め込みなしのcompanyIdを持つエンティティを確認・削除
    (window as any).checkAndDeleteUnsyncedCompanyEntities = async () => {
      try {
        const { callTauriCommand } = await import('@/lib/localFirebase');
        
        // すべてのエンティティを取得
        const allEntityDocs = await callTauriCommand('query_get', {
          collectionName: 'entities',
          conditions: {},
        }) as Array<{ id: string; data: any }>;
        
        // companyIdを持ち、chromaSyncedが0またはnullのエンティティをフィルタリング
        const unsyncedCompanyEntities = allEntityDocs.filter(doc => {
          const entityData = doc.data || doc;
          const companyId = entityData.companyId;
          const chromaSyncedValue = entityData.chromaSynced;
          const hasCompanyId = companyId !== null && companyId !== undefined && companyId !== '' && companyId !== 'null';
          const isUnsynced = chromaSyncedValue === 0 || chromaSyncedValue === null || chromaSyncedValue === undefined;
          return hasCompanyId && isUnsynced;
        });
        
        console.log(`📊 埋め込みなしのcompanyIdを持つエンティティ: ${unsyncedCompanyEntities.length}件`);
        
        if (unsyncedCompanyEntities.length > 0) {
          console.log('📋 サンプル（最初の10件）:');
          unsyncedCompanyEntities.slice(0, 10).forEach((doc, index) => {
            const entityData = doc.data || doc;
            console.log(`${index + 1}. ID: ${doc.id || entityData.id}, 名前: ${entityData.name}, companyId: ${entityData.companyId}, chromaSynced: ${entityData.chromaSynced}, createdAt: ${entityData.createdAt}`);
          });
          
          // 削除確認
          const shouldDelete = confirm(`${unsyncedCompanyEntities.length}件の埋め込みなしのcompanyIdを持つエンティティを削除しますか？`);
          if (shouldDelete) {
            console.log('🗑️ 削除を開始します...');
            let successCount = 0;
            let errorCount = 0;
            
            for (const doc of unsyncedCompanyEntities) {
              const entityId = doc.id || doc.data?.id;
              try {
                // エンティティを削除
                await callTauriCommand('doc_delete', {
                  collectionName: 'entities',
                  docId: entityId,
                });
                successCount++;
                if (successCount % 10 === 0) {
                  console.log(`✅ 削除中: ${successCount}/${unsyncedCompanyEntities.length}件完了`);
                }
              } catch (error: any) {
                errorCount++;
                console.error(`❌ 削除エラー: ${entityId}`, error);
              }
            }
            
            console.log(`✅ 削除完了: 成功=${successCount}件, エラー=${errorCount}件`);
            alert(`削除完了: 成功=${successCount}件, エラー=${errorCount}件`);
            
            // データを再読み込み
            const [allEntities, allRelations] = await Promise.all([
              getAllEntities(),
              getAllRelations(),
            ]);
            setEntities(allEntities);
            setRelations(allRelations);
          } else {
            console.log('❌ 削除をキャンセルしました');
          }
        } else {
          console.log('✅ 埋め込みなしのcompanyIdを持つエンティティは見つかりませんでした');
        }
        
        return {
          count: unsyncedCompanyEntities.length,
          entities: unsyncedCompanyEntities.map(doc => ({
            id: doc.id || doc.data?.id,
            name: (doc.data || doc).name,
            companyId: (doc.data || doc).companyId,
            chromaSynced: (doc.data || doc).chromaSynced,
            createdAt: (doc.data || doc).createdAt,
          })),
        };
      } catch (error: any) {
        console.error('❌ エラー:', error);
        throw error;
      }
    };
    
    console.log('✅ 埋め込みなしのcompanyIdを持つエンティティ確認・削除関数が利用可能になりました:');
    console.log('   - window.checkAndDeleteUnsyncedCompanyEntities()');
  }, [setEntities, setRelations]);
}
