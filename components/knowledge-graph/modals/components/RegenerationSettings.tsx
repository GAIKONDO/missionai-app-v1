interface RegenerationSettingsProps {
  regenerationType: 'missing' | 'all';
  setRegenerationType: (type: 'missing' | 'all') => void;
  organizations: Array<{ id: string; name: string; title?: string; type?: string }>;
  missingCounts: { entities: number; relations: number; topics: number; total: number };
  isCountingMissing: boolean;
  updateMissingCountsOrganization: (selectedOrgId: string, selectedType: string) => Promise<void>;
}

export default function RegenerationSettings({
  regenerationType,
  setRegenerationType,
  organizations,
  missingCounts,
  isCountingMissing,
  updateMissingCountsOrganization,
}: RegenerationSettingsProps) {
  return (
    <>
      <p style={{ marginBottom: '16px', color: '#6B7280' }}>
        エンティティ、リレーション、トピックの埋め込みを再生成します（typeで組織と事業会社を区別）。
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
            id="regeneration-type-select-mode"
            value={regenerationType}
            onChange={async (e) => {
              const newType = e.target.value as 'missing' | 'all';
              setRegenerationType(newType);
              // モードが変更されたときに未生成件数を再計算
              if (newType === 'missing') {
                const orgSelect = document.getElementById('regeneration-org-select') as HTMLSelectElement;
                const typeSelect = document.getElementById('regeneration-type-select') as HTMLSelectElement;
                if (orgSelect && typeSelect) {
                  await updateMissingCountsOrganization(orgSelect.value || 'all', typeSelect.value || 'all');
                }
              } else {
                // すべて再生成モードの場合は件数をリセット
                // setMissingCountsは親コンポーネントで管理
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
          <p style={{ fontSize: '12px', color: regenerationType === 'missing' ? '#10B981' : '#EF4444', marginTop: '4px', marginBottom: 0 }}>
            {regenerationType === 'missing' 
              ? '💡 埋め込みが生成されていないエンティティ・リレーションのみを再生成します。' 
              : '⚠️ 既存の埋め込みも強制的に再生成します。APIコストがかかる場合があります。'}
          </p>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
            対象組織（typeで組織と事業会社を区別）
          </label>
          <select
            id="regeneration-org-select"
            onChange={async () => {
              // 組織が変更されたときに未生成件数を再計算
              const orgSelect = document.getElementById('regeneration-org-select') as HTMLSelectElement;
              const typeSelect = document.getElementById('regeneration-type-select') as HTMLSelectElement;
              if (orgSelect && typeSelect) {
                await updateMissingCountsOrganization(orgSelect.value, typeSelect.value);
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
              <option key={org.id} value={org.id}>{org.name} {org.type === 'company' ? '(事業会社)' : org.type === 'person' ? '(個人)' : ''}</option>
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
                await updateMissingCountsOrganization(orgSelect.value, typeSelect.value);
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
        {regenerationType === 'missing' && (
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
    </>
  );
}

