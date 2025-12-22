'use client';

import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import type { TopicInfo } from '@/lib/orgApi';

interface EntityRelationListProps {
  entities: Entity[];
  relations: Relation[];
  topics: TopicInfo[];
  filteredEntities: Entity[];
  filteredRelations: Relation[];
  filteredTopics: TopicInfo[];
  paginatedEntities: Entity[];
  paginatedRelations: Relation[];
  paginatedTopics: TopicInfo[];
  entityPage: number;
  setEntityPage: (page: number | ((prev: number) => number)) => void;
  totalEntityPages: number;
  relationPage: number;
  setRelationPage: (page: number | ((prev: number) => number)) => void;
  totalRelationPages: number;
  topicPage: number;
  setTopicPage: (page: number | ((prev: number) => number)) => void;
  totalTopicPages: number;
  entitySearchQuery: string;
  setEntitySearchQuery: (query: string) => void;
  relationSearchQuery: string;
  setRelationSearchQuery: (query: string) => void;
  topicSearchQuery: string;
  setTopicSearchQuery: (query: string) => void;
  entityTypeFilter: string;
  setEntityTypeFilter: (filter: string) => void;
  relationTypeFilter: string;
  setRelationTypeFilter: (filter: string) => void;
  selectedEntityIds: Set<string>;
  setSelectedEntityIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  entityTypeLabels: Record<string, string>;
  relationTypeLabels: Record<string, string>;
  isDeletingEntity: boolean;
  isBulkDeleting: boolean;
  setDeleteTargetEntityId: (id: string | null) => void;
  setShowDeleteEntityModal: (show: boolean) => void;
  setShowBulkDeleteModal: (show: boolean) => void;
}

