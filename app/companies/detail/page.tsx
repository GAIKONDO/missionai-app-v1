'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { 
  getCompanyById,
  getCompanyContent,
  saveCompanyContent,
  getCompanyFocusInitiatives,
  saveCompanyFocusInitiative,
  deleteCompanyFocusInitiative,
  generateUniqueCompanyInitiativeId,
  getCompanyMeetingNotes,
  saveCompanyMeetingNote,
  deleteCompanyMeetingNote,
  generateUniqueCompanyMeetingNoteId,
  type Company,
  type CompanyContent,
  type CompanyFocusInitiative,
  type CompanyMeetingNote,
} from '@/lib/companiesApi';
import dynamic from 'next/dynamic';
import MermaidLoader from '@/components/MermaidLoader';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '@/components/pages/component-test/test-concept/pageStyles.css';

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

// ReactMarkdown用の共通コンポーネント設定（ページセクション用）
// 事業会社専用ページのフォントスタイルを適用
const companyPageFontFamily = 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif';

const markdownComponents = {
  a: ({ node, ...props }: any) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: '#3B82F6', textDecoration: 'underline', fontFamily: companyPageFontFamily }}
    />
  ),
  p: ({ node, ...props }: any) => (
    <p {...props} style={{ margin: '0 0 16px 0', color: '#111827', fontFamily: companyPageFontFamily }} />
  ),
  h1: ({ node, ...props }: any) => (
    <h1 {...props} style={{ fontSize: '24px', fontWeight: 600, margin: '24px 0 12px 0', color: '#111827', fontFamily: companyPageFontFamily }} />
  ),
  h2: ({ node, ...props }: any) => (
    <h2 {...props} style={{ fontSize: '20px', fontWeight: 600, margin: '20px 0 10px 0', color: '#111827', fontFamily: companyPageFontFamily }} />
  ),
  h3: ({ node, ...props }: any) => (
    <h3 {...props} style={{ fontSize: '18px', fontWeight: 600, margin: '16px 0 8px 0', color: '#111827', fontFamily: companyPageFontFamily }} />
  ),
  h4: ({ node, ...props }: any) => (
    <h4 {...props} style={{ fontSize: '16px', fontWeight: 600, margin: '14px 0 6px 0', color: '#111827', fontFamily: companyPageFontFamily }} />
  ),
  h5: ({ node, ...props }: any) => (
    <h5 {...props} style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#111827', borderLeft: '3px solid var(--color-primary)', paddingLeft: '8px', fontFamily: companyPageFontFamily }} />
  ),
  ul: ({ node, ...props }: any) => (
    <ul {...props} style={{ margin: '8px 0', paddingLeft: '20px', color: '#111827', fontFamily: companyPageFontFamily }} />
  ),
  ol: ({ node, ...props }: any) => (
    <ol {...props} style={{ margin: '8px 0', paddingLeft: '20px', color: '#111827', fontFamily: companyPageFontFamily }} />
  ),
  li: ({ node, ...props }: any) => (
    <li {...props} style={{ margin: '4px 0', color: '#111827', fontFamily: companyPageFontFamily }} />
  ),
  code: ({ node, inline, ...props }: any) => (
    <code
      {...props}
      style={{
        backgroundColor: inline ? '#F3F4F6' : '#1F2937',
        color: inline ? '#1F2937' : '#F9FAFB',
        padding: inline ? '2px 6px' : '12px',
        borderRadius: '4px',
        fontSize: '13px',
        fontFamily: 'monospace',
        display: inline ? 'inline' : 'block',
        overflowX: 'auto',
      }}
    />
  ),
  pre: ({ node, ...props }: any) => (
    <pre {...props} style={{ margin: '8px 0', overflowX: 'auto', fontFamily: 'monospace' }} />
  ),
  blockquote: ({ node, ...props }: any) => (
    <blockquote
      {...props}
      style={{
        borderLeft: '3px solid var(--color-primary)',
        paddingLeft: '12px',
        margin: '8px 0',
        color: 'var(--color-text-light)',
        fontStyle: 'italic',
        fontFamily: companyPageFontFamily,
      }}
    />
  ),
  hr: ({ node, ...props }: any) => (
    <hr {...props} style={{ border: 'none', borderTop: '1px solid var(--color-border-color)', margin: '16px 0' }} />
  ),
  table: ({ node, ...props }: any) => (
    <table {...props} style={{ borderCollapse: 'collapse', width: '100%', margin: '8px 0', fontFamily: companyPageFontFamily }} />
  ),
  th: ({ node, ...props }: any) => (
    <th {...props} style={{ border: '1px solid var(--color-border-color)', padding: '8px', textAlign: 'left', backgroundColor: '#F9FAFB', fontWeight: 600, fontFamily: companyPageFontFamily }} />
  ),
  td: ({ node, ...props }: any) => (
    <td {...props} style={{ border: '1px solid var(--color-border-color)', padding: '8px', color: '#111827', fontFamily: companyPageFontFamily }} />
  ),
  strong: ({ node, ...props }: any) => (
    <strong {...props} style={{ fontWeight: 600, color: '#111827', fontFamily: companyPageFontFamily }} />
  ),
  em: ({ node, ...props }: any) => (
    <em {...props} style={{ fontStyle: 'italic', color: '#111827', fontFamily: companyPageFontFamily }} />
  ),
};

// Mermaid図を動的にインポート（SSRを無効化）
const MermaidDiagram = dynamic(
  () => import('@/components/pages/component-test/test-concept/MermaidDiagram'),
  { ssr: false }
);

// PlantUML図を動的にインポート（SSRを無効化）
const PlantUMLDiagram = dynamic(
  () => import('@/components/pages/component-test/test-concept/PlantUMLDiagram'),
  { ssr: false }
);

// AI API呼び出し関数（簡易版）
async function callLLMAPI(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model: string = 'gpt-4o-mini'
): Promise<string> {
  const isLocalModel = model.startsWith('qwen') || 
                       model.startsWith('llama') || 
                       model.startsWith('mistral') ||
                       model.includes(':latest') ||
                       model.includes(':instruct');
  
  if (isLocalModel) {
    // Ollama API呼び出し
    const apiUrl = process.env.NEXT_PUBLIC_OLLAMA_API_URL || 'http://localhost:11434/api/chat';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: messages.map(msg => ({
          role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        })),
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 2000,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama APIエラー: ${response.status}`);
    }

    const data = await response.json();
    return data.message?.content?.trim() || '';
  } else {
    // GPT API呼び出し
    let apiKey: string | undefined;
    if (typeof window !== 'undefined') {
      try {
        const { getAPIKey } = await import('@/lib/security');
        apiKey = getAPIKey('openai') || undefined;
      } catch (error) {
        apiKey = localStorage.getItem('NEXT_PUBLIC_OPENAI_API_KEY') || undefined;
      }
    }
    if (!apiKey) {
      apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    }
    
    if (!apiKey) {
      throw new Error('OpenAI APIキーが設定されていません。設定ページ（/settings）でAPIキーを設定してください。');
    }

    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    const requestBody: any = {
      model: model,
      messages,
      max_tokens: 2000,
      temperature: 0.7,
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`GPT APIエラー: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  }
}
import {
  getOrganizationsByCompanyDisplay,
  createOrganizationCompanyDisplay,
  deleteOrganizationCompanyDisplay,
  type OrganizationCompanyDisplay,
} from '@/lib/organizationCompanyDisplayApi';
import { getOrgTreeFromDb, type OrgNodeData } from '@/lib/orgApi';
import { tauriAlert, tauriConfirm } from '@/lib/orgApi';

type TabType = 'introduction' | 'focusBusinesses' | 'focusInitiatives' | 'meetingNotes';

function CompanyDetailPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const companyId = searchParams?.get('id') as string;
  const tabParam = searchParams?.get('tab') as TabType | null;
  
  const [company, setCompany] = useState<Company | null>(null);
  const [companyContent, setCompanyContent] = useState<CompanyContent | null>(null);
  const [focusInitiatives, setFocusInitiatives] = useState<CompanyFocusInitiative[]>([]);
  const [meetingNotes, setMeetingNotes] = useState<CompanyMeetingNote[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'introduction');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizationDisplays, setOrganizationDisplays] = useState<OrganizationCompanyDisplay[]>([]);
  const [organizations, setOrganizations] = useState<OrgNodeData | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  
  // 注力施策追加モーダルの状態
  const [showAddInitiativeModal, setShowAddInitiativeModal] = useState(false);
  const [newInitiativeTitle, setNewInitiativeTitle] = useState('');
  const [newInitiativeDescription, setNewInitiativeDescription] = useState('');
  const [newInitiativeId, setNewInitiativeId] = useState<string>('');
  const [savingInitiative, setSavingInitiative] = useState(false);
  
  // 注力施策編集・削除の状態
  const [editingInitiativeId, setEditingInitiativeId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteTargetInitiativeId, setDeleteTargetInitiativeId] = useState<string | null>(null);
  
  // 議事録追加モーダルの状態
  const [showAddMeetingNoteModal, setShowAddMeetingNoteModal] = useState(false);
  const [newMeetingNoteTitle, setNewMeetingNoteTitle] = useState('');
  const [newMeetingNoteDescription, setNewMeetingNoteDescription] = useState('');
  const [newMeetingNoteId, setNewMeetingNoteId] = useState<string>('');
  const [savingMeetingNote, setSavingMeetingNote] = useState(false);
  
  // 議事録編集・削除の状態
  const [editingMeetingNoteId, setEditingMeetingNoteId] = useState<string | null>(null);
  const [editingMeetingNoteTitle, setEditingMeetingNoteTitle] = useState('');
  const [showDeleteMeetingNoteConfirmModal, setShowDeleteMeetingNoteConfirmModal] = useState(false);
  const [deleteTargetMeetingNoteId, setDeleteTargetMeetingNoteId] = useState<string | null>(null);
  
  // 事業会社紹介・注力事業の編集状態
  const [editingIntroduction, setEditingIntroduction] = useState(false);
  const [introductionText, setIntroductionText] = useState('');
  const [editingFocusBusinesses, setEditingFocusBusinesses] = useState(false);
  const [focusBusinessesText, setFocusBusinessesText] = useState('');
  const [editingCapitalStructure, setEditingCapitalStructure] = useState(false);
  const [capitalStructureRows, setCapitalStructureRows] = useState<Array<{ name: string; ratio: string }>>([]);
  const [editingCapitalStructureDiagram, setEditingCapitalStructureDiagram] = useState(false);
  const [capitalStructureDiagramText, setCapitalStructureDiagramText] = useState('');
  const [generatingDiagram, setGeneratingDiagram] = useState(false);
  const [savingContent, setSavingContent] = useState(false);

  // タブパラメータが変更されたときにactiveTabを更新
  useEffect(() => {
    if (tabParam && ['introduction', 'focusBusinesses', 'focusInitiatives', 'meetingNotes'].includes(tabParam)) {
      setActiveTab(tabParam);
    } else {
      setActiveTab('introduction');
    }
  }, [tabParam]);

  // タブ変更時にURLを更新
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.push(`/companies/detail?id=${companyId}&tab=${tab}`, { scroll: false });
  };

  // データ読み込み
  useEffect(() => {
    const loadCompanyData = async () => {
      if (!companyId) {
        setError('事業会社IDが指定されていません');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // 事業会社データ、コンテンツ、注力施策、議事録、組織表示関係を取得
        const [companyData, contentData, initiativesData, notesData, displaysData, orgTree] = await Promise.all([
          getCompanyById(companyId),
          getCompanyContent(companyId),
          getCompanyFocusInitiatives(companyId),
          getCompanyMeetingNotes(companyId),
          getOrganizationsByCompanyDisplay(companyId),
          getOrgTreeFromDb(),
        ]);
        setCompany(companyData);
        setCompanyContent(contentData);
        setFocusInitiatives(initiativesData || []);
        setMeetingNotes(notesData || []);
        setOrganizationDisplays(displaysData || []);
        setOrganizations(orgTree);
        
        // コンテンツの初期値を設定
        if (contentData) {
          setIntroductionText(contentData.introduction || '');
          setFocusBusinessesText(contentData.focusBusinesses || '');
          // 資本構成データをパース（JSON文字列または空）
          try {
            if (contentData.capitalStructure) {
              const parsed = JSON.parse(contentData.capitalStructure);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setCapitalStructureRows(parsed);
              } else {
                setCapitalStructureRows([{ name: '', ratio: '' }]);
              }
            } else {
              setCapitalStructureRows([{ name: '', ratio: '' }]);
            }
          } catch {
            // JSONパースに失敗した場合は空の行を1つ追加
            setCapitalStructureRows([{ name: '', ratio: '' }]);
          }
          setCapitalStructureDiagramText(contentData.capitalStructureDiagram || '');
        } else {
          setCapitalStructureRows([{ name: '', ratio: '' }]);
        }
      } catch (err: any) {
        console.error('事業会社データの取得に失敗しました:', err);
        setError(err.message || '事業会社データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadCompanyData();
  }, [companyId]);

  // 組織を再帰的に検索する関数
  const findOrganizationById = (node: OrgNodeData, id: string): OrgNodeData | null => {
    if (node.id === id) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findOrganizationById(child, id);
        if (found) return found;
      }
    }
    return null;
  };

  // 組織ツリーを再帰的にフラットなリストに変換
  const flattenOrganizations = (node: OrgNodeData): OrgNodeData[] => {
    const result: OrgNodeData[] = [];
    if (node.id !== 'virtual-root') {
      result.push(node);
    }
    if (node.children) {
      for (const child of node.children) {
        result.push(...flattenOrganizations(child));
      }
    }
    return result;
  };

  // 指定された組織IDのすべての祖先組織IDを取得
  const getAllAncestorIds = (organizationId: string): string[] => {
    if (!organizations) return [];
    
    const findPath = (node: OrgNodeData, targetId: string, path: string[]): string[] | null => {
      if (!node.id) return null;
      
      const currentPath = [...path, node.id];
      
      if (node.id === targetId) {
        return currentPath;
      }
      
      if (node.children) {
        for (const child of node.children) {
          const result = findPath(child, targetId, currentPath);
          if (result) return result;
        }
      }
      
      return null;
    };
    
    const path = findPath(organizations, organizationId, []);
    if (!path) return [];
    
    // 自分自身を除いた祖先組織のIDを返す（virtual-rootも除外）
    return path.slice(0, -1).filter(id => id && id !== 'virtual-root');
  };

  // 指定された組織IDのすべての子孫組織IDを取得
  const getAllDescendantIds = (organizationId: string): string[] => {
    if (!organizations) return [];
    
    const org = findOrganizationById(organizations, organizationId);
    if (!org) return [];
    
    const descendants: string[] = [];
    const collectDescendants = (node: OrgNodeData) => {
      if (node.children) {
        for (const child of node.children) {
          if (child.id) {
            descendants.push(child.id);
            collectDescendants(child);
          }
        }
      }
    };
    
    collectDescendants(org);
    return descendants;
  };

  // 組織が選択されているか（自分自身または子孫が選択されている場合）
  // モーダル内では、selectedOrganizationIdsに含まれているかどうかで判定
  const isOrganizationSelected = (organizationId: string): boolean => {
    // 自分自身が選択されているか
    if (selectedOrganizationIds.includes(organizationId)) {
      return true;
    }
    
    // 子孫組織が選択されているか
    const descendantIds = getAllDescendantIds(organizationId);
    return descendantIds.some(id => selectedOrganizationIds.includes(id));
  };

  // 組織ツリーを階層構造でレンダリングする関数
  const renderOrganizationTree = (node: OrgNodeData, depth: number = 0): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    
    // virtual-rootは表示しない、idが存在する場合のみ処理
    if (node.id && node.id !== 'virtual-root') {
      const isAlreadyAdded = organizationDisplays.some(d => d.organizationId === node.id);
      const isSelected = isOrganizationSelected(node.id);
      
      elements.push(
        <label
          key={node.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px',
            paddingLeft: `${8 + depth * 24}px`,
            cursor: saving ? 'not-allowed' : 'pointer',
            borderRadius: '4px',
            backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
          }}
          onMouseEnter={(e) => {
            if (!saving) {
              e.currentTarget.style.backgroundColor = isSelected ? '#DBEAFE' : '#F9FAFB';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isSelected ? '#EFF6FF' : 'transparent';
          }}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {
              if (!saving && node.id) {
                handleOrganizationToggleWithAncestors(node.id);
              }
            }}
            disabled={saving}
            style={{
              marginRight: '8px',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          />
          <span style={{ fontSize: '14px', color: isAlreadyAdded ? '#6B7280' : '#1F2937' }}>
            {node.name}
            {isAlreadyAdded && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#9CA3AF' }}>(追加済み)</span>}
          </span>
        </label>
      );
    }
    
    // 子組織を再帰的にレンダリング
    if (node.children) {
      for (const child of node.children) {
        elements.push(...renderOrganizationTree(child, depth + 1));
      }
    }
    
    return elements;
  };

  // 組織を選択/解除する際に、祖先組織も自動的に選択/解除する
  const handleOrganizationToggleWithAncestors = (organizationId: string) => {
    const ancestorIds = getAllAncestorIds(organizationId);
    const allRelatedIds = [organizationId, ...ancestorIds];
    
    setSelectedOrganizationIds(prev => {
      // 現在この組織が選択されているかチェック（selectedOrganizationIdsに含まれているか）
      const isCurrentlySelected = prev.includes(organizationId);
      
      if (isCurrentlySelected) {
        // 解除: この組織とその祖先組織をすべて解除
        // ただし、子孫組織が選択されている場合は解除しない
        const descendantIds = getAllDescendantIds(organizationId);
        const hasSelectedDescendants = descendantIds.some(id => prev.includes(id));
        
        if (hasSelectedDescendants) {
          // 子孫が選択されている場合は、この組織だけを解除
          return prev.filter(id => id !== organizationId);
        } else {
          // 子孫が選択されていない場合は、この組織と祖先組織をすべて解除
          return prev.filter(id => !allRelatedIds.includes(id));
        }
      } else {
        // 選択: この組織とその祖先組織をすべて選択（重複を除外）
        const newIds = [...prev, ...allRelatedIds];
        return Array.from(new Set(newIds));
      }
    });
  };

  // 組織名を取得
  const getOrganizationName = (organizationId: string): string => {
    if (!organizations) return organizationId;
    const org = findOrganizationById(organizations, organizationId);
    return org?.name || organizationId;
  };

  // 組織の階層レベルを取得（ルートが0、深くなるほど大きくなる）
  const getOrganizationDepth = (organizationId: string): number => {
    if (!organizations) return 0;
    
    const findDepth = (node: OrgNodeData, targetId: string, depth: number): number | null => {
      if (node.id === targetId) {
        return depth;
      }
      
      if (node.children) {
        for (const child of node.children) {
          const result = findDepth(child, targetId, depth + 1);
          if (result !== null) return result;
        }
      }
      
      return null;
    };
    
    const depth = findDepth(organizations, organizationId, 0);
    return depth !== null ? depth : 999; // 見つからない場合は最後に
  };

  // 組織の階層順にソート（親組織が先、同じ階層内では名前順）
  const sortOrganizationsByHierarchy = (displays: OrganizationCompanyDisplay[]): OrganizationCompanyDisplay[] => {
    return [...displays].sort((a, b) => {
      const depthA = getOrganizationDepth(a.organizationId);
      const depthB = getOrganizationDepth(b.organizationId);
      
      // まず階層レベルでソート（浅い方が先）
      if (depthA !== depthB) {
        return depthA - depthB;
      }
      
      // 同じ階層内では名前順
      const nameA = getOrganizationName(a.organizationId);
      const nameB = getOrganizationName(b.organizationId);
      return nameA.localeCompare(nameB, 'ja');
    });
  };

  // 表示関係を追加/削除（複数選択対応、階層構造を考慮）
  const handleSaveDisplay = async () => {
    if (!companyId) {
      await tauriAlert('事業会社IDが取得できません');
      return;
    }

    try {
      setSaving(true);
      
      // 選択された組織とその祖先組織をすべて含める
      const allSelectedOrganizationIds = new Set<string>();
      selectedOrganizationIds.forEach(orgId => {
        allSelectedOrganizationIds.add(orgId);
        const ancestorIds = getAllAncestorIds(orgId);
        ancestorIds.forEach(ancestorId => allSelectedOrganizationIds.add(ancestorId));
      });

      // 現在追加されている組織IDのセット
      const currentDisplayIds = new Set(organizationDisplays.map(d => d.organizationId));
      
      // 追加する組織（選択されているが、まだ追加されていない）
      const toAdd = Array.from(allSelectedOrganizationIds).filter(
        orgId => !currentDisplayIds.has(orgId)
      );
      
      // 削除する組織（追加されているが、選択されていない）
      const toRemove = organizationDisplays.filter(
        d => !allSelectedOrganizationIds.has(d.organizationId)
      );

      // 追加処理（エラーハンドリング付き）
      const addResults = await Promise.allSettled(
        toAdd.map(orgId => createOrganizationCompanyDisplay(orgId, companyId))
      );
      
      const newDisplays: OrganizationCompanyDisplay[] = [];
      const addErrors: string[] = [];
      
      addResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          newDisplays.push(result.value);
        } else {
          const orgId = toAdd[index];
          const errorMsg = result.reason?.message || '不明なエラー';
          // UNIQUE制約エラーの場合は無視（既に存在するため）
          if (!errorMsg.includes('UNIQUE constraint')) {
            addErrors.push(`${orgId}: ${errorMsg}`);
          }
        }
      });

      // 削除処理
      const deletePromises = toRemove.map(display =>
        deleteOrganizationCompanyDisplay(display.id)
      );
      await Promise.all(deletePromises);

      // 状態を更新
      const updatedDisplays = [
        ...organizationDisplays.filter(d => !toRemove.some(r => r.id === d.id)),
        ...newDisplays,
      ];
      setOrganizationDisplays(updatedDisplays);
      setShowAddModal(false);
      setSelectedOrganizationIds([]);
      
      const messages = [];
      if (newDisplays.length > 0) messages.push(`${newDisplays.length}件を追加`);
      if (toRemove.length > 0) messages.push(`${toRemove.length}件を削除`);
      if (addErrors.length > 0) {
        console.error('追加エラー:', addErrors);
      }
      await tauriAlert(messages.length > 0 ? messages.join('、') : '変更はありません');
    } catch (error: any) {
      console.error('表示関係の保存に失敗しました:', error);
      await tauriAlert(`保存に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSaving(false);
    }
  };


  // すべて選択/すべて解除（階層構造を考慮）
  const handleSelectAll = () => {
    if (!organizations) return;
    const allOrgs = flattenOrganizations(organizations);
    
    // 現在選択されている組織の数（祖先組織を含む）を計算
    const allSelectedIds = new Set<string>();
    selectedOrganizationIds.forEach(orgId => {
      allSelectedIds.add(orgId);
      const ancestorIds = getAllAncestorIds(orgId);
      ancestorIds.forEach(id => allSelectedIds.add(id));
    });
    
    // 既に追加済みの組織IDも含める
    organizationDisplays.forEach(d => allSelectedIds.add(d.organizationId));
    
    if (allSelectedIds.size >= allOrgs.length) {
      // すべて解除
      setSelectedOrganizationIds([]);
    } else {
      // すべて選択（すべての組織を選択）
      setSelectedOrganizationIds(allOrgs.map(org => org.id).filter((id): id is string => id !== undefined));
    }
  };

  // 表示関係を削除
  const handleDeleteDisplay = async (id: string) => {
    const confirmed = await tauriConfirm('この表示関係を削除しますか？');
    if (!confirmed) return;

    try {
      await deleteOrganizationCompanyDisplay(id);
      setOrganizationDisplays(organizationDisplays.filter(d => d.id !== id));
      await tauriAlert('表示関係を削除しました');
    } catch (error: any) {
      console.error('表示関係の削除に失敗しました:', error);
      await tauriAlert(`削除に失敗しました: ${error?.message || '不明なエラー'}`);
    }
  };

  // 注力施策追加モーダルを開く
  const handleOpenAddInitiativeModal = () => {
    const newId = generateUniqueCompanyInitiativeId();
    setNewInitiativeId(newId);
    setNewInitiativeTitle('');
    setNewInitiativeDescription('');
    setShowAddInitiativeModal(true);
  };

  // 注力施策を追加
  const handleAddInitiative = async () => {
    if (!newInitiativeTitle.trim()) {
      await tauriAlert('タイトルを入力してください');
      return;
    }

    if (!companyId) {
      await tauriAlert('事業会社IDが取得できませんでした');
      return;
    }

    try {
      setSavingInitiative(true);
      const initiativeId = await saveCompanyFocusInitiative({
        id: newInitiativeId,
        companyId,
        title: newInitiativeTitle.trim(),
        description: newInitiativeDescription.trim() || undefined,
      });
      
      // 再取得
      const initiativesData = await getCompanyFocusInitiatives(companyId);
      setFocusInitiatives(initiativesData || []);
      
      // モーダルを閉じてフォームをリセット
      setShowAddInitiativeModal(false);
      setNewInitiativeTitle('');
      setNewInitiativeDescription('');
      setNewInitiativeId('');
      
      await tauriAlert('注力施策を追加しました');
    } catch (error: any) {
      console.error('❌ 注力施策の追加に失敗しました:', error);
      await tauriAlert(`追加に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingInitiative(false);
    }
  };

  // 注力施策の編集を開始
  const handleStartEdit = (initiative: CompanyFocusInitiative) => {
    setEditingInitiativeId(initiative.id);
    setEditingTitle(initiative.title);
  };

  // 注力施策の編集をキャンセル
  const handleCancelEdit = () => {
    setEditingInitiativeId(null);
    setEditingTitle('');
  };

  // 注力施策の編集を保存
  const handleSaveEdit = async (initiativeId: string) => {
    if (!editingTitle.trim()) {
      await tauriAlert('タイトルを入力してください');
      return;
    }

    try {
      setSavingInitiative(true);
      const initiative = focusInitiatives.find(i => i.id === initiativeId);
      if (!initiative) {
        throw new Error('注力施策が見つかりません');
      }

      await saveCompanyFocusInitiative({
        ...initiative,
        title: editingTitle.trim(),
      });

      // 再取得
      const initiativesData = await getCompanyFocusInitiatives(companyId);
      setFocusInitiatives(initiativesData || []);
      setEditingInitiativeId(null);
      setEditingTitle('');
      
      await tauriAlert('注力施策を更新しました');
    } catch (error: any) {
      console.error('❌ 注力施策の更新に失敗しました:', error);
      await tauriAlert(`更新に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingInitiative(false);
    }
  };

  // 注力施策の削除をリクエスト
  const handleDeleteInitiative = (initiativeId: string) => {
    setDeleteTargetInitiativeId(initiativeId);
    setShowDeleteConfirmModal(true);
  };

  // 注力施策の削除を確認
  const confirmDeleteInitiative = async () => {
    if (!deleteTargetInitiativeId) {
      return;
    }

    const initiativeId = deleteTargetInitiativeId;
    setShowDeleteConfirmModal(false);
    setDeleteTargetInitiativeId(null);
    
    try {
      setSavingInitiative(true);
      await deleteCompanyFocusInitiative(initiativeId);
      
      // 再取得
      const initiativesData = await getCompanyFocusInitiatives(companyId);
      setFocusInitiatives(initiativesData || []);
      
      await tauriAlert('注力施策を削除しました');
    } catch (error: any) {
      console.error('❌ 注力施策の削除に失敗しました:', error);
      await tauriAlert(`削除に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingInitiative(false);
    }
  };

  // 注力施策の削除をキャンセル
  const cancelDeleteInitiative = () => {
    setShowDeleteConfirmModal(false);
    setDeleteTargetInitiativeId(null);
  };

  // 議事録追加モーダルを開く
  const handleOpenAddMeetingNoteModal = () => {
    const newId = generateUniqueCompanyMeetingNoteId();
    setNewMeetingNoteId(newId);
    setNewMeetingNoteTitle('');
    setNewMeetingNoteDescription('');
    setShowAddMeetingNoteModal(true);
  };

  // 議事録を追加
  const handleAddMeetingNote = async () => {
    if (!newMeetingNoteTitle.trim()) {
      await tauriAlert('タイトルを入力してください');
      return;
    }

    if (!companyId) {
      await tauriAlert('事業会社IDが取得できませんでした');
      return;
    }

    try {
      setSavingMeetingNote(true);
      const noteId = await saveCompanyMeetingNote({
        id: newMeetingNoteId,
        companyId,
        title: newMeetingNoteTitle.trim(),
        description: newMeetingNoteDescription.trim() || undefined,
      });
      
      // 再取得
      const notesData = await getCompanyMeetingNotes(companyId);
      setMeetingNotes(notesData || []);
      
      // モーダルを閉じてフォームをリセット
      setShowAddMeetingNoteModal(false);
      setNewMeetingNoteTitle('');
      setNewMeetingNoteDescription('');
      setNewMeetingNoteId('');
      
      await tauriAlert('議事録を追加しました');
    } catch (error: any) {
      console.error('❌ 議事録の追加に失敗しました:', error);
      await tauriAlert(`追加に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingMeetingNote(false);
    }
  };

  // 議事録の編集を開始
  const handleStartEditMeetingNote = (note: CompanyMeetingNote) => {
    setEditingMeetingNoteId(note.id);
    setEditingMeetingNoteTitle(note.title);
  };

  // 議事録の編集をキャンセル
  const handleCancelEditMeetingNote = () => {
    setEditingMeetingNoteId(null);
    setEditingMeetingNoteTitle('');
  };

  // 議事録の編集を保存
  const handleSaveEditMeetingNote = async (noteId: string) => {
    if (!editingMeetingNoteTitle.trim()) {
      await tauriAlert('タイトルを入力してください');
      return;
    }

    try {
      setSavingMeetingNote(true);
      const note = meetingNotes.find(n => n.id === noteId);
      if (!note) {
        throw new Error('議事録が見つかりません');
      }

      await saveCompanyMeetingNote({
        ...note,
        title: editingMeetingNoteTitle.trim(),
      });

      // 再取得
      const notesData = await getCompanyMeetingNotes(companyId);
      setMeetingNotes(notesData || []);
      setEditingMeetingNoteId(null);
      setEditingMeetingNoteTitle('');
      
      await tauriAlert('議事録を更新しました');
    } catch (error: any) {
      console.error('❌ 議事録の更新に失敗しました:', error);
      await tauriAlert(`更新に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingMeetingNote(false);
    }
  };

  // 議事録の削除をリクエスト
  const handleDeleteMeetingNote = (noteId: string) => {
    setDeleteTargetMeetingNoteId(noteId);
    setShowDeleteMeetingNoteConfirmModal(true);
  };

  // 議事録の削除を確認
  const confirmDeleteMeetingNote = async () => {
    if (!deleteTargetMeetingNoteId) {
      return;
    }

    const noteId = deleteTargetMeetingNoteId;
    setShowDeleteMeetingNoteConfirmModal(false);
    setDeleteTargetMeetingNoteId(null);
    
    try {
      setSavingMeetingNote(true);
      await deleteCompanyMeetingNote(noteId);
      
      // 再取得
      const notesData = await getCompanyMeetingNotes(companyId);
      setMeetingNotes(notesData || []);
      
      await tauriAlert('議事録を削除しました');
    } catch (error: any) {
      console.error('❌ 議事録の削除に失敗しました:', error);
      await tauriAlert(`削除に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingMeetingNote(false);
    }
  };

  // 議事録の削除をキャンセル
  const cancelDeleteMeetingNote = () => {
    setShowDeleteMeetingNoteConfirmModal(false);
    setDeleteTargetMeetingNoteId(null);
  };

  // 事業会社紹介を保存
  const handleSaveIntroduction = async () => {
    if (!companyId) {
      await tauriAlert('事業会社IDが取得できませんでした');
      return;
    }

    try {
      setSavingContent(true);
      await saveCompanyContent(companyId, {
        introduction: introductionText.trim() || undefined,
        focusBusinesses: focusBusinessesText.trim() || undefined,
        capitalStructure: JSON.stringify(capitalStructureRows.filter(row => row.name.trim() || row.ratio.trim())) || undefined,
        capitalStructureDiagram: capitalStructureDiagramText.trim() || undefined,
      });
      
      // 再取得
      const contentData = await getCompanyContent(companyId);
      setCompanyContent(contentData);
      setEditingIntroduction(false);
      
      await tauriAlert('事業会社紹介を保存しました');
    } catch (error: any) {
      console.error('❌ 事業会社紹介の保存に失敗しました:', error);
      await tauriAlert(`保存に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingContent(false);
    }
  };

  // 注力事業を保存
  const handleSaveFocusBusinesses = async () => {
    if (!companyId) {
      await tauriAlert('事業会社IDが取得できませんでした');
      return;
    }

    try {
      setSavingContent(true);
      await saveCompanyContent(companyId, {
        introduction: introductionText.trim() || undefined,
        focusBusinesses: focusBusinessesText.trim() || undefined,
        capitalStructure: JSON.stringify(capitalStructureRows.filter(row => row.name.trim() || row.ratio.trim())) || undefined,
        capitalStructureDiagram: capitalStructureDiagramText.trim() || undefined,
      });
      
      // 再取得
      const contentData = await getCompanyContent(companyId);
      setCompanyContent(contentData);
      setEditingFocusBusinesses(false);
      
      await tauriAlert('注力事業を保存しました');
    } catch (error: any) {
      console.error('❌ 注力事業の保存に失敗しました:', error);
      await tauriAlert(`保存に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingContent(false);
    }
  };

  // 資本構成を保存
  const handleSaveCapitalStructure = async () => {
    if (!companyId) {
      await tauriAlert('事業会社IDが取得できませんでした');
      return;
    }

    try {
      setSavingContent(true);
      await saveCompanyContent(companyId, {
        introduction: introductionText.trim() || undefined,
        focusBusinesses: focusBusinessesText.trim() || undefined,
        capitalStructure: JSON.stringify(capitalStructureRows.filter(row => row.name.trim() || row.ratio.trim())) || undefined,
        capitalStructureDiagram: capitalStructureDiagramText.trim() || undefined,
      });
      
      // 再取得
      const contentData = await getCompanyContent(companyId);
      setCompanyContent(contentData);
      setEditingCapitalStructure(false);
      setEditingCapitalStructureDiagram(false);
      
      await tauriAlert('資本構成を保存しました');
    } catch (error: any) {
      console.error('❌ 資本構成の保存に失敗しました:', error);
      await tauriAlert(`保存に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingContent(false);
    }
  };

  // AIでMermaid図を生成
  const handleGenerateMermaidDiagram = async () => {
    // 有効な株主データを取得
    const validRows = capitalStructureRows.filter(row => row.name.trim() && row.ratio.trim());
    
    if (validRows.length === 0) {
      await tauriAlert('株主データが入力されていません。まず株主情報を入力してください。');
      return;
    }

    try {
      setGeneratingDiagram(true);
      
      // 株主データをテキスト形式に変換
      const shareholdersText = validRows
        .map(row => `- ${row.name}: ${row.ratio}%`)
        .join('\n');
      
      const systemPrompt = `あなたはMermaid図の専門家です。資本構成を表すMermaid図を作成してください。
以下の要件を満たしてください：
1. 事業会社を中心に配置
2. 各株主から事業会社への出資関係を矢印で表現
3. 出資比率をラベルに含める
4. 見やすく整理された構造にする
5. ノード間の線は必ず直角（オーソゴナル）にする（曲線ではなく、L字型や階段状の直線的な線を使用）
6. flowchart TD構文を使用する
7. 可能な限り直線的な接続を心がける
8. Mermaidコードブロック（\`\`\`mermaid ... \`\`\`）で囲んで返す`;

      const userPrompt = `以下の株主情報を元に、資本構成を表すMermaid図を作成してください。
ノード間の線は必ず直角（直線的）にしてください。

${shareholdersText}

事業会社名: ${company?.name || '事業会社'}`;

      devLog('🤖 [資本構成図生成] AI API呼び出し開始');
      const generatedContent = await callLLMAPI(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        'gpt-4o-mini'
      );

      devLog('🤖 [資本構成図生成] AI生成結果:', generatedContent?.substring(0, 200) + '...');

      // Mermaidコードを抽出
      let mermaidCode = '';
      try {
        // Mermaidコードブロックを抽出（複数のパターンを試す）
        const mermaidMatch1 = generatedContent.match(/```mermaid\n([\s\S]*?)\n```/);
        const mermaidMatch2 = generatedContent.match(/```mermaid\s*([\s\S]*?)```/);
        const mermaidMatch3 = generatedContent.match(/mermaid\n([\s\S]*?)\n```/);
        
        if (mermaidMatch1) {
          mermaidCode = mermaidMatch1[1].trim();
        } else if (mermaidMatch2) {
          mermaidCode = mermaidMatch2[1].trim();
        } else if (mermaidMatch3) {
          mermaidCode = mermaidMatch3[1].trim();
        } else {
          // コードブロックがない場合は、全体をMermaidコードとして扱う
          mermaidCode = generatedContent.trim();
        }
      } catch (parseError: any) {
        devWarn('⚠️ [資本構成図生成] Mermaidコード抽出エラー:', parseError);
        // 抽出に失敗した場合は全体を使用
        mermaidCode = generatedContent.trim();
      }

      if (mermaidCode) {
        setCapitalStructureDiagramText(mermaidCode);
        await tauriAlert('Mermaid図を生成しました');
      } else {
        await tauriAlert('Mermaid図の生成に失敗しました。生成結果が空でした。');
      }
    } catch (error: any) {
      console.error('❌ Mermaid図の生成に失敗しました:', error);
      await tauriAlert(`生成に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setGeneratingDiagram(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p>事業会社データを読み込み中...</p>
        </div>
      </Layout>
    );
  }

  if (error || !company) {
    return (
      <Layout>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#EF4444', marginBottom: '20px' }}>{error || '事業会社が見つかりません'}</p>
          <button
            onClick={() => router.push('/companies')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            事業会社一覧に戻る
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <MermaidLoader />
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text)' }}>
            {company.name}
            {company.nameShort && (
              <span style={{ fontSize: '16px', color: '#6B7280', marginLeft: '8px' }}>
                ({company.nameShort})
              </span>
            )}
          </h1>
          <button
            onClick={() => router.push('/companies')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6B7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            一覧に戻る
          </button>
        </div>

        {/* タブ */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border-color)', marginBottom: '24px' }}>
          <button
            onClick={() => handleTabChange('introduction')}
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'introduction' ? 'var(--color-primary)' : 'var(--color-text-light)',
              borderBottom: activeTab === 'introduction' ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'introduction' ? '600' : '400',
            }}
          >
            事業会社紹介
          </button>
          <button
            onClick={() => handleTabChange('focusBusinesses')}
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'focusBusinesses' ? 'var(--color-primary)' : 'var(--color-text-light)',
              borderBottom: activeTab === 'focusBusinesses' ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'focusBusinesses' ? '600' : '400',
            }}
          >
            注力事業
          </button>
          <button
            onClick={() => handleTabChange('focusInitiatives')}
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'focusInitiatives' ? 'var(--color-primary)' : 'var(--color-text-light)',
              borderBottom: activeTab === 'focusInitiatives' ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'focusInitiatives' ? '600' : '400',
            }}
          >
            注力施策 ({focusInitiatives.length})
          </button>
          <button
            onClick={() => handleTabChange('meetingNotes')}
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'meetingNotes' ? 'var(--color-primary)' : 'var(--color-text-light)',
              borderBottom: activeTab === 'meetingNotes' ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'meetingNotes' ? '600' : '400',
            }}
          >
            議事録 ({meetingNotes.length})
          </button>
        </div>

        {/* タブコンテンツ */}
        {activeTab === 'introduction' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                事業会社紹介
              </h3>
              {!editingIntroduction && (
                <button
                  onClick={() => {
                    setIntroductionText(companyContent?.introduction || '');
                    setEditingIntroduction(true);
                  }}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  編集
                </button>
              )}
            </div>
            
            {editingIntroduction ? (
              <div>
                <textarea
                  value={introductionText}
                  onChange={(e) => setIntroductionText(e.target.value)}
                  disabled={savingContent}
                  style={{
                    width: '100%',
                    minHeight: '200px',
                    padding: '12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                  placeholder="事業会社の紹介文を入力してください"
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    onClick={() => {
                      setEditingIntroduction(false);
                      setIntroductionText(companyContent?.introduction || '');
                    }}
                    disabled={savingContent}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#6B7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: savingContent ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSaveIntroduction}
                    disabled={savingContent}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: savingContent ? '#9CA3AF' : '#10B981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: savingContent ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    {savingContent ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {companyContent?.introduction ? (
                  <div 
                    className="page-section-content"
                    style={{ 
                      padding: '24px', 
                      backgroundColor: '#FFFFFF', 
                      borderRadius: '8px',
                      border: '1px solid var(--color-border-color)',
                      color: '#111827',
                      lineHeight: '1.8',
                      fontSize: '14px',
                      fontFamily: companyPageFontFamily,
                    }}
                  >
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]} 
                      components={markdownComponents}
                    >
                      {companyContent.introduction}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p style={{ color: 'var(--color-text-light)', padding: '20px', textAlign: 'center' }}>
                    事業会社紹介が登録されていません
                  </p>
                )}
              </div>
            )}

            {/* 基本情報 */}
            <div style={{ marginTop: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
                基本情報
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <strong>コード:</strong> {company.code}
                    </div>
                    <div>
                      <strong>カテゴリ:</strong> {company.category}
                    </div>
                    <div>
                      <strong>地域:</strong> {company.region}
                    </div>
                    {company.organizationId && (
                      <div>
                        <strong>組織ID:</strong> {company.organizationId}
                      </div>
                    )}
                  </div>
                </div>

          {(company.company || company.division || company.department) && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
                主管情報
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {company.company && (
                  <div>
                    <strong>主管カンパニー:</strong> {company.company}
                  </div>
                )}
                {company.division && (
                  <div>
                    <strong>主管部門:</strong> {company.division}
                  </div>
                )}
                {company.department && (
                  <div>
                    <strong>主管部:</strong> {company.department}
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>
                主管組織 ({organizationDisplays.length}件)
              </h3>
              <button
                onClick={() => {
                  // モーダルを開くときに、既に追加済みの組織IDを選択状態にする
                  const addedOrgIds = organizationDisplays.map(d => d.organizationId);
                  setSelectedOrganizationIds(addedOrgIds);
                  setShowAddModal(true);
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#3B82F6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                組織を編集
              </button>
            </div>
            {organizationDisplays.length === 0 ? (
              <p style={{ color: '#6B7280', fontSize: '14px' }}>主管組織がありません</p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: '12px',
                }}
              >
                {sortOrganizationsByHierarchy(organizationDisplays).map(display => {
                  const orgName = getOrganizationName(display.organizationId);
                  const depth = getOrganizationDepth(display.organizationId);
                  
                  return (
                    <div
                      key={display.id}
                      onClick={() => router.push(`/organization/detail?id=${display.organizationId}`)}
                      style={{
                        padding: '16px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                        e.currentTarget.style.borderColor = '#3B82F6';
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#E5E7EB';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                      }}
                    >
                      <div style={{ marginBottom: '8px' }}>
                        <strong style={{ fontSize: '16px', color: '#1F2937', display: 'block' }}>
                          {orgName}
                        </strong>
                        {depth > 0 && (
                          <span style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px', display: 'block' }}>
                            {Array(depth).fill('└').join('')} 階層レベル: {depth}
                          </span>
                        )}
                      </div>
                      {display.displayOrder !== 0 && (
                        <div style={{ marginTop: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#6B7280' }}>
                            表示順序: {display.displayOrder}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 資本構成セクション */}
          <div style={{ marginTop: '32px', gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>
                資本構成
              </h3>
              {!editingCapitalStructure && !editingCapitalStructureDiagram && (
                <button
                  onClick={() => {
                    // 既存データを読み込む
                    try {
                      if (companyContent?.capitalStructure) {
                        const parsed = JSON.parse(companyContent.capitalStructure);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                          setCapitalStructureRows(parsed);
                        } else {
                          setCapitalStructureRows([{ name: '', ratio: '' }]);
                        }
                      } else {
                        setCapitalStructureRows([{ name: '', ratio: '' }]);
                      }
                    } catch {
                      setCapitalStructureRows([{ name: '', ratio: '' }]);
                    }
                    setCapitalStructureDiagramText(companyContent?.capitalStructureDiagram || '');
                    setEditingCapitalStructure(true);
                    setEditingCapitalStructureDiagram(true);
                  }}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  編集
                </button>
              )}
            </div>
            
            {editingCapitalStructure || editingCapitalStructureDiagram ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* 左側: 資本構成テーブル */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
                    主要株主 (出資比率)
                  </label>
                  <div style={{ border: '1px solid #E5E7EB', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                    {/* テーブルヘッダー */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr auto', 
                      backgroundColor: '#DDEBF7',
                      borderBottom: '1px solid #E5E7EB',
                    }}>
                      <div style={{ 
                        padding: '12px 16px', 
                        fontWeight: 600, 
                        fontSize: '14px',
                        textAlign: 'center',
                        borderRight: '1px solid #E5E7EB',
                      }}>
                        主要株主 (出資比率)
                      </div>
                    </div>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 120px', 
                      backgroundColor: '#DDEBF7',
                      borderBottom: '1px solid #E5E7EB',
                    }}>
                      <div style={{ 
                        padding: '10px 16px', 
                        fontWeight: 600, 
                        fontSize: '13px',
                        borderRight: '1px solid #E5E7EB',
                      }}>
                        株主名
                      </div>
                      <div style={{ 
                        padding: '10px 16px', 
                        fontWeight: 600, 
                        fontSize: '13px',
                        textAlign: 'right',
                      }}>
                        比率
                      </div>
                    </div>
                    
                    {/* データ行 */}
                    {capitalStructureRows.map((row, index) => (
                      <div 
                        key={index}
                        style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1fr 120px', 
                          borderBottom: '1px solid #E5E7EB',
                        }}
                      >
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => {
                            const newRows = [...capitalStructureRows];
                            newRows[index].name = e.target.value;
                            setCapitalStructureRows(newRows);
                          }}
                          disabled={savingContent}
                          placeholder="株主名を入力"
                          style={{
                            padding: '10px 16px',
                            border: 'none',
                            borderRight: '1px solid #E5E7EB',
                            fontSize: '14px',
                            backgroundColor: savingContent ? '#F3F4F6' : '#FFFFFF',
                            outline: 'none',
                          }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', paddingRight: '16px' }}>
                          <input
                            type="text"
                            value={row.ratio}
                            onChange={(e) => {
                              const newRows = [...capitalStructureRows];
                              newRows[index].ratio = e.target.value;
                              setCapitalStructureRows(newRows);
                            }}
                            disabled={savingContent}
                            placeholder="%"
                            style={{
                              width: '100%',
                              padding: '10px 8px',
                              border: 'none',
                              fontSize: '14px',
                              textAlign: 'right',
                              backgroundColor: savingContent ? '#F3F4F6' : '#FFFFFF',
                              outline: 'none',
                            }}
                          />
                          <span style={{ fontSize: '14px', color: '#6B7280', marginLeft: '4px' }}>%</span>
                          {capitalStructureRows.length > 1 && (
                            <button
                              onClick={() => {
                                const newRows = capitalStructureRows.filter((_, i) => i !== index);
                                if (newRows.length === 0) {
                                  setCapitalStructureRows([{ name: '', ratio: '' }]);
                                } else {
                                  setCapitalStructureRows(newRows);
                                }
                              }}
                              disabled={savingContent}
                              style={{
                                marginLeft: '8px',
                                padding: '4px 8px',
                                backgroundColor: '#EF4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: savingContent ? 'not-allowed' : 'pointer',
                                fontSize: '12px',
                              }}
                              title="行を削除"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* 合計行 */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 120px', 
                      backgroundColor: '#F9FAFB',
                      borderTop: '2px solid #E5E7EB',
                    }}>
                      <div style={{ 
                        padding: '10px 16px', 
                        fontWeight: 600, 
                        fontSize: '14px',
                        borderRight: '1px solid #E5E7EB',
                      }}>
                        計
                      </div>
                      <div style={{ 
                        padding: '10px 16px', 
                        fontWeight: 600, 
                        fontSize: '14px',
                        textAlign: 'right',
                        color: '#374151',
                      }}>
                        {(() => {
                          const total = capitalStructureRows.reduce((sum, row) => {
                            const ratio = parseFloat(row.ratio) || 0;
                            return sum + ratio;
                          }, 0);
                          return `${total.toFixed(1)}%`;
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  {/* 行追加ボタン */}
                  <button
                    onClick={() => {
                      setCapitalStructureRows([...capitalStructureRows, { name: '', ratio: '' }]);
                    }}
                    disabled={savingContent}
                    style={{
                      marginTop: '8px',
                      padding: '6px 12px',
                      backgroundColor: '#10B981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: savingContent ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    + 行を追加
                  </button>
                </div>
                
                {/* 右側: Mermaid図 */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
                      資本構成図（Mermaid / PlantUML）
                    </label>
                    <button
                      onClick={handleGenerateMermaidDiagram}
                      disabled={savingContent || generatingDiagram || capitalStructureRows.filter(row => row.name.trim() && row.ratio.trim()).length === 0}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: (savingContent || generatingDiagram || capitalStructureRows.filter(row => row.name.trim() && row.ratio.trim()).length === 0) ? '#9CA3AF' : '#10B981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: (savingContent || generatingDiagram || capitalStructureRows.filter(row => row.name.trim() && row.ratio.trim()).length === 0) ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      {generatingDiagram ? '生成中...' : '🤖 AIに書かせる'}
                    </button>
                  </div>
                  <textarea
                    value={capitalStructureDiagramText}
                    onChange={(e) => setCapitalStructureDiagramText(e.target.value)}
                    disabled={savingContent}
                    placeholder="MermaidまたはPlantUMLのコードを入力してください&#10;&#10;Mermaid例：&#10;graph TD&#10;  A[株式会社A 60%] --> C[事業会社]&#10;  B[株式会社B 40%] --> C&#10;&#10;PlantUML例：&#10;@startuml&#10;A --> C : 60%&#10;B --> C : 40%&#10;@enduml"
                    style={{
                      width: '100%',
                      minHeight: '300px',
                      padding: '12px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      resize: 'vertical',
                      backgroundColor: savingContent ? '#F3F4F6' : '#FFFFFF',
                    }}
                  />
                  {capitalStructureDiagramText && (() => {
                    // コードがMermaidかPlantUMLかを自動判定
                    const trimmedCode = capitalStructureDiagramText.trim();
                    const isPlantUML = trimmedCode.startsWith('@startuml') || 
                                       trimmedCode.includes('@startuml') ||
                                       trimmedCode.includes('skinparam') ||
                                       trimmedCode.includes('-->') && !trimmedCode.match(/graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitgraph|journey|requirement/i);
                    const isMermaid = !isPlantUML && (
                      trimmedCode.startsWith('graph') ||
                      trimmedCode.startsWith('flowchart') ||
                      trimmedCode.startsWith('sequenceDiagram') ||
                      trimmedCode.startsWith('classDiagram') ||
                      trimmedCode.startsWith('stateDiagram') ||
                      trimmedCode.startsWith('erDiagram') ||
                      trimmedCode.startsWith('gantt') ||
                      trimmedCode.startsWith('pie') ||
                      trimmedCode.startsWith('gitgraph') ||
                      trimmedCode.startsWith('journey') ||
                      trimmedCode.startsWith('requirement')
                    );

                    return (
                      <div style={{ marginTop: '12px', padding: '16px', border: '1px solid #E5E7EB', borderRadius: '6px', backgroundColor: '#F9FAFB' }}>
                        <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
                          プレビュー: {isPlantUML ? 'PlantUML' : isMermaid ? 'Mermaid' : '自動判定中...'}
                        </div>
                        {isPlantUML ? (
                          <PlantUMLDiagram 
                            diagramCode={capitalStructureDiagramText} 
                            diagramId={`capital-structure-plantuml-${companyId || 'new'}`}
                            format="svg"
                          />
                        ) : isMermaid ? (
                          <MermaidDiagram 
                            diagramCode={capitalStructureDiagramText} 
                            diagramId={`capital-structure-mermaid-${companyId || 'new'}`}
                          />
                        ) : (
                          <div style={{ padding: '20px', textAlign: 'center', color: '#6B7280' }}>
                            コード形式を判定中... または未対応の形式です。
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* 左側: 資本構成テーブル表示 */}
                <div>
                  {(() => {
                    try {
                      const parsed = companyContent?.capitalStructure ? JSON.parse(companyContent.capitalStructure) : null;
                      if (parsed && Array.isArray(parsed) && parsed.length > 0 && parsed.some((row: any) => row.name || row.ratio)) {
                        const validRows = parsed.filter((row: any) => row.name || row.ratio);
                        const total = validRows.reduce((sum: number, row: any) => {
                          const ratio = parseFloat(row.ratio) || 0;
                          return sum + ratio;
                        }, 0);
                        
                        return (
                          <div style={{ border: '1px solid #E5E7EB', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                            {/* テーブルヘッダー */}
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: '1fr auto', 
                              backgroundColor: '#DDEBF7',
                              borderBottom: '1px solid #E5E7EB',
                            }}>
                              <div style={{ 
                                padding: '12px 16px', 
                                fontWeight: 600, 
                                fontSize: '14px',
                                textAlign: 'center',
                                borderRight: '1px solid #E5E7EB',
                              }}>
                                主要株主 (出資比率)
                              </div>
                            </div>
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: '1fr 120px', 
                              backgroundColor: '#DDEBF7',
                              borderBottom: '1px solid #E5E7EB',
                            }}>
                              <div style={{ 
                                padding: '10px 16px', 
                                fontWeight: 600, 
                                fontSize: '13px',
                                borderRight: '1px solid #E5E7EB',
                              }}>
                                株主名
                              </div>
                              <div style={{ 
                                padding: '10px 16px', 
                                fontWeight: 600, 
                                fontSize: '13px',
                                textAlign: 'right',
                              }}>
                                比率
                              </div>
                            </div>
                            
                            {/* データ行 */}
                            {validRows.map((row: any, index: number) => (
                              <div 
                                key={index}
                                style={{ 
                                  display: 'grid', 
                                  gridTemplateColumns: '1fr 120px', 
                                  borderBottom: '1px solid #E5E7EB',
                                }}
                              >
                                <div style={{ 
                                  padding: '10px 16px', 
                                  fontSize: '14px',
                                  borderRight: '1px solid #E5E7EB',
                                }}>
                                  {row.name || '-'}
                                </div>
                                <div style={{ 
                                  padding: '10px 16px', 
                                  fontSize: '14px',
                                  textAlign: 'right',
                                }}>
                                  {row.ratio ? `${row.ratio}%` : '-'}
                                </div>
                              </div>
                            ))}
                            
                            {/* 合計行 */}
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: '1fr 120px', 
                              backgroundColor: '#F9FAFB',
                              borderTop: '2px solid #E5E7EB',
                            }}>
                              <div style={{ 
                                padding: '10px 16px', 
                                fontWeight: 600, 
                                fontSize: '14px',
                                borderRight: '1px solid #E5E7EB',
                              }}>
                                計
                              </div>
                              <div style={{ 
                                padding: '10px 16px', 
                                fontWeight: 600, 
                                fontSize: '14px',
                                textAlign: 'right',
                                color: '#374151',
                              }}>
                                {total.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        );
                      }
                    } catch (e) {
                      // JSONパースエラー
                    }
                    return (
                      <p style={{ color: 'var(--color-text-light)', padding: '20px', textAlign: 'center' }}>
                        資本構成が登録されていません
                      </p>
                    );
                  })()}
                </div>
                
                {/* 右側: Mermaid図表示 */}
                <div>
                  {companyContent?.capitalStructureDiagram ? (() => {
                    // コードがMermaidかPlantUMLかを自動判定
                    const trimmedCode = companyContent.capitalStructureDiagram.trim();
                    const isPlantUML = trimmedCode.startsWith('@startuml') || 
                                       trimmedCode.includes('@startuml') ||
                                       trimmedCode.includes('skinparam') ||
                                       trimmedCode.includes('-->') && !trimmedCode.match(/graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitgraph|journey|requirement/i);
                    const isMermaid = !isPlantUML && (
                      trimmedCode.startsWith('graph') ||
                      trimmedCode.startsWith('flowchart') ||
                      trimmedCode.startsWith('sequenceDiagram') ||
                      trimmedCode.startsWith('classDiagram') ||
                      trimmedCode.startsWith('stateDiagram') ||
                      trimmedCode.startsWith('erDiagram') ||
                      trimmedCode.startsWith('gantt') ||
                      trimmedCode.startsWith('pie') ||
                      trimmedCode.startsWith('gitgraph') ||
                      trimmedCode.startsWith('journey') ||
                      trimmedCode.startsWith('requirement')
                    );

                    return (
                      <div style={{ 
                        padding: '16px', 
                        backgroundColor: '#F9FAFB', 
                        borderRadius: '8px',
                      }}>
                        {isPlantUML ? (
                          <PlantUMLDiagram 
                            diagramCode={companyContent.capitalStructureDiagram} 
                            diagramId={`capital-structure-display-plantuml-${companyId || 'unknown'}`}
                            format="svg"
                          />
                        ) : isMermaid ? (
                          <MermaidDiagram 
                            diagramCode={companyContent.capitalStructureDiagram} 
                            diagramId={`capital-structure-display-mermaid-${companyId || 'unknown'}`}
                          />
                        ) : (
                          <div style={{ padding: '20px', textAlign: 'center', color: '#6B7280' }}>
                            コード形式を判定できませんでした。
                          </div>
                        )}
                      </div>
                    );
                  })() : (
                    <p style={{ color: 'var(--color-text-light)', padding: '20px', textAlign: 'center' }}>
                      資本構成図が登録されていません
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {(editingCapitalStructure || editingCapitalStructureDiagram) && (
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  onClick={() => {
                    setEditingCapitalStructure(false);
                    setEditingCapitalStructureDiagram(false);
                    // 既存データを読み込む
                    try {
                      if (companyContent?.capitalStructure) {
                        const parsed = JSON.parse(companyContent.capitalStructure);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                          setCapitalStructureRows(parsed);
                        } else {
                          setCapitalStructureRows([{ name: '', ratio: '' }]);
                        }
                      } else {
                        setCapitalStructureRows([{ name: '', ratio: '' }]);
                      }
                    } catch {
                      setCapitalStructureRows([{ name: '', ratio: '' }]);
                    }
                    setCapitalStructureDiagramText(companyContent?.capitalStructureDiagram || '');
                  }}
                  disabled={savingContent}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6B7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: savingContent ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveCapitalStructure}
                  disabled={savingContent}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: savingContent ? '#9CA3AF' : '#10B981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: savingContent ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {savingContent ? '保存中...' : '保存'}
                </button>
              </div>
            )}
          </div>

                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
                    その他
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <strong>位置:</strong> {company.position}
                    </div>
                    <div>
                      <strong>作成日:</strong> {new Date(company.createdAt).toLocaleDateString('ja-JP')}
                    </div>
                    <div>
                      <strong>更新日:</strong> {new Date(company.updatedAt).toLocaleDateString('ja-JP')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'focusBusinesses' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                注力事業
              </h3>
              {!editingFocusBusinesses && (
                <button
                  onClick={() => {
                    setFocusBusinessesText(companyContent?.focusBusinesses || '');
                    setEditingFocusBusinesses(true);
                  }}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  編集
                </button>
              )}
            </div>
            
            {editingFocusBusinesses ? (
              <div>
                <textarea
                  value={focusBusinessesText}
                  onChange={(e) => setFocusBusinessesText(e.target.value)}
                  disabled={savingContent}
                  style={{
                    width: '100%',
                    minHeight: '200px',
                    padding: '12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                  placeholder="注力事業を入力してください"
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    onClick={() => {
                      setEditingFocusBusinesses(false);
                      setFocusBusinessesText(companyContent?.focusBusinesses || '');
                    }}
                    disabled={savingContent}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#6B7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: savingContent ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSaveFocusBusinesses}
                    disabled={savingContent}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: savingContent ? '#9CA3AF' : '#10B981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: savingContent ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    {savingContent ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {companyContent?.focusBusinesses ? (
                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: '#F9FAFB', 
                    borderRadius: '8px',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6',
                    color: 'var(--color-text)',
                  }}>
                    {companyContent.focusBusinesses}
                  </div>
                ) : (
                  <p style={{ color: 'var(--color-text-light)', padding: '20px', textAlign: 'center' }}>
                    注力事業が登録されていません
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'focusInitiatives' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                注力施策 ({focusInitiatives.length}件)
              </h3>
              <button
                onClick={handleOpenAddInitiativeModal}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                + 追加
              </button>
            </div>
            {focusInitiatives.length === 0 ? (
              <p style={{ color: 'var(--color-text-light)', padding: '20px', textAlign: 'center' }}>
                注力施策が登録されていません
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {focusInitiatives.map((initiative) => (
                  <div
                    key={initiative.id}
                    style={{
                      padding: '16px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      transition: 'all 0.2s ease',
                      cursor: editingInitiativeId !== initiative.id ? 'pointer' : 'default',
                    }}
                    onClick={() => {
                      if (editingInitiativeId !== initiative.id) {
                        router.push(`/organization/initiative?companyId=${companyId}&initiativeId=${initiative.id}`);
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (editingInitiativeId !== initiative.id) {
                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                        e.currentTarget.style.borderColor = '#3B82F6';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (editingInitiativeId !== initiative.id) {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#E5E7EB';
                      }
                    }}
                  >
                    {editingInitiativeId === initiative.id ? (
                      <div>
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          autoFocus
                          disabled={savingInitiative}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '2px solid #3B82F6',
                            borderRadius: '6px',
                            fontSize: '16px',
                            fontWeight: 600,
                            marginBottom: '8px',
                            backgroundColor: savingInitiative ? '#F3F4F6' : '#FFFFFF',
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEdit(initiative.id);
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={handleCancelEdit}
                            disabled={savingInitiative}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#6B7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: savingInitiative ? 'not-allowed' : 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            キャンセル
                          </button>
                          <button
                            onClick={() => handleSaveEdit(initiative.id)}
                            disabled={savingInitiative || !editingTitle.trim()}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: savingInitiative || !editingTitle.trim() ? '#9CA3AF' : '#10B981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: savingInitiative || !editingTitle.trim() ? 'not-allowed' : 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            {savingInitiative ? '保存中...' : '保存'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <h4 style={{ 
                            fontSize: '16px', 
                            fontWeight: 600, 
                            color: 'var(--color-text)',
                            flex: 1,
                          }}>
                            {initiative.title}
                          </h4>
                          <div style={{ display: 'flex', gap: '4px', marginLeft: '8px', alignItems: 'center' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleStartEdit(initiative);
                              }}
                              disabled={savingInitiative}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                padding: 0,
                                backgroundColor: 'transparent',
                                color: '#6B7280',
                                border: 'none',
                                cursor: savingInitiative ? 'not-allowed' : 'pointer',
                                borderRadius: '4px',
                              }}
                              onMouseEnter={(e) => {
                                if (!savingInitiative) {
                                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                                  e.currentTarget.style.color = '#374151';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!savingInitiative) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                  e.currentTarget.style.color = '#6B7280';
                                }
                              }}
                              title="編集"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleDeleteInitiative(initiative.id);
                              }}
                              disabled={savingInitiative}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                padding: 0,
                                backgroundColor: 'transparent',
                                color: '#EF4444',
                                border: 'none',
                                cursor: savingInitiative ? 'not-allowed' : 'pointer',
                                borderRadius: '4px',
                              }}
                              onMouseEnter={(e) => {
                                if (!savingInitiative) {
                                  e.currentTarget.style.backgroundColor = '#FEE2E2';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!savingInitiative) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }
                              }}
                              title="削除"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'meetingNotes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                議事録 ({meetingNotes.length}件)
              </h3>
              <button
                onClick={handleOpenAddMeetingNoteModal}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                + 追加
              </button>
            </div>
            {meetingNotes.length === 0 ? (
              <p style={{ color: 'var(--color-text-light)', padding: '20px', textAlign: 'center' }}>
                議事録が登録されていません
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {meetingNotes.map((note) => (
                  <div
                    key={note.id}
                    style={{
                      padding: '16px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      transition: 'all 0.2s ease',
                      cursor: editingMeetingNoteId !== note.id ? 'pointer' : 'default',
                    }}
                    onClick={() => {
                      if (editingMeetingNoteId !== note.id) {
                        router.push(`/organization/detail/meeting?companyId=${companyId}&meetingId=${note.id}`);
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (editingMeetingNoteId !== note.id) {
                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                        e.currentTarget.style.borderColor = '#3B82F6';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (editingMeetingNoteId !== note.id) {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#E5E7EB';
                      }
                    }}
                  >
                    {editingMeetingNoteId === note.id ? (
                      <div>
                        <input
                          type="text"
                          value={editingMeetingNoteTitle}
                          onChange={(e) => setEditingMeetingNoteTitle(e.target.value)}
                          autoFocus
                          disabled={savingMeetingNote}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '2px solid #3B82F6',
                            borderRadius: '6px',
                            fontSize: '16px',
                            fontWeight: 600,
                            marginBottom: '8px',
                            backgroundColor: savingMeetingNote ? '#F3F4F6' : '#FFFFFF',
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEditMeetingNote(note.id);
                            } else if (e.key === 'Escape') {
                              handleCancelEditMeetingNote();
                            }
                          }}
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={handleCancelEditMeetingNote}
                            disabled={savingMeetingNote}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#6B7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: savingMeetingNote ? 'not-allowed' : 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            キャンセル
                          </button>
                          <button
                            onClick={() => handleSaveEditMeetingNote(note.id)}
                            disabled={savingMeetingNote || !editingMeetingNoteTitle.trim()}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: savingMeetingNote || !editingMeetingNoteTitle.trim() ? '#9CA3AF' : '#10B981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: savingMeetingNote || !editingMeetingNoteTitle.trim() ? 'not-allowed' : 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            {savingMeetingNote ? '保存中...' : '保存'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <h4 style={{ 
                            fontSize: '16px', 
                            fontWeight: 600, 
                            color: 'var(--color-text)',
                            flex: 1,
                          }}>
                            {note.title}
                          </h4>
                          <div style={{ display: 'flex', gap: '4px', marginLeft: '8px', alignItems: 'center' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleStartEditMeetingNote(note);
                              }}
                              disabled={savingMeetingNote}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                padding: 0,
                                backgroundColor: 'transparent',
                                color: '#6B7280',
                                border: 'none',
                                cursor: savingMeetingNote ? 'not-allowed' : 'pointer',
                                borderRadius: '4px',
                              }}
                              title="編集"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleDeleteMeetingNote(note.id);
                              }}
                              disabled={savingMeetingNote}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                padding: 0,
                                backgroundColor: 'transparent',
                                color: '#EF4444',
                                border: 'none',
                                cursor: savingMeetingNote ? 'not-allowed' : 'pointer',
                                borderRadius: '4px',
                              }}
                              title="削除"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        {note.description && (
                          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px', lineHeight: '1.5' }}>
                            {note.description}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 注力施策追加モーダル */}
        {showAddInitiativeModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => {
              if (!savingInitiative) {
                setShowAddInitiativeModal(false);
              }
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '32px',
                width: '90%',
                maxWidth: '560px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700' }}>
                注力施策を追加
              </h3>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  タイトル <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newInitiativeTitle}
                  onChange={(e) => setNewInitiativeTitle(e.target.value)}
                  disabled={savingInitiative}
                  placeholder="注力施策のタイトルを入力"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: savingInitiative ? '#F3F4F6' : '#FFFFFF',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !savingInitiative && newInitiativeTitle.trim()) {
                      handleAddInitiative();
                    }
                  }}
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  説明
                </label>
                <textarea
                  value={newInitiativeDescription}
                  onChange={(e) => setNewInitiativeDescription(e.target.value)}
                  disabled={savingInitiative}
                  placeholder="注力施策の説明を入力（オプション）"
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    backgroundColor: savingInitiative ? '#F3F4F6' : '#FFFFFF',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowAddInitiativeModal(false);
                    setNewInitiativeTitle('');
                    setNewInitiativeDescription('');
                  }}
                  disabled={savingInitiative}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#F3F4F6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: savingInitiative ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddInitiative}
                  disabled={savingInitiative || !newInitiativeTitle.trim()}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: savingInitiative || !newInitiativeTitle.trim() ? '#9CA3AF' : '#10B981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: savingInitiative || !newInitiativeTitle.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {savingInitiative ? '追加中...' : '追加'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 議事録追加モーダル */}
        {showAddMeetingNoteModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => {
              if (!savingMeetingNote) {
                setShowAddMeetingNoteModal(false);
              }
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '32px',
                width: '90%',
                maxWidth: '560px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700' }}>
                議事録を追加
              </h3>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  タイトル <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newMeetingNoteTitle}
                  onChange={(e) => setNewMeetingNoteTitle(e.target.value)}
                  disabled={savingMeetingNote}
                  placeholder="議事録のタイトルを入力"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: savingMeetingNote ? '#F3F4F6' : '#FFFFFF',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !savingMeetingNote && newMeetingNoteTitle.trim()) {
                      handleAddMeetingNote();
                    }
                  }}
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  説明
                </label>
                <textarea
                  value={newMeetingNoteDescription}
                  onChange={(e) => setNewMeetingNoteDescription(e.target.value)}
                  disabled={savingMeetingNote}
                  placeholder="議事録の説明を入力（オプション）"
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    backgroundColor: savingMeetingNote ? '#F3F4F6' : '#FFFFFF',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowAddMeetingNoteModal(false);
                    setNewMeetingNoteTitle('');
                    setNewMeetingNoteDescription('');
                  }}
                  disabled={savingMeetingNote}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#F3F4F6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: savingMeetingNote ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddMeetingNote}
                  disabled={savingMeetingNote || !newMeetingNoteTitle.trim()}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: savingMeetingNote || !newMeetingNoteTitle.trim() ? '#9CA3AF' : '#10B981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: savingMeetingNote || !newMeetingNoteTitle.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {savingMeetingNote ? '追加中...' : '追加'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 注力施策削除確認モーダル */}
        {showDeleteConfirmModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => {
              if (!savingInitiative) {
                cancelDeleteInitiative();
              }
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '32px',
                width: '90%',
                maxWidth: '400px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '700', color: '#EF4444' }}>
                削除の確認
              </h3>
              <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                {focusInitiatives.find(i => i.id === deleteTargetInitiativeId)?.title || 'この注力施策'}を削除しますか？
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={cancelDeleteInitiative}
                  disabled={savingInitiative}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#F3F4F6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: savingInitiative ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmDeleteInitiative}
                  disabled={savingInitiative}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: savingInitiative ? '#9CA3AF' : '#EF4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: savingInitiative ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {savingInitiative ? '削除中...' : '削除'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 議事録削除確認モーダル */}
        {showDeleteMeetingNoteConfirmModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => {
              if (!savingMeetingNote) {
                cancelDeleteMeetingNote();
              }
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '32px',
                width: '90%',
                maxWidth: '400px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '700', color: '#EF4444' }}>
                削除の確認
              </h3>
              <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                {meetingNotes.find(n => n.id === deleteTargetMeetingNoteId)?.title || 'この議事録'}を削除しますか？
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={cancelDeleteMeetingNote}
                  disabled={savingMeetingNote}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#F3F4F6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: savingMeetingNote ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmDeleteMeetingNote}
                  disabled={savingMeetingNote}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: savingMeetingNote ? '#9CA3AF' : '#EF4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: savingMeetingNote ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {savingMeetingNote ? '削除中...' : '削除'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 組織追加モーダル */}
        {showAddModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => {
              if (!saving) {
                setShowAddModal(false);
                setSelectedOrganizationIds([]);
              }
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '32px',
                width: '90%',
                maxWidth: '560px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '700' }}>
                表示組織を編集
              </h3>
              <p style={{ margin: '0 0 24px 0', fontSize: '12px', color: '#6B7280' }}>
                組織を選択すると、その上位組織にも自動的に表示されます。チェックを外すと削除されます。
              </p>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600' }}>
                    組織（複数選択可）
                  </label>
                  {organizations && (
                    <button
                      onClick={handleSelectAll}
                      disabled={saving}
                      style={{
                        padding: '4px 12px',
                        backgroundColor: '#F3F4F6',
                        color: '#374151',
                        border: '1px solid #D1D5DB',
                        borderRadius: '4px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      {selectedOrganizationIds.length > 0 ? 'すべて解除' : 'すべて選択'}
                    </button>
                  )}
                </div>
                <div
                  style={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    padding: '8px',
                    backgroundColor: saving ? '#F3F4F6' : '#FFFFFF',
                  }}
                >
                  {organizations && renderOrganizationTree(organizations)}
                  {organizations && flattenOrganizations(organizations)
                    .filter(org => !organizationDisplays.some(d => d.organizationId === org.id))
                    .length === 0 && (
                    <p style={{ padding: '16px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
                      追加できる組織がありません
                    </p>
                  )}
                </div>
                {selectedOrganizationIds.length > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280' }}>
                    {selectedOrganizationIds.length}件選択中
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedOrganizationIds([]);
                  }}
                  disabled={saving}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#F3F4F6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveDisplay}
                  disabled={saving}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: saving ? '#9CA3AF' : '#3B82F6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {saving ? '保存中...' : `保存 (${selectedOrganizationIds.length}件選択中)`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function CompanyDetailPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p>読み込み中...</p>
        </div>
      </Layout>
    }>
      <CompanyDetailPageContent />
    </Suspense>
  );
}
