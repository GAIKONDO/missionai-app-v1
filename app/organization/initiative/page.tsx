'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { getFocusInitiativeById, saveFocusInitiative, getOrgTreeFromDb, getThemes, type Theme, getAllTopics, getAllTopicsBatch, type TopicInfo, getAllMeetingNotes, getTopicsByMeetingNote, getAllOrganizationsFromTree, findOrganizationById, getMeetingNoteById, type MeetingNote, getOrgMembers } from '@/lib/orgApi';
// import { getCompanyById, getAllCompanies, getCompanyMeetingNotes, type Company, type CompanyMeetingNote } from '@/lib/companiesApi';
import { updateInitiative } from '@/lib/focusInitiativeService';
import type { FocusInitiative, OrgNodeData } from '@/lib/orgApi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAvailableOllamaModels } from '@/lib/pageGeneration';
import dynamic from 'next/dynamic';
import MermaidLoader from '@/components/MermaidLoader';
import InitiativeCauseEffectDiagram from '@/components/InitiativeCauseEffectDiagram';
import CauseEffectDiagramUpdateModal from '@/components/CauseEffectDiagramUpdateModal';
import MonetizationDiagramUpdateModal from '@/components/MonetizationDiagramUpdateModal';
import RelationDiagramUpdateModal from '@/components/RelationDiagramUpdateModal';
import { generateUniqueId } from '@/lib/orgApi';

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

// アイコンコンポーネント
const SaveIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
    <polyline points="17 21 17 13 7 13 7 21"></polyline>
    <polyline points="7 3 7 8 15 8"></polyline>
  </svg>
);

const DownloadIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const BackIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5"></path>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

// MermaidDiagramを動的にインポート（SSRを無効化）
const MermaidDiagram = dynamic(
  () => import('@/components/pages/component-test/test-concept/MermaidDiagram'),
  { ssr: false }
);

type TabType = 'overview' | 'details' | 'periods' | 'relations' | 'monetization' | 'relation';

function FocusInitiativeDetailPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const organizationId = searchParams?.get('organizationId') as string;
  const initiativeId = searchParams?.get('initiativeId') as string;
  
  const [initiative, setInitiative] = useState<FocusInitiative | null>(null);
  const [orgData, setOrgData] = useState<OrgNodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [saving, setSaving] = useState(false);
  
  // 編集用のローカル状態
  const [localAssignee, setLocalAssignee] = useState<string[]>([]);
  const [localDescription, setLocalDescription] = useState('');
  const [localMethod, setLocalMethod] = useState<string[]>([]);
  const [localMethodOther, setLocalMethodOther] = useState('');
  const [localMeans, setLocalMeans] = useState<string[]>([]);
  const [localMeansOther, setLocalMeansOther] = useState('');
  const [localObjective, setLocalObjective] = useState('');
  const [localConsiderationPeriod, setLocalConsiderationPeriod] = useState('');
  const [localExecutionPeriod, setLocalExecutionPeriod] = useState('');
  const [localMonetizationPeriod, setLocalMonetizationPeriod] = useState('');
  const [localRelatedOrganizations, setLocalRelatedOrganizations] = useState<string[]>([]);
  const [localRelatedGroupCompanies, setLocalRelatedGroupCompanies] = useState<string[]>([]);
  const [localMonetizationDiagram, setLocalMonetizationDiagram] = useState('');
  const [localRelationDiagram, setLocalRelationDiagram] = useState('');
  const [isEditingMonetization, setIsEditingMonetization] = useState(false);
  const [isEditingRelation, setIsEditingRelation] = useState(false);
  const [isEditingCauseEffect, setIsEditingCauseEffect] = useState(false);
  const [localCauseEffectCode, setLocalCauseEffectCode] = useState('');
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [themes, setThemes] = useState<Theme[]>([]);
  const [localThemeIds, setLocalThemeIds] = useState<string[]>([]);
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [localTopicIds, setLocalTopicIds] = useState<string[]>([]);
  const [isTopicsExpanded, setIsTopicsExpanded] = useState(false); // 個別トピックセクションの開閉状態
  const [isTopicSelectModalOpen, setIsTopicSelectModalOpen] = useState(false);
  const [topicSearchQuery, setTopicSearchQuery] = useState('');
  const [allOrganizations, setAllOrganizations] = useState<Array<{ id: string; name: string; title?: string }>>([]);
  const [allMeetingNotes, setAllMeetingNotes] = useState<MeetingNote[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedMeetingNoteId, setSelectedMeetingNoteId] = useState<string>('');
  const [modalTopics, setModalTopics] = useState<TopicInfo[]>([]);
  const [orgTreeForModal, setOrgTreeForModal] = useState<OrgNodeData | null>(null);
  const [orgIdInput, setOrgIdInput] = useState<string>('');
  const [meetingNoteIdInput, setMeetingNoteIdInput] = useState<string>('');
  const [filteredMeetingNotes, setFilteredMeetingNotes] = useState<MeetingNote[]>([]);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isMonetizationUpdateModalOpen, setIsMonetizationUpdateModalOpen] = useState(false);
  const [isRelationUpdateModalOpen, setIsRelationUpdateModalOpen] = useState(false);
  const [orgMembers, setOrgMembers] = useState<Array<{ id: string; name: string; position?: string }>>([]);
  const [allOrgMembers, setAllOrgMembers] = useState<Array<{ id: string; name: string; position?: string; organizationId?: string }>>([]);
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');
  const [manualAssigneeInput, setManualAssigneeInput] = useState('');
  const assigneeInputRef = useRef<HTMLInputElement>(null);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  
  // AI作文モーダル関連
  const [isAIGenerationModalOpen, setIsAIGenerationModalOpen] = useState(false);
  const [aiGenerationTarget, setAIGenerationTarget] = useState<'description' | 'objective' | null>(null);
  const [aiGenerationInput, setAIGenerationInput] = useState('');
  const [selectedTopicIdsForAI, setSelectedTopicIdsForAI] = useState<string[]>([]);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiSummaryFormat, setAiSummaryFormat] = useState<'auto' | 'bullet' | 'paragraph' | 'custom'>('auto');
  const [aiSummaryLength, setAiSummaryLength] = useState<number>(500);
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');
  const [descriptionTextareaId] = useState(() => generateUniqueId());
  const [objectiveTextareaId] = useState(() => generateUniqueId());
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingObjective, setIsEditingObjective] = useState(false);
  
  // AI生成結果の比較用
  const [aiGeneratedContent, setAiGeneratedContent] = useState<string | null>(null);
  const [aiGeneratedTarget, setAiGeneratedTarget] = useState<'description' | 'objective' | null>(null);
  const [originalContent, setOriginalContent] = useState<string | null>(null);
  
  // AIモデル選択関連
  const [aiModelType, setAiModelType] = useState<'gpt' | 'local'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aiGenerationModelType');
      return (saved as 'gpt' | 'local') || 'gpt';
    }
    return 'gpt';
  });
  const [aiSelectedModel, setAiSelectedModel] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aiGenerationSelectedModel');
      return saved || 'gpt-4o-mini';
    }
    return 'gpt-4o-mini';
  });
  const [aiLocalModels, setAiLocalModels] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingAiLocalModels, setLoadingAiLocalModels] = useState(false);
  
  // GPTモデルリスト
  const gptModels = [
    { value: 'gpt-5.1', label: 'gpt-5.1' },
    { value: 'gpt-5', label: 'gpt-5' },
    { value: 'gpt-5-mini', label: 'gpt-5-mini' },
    { value: 'gpt-5-nano', label: 'gpt-5-nano' },
    { value: 'gpt-4.1', label: 'gpt-4.1' },
    { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
    { value: 'gpt-4.1-nano', label: 'gpt-4.1-nano' },
    { value: 'gpt-4o', label: 'gpt-4o' },
    { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
  ];
  
  const availableAiModels = aiModelType === 'gpt' ? gptModels : aiLocalModels;
  
  // 自動保存は無効化（手動保存のみ）
  const isInitialLoadRef = useRef(true);
  
  // ローカルモデルを読み込む
  useEffect(() => {
    if (aiModelType === 'local' && isAIGenerationModalOpen) {
      loadAiLocalModels();
    }
  }, [aiModelType, isAIGenerationModalOpen]);
  
  const loadAiLocalModels = async () => {
    setLoadingAiLocalModels(true);
    try {
      const models = await getAvailableOllamaModels();
      if (models.length > 0) {
        const formattedModels = models.map(model => {
          let label = model.name;
          if (model.name.includes(':')) {
            const [name, tag] = model.name.split(':');
            const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
            const spacedName = formattedName.replace(/([a-z])(\d)/g, '$1 $2');
            if (tag === 'latest') {
              label = `${spacedName} (Latest)`;
            } else {
              const formattedTag = tag.replace(/(\d)([a-z])/g, (match, num, letter) => `${num}${letter.toUpperCase()}`);
              label = `${spacedName} ${formattedTag}`;
            }
          } else {
            label = model.name.charAt(0).toUpperCase() + model.name.slice(1);
          }
          return { value: model.name, label };
        });
        setAiLocalModels(formattedModels);
        if (formattedModels.length > 0 && !aiSelectedModel.startsWith('gpt')) {
          setAiSelectedModel(formattedModels[0].value);
        }
      } else {
        setAiLocalModels([]);
      }
    } catch (error) {
      console.error('ローカルモデルの取得エラー:', error);
      setAiLocalModels([]);
    } finally {
      setLoadingAiLocalModels(false);
    }
  };
  
  // AI要約生成関数
  const generateAISummary = async (inputText: string, selectedTopics: TopicInfo[]): Promise<string> => {
    try {
      setIsAIGenerating(true);
      
      // トピックの内容を結合
      const topicsContent = selectedTopics.map(topic => `【${topic.title}】\n${topic.content}`).join('\n\n');
      
      // 要約形式に応じた指示を生成
      let formatInstruction = '';
      switch (aiSummaryFormat) {
        case 'bullet':
          formatInstruction = `箇条書き形式で要約を作成してください。各項目は「-」または「1.」で始まる箇条書きとして出力してください。`;
          break;
        case 'paragraph':
          formatInstruction = `段落形式で要約を作成してください。複数の段落に分けて、読みやすい文章として出力してください。`;
          break;
        case 'custom':
          formatInstruction = aiCustomPrompt || '要約を作成してください。';
          break;
        case 'auto':
        default:
          formatInstruction = `以下のマークダウン記法を使用して、読みやすく構造化された要約を作成してください：
- 見出し（##, ###）でセクションを分ける
- 箇条書き（- または 1.）で重要なポイントを列挙
- **太字**で重要なキーワードを強調
- 必要に応じて段落を分けて読みやすくする`;
          break;
      }
      
      // プロンプトを作成（マークダウン形式で出力するように指示）
      const systemPrompt = `あなたはビジネス文書の要約を専門とするアシスタントです。提供された情報を基に、約${aiSummaryLength}文字で簡潔かつ明確な要約をマークダウン記法で作成してください。

${formatInstruction}

出力は必ずマークダウン形式で、プレーンテキストではなく、適切にフォーマットされたマークダウンとして出力してください。`;
      
      const userPrompt = `以下の情報を基に、約${aiSummaryLength}文字で要約をマークダウン形式で作成してください。\n\n${inputText ? `【概要】\n${inputText}\n\n` : ''}${topicsContent ? `【関連トピック】\n${topicsContent}` : ''}`;
      
      // モデルタイプに応じてAPIを呼び出し
      const isLocalModel = aiSelectedModel.startsWith('qwen') || 
                           aiSelectedModel.startsWith('llama') || 
                           aiSelectedModel.startsWith('mistral') ||
                           aiSelectedModel.includes(':latest') ||
                           aiSelectedModel.includes(':instruct');
      
      if (isLocalModel || aiModelType === 'local') {
        // Ollama APIを呼び出し
        const apiUrl = process.env.NEXT_PUBLIC_OLLAMA_API_URL || 'http://localhost:11434/api/chat';
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: aiSelectedModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            stream: false,
            options: {
              temperature: 0.7,
              num_predict: 800,
            },
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Ollama APIエラー: ${response.status} ${response.statusText}. ${errorText}`);
        }
        
        const data = await response.json();
        const summary = data.message?.content?.trim() || '';
        
        if (!summary) {
          throw new Error('AIからの応答が空でした');
        }
        
        return summary;
      } else {
        // OpenAI APIを呼び出し
        // APIキーを取得: 設定ページ > localStorage > 環境変数の順
        let apiKey: string | undefined;
        if (typeof window !== 'undefined') {
          try {
            const { getAPIKey } = await import('@/lib/security');
            apiKey = getAPIKey('openai') || undefined;
          } catch (error) {
            // セキュリティモジュールがない場合は直接localStorageから取得
            apiKey = localStorage.getItem('NEXT_PUBLIC_OPENAI_API_KEY') || undefined;
          }
        }
        if (!apiKey) {
          apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
        }
        
        if (!apiKey) {
          throw new Error('OpenAI APIキーが設定されていません。設定ページ（/settings）でAPIキーを設定してください。');
        }
        
        const requestBody: any = {
          model: aiSelectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
        };
        
        if (aiSelectedModel.startsWith('gpt-5')) {
          requestBody.max_completion_tokens = 800;
        } else {
          requestBody.max_tokens = 800;
          requestBody.temperature = 0.7;
        }
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
        const summary = data.choices?.[0]?.message?.content?.trim() || '';
        
        if (!summary) {
          throw new Error('AIからの応答が空でした');
        }
        
        return summary;
      }
    } catch (error) {
      console.error('AI要約生成エラー:', error);
      throw error;
    } finally {
      setIsAIGenerating(false);
    }
  };
  
  // モデルタイプとモデル選択の変更を保存
  useEffect(() => {
    if (aiModelType) {
      localStorage.setItem('aiGenerationModelType', aiModelType);
    }
  }, [aiModelType]);
  
  useEffect(() => {
    if (aiSelectedModel) {
      localStorage.setItem('aiGenerationSelectedModel', aiSelectedModel);
    }
  }, [aiSelectedModel]);
  
  // 類似検索用のヘルパー関数
  const isSimilarMatch = (query: string, text: string): boolean => {
    if (!query || !text) return false;
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    
    // 完全一致または部分一致
    if (textLower.includes(queryLower)) return true;
    
    // 文字列の各文字が順序通りに含まれているかチェック（例: "yam" は "yamada" にマッチ）
    let queryIndex = 0;
    for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
      if (textLower[i] === queryLower[queryIndex]) {
        queryIndex++;
      }
    }
    if (queryIndex === queryLower.length) return true;
    
    // 文字列の類似度を簡易計算（入力文字列の50%以上の文字が含まれているか）
    const queryChars = queryLower.split('');
    const matchedChars = queryChars.filter(char => textLower.includes(char)).length;
    if (matchedChars / queryChars.length >= 0.5) return true;
    
    return false;
  };
  
  // 手動保存を実行する関数
  const handleManualSave = useCallback(async () => {
    if (!initiative) return;
    
    // 保存するデータを構築
    const dataToSave: Partial<FocusInitiative> = {
      ...initiative,
      content: editingContent,
      assignee: localAssignee.length > 0 ? localAssignee.join(', ') : undefined,
      description: localDescription,
      method: localMethod,
      methodOther: localMethodOther,
      means: localMeans,
      meansOther: localMeansOther,
      objective: localObjective,
      considerationPeriod: localConsiderationPeriod,
      executionPeriod: localExecutionPeriod,
      monetizationPeriod: localMonetizationPeriod,
      relatedOrganizations: localRelatedOrganizations,
      relatedGroupCompanies: localRelatedGroupCompanies,
      monetizationDiagram: localMonetizationDiagram,
      relationDiagram: localRelationDiagram,
      themeIds: Array.isArray(localThemeIds) ? localThemeIds : (localThemeIds ? [localThemeIds] : []),
      topicIds: Array.isArray(localTopicIds) ? localTopicIds : (localTopicIds ? [localTopicIds] : []),
      // 特性要因図のコードからデータを更新
      ...(() => {
        try {
          if (localCauseEffectCode) {
            const parsed = JSON.parse(localCauseEffectCode);
            return {
              method: parsed.method || localMethod,
              means: parsed.means || localMeans,
              objective: parsed.objective || localObjective,
            };
          }
        } catch (e) {
          // パースエラーの場合は既存のデータを使用
        }
        return {};
      })(),
    };
    
    devLog('💾 [handleManualSave] 保存開始:', {
      initiativeId,
      contentLength: dataToSave.content?.length || 0,
      themeIdsCount: Array.isArray(dataToSave.themeIds) ? dataToSave.themeIds.length : 0,
      topicIdsCount: Array.isArray(dataToSave.topicIds) ? dataToSave.topicIds.length : 0,
    });
    
    try {
      setSavingStatus('saving');
      
      // データを保存
      await saveFocusInitiative(dataToSave);
      
      devLog('✅ [handleManualSave] 保存成功');
      
      // 保存したデータでinitiative状態を更新（再取得せずに保存したデータを使用）
      const updatedInitiative: FocusInitiative = {
        ...initiative,
        ...dataToSave,
      } as FocusInitiative;
      
      setInitiative(updatedInitiative);
      
      // ローカル状態も保存したデータで更新（これにより、保存した内容が画面に反映される）
      // ユーザーが編集した内容は既にdataToSaveに含まれているので、それをそのまま反映する
      setEditingContent(dataToSave.content || '');
      setLocalAssignee(Array.isArray(dataToSave.assignee) ? dataToSave.assignee : (dataToSave.assignee ? [dataToSave.assignee] : []));
      setLocalDescription(dataToSave.description || '');
      setLocalMethod(Array.isArray(dataToSave.method) ? dataToSave.method : (dataToSave.method ? [dataToSave.method] : []));
      setLocalMethodOther(dataToSave.methodOther || '');
      setLocalMeans(Array.isArray(dataToSave.means) ? dataToSave.means : (dataToSave.means ? [dataToSave.means] : []));
      setLocalMeansOther(dataToSave.meansOther || '');
      setLocalObjective(dataToSave.objective || '');
      setLocalConsiderationPeriod(dataToSave.considerationPeriod || '');
      setLocalExecutionPeriod(dataToSave.executionPeriod || '');
      setLocalMonetizationPeriod(dataToSave.monetizationPeriod || '');
      setLocalRelatedOrganizations(Array.isArray(dataToSave.relatedOrganizations) ? dataToSave.relatedOrganizations : []);
      setLocalRelatedGroupCompanies(Array.isArray(dataToSave.relatedGroupCompanies) ? dataToSave.relatedGroupCompanies : []);
      setLocalMonetizationDiagram(dataToSave.monetizationDiagram || '');
      setLocalRelationDiagram(dataToSave.relationDiagram || '');
      setLocalThemeIds(Array.isArray(dataToSave.themeIds) ? dataToSave.themeIds : (dataToSave.themeId ? [dataToSave.themeId] : []));
      setLocalTopicIds(Array.isArray(dataToSave.topicIds) ? dataToSave.topicIds : []);
      
      setSavingStatus('saved');
      setTimeout(() => setSavingStatus('idle'), 2000);
    } catch (error: any) {
      console.error('❌ [handleManualSave] 保存に失敗しました:', error);
      alert(`保存に失敗しました: ${error?.message || '不明なエラー'}`);
      setSavingStatus('idle');
    }
  }, [initiative, initiativeId, editingContent, localAssignee, localDescription, localMethod, localMethodOther, localMeans, localMeansOther, localObjective, localConsiderationPeriod, localExecutionPeriod, localMonetizationPeriod, localRelatedOrganizations, localRelatedGroupCompanies, localMonetizationDiagram, localRelationDiagram, localThemeIds, localTopicIds]);
  
  // モーダルが開かれたときに、デフォルトで現在の組織または事業会社を選択し、議事録をフィルタリング
  useEffect(() => {
    if (isTopicSelectModalOpen) {
      if (organizationId && allMeetingNotes.length > 0) {
        // デフォルトで現在の組織を選択
        setSelectedOrgId(organizationId);
        // 現在の組織の議事録をフィルタリング
        const notes = allMeetingNotes.filter(note => note.organizationId === organizationId);
        setFilteredMeetingNotes(notes);
      }
    }
  }, [isTopicSelectModalOpen, organizationId, allMeetingNotes]);
  
  // JSONファイルをダウンロードする関数
  const handleDownloadJson = useCallback(async () => {
    if (!initiative) return;
    
    try {
      // 現在の編集内容を含む完全なデータを構築
      const dataToDownload: FocusInitiative = {
        ...initiative,
        content: editingContent,
        assignee: localAssignee.length > 0 ? localAssignee.join(', ') : undefined,
        description: localDescription,
        method: localMethod,
        methodOther: localMethodOther,
        means: localMeans,
        meansOther: localMeansOther,
        objective: localObjective,
        considerationPeriod: localConsiderationPeriod,
        executionPeriod: localExecutionPeriod,
        monetizationPeriod: localMonetizationPeriod,
        relatedOrganizations: localRelatedOrganizations,
        relatedGroupCompanies: localRelatedGroupCompanies,
        monetizationDiagram: localMonetizationDiagram,
        relationDiagram: localRelationDiagram,
      } as FocusInitiative;
      
      // JSON文字列に変換
      const jsonString = JSON.stringify(dataToDownload, null, 2);
      
      // Blobオブジェクトを作成
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // ダウンロード用のURLを作成
      const url = URL.createObjectURL(blob);
      
      // ダウンロードリンクを作成してクリック
      const link = document.createElement('a');
      link.href = url;
      link.download = `${initiative.id || 'initiative'}.json`;
      document.body.appendChild(link);
      link.click();
      
      // クリーンアップ
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      devLog('✅ [handleDownloadJson] JSONファイルのダウンロード成功:', initiative.id);
    } catch (error: any) {
      console.error('❌ [handleDownloadJson] JSONファイルのダウンロードに失敗しました:', error);
      alert(`JSONファイルのダウンロードに失敗しました: ${error?.message || '不明なエラー'}`);
    }
  }, [initiative, editingContent, localAssignee, localDescription, localMethod, localMethodOther, localMeans, localMeansOther, localObjective, localConsiderationPeriod, localExecutionPeriod, localMonetizationPeriod, localRelatedOrganizations, localRelatedGroupCompanies, localMonetizationDiagram, localRelationDiagram, localThemeIds]);
  
  // 選択肢のマスターデータ（デフォルト値）
  const [methodOptions] = useState(['協業・連携', 'ベンチャー投資', '一般投資', '投資・関連会社化', '投資・子会社化', '投資・完全子会社化', 'JV設立', '組織再編', '人材育成', '新会社設立', 'その他']);
  const [meansOptions] = useState(['技術開発', '事業開発', 'マーケティング', '営業', 'その他']);

  useEffect(() => {
    const loadData = async () => {
      if (!organizationId || !initiativeId) {
        setError('組織IDまたは事業会社ID、または施策IDが指定されていません');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // 組織データを取得（organizationIdが指定されている場合のみ）
        let orgTree: OrgNodeData | null = null;
        if (organizationId) {
          orgTree = await getOrgTreeFromDb();
          const findOrganization = (node: OrgNodeData): OrgNodeData | null => {
            if (node.id === organizationId) {
              return node;
            }
            if (node.children) {
              for (const child of node.children) {
                const found = findOrganization(child);
                if (found) return found;
              }
            }
            return null;
          };
          const foundOrg = orgTree ? findOrganization(orgTree) : null;
          setOrgData(foundOrg);
        } else {
          // 組織データを設定
          setOrgData(null);
          
          // 事業会社データを取得
          // if (companyId) {
          //   try {
          //     const companyData = await getCompanyById(companyId);
          //     setCompany(companyData);
          //   } catch (companyError: any) {
          //     devWarn('⚠️ [ページ] 事業会社データの取得に失敗:', companyError);
          //     setCompany(null);
          //   }
          // }
          // 事業会社の管理はorganizationsテーブルのtypeカラムで行うため、この処理は不要
        }
        
        // テーマを取得
        const themesData = await getThemes();
        setThemes(themesData);
        
        // すべての組織を取得（モーダル用）- 常に取得
        let modalOrgTree: OrgNodeData | null = null;
        if (orgTree) {
          modalOrgTree = orgTree;
        } else {
          // organizationIdが存在しない場合でも、モーダル用に組織ツリーを取得
          try {
            modalOrgTree = await getOrgTreeFromDb();
          } catch (treeError: any) {
            devWarn('⚠️ [ページ] モーダル用組織ツリー取得に失敗:', treeError);
          }
        }
        
        if (modalOrgTree) {
          const allOrgs = getAllOrganizationsFromTree(modalOrgTree);
          setAllOrganizations(allOrgs);
          setOrgTreeForModal(modalOrgTree);
        } else {
          setAllOrganizations([]);
          setOrgTreeForModal(null);
        }
        
        // 組織のメンバーを取得（organizationIdが指定されている場合のみ）
        if (organizationId) {
          try {
            const membersData = await getOrgMembers(organizationId);
            const membersList = membersData.map((member: any) => ({
              id: member.id,
              name: member.name,
              position: member.position || undefined,
            }));
            setOrgMembers(membersList);
            devLog('✅ [ページ] メンバー取得完了:', { count: membersList.length });
          } catch (memberError: any) {
            console.warn('⚠️ [ページ] メンバー取得に失敗:', memberError);
            setOrgMembers([]);
          }
          
          // 全組織のメンバーを取得（直接入力時の検索用）
          if (modalOrgTree) {
            try {
              const allOrgsForMembers = getAllOrganizationsFromTree(modalOrgTree);
              const allMembersList: Array<{ id: string; name: string; position?: string; organizationId?: string }> = [];
              
              // 各組織のメンバーを取得
              for (const org of allOrgsForMembers) {
                try {
                  const orgMembersData = await getOrgMembers(org.id);
                  const orgMembersList = orgMembersData.map((member: any) => ({
                    id: member.id,
                    name: member.name,
                    position: member.position || undefined,
                    organizationId: org.id,
                  }));
                  allMembersList.push(...orgMembersList);
                } catch (err) {
                  devWarn(`⚠️ [ページ] 組織 ${org.id} のメンバー取得に失敗:`, err);
                }
              }
              
              // 重複を除去（同じ名前のメンバーが複数の組織に所属している場合）
              const uniqueMembers = new Map<string, { id: string; name: string; position?: string; organizationId?: string }>();
              allMembersList.forEach(member => {
                if (!uniqueMembers.has(member.name) || !uniqueMembers.get(member.name)?.position) {
                  uniqueMembers.set(member.name, member);
                }
              });
              
              setAllOrgMembers(Array.from(uniqueMembers.values()));
              devLog('✅ [ページ] 全組織メンバー取得完了:', { count: Array.from(uniqueMembers.values()).length });
            } catch (allMemberError: any) {
              devWarn('⚠️ [ページ] 全組織メンバー取得に失敗:', allMemberError);
              setAllOrgMembers([]);
            }
          }
        } else {
          // companyIdのみの場合は組織メンバーを空に設定
          setOrgMembers([]);
          setAllOrgMembers([]);
        }
        
        // すべての議事録を取得（モーダル用）
        const allNotes = await getAllMeetingNotes();
        setAllMeetingNotes(allNotes);
        
        // すべての事業会社を取得（モーダル用）
        try {
          // const companiesData = await getAllCompanies();
          // setAllCompanies(companiesData);

          // // すべての事業会社の議事録を取得（モーダル用）
          // const allCompanyNotes: CompanyMeetingNote[] = [];
          // for (const comp of companiesData) {
          //   try {
          //     const companyNotes = await getCompanyMeetingNotes(comp.id);
          //     allCompanyNotes.push(...companyNotes);
          //   } catch (error: any) {
          //     devWarn(`⚠️ [ページ] 事業会社 ${comp.id} の議事録取得に失敗:`, error);
          //   }
          // }
          // setAllCompanyMeetingNotes(allCompanyNotes);
          // devLog('✅ [ページ] 事業会社議事録取得完了:', { count: allCompanyNotes.length });
          // 事業会社の管理はorganizationsテーブルのtypeカラムで行うため、この処理は不要
        } catch (companiesError: any) {
          devWarn('⚠️ [ページ] 事業会社データの取得に失敗:', companiesError);
        }
        
        // 注力施策を取得
        const initiativeData = await getFocusInitiativeById(initiativeId);
        if (!initiativeData) {
          setError('注力施策が見つかりませんでした');
          setLoading(false);
          return;
        }
        
        // organizationIdが指定されている場合、取得したデータのorganizationIdと一致するか確認
        if (organizationId) {
          devLog('🔍 [ページ] organizationId検証:', {
            urlOrganizationId: organizationId,
            dataOrganizationId: initiativeData.organizationId,
            hasOrganizationId: !!initiativeData.organizationId,
            match: initiativeData.organizationId === organizationId,
          });
          // 組織の注力施策の場合、organizationIdが存在する必要がある
          if (!initiativeData.organizationId || initiativeData.organizationId !== organizationId) {
            setError('注力施策が見つかりませんでした（組織IDが一致しません）');
            setLoading(false);
            return;
          }
        }
        
        devLog('📖 [ページ] データ読み込み:', {
          id: initiativeData.id,
          title: initiativeData.title,
          contentLength: initiativeData.content?.length || 0,
        });
        
        // monetizationDiagramIdが存在しない場合は生成
        if (!initiativeData.monetizationDiagramId && initiativeData.monetizationDiagram) {
          initiativeData.monetizationDiagramId = `md_${generateUniqueId()}`;
          // データベースに保存（エラーは無視して続行）
          try {
            await saveFocusInitiative({
              ...initiativeData,
              monetizationDiagramId: initiativeData.monetizationDiagramId,
            });
          } catch (saveError: any) {
            devWarn('⚠️ [ページ] monetizationDiagramId保存エラー（続行します）:', saveError);
          }
        }
        
        // relationDiagramIdが存在しない場合は生成
        if (!initiativeData.relationDiagramId && initiativeData.relationDiagram) {
          initiativeData.relationDiagramId = `rd_${generateUniqueId()}`;
          // データベースに保存（エラーは無視して続行）
          try {
            await saveFocusInitiative({
              ...initiativeData,
              relationDiagramId: initiativeData.relationDiagramId,
            });
          } catch (saveError: any) {
            devWarn('⚠️ [ページ] relationDiagramId保存エラー（続行します）:', saveError);
          }
        }
        
        devLog('✅ [ページ] setInitiative呼び出し前:', {
          initiativeId: initiativeData.id,
          title: initiativeData.title,
        });
        setInitiative(initiativeData);
        console.log('✅ [ページ] setInitiative呼び出し後');
        setEditingContent(initiativeData.content || '');
        
        // ローカル状態を初期化
        // assigneeは文字列の場合は配列に変換（カンマ区切り対応）
        const assigneeValue = initiativeData.assignee
          ? (Array.isArray(initiativeData.assignee) 
              ? initiativeData.assignee 
              : initiativeData.assignee.split(',').map(s => s.trim()).filter(s => s.length > 0))
          : [];
        const descriptionValue = initiativeData.description || '';
        const methodValue = Array.isArray(initiativeData.method) ? initiativeData.method : (initiativeData.method ? [initiativeData.method] : []);
        const meansValue = Array.isArray(initiativeData.means) ? initiativeData.means : (initiativeData.means ? [initiativeData.means] : []);
        const objectiveValue = initiativeData.objective || '';
        const considerationPeriodValue = initiativeData.considerationPeriod || '';
        const executionPeriodValue = initiativeData.executionPeriod || '';
        const monetizationPeriodValue = initiativeData.monetizationPeriod || '';
        const monetizationDiagramValue = initiativeData.monetizationDiagram || '';
        const relationDiagramValue = initiativeData.relationDiagram || '';
        
        // 特性要因図のコードを生成
        const generateCauseEffectCode = (init: FocusInitiative): string => {
          try {
            return JSON.stringify({
              spine: {
                id: 'spine',
                label: init.title || '特性要因図',
                type: 'spine',
              },
              method: init.method || [],
              means: init.means || [],
              objective: init.objective || '',
              title: init.title || '',
              description: init.description || '',
            }, null, 2);
          } catch (error) {
            return JSON.stringify({
              spine: { id: 'spine', label: '特性要因図', type: 'spine' },
              method: [],
              means: [],
              objective: '',
              title: '',
              description: '',
            }, null, 2);
          }
        };
        const causeEffectCodeValue = generateCauseEffectCode(initiativeData);
        
        setLocalAssignee(assigneeValue);
        setLocalDescription(descriptionValue);
        setLocalMethod(methodValue);
        setLocalMethodOther(initiativeData.methodOther || '');
        setLocalMeans(meansValue);
        setLocalMeansOther(initiativeData.meansOther || '');
        setLocalObjective(objectiveValue);
        setLocalConsiderationPeriod(considerationPeriodValue);
        setLocalExecutionPeriod(executionPeriodValue);
        setLocalMonetizationPeriod(monetizationPeriodValue);
        setLocalRelatedOrganizations(Array.isArray(initiativeData.relatedOrganizations) ? initiativeData.relatedOrganizations : []);
        setLocalRelatedGroupCompanies(Array.isArray(initiativeData.relatedGroupCompanies) ? initiativeData.relatedGroupCompanies : []);
        setLocalMonetizationDiagram(monetizationDiagramValue);
        setLocalRelationDiagram(relationDiagramValue);
        setLocalCauseEffectCode(causeEffectCodeValue);
        // themeIdsを優先し、なければthemeIdから変換
        const themeIdsValue = Array.isArray(initiativeData.themeIds) && initiativeData.themeIds.length > 0
          ? initiativeData.themeIds
          : (initiativeData.themeId ? [initiativeData.themeId] : []);
        setLocalThemeIds(themeIdsValue);
        
        // 個別トピックを取得（全組織横断的に取得）
        // 他の組織のトピックが紐づけられている場合でも表示できるようにするため
        const topicsData = await getAllTopicsBatch();
        setTopics(topicsData);
        
        devLog('📖 [ページ] 取得したトピック:', {
          count: topicsData.length,
          topicIdsFromInitiativeCount: Array.isArray(initiativeData.topicIds) ? initiativeData.topicIds.length : 0,
        });
        
        // topicIdsを設定
        const topicIdsValue = Array.isArray(initiativeData.topicIds) ? initiativeData.topicIds : [];
        setLocalTopicIds(topicIdsValue);
        
        devLog('📖 [ページ] ローカル状態設定完了');
        
        setError(null);
        
        // 初期化完了
        isInitialLoadRef.current = false;
      } catch (err: any) {
        console.error('データの読み込みエラー:', err);
        setError(err.message || 'データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [organizationId, initiativeId]);
  
  // 担当者ドロップダウンの外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        assigneeDropdownRef.current &&
        assigneeInputRef.current &&
        !assigneeDropdownRef.current.contains(event.target as Node) &&
        !assigneeInputRef.current.contains(event.target as Node)
      ) {
        setIsAssigneeDropdownOpen(false);
        setAssigneeSearchQuery('');
      }
    };

    if (isAssigneeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAssigneeDropdownOpen]);
  
  // 自動保存は無効化（手動保存のみ）

  const handleSave = async () => {
    // 手動保存関数を呼び出す
    await handleManualSave();
    setIsEditing(false);
  };
  
  const handleMethodToggle = (method: string) => {
    setLocalMethod(prev => 
      prev.includes(method) 
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };
  
  const handleMeansToggle = (means: string) => {
    setLocalMeans(prev => 
      prev.includes(means) 
        ? prev.filter(m => m !== means)
        : [...prev, means]
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p>データを読み込み中...</p>
        </div>
      </Layout>
    );
  }

  const shouldShowError = error || !initiative || !orgData;
  
  if (shouldShowError) {
    return (
      <Layout>
        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ marginBottom: '8px' }}>注力施策詳細</h2>
          <p style={{ color: 'var(--color-error)' }}>
            {error || 'データが見つかりませんでした。'}
          </p>
          <button
            onClick={() => {
              router.push(`/organization/detail?id=${organizationId}&tab=focusInitiatives`);
            }}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            組織ページに戻る
          </button>
        </div>
      </Layout>
    );
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: '概要' },
    { id: 'details', label: '詳細' },
    { id: 'periods', label: '期間' },
    { id: 'relations', label: '特性要因図' },
    { id: 'monetization', label: 'マネタイズ' },
    { id: 'relation', label: '相関図' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: '13px', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                💡 <strong>保存について:</strong> 編集内容を保存するには、ページ右上の「保存」ボタンをクリックしてください。
              </div>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                担当者 {localAssignee.length > 0 && `(${localAssignee.length}人)`}
              </label>
              
              {/* 選択済みメンバーの表示 */}
              {localAssignee.length > 0 && (
                <div style={{ marginBottom: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {localAssignee.map((assignee, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 10px',
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    >
                      <span style={{ color: '#1E40AF' }}>{assignee}</span>
                      <button
                        onClick={() => {
                          setLocalAssignee(localAssignee.filter((_, i) => i !== index));
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#1E40AF',
                          cursor: 'pointer',
                          padding: '0',
                          fontSize: '16px',
                          lineHeight: 1,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="削除"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* データベースから取得したメンバー選択フォームと自由入力フォームを横並び */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                {/* データベースから取得したメンバー選択フォーム */}
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#6B7280' }}>
                    メンバーを選択（データベースから取得）
                  </label>
                  <div style={{ position: 'relative' }}>
              <input
                      ref={assigneeInputRef}
                type="text"
                      value={assigneeSearchQuery}
                      onChange={(e) => {
                        setAssigneeSearchQuery(e.target.value);
                        setIsAssigneeDropdownOpen(true);
                      }}
                      onKeyDown={(e) => {
                        // Escapeキーでドロップダウンを閉じる
                        if (e.key === 'Escape') {
                          setIsAssigneeDropdownOpen(false);
                          setAssigneeSearchQuery('');
                        }
                        // Enterキーは無効化（ドロップダウンから選択のみ）
                        if (e.key === 'Enter') {
                          e.preventDefault();
                        }
                      }}
                      onFocus={() => setIsAssigneeDropdownOpen(true)}
                      placeholder="メンバーを検索して選択（ドロップダウンから選択のみ）"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
                {isAssigneeDropdownOpen && (
                  <div
                    ref={assigneeDropdownRef}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      zIndex: 1000,
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}
                  >
                    {/* 現在の組織のメンバー（検索クエリがない場合、または検索クエリがある場合は全組織メンバーも表示） */}
                    {(() => {
                      const query = assigneeSearchQuery.toLowerCase();
                      const hasQuery = query.length > 0;
                      
                      // 検索クエリがある場合は全組織メンバーを、ない場合は現在の組織メンバーのみを表示
                      const membersToShow = hasQuery ? allOrgMembers : orgMembers;
                      
                      const filteredMembers = membersToShow
                        .filter((member) => {
                          if (!hasQuery) return true;
                          // 類似検索: 名前または役職で類似するものを検索
                          return (
                            isSimilarMatch(query, member.name) ||
                            (member.position && isSimilarMatch(query, member.position))
                          );
                        })
                        .filter((member) => !localAssignee.includes(member.name))
                        // 類似度でソート（完全一致 > 部分一致 > 類似）
                        .sort((a, b) => {
                          const aNameLower = a.name.toLowerCase();
                          const bNameLower = b.name.toLowerCase();
                          
                          // 完全一致を最優先
                          if (aNameLower === query) return -1;
                          if (bNameLower === query) return 1;
                          
                          // 部分一致を次に優先
                          const aStartsWith = aNameLower.startsWith(query);
                          const bStartsWith = bNameLower.startsWith(query);
                          if (aStartsWith && !bStartsWith) return -1;
                          if (!aStartsWith && bStartsWith) return 1;
                          
                          // 部分一致の場合は位置でソート
                          const aIndex = aNameLower.indexOf(query);
                          const bIndex = bNameLower.indexOf(query);
                          if (aIndex !== -1 && bIndex !== -1) {
                            return aIndex - bIndex;
                          }
                          if (aIndex !== -1) return -1;
                          if (bIndex !== -1) return 1;
                          
                          // それ以外は名前順
                          return aNameLower.localeCompare(bNameLower);
                        });
                      
                      if (filteredMembers.length === 0 && hasQuery) {
                        // 検索クエリがあるが結果がない場合でも、類似するメンバーを表示
                        // より緩い条件で再検索
                        const looseMatches = membersToShow
                          .filter((member) => {
                            // 入力文字列の各文字が名前に含まれているかチェック
                            const queryChars = query.split('');
                            const nameLower = member.name.toLowerCase();
                            const matchedChars = queryChars.filter(char => nameLower.includes(char)).length;
                            return matchedChars >= Math.max(1, Math.floor(queryChars.length * 0.3));
                          })
                          .filter((member) => !localAssignee.includes(member.name))
                          .slice(0, 10); // 最大10件まで表示
                        
                        if (looseMatches.length > 0) {
                          return looseMatches.map((member) => (
                            <div
                              key={member.id}
                              onClick={() => {
                                if (!localAssignee.includes(member.name)) {
                                  setLocalAssignee([...localAssignee, member.name]);
                                }
                                setAssigneeSearchQuery('');
                                setIsAssigneeDropdownOpen(false);
                              }}
                              style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                borderBottom: '1px solid #F3F4F6',
                                transition: 'background-color 0.15s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: '#FFFBF0',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#FEF3C7';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#FFFBF0';
                              }}
                            >
                              <div
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  border: '2px solid #D1D5DB',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, color: '#111827' }}>
                                  {member.name}
                                  <span style={{ fontSize: '11px', color: '#9CA3AF', marginLeft: '6px' }}>
                                    (類似)
                                  </span>
                                  {query.length > 0 && (member as any).organizationId && (member as any).organizationId !== organizationId && (
                                    <span style={{ fontSize: '11px', color: '#9CA3AF', marginLeft: '6px' }}>
                                      (他組織)
                                    </span>
                                  )}
                                </div>
                                {member.position && (
                                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                                    {member.position}
                                  </div>
                                )}
                              </div>
                            </div>
                          ));
                        }
                      }
                      
                      if (filteredMembers.length === 0) {
                        return (
                          <div style={{ padding: '10px 12px', fontSize: '14px', color: '#6B7280', textAlign: 'center' }}>
                            {hasQuery ? '類似するメンバーが見つかりません' : 'すべてのメンバーが選択済みです'}
                          </div>
                        );
                      }
                      
                      return filteredMembers.map((member) => (
                        <div
                          key={member.id}
                          onClick={() => {
                            if (!localAssignee.includes(member.name)) {
                              setLocalAssignee([...localAssignee, member.name]);
                            }
                            setAssigneeSearchQuery('');
                            setIsAssigneeDropdownOpen(false);
                          }}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            borderBottom: '1px solid #F3F4F6',
                            transition: 'background-color 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#F9FAFB';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#FFFFFF';
                          }}
                        >
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              border: '2px solid #D1D5DB',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {localAssignee.includes(member.name) && (
                              <span style={{ color: '#3B82F6', fontSize: '12px' }}>✓</span>
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500, color: '#111827' }}>
                              {member.name}
                              {query.length > 0 && (member as any).organizationId && (member as any).organizationId !== organizationId && (
                                <span style={{ fontSize: '11px', color: '#9CA3AF', marginLeft: '6px' }}>
                                  (他組織)
                                </span>
                              )}
                            </div>
                            {member.position && (
                              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                                {member.position}
                              </div>
                            )}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
                    {orgMembers.length > 0 && (
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#6B7280' }}>
                        💡 ドロップダウンからメンバーをクリックして選択してください
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 自由入力フォーム */}
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#6B7280' }}>
                    担当者を直接入力
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={manualAssigneeInput}
                      onChange={(e) => setManualAssigneeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && manualAssigneeInput.trim()) {
                          e.preventDefault();
                          if (!localAssignee.includes(manualAssigneeInput.trim())) {
                            setLocalAssignee([...localAssignee, manualAssigneeInput.trim()]);
                          }
                          setManualAssigneeInput('');
                        }
                      }}
                      placeholder="担当者名を直接入力"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                    <button
                      onClick={() => {
                        if (manualAssigneeInput.trim() && !localAssignee.includes(manualAssigneeInput.trim())) {
                          setLocalAssignee([...localAssignee, manualAssigneeInput.trim()]);
                          setManualAssigneeInput('');
                        }
                      }}
                      disabled={!manualAssigneeInput.trim()}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: manualAssigneeInput.trim() ? '#3B82F6' : '#9CA3AF',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: manualAssigneeInput.trim() ? 'pointer' : 'not-allowed',
                        whiteSpace: 'nowrap',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (manualAssigneeInput.trim()) {
                          e.currentTarget.style.backgroundColor = '#2563EB';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (manualAssigneeInput.trim()) {
                          e.currentTarget.style.backgroundColor = '#3B82F6';
                        }
                      }}
                    >
                      追加
                    </button>
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '12px', color: '#6B7280' }}>
                    💡 担当者名を入力して「追加」ボタンをクリック、またはEnterキーで追加
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontWeight: '600', color: '#374151' }}>
                    説明
                  </label>
                  <span style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'monospace', backgroundColor: '#F3F4F6', padding: '2px 8px', borderRadius: '4px' }}>
                    ID: {descriptionTextareaId}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {!isEditingDescription && (
                    <button
                      onClick={() => {
                        setAIGenerationTarget('description');
                        setAIGenerationInput('');
                        setSelectedTopicIdsForAI([]);
                        setAiSummaryFormat('auto');
                        setAiSummaryLength(500);
                        setAiCustomPrompt('');
                        setIsAIGenerationModalOpen(true);
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#3B82F6',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>🤖</span>
                      <span>AIで作文</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (isEditingDescription) {
                        setIsEditingDescription(false);
                      } else {
                        setIsEditingDescription(true);
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: isEditingDescription ? '#10B981' : '#6B7280',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {isEditingDescription ? '✓ 完了' : '✏️ 編集'}
                  </button>
                </div>
              </div>
              {/* AI生成結果の比較ビュー（モーダルが閉じている時のみ表示） */}
              {!isAIGenerationModalOpen && aiGeneratedTarget === 'description' && aiGeneratedContent && originalContent != null && (
                <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#F0F9FF', border: '2px solid #3B82F6', borderRadius: '8px' }}>
                  <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1E40AF' }}>
                      🔄 AI生成結果の比較
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          // Undo: 元の内容に戻す
                          setLocalDescription(originalContent);
                          setAiGeneratedContent(null);
                          setAiGeneratedTarget(null);
                          setOriginalContent(null);
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#F3F4F6',
                          color: '#374151',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        ↶ Undo（元に戻す）
                      </button>
                      <button
                        onClick={() => {
                          // Keep: 生成結果を確定
                          setAiGeneratedContent(null);
                          setAiGeneratedTarget(null);
                          setOriginalContent(null);
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#10B981',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        ✓ Keep（保持）
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* 既存の内容 */}
                    <div>
                      <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#6B7280' }}>
                        既存の内容
                      </div>
                      <div
                        style={{
                          padding: '12px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: '6px',
                          maxHeight: '300px',
                          overflowY: 'auto',
                        }}
                      >
                        {originalContent ? (
                          <div
                            className="markdown-content"
                            style={{
                              fontSize: '14px',
                              lineHeight: '1.8',
                              color: '#374151',
                            }}
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {originalContent}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: '14px' }}>
                            内容がありません
                          </p>
                        )}
                      </div>
                    </div>
                    {/* AI生成結果 */}
                    <div>
                      <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#3B82F6' }}>
                        AI生成結果
                      </div>
                      <div
                        style={{
                          padding: '12px',
                          backgroundColor: '#FFFFFF',
                          border: '2px solid #3B82F6',
                          borderRadius: '6px',
                          maxHeight: '300px',
                          overflowY: 'auto',
                        }}
                      >
                        <div
                          className="markdown-content"
                          style={{
                            fontSize: '14px',
                            lineHeight: '1.8',
                            color: '#374151',
                          }}
                        >
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {aiGeneratedContent}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {isEditingDescription ? (
              <textarea
                  id={descriptionTextareaId}
                value={localDescription}
                onChange={(e) => setLocalDescription(e.target.value)}
                  placeholder="施策の説明を入力（マークダウン記法対応）"
                  rows={8}
                style={{
                  width: '100%',
                    padding: '12px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                    fontFamily: 'monospace',
                  resize: 'vertical',
                    lineHeight: '1.6',
                }}
              />
              ) : (
                <div
                  style={{
                    padding: '16px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    minHeight: '100px',
                  }}
                >
                  {localDescription ? (
                    <div
                      className="markdown-content"
                      style={{
                        fontSize: '15px',
                        lineHeight: '1.8',
                        color: '#374151',
                      }}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {localDescription}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: '14px' }}>
                      説明が入力されていません。「編集」ボタンから追加してください。
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontWeight: '600', color: '#374151' }}>
                    目標
                  </label>
                  <span style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'monospace', backgroundColor: '#F3F4F6', padding: '2px 8px', borderRadius: '4px' }}>
                    ID: {objectiveTextareaId}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {!isEditingObjective && (
                    <button
                      onClick={() => {
                        setAIGenerationTarget('objective');
                        setAIGenerationInput('');
                        setSelectedTopicIdsForAI([]);
                        setAiSummaryFormat('auto');
                        setAiSummaryLength(500);
                        setAiCustomPrompt('');
                        setIsAIGenerationModalOpen(true);
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#3B82F6',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>🤖</span>
                      <span>AIで作文</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (isEditingObjective) {
                        setIsEditingObjective(false);
                      } else {
                        setIsEditingObjective(true);
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: isEditingObjective ? '#10B981' : '#6B7280',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {isEditingObjective ? '✓ 完了' : '✏️ 編集'}
                  </button>
                </div>
              </div>
              {/* AI生成結果の比較ビュー（モーダルが閉じている時のみ表示） */}
              {!isAIGenerationModalOpen && aiGeneratedTarget === 'objective' && aiGeneratedContent && originalContent != null && (
                <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#F0F9FF', border: '2px solid #3B82F6', borderRadius: '8px' }}>
                  <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1E40AF' }}>
                      🔄 AI生成結果の比較
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          // Undo: 元の内容に戻す
                          setLocalObjective(originalContent);
                          setAiGeneratedContent(null);
                          setAiGeneratedTarget(null);
                          setOriginalContent(null);
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#F3F4F6',
                          color: '#374151',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        ↶ Undo（元に戻す）
                      </button>
                      <button
                        onClick={() => {
                          // Keep: 生成結果を確定
                          setAiGeneratedContent(null);
                          setAiGeneratedTarget(null);
                          setOriginalContent(null);
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#10B981',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        ✓ Keep（保持）
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* 既存の内容 */}
                    <div>
                      <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#6B7280' }}>
                        既存の内容
                      </div>
                      <div
                        style={{
                          padding: '12px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: '6px',
                          maxHeight: '300px',
                          overflowY: 'auto',
                        }}
                      >
                        {originalContent ? (
                          <div
                            className="markdown-content"
                            style={{
                              fontSize: '14px',
                              lineHeight: '1.8',
                              color: '#374151',
                            }}
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {originalContent}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: '14px' }}>
                            内容がありません
                          </p>
                        )}
                      </div>
                    </div>
                    {/* AI生成結果 */}
                    <div>
                      <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#3B82F6' }}>
                        AI生成結果
                      </div>
                      <div
                        style={{
                          padding: '12px',
                          backgroundColor: '#FFFFFF',
                          border: '2px solid #3B82F6',
                          borderRadius: '6px',
                          maxHeight: '300px',
                          overflowY: 'auto',
                        }}
                      >
                        <div
                          className="markdown-content"
                          style={{
                            fontSize: '14px',
                            lineHeight: '1.8',
                            color: '#374151',
                          }}
                        >
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {aiGeneratedContent}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {isEditingObjective ? (
              <textarea
                  id={objectiveTextareaId}
                value={localObjective}
                onChange={(e) => setLocalObjective(e.target.value)}
                  placeholder="施策の目標を入力（マークダウン記法対応）"
                  rows={8}
                style={{
                  width: '100%',
                    padding: '12px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                    fontFamily: 'monospace',
                  resize: 'vertical',
                    lineHeight: '1.6',
                }}
              />
              ) : (
                <div
                  style={{
                    padding: '16px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    minHeight: '100px',
                  }}
                >
                  {localObjective ? (
                    <div
                      className="markdown-content"
                      style={{
                        fontSize: '15px',
                        lineHeight: '1.8',
                        color: '#374151',
                      }}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {localObjective}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: '14px' }}>
                      目標が入力されていません。「編集」ボタンから追加してください。
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
        
      case 'details':
        return (
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: '13px', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                💡 <strong>保存について:</strong> 編集内容を保存するには、ページ右上の「保存」ボタンをクリックしてください。
              </div>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151' }}>
                手法
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {methodOptions.map((method) => (
                  <label
                    key={method}
                  style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 12px',
                      border: `1px solid ${localMethod.includes(method) ? 'var(--color-primary)' : '#D1D5DB'}`,
                      borderRadius: '6px',
                      backgroundColor: localMethod.includes(method) ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                    <input
                      type="checkbox"
                      checked={localMethod.includes(method)}
                      onChange={() => handleMethodToggle(method)}
                      style={{ marginRight: '8px' }}
                    />
                    {method}
                  </label>
                ))}
              </div>
              {localMethod.includes('その他') && (
                <input
                  type="text"
                  value={localMethodOther}
                  onChange={(e) => setLocalMethodOther(e.target.value)}
                  placeholder="その他の手法を入力"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    marginTop: '8px',
                  }}
                />
            )}
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151' }}>
                手段
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {meansOptions.map((means) => (
                  <label
                    key={means}
              style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 12px',
                      border: `1px solid ${localMeans.includes(means) ? 'var(--color-primary)' : '#D1D5DB'}`,
                      borderRadius: '6px',
                      backgroundColor: localMeans.includes(means) ? '#EFF6FF' : '#FFFFFF',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
                    <input
                      type="checkbox"
                      checked={localMeans.includes(means)}
                      onChange={() => handleMeansToggle(means)}
                      style={{ marginRight: '8px' }}
                    />
                    {means}
                  </label>
                ))}
          </div>
              {localMeans.includes('その他') && (
                <input
                  type="text"
                  value={localMeansOther}
                  onChange={(e) => setLocalMeansOther(e.target.value)}
                  placeholder="その他の手段を入力"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    marginTop: '8px',
                  }}
                />
              )}
        </div>

            <div style={{ marginTop: '32px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                詳細コンテンツ
              </label>
        {isEditing ? (
          <div>
            <textarea
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              placeholder="詳細コンテンツをマークダウン形式で入力してください..."
              style={{
                width: '100%',
                minHeight: '500px',
                padding: '12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'monospace',
                resize: 'vertical',
                lineHeight: '1.6',
              }}
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280' }}>
              💡 マークダウン形式で記述できます（例: **太字**, *斜体*, `コード`, # 見出し, - リストなど）
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '24px',
              backgroundColor: '#FFFFFF',
              borderRadius: '6px',
              minHeight: '400px',
              border: '1px solid #E5E7EB',
            }}
          >
            {editingContent ? (
              <div
                className="markdown-content"
                style={{
                  fontSize: '15px',
                  lineHeight: '1.8',
                  color: '#374151',
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {editingContent}
                </ReactMarkdown>
              </div>
            ) : (
              <div style={{ color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', padding: '40px' }}>
                詳細コンテンツがありません。編集ボタンから追加してください。
              </div>
            )}
          </div>
        )}
            </div>
          </div>
        );
        
      case 'periods':
        return (
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: '13px', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                💡 <strong>保存について:</strong> 編集内容を保存するには、ページ右上の「保存」ボタンをクリックしてください。
              </div>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                検討期間（例: 2024-01/2024-12）
              </label>
              <input
                type="text"
                value={localConsiderationPeriod}
                onChange={(e) => setLocalConsiderationPeriod(e.target.value)}
                placeholder="2024-01/2024-12"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                実行期間（例: 2024-01/2024-12）
              </label>
              <input
                type="text"
                value={localExecutionPeriod}
                onChange={(e) => setLocalExecutionPeriod(e.target.value)}
                placeholder="2024-01/2024-12"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                収益化期間（例: 2024-01/2024-12）
              </label>
              <input
                type="text"
                value={localMonetizationPeriod}
                onChange={(e) => setLocalMonetizationPeriod(e.target.value)}
                placeholder="2024-01/2024-12"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>
        );
        
      case 'relations':
        if (!initiative) return null;
        
        // 特性要因図のコードからデータを取得
        let parsedCauseEffectData: { method?: string[]; means?: string[]; objective?: string } = {};
        try {
          if (localCauseEffectCode) {
            const parsed = JSON.parse(localCauseEffectCode);
            parsedCauseEffectData = {
              method: parsed.method || [],
              means: parsed.means || [],
              objective: parsed.objective || '',
            };
          }
        } catch (e) {
          // パースエラーの場合は既存のデータを使用
          parsedCauseEffectData = {
            method: localMethod,
            means: localMeans,
            objective: localObjective,
          };
        }
        
        const currentInitiativeData: FocusInitiative = {
          ...initiative,
          method: parsedCauseEffectData.method || localMethod,
          means: parsedCauseEffectData.means || localMeans,
          objective: parsedCauseEffectData.objective || localObjective,
        };
        
        return (
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: '13px', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                💡 <strong>保存について:</strong> 編集内容を保存するには、ページ右上の「保存」ボタンをクリックしてください。
              </div>
            </div>
            
            {/* 特性要因図 */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontWeight: '600', color: '#374151', fontSize: '16px' }}>
                    特性要因図
                  </label>
                  {initiative.causeEffectDiagramId && (
                    <a
                      href={`/analytics/cause-effect/${initiative.causeEffectDiagramId}`}
                      onClick={(e) => {
                        e.preventDefault();
                        router.push(`/analytics/cause-effect/${initiative.causeEffectDiagramId}`);
                      }}
                      style={{
                        fontSize: '12px',
                        color: '#3B82F6',
                        fontFamily: 'monospace',
                        fontWeight: '400',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#EFF6FF',
                        textDecoration: 'none',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#DBEAFE';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#EFF6FF';
                      }}
                      title="特性要因図を開く"
                    >
                      ({initiative.causeEffectDiagramId})
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {initiative.causeEffectDiagramId && (
                    <button
                      onClick={() => setIsUpdateModalOpen(true)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#3B82F6',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#2563EB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#3B82F6';
                      }}
                    >
                      <span>📊</span>
                      <span>図を更新する</span>
                    </button>
                  )}
                  {!isEditingCauseEffect ? (
                    <button
                      onClick={() => setIsEditingCauseEffect(true)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#F3F4F6',
                        color: '#374151',
                        border: '1px solid #D1D5DB',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      編集
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditingCauseEffect(false)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#6B7280',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      表示に戻る
                    </button>
                  )}
                </div>
              </div>
              {isEditingCauseEffect ? (
                <div>
                  <textarea
                    value={localCauseEffectCode}
                    onChange={(e) => setLocalCauseEffectCode(e.target.value)}
                    placeholder={`例:
{
  "spine": {
    "id": "spine",
    "label": "特性要因図",
    "type": "spine"
  },
  "method": ["手法1", "手法2"],
  "means": ["手段1", "手段2"],
  "objective": "目標の説明",
  "title": "タイトル",
  "description": "説明"
}`}
                    style={{
                      width: '100%',
                      minHeight: '400px',
                      padding: '12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      resize: 'vertical',
                      lineHeight: '1.6',
                    }}
                  />
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280' }}>
                    💡 特性要因図のJSONコードを編集してください。手法（method）、手段（means）、目標（objective）を変更できます。
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ 
                    border: '1px solid #E5E7EB', 
                    borderRadius: '6px', 
                    padding: '20px', 
                    backgroundColor: '#FFFFFF',
                    minHeight: '600px',
                    width: '100%',
                    overflow: 'auto',
                  }}>
                    <InitiativeCauseEffectDiagram
                      width={1400}
                      height={700}
                      initiative={currentInitiativeData}
                    />
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280' }}>
                    💡 特性要因図は、この注力施策の手法・手段・目標を可視化しています。
                    {!initiative.causeEffectDiagramId && (
                      <span style={{ marginLeft: '8px', color: '#F59E0B' }}>
                        （保存すると特性要因図IDが自動生成されます）
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        );
        
      case 'monetization':
        return (
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: '13px', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                💡 <strong>保存について:</strong> 編集内容を保存するには、ページ右上の「保存」ボタンをクリックしてください。
              </div>
            </div>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ fontWeight: '600', color: '#374151', fontSize: '16px' }}>
                  マネタイズ図
                </label>
                {initiative?.monetizationDiagramId && (
                  <a
                    href={`#monetization-${initiative.monetizationDiagramId}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigator.clipboard.writeText(initiative.monetizationDiagramId || '');
                      alert(`マネタイズ図ID "${initiative.monetizationDiagramId}" をクリップボードにコピーしました`);
                    }}
                    style={{
                      fontSize: '12px',
                      color: '#3B82F6',
                      textDecoration: 'none',
                      padding: '2px 8px',
                      backgroundColor: '#EFF6FF',
                      borderRadius: '4px',
                      border: '1px solid #BFDBFE',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#DBEAFE';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#EFF6FF';
                    }}
                    title="マネタイズ図IDをクリップボードにコピー"
                  >
                    ({initiative.monetizationDiagramId})
                  </a>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={async () => {
                    if (!initiative) return;
                    // monetizationDiagramIdが存在しない場合は生成
                    if (!initiative.monetizationDiagramId) {
                      const newId = `md_${generateUniqueId()}`;
                      const updatedInitiative = {
                        ...initiative,
                        monetizationDiagramId: newId,
                      };
                      await saveFocusInitiative(updatedInitiative);
                      setInitiative(updatedInitiative);
                    }
                    setIsMonetizationUpdateModalOpen(true);
                  }}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#3B82F6',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2563EB';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#3B82F6';
                    }}
                  >
                    <span>📊</span>
                    <span>図を更新する</span>
                  </button>
                {!isEditingMonetization ? (
                  <button
                    onClick={() => setIsEditingMonetization(true)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#F3F4F6',
                      color: '#374151',
                      border: '1px solid #D1D5DB',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    編集
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsEditingMonetization(false);
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#6B7280',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    表示に戻る
                  </button>
                )}
              </div>
            </div>
            
            {isEditingMonetization ? (
              <div>
                <textarea
                  value={localMonetizationDiagram}
                  onChange={(e) => setLocalMonetizationDiagram(e.target.value)}
                  placeholder={`例:
graph TD
    A[顧客] -->|購入| B[商品・サービス]
    B -->|収益| C[売上]
    C -->|投資| D[事業拡大]
    D -->|提供| B`}
                  style={{
                    width: '100%',
                    minHeight: '400px',
                    padding: '12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    resize: 'vertical',
                    lineHeight: '1.6',
                  }}
                />
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280' }}>
                  💡 Mermaid図のコードを入力してください。フローチャート、シーケンス図、ガントチャートなどが作成できます。
                </div>
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280' }}>
                  📖 <a href="https://mermaid.js.org/intro/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>Mermaid公式ドキュメント</a>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '16px' }}>
                {localMonetizationDiagram ? (
                  <div style={{ border: '1px solid #E5E7EB', borderRadius: '6px', padding: '20px', backgroundColor: '#FFFFFF' }}>
                    <MermaidDiagram
                      diagramCode={localMonetizationDiagram}
                      diagramId={`monetization-${initiativeId}`}
                    />
                  </div>
                ) : (
                  <div style={{ 
                    padding: '60px 20px', 
                    textAlign: 'center', 
                    color: '#9CA3AF', 
                    fontStyle: 'italic',
                    border: '1px dashed #D1D5DB',
                    borderRadius: '6px',
                    backgroundColor: '#F9FAFB'
                  }}>
                    マネタイズ図がありません。編集ボタンから追加してください。
                  </div>
                )}
              </div>
            )}
          </div>
        );
        
      case 'relation':
        return (
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: '13px', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                💡 <strong>保存について:</strong> 編集内容を保存するには、ページ右上の「保存」ボタンをクリックしてください。
              </div>
            </div>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ fontWeight: '600', color: '#374151', fontSize: '16px' }}>
                  相関図
                </label>
                {initiative?.relationDiagramId && (
                  <a
                    href={`#relation-${initiative.relationDiagramId}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigator.clipboard.writeText(initiative.relationDiagramId || '');
                      alert(`相関図ID "${initiative.relationDiagramId}" をクリップボードにコピーしました`);
                    }}
                    style={{
                      fontSize: '12px',
                      color: '#3B82F6',
                      textDecoration: 'none',
                      padding: '2px 8px',
                      backgroundColor: '#EFF6FF',
                      borderRadius: '4px',
                      border: '1px solid #BFDBFE',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#DBEAFE';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#EFF6FF';
                    }}
                    title="相関図IDをクリップボードにコピー"
                  >
                    ({initiative.relationDiagramId})
                  </a>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={async () => {
                    if (!initiative) return;
                    // relationDiagramIdが存在しない場合は生成
                    if (!initiative.relationDiagramId) {
                      const newId = `rd_${generateUniqueId()}`;
                      const updatedInitiative = {
                        ...initiative,
                        relationDiagramId: newId,
                      };
                      await saveFocusInitiative(updatedInitiative);
                      setInitiative(updatedInitiative);
                    }
                    setIsRelationUpdateModalOpen(true);
                  }}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#3B82F6',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#2563EB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#3B82F6';
                  }}
                >
                  <span>📊</span>
                  <span>図を更新する</span>
                </button>
                {!isEditingRelation ? (
                  <button
                    onClick={() => setIsEditingRelation(true)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#F3F4F6',
                      color: '#374151',
                      border: '1px solid #D1D5DB',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    編集
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsEditingRelation(false);
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#6B7280',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    表示に戻る
                  </button>
                )}
              </div>
            </div>
            
            {isEditingRelation ? (
              <div>
                <textarea
                  value={localRelationDiagram}
                  onChange={(e) => setLocalRelationDiagram(e.target.value)}
                  placeholder={`例:
graph LR
    A[施策A] -->|連携| B[施策B]
    A -->|影響| C[施策C]
    B -->|協力| C
    D[外部要因] -->|影響| A
    D -->|影響| B`}
                  style={{
                    width: '100%',
                    minHeight: '400px',
                    padding: '12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    resize: 'vertical',
                    lineHeight: '1.6',
                  }}
                />
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280' }}>
                  💡 Mermaid図のコードを入力してください。施策間の関係性や影響関係を可視化できます。
                </div>
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280' }}>
                  📖 <a href="https://mermaid.js.org/intro/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>Mermaid公式ドキュメント</a>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '16px' }}>
                {localRelationDiagram ? (
                  <div style={{ border: '1px solid #E5E7EB', borderRadius: '6px', padding: '20px', backgroundColor: '#FFFFFF' }}>
                    <MermaidDiagram
                      diagramCode={localRelationDiagram}
                      diagramId={`relation-${initiativeId}`}
                    />
                  </div>
                ) : (
                  <div style={{ 
                    padding: '60px 20px', 
                    textAlign: 'center', 
                    color: '#9CA3AF', 
                    fontStyle: 'italic',
                    border: '1px dashed #D1D5DB',
                    borderRadius: '6px',
                    backgroundColor: '#F9FAFB'
                  }}>
                    相関図がありません。編集ボタンから追加してください。
                  </div>
                )}
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Layout>
      <MermaidLoader />
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '4px' }}>
              {orgData ? orgData.name : ''} / 注力施策
            </div>
            <h2 style={{ margin: 0 }}>{initiative.title}</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {activeTab === 'details' && (
              <>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#F3F4F6',
                      color: '#374151',
                      border: '1px solid #D1D5DB',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    詳細を編集
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditingContent(initiative.content || '');
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#F3F4F6',
                      color: '#374151',
                      border: '1px solid #D1D5DB',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    編集を終了
                  </button>
                )}
              </>
            )}
            {savingStatus !== 'idle' && (
              <div style={{
                padding: '8px 12px',
                fontSize: '12px',
                color: savingStatus === 'saving' ? '#6B7280' : '#10B981',
                backgroundColor: savingStatus === 'saving' ? '#F3F4F6' : '#D1FAE5',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                {savingStatus === 'saving' ? '💾 保存中...' : '✅ 保存完了'}
              </div>
            )}
            <button
              onClick={handleManualSave}
              disabled={savingStatus === 'saving'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                backgroundColor: savingStatus === 'saving' ? '#9CA3AF' : '#10B981',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: savingStatus === 'saving' ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s, opacity 0.2s',
                opacity: savingStatus === 'saving' ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (savingStatus !== 'saving') {
                  e.currentTarget.style.backgroundColor = '#059669';
                  e.currentTarget.style.opacity = '1';
                }
              }}
              onMouseLeave={(e) => {
                if (savingStatus !== 'saving') {
                  e.currentTarget.style.backgroundColor = '#10B981';
                  e.currentTarget.style.opacity = '1';
                }
              }}
              title="編集内容を保存します"
            >
              <SaveIcon size={18} color="white" />
            </button>
            <button
              onClick={handleDownloadJson}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                backgroundColor: '#3B82F6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'background-color 0.2s, opacity 0.2s',
                opacity: 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563EB';
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3B82F6';
                e.currentTarget.style.opacity = '1';
              }}
              title="JSONファイルをダウンロード"
            >
              <DownloadIcon size={18} color="white" />
            </button>
            <button
              onClick={() => {
                router.push(`/organization/detail?id=${organizationId}&tab=focusInitiatives`);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                backgroundColor: '#6B7280',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'background-color 0.2s, opacity 0.2s',
                opacity: 0.9,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4B5563';
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6B7280';
                e.currentTarget.style.opacity = '0.9';
              }}
              title="戻る"
            >
              <BackIcon size={18} color="white" />
            </button>
          </div>
        </div>

        {/* 関連テーマセクション（タイトルの下に常に表示） */}
        <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151', fontSize: '16px' }}>
            関連テーマ（複数選択可能）
          </label>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '12px' }}>
            この注力施策が関連する分析ページのテーマを選択してください
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {themes.map((theme) => {
              const isSelected = localThemeIds.includes(theme.id);
              return (
                <label
                  key={theme.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    border: `1px solid ${isSelected ? 'var(--color-primary)' : '#D1D5DB'}`,
                    borderRadius: '6px',
                    backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setLocalThemeIds([...localThemeIds, theme.id]);
                      } else {
                        setLocalThemeIds(localThemeIds.filter(id => id !== theme.id));
                      }
                    }}
                    style={{ marginRight: '8px' }}
                  />
                  {theme.title}
                </label>
              );
            })}
          </div>
          {themes.length === 0 && (
            <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px' }}>
              テーマがありません。分析ページでテーマを作成してください。
            </div>
          )}
          
          {/* 個別トピックセクション */}
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #E5E7EB' }}>
            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '12px',
                cursor: 'pointer',
              }}
              onClick={() => setIsTopicsExpanded(!isTopicsExpanded)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', transition: 'transform 0.2s', transform: isTopicsExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                  ▶
                </span>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', fontSize: '16px', cursor: 'pointer' }}>
                  個別トピック（複数選択可能）
                  {localTopicIds.length > 0 && (
                    <span style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280', marginLeft: '8px' }}>
                      ({localTopicIds.length}件)
                    </span>
                  )}
                </label>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTopicSelectModalOpen(true);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3B82F6';
                }}
              >
                <span>📝</span>
                <span>個別トピックを選択</span>
              </button>
            </div>
            
            {/* 開閉式の内容 */}
            {isTopicsExpanded && (
              <>
                <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '12px' }}>
                  この注力施策が関連する議事録アーカイブの個別トピックを選択してください
                </div>
                
                {/* 選択したトピックの表示 */}
                {localTopicIds.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {localTopicIds.map((topicId) => {
                  const topic = topics.find(t => t.id === topicId);
                  if (!topic) {
                    // トピックが見つからない場合（他の組織のトピックが削除された可能性）
                    return (
                      <div
                        key={topicId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          border: '1px solid #EF4444',
                          borderRadius: '6px',
                          backgroundColor: '#FEE2E2',
                          fontSize: '14px',
                        }}
                      >
                        <span style={{ fontWeight: '500', marginRight: '8px', color: '#DC2626' }}>
                          トピックが見つかりません (ID: {topicId.substring(0, 20)}...)
                        </span>
                        <button
                          onClick={() => {
                            setLocalTopicIds(localTopicIds.filter(id => id !== topicId));
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#EF4444',
                            cursor: 'pointer',
                            fontSize: '16px',
                            padding: '0',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            transition: 'background-color 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#FEE2E2';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title="削除"
                        >
                          ×
                        </button>
                      </div>
                    );
                  }
                  
                  // 組織名を取得
                  const topicOrg = topic.organizationId ? findOrganizationById(orgData, topic.organizationId) : null;
                  const topicOrgName = topicOrg ? (topicOrg.name || topicOrg.title || topic.organizationId) : topic.organizationId;
                  const isOtherOrg = topic.organizationId !== organizationId;
                  
                  return (
                    <div
                      key={topicId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 12px',
                        border: `1px solid ${isOtherOrg ? '#F59E0B' : 'var(--color-primary)'}`,
                        borderRadius: '6px',
                        backgroundColor: isOtherOrg ? '#FEF3C7' : '#EFF6FF',
                        fontSize: '14px',
                      }}
                    >
                      {isOtherOrg && (
                        <span style={{ fontSize: '11px', color: '#F59E0B', fontWeight: '600', marginRight: '6px', padding: '2px 6px', backgroundColor: '#FDE68A', borderRadius: '4px' }}>
                          他組織
                        </span>
                      )}
                      <span style={{ fontWeight: '500', marginRight: '8px' }}>
                        {topic.title}
                      </span>
                      <span style={{ fontSize: '12px', color: '#9CA3AF', marginRight: '8px' }}>
                        ({topic.meetingNoteTitle})
                      </span>
                      {isOtherOrg && (
                        <span style={{ fontSize: '11px', color: '#6B7280', marginRight: '8px' }}>
                          [{topicOrgName}]
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setLocalTopicIds(localTopicIds.filter(id => id !== topicId));
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          fontSize: '16px',
                          padding: '0',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#FEE2E2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        title="削除"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
                ) : (
                  <div style={{ fontSize: '14px', color: '#9CA3AF', fontStyle: 'italic', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '6px', border: '1px dashed #D1D5DB' }}>
                    選択された個別トピックはありません。「個別トピックを選択」ボタンから選択してください。
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* 注力施策IDと特性要因図IDのリンク */}
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  注力施策ID:
                </span>
                <a
                  href={`/organization/initiative?organizationId=${organizationId}&initiativeId=${initiativeId}`}
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(`/organization/initiative?organizationId=${organizationId}&initiativeId=${initiativeId}`);
                  }}
                  style={{
                    fontSize: '12px',
                    color: '#3B82F6',
                    fontFamily: 'monospace',
                    fontWeight: '400',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#EFF6FF',
                    textDecoration: 'none',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#DBEAFE';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#EFF6FF';
                  }}
                >
                  {initiativeId}
                </a>
              </div>
              {initiative.causeEffectDiagramId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    特性要因図:
                  </span>
                  <a
                    href={`/analytics/cause-effect/${initiative.causeEffectDiagramId}`}
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(`/analytics/cause-effect/${initiative.causeEffectDiagramId}`);
                    }}
                    style={{
                      fontSize: '12px',
                      color: '#3B82F6',
                      fontFamily: 'monospace',
                      fontWeight: '400',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#EFF6FF',
                      textDecoration: 'none',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#DBEAFE';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#EFF6FF';
                    }}
                  >
                    {initiative.causeEffectDiagramId}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div style={{ borderBottom: '1px solid #E5E7EB', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    borderBottom: `2px solid ${activeTab === tab.id ? 'var(--color-primary)' : 'transparent'}`,
                    backgroundColor: 'transparent',
                    color: activeTab === tab.id ? 'var(--color-primary)' : '#6B7280',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: activeTab === tab.id ? '600' : '400',
                    transition: 'all 0.2s',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', padding: '8px 12px' }}>
              💡 右上の「保存」ボタンをクリックして編集内容を保存してください
            </div>
          </div>
        </div>

        {/* タブコンテンツ */}
        {renderTabContent()}
      </div>

      {/* 特性要因図更新モーダル */}
      {initiative && initiative.causeEffectDiagramId && (
        <CauseEffectDiagramUpdateModal
          isOpen={isUpdateModalOpen}
          causeEffectDiagramId={initiative.causeEffectDiagramId}
          initiative={initiative}
          onClose={() => setIsUpdateModalOpen(false)}
          onUpdated={() => {
            setIsUpdateModalOpen(false);
            // データを再読み込み
            const loadInitiative = async () => {
              try {
                const data = await getFocusInitiativeById(initiativeId);
                if (data) {
                  setInitiative(data);
                  // ローカル状態も更新
                  setLocalMethod(data.method || []);
                  setLocalMeans(data.means || []);
                  setLocalObjective(data.objective || '');
                }
              } catch (err) {
                console.error('データの再読み込みに失敗しました:', err);
              }
            };
            loadInitiative();
          }}
        />
      )}

      {/* マネタイズ図更新モーダル */}
      {initiative && (
        <MonetizationDiagramUpdateModal
          isOpen={isMonetizationUpdateModalOpen}
          monetizationDiagramId={initiative.monetizationDiagramId || ''}
          initiative={initiative}
          onClose={() => setIsMonetizationUpdateModalOpen(false)}
          onUpdated={() => {
            setIsMonetizationUpdateModalOpen(false);
            // データを再読み込み
            const loadInitiative = async () => {
              try {
                const data = await getFocusInitiativeById(initiativeId);
                if (data) {
                  setInitiative(data);
                  // ローカル状態も更新
                  setLocalMonetizationDiagram(data.monetizationDiagram || '');
                }
              } catch (err) {
                console.error('データの再読み込みに失敗しました:', err);
              }
            };
            loadInitiative();
          }}
        />
      )}

      {/* 相関図更新モーダル */}
      {initiative && (
        <RelationDiagramUpdateModal
          isOpen={isRelationUpdateModalOpen}
          relationDiagramId={initiative.relationDiagramId || ''}
          initiative={initiative}
          onClose={() => setIsRelationUpdateModalOpen(false)}
          onUpdated={() => {
            setIsRelationUpdateModalOpen(false);
            // データを再読み込み
            const loadInitiative = async () => {
              try {
                const data = await getFocusInitiativeById(initiativeId);
                if (data) {
                  setInitiative(data);
                  // ローカル状態も更新
                  setLocalRelationDiagram(data.relationDiagram || '');
                }
              } catch (err) {
                console.error('データの再読み込みに失敗しました:', err);
              }
            };
            loadInitiative();
          }}
        />
      )}

      {/* 個別トピック選択モーダル */}
      {isTopicSelectModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
              onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsTopicSelectModalOpen(false);
              setTopicSearchQuery('');
              setSelectedOrgId('');
              setSelectedMeetingNoteId('');
              setModalTopics([]);
              setOrgIdInput('');
              setMeetingNoteIdInput('');
              setFilteredMeetingNotes([]);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '1200px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#111827' }}>
                  個別トピックを選択
                </h2>
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#6B7280' }}>
                  選択済み: {localTopicIds.length}件
                </div>
              </div>
              <button
                onClick={() => {
                  setIsTopicSelectModalOpen(false);
                  setTopicSearchQuery('');
                  setSelectedOrgId('');
                  setSelectedMeetingNoteId('');
                  setModalTopics([]);
                  setOrgIdInput('');
                  setMeetingNoteIdInput('');
                  setFilteredMeetingNotes([]);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#6B7280',
                  cursor: 'pointer',
                  padding: '4px',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* 組織・事業会社・議事録選択セクション */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
              {/* ユニークID入力セクション */}
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '8px' }}>
                  ユニークIDで直接指定（オプション）
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#6B7280' }}>
                      組織ID
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="組織IDを入力"
                        value={orgIdInput}
                        onChange={(e) => setOrgIdInput(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter' && orgIdInput.trim()) {
                            const foundOrg = findOrganizationById(orgTreeForModal, orgIdInput.trim());
                            if (foundOrg && foundOrg.id) {
                              setSelectedOrgId(foundOrg.id);
                              setSelectedMeetingNoteId('');
                              setModalTopics([]);
                              const notes = allMeetingNotes.filter(note => note.organizationId === foundOrg.id);
                              setFilteredMeetingNotes(notes);
                              setOrgIdInput(''); // 検索後にクリア
                            } else {
                              alert('指定された組織IDが見つかりませんでした');
                            }
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      />
                      <button
                        onClick={async () => {
                          if (orgIdInput.trim()) {
                            const foundOrg = findOrganizationById(orgTreeForModal, orgIdInput.trim());
                            if (foundOrg && foundOrg.id) {
                              setSelectedOrgId(foundOrg.id);
                              setSelectedMeetingNoteId('');
                              setModalTopics([]);
                              const notes = allMeetingNotes.filter(note => note.organizationId === foundOrg.id);
                              setFilteredMeetingNotes(notes);
                              setOrgIdInput(''); // 検索後にクリア
                            } else {
                              alert('指定された組織IDが見つかりませんでした');
                            }
                          }
                        }}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#3B82F6',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        検索
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#6B7280' }}>
                      議事録ID
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="議事録IDを入力"
                        value={meetingNoteIdInput}
                        onChange={(e) => setMeetingNoteIdInput(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter' && meetingNoteIdInput.trim()) {
                            // まず組織の議事録を検索
                            const orgNote = await getMeetingNoteById(meetingNoteIdInput.trim());
                            if (orgNote) {
                              setSelectedMeetingNoteId(orgNote.id);
                              setSelectedOrgId(orgNote.organizationId);
                              const topics = await getTopicsByMeetingNote(orgNote.id);
                              setModalTopics(topics);
                              const notes = allMeetingNotes.filter(n => n.organizationId === orgNote.organizationId);
                              setFilteredMeetingNotes(notes);
                            } else {
                              alert('指定された議事録IDが見つかりませんでした');
                            }
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      />
                      <button
                        onClick={async () => {
                          if (meetingNoteIdInput.trim()) {
                            // まず組織の議事録を検索
                            const orgNote = await getMeetingNoteById(meetingNoteIdInput.trim());
                            if (orgNote) {
                              setSelectedMeetingNoteId(orgNote.id);
                              setSelectedOrgId(orgNote.organizationId);
                              const topics = await getTopicsByMeetingNote(orgNote.id);
                              setModalTopics(topics);
                              const notes = allMeetingNotes.filter(n => n.organizationId === orgNote.organizationId);
                              setFilteredMeetingNotes(notes);
                            } else {
                              alert('指定された議事録IDが見つかりませんでした');
                            }
                          }
                        }}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#3B82F6',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        検索
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 組織選択 */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                  組織を選択
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedOrgId}
                    onChange={async (e) => {
                      const orgId = e.target.value;
                      setSelectedOrgId(orgId);
                      setSelectedMeetingNoteId('');
                      setModalTopics([]);
                      if (orgId) {
                        const notes = allMeetingNotes.filter(note => note.organizationId === orgId);
                        setFilteredMeetingNotes(notes);
                      } else {
                        setFilteredMeetingNotes([]);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 40px 12px 14px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: '#FFFFFF',
                      appearance: 'none',
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%236B7280\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 14px center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#9CA3AF';
                      e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#D1D5DB';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3B82F6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#D1D5DB';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <option value="" style={{ color: '#9CA3AF' }}>組織を選択してください</option>
                    {allOrganizations.map((org) => {
                      const displayName = org.name || org.title || org.id;
                      const englishName = org.title && org.name && org.title !== org.name ? org.title : null;
                      return (
                        <option key={org.id} value={org.id} style={{ color: '#111827' }}>
                          {displayName}{englishName ? ` (${englishName})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
                {selectedOrgId && (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: '#6B7280' }}>
                    {(() => {
                      const selectedOrg = allOrganizations.find(org => org.id === selectedOrgId);
                      if (selectedOrg) {
                        const japaneseName = selectedOrg.name || '';
                        const englishName = selectedOrg.title && selectedOrg.name && selectedOrg.title !== selectedOrg.name ? selectedOrg.title : null;
                        return (
                          <span>
                            選択中: <span style={{ fontWeight: 500, color: '#374151' }}>{japaneseName}</span>
                            {englishName && <span style={{ color: '#9CA3AF' }}> ({englishName})</span>}
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>

              {/* 議事録カード表示 */}
              {selectedOrgId && filteredMeetingNotes.length > 0 && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                    議事録アーカイブを選択 ({filteredMeetingNotes.length}件)
                  </label>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '12px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      padding: '8px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                    }}
                  >
                    {filteredMeetingNotes.map((note) => {
                      const isSelected = selectedMeetingNoteId === note.id;
                      return (
                        <div
                          key={note.id}
                          onClick={async () => {
                            setSelectedMeetingNoteId(note.id);
                            const topics = await getTopicsByMeetingNote(note.id);
                            setModalTopics(topics);
                          }}
                          style={{
                            padding: '12px',
                            border: `2px solid ${isSelected ? '#3B82F6' : '#E5E7EB'}`,
                            borderRadius: '8px',
                            backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = '#F9FAFB';
                              e.currentTarget.style.borderColor = '#D1D5DB';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = '#FFFFFF';
                              e.currentTarget.style.borderColor = '#E5E7EB';
                            }
                          }}
                        >
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                            {note.title}
                          </div>
                          {note.description && (
                            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px', lineHeight: '1.4', maxHeight: '40px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {note.description.substring(0, 60)}{note.description.length > 60 ? '...' : ''}
                            </div>
                          )}
                          <div style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'monospace', marginTop: '4px' }}>
                            ID: {note.id}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* 検索バー */}
            {selectedMeetingNoteId && (
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #E5E7EB' }}>
                <input
                  type="text"
                  placeholder="トピック名で検索..."
                  value={topicSearchQuery}
                  onChange={(e) => setTopicSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>
            )}

            {/* トピック一覧 */}
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                padding: '16px 24px',
              }}
            >
              {!selectedMeetingNoteId ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                  組織と議事録アーカイブを選択すると、その議事録で作成された個別トピックが表示されます。
                </div>
              ) : modalTopics.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                  この議事録アーカイブには個別トピックがありません。
                </div>
              ) : (
                (() => {
                  // 検索フィルタリング
                  const filteredTopics = modalTopics.filter(topic => {
                    if (!topicSearchQuery) return true;
                    const query = topicSearchQuery.toLowerCase();
                    return (
                      topic.title.toLowerCase().includes(query) ||
                      topic.content.toLowerCase().includes(query)
                    );
                  });

                  if (filteredTopics.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                        検索条件に一致するトピックが見つかりませんでした。
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {filteredTopics.map((topic) => {
                        const isSelected = localTopicIds.includes(topic.id);
                        return (
                          <div
                            key={topic.id}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              devLog('🖱️ [モーダル] トピックカードがクリックされました:', {
                                topicId: topic.id,
                                topicTitle: topic.title,
                                currentLocalTopicIds: localTopicIds,
                                isSelected,
                              });
                              if (isSelected) {
                                const newTopicIds = localTopicIds.filter(id => id !== topic.id);
                                devLog('🗑️ [モーダル] トピックを削除:', {
                                  topicId: topic.id,
                                  topicTitle: topic.title,
                                });
                                setLocalTopicIds(newTopicIds);
                              } else {
                                const newTopicIds = [...localTopicIds, topic.id];
                                devLog('➕ [モーダル] トピックを追加:', {
                                  topicId: topic.id,
                                  topicTitle: topic.title,
                                });
                                setLocalTopicIds(newTopicIds);
                              }
                            }}
                            style={{
                              padding: '16px',
                              border: `1px solid ${isSelected ? 'var(--color-primary)' : '#E5E7EB'}`,
                              borderRadius: '8px',
                              backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = '#F9FAFB';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = '#FFFFFF';
                              }
                            }}
                          >
                            <div 
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    border: `2px solid ${isSelected ? 'var(--color-primary)' : '#D1D5DB'}`,
                                    borderRadius: '4px',
                                    backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    pointerEvents: 'none',
                                  }}
                                >
                                  {isSelected && (
                                    <span style={{ color: '#FFFFFF', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                                  )}
                                </div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827', pointerEvents: 'none' }}>
                                  {topic.title}
                                </h3>
                              </div>
                            </div>
                            {topic.content && (
                              <div 
                                style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px', lineHeight: '1.5', maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }}
                              >
                                {topic.content.substring(0, 150)}{topic.content.length > 150 ? '...' : ''}
                              </div>
                            )}
                            <div 
                              style={{ marginTop: '8px', fontSize: '12px', color: '#9CA3AF', fontFamily: 'monospace', pointerEvents: 'none' }}
                            >
                              ID: {topic.id}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>

            {/* フッター */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #E5E7EB',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
              }}
            >
              <button
                onClick={() => {
                  setIsTopicSelectModalOpen(false);
                  setTopicSearchQuery('');
                  setSelectedOrgId('');
                  setSelectedMeetingNoteId('');
                  setModalTopics([]);
                  setOrgIdInput('');
                  setMeetingNoteIdInput('');
                  setFilteredMeetingNotes([]);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                閉じる
              </button>
              <button
                onClick={async () => {
                  try {
                    setSavingStatus('saving');
                    devLog('💾 [モーダル保存] 保存開始:', {
                      localTopicIds,
                      localTopicIdsLength: localTopicIds.length,
                    });
                    await handleManualSave();
                    devLog('✅ [モーダル保存] 保存完了');
                    
                    // 保存成功後、データを再読み込み
                    try {
                      const updatedInitiative = await getFocusInitiativeById(initiativeId);
                      if (updatedInitiative) {
                        devLog('📖 [モーダル保存] 再読み込み完了:', {
                          topicIdsLength: updatedInitiative.topicIds?.length || 0,
                        });
                        setInitiative(updatedInitiative);
                        setLocalTopicIds(Array.isArray(updatedInitiative.topicIds) ? updatedInitiative.topicIds : []);
                      }
                    } catch (reloadError) {
                      devWarn('⚠️ [モーダル保存] 再読み込みに失敗:', reloadError);
                    }
                    
                    // モーダルを閉じる
                    setIsTopicSelectModalOpen(false);
                    setTopicSearchQuery('');
                    setSelectedOrgId('');
                    setSelectedMeetingNoteId('');
                    setModalTopics([]);
                    setOrgIdInput('');
                    setMeetingNoteIdInput('');
                    setFilteredMeetingNotes([]);
                  } catch (error) {
                    console.error('❌ [モーダル保存] 保存エラー:', error);
                    setSavingStatus('idle');
                    // エラーが発生した場合はモーダルを閉じない
                  }
                }}
                disabled={savingStatus === 'saving'}
                style={{
                  padding: '10px 20px',
                  backgroundColor: savingStatus === 'saving' ? '#9CA3AF' : '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: savingStatus === 'saving' ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onMouseEnter={(e) => {
                  if (savingStatus !== 'saving') {
                    e.currentTarget.style.backgroundColor = '#059669';
                  }
                }}
                onMouseLeave={(e) => {
                  if (savingStatus !== 'saving') {
                    e.currentTarget.style.backgroundColor = '#10B981';
                  }
                }}
              >
                {savingStatus === 'saving' ? (
                  <>
                    <span>保存中...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>保存</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* AI作文モーダル */}
      {isAIGenerationModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsAIGenerationModalOpen(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '95%',
              maxWidth: '1400px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>
                AIで作文 - {aiGenerationTarget === 'description' ? '説明' : '目標'}
              </h2>
              <button
                onClick={() => setIsAIGenerationModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#6B7280',
                  cursor: 'pointer',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>
            
            {/* コンテンツ */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {/* AIモデル選択 */}
              <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                  AIモデル選択
                </label>
                
                {/* モデルタイプ選択 */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    {(['gpt', 'local'] as const).map((type) => (
                      <label
                        key={type}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          border: `2px solid ${aiModelType === type ? '#3B82F6' : '#D1D5DB'}`,
                          borderRadius: '6px',
                          backgroundColor: aiModelType === type ? '#EFF6FF' : '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          fontSize: '13px',
                        }}
                      >
                        <input
                          type="radio"
                          name="aiModelType"
                          value={type}
                          checked={aiModelType === type}
                          onChange={(e) => setAiModelType(e.target.value as 'gpt' | 'local')}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>{type === 'gpt' ? 'GPT' : 'ローカル'}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* モデル選択 */}
                {aiModelType === 'local' && loadingAiLocalModels && (
                  <div style={{ padding: '8px', fontSize: '12px', color: '#6B7280' }}>
                    🔄 利用可能なモデルを取得中...
                  </div>
                )}
                {aiModelType === 'local' && !loadingAiLocalModels && availableAiModels.length === 0 && (
                  <div style={{ padding: '8px', fontSize: '12px', color: '#DC2626' }}>
                    ⚠️ 利用可能なローカルモデルが見つかりませんでした
                  </div>
                )}
                {availableAiModels.length > 0 && (
                  <select
                    value={aiSelectedModel}
                    onChange={(e) => setAiSelectedModel(e.target.value)}
                    disabled={loadingAiLocalModels}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '13px',
                      backgroundColor: '#FFFFFF',
                      color: '#374151',
                      cursor: loadingAiLocalModels ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {availableAiModels.map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              {/* 要約形式選択 */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151' }}>
                  要約形式
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {[
                    { value: 'auto', label: 'おまかせ' },
                    { value: 'bullet', label: '箇条書き' },
                    { value: 'paragraph', label: '説明文' },
                    { value: 'custom', label: 'カスタム' },
                  ].map((format) => (
                    <button
                      key={format.value}
                      type="button"
                      onClick={() => setAiSummaryFormat(format.value as 'auto' | 'bullet' | 'paragraph' | 'custom')}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: aiSummaryFormat === format.value ? '#111827' : '#FFFFFF',
                        color: aiSummaryFormat === format.value ? '#FFFFFF' : '#374151',
                        border: `1px solid ${aiSummaryFormat === format.value ? '#111827' : '#D1D5DB'}`,
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (aiSummaryFormat !== format.value) {
                          e.currentTarget.style.backgroundColor = '#F9FAFB';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (aiSummaryFormat !== format.value) {
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                        }
                      }}
                    >
                      {format.label}
                    </button>
                  ))}
                </div>
                
                {/* 文字数選択（おまかせ、箇条書き、説明文の場合） */}
                {aiSummaryFormat !== 'custom' && (
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#6B7280' }}>
                      文字数: {aiSummaryLength}文字
                    </label>
                    <input
                      type="range"
                      min="200"
                      max="2000"
                      step="100"
                      value={aiSummaryLength}
                      onChange={(e) => setAiSummaryLength(Number(e.target.value))}
                      style={{
                        width: '100%',
                        height: '6px',
                        borderRadius: '3px',
                        backgroundColor: '#E5E7EB',
                        outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '12px', color: '#9CA3AF' }}>
                      <span>200文字</span>
                      <span>2000文字</span>
                    </div>
                  </div>
                )}
                
                {/* カスタムプロンプト入力（カスタム選択時） */}
                {aiSummaryFormat === 'custom' && (
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
                      カスタム指示（プロンプト）
                    </label>
                    <textarea
                      value={aiCustomPrompt}
                      onChange={(e) => setAiCustomPrompt(e.target.value)}
                      placeholder="例: 3つの主要なポイントを箇条書きで、各ポイントは2-3文で説明してください。"
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '14px',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                )}
              </div>
              
              {/* 概要入力 */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                  概要（任意）
                </label>
                <textarea
                  value={aiGenerationInput}
                  onChange={(e) => setAIGenerationInput(e.target.value)}
                  placeholder="要約したい内容を入力してください（任意）"
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
              </div>
              
              {/* リンクしている個別トピック選択 */}
              {(() => {
                const linkedTopics = topics.filter(topic => localTopicIds.includes(topic.id));
                return linkedTopics.length > 0 ? (
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                      関連トピックを選択（任意）
                    </label>
                    <div
                      style={{
                        maxHeight: '300px',
                        overflowY: 'auto',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        padding: '12px',
                      }}
                    >
                      {linkedTopics.map((topic) => (
                      <label
                        key={topic.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          padding: '12px',
                          marginBottom: '8px',
                          border: selectedTopicIdsForAI.includes(topic.id) ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                          borderRadius: '6px',
                          backgroundColor: selectedTopicIdsForAI.includes(topic.id) ? '#EFF6FF' : '#FFFFFF',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTopicIdsForAI.includes(topic.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTopicIdsForAI([...selectedTopicIdsForAI, topic.id]);
                            } else {
                              setSelectedTopicIdsForAI(selectedTopicIdsForAI.filter(id => id !== topic.id));
                            }
                          }}
                          style={{ marginRight: '12px', marginTop: '2px', flexShrink: 0 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '500', color: '#111827', marginBottom: '4px' }}>
                            {topic.title}
                          </div>
                          <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.5' }}>
                            {topic.content.substring(0, 200)}{topic.content.length > 200 ? '...' : ''}
                          </div>
                        </div>
                      </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '6px', color: '#6B7280', fontSize: '14px' }}>
                    リンクしている個別トピックがありません
                  </div>
                );
              })()}
              
              {/* AI生成結果のプレビュー */}
              {aiGeneratedContent && originalContent != null && (
                <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #E5E7EB' }}>
                  <div style={{ marginBottom: '16px', fontSize: '15px', fontWeight: '600', color: '#111827' }}>
                    AI生成結果のプレビュー
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '20px' }}>
                    {/* 既存の内容 */}
                    <div>
                      <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#6B7280' }}>
                        既存の内容
                      </div>
                      <div
                        style={{
                          padding: '16px',
                          backgroundColor: '#F9FAFB',
                          borderRadius: '6px',
                          maxHeight: '400px',
                          overflowY: 'auto',
                        }}
                      >
                        {originalContent ? (
                          <div
                            className="markdown-content"
                            style={{
                              fontSize: '14px',
                              lineHeight: '1.8',
                              color: '#374151',
                            }}
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {originalContent}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: '14px' }}>
                            内容がありません
                          </p>
                        )}
                      </div>
                    </div>
                    {/* AI生成結果 */}
                    <div>
                      <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#111827' }}>
                        AI生成結果
                      </div>
                      <div
                        style={{
                          padding: '16px',
                          backgroundColor: '#FFFFFF',
                          borderRadius: '6px',
                          maxHeight: '400px',
                          overflowY: 'auto',
                        }}
                      >
                        <div
                          className="markdown-content"
                          style={{
                            fontSize: '14px',
                            lineHeight: '1.8',
                            color: '#374151',
                          }}
                        >
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {aiGeneratedContent}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        // Undo: 元の内容に戻す（何も適用しない）
                        setAiGeneratedContent(null);
                        setAiGeneratedTarget(null);
                        setOriginalContent(null);
                        setAIGenerationInput('');
                        setSelectedTopicIdsForAI([]);
                        setAiSummaryFormat('auto');
                        setAiSummaryLength(500);
                        setAiCustomPrompt('');
                      }}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#FFFFFF',
                        color: '#374151',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                      }}
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => {
                        // Keep: 生成結果を適用してモーダルを閉じる
                        if (aiGenerationTarget === 'description') {
                          setLocalDescription(aiGeneratedContent);
                          setIsEditingDescription(true);
                        } else if (aiGenerationTarget === 'objective') {
                          setLocalObjective(aiGeneratedContent);
                          setIsEditingObjective(true);
                        }
                        setAiGeneratedContent(null);
                        setAiGeneratedTarget(null);
                        setOriginalContent(null);
                        setIsAIGenerationModalOpen(false);
                        setAIGenerationInput('');
                        setSelectedTopicIdsForAI([]);
                      }}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#111827',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#374151';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#111827';
                      }}
                    >
                      適用する
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* フッター */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #E5E7EB',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
              }}
            >
              <button
                onClick={() => {
                  // モーダルを閉じる際に、プレビュー状態もリセット
                  setAiGeneratedContent(null);
                  setAiGeneratedTarget(null);
                  setOriginalContent(null);
                  setAIGenerationInput('');
                  setSelectedTopicIdsForAI([]);
                  setAiSummaryFormat('auto');
                  setAiSummaryLength(500);
                  setAiCustomPrompt('');
                  setIsAIGenerationModalOpen(false);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                キャンセル
              </button>
              {!aiGeneratedContent && (
                <button
                  onClick={async () => {
                    try {
                      if (!aiGenerationInput.trim() && selectedTopicIdsForAI.length === 0) {
                        alert('概要または関連トピックを少なくとも1つ選択してください');
                        return;
                      }
                      
                      const linkedTopics = topics.filter(topic => localTopicIds.includes(topic.id));
                      const selectedTopics = linkedTopics.filter(topic => selectedTopicIdsForAI.includes(topic.id));
                      const summary = await generateAISummary(aiGenerationInput, selectedTopics);
                      
                      devLog('✅ [AI生成] 要約生成完了:', summary?.substring(0, 100) + '...');
                      
                      // 既存の内容を保存
                      const currentContent = aiGenerationTarget === 'description' ? localDescription : localObjective;
                      devLog('📝 [AI生成] 既存の内容長:', currentContent?.length || 0);
                      devLog('🎯 [AI生成] ターゲット:', aiGenerationTarget);
                      
                      // 状態を設定（比較ビューを表示するため）
                      setOriginalContent(currentContent || '');
                      setAiGeneratedContent(summary);
                      setAiGeneratedTarget(aiGenerationTarget);
                      
                      // モーダルは閉じずに、プレビューを表示する
                      // 要約結果はまだ適用しない（プレビューで確認してから）
                    } catch (error: any) {
                      alert(`エラーが発生しました: ${error.message || '不明なエラー'}`);
                    }
                  }}
                  disabled={isAIGenerating || (!aiGenerationInput.trim() && selectedTopicIdsForAI.length === 0)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: isAIGenerating || (!aiGenerationInput.trim() && selectedTopicIdsForAI.length === 0) ? '#9CA3AF' : '#3B82F6',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: isAIGenerating || (!aiGenerationInput.trim() && selectedTopicIdsForAI.length === 0) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isAIGenerating ? (
                    <>
                      <span>生成中...</span>
                    </>
                  ) : (
                    <>
                      <span>🤖</span>
                      <span>要約を生成</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default function FocusInitiativeDetailPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p>データを読み込み中...</p>
        </div>
      </Layout>
    }>
      <FocusInitiativeDetailPageContent />
    </Suspense>
  );
}
