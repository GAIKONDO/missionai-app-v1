'use client';

import { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { getOrgTreeFromDb } from '@/lib/orgApi';
import type { OrgNodeData } from '@/components/OrgChart';
import html2canvas from 'html2canvas';
import IntroductionTab from './components/tabs/IntroductionTab';
import FocusAreasTab from './components/tabs/FocusAreasTab';
import FocusInitiativesTab from './components/tabs/FocusInitiativesTab';
import MeetingNotesTab from './components/tabs/MeetingNotesTab';
import AddInitiativeModal from './components/modals/AddInitiativeModal';
import DeleteInitiativeModal from './components/modals/DeleteInitiativeModal';
import AddMeetingNoteModal from './components/modals/AddMeetingNoteModal';
import DeleteMeetingNoteModal from './components/modals/DeleteMeetingNoteModal';
import { OrganizationTabBar, type OrganizationTab } from './components/OrganizationTabBar';
import { useOrganizationData } from './hooks/useOrganizationData';
import { useInitiativeHandlers } from './hooks/useInitiativeHandlers';
import { useMeetingNoteHandlers } from './hooks/useMeetingNoteHandlers';

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

type TabType = OrganizationTab;

function OrganizationDetailPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const organizationId = searchParams?.get('id') as string;
  const tabParam = searchParams?.get('tab') as TabType | null;
  
  // カスタムフックでデータを取得
  const {
    organization,
    organizationContent,
    focusInitiatives,
    initiativesByOrg,
    meetingNotes,
    setMeetingNotes,
    loading,
    error,
    reloadInitiatives,
  } = useOrganizationData(organizationId);
  
  const [expandedOrgIds, setExpandedOrgIds] = useState<Set<string>>(new Set()); // 開いている子組織のID
  const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'introduction');

  // 各タブのコンテンツ用のref
  const introductionTabRef = useRef<HTMLDivElement>(null);
  const focusAreasTabRef = useRef<HTMLDivElement>(null);
  const focusInitiativesTabRef = useRef<HTMLDivElement>(null);
  const meetingNotesTabRef = useRef<HTMLDivElement>(null);
  
  // 注力施策関連のハンドラー
  const initiativeHandlers = useInitiativeHandlers({
    organizationId,
    organization,
    focusInitiatives,
    reloadInitiatives,
  });
  
  // 議事録関連のハンドラー
  const meetingNoteHandlers = useMeetingNoteHandlers({
    organizationId,
    organization,
    meetingNotes,
    setMeetingNotes,
  });


  // タブパラメータが変更されたときにactiveTabを更新
  useEffect(() => {
    if (tabParam && ['introduction', 'focusAreas', 'focusInitiatives', 'meetingNotes'].includes(tabParam)) {
      setActiveTab(tabParam);
    } else if (!tabParam) {
      setActiveTab('introduction');
    }
  }, [tabParam]);

  // 各タブのコンテンツを画像としてダウンロード（早期リターンの前に定義）
  const handleDownloadTabImage = useCallback(async (tab: TabType) => {
    let tabRef: React.RefObject<HTMLDivElement> | null = null;
    let tabName = '';

    switch (tab) {
      case 'introduction':
        tabRef = introductionTabRef;
        tabName = '組織紹介';
        break;
      case 'focusAreas':
        tabRef = focusAreasTabRef;
        tabName = '注力領域';
        break;
      case 'focusInitiatives':
        tabRef = focusInitiativesTabRef;
        tabName = '注力施策';
        break;
      case 'meetingNotes':
        tabRef = meetingNotesTabRef;
        tabName = '議事録';
        break;
    }

    if (!tabRef || !tabRef.current) {
      alert('ダウンロードするコンテンツが見つかりません。');
      return;
    }

    // ローディング表示
    const originalCursor = document.body.style.cursor;
    
    try {
      document.body.style.cursor = 'wait';

      // html2canvasでキャプチャ
      const canvas = await html2canvas(tabRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // 高解像度
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
      });

      // PNGとしてダウンロード
      canvas.toBlob((blob) => {
        if (!blob) {
          alert('画像の生成に失敗しました。');
          document.body.style.cursor = originalCursor;
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const orgName = organization?.name || '組織';
        const sanitizedOrgName = orgName.replace(/[<>:"/\\|?*]/g, '_');
        link.href = url;
        link.download = `${sanitizedOrgName}_${tabName}_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 100);

        document.body.style.cursor = originalCursor;
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('画像ダウンロードエラー:', error);
      alert('画像のダウンロードに失敗しました。');
      document.body.style.cursor = originalCursor;
    }
  }, [organization]);

  // タブ変更ハンドラー（早期リターンの前に定義）
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.push(`/organization/detail?id=${organizationId}&tab=${tab}`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p>組織データを読み込み中...</p>
        </div>
      </Layout>
    );
  }

  if (error || !organization) {
    return (
      <Layout>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#EF4444', marginBottom: '20px' }}>{error || '組織が見つかりません'}</p>
          <button
            onClick={() => router.push('/organization')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            組織一覧に戻る
          </button>
        </div>
      </Layout>
    );
  }


  return (
    <Layout>
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text)' }}>
            {organization.name}
            {organization.title && (
              <span style={{ fontSize: '16px', color: '#6B7280', marginLeft: '8px' }}>
                ({organization.title})
              </span>
            )}
          </h1>
          <button
            onClick={() => router.push('/organization')}
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
        <OrganizationTabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          focusInitiativesCount={focusInitiatives.length}
          meetingNotesCount={meetingNotes.length}
        />

        {/* タブコンテンツ */}
        {activeTab === 'introduction' && (
          <IntroductionTab
            organization={organization}
            tabRef={introductionTabRef}
            onDownloadImage={handleDownloadTabImage}
          />
        )}

        {activeTab === 'focusAreas' && (
          <FocusAreasTab
            organizationContent={organizationContent}
            tabRef={focusAreasTabRef}
            onDownloadImage={handleDownloadTabImage}
          />
        )}

        {activeTab === 'focusInitiatives' && (
          <FocusInitiativesTab
            organizationId={organizationId}
            focusInitiatives={focusInitiatives}
            initiativesByOrg={initiativesByOrg}
            expandedOrgIds={expandedOrgIds}
            setExpandedOrgIds={setExpandedOrgIds}
            editingInitiativeId={initiativeHandlers.editingInitiativeId}
            editingTitle={initiativeHandlers.editingTitle}
            setEditingTitle={initiativeHandlers.setEditingTitle}
            savingInitiative={initiativeHandlers.savingInitiative}
            tabRef={focusInitiativesTabRef}
            onDownloadImage={handleDownloadTabImage}
            onOpenAddModal={initiativeHandlers.handleOpenAddInitiativeModal}
            onStartEdit={initiativeHandlers.handleStartEdit}
            onCancelEdit={initiativeHandlers.handleCancelEdit}
            onSaveEdit={initiativeHandlers.handleSaveEdit}
            onDelete={initiativeHandlers.handleDeleteInitiative}
          />
        )}

        {/* 注力施策追加モーダル */}
        <AddInitiativeModal
          isOpen={initiativeHandlers.showAddInitiativeModal}
          newInitiativeId={initiativeHandlers.newInitiativeId}
          newInitiativeTitle={initiativeHandlers.newInitiativeTitle}
          newInitiativeDescription={initiativeHandlers.newInitiativeDescription}
          savingInitiative={initiativeHandlers.savingInitiative}
          onClose={() => {
            initiativeHandlers.setShowAddInitiativeModal(false);
            initiativeHandlers.setNewInitiativeTitle('');
            initiativeHandlers.setNewInitiativeDescription('');
            initiativeHandlers.setNewInitiativeId('');
          }}
          onSave={initiativeHandlers.handleAddInitiative}
          onTitleChange={initiativeHandlers.setNewInitiativeTitle}
          onDescriptionChange={initiativeHandlers.setNewInitiativeDescription}
        />

        {/* 注力施策削除確認モーダル */}
        <DeleteInitiativeModal
          isOpen={initiativeHandlers.showDeleteConfirmModal && !!initiativeHandlers.deleteTargetInitiativeId}
          initiativeTitle={focusInitiatives.find(i => i.id === initiativeHandlers.deleteTargetInitiativeId)?.title || 'この注力施策'}
          savingInitiative={initiativeHandlers.savingInitiative}
          onClose={initiativeHandlers.cancelDeleteInitiative}
          onConfirm={initiativeHandlers.confirmDeleteInitiative}
        />

        {activeTab === 'meetingNotes' && (
          <MeetingNotesTab
            organizationId={organizationId}
            meetingNotes={meetingNotes}
            editingMeetingNoteId={meetingNoteHandlers.editingMeetingNoteId}
            editingMeetingNoteTitle={meetingNoteHandlers.editingMeetingNoteTitle}
            setEditingMeetingNoteTitle={meetingNoteHandlers.setEditingMeetingNoteTitle}
            savingMeetingNote={meetingNoteHandlers.savingMeetingNote}
            tabRef={meetingNotesTabRef}
            onDownloadImage={handleDownloadTabImage}
            onOpenAddModal={meetingNoteHandlers.handleOpenAddMeetingNoteModal}
            onStartEdit={meetingNoteHandlers.handleStartEditMeetingNote}
            onCancelEdit={meetingNoteHandlers.handleCancelEditMeetingNote}
            onSaveEdit={meetingNoteHandlers.handleSaveEditMeetingNote}
            onDelete={meetingNoteHandlers.handleDeleteMeetingNote}
          />
        )}

        {/* 議事録追加モーダル */}
        <AddMeetingNoteModal
          isOpen={meetingNoteHandlers.showAddMeetingNoteModal}
          newMeetingNoteId={meetingNoteHandlers.newMeetingNoteId}
          newMeetingNoteTitle={meetingNoteHandlers.newMeetingNoteTitle}
          newMeetingNoteDescription={meetingNoteHandlers.newMeetingNoteDescription}
          savingMeetingNote={meetingNoteHandlers.savingMeetingNote}
          onClose={() => {
            meetingNoteHandlers.setShowAddMeetingNoteModal(false);
            meetingNoteHandlers.setNewMeetingNoteTitle('');
            meetingNoteHandlers.setNewMeetingNoteDescription('');
            meetingNoteHandlers.setNewMeetingNoteId('');
          }}
          onSave={meetingNoteHandlers.handleAddMeetingNote}
          onTitleChange={meetingNoteHandlers.setNewMeetingNoteTitle}
          onDescriptionChange={meetingNoteHandlers.setNewMeetingNoteDescription}
        />

        {/* 議事録削除確認モーダル */}
        <DeleteMeetingNoteModal
          isOpen={meetingNoteHandlers.showDeleteMeetingNoteConfirmModal && !!meetingNoteHandlers.deleteTargetMeetingNoteId}
          noteTitle={meetingNotes.find(n => n.id === meetingNoteHandlers.deleteTargetMeetingNoteId)?.title || 'この議事録'}
          savingMeetingNote={meetingNoteHandlers.savingMeetingNote}
          onClose={meetingNoteHandlers.cancelDeleteMeetingNote}
          onConfirm={meetingNoteHandlers.confirmDeleteMeetingNote}
        />
      </div>
    </Layout>
  );
}

export default function OrganizationDetailPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p>読み込み中...</p>
        </div>
      </Layout>
    }>
      <OrganizationDetailPageContent />
    </Suspense>
  );
}
