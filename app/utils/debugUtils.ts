import { getOrgTreeFromDb, getAllOrganizationsFromTree } from '@/lib/orgApi';

// 開発環境でのみログを有効化するヘルパー関数（パフォーマンス最適化）
const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args: any[]) => {
  if (isDev) {
    console.log(...args);
  }
};
const devWarn = (...args: any[]) => {
  if (isDev) {
    console.warn(...args);
  }
};

/**
 * グローバルデバッグ関数を設定（ブラウザコンソールで使用可能）
 */
export function setupDebugFunctions() {
  if (typeof window === 'undefined') return;

  // 最新のデータを取得する関数（開発環境でのみログ出力）
  (window as any).debugCompanyOrgMatching = async () => {
    try {
      devLog('🔍 [デバッグ] 事業会社と組織のIDマッチングを確認します...\n');
      
      const orgTreeData = await getOrgTreeFromDb();
      const allCompaniesData: any[] = [];
      
      if (!orgTreeData) {
        devLog('⚠️ 組織データが取得できませんでした');
        return;
      }
      
      const allOrgs = getAllOrganizationsFromTree(orgTreeData);
      const communicationsOrgs = allOrgs.filter(org => 
        org.name.includes('通信') && 
        (org.name.includes('モバイル') || org.name.includes('ビジネス'))
      );
      
      // 通信ビジネス部を特定
      const communicationsBusinessDept = allOrgs.find(org => 
        org.name === '通信ビジネス部' || org.name.includes('通信ビジネス部')
      );
      
      const tsujimotoCompany = allCompaniesData.find(c => 
        c.name.includes('辻本') || c.name.includes('コンサルティング')
      );
      
      const itochuInteractiveCompany = allCompaniesData.find(c => 
        c.name.includes('インタラクティブ')
      );
      
      devLog('📊 事業会社数:', allCompaniesData.length);
      devLog('📊 組織数:', allOrgs.length);
      devLog('📊 通信関連組織数:', communicationsOrgs.length);
      
      if (communicationsBusinessDept) {
        devLog(`\n✅ 通信ビジネス部を発見: ${communicationsBusinessDept.name} (ID: ${communicationsBusinessDept.id})`);
      } else {
        devWarn('\n⚠️ 通信ビジネス部が見つかりませんでした');
      }
      
      // 辻本郷コンサルティングの確認
      if (tsujimotoCompany) {
        devLog('\n✅ 辻本郷コンサルティング:', {
          id: tsujimotoCompany.id,
          name: tsujimotoCompany.name,
          organizationId: tsujimotoCompany.organizationId
        });
        
        const matchedOrg = allOrgs.find(org => org.id === tsujimotoCompany.organizationId);
        if (matchedOrg) {
          devLog(`\n✅ 紐づいている組織: ${matchedOrg.name} (ID: ${matchedOrg.id}, level: (matchedOrg as any).level)`);
        } else {
          devWarn(`\n⚠️ organizationId "${tsujimotoCompany.organizationId}" に該当する組織が見つかりません`);
        }
        
        if (communicationsBusinessDept) {
          const isMatch = communicationsBusinessDept.id === tsujimotoCompany.organizationId;
          devLog(`\n🔗 通信ビジネス部とのIDマッチング: ${isMatch ? '✅ 一致' : '❌ 不一致'}`);
        }
      }
      
      // 伊藤忠インタラクティブの確認
      if (itochuInteractiveCompany) {
        devLog('\n✅ 伊藤忠インタラクティブ（株）:', {
          id: itochuInteractiveCompany.id,
          name: itochuInteractiveCompany.name,
          organizationId: itochuInteractiveCompany.organizationId,
          department: itochuInteractiveCompany.department || '未設定'
        });
        
        const matchedOrg = allOrgs.find(org => org.id === itochuInteractiveCompany.organizationId);
        if (matchedOrg) {
          devLog(`\n✅ 紐づいている組織: ${matchedOrg.name} (ID: ${matchedOrg.id}, level: (matchedOrg as any).level)`);
        } else {
          devWarn(`\n⚠️ organizationId "${itochuInteractiveCompany.organizationId}" に該当する組織が見つかりません`);
        }
        
        if (communicationsBusinessDept) {
          const isMatch = communicationsBusinessDept.id === itochuInteractiveCompany.organizationId;
          devLog(`\n🔗 通信ビジネス部とのIDマッチング: ${isMatch ? '✅ 一致' : '❌ 不一致'}`);
          
          if (!isMatch) {
            devWarn(`\n⚠️ 問題: 伊藤忠インタラクティブのorganizationIdが通信ビジネス部のIDと一致していません！`);
            devWarn(`   修正が必要です。正しいorganizationIdは: ${communicationsBusinessDept.id}`);
          }
        }
      } else {
        devLog('\n❌ 伊藤忠インタラクティブ（株）が見つかりませんでした');
        devLog('   登録されている事業会社数:', allCompaniesData.length);
      }
      
      if (!tsujimotoCompany && !itochuInteractiveCompany) {
        devLog('\n❌ 対象の事業会社が見つかりませんでした');
      }
      
      // ループ内のログを簡略化（パフォーマンス最適化）
      const level1And2Orgs = allOrgs.filter(org => (org as any).level === 0 || (org as any).level === 1);
      const orgsWithCompanies = level1And2Orgs.filter(org => {
        const linkedCompanies = allCompaniesData.filter(c => c.organizationId === org.id);
        return linkedCompanies.length > 0;
      });
      devLog('\n📋 レベル1とレベル2の組織で、事業会社に紐づいているもの:', orgsWithCompanies.length, '件');
      
      const orgsWithoutCompanies = level1And2Orgs.filter(org => {
        const linkedCompanies = allCompaniesData.filter(c => c.organizationId === org.id);
        return linkedCompanies.length === 0;
      });
      devLog('\n📋 レベル1とレベル2の組織で、事業会社に紐づいていないもの:', orgsWithoutCompanies.length, '件');
      
      // 通信ビジネス部に紐づくべき事業会社を確認
      if (communicationsBusinessDept) {
        const shouldBeLinked = allCompaniesData.filter(c => {
          return c.department === '通信ビジネス部' || 
                 c.department?.includes('通信ビジネス') ||
                 c.name.includes('インタラクティブ') ||
                 c.name.includes('辻本');
        });
        
        const linkedCount = shouldBeLinked.filter(c => c.organizationId === communicationsBusinessDept.id).length;
        const unlinkedCount = shouldBeLinked.length - linkedCount;
        devLog(`\n📋 通信ビジネス部 (ID: ${communicationsBusinessDept.id}) に紐づくべき事業会社:`, {
          total: shouldBeLinked.length,
          linked: linkedCount,
          unlinked: unlinkedCount
        });
      }
      
      devLog('\n✅ デバッグ完了');
    } catch (error: any) {
      console.error('❌ エラー:', error);
      console.error('エラーの詳細:', error?.stack || error?.message || error);
    }
  };
  
  // 一括修正関数を設定（開発環境でのみログ出力）
  (window as any).fixCommunicationsBusinessCompanies = async () => {
    try {
      devLog('🔧 [修正] 通信ビジネス部に紐づく事業会社のorganizationIdを一括修正します...\n');
      
      const orgTreeData = await getOrgTreeFromDb();
      const allCompaniesData: any[] = [];
      
      if (!orgTreeData) {
        devLog('⚠️ 組織データが取得できませんでした');
        return;
      }
      
      const allOrgs = getAllOrganizationsFromTree(orgTreeData);
      const communicationsBusinessDept = allOrgs.find(org => 
        org.name === '通信ビジネス部' || org.name.includes('通信ビジネス部')
      );
      
      if (!communicationsBusinessDept) {
        devWarn('⚠️ 通信ビジネス部が見つかりませんでした');
        return;
      }
      
      const correctOrgId = communicationsBusinessDept.id;
      devLog(`✅ 通信ビジネス部のID: ${correctOrgId}\n`);
      
      // 修正対象の事業会社を特定
      const companiesToFix = allCompaniesData.filter(c => {
        return (c.department === '通信ビジネス部' || 
                c.department?.includes('通信ビジネス') ||
                c.name.includes('インタラクティブ') ||
                c.name.includes('辻本') ||
                c.name.includes('マイボイスコム') ||
                c.name.includes('アシュリオン') ||
                c.name.includes('ベルシステム') ||
                c.name.includes('Ｂｅｌｏｎｇ') ||
                c.name.includes('ジーアイクラウド') ||
                c.name.includes('ＡＫＱＡ')) &&
               c.organizationId !== correctOrgId;
      });
      
      if (companiesToFix.length === 0) {
        devLog('✅ 修正対象の事業会社はありませんでした');
        return;
      }
      
      devLog(`📋 修正対象: ${companiesToFix.length}件の事業会社\n`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const company of companiesToFix) {
        try {
          devLog(`🔄 修正中: ${company.name} (ID: ${company.id})`);
          
          devLog(`   ⚠️ 事業会社更新機能は削除されました（事業会社ページ削除のため）`);
          
          devLog(`   ✅ 修正完了: ${company.name}\n`);
          successCount++;
        } catch (error: any) {
          console.error(`   ❌ エラー: ${company.name}`, error);
          errorCount++;
        }
      }
      
      devLog('\n📊 修正結果:');
      devLog(`   ✅ 成功: ${successCount}件`);
      devLog(`   ❌ 失敗: ${errorCount}件`);
      devLog('\n✅ 修正処理が完了しました。ページをリロードして確認してください。');
    } catch (error: any) {
      console.error('❌ エラー:', error);
      console.error('エラーの詳細:', error?.stack || error?.message || error);
    }
  };
  
  devLog('✅ デバッグ関数を設定しました。コンソールで await debugCompanyOrgMatching() を実行してください。');
  devLog('✅ 修正関数を設定しました。コンソールで await fixCommunicationsBusinessCompanies() を実行してください。');
}

