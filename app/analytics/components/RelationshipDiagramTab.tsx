/**
 * 関係性図タブコンテンツ
 */

'use client';

import { useState, useEffect } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type { RelationshipNode } from '@/components/RelationshipDiagram2D';
import { getFocusInitiatives } from '@/lib/orgApi';
import { getOrgTreeFromDb, getAllOrganizationsFromTree, type OrgNodeData } from '@/lib/orgApi';
import dynamic from 'next/dynamic';
import ThemeSelector from './ThemeSelector';
import TypeFilter from './TypeFilter';
import ViewModeSelector from './ViewModeSelector';
import ThemeModal from '../modals/ThemeModal';
import DeleteThemeModal from '../modals/DeleteThemeModal';
import EditThemesModal from '../modals/EditThemesModal';
import { useThemeManagement } from '../hooks/useThemeManagement';
import { useRelationshipDiagramData } from '../hooks/useRelationshipDiagramData';
import { devLog } from '../utils/devLog';
import type { Theme, FocusInitiative, TopicInfo } from '@/lib/orgApi';

const DynamicRelationshipDiagram2D = dynamic(() => import('@/components/RelationshipDiagram2D'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
      関係性図を読み込み中...
    </div>
  ),
});

const DynamicRelationshipBubbleChart = dynamic(() => import('@/components/RelationshipBubbleChart'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
      バブルチャートを読み込み中...
    </div>
  ),
});

interface RelationshipDiagramTabProps {
  selectedThemeId: string | null;
  viewMode: 'diagram' | 'bubble';
  selectedTypeFilter: 'all' | 'organization' | 'company' | 'person';
  themes: Theme[];
  setThemes: (themes: Theme[]) => void;
  initiatives: FocusInitiative[];
  orgData: OrgNodeData | null;
  topics: TopicInfo[];
  setTopics: (topics: Topic[]) => void;
  refreshThemes: () => Promise<void>;
  refreshTopics: () => Promise<void>;
  onSelectedThemeIdChange: (themeId: string | null) => void;
  onViewModeChange: (mode: 'diagram' | 'bubble') => void;
  onTypeFilterChange: (filter: 'all' | 'organization' | 'company' | 'person') => void;
}

