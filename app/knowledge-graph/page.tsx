'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import KnowledgeGraph2D from '@/components/KnowledgeGraph2D';
import KnowledgeGraph3D from '@/components/KnowledgeGraph3D';
import { getAllEntities, getEntityById, deleteEntity } from '@/lib/entityApi';
import { getAllRelations, getRelationById, getRelationsByEntityId, deleteRelation } from '@/lib/relationApi';
import { getAllTopicsBatch, getAllMembersBatch, getOrgTreeFromDb, getAllOrganizationsFromTree } from '@/lib/orgApi';
import { batchUpdateEntityEmbeddings, findOutdatedEntityEmbeddings, CURRENT_EMBEDDING_VERSION as ENTITY_EMBEDDING_VERSION, CURRENT_EMBEDDING_MODEL as ENTITY_EMBEDDING_MODEL } from '@/lib/entityEmbeddings';
import { batchUpdateRelationEmbeddings, findOutdatedRelationEmbeddings, CURRENT_EMBEDDING_VERSION as RELATION_EMBEDDING_VERSION, CURRENT_EMBEDDING_MODEL as RELATION_EMBEDDING_MODEL } from '@/lib/relationEmbeddings';
import { batchUpdateTopicEmbeddings } from '@/lib/topicEmbeddings';
import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import type { TopicInfo } from '@/lib/orgApi';

