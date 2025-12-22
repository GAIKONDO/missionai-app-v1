import { useState, useEffect, useCallback } from 'react';
import { getThemes, getFocusInitiatives, deleteTheme, getAllTopics, type Theme, type FocusInitiative, type TopicInfo } from '@/lib/orgApi';
import { getOrgTreeFromDb, type OrgNodeData } from '@/lib/orgApi';
import { devLog, devWarn } from '../utils/devLog';

export function useAnalyticsData() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [initiatives, setInitiatives] = useState<FocusInitiative[]>([]);
  const [orgData, setOrgData] = useState<OrgNodeData | null>(null);
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshThemes = useCallback(async () => {
    try {
      const refreshedThemes = await getThemes();
      setThemes(refreshedThemes);
    } catch (error: any) {
      console.error('テーマリストの再読み込みに失敗しました:', error);
    }
  }, []);

  const refreshTopics = useCallback(async () => {
    if (!orgData) {
      devWarn('組織データがありません。トピックリストを再取得できません。');
      return;
    }
    
    try {
      const allTopics: TopicInfo[] = [];
      const collectTopics = async (org: OrgNodeData) => {
        if (org.id) {
          const orgTopics = await getAllTopics(org.id);
          allTopics.push(...orgTopics);
        }
        
        if (org.children) {
          for (const child of org.children) {
            await collectTopics(child);
          }
        }
      };
      
      await collectTopics(orgData);
      setTopics(allTopics);
      devLog('✅ トピックリストを再取得しました:', allTopics.length, '件');
    } catch (error: any) {
      console.error('トピックリストの再取得に失敗しました:', error);
    }
  }, [orgData]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        devLog('📖 テーマを読み込み中...');
        let themesData = await getThemes();
        devLog('📖 読み込んだテーマ数:', themesData.length);
        
        const titleMap = new Map<string, Theme[]>();
        themesData.forEach(theme => {
          if (!titleMap.has(theme.title)) {
            titleMap.set(theme.title, []);
          }
          titleMap.get(theme.title)!.push(theme);
        });
        
        const duplicatesToDelete: string[] = [];
        titleMap.forEach((themes, title) => {
          if (themes.length > 1) {
            devWarn(`⚠️ 重複テーマを検出: 「${title}」 (${themes.length}件)`);
            for (let i = 1; i < themes.length; i++) {
              duplicatesToDelete.push(themes[i].id);
            }
          }
        });
        
        if (duplicatesToDelete.length > 0) {
          devLog(`🗑️ ${duplicatesToDelete.length}件の重複テーマを削除中...`);
          for (const themeId of duplicatesToDelete) {
            try {
              await deleteTheme(themeId);
              devLog(`✅ 重複テーマを削除しました: ${themeId}`);
            } catch (error: any) {
              console.error(`❌ 重複テーマの削除に失敗しました (ID: ${themeId}):`, error);
            }
          }
          themesData = await getThemes();
          devLog(`✅ 重複削除後のテーマ数: ${themesData.length}`);
        }
        
        devLog('📖 最終的なテーマ数:', themesData.length);
        
        const orgTree = await getOrgTreeFromDb();
        
        setThemes(themesData);
        setOrgData(orgTree);
        
        if (typeof window !== 'undefined') {
          (window as any).refreshThemes = refreshThemes;
        }
        
        if (orgTree) {
          const allInitiatives: FocusInitiative[] = [];
          const collectInitiatives = async (org: OrgNodeData) => {
            if (org.id) {
              const orgInitiatives = await getFocusInitiatives(org.id);
              allInitiatives.push(...orgInitiatives);
            }
            
            if (org.children) {
              for (const child of org.children) {
                await collectInitiatives(child);
              }
            }
          };
          
          await collectInitiatives(orgTree);
          
          const initiativesWithTopics = allInitiatives.filter(i => i.topicIds && i.topicIds.length > 0);
          devLog('🔍 [Analytics] トピックが紐づけられた注力施策:', {
            count: initiativesWithTopics.length,
          });
          
          setInitiatives(allInitiatives);
          
          const allTopics: TopicInfo[] = [];
          const collectTopics = async (org: OrgNodeData) => {
            if (org.id) {
              const orgTopics = await getAllTopics(org.id);
              allTopics.push(...orgTopics);
            }
            
            if (org.children) {
              for (const child of org.children) {
                await collectTopics(child);
              }
            }
          };
          
          await collectTopics(orgTree);
          
          devLog('🔍 [Analytics] 取得したトピック:', {
            count: allTopics.length,
          });
          
          setTopics(allTopics);
        }
      } catch (error: any) {
        console.error('データの読み込みに失敗しました:', error);
        setError(`データの読み込みに失敗しました: ${error?.message || error}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [refreshThemes]);

  return {
    themes,
    setThemes,
    initiatives,
    orgData,
    topics,
    setTopics,
    loading,
    error,
    refreshThemes,
    refreshTopics,
  };
}