export function RelationshipDiagramTab({
  selectedThemeId,
  viewMode,
  selectedTypeFilter,
  themes,
  setThemes,
  initiatives,
  orgData,
  topics,
  setTopics,
  refreshThemes,
  refreshTopics,
  onSelectedThemeIdChange,
  onViewModeChange,
  onTypeFilterChange,
}: RelationshipDiagramTabProps) {
  const themeManagement = useThemeManagement(themes, setThemes);

  useEffect(() => {
    if (themes.length > 0) {
      themeManagement.initializeOrderedThemes(themes);
    }
  }, [themes, themeManagement]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { nodes, links } = useRelationshipDiagramData({
    selectedThemeId,
    themes,
    initiatives,
    orgData,
    topics,
    selectedTypeFilter,
  });

  const handleNodeClick = (node: RelationshipNode) => {
    // ノードクリック時の処理（必要に応じて実装）
  };

  // デバッグ用: BPOビジネス課のAriel社協業のトピック数を確認する関数をグローバルに公開
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).checkArielTopics = async () => {
        try {
          devLog('=== BPOビジネス課のAriel社協業のトピック数を確認 ===\n');
          
          // 組織ツリーを取得
          const orgTree = await getOrgTreeFromDb();
          if (!orgTree) {
            console.error('❌ 組織ツリーの取得に失敗しました');
            return;
          }
          
          // BPOビジネス課の組織IDを検索
          const { getAllOrganizationsFromTree } = await import('@/lib/orgApi');
          const allOrgs = getAllOrganizationsFromTree(orgTree);
          const bpoOrg = allOrgs.find(org => 
            org.name === 'BPOビジネス課' || 
            org.name === 'ＢＰＯビジネス課' ||
            org.title === 'BPO Business Section'
          );
          
          if (!bpoOrg) {
            console.error('❌ BPOビジネス課が見つかりませんでした');
            devLog('利用可能な組織数:', allOrgs.length);
            return;
          }
          
          devLog(`✅ BPOビジネス課の組織ID: ${bpoOrg.id}\n`);
          
          // BPOビジネス課の注力施策を取得
          const bpoInitiatives = await getFocusInitiatives(bpoOrg.id);
          devLog(`📊 BPOビジネス課の注力施策数: ${bpoInitiatives.length}件\n`);
          
          // Ariel社協業を検索
          const arielInitiative = bpoInitiatives.find(init => 
            init.title.includes('Ariel') || 
            init.title.includes('アリエル') ||
            init.title.includes('協業')
          );
          
          if (!arielInitiative) {
            console.error('❌ Ariel社協業の注力施策が見つかりませんでした');
            devLog('利用可能な注力施策数:', bpoInitiatives.length);
            return;
          }
          
          devLog(`✅ 注力施策が見つかりました:`);
          devLog(`   ID: ${arielInitiative.id}`);
          devLog(`   タイトル: ${arielInitiative.title}`);
          devLog(`   トピック数: ${arielInitiative.topicIds ? arielInitiative.topicIds.length : 0}件\n`);
          
          if (arielInitiative.topicIds && arielInitiative.topicIds.length > 0) {
            devLog('📋 紐づけられているトピックID数:', arielInitiative.topicIds.length);
          } else {
            devLog('⚠️ トピックが紐づけられていません');
          }
          
          devLog('\n=== 確認完了 ===');
          return {
            initiativeId: arielInitiative.id,
            title: arielInitiative.title,
            topicIds: arielInitiative.topicIds || [],
            topicCount: arielInitiative.topicIds ? arielInitiative.topicIds.length : 0,
          };
        } catch (error: any) {
          console.error('❌ エラーが発生しました:', error);
          console.error('エラー詳細:', error.stack);
          throw error;
        }
      };
      // 既に読み込まれているデータから確認する関数も追加
      (window as any).checkArielTopicsFromLoadedData = () => {
        try {
          devLog('=== 読み込まれているデータから確認 ===\n');
          
          // BPOビジネス課の組織IDを検索
          if (!orgData) {
            console.error('❌ 組織データが読み込まれていません');
            return;
          }
          
          const { getAllOrganizationsFromTree } = require('@/lib/orgApi');
          const allOrgs = getAllOrganizationsFromTree(orgData);
          const bpoOrg = allOrgs.find((org: OrgNodeData) =>
            org.name === 'BPOビジネス課' ||
            org.name === 'ＢＰＯビジネス課' ||
            org.title === 'BPO Business Section'
          );
          
          if (!bpoOrg) {
            console.error('❌ BPOビジネス課が見つかりませんでした');
            return;
          }
          
          devLog(`✅ BPOビジネス課の組織ID: ${bpoOrg.id}\n`);
          
          // 読み込まれている注力施策から検索
          const bpoInitiatives = initiatives.filter(init => init.organizationId === bpoOrg.id);
          devLog(`📊 BPOビジネス課の注力施策数: ${bpoInitiatives.length}件\n`);
          
          // Ariel社協業を検索
          const arielInitiative = bpoInitiatives.find(init => 
            init.title.includes('Ariel') || 
            init.title.includes('アリエル') ||
            init.title.includes('協業')
          );
          
          if (!arielInitiative) {
            console.error('❌ Ariel社協業の注力施策が見つかりませんでした');
            devLog('利用可能な注力施策数:', bpoInitiatives.length);
            return;
          }
          
          devLog(`✅ 注力施策が見つかりました:`);
          devLog(`   ID: ${arielInitiative.id}`);
          devLog(`   タイトル: ${arielInitiative.title}`);
          devLog(`   トピック数: ${arielInitiative.topicIds ? arielInitiative.topicIds.length : 0}件\n`);
          
          if (arielInitiative.topicIds && arielInitiative.topicIds.length > 0) {
            devLog('📋 紐づけられているトピックID数:', arielInitiative.topicIds.length);
          } else {
            devLog('⚠️ トピックが紐づけられていません');
          }
          
          devLog('\n=== 確認完了 ===');
          return {
            initiativeId: arielInitiative.id,
            title: arielInitiative.title,
            topicIds: arielInitiative.topicIds || [],
            topicCount: arielInitiative.topicIds ? arielInitiative.topicIds.length : 0,
          };
        } catch (error: any) {
          console.error('❌ エラーが発生しました:', error);
          console.error('エラー詳細:', error.stack);
          throw error;
        }
      };
      
      devLog('✅ checkArielTopics() 関数が利用可能になりました。ブラウザのコンソールで実行してください。');
      devLog('✅ checkArielTopicsFromLoadedData() 関数も利用可能です（読み込まれているデータから確認）。');
    }
  }, [orgData, initiatives, topics]);

  return (
    <>
      <TypeFilter
        selectedTypeFilter={selectedTypeFilter}
        onFilterChange={onTypeFilterChange}
      />

      <ViewModeSelector
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />

      {/* テーマ選択 */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '12px',
        }}>
          <label style={{ 
            fontWeight: '500',
            fontSize: '14px',
            color: '#1A1A1A',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            テーマを選択
            {themes.length > 0 && (
              <span style={{ 
                fontSize: '12px', 
                color: '#808080', 
                fontWeight: '400',
                marginLeft: '8px',
              }}>
                ({themes.length}件)
              </span>
            )}
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                themeManagement.setShowEditThemesModal(true);
              }}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#1A1A1A',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #E0E0E0',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 150ms',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#C4C4C4';
                e.currentTarget.style.backgroundColor = '#FAFAFA';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E0E0E0';
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M11.333 2.00001C11.5084 1.82465 11.7163 1.68571 11.9447 1.59203C12.1731 1.49835 12.4173 1.4519 12.6637 1.45564C12.9101 1.45938 13.1533 1.51324 13.3788 1.6139C13.6043 1.71456 13.8075 1.8598 13.9767 2.04068C14.1459 2.22156 14.2775 2.43421 14.3639 2.66548C14.4503 2.89675 14.4896 3.14195 14.4795 3.38801C14.4694 3.63407 14.4101 3.8759 14.305 4.09868C14.1999 4.32146 14.0512 4.52059 13.8673 4.68401L5.54001 13.0113L1.33334 14.3333L2.65534 10.1267L11.333 2.00001Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              編集
            </button>
            <button
              type="button"
              onClick={() => {
                themeManagement.setEditingTheme(null);
                themeManagement.setThemeFormTitle('');
                themeManagement.setThemeFormDescription('');
                themeManagement.setShowThemeModal(true);
              }}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#FFFFFF',
                backgroundColor: '#4262FF',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 150ms',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#3151CC';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#4262FF';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 3V13M3 8H13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              テーマを追加
            </button>
          </div>
        </div>
        {themes.length === 0 ? (
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#FFFBF0', 
            border: '1.5px solid #FCD34D', 
            borderRadius: '8px',
            color: '#92400E',
            fontSize: '14px',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            テーマが見つかりません。テーマを追加してください。
          </div>
        ) : (
          <ThemeSelector
            themes={themes}
            selectedThemeId={selectedThemeId}
            onSelect={(themeId) => {
              devLog('テーマを選択:', themeId);
              onSelectedThemeIdChange(themeId);
            }}
          />
        )}
      </div>

      {/* 2D関係性図またはバブルチャート */}
      {/* テーマが存在する場合は、組織や注力施策、トピックが0件でも、テーマが選択されていなくても（すべて表示）表示 */}
      {(nodes.length > 0 || themes.length > 0) ? (
        <div style={{ marginBottom: '32px' }}>
          {viewMode === 'diagram' ? (
            <DynamicRelationshipDiagram2D
              width={1200}
              height={800}
              nodes={nodes}
              links={links}
              selectedThemeId={selectedThemeId ?? undefined}
              onNodeClick={handleNodeClick}
              onTopicMetadataSaved={refreshTopics}
              maxNodes={1000}
            />
          ) : (
            <DynamicRelationshipBubbleChart
              width={1200}
              height={800}
              nodes={nodes}
              links={links}
              onNodeClick={handleNodeClick}
            />
          )}
        </div>
      ) : (
        <div style={{ 
          padding: '60px', 
          textAlign: 'center', 
          color: '#808080',
          fontSize: '14px',
          fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          backgroundColor: '#FAFAFA',
          borderRadius: '8px',
          border: '1px dashed #E0E0E0',
          marginBottom: '32px',
        }}>
          テーマを選択すると関係性図が表示されます。
        </div>
      )}

      <ThemeModal
        isOpen={themeManagement.showThemeModal}
        editingTheme={themeManagement.editingTheme}
        themeFormTitle={themeManagement.themeFormTitle}
        themeFormDescription={themeManagement.themeFormDescription}
        showEditThemesModal={themeManagement.showEditThemesModal}
        onClose={() => {
          themeManagement.setShowThemeModal(false);
          themeManagement.setEditingTheme(null);
          themeManagement.setThemeFormTitle('');
          themeManagement.setThemeFormDescription('');
        }}
        onTitleChange={themeManagement.setThemeFormTitle}
        onDescriptionChange={themeManagement.setThemeFormDescription}
        onThemeSaved={(themes) => {
          setThemes(themes);
          themeManagement.initializeOrderedThemes(themes);
        }}
        onEditThemesModalReopen={() => themeManagement.setShowEditThemesModal(true)}
      />

      <DeleteThemeModal
        isOpen={themeManagement.showDeleteModal}
        themeToDelete={themeManagement.themeToDelete}
        selectedThemeId={selectedThemeId}
        onClose={() => {
          themeManagement.setShowDeleteModal(false);
          themeManagement.setThemeToDelete(null);
        }}
        onDelete={async () => {
          await themeManagement.refreshThemes();
        }}
        onSelectedThemeChange={onSelectedThemeIdChange}
      />

      <EditThemesModal
        isOpen={themeManagement.showEditThemesModal}
        orderedThemes={themeManagement.orderedThemes}
        sensors={sensors}
        onClose={() => themeManagement.setShowEditThemesModal(false)}
        onDragEnd={themeManagement.handleDragEnd}
        onEdit={(theme) => {
          themeManagement.setEditingTheme(theme);
          themeManagement.setThemeFormTitle(theme.title);
          themeManagement.setThemeFormDescription(theme.description || '');
          themeManagement.setShowEditThemesModal(false);
          themeManagement.setShowThemeModal(true);
        }}
        onDelete={(theme) => {
          themeManagement.setThemeToDelete(theme);
          themeManagement.setShowDeleteModal(true);
        }}
      />
    </>
  );
}

