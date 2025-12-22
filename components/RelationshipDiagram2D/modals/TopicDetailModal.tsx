'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { TopicInfo } from '@/lib/orgApi';
import type { TopicSemanticCategory } from '@/types/topicMetadata';
import { getMeetingNoteById, saveMeetingNote, getAllTopics } from '@/lib/orgApi';
import { getAvailableOllamaModels } from '@/lib/pageGeneration';
import type { Entity, EntityType } from '@/types/entity';
import type { Relation, RelationType } from '@/types/relation';
import KnowledgeGraph2D from '../../KnowledgeGraph2D';
import KnowledgeGraph3D from '../../KnowledgeGraph3D';
import EntityModal from './EntityModal';
import RelationModal from './RelationModal';
import PathSearchModal from './PathSearchModal';
import StatsModal from './StatsModal';
import { ENTITY_TYPE_LABELS, RELATION_TYPE_LABELS } from '../constants';

interface TopicDetailModalProps {
  selectedTopic: TopicInfo;
  onClose: () => void;
  onTopicMetadataSaved?: () => void;
  // メタデータ関連
  pendingMetadata: {
    semanticCategory?: TopicSemanticCategory;
    importance?: TopicInfo['importance'];
    keywords?: string[];
    summary?: string;
  } | null;
  setPendingMetadata: (metadata: typeof pendingMetadata) => void;
  isGeneratingMetadata: boolean;
  setIsGeneratingMetadata: (value: boolean) => void;
  isSavingMetadata: boolean;
  setIsSavingMetadata: (value: boolean) => void;
  // 日時編集関連
  isEditingTopicDate: boolean;
  setIsEditingTopicDate: (value: boolean) => void;
  editingTopicDate: string;
  setEditingTopicDate: (value: string) => void;
  editingTopicTime: string;
  setEditingTopicTime: (value: string) => void;
  isAllPeriods: boolean;
  setIsAllPeriods: (value: boolean) => void;
  isSavingTopicDate: boolean;
  setIsSavingTopicDate: (value: boolean) => void;
  setSelectedTopic: (topic: TopicInfo | null) => void;
  // エンティティ・リレーション関連
  topicEntities: Entity[];
  setTopicEntities: (entities: Entity[]) => void;
  topicRelations: Relation[];
  setTopicRelations: (relations: Relation[]) => void;
  isLoadingEntities: boolean;
  isLoadingRelations: boolean;
  pendingEntities: Entity[] | null;
  setPendingEntities: (entities: Entity[] | null) => void;
  pendingRelations: Relation[] | null;
  setPendingRelations: (relations: Relation[] | null) => void;
  // モーダル表示関連
  showAddEntityModal: boolean;
  setShowAddEntityModal: (value: boolean) => void;
  showAddRelationModal: boolean;
  setShowAddRelationModal: (value: boolean) => void;
  editingEntity: Entity | null;
  setEditingEntity: (entity: Entity | null) => void;
  editingRelation: Relation | null;
  setEditingRelation: (relation: Relation | null) => void;
  showMergeEntityModal: boolean;
  setShowMergeEntityModal: (value: boolean) => void;
  mergeSourceEntity: Entity | null;
  setMergeSourceEntity: (entity: Entity | null) => void;
  showPathSearchModal: boolean;
  setShowPathSearchModal: (value: boolean) => void;
  showStatsModal: boolean;
  setShowStatsModal: (value: boolean) => void;
  // ナレッジグラフ表示関連
  knowledgeGraphViewMode: 'list' | 'graph2d' | 'graph3d';
  setKnowledgeGraphViewMode: (mode: 'list' | 'graph2d' | 'graph3d') => void;
  entitySearchQuery: string;
  setEntitySearchQuery: (query: string) => void;
  entityTypeFilter: EntityType | 'all';
  setEntityTypeFilter: (filter: EntityType | 'all') => void;
  relationSearchQuery: string;
  setRelationSearchQuery: (query: string) => void;
  relationTypeFilter: RelationType | 'all';
  setRelationTypeFilter: (filter: RelationType | 'all') => void;
  // 一括操作関連
  selectedEntityIds: Set<string>;
  setSelectedEntityIds: (ids: Set<string>) => void;
  selectedRelationIds: Set<string>;
  setSelectedRelationIds: (ids: Set<string>) => void;
  bulkOperationMode: 'none' | 'entities' | 'relations';
  setBulkOperationMode: (mode: 'none' | 'entities' | 'relations') => void;
  // エクスポート関連
  isExporting: boolean;
  setIsExporting: (value: boolean) => void;
  exportSuccess: boolean;
  setExportSuccess: (value: boolean) => void;
  // AI生成関連
  modelType: 'gpt' | 'local';
  setModelType: (type: 'gpt' | 'local') => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  metadataMode: 'overwrite' | 'merge';
  setMetadataMode: (mode: 'overwrite' | 'merge') => void;
  loadingLocalModels: boolean;
  availableModels: Array<{ value: string; label: string }>;
  // ハンドラー関数
  handleAIGenerateMetadata: () => Promise<void>;
  handleSaveMetadata: () => Promise<void>;
}

