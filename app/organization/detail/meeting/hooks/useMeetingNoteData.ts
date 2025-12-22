import { useState, useEffect, useCallback } from 'react';
import { getMeetingNoteById, saveMeetingNote, getOrgTreeFromDb, generateUniqueId } from '@/lib/orgApi';
import type { MeetingNote, OrgNodeData } from '@/lib/orgApi';
import type { TabType, MonthContent, MeetingNoteData } from '../types';
import { MONTHS, SUMMARY_TABS } from '../constants';
import { marked } from 'marked';
import { devLog } from '../utils';

interface UseMeetingNoteDataProps {
  organizationId: string;
  meetingId: string;
  activeTab: TabType;
  onSetActiveSection: (section: string) => void;
}

export function useMeetingNoteData({
  organizationId,
  meetingId,
  activeTab,
  onSetActiveSection,
}: UseMeetingNoteDataProps) {
  const [meetingNote, setMeetingNote] = useState<MeetingNote | null>(null);
  const [orgData, setOrgData] = useState<OrgNodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthContents, setMonthContents] = useState<MeetingNoteData>({});
  const [customTabLabels, setCustomTabLabels] = useState<Record<TabType, string | undefined>>({} as Record<TabType, string | undefined>);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [downloadingHtml, setDownloadingHtml] = useState(false);

  // データ読み込み
  useEffect(() => {
    const loadData = async () => {
      if (!organizationId || !meetingId) {
        setError('組織IDまたは事業会社ID、または議事録IDが指定されていません');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // 議事録データを取得
        const noteData = await getMeetingNoteById(meetingId);
        if (!noteData) {
          setError('議事録が見つかりませんでした');
          setLoading(false);
          return;
        }
        
        setMeetingNote(noteData);
        
        // コンテンツをパース（JSON形式で保存されている想定）
        if (noteData.content) {
          try {
            const parsed = JSON.parse(noteData.content) as MeetingNoteData & { customTabLabels?: Record<TabType, string | undefined> };
            // 型チェックと初期化
            const initialized: MeetingNoteData = {};
            
            // カスタムタブラベルを復元
            if (parsed.customTabLabels) {
              setCustomTabLabels(parsed.customTabLabels);
            }
            
            MONTHS.forEach(month => {
              if (parsed[month.id] && typeof parsed[month.id] === 'object') {
                const monthData = parsed[month.id] as MonthContent;
                // サマリにIDがない場合は付与
                const summaryId = monthData.summaryId || generateUniqueId();
                // 各アイテムにIDがない場合は付与
                const itemsWithIds = monthData.items.map(item => ({
                  ...item,
                  id: item.id || generateUniqueId(),
                }));
                initialized[month.id] = {
                  ...monthData,
                  summaryId,
                  items: itemsWithIds,
                };
              } else {
                initialized[month.id] = { 
                  summary: '', 
                  summaryId: generateUniqueId(),
                  items: [] 
                };
              }
            });
            SUMMARY_TABS.forEach(tab => {
              // 既存の文字列データはsummaryとして扱い、itemsは空配列として初期化
              if (parsed[tab.id]) {
                if (typeof parsed[tab.id] === 'string') {
                  // 既存の文字列データをMonthContent型に変換
                  initialized[tab.id] = {
                    summary: parsed[tab.id] as unknown as string,
                    summaryId: generateUniqueId(),
                    items: [],
                  };
                } else if (typeof parsed[tab.id] === 'object') {
                  // 既にMonthContent型の場合は、サマリと各アイテムにIDがない場合は付与
                  const tabData = parsed[tab.id] as MonthContent;
                  const summaryId = tabData.summaryId || generateUniqueId();
                  const itemsWithIds = tabData.items.map(item => ({
                    ...item,
                    id: item.id || generateUniqueId(),
                  }));
                  initialized[tab.id] = {
                    ...tabData,
                    summaryId,
                    items: itemsWithIds,
                  };
                } else {
                  initialized[tab.id] = { 
                    summary: '', 
                    summaryId: generateUniqueId(),
                    items: [] 
                  };
                }
              } else {
                initialized[tab.id] = { 
                  summary: '', 
                  summaryId: generateUniqueId(),
                  items: [] 
                };
              }
            });
            setMonthContents(initialized);
            
            // 初期タブのサマリIDをactiveSectionに設定
            const initialTab = activeTab;
            const initialTabData = initialized[initialTab] as MonthContent | undefined;
            if (initialTabData?.summaryId) {
              onSetActiveSection(initialTabData.summaryId);
            }
          } catch {
            // JSONでない場合は空のオブジェクトとして扱う
            const empty: MeetingNoteData = {};
            MONTHS.forEach(month => {
              empty[month.id] = { summary: '', summaryId: generateUniqueId(), items: [] };
            });
            SUMMARY_TABS.forEach(tab => {
              empty[tab.id] = { summary: '', summaryId: generateUniqueId(), items: [] };
            });
            setMonthContents(empty);
          }
        } else {
          // コンテンツがない場合も初期化
          const empty: MeetingNoteData = {};
          MONTHS.forEach(month => {
            empty[month.id] = { summary: '', summaryId: generateUniqueId(), items: [] };
          });
          SUMMARY_TABS.forEach(tab => {
            empty[tab.id] = { summary: '', summaryId: generateUniqueId(), items: [] };
          });
          setMonthContents(empty);
          
          // 初期タブのサマリIDをactiveSectionに設定
          const initialTab = activeTab;
          const initialTabData = empty[initialTab] as MonthContent | undefined;
          if (initialTabData?.summaryId) {
            onSetActiveSection(initialTabData.summaryId);
          }
        }
        
        // 組織データを取得（organizationIdが指定されている場合のみ）
        if (organizationId) {
          const orgTree = await getOrgTreeFromDb();
          if (orgTree) {
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
            const foundOrg = findOrganization(orgTree);
            setOrgData(foundOrg);
          }
        } else {
          // 組織データを設定
          setOrgData(null);
        }
        
        setError(null);
      } catch (err: any) {
        console.error('データの読み込みエラー:', err);
        setError(err.message || 'データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [organizationId, meetingId, activeTab, onSetActiveSection]);

  // 手動保存
  const handleManualSave = useCallback(async () => {
    if (!meetingId || !meetingNote) {
      alert('議事録データが読み込まれていません');
      return;
    }

    try {
      setSavingStatus('saving');
      
      // カスタムタブラベルを含めて保存
      const dataToSave: MeetingNoteData & { customTabLabels?: Record<TabType, string | undefined> } = {
        ...monthContents,
        customTabLabels,
      };
      
      const updatedNote: MeetingNote = {
        ...meetingNote,
        content: JSON.stringify(dataToSave),
      };
      
      await saveMeetingNote(updatedNote);
      setHasUnsavedChanges(false);
      setSavingStatus('saved');
      
      setTimeout(() => {
        setSavingStatus('idle');
      }, 2000);
    } catch (err: any) {
      console.error('保存エラー:', err);
      alert(`保存に失敗しました: ${err.message || '不明なエラー'}`);
      setSavingStatus('idle');
    }
  }, [meetingId, meetingNote, monthContents, customTabLabels]);

  // JSONダウンロード
  const handleDownloadJson = useCallback(async () => {
    if (!meetingNote) {
      alert('議事録データが読み込まれていません');
      return;
    }

    try {
      const dataToSave: MeetingNoteData & { customTabLabels?: Record<TabType, string | undefined> } = {
        ...monthContents,
        customTabLabels,
      };
      
      const jsonData = JSON.stringify(dataToSave, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meetingNote.title || 'meeting-note'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('JSONダウンロードエラー:', err);
      alert(`JSONダウンロードに失敗しました: ${err.message || '不明なエラー'}`);
    }
  }, [meetingNote, monthContents, customTabLabels]);

  // HTMLダウンロード
  const handleDownloadHtml = useCallback(async () => {
    if (!meetingNote || downloadingHtml) return;
    
    try {
      setDownloadingHtml(true);
      // MarkdownをHTMLに変換する関数
      const markdownToHtml = (markdown: string): string => {
        if (!markdown) return '';
        try {
          return marked.parse(markdown, { breaks: true, gfm: true }) as string;
        } catch (error) {
          console.error('Markdown変換エラー:', error);
          return markdown.replace(/\n/g, '<br>');
        }
      };

      // タブのコンテンツペインを生成
      const generateContentPane = (tabId: TabType, tabData: MonthContent, isFirst: boolean): string => {
        const tabLabel = customTabLabels[tabId] || 
                        MONTHS.find(m => m.id === tabId)?.label || 
                        SUMMARY_TABS.find(t => t.id === tabId)?.label || 
                        tabId;
        const isMonthTab = MONTHS.some(m => m.id === tabId);
        
        let html = `<div id="${tabId}" class="content-pane${isFirst ? ' active' : ''}">`;
        html += `<h2>${tabLabel}${isMonthTab ? 'の議事録' : ''}</h2>`;
        
        // サマリ
        if (tabData.summary) {
          html += `<div id="${tabId}-summary" class="content-section month-summary${isFirst ? ' active' : ''}">`;
          html += `<h3>${tabLabel}サマリ</h3>`;
          html += `<div>${markdownToHtml(tabData.summary)}</div>`;
          html += `</div>`;
        }
        
        // 議事録アイテム（個別トピックは除外）
        if (tabData.items && tabData.items.length > 0) {
          tabData.items.forEach((item, index) => {
            const itemId = `${tabId}-item${index + 1}`;
            html += `<div id="${itemId}" class="content-section${isFirst && index === 0 && !tabData.summary ? ' active' : ''}">`;
            html += `<h3>${item.title || '無題'}</h3>`;
            if (item.date || item.location || item.author) {
              html += `<p>`;
              if (item.location) html += `<strong>場所:</strong> ${item.location}<br>`;
              if (item.date) html += `<strong>日時:</strong> ${item.date}<br>`;
              if (item.author) html += `<strong>文責:</strong> ${item.author}`;
              html += `</p>`;
            }
            // 個別トピック（item.topics）はエクスポート対象外
            if (item.content) {
              html += `<div>${markdownToHtml(item.content)}</div>`;
            }
            html += `</div>`;
          });
        }
        
        html += `</div>`;
        return html;
      };

      // サイドバーナビゲーションを生成
      const generateSidebar = (tabId: TabType, tabData: MonthContent, isFirst: boolean): string => {
        const tabLabel = customTabLabels[tabId] || 
                        MONTHS.find(m => m.id === tabId)?.label || 
                        SUMMARY_TABS.find(t => t.id === tabId)?.label || 
                        tabId;
        
        let html = `<div id="${tabId}-sidebar" class="sidebar-content${isFirst ? ' active' : ''}">`;
        html += `<h4>${tabLabel}</h4>`;
        html += `<ul>`;
        
        // サマリリンク
        if (tabData.summary) {
          html += `<li><a href="#${tabId}-summary" class="sidebar-link${isFirst ? ' active' : ''}">サマリ</a></li>`;
        }
        
        // 議事録アイテムリンク
        if (tabData.items && tabData.items.length > 0) {
          tabData.items.forEach((item, index) => {
            const itemId = `${tabId}-item${index + 1}`;
            html += `<li><a href="#${itemId}" class="sidebar-link">${item.title || '無題'}</a></li>`;
          });
        }
        
        html += `</ul>`;
        html += `</div>`;
        return html;
      };

      // タブHTMLを生成
      let tabsHtml = '';
      tabsHtml += `<div class="tabs-wrapper">`;
      tabsHtml += `<div class="tabs">`;
      tabsHtml += `<div class="tabs-row">`;
      MONTHS.forEach((month, index) => {
        const monthLabel = customTabLabels[month.id] || month.label;
        tabsHtml += `<li class="tab-item${index === 0 ? ' active' : ''}" data-tab="${month.id}">${monthLabel}</li>`;
      });
      tabsHtml += `</div>`;
      tabsHtml += `<div class="tabs-row">`;
      SUMMARY_TABS.forEach((tab) => {
        const tabLabel = customTabLabels[tab.id] || tab.label;
        tabsHtml += `<li class="tab-item" data-tab="${tab.id}">${tabLabel}</li>`;
      });
      tabsHtml += `</div>`;
      tabsHtml += `</div>`;
      tabsHtml += `</div>`;

      // コンテンツペインを生成
      let contentPanesHtml = '';
      let firstTab = true;
      MONTHS.forEach(month => {
        const monthData = monthContents[month.id];
        if (monthData) {
          contentPanesHtml += generateContentPane(month.id, monthData, firstTab);
          firstTab = false;
        }
      });
      SUMMARY_TABS.forEach(tab => {
        const tabData = monthContents[tab.id];
        if (tabData) {
          contentPanesHtml += generateContentPane(tab.id, tabData, firstTab);
          firstTab = false;
        }
      });

      // サイドバーを生成
      let sidebarHtml = '';
      firstTab = true;
      MONTHS.forEach(month => {
        const monthData = monthContents[month.id];
        if (monthData) {
          sidebarHtml += generateSidebar(month.id, monthData, firstTab);
          firstTab = false;
        }
      });
      SUMMARY_TABS.forEach(tab => {
        const tabData = monthContents[tab.id];
        if (tabData) {
          sidebarHtml += generateSidebar(tab.id, tabData, firstTab);
          firstTab = false;
        }
      });

      // HTMLテンプレート（テンプレートHTMLと同じ構造）
      const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${meetingNote.title || '議事録アーカイブ'}</title>
    <style>
        :root {
            --primary-color: #2c3e50;
            --secondary-color: #0066CC;
            --accent-color: #e74c3c;
            --background-color: #f4f7fb;
            --text-color: #34495e;
            --light-gray: #bdc3c7;
            --white: #ffffff;
        }

        body {
            margin: 0;
            font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
            background-color: var(--background-color);
            color: var(--text-color);
        }

        .header {
            background-color: var(--primary-color);
            color: var(--white);
            padding: 28px 0 24px 0;
            text-align: center;
            border-bottom: 5px solid var(--secondary-color);
            box-shadow: 0 4px 16px rgba(44,62,80,0.08);
        }
        .header h1 {
            margin: 0;
            font-size: 2.2em;
            letter-spacing: 2px;
        }

        .archive-container {
            max-width: 1300px;
            margin: 30px auto;
            padding: 0 20px;
        }

        .tabs-wrapper {
            background-color: var(--white);
            border-radius: 12px 12px 0 0;
            box-shadow: 0 5px 20px rgba(44,62,80,0.07);
            border-bottom: 2px solid var(--secondary-color);
        }
        .tabs {
            display: flex;
            flex-direction: column;
            list-style-type: none;
            margin: 0;
            padding: 0;
        }
        .tabs-row {
            display: flex;
            width: 100%;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        .tabs-row:first-child {
            border-bottom: 2px solid var(--secondary-color);
            padding-bottom: 10px;
            margin-bottom: 10px;
        }
        .tab-item {
            padding: 15px 28px;
            cursor: pointer;
            color: var(--primary-color);
            font-weight: bold;
            border: none;
            border-radius: 8px 8px 0 0;
            background: none;
            transition: all 0.2s;
            flex-shrink: 0;
            text-align: center;
            margin: 0 3px;
            font-size: 1.08em;
            box-shadow: 0 2px 8px rgba(44,62,80,0.04);
        }
        .tabs-row:first-child .tab-item {
            flex: 0 0 auto;
            width: calc((100% - 750px) / 12);
        }
        .tabs-row:last-child .tab-item {
            flex: 1;
        }
        .tab-item:hover {
            background-color: var(--secondary-color);
            color: var(--white);
            transform: translateY(-2px) scale(1.04);
            box-shadow: 0 4px 16px rgba(0,102,204,0.10);
        }
        .tab-item.active {
            background-color: var(--secondary-color);
            color: var(--white);
            box-shadow: 0 6px 20px rgba(0,102,204,0.13);
            z-index: 2;
        }

        .content-layout {
            display: flex;
            margin-top: 24px;
            gap: 28px;
        }
        .main-content {
            flex-grow: 1;
            background-color: var(--white);
            padding: 36px 32px 32px 32px;
            border-radius: 14px;
            min-height: 350px;
            box-shadow: 0 6px 24px rgba(44,62,80,0.10);
            border: none;
        }
        .content-pane {
            display: none;
        }
        .content-pane.active {
            display: block;
        }
        .content-pane h2 {
            margin-top: 0;
            font-size: 1.7em;
            border-bottom: 2px solid var(--secondary-color);
            padding-bottom: 12px;
            margin-bottom: 28px;
            color: var(--primary-color);
            letter-spacing: 1px;
        }
        .content-pane h3 {
            margin-top: 35px;
            font-size: 1.25em;
            color: var(--primary-color);
            border-left: 5px solid var(--secondary-color);
            padding-left: 15px;
            background: linear-gradient(90deg, #eaf3fa 60%, transparent 100%);
        }
        .content-pane h4 {
            margin-top: 30px;
            font-size: 1.1em;
            color: var(--secondary-color);
            font-weight: bold;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 8px;
        }
        .content-pane h5 {
            margin-top: 25px;
            font-size: 1em;
            color: var(--secondary-color);
            font-weight: bold;
            margin-bottom: 10px;
        }
        .content-pane h6 {
            margin-top: 20px;
            font-size: 0.98em;
            color: var(--secondary-color);
            font-weight: bold;
            margin-bottom: 8px;
        }
        .content-pane p {
            line-height: 1.85;
            margin-bottom: 15px;
            color: #444;
        }
        .content-pane ul {
            margin: 15px 0;
            padding-left: 22px;
        }
        .content-pane li {
            line-height: 1.7;
            margin-bottom: 8px;
            color: #444;
        }
        .content-pane strong {
            color: var(--primary-color);
            font-weight: 600;
        }
        .content-section {
            display: none;
        }
        .content-section.active {
            display: block;
        }
        .content-pane .month-summary {
            background-color: #f8fafd;
            border: 1px solid #e0e0e0;
            border-radius: 10px;
            padding: 22px 24px;
            margin-bottom: 32px;
            box-shadow: 0 2px 8px rgba(44,62,80,0.04);
        }
        .content-pane .month-summary h3 {
            color: var(--secondary-color);
            margin-top: 0;
            margin-bottom: 15px;
        }
        .content-pane .month-summary ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .content-pane .month-summary li {
            margin-bottom: 5px;
            color: #444;
        }
        .sidebar-link {
            display: block;
            padding: 12px 16px;
            text-decoration: none;
            color: var(--secondary-color);
            border-radius: 6px;
            transition: background 0.2s, color 0.2s, transform 0.2s;
            cursor: pointer;
            font-weight: 500;
            margin-bottom: 4px;
        }
        .sidebar-link:hover, .sidebar-link.active {
            background-color: var(--secondary-color);
            color: var(--white);
            transform: translateX(5px);
        }
        .sidebar {
            position: sticky;
            top: 20px;
            flex-basis: 300px;
            flex-shrink: 0;
            max-height: calc(100vh - 40px);
            overflow-y: auto;
            background-color: var(--white);
            padding: 28px 20px;
            border-radius: 14px;
            box-shadow: 0 4px 16px rgba(44,62,80,0.08);
            border: none;
        }
        .sidebar-content {
            display: none;
        }
        .sidebar-content.active {
            display: block;
        }
        .sidebar h4 {
            margin-top: 0;
            font-size: 1.08em;
            color: var(--primary-color);
            border-bottom: 2px solid var(--secondary-color);
            padding-bottom: 10px;
            margin-bottom: 18px;
        }
        .sidebar ul {
            list-style-type: none;
            padding: 0;
            margin: 0;
        }
        .sidebar li a {
            display: block;
            padding: 10px;
            text-decoration: none;
            color: var(--secondary-color);
            border-radius: 5px;
            transition: background-color 0.2s;
        }
        .sidebar li a:hover {
            background-color: #e9ecef;
        }
    </style>
</head>
<body>

    <header class="header">
        <h1>${meetingNote.title || '議事録アーカイブ'}</h1>
    </header>

    <div class="archive-container">
        ${tabsHtml}

        <div class="content-layout">
            <main class="main-content">
                ${contentPanesHtml}
            </main>
            
            <aside class="sidebar">
                ${sidebarHtml}
            </aside>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function () {
            const tabs = document.querySelectorAll('.tab-item');

            // サイドバーリンクのクリックイベント
            document.querySelectorAll('.sidebar-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    // すべてのサイドバーリンクから.activeクラスを削除
                    document.querySelectorAll('.sidebar-link').forEach(l => {
                        l.classList.remove('active');
                    });
                    
                    // クリックされたリンクに.activeクラスを追加
                    link.classList.add('active');
                    
                    // リンクのhrefから対象IDを取得
                    const targetId = link.getAttribute('href').substring(1);
                    
                    // 総括レポートのリンクかどうかを判定
                    const isSummaryLink = targetId.includes('summary') && !targetId.includes('key-topics') && !targetId.includes('projects') && !targetId.includes('insights');
                    
                    if (isSummaryLink) {
                        // 総括レポートの場合、対応するタブをアクティブにする
                        let tabId;
                        if (targetId.includes('-summary-content')) {
                            tabId = targetId.replace('-summary-content', '');
                        } else if (targetId.includes('-summary')) {
                            tabId = targetId.replace('-summary', '');
                        } else {
                            tabId = targetId;
                        }
                        const targetTab = document.querySelector(\`[data-tab="\${tabId}"]\`);
                        
                        if (targetTab) {
                            // タブをアクティブにする
                            tabs.forEach(item => item.classList.remove('active'));
                            targetTab.classList.add('active');
                            
                            // コンテンツペインを切り替え
                            document.querySelectorAll('.content-pane').forEach(pane => {
                                pane.classList.remove('active');
                            });
                            const targetPane = document.getElementById(tabId);
                            if (targetPane) {
                                targetPane.classList.add('active');
                            }
                            
                            // サイドバーを切り替え
                            document.querySelectorAll('.sidebar-content').forEach(sidebar => {
                                sidebar.classList.remove('active');
                            });
                            const targetSidebar = document.getElementById(tabId + '-sidebar');
                            if (targetSidebar) {
                                targetSidebar.classList.add('active');
                            }
                            
                            // 総括レポートの場合は最初のセクションを表示
                            setTimeout(() => {
                                const currentPane = document.querySelector('.content-pane.active');
                                if (currentPane) {
                                    currentPane.querySelectorAll('.content-section').forEach(section => {
                                        section.classList.remove('active');
                                    });
                                    const firstSection = currentPane.querySelector('.content-section');
                                    if (firstSection) {
                                        firstSection.classList.add('active');
                                    }
                                }
                            }, 10);
                        }
                    } else {
                        // 通常のセクションリンクの場合
                        // 現在のコンテンツペイン内のすべてのセクションを非表示
                        const currentPane = document.querySelector('.content-pane.active');
                        if (currentPane) {
                            currentPane.querySelectorAll('.content-section').forEach(section => {
                                section.classList.remove('active');
                            });
                        }
                        
                        // 対応するセクションを表示
                        const targetElement = document.getElementById(targetId);
                        if (targetElement) {
                            targetElement.classList.add('active');
                        }
                    }
                    
                    // ページの一番上に移動
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                });
            });

            // タブ切り替え時のデフォルト表示設定
            function setDefaultContent(tabId) {
                const currentPane = document.getElementById(tabId);
                if (currentPane) {
                    // すべてのセクションを非表示
                    currentPane.querySelectorAll('.content-section').forEach(section => {
                        section.classList.remove('active');
                    });
                    
                    // 月別タブの場合は月サマリを表示
                    const summaryElement = currentPane.querySelector(\`#\${tabId}-summary\`);
                    if (summaryElement) {
                        summaryElement.classList.add('active');
                    } else {
                        // 総括レポートの場合は最初のセクションを表示
                        const firstSection = currentPane.querySelector('.content-section');
                        if (firstSection) {
                            firstSection.classList.add('active');
                        }
                    }
                }
            }

            // タブクリックイベント
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabId = tab.dataset.tab;
                    
                    // タブ切り替え処理
                    tabs.forEach(item => item.classList.remove('active'));
                    tab.classList.add('active');

                    // すべてのコンテンツペインを非表示
                    document.querySelectorAll('.content-pane').forEach(pane => {
                        pane.classList.remove('active');
                    });
                    
                    // 対応するコンテンツペインを表示
                    const targetPane = document.getElementById(tabId);
                    if (targetPane) {
                        targetPane.classList.add('active');
                    }

                    // サイドバー切り替え
                    document.querySelectorAll('.sidebar-content').forEach(sidebar => {
                        sidebar.classList.remove('active');
                    });
                    const targetSidebar = document.getElementById(tabId + '-sidebar');
                    if (targetSidebar) {
                        targetSidebar.classList.add('active');
                    }
                    
                    document.querySelectorAll('.sidebar-link').forEach(link => {
                        link.classList.remove('active');
                    });

                    // デフォルト表示設定を実行
                    setDefaultContent(tabId);
                });
            });
        });
    </script>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${meetingNote.id || 'meeting-note'}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      devLog('✅ [handleDownloadHtml] HTMLファイルのダウンロード成功');
      
      // 少し遅延を入れてから状態をリセット（視覚的なフィードバックのため）
      setTimeout(() => {
        setDownloadingHtml(false);
      }, 500);
    } catch (error: any) {
      console.error('❌ [handleDownloadHtml] HTMLファイルのダウンロードに失敗しました:', error);
      alert(`HTMLファイルのダウンロードに失敗しました: ${error?.message || '不明なエラー'}`);
      setDownloadingHtml(false);
    }
  }, [meetingNote, monthContents, downloadingHtml, customTabLabels]);

  return {
    meetingNote,
    orgData,
    loading,
    error,
    monthContents,
    setMonthContents,
    customTabLabels,
    setCustomTabLabels,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    savingStatus,
    setSavingStatus,
    downloadingHtml,
    handleManualSave,
    handleDownloadJson,
    handleDownloadHtml,
  };
}