function KnowledgeGraphPageContent() {
  const searchParams = useSearchParams();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; title?: string }>>([]);
  const [members, setMembers] = useState<Array<{ id: string; name: string; position?: string; organizationId: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'graph2d' | 'graph3d'>('graph2d');
  const [entitySearchQuery, setEntitySearchQuery] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [relationSearchQuery, setRelationSearchQuery] = useState('');
  const [relationTypeFilter, setRelationTypeFilter] = useState<string>('all');
  const [highlightedEntityId, setHighlightedEntityId] = useState<string | null>(null);
  const [highlightedRelationId, setHighlightedRelationId] = useState<string | null>(null);
  
  // フィルター状態
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<Set<string>>(new Set());
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [selectedImportance, setSelectedImportance] = useState<Set<'high' | 'medium' | 'low'>>(new Set());
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [showOrganizationFilter, setShowOrganizationFilter] = useState(false);
  const [showMemberFilter, setShowMemberFilter] = useState(false);
  const [showImportanceFilter, setShowImportanceFilter] = useState(false);
  
  // 埋め込み再生成の状態
  const [isRegeneratingEmbeddings, setIsRegeneratingEmbeddings] = useState(false);
  const [regenerationProgress, setRegenerationProgress] = useState<{
    current: number;
    total: number;
    status: 'idle' | 'processing' | 'completed';
    logs: Array<{ type: 'info' | 'success' | 'error' | 'skip'; message: string; timestamp: Date }>;
    stats: { success: number; skipped: number; errors: number };
  }>({
    current: 0,
    total: 0,
    status: 'idle',
    logs: [],
    stats: { success: 0, skipped: 0, errors: 0 },
  });
  const [showRegenerationModal, setShowRegenerationModal] = useState(false);
  const [regenerationMode, setRegenerationMode] = useState<'missing' | 'all'>('missing'); // 再生成モード
  const [missingCounts, setMissingCounts] = useState<{ entities: number; relations: number; topics: number; total: number }>({ entities: 0, relations: 0, topics: 0, total: 0 });
  const [isCountingMissing, setIsCountingMissing] = useState(false);
  const [showVersionCheck, setShowVersionCheck] = useState(false);
  const [outdatedEntities, setOutdatedEntities] = useState<Array<{ entityId: string; currentVersion: string; expectedVersion: string; model: string }>>([]);
  const [outdatedRelations, setOutdatedRelations] = useState<Array<{ relationId: string; currentVersion: string; expectedVersion: string; model: string }>>([]);
  const [isCheckingVersion, setIsCheckingVersion] = useState(false);
  
  // エンティティ削除の状態
  const [deleteTargetEntityId, setDeleteTargetEntityId] = useState<string | null>(null);
  const [showDeleteEntityModal, setShowDeleteEntityModal] = useState(false);
  const [isDeletingEntity, setIsDeletingEntity] = useState(false);
  
  // 一括削除の状態
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [allEntities, allRelations, allTopics] = await Promise.all([
          getAllEntities(),
          getAllRelations(),
          getAllTopicsBatch(),
        ]);
        
        setEntities(allEntities);
        setRelations(allRelations);
        setTopics(allTopics);
        console.log('✅ ナレッジグラフデータ読み込み完了:', {
          entities: allEntities.length,
          relations: allRelations.length,
          topics: allTopics.length,
        });

        // URLパラメータからエンティティIDまたはリレーションIDを取得
        const entityId = searchParams?.get('entityId');
        const relationId = searchParams?.get('relationId');

        if (entityId) {
          const entity = await getEntityById(entityId);
          if (entity) {
            setHighlightedEntityId(entityId);
            setViewMode('graph2d'); // グラフ表示に切り替え
          }
        }

        if (relationId) {
          const relation = await getRelationById(relationId);
          if (relation) {
            setHighlightedRelationId(relationId);
            setViewMode('graph2d'); // グラフ表示に切り替え
          }
        }
      } catch (error: any) {
        console.error('❌ ナレッジグラフデータの読み込みエラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [searchParams]);

  // 未生成件数を計算する関数
  const updateMissingCounts = useCallback(async (selectedOrgId: string, selectedType: string) => {
    if (regenerationMode !== 'missing') {
      return; // すべて再生成モードの場合は計算不要
    }
    
    setIsCountingMissing(true);
    
    try {
      // 対象を決定
      const targetEntities = selectedOrgId === 'all'
        ? entities.filter(e => e.organizationId)
        : entities.filter(e => e.organizationId === selectedOrgId);
      const targetRelations = selectedOrgId === 'all'
        ? relations.filter(r => {
            const orgId = r.organizationId || entities.find(e => e.id === r.sourceEntityId || e.id === r.targetEntityId)?.organizationId;
            return orgId && r.topicId;
          })
        : relations.filter(r => {
            const orgId = r.organizationId || entities.find(e => e.id === r.sourceEntityId || e.id === r.targetEntityId)?.organizationId;
            return orgId === selectedOrgId && r.topicId;
          });
      const targetTopics = selectedOrgId === 'all'
        ? topics.filter(t => t.organizationId)
        : topics.filter(t => t.organizationId === selectedOrgId);

      let entityCount = 0;
      let relationCount = 0;
      let topicCount = 0;

      // エンティティの未生成件数をカウント
      // SQLiteのchromaSyncedカラムとChromaDBの両方を確認
      if (selectedType === 'all' || selectedType === 'entities') {
        for (const entity of targetEntities) {
          try {
            // SQLiteからエンティティの詳細情報を取得（chromaSyncedを含む）
            const { callTauriCommand } = await import('@/lib/localFirebase');
            const entityData = await callTauriCommand('doc_get', {
              collectionName: 'entities',
              docId: entity.id,
            }) as any;
            
            // chromaSyncedが1の場合は埋め込みが存在すると判断
            const chromaSynced = entityData?.chromaSynced === 1 || entityData?.chromaSynced === true;
            
            // chromaSyncedが0または未設定の場合、ChromaDBから直接確認
            let existsInChroma = false;
            if (!chromaSynced && entity.organizationId) {
              try {
                // エンティティ名でChromaDBを検索して、結果にIDが含まれるか確認
                const { findSimilarEntitiesChroma } = await import('@/lib/entityEmbeddingsChroma');
                const searchResults = await findSimilarEntitiesChroma(entity.name || '', 100, entity.organizationId);
                existsInChroma = searchResults.some(result => result.entityId === entity.id);
              } catch (error) {
                // 検索エラーは無視（ChromaDBに存在しない可能性）
                console.debug(`エンティティ ${entity.id} のChromaDB検索エラー:`, error);
              }
            }
            
            if (!chromaSynced && !existsInChroma) {
              // chromaSyncedが0または未設定で、かつChromaDBにも存在しない場合
              entityCount++;
            }
          } catch (error) {
            // エラーが発生した場合は未生成としてカウント
            console.warn(`エンティティ ${entity.id} の埋め込み確認エラー:`, error);
            entityCount++;
          }
        }
      }

      // リレーションの未生成件数をカウント
      // SQLiteのchromaSyncedカラムとChromaDBの両方を確認
      if (selectedType === 'all' || selectedType === 'relations') {
        for (const relation of targetRelations) {
          try {
            // SQLiteからリレーションの詳細情報を取得（chromaSyncedを含む）
            const { callTauriCommand } = await import('@/lib/localFirebase');
            const relationData = await callTauriCommand('doc_get', {
              collectionName: 'relations',
              docId: relation.id,
            }) as any;
            
            // chromaSyncedが1の場合は埋め込みが存在すると判断
            const chromaSynced = relationData?.chromaSynced === 1 || relationData?.chromaSynced === true;
            
            // chromaSyncedが0または未設定の場合、ChromaDBから直接確認
            let existsInChroma = false;
            if (!chromaSynced) {
              const orgId = relation.organizationId || entities.find(e => e.id === relation.sourceEntityId || e.id === relation.targetEntityId)?.organizationId;
              if (orgId) {
                try {
                  // リレーションタイプでChromaDBを検索して、結果にIDが含まれるか確認
                  const { findSimilarRelationsChroma } = await import('@/lib/relationEmbeddingsChroma');
                  const searchResults = await findSimilarRelationsChroma(relation.relationType || '', 100, orgId);
                  existsInChroma = searchResults.some(result => result.relationId === relation.id);
                } catch (error) {
                  // 検索エラーは無視（ChromaDBに存在しない可能性）
                  console.debug(`リレーション ${relation.id} のChromaDB検索エラー:`, error);
                }
              }
            }
            
            if (!chromaSynced && !existsInChroma) {
              // chromaSyncedが0または未設定で、かつChromaDBにも存在しない場合
              relationCount++;
            }
          } catch (error) {
            // エラーが発生した場合は未生成としてカウント
            console.warn(`リレーション ${relation.id} の埋め込み確認エラー:`, error);
            relationCount++;
          }
        }
      }

      // トピックの未生成件数をカウント
      // SQLiteのchromaSyncedカラムとChromaDBの両方を確認
      if (selectedType === 'all' || selectedType === 'topics') {
        for (const topic of targetTopics) {
          if (!topic.meetingNoteId || !topic.organizationId) continue;
          try {
            // SQLiteからトピックの詳細情報を取得（chromaSyncedを含む）
            const { callTauriCommand } = await import('@/lib/localFirebase');
            const embeddingId = `${topic.meetingNoteId}-topic-${topic.id}`;
            const topicData = await callTauriCommand('doc_get', {
              collectionName: 'topics',
              docId: embeddingId,
            }) as any;
            
            // chromaSyncedが1の場合、または埋め込みデータが存在する場合は埋め込みが存在すると判断
            const chromaSynced = topicData?.chromaSynced === 1 || topicData?.chromaSynced === true;
            const hasEmbedding = topicData?.embedding && Array.isArray(topicData.embedding) && topicData.embedding.length > 0;
            
            // chromaSyncedが0または未設定で、かつSQLiteに埋め込みデータがない場合、ChromaDBから直接確認
            let existsInChroma = false;
            if (!chromaSynced && !hasEmbedding && topic.organizationId) {
              try {
                // トピックタイトルでChromaDBを検索して、結果にIDが含まれるか確認
                const { findSimilarTopicsChroma } = await import('@/lib/topicEmbeddingsChroma');
                const searchResults = await findSimilarTopicsChroma(topic.title || '', 100, topic.organizationId);
                // ChromaDBのIDはtopicIdそのもの（meetingNoteId-topic-topicId形式ではない）
                existsInChroma = searchResults.some(result => result.topicId === topic.id);
              } catch (error) {
                // 検索エラーは無視（ChromaDBに存在しない可能性）
                console.debug(`トピック ${topic.id} のChromaDB検索エラー:`, error);
              }
            }
            
            if (!chromaSynced && !hasEmbedding && !existsInChroma) {
              // chromaSyncedが0または未設定で、SQLiteにも埋め込みデータがなく、かつChromaDBにも存在しない場合
              topicCount++;
            }
          } catch (error) {
            // エラーが発生した場合は未生成としてカウント
            console.warn(`トピック ${topic.id} の埋め込み確認エラー:`, error);
            topicCount++;
          }
        }
      }

      setMissingCounts({
        entities: entityCount,
        relations: relationCount,
        topics: topicCount,
        total: entityCount + relationCount + topicCount,
      });
    } catch (error) {
      console.error('未生成件数の計算エラー:', error);
      setMissingCounts({ entities: 0, relations: 0, topics: 0, total: 0 });
    } finally {
      setIsCountingMissing(false);
    }
  }, [regenerationMode, entities, relations, topics]);

  // モーダルが開かれたときに未生成件数を計算
  useEffect(() => {
    if (showRegenerationModal && regenerationMode === 'missing') {
      const orgSelect = document.getElementById('regeneration-org-select') as HTMLSelectElement;
      const typeSelect = document.getElementById('regeneration-type-select') as HTMLSelectElement;
      if (orgSelect && typeSelect) {
        updateMissingCounts(orgSelect.value || 'all', typeSelect.value || 'all');
      }
    }
  }, [showRegenerationModal, regenerationMode, updateMissingCounts]);

  // エンティティ削除処理
  const handleDeleteEntity = async () => {
    if (!deleteTargetEntityId) {
      console.warn('⚠️ [handleDeleteEntity] 削除対象が設定されていません');
      return;
    }
    
    const entityId = deleteTargetEntityId;
    const entity = entities.find(e => e.id === entityId);
    
    if (!entity) {
      console.warn('⚠️ [handleDeleteEntity] エンティティが見つかりません:', entityId);
      setShowDeleteEntityModal(false);
      setDeleteTargetEntityId(null);
      return;
    }
    
    setIsDeletingEntity(true);
    
    try {
      const { callTauriCommand } = await import('@/lib/localFirebase');
      
      // 1. このエンティティに関連するリレーションを取得
      console.log('📊 [handleDeleteEntity] リレーション取得開始:', entityId);
      const relatedRelations = await getRelationsByEntityId(entityId);
      console.log(`📊 [handleDeleteEntity] 削除対象リレーション: ${relatedRelations.length}件`);
      
      // 2. 関連するリレーションを削除
      for (const relation of relatedRelations) {
        try {
          // relationEmbeddingsを削除（SQLite）
          try {
            const relationEmbeddingId = `relation_${relation.id}`;
            await callTauriCommand('doc_delete', {
              collectionName: 'relationEmbeddings',
              docId: relationEmbeddingId,
            });
            console.log(`✅ [handleDeleteEntity] relationEmbeddings削除: ${relationEmbeddingId}`);
          } catch (e: any) {
            // 既に削除されている場合は無視
            if (!e?.message?.includes('not found') && !e?.message?.includes('見つかりません')) {
              console.warn(`⚠️ [handleDeleteEntity] relationEmbeddings削除エラー（続行します）:`, e);
            }
          }
          
          // リレーションを削除（SQLite）
          await deleteRelation(relation.id);
          console.log(`✅ [handleDeleteEntity] リレーション削除: ${relation.id}`);
        } catch (error: any) {
          console.warn(`⚠️ [handleDeleteEntity] リレーション削除エラー（続行します）:`, error);
        }
      }
      
      // 3. entityEmbeddingsを削除（SQLite）
      try {
        await callTauriCommand('doc_delete', {
          collectionName: 'entityEmbeddings',
          docId: entity.id,
        });
        console.log(`✅ [handleDeleteEntity] entityEmbeddings削除: ${entity.id}`);
      } catch (error: any) {
        // entityEmbeddingsが存在しない場合は無視
        if (!error?.message?.includes('not found') && !error?.message?.includes('見つかりません')) {
          console.warn(`⚠️ [handleDeleteEntity] entityEmbeddings削除エラー（続行します）:`, error);
        }
      }
      
      // 4. ChromaDBの埋め込みデータを削除（非同期、エラーは無視）
      if (entity.organizationId) {
        (async () => {
          try {
            const { callTauriCommand: chromaCallTauriCommand } = await import('@/lib/localFirebase');
            await chromaCallTauriCommand('chromadb_delete_entity_embedding', {
              entityId: entity.id,
              organizationId: entity.organizationId,
            });
            console.log(`✅ [handleDeleteEntity] ChromaDBエンティティ埋め込み削除: ${entity.id}`);
          } catch (error: any) {
            console.warn(`⚠️ [handleDeleteEntity] ChromaDBエンティティ埋め込み削除エラー（続行します）:`, error);
          }
        })();
      }
      
      // 5. エンティティを削除（SQLite）
      await deleteEntity(entity.id);
      console.log(`✅ [handleDeleteEntity] エンティティ削除: ${entity.id} (${entity.name})`);
      
      // 6. データを再読み込み
      const [allEntities, allRelations] = await Promise.all([
        getAllEntities(),
        getAllRelations(),
      ]);
      
      setEntities(allEntities);
      setRelations(allRelations);
      
      // モーダルを閉じる
      setShowDeleteEntityModal(false);
      setDeleteTargetEntityId(null);
      
      alert(`エンティティ「${entity.name}」を削除しました。`);
    } catch (error: any) {
      console.error('❌ [handleDeleteEntity] エンティティ削除エラー:', error);
      alert(`エンティティの削除に失敗しました: ${error?.message || String(error)}`);
    } finally {
      setIsDeletingEntity(false);
    }
  };

  // 一括削除処理
  const handleBulkDeleteEntities = async () => {
    if (selectedEntityIds.size === 0) {
      console.warn('⚠️ [handleBulkDeleteEntities] 削除対象が選択されていません');
      return;
    }
    
    setIsBulkDeleting(true);
    
    try {
      const { callTauriCommand } = await import('@/lib/localFirebase');
      const entityIdsArray = Array.from(selectedEntityIds);
      let successCount = 0;
      let errorCount = 0;
      const errors: Array<{ entityId: string; error: string }> = [];
      
      console.log(`📊 [handleBulkDeleteEntities] 一括削除開始: ${entityIdsArray.length}件`);
      
      // 各エンティティを順次削除
      for (let i = 0; i < entityIdsArray.length; i++) {
        const entityId = entityIdsArray[i];
        const entity = entities.find(e => e.id === entityId);
        
        if (!entity) {
          console.warn(`⚠️ [handleBulkDeleteEntities] エンティティが見つかりません: ${entityId}`);
          errorCount++;
          errors.push({ entityId, error: 'エンティティが見つかりません' });
          continue;
        }
        
        try {
          // 1. このエンティティに関連するリレーションを取得
          const relatedRelations = await getRelationsByEntityId(entityId);
          
          // 2. 関連するリレーションを削除
          for (const relation of relatedRelations) {
            try {
              // relationEmbeddingsを削除（SQLite）
              try {
                const relationEmbeddingId = `relation_${relation.id}`;
                await callTauriCommand('doc_delete', {
                  collectionName: 'relationEmbeddings',
                  docId: relationEmbeddingId,
                });
              } catch (e: any) {
                // 既に削除されている場合は無視
                if (!e?.message?.includes('not found') && !e?.message?.includes('見つかりません')) {
                  console.warn(`⚠️ [handleBulkDeleteEntities] relationEmbeddings削除エラー（続行します）:`, e);
                }
              }
              
              // リレーションを削除（SQLite）
              await deleteRelation(relation.id);
            } catch (error: any) {
              console.warn(`⚠️ [handleBulkDeleteEntities] リレーション削除エラー（続行します）:`, error);
            }
          }
          
          // 3. entityEmbeddingsを削除（SQLite）
          try {
            await callTauriCommand('doc_delete', {
              collectionName: 'entityEmbeddings',
              docId: entity.id,
            });
          } catch (error: any) {
            // entityEmbeddingsが存在しない場合は無視
            if (!error?.message?.includes('not found') && !error?.message?.includes('見つかりません')) {
              console.warn(`⚠️ [handleBulkDeleteEntities] entityEmbeddings削除エラー（続行します）:`, error);
            }
          }
          
          // 4. ChromaDBの埋め込みデータを削除（非同期、エラーは無視）
          if (entity.organizationId) {
            (async () => {
              try {
                const { callTauriCommand: chromaCallTauriCommand } = await import('@/lib/localFirebase');
                await chromaCallTauriCommand('chromadb_delete_entity_embedding', {
                  entity_id: entity.id,
                  organization_id: entity.organizationId,
                });
              } catch (error: any) {
                // エラーは無視
              }
            })();
          }
          
          // 5. エンティティを削除（SQLite）
          await deleteEntity(entity.id);
          successCount++;
          console.log(`✅ [handleBulkDeleteEntities] エンティティ削除成功 (${i + 1}/${entityIdsArray.length}): ${entity.id} (${entity.name})`);
        } catch (error: any) {
          errorCount++;
          const errorMessage = error?.message || String(error);
          errors.push({ entityId, error: errorMessage });
          console.error(`❌ [handleBulkDeleteEntities] エンティティ削除エラー (${i + 1}/${entityIdsArray.length}): ${entity.id}`, error);
        }
      }
      
      // 6. データを再読み込み
      const [allEntities, allRelations] = await Promise.all([
        getAllEntities(),
        getAllRelations(),
      ]);
      
      setEntities(allEntities);
      setRelations(allRelations);
      
      // 選択をクリア
      setSelectedEntityIds(new Set());
      setShowBulkDeleteModal(false);
      
      // 結果を表示
      if (errorCount === 0) {
        alert(`${successCount}件のエンティティを削除しました。`);
      } else {
        alert(`${successCount}件のエンティティを削除しました。\n${errorCount}件の削除に失敗しました。\n\nエラー詳細:\n${errors.map(e => `- ${e.entityId}: ${e.error}`).join('\n')}`);
      }
    } catch (error: any) {
      console.error('❌ [handleBulkDeleteEntities] 一括削除エラー:', error);
      alert(`一括削除に失敗しました: ${error?.message || String(error)}`);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // フィルター用データの読み込み（最適化版：一括取得）
  useEffect(() => {
    const loadFilterData = async () => {
      setIsLoadingFilters(true);
      try {
        const orgTreeData = await getOrgTreeFromDb();
        if (orgTreeData) {
          const allOrgs = getAllOrganizationsFromTree(orgTreeData);
          setOrganizations(allOrgs);
          
          // 全組織のトピックを一括取得（最適化版）
          const allTopics = await getAllTopicsBatch();
          setTopics(allTopics);
          
          // 全組織のメンバーを一括取得（最適化版：並列処理）
          const orgIds = allOrgs.filter(org => org.id).map(org => org.id!);
          const allMembers = await getAllMembersBatch(orgIds);
          setMembers(allMembers);
        }
      } catch (error: any) {
        console.error('❌ フィルターデータの読み込みエラー:', error);
      } finally {
        setIsLoadingFilters(false);
      }
    };

    loadFilterData();
  }, []);

  // トピック情報のマップ化（パフォーマンス最適化）
  const topicMap = useMemo(() => {
    const map = new Map<string, TopicInfo>();
    topics.forEach(topic => {
      map.set(topic.id, topic);
    });
    return map;
  }, [topics]);

  // エンティティタイプとリレーションタイプのラベル定義（useMemoより前に定義する必要がある）
  const entityTypeLabels: Record<string, string> = {
    'person': '👤 人',
    'company': '🏢 会社',
    'product': '📦 製品',
    'project': '📋 プロジェクト',
    'organization': '🏛️ 組織',
    'location': '📍 場所',
    'technology': '💻 技術',
    'other': '📌 その他',
  };

  const relationTypeLabels: Record<string, string> = {
    'subsidiary': '子会社',
    'uses': '使用',
    'invests': '出資',
    'employs': '雇用',
    'partners': '提携',
    'competes': '競合',
    'supplies': '供給',
    'owns': '所有',
    'located-in': '所在',
    'works-for': '勤務',
    'manages': '管理',
    'reports-to': '報告',
    'related-to': '関連',
    'other': 'その他',
  };

  // 日付が期間内かチェックするヘルパー関数
  const isDateInRange = useCallback((dateStr: string | null | undefined, startDate: string, endDate: string): boolean => {
    if (dateStr === null || dateStr === undefined || dateStr === '') {
      return true; // 全期間に反映
    }
    if (!startDate && !endDate) {
      return true; // 期間フィルターが設定されていない場合は全期間に反映
    }
    try {
      const topicDate = new Date(dateStr);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      if (start && !end) {
        return topicDate >= start;
      }
      if (!start && end) {
        return topicDate <= end;
      }
      if (start && end) {
        return topicDate >= start && topicDate <= end;
      }
      return true;
    } catch (error) {
      console.warn('日付のパースエラー:', dateStr, error);
      return true;
    }
  }, []);

  // リレーションのフィルタリング（組織、期間、重要度）
  const filteredRelationIds = useMemo(() => {
    const hasOrganizationFilter = selectedOrganizationIds.size > 0;
    const hasMemberFilter = selectedMemberIds.size > 0;
    const hasDateFilter = dateRangeStart || dateRangeEnd;
    const hasImportanceFilter = selectedImportance.size > 0;
    
    if (!hasOrganizationFilter && !hasMemberFilter && !hasDateFilter && !hasImportanceFilter) {
      return new Set(relations.map(r => r.id));
    }
    
    const filteredIds = new Set<string>();
    
    for (const relation of relations) {
      let shouldInclude = true;
      
      // 組織フィルター
      if (hasOrganizationFilter) {
        if (relation.organizationId && !selectedOrganizationIds.has(relation.organizationId)) {
          // リレーションのorganizationIdで直接チェック
          // トピック経由でもチェック
          const topic = relation.topicId ? topicMap.get(relation.topicId) : null;
          if (!topic || !selectedOrganizationIds.has(topic.organizationId)) {
            shouldInclude = false;
          }
        }
      }
      
      // 期間フィルター
      if (hasDateFilter && shouldInclude) {
        const topic = relation.topicId ? topicMap.get(relation.topicId) : null;
        if (topic) {
          if (topic.isAllPeriods === true) {
            // 全期間に反映の場合は常に表示
            shouldInclude = true;
          } else if (topic.topicDate !== undefined) {
            shouldInclude = isDateInRange(topic.topicDate, dateRangeStart, dateRangeEnd);
          } else {
            // トピックに日付がない場合は除外
            shouldInclude = false;
          }
        } else {
          // トピックが見つからない場合は除外
          shouldInclude = false;
        }
      }
      
      // 重要度フィルター
      if (hasImportanceFilter && shouldInclude) {
        const topic = relation.topicId ? topicMap.get(relation.topicId) : null;
        if (topic && topic.importance) {
          if (!selectedImportance.has(topic.importance)) {
            shouldInclude = false;
          }
        } else {
          // トピックが見つからないか重要度がない場合は除外
          shouldInclude = false;
        }
      }
      
      // 担当者フィルター（エンティティのメタデータから判定）
      if (hasMemberFilter && shouldInclude) {
        const selectedMembers = members.filter(m => selectedMemberIds.has(m.id));
        if (selectedMembers.length > 0) {
          // リレーションに関連するエンティティをチェック
          const sourceEntity = relation.sourceEntityId ? entities.find(e => e.id === relation.sourceEntityId) : null;
          const targetEntity = relation.targetEntityId ? entities.find(e => e.id === relation.targetEntityId) : null;
          
          const sourceMatches = sourceEntity && selectedMembers.some(member => {
            const entityName = sourceEntity.name.toLowerCase();
            const memberName = member.name.toLowerCase();
            return entityName.includes(memberName) || entityName === memberName;
          });
          
          const targetMatches = targetEntity && selectedMembers.some(member => {
            const entityName = targetEntity.name.toLowerCase();
            const memberName = member.name.toLowerCase();
            return entityName.includes(memberName) || entityName === memberName;
          });
          
          if (!sourceMatches && !targetMatches) {
            shouldInclude = false;
          }
        }
      }
      
      if (shouldInclude) {
        filteredIds.add(relation.id);
      }
    }
    
    return filteredIds;
  }, [relations, selectedOrganizationIds, selectedMemberIds, dateRangeStart, dateRangeEnd, selectedImportance, topicMap, members, entities, isDateInRange]);

  // フィルタリング
  const filteredEntities = useMemo(() => {
    const hasOrganizationFilter = selectedOrganizationIds.size > 0;
    const hasMemberFilter = selectedMemberIds.size > 0;
    const hasDateFilter = dateRangeStart || dateRangeEnd;
    const hasImportanceFilter = selectedImportance.size > 0;
    
    if (!hasOrganizationFilter && !hasMemberFilter && !hasDateFilter && !hasImportanceFilter) {
      return entities.filter((entity) => {
        if (entitySearchQuery) {
          const query = entitySearchQuery.toLowerCase();
          const nameMatch = entity.name.toLowerCase().includes(query);
          const aliasesMatch = entity.aliases?.some(alias => alias.toLowerCase().includes(query));
          if (!nameMatch && !aliasesMatch) {
            return false;
          }
        }
        if (entityTypeFilter !== 'all' && entity.type !== entityTypeFilter) {
          return false;
        }
        return true;
      });
    }
    
    // フィルタリングされたリレーションに関連するエンティティIDを収集
    const relatedEntityIds = new Set<string>();
    for (const relation of relations) {
      if (filteredRelationIds.has(relation.id)) {
        if (relation.sourceEntityId) {
          relatedEntityIds.add(relation.sourceEntityId);
        }
        if (relation.targetEntityId) {
          relatedEntityIds.add(relation.targetEntityId);
        }
      }
    }
    
    return entities.filter((entity) => {
      // 検索とタイプフィルター
      if (entitySearchQuery) {
        const query = entitySearchQuery.toLowerCase();
        const nameMatch = entity.name.toLowerCase().includes(query);
        const aliasesMatch = entity.aliases?.some(alias => alias.toLowerCase().includes(query));
        if (!nameMatch && !aliasesMatch) {
          return false;
        }
      }
      if (entityTypeFilter !== 'all' && entity.type !== entityTypeFilter) {
        return false;
      }
      
      // 組織フィルター
      if (hasOrganizationFilter) {
        if (entity.organizationId && !selectedOrganizationIds.has(entity.organizationId)) {
          // エンティティがフィルタリングされたリレーションに関連しているかチェック
          if (!relatedEntityIds.has(entity.id)) {
            return false;
          }
        }
      }
      
      // フィルタリングされたリレーションに関連するエンティティのみ表示
      if (hasDateFilter || hasImportanceFilter || hasMemberFilter) {
        if (!relatedEntityIds.has(entity.id)) {
          return false;
        }
      }
      
      return true;
    });
  }, [entities, entitySearchQuery, entityTypeFilter, selectedOrganizationIds, selectedMemberIds, dateRangeStart, dateRangeEnd, selectedImportance, filteredRelationIds, relations]);
  
  const filteredRelations = useMemo(() => {
    return relations.filter((relation) => {
      // フィルタリングされたリレーションIDに含まれているかチェック
      if (!filteredRelationIds.has(relation.id)) {
        return false;
      }
      
      // 検索フィルター
      if (relationSearchQuery) {
        const query = relationSearchQuery.toLowerCase();
        const sourceEntity = entities.find(e => e.id === relation.sourceEntityId);
        const targetEntity = entities.find(e => e.id === relation.targetEntityId);
        const sourceName = sourceEntity?.name || relation.sourceEntityId || '不明';
        const targetName = targetEntity?.name || relation.targetEntityId || '不明';
        const relationTypeLabel = relationTypeLabels[relation.relationType] || relation.relationType;
        const relationText = `${sourceName} ${relationTypeLabel} ${targetName} ${relation.description || ''}`.toLowerCase();
        if (!relationText.includes(query)) {
          return false;
        }
      }
      
      // タイプフィルター
      if (relationTypeFilter !== 'all' && relation.relationType !== relationTypeFilter) {
        return false;
      }
      
      return true;
    });
  }, [relations, relationSearchQuery, relationTypeFilter, filteredRelationIds, entities, relationTypeLabels]);

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
            📊 ナレッジグラフ（全データ）
          </h1>
          <p style={{ fontSize: '14px', color: '#6B7280' }}>
            全組織・全トピック横断でナレッジグラフを表示します
            <br />
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
              参照テーブル: <code style={{ backgroundColor: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>entities</code>, <code style={{ backgroundColor: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>topicRelations</code>
            </span>
          </p>
        </div>

        {/* フィルターセクション */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#F9FAFB',
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
          alignItems: 'flex-start',
        }}>
          {/* 組織フィルター */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '14px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                組織:
              </label>
              <button
                onClick={() => setShowOrganizationFilter(!showOrganizationFilter)}
                disabled={isLoadingFilters}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: '#FFFFFF',
                  color: '#1F2937',
                  cursor: isLoadingFilters ? 'not-allowed' : 'pointer',
                  minWidth: '200px',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>
                  {selectedOrganizationIds.size === 0
                    ? 'すべての組織'
                    : `${selectedOrganizationIds.size}件選択中`}
                </span>
                <span style={{ fontSize: '12px' }}>{showOrganizationFilter ? '▲' : '▼'}</span>
              </button>
            </div>
            
            {showOrganizationFilter && (
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                backgroundColor: '#FFFFFF',
                padding: '8px',
                marginTop: '4px',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedOrganizationIds.size === 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOrganizationIds(new Set());
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px' }}>すべての組織</span>
                </label>
                {organizations.map(org => (
                  <label
                    key={org.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedOrganizationIds.has(org.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedOrganizationIds);
                        if (e.target.checked) {
                          newSet.add(org.id);
                        } else {
                          newSet.delete(org.id);
                        }
                        setSelectedOrganizationIds(newSet);
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px' }}>{org.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          
          {/* 担当者フィルター */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '14px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                担当者:
              </label>
              <button
                onClick={() => setShowMemberFilter(!showMemberFilter)}
                disabled={isLoadingFilters}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: '#FFFFFF',
                  color: '#1F2937',
                  cursor: isLoadingFilters ? 'not-allowed' : 'pointer',
                  minWidth: '200px',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>
                  {selectedMemberIds.size === 0
                    ? 'すべての担当者'
                    : `${selectedMemberIds.size}件選択中`}
                </span>
                <span style={{ fontSize: '12px' }}>{showMemberFilter ? '▲' : '▼'}</span>
              </button>
            </div>
            
            {showMemberFilter && (
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                backgroundColor: '#FFFFFF',
                padding: '8px',
                marginTop: '4px',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.size === 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMemberIds(new Set());
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px' }}>すべての担当者</span>
                </label>
                {(selectedOrganizationIds.size > 0
                  ? members.filter(m => selectedOrganizationIds.has(m.organizationId))
                  : members
                ).map(member => (
                  <label
                    key={member.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.has(member.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedMemberIds);
                        if (e.target.checked) {
                          newSet.add(member.id);
                        } else {
                          newSet.delete(member.id);
                        }
                        setSelectedMemberIds(newSet);
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px' }}>
                      {member.name} {member.position ? `(${member.position})` : ''}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          
          {/* 期間フィルター */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '14px', color: '#6B7280', whiteSpace: 'nowrap' }}>
              期間:
            </label>
            <input
              type="date"
              value={dateRangeStart}
              onChange={(e) => setDateRangeStart(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#FFFFFF',
                color: '#1F2937',
              }}
              placeholder="開始日"
            />
            <span style={{ fontSize: '14px', color: '#6B7280' }}>〜</span>
            <input
              type="date"
              value={dateRangeEnd}
              onChange={(e) => setDateRangeEnd(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#FFFFFF',
                color: '#1F2937',
              }}
              placeholder="終了日"
            />
          </div>
          
          {/* 重要度フィルター */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              onClick={() => setShowImportanceFilter(!showImportanceFilter)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                color: '#374151',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                minWidth: '150px',
              }}
            >
              <span>
                {selectedImportance.size === 0
                  ? 'すべての重要度'
                  : `${selectedImportance.size}件選択中`}
              </span>
              <span style={{ fontSize: '12px' }}>{showImportanceFilter ? '▲' : '▼'}</span>
            </button>
            
            {showImportanceFilter && (
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                backgroundColor: '#FFFFFF',
                padding: '8px',
                marginTop: '4px',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedImportance.size === 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedImportance(new Set());
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px' }}>すべての重要度</span>
                </label>
                {[
                  { value: 'high' as const, label: '🔴 高' },
                  { value: 'medium' as const, label: '🟡 中' },
                  { value: 'low' as const, label: '🟢 低' },
                ].map(importance => (
                  <label
                    key={importance.value}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedImportance.has(importance.value)}
                      onChange={(e) => {
                        const newSet = new Set(selectedImportance);
                        if (e.target.checked) {
                          newSet.add(importance.value);
                        } else {
                          newSet.delete(importance.value);
                        }
                        setSelectedImportance(newSet);
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px' }}>{importance.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          
          {/* フィルターリセットボタン */}
          {(selectedOrganizationIds.size > 0 || selectedMemberIds.size > 0 || dateRangeStart || dateRangeEnd || selectedImportance.size > 0) && (
            <button
              onClick={() => {
                setSelectedOrganizationIds(new Set());
                setSelectedMemberIds(new Set());
                setDateRangeStart('');
                setDateRangeEnd('');
                setSelectedImportance(new Set());
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#EF4444',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 500,
                alignSelf: 'flex-start',
                marginTop: '4px',
              }}
            >
              フィルターをリセット
            </button>
          )}
          
          {isLoadingFilters && (
            <div style={{ fontSize: '12px', color: '#6B7280', alignSelf: 'flex-start', marginTop: '4px' }}>
              読み込み中...
            </div>
          )}
        </div>
        
        {/* 選択中のフィルターをバッジで表示 */}
        {(selectedOrganizationIds.size > 0 || selectedMemberIds.size > 0 || dateRangeStart || dateRangeEnd || selectedImportance.size > 0) && (
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '24px',
            padding: '12px',
            backgroundColor: '#F9FAFB',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
              選択中:
            </div>
            
            {/* 選択された組織のバッジ */}
            {Array.from(selectedOrganizationIds).map(orgId => {
              const org = organizations.find(o => o.id === orgId);
              if (!org) return null;
              return (
                <div
                  key={`org-${orgId}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    backgroundColor: '#3B82F6',
                    color: '#FFFFFF',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  <span>🏛️ {org.name}</span>
                  <button
                    onClick={() => {
                      const newSet = new Set(selectedOrganizationIds);
                      newSet.delete(orgId);
                      setSelectedOrganizationIds(newSet);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      padding: '0',
                      marginLeft: '4px',
                      lineHeight: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '16px',
                      height: '16px',
                    }}
                    title="削除"
                  >
                    ×
                  </button>
                </div>
              );
            })}
            
            {/* 選択された担当者のバッジ */}
            {Array.from(selectedMemberIds).map(memberId => {
              const member = members.find(m => m.id === memberId);
              if (!member) return null;
              return (
                <div
                  key={`member-${memberId}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  <span>👤 {member.name}</span>
                  <button
                    onClick={() => {
                      const newSet = new Set(selectedMemberIds);
                      newSet.delete(memberId);
                      setSelectedMemberIds(newSet);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      padding: '0',
                      marginLeft: '4px',
                      lineHeight: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '16px',
                      height: '16px',
                    }}
                    title="削除"
                  >
                    ×
                  </button>
                </div>
              );
            })}
            
            {/* 期間フィルターのバッジ */}
            {(dateRangeStart || dateRangeEnd) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  backgroundColor: '#8B5CF6',
                  color: '#FFFFFF',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                <span>
                  📅 {dateRangeStart || '開始日なし'} 〜 {dateRangeEnd || '終了日なし'}
                </span>
                <button
                  onClick={() => {
                    setDateRangeStart('');
                    setDateRangeEnd('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    padding: '0',
                    marginLeft: '4px',
                    lineHeight: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '16px',
                    height: '16px',
                  }}
                  title="削除"
                >
                  ×
                </button>
              </div>
            )}
            
            {/* 重要度フィルターのバッジ */}
            {Array.from(selectedImportance).map(importance => {
              const importanceLabels: Record<'high' | 'medium' | 'low', string> = {
                high: '🔴 高',
                medium: '🟡 中',
                low: '🟢 低',
              };
              const importanceColors: Record<'high' | 'medium' | 'low', { bg: string; text: string }> = {
                high: { bg: '#FEF2F2', text: '#DC2626' },
                medium: { bg: '#FEF3C7', text: '#D97706' },
                low: { bg: '#F0FDF4', text: '#16A34A' },
              };
              return (
                <div
                  key={`importance-${importance}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    backgroundColor: importanceColors[importance].bg,
                    color: importanceColors[importance].text,
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  <span>{importanceLabels[importance]}</span>
                  <button
                    onClick={() => {
                      const newSet = new Set(selectedImportance);
                      newSet.delete(importance);
                      setSelectedImportance(newSet);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: importanceColors[importance].text,
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      padding: '0',
                      marginLeft: '4px',
                      lineHeight: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '16px',
                      height: '16px',
                    }}
                    title="削除"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ビューモード切り替えと埋め込み再生成 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '8px 16px',
                backgroundColor: viewMode === 'list' ? '#3B82F6' : '#F3F4F6',
                color: viewMode === 'list' ? '#FFFFFF' : '#6B7280',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              リスト
            </button>
            <button
              onClick={() => setViewMode('graph2d')}
              style={{
                padding: '8px 16px',
                backgroundColor: viewMode === 'graph2d' ? '#3B82F6' : '#F3F4F6',
                color: viewMode === 'graph2d' ? '#FFFFFF' : '#6B7280',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              2Dグラフ
            </button>
            <button
              onClick={() => setViewMode('graph3d')}
              style={{
                padding: '8px 16px',
                backgroundColor: viewMode === 'graph3d' ? '#3B82F6' : '#F3F4F6',
                color: viewMode === 'graph3d' ? '#FFFFFF' : '#6B7280',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              3Dグラフ
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={async () => {
                setIsCheckingVersion(true);
                try {
                  const [entityOutdated, relationOutdated] = await Promise.all([
                    findOutdatedEntityEmbeddings(),
                    findOutdatedRelationEmbeddings(),
                  ]);
                  setOutdatedEntities(entityOutdated);
                  setOutdatedRelations(relationOutdated);
                  setShowVersionCheck(true);
                } catch (error) {
                  console.error('バージョンチェックエラー:', error);
                  alert('バージョンチェックに失敗しました');
                } finally {
                  setIsCheckingVersion(false);
                }
              }}
              disabled={isCheckingVersion}
              style={{
                padding: '8px 16px',
                backgroundColor: isCheckingVersion ? '#D1D5DB' : '#3B82F6',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: isCheckingVersion ? 'not-allowed' : 'pointer',
                fontWeight: 500,
              }}
            >
              {isCheckingVersion ? 'チェック中...' : '🔍 バージョンチェック'}
            </button>
            <button
              onClick={() => setShowRegenerationModal(true)}
              disabled={isRegeneratingEmbeddings}
              style={{
                padding: '8px 16px',
                backgroundColor: isRegeneratingEmbeddings ? '#D1D5DB' : '#10B981',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: isRegeneratingEmbeddings ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {isRegeneratingEmbeddings ? (
                <>
                  <span>再生成中...</span>
                  <span style={{ fontSize: '12px' }}>
                    ({regenerationProgress.current}/{regenerationProgress.total})
                  </span>
                </>
              ) : (
                '🔧 埋め込み再生成'
              )}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
            ナレッジグラフデータを読み込み中...
          </div>
        ) : (
          <>
            {/* リスト表示 */}
            {viewMode === 'list' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* エンティティセクション */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a' }}>
                      📌 エンティティ ({filteredEntities.length}件)
                      {selectedEntityIds.size > 0 && (
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#EF4444', marginLeft: '8px' }}>
                          ({selectedEntityIds.size}件選択中)
                        </span>
                      )}
                    </h2>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {filteredEntities.length > 0 && (
                        <>
                          <button
                            onClick={() => {
                              if (selectedEntityIds.size === filteredEntities.length) {
                                // 全解除
                                setSelectedEntityIds(new Set());
                              } else {
                                // 全選択
                                setSelectedEntityIds(new Set(filteredEntities.map(e => e.id)));
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: selectedEntityIds.size === filteredEntities.length ? '#F3F4F6' : '#3B82F6',
                              color: selectedEntityIds.size === filteredEntities.length ? '#6B7280' : '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: 500,
                            }}
                          >
                            {selectedEntityIds.size === filteredEntities.length ? '全解除' : '全選択'}
                          </button>
                          {selectedEntityIds.size > 0 && (
                            <button
                              onClick={() => {
                                setShowBulkDeleteModal(true);
                              }}
                              disabled={isBulkDeleting}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#EF4444',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: isBulkDeleting ? 'not-allowed' : 'pointer',
                                fontWeight: 500,
                                opacity: isBulkDeleting ? 0.5 : 1,
                              }}
                            >
                              {isBulkDeleting ? '削除中...' : `🗑️ 一括削除 (${selectedEntityIds.size}件)`}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* 検索・フィルタ */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                      type="text"
                      placeholder="エンティティ名で検索..."
                      value={entitySearchQuery}
                      onChange={(e) => setEntitySearchQuery(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                    <select
                      value={entityTypeFilter}
                      onChange={(e) => setEntityTypeFilter(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      <option value="all">すべてのタイプ</option>
                      <option value="person">👤 人</option>
                      <option value="company">🏢 会社</option>
                      <option value="product">📦 製品</option>
                      <option value="project">📋 プロジェクト</option>
                      <option value="organization">🏛️ 組織</option>
                      <option value="location">📍 場所</option>
                      <option value="technology">💻 技術</option>
                      <option value="other">📌 その他</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                    {filteredEntities.map((entity) => {
                      const relatedRelationsCount = relations.filter(r => 
                        r.sourceEntityId === entity.id || r.targetEntityId === entity.id
                      ).length;
                      const isSelected = selectedEntityIds.has(entity.id);
                      
                      // エンティティの紐づきトピックを取得
                      let linkedTopic: TopicInfo | null = null;
                      if (entity.metadata && typeof entity.metadata === 'object' && 'topicId' in entity.metadata) {
                        const topicId = entity.metadata.topicId as string;
                        linkedTopic = topics.find(t => t.id === topicId) || null;
                      }
                      
                      return (
                        <div
                          key={entity.id}
                          style={{
                            padding: '12px',
                            backgroundColor: isSelected ? '#FEF3C7' : '#F9FAFB',
                            borderRadius: '8px',
                            border: isSelected ? '2px solid #F59E0B' : '1px solid #E5E7EB',
                            fontSize: '14px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, flexWrap: 'wrap' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const newSet = new Set(selectedEntityIds);
                                  if (e.target.checked) {
                                    newSet.add(entity.id);
                                  } else {
                                    newSet.delete(entity.id);
                                  }
                                  setSelectedEntityIds(newSet);
                                }}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  cursor: 'pointer',
                                }}
                              />
                              <span style={{ fontSize: '16px' }}>
                                {entityTypeLabels[entity.type] || '📌 その他'}
                              </span>
                              <span style={{ color: '#1a1a1a', fontWeight: 600 }}>
                                {entity.name}
                              </span>
                              {relatedRelationsCount > 0 && (
                                <span style={{ color: '#6B7280', fontSize: '12px' }}>
                                  ({relatedRelationsCount}件のリレーション)
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setDeleteTargetEntityId(entity.id);
                                setShowDeleteEntityModal(true);
                              }}
                              disabled={isDeletingEntity || isBulkDeleting}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#EF4444',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: (isDeletingEntity || isBulkDeleting) ? 'not-allowed' : 'pointer',
                                fontWeight: 500,
                                opacity: (isDeletingEntity || isBulkDeleting) ? 0.5 : 1,
                              }}
                              title="エンティティを削除"
                            >
                              🗑️ 削除
                            </button>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                            {/* 紐づきトピック情報 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: '#6B7280', fontSize: '12px', fontWeight: 500 }}>
                                紐づきトピック:
                              </span>
                              {linkedTopic ? (
                                <span style={{
                                  color: '#3B82F6',
                                  fontSize: '12px',
                                  backgroundColor: '#EFF6FF',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontWeight: 500,
                                }}>
                                  📝 {linkedTopic.title}
                                  {linkedTopic.meetingNoteTitle && (
                                    <span style={{ color: '#9CA3AF', marginLeft: '4px' }}>
                                      ({linkedTopic.meetingNoteTitle})
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span style={{
                                  color: '#9CA3AF',
                                  fontSize: '12px',
                                  backgroundColor: '#F3F4F6',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontStyle: 'italic',
                                }}>
                                  紐づき無し
                                </span>
                              )}
                            </div>
                            {entity.aliases && entity.aliases.length > 0 && (
                              <div style={{ color: '#6B7280', fontSize: '12px' }}>
                                別名: {entity.aliases.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* リレーションセクション */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a' }}>
                      🔗 リレーション ({filteredRelations.length}件)
                    </h2>
                  </div>
                  
                  {/* 検索・フィルタ */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                      type="text"
                      placeholder="リレーションで検索..."
                      value={relationSearchQuery}
                      onChange={(e) => setRelationSearchQuery(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                    <select
                      value={relationTypeFilter}
                      onChange={(e) => setRelationTypeFilter(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '14px',
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                    {filteredRelations.map((relation) => {
                      const sourceEntity = entities.find(e => e.id === relation.sourceEntityId);
                      const targetEntity = entities.find(e => e.id === relation.targetEntityId);
                      const sourceName = sourceEntity?.name || relation.sourceEntityId || '不明';
                      const targetName = targetEntity?.name || relation.targetEntityId || '不明';
                      const relationTypeLabel = relationTypeLabels[relation.relationType] || relation.relationType;
                      
                      return (
                        <div
                          key={relation.id}
                          style={{
                            padding: '12px',
                            backgroundColor: '#F9FAFB',
                            borderRadius: '8px',
                            border: '1px solid #E5E7EB',
                            fontSize: '14px',
                          }}
                        >
                          <div style={{ color: '#1a1a1a', fontWeight: 500 }}>
                            <span style={{ color: '#0066CC', fontWeight: 600 }}>{sourceName}</span>{' '}
                            <span style={{ color: '#6B7280' }}>→ [{relationTypeLabel}]</span>{' '}
                            <span style={{ color: '#0066CC', fontWeight: 600 }}>{targetName}</span>
                          </div>
                          {relation.description && (
                            <div style={{ color: '#6B7280', fontSize: '12px', marginTop: '4px' }}>
                              {relation.description}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 2Dグラフ表示 */}
            {viewMode === 'graph2d' && (
              <div style={{ height: '600px', border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
                <KnowledgeGraph2D
                  entities={filteredEntities}
                  relations={filteredRelations}
                  isLoading={false}
                  maxNodes={1000}
                  onEntityClick={() => {
                    setViewMode('list');
                  }}
                  highlightedEntityId={highlightedEntityId}
                  highlightedRelationId={highlightedRelationId}
                />
              </div>
            )}

            {/* 3Dグラフ表示 */}
            {viewMode === 'graph3d' && (
              <div style={{ height: '600px', border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
                <KnowledgeGraph3D
                  entities={filteredEntities}
                  relations={filteredRelations}
                  isLoading={false}
                  maxNodes={1000}
                  onEntityClick={() => {
                    setViewMode('list');
                  }}
                  highlightedEntityId={highlightedEntityId}
                  highlightedRelationId={highlightedRelationId}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* 埋め込み再生成モーダル */}
      {showRegenerationModal && (
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
          onClick={() => {
            if (!isRegeneratingEmbeddings) {
              setShowRegenerationModal(false);
            }
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
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
              埋め込み再生成
            </h2>
            
            {regenerationProgress.status === 'idle' && (
              <div>
                <p style={{ marginBottom: '16px', color: '#6B7280' }}>
                  エンティティ、リレーション、トピックの埋め込みを再生成します。
                </p>
                
                {/* 現在の設定表示 */}
                <div style={{
                  padding: '12px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  fontSize: '12px',
                  color: '#6B7280',
                }}>
                  <div style={{ fontWeight: 500, marginBottom: '4px' }}>現在の設定:</div>
                  <div>
                    プロバイダー: {typeof window !== 'undefined' && localStorage.getItem('embeddingProvider') === 'ollama' ? 'Ollama（無料）' : 'OpenAI（有料）'}
                  </div>
                  {typeof window !== 'undefined' && localStorage.getItem('embeddingProvider') === 'ollama' && (
                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#10B981' }}>
                      💡 設定ページでプロバイダーを変更できます
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                      再生成モード
                    </label>
                    <select
                      id="regeneration-mode-select"
                      value={regenerationMode}
                      onChange={async (e) => {
                        const newMode = e.target.value as 'missing' | 'all';
                        setRegenerationMode(newMode);
                        // モードが変更されたときに未生成件数を再計算
                        if (newMode === 'missing') {
                          const orgSelect = document.getElementById('regeneration-org-select') as HTMLSelectElement;
                          const typeSelect = document.getElementById('regeneration-type-select') as HTMLSelectElement;
                          if (orgSelect && typeSelect) {
                            await updateMissingCounts(orgSelect.value || 'all', typeSelect.value || 'all');
                          }
                        } else {
                          // すべて再生成モードの場合は件数をリセット
                          setMissingCounts({ entities: 0, relations: 0, topics: 0, total: 0 });
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    >
                      <option value="missing">未生成のみ再生成（埋め込みが生成されていない対象のみ）</option>
                      <option value="all">すべて再生成（既存の埋め込みも強制的に再生成）</option>
                    </select>
                    <p style={{ fontSize: '12px', color: regenerationMode === 'missing' ? '#10B981' : '#EF4444', marginTop: '4px', marginBottom: 0 }}>
                      {regenerationMode === 'missing' 
                        ? '💡 埋め込みが生成されていないエンティティ・リレーション・トピックのみを再生成します。' 
                        : '⚠️ 既存の埋め込みも強制的に再生成します。APIコストがかかる場合があります。'}
                    </p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                      対象組織
                    </label>
                    <select
                      id="regeneration-org-select"
                      onChange={async () => {
                        // 組織が変更されたときに未生成件数を再計算
                        const orgSelect = document.getElementById('regeneration-org-select') as HTMLSelectElement;
                        const typeSelect = document.getElementById('regeneration-type-select') as HTMLSelectElement;
                        if (orgSelect && typeSelect) {
                          await updateMissingCounts(orgSelect.value, typeSelect.value);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    >
                      <option value="all">すべての組織</option>
                      {organizations.map(org => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                      対象タイプ
                    </label>
                    <select
                      id="regeneration-type-select"
                      onChange={async () => {
                        // タイプが変更されたときに未生成件数を再計算
                        const orgSelect = document.getElementById('regeneration-org-select') as HTMLSelectElement;
                        const typeSelect = document.getElementById('regeneration-type-select') as HTMLSelectElement;
                        if (orgSelect && typeSelect) {
                          await updateMissingCounts(orgSelect.value, typeSelect.value);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    >
                      <option value="all">すべて（エンティティ + リレーション + トピック）</option>
                      <option value="entities">エンティティのみ</option>
                      <option value="relations">リレーションのみ</option>
                      <option value="topics">トピックのみ</option>
                    </select>
                  </div>
                  
                  {/* 未生成件数の表示 */}
                  {regenerationMode === 'missing' && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#EFF6FF',
                      borderRadius: '6px',
                      border: '1px solid #3B82F6',
                    }}>
                      {isCountingMissing ? (
                        <div style={{ fontSize: '12px', color: '#1E40AF' }}>
                          🔄 未生成件数を計算中...
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#1E40AF' }}>
                          <div style={{ fontWeight: 500, marginBottom: '4px' }}>📊 未生成の埋め込み件数:</div>
                          <div style={{ marginLeft: '8px' }}>
                            {(() => {
                              const orgSelect = document.getElementById('regeneration-org-select') as HTMLSelectElement;
                              const typeSelect = document.getElementById('regeneration-type-select') as HTMLSelectElement;
                              const selectedType = typeSelect?.value || 'all';
                              
                              const counts: string[] = [];
                              if (selectedType === 'all' || selectedType === 'entities') {
                                counts.push(`エンティティ: ${missingCounts.entities}件`);
                              }
                              if (selectedType === 'all' || selectedType === 'relations') {
                                counts.push(`リレーション: ${missingCounts.relations}件`);
                              }
                              if (selectedType === 'all' || selectedType === 'topics') {
                                counts.push(`トピック: ${missingCounts.topics}件`);
                              }
                              
                              return (
                                <>
                                  {counts.map((count, idx) => (
                                    <div key={idx}>{count}</div>
                                  ))}
                                  {selectedType === 'all' && (
                                    <div style={{ marginTop: '4px', fontWeight: 600, borderTop: '1px solid #93C5FD', paddingTop: '4px' }}>
                                      合計: {missingCounts.total}件
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowRegenerationModal(false)}
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
                      const orgSelect = document.getElementById('regeneration-org-select') as HTMLSelectElement;
                      const typeSelect = document.getElementById('regeneration-type-select') as HTMLSelectElement;
                      const selectedOrgId = orgSelect.value;
                      const selectedType = typeSelect.value;
                      const forceRegenerate = regenerationMode === 'all'; // 'all'の場合は強制再生成

                      setIsRegeneratingEmbeddings(true);
                      setRegenerationProgress({
                        current: 0,
                        total: 0,
                        status: 'processing',
                        logs: [],
                        stats: { success: 0, skipped: 0, errors: 0 },
                      });

                      try {
                        let totalEntities = 0;
                        let totalRelations = 0;
                        let totalTopics = 0;

                        // 対象を決定
                        const targetEntities = selectedOrgId === 'all'
                          ? entities.filter(e => e.organizationId) // organizationIdがないものは除外
                          : entities.filter(e => e.organizationId === selectedOrgId);
                        const targetRelations = selectedOrgId === 'all'
                          ? relations.filter(r => {
                            // リレーション自体のorganizationIdを優先、なければ関連エンティティから取得
                            const orgId = r.organizationId || entities.find(e => e.id === r.sourceEntityId || e.id === r.targetEntityId)?.organizationId;
                            return orgId && r.topicId; // organizationIdとtopicIdがあるもののみ
                          })
                          : relations.filter(r => {
                            // リレーション自体のorganizationIdを優先、なければ関連エンティティから取得
                            const orgId = r.organizationId || entities.find(e => e.id === r.sourceEntityId || e.id === r.targetEntityId)?.organizationId;
                            return orgId === selectedOrgId && r.topicId; // 選択された組織IDと一致し、topicIdがあるもののみ
                          });
                        const targetTopics = selectedOrgId === 'all'
                          ? topics.filter(t => t.organizationId) // organizationIdがないものは除外
                          : topics.filter(t => t.organizationId === selectedOrgId);

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
                        setRegenerationProgress(prev => ({ ...prev, total }));

                        // エンティティの再生成
                        if (selectedType === 'all' || selectedType === 'entities') {
                          for (const entity of targetEntities) {
                            // organizationIdがないものは既にtargetEntitiesから除外されているので、このチェックは不要だが念のため
                            if (!entity.organizationId) {
                              console.warn(`⚠️ エンティティ ${entity.id} (${entity.name}) にorganizationIdがありません。スキップします。`);
                              continue;
                            }
                            
                            // 未生成のみの場合は、既存の埋め込みをチェック
                            if (!forceRegenerate) {
                              try {
                                const { getEntityEmbedding } = await import('@/lib/entityEmbeddings');
                                const existing = await getEntityEmbedding(entity.id);
                                if (existing && existing.combinedEmbedding && existing.combinedEmbedding.length > 0) {
                                  console.log(`⏭️  エンティティ ${entity.id} (${entity.name}) は既に埋め込みが存在するためスキップ`);
                                  setRegenerationProgress(prev => ({
                                    ...prev,
                                    current: prev.current + 1,
                                    logs: [
                                      ...prev.logs,
                                      {
                                        type: 'skip',
                                        message: `エンティティ: ${entity.name} (スキップ - 既に埋め込みあり)`,
                                        timestamp: new Date(),
                                      },
                                    ],
                                    stats: {
                                      ...prev.stats,
                                      skipped: prev.stats.skipped + 1,
                                    },
                                  }));
                                  continue;
                                }
                              } catch (error) {
                                console.warn(`⚠️ エンティティ ${entity.id} の埋め込み確認エラー:`, error);
                                // エラーが発生した場合は続行（再生成を試みる）
                              }
                            }
                            
                            const entityIds = [entity.id];
                            await batchUpdateEntityEmbeddings(
                              entityIds,
                              entity.organizationId,
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
                              }
                            );
                          }
                        }

                        // リレーションの再生成
                        if (selectedType === 'all' || selectedType === 'relations') {
                          for (const relation of targetRelations) {
                            // organizationIdを取得（リレーション自体のorganizationIdを優先、なければ関連エンティティから取得）
                            let organizationId = relation.organizationId;
                            if (!organizationId) {
                              const relatedEntity = entities.find(e => e.id === relation.sourceEntityId || e.id === relation.targetEntityId);
                              organizationId = relatedEntity?.organizationId;
                            }
                            
                            // organizationIdがないものは既にtargetRelationsから除外されているので、このチェックは不要だが念のため
                            if (!organizationId) {
                              console.warn(`⚠️ リレーション ${relation.id} (${relation.relationType}) にorganizationIdがありません。スキップします。`);
                              continue;
                            }

                            // topicIdがない場合はスキップ
                            if (!relation.topicId) {
                              console.warn(`⚠️ リレーション ${relation.id} (${relation.relationType}) にtopicIdがありません。スキップします。`);
                              continue;
                            }

                            // 未生成のみの場合は、既存の埋め込みをチェック
                            if (!forceRegenerate) {
                              try {
                                const { getRelationEmbedding } = await import('@/lib/relationEmbeddings');
                                const existing = await getRelationEmbedding(relation.id);
                                if (existing && existing.combinedEmbedding && existing.combinedEmbedding.length > 0) {
                                  console.log(`⏭️  リレーション ${relation.id} (${relation.relationType}) は既に埋め込みが存在するためスキップ`);
                                  setRegenerationProgress(prev => ({
                                    ...prev,
                                    current: prev.current + 1,
                                    logs: [
                                      ...prev.logs,
                                      {
                                        type: 'skip',
                                        message: `リレーション: ${relation.relationType} (スキップ - 既に埋め込みあり)`,
                                        timestamp: new Date(),
                                      },
                                    ],
                                    stats: {
                                      ...prev.stats,
                                      skipped: prev.stats.skipped + 1,
                                    },
                                  }));
                                  continue;
                                }
                              } catch (error) {
                                console.warn(`⚠️ リレーション ${relation.id} の埋め込み確認エラー:`, error);
                                // エラーが発生した場合は続行（再生成を試みる）
                              }
                            }

                            const relationIds = [relation.id];
                            await batchUpdateRelationEmbeddings(
                              relationIds,
                              organizationId,
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
                              }
                            );
                          }
                        }

                        // トピックの再生成
                        if (selectedType === 'all' || selectedType === 'topics') {
                          // トピックをmeetingNoteIdごとにグループ化
                          const topicsByMeetingNote = new Map<string, Array<{ id: string; title: string; content: string; metadata?: any }>>();
                          
                          for (const topic of targetTopics) {
                            if (!topic.organizationId || !topic.meetingNoteId) {
                              console.warn(`⚠️ トピック ${topic.id} (${topic.title}) にorganizationIdまたはmeetingNoteIdがありません。スキップします。`);
                              continue;
                            }

                            // 未生成のみの場合は、既存の埋め込みをチェック
                            // 注意: batchUpdateTopicEmbeddings内でも既存チェックが行われるが、
                            // 進捗表示の一貫性のために、ここでもチェックする
                            if (!forceRegenerate) {
                              try {
                                const { getTopicEmbedding } = await import('@/lib/topicEmbeddings');
                                const existing = await getTopicEmbedding(topic.id, topic.meetingNoteId);
                                // 埋め込みが存在する場合（combinedEmbeddingフィールドがある場合）はスキップ
                                // ただし、getTopicEmbeddingはSQLiteから取得するため、ChromaDBの状態は完全には反映されない可能性がある
                                // batchUpdateTopicEmbeddings内でもチェックが行われるため、ここでは簡易チェックのみ
                                if (existing && existing.combinedEmbedding && Array.isArray(existing.combinedEmbedding) && existing.combinedEmbedding.length > 0) {
                                  console.log(`⏭️  トピック ${topic.id} (${topic.title}) は既に埋め込みが存在するためスキップ`);
                                  setRegenerationProgress(prev => ({
                                    ...prev,
                                    current: prev.current + 1,
                                    logs: [
                                      ...prev.logs,
                                      {
                                        type: 'skip',
                                        message: `トピック: ${topic.title} (スキップ - 既に埋め込みあり)`,
                                        timestamp: new Date(),
                                      },
                                    ],
                                    stats: {
                                      ...prev.stats,
                                      skipped: prev.stats.skipped + 1,
                                    },
                                  }));
                                  continue;
                                }
                              } catch (error) {
                                console.warn(`⚠️ トピック ${topic.id} の埋め込み確認エラー:`, error);
                                // エラーが発生した場合は続行（再生成を試みる）
                              }
                            }

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
                            const firstTopic = topicList[0];
                            if (!firstTopic) continue;

                            // 組織IDを取得（最初のトピックから）
                            const orgTopic = targetTopics.find(t => t.meetingNoteId === meetingNoteId);
                            if (!orgTopic?.organizationId) {
                              console.warn(`⚠️ 議事録 ${meetingNoteId} のトピックにorganizationIdがありません。スキップします。`);
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
                              }
                            );
                          }
                        }

                        setRegenerationProgress(prev => ({ ...prev, status: 'completed' }));
                      } catch (error: any) {
                        console.error('埋め込み再生成エラー:', error);
                        setRegenerationProgress(prev => ({
                          ...prev,
                          logs: [
                            ...prev.logs,
                            {
                              type: 'error',
                              message: `エラー: ${error.message || '不明なエラー'}`,
                              timestamp: new Date(),
                            },
                          ],
                        }));
                      } finally {
                        setIsRegeneratingEmbeddings(false);
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#3B82F6',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    開始
                  </button>
                </div>
              </div>
            )}

            {(regenerationProgress.status === 'processing' || regenerationProgress.status === 'completed') && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>
                      進捗: {regenerationProgress.current} / {regenerationProgress.total}
                    </span>
                    <span style={{ fontSize: '14px', color: '#6B7280' }}>
                      {regenerationProgress.total > 0
                        ? `${Math.round((regenerationProgress.current / regenerationProgress.total) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#E5E7EB',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${regenerationProgress.total > 0 ? (regenerationProgress.current / regenerationProgress.total) * 100 : 0}%`,
                        height: '100%',
                        backgroundColor: regenerationProgress.status === 'completed' ? '#10B981' : '#3B82F6',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>

                {regenerationProgress.status === 'completed' && (
                  <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#F0FDF4', borderRadius: '6px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>完了</div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                      成功: {regenerationProgress.stats.success}件 | 
                      スキップ: {regenerationProgress.stats.skipped}件 | 
                      エラー: {regenerationProgress.stats.errors}件
                    </div>
                  </div>
                )}

                <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
                  {regenerationProgress.logs.length === 0 ? (
                    <div style={{ padding: '12px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
                      ログがありません
                    </div>
                  ) : (
                    regenerationProgress.logs.map((log, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '8px 12px',
                          marginBottom: '4px',
                          backgroundColor: log.type === 'success' ? '#F0FDF4' : log.type === 'error' ? '#FEF2F2' : '#F9FAFB',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: log.type === 'success' ? '#065F46' : log.type === 'error' ? '#991B1B' : '#6B7280',
                        }}
                      >
                        {log.message}
                      </div>
                    ))
                  )}
                </div>

                {regenerationProgress.status === 'completed' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setShowRegenerationModal(false);
                        setRegenerationProgress({
                          current: 0,
                          total: 0,
                          status: 'idle',
                          logs: [],
                          stats: { success: 0, skipped: 0, errors: 0 },
                        });
                      }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#3B82F6',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer',
                      }}
                    >
                      閉じる
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* バージョンチェックモーダル */}
      {showVersionCheck && (
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
          onClick={() => setShowVersionCheck(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
              埋め込みバージョンチェック
            </h2>
            
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#F0F9FF', borderRadius: '6px' }}>
              <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>現在のバージョン情報</div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>
                エンティティ: バージョン {ENTITY_EMBEDDING_VERSION}, モデル {ENTITY_EMBEDDING_MODEL}
              </div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>
                リレーション: バージョン {RELATION_EMBEDDING_VERSION}, モデル {RELATION_EMBEDDING_MODEL}
              </div>
            </div>

            {outdatedEntities.length === 0 && outdatedRelations.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#10B981' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>✅</div>
                <div style={{ fontSize: '16px', fontWeight: 500 }}>すべての埋め込みが最新バージョンです</div>
              </div>
            ) : (
              <div>
                {outdatedEntities.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#F59E0B' }}>
                      ⚠️ エンティティ: {outdatedEntities.length}件のバージョン不一致
                    </h3>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '12px', color: '#6B7280' }}>
                      {outdatedEntities.slice(0, 10).map((item, index) => (
                        <div key={index} style={{ padding: '4px 0' }}>
                          {item.entityId} (現在: v{item.currentVersion}, {item.model} → 期待: v{item.expectedVersion}, {ENTITY_EMBEDDING_MODEL})
                        </div>
                      ))}
                      {outdatedEntities.length > 10 && (
                        <div style={{ padding: '4px 0', color: '#9CA3AF' }}>
                          ...他 {outdatedEntities.length - 10}件
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {outdatedRelations.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#F59E0B' }}>
                      ⚠️ リレーション: {outdatedRelations.length}件のバージョン不一致
                    </h3>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '12px', color: '#6B7280' }}>
                      {outdatedRelations.slice(0, 10).map((item, index) => (
                        <div key={index} style={{ padding: '4px 0' }}>
                          {item.relationId} (現在: v{item.currentVersion}, {item.model} → 期待: v{item.expectedVersion}, {RELATION_EMBEDDING_MODEL})
                        </div>
                      ))}
                      {outdatedRelations.length > 10 && (
                        <div style={{ padding: '4px 0', color: '#9CA3AF' }}>
                          ...他 {outdatedRelations.length - 10}件
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button
                    onClick={() => setShowVersionCheck(false)}
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
                    閉じる
                  </button>
                  <button
                    onClick={async () => {
                      setShowVersionCheck(false);
                      setShowRegenerationModal(true);
                      // バージョン不一致の項目を自動的に再生成する設定を追加
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#F59E0B',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    再生成モーダルを開く
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* エンティティ削除確認モーダル */}
      {showDeleteEntityModal && deleteTargetEntityId && (
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
          onClick={() => {
            if (!isDeletingEntity) {
              setShowDeleteEntityModal(false);
              setDeleteTargetEntityId(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: '#EF4444' }}>
              ⚠️ エンティティの削除
            </h2>
            
            {(() => {
              const entity = entities.find(e => e.id === deleteTargetEntityId);
              const relatedRelations = relations.filter(r => 
                r.sourceEntityId === deleteTargetEntityId || r.targetEntityId === deleteTargetEntityId
              );
              
              if (!entity) {
                return (
                  <div>
                    <p style={{ marginBottom: '16px', color: '#6B7280' }}>
                      エンティティが見つかりません。
                    </p>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => {
                          setShowDeleteEntityModal(false);
                          setDeleteTargetEntityId(null);
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
                        閉じる
                      </button>
                    </div>
                  </div>
                );
              }
              
              return (
                <div>
                  <p style={{ marginBottom: '16px', color: '#6B7280' }}>
                    エンティティ「<strong style={{ color: '#1F2937' }}>{entity.name}</strong>」を削除しますか？
                  </p>
                  
                  {relatedRelations.length > 0 && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#FEF3C7',
                      borderRadius: '6px',
                      marginBottom: '16px',
                      fontSize: '14px',
                      color: '#92400E',
                    }}>
                      <strong>⚠️ 注意:</strong> このエンティティに関連する{relatedRelations.length}件のリレーションも同時に削除されます。
                    </div>
                  )}
                  
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    fontSize: '12px',
                    color: '#6B7280',
                  }}>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>削除されるデータ:</div>
                    <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                      <li>エンティティ: {entity.name}</li>
                      {relatedRelations.length > 0 && (
                        <li>リレーション: {relatedRelations.length}件</li>
                      )}
                      <li>エンティティ埋め込みデータ（SQLite / ChromaDB）</li>
                      {relatedRelations.length > 0 && (
                        <li>リレーション埋め込みデータ（SQLite / ChromaDB）</li>
                      )}
                    </ul>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setShowDeleteEntityModal(false);
                        setDeleteTargetEntityId(null);
                      }}
                      disabled={isDeletingEntity}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#F3F4F6',
                        color: '#6B7280',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: isDeletingEntity ? 'not-allowed' : 'pointer',
                        opacity: isDeletingEntity ? 0.5 : 1,
                      }}
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleDeleteEntity}
                      disabled={isDeletingEntity}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#EF4444',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: isDeletingEntity ? 'not-allowed' : 'pointer',
                        fontWeight: 500,
                        opacity: isDeletingEntity ? 0.5 : 1,
                      }}
                    >
                      {isDeletingEntity ? '削除中...' : '削除する'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 一括削除確認モーダル */}
      {showBulkDeleteModal && selectedEntityIds.size > 0 && (
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
          onClick={() => {
            if (!isBulkDeleting) {
              setShowBulkDeleteModal(false);
            }
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
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: '#EF4444' }}>
              ⚠️ エンティティの一括削除
            </h2>
            
            <p style={{ marginBottom: '16px', color: '#6B7280' }}>
              <strong style={{ color: '#1F2937' }}>{selectedEntityIds.size}件</strong>のエンティティを削除しますか？
            </p>
            
            {(() => {
              const selectedEntities = entities.filter(e => selectedEntityIds.has(e.id));
              const totalRelations = relations.filter(r => 
                (r.sourceEntityId && selectedEntityIds.has(r.sourceEntityId)) || (r.targetEntityId && selectedEntityIds.has(r.targetEntityId))
              ).length;
              
              return (
                <div>
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#FEF3C7',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    fontSize: '14px',
                    color: '#92400E',
                  }}>
                    <strong>⚠️ 注意:</strong> 選択されたエンティティに関連する<strong>{totalRelations}件</strong>のリレーションも同時に削除されます。
                  </div>
                  
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    fontSize: '12px',
                    color: '#6B7280',
                  }}>
                    <div style={{ fontWeight: 500, marginBottom: '8px' }}>削除されるデータ:</div>
                    <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                      <li>エンティティ: {selectedEntityIds.size}件</li>
                      {totalRelations > 0 && (
                        <li>リレーション: {totalRelations}件</li>
                      )}
                      <li>エンティティ埋め込みデータ（SQLite / ChromaDB）</li>
                      {totalRelations > 0 && (
                        <li>リレーション埋め込みデータ（SQLite / ChromaDB）</li>
                      )}
                    </ul>
                  </div>
                  
                  <div style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    padding: '12px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    fontSize: '12px',
                    color: '#6B7280',
                  }}>
                    <div style={{ fontWeight: 500, marginBottom: '8px' }}>削除対象エンティティ:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {selectedEntities.slice(0, 20).map(entity => {
                        const relatedCount = relations.filter(r => 
                          (r.sourceEntityId === entity.id || r.targetEntityId === entity.id)
                        ).length;
                        return (
                          <div key={entity.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px' }}>
                              {entityTypeLabels[entity.type] || '📌'}
                            </span>
                            <span style={{ fontWeight: 500 }}>{entity.name}</span>
                            {relatedCount > 0 && (
                              <span style={{ color: '#9CA3AF', fontSize: '11px' }}>
                                ({relatedCount}件のリレーション)
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {selectedEntities.length > 20 && (
                        <div style={{ color: '#9CA3AF', fontSize: '11px', marginTop: '4px' }}>
                          ...他 {selectedEntities.length - 20}件
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setShowBulkDeleteModal(false);
                      }}
                      disabled={isBulkDeleting}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#F3F4F6',
                        color: '#6B7280',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: isBulkDeleting ? 'not-allowed' : 'pointer',
                        opacity: isBulkDeleting ? 0.5 : 1,
                      }}
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleBulkDeleteEntities}
                      disabled={isBulkDeleting}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#EF4444',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: isBulkDeleting ? 'not-allowed' : 'pointer',
                        fontWeight: 500,
                        opacity: isBulkDeleting ? 0.5 : 1,
                      }}
                    >
                      {isBulkDeleting ? '削除中...' : `削除する (${selectedEntityIds.size}件)`}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </Layout>
  );
}

export default function KnowledgeGraphPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <KnowledgeGraphPageContent />
    </Suspense>
  );
}
