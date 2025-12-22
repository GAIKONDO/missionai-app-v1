'use client';

import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import type { TopicInfo } from '@/lib/orgApi';
import { batchUpdateEntityEmbeddings } from '@/lib/entityEmbeddings';
import { batchUpdateRelationEmbeddings } from '@/lib/relationEmbeddings';
import { batchUpdateTopicEmbeddings } from '@/lib/topicEmbeddings';
import { callTauriCommand } from '@/lib/localFirebase';
import RegenerationSettings from './components/RegenerationSettings';
import DataIntegritySection from './components/DataIntegritySection';
import ConfirmDialogs from './components/ConfirmDialogs';
import RegenerationProgress from './components/RegenerationProgress';
import { devLog, devWarn, devDebug } from './utils/devLog';

interface EmbeddingRegenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  regenerationProgress: {
    current: number;
    total: number;
    status: 'idle' | 'processing' | 'completed' | 'cancelled';
    logs: Array<{ type: 'info' | 'success' | 'error' | 'skip'; message: string; timestamp: Date }>;
    stats: { success: number; skipped: number; errors: number };
  };
  setRegenerationProgress: React.Dispatch<React.SetStateAction<{
    current: number;
    total: number;
    status: 'idle' | 'processing' | 'completed' | 'cancelled';
    logs: Array<{ type: 'info' | 'success' | 'error' | 'skip'; message: string; timestamp: Date }>;
    stats: { success: number; skipped: number; errors: number };
  }>>;
  regenerationType: 'missing' | 'all';
  setRegenerationType: (type: 'missing' | 'all') => void;
  missingCounts: { entities: number; relations: number; topics: number; total: number };
  setMissingCounts: React.Dispatch<React.SetStateAction<{ entities: number; relations: number; topics: number; total: number }>>;
  isCountingMissing: boolean;
  setIsCountingMissing: (value: boolean) => void;
  showCleanupConfirm: boolean;
  setShowCleanupConfirm: (value: boolean) => void;
  showRepairEntityConfirm: boolean;
  setShowRepairEntityConfirm: (value: boolean) => void;
  showRepairRelationConfirm: boolean;
  setShowRepairRelationConfirm: (value: boolean) => void;
  showRepairTopicConfirm: boolean;
  setShowRepairTopicConfirm: (value: boolean) => void;
  isRegeneratingEmbeddings: boolean;
  setIsRegeneratingEmbeddings: (value: boolean) => void;
  isCancelledRef: React.MutableRefObject<boolean>;
  organizations: Array<{ id: string; name: string; title?: string; type?: string }>;
  entities: Entity[];
  relations: Relation[];
  topics: TopicInfo[];
  updateMissingCountsOrganization: (selectedOrgId: string, selectedType: string) => Promise<void>;
  startRegeneration: () => void;
  completeRegeneration: () => void;
  cancelRegeneration: () => void;
}