export default function TopicDetailModal({
  selectedTopic,
  onClose,
  onTopicMetadataSaved,
  pendingMetadata,
  setPendingMetadata,
  isGeneratingMetadata,
  setIsGeneratingMetadata,
  isSavingMetadata,
  setIsSavingMetadata,
  isEditingTopicDate,
  setIsEditingTopicDate,
  editingTopicDate,
  setEditingTopicDate,
  editingTopicTime,
  setEditingTopicTime,
  isAllPeriods,
  setIsAllPeriods,
  isSavingTopicDate,
  setIsSavingTopicDate,
  setSelectedTopic,
  topicEntities,
  setTopicEntities,
  topicRelations,
  setTopicRelations,
  isLoadingEntities,
  isLoadingRelations,
  pendingEntities,
  setPendingEntities,
  pendingRelations,
  setPendingRelations,
  showAddEntityModal,
  setShowAddEntityModal,
  showAddRelationModal,
  setShowAddRelationModal,
  editingEntity,
  setEditingEntity,
  editingRelation,
  setEditingRelation,
  showMergeEntityModal,
  setShowMergeEntityModal,
  mergeSourceEntity,
  setMergeSourceEntity,
  showPathSearchModal,
  setShowPathSearchModal,
  showStatsModal,
  setShowStatsModal,
  knowledgeGraphViewMode,
  setKnowledgeGraphViewMode,
  entitySearchQuery,
  setEntitySearchQuery,
  entityTypeFilter,
  setEntityTypeFilter,
  relationSearchQuery,
  setRelationSearchQuery,
  relationTypeFilter,
  setRelationTypeFilter,
  selectedEntityIds,
  setSelectedEntityIds,
  selectedRelationIds,
  setSelectedRelationIds,
  bulkOperationMode,
  setBulkOperationMode,
  isExporting,
  setIsExporting,
  exportSuccess,
  setExportSuccess,
  modelType,
  setModelType,
  selectedModel,
  setSelectedModel,
  metadataMode,
  setMetadataMode,
  loadingLocalModels,
  availableModels,
  handleAIGenerateMetadata,
  handleSaveMetadata,
}: TopicDetailModalProps) {
  // このモーダルは非常に大きいため、元のコードをそのまま移植します
  // 元のコードは2820行目から4334行目までです
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(44, 62, 80, 0.4) 0%, rgba(30, 41, 59, 0.35) 100%)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '1200px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* TODO: 元のコードをここに移植します */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
            {selectedTopic.title}
          </h2>
          <button
            onClick={() => {
              onClose();
              setPendingMetadata(null);
              setPendingEntities(null);
              setPendingRelations(null);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              color: '#6B7280',
              padding: '4px 8px',
              lineHeight: 1,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#1a1a1a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#6B7280';
            }}
          >
            ×
          </button>
        </div>
        
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
              議事録アーカイブ
            </div>
            <div style={{ fontSize: '16px', color: '#1a1a1a', fontWeight: 500 }}>
              {selectedTopic.meetingNoteTitle}
            </div>
          </div>
          
          {/* 日時編集 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600 }}>
                日時
              </div>
              {!isEditingTopicDate && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedTopic.topicDate) {
                      const date = new Date(selectedTopic.topicDate);
                      const dateStr = date.toISOString().split('T')[0];
                      const timeStr = date.toTimeString().split(' ')[0].substring(0, 5);
                      setEditingTopicDate(dateStr);
                      setEditingTopicTime(timeStr);
                    } else {
                      setEditingTopicDate('');
                      setEditingTopicTime('');
                    }
                    setIsAllPeriods(selectedTopic.isAllPeriods === true);
                    setIsEditingTopicDate(true);
                  }}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: '#3B82F6',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  編集
                </button>
              )}
            </div>
            
            {isEditingTopicDate ? (
              <div style={{
                padding: '16px',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
              }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isAllPeriods}
                      onChange={(e) => {
                        setIsAllPeriods(e.target.checked);
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px', color: '#374151' }}>
                      全期間に反映（日時に関係なく全期間に表示）
                    </span>
                  </label>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px', marginLeft: '24px' }}>
                    チェック時は日付設定に関係なく全期間に表示されます
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                      日付
                    </label>
                    <input
                      type="date"
                      value={editingTopicDate}
                      onChange={(e) => setEditingTopicDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: '#FFFFFF',
                        color: '#1F2937',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                      時刻
                    </label>
                    <input
                      type="time"
                      value={editingTopicTime}
                      onChange={(e) => setEditingTopicTime(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: '#FFFFFF',
                        color: '#1F2937',
                      }}
                    />
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        setIsSavingTopicDate(true);
                        
                        let mentionedDate: string | null = null;
                        if (editingTopicDate) {
                          if (editingTopicTime) {
                            mentionedDate = new Date(`${editingTopicDate}T${editingTopicTime}`).toISOString();
                          } else {
                            mentionedDate = new Date(`${editingTopicDate}T00:00:00`).toISOString();
                          }
                        }
                        
                        const meetingNote = await getMeetingNoteById(selectedTopic!.meetingNoteId);
                        if (!meetingNote || !meetingNote.content) {
                          throw new Error('議事録が見つかりません');
                        }
                        
                        const parsed = JSON.parse(meetingNote.content) as Record<string, {
                          summary?: string;
                          summaryId?: string;
                          items?: Array<{
                            id: string;
                            title: string;
                            content: string;
                            topics?: Array<{
                              id: string;
                              title: string;
                              content: string;
                              mentionedDate?: string | null;
                              isAllPeriods?: boolean;
                            }>;
                          }>;
                        }>;
                        
                        let topicFound = false;
                        
                        for (const [tabId, tabData] of Object.entries(parsed)) {
                          if (!tabData.items || !Array.isArray(tabData.items)) continue;
                          
                          for (const item of tabData.items) {
                            if (!item.topics || !Array.isArray(item.topics)) continue;
                            
                            const topicIndex = item.topics.findIndex(t => t.id === selectedTopic!.id);
                            if (topicIndex !== -1) {
                              const existingTopic = item.topics[topicIndex];
                              item.topics[topicIndex] = {
                                ...existingTopic,
                                mentionedDate: mentionedDate,
                                isAllPeriods: isAllPeriods,
                              };
                              topicFound = true;
                              break;
                            }
                          }
                          if (topicFound) break;
                        }
                        
                        if (!topicFound) {
                          throw new Error('トピックが見つかりません');
                        }
                        
                        const updatedContent = JSON.stringify(parsed);
                        await saveMeetingNote({
                          id: meetingNote.id,
                          organizationId: meetingNote.organizationId,
                          title: meetingNote.title,
                          description: meetingNote.description,
                          content: updatedContent,
                        });
                        
                        console.log('✅ 日時を保存しました');
                        
                        try {
                          const updatedTopics = await getAllTopics(selectedTopic!.organizationId);
                          const updatedTopic = updatedTopics.find(t => t.id === selectedTopic!.id);
                          if (updatedTopic) {
                            setSelectedTopic(updatedTopic);
                          } else {
                            setSelectedTopic({
                              ...selectedTopic!,
                              topicDate: mentionedDate,
                              isAllPeriods: isAllPeriods,
                            });
                          }
                        } catch (error) {
                          console.warn('⚠️ トピックデータの再取得に失敗しました。手動で更新します。', error);
                          setSelectedTopic({
                            ...selectedTopic!,
                            topicDate: mentionedDate,
                            isAllPeriods: isAllPeriods,
                          });
                        }
                        
                        if (onTopicMetadataSaved) {
                          onTopicMetadataSaved();
                        }
                        
                        setIsEditingTopicDate(false);
                        alert('日時を保存しました');
                      } catch (error: any) {
                        console.error('❌ 日時保存エラー:', error);
                        alert(`日時の保存に失敗しました: ${error.message || error}`);
                      } finally {
                        setIsSavingTopicDate(false);
                      }
                    }}
                    disabled={isSavingTopicDate}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#3B82F6',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: isSavingTopicDate ? 'not-allowed' : 'pointer',
                      fontWeight: 500,
                      opacity: isSavingTopicDate ? 0.6 : 1,
                    }}
                  >
                    {isSavingTopicDate ? '保存中...' : '保存'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingTopicDate(false);
                      if (selectedTopic.topicDate) {
                        const date = new Date(selectedTopic.topicDate);
                        const dateStr = date.toISOString().split('T')[0];
                        const timeStr = date.toTimeString().split(' ')[0].substring(0, 5);
                        setEditingTopicDate(dateStr);
                        setEditingTopicTime(timeStr);
                      } else {
                        setEditingTopicDate('');
                        setEditingTopicTime('');
                      }
                      setIsAllPeriods(selectedTopic.isAllPeriods === true);
                    }}
                    disabled={isSavingTopicDate}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#FFFFFF',
                      color: '#374151',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: isSavingTopicDate ? 'not-allowed' : 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '16px', color: '#1a1a1a', fontWeight: 500 }}>
                {selectedTopic.isAllPeriods === true ? (
                  <div>
                    <div style={{ color: '#8B5CF6', fontStyle: 'italic', marginBottom: '8px' }}>
                      📅 全期間に反映（日時に関係なく全期間に表示）
                    </div>
                    {selectedTopic.topicDate && (
                      <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
                        設定日時: {new Date(selectedTopic.topicDate).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                  </div>
                ) : selectedTopic.topicDate ? (
                  <span>
                    📅 {new Date(selectedTopic.topicDate).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                ) : (
                  <span style={{ color: '#6B7280', fontStyle: 'italic' }}>
                    📅 日時未設定
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
              内容
            </div>
            <div
              style={{
                padding: '16px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
              }}
            >
              <div className="markdown-content" style={{
                fontSize: '16px',
                lineHeight: '1.6',
                color: '#1a1a1a',
              }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedTopic.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
          
          {/* メタデータ表示 */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600 }}>
                  メタデータ
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>タイプ:</span>
                  <select
                    value={modelType}
                    onChange={(e) => {
                      const newType = e.target.value as 'gpt' | 'local';
                      setModelType(newType);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('topicMetadataGenerationModelType', newType);
                      }
                      if (newType === 'gpt') {
                        setSelectedModel('gpt-4o-mini');
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('topicMetadataGenerationModel', 'gpt-4o-mini');
                        }
                      }
                    }}
                    disabled={isGeneratingMetadata}
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.875em',
                      border: '1px solid #D1D5DB',
                      borderRadius: '4px',
                      backgroundColor: '#FFFFFF',
                      color: '#1a1a1a',
                      cursor: isGeneratingMetadata ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <option value="gpt">GPT</option>
                    <option value="local">ローカル</option>
                  </select>
                </label>
                <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>AIモデル:</span>
                  <select
                    value={selectedModel}
                    onChange={(e) => {
                      const newModel = e.target.value;
                      setSelectedModel(newModel);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('topicMetadataGenerationModel', newModel);
                      }
                    }}
                    disabled={isGeneratingMetadata || loadingLocalModels}
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.875em',
                      border: '1px solid #D1D5DB',
                      borderRadius: '4px',
                      backgroundColor: '#FFFFFF',
                      color: '#1a1a1a',
                      cursor: isGeneratingMetadata || loadingLocalModels ? 'not-allowed' : 'pointer',
                      minWidth: '140px',
                    }}
                  >
                    {loadingLocalModels ? (
                      <option>読み込み中...</option>
                    ) : availableModels.length === 0 ? (
                      <option>モデルが見つかりません</option>
                    ) : (
                      availableModels.map((model) => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>モード:</span>
                  <select
                    value={metadataMode}
                    onChange={(e) => {
                      const newMode = e.target.value as 'overwrite' | 'merge';
                      setMetadataMode(newMode);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('topicMetadataGenerationMode', newMode);
                      }
                    }}
                    disabled={isGeneratingMetadata}
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.875em',
                      border: '1px solid #D1D5DB',
                      borderRadius: '4px',
                      backgroundColor: '#FFFFFF',
                      color: '#1a1a1a',
                      cursor: isGeneratingMetadata ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <option value="overwrite">上書き</option>
                    <option value="merge">追加</option>
                  </select>
                </label>
                <button
                  onClick={handleAIGenerateMetadata}
                  disabled={isGeneratingMetadata}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: isGeneratingMetadata ? '#9CA3AF' : '#3B82F6',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.875em',
                    fontWeight: '600',
                    cursor: isGeneratingMetadata ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onMouseEnter={(e) => {
                    if (!isGeneratingMetadata) {
                      e.currentTarget.style.backgroundColor = '#2563EB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isGeneratingMetadata) {
                      e.currentTarget.style.backgroundColor = '#3B82F6';
                    }
                  }}
                >
                  {isGeneratingMetadata ? (
                    <>
                      <span>⏳</span>
                      <span>生成中...</span>
                    </>
                  ) : (
                    <>
                      <span>🤖</span>
                      <span>AIで登録</span>
                    </>
                  )}
                </button>
                {(pendingMetadata || pendingEntities || pendingRelations) && (
                  <button
                    onClick={() => {
                      console.log('🔍 [保存ボタン] クリックされました:', {
                        selectedTopic: selectedTopic ? { id: selectedTopic.id, title: selectedTopic.title } : null,
                        pendingMetadata: pendingMetadata ? 'あり' : 'なし',
                        pendingEntities: pendingEntities ? pendingEntities.length : 0,
                        pendingRelations: pendingRelations ? pendingRelations.length : 0,
                      });
                      handleSaveMetadata();
                    }}
                    disabled={isSavingMetadata}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: isSavingMetadata ? '#9CA3AF' : '#10B981',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.875em',
                      fontWeight: '600',
                      cursor: isSavingMetadata ? 'not-allowed' : 'pointer',
                      transition: 'background-color 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSavingMetadata) {
                        e.currentTarget.style.backgroundColor = '#059669';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSavingMetadata) {
                        e.currentTarget.style.backgroundColor = '#10B981';
                      }
                    }}
                  >
                    {isSavingMetadata ? (
                      <>
                        <span>⏳</span>
                        <span>保存中...</span>
                      </>
                    ) : (
                      <>
                        <span>💾</span>
                        <span>保存</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '16px',
            }}>
              {selectedTopic.semanticCategory ? (
                <span style={{
                  padding: '6px 12px',
                  backgroundColor: '#EFF6FF',
                  color: '#0066CC',
                  borderRadius: '12px',
                  fontSize: '0.875em',
                  fontWeight: '600',
                }}>
                  📂 {selectedTopic.semanticCategory === 'action-item' ? 'アクションアイテム' :
                      selectedTopic.semanticCategory === 'decision' ? '決定事項' :
                      selectedTopic.semanticCategory === 'discussion' ? '議論・討議' :
                      selectedTopic.semanticCategory === 'issue' ? '課題・問題' :
                      selectedTopic.semanticCategory === 'risk' ? 'リスク' :
                      selectedTopic.semanticCategory === 'opportunity' ? '機会' :
                      selectedTopic.semanticCategory === 'question' ? '質問・疑問' :
                      selectedTopic.semanticCategory === 'summary' ? 'サマリー' :
                      selectedTopic.semanticCategory === 'follow-up' ? 'フォローアップ' :
                      selectedTopic.semanticCategory === 'reference' ? '参照情報' : 'その他'}
                </span>
              ) : (
                <span style={{
                  padding: '6px 12px',
                  backgroundColor: '#F9FAFB',
                  color: '#9CA3AF',
                  borderRadius: '12px',
                  fontSize: '0.875em',
                  fontWeight: '500',
                }}>
                  📂 セマンティックカテゴリ: 登録なし
                </span>
              )}
              {selectedTopic.importance ? (
                <span style={{
                  padding: '6px 12px',
                  backgroundColor: selectedTopic.importance === 'high' ? '#FEF2F2' :
                                   selectedTopic.importance === 'medium' ? '#FEF3C7' : '#F0FDF4',
                  color: selectedTopic.importance === 'high' ? '#DC2626' :
                         selectedTopic.importance === 'medium' ? '#D97706' : '#16A34A',
                  borderRadius: '12px',
                  fontSize: '0.875em',
                  fontWeight: '600',
                }}>
                  {selectedTopic.importance === 'high' ? '🔴 高' :
                   selectedTopic.importance === 'medium' ? '🟡 中' : '🟢 低'}
                </span>
              ) : (
                <span style={{
                  padding: '6px 12px',
                  backgroundColor: '#F9FAFB',
                  color: '#9CA3AF',
                  borderRadius: '12px',
                  fontSize: '0.875em',
                  fontWeight: '500',
                }}>
                  🔴 重要度: 登録なし
                </span>
              )}
              {selectedTopic.keywords && selectedTopic.keywords.length > 0 ? (
                <>
                  {selectedTopic.keywords.map((keyword, index) => (
                    <span
                      key={index}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#F3F4F6',
                        color: '#475569',
                        borderRadius: '12px',
                        fontSize: '0.875em',
                        fontWeight: '500',
                      }}
                    >
                      🏷️ {keyword}
                    </span>
                  ))}
                </>
              ) : (
                <span style={{
                  padding: '6px 12px',
                  backgroundColor: '#F9FAFB',
                  color: '#9CA3AF',
                  borderRadius: '12px',
                  fontSize: '0.875em',
                  fontWeight: '500',
                }}>
                  🏷️ キーワード: 登録なし
                </span>
              )}
            </div>
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              marginTop: '8px',
            }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px', fontWeight: 600 }}>
                要約
              </div>
              <div style={{ fontSize: '14px', color: selectedTopic.summary ? '#1a1a1a' : '#9CA3AF', lineHeight: '1.6', fontStyle: selectedTopic.summary ? 'normal' : 'italic' }}>
                {selectedTopic.summary || '登録なし'}
              </div>
            </div>
          </div>
          
          {/* ナレッジグラフ: エンティティとリレーション */}
          <div style={{ marginBottom: '24px', borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '16px', color: '#1a1a1a', fontWeight: 600 }}>
                  📊 ナレッジグラフ
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => {
                      setShowPathSearchModal(true);
                    }}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#8B5CF6',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    🔍 パス検索
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowStatsModal(true);
                    }}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    📈 統計
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (isExporting) return;
                      
                      setIsExporting(true);
                      setExportSuccess(false);
                      
                      try {
                        const allEntities = (pendingEntities && pendingEntities.length > 0) ? pendingEntities : (topicEntities || []);
                        const allRelations = (pendingRelations && pendingRelations.length > 0) ? pendingRelations : (topicRelations || []);
                        
                        const exportData = {
                          entities: allEntities.map(e => ({
                            id: e.id,
                            name: e.name,
                            type: e.type,
                            aliases: e.aliases || [],
                            metadata: e.metadata || {},
                          })),
                          relations: allRelations.map(r => ({
                            id: r.id,
                            sourceEntityId: r.sourceEntityId,
                            targetEntityId: r.targetEntityId,
                            relationType: r.relationType,
                            description: r.description,
                            confidence: r.confidence,
                            metadata: r.metadata || {},
                          })),
                          exportedAt: new Date().toISOString(),
                          topicId: selectedTopic?.id,
                          topicTitle: selectedTopic?.title,
                        };
                        
                        const jsonStr = JSON.stringify(exportData, null, 2);
                        const blob = new Blob([jsonStr], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `knowledge-graph-${selectedTopic?.id || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        
                        setExportSuccess(true);
                        setTimeout(() => {
                          setExportSuccess(false);
                        }, 3000);
                      } catch (error: any) {
                        console.error('❌ エクスポートエラー:', error);
                        alert(`エクスポートに失敗しました: ${error.message}`);
                      } finally {
                        setIsExporting(false);
                      }
                    }}
                    disabled={isExporting}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: isExporting ? '#9CA3AF' : (exportSuccess ? '#10B981' : '#F59E0B'),
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: isExporting ? 'not-allowed' : 'pointer',
                      fontWeight: 500,
                      opacity: isExporting ? 0.7 : 1,
                      transition: 'background-color 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {isExporting ? (
                      <>
                        <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #FFFFFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        エクスポート中...
                      </>
                    ) : exportSuccess ? (
                      <>
                        ✅ エクスポート完了
                      </>
                    ) : (
                      <>
                        📥 エクスポート
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setKnowledgeGraphViewMode('list')}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: knowledgeGraphViewMode === 'list' ? '#3B82F6' : '#F3F4F6',
                      color: knowledgeGraphViewMode === 'list' ? '#FFFFFF' : '#6B7280',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    リスト
                  </button>
                  <button
                    onClick={() => setKnowledgeGraphViewMode('graph2d')}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: knowledgeGraphViewMode === 'graph2d' ? '#3B82F6' : '#F3F4F6',
                      color: knowledgeGraphViewMode === 'graph2d' ? '#FFFFFF' : '#6B7280',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    2Dグラフ
                  </button>
                  <button
                    onClick={() => setKnowledgeGraphViewMode('graph3d')}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: knowledgeGraphViewMode === 'graph3d' ? '#3B82F6' : '#F3F4F6',
                      color: knowledgeGraphViewMode === 'graph3d' ? '#FFFFFF' : '#6B7280',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    3Dグラフ
                  </button>
                </div>
              </div>
              
              {/* リスト表示 */}
              {knowledgeGraphViewMode === 'list' && (
                <>
                  {/* エンティティ表示 */}
                  <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600 }}>
                    エンティティ
                  </div>
                  <button
                    onClick={() => {
                      setEditingEntity(null);
                      setShowAddEntityModal(true);
                    }}
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#3B82F6',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    + 追加
                  </button>
                </div>
                {isLoadingEntities ? (
                  <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', fontSize: '14px', color: '#6B7280' }}>
                    読み込み中...
                  </div>
                ) : (pendingEntities && pendingEntities.length > 0) || topicEntities.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {((pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities)
                      .filter((entity) => {
                        if (entitySearchQuery) {
                          const query = entitySearchQuery.toLowerCase();
                          const matchesName = entity.name.toLowerCase().includes(query);
                          const matchesAliases = entity.aliases?.some(alias => 
                            alias.toLowerCase().includes(query)
                          ) || false;
                          if (!matchesName && !matchesAliases) {
                            return false;
                          }
                        }
                        if (entityTypeFilter !== 'all' && entity.type !== entityTypeFilter) {
                          return false;
                        }
                        return true;
                      })
                      .map((entity) => {
                      return (
                        <div
                          key={entity.id}
                          style={{
                            padding: '12px',
                            backgroundColor: bulkOperationMode === 'entities' && selectedEntityIds.has(entity.id) ? '#EFF6FF' : '#F9FAFB',
                            borderRadius: '8px',
                            border: bulkOperationMode === 'entities' && selectedEntityIds.has(entity.id) ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                            fontSize: '14px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {bulkOperationMode === 'entities' && (
                                <input
                                  type="checkbox"
                                  checked={selectedEntityIds.has(entity.id)}
                                  onChange={(e) => {
                                    const newSelected = new Set(selectedEntityIds);
                                    if (e.target.checked) {
                                      newSelected.add(entity.id);
                                    } else {
                                      newSelected.delete(entity.id);
                                    }
                                    setSelectedEntityIds(newSelected);
                                  }}
                                  style={{
                                    cursor: 'pointer',
                                  }}
                                />
                              )}
                              <span style={{ color: '#1a1a1a', fontWeight: 600 }}>
                                {ENTITY_TYPE_LABELS[entity.type] || '📌 その他'} {entity.name}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => {
                                  setEditingEntity(entity);
                                  setShowAddEntityModal(true);
                                }}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: 'transparent',
                                  color: '#6B7280',
                                  border: '1px solid #D1D5DB',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                編集
                              </button>
                              <button
                                onClick={() => {
                                  setMergeSourceEntity(entity);
                                  setShowMergeEntityModal(true);
                                }}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: 'transparent',
                                  color: '#8B5CF6',
                                  border: '1px solid #C4B5FD',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                マージ
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm(`エンティティ「${entity.name}」を削除しますか？\n\n注意: このエンティティに関連するリレーションも削除されます。`)) {
                                    try {
                                      const { deleteEntity } = await import('@/lib/entityApi');
                                      await deleteEntity(entity.id);
                                      
                                      if (pendingEntities) {
                                        setPendingEntities(pendingEntities.filter(e => e.id !== entity.id));
                                      } else {
                                        setTopicEntities(topicEntities.filter(e => e.id !== entity.id));
                                      }
                                      
                                      const allRelations = pendingRelations || topicRelations;
                                      const relatedRelations = allRelations.filter(r => 
                                        r.sourceEntityId === entity.id || r.targetEntityId === entity.id
                                      );
                                      
                                      if (relatedRelations.length > 0) {
                                        if (pendingRelations) {
                                          setPendingRelations(pendingRelations.filter(r => 
                                            r.sourceEntityId !== entity.id && r.targetEntityId !== entity.id
                                          ));
                                        } else {
                                          setTopicRelations(topicRelations.filter(r => 
                                            r.sourceEntityId !== entity.id && r.targetEntityId !== entity.id
                                          ));
                                        }
                                      }
                                      
                                      alert('エンティティを削除しました');
                                    } catch (error: any) {
                                      console.error('❌ エンティティ削除エラー:', error);
                                      alert(`エンティティの削除に失敗しました: ${error.message}`);
                                    }
                                  }
                                }}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: 'transparent',
                                  color: '#EF4444',
                                  border: '1px solid #FCA5A5',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                削除
                              </button>
                            </div>
                          </div>
                          {entity.aliases && entity.aliases.length > 0 && (
                            <div style={{ color: '#6B7280', fontSize: '12px', marginTop: '4px' }}>
                              別名: {entity.aliases.join(', ')}
                            </div>
                          )}
                          {entity.metadata && Object.keys(entity.metadata).length > 0 && (
                            <div style={{ color: '#6B7280', fontSize: '12px', marginTop: '4px' }}>
                              メタデータ: {JSON.stringify(entity.metadata, null, 2)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', fontSize: '14px', color: '#9CA3AF', fontStyle: 'italic' }}>
                    登録なし
                  </div>
                )}
              </div>
              
              {/* リレーション表示 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600 }}>
                    リレーション
                    {bulkOperationMode === 'relations' && selectedRelationIds.size > 0 && (
                      <span style={{ marginLeft: '8px', fontSize: '12px', color: '#3B82F6' }}>
                        ({selectedRelationIds.size}件選択中)
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {bulkOperationMode === 'relations' ? (
                      <>
                        <button
                          onClick={async () => {
                            if (selectedRelationIds.size === 0) {
                              alert('削除するリレーションを選択してください');
                              return;
                            }
                            if (!confirm(`${selectedRelationIds.size}件のリレーションを削除しますか？`)) {
                              return;
                            }
                            try {
                              const { deleteRelation } = await import('@/lib/relationApi');
                              const allRelations = (pendingRelations && pendingRelations.length > 0) ? pendingRelations : (topicRelations || []);
                              const relationsToDelete = allRelations.filter(r => selectedRelationIds.has(r.id));
                              
                              for (const relation of relationsToDelete) {
                                await deleteRelation(relation.id);
                              }
                              
                              if (pendingRelations) {
                                setPendingRelations(pendingRelations.filter(r => !selectedRelationIds.has(r.id)));
                              } else {
                                setTopicRelations(topicRelations.filter(r => !selectedRelationIds.has(r.id)));
                              }
                              
                              setSelectedRelationIds(new Set());
                              setBulkOperationMode('none');
                              alert(`${relationsToDelete.length}件のリレーションを削除しました`);
                            } catch (error: any) {
                              console.error('❌ 一括削除エラー:', error);
                              alert(`リレーションの一括削除に失敗しました: ${error.message}`);
                            }
                          }}
                          style={{
                            padding: '4px 12px',
                            backgroundColor: '#EF4444',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: 500,
                          }}
                        >
                          選択を削除
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRelationIds(new Set());
                            setBulkOperationMode('none');
                          }}
                          style={{
                            padding: '4px 12px',
                            backgroundColor: '#6B7280',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: 500,
                          }}
                        >
                          キャンセル
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setBulkOperationMode('relations')}
                          style={{
                            padding: '4px 12px',
                            backgroundColor: '#8B5CF6',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: 500,
                          }}
                        >
                          ☑️ 一括選択
                        </button>
                        <button
                          onClick={() => {
                            setEditingRelation(null);
                            setShowAddRelationModal(true);
                          }}
                          style={{
                            padding: '4px 12px',
                            backgroundColor: '#3B82F6',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: 500,
                          }}
                        >
                          + 追加
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                {/* リレーション検索・フィルタバー */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    placeholder="リレーションで検索（エンティティ名、説明など）..."
                    value={relationSearchQuery}
                    onChange={(e) => setRelationSearchQuery(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                  <select
                    value={relationTypeFilter}
                    onChange={(e) => setRelationTypeFilter(e.target.value as RelationType | 'all')}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '12px',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="all">すべてのタイプ</option>
                    <option value="subsidiary">子会社</option>
                    <option value="uses">使用</option>
                    <option value="invests">出資</option>
                    <option value="employs">雇用</option>
                    <option value="partners">提携</option>
                    <option value="competes">競合</option>
                    <option value="supplies">供給</option>
                    <option value="owns">所有</option>
                    <option value="located-in">所在</option>
                    <option value="works-for">勤務</option>
                    <option value="manages">管理</option>
                    <option value="reports-to">報告</option>
                    <option value="related-to">関連</option>
                    <option value="other">その他</option>
                  </select>
                </div>
                {isLoadingRelations ? (
                  <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', fontSize: '14px', color: '#6B7280' }}>
                    読み込み中...
                  </div>
                ) : (pendingRelations && pendingRelations.length > 0) || topicRelations.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {((pendingRelations && pendingRelations.length > 0) ? pendingRelations : topicRelations)
                      .filter((relation) => {
                        if (relationSearchQuery) {
                          const query = relationSearchQuery.toLowerCase();
                          const allEntities = (pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities;
                          const sourceEntity = allEntities.find(e => e.id === relation.sourceEntityId);
                          const targetEntity = allEntities.find(e => e.id === relation.targetEntityId);
                          const sourceName = sourceEntity?.name || relation.sourceEntityId || '不明';
                          const targetName = targetEntity?.name || relation.targetEntityId || '不明';
                          const relationTypeLabel = RELATION_TYPE_LABELS[relation.relationType] || relation.relationType;
                          const relationText = `${sourceName} ${relationTypeLabel} ${targetName} ${relation.description || ''}`.toLowerCase();
                          if (!relationText.includes(query)) {
                            return false;
                          }
                        }
                        if (relationTypeFilter !== 'all' && relation.relationType !== relationTypeFilter) {
                          return false;
                        }
                        return true;
                      })
                      .map((relation) => {
                        const allEntities = (pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities;
                        const sourceEntity = allEntities.find(e => e.id === relation.sourceEntityId);
                        const targetEntity = allEntities.find(e => e.id === relation.targetEntityId);
                        const sourceName = sourceEntity?.name || relation.sourceEntityId || '不明';
                        const targetName = targetEntity?.name || relation.targetEntityId || '不明';
                      return (
                        <div
                          key={relation.id}
                          style={{
                            padding: '12px',
                            backgroundColor: bulkOperationMode === 'relations' && selectedRelationIds.has(relation.id) ? '#EFF6FF' : '#F9FAFB',
                            borderRadius: '8px',
                            border: bulkOperationMode === 'relations' && selectedRelationIds.has(relation.id) ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                            fontSize: '14px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {bulkOperationMode === 'relations' && (
                                <input
                                  type="checkbox"
                                  checked={selectedRelationIds.has(relation.id)}
                                  onChange={(e) => {
                                    const newSelected = new Set(selectedRelationIds);
                                    if (e.target.checked) {
                                      newSelected.add(relation.id);
                                    } else {
                                      newSelected.delete(relation.id);
                                    }
                                    setSelectedRelationIds(newSelected);
                                  }}
                                  style={{
                                    cursor: 'pointer',
                                  }}
                                />
                              )}
                              <div style={{ color: '#1a1a1a', fontWeight: 500 }}>
                                <span style={{ color: '#0066CC', fontWeight: 600 }}>{sourceName}</span>{' '}
                                <span style={{ color: '#6B7280' }}>→ [{RELATION_TYPE_LABELS[relation.relationType] || relation.relationType}]</span>{' '}
                                <span style={{ color: '#0066CC', fontWeight: 600 }}>{targetName}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => {
                                  setEditingRelation(relation);
                                  setShowAddRelationModal(true);
                                }}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: 'transparent',
                                  color: '#6B7280',
                                  border: '1px solid #D1D5DB',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                編集
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm(`リレーション「${sourceName} --[${RELATION_TYPE_LABELS[relation.relationType] || relation.relationType}]--> ${targetName}」を削除しますか？`)) {
                                    try {
                                      const { deleteRelation } = await import('@/lib/relationApi');
                                      await deleteRelation(relation.id);
                                      
                                      if (pendingRelations) {
                                        setPendingRelations(pendingRelations.filter(r => r.id !== relation.id));
                                      } else {
                                        setTopicRelations(topicRelations.filter(r => r.id !== relation.id));
                                      }
                                      
                                      alert('リレーションを削除しました');
                                    } catch (error: any) {
                                      console.error('❌ リレーション削除エラー:', error);
                                      alert(`リレーションの削除に失敗しました: ${error.message}`);
                                    }
                                  }
                                }}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: 'transparent',
                                  color: '#EF4444',
                                  border: '1px solid #FCA5A5',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                削除
                              </button>
                            </div>
                          </div>
                          {relation.description && (
                            <div style={{ color: '#6B7280', fontSize: '12px', marginTop: '4px' }}>
                              {relation.description}
                            </div>
                          )}
                          {relation.confidence && (
                            <div style={{ color: '#9CA3AF', fontSize: '11px', marginTop: '4px' }}>
                              信頼度: {(relation.confidence * 100).toFixed(0)}%
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', fontSize: '14px', color: '#9CA3AF', fontStyle: 'italic' }}>
                    登録なし
                  </div>
                )}
              </div>
                </>
              )}
              
              {/* 2Dグラフ表示 */}
              {knowledgeGraphViewMode === 'graph2d' && (
                <KnowledgeGraph2D
                  entities={(pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities}
                  relations={(pendingRelations && pendingRelations.length > 0) ? pendingRelations : topicRelations}
                  isLoading={isLoadingEntities || isLoadingRelations}
                  onEntityClick={(entity) => {
                    setEditingEntity(entity);
                    setShowAddEntityModal(true);
                  }}
                />
              )}
              
              {/* 3Dグラフ表示 */}
              {knowledgeGraphViewMode === 'graph3d' && (
                <KnowledgeGraph3D
                  entities={(pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities}
                  relations={(pendingRelations && pendingRelations.length > 0) ? pendingRelations : topicRelations}
                  isLoading={isLoadingEntities || isLoadingRelations}
                  onEntityClick={(entity) => {
                    setEditingEntity(entity);
                    setShowAddEntityModal(true);
                  }}
                />
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                トピックID
              </div>
              <div style={{ fontSize: '14px', color: '#1a1a1a', fontFamily: 'monospace' }}>
                {selectedTopic.id}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                議事録ID
              </div>
              <div style={{ fontSize: '14px', color: '#1a1a1a', fontFamily: 'monospace' }}>
                {selectedTopic.meetingNoteId}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                組織ID
              </div>
              <div style={{ fontSize: '14px', color: '#1a1a1a', fontFamily: 'monospace' }}>
                {selectedTopic.organizationId}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* エンティティマージモーダル */}
      {showMergeEntityModal && mergeSourceEntity && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
          }}
          onClick={() => {
            setShowMergeEntityModal(false);
            setMergeSourceEntity(null);
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
              エンティティをマージ
            </h3>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '20px' }}>
              「<strong>{mergeSourceEntity.name}</strong>」を他のエンティティに統合します。
              <br />
              統合後、「{mergeSourceEntity.name}」は削除され、関連するリレーションも更新されます。
            </p>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                統合先のエンティティを選択 *
              </label>
              <select
                id="mergeTargetSelect"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value="">選択してください</option>
                {((pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities)
                  .filter(e => e.id !== mergeSourceEntity.id)
                  .map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {ENTITY_TYPE_LABELS[entity.type] || '📌 その他'} {entity.name}
                    </option>
                  ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => {
                  setShowMergeEntityModal(false);
                  setMergeSourceEntity(null);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F3F4F6',
                  color: '#6B7280',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={async () => {
                  const targetSelect = document.getElementById('mergeTargetSelect') as HTMLSelectElement;
                  const targetId = targetSelect?.value;
                  
                  if (!targetId) {
                    alert('統合先のエンティティを選択してください');
                    return;
                  }
                  
                  if (targetId === mergeSourceEntity.id) {
                    alert('統合元と統合先が同じです');
                    return;
                  }
                  
                  if (!confirm(`「${mergeSourceEntity.name}」を選択したエンティティに統合しますか？\n\nこの操作は取り消せません。`)) {
                    return;
                  }
                  
                  try {
                    const { mergeEntities } = await import('@/lib/entityApi');
                    const merged = await mergeEntities(mergeSourceEntity.id, targetId);
                    
                    if (pendingEntities) {
                      setPendingEntities(pendingEntities.filter(e => e.id !== mergeSourceEntity.id).map(e => 
                        e.id === targetId ? merged : e
                      ));
                    } else {
                      setTopicEntities(topicEntities.filter(e => e.id !== mergeSourceEntity.id).map(e => 
                        e.id === targetId ? merged : e
                      ));
                    }
                    
                    const updateRelations = async () => {
                      const allRelations = pendingRelations || topicRelations;
                      const relationsToUpdate = allRelations.filter(r => 
                        r.sourceEntityId === mergeSourceEntity.id || r.targetEntityId === mergeSourceEntity.id
                      );
                      
                      if (relationsToUpdate.length > 0) {
                        const { updateRelation } = await import('@/lib/relationApi');
                        for (const relation of relationsToUpdate) {
                          try {
                            await updateRelation(relation.id, {
                              sourceEntityId: relation.sourceEntityId === mergeSourceEntity.id ? targetId : relation.sourceEntityId,
                              targetEntityId: relation.targetEntityId === mergeSourceEntity.id ? targetId : relation.targetEntityId,
                            });
                          } catch (error) {
                            console.error('❌ リレーション更新エラー:', error);
                          }
                        }
                        
                        if (selectedTopic) {
                          const topicEmbeddingId = `${selectedTopic.meetingNoteId}-topic-${selectedTopic.id}`;
                          const { getRelationsByTopicId } = await import('@/lib/relationApi');
                          const updatedRelations = await getRelationsByTopicId(topicEmbeddingId);
                          if (pendingRelations) {
                            setPendingRelations(updatedRelations);
                          } else {
                            setTopicRelations(updatedRelations);
                          }
                        }
                      }
                    };
                    
                    await updateRelations();
                    
                    alert('エンティティをマージしました');
                    setShowMergeEntityModal(false);
                    setMergeSourceEntity(null);
                  } catch (error: any) {
                    console.error('❌ エンティティマージエラー:', error);
                    alert(`エンティティのマージに失敗しました: ${error.message}`);
                  }
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#8B5CF6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                マージ実行
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* パス検索モーダル */}
      {showPathSearchModal && (
        <PathSearchModal
          isOpen={showPathSearchModal}
          topicEntities={topicEntities}
          pendingEntities={pendingEntities}
          topicRelations={topicRelations}
          pendingRelations={pendingRelations}
          onClose={() => {
            setShowPathSearchModal(false);
          }}
        />
      )}
      
      {/* 統計情報モーダル */}
      {showStatsModal && (
        <StatsModal
          isOpen={showStatsModal}
          topicEntities={topicEntities}
          pendingEntities={pendingEntities}
          topicRelations={topicRelations}
          pendingRelations={pendingRelations}
          onClose={() => {
            setShowStatsModal(false);
          }}
        />
      )}
      
      {/* エンティティ追加/編集モーダル */}
      {showAddEntityModal && (
        <EntityModal
          isOpen={showAddEntityModal}
          editingEntity={editingEntity}
          selectedTopic={selectedTopic}
          topicEntities={topicEntities}
          pendingEntities={pendingEntities}
          setTopicEntities={setTopicEntities}
          setPendingEntities={setPendingEntities}
          onClose={() => {
            setShowAddEntityModal(false);
            setEditingEntity(null);
          }}
        />
      )}
      
      {/* リレーション追加/編集モーダル */}
      {showAddRelationModal && (
        <RelationModal
          isOpen={showAddRelationModal}
          editingRelation={editingRelation}
          selectedTopic={selectedTopic}
          topicEntities={topicEntities}
          pendingEntities={pendingEntities}
          topicRelations={topicRelations}
          pendingRelations={pendingRelations}
          setTopicRelations={setTopicRelations}
          setPendingRelations={setPendingRelations}
          onClose={() => {
            setShowAddRelationModal(false);
            setEditingRelation(null);
          }}
        />
      )}
    </div>
  );
}

