import { useCallback } from 'react';
import type { TopicInfo } from '@/lib/orgApi';
import type { TopicSemanticCategory } from '@/types/topicMetadata';
import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import { generateTopicMetadata, extractEntities, extractRelations } from '@/lib/topicMetadataGeneration';
import { getMeetingNoteById, saveMeetingNote } from '@/lib/orgApi';
import { getRelationsByTopicId, createRelation } from '@/lib/relationApi';
import { getEntityById, createEntity, getEntitiesByOrganizationId, getEntitiesByCompanyId } from '@/lib/entityApi';
import { callTauriCommand } from '@/lib/localFirebase';
import { saveTopicEmbeddingAsync } from '@/lib/topicEmbeddings';

interface UseTopicManagementProps {
  selectedTopic: TopicInfo | null;
  setSelectedTopic: (topic: TopicInfo | null) => void;
  pendingMetadata: {
    semanticCategory?: TopicSemanticCategory;
    importance?: TopicInfo['importance'];
    keywords?: string[];
    summary?: string;
  } | null;
  setPendingMetadata: (metadata: typeof pendingMetadata) => void;
  pendingEntities: Entity[] | null;
  setPendingEntities: (entities: Entity[] | null) => void;
  pendingRelations: Relation[] | null;
  setPendingRelations: (relations: Relation[] | null) => void;
  topicEntities: Entity[];
  setTopicEntities: (entities: Entity[]) => void;
  topicRelations: Relation[];
  setTopicRelations: (relations: Relation[]) => void;
  isGeneratingMetadata: boolean;
  setIsGeneratingMetadata: (value: boolean) => void;
  isSavingMetadata: boolean;
  setIsSavingMetadata: (value: boolean) => void;
  selectedModel: string;
  metadataMode: 'overwrite' | 'merge';
  onTopicMetadataSaved?: () => void;
}