export default function EntityRelationList({
  entities,
  relations,
  topics,
  filteredEntities,
  filteredRelations,
  filteredTopics,
  paginatedEntities,
  paginatedRelations,
  paginatedTopics,
  entityPage,
  setEntityPage,
  totalEntityPages,
  relationPage,
  setRelationPage,
  totalRelationPages,
  topicPage,
  setTopicPage,
  totalTopicPages,
  entitySearchQuery,
  setEntitySearchQuery,
  relationSearchQuery,
  setRelationSearchQuery,
  topicSearchQuery,
  setTopicSearchQuery,
  entityTypeFilter,
  setEntityTypeFilter,
  relationTypeFilter,
  setRelationTypeFilter,
  selectedEntityIds,
  setSelectedEntityIds,
  entityTypeLabels,
  relationTypeLabels,
  isDeletingEntity,
  isBulkDeleting,
  setDeleteTargetEntityId,
  setShowDeleteEntityModal,
  setShowBulkDeleteModal,
}: EntityRelationListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* エンティティセクション */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a' }}>
            📌 エンティティ ({filteredEntities.length}件)
            {totalEntityPages > 1 && (
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280', marginLeft: '8px' }}>
                (ページ {entityPage} / {totalEntityPages})
              </span>
            )}
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
          {paginatedEntities.map((entity) => {
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
        
        {/* エンティティのページネーションコントロール */}
        {totalEntityPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
            <button
              onClick={() => setEntityPage(prev => Math.max(1, prev - 1))}
              disabled={entityPage === 1}
              style={{
                padding: '8px 16px',
                backgroundColor: entityPage === 1 ? '#F3F4F6' : '#3B82F6',
                color: entityPage === 1 ? '#9CA3AF' : '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: entityPage === 1 ? 'not-allowed' : 'pointer',
                fontWeight: 500,
              }}
            >
              前へ
            </button>
            <span style={{ fontSize: '14px', color: '#6B7280' }}>
              {entityPage} / {totalEntityPages}
            </span>
            <button
              onClick={() => setEntityPage(prev => Math.min(totalEntityPages, prev + 1))}
              disabled={entityPage === totalEntityPages}
              style={{
                padding: '8px 16px',
                backgroundColor: entityPage === totalEntityPages ? '#F3F4F6' : '#3B82F6',
                color: entityPage === totalEntityPages ? '#9CA3AF' : '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: entityPage === totalEntityPages ? 'not-allowed' : 'pointer',
                fontWeight: 500,
              }}
            >
              次へ
            </button>
          </div>
        )}
      </div>

      {/* リレーションセクション */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a' }}>
            🔗 リレーション ({filteredRelations.length}件)
            {totalRelationPages > 1 && (
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280', marginLeft: '8px' }}>
                (ページ {relationPage} / {totalRelationPages})
              </span>
            )}
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
          {paginatedRelations.map((relation) => {
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
        
        {/* リレーションのページネーションコントロール */}
        {totalRelationPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
            <button
              onClick={() => setRelationPage(prev => Math.max(1, prev - 1))}
              disabled={relationPage === 1}
              style={{
                padding: '8px 16px',
                backgroundColor: relationPage === 1 ? '#F3F4F6' : '#3B82F6',
                color: relationPage === 1 ? '#9CA3AF' : '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: relationPage === 1 ? 'not-allowed' : 'pointer',
                fontWeight: 500,
              }}
            >
              前へ
            </button>
            <span style={{ fontSize: '14px', color: '#6B7280' }}>
              {relationPage} / {totalRelationPages}
            </span>
            <button
              onClick={() => setRelationPage(prev => Math.min(totalRelationPages, prev + 1))}
              disabled={relationPage === totalRelationPages}
              style={{
                padding: '8px 16px',
                backgroundColor: relationPage === totalRelationPages ? '#F3F4F6' : '#3B82F6',
                color: relationPage === totalRelationPages ? '#9CA3AF' : '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: relationPage === totalRelationPages ? 'not-allowed' : 'pointer',
                fontWeight: 500,
              }}
            >
              次へ
            </button>
          </div>
        )}
      </div>

      {/* トピックセクション */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a' }}>
            📝 トピック ({filteredTopics.length}件)
            {totalTopicPages > 1 && (
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280', marginLeft: '8px' }}>
                (ページ {topicPage} / {totalTopicPages})
              </span>
            )}
          </h2>
        </div>
        
        {/* 検索 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="トピック名で検索..."
            value={topicSearchQuery}
            onChange={(e) => setTopicSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
          {paginatedTopics.map((topic) => {
            // このトピックに関連するエンティティ数を取得
            const relatedEntitiesCount = entities.filter(e => {
              if (e.metadata && typeof e.metadata === 'object' && 'topicId' in e.metadata) {
                return e.metadata.topicId === topic.id;
              }
              return false;
            }).length;
            
            // このトピックに関連するリレーション数を取得
            const relatedRelationsCount = relations.filter(r => r.topicId === topic.id).length;
            
            return (
              <div
                key={topic.id}
                style={{
                  padding: '12px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  fontSize: '14px',
                }}
              >
                <div style={{ color: '#1a1a1a', fontWeight: 600, marginBottom: '4px' }}>
                  📝 {topic.title || 'タイトルなし'}
                </div>
                {topic.meetingNoteTitle && (
                  <div style={{ color: '#6B7280', fontSize: '12px', marginBottom: '4px' }}>
                    議事録: {topic.meetingNoteTitle}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '12px', color: '#6B7280' }}>
                  {relatedEntitiesCount > 0 && (
                    <span>
                      📌 エンティティ: {relatedEntitiesCount}件
                    </span>
                  )}
                  {relatedRelationsCount > 0 && (
                    <span>
                      🔗 リレーション: {relatedRelationsCount}件
                    </span>
                  )}
                  {topic.importance && (
                    <span style={{
                      color: topic.importance === 'high' ? '#EF4444' : topic.importance === 'medium' ? '#F59E0B' : '#6B7280',
                      fontWeight: 500,
                    }}>
                      {topic.importance === 'high' ? '🔴 高' : topic.importance === 'medium' ? '🟡 中' : '⚪ 低'}
                    </span>
                  )}
                  {topic.topicDate && (
                    <span>
                      📅 {new Date(topic.topicDate).toLocaleDateString('ja-JP')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* トピックのページネーションコントロール */}
        {totalTopicPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
            <button
              onClick={() => setTopicPage(prev => Math.max(1, prev - 1))}
              disabled={topicPage === 1}
              style={{
                padding: '8px 16px',
                backgroundColor: topicPage === 1 ? '#F3F4F6' : '#3B82F6',
                color: topicPage === 1 ? '#9CA3AF' : '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: topicPage === 1 ? 'not-allowed' : 'pointer',
                fontWeight: 500,
              }}
            >
              前へ
            </button>
            <span style={{ fontSize: '14px', color: '#6B7280' }}>
              {topicPage} / {totalTopicPages}
            </span>
            <button
              onClick={() => setTopicPage(prev => Math.min(totalTopicPages, prev + 1))}
              disabled={topicPage === totalTopicPages}
              style={{
                padding: '8px 16px',
                backgroundColor: topicPage === totalTopicPages ? '#F3F4F6' : '#3B82F6',
                color: topicPage === totalTopicPages ? '#9CA3AF' : '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: topicPage === totalTopicPages ? 'not-allowed' : 'pointer',
                fontWeight: 500,
              }}
            >
              次へ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