export default function EmbeddingRegenerationModal({
  isOpen,
  onClose,
  regenerationProgress,
  setRegenerationProgress,
  regenerationType,
  setRegenerationType,
  missingCounts,
  setMissingCounts,
  isCountingMissing,
  setIsCountingMissing,
  showCleanupConfirm,
  setShowCleanupConfirm,
  showRepairEntityConfirm,
  setShowRepairEntityConfirm,
  showRepairRelationConfirm,
  setShowRepairRelationConfirm,
  showRepairTopicConfirm,
  setShowRepairTopicConfirm,
  isRegeneratingEmbeddings,
  setIsRegeneratingEmbeddings,
  isCancelledRef,
  organizations,
  entities,
  relations,
  topics,
  updateMissingCountsOrganization,
  startRegeneration,
  completeRegeneration,
  cancelRegeneration,
}: EmbeddingRegenerationModalProps) {
  if (!isOpen) return null;

  return (
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
        // 処理中は背景クリックで閉じない
        if (isRegeneratingEmbeddings) {
          return;
        }
        onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>
            埋め込み再生成
          </h2>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClose();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6B7280',
              padding: '4px 8px',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ×
          </button>
        </div>
        
        {regenerationProgress.status === 'idle' && (
          <div>
            <RegenerationSettings
              regenerationType={regenerationType}
              setRegenerationType={(newType) => {
                setRegenerationType(newType);
                if (newType === 'all') {
                  setMissingCounts({ entities: 0, relations: 0, topics: 0, total: 0 });
                }
              }}
              organizations={organizations}
              missingCounts={missingCounts}
              isCountingMissing={isCountingMissing}
              updateMissingCountsOrganization={updateMissingCountsOrganization}
            />
            
            <DataIntegritySection
              setShowCleanupConfirm={setShowCleanupConfirm}
              setShowRepairEntityConfirm={setShowRepairEntityConfirm}
              setShowRepairRelationConfirm={setShowRepairRelationConfirm}
              setShowRepairTopicConfirm={setShowRepairTopicConfirm}
            />
            
            <ConfirmDialogs
              showCleanupConfirm={showCleanupConfirm}
              setShowCleanupConfirm={setShowCleanupConfirm}
              showRepairEntityConfirm={showRepairEntityConfirm}
              setShowRepairEntityConfirm={setShowRepairEntityConfirm}
              showRepairRelationConfirm={showRepairRelationConfirm}
              setShowRepairRelationConfirm={setShowRepairRelationConfirm}
              showRepairTopicConfirm={showRepairTopicConfirm}
              setShowRepairTopicConfirm={setShowRepairTopicConfirm}
              regenerationType={regenerationType}
              updateMissingCountsOrganization={updateMissingCountsOrganization}
            />
            
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
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
                  const typeSelect = document.getElementById('regeneration-type-select') as HTMLSelectElement;
                  const selectedType = typeSelect?.value || 'all';
                  const forceRegenerate = regenerationType === 'all'; // 'all'の場合は強制再生成
                  
                  const orgSelect = document.getElementById('regeneration-org-select') as HTMLSelectElement;
                  const selectedId = orgSelect?.value || 'all';
                  
                  devLog(`🚀 [埋め込み再生成] 開始: regenerationType=${regenerationType}, forceRegenerate=${forceRegenerate}, selectedId=${selectedId}, selectedType=${selectedType}`);
                  devLog(`📊 [埋め込み再生成] 現在のentities.length=${entities.length}, relations.length=${relations.length}, topics.length=${topics.length}`);

                  // 停止フラグをリセット
                  isCancelledRef.current = false;
                  setIsRegeneratingEmbeddings(true);
                  // モーダルを閉じる（処理はバックグラウンドで続行）
                  onClose();
                  const initialProgress = {
                    current: 0,
                    total: 0,
                    status: 'processing' as const,
                    logs: [],
                    stats: { success: 0, skipped: 0, errors: 0 },
                  };
                  setRegenerationProgress(initialProgress);
                  // グローバル状態を開始
                  startRegeneration();

                  try {
                    let totalEntities = 0;
                    let totalRelations = 0;
                    let totalTopics = 0;

                    // 対象を決定（organizationIdでフィルタリング、typeで組織と事業会社を区別）
                    let targetEntities = selectedId === 'all'
                      ? entities.filter(e => e.organizationId)
                      : entities.filter(e => e.organizationId === selectedId);
                    let targetRelations = selectedId === 'all'
                      ? relations.filter(r => {
                          const orgId = r.organizationId || entities.find(e => e.id === r.sourceEntityId || e.id === r.targetEntityId)?.organizationId;
                          return orgId && r.topicId;
                        })
                      : relations.filter(r => {
                          const orgId = r.organizationId || entities.find(e => e.id === r.sourceEntityId || e.id === r.targetEntityId)?.organizationId;
                          return orgId === selectedId && r.topicId;
                        });
                    // topicsプロップが空の場合、query_getで直接取得
                    let targetTopics: TopicInfo[] = [];
                    if (topics.length === 0) {
                      try {
                        devLog(`📊 [埋め込み再生成] topicsプロップが空のため、query_getで直接取得します`);
                        const allTopicDocs = await callTauriCommand('query_get', {
                          collectionName: 'topics',
                          conditions: selectedId !== 'all' ? { organizationId: selectedId } : {},
                        }) as Array<{ id: string; data: any }>;
                        
                        // TopicInfo形式に変換
                        for (const doc of allTopicDocs) {
                          const topicData = doc.data || doc;
                          const topicId = doc.id || topicData.id;
                          
                          // ID形式が`${meetingNoteId}-topic-${topicId}`の場合、topicIdを抽出
                          const idMatch = topicId.match(/^(.+)-topic-(.+)$/);
                          const extractedTopicId = idMatch ? idMatch[2] : topicId;
                          const meetingNoteId = idMatch ? idMatch[1] : topicData.meetingNoteId;
                          
                          targetTopics.push({
                            id: extractedTopicId,
                            itemId: topicId, // 完全なIDをitemIdとして保存
                            title: topicData.title || '',
                            content: topicData.content || '',
                            meetingNoteId: meetingNoteId || topicData.meetingNoteId || '',
                            meetingNoteTitle: topicData.meetingNoteTitle || '',
                            organizationId: topicData.organizationId || '',
                            semanticCategory: topicData.semanticCategory,
                            importance: topicData.importance,
                            keywords: topicData.keywords ? (Array.isArray(topicData.keywords) ? topicData.keywords : JSON.parse(topicData.keywords)) : undefined,
                            summary: topicData.summary,
                          });
                        }
                        devLog(`📊 [埋め込み再生成] query_getで取得したトピック数: ${targetTopics.length}件`);
                      } catch (error) {
                        devWarn(`⚠️ [埋め込み再生成] query_getでのトピック取得エラー:`, error);
                        // フォールバック: topicsプロップを使用
                        targetTopics = selectedId === 'all'
                          ? topics.filter(t => t.organizationId)
                          : topics.filter(t => t.organizationId === selectedId);
                      }
                    } else {
                      targetTopics = selectedId === 'all'
                        ? topics.filter(t => t.organizationId)
                        : topics.filter(t => t.organizationId === selectedId);
                    }

                    // 未生成のみの場合は、SQLiteのchromaSyncedフラグでフィルタリング
                    if (!forceRegenerate && regenerationType === 'missing') {
                      devLog(`🔍 [埋め込み再生成] 未生成のみモード: フィルタリング開始`);
                      devLog(`📊 [埋め込み再生成] フィルタリング前: エンティティ=${targetEntities.length}, リレーション=${targetRelations.length}, トピック=${targetTopics.length}`);
                      const { callTauriCommand } = await import('@/lib/localFirebase');
                      
                      // エンティティのフィルタリング（query_getで一括取得）
                      if (selectedType === 'all' || selectedType === 'entities') {
                        try {
                          // すべてのエンティティを取得してから、chromaSyncedが0またはnullのものをフィルタリング
                          const allEntityDocs = await callTauriCommand('query_get', {
                            collectionName: 'entities',
                            conditions: {},
                          }) as Array<{ id: string; data: any }>;
                          
                          // chromaSyncedが0またはnullのエンティティをフィルタリング
                          const missingEntityDocs = allEntityDocs.filter(doc => {
                            const entityData = doc.data || doc;
                            const chromaSyncedValue = entityData.chromaSynced;
                            return chromaSyncedValue === 0 || chromaSyncedValue === null || chromaSyncedValue === undefined;
                          });
                          
                          // query_getの結果は[{id: string, data: any}]の形式
                          const missingEntityIds = new Set(missingEntityDocs.map(doc => doc.id || doc.data?.id));
                          // targetEntitiesは既にcompanyIdを持つものを含むため、そのままフィルタリング
                          const missingEntities = targetEntities.filter(entity => missingEntityIds.has(entity.id));
                          
                          // ループ内のログを簡略化（パフォーマンス最適化）
                          devLog(`📊 [埋め込み再生成] エンティティフィルタリング後: ${missingEntities.length}件`);
                          targetEntities = missingEntities;
                        } catch (error) {
                          devWarn(`⚠️ [埋め込み再生成] エンティティの一括取得エラー（個別チェックにフォールバック）:`, error);
                          // フォールバック: 個別チェック
                          const missingEntities: Entity[] = [];
                          for (const entity of targetEntities) {
                            try {
                              const entityDoc = await callTauriCommand('doc_get', {
                                collectionName: 'entities',
                                docId: entity.id,
                              }) as any;
                              
                              let chromaSynced = false;
                              if (entityDoc?.exists && entityDoc?.data) {
                                chromaSynced = entityDoc.data.chromaSynced === 1 || entityDoc.data.chromaSynced === true;
                              }
                              
                              if (!chromaSynced) {
                                missingEntities.push(entity);
                              }
                            } catch (err) {
                              devDebug(`エンティティ ${entity.id} のフラグ確認エラー:`, err);
                              missingEntities.push(entity);
                            }
                          }
                          targetEntities = missingEntities;
                        }
                      }
                      
                      // リレーションのフィルタリング（query_getで一括取得）
                      if (selectedType === 'all' || selectedType === 'relations') {
                        try {
                          // すべてのリレーションを取得してから、chromaSyncedが0またはnullのものをフィルタリング
                          const allRelationDocs = await callTauriCommand('query_get', {
                            collectionName: 'relations',
                            conditions: {},
                          }) as Array<{ id: string; data: any }>;
                          
                          // chromaSyncedが0またはnullのリレーションをフィルタリング
                          const missingRelationDocs = allRelationDocs.filter(doc => {
                            const relationData = doc.data || doc;
                            const chromaSyncedValue = relationData.chromaSynced;
                            return chromaSyncedValue === 0 || chromaSyncedValue === null || chromaSyncedValue === undefined;
                          });
                          
                          // query_getの結果は[{id: string, data: any}]の形式
                          const missingRelationIds = new Set(missingRelationDocs.map(doc => doc.id || doc.data?.id));
                          // targetRelationsは既にcompanyIdを持つものを含むため、そのままフィルタリング
                          const missingRelations = targetRelations.filter(relation => missingRelationIds.has(relation.id));
                          
                          // ループ内のログを簡略化（パフォーマンス最適化）
                          devLog(`📊 [埋め込み再生成] リレーションフィルタリング後: ${missingRelations.length}件`);
                          targetRelations = missingRelations;
                        } catch (error) {
                          devWarn(`⚠️ [埋め込み再生成] リレーションの一括取得エラー（個別チェックにフォールバック）:`, error);
                          // フォールバック: 個別チェック
                          const missingRelations: Relation[] = [];
                          for (const relation of targetRelations) {
                            try {
                              const relationDoc = await callTauriCommand('doc_get', {
                                collectionName: 'relations',
                                docId: relation.id,
                              }) as any;
                              
                              let chromaSynced = false;
                              if (relationDoc?.exists && relationDoc?.data) {
                                chromaSynced = relationDoc.data.chromaSynced === 1 || relationDoc.data.chromaSynced === true;
                              }
                              
                              if (!chromaSynced) {
                                missingRelations.push(relation);
                              }
                            } catch (err) {
                              devDebug(`リレーション ${relation.id} のフラグ確認エラー:`, err);
                              missingRelations.push(relation);
                            }
                          }
                          targetRelations = missingRelations;
                        }
                      }
                      
                      // トピックのフィルタリング（query_getで一括取得）
                      if (selectedType === 'all' || selectedType === 'topics') {
                        try {
                          // すべてのトピックを取得してから、chromaSyncedが0またはnullのものをフィルタリング
                          const allTopicDocs = await callTauriCommand('query_get', {
                            collectionName: 'topics',
                            conditions: selectedId !== 'all' ? { organizationId: selectedId } : {},
                          }) as Array<{ id: string; data: any }>;
                          
                          // chromaSyncedが0またはnullのトピックをフィルタリング
                          const missingTopicDocs = allTopicDocs.filter(doc => {
                            const topicData = doc.data || doc;
                            const chromaSyncedValue = topicData.chromaSynced;
                            return chromaSyncedValue === 0 || chromaSyncedValue === null || chromaSyncedValue === undefined;
                          });
                          
                          // SQLiteのtopicsテーブルのIDは`${meetingNoteId}-topic-${topicId}`形式
                          // TopicInfoのIDは`topicId`のみなので、missingTopicDocsのIDからtopicIdを抽出して比較
                          const missingTopicIdSet = new Set<string>();
                          for (const doc of missingTopicDocs) {
                            const topicId = doc.id || doc.data?.id;
                            if (topicId) {
                              // ID形式が`${meetingNoteId}-topic-${topicId}`の場合、topicIdを抽出
                              const idMatch = topicId.match(/^(.+)-topic-(.+)$/);
                              if (idMatch) {
                                const extractedTopicId = idMatch[2];
                                missingTopicIdSet.add(extractedTopicId);
                                missingTopicIdSet.add(topicId); // 完全なIDも追加（念のため）
                              } else {
                                // 既にtopicIdのみの形式の場合
                                missingTopicIdSet.add(topicId);
                              }
                            }
                          }
                          
                          // targetTopicsのIDと比較
                          const missingTopics = targetTopics.filter(topic => missingTopicIdSet.has(topic.id));
                          
                          // ループ内のログを簡略化（パフォーマンス最適化）
                          devLog(`📊 [埋め込み再生成] トピックフィルタリング後: ${missingTopics.length}件`);
                          targetTopics = missingTopics;
                        } catch (error) {
                          devWarn(`⚠️ [埋め込み再生成] トピックの一括取得エラー（個別チェックにフォールバック）:`, error);
                          // フォールバック: 個別チェック
                          const missingTopics: TopicInfo[] = [];
                          for (const topic of targetTopics) {
                            if (!topic.meetingNoteId || !topic.organizationId) continue;
                            try {
                              // SQLiteのtopicsテーブルのIDは`${meetingNoteId}-topic-${topicId}`形式
                              const topicEmbeddingId = `${topic.meetingNoteId}-topic-${topic.id}`;
                              const topicDoc = await callTauriCommand('doc_get', {
                                collectionName: 'topics',
                                docId: topicEmbeddingId,
                              }) as any;
                              
                              let chromaSynced = false;
                              if (topicDoc?.exists && topicDoc?.data) {
                                const chromaSyncedValue = topicDoc.data.chromaSynced;
                                chromaSynced = chromaSyncedValue === 1 || chromaSyncedValue === true || chromaSyncedValue === '1';
                              }
                              
                              if (!chromaSynced) {
                                missingTopics.push(topic);
                              }
                            } catch (err) {
                              devDebug(`トピック ${topic.id} のフラグ確認エラー:`, err);
                              missingTopics.push(topic);
                            }
                          }
                          targetTopics = missingTopics;
                        }
                      }
                      
                      devLog(`✅ [埋め込み再生成] フィルタリング完了: エンティティ=${targetEntities.length}, リレーション=${targetRelations.length}, トピック=${targetTopics.length}`);
                    }

                    if (selectedType === 'all' || selectedType === 'entities') {
                      totalEntities = targetEntities.length;
                    }
                    if (selectedType === 'all' || selectedType === 'relations') {
                      totalRelations = targetRelations.length;
                    }
                    if (selectedType === 'all' || selectedType === 'topics') {
                      totalTopics = targetTopics.length;
                    }

                    const total = totalEntities + totalRelations + totalTopics;
                    devLog(`📊 [埋め込み再生成] 最終的な件数: エンティティ=${totalEntities}, リレーション=${totalRelations}, トピック=${totalTopics}, 合計=${total}`);
                    setRegenerationProgress(prev => ({ ...prev, total }));
                    
                    if (total === 0) {
                      devWarn(`⚠️ [埋め込み再生成] 処理対象が0件です。フィルタリング処理を確認してください。`);
                      setRegenerationProgress(prev => ({
                        ...prev,
                        status: 'completed',
                        logs: [
                          ...prev.logs,
                          {
                            type: 'info',
                            message: '処理対象が0件でした。すべてのアイテムが既に埋め込み済みの可能性があります。',
                            timestamp: new Date(),
                          },
                        ],
                      }));
                      setIsRegeneratingEmbeddings(false);
                      completeRegeneration();
                      return;
                    }

                    // エンティティの再生成
                    if (selectedType === 'all' || selectedType === 'entities') {
                      for (const entity of targetEntities) {
                        // 停止チェック
                        if (isCancelledRef.current) {
                          setRegenerationProgress(prev => ({
                            ...prev,
                            status: 'cancelled',
                            logs: [
                              ...prev.logs,
                              {
                                type: 'info',
                                message: '処理が中止されました',
                                timestamp: new Date(),
                              },
                            ],
                          }));
                          break;
                        }
                        
                        // organizationIdが必要
                        if (!entity.organizationId) {
                          devWarn(`⚠️ エンティティ ${entity.id} (${entity.name}) にorganizationIdがありません。スキップします。`);
                          continue;
                        }
                        
                        // 未生成のみの場合は、既にフィルタリング済みなのでチェック不要
                        // batchUpdateEntityEmbeddings内でもSQLiteのchromaSyncedフラグをチェックするため、ここではスキップ
                        
                        const entityIds = [entity.id];
                        // organizationIdを使用（typeで組織と事業会社を区別）
                        const orgOrCompanyId = entity.organizationId || '';
                        await batchUpdateEntityEmbeddings(
                          entityIds,
                          orgOrCompanyId,
                          forceRegenerate, // 選択されたモードに応じて設定
                          (current, total, entityId, status) => {
                            setRegenerationProgress(prev => ({
                              ...prev,
                              // success, skipped, errorのすべての場合にcurrentを増やす（処理が完了したことを示す）
                              current: prev.current + (status === 'success' || status === 'skipped' || status === 'error' ? 1 : 0),
                              logs: [
                                ...prev.logs,
                                {
                                  type: status === 'success' ? 'success' : status === 'error' ? 'error' : 'skip',
                                  message: `エンティティ: ${entity.name} (${status === 'success' ? '成功' : status === 'error' ? 'エラー' : 'スキップ'})`,
                                  timestamp: new Date(),
                                },
                              ],
                              stats: {
                                ...prev.stats,
                                success: prev.stats.success + (status === 'success' ? 1 : 0),
                                skipped: prev.stats.skipped + (status === 'skipped' ? 1 : 0),
                                errors: prev.stats.errors + (status === 'error' ? 1 : 0),
                              },
                            }));
                          },
                          () => isCancelledRef.current // shouldCancelコールバック
                        );
                        
                        // 停止チェック（バッチ処理後）
                        if (isCancelledRef.current) {
                          break;
                        }
                      }
                    }

                    // リレーションの再生成
                    if (selectedType === 'all' || selectedType === 'relations') {
                      for (const relation of targetRelations) {
                        // 停止チェック
                        if (isCancelledRef.current) {
                          setRegenerationProgress(prev => ({
                            ...prev,
                            status: 'cancelled',
                            logs: [
                              ...prev.logs,
                              {
                                type: 'info',
                                message: '処理が中止されました',
                                timestamp: new Date(),
                              },
                            ],
                          }));
                          break;
                        }
                        
                        // organizationIdを取得（リレーション自体のorganizationIdを優先、なければ関連エンティティから取得）
                        let organizationId = relation.organizationId;
                        if (!organizationId) {
                          const relatedEntity = entities.find(e => e.id === relation.sourceEntityId || e.id === relation.targetEntityId);
                          organizationId = relatedEntity?.organizationId;
                        }
                        
                        // organizationIdが必要
                        if (!organizationId) {
                          devWarn(`⚠️ リレーション ${relation.id} (${relation.relationType}) にorganizationIdがありません。スキップします。`);
                          continue;
                        }
                        
                        // organizationIdを使用（typeで組織と事業会社を区別）
                        const orgOrCompanyId = organizationId || '';

                        // topicIdがない場合はスキップ
                        if (!relation.topicId) {
                          devWarn(`⚠️ リレーション ${relation.id} (${relation.relationType}) にtopicIdがありません。スキップします。`);
                          continue;
                        }

                        // 未生成のみの場合は、既にフィルタリング済みなのでチェック不要
                        // batchUpdateRelationEmbeddings内でもチェックが行われるため、ここではスキップ

                        const relationIds = [relation.id];
                        await batchUpdateRelationEmbeddings(
                          relationIds,
                          orgOrCompanyId,
                          forceRegenerate, // 選択されたモードに応じて設定
                          (current, total, relationId, status) => {
                            setRegenerationProgress(prev => ({
                              ...prev,
                              // success, skipped, errorのすべての場合にcurrentを増やす（処理が完了したことを示す）
                              current: prev.current + (status === 'success' || status === 'skipped' || status === 'error' ? 1 : 0),
                              logs: [
                                ...prev.logs,
                                {
                                  type: status === 'success' ? 'success' : status === 'error' ? 'error' : 'skip',
                                  message: `リレーション: ${relation.relationType} (${status === 'success' ? '成功' : status === 'error' ? 'エラー' : 'スキップ'})`,
                                  timestamp: new Date(),
                                },
                              ],
                              stats: {
                                ...prev.stats,
                                success: prev.stats.success + (status === 'success' ? 1 : 0),
                                skipped: prev.stats.skipped + (status === 'skipped' ? 1 : 0),
                                errors: prev.stats.errors + (status === 'error' ? 1 : 0),
                              },
                            }));
                          },
                          () => isCancelledRef.current // shouldCancelコールバック
                        );
                        
                        // 停止チェック（バッチ処理後）
                        if (isCancelledRef.current) {
                          break;
                        }
                      }
                    }

                    // トピックの再生成
                    if (selectedType === 'all' || selectedType === 'topics') {
                      // トピックをmeetingNoteIdごとにグループ化
                      const topicsByMeetingNote = new Map<string, Array<{ id: string; title: string; content: string; metadata?: any }>>();
                      
                      for (const topic of targetTopics) {
                        if (!topic.organizationId || !topic.meetingNoteId) {
                          devWarn(`⚠️ トピック ${topic.id} (${topic.title}) にorganizationIdまたはmeetingNoteIdがありません。スキップします。`);
                          continue;
                        }

                        // 未生成のみの場合は、既にフィルタリング済みなのでチェック不要
                        // batchUpdateTopicEmbeddings内でもチェックが行われるため、ここではスキップ

                        if (!topicsByMeetingNote.has(topic.meetingNoteId)) {
                          topicsByMeetingNote.set(topic.meetingNoteId, []);
                        }

                        const topicData = {
                          id: topic.id,
                          title: topic.title,
                          content: topic.content || '',
                          metadata: {
                            keywords: topic.keywords,
                            semanticCategory: topic.semanticCategory,
                            summary: topic.summary,
                            importance: topic.importance,
                          },
                        };

                        topicsByMeetingNote.get(topic.meetingNoteId)!.push(topicData);
                      }

                      // 各議事録ごとにトピック埋め込みを再生成
                      for (const [meetingNoteId, topicList] of topicsByMeetingNote.entries()) {
                        // 停止チェック
                        if (isCancelledRef.current) {
                          setRegenerationProgress(prev => ({
                            ...prev,
                            status: 'cancelled',
                            logs: [
                              ...prev.logs,
                              {
                                type: 'info',
                                message: '処理が中止されました',
                                timestamp: new Date(),
                              },
                            ],
                          }));
                          break;
                        }
                        
                        const firstTopic = topicList[0];
                        if (!firstTopic) continue;

                        // 組織IDを取得（最初のトピックから）
                        const orgTopic = targetTopics.find(t => t.meetingNoteId === meetingNoteId);
                        if (!orgTopic?.organizationId) {
                          devWarn(`⚠️ 議事録 ${meetingNoteId} のトピックにorganizationIdがありません。スキップします。`);
                          continue;
                        }

                        await batchUpdateTopicEmbeddings(
                          topicList,
                          meetingNoteId,
                          orgTopic.organizationId,
                          forceRegenerate, // 選択されたモードに応じて設定
                          (current, total, topicId, status) => {
                            const topic = topicList.find(t => t.id === topicId);
                            setRegenerationProgress(prev => ({
                              ...prev,
                              // success, skipped, errorのすべての場合にcurrentを増やす（処理が完了したことを示す）
                              current: prev.current + (status === 'success' || status === 'skipped' || status === 'error' ? 1 : 0),
                              logs: [
                                ...prev.logs,
                                {
                                  type: status === 'success' ? 'success' : status === 'error' ? 'error' : 'skip',
                                  message: `トピック: ${topic?.title || topicId} (${status === 'success' ? '成功' : status === 'error' ? 'エラー' : 'スキップ'})`,
                                  timestamp: new Date(),
                                },
                              ],
                              stats: {
                                ...prev.stats,
                                success: prev.stats.success + (status === 'success' ? 1 : 0),
                                skipped: prev.stats.skipped + (status === 'skipped' ? 1 : 0),
                                errors: prev.stats.errors + (status === 'error' ? 1 : 0),
                              },
                            }));
                          },
                          () => isCancelledRef.current // shouldCancelコールバック
                        );
                        
                        // 停止チェック（バッチ処理後）
                        if (isCancelledRef.current) {
                          break;
                        }
                      }
                    }

                    // 停止されていない場合のみ完了ステータスを設定
                    if (!isCancelledRef.current) {
                      setRegenerationProgress(prev => ({ ...prev, status: 'completed' }));
                      // 完了ステータスを設定した後、グローバル状態も更新
                      completeRegeneration();
                    }
                  } catch (error: any) {
                    console.error('埋め込み再生成エラー:', error);
                    setRegenerationProgress(prev => ({
                      ...prev,
                      status: isCancelledRef.current ? 'cancelled' : 'completed',
                      logs: [
                        ...prev.logs,
                        {
                          type: 'error',
                          message: `エラー: ${error.message || '不明なエラー'}`,
                          timestamp: new Date(),
                        },
                      ],
                    }));
                    // エラー時も完了ステータスを設定した場合はグローバル状態を更新
                    if (!isCancelledRef.current) {
                      completeRegeneration();
                    } else {
                      cancelRegeneration();
                    }
                  } finally {
                    setIsRegeneratingEmbeddings(false);
                  }
                }}
                disabled={isRegeneratingEmbeddings}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isRegeneratingEmbeddings ? '#9CA3AF' : '#3B82F6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: isRegeneratingEmbeddings ? 'not-allowed' : 'pointer',
                  opacity: isRegeneratingEmbeddings ? 0.6 : 1,
                }}
              >
                開始
              </button>
              {isRegeneratingEmbeddings && (
                <button
                  onClick={() => {
                    isCancelledRef.current = true;
                    setRegenerationProgress(prev => ({
                      ...prev,
                      status: 'cancelled',
                      logs: [
                        ...prev.logs,
                        {
                          type: 'info',
                          message: '停止がリクエストされました。処理を完了して停止します...',
                          timestamp: new Date(),
                        },
                      ],
                    }));
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#EF4444',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    marginLeft: '8px',
                  }}
                >
                  停止
                </button>
              )}
            </div>
          </div>
        )}

        <RegenerationProgress
          regenerationProgress={regenerationProgress}
          setRegenerationProgress={setRegenerationProgress}
          isCancelledRef={isCancelledRef}
          setIsRegeneratingEmbeddings={setIsRegeneratingEmbeddings}
          cancelRegeneration={cancelRegeneration}
        />
      </div>
    </div>
  );
}