export function useTopicManagement({
  selectedTopic,
  setSelectedTopic,
  pendingMetadata,
  setPendingMetadata,
  pendingEntities,
  setPendingEntities,
  pendingRelations,
  setPendingRelations,
  topicEntities,
  setTopicEntities,
  topicRelations,
  setTopicRelations,
  isGeneratingMetadata,
  setIsGeneratingMetadata,
  isSavingMetadata,
  setIsSavingMetadata,
  selectedModel,
  metadataMode,
  onTopicMetadataSaved,
}: UseTopicManagementProps) {
  // topicsレコード作成のヘルパー関数
  const createTopicEmbeddingRecord = useCallback(async (id: string, topic: TopicInfo) => {
    const now = new Date().toISOString();
    await callTauriCommand('doc_set', {
      collectionName: 'topics',
      docId: id,
      data: {
        id: id,
        topicId: topic.id,
        meetingNoteId: topic.meetingNoteId,
        organizationId: topic.organizationId,
        title: topic.title || '',
        content: topic.content || '',
        createdAt: now,
        updatedAt: now,
      },
    });
    console.log('✅ topicsレコードを作成しました:', id);
  }, []);

  // AIでメタデータを生成する関数（保存はしない）
  const handleAIGenerateMetadata = useCallback(async () => {
    if (!selectedTopic) return;

    try {
      setIsGeneratingMetadata(true);
      console.log('🤖 AIメタデータ生成を開始:', selectedTopic.id, 'モード:', metadataMode);

      // メタデータを生成
      const generatedMetadata = await generateTopicMetadata(selectedTopic.title, selectedTopic.content, selectedModel);
      console.log('✅ AIメタデータ生成完了:', generatedMetadata);

      // エンティティとリレーションを生成
      console.log('🤖 エンティティ・リレーション抽出を開始...');
      const extractedEntities = await extractEntities(selectedTopic.title, selectedTopic.content, selectedModel);
      console.log('✅ エンティティ抽出完了:', extractedEntities.length, '件');
      
      const extractedRelations = extractedEntities.length > 0
        ? await extractRelations(selectedTopic.title, selectedTopic.content, extractedEntities, selectedModel)
        : [];
      console.log('✅ リレーション抽出完了:', extractedRelations.length, '件');

      // モードに応じてメタデータをマージ
      let finalMetadata: typeof generatedMetadata;
      if (metadataMode === 'merge') {
        // 追加モード：既存のメタデータを保持し、空のフィールドのみを埋める
        finalMetadata = {
          semanticCategory: selectedTopic.semanticCategory || generatedMetadata.semanticCategory,
          importance: selectedTopic.importance || generatedMetadata.importance,
          keywords: selectedTopic.keywords && selectedTopic.keywords.length > 0 
            ? selectedTopic.keywords 
            : generatedMetadata.keywords,
          summary: selectedTopic.summary || generatedMetadata.summary,
        };
      } else {
        // 上書きモード：生成したメタデータで完全に置き換える
        finalMetadata = generatedMetadata;
      }

      // organizationIdを確実に設定
      const organizationId = selectedTopic.organizationId;
      const companyId = selectedTopic.companyId || undefined;
      
      if (!organizationId) {
        console.error('❌ [handleAIGenerateMetadata] organizationIdが設定されていません:', selectedTopic);
        alert('エラー: 組織IDが設定されていません。ページをリロードしてください。');
        return;
      }

      // エンティティにorganizationIdとtopicIdを設定
      const entitiesWithOrgId = extractedEntities.map(entity => ({
        ...entity,
        organizationId: organizationId, // 確実に設定
        companyId: companyId, // 事業会社IDも設定
        metadata: {
          ...entity.metadata,
          topicId: selectedTopic.id, // トピックIDをmetadataに追加
        },
      }));

      console.log('📝 [handleAIGenerateMetadata] エンティティにorganizationIdを設定:', {
        organizationId: organizationId,
        companyId: companyId,
        entitiesCount: entitiesWithOrgId.length,
        sampleEntity: entitiesWithOrgId[0] ? {
          name: entitiesWithOrgId[0].name,
          organizationId: entitiesWithOrgId[0].organizationId,
          companyId: entitiesWithOrgId[0].companyId,
        } : null,
      });

      // リレーションにtopicIdとorganizationId、companyIdを設定
      const relationsWithIds = extractedRelations.map(relation => ({
        ...relation,
        topicId: selectedTopic.id,
        organizationId: organizationId, // 確実に設定
        companyId: companyId, // 事業会社IDも設定
      }));
      
      console.log('📝 [handleAIGenerateMetadata] リレーションにorganizationIdを設定:', {
        organizationId: organizationId,
        companyId: companyId,
        relationsCount: relationsWithIds.length,
      });

      // 一時状態に保存
      setPendingMetadata(finalMetadata);
      setPendingEntities(entitiesWithOrgId);
      setPendingRelations(relationsWithIds);

      // モーダルの表示を更新（保存はまだ）
      setSelectedTopic({
        ...selectedTopic,
        semanticCategory: finalMetadata.semanticCategory,
        importance: finalMetadata.importance,
        keywords: finalMetadata.keywords,
        summary: finalMetadata.summary,
      });
      
      // エンティティとリレーションの表示も更新（保存はまだ）
      setTopicEntities(entitiesWithOrgId);
      setTopicRelations(relationsWithIds);
    } catch (error: any) {
      console.error('❌ AIメタデータ生成エラー:', error);
      alert(`メタデータの生成に失敗しました: ${error.message}`);
    } finally {
      setIsGeneratingMetadata(false);
    }
  }, [selectedTopic, selectedModel, metadataMode, setIsGeneratingMetadata, setPendingMetadata, setPendingEntities, setPendingRelations, setSelectedTopic, setTopicEntities, setTopicRelations]);

  // 生成されたメタデータを保存する関数
  const handleSaveMetadata = useCallback(async () => {
    console.log('🔍 [handleSaveMetadata] 関数が呼び出されました:', {
      selectedTopic: selectedTopic ? { id: selectedTopic.id, title: selectedTopic.title } : null,
      pendingMetadata: pendingMetadata ? 'あり' : 'なし',
      pendingEntities: pendingEntities ? pendingEntities.length : 0,
      pendingRelations: pendingRelations ? pendingRelations.length : 0,
    });
    
    if (!selectedTopic) {
      console.error('❌ [handleSaveMetadata] selectedTopicが設定されていません');
      alert('エラー: トピックが選択されていません');
      return;
    }
    
    // pendingMetadata、pendingEntities、pendingRelations、または既存のtopicEntities/topicRelationsがあれば保存可能
    const hasPendingData = pendingMetadata || (pendingEntities && pendingEntities.length > 0) || (pendingRelations && pendingRelations.length > 0);
    const hasExistingData = topicEntities.length > 0 || topicRelations.length > 0;
    
    if (!hasPendingData && !hasExistingData) {
      console.error('❌ [handleSaveMetadata] 保存するデータがありません:', {
        pendingMetadata: pendingMetadata ? 'あり' : 'なし',
        pendingEntities: pendingEntities ? pendingEntities.length : 0,
        pendingRelations: pendingRelations ? pendingRelations.length : 0,
        topicEntities: topicEntities.length,
        topicRelations: topicRelations.length,
      });
      alert('エラー: 保存するデータがありません');
      return;
    }
    
    console.log('✅ [handleSaveMetadata] 保存可能なデータがあります:', {
      hasPendingData,
      hasExistingData,
      pendingEntitiesCount: pendingEntities?.length || 0,
      pendingRelationsCount: pendingRelations?.length || 0,
      topicEntitiesCount: topicEntities.length,
      topicRelationsCount: topicRelations.length,
    });
    
    // pendingMetadataがない場合は、空のメタデータを作成
    const metadataToSave = pendingMetadata || {
      semanticCategory: selectedTopic.semanticCategory,
      importance: selectedTopic.importance,
      keywords: selectedTopic.keywords,
      summary: selectedTopic.summary,
    };

    try {
      setIsSavingMetadata(true);
      console.log('💾 [handleSaveMetadata] メタデータ保存を開始:', {
        topicId: selectedTopic.id,
        topicTitle: selectedTopic.title,
        organizationId: selectedTopic.organizationId,
        companyId: selectedTopic.companyId,
        pendingEntitiesCount: pendingEntities?.length || 0,
        pendingRelationsCount: pendingRelations?.length || 0,
      });

      // 議事録を取得
      const meetingNote = await getMeetingNoteById(selectedTopic.meetingNoteId);
      if (!meetingNote || !meetingNote.content) {
        throw new Error('議事録が見つかりません');
      }

      // contentをJSONパース
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
            semanticCategory?: string;
            importance?: string;
            keywords?: string | string[];
            summary?: string;
          }>;
        }>;
      }>;

      // 該当トピックを見つけてメタデータを更新
      let topicFound = false;

      for (const [tabId, tabData] of Object.entries(parsed)) {
        if (!tabData.items || !Array.isArray(tabData.items)) continue;

        for (const item of tabData.items) {
          if (!item.topics || !Array.isArray(item.topics)) continue;

          const topicIndex = item.topics.findIndex(t => t.id === selectedTopic.id);
          if (topicIndex !== -1) {
            // トピックを更新
            const existingTopic = item.topics[topicIndex];
            item.topics[topicIndex] = {
              ...existingTopic,
              semanticCategory: metadataToSave.semanticCategory,
              importance: metadataToSave.importance,
              keywords: metadataToSave.keywords,
              summary: metadataToSave.summary,
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

      // JSONを文字列化して保存
      const updatedContent = JSON.stringify(parsed);
      await saveMeetingNote({
        id: meetingNote.id,
        organizationId: meetingNote.organizationId,
        title: meetingNote.title,
        description: meetingNote.description,
        content: updatedContent,
      });

      console.log('✅ メタデータを保存しました');

      // 更新されたトピック情報を取得
      let updatedTopic: TopicInfo | null = null;
      for (const [tabId, tabData] of Object.entries(parsed)) {
        if (!tabData.items || !Array.isArray(tabData.items)) continue;
        for (const item of tabData.items) {
          if (!item.topics || !Array.isArray(item.topics)) continue;
          const foundTopic = item.topics.find(t => t.id === selectedTopic.id);
          if (foundTopic) {
            updatedTopic = foundTopic as any;
            break;
          }
        }
        if (updatedTopic) break;
      }

      // トピック埋め込みを再保存（ChromaDBが有効な場合）
      if (updatedTopic) {
        try {
          await saveTopicEmbeddingAsync(
            updatedTopic.id,
            selectedTopic.meetingNoteId,
            meetingNote.organizationId,
            updatedTopic.title,
            updatedTopic.content,
            {
              keywords: updatedTopic.keywords,
              semanticCategory: updatedTopic.semanticCategory,
              importance: updatedTopic.importance,
              summary: updatedTopic.summary,
            }
          );
          console.log('✅ トピック埋め込みを再保存しました（ChromaDB）');
        } catch (embeddingError: any) {
          console.warn('⚠️ トピック埋め込みの再保存に失敗しました（続行します）:', embeddingError?.message || embeddingError);
          // 埋め込みの再保存に失敗しても処理を続行
        }
      }

      // topicsテーブルから該当レコードのIDを取得
      // relationsのtopicIdはtopics(id)を参照する必要がある
      const topicEmbeddingId = `${selectedTopic.meetingNoteId}-topic-${selectedTopic.id}`;
      
      // topicsレコードが存在するか確認（存在しない場合は作成）
      let topicEmbeddingRecordId = topicEmbeddingId;
      try {
        const topicEmbeddingResult = await callTauriCommand('doc_get', {
          collectionName: 'topics',
          docId: topicEmbeddingId,
        });
        
        // doc_getの結果を確認（{exists: bool, data: HashMap}形式）
        if (topicEmbeddingResult && topicEmbeddingResult.exists && topicEmbeddingResult.data) {
          // レコードが存在する場合
          topicEmbeddingRecordId = topicEmbeddingResult.data.id || topicEmbeddingId;
          console.log('✅ topicsレコードが見つかりました:', topicEmbeddingRecordId);
        } else {
          // レコードが存在しない場合は作成
          console.log('⚠️ topicsレコードが存在しないため作成します:', topicEmbeddingId);
          await createTopicEmbeddingRecord(topicEmbeddingId, selectedTopic);
        }
      } catch (error: any) {
        // エラーメッセージに「no rows」または「Query returned no rows」が含まれている場合は、レコードが存在しないことを意味する
        const errorMessage = error?.message || error?.error || error?.errorString || String(error || '');
        const isNoRowsError = errorMessage.includes('no rows') || 
                              errorMessage.includes('Query returned no rows') ||
                              errorMessage.includes('ドキュメント取得エラー');
        
        if (isNoRowsError) {
          console.log('⚠️ topicsレコードが存在しないため作成します:', topicEmbeddingId);
          try {
            await createTopicEmbeddingRecord(topicEmbeddingId, selectedTopic);
          } catch (createError: any) {
            console.error('❌ topicsレコード作成エラー:', createError);
            alert(`topicsレコードの作成に失敗しました。詳細はコンソールを確認してください。`);
            throw createError; // 作成に失敗した場合はエラーを再スロー
          }
        } else {
          console.error('❌ topicsレコード確認エラー:', error);
          // その他のエラーは続行（後でエンティティ・リレーション保存時にエラーになる）
        }
      }
      
      // エンティティとリレーションを保存
      let savedEntityCount = 0;
      let savedRelationCount = 0;
      let entitiesToCreateCount = 0; // スコープ外でも使用できるように変数を定義
      
      // pendingEntitiesのIDから実際に作成されたIDへのマッピング
      const pendingIdToCreatedIdMap = new Map<string, string>();
      
      // エンティティを保存（pendingEntitiesがあれば、または既存のtopicEntitiesがあれば）
      const entitiesToSave = pendingEntities && pendingEntities.length > 0 ? pendingEntities : topicEntities;
      if (entitiesToSave && entitiesToSave.length > 0) {
          console.log('💾 エンティティ保存を開始:', entitiesToSave.length, '件');
          
          // 既存のエンティティを取得（重複チェック用）
          // トピックごとに独立したエンティティを管理するため、同じトピック内での重複のみをチェック
          // 事業会社のトピックの場合はcompanyIdで取得、組織のトピックの場合はorganizationIdで取得
          const existingEntities = selectedTopic.companyId
            ? await getEntitiesByCompanyId(selectedTopic.companyId)
            : await getEntitiesByOrganizationId(selectedTopic.organizationId);
          
          // 同じトピック内で既に存在するエンティティをフィルタリング
          const existingEntitiesInTopic = existingEntities.filter(e => {
            if (!e.metadata || typeof e.metadata !== 'object') return false;
            return 'topicId' in e.metadata && e.metadata.topicId === selectedTopic.id;
          });
          
          // 名前 + topicIdの組み合わせで重複チェック
          const existingEntityKeys = new Set(
            existingEntitiesInTopic.map(e => `${e.name.toLowerCase()}_${selectedTopic.id}`)
          );
          
          // 重複しないエンティティのみを作成（同じトピック内で重複しないもの）
          // pendingEntitiesがない場合は、topicEntitiesから重複していないものを取得
          const entitiesToCreate = entitiesToSave.filter(entity => {
            const key = `${entity.name.toLowerCase()}_${selectedTopic.id}`;
            // 既にデータベースに保存されている場合はスキップ
            return !existingEntityKeys.has(key);
          });
          
          entitiesToCreateCount = entitiesToCreate.length; // スコープ外でも使用できるように変数に保存
          
          console.log(`📊 エンティティ保存対象: ${entitiesToCreate.length}件（重複除外: ${entitiesToSave.length - entitiesToCreate.length}件、トピック: ${selectedTopic.id}）`);
          
          for (const entity of entitiesToCreate) {
            try {
              const pendingId = entity.id; // 元のIDを保存
              
              // metadataにtopicIdを確実に設定
              const entityMetadata = {
                ...(entity.metadata || {}),
                topicId: selectedTopic.id, // トピックIDをmetadataに追加
              };
              
              // organizationIdとcompanyIdを確実に設定
              // 事業会社のトピックの場合はcompanyIdを優先、組織のトピックの場合はorganizationIdを優先
              const companyId = entity.companyId || selectedTopic.companyId || undefined;
              const organizationId = companyId 
                ? (entity.organizationId || selectedTopic.organizationId || undefined)
                : (entity.organizationId || selectedTopic.organizationId);
              
              // organizationIdとcompanyIdのどちらか一方が設定されている必要がある
              if (!organizationId && !companyId) {
                console.error('❌ エンティティ作成エラー: organizationIdもcompanyIdも設定されていません', {
                  entityName: entity.name,
                  entityOrganizationId: entity.organizationId,
                  entityCompanyId: entity.companyId,
                  topicOrganizationId: selectedTopic.organizationId,
                  topicCompanyId: selectedTopic.companyId,
                });
                throw new Error('organizationIdまたはcompanyIdが設定されていません');
              }
              
              console.log('📝 エンティティ作成開始:', {
                name: entity.name,
                organizationId: organizationId,
                companyId: companyId,
                topicId: selectedTopic.id,
              });
              
              const createdEntity = await createEntity({
                name: entity.name,
                type: entity.type,
                aliases: entity.aliases || [],
                metadata: entityMetadata,
                organizationId: organizationId,
                companyId: companyId,
              });
              
              console.log('✅ エンティティ作成成功:', {
                name: entity.name,
                pendingID: pendingId,
                createdID: createdEntity.id,
                topicId: selectedTopic.id,
                organizationId: createdEntity.organizationId,
                companyId: createdEntity.companyId,
              });
              
              // IDマッピングを作成
              pendingIdToCreatedIdMap.set(pendingId, createdEntity.id);
              savedEntityCount++;
            } catch (error: any) {
              console.error('❌ エンティティ作成エラー:', {
                entityName: entity.name,
                error: error?.message || error,
                stack: error?.stack,
                entityOrganizationId: entity.organizationId,
                topicOrganizationId: selectedTopic.organizationId,
              });
              // エラーが発生した場合は処理を中断
              throw new Error(`エンティティ「${entity.name}」の作成に失敗しました: ${error?.message || error}`);
            }
          }
          
          // 既存のエンティティもマッピングに追加（同じトピック内のもののみ）
          existingEntitiesInTopic.forEach(entity => {
            const entityToMatch = entitiesToSave.find(e => 
              e.name.toLowerCase() === entity.name.toLowerCase() &&
              e.metadata && typeof e.metadata === 'object' &&
              'topicId' in e.metadata && e.metadata.topicId === selectedTopic.id
            );
            if (entityToMatch) {
              pendingIdToCreatedIdMap.set(entityToMatch.id, entity.id);
            }
          });
          
          // エンティティを再取得してIDを取得
          const updatedEntities = await getEntitiesByOrganizationId(selectedTopic.organizationId);
          
          // 同じトピック内のエンティティのみをフィルタリング
          const updatedEntitiesInTopic = updatedEntities.filter(e => {
            if (!e.metadata || typeof e.metadata !== 'object') return false;
            return 'topicId' in e.metadata && e.metadata.topicId === selectedTopic.id;
          });
          
          console.log(`📊 組織内のエンティティ総数: ${updatedEntities.length}件、トピック内: ${updatedEntitiesInTopic.length}件（トピック: ${selectedTopic.id}）`);
          
          // エンティティ名からIDのマッピングを作成（同じトピック内のエンティティのみ）
          const entityNameToIdMap = new Map<string, string>();
          updatedEntitiesInTopic.forEach(entity => {
            entityNameToIdMap.set(entity.name.toLowerCase(), entity.id);
          });
          
          console.log('📊 IDマッピング:', Array.from(pendingIdToCreatedIdMap.entries()).map(([pending, created]) => `${pending} -> ${created}`));
        }
      
      // リレーションを保存（pendingRelationsがあれば、または既存のtopicRelationsがあれば、エンティティが0件でも実行可能）
      const relationsToSave = pendingRelations && pendingRelations.length > 0 ? pendingRelations : topicRelations;
      if (relationsToSave && relationsToSave.length > 0) {
        console.log('💾 リレーション保存を開始:', relationsToSave.length, '件');
        
        // エンティティ名からIDのマッピングを取得（同じトピック内のエンティティのみ）
        let entityNameToIdMap = new Map<string, string>();
        // エンティティを取得（保存済みまたは既存）
        // 事業会社のトピックの場合はcompanyIdで取得、組織のトピックの場合はorganizationIdで取得
        const allEntities = selectedTopic.companyId
          ? await getEntitiesByCompanyId(selectedTopic.companyId)
          : await getEntitiesByOrganizationId(selectedTopic.organizationId);
        // 同じトピック内のエンティティのみをフィルタリング
        const entitiesInTopic = allEntities.filter(e => {
          if (!e.metadata || typeof e.metadata !== 'object') return false;
          return 'topicId' in e.metadata && e.metadata.topicId === selectedTopic.id;
        });
        entitiesInTopic.forEach(entity => {
          entityNameToIdMap.set(entity.name.toLowerCase(), entity.id);
        });
        
        console.log('💾 リレーション保存を開始:', relationsToSave.length, '件');
        
        for (const relation of relationsToSave) {
            try {
              // リレーションのエンティティIDを取得
              // extractRelationsが返すリレーションには、pendingEntitiesのエンティティIDが含まれている
              // このIDは一時的なものなので、実際に作成されたIDに変換する必要がある
              
              // IDマッピングを使用して実際に作成されたIDを取得
              if (!relation.sourceEntityId || !relation.targetEntityId) {
                console.warn('リレーションにsourceEntityIdまたはtargetEntityIdがありません:', relation);
                continue;
              }
              const sourceId = pendingIdToCreatedIdMap.get(relation.sourceEntityId) || relation.sourceEntityId;
              const targetId = pendingIdToCreatedIdMap.get(relation.targetEntityId) || relation.targetEntityId;
              
              // sourceIdとtargetIdが既にデータベースに存在するか確認
              const sourceEntityExists = entitiesInTopic.some(e => e.id === sourceId);
              const targetEntityExists = entitiesInTopic.some(e => e.id === targetId);
              
              if (!sourceEntityExists || !targetEntityExists) {
                // フォールバック: エンティティ名からIDを取得
                const sourceEntity = entitiesToSave.find(e => e.id === relation.sourceEntityId);
                const targetEntity = entitiesToSave.find(e => e.id === relation.targetEntityId);
                
                if (sourceEntity && targetEntity) {
                  const fallbackSourceId = entityNameToIdMap.get(sourceEntity.name.toLowerCase());
                  const fallbackTargetId = entityNameToIdMap.get(targetEntity.name.toLowerCase());
                  
                  if (fallbackSourceId && fallbackTargetId) {
                    console.log('⚠️ IDマッピングが見つかりませんが、エンティティ名からIDを取得しました（トピック内）:', {
                      sourcePendingId: relation.sourceEntityId,
                      sourceCreatedId: fallbackSourceId,
                      targetPendingId: relation.targetEntityId,
                      targetCreatedId: fallbackTargetId,
                      topicId: selectedTopic.id,
                    });
                    // フォールバックIDを使用
                    // 事業会社のトピックの場合はcompanyIdを優先、組織のトピックの場合はorganizationIdを優先
                    const companyId = relation.companyId || selectedTopic.companyId || undefined;
                    const organizationId = companyId 
                      ? (relation.organizationId || selectedTopic.organizationId || undefined)
                      : (relation.organizationId || selectedTopic.organizationId);
                    
                    // organizationIdとcompanyIdのどちらか一方が設定されている必要がある
                    if (!organizationId && !companyId) {
                      console.error('❌ リレーション作成エラー（フォールバック）: organizationIdもcompanyIdも設定されていません', {
                        relationType: relation.relationType,
                        relationOrganizationId: relation.organizationId,
                        relationCompanyId: relation.companyId,
                        topicOrganizationId: selectedTopic.organizationId,
                        topicCompanyId: selectedTopic.companyId,
                      });
                      throw new Error('organizationIdまたはcompanyIdが設定されていません');
                    }
                    
                    const createdRelation = await createRelation({
                      sourceEntityId: fallbackSourceId,
                      targetEntityId: fallbackTargetId,
                      relationType: relation.relationType,
                      description: relation.description,
                      topicId: topicEmbeddingRecordId,
                      organizationId: organizationId,
                      companyId: companyId,
                    });
                    console.log('✅ リレーション作成:', createdRelation.id);
                    savedRelationCount++;
                    continue;
                  }
                }
                
                console.warn('⚠️ リレーション作成スキップ: エンティティIDが見つかりません（トピック内）', {
                  sourcePendingId: relation.sourceEntityId,
                  targetPendingId: relation.targetEntityId,
                  sourceId,
                  targetId,
                  relationType: relation.relationType,
                  topicId: selectedTopic.id,
                  pendingIdMap: Array.from(pendingIdToCreatedIdMap.entries()),
                });
                continue;
              }
              
              console.log('📊 リレーションID変換（トピック内）:', {
                sourcePendingId: relation.sourceEntityId,
                sourceCreatedId: sourceId,
                targetPendingId: relation.targetEntityId,
                targetCreatedId: targetId,
                topicId: selectedTopic.id,
              });
              
              // リレーションを作成（topicIdはtopicsのidを使用）
              console.log('📊 リレーション作成（トピック内）:', {
                topicEmbeddingRecordId,
                topicId: selectedTopic.id,
                sourceId,
                targetId,
                relationType: relation.relationType,
              });
              // organizationIdとcompanyIdを確実に設定
              // 事業会社のトピックの場合はcompanyIdを優先、組織のトピックの場合はorganizationIdを優先
              const companyId = relation.companyId || selectedTopic.companyId || undefined;
              const organizationId = companyId 
                ? (relation.organizationId || selectedTopic.organizationId || undefined)
                : (relation.organizationId || selectedTopic.organizationId);
              
              // organizationIdとcompanyIdのどちらか一方が設定されている必要がある
              if (!organizationId && !companyId) {
                console.error('❌ リレーション作成エラー: organizationIdもcompanyIdも設定されていません', {
                  relationType: relation.relationType,
                  relationOrganizationId: relation.organizationId,
                  relationCompanyId: relation.companyId,
                  topicOrganizationId: selectedTopic.organizationId,
                  topicCompanyId: selectedTopic.companyId,
                });
                throw new Error('organizationIdまたはcompanyIdが設定されていません');
              }
              
              console.log('📝 リレーション作成開始:', {
                relationType: relation.relationType,
                sourceId: sourceId,
                targetId: targetId,
                organizationId: organizationId,
                companyId: companyId,
                topicId: selectedTopic.id,
              });
              
              const createdRelation = await createRelation({
                topicId: topicEmbeddingRecordId, // topicsのidを使用
                sourceEntityId: sourceId,
                targetEntityId: targetId,
                relationType: relation.relationType,
                description: relation.description,
                confidence: relation.confidence,
                metadata: relation.metadata,
                organizationId: organizationId,
                companyId: companyId,
              });
              
              console.log('✅ リレーション作成成功:', {
                id: createdRelation.id,
                relationType: relation.relationType,
                organizationId: createdRelation.organizationId,
                companyId: createdRelation.companyId,
              });
              console.log('✅ リレーション作成完了（トピック内）:', {
                relationId: createdRelation.id,
                topicId: createdRelation.topicId,
                expectedTopicId: topicEmbeddingRecordId,
                match: createdRelation.topicId === topicEmbeddingRecordId,
              });
              // エンティティ名を取得（ログ用）
              const sourceEntity = entitiesToSave.find(e => e.id === relation.sourceEntityId);
              const targetEntity = entitiesToSave.find(e => e.id === relation.targetEntityId);
              const sourceName = sourceEntity?.name || relation.sourceEntityId;
              const targetName = targetEntity?.name || relation.targetEntityId;
              console.log('✅ リレーション作成（トピック内）:', relation.relationType, `${sourceName} -> ${targetName}`, 'ID:', createdRelation.id, 'topicId:', selectedTopic.id);
              savedRelationCount++;
            } catch (error: any) {
              console.error('❌ リレーション作成エラー:', {
                relationType: relation.relationType,
                error: error?.message || error,
                stack: error?.stack,
                sourceEntityId: relation.sourceEntityId,
                targetEntityId: relation.targetEntityId,
              });
              // エラーが発生した場合は処理を中断
              throw new Error(`リレーション「${relation.relationType}」の作成に失敗しました: ${error?.message || error}`);
            }
          }
        }
        
      console.log(`✅ 保存完了: エンティティ ${savedEntityCount}件、リレーション ${savedRelationCount}件`);
      
      // 保存が成功したか確認するため、データベースから取得して検証
      try {
        const { getEntitiesByOrganizationId } = await import('@/lib/entityApi');
        const { getRelationsByTopicId } = await import('@/lib/relationApi');
        
        // エンティティを再取得して確認
        const savedEntities = await getEntitiesByOrganizationId(selectedTopic.organizationId);
        const savedEntitiesInTopic = savedEntities.filter(e => {
          if (!e.metadata || typeof e.metadata !== 'object') return false;
          return 'topicId' in e.metadata && e.metadata.topicId === selectedTopic.id;
        });
        
        // リレーションを再取得して確認
        const topicEmbeddingId = `${selectedTopic.meetingNoteId}-topic-${selectedTopic.id}`;
        const savedRelations = await getRelationsByTopicId(topicEmbeddingId);
        
        console.log('✅ 保存確認:', {
          savedEntitiesCount: savedEntitiesInTopic.length,
          savedRelationsCount: savedRelations.length,
          expectedEntitiesCount: savedEntityCount + (entitiesToSave ? entitiesToSave.length - entitiesToCreateCount : 0),
          expectedRelationsCount: savedRelationCount,
        });
        
        // 保存されたデータが期待値と一致するか確認
        if (savedEntitiesInTopic.length < savedEntityCount) {
          console.warn('⚠️ 保存されたエンティティ数が期待値より少ないです:', {
            saved: savedEntitiesInTopic.length,
            expected: savedEntityCount,
          });
        }
        
        if (savedRelations.length < savedRelationCount) {
          console.warn('⚠️ 保存されたリレーション数が期待値より少ないです:', {
            saved: savedRelations.length,
            expected: savedRelationCount,
          });
        }
      } catch (verifyError) {
        console.warn('⚠️ 保存確認中にエラーが発生しました（保存は成功している可能性があります）:', verifyError);
      }

      // selectedTopicの状態を更新して、保存されたメタデータを反映
      setSelectedTopic({
        ...selectedTopic,
        semanticCategory: metadataToSave.semanticCategory,
        importance: metadataToSave.importance,
        keywords: metadataToSave.keywords,
        summary: metadataToSave.summary,
      });

      // エンティティとリレーションを再取得
      try {
        // topicsのidでリレーションを取得
        const relations = await getRelationsByTopicId(topicEmbeddingRecordId);
        setTopicRelations(relations);
        const entityIds = new Set<string>();
        relations.forEach(relation => {
          if (relation.sourceEntityId) entityIds.add(relation.sourceEntityId);
          if (relation.targetEntityId) entityIds.add(relation.targetEntityId);
        });
        const entities: Entity[] = [];
        for (const entityId of entityIds) {
          try {
            const entity = await getEntityById(entityId);
            if (entity) entities.push(entity);
          } catch (error) {
            console.warn(`⚠️ エンティティ取得エラー (${entityId}):`, error);
          }
        }
        setTopicEntities(entities);
      } catch (error) {
        console.error('❌ エンティティ・リレーション再取得エラー:', error);
        // エラーが発生しても一時状態はクリアしない（ユーザーが再試行できるように）
      }

      // 一時状態をクリア（保存成功時のみ）
      setPendingMetadata(null);
      setPendingEntities(null);
      setPendingRelations(null);

      // 親コンポーネントに通知してトピックリストを再取得
      if (onTopicMetadataSaved) {
        onTopicMetadataSaved();
      }
    } catch (error: any) {
      console.error('❌ メタデータ保存エラー:', error);
      console.error('エラー詳細:', {
        message: error?.message,
        stack: error?.stack,
        error: error,
      });
      // エラー時は一時状態を保持して、ユーザーが再試行できるようにする
      const errorMessage = error?.message || String(error);
      alert(`❌ メタデータの保存に失敗しました\n\n${errorMessage}\n\nエラー詳細はコンソールを確認してください。`);
      // 一時状態はクリアしない
      throw error; // エラーを再スローして、呼び出し元でも処理できるようにする
    } finally {
      setIsSavingMetadata(false);
    }
  }, [
    selectedTopic,
    pendingMetadata,
    pendingEntities,
    pendingRelations,
    topicEntities,
    topicRelations,
    setIsSavingMetadata,
    setSelectedTopic,
    setPendingMetadata,
    setPendingEntities,
    setPendingRelations,
    setTopicEntities,
    setTopicRelations,
    onTopicMetadataSaved,
    createTopicEmbeddingRecord,
  ]);

  return {
    handleAIGenerateMetadata,
    handleSaveMetadata,
  };
}

